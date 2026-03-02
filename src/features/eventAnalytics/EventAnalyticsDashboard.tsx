/**
 * EventAnalyticsDashboard.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Real-Time Event Analytics Dashboard
 * Route: /event-analytics
 *
 * Sections:
 *   1. Live Counters bar (6 pulsing KPI cards)
 *   2. Activity Timeline — AreaChart (attendees + networking over time)
 *   3. Session Popularity — dual metric (attendees + bookmarks bar chart)
 *   4. Engagement Breakdown — horizontal bar chart
 *   5. Live Activity Feed — newest events scrolling list
 *   6. Session Details Table — sortable, filterable
 *
 * Admin Controls (top-right):
 *   • Time range: 15min / 1h / 4h / Today
 *   • Session filter: All / Live Only / Individual session
 *   • Export CSV
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis,
    CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
    Users, Wifi, Network, MessageSquare, Bookmark,
    Zap, Download, RefreshCw, Filter, ChevronDown,
    Radio, TrendingUp, Activity, Eye, Star, ArrowUp,
    ArrowDown, Minus, BarChart2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
    useEventAnalytics,
    ENGAGEMENT_BY_TYPE,
    type SessionStat,
    type TimeRange,
} from './eventAnalyticsData';

// ── Utility ───────────────────────────────────────────────────────────────────

function cn(...cs: (string | boolean | undefined)[]) {
    return cs.filter(Boolean).join(' ');
}

function fmt(n: number) {
    return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

function pct(part: number, total: number) {
    return total === 0 ? 0 : Math.round((part / total) * 100);
}

// ── Pulse dot ────────────────────────────────────────────────────────────────

function PulseDot({ color = 'bg-emerald-400' }: { color?: string }) {
    return (
        <span className="relative flex h-2.5 w-2.5">
            <span className={cn('animate-ping absolute inline-flex h-full w-full rounded-full opacity-60', color)} />
            <span className={cn('relative inline-flex rounded-full h-2.5 w-2.5', color)} />
        </span>
    );
}

// ── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({
    label, value, icon: Icon, color, sub, trend,
}: {
    label: string;
    value: string | number;
    icon: React.ElementType;
    color: string;
    sub?: string;
    trend?: 'up' | 'down' | 'flat';
}) {
    return (
        <motion.div
            layout
            className={cn(
                'bg-slate-900 border rounded-2xl p-5 flex flex-col gap-3 relative overflow-hidden',
                color === 'emerald' ? 'border-emerald-800/40' :
                    color === 'violet' ? 'border-violet-800/40' :
                        color === 'amber' ? 'border-amber-800/40' :
                            color === 'cyan' ? 'border-cyan-800/40' :
                                color === 'rose' ? 'border-rose-800/40' :
                                    'border-slate-800'
            )}
        >
            {/* Gradient blob */}
            <div className={cn(
                'absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 blur-2xl',
                color === 'emerald' ? 'bg-emerald-400' :
                    color === 'violet' ? 'bg-violet-400' :
                        color === 'amber' ? 'bg-amber-400' :
                            color === 'cyan' ? 'bg-cyan-400' :
                                color === 'rose' ? 'bg-rose-400' : 'bg-slate-400'
            )} />
            <div className="flex items-center justify-between">
                <div className={cn(
                    'w-9 h-9 rounded-xl flex items-center justify-center',
                    color === 'emerald' ? 'bg-emerald-500/20 text-emerald-400' :
                        color === 'violet' ? 'bg-violet-500/20 text-violet-400' :
                            color === 'amber' ? 'bg-amber-500/20 text-amber-400' :
                                color === 'cyan' ? 'bg-cyan-500/20 text-cyan-400' :
                                    color === 'rose' ? 'bg-rose-500/20 text-rose-400' :
                                        'bg-slate-800 text-slate-400'
                )}>
                    <Icon size={18} />
                </div>
                {trend && (
                    <div className={cn(
                        'flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                        trend === 'up' ? 'text-emerald-400 bg-emerald-500/10' :
                            trend === 'down' ? 'text-red-400 bg-red-500/10' :
                                'text-slate-500 bg-slate-800'
                    )}>
                        {trend === 'up' ? <ArrowUp size={9} /> : trend === 'down' ? <ArrowDown size={9} /> : <Minus size={9} />}
                        LIVE
                    </div>
                )}
            </div>
            <div>
                <motion.p
                    key={String(value)}
                    initial={{ opacity: 0.6, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-white font-black text-3xl leading-none"
                >
                    {typeof value === 'number' ? fmt(value) : value}
                </motion.p>
                <p className="text-slate-400 text-xs font-medium mt-1">{label}</p>
                {sub && <p className="text-slate-600 text-[10px] mt-0.5">{sub}</p>}
            </div>
        </motion.div>
    );
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 shadow-xl text-xs">
            <p className="text-slate-400 font-bold mb-2">{label}</p>
            {payload.map((entry: any) => (
                <div key={entry.dataKey} className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: entry.color }} />
                    <span className="text-slate-300">{entry.name}:</span>
                    <span className="text-white font-bold ml-auto pl-3">{entry.value}</span>
                </div>
            ))}
        </div>
    );
}

