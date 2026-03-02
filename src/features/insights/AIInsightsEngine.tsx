/**
 * AIInsightsEngine.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * AI Event Insights Engine
 * Route: /insights
 *
 * Tabs:
 *   Overview    — KPIs + engagement heatmap
 *   Activity    — SVG area chart of the full-day timeline
 *   Speakers    — Speaker leaderboard with engagement bars
 *   Topics      — Topic popularity chart + trend indicators
 *   Networking  — Cluster visualization + connection stats
 *   AI Insights — AI-generated insight cards with streaming text reveal
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    BrainCircuit, TrendingUp, TrendingDown, Minus,
    Users, Star, MessageSquare, BarChart3,
    Zap, Clock, Network, Lightbulb,
    ChevronRight, Activity, Radio,
    Eye, ArrowUpRight, Sparkles, Target,
} from 'lucide-react';
import {
    HOURLY_DATA, TOPIC_SCORES, SPEAKER_METRICS,
    NETWORKING_CLUSTERS, ACTIVITY_TIMELINE, AI_INSIGHTS,
    EVENT_SUMMARY,
    type AIInsight,
} from './insightsData';

// ── Utility ───────────────────────────────────────────────────────────────────

function cn(...cs: (string | false | undefined)[]) { return cs.filter(Boolean).join(' '); }

function pct(v: number): string { return `${v}%`; }

// Colour ramp for heatmap: dark → amber → emerald
function heatColor(v: number): string {
    if (v < 20) return 'bg-slate-800';
    if (v < 40) return 'bg-slate-700';
    if (v < 55) return 'bg-amber-900/70';
    if (v < 70) return 'bg-amber-700/80';
    if (v < 82) return 'bg-amber-500/80';
    if (v < 92) return 'bg-emerald-500/80';
    return 'bg-emerald-400';
}

const PRIORITY_STYLES = {
    critical: 'border-red-500/30 bg-red-500/5',
    high: 'border-amber-500/30 bg-amber-500/5',
    medium: 'border-sky-500/20 bg-sky-500/5',
} as const;

const PRIORITY_BADGE = {
    critical: 'bg-red-500/15 text-red-400 border-red-500/20',
    high: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    medium: 'bg-sky-500/15 text-sky-400 border-sky-500/20',
} as const;

const CATEGORY_ICONS = {
    engagement: Zap,
    speaker: Star,
    topic: TrendingUp,
    networking: Network,
    operational: Target,
} as const;

type Tab = 'overview' | 'activity' | 'speakers' | 'topics' | 'networking' | 'insights';

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, icon: Icon, color, delay = 0 }: {
    label: string; value: string | number; sub?: string;
    icon: React.ElementType; color: string; delay?: number;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-4"
        >
            <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0', color)}>
                <Icon size={18} className="text-white" />
            </div>
            <div>
                <p className="text-white font-black text-xl leading-none">{typeof value === 'number' ? value.toLocaleString() : value}</p>
                <p className="text-slate-400 text-xs mt-0.5">{label}</p>
                {sub && <p className="text-slate-600 text-[10px] mt-0.5">{sub}</p>}
            </div>
        </motion.div>
    );
}

// ── Engagement Heatmap ────────────────────────────────────────────────────────

const HEATMAP_METRICS = [
    { key: 'attendance', label: 'Attendance', color: 'text-violet-400' },
    { key: 'engagement', label: 'Engagement', color: 'text-emerald-400' },
    { key: 'networkingPings', label: 'Networking', color: 'text-pink-400' },
    { key: 'pollVotes', label: 'Polls', color: 'text-amber-400' },
    { key: 'boothVisits', label: 'Booths', color: 'text-sky-400' },
] as const;

function Heatmap() {
    // Normalise boothVisits and networkingPings to 0-100 for display
    const maxBooth = Math.max(...HOURLY_DATA.map(d => d.boothVisits));
    const maxNet = Math.max(...HOURLY_DATA.map(d => d.networkingPings));
    const maxPoll = Math.max(...HOURLY_DATA.map(d => d.pollVotes));

    function val(d: typeof HOURLY_DATA[0], key: typeof HEATMAP_METRICS[number]['key']): number {
        switch (key) {
            case 'attendance': return d.attendance;
            case 'engagement': return d.engagement;
            case 'networkingPings': return Math.round((d.networkingPings / maxNet) * 100);
            case 'pollVotes': return Math.round((d.pollVotes / maxPoll) * 100);
            case 'boothVisits': return Math.round((d.boothVisits / maxBooth) * 100);
        }
    }

    const [hovered, setHovered] = useState<{ r: number; c: number; v: number; raw: number } | null>(null);

    return (
        <div className="overflow-x-auto">
            {/* Column headers */}
            <div className="flex mb-1 ml-24 gap-0.5">
                {HOURLY_DATA.map(h => (
                    <div key={h.hour} className="flex-1 text-center text-[9px] text-slate-600 font-mono min-w-[28px]">{h.label.replace(' ', '\n')}</div>
                ))}
            </div>

            {/* Grid */}
            {HEATMAP_METRICS.map((m, ri) => (
                <div key={m.key} className="flex items-center gap-0.5 mb-0.5">
                    <div className={cn('w-24 text-right pr-2 text-[10px] font-semibold flex-shrink-0', m.color)}>{m.label}</div>
                    {HOURLY_DATA.map((h, ci) => {
                        const v = val(h, m.key);
                        return (
                            <motion.div
                                key={h.hour}
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: (ri * 13 + ci) * 0.006, type: 'spring', stiffness: 400, damping: 20 }}
                                className={cn('flex-1 min-w-[28px] h-8 rounded-sm cursor-pointer transition-all ring-0 hover:ring-1 hover:ring-white/30', heatColor(v),
                                    hovered?.r === ri && hovered?.c === ci ? 'ring-2 ring-white/50 scale-105 z-10 relative' : '')}
                                onMouseEnter={() => setHovered({ r: ri, c: ci, v, raw: (h as unknown as Record<string, number>)[m.key] as number })}
                                onMouseLeave={() => setHovered(null)}
                            />
                        );
                    })}
                </div>
            ))}

            {/* Scale legend */}
            <div className="flex items-center gap-2 mt-3 ml-24">
                <span className="text-slate-600 text-[9px]">Low</span>
                <div className="flex gap-0.5">
                    {['bg-slate-800', 'bg-slate-700', 'bg-amber-900/70', 'bg-amber-700/80', 'bg-amber-500/80', 'bg-emerald-500/80', 'bg-emerald-400'].map(c => (
                        <div key={c} className={cn('w-6 h-2 rounded-sm', c)} />
                    ))}
                </div>
                <span className="text-slate-600 text-[9px]">High</span>
                {hovered && (
                    <span className="ml-4 text-white text-xs font-mono bg-slate-800 px-2 py-0.5 rounded">{hovered.raw}</span>
                )}
            </div>
        </div>
    );
}

