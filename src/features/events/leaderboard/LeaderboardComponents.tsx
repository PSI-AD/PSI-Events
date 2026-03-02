/**
 * leaderboard/LeaderboardComponents.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Shared presentational components for the Live Floor Leaderboard.
 *
 * Exports:
 *   AnimatedNumber     — spring-animated numeric counter
 *   LivePulse          — animated green dot "LIVE" indicator
 *   GapToTargetBar     — progress bar vs lead target
 *   RankDelta          — rank movement (up/down) indicator
 *   LeaderRow          — individual agent row card
 *   LeaderboardHeader  — sticky header with mode toggle
 *   MotivationalFooter — fixed bottom motivational ticker
 *   LockedView         — gate screen for non-checked-in agents
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, useSpring, useTransform, useMotionValue } from 'motion/react';
import {
    Flame, Trophy, Target, Zap,
    TrendingUp, Users, Clock,
    Star, ChevronUp, ChevronDown as ChevronDownIcon, Wifi,
    Lock, QrCode, Medal, Swords, Building2,
} from 'lucide-react';
import type { LeaderboardEntry, ViewMode } from './types';
import type { AgentStatus } from '../../check-in/CheckInUtils';
import { clsx, getInitials, getTierGradient } from './utils';

// ── Rank medal config ─────────────────────────────────────────────────────────

export const RANK_CONFIG = [
    { rank: 1, label: '1st', icon: <Trophy size={16} />, border: 'border-amber-400', badge: 'bg-amber-400 text-amber-900', glow: 'shadow-amber-500/20', ring: 'ring-2 ring-amber-400/40', gradient: 'from-amber-500/20 via-amber-400/10 to-transparent', textRank: 'text-amber-400' },
    { rank: 2, label: '2nd', icon: <Medal size={16} />, border: 'border-slate-300', badge: 'bg-slate-300 text-slate-900', glow: 'shadow-slate-300/20', ring: 'ring-2 ring-slate-300/30', gradient: 'from-slate-300/15 via-slate-400/5 to-transparent', textRank: 'text-psi-secondary' },
    { rank: 3, label: '3rd', icon: <Medal size={16} />, border: 'border-orange-500', badge: 'bg-orange-600 text-psi-primary', glow: 'shadow-orange-500/20', ring: 'ring-2 ring-orange-500/30', gradient: 'from-orange-600/15 via-orange-500/5 to-transparent', textRank: 'text-orange-400' },
];

export const ranks_icons = ['👑', '🥈', '🥉'];

export function getRankConfig(rank: number) {
    return RANK_CONFIG.find(r => r.rank === rank) ?? null;
}

// ── AnimatedNumber ─────────────────────────────────────────────────────────────

export function AnimatedNumber({ value }: { value: number }) {
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

// ── LivePulse ─────────────────────────────────────────────────────────────────

export function LivePulse() {
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

// ── GapToTargetBar ────────────────────────────────────────────────────────────

export function GapToTargetBar({ leadsToday, leadTarget }: { leadsToday: number; leadTarget: number }) {
    const pct = Math.min(100, (leadsToday / Math.max(leadTarget, 1)) * 100);
    const gap = Math.max(0, leadTarget - leadsToday);
    const isOnTrack = pct >= 60;
    const isDone = gap === 0;

    const barColor = isDone ? 'from-emerald-400 to-emerald-500' : isOnTrack ? 'from-blue-400 to-blue-500' : 'from-rose-400 to-rose-500';
    const textColor = isDone ? 'text-emerald-400' : isOnTrack ? 'text-blue-400' : 'text-rose-400';

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-psi-primary/70 flex items-center gap-1.5"><Target size={11} />Your Lead Target</span>
                <span className={`text-xs font-extrabold ${textColor}`}>
                    {isDone ? '🎯 Target Hit!' : `${gap} away from ${leadTarget}`}
                </span>
            </div>
            <div className="relative h-3 bg-psi-border-subtle rounded-full overflow-hidden">
                <motion.div className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${barColor} shadow-lg`}
                    initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1.2, ease: 'easeOut' }} />
                <motion.div className="absolute inset-y-0 w-8 bg-psi-border skew-x-12 rounded-full"
                    animate={{ x: ['-200%', '600%'] }} transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 3, ease: 'easeInOut' }} />
            </div>
            <div className="flex justify-between text-[10px] text-psi-muted font-bold">
                <span>0</span>
                <span className="flex items-center gap-1"><AnimatedNumber value={leadsToday} /> / {leadTarget} leads</span>
                <span>{leadTarget}</span>
            </div>
            {!isDone && !isOnTrack && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[10px] text-rose-400 font-bold flex items-center gap-1">
                    <Flame size={10} />Pick up the pace — you're below 60% of your target!
                </motion.p>
            )}
        </div>
    );
}

// ── RankDelta ─────────────────────────────────────────────────────────────────

export function RankDelta({ current, prev }: { current: number; prev: number | undefined }) {
    if (prev === undefined || prev === current) return null;
    const up = current < prev;
    return (
        <motion.div initial={{ opacity: 0, y: up ? 8 : -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className={`flex items-center gap-0.5 text-[10px] font-bold ${up ? 'text-emerald-400' : 'text-rose-400'}`}>
            {up ? <ChevronUp size={12} /> : <ChevronDownIcon size={12} />}
            {Math.abs((prev ?? 0) - current)}
        </motion.div>
    );
}

// ── LeaderRow ─────────────────────────────────────────────────────────────────

export function LeaderRow({ entry, rank, isCurrentAgent, isFirst, flash }: {
    entry: LeaderboardEntry; rank: number; isCurrentAgent: boolean; isFirst: boolean; flash: boolean;
}) {
    const rankCfg = getRankConfig(rank);
    const pct = Math.min(100, (entry.leadsToday / Math.max(entry.leadTarget, 1)) * 100);

    return (
        <motion.div layout layoutId={entry.agentId}
            initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 180, damping: 24 }}
            className={clsx(
                'relative rounded-2xl border overflow-hidden',
                rankCfg ? rankCfg.border : isCurrentAgent ? 'border-blue-500/50' : 'border-white/8',
                rankCfg ? rankCfg.ring : '',
                rankCfg ? rankCfg.glow : '',
                rankCfg ? 'shadow-lg' : '',
                isCurrentAgent && !rankCfg ? 'border-blue-500/40 ring-2 ring-blue-500/20' : '',
                flash ? 'ring-2 ring-emerald-400/60' : '',
            )}>
            {rankCfg && <div className={`absolute inset-0 bg-gradient-to-r ${rankCfg.gradient} pointer-events-none`} />}
            {isCurrentAgent && !rankCfg && <div className="absolute inset-0 bg-blue-500/5 pointer-events-none" />}

            <div className="relative px-4 py-4 flex items-center gap-3">
                <div className="flex flex-col items-center gap-1 flex-shrink-0 w-8">
                    {rankCfg ? (
                        <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-extrabold ${rankCfg.badge}`}>
                            {ranks_icons[rank - 1]}
                        </div>
                    ) : (
                        <span className="text-lg font-extrabold text-psi-muted">#{rank}</span>
                    )}
                    <AnimatePresence><RankDelta current={rank} prev={entry.prevRank} /></AnimatePresence>
                </div>

                <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${getTierGradient(entry.tier)} flex items-center justify-center text-psi-primary font-extrabold text-sm flex-shrink-0 relative`}>
                    {getInitials(entry.agentName)}
                    {isFirst && <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center text-[10px]">👑</div>}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <p className={`font-extrabold text-sm truncate ${isCurrentAgent ? 'text-blue-300' : 'text-psi-primary'}`}>
                            {entry.agentName}
                            {isCurrentAgent && <span className="ml-1.5 text-[10px] font-bold text-blue-400 bg-blue-500/20 px-1.5 py-0.5 rounded-full">YOU</span>}
                        </p>
                    </div>
                    <p className="text-[10px] text-psi-muted truncate mb-2">{entry.branch}</p>
                    <div className="h-1.5 bg-psi-border-subtle rounded-full overflow-hidden">
                        <motion.div className={`h-full rounded-full bg-gradient-to-r ${pct >= 80 ? 'from-emerald-400 to-emerald-500' : pct >= 50 ? 'from-blue-400 to-blue-500' : 'from-rose-400 to-rose-500'}`}
                            initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, ease: 'easeOut', delay: 0.1 }} />
                    </div>
                </div>

                <div className="flex-shrink-0 text-right">
                    <p className={`text-2xl font-extrabold leading-none font-mono ${rankCfg ? rankCfg.textRank : isCurrentAgent ? 'text-blue-300' : 'text-psi-primary'}`}>
                        <AnimatedNumber value={entry.leadsToday} />
                    </p>
                    <p className="text-[10px] text-psi-muted font-bold mt-0.5">leads</p>
                </div>
            </div>
        </motion.div>
    );
}

// ── LeaderboardHeader ─────────────────────────────────────────────────────────

export function LeaderboardHeader({
    eventName, isConnected, lastUpdated, totalAgents, viewMode, onToggleView,
}: {
    eventName: string;
    isConnected: boolean;
    lastUpdated: Date | null;
    totalAgents: number;
    viewMode: ViewMode;
    onToggleView: (m: ViewMode) => void;
}) {
    return (
        <div className="sticky top-0 z-30 bg-psi-page/90 backdrop-blur-md border-b border-psi-subtle px-4 py-4">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                        {viewMode === 'branches' ? <Swords size={16} className="text-psi-primary" /> : <Trophy size={16} className="text-psi-primary" />}
                    </div>
                    <div>
                        <p className="text-psi-primary font-extrabold text-sm leading-tight">
                            {viewMode === 'branches' ? 'Branch War Room' : 'Live Floor Leaderboard'}
                        </p>
                        <p className="text-psi-muted text-[10px] truncate max-w-[180px]">{eventName}</p>
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
                        <span className="text-[9px] text-psi-muted flex items-center gap-0.5">
                            <Clock size={9} />
                            {lastUpdated.toLocaleTimeString('en-AE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                    )}
                </div>
            </div>

            {/* Mode toggle */}
            <div className="flex gap-1 bg-psi-subtle/80 p-1 rounded-xl">
                {([
                    { id: 'individual', label: 'Individual Agents', icon: <Users size={12} /> },
                    { id: 'branches', label: 'Branch Wars 🔥', icon: <Swords size={12} /> },
                ] as { id: ViewMode; label: string; icon: React.ReactNode }[]).map(m => (
                    <button key={m.id} id={`lb-mode-${m.id}`} onClick={() => onToggleView(m.id)}
                        className={clsx(
                            'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-black transition-all',
                            viewMode === m.id
                                ? m.id === 'branches'
                                    ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-psi-primary shadow-md shadow-amber-500/30'
                                    : 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                                : 'text-psi-muted hover:text-psi-primary/70'
                        )}>
                        {m.icon} {m.label}
                    </button>
                ))}
            </div>
        </div>
    );
}

// ── MotivationalFooter ────────────────────────────────────────────────────────

export function MotivationalFooter({ entry, rank, total }: { entry: LeaderboardEntry; rank: number; total: number }) {
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
                    <motion.p key={msgIdx} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                        className="text-psi-primary text-[13px] font-extrabold text-center">
                        {messages[msgIdx]}
                    </motion.p>
                </AnimatePresence>
            </div>
        </div>
    );
}

// ── LockedView ────────────────────────────────────────────────────────────────

export function LockedView({ status }: { status: AgentStatus }) {
    return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center px-8 py-16 text-center">
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                className="w-20 h-20 bg-psi-subtle border border-psi-strong rounded-3xl flex items-center justify-center mb-6">
                <Lock size={32} className="text-psi-secondary" />
            </motion.div>
            <h3 className="text-xl font-extrabold text-psi-primary mb-2">Floor Leaderboard Locked</h3>
            <p className="text-psi-secondary text-sm leading-relaxed mb-6 max-w-xs">
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
