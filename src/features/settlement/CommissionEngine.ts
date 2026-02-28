/**
 * CommissionEngine.ts
 * ─────────────────────────────────────────────────────────────
 * Pure math engine for PSI post-event commission settlement.
 *
 * Risk Tier Model:
 *   Gold   → agent earns 50% of their closed revenue
 *   Silver → agent earns 30% of their closed revenue
 *   Bronze → agent earns 20% of their closed revenue
 *   Remainder in every case flows to Branch Gross Profit.
 *
 * No side-effects. All functions are pure and deterministic.
 */

export type RiskTier = 'gold' | 'silver' | 'bronze';

export interface TierConfig {
    label: string;
    agentShare: number;   // decimal fraction (0.5, 0.3, 0.2)
    branchShare: number;  // decimal fraction (0.5, 0.7, 0.8)
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

export interface AgentEntry {
    id: string;
    name: string;
    branch: string;
    tier: RiskTier;
    closedRevenue: number; // AED — actual post-event closed sales
}

export interface AgentSettlement {
    agent: AgentEntry;
    tier: TierConfig;
    agentCommission: number;     // AED — agent's payout
    branchContribution: number;  // AED — flows to Branch Gross Profit
}

export interface SettlementSummary {
    grossRevenue: number;
    totalAgentCommissions: number;
    branchGrossProfit: number;
    roiPercent: number; // (branchGrossProfit / grossRevenue) * 100
    agentCount: number;
    highestEarner: AgentSettlement | null;
}

export interface SettlementReport {
    eventId: string;
    eventName: string;
    eventDate: string;
    venue: string;
    branchManager: string;
    agents: AgentSettlement[];
    summary: SettlementSummary;
    generatedAt: string; // ISO string
}

/**
 * Core calculation: given an agent entry, compute their commission split.
 */
export function calculateAgentSettlement(agent: AgentEntry): AgentSettlement {
    const tier = TIER_CONFIG[agent.tier];
    const agentCommission = Math.round(agent.closedRevenue * tier.agentShare);
    const branchContribution = agent.closedRevenue - agentCommission;
    return { agent, tier, agentCommission, branchContribution };
}

/**
 * Full settlement report for an entire event.
 */
export function calculateSettlement(
    eventName: string,
    eventDate: string,
    venue: string,
    branchManager: string,
    agents: AgentEntry[]
): SettlementReport {
    const settlements = agents.map(calculateAgentSettlement);

    const grossRevenue = agents.reduce((sum, a) => sum + a.closedRevenue, 0);
    const totalAgentCommissions = settlements.reduce((sum, s) => sum + s.agentCommission, 0);
    const branchGrossProfit = grossRevenue - totalAgentCommissions;

    const highestEarner =
        settlements.length > 0
            ? settlements.reduce((best, s) =>
                s.agentCommission > best.agentCommission ? s : best
            )
            : null;

    return {
        eventId: `PSI-STL-${Date.now().toString(36).toUpperCase()}`,
        eventName,
        eventDate,
        venue,
        branchManager,
        agents: settlements,
        summary: {
            grossRevenue,
            totalAgentCommissions,
            branchGrossProfit,
            roiPercent: grossRevenue > 0 ? (branchGrossProfit / grossRevenue) * 100 : 0,
            agentCount: agents.length,
            highestEarner,
        },
        generatedAt: new Date().toISOString(),
    };
}

/** Format a number as AED currency string. */
export function formatAED(amount: number): string {
    return new Intl.NumberFormat('en-AE', {
        style: 'currency',
        currency: 'AED',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

/** Format a date string as readable date. */
export function formatDate(iso: string): string {
    return new Intl.DateTimeFormat('en-AE', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    }).format(new Date(iso));
}

/** Demo seed data for first-run experience. */
export const DEMO_AGENTS: AgentEntry[] = [
    { id: '1', name: 'Khalid Al-Mansouri', branch: 'Abu Dhabi Main', tier: 'gold', closedRevenue: 4_200_000 },
    { id: '2', name: 'Sara Almarzouqi', branch: 'Dubai Marina', tier: 'gold', closedRevenue: 3_800_000 },
    { id: '3', name: 'Omar Bin Rashid', branch: 'Abu Dhabi Main', tier: 'silver', closedRevenue: 2_100_000 },
    { id: '4', name: 'Nour Al-Hamdan', branch: 'Sharjah', tier: 'silver', closedRevenue: 1_750_000 },
    { id: '5', name: 'Fatima Al-Zaabi', branch: 'Abu Dhabi Main', tier: 'bronze', closedRevenue: 950_000 },
    { id: '6', name: 'Rashed Al-Neyadi', branch: 'Dubai Marina', tier: 'bronze', closedRevenue: 680_000 },
];
