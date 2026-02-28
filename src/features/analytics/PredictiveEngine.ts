/**
 * PredictiveEngine.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Data aggregation + recommendation engine for the Predictive Analytics
 * & Sponsorship dashboard.
 *
 * All functions are pure and deterministic — no side-effects, easily testable.
 *
 * Recommendation algorithm:
 *   target_sponsorship = avg_total_cost / (1 - target_margin)
 *   where target_margin = 0.40 (40% guaranteed margin)
 *
 * E.g. avg_cost = 252,500 AED, margin = 40%
 *   → 252,500 / 0.60 = 420,833 AED gross required
 *   → sponsorship floor = 420,833 - avg_branch_contribution
 *
 * Simpler executive formulation used here:
 *   min_sponsorship = avg_cost × (target_margin / (1 - target_margin))
 *   rounded up to nearest 10,000 AED for clean presentation.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface HistoricalEvent {
    id: string;
    name: string;
    city: string;           // "London", "Dubai", "Abu Dhabi", etc.
    date: string;           // ISO date
    totalCost: number;      // AED — venue + logistics + marketing etc.
    grossRevenue: number;   // AED — total closed sales
    sponsorshipReceived: number; // AED — developer sponsorship contribution
    agentCount: number;
    leadsClosed: number;
}

export interface CityAggregation {
    city: string;
    eventCount: number;
    avgTotalCost: number;
    avgGrossRevenue: number;
    avgGrossProfit: number;
    avgSponsorshipReceived: number;
    avgProfitMargin: number;       // percent
    avgLeadsClosed: number;
    avgCostPerLead: number;
    avgRevenuePerAgent: number;
    bestEvent: HistoricalEvent;
    events: HistoricalEvent[];
}

export interface SponsorshipRecommendation {
    city: string;
    eventCount: number;
    avgCost: number;
    avgProfit: number;
    avgMargin: number;
    targetMargin: number;          // the guaranteed margin we're aiming for
    minSponsorshipAED: number;     // floor sponsorship to achieve targetMargin
    confidenceLevel: 'high' | 'medium' | 'low';
    rationale: string;
}

export interface ChartDataPoint {
    label: string;           // e.g. "London #1"
    date: string;
    totalCost: number;
    grossRevenue: number;
    grossProfit: number;
    sponsorship: number;
    marginPct: number;
}

// ── Historical mock dataset (5-city, multi-year roadshow history) ─────────────

export const HISTORICAL_EVENTS: HistoricalEvent[] = [
    // London roadshows (3 events)
    {
        id: 'lon-1', name: 'PSI London Autumn 2023', city: 'London', date: '2023-10-14',
        totalCost: 245_000, grossRevenue: 5_200_000, sponsorshipReceived: 180_000,
        agentCount: 12, leadsClosed: 38,
    },
    {
        id: 'lon-2', name: 'PSI London Spring 2024', city: 'London', date: '2024-04-20',
        totalCost: 260_000, grossRevenue: 6_100_000, sponsorshipReceived: 200_000,
        agentCount: 14, leadsClosed: 44,
    },
    {
        id: 'lon-3', name: 'PSI London Autumn 2024', city: 'London', date: '2024-10-12',
        totalCost: 252_000, grossRevenue: 5_750_000, sponsorshipReceived: 190_000,
        agentCount: 13, leadsClosed: 41,
    },

    // Dubai roadshows (4 events)
    {
        id: 'dxb-1', name: 'PSI Dubai Marina Showcase 2023', city: 'Dubai', date: '2023-03-08',
        totalCost: 320_000, grossRevenue: 9_800_000, sponsorshipReceived: 250_000,
        agentCount: 20, leadsClosed: 72,
    },
    {
        id: 'dxb-2', name: 'PSI Dubai Downtown Q3 2023', city: 'Dubai', date: '2023-09-15',
        totalCost: 310_000, grossRevenue: 10_200_000, sponsorshipReceived: 240_000,
        agentCount: 18, leadsClosed: 68,
    },
    {
        id: 'dxb-3', name: 'PSI Dubai Luxury Expo 2024', city: 'Dubai', date: '2024-02-22',
        totalCost: 340_000, grossRevenue: 11_500_000, sponsorshipReceived: 280_000,
        agentCount: 22, leadsClosed: 85,
    },
    {
        id: 'dxb-4', name: 'PSI Dubai Spring Investment 2024', city: 'Dubai', date: '2024-05-10',
        totalCost: 330_000, grossRevenue: 10_900_000, sponsorshipReceived: 270_000,
        agentCount: 20, leadsClosed: 78,
    },

    // Abu Dhabi (3 events)
    {
        id: 'auh-1', name: 'PSI AUH Q1 Roadshow 2023', city: 'Abu Dhabi', date: '2023-02-18',
        totalCost: 280_000, grossRevenue: 8_400_000, sponsorshipReceived: 200_000,
        agentCount: 16, leadsClosed: 55,
    },
    {
        id: 'auh-2', name: 'PSI AUH Luxury Summit 2024', city: 'Abu Dhabi', date: '2024-01-25',
        totalCost: 295_000, grossRevenue: 9_100_000, sponsorshipReceived: 220_000,
        agentCount: 18, leadsClosed: 62,
    },
    {
        id: 'auh-3', name: 'PSI AUH Q1 Roadshow 2025', city: 'Abu Dhabi', date: '2025-02-14',
        totalCost: 305_000, grossRevenue: 9_600_000, sponsorshipReceived: 230_000,
        agentCount: 19, leadsClosed: 66,
    },

    // Paris (2 events)
    {
        id: 'par-1', name: 'PSI Paris Investment Expo 2023', city: 'Paris', date: '2023-06-08',
        totalCost: 370_000, grossRevenue: 7_200_000, sponsorshipReceived: 300_000,
        agentCount: 14, leadsClosed: 40,
    },
    {
        id: 'par-2', name: 'PSI Paris Autumn 2024', city: 'Paris', date: '2024-09-19',
        totalCost: 385_000, grossRevenue: 7_800_000, sponsorshipReceived: 320_000,
        agentCount: 15, leadsClosed: 45,
    },

    // Singapore (2 events)
    {
        id: 'sin-1', name: 'PSI Singapore APAC 2023', city: 'Singapore', date: '2023-11-03',
        totalCost: 295_000, grossRevenue: 6_800_000, sponsorshipReceived: 220_000,
        agentCount: 12, leadsClosed: 48,
    },
    {
        id: 'sin-2', name: 'PSI Singapore Luxury 2025', city: 'Singapore', date: '2025-01-17',
        totalCost: 310_000, grossRevenue: 7_400_000, sponsorshipReceived: 240_000,
        agentCount: 14, leadsClosed: 52,
    },
];

// ── Aggregation engine ─────────────────────────────────────────────────────────

/** Average of an array of numbers */
function avg(arr: number[]): number {
    if (arr.length === 0) return 0;
    return arr.reduce((s, v) => s + v, 0) / arr.length;
}

