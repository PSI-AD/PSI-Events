/**
 * CommissionEngine.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Pure math engine for PSI post-event commission settlement.
 *
 * Risk Tier Model:
 *   Gold   → agent earns 50% of their closed revenue
 *   Silver → agent earns 30% of their closed revenue
 *   Bronze → agent earns 20% of their closed revenue
 *   Remainder in every case flows to Branch Gross Profit.
 *
 * ── v2: Multi-Currency FX Engine ─────────────────────────────────────────────
 * Events are now stamped with a Local Event Currency (e.g. GBP, EUR, EGP).
 * Costs that the agent or branch incurred in the local currency (travelCost,
 * eventCost) are converted to AED before being deducted from the AED-
 * denominated Gross Revenue to produce the Net Revenue on which the tier
 * split is calculated.
 *
 * Formula (per agent):
 *   travelCostAed   = travelCostLocal × fxRateToAed
 *   eventCostAed    = eventCostLocal  × fxRateToAed
 *   netRevenue      = closedRevenue - travelCostAed - eventCostAed
 *   agentCommission = max(0, netRevenue) × tier.agentShare
 *   branchContrib   = max(0, netRevenue) - agentCommission
 *
 * The fx rate snapshot (rate, source, lockedAt) is embedded in every
 * SettlementReport so agents can audit the exact conversion used.
 *
 * No side-effects. All functions are pure and deterministic.
 */

// ── Tier model ────────────────────────────────────────────────────────────────

export type RiskTier = 'gold' | 'silver' | 'bronze';

export interface TierConfig {
    label: string;
    agentShare: number;   // decimal fraction (0.5, 0.3, 0.2)
    branchShare: number;   // decimal fraction (0.5, 0.7, 0.8)
    hex: string;
    tailwindText: string;
    tailwindBg: string;
    tailwindBorder: string;
    tailwindBadge: string;
}

export const TIER_CONFIG: Record<RiskTier, TierConfig> = {
    gold: {
        label: 'Gold',
        agentShare: 0.50,
        branchShare: 0.50,
        hex: '#f59e0b',
        tailwindText: 'text-amber-400',
        tailwindBg: 'bg-amber-500/10',
        tailwindBorder: 'border-amber-500/40',
        tailwindBadge: 'bg-amber-500 text-white',
    },
    silver: {
        label: 'Silver',
        agentShare: 0.30,
        branchShare: 0.70,
        hex: '#94a3b8',
        tailwindText: 'text-slate-300',
        tailwindBg: 'bg-slate-500/10',
        tailwindBorder: 'border-slate-500/40',
        tailwindBadge: 'bg-slate-400 text-slate-900',
    },
    bronze: {
        label: 'Bronze',
        agentShare: 0.20,
        branchShare: 0.80,
        hex: '#d97706',
        tailwindText: 'text-orange-400',
        tailwindBg: 'bg-orange-900/20',
        tailwindBorder: 'border-orange-700/40',
        tailwindBadge: 'bg-orange-700 text-white',
    },
};

// ── Supported local event currencies ─────────────────────────────────────────

export type SupportedCurrency = 'AED' | 'GBP' | 'EUR' | 'USD' | 'EGP' | 'SAR' | 'QAR' | 'KWD';

export interface CurrencyMeta {
    code: SupportedCurrency;
    name: string;
    symbol: string;
    flag: string;
}

