/**
 * PredictiveAnalyticsDashboard.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Executive Predictive Analytics & Sponsorship Dashboard.
 *
 * Two-panel layout:
 *   LEFT (2/3): Dual-axis ComposedChart — bars for Cost & Revenue,
 *               line for Gross Profit, overlaid margin % line on right axis.
 *
 *   RIGHT (1/3): System Recommendation card — minimum sponsorship target
 *                computed by PredictiveEngine, with confidence badge and
 *                clear formula breakdown.
 *
 * City selector drives both panels simultaneously.
 */

import React, { useMemo, useState } from 'react';
import {
    ComposedChart,
    Bar,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    ReferenceLine,
    Cell,
    BarChart,
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import {
    Sparkles,
    TrendingUp,
    Target,
    Building2,
    ShieldCheck,
    AlertTriangle,
    Info,
    ChevronDown,
    Globe,
    BarChart3,
    ArrowRight,
    Lightbulb,
    Percent,
} from 'lucide-react';
import {
    getAvailableCities,
    generateSponsorshipRecommendation,
    buildCityChartData,
    buildCitySummaryChartData,
    aggregateByCity,
    formatAED,
    SponsorshipRecommendation,
    ChartDataPoint,
} from './PredictiveEngine';

// ── Helpers ───────────────────────────────────────────────────────────────────

function clsx(...c: (string | false | undefined | null)[]) {
    return c.filter(Boolean).join(' ');
}

const PALETTE = {
    cost: '#ef4444',   // red-500
    revenue: '#10b981',   // emerald-500
    profit: '#3b82f6',   // blue-500
    sponsorship: '#f59e0b',  // amber-500
    margin: '#8b5cf6',   // violet-500
};

// ── Custom Tooltip ────────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: {
    active?: boolean;
    payload?: { color: string; name: string; value: number }[];
    label?: string;
}) {
    if (!active || !payload?.length) return null;
    return (
        <div className="psi-card rounded-2xl p-4 shadow-2xl min-w-[200px]">
            <p className="text-psi-primary font-bold text-sm mb-3">{label}</p>
            {payload.map((p, i) => (
                <div key={i} className="flex items-center justify-between gap-4 mb-1.5">
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
                        <span className="text-psi-secondary text-xs">{p.name}</span>
                    </div>
                    <span className="text-psi-primary text-xs font-bold">
                        {p.name === 'Margin %' ? `${p.value}%` : formatAED(p.value)}
                    </span>
                </div>
            ))}
        </div>
    );
}

// ── City Axis Tick ────────────────────────────────────────────────────────────

function formatYAxis(value: number): string {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
    return String(value);
}

// ── Recommendation Card ────────────────────────────────────────────────────────

