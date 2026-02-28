/**
 * LiveLeaderboard.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * LIVE FLOOR LEADERBOARD — mobile-first, real-time, gamified.
 *
 * Architecture:
 *   • Reads from  crm_events/{eventId}/approvedAgents/{agentId}
 *     Fields expected per agent document:
 *       agentName:    string
 *       branch:       string
 *       tier:         'gold' | 'silver' | 'bronze'
 *       status:       AgentStatus  (must be 'physically_present' to appear)
 *       leadsToday:   number   ← written by the Lead Distribution webhook
 *       leadTarget:   number   ← the daily target configured by the Organizer
 *       checkedInAt:  Timestamp
 *
 *   • onSnapshot listener → list re-sorts and animates on every Firestore write
 *   • Gating: component accepts a `currentAgentId` and `currentAgentStatus`.
 *     If status !== 'physically_present', renders a locked screen instead.
 *   • Demo mode: when useDemoData=true, uses mock roster with simulated ticks
 *
 * Props:
 *   eventId            — Firestore event document ID
 *   currentAgentId     — The logged-in agent's ID
 *   currentAgentStatus — 'pending'|'approved'|'physically_present'|'rejected'
 *   useDemoData        — fall back to animated mock data (no Firestore needed)
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence, useSpring, useTransform, useMotionValue } from 'motion/react';
import {
    Flame, Trophy, Target, Zap,
    TrendingUp, Users, Clock,
    Star, ChevronUp, ChevronDown as ChevronDownIcon, Wifi,
    Lock, QrCode, Medal,
} from 'lucide-react';
import {
    collection, onSnapshot, Unsubscribe,
} from 'firebase/firestore';
import { db } from '../../services/firebase/firebaseConfig';
import { AgentStatus } from '../check-in/CheckInUtils';

// ── Types ─────────────────────────────────────────────────────────────────────

interface LeaderboardEntry {
    agentId: string;
    agentName: string;
    branch: string;
    tier: 'gold' | 'silver' | 'bronze';
    leadsToday: number;
    leadTarget: number;
    checkedInAt: Date | null;
    prevRank?: number; // used for animated rank movement
}

interface LiveLeaderboardProps {
    eventId: string;
    eventName?: string;
    currentAgentId: string;
    currentAgentStatus: AgentStatus;
    useDemoData?: boolean;
}

// ── Demo data with simulated live ticks ───────────────────────────────────────

const DEMO_ROSTER: LeaderboardEntry[] = [
    { agentId: 'agt_001', agentName: 'Khalid Al-Mansouri', branch: 'Abu Dhabi', tier: 'gold', leadsToday: 52, leadTarget: 75, checkedInAt: new Date('2026-02-28T07:30:00') },
    { agentId: 'agt_002', agentName: 'Sara Almarzouqi', branch: 'Dubai Marina', tier: 'gold', leadsToday: 47, leadTarget: 75, checkedInAt: new Date('2026-02-28T07:45:00') },
    { agentId: 'agt_003', agentName: 'Mohammed Al-Qubaisi', branch: 'Abu Dhabi', tier: 'gold', leadsToday: 44, leadTarget: 75, checkedInAt: new Date('2026-02-28T08:00:00') },
    { agentId: 'agt_004', agentName: 'Nour Al-Hamdan', branch: 'Sharjah', tier: 'silver', leadsToday: 38, leadTarget: 60, checkedInAt: new Date('2026-02-28T08:15:00') },
    { agentId: 'agt_005', agentName: 'Omar Bin Rashid', branch: 'Abu Dhabi', tier: 'silver', leadsToday: 34, leadTarget: 60, checkedInAt: new Date('2026-02-28T08:30:00') },
    { agentId: 'agt_006', agentName: 'Fatima Al-Zaabi', branch: 'Abu Dhabi', tier: 'bronze', leadsToday: 28, leadTarget: 45, checkedInAt: new Date('2026-02-28T08:45:00') },
    { agentId: 'agt_007', agentName: 'Rami Haddad', branch: 'Dubai Marina', tier: 'silver', leadsToday: 21, leadTarget: 60, checkedInAt: new Date('2026-02-28T09:00:00') },
    { agentId: 'agt_008', agentName: 'Layla Barakati', branch: 'Dubai Marina', tier: 'bronze', leadsToday: 17, leadTarget: 45, checkedInAt: new Date('2026-02-28T09:15:00') },
];

// ── Rank medal config ─────────────────────────────────────────────────────────

const RANK_CONFIG = [
    {
        rank: 1,
        label: '1st',
        icon: <Trophy size={16} />,
        border: 'border-amber-400',
        badge: 'bg-amber-400 text-amber-900',
        glow: 'shadow-amber-500/20',
        ring: 'ring-2 ring-amber-400/40',
        gradient: 'from-amber-500/20 via-amber-400/10 to-transparent',
        textRank: 'text-amber-400',
    },
    {
        rank: 2,
        label: '2nd',
        icon: <Medal size={16} />,
        border: 'border-slate-300',
        badge: 'bg-slate-300 text-slate-900',
        glow: 'shadow-slate-300/20',
        ring: 'ring-2 ring-slate-300/30',
        gradient: 'from-slate-300/15 via-slate-400/5 to-transparent',
        textRank: 'text-slate-300',
    },
    {
        rank: 3,
        label: '3rd',
        icon: <Medal size={16} />,
        border: 'border-orange-500',
        badge: 'bg-orange-600 text-white',
        glow: 'shadow-orange-500/20',
        ring: 'ring-2 ring-orange-500/30',
        gradient: 'from-orange-600/15 via-orange-500/5 to-transparent',
        textRank: 'text-orange-400',
    },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function getRankConfig(rank: number) {
    return RANK_CONFIG.find(r => r.rank === rank) ?? null;
}

function getTierGradient(tier: 'gold' | 'silver' | 'bronze') {
    return tier === 'gold' ? 'from-amber-400 to-amber-600' :
        tier === 'silver' ? 'from-slate-300 to-slate-500' :
            'from-orange-500 to-orange-700';
}

function getInitials(name: string): string {
    return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

function sortByLeads(entries: LeaderboardEntry[]): LeaderboardEntry[] {
    return [...entries].sort((a, b) => b.leadsToday - a.leadsToday);
}

// ── Animated number ───────────────────────────────────────────────────────────

function AnimatedNumber({ value }: { value: number }) {
    const mv = useMotionValue(value);
    const spring = useSpring(mv, { stiffness: 90, damping: 20 });
    const display = useTransform(spring, v => Math.round(v).toString());
    const [rendered, setRendered] = useState(value.toString());

    useEffect(() => { mv.set(value); }, [value, mv]);
    useEffect(() => {
        const unsub = display.on('change', v => setRendered(v));
        return unsub;
    }, [display]);

    return <span>{rendered}</span>;
}

// ── "Gap to Target" bar ───────────────────────────────────────────────────────

function GapToTargetBar({ leadsToday, leadTarget }: { leadsToday: number; leadTarget: number }) {
    const pct = Math.min(100, (leadsToday / Math.max(leadTarget, 1)) * 100);
    const gap = Math.max(0, leadTarget - leadsToday);
    const isOnTrack = pct >= 60;
    const isDone = gap === 0;

    const barColor = isDone ? 'from-emerald-400 to-emerald-500' :
        isOnTrack ? 'from-blue-400 to-blue-500' :
            'from-rose-400 to-rose-500';
    const textColor = isDone ? 'text-emerald-400' :
        isOnTrack ? 'text-blue-400' :
            'text-rose-400';

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white/70 flex items-center gap-1.5">
                    <Target size={11} />
                    Your Lead Target
                </span>
                <span className={`text-xs font-extrabold ${textColor}`}>
                    {isDone ? '🎯 Target Hit!' : `${gap} away from ${leadTarget}`}
                </span>
            </div>
            <div className="relative h-3 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                    className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${barColor} shadow-lg`}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 1.2, ease: 'easeOut' }}
                />
                {/* Shimmer */}
                <motion.div
                    className="absolute inset-y-0 w-8 bg-white/20 skew-x-12 rounded-full"
                    animate={{ x: ['-200%', '600%'] }}
                    transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 3, ease: 'easeInOut' }}
                />
            </div>
            <div className="flex justify-between text-[10px] text-white/40 font-bold">
                <span>0</span>
                <span className="flex items-center gap-1">
                    <AnimatedNumber value={leadsToday} /> / {leadTarget} leads
                </span>
                <span>{leadTarget}</span>
            </div>
            {!isDone && !isOnTrack && (
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-[10px] text-rose-400 font-bold flex items-center gap-1"
                >
                    <Flame size={10} />
                    Pick up the pace — you're below 60% of your target!
                </motion.p>
            )}
        </div>
    );
}