/** Round up to nearest N */
function ceilTo(value: number, nearest: number): number {
    return Math.ceil(value / nearest) * nearest;
}

/**
 * Aggregate all historical events by city.
 * Returns a map of city → CityAggregation.
 */
export function aggregateByCity(
    events: HistoricalEvent[] = HISTORICAL_EVENTS
): Map<string, CityAggregation> {
    const map = new Map<string, CityAggregation>();

    const grouped = events.reduce((acc, ev) => {
        if (!acc[ev.city]) acc[ev.city] = [];
        acc[ev.city].push(ev);
        return acc;
    }, {} as Record<string, HistoricalEvent[]>);

    for (const [city, cityEvents] of Object.entries(grouped)) {
        const profits = cityEvents.map(e => e.grossRevenue - e.totalCost);
        const margins = cityEvents.map(e =>
            ((e.grossRevenue - e.totalCost) / e.grossRevenue) * 100
        );

        const bestEvent = cityEvents.reduce((best, e) =>
            (e.grossRevenue - e.totalCost) > (best.grossRevenue - best.totalCost) ? e : best
        );

        map.set(city, {
            city,
            eventCount: cityEvents.length,
            avgTotalCost: Math.round(avg(cityEvents.map(e => e.totalCost))),
            avgGrossRevenue: Math.round(avg(cityEvents.map(e => e.grossRevenue))),
            avgGrossProfit: Math.round(avg(profits)),
            avgSponsorshipReceived: Math.round(avg(cityEvents.map(e => e.sponsorshipReceived))),
            avgProfitMargin: parseFloat(avg(margins).toFixed(1)),
            avgLeadsClosed: Math.round(avg(cityEvents.map(e => e.leadsClosed))),
            avgCostPerLead: Math.round(avg(cityEvents.map(e => e.totalCost / e.leadsClosed))),
            avgRevenuePerAgent: Math.round(avg(cityEvents.map(e => e.grossRevenue / e.agentCount))),
            bestEvent,
            events: cityEvents.sort((a, b) => a.date.localeCompare(b.date)),
        });
    }

    return map;
}