function RecommendationCard({ rec }: { rec: SponsorshipRecommendation }) {
    const confidenceConfig = {
        high: { label: 'High Confidence', color: 'text-psi-success', bg: 'bg-psi-success', border: 'border-psi-accent', icon: <ShieldCheck size={13} /> },
        medium: { label: 'Medium Confidence', color: 'text-psi-warning', bg: 'bg-psi-warning', border: 'border-psi-accent', icon: <AlertTriangle size={13} /> },
        low: { label: 'Low Confidence', color: 'text-psi-error', bg: 'bg-psi-error', border: 'border-psi-accent', icon: <Info size={13} /> },
    };
    const conf = confidenceConfig[rec.confidenceLevel];

    return (
        <motion.div
            key={rec.city}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="h-full flex flex-col"
        >
            {/* Header */}
            <div className="psi-card rounded-2xl border-amber-500/30 p-5 mb-4 flex-shrink-0">
                <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
                        <Lightbulb size={16} className="text-white" />
                    </div>
                    <div>
                        <p className="text-amber-600 dark:text-amber-400 text-[10px] font-bold tracking-[0.2em] uppercase">System Recommendation</p>
                        <p className="text-psi-primary text-sm font-extrabold">{rec.city} Roadshow</p>
                    </div>
                </div>

                {/* Confidence badge */}
                <div className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border', conf.color, conf.bg, conf.border)}>
                    {conf.icon}
                    {conf.label} ({rec.eventCount} event{rec.eventCount > 1 ? 's' : ''})
                </div>
            </div>

            {/* Main recommendation */}
            <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-5 mb-4 flex-shrink-0">
                <p className="text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase tracking-widest mb-2">
                    Minimum Developer Sponsorship
                </p>
                <p className="text-psi-primary text-4xl font-extrabold tracking-tight leading-none mb-1">
                    {rec.minSponsorshipAED.toLocaleString('en-AE')}
                    <span className="text-amber-500 text-lg ml-2">AED</span>
                </p>
                <p className="text-psi-secondary text-xs mt-2">
                    To guarantee a <strong className="text-psi-primary">{rec.targetMargin}% profit margin</strong> on your next {rec.city} roadshow
                </p>
            </div>

            {/* Formula breakdown */}
            <div className="psi-card rounded-2xl p-4 mb-4 space-y-3 flex-shrink-0">
                <p className="text-psi-muted text-xs font-bold uppercase tracking-widest flex items-center gap-1.5">
                    <BarChart3 size={12} />
                    Historical Averages ({rec.eventCount} events)
                </p>
                {[
                    { label: 'Avg Total Event Cost', value: formatAED(rec.avgCost), color: 'text-psi-error' },
                    { label: 'Avg Gross Profit', value: formatAED(rec.avgProfit), color: 'text-psi-info' },
                    { label: 'Avg Profit Margin', value: `${rec.avgMargin}%`, color: 'text-violet-600 dark:text-violet-400' },
                    { label: 'Target Margin', value: `${rec.targetMargin}%`, color: 'text-psi-success' },
                ].map(({ label, value, color }) => (
                    <div key={label} className="flex items-center justify-between">
                        <span className="text-psi-muted text-xs">{label}</span>
                        <span className={clsx('text-xs font-bold', color)}>{value}</span>
                    </div>
                ))}

                {/* Formula */}
                <div className="pt-2 border-t border-psi">
                    <p className="text-psi-muted text-[10px] font-mono leading-relaxed">
                        gross_needed = avg_cost ÷ (1 − {rec.targetMargin}%)<br />
                        sponsor_floor = gross_needed − avg_branch_contribution<br />
                        result = ↑ rounded to nearest 10,000 AED
                    </p>
                </div>
            </div>

            {/* ROI callout */}
            <div className="bg-psi-success border border-psi-accent rounded-2xl p-4 flex-1">
                <div className="flex items-start gap-2">
                    <Target size={14} className="text-psi-success mt-0.5 flex-shrink-0" />
                    <div>
                        <p className="text-psi-success text-xs font-bold mb-1">ROI Guarantee Logic</p>
                        <p className="text-psi-secondary text-[11px] leading-relaxed">
                            At <strong className="text-psi-primary">{formatAED(rec.minSponsorshipAED)}</strong> developer contribution,
                            even if agent sales underperform by 15%, the event breaks even.
                            Anything above this floor is pure Branch Gross Profit.
                        </p>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

// ── City Summary Mini-Chart ───────────────────────────────────────────────────

function CitySummaryRow({
    city, avgProfit, avgMargin, maxProfit,
}: {
    city: string; avgProfit: number; avgMargin: number; maxProfit: number;
}) {
    const pct = maxProfit > 0 ? (avgProfit / maxProfit) * 100 : 0;
    return (
        <div className="flex items-center gap-3">
            <div className="w-20 text-xs text-psi-secondary font-medium truncate">{city}</div>
            <div className="flex-1 h-2 bg-psi-subtle rounded-full overflow-hidden">
                <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                />
            </div>
            <div className="text-right min-w-[80px]">
                <span className="text-psi-primary text-xs font-bold">{formatAED(avgProfit)}</span>
                <span className="text-psi-muted text-[10px] ml-1">({avgMargin}%)</span>
            </div>
        </div>
    );
}

// ── Main Dashboard Component ──────────────────────────────────────────────────

interface Props {
    defaultCity?: string;
    targetMargin?: number;
    className?: string;
}

export default function PredictiveAnalyticsDashboard({
    defaultCity = 'London',
    targetMargin = 40,
    className = '',
}: Props) {
    const cities = useMemo(() => getAvailableCities(), []);
    const [city, setCity] = useState(defaultCity);
    const [showAllCities, setShowAllCities] = useState(false);

    const chartData = useMemo(() => buildCityChartData(city), [city]);
    const summaryData = useMemo(() => buildCitySummaryChartData(), []);
    const cityAgg = useMemo(() => aggregateByCity(), []);
    const recommendation = useMemo(() =>
        generateSponsorshipRecommendation(city, targetMargin),
        [city, targetMargin]);

    const maxProfit = Math.max(...summaryData.map(d => d.avgGrossProfit));

    return (
        <div className={clsx('space-y-6', className)}>

            {/* ── Header ────────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-7 h-7 bg-violet-600 rounded-lg flex items-center justify-center">
                            <Sparkles size={15} className="text-white" />
                        </div>
                        <span className="text-violet-600 dark:text-violet-400 text-xs font-bold tracking-[0.15em] uppercase">AI Analytics Engine</span>
                    </div>
                    <h2 className="text-psi-primary text-2xl font-extrabold tracking-tight">
                        Predictive Analytics &amp; Sponsorship
                    </h2>
                    <p className="text-psi-secondary text-sm mt-0.5">
                        Historical aggregation · Sponsorship recommender · Multi-city P&amp;L
                    </p>
                </div>

                {/* City selector */}
                <div className="relative flex-shrink-0">
                    <Globe size={14} className="absolute left-3 top-3 text-psi-muted" />
                    <select
                        id="prediction-city-selector"
                        value={city}
                        onChange={e => setCity(e.target.value)}
                        className="psi-input appearance-none pl-8 pr-8 py-2.5 text-sm font-semibold cursor-pointer min-w-[160px]"
                    >
                        {cities.map(c => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                    <ChevronDown size={13} className="absolute right-3 top-3 text-psi-muted pointer-events-none" />
                </div>
            </div>

            {/* ── City KPI strip ────────────────────────────────────────── */}
            {cityAgg.get(city) && (
                <motion.div
                    key={city}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-2 sm:grid-cols-4 gap-3"
                >
                    {[
                        { label: 'Avg Total Cost', value: formatAED(cityAgg.get(city)!.avgTotalCost), color: 'text-psi-error', icon: <TrendingUp size={16} /> },
                        { label: 'Avg Gross Profit', value: formatAED(cityAgg.get(city)!.avgGrossProfit), color: 'text-psi-info', icon: <BarChart3 size={16} /> },
                        { label: 'Avg Profit Margin', value: `${cityAgg.get(city)!.avgProfitMargin}%`, color: 'text-violet-600 dark:text-violet-400', icon: <Percent size={16} /> },
                        { label: 'Avg Leads Closed', value: `${cityAgg.get(city)!.avgLeadsClosed}`, color: 'text-psi-success', icon: <Target size={16} /> },
                    ].map(({ label, value, color, icon }) => (
                        <div key={label} className="psi-card rounded-2xl p-4">
                            <div className={clsx('mb-2', color)}>{icon}</div>
                            <p className="text-psi-muted text-[10px] font-bold uppercase tracking-widest mb-0.5">{label}</p>
                            <p className={clsx('text-xl font-extrabold', color)}>{value}</p>
                            <p className="text-psi-muted text-[10px]">{cityAgg.get(city)!.eventCount} events</p>
                        </div>
                    ))}
                </motion.div>
            )}

            {/* ── Main layout: Chart + Recommendation ───────────────────── */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

                {/* CHART — occupies 2/3 */}
                <div className="xl:col-span-2 psi-card rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="text-psi-primary font-bold text-base flex items-center gap-2">
                            <BarChart3 size={16} className="text-violet-500 dark:text-violet-400" />
                            Cost vs. Revenue vs. Profit — {city} Roadshows
                        </h3>
                        <span className="text-xs text-psi-muted">
                            {chartData.length} event{chartData.length !== 1 ? 's' : ''}
                        </span>
                    </div>

                    <ResponsiveContainer width="100%" height={320}>
                        <ComposedChart
                            data={chartData}
                            margin={{ top: 8, right: 40, left: 0, bottom: 4 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--psi-chart-grid)" vertical={false} />
                            <XAxis
                                dataKey="label"
                                tick={{ fill: 'var(--psi-chart-tick)', fontSize: 11 }}
                                axisLine={false}
                                tickLine={false}
                            />
                            {/* Left Y-axis — AED amounts */}
                            <YAxis
                                yAxisId="left"
                                tickFormatter={formatYAxis}
                                tick={{ fill: 'var(--psi-chart-tick)', fontSize: 11 }}
                                axisLine={false}
                                tickLine={false}
                                width={52}
                            />
                            {/* Right Y-axis — Margin % */}
                            <YAxis
                                yAxisId="right"
                                orientation="right"
                                tickFormatter={v => `${v}%`}
                                tick={{ fill: '#8b5cf6', fontSize: 11 }}
                                axisLine={false}
                                tickLine={false}
                                domain={[0, 80]}
                                width={40}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend
                                wrapperStyle={{ paddingTop: '16px', fontSize: '12px', color: '#94a3b8' }}
                            />

                            {/* Cost bar */}
                            <Bar
                                yAxisId="left"
                                dataKey="totalCost"
                                name="Total Cost"
                                fill={PALETTE.cost}
                                fillOpacity={0.85}
                                radius={[4, 4, 0, 0]}
                                maxBarSize={48}
                            />

                            {/* Revenue bar */}
                            <Bar
                                yAxisId="left"
                                dataKey="grossRevenue"
                                name="Gross Revenue"
                                fill={PALETTE.revenue}
                                fillOpacity={0.85}
                                radius={[4, 4, 0, 0]}
                                maxBarSize={48}
                            />

                            {/* Gross Profit line */}
                            <Line
                                yAxisId="left"
                                type="monotone"
                                dataKey="grossProfit"
                                name="Gross Profit"
                                stroke={PALETTE.profit}
                                strokeWidth={3}
                                dot={{ r: 5, fill: PALETTE.profit, strokeWidth: 2, stroke: '#0f172a' }}
                                activeDot={{ r: 7 }}
                            />

                            {/* Sponsorship line */}
                            <Line
                                yAxisId="left"
                                type="monotone"
                                dataKey="sponsorship"
                                name="Sponsorship"
                                stroke={PALETTE.sponsorship}
                                strokeWidth={2}
                                strokeDasharray="5 3"
                                dot={{ r: 4, fill: PALETTE.sponsorship }}
                            />

                            {/* Margin % line — right axis */}
                            <Line
                                yAxisId="right"
                                type="monotone"
                                dataKey="marginPct"
                                name="Margin %"
                                stroke={PALETTE.margin}
                                strokeWidth={2}
                                dot={{ r: 4, fill: PALETTE.margin, strokeWidth: 2, stroke: '#0f172a' }}
                            />

                            {/* Target margin reference */}
                            <ReferenceLine
                                yAxisId="right"
                                y={targetMargin}
                                stroke="#8b5cf6"
                                strokeDasharray="6 3"
                                strokeOpacity={0.5}
                                label={{ value: `${targetMargin}% target`, fill: '#8b5cf6', fontSize: 10, position: 'insideTopRight' }}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>

                    {/* Legend chips */}
                    <div className="flex flex-wrap gap-2 mt-2 pt-3 border-t border-psi">
                        {[
                            { color: PALETTE.cost, label: 'Total Cost — bar' },
                            { color: PALETTE.revenue, label: 'Gross Revenue — bar' },
                            { color: PALETTE.profit, label: 'Gross Profit — line' },
                            { color: PALETTE.sponsorship, label: 'Sponsorship — dashed' },
                            { color: PALETTE.margin, label: 'Margin % — right axis' },
                        ].map(({ color, label }) => (
                            <div key={label} className="flex items-center gap-1.5 text-[10px] text-psi-muted">
                                <div className="w-3 h-1.5 rounded-full" style={{ background: color }} />
                                {label}
                            </div>
                        ))}
                    </div>
                </div>

                {/* RECOMMENDATION CARD — 1/3 */}
                <div className="xl:col-span-1">
                    <AnimatePresence mode="wait">
                        {recommendation ? (
                            <RecommendationCard key={city} rec={recommendation} />
                        ) : (
                            <div className="flex items-center justify-center h-64 bg-slate-900 rounded-2xl border border-slate-800 text-slate-600 text-sm">
                                No historical data for {city}
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* ── Cross-city comparison ─────────────────────────────────── */}
            <div className="psi-card rounded-2xl p-5">
                <div className="flex items-center justify-between mb-5">
                    <h3 className="text-psi-primary font-bold text-base flex items-center gap-2">
                        <Globe size={16} className="text-violet-500 dark:text-violet-400" />
                        Cross-City Avg Gross Profit Comparison
                    </h3>
                    <button
                        id="toggle-summary-btn"
                        onClick={() => setShowAllCities(p => !p)}
                        className="text-xs text-psi-muted hover:text-psi-action flex items-center gap-1 transition-colors"
                    >
                        {showAllCities ? 'Collapse' : 'Expand all'}
                        <ChevronDown size={12} className={clsx('transition-transform', showAllCities && 'rotate-180')} />
                    </button>
                </div>

                <div className="space-y-3">
                    {(showAllCities ? summaryData : summaryData.slice(0, 4)).map(d => (
                        <CitySummaryRow
                            key={d.city}
                            city={d.city}
                            avgProfit={d.avgGrossProfit}
                            avgMargin={d.avgProfitMargin}
                            maxProfit={maxProfit}
                        />
                    ))}
                </div>

                {/* Sponsor min table */}
                <div className="mt-5 pt-4 border-t border-psi">
                    <p className="text-psi-muted text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-1.5">
                        <Building2 size={12} />
                        Min. Sponsorship for {targetMargin}% Margin — All Cities
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                        {cities.map(c => {
                            const rec = generateSponsorshipRecommendation(c, targetMargin);
                            if (!rec) return null;
                            const isSelected = c === city;
                            return (
                                <button
                                    id={`city-card-${c.replace(/\s/g, '-')}`}
                                    key={c}
                                    onClick={() => setCity(c)}
                                    className={clsx(
                                        'rounded-xl p-3 border text-left transition-all',
                                        isSelected
                                            ? 'bg-psi-action-subtle border-psi-action ring-1 ring-psi-action'
                                            : 'bg-psi-subtle border-psi hover:border-psi-strong'
                                    )}
                                >
                                    <p className={clsx('text-xs font-bold mb-1', isSelected ? 'text-psi-action' : 'text-psi-secondary')}>
                                        {c}
                                    </p>
                                    <p className={clsx('text-sm font-extrabold', isSelected ? 'text-psi-primary' : 'text-psi-muted')}>
                                        {formatAED(rec.minSponsorshipAED)}
                                    </p>
                                    <div className={clsx(
                                        'mt-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full inline-block',
                                        rec.confidenceLevel === 'high' ? 'bg-psi-success text-psi-success' :
                                            rec.confidenceLevel === 'medium' ? 'bg-psi-warning text-psi-warning' :
                                                'bg-psi-error   text-psi-error'
                                    )}>
                                        {rec.eventCount} evt{rec.eventCount > 1 ? 's' : ''}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