// ── Rank movement indicator ───────────────────────────────────────────────────

function RankDelta({ current, prev }: { current: number; prev: number | undefined }) {
    if (prev === undefined || prev === current) return null;
    const up = current < prev; // lower rank number = higher position
    return (
        <motion.div
            initial={{ opacity: 0, y: up ? 8 : -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`flex items-center gap-0.5 text-[10px] font-bold ${up ? 'text-emerald-400' : 'text-rose-400'}`}
        >
            {up ? <ChevronUp size={12} /> : <ChevronDownIcon size={12} />}
            {Math.abs(prev - current)}
        </motion.div>
    );
}

// ── Individual leaderboard row ────────────────────────────────────────────────

function LeaderRow({
    entry,
    rank,
    isCurrentAgent,
    isFirst,
}: {
    entry: LeaderboardEntry;
    rank: number;
    isCurrentAgent: boolean;
    isFirst: boolean;
}) {
    const rankCfg = getRankConfig(rank);
    const pct = Math.min(100, (entry.leadsToday / Math.max(entry.leadTarget, 1)) * 100);

    return (
        <motion.div
            layout
            layoutId={entry.agentId}
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 180, damping: 24 }}
            className={`
                relative rounded-2xl border overflow-hidden
                ${rankCfg ? rankCfg.border : isCurrentAgent ? 'border-blue-500/50' : 'border-white/8'}
                ${rankCfg ? rankCfg.ring : ''}
                ${rankCfg ? rankCfg.glow : ''}
                ${rankCfg ? 'shadow-lg' : ''}
                ${isCurrentAgent && !rankCfg ? 'border-blue-500/40 ring-2 ring-blue-500/20' : ''}
            `}
        >
            {/* Gradient shimmer background for top 3 */}
            {rankCfg && (
                <div className={`absolute inset-0 bg-gradient-to-r ${rankCfg.gradient} pointer-events-none`} />
            )}
            {/* Current agent highlight */}
            {isCurrentAgent && !rankCfg && (
                <div className="absolute inset-0 bg-blue-500/5 pointer-events-none" />
            )}

            <div className="relative px-4 py-4 flex items-center gap-3">
                {/* Rank badge */}
                <div className="flex flex-col items-center gap-1 flex-shrink-0 w-8">
                    {rankCfg ? (
                        <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-extrabold ${rankCfg.badge}`}>
                            {ranks_icons[rank - 1]}
                        </div>
                    ) : (
                        <span className="text-lg font-extrabold text-white/30">#{rank}</span>
                    )}
                    <AnimatePresence>
                        <RankDelta current={rank} prev={entry.prevRank} />
                    </AnimatePresence>
                </div>

                {/* Avatar */}
                <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${getTierGradient(entry.tier)} flex items-center justify-center text-white font-extrabold text-sm flex-shrink-0 relative`}>
                    {getInitials(entry.agentName)}
                    {isFirst && (
                        <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center text-[10px]">
                            👑
                        </div>
                    )}
                </div>

                {/* Name + stats */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <p className={`font-extrabold text-sm truncate ${isCurrentAgent ? 'text-blue-300' : 'text-white'}`}>
                            {entry.agentName}
                            {isCurrentAgent && <span className="ml-1.5 text-[10px] font-bold text-blue-400 bg-blue-500/20 px-1.5 py-0.5 rounded-full">YOU</span>}
                        </p>
                    </div>
                    <p className="text-[10px] text-white/40 truncate mb-2">{entry.branch}</p>

                    {/* Mini progress bar */}
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                            className={`h-full rounded-full bg-gradient-to-r ${pct >= 80 ? 'from-emerald-400 to-emerald-500' :
                                pct >= 50 ? 'from-blue-400 to-blue-500' :
                                    'from-rose-400 to-rose-500'
                                }`}
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 1, ease: 'easeOut', delay: 0.1 }}
                        />
                    </div>
                </div>

                {/* Lead count */}
                <div className="flex-shrink-0 text-right">
                    <p className={`text-2xl font-extrabold leading-none font-mono ${rankCfg ? rankCfg.textRank : isCurrentAgent ? 'text-blue-300' : 'text-white'}`}>
                        <AnimatedNumber value={entry.leadsToday} />
                    </p>
                    <p className="text-[10px] text-white/30 font-bold mt-0.5">leads</p>
                </div>
            </div>
        </motion.div>
    );
}