// ── SVG Area Chart ────────────────────────────────────────────────────────────

function AreaChart({ metric, color, gradientId }: { metric: 'attendance' | 'networking' | 'content'; color: string; gradientId: string }) {
    const W = 800;
    const H = 160;
    const PAD = { top: 10, bottom: 20, left: 0, right: 0 };

    const data = ACTIVITY_TIMELINE;
    const maxV = 100;
    const innerW = W - PAD.left - PAD.right;
    const innerH = H - PAD.top - PAD.bottom;

    function x(i: number) { return PAD.left + (i / (data.length - 1)) * innerW; }
    function y(v: number) { return PAD.top + innerH - (v / maxV) * innerH; }

    const points = data.map((d, i) => `${x(i)},${y(d[metric])}`).join(' ');
    const areaPath = `M ${x(0)},${y(data[0][metric])} ` +
        data.slice(1).map((d, i) => `L ${x(i + 1)},${y(d[metric])}`).join(' ') +
        ` L ${x(data.length - 1)},${H - PAD.bottom} L ${x(0)},${H - PAD.bottom} Z`;

    // Hour tick marks
    const hourTicks = HOURLY_DATA.map((h, i) => {
        const idx = Math.round((h.hour - 8) * 4);
        return { label: h.label, xPos: x(Math.min(idx, data.length - 1)) };
    });

    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none">
            <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.35" />
                    <stop offset="100%" stopColor={color} stopOpacity="0.02" />
                </linearGradient>
            </defs>
            {/* Grid lines */}
            {[25, 50, 75].map(v => (
                <line key={v} x1={PAD.left} y1={y(v)} x2={W - PAD.right} y2={y(v)}
                    stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
            ))}
            {/* Area fill */}
            <motion.path
                d={areaPath} fill={`url(#${gradientId})`}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }}
            />
            {/* Line */}
            <motion.polyline
                points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1.8, ease: 'easeOut' }}
                style={{ pathLength: undefined }}
            />
            {/* Hour ticks */}
            {hourTicks.filter((_, i) => i % 2 === 0).map((t) => (
                <text key={t.label} x={t.xPos} y={H - 4} textAnchor="middle"
                    className="fill-slate-600" style={{ fontSize: 7, fontFamily: 'monospace' }}>
                    {t.label.replace(' AM', '').replace(' PM', '')}
                </text>
            ))}
        </svg>
    );
}