/**
 * Build chart data series for a specific city's event history.
 * Returns array suitable for Recharts ComposedChart.
 */
export function buildCityChartData(
    city: string,
    events: HistoricalEvent[] = HISTORICAL_EVENTS
): ChartDataPoint[] {
    const cityEvents = events
        .filter(e => e.city === city)
        .sort((a, b) => a.date.localeCompare(b.date));

    return cityEvents.map((e, i) => ({
        label: `${city} #${i + 1}`,
        date: e.date,
        totalCost: e.totalCost,
        grossRevenue: e.grossRevenue,
        grossProfit: e.grossRevenue - e.totalCost,
        sponsorship: e.sponsorshipReceived,
        marginPct: parseFloat(
            (((e.grossRevenue - e.totalCost) / e.grossRevenue) * 100).toFixed(1)
        ),
    }));
}

/**
 * Build a cross-city comparison chart — one point per city.
 */
export function buildCitySummaryChartData(
    events: HistoricalEvent[] = HISTORICAL_EVENTS
): (CityAggregation & { label: string })[] {
    const agg = aggregateByCity(events);
    return Array.from(agg.values())
        .sort((a, b) => b.avgGrossProfit - a.avgGrossProfit)
        .map(c => ({ ...c, label: c.city }));
}

/**
 * Primary recommendation engine.
 * Given a city name, compute the minimum sponsorship to guarantee targetMarginPct.
 *
 * Formula:
 *   gross_needed = avg_cost / (1 - target_margin)
 *   sponsor_floor = gross_needed - avg_branch_contribution
 *   where avg_branch_contribution = avg_gross_revenue - avg_sponsorship_received
 *
 * Simpler (more conservative) executive formulation:
 *   sponsor_floor = avg_cost × target_margin_ratio, rounded to 10k
 */
export function generateSponsorshipRecommendation(
    city: string,
    targetMarginPct: number = 40,
    events: HistoricalEvent[] = HISTORICAL_EVENTS
): SponsorshipRecommendation | null {
    const agg = aggregateByCity(events);
    const cityData = agg.get(city);
    if (!cityData) return null;

    const targetMarginDecimal = targetMarginPct / 100;

    // Gross revenue needed to achieve target margin at this cost level
    const grossNeeded = cityData.avgTotalCost / (1 - targetMarginDecimal);

    // Average branch contribution (closed sales, excluding sponsorship)
    const avgBranchContribution =
        cityData.avgGrossRevenue - cityData.avgSponsorshipReceived;

    // Sponsorship needed = gross needed - branch contribution
    const rawSponsorship = Math.max(0, grossNeeded - avgBranchContribution);

    // Round UP to nearest 10,000 AED for clean commercial presentation
    const minSponsorshipAED = ceilTo(rawSponsorship, 10_000);

    const confidence: SponsorshipRecommendation['confidenceLevel'] =
        cityData.eventCount >= 3 ? 'high' :
            cityData.eventCount === 2 ? 'medium' : 'low';

    const rationale = `Based on ${cityData.eventCount} previous ${city} roadshow${cityData.eventCount > 1 ? 's' : ''}, ` +
        `average total event cost is ${cityData.avgTotalCost.toLocaleString('en-AE')} AED ` +
        `and average gross profit is ${cityData.avgGrossProfit.toLocaleString('en-AE')} AED ` +
        `(${cityData.avgProfitMargin}% margin). ` +
        `To guarantee a ${targetMarginPct}% margin on your next ${city} roadshow, ` +
        `your target Developer Sponsorship must be a minimum of ` +
        `${minSponsorshipAED.toLocaleString('en-AE')} AED.`;

    return {
        city,
        eventCount: cityData.eventCount,
        avgCost: cityData.avgTotalCost,
        avgProfit: cityData.avgGrossProfit,
        avgMargin: cityData.avgProfitMargin,
        targetMargin: targetMarginPct,
        minSponsorshipAED,
        confidenceLevel: confidence,
        rationale,
    };
}

/** All unique cities that have historical data */
export function getAvailableCities(
    events: HistoricalEvent[] = HISTORICAL_EVENTS
): string[] {
    return [...new Set(events.map(e => e.city))].sort();
}

/** Format as AED currency */
export function formatAED(n: number): string {
    if (n >= 1_000_000) return `AED ${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `AED ${(n / 1_000).toFixed(0)}K`;
    return `AED ${n.toLocaleString()}`;
}
