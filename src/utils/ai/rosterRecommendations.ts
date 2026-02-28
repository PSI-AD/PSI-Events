/**
 * rosterRecommendations.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * AI Roster Recommendation Engine (mock historical analysis).
 *
 * How the engine works:
 *   1. Given an agent ID and a target city, look up their historical record
 *      in the MOCK_HISTORY database.
 *   2. Derive a recommendation tier: STRONG_BUY | RISK | BLOCK | NEUTRAL.
 *   3. Compute a predicted AED earning for that city based on historical
 *      conversion rate × average UAE real estate deal size.
 *   4. Attach a human-readable rationale string for the UI badge.
 *
 * Sort helpers:
 *   sortByAiRecommendation(agents) — brings STRONG_BUY top, BLOCK bottom.
 *
 * All data in MOCK_HISTORY is fabricated for demo / presentation purposes.
 */

// ── Recommendation tiers ──────────────────────────────────────────────────────

export type RecommendationTier =
    | 'STRONG_BUY' // Green — proven performer in this market
    | 'RISK'       // Yellow — uncharted territory for this agent
    | 'BLOCK'      // Red   — disciplinary flag (no-show / penalty)
    | 'NEUTRAL';   // Grey  — insufficient data

// ── Recommendation result ─────────────────────────────────────────────────────

export interface AgentRecommendation {
    agentId: string;
    tier: RecommendationTier;
    headline: string;   // Short badge label
    rationale: string;   // Full explanation shown on hover/expand
    predictedAed: number;   // Expected gross contribution (AED)
    conversionRate: number;   // Historical % (0–1)
    sortWeight: number;   // Higher = bubble to top
}

// ── Mock historical database ──────────────────────────────────────────────────
// Keyed by `${agentId}::${city.toLowerCase()}`
// If a city key is absent, the engine infers RISK (new market).

interface HistoricalRecord {
    events: number;    // Times attended this city
    closings: number;    // Deals closed
    conversions: number;    // Qualified leads → deal
    totalLeads: number;    // Leads sourced at this city
    avgDealAed: number;    // Agent's average deal size in this city
    hasNoShow: boolean;   // At least one no-show on record
    hasPenalty: boolean;   // Any formal HR/compliance penalty
    marketFirstTime: boolean;   // True if agent has never attended this city
}

const MOCK_HISTORY: Record<string, HistoricalRecord> = {
    // Sara Al Marzouqi — London veteran, consistently top performer
    'usr_sara_almarzouqi_dxb::london': {
        events: 3, closings: 12, conversions: 48, totalLeads: 300,
        avgDealAed: 850_000, hasNoShow: false, hasPenalty: false, marketFirstTime: false,
    },
    // Khalid Mansouri — London first-timer, no show history
    'usr_khalid_mansouri_auh::london': {
        events: 0, closings: 0, conversions: 0, totalLeads: 0,
        avgDealAed: 0, hasNoShow: false, hasPenalty: false, marketFirstTime: true,
    },
    // Mohammed Al Qubaisi — Cairo regular
    'usr_mohammed_qubaisi_mgr::cairo': {
        events: 5, closings: 22, conversions: 80, totalLeads: 400,
        avgDealAed: 420_000, hasNoShow: false, hasPenalty: false, marketFirstTime: false,
    },
    // Amr ElFangary — Dubai proven
    'usr_said_abu_laila_admin::dubai': {
        events: 8, closings: 40, conversions: 210, totalLeads: 1200,
        avgDealAed: 1_200_000, hasNoShow: false, hasPenalty: false, marketFirstTime: false,
    },
    // Demo: agent with a no-show flag (used in BLOCK scenario)
    'usr_demo_no_show_agent::london': {
        events: 2, closings: 1, conversions: 5, totalLeads: 120,
        avgDealAed: 300_000, hasNoShow: true, hasPenalty: true, marketFirstTime: false,
    },
};

// ── Average deal size fallback per city (when no personal history) ────────────

const CITY_AVG_DEAL_AED: Record<string, number> = {
    london: 900_000,
    dubai: 750_000,
    cairo: 380_000,
    riyadh: 600_000,
    default: 650_000,
};

// ── Commission rate assumptions ───────────────────────────────────────────────

const GOLD_COMMISSION_RATE = 0.50; // 50% of deal goes to agent
const BROKERAGE_FEE_RATE = 0.04; // 4% brokerage of deal price (UAE avg)

// ── Core engine ───────────────────────────────────────────────────────────────

/**
 * getAgentRecommendation
 *
 * @param agentId  Firestore document ID from crm_users
 * @param city     Target event city in lowercase (e.g. 'london')
 * @param tierPct  Agent's package tier share (Gold=0.5, Silver=0.3, Bronze=0.2)
 * @returns        AgentRecommendation
 */