// ── AI Insight Card ───────────────────────────────────────────────────────────

function InsightCard({ insight, index }: { insight: AIInsight; index: number }) {
    const [expanded, setExpanded] = useState(false);
    const [revealed, setRevealed] = useState(false);
    const [displayedText, setDisplayedText] = useState('');
    const targetText = insight.finding;
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const Icon = CATEGORY_ICONS[insight.category];

    // Streaming text reveal when expanded
    useEffect(() => {
        if (!expanded || revealed) return;
        let i = 0;
        timerRef.current = setInterval(() => {
            i += 3;
            setDisplayedText(targetText.slice(0, i));
            if (i >= targetText.length) {
                clearInterval(timerRef.current!);
                setRevealed(true);
            }
        }, 12);
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [expanded, revealed, targetText]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
            className={cn('border rounded-2xl overflow-hidden transition-all', PRIORITY_STYLES[insight.priority])}
        >
            {/* Header */}
            <button onClick={() => setExpanded(e => !e)}
                className="w-full text-left p-4 flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xl flex-shrink-0">
                    {insight.emoji}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={cn('text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border', PRIORITY_BADGE[insight.priority])}>
                            {insight.priority}
                        </span>
                        <span className="text-slate-600 text-[9px] flex items-center gap-1">
                            <Icon size={8} /> {insight.category}
                        </span>
                    </div>
                    <p className="text-white font-bold text-sm leading-snug">{insight.title}</p>
                </div>
                <div className="flex-shrink-0 text-right">
                    <p className="text-white font-black text-lg leading-none">{insight.metric}</p>
                    <p className="text-slate-500 text-[9px]">{insight.metricLabel}</p>
                </div>
            </button>

            {/* Expanded body */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ type: 'spring', damping: 28, stiffness: 200 }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 pb-4 space-y-3 border-t border-white/10 pt-3">
                            {/* AI finding - streaming text */}
                            <div>
                                <div className="flex items-center gap-1.5 mb-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                                    <p className="text-violet-400 text-[9px] font-black uppercase tracking-wider">AI Finding</p>
                                </div>
                                <p className="text-slate-300 text-xs leading-relaxed">
                                    {revealed ? insight.finding : (
                                        <>
                                            {displayedText}
                                            <span className="inline-block w-0.5 h-3 bg-violet-400 ml-0.5 animate-pulse" />
                                        </>
                                    )}
                                </p>
                            </div>
                            {/* Recommendation */}
                            {(revealed || displayedText.length > 30) && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                                    <div className="flex items-center gap-1.5 mb-1.5">
                                        <Lightbulb size={9} className="text-amber-400" />
                                        <p className="text-amber-400 text-[9px] font-black uppercase tracking-wider">Recommendation</p>
                                    </div>
                                    <p className="text-slate-300 text-xs leading-relaxed">{insight.recommendation}</p>
                                </motion.div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// ── Speaker card ──────────────────────────────────────────────────────────────

function SpeakerRow({ s, rank }: { s: typeof SPEAKER_METRICS[0]; rank: number }) {
    return (
        <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: rank * 0.06 }}
            className="flex items-center gap-4 bg-slate-900 border border-slate-800 rounded-xl p-3 hover:border-slate-700 transition-colors"
        >
            <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-black text-slate-500 flex-shrink-0">
                #{rank}
            </div>
            <div className="text-2xl flex-shrink-0">{s.avatar}</div>
            <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm">{s.name}</p>
                <p className="text-slate-500 text-xs truncate">{s.company}</p>
            </div>
            {/* Engagement bar */}
            <div className="w-32 flex-shrink-0">
                <div className="flex items-center justify-between mb-1">
                    <span className="text-slate-600 text-[9px]">Engagement</span>
                    <span className="text-white text-xs font-black">{s.avgEngagement}%</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: pct(s.avgEngagement) }}
                        transition={{ delay: rank * 0.06 + 0.3, duration: 0.8, ease: 'easeOut' }}
                        className={cn('h-full rounded-full', rank === 1 ? 'bg-violet-500' : rank === 2 ? 'bg-emerald-500' : rank === 3 ? 'bg-sky-500' : 'bg-slate-500')}
                    />
                </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0 text-amber-400">
                <Star size={10} fill="currentColor" />
                <span className="text-white text-xs font-bold">{s.feedbackScore}</span>
            </div>
            <div className="text-slate-500 text-xs flex-shrink-0">{s.totalReach.toLocaleString()} reached</div>
        </motion.div>
    );
}

