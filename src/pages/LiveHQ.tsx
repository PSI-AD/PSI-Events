/**
 * LiveHQ.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * LIVE HQ BROADCAST WALL — TV "On-Air" Mode
 *
 * Full-screen, sidebar-free dashboard designed to be cast to office monitors.
 *
 * Three-pane layout (left 30% / center 40% / right 30%):
 *   ① Telemetry Feed   — auto-scrolling raw event stream
 *   ② Media Wall       — masonry photo grid, animates on new uploads
 *   ③ AI Insights      — latest polished journal excerpt + leaderboard
 *
 * Overlays:
 *   • "Big Win" Deal Flash — full-screen emerald + confetti on deal trigger
 *   • Floating trigger button for demo/presentation testing
 *
 * Design system:
 *   bg-slate-50 dark:bg-slate-950 (TV-safe near-black)
 *   amber-500    gold accents  — headings, ranks, KPIs
 *   emerald-500  green accents — positive events, online indicators
 *   rose-500     red accents   — live indicators, urgent alerts
 *   Fonts: massive (2xl–6xl) for 20-ft legibility
 *
 * Route: /live (under PublicLayout — no sidebar)
 */

import React, {
    useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import { motion, AnimatePresence, useAnimationControls } from 'motion/react';
import {
    Radio, Clock, Users, Trophy, Zap, Camera,
    TrendingUp, MapPin, Star, ChevronUp, Wifi,
    DollarSign, Flame, Award, Target, CheckCircle2,
    Monitor, Play, X,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface TelemetryEvent {
    id: string;
    time: string;   // "HH:MM AM/PM"
    text: string;
    type: 'checkin' | 'media' | 'lead' | 'deal' | 'ai' | 'system';
    agentName?: string;
}

interface AgentRank {
    id: string;
    name: string;
    branch: string;
    leadsToday: number;
    dealValue: number;    // AED millions
    tier: 'gold' | 'silver' | 'bronze';
    delta: number;    // rank change
}

interface MediaItem {
    id: string;
    url: string;
    label: string;
    cols: 1 | 2;
    rows: 1 | 2;
}

interface DealFlash {
    agentName: string;
    amount: string;
    currency: string;
    location: string;
    projectName: string;
}

// ── Placeholder data ──────────────────────────────────────────────────────────

const EVENT_META = {
    name: 'Moscow Cityscape International Property Expo',
    shortName: 'Moscow Cityscape',
    city: 'Moscow',
    country: 'Russia',
    timezone: 'Europe/Moscow',         // MSK UTC+3
    hqTimezone: 'Asia/Dubai',            // GST UTC+4
    startDate: 'Feb 28, 2026',
    venueAddress: 'Crocus Expo IEC, Pavilion 3, Stand B-12',
};

const INITIAL_TELEMETRY: TelemetryEvent[] = [
    { id: 't1', time: '08:30 AM', type: 'system', text: '🟢 Broadcast Wall connected. Live sync active.' },
    { id: 't2', time: '09:00 AM', type: 'system', text: '🎯 Event started. Floor opens to public.' },
    { id: 't3', time: '09:14 AM', type: 'checkin', text: 'Sara Al Marzouqi checked in at the booth.', agentName: 'Sara Al Marzouqi' },
    { id: 't4', time: '09:21 AM', type: 'checkin', text: 'Khalid Mansouri arrived and scanned QR.', agentName: 'Khalid Mansouri' },
    { id: 't5', time: '09:45 AM', type: 'lead', text: 'Sara Al Marzouqi captured Lead #1 — Russian investor, Emaar interest.', agentName: 'Sara Al Marzouqi' },
    { id: 't6', time: '10:02 AM', type: 'media', text: 'Media Officer uploaded 3 new photos to the Journal.' },
    { id: 't7', time: '10:18 AM', type: 'checkin', text: 'Mohammed Al Qubaisi arrived on floor.', agentName: 'Mohammed Al Qubaisi' },
    { id: 't8', time: '10:33 AM', type: 'lead', text: 'Khalid Mansouri captured Lead #1 — UK passport, Aldar interest.', agentName: 'Khalid Mansouri' },
    { id: 't9', time: '10:42 AM', type: 'ai', text: '✨ AI Journal: "The floor is buzzing with strong early energy — luxury tier projects drawing serious attention."' },
    { id: 't10', time: '10:55 AM', type: 'lead', text: 'Sara Al Marzouqi captured Lead #2 — Egyptian passport, PAL interest.', agentName: 'Sara Al Marzouqi' },
    { id: 't11', time: '11:10 AM', type: 'media', text: 'Media Officer uploaded event venue panorama photo.' },
    { id: 't12', time: '11:15 AM', type: 'lead', text: 'Mohammed Al Qubaisi captured Lead #1.', agentName: 'Mohammed Al Qubaisi' },
    { id: 't13', time: '11:29 AM', type: 'lead', text: 'Nour Al-Hamdan captured Lead #1 — German investor.', agentName: 'Nour Al-Hamdan' },
    { id: 't14', time: '11:45 AM', type: 'checkin', text: 'Nour Al-Hamdan checked in — now 4 agents on floor.' },
    { id: 't15', time: '12:00 PM', type: 'system', text: '📊 Midday sync — 8 leads captured across 4 agents.' },
];

const LIVE_TELEMETRY_POOL: Omit<TelemetryEvent, 'id' | 'time'>[] = [
    { type: 'lead', text: 'Sara Al Marzouqi captured Lead #3 — Russian HNW, Damac interest.', agentName: 'Sara Al Marzouqi' },
    { type: 'lead', text: 'Khalid Mansouri captured Lead #2 — Emirati businessman.', agentName: 'Khalid Mansouri' },
    { type: 'media', text: 'Media Officer uploaded 5 new photos from the booth.' },
    { type: 'ai', text: '✨ AI Journal: "Foot traffic surging after the post-lunch rush — three developers requesting dedicated meetings."' },
    { type: 'lead', text: 'Nour Al-Hamdan captured Lead #2 — Chinese investor, Sobha interest.', agentName: 'Nour Al-Hamdan' },
    { type: 'lead', text: 'Mohammed Al Qubaisi captured Lead #2.', agentName: 'Mohammed Al Qubaisi' },
    { type: 'lead', text: 'Sara Al Marzouqi captured Lead #4 — Dutch passport, Binghatti.', agentName: 'Sara Al Marzouqi' },
    { type: 'system', text: '🏆 Sara Al Marzouqi takes #1 on the leaderboard — 4 leads!' },
    { type: 'lead', text: 'Khalid Mansouri captured Lead #3.', agentName: 'Khalid Mansouri' },
    { type: 'media', text: 'Media Officer uploaded panoramic booth shots x2.' },
    { type: 'lead', text: 'Sara Al Marzouqi captured Lead #5 — closing in on daily target.', agentName: 'Sara Al Marzouqi' },
    { type: 'deal', text: '🚨 DEAL SIGNAL: Khalid Mansouri in closing conversation — 4.2M AED.', agentName: 'Khalid Mansouri' },
];

const LEADERBOARD: AgentRank[] = [
    { id: 'a1', name: 'Sara Al Marzouqi', branch: 'Dubai Marina', leadsToday: 14, dealValue: 0, tier: 'gold', delta: 2 },
    { id: 'a2', name: 'Khalid Mansouri', branch: 'Abu Dhabi Main', leadsToday: 11, dealValue: 4.2, tier: 'silver', delta: 0 },
    { id: 'a3', name: 'Nour Al-Hamdan', branch: 'JLT', leadsToday: 9, dealValue: 0, tier: 'bronze', delta: 1 },
    { id: 'a4', name: 'Mohammed Al Qubaisi', branch: 'Abu Dhabi Main', leadsToday: 7, dealValue: 0, tier: 'bronze', delta: -1 },
];

const AI_INSIGHTS = [
    'The floor is buzzing with high-net-worth Russian and European investors — luxury tier projects commanding serious interest.',
    'Post-lunch surge underway. Damac Hills 2 and Emaar Park Heights drawing the longest queues at our stand.',
    '4 PSI agents on-floor, all performing above their hourly lead targets. Strong conversion energy today.',
    'Three developers requesting dedicated PSI partnership meetings — significant B2B pipeline emerging.',
];

// High-quality Unsplash images for media wall (real estate / expo themed)
const MEDIA_ITEMS: MediaItem[] = [
    { id: 'm1', url: 'https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=600&q=80', label: 'PSI Booth Setup', cols: 2, rows: 2 },
    { id: 'm2', url: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=400&q=80', label: 'Luxury Project Render', cols: 1, rows: 1 },
    { id: 'm3', url: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&q=80', label: 'Client Meeting', cols: 1, rows: 1 },
    { id: 'm4', url: 'https://images.unsplash.com/photo-1448630360428-65456885c650?w=400&q=80', label: 'Moscow Venue', cols: 1, rows: 1 },
    { id: 'm5', url: 'https://images.unsplash.com/photo-1503174971373-b1f69850bded?w=400&q=80', label: 'Expo Floor', cols: 1, rows: 2 },
    { id: 'm6', url: 'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=400&q=80', label: 'Agent Presenting', cols: 1, rows: 1 },
    { id: 'm7', url: 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=400&q=80', label: 'Skyline View', cols: 1, rows: 1 },
];

const DEAL_FLASH_DATA: DealFlash = {
    agentName: 'Khalid Al-Mansouri',
    amount: '4.2M',
    currency: 'AED',
    location: 'Moscow Cityscape Expo',
    projectName: 'Emaar Park Heights II',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatClock(date: Date, tz: string): { time: string; zone: string; date: string } {
    const time = date.toLocaleTimeString('en-US', {
        timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    });
    const zone = date.toLocaleDateString('en-US', {
        timeZone: tz, timeZoneName: 'short',
    }).split(', ')[1] ?? tz;
    const dateStr = date.toLocaleDateString('en-US', {
        timeZone: tz, weekday: 'short', day: 'numeric', month: 'short',
    });
    return { time, zone, date: dateStr };
}

function uid(): string {
    return Math.random().toString(36).slice(2, 9);
}

function nowTime(): string {
    return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

const TYPE_COLOR: Record<TelemetryEvent['type'], string> = {
    checkin: 'text-emerald-400',
    lead: 'text-amber-400',
    deal: 'text-rose-400',
    media: 'text-blue-400',
    ai: 'text-violet-400',
    system: 'text-slate-600 dark:text-slate-400',
};

const TYPE_DOT: Record<TelemetryEvent['type'], string> = {
    checkin: 'bg-emerald-400',
    lead: 'bg-amber-400',
    deal: 'bg-rose-400',
    media: 'bg-blue-400',
    ai: 'bg-violet-400',
    system: 'bg-slate-600',
};

// ── Confetti particle ─────────────────────────────────────────────────────────

interface Particle {
    id: number;
    x: number;
    delay: number;
    color: string;
    size: number;
    rotate: number;
}

function generateParticles(count: number): Particle[] {
    const colors = ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444', '#ffffff', '#34d399', '#fcd34d'];
    return Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 0.8,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 6 + Math.random() * 12,
        rotate: Math.random() * 360,
    }));
}

// ── Sub-components ────────────────────────────────────────────────────────────

// ── Dual Clock ────────────────────────────────────────────────────────────────
function DualClock() {
    const [now, setNow] = useState(new Date());
    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    const event = formatClock(now, EVENT_META.timezone);
    const hq = formatClock(now, EVENT_META.hqTimezone);

    return (
        <div className="flex items-center gap-6">
            {/* Event time (Moscow) */}
            <div className="text-right">
                <p className="text-slate-600 dark:text-slate-400 text-xs font-bold uppercase tracking-widest mb-0.5">
                    {EVENT_META.city} · MSK
                </p>
                <p className="font-mono font-black text-amber-400 text-4xl tracking-wider leading-none">
                    {event.time}
                </p>
                <p className="text-slate-600 dark:text-slate-400 text-xs mt-0.5">{event.date}</p>
            </div>

            {/* Divider */}
            <div className="w-px h-12 bg-slate-200 dark:bg-slate-700" />

            {/* HQ time (Dubai) */}
            <div className="text-right">
                <p className="text-slate-600 dark:text-slate-400 text-xs font-bold uppercase tracking-widest mb-0.5">
                    HQ · Dubai
                </p>
                <p className="font-mono font-black text-slate-700 dark:text-slate-300 text-3xl tracking-wider leading-none">
                    {hq.time}
                </p>
                <p className="text-slate-600 dark:text-slate-400 text-xs mt-0.5">{hq.date}</p>
            </div>
        </div>
    );
}

// ── Live Indicator ────────────────────────────────────────────────────────────
function LiveIndicator() {
    return (
        <div className="flex items-center gap-3">
            {/* Pulsing red dot */}
            <div className="relative w-4 h-4">
                <div className="absolute inset-0 bg-rose-500 rounded-full animate-ping opacity-75" />
                <div className="w-4 h-4 bg-rose-500 rounded-full" />
            </div>
            <div>
                <p className="text-rose-400 text-xs font-black uppercase tracking-widest leading-none">On Air</p>
                <p className="text-slate-900 dark:text-white font-black text-2xl md:text-3xl leading-tight truncate max-w-xs">
                    {EVENT_META.shortName}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                    <MapPin size={10} className="text-slate-600 dark:text-slate-400" />
                    <p className="text-slate-600 dark:text-slate-400 text-xs">{EVENT_META.venueAddress}</p>
                </div>
            </div>
        </div>
    );
}

// ── Telemetry Feed ────────────────────────────────────────────────────────────
function TelemetryFeed({ events }: { events: TelemetryEvent[] }) {
    const bottomRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when new events arrive
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [events.length]);

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center gap-2 mb-4 flex-shrink-0">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-emerald-400 text-xs font-black uppercase tracking-widest">
                    Live Telemetry
                </span>
                <span className="ml-auto text-slate-600 text-xs font-mono">{events.length} events</span>
            </div>

            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-none">
                <AnimatePresence initial={false}>
                    {events.map((ev) => (
                        <motion.div
                            key={ev.id}
                            layout
                            initial={{ opacity: 0, x: -20, height: 0 }}
                            animate={{ opacity: 1, x: 0, height: 'auto' }}
                            exit={{ opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                            className={`flex gap-2.5 p-2.5 rounded-xl border ${ev.type === 'deal'
                                    ? 'bg-rose-500/10 border-rose-500/30'
                                    : ev.type === 'ai'
                                        ? 'bg-violet-500/8 border-violet-500/20'
                                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                                }`}
                        >
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${TYPE_DOT[ev.type]}`} />
                            <div className="min-w-0">
                                <p className="text-slate-600 dark:text-slate-400 text-[10px] font-mono mb-0.5">{ev.time}</p>
                                <p className={`text-sm leading-snug font-medium ${TYPE_COLOR[ev.type]}`}>
                                    {ev.text}
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
                <div ref={bottomRef} />
            </div>
        </div>
    );
}

// ── Masonry Media Wall ────────────────────────────────────────────────────────
function MediaWall({ items }: { items: MediaItem[] }) {
    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center gap-2 mb-4 flex-shrink-0">
                <Camera size={14} className="text-blue-400" />
                <span className="text-blue-400 text-xs font-black uppercase tracking-widest">
                    Live Media Wall
                </span>
                <span className="ml-auto text-slate-600 text-xs font-mono">{items.length} photos</span>
            </div>

            {/* Masonry grid */}
            <div className="flex-1 overflow-hidden">
                <div className="grid grid-cols-3 grid-rows-4 gap-1.5 h-full">
                    <AnimatePresence>
                        {items.map((item, i) => (
                            <motion.div
                                key={item.id}
                                layout
                                layoutId={item.id}
                                initial={{ opacity: 0, scale: 0.85 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                transition={{
                                    type: 'spring', stiffness: 240, damping: 24,
                                    delay: i * 0.04,
                                }}
                                className={`relative overflow-hidden rounded-xl group cursor-pointer
                                    ${item.cols === 2 ? 'col-span-2' : ''}
                                    ${item.rows === 2 ? 'row-span-2' : ''}
                                `}
                            >
                                <img
                                    src={item.url}
                                    alt={item.label}
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                    loading="lazy"
                                />
                                {/* Overlay label */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-2">
                                    <p className="text-slate-900 dark:text-white text-xs font-bold">{item.label}</p>
                                </div>
                                {/* New badge (first 2 items) */}
                                {i >= items.length - 2 && (
                                    <div className="absolute top-1.5 left-1.5">
                                        <span className="px-1.5 py-0.5 bg-emerald-500 rounded-md text-[9px] font-black text-slate-900 dark:text-white uppercase tracking-wider">
                                            NEW
                                        </span>
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}

// ── Leaderboard row ───────────────────────────────────────────────────────────

const RANK_STYLES = {
    gold: { border: 'border-amber-400/50', bg: 'bg-amber-400/8', text: 'text-amber-400', medal: '🥇' },
    silver: { border: 'border-slate-400/30', bg: 'bg-slate-400/5', text: 'text-slate-700 dark:text-slate-300', medal: '🥈' },
    bronze: { border: 'border-orange-600/30', bg: 'bg-orange-600/5', text: 'text-orange-400', medal: '🥉' },
};

function LeaderRow({ agent, rank }: { agent: AgentRank; rank: number }) {
    const style = RANK_STYLES[agent.tier];
    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: rank * 0.07, type: 'spring', stiffness: 280, damping: 26 }}
            className={`flex items-center gap-3 p-3 rounded-xl border ${style.bg} ${style.border}`}
        >
            {/* Medal */}
            <span className="text-2xl flex-shrink-0">{style.medal}</span>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <p className={`font-black text-base truncate ${style.text}`}>{agent.name}</p>
                <p className="text-slate-600 dark:text-slate-400 text-xs truncate">{agent.branch}</p>
            </div>

            {/* Leads */}
            <div className="text-right flex-shrink-0">
                <p className="font-black text-2xl text-slate-900 dark:text-white">{agent.leadsToday}</p>
                <p className="text-slate-600 dark:text-slate-400 text-[10px] font-bold uppercase">leads</p>
            </div>

            {/* Deal value (if any) */}
            {agent.dealValue > 0 && (
                <div className="flex-shrink-0 text-right">
                    <p className="font-black text-emerald-400 text-sm">{agent.dealValue}M</p>
                    <p className="text-slate-600 dark:text-slate-400 text-[10px]">AED</p>
                </div>
            )}

            {/* Delta */}
            {agent.delta !== 0 && (
                <div className={`flex-shrink-0 flex items-center gap-0.5 text-xs font-black
                    ${agent.delta > 0 ? 'text-emerald-400' : 'text-rose-400'}`
                }>
                    <ChevronUp
                        size={12}
                        className={agent.delta < 0 ? 'rotate-180' : ''}
                    />
                    {Math.abs(agent.delta)}
                </div>
            )}
        </motion.div>
    );
}

// ── AI Insights Panel ─────────────────────────────────────────────────────────
function InsightsPanel({
    leaderboard,
    insightIndex,
    totalLeads,
    agentsOnFloor,
}: {
    leaderboard: AgentRank[];
    insightIndex: number;
    totalLeads: number;
    agentsOnFloor: number;
}) {
    return (
        <div className="flex flex-col h-full gap-4">

            {/* KPI strip */}
            <div className="grid grid-cols-2 gap-3 flex-shrink-0">
                {[
                    { label: 'Agents On Floor', value: agentsOnFloor, icon: <Users size={16} />, color: 'text-emerald-400', bg: 'bg-emerald-400/8' },
                    { label: 'Total Leads', value: totalLeads, icon: <Target size={16} />, color: 'text-amber-400', bg: 'bg-amber-400/8' },
                ].map(({ label, value, icon, color, bg }) => (
                    <div key={label} className={`${bg} border border-white/8 rounded-2xl p-3 text-center`}>
                        <div className={`${color} flex justify-center mb-1`}>{icon}</div>
                        <p className={`font-black text-4xl ${color}`}>{value}</p>
                        <p className="text-slate-600 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider mt-0.5">{label}</p>
                    </div>
                ))}
            </div>

            {/* AI Insight card */}
            <div className="flex-shrink-0 bg-violet-500/8 border border-violet-500/20 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-violet-400 rounded-full animate-pulse" />
                    <p className="text-violet-400 text-[10px] font-black uppercase tracking-widest">
                        AI Floor Report
                    </p>
                </div>
                <AnimatePresence mode="wait">
                    <motion.p
                        key={insightIndex}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.5 }}
                        className="text-slate-900 dark:text-white text-base leading-relaxed font-medium"
                    >
                        "{AI_INSIGHTS[insightIndex % AI_INSIGHTS.length]}"
                    </motion.p>
                </AnimatePresence>
            </div>

            {/* Leaderboard */}
            <div className="flex-1 flex flex-col min-h-0">
                <div className="flex items-center gap-2 mb-3 flex-shrink-0">
                    <Trophy size={14} className="text-amber-400" />
                    <span className="text-amber-400 text-xs font-black uppercase tracking-widest">
                        Top Agents Today
                    </span>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 scrollbar-none">
                    <AnimatePresence>
                        {leaderboard.map((agent, i) => (
                            <LeaderRow key={agent.id} agent={agent} rank={i} />
                        ))}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}

// ── Confetti overlay ──────────────────────────────────────────────────────────
function ConfettiOverlay({ active }: { active: boolean }) {
    const particles = useMemo(() => generateParticles(80), []);
    if (!active) return null;
    return (
        <div className="fixed inset-0 pointer-events-none z-[60] overflow-hidden">
            {particles.map(p => (
                <motion.div
                    key={p.id}
                    initial={{
                        opacity: 1,
                        x: `${p.x}vw`,
                        y: -20,
                        rotate: p.rotate,
                        scale: 1,
                    }}
                    animate={{
                        opacity: [1, 1, 0],
                        y: '110vh',
                        rotate: p.rotate + 720,
                        scale: [1, 1.2, 0.8],
                    }}
                    transition={{
                        duration: 3 + Math.random() * 2,
                        delay: p.delay,
                        ease: [0.25, 0.46, 0.45, 0.94],
                    }}
                    style={{
                        position: 'absolute',
                        width: p.size,
                        height: p.size * (Math.random() > 0.5 ? 1 : 2.5),
                        borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                        background: p.color,
                    }}
                />
            ))}
        </div>
    );
}

// ── Deal Flash Overlay ────────────────────────────────────────────────────────
function DealFlashOverlay({
    deal,
    onDismiss,
}: {
    deal: DealFlash | null;
    onDismiss: () => void;
}) {
    return (
        <AnimatePresence>
            {deal && (
                <>
                    {/* Emerald flash background */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 0.9, 0.7] }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="fixed inset-0 z-50 bg-emerald-950 flex items-center justify-center"
                    >
                        {/* Radial glow */}
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.4)_0%,transparent_70%)]" />

                        {/* Content */}
                        <div className="relative z-10 text-center px-8 max-w-5xl mx-auto">

                            {/* DEAL CLOSED label */}
                            <motion.div
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.1 }}
                                className="inline-flex items-center gap-3 px-6 py-2 bg-emerald-500/20 border-2 border-emerald-400/50 rounded-full mb-8"
                            >
                                <span className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse" />
                                <p className="text-emerald-300 font-black text-xl uppercase tracking-[0.2em]">
                                    🚨 Deal Closed
                                </p>
                            </motion.div>

                            {/* Agent name */}
                            <motion.h1
                                initial={{ opacity: 0, y: 40 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 22 }}
                                className="text-slate-900 dark:text-white font-black text-5xl md:text-7xl leading-tight mb-4"
                            >
                                {deal.agentName}
                            </motion.h1>

                            {/* Amount */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.7 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.35, type: 'spring', stiffness: 300, damping: 18 }}
                                className="mb-6"
                            >
                                <p className="font-black text-emerald-300 text-8xl md:text-9xl leading-none tracking-tight">
                                    {deal.amount}
                                </p>
                                <p className="text-emerald-400 text-4xl font-black tracking-widest">{deal.currency}</p>
                            </motion.div>

                            {/* Project + location */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 }}
                                className="space-y-1"
                            >
                                <p className="text-slate-900 dark:text-white/80 text-2xl font-bold">{deal.projectName}</p>
                                <p className="text-slate-600 dark:text-slate-400 text-lg">
                                    <MapPin size={16} className="inline mr-1" />
                                    {deal.location}
                                </p>
                            </motion.div>

                            {/* Dismiss hint */}
                            <motion.button
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 1.5 }}
                                onClick={onDismiss}
                                className="mt-12 px-6 py-3 bg-black/10 dark:bg-white/10 border border-black/20 dark:border-white/20 rounded-2xl text-slate-900 dark:text-white/60 text-sm font-bold hover:bg-white/15 transition-colors"
                            >
                                Dismiss · Press any key
                            </motion.button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

// ── Main LiveHQ Component ─────────────────────────────────────────────────────

export default function LiveHQ() {
    const [telemetry, setTelemetry] = useState<TelemetryEvent[]>(INITIAL_TELEMETRY);
    const [mediaItems, setMediaItems] = useState<MediaItem[]>(MEDIA_ITEMS);
    const [leaderboard, setLeaderboard] = useState<AgentRank[]>(LEADERBOARD);
    const [insightIndex, setInsightIndex] = useState(0);
    const [dealFlash, setDealFlash] = useState<DealFlash | null>(null);
    const [showConfetti, setShowConfetti] = useState(false);
    const [showControls, setShowControls] = useState(true);

    // Derived stats
    const totalLeads = leaderboard.reduce((s, a) => s + a.leadsToday, 0);
    const agentsOnFloor = 4; // in a real build: from Firestore check-in count

    const poolIndexRef = useRef(0);

    // ── Live telemetry ticker (every 8–14s) ──────────────────────────────
    useEffect(() => {
        const tick = () => {
            const pool = LIVE_TELEMETRY_POOL;
            const item = pool[poolIndexRef.current % pool.length];
            poolIndexRef.current += 1;

            const newEvent: TelemetryEvent = {
                ...item,
                id: uid(),
                time: nowTime(),
            };

            setTelemetry(prev => [...prev.slice(-40), newEvent]);

            // If it's a lead event, increment the relevant agent's count
            if (newEvent.type === 'lead' && newEvent.agentName) {
                setLeaderboard(prev =>
                    prev
                        .map(a => a.name === newEvent.agentName
                            ? { ...a, leadsToday: a.leadsToday + 1 }
                            : a
                        )
                        .sort((a, b) => b.leadsToday - a.leadsToday)
                        .map((a, i) => ({
                            ...a,
                            tier: (i === 0 ? 'gold' : i === 1 ? 'silver' : 'bronze') as AgentRank['tier'],
                        }))
                );
            }
        };

        const interval = setInterval(tick, 9000 + Math.random() * 5000);
        return () => clearInterval(interval);
    }, []);

    // ── AI insight rotator (every 20s) ───────────────────────────────────
    useEffect(() => {
        const t = setInterval(() => setInsightIndex(i => i + 1), 20_000);
        return () => clearInterval(t);
    }, []);

    // ── Keyboard listener for deal flash dismiss ─────────────────────────
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (dealFlash && e.key !== 'F11') dismissDeal();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [dealFlash]);

    function triggerDeal() {
        setDealFlash(DEAL_FLASH_DATA);
        setShowConfetti(true);
        // Auto-dismiss confetti after 4s; deal dismiss is manual
        setTimeout(() => setShowConfetti(false), 4500);

        // Also inject a deal telemetry event
        setTelemetry(prev => [...prev, {
            id: uid(),
            time: nowTime(),
            type: 'deal',
            text: `🚨 CONTRACT SIGNED: ${DEAL_FLASH_DATA.agentName} — ${DEAL_FLASH_DATA.amount} ${DEAL_FLASH_DATA.currency} — ${DEAL_FLASH_DATA.projectName}`,
        }]);
    }

    function dismissDeal() {
        setDealFlash(null);
        setShowConfetti(false);
    }

    return (
        <div className="fixed inset-0 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col overflow-hidden select-none">

            {/* ── HEADER ──────────────────────────────────────────────────── */}
            <header className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-black/5 dark:border-white/5 bg-slate-50 dark:bg-slate-950/80 backdrop-blur-sm">
                <LiveIndicator />

                {/* Centre KPI bar */}
                <div className="hidden lg:flex items-center gap-6">
                    {[
                        { icon: <Users size={14} />, label: 'On Floor', value: agentsOnFloor, color: 'text-emerald-400' },
                        { icon: <Target size={14} />, label: 'Leads', value: totalLeads, color: 'text-amber-400' },
                        { icon: <Flame size={14} />, label: 'Posts', value: 4, color: 'text-violet-400' },
                        { icon: <Wifi size={14} />, label: 'Connected', value: '●', color: 'text-emerald-400' },
                    ].map(({ icon, label, value, color }) => (
                        <div key={label} className="text-center">
                            <div className={`flex items-center gap-1 justify-center ${color} mb-0.5`}>
                                {icon}
                                <p className="text-[10px] font-bold uppercase tracking-widest">{label}</p>
                            </div>
                            <p className={`text-2xl font-black ${color}`}>{value}</p>
                        </div>
                    ))}
                </div>

                <DualClock />
            </header>

            {/* ── THREE-PANE BODY ──────────────────────────────────────────── */}
            <div className="flex-1 flex overflow-hidden min-h-0">

                {/* ── PANE 1: Telemetry Feed (30%) ─────────────────────── */}
                <div className="w-[30%] flex-shrink-0 border-r border-black/5 dark:border-white/5 p-5 overflow-hidden flex flex-col">
                    <TelemetryFeed events={telemetry} />
                </div>

                {/* ── PANE 2: Media Wall (40%) ─────────────────────────── */}
                <div className="flex-1 border-r border-black/5 dark:border-white/5 p-5 overflow-hidden flex flex-col">
                    <MediaWall items={mediaItems} />
                </div>

                {/* ── PANE 3: AI Insights + Leaderboard (30%) ─────────── */}
                <div className="w-[30%] flex-shrink-0 p-5 overflow-hidden flex flex-col">
                    <InsightsPanel
                        leaderboard={leaderboard}
                        insightIndex={insightIndex}
                        totalLeads={totalLeads}
                        agentsOnFloor={agentsOnFloor}
                    />
                </div>
            </div>

            {/* ── FOOTER TICKER ───────────────────────────────────────────── */}
            <footer className="flex-shrink-0 border-t border-black/5 dark:border-white/5 bg-white dark:bg-slate-900/50 px-0 py-0 overflow-hidden">
                <div className="flex items-center gap-4 py-2.5 px-4">
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <Monitor size={12} className="text-amber-400" />
                        <span className="text-amber-400 text-[10px] font-black uppercase tracking-widest">PSI HQ Broadcast</span>
                    </div>
                    <div className="flex-1 overflow-hidden relative">
                        <motion.div
                            animate={{ x: [0, '-50%'] }}
                            transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
                            className="flex gap-12 whitespace-nowrap"
                        >
                            {[...Array(2)].map((_, rep) => (
                                <span key={rep} className="flex gap-12">
                                    {[
                                        `🏆 ${LEADERBOARD[0].name} leads with ${LEADERBOARD[0].leadsToday} leads`,
                                        `📍 ${EVENT_META.venueAddress}`,
                                        `🎯 Team target: 75 leads today`,
                                        `✨ Latest AI take: "${AI_INSIGHTS[0].slice(0, 70)}…"`,
                                        `📊 ${totalLeads} total leads captured across ${agentsOnFloor} agents`,
                                        `🚀 Property Shop Investment Dubai — Live From ${EVENT_META.city}`,
                                    ].map((msg, i) => (
                                        <span key={i} className="text-slate-600 dark:text-slate-400 text-xs font-bold">
                                            {msg}
                                            <span className="text-slate-700 mx-4">·</span>
                                        </span>
                                    ))}
                                </span>
                            ))}
                        </motion.div>
                    </div>
                </div>
            </footer>

            {/* ── FLOATING CONTROLS ───────────────────────────────────────── */}
            <AnimatePresence>
                {showControls && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="fixed bottom-16 right-5 z-40 flex flex-col gap-2"
                    >
                        {/* Deal trigger */}
                        <button
                            id="trigger-deal-flash-btn"
                            onClick={triggerDeal}
                            className="flex items-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 border border-emerald-500/30 rounded-2xl text-slate-900 dark:text-white text-sm font-black shadow-2xl shadow-emerald-500/20 transition-all active:scale-95"
                        >
                            <Zap size={16} />
                            Simulate Deal Close
                        </button>

                        {/* Add media (for demo) */}
                        <button
                            id="add-media-btn"
                            onClick={() => {
                                const newItem: MediaItem = {
                                    id: `m${uid()}`,
                                    url: `https://images.unsplash.com/photo-${1560518883 + Math.floor(Math.random() * 1000)}?w=400&q=80`,
                                    label: 'Live Upload',
                                    cols: 1,
                                    rows: 1,
                                };
                                setMediaItems(prev => [newItem, ...prev].slice(0, 9));
                                setTelemetry(prev => [...prev, {
                                    id: uid(), time: nowTime(), type: 'media',
                                    text: 'Media Officer uploaded a new photo to the Journal.',
                                }]);
                            }}
                            className="flex items-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-500 border border-blue-500/30 rounded-2xl text-slate-900 dark:text-white text-sm font-black shadow-xl shadow-blue-500/20 transition-all active:scale-95"
                        >
                            <Camera size={16} />
                            Simulate Photo Upload
                        </button>

                        {/* Hide controls */}
                        <button
                            onClick={() => setShowControls(false)}
                            className="flex items-center gap-2 px-4 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-2xl text-slate-600 dark:text-slate-400 text-sm font-bold transition-all active:scale-95"
                        >
                            <X size={14} />
                            Hide Controls
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Show controls again button */}
            <AnimatePresence>
                {!showControls && (
                    <motion.button
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowControls(true)}
                        className="fixed bottom-16 right-5 z-40 w-10 h-10 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                    >
                        <Play size={14} />
                    </motion.button>
                )}
            </AnimatePresence>

            {/* ── DEAL FLASH OVERLAY ───────────────────────────────────────── */}
            <DealFlashOverlay deal={dealFlash} onDismiss={dismissDeal} />

            {/* ── CONFETTI ─────────────────────────────────────────────────── */}
            <ConfettiOverlay active={showConfetti} />
        </div>
    );
}