export const CURRENCY_CATALOGUE: CurrencyMeta[] = [
    { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', flag: '🇦🇪' },
    { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧' },
    { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺' },
    { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸' },
    { code: 'EGP', name: 'Egyptian Pound', symbol: 'E£', flag: '🇪🇬' },
    { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼', flag: '🇸🇦' },
    { code: 'QAR', name: 'Qatari Riyal', symbol: 'QR', flag: '🇶🇦' },
    { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'KD', flag: '🇰🇼' },
];

/**
 * REFERENCE_FX_RATES
 * Locked mid-market reference rates expressed as: 1 <currency> = X AED
 * These are the fallback rates used when the organizer hasn't overridden them.
 * In production, replace with a live FX feed (e.g. Open Exchange Rates API).
 * Last updated: 2026-02-28 (for PSI internal audit purposes).
 */
export const REFERENCE_FX_RATES: Record<SupportedCurrency, number> = {
    AED: 1.0000,
    GBP: 4.6519,  // 1 GBP = 4.6519 AED
    EUR: 3.9851,  // 1 EUR = 3.9851 AED
    USD: 3.6725,  // 1 USD = 3.6725 AED (pegged)
    EGP: 0.0751,  // 1 EGP = 0.0751 AED
    SAR: 0.9793,  // 1 SAR = 0.9793 AED (near-peg)
    QAR: 1.0082,  // 1 QAR = 1.0082 AED
    KWD: 11.9346, // 1 KWD = 11.9346 AED
};

/**
 * FxSnapshot
 * Immutably records which rate was used at report-generation time.
 * Embedded in SettlementReport for agent dispute prevention.
 */
export interface FxSnapshot {
    localCurrency: SupportedCurrency;
    rateToAed: number;    // 1 <localCurrency> = rateToAed AED
    source: string;    // 'PSI Reference Rate' | 'Organizer Override' | 'Live Feed'
    lockedAt: string;    // ISO timestamp
}

// ── Agent model ───────────────────────────────────────────────────────────────

export interface AgentEntry {
    id: string;
    name: string;
    branch: string;
    tier: RiskTier;
    closedRevenue: number;  // AED — actual post-event closed sales (always AED)
    travelCostLocal: number; // Cost in LOCAL event currency (converted before deduction)
    eventCostLocal: number; // Booth/stand share in LOCAL event currency
}

// ── Settlement outputs ────────────────────────────────────────────────────────

export interface AgentSettlement {
    agent: AgentEntry;
    tier: TierConfig;
    travelCostAed: number;   // Converted travel cost in AED
    eventCostAed: number;   // Converted event cost in AED
    totalDeductionsAed: number;   // travelCostAed + eventCostAed
    netRevenue: number;   // closedRevenue - totalDeductionsAed (floor 0)
    agentCommission: number;   // AED — agent's payout (on netRevenue)
    branchContribution: number;   // AED — flows to Branch Gross Profit
}

export interface SettlementSummary {
    grossRevenue: number;  // Sum of all closedRevenue
    totalDeductionsAed: number;  // Sum of all converted costs
    totalNetRevenue: number;  // Sum of all netRevenue
    totalAgentCommissions: number;
    branchGrossProfit: number;
    roiPercent: number;  // (branchGrossProfit / grossRevenue) * 100
    agentCount: number;
    highestEarner: AgentSettlement | null;
}

export interface SettlementReport {
    eventId: string;
    eventName: string;
    eventDate: string;
    venue: string;
    branchManager: string;
    fx: FxSnapshot;        // ← NEW: FX audit field
    agents: AgentSettlement[];
    summary: SettlementSummary;
    generatedAt: string;            // ISO string
}

// ── Core FX math ──────────────────────────────────────────────────────────────

/**
 * toAed — converts an amount in localCurrency to AED using the given rate.
 */
export function toAed(amountLocal: number, rateToAed: number): number {
    return Math.round(amountLocal * rateToAed);
}

/**
 * buildFxSnapshot — creates an immutable FX record for a settlement.
 * @param currency   The chosen local event currency
 * @param override   Optional organizer-supplied rate override
 */
export function buildFxSnapshot(
    currency: SupportedCurrency,
    override?: number
): FxSnapshot {
    const rate = override ?? REFERENCE_FX_RATES[currency];
    const source = override
        ? 'Organizer Override'
        : currency === 'AED' ? 'No Conversion Required' : 'PSI Reference Rate (2026-02-28)';
    return {
        localCurrency: currency,
        rateToAed: rate,
        source,
        lockedAt: new Date().toISOString(),
    };
}

// ── Per-agent calculation ─────────────────────────────────────────────────────

/**
 * calculateAgentSettlement
 *
 * @param agent    AgentEntry with costs expressed in LOCAL event currency
 * @param fx       The FxSnapshot for this settlement run
 */
export function calculateAgentSettlement(
    agent: AgentEntry,
    fx: FxSnapshot
): AgentSettlement {
    const tier = TIER_CONFIG[agent.tier];
    const travelCostAed = toAed(agent.travelCostLocal, fx.rateToAed);
    const eventCostAed = toAed(agent.eventCostLocal, fx.rateToAed);
    const totalDeductions = travelCostAed + eventCostAed;

    // Net revenue can't go below 0 — agent is never liable for more than they earned
    const netRevenue = Math.max(0, agent.closedRevenue - totalDeductions);
    const agentCommission = Math.round(netRevenue * tier.agentShare);
    const branchContribution = netRevenue - agentCommission;

    return {
        agent,
        tier,
        travelCostAed,
        eventCostAed,
        totalDeductionsAed: totalDeductions,
        netRevenue,
        agentCommission,
        branchContribution,
    };
}

// ── Full settlement report ────────────────────────────────────────────────────

export function calculateSettlement(
    eventName: string,
    eventDate: string,
    venue: string,
    branchManager: string,
    agents: AgentEntry[],
    fx: FxSnapshot
): SettlementReport {
    const settlements = agents.map(a => calculateAgentSettlement(a, fx));

    const grossRevenue = agents.reduce((s, a) => s + a.closedRevenue, 0);
    const totalDeductionsAed = settlements.reduce((s, r) => s + r.totalDeductionsAed, 0);
    const totalNetRevenue = settlements.reduce((s, r) => s + r.netRevenue, 0);
    const totalAgentCommissions = settlements.reduce((s, r) => s + r.agentCommission, 0);
    const branchGrossProfit = totalNetRevenue - totalAgentCommissions;

    const highestEarner = settlements.length > 0
        ? settlements.reduce((best, s) => s.agentCommission > best.agentCommission ? s : best)
        : null;

    return {
        eventId: `PSI-STL-${Date.now().toString(36).toUpperCase()}`,
        eventName,
        eventDate,
        venue,
        branchManager,
        fx,
        agents: settlements,
        summary: {
            grossRevenue,
            totalDeductionsAed,
            totalNetRevenue,
            totalAgentCommissions,
            branchGrossProfit,
            roiPercent: grossRevenue > 0 ? (branchGrossProfit / grossRevenue) * 100 : 0,
            agentCount: agents.length,
            highestEarner,
        },
        generatedAt: new Date().toISOString(),
    };
}

// ── Formatters ────────────────────────────────────────────────────────────────

/** Format a number as AED currency string. */
export function formatAED(amount: number): string {
    return new Intl.NumberFormat('en-AE', {
        style: 'currency',
        currency: 'AED',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

/** Format a number in any supported currency. */
export function formatLocalCurrency(amount: number, currency: SupportedCurrency): string {
    if (currency === 'AED') return formatAED(amount);
    try {
        return new Intl.NumberFormat('en-AE', {
            style: 'currency',
            currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    } catch {
        return `${amount.toLocaleString()} ${currency}`;
    }
}

/** Human-readable FX label: "1 GBP = 4.65 AED" */
export function fxLabel(fx: FxSnapshot): string {
    if (fx.localCurrency === 'AED') return 'All costs in AED — no conversion required';
    return `1 ${fx.localCurrency} = ${fx.rateToAed.toFixed(4)} AED`;
}

/** Format a date string as readable date. */
export function formatDate(iso: string): string {
    return new Intl.DateTimeFormat('en-AE', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    }).format(new Date(iso));
}

// ── Demo seed data ────────────────────────────────────────────────────────────

/** Demo: London event in GBP. Travel + stand costs are in GBP. */
export const DEMO_AGENTS: AgentEntry[] = [
    { id: '1', name: 'Khalid Al-Mansouri', branch: 'Abu Dhabi Main', tier: 'gold', closedRevenue: 4_200_000, travelCostLocal: 1_800, eventCostLocal: 3_500 },
    { id: '2', name: 'Sara Almarzouqi', branch: 'Dubai Marina', tier: 'gold', closedRevenue: 3_800_000, travelCostLocal: 1_600, eventCostLocal: 3_500 },
    { id: '3', name: 'Omar Bin Rashid', branch: 'Abu Dhabi Main', tier: 'silver', closedRevenue: 2_100_000, travelCostLocal: 1_400, eventCostLocal: 2_200 },
    { id: '4', name: 'Nour Al-Hamdan', branch: 'Sharjah', tier: 'silver', closedRevenue: 1_750_000, travelCostLocal: 1_200, eventCostLocal: 2_200 },
    { id: '5', name: 'Fatima Al-Zaabi', branch: 'Abu Dhabi Main', tier: 'bronze', closedRevenue: 950_000, travelCostLocal: 1_100, eventCostLocal: 1_500 },
    { id: '6', name: 'Rashed Al-Neyadi', branch: 'Dubai Marina', tier: 'bronze', closedRevenue: 680_000, travelCostLocal: 1_100, eventCostLocal: 1_500 },
];

/** Default FX snapshot for the demo (London → GBP) */
export const DEMO_FX: FxSnapshot = buildFxSnapshot('GBP');