// ── Session row ───────────────────────────────────────────────────────────────

type SortKey = 'attendees' | 'bookmarks' | 'rating';

function SessionTable({ sessions }: { sessions: SessionStat[] }) {
    const [sortBy, setSortBy] = useState<SortKey>('attendees');
    const sorted = [...sessions].sort((a, b) => b[sortBy] - a[sortBy]);

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
                <thead>
                    <tr className="border-b border-slate-800">
                        {[
                            { key: null, label: 'Session' },
                            { key: null, label: 'Room' },
                            { key: 'attendees' as SortKey, label: 'Attendance' },
                            { key: 'bookmarks' as SortKey, label: 'Bookmarks' },
                            { key: 'rating' as SortKey, label: 'Rating' },
                            { key: null, label: 'Status' },
                        ].map(col => (
                            <th
                                key={col.label}
                                className={cn(
                                    'text-left py-3 px-4 text-[10px] font-black uppercase tracking-widest text-slate-500',
                                    col.key && 'cursor-pointer hover:text-slate-300 transition-colors'
                                )}
                                onClick={() => col.key && setSortBy(col.key)}
                            >
                                <span className="flex items-center gap-1">
                                    {col.label}
                                    {col.key && sortBy === col.key && <ArrowDown size={9} className="text-emerald-400" />}
                                </span>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    <AnimatePresence>
                        {sorted.map((s, i) => {
                            const fillPct = pct(s.attendees, s.capacity);
                            return (
                                <motion.tr
                                    key={s.id}
                                    layout
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors group"
                                >
                                    <td className="py-3 px-4">
                                        <p className="text-white font-semibold text-sm">{s.name}</p>
                                        <p className="text-slate-500 text-xs mt-0.5">{s.speaker}</p>
                                    </td>
                                    <td className="py-3 px-4 text-slate-400 text-xs">{s.room}</td>
                                    <td className="py-3 px-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-16 bg-slate-800 rounded-full h-1.5">
                                                <motion.div
                                                    animate={{ width: `${fillPct}%` }}
                                                    className={cn(
                                                        'h-1.5 rounded-full',
                                                        fillPct >= 90 ? 'bg-rose-500' :
                                                            fillPct >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
                                                    )}
                                                />
                                            </div>
                                            <span className="text-white text-xs font-bold">{s.attendees}</span>
                                            <span className="text-slate-600 text-[10px]">/{s.capacity}</span>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="flex items-center gap-1 text-amber-400">
                                            <Bookmark size={11} />
                                            <span className="text-white text-xs font-semibold">{s.bookmarks}</span>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="flex items-center gap-1">
                                            <Star size={11} className="text-amber-400" />
                                            <span className="text-white text-xs font-bold">{s.rating.toFixed(1)}</span>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4">
                                        {s.isLive ? (
                                            <span className="flex items-center gap-1.5 text-emerald-400 text-[10px] font-black uppercase">
                                                <PulseDot />
                                                Live
                                            </span>
                                        ) : (
                                            <span className="text-slate-600 text-[10px] font-bold uppercase">Ended</span>
                                        )}
                                    </td>
                                </motion.tr>
                            );
                        })}
                    </AnimatePresence>
                </tbody>
            </table>
        </div>
    );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

const TIME_RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
    { value: '15min', label: 'Last 15 Min' },
    { value: '1h', label: 'Last Hour' },
    { value: '4h', label: 'Last 4 Hours' },
    { value: 'today', label: 'Today' },
];

export default function EventAnalyticsDashboard() {
    const {
        counters, activityFeed, lastTick,
        timeRange, setTimeRange,
        sessionFilter, setSessionFilter,
        getChartData, getFilteredSessions, exportCSV,
    } = useEventAnalytics(3000);

    const chartData = getChartData();
    const filteredSessions = getFilteredSessions();

    function handleExport() {
        exportCSV();
        toast.success('Analytics data exported as CSV');
    }

    const totalCapacity = filteredSessions.reduce((s, x) => s + x.capacity, 0);
    const totalAttendees = filteredSessions.reduce((s, x) => s + x.attendees, 0);
    const overallFill = pct(totalAttendees, totalCapacity);

    return (
        <div className="min-h-screen bg-slate-950 font-sans">

            {/* ── Header ───────────────────────────────────────────────────── */}
            <div className="bg-slate-900 border-b border-slate-800 px-6 py-5 sticky top-0 z-20">
                <div className="max-w-screen-2xl mx-auto flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* Title */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                            <Activity size={20} className="text-emerald-400" />
                            <h1 className="text-white font-extrabold text-xl">Real-Time Analytics</h1>
                            <PulseDot />
                        </div>
                        <p className="text-slate-500 text-xs">
                            Auto-refreshes · Last update: {lastTick.toLocaleTimeString()}
                        </p>
                    </div>

                    {/* Controls */}
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Time range */}
                        <div className="flex bg-slate-800 rounded-xl p-1 gap-0.5">
                            {TIME_RANGE_OPTIONS.map(opt => (
                                <button
                                    key={opt.value}
                                    onClick={() => setTimeRange(opt.value)}
                                    className={cn(
                                        'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                                        timeRange === opt.value
                                            ? 'bg-emerald-600 text-white shadow'
                                            : 'text-slate-400 hover:text-slate-200'
                                    )}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>

                        {/* Session filter */}
                        <div className="relative">
                            <select
                                value={sessionFilter}
                                onChange={e => setSessionFilter(e.target.value)}
                                className="appearance-none bg-slate-800 border border-slate-700 text-slate-300 text-xs font-medium rounded-xl pl-3 pr-8 py-2 focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
                            >
                                <option value="all">All Sessions</option>
                                <option value="live">Live Only</option>
                                {filteredSessions.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                            <Filter size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                        </div>

                        {/* Export */}
                        <button
                            onClick={handleExport}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold hover:bg-slate-700 hover:text-white transition-colors"
                        >
                            <Download size={13} /> Export CSV
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Content ──────────────────────────────────────────────────── */}
            <div className="max-w-screen-2xl mx-auto px-6 py-8 space-y-8">

                {/* ── 1. Live KPI counters ──────────────────────────────────── */}
                <section>
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                        <KpiCard
                            label="Attendees Online"
                            value={counters.attendeesOnline}
                            icon={Users}
                            color="emerald"
                            sub={`${overallFill}% venue fill`}
                            trend="up"
                        />
                        <KpiCard
                            label="Sessions Live"
                            value={counters.sessionsLive}
                            icon={Radio}
                            color="rose"
                            sub="of 8 total sessions"
                            trend="flat"
                        />
                        <KpiCard
                            label="Connections Made"
                            value={counters.networkingConnections}
                            icon={Network}
                            color="violet"
                            sub="via Smart Networking"
                            trend="up"
                        />
                        <KpiCard
                            label="Messages Sent"
                            value={counters.messagesSent}
                            icon={MessageSquare}
                            color="cyan"
                            sub="in-app messages"
                            trend="up"
                        />
                        <KpiCard
                            label="Total Bookmarks"
                            value={counters.bookmarks}
                            icon={Bookmark}
                            color="amber"
                            sub="across all sessions"
                            trend="up"
                        />
                        <KpiCard
                            label="Avg Engagement"
                            value={`${counters.avgEngagement}%`}
                            icon={Zap}
                            color="emerald"
                            sub="combined score"
                            trend={counters.avgEngagement > 70 ? 'up' : 'down'}
                        />
                    </div>
                </section>

                {/* ── 2. Activity Timeline ─────────────────────────────────── */}
                <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-white font-bold text-base flex items-center gap-2">
                                <TrendingUp size={16} className="text-emerald-400" />
                                Attendee Activity Timeline
                            </h2>
                            <p className="text-slate-500 text-xs mt-0.5">Online attendees, networking events, and session check-ins over time</p>
                        </div>
                        <PulseDot color="bg-emerald-400" />
                    </div>
                    <ResponsiveContainer width="100%" height={260}>
                        <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="gradAttendees" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="gradNetworking" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="gradCheckIns" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis
                                dataKey="time"
                                tick={{ fill: '#475569', fontSize: 10 }}
                                tickLine={false}
                                axisLine={false}
                                interval="preserveStartEnd"
                            />
                            <YAxis tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} axisLine={false} />
                            <Tooltip content={<ChartTooltip />} />
                            <Legend
                                wrapperStyle={{ paddingTop: 12, fontSize: 11, color: '#94a3b8' }}
                                iconType="circle"
                            />
                            <Area
                                type="monotone"
                                dataKey="attendeesOnline"
                                name="Attendees Online"
                                stroke="#10b981"
                                strokeWidth={2}
                                fill="url(#gradAttendees)"
                                dot={false}
                                activeDot={{ r: 4, fill: '#10b981' }}
                                isAnimationActive={false}
                            />
                            <Area
                                type="monotone"
                                dataKey="sessionCheckIns"
                                name="Session Check-ins"
                                stroke="#f59e0b"
                                strokeWidth={1.5}
                                fill="url(#gradCheckIns)"
                                dot={false}
                                activeDot={{ r: 4, fill: '#f59e0b' }}
                                isAnimationActive={false}
                            />
                            <Area
                                type="monotone"
                                dataKey="networkingEvents"
                                name="Networking Events"
                                stroke="#6366f1"
                                strokeWidth={1.5}
                                fill="url(#gradNetworking)"
                                dot={false}
                                activeDot={{ r: 4, fill: '#6366f1' }}
                                isAnimationActive={false}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </section>

                {/* ── 3. Session Popularity + Engagement breakdown ─────────── */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                    {/* Session popularity bar chart */}
                    <div className="xl:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6">
                        <h2 className="text-white font-bold text-base flex items-center gap-2 mb-1">
                            <BarChart2 size={16} className="text-amber-400" />
                            Session Popularity
                        </h2>
                        <p className="text-slate-500 text-xs mb-5">Live attendee count vs. bookmarks per session</p>
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart
                                data={filteredSessions.map(s => ({
                                    name: s.name.length > 20 ? `${s.name.slice(0, 19)}…` : s.name,
                                    Attendees: s.attendees,
                                    Bookmarks: s.bookmarks,
                                    Capacity: s.capacity,
                                }))}
                                margin={{ top: 4, right: 4, left: -20, bottom: 28 }}
                                barCategoryGap="30%"
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    tick={{ fill: '#475569', fontSize: 9 }}
                                    tickLine={false}
                                    axisLine={false}
                                    angle={-30}
                                    textAnchor="end"
                                    interval={0}
                                />
                                <YAxis tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} axisLine={false} />
                                <Tooltip content={<ChartTooltip />} />
                                <Legend wrapperStyle={{ paddingTop: 16, fontSize: 11, color: '#94a3b8' }} iconType="circle" />
                                <Bar dataKey="Attendees" fill="#10b981" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                                <Bar dataKey="Bookmarks" fill="#f59e0b" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Engagement breakdown */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                        <h2 className="text-white font-bold text-base flex items-center gap-2 mb-1">
                            <Zap size={16} className="text-violet-400" />
                            Engagement Breakdown
                        </h2>
                        <p className="text-slate-500 text-xs mb-6">Activity type distribution</p>
                        <div className="space-y-4">
                            {ENGAGEMENT_BY_TYPE.map(item => (
                                <div key={item.type}>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <p className="text-slate-300 text-xs font-medium">{item.type}</p>
                                        <p className="text-white text-xs font-bold">{item.value}%</p>
                                    </div>
                                    <div className="w-full bg-slate-800 rounded-full h-2">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${item.value}%` }}
                                            transition={{ duration: 0.8, ease: 'easeOut' }}
                                            className="h-2 rounded-full"
                                            style={{ backgroundColor: item.color }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Engagement score ring */}
                        <div className="mt-8 flex flex-col items-center gap-2">
                            <div className="relative w-24 h-24">
                                <svg className="w-24 h-24 -rotate-90" viewBox="0 0 80 80">
                                    <circle cx="40" cy="40" r="32" fill="none" strokeWidth="6" className="stroke-slate-800" />
                                    <motion.circle
                                        cx="40" cy="40" r="32" fill="none" strokeWidth="6"
                                        strokeDasharray={2 * Math.PI * 32}
                                        initial={{ strokeDashoffset: 2 * Math.PI * 32 }}
                                        animate={{ strokeDashoffset: 2 * Math.PI * 32 * (1 - counters.avgEngagement / 100) }}
                                        transition={{ duration: 0.8 }}
                                        strokeLinecap="round"
                                        stroke="#10b981"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-white font-black text-xl">{counters.avgEngagement}%</span>
                                </div>
                            </div>
                            <p className="text-slate-400 text-xs font-medium">Overall Engagement</p>
                        </div>
                    </div>
                </div>

                {/* ── 4. Bottom grid: Activity Feed + Session Table ─────────── */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                    {/* Live Activity Feed */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-white font-bold text-base flex items-center gap-2">
                                <Wifi size={15} className="text-emerald-400" />
                                Live Activity Feed
                            </h2>
                            <PulseDot />
                        </div>
                        <div className="flex-1 space-y-2.5 overflow-y-auto max-h-96 pr-1 scrollbar-none">
                            <AnimatePresence initial={false}>
                                {activityFeed.map(item => (
                                    <motion.div
                                        key={item.id}
                                        initial={{ opacity: 0, x: -12 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0 }}
                                        className="flex items-start gap-3 p-3 bg-slate-800/60 rounded-xl border border-slate-800"
                                    >
                                        <span className="text-lg flex-shrink-0 mt-0.5">{item.icon}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-slate-300 text-xs leading-snug">{item.label}</p>
                                            <p className="text-slate-600 text-[10px] mt-0.5">
                                                {Math.round((Date.now() - item.time.getTime()) / 1000)}s ago
                                            </p>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Session detail table */}
                    <div className="xl:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-white font-bold text-base flex items-center gap-2">
                                <Eye size={15} className="text-cyan-400" />
                                Session Detail View
                            </h2>
                            <span className="text-slate-500 text-xs">{filteredSessions.length} sessions · click column headers to sort</span>
                        </div>
                        <SessionTable sessions={filteredSessions} />
                    </div>
                </div>

                {/* ── 5. Engagement score line chart (full width) ───────────── */}
                <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <h2 className="text-white font-bold text-base flex items-center gap-2">
                                <Zap size={16} className="text-amber-400" />
                                Engagement Score Over Time
                            </h2>
                            <p className="text-slate-500 text-xs mt-0.5">Composite engagement score (0–100) — higher = more active attendees</p>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={160}>
                        <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="gradEngagement" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis dataKey="time" tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                            <YAxis domain={[30, 100]} tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} axisLine={false} />
                            <Tooltip content={<ChartTooltip />} />
                            <Area
                                type="monotone"
                                dataKey="engagementScore"
                                name="Engagement Score"
                                stroke="#f59e0b"
                                strokeWidth={2}
                                fill="url(#gradEngagement)"
                                dot={false}
                                activeDot={{ r: 4 }}
                                isAnimationActive={false}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </section>

            </div>
        </div>
    );
}