// Crown / medal icons per rank
const ranks_icons = ['👑', '🥈', '🥉'];

// ── Locked screen (not physically present) ────────────────────────────────────

function LockedView({ status }: { status: AgentStatus }) {
    return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center px-8 py-16 text-center">
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                className="w-20 h-20 bg-slate-800 border border-slate-700 rounded-3xl flex items-center justify-center mb-6"
            >
                <Lock size={32} className="text-slate-500" />
            </motion.div>
            <h3 className="text-xl font-extrabold text-white mb-2">Floor Leaderboard Locked</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-6 max-w-xs">
                {status === 'approved'
                    ? 'You have not been checked in yet. Ask an Organizer to scan your QR pass at the event entrance to unlock the live leaderboard.'
                    : status === 'pending'
                        ? 'Your registration is pending approval. Once approved and checked in at the venue, you will see the live floor standings here.'
                        : 'Your registration was not approved for this event.'}
            </p>
            <div className="flex items-center gap-2 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                <QrCode size={20} className="text-amber-400" />
                <p className="text-amber-400 text-sm font-bold">Show your QR Pass to check in</p>
            </div>
        </div>
    );
}

// ── Live pulse indicator ──────────────────────────────────────────────────────

function LivePulse() {
    return (
        <div className="flex items-center gap-1.5">
            <div className="relative w-2 h-2">
                <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-75" />
                <div className="relative w-2 h-2 bg-emerald-400 rounded-full" />
            </div>
            <span className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest">Live</span>
        </div>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function LiveLeaderboard({
    eventId,
    eventName = 'Event Floor',
    currentAgentId,
    currentAgentStatus,
    useDemoData = false,
}: LiveLeaderboardProps) {
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [prevRanks, setPrevRanks] = useState<Record<string, number>>({});
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [flashId, setFlashId] = useState<string | null>(null);
    const demoIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // ── Gate: only show if agent is physically present ──────────────────────
    const isUnlocked = currentAgentStatus === 'physically_present';

    // ── Firestore listener ──────────────────────────────────────────────────
    useEffect(() => {
        if (!isUnlocked) return;

        let unsub: Unsubscribe | undefined;

        if (useDemoData) {
            // Animated demo mode — simulate random lead increments every 4-7s
            const sorted = sortByLeads(DEMO_ROSTER);
            const ranked = sorted.map((e, i) => ({ ...e, prevRank: i + 1 }));
            setEntries(ranked);
            setIsConnected(true);
            setLastUpdated(new Date());

            demoIntervalRef.current = setInterval(() => {
                setEntries(prev => {
                    // Record current ranks before update
                    const oldRanks: Record<string, number> = {};
                    prev.forEach((e, i) => { oldRanks[e.agentId] = i + 1; });

                    // Pick a random agent and give them 1-3 leads
                    const idx = Math.floor(Math.random() * prev.length);
                    const delta = Math.floor(Math.random() * 3) + 1;
                    const updated = prev.map((e, i) =>
                        i === idx ? { ...e, leadsToday: Math.min(e.leadTarget, e.leadsToday + delta) } : e
                    );
                    const reSorted = sortByLeads(updated);
                    const newEntries = reSorted.map((e) => ({
                        ...e,
                        prevRank: oldRanks[e.agentId],
                    }));

                    setPrevRanks(oldRanks);
                    setFlashId(prev[idx].agentId);
                    setTimeout(() => setFlashId(null), 800);
                    setLastUpdated(new Date());
                    return newEntries;
                });
            }, Math.random() * 3000 + 4000);

            return () => {
                if (demoIntervalRef.current) clearInterval(demoIntervalRef.current);
            };
        }

        // ── Live Firestore listener ─────────────────────────────────────
        const colRef = collection(db, 'crm_events', eventId, 'approvedAgents');
        unsub = onSnapshot(
            colRef,
            (snap) => {
                const oldRanks: Record<string, number> = {};
                setEntries(prev => {
                    prev.forEach((e, i) => { oldRanks[e.agentId] = i + 1; });
                    return prev;
                });

                const raw: LeaderboardEntry[] = snap.docs
                    .filter(d => d.data().status === 'physically_present')
                    .map(d => {
                        const data = d.data();
                        return {
                            agentId: d.id,
                            agentName: data.agentName ?? data.name ?? 'Unknown',
                            branch: data.branch ?? '',
                            tier: data.tier ?? 'silver',
                            leadsToday: data.leadsToday ?? 0,
                            leadTarget: data.leadTarget ?? 75,
                            checkedInAt: data.checkedInAt?.toDate?.() ?? null,
                            prevRank: oldRanks[d.id],
                        };
                    });

                const sorted = sortByLeads(raw);
                const withRanks = sorted.map((e, i) => ({ ...e, prevRank: oldRanks[e.agentId] }));

                setEntries(withRanks);
                setPrevRanks(oldRanks);
                setLastUpdated(new Date());
                setIsConnected(true);
            },
            () => setIsConnected(false)
        );

        return () => unsub?.();
    }, [isUnlocked, eventId, useDemoData]);

    // ── Derived: current agent's entry ──────────────────────────────────────
    const myEntry = useMemo(
        () => entries.find(e => e.agentId === currentAgentId) ?? null,
        [entries, currentAgentId]
    );
    const myRank = useMemo(
        () => entries.findIndex(e => e.agentId === currentAgentId) + 1,
        [entries, currentAgentId]
    );

    // ── Locked gate ─────────────────────────────────────────────────────────
    if (!isUnlocked) {
        return (
            <div className="min-h-screen bg-slate-950">
                <LeaderboardHeader
                    eventName={eventName}
                    isConnected={false}
                    lastUpdated={null}
                    totalAgents={0}
                />
                <LockedView status={currentAgentStatus} />
            </div>
        );
    }

    const totalLeadsToday = entries.reduce((s, e) => s + e.leadsToday, 0);

    return (
        <div className="min-h-screen bg-slate-950 select-none overflow-x-hidden">

            {/* ── Header ── */}
            <LeaderboardHeader
                eventName={eventName}
                isConnected={isConnected}
                lastUpdated={lastUpdated}
                totalAgents={entries.length}
            />

            {/* ── Event-level KPI strip ── */}
            <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="px-4 py-4 grid grid-cols-3 gap-3"
            >
                {[
                    { label: 'On Floor', value: entries.length, icon: <Users size={14} />, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                    { label: 'Total Leads', value: totalLeadsToday, icon: <Zap size={14} />, color: 'text-amber-400', bg: 'bg-amber-500/10' },
                    { label: 'Your Rank', value: myRank > 0 ? `#${myRank}` : '—', isString: true, icon: <TrendingUp size={14} />, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                ].map(({ label, value, icon, color, bg, isString }) => (
                    <div key={label} className={`${bg} rounded-2xl px-3 py-3 text-center`}>
                        <div className={`flex items-center justify-center gap-1 ${color} mb-1`}>{icon}</div>
                        <p className={`text-xl font-extrabold ${color} font-mono`}>
                            {isString ? value : <AnimatedNumber value={value as number} />}
                        </p>
                        <p className="text-[10px] text-white/30 font-bold uppercase tracking-wider mt-0.5">{label}</p>
                    </div>
                ))}
            </motion.div>

            {/* ── My progress card (gap to target) ── */}
            {myEntry && (
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mx-4 mb-4 bg-gradient-to-br from-blue-900/40 to-blue-900/10 border border-blue-700/30 rounded-2xl p-4 space-y-3"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-extrabold text-xs">
                                {getInitials(myEntry.agentName)}
                            </div>
                            <div>
                                <p className="text-white font-bold text-sm">{myEntry.agentName}</p>
                                <p className="text-blue-400 text-[10px] font-bold">#{myRank} of {entries.length} on floor</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-2xl font-extrabold text-white font-mono leading-none">
                                <AnimatedNumber value={myEntry.leadsToday} />
                            </p>
                            <p className="text-[10px] text-white/40 font-bold">leads today</p>
                        </div>
                    </div>
                    <GapToTargetBar leadsToday={myEntry.leadsToday} leadTarget={myEntry.leadTarget} />
                </motion.div>
            )}

            {/* ── Leaderboard list ── */}
            <div className="px-4 pb-8 space-y-2">
                <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.15em] flex items-center gap-1.5">
                        <Flame size={11} className="text-amber-400" />
                        Floor Standings
                    </p>
                    <LivePulse />
                </div>

                <AnimatePresence mode="popLayout">
                    {entries.map((entry, i) => (
                        <motion.div
                            key={entry.agentId}
                            className={flashId === entry.agentId ? 'ring-2 ring-emerald-400/60 rounded-2xl' : ''}
                        >
                            <LeaderRow
                                entry={entry}
                                rank={i + 1}
                                isCurrentAgent={entry.agentId === currentAgentId}
                                isFirst={i === 0}
                            />
                        </motion.div>
                    ))}
                </AnimatePresence>

                {entries.length === 0 && (
                    <div className="text-center py-16 text-slate-600">
                        <Users size={32} className="mx-auto mb-3 opacity-30" />
                        <p className="text-sm font-bold">No agents checked in yet</p>
                        <p className="text-xs text-slate-700 mt-1">The leaderboard populates as agents are scanned at the entrance.</p>
                    </div>
                )}
            </div>

            {/* ── Footer motivational ticker ── */}
            {myEntry && myEntry.leadsToday > 0 && (
                <MotivationalFooter entry={myEntry} rank={myRank} total={entries.length} />
            )}
        </div>
    );
}

// ── Header sub-component ──────────────────────────────────────────────────────

function LeaderboardHeader({
    eventName, isConnected, lastUpdated, totalAgents,
}: {
    eventName: string;
    isConnected: boolean;
    lastUpdated: Date | null;
    totalAgents: number;
}) {
    return (
        <div className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-white/5 px-4 py-4">
            <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                        <Trophy size={16} className="text-white" />
                    </div>
                    <div>
                        <p className="text-white font-extrabold text-sm leading-tight">Live Floor Leaderboard</p>
                        <p className="text-white/40 text-[10px] truncate max-w-[180px]">{eventName}</p>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1.5">
                        <Wifi size={12} className={isConnected ? 'text-emerald-400' : 'text-slate-600'} />
                        <span className={`text-[10px] font-bold ${isConnected ? 'text-emerald-400' : 'text-slate-600'}`}>
                            {isConnected ? 'Connected' : 'Offline'}
                        </span>
                    </div>
                    {lastUpdated && (
                        <span className="text-[9px] text-white/20 flex items-center gap-0.5">
                            <Clock size={9} />
                            {lastUpdated.toLocaleTimeString('en-AE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Motivational footer ───────────────────────────────────────────────────────

function MotivationalFooter({
    entry, rank, total,
}: {
    entry: LeaderboardEntry;
    rank: number;
    total: number;
}) {
    const messages = [
        `🔥 You're #${rank} of ${total} — keep pushing!`,
        `💪 ${Math.max(0, entry.leadTarget - entry.leadsToday)} more leads to hit your target!`,
        rank === 1 ? '👑 You\'re leading the floor — defend your throne!' : `🚀 Close the gap — #${rank - 1} is just ahead!`,
        `⚡ ${entry.leadsToday} leads captured. Every conversation counts.`,
    ];

    const [msgIdx, setMsgIdx] = useState(0);
    useEffect(() => {
        const t = setInterval(() => setMsgIdx(i => (i + 1) % messages.length), 5000);
        return () => clearInterval(t);
    }, [messages.length]);

    return (
        <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none">
            <div className="mx-4 mb-4 bg-gradient-to-r from-amber-500/90 to-amber-600/90 backdrop-blur-sm rounded-2xl px-4 py-3 shadow-2xl shadow-amber-500/20">
                <AnimatePresence mode="wait">
                    <motion.p
                        key={msgIdx}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="text-white text-[13px] font-extrabold text-center"
                    >
                        {messages[msgIdx]}
                    </motion.p>
                </AnimatePresence>
            </div>
        </div>
    );
}