// ── Topic bar ─────────────────────────────────────────────────────────────────

function TopicBar({ t, rank }: { t: typeof TOPIC_SCORES[0]; rank: number }) {
    const TrendIcon = t.trend === 'rising' ? TrendingUp : t.trend === 'falling' ? TrendingDown : Minus;
    const trendColor = t.trend === 'rising' ? 'text-emerald-400' : t.trend === 'falling' ? 'text-red-400' : 'text-slate-500';

    return (
        <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: rank * 0.05 }}
            className="flex items-center gap-3"
        >
            <span className="text-slate-600 text-[10px] font-mono w-4 flex-shrink-0">#{rank}</span>
            <span className="text-white text-xs w-52 truncate flex-shrink-0">{t.topic}</span>
            <div className="flex-1 h-5 bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: pct(t.score) }}
                    transition={{ delay: rank * 0.05 + 0.2, duration: 0.9, ease: 'easeOut' }}
                    className={cn('h-full rounded-full flex items-center justify-end pr-2', t.color)}
                >
                    <span className="text-white text-[9px] font-black">{t.score}</span>
                </motion.div>
            </div>
            <TrendIcon size={12} className={cn('flex-shrink-0', trendColor)} />
            <span className="text-slate-600 text-[10px] w-16 text-right flex-shrink-0">{t.mentions.toLocaleString()} mentions</span>
        </motion.div>
    );
}

// ── Networking cluster viz ────────────────────────────────────────────────────

