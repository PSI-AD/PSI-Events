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
 * ── v3: Clawback & Carry-Forward Ledger ──────────────────────────────────────
 * The engine now queries agent_debts/{agentId} from Firestore before
 * finalising any agent's payout. Outstanding debts (e.g. from a cancelled
 * deal at a prior roadshow) are automatically subtracted from the current
 * agentCommission and recorded as ClawbackLineItems for the audit trail.
 *
 * Clawback formula:
 *   effectiveCommission = max(0, agentCommission - totalClawbackAed)
 *   residualDebt = max(0, totalClawbackAed - agentCommission)   ← carry-forward
 *
 * Formula (per agent):
 *   travelCostAed   = travelCostLocal × fxRateToAed
 *   eventCostAed    = eventCostLocal  × fxRateToAed
 *   netRevenue      = closedRevenue - travelCostAed - eventCostAed
 *   agentCommission = max(0, netRevenue) × tier.agentShare
 *   effectiveCommission = max(0, agentCommission - totalClawbackAed)
 *   branchContrib   = max(0, netRevenue) - effectiveCommission
 *
 * No side-effects outside the Firestore fetch. All math is deterministic.
 */

import {
    collection, getDocs, query, where,
    doc, addDoc, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { db } from '../../services/firebase/firebaseConfig';


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

// ── Clawback & Carry-Forward types ────────────────────────────────────────────

/**
 * DebtReason — categorises why a debt was created.
 * Used for PDF audit trail labels.
 */
export type DebtReason =
    | 'cancelled_deal'      // Buyer withdrew after SPA, commission reversed
    | 'chargeback'          // Payment dispute resolved against PSI
    | 'compliance_penalty'  // Internal disciplinary deduction
    | 'advance_recovery'    // Recovery of commission advance paid before close
    | 'other';

/**
 * AgentDebt — a single outstanding debt for an agent.
 *
 * Firestore path:  agent_debts/{debtId}
 * Fields mirrored exactly so Firestore docs map directly.
 */
export interface AgentDebt {
    id: string;                  // Firestore document ID
    agentId: string;             // Matches AgentEntry.id
    agentName: string;           // For display without join
    amountAed: number;           // Always AED — outstanding amount
    reason: DebtReason;          // Why it was created
    description: string;         // Human-readable detail
    sourceEventId: string;       // Which past event triggered this
    sourceEventName: string;     // For PDF audit trail
    createdAt: string;           // ISO timestamp
    status: 'outstanding' | 'partially_recovered' | 'cleared';
    recoveredAed: number;        // How much has already been recovered
    remainingAed: number;        // amountAed - recoveredAed
}

/**
 * ClawbackLineItem — the deduction record generated during settlement.
 * Embedded in AgentSettlement and printed in the PDF.
 */
export interface ClawbackLineItem {
    debtId: string;
    description: string;
    sourceEventName: string;
    reason: DebtReason;
    originalAmountAed: number;
    appliedAed: number;          // How much was actually deducted (≤ originalAmountAed)
    residualAed: number;         // Remainder carried forward to next settlement
}

/** Human-readable labels for debt reason codes */
export const DEBT_REASON_LABELS: Record<DebtReason, string> = {
    cancelled_deal: 'Cancelled Deal — Commission Reversal',
    chargeback: 'Chargeback / Payment Dispute',
    compliance_penalty: 'Compliance Penalty',
    advance_recovery: 'Commission Advance Recovery',
    other: 'Other Deduction',
};


// ── Settlement outputs ────────────────────────────────────────────────────────

export interface AgentSettlement {
    agent: AgentEntry;
    tier: TierConfig;
    travelCostAed: number;           // Converted travel cost in AED
    eventCostAed: number;            // Converted event cost in AED
    totalDeductionsAed: number;      // travelCostAed + eventCostAed
    netRevenue: number;              // closedRevenue - totalDeductionsAed (floor 0)
    agentCommission: number;         // AED — gross commission (before clawbacks)
    clawbacks: ClawbackLineItem[];   // ← NEW: applied debt deductions
    totalClawbackAed: number;        // ← NEW: sum of all applied clawbacks
    effectiveCommission: number;     // ← NEW: agentCommission - totalClawbackAed (floor 0)
    residualDebtAed: number;         // ← NEW: unrecovered debt to carry forward
    branchContribution: number;      // AED — flows to Branch Gross Profit
}

export interface SettlementSummary {
    grossRevenue: number;            // Sum of all closedRevenue
    totalDeductionsAed: number;      // Sum of all converted costs
    totalNetRevenue: number;         // Sum of all netRevenue
    totalAgentCommissions: number;   // Sum of grossCommissions (pre-clawback)
    totalClawbacksAed: number;       // ← NEW: total recovered via clawbacks
    totalEffectiveCommissions: number; // ← NEW: sum of effectiveCommission
    branchGrossProfit: number;
    roiPercent: number;              // (branchGrossProfit / grossRevenue) * 100
    agentCount: number;
    highestEarner: AgentSettlement | null;
}

export interface SettlementReport {
    eventId: string;
    eventName: string;
    eventDate: string;
    venue: string;
    branchManager: string;
    fx: FxSnapshot;                  // FX audit field
    agents: AgentSettlement[];
    summary: SettlementSummary;
    generatedAt: string;             // ISO string
    hasClawbacks: boolean;           // ← NEW: quick flag for UI/PDF
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
 * @param debts    Outstanding debts to deduct from this agent's commission
 */
export function calculateAgentSettlement(
    agent: AgentEntry,
    fx: FxSnapshot,
    debts: AgentDebt[] = []
): AgentSettlement {
    const tier = TIER_CONFIG[agent.tier];
    const travelCostAed = toAed(agent.travelCostLocal, fx.rateToAed);
    const eventCostAed = toAed(agent.eventCostLocal, fx.rateToAed);
    const totalDeductions = travelCostAed + eventCostAed;

    // Net revenue can't go below 0 — agent is never liable for more than they earned
    const netRevenue = Math.max(0, agent.closedRevenue - totalDeductions);
    const agentCommission = Math.round(netRevenue * tier.agentShare);

    // ── Clawback application ──────────────────────────────────────────────────
    // Work through each outstanding debt in order of creation.
    // Deduct from the gross commission until either all debts are cleared or
    // the commission is exhausted. Residual debt carries forward.
    let remainingCommission = agentCommission;
    const clawbacks: ClawbackLineItem[] = [];

    for (const debt of debts) {
        if (remainingCommission <= 0) {
            // No more commission left — record full amount as carry-forward
            clawbacks.push({
                debtId: debt.id,
                description: debt.description,
                sourceEventName: debt.sourceEventName,
                reason: debt.reason,
                originalAmountAed: debt.remainingAed,
                appliedAed: 0,
                residualAed: debt.remainingAed,
            });
        } else {
            const applied = Math.min(remainingCommission, debt.remainingAed);
            const residual = debt.remainingAed - applied;
            remainingCommission -= applied;
            clawbacks.push({
                debtId: debt.id,
                description: debt.description,
                sourceEventName: debt.sourceEventName,
                reason: debt.reason,
                originalAmountAed: debt.remainingAed,
                appliedAed: applied,
                residualAed: residual,
            });
        }
    }

    const totalClawbackAed = clawbacks.reduce((s, c) => s + c.appliedAed, 0);
    const effectiveCommission = Math.max(0, agentCommission - totalClawbackAed);
    const residualDebtAed = clawbacks.reduce((s, c) => s + c.residualAed, 0);

    // Branch gets net revenue minus what the agent actually takes home
    const branchContribution = netRevenue - effectiveCommission;

    return {
        agent,
        tier,
        travelCostAed,
        eventCostAed,
        totalDeductionsAed: totalDeductions,
        netRevenue,
        agentCommission,
        clawbacks,
        totalClawbackAed,
        effectiveCommission,
        residualDebtAed,
        branchContribution,
    };
}


// ── Full settlement report ────────────────────────────────────────────────────

/**
 * calculateSettlement
 *
 * @param debtsMap  Optional map of agentId → AgentDebt[]; loaded from Firestore
 *                  before calling this function. Pass {} if no clawbacks.
 */
export function calculateSettlement(
    eventName: string,
    eventDate: string,
    venue: string,
    branchManager: string,
    agents: AgentEntry[],
    fx: FxSnapshot,
    debtsMap: Record<string, AgentDebt[]> = {}
): SettlementReport {
    const settlements = agents.map(a =>
        calculateAgentSettlement(a, fx, debtsMap[a.id] ?? [])
    );

    const grossRevenue = agents.reduce((s, a) => s + a.closedRevenue, 0);
    const totalDeductionsAed = settlements.reduce((s, r) => s + r.totalDeductionsAed, 0);
    const totalNetRevenue = settlements.reduce((s, r) => s + r.netRevenue, 0);
    const totalAgentCommissions = settlements.reduce((s, r) => s + r.agentCommission, 0);
    const totalClawbacksAed = settlements.reduce((s, r) => s + r.totalClawbackAed, 0);
    const totalEffectiveCommissions = settlements.reduce((s, r) => s + r.effectiveCommission, 0);
    const branchGrossProfit = totalNetRevenue - totalEffectiveCommissions;

    const highestEarner = settlements.length > 0
        ? settlements.reduce((best, s) => s.effectiveCommission > best.effectiveCommission ? s : best)
        : null;

    return {
        eventId: `PSI-STL-${Date.now().toString(36).toUpperCase()}`,
        eventName,
        eventDate,
        venue,
        branchManager,
        fx,
        agents: settlements,
        hasClawbacks: totalClawbacksAed > 0,
        summary: {
            grossRevenue,
            totalDeductionsAed,
            totalNetRevenue,
            totalAgentCommissions,
            totalClawbacksAed,
            totalEffectiveCommissions,
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

// ── Firestore: agent_debts helpers ───────────────────────────────────────────

/**
 * fetchAgentDebts
 * ───────────────
 * Fetches all outstanding debts for a given set of agentIds from Firestore.
 * Returns a map of agentId → AgentDebt[] for fast lookup during settlement.
 *
 * Firestore path:  agent_debts/{debtId}
 *   Fields: agentId, agentName, amountAed, reason, description,
 *           sourceEventId, sourceEventName, createdAt,
 *           status, recoveredAed, remainingAed
 */
export async function fetchAgentDebts(
    agentIds: string[]
): Promise<Record<string, AgentDebt[]>> {
    if (agentIds.length === 0) return {};

    // Firestore 'in' queries support max 30 items; for larger rosters batch.
    const BATCH = 30;
    const result: Record<string, AgentDebt[]> = {};

    for (let i = 0; i < agentIds.length; i += BATCH) {
        const batch = agentIds.slice(i, i + BATCH);
        const snap = await getDocs(
            query(
                collection(db, 'agent_debts'),
                where('agentId', 'in', batch),
                where('status', 'in', ['outstanding', 'partially_recovered'])
            )
        );
        snap.docs.forEach(d => {
            const data = d.data();
            const debt: AgentDebt = {
                id: d.id,
                agentId: data.agentId,
                agentName: data.agentName ?? '',
                amountAed: data.amountAed ?? 0,
                reason: data.reason ?? 'other',
                description: data.description ?? '',
                sourceEventId: data.sourceEventId ?? '',
                sourceEventName: data.sourceEventName ?? 'Unknown Event',
                createdAt: data.createdAt instanceof Timestamp
                    ? data.createdAt.toDate().toISOString()
                    : (data.createdAt ?? new Date().toISOString()),
                status: data.status ?? 'outstanding',
                recoveredAed: data.recoveredAed ?? 0,
                remainingAed: data.remainingAed ?? data.amountAed ?? 0,
            };
            if (!result[debt.agentId]) result[debt.agentId] = [];
            result[debt.agentId].push(debt);
        });
    }
    return result;
}

/**
 * recordDebtRecovery
 * ──────────────────
 * After a settlement is finalised, mark each clawback as recovered
 * in Firestore. Call this from the settlement confirmation step.
 * (Non-blocking — fire-and-forget is acceptable for the demo.)
 */
export async function recordDebtRecovery(
    clawbacks: ClawbackLineItem[],
    settlementEventId: string
): Promise<void> {
    const { updateDoc, doc: fsDoc } = await import('firebase/firestore');
    await Promise.all(
        clawbacks
            .filter(c => c.appliedAed > 0)
            .map(c =>
                updateDoc(fsDoc(db, 'agent_debts', c.debtId), {
                    recoveredAed: c.originalAmountAed - c.residualAed,
                    remainingAed: c.residualAed,
                    status: c.residualAed <= 0 ? 'cleared' : 'partially_recovered',
                    lastRecoveredAt: serverTimestamp(),
                    lastRecoveredByEventId: settlementEventId,
                })
            )
    );
}

/**
 * addAgentDebt
 * ────────────
 * Create a new debt record in Firestore — called when a deal is cancelled
 * or a penalty is issued post-settlement.
 */
export async function addAgentDebt(
    debt: Omit<AgentDebt, 'id' | 'createdAt' | 'recoveredAed' | 'remainingAed' | 'status'>
): Promise<string> {
    const ref = await addDoc(collection(db, 'agent_debts'), {
        ...debt,
        status: 'outstanding',
        recoveredAed: 0,
        remainingAed: debt.amountAed,
        createdAt: serverTimestamp(),
    });
    return ref.id;
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

/**
 * DEMO_DEBTS — pre-loaded mock debts for offline/demo mode.
 * Maps agentId → AgentDebt[].  Mirrors what fetchAgentDebts returns.
 */
export const DEMO_DEBTS: Record<string, AgentDebt[]> = {
    '1': [
        {
            id: 'debt_demo_001',
            agentId: '1',
            agentName: 'Khalid Al-Mansouri',
            amountAed: 75_000,
            reason: 'cancelled_deal',
            description: 'Commission reversal — Marina Blue Unit 1204 buyer withdrawal (post-SPA)',
            sourceEventId: 'PSI-EVT-EGY-Q3-2025',
            sourceEventName: 'Cairo Cityscape Q3 2025',
            createdAt: '2025-09-20T10:00:00.000Z',
            status: 'outstanding',
            recoveredAed: 0,
            remainingAed: 75_000,
        },
    ],
    '3': [
        {
            id: 'debt_demo_002',
            agentId: '3',
            agentName: 'Omar Bin Rashid',
            amountAed: 15_000,
            reason: 'advance_recovery',
            description: 'Commission advance paid Feb 2025 — not yet recovered',
            sourceEventId: 'PSI-EVT-DXB-Q1-2025',
            sourceEventName: 'Dubai Motor Show Roadshow Q1 2025',
            createdAt: '2025-02-01T08:30:00.000Z',
            status: 'outstanding',
            recoveredAed: 0,
            remainingAed: 15_000,
        },
        {
            id: 'debt_demo_003',
            agentId: '3',
            agentName: 'Omar Bin Rashid',
            amountAed: 8_500,
            reason: 'compliance_penalty',
            description: 'Media compliance breach — Q2 2025 audit finding',
            sourceEventId: 'internal',
            sourceEventName: 'Internal Audit Q2 2025',
            createdAt: '2025-06-15T09:00:00.000Z',
            status: 'outstanding',
            recoveredAed: 0,
            remainingAed: 8_500,
        },
    ],
    '5': [
        {
            id: 'debt_demo_004',
            agentId: '5',
            agentName: 'Fatima Al-Zaabi',
            amountAed: 22_000,
            reason: 'chargeback',
            description: 'Payment chargeback — Saadiyat unit 3B, buyer dispute resolved against PSI',
            sourceEventId: 'PSI-EVT-AUH-Q4-2025',
            sourceEventName: 'Abu Dhabi Cityscape Q4 2025',
            createdAt: '2025-11-10T14:00:00.000Z',
            status: 'outstanding',
            recoveredAed: 0,
            remainingAed: 22_000,
        },
    ],
};