export function getAgentRecommendation(
    agentId: string,
    city: string,
    tierPct: number = GOLD_COMMISSION_RATE
): AgentRecommendation {
    const normalCity = city.trim().toLowerCase();
    const key = `${agentId}::${normalCity}`;
    const history = MOCK_HISTORY[key];
    const cityAvgDeal = CITY_AVG_DEAL_AED[normalCity] ?? CITY_AVG_DEAL_AED.default;

    // ── BLOCK: disciplinary record ──────────────────────────────────────────
    if (history?.hasPenalty || history?.hasNoShow) {
        return {
            agentId,
            tier: 'BLOCK',
            headline: 'Block',
            rationale: 'Previous No-Show penalty on record. Participation blocked pending HR clearance.',
            predictedAed: 0,
            conversionRate: 0,
            sortWeight: -100,
        };
    }

    // ── RISK: first time in this market ────────────────────────────────────
    if (!history || history.marketFirstTime || history.events === 0) {
        // Conservative estimate: assume 1% conversion on 20 leads at city avg deal
        const conservativeLeads = 20;
        const conservativeConvRate = 0.01;
        const predicted = Math.round(
            conservativeLeads * conservativeConvRate * cityAvgDeal * BROKERAGE_FEE_RATE * tierPct
        );
        return {
            agentId,
            tier: 'RISK',
            headline: 'New Market',
            rationale: `First time in ${titleCase(normalCity)} market. No conversion history available. Conservative estimate applied.`,
            predictedAed: predicted,
            conversionRate: conservativeConvRate,
            sortWeight: 0,
        };
    }

    // ── STRONG_BUY: proven performer ────────────────────────────────────────
    // Conversion rate = closings / totalLeads
    const convRate = history.totalLeads > 0 ? history.closings / history.totalLeads : 0;
    const convRatePct = Math.round(convRate * 100 * 10) / 10; // 1dp %

    // Expected contribution = 50 leads × conv rate × avg deal × brokerage × tier share
    const EXPECTED_LEADS = 50;
    const predicted = Math.round(
        EXPECTED_LEADS * convRate * (history.avgDealAed || cityAvgDeal) * BROKERAGE_FEE_RATE * tierPct
    );

    // Rationale snippets
    const eventsLabel = history.events === 1 ? '1 roadshow' : `${history.events} roadshows`;
    const marketLabel = titleCase(normalCity);

    return {
        agentId,
        tier: 'STRONG_BUY',
        headline: 'Strong Buy',
        rationale: `Historically converts at ${convRatePct}% in ${marketLabel} across ${eventsLabel}. Expected +${fmtAed(predicted)} net contribution.`,
        predictedAed: predicted,
        conversionRate: convRate,
        sortWeight: predicted, // sort by predicted AED — highest earners first
    };
}

// ── Sort helper ───────────────────────────────────────────────────────────────

/**
 * sortByAiRecommendation
 *
 * Sorts an array of objects (each with an agentId field) by the
 * AI recommendation score. STRONG_BUY → NEUTRAL → RISK → BLOCK.
 *
 * @param agents  Array of objects that have an `id` field matching an agentId
 * @param city    Target city for the event
 * @returns       Sorted array (descending by sortWeight)
 */
export function sortByAiRecommendation<T extends { id: string }>(
    agents: T[],
    city: string
): T[] {
    return [...agents].sort((a, b) => {
        const ra = getAgentRecommendation(a.id, city);
        const rb = getAgentRecommendation(b.id, city);
        return rb.sortWeight - ra.sortWeight;
    });
}

// ── Display helpers ───────────────────────────────────────────────────────────

/** Returns Tailwind classes for the badge colour by tier */
export function tierBadgeClasses(tier: RecommendationTier): {
    bg: string; text: string; border: string; dot: string;
} {
    switch (tier) {
        case 'STRONG_BUY':
            return {
                bg: 'bg-emerald-50  dark:bg-emerald-900/20',
                text: 'text-emerald-700 dark:text-emerald-300',
                border: 'border-emerald-200 dark:border-emerald-700/50',
                dot: 'bg-emerald-500',
            };
        case 'RISK':
            return {
                bg: 'bg-amber-50  dark:bg-amber-900/20',
                text: 'text-amber-700 dark:text-amber-300',
                border: 'border-amber-200 dark:border-amber-700/50',
                dot: 'bg-amber-400',
            };
        case 'BLOCK':
            return {
                bg: 'bg-rose-50  dark:bg-rose-900/20',
                text: 'text-rose-700 dark:text-rose-300',
                border: 'border-rose-200 dark:border-rose-700/50',
                dot: 'bg-rose-500',
            };
        default:
            return {
                bg: 'bg-slate-50  dark:bg-slate-800/40',
                text: 'text-slate-600 dark:text-slate-400',
                border: 'border-slate-200 dark:border-slate-700/50',
                dot: 'bg-slate-400',
            };
    }
}

// ── Utility ───────────────────────────────────────────────────────────────────

function titleCase(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

export function fmtAed(n: number): string {
    if (n >= 1_000_000) return `AED ${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `AED ${Math.round(n / 1_000)}K`;
    return `AED ${n.toLocaleString()}`;
}