function ClusterViz() {
    const total = NETWORKING_CLUSTERS.reduce((s, c) => s + c.size, 0);
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {NETWORKING_CLUSTERS.map((c, i) => (
                <motion.div
                    key={c.id}
                    initial={{ opacity: 0, scale: 0.93 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.07 }}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-4 hover:border-slate-700 transition-colors"
                >
                    <div className="flex items-start justify-between mb-3">
                        <div>
                            <p className="text-white font-bold text-sm">{c.label}</p>
                            <p className="text-slate-500 text-xs">{c.connections} connections</p>
                        </div>
                        <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-sm font-black text-white flex-shrink-0', c.color)}>
                            {c.size}
                        </div>
                    </div>
                    {/* Size bar */}
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mb-3">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: pct(Math.round((c.size / total) * 100)) }}
                            transition={{ delay: i * 0.07 + 0.3, duration: 0.7 }}
                            className={cn('h-full rounded-full', c.color)}
                        />
                    </div>
                    <div className="space-y-1">
                        {c.topPairs.map(p => (
                            <div key={p} className="flex items-center gap-1.5 text-slate-500 text-[10px]">
                                <ArrowUpRight size={8} /> {p}
                            </div>
                        ))}
                    </div>
                </motion.div>
            ))}
        </div>
    );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AIInsightsEngine() {
    const [tab, setTab] = useState<Tab>('overview');
    const [chartMetric, setChartMetric] = useState<'attendance' | 'networking' | 'content'>('attendance');
    const [scanComplete, setScanComplete] = useState(false);

    // Simulate AI scan complete after 2s
    useEffect(() => {
        const t = setTimeout(() => setScanComplete(true), 2000);
        return () => clearTimeout(t);
    }, []);

    const criticalCount = AI_INSIGHTS.filter(i => i.priority === 'critical').length;

    const tabs: { id: Tab; label: string; icon: React.ElementType; badge?: number }[] = [
        { id: 'overview', label: 'Overview', icon: BarChart3 },
        { id: 'activity', label: 'Activity', icon: Activity },
        { id: 'speakers', label: 'Speakers', icon: Star },
        { id: 'topics', label: 'Topics', icon: TrendingUp },
        { id: 'networking', label: 'Networking', icon: Network },
        { id: 'insights', label: 'AI Insights', icon: BrainCircuit, badge: criticalCount },
    ];

    return (
        <div className="h-screen bg-slate-950 flex flex-col font-sans overflow-hidden">

            {/* ── Header ──────────────────────────────────────────────── */}
            <div className="bg-slate-900 border-b border-slate-800 px-5 py-3.5 flex-shrink-0">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                        <div className="flex items-center gap-2">
                            <BrainCircuit size={18} className="text-violet-400" />
                            <h1 className="text-white font-extrabold text-base">AI Event Insights Engine</h1>
                            {/* Scan status */}
                            <div className={cn('flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black border transition-colors',
                                scanComplete
                                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
                                    : 'bg-violet-500/15 text-violet-400 border-violet-500/20')}>
                                <div className={cn('w-1.5 h-1.5 rounded-full', scanComplete ? 'bg-emerald-400' : 'bg-violet-400 animate-pulse')} />
                                {scanComplete ? 'Analysis Complete' : 'AI Scanning…'}
                            </div>
                        </div>
                        <p className="text-slate-500 text-xs mt-0.5">
                            Moscow Luxury Property Expo 2026 · {EVENT_SUMMARY.totalAttendees} Attendees · {EVENT_SUMMARY.sessionsDelivered} Sessions
                        </p>
                    </div>
                    <div className="flex items-center gap-3 text-slate-500 text-xs">
                        <span className="flex items-center gap-1"><Eye size={11} /> {EVENT_SUMMARY.contentHubViews.toLocaleString()} content views</span>
                        <span className="flex items-center gap-1"><Radio size={11} className="text-emerald-400 animate-pulse" /> Live</span>
                    </div>
                </div>
            </div>

            {/* ── Tab bar ──────────────────────────────────────────────── */}
            <div className="flex border-b border-slate-800 px-5 bg-slate-900/40 flex-shrink-0 overflow-x-auto">
                {tabs.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        className={cn('flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 transition-colors flex-shrink-0',
                            tab === t.id ? 'border-violet-500 text-violet-400' : 'border-transparent text-slate-500 hover:text-slate-300')}>
                        <t.icon size={13} /> {t.label}
                        {t.badge !== undefined && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-black bg-red-500/20 text-red-400">{t.badge}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* ── Content ──────────────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto">
                <AnimatePresence mode="wait">

                    {/* ── OVERVIEW ──────────────────────────────────────── */}
                    {tab === 'overview' && (
                        <motion.div key="ov" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="p-5 space-y-6">
                            {/* KPIs */}
                            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                                <KpiCard label="Total Attendees" value={EVENT_SUMMARY.totalAttendees} icon={Users} color="bg-violet-600" delay={0} />
                                <KpiCard label="Avg Engagement" value={`${EVENT_SUMMARY.avgEngagement}%`} icon={Zap} color="bg-emerald-600" delay={0.05} />
                                <KpiCard label="Network Connections" value={EVENT_SUMMARY.totalNetworkingConnections} icon={Network} color="bg-pink-600" delay={0.1} />
                                <KpiCard label="Avg Feedback Score" value={EVENT_SUMMARY.avgFeedbackScore} icon={Star} color="bg-amber-600" delay={0.15} />
                                <KpiCard label="Peak Hour" value={EVENT_SUMMARY.peakHour} icon={Clock} color="bg-sky-600" delay={0.2} />
                                <KpiCard label="Peak Engagement" value={`${EVENT_SUMMARY.peakEngagement}%`} icon={TrendingUp} color="bg-teal-600" delay={0.25} />
                                <KpiCard label="Booth Visits" value={EVENT_SUMMARY.totalBoothVisits} icon={Activity} color="bg-orange-600" delay={0.3} />
                                <KpiCard label="Poll Votes" value={EVENT_SUMMARY.totalPollVotes} icon={MessageSquare} color="bg-blue-600" delay={0.35} />
                            </div>

                            {/* Heatmap */}
                            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <p className="text-white font-bold text-sm">Engagement Heatmap</p>
                                        <p className="text-slate-500 text-xs">5 metrics across 13 hours · hover cells to inspect</p>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-slate-600 text-xs">
                                        <Sparkles size={11} className="text-violet-400" /> AI analysed
                                    </div>
                                </div>
                                <Heatmap />
                            </div>
                        </motion.div>
                    )}

                    {/* ── ACTIVITY TIMELINE ─────────────────────────────── */}
                    {tab === 'activity' && (
                        <motion.div key="act" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="p-5 space-y-4">
                            {/* Metric toggle */}
                            <div className="flex items-center gap-2">
                                {([
                                    { id: 'attendance', label: 'Attendance', color: '#8b5cf6' },
                                    { id: 'networking', label: 'Networking', color: '#ec4899' },
                                    { id: 'content', label: 'Content', color: '#10b981' },
                                ] as const).map(m => (
                                    <button key={m.id} onClick={() => setChartMetric(m.id)}
                                        className={cn('px-3 py-1.5 rounded-xl border text-xs font-bold transition-all',
                                            chartMetric === m.id
                                                ? 'bg-slate-700 border-slate-600 text-white'
                                                : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700')}>
                                        {m.label}
                                    </button>
                                ))}
                                <span className="ml-auto text-slate-600 text-xs">8 AM → 8 PM · 15-min intervals</span>
                            </div>

                            {/* Chart */}
                            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                                <AnimatePresence mode="wait">
                                    <motion.div key={chartMetric} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                        <AreaChart
                                            metric={chartMetric}
                                            color={chartMetric === 'attendance' ? '#8b5cf6' : chartMetric === 'networking' ? '#ec4899' : '#10b981'}
                                            gradientId={`grad_${chartMetric}`}
                                        />
                                    </motion.div>
                                </AnimatePresence>
                            </div>

                            {/* Peak annotations */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {[
                                    { label: 'Peak Attendance', value: '95%', time: '3 PM', icon: Users, color: 'text-violet-400' },
                                    { label: 'Peak Networking', value: '212 pings/hr', time: '12–1 PM', icon: Network, color: 'text-pink-400' },
                                    { label: 'Peak Content', value: '96 score', time: '3 PM', icon: Activity, color: 'text-emerald-400' },
                                ].map(s => (
                                    <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center gap-3">
                                        <s.icon size={16} className={s.color} />
                                        <div>
                                            <p className={cn('font-black text-base', s.color)}>{s.value}</p>
                                            <p className="text-slate-400 text-xs">{s.label} · {s.time}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* ── SPEAKERS ──────────────────────────────────────── */}
                    {tab === 'speakers' && (
                        <motion.div key="sp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="p-5 space-y-3">
                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-wider mb-4">
                                Ranked by audience engagement score
                            </p>
                            {SPEAKER_METRICS.map((s, i) => <SpeakerRow key={s.name} s={s} rank={i + 1} />)}
                        </motion.div>
                    )}

                    {/* ── TOPICS ────────────────────────────────────────── */}
                    {tab === 'topics' && (
                        <motion.div key="tp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="p-5">
                            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-white font-bold text-sm">Topic Popularity Index</p>
                                    <div className="flex items-center gap-3 text-slate-600 text-[10px]">
                                        <span className="flex items-center gap-1"><TrendingUp size={9} className="text-emerald-400" /> Rising</span>
                                        <span className="flex items-center gap-1"><Minus size={9} className="text-slate-500" /> Stable</span>
                                        <span className="flex items-center gap-1"><TrendingDown size={9} className="text-red-400" /> Falling</span>
                                    </div>
                                </div>
                                {TOPIC_SCORES.map((t, i) => <TopicBar key={t.topic} t={t} rank={i + 1} />)}
                            </div>
                        </motion.div>
                    )}

                    {/* ── NETWORKING ────────────────────────────────────── */}
                    {tab === 'networking' && (
                        <motion.div key="net" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="p-5 space-y-5">
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { label: 'Total Connections', value: '957', color: 'text-violet-400' },
                                    { label: 'Largest Cluster', value: '87', color: 'text-emerald-400' },
                                    { label: 'Cross-Cluster Ratio', value: '12%', color: 'text-amber-400' },
                                ].map(s => (
                                    <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
                                        <p className={cn('font-black text-xl', s.color)}>{s.value}</p>
                                        <p className="text-slate-500 text-xs mt-0.5">{s.label}</p>
                                    </div>
                                ))}
                            </div>
                            <ClusterViz />
                        </motion.div>
                    )}

                    {/* ── AI INSIGHTS ───────────────────────────────────── */}
                    {tab === 'insights' && (
                        <motion.div key="ai" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="p-5 space-y-4">
                            {/* Scan banner */}
                            {!scanComplete ? (
                                <div className="bg-violet-500/10 border border-violet-500/20 rounded-2xl p-4 flex items-center gap-3">
                                    <BrainCircuit size={18} className="text-violet-400 animate-pulse" />
                                    <div className="flex-1">
                                        <p className="text-violet-300 font-bold text-sm">AI Scanning Event Data…</p>
                                        <div className="h-1 bg-slate-800 rounded-full mt-2 overflow-hidden">
                                            <motion.div
                                                className="h-full bg-violet-500 rounded-full"
                                                initial={{ width: '0%' }}
                                                animate={{ width: '75%' }}
                                                transition={{ duration: 1.8 }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                                    <p className="text-emerald-400 text-xs font-semibold">
                                        {AI_INSIGHTS.length} insights generated · {criticalCount} critical
                                    </p>
                                </div>
                            )}

                            {AI_INSIGHTS.map((insight, i) => (
                                <InsightCard key={insight.id} insight={insight} index={i} />
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
