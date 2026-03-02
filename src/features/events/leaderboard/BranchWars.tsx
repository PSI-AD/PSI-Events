/**
 * leaderboard/BranchWars.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * The full "Branch War Room" panel — tug-of-war progress bar + ranked cards.
 *
 * Exports:
 *   BranchCard      — single ranked branch tile
 *   TugOfWarBar     — animated head-to-head horizontal bar
 *   BranchWarsPanel — full panel (composes the two above)
 */

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Building2, Swords, Crown } from 'lucide-react';
import type { BranchStat, LeaderboardEntry } from './types';
import { clsx, getInitials, getTierGradient, aggregateBranches } from './utils';
import { AnimatedNumber, LivePulse, ranks_icons } from './LeaderboardComponents';

// ── BranchCard ────────────────────────────────────────────────────────────────

export function BranchCard({ stat, rank }: { stat: BranchStat; rank: number }) {
    const isTop = rank <= 3;
    const pct = Math.min(100, (stat.totalLeads / Math.max(stat.totalTarget, 1)) * 100);

    const rankColors: Record<number, string> = {
        1: 'border-amber-400/60 bg-amber-500/5',
        2: 'border-slate-300/40 bg-slate-300/5',
        3: 'border-orange-500/40 bg-orange-500/5',
    };

    return (
        <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className={clsx('rounded-2xl border p-4', isTop ? rankColors[rank] : 'border-white/8 bg-white/3')}>
            <div className="flex items-center gap-3">
                <div className={clsx(
                    'w-9 h-9 rounded-xl flex items-center justify-center text-xs font-extrabold flex-shrink-0',
                    rank === 1 ? 'bg-amber-400 text-amber-900' :
                        rank === 2 ? 'bg-slate-300 text-slate-900' :
                            rank === 3 ? 'bg-orange-600 text-slate-900 dark:text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white/60'
                )}>
                    {rank <= 3 ? ranks_icons[rank - 1] : `#${rank}`}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <p className="text-slate-900 dark:text-white font-extrabold text-sm truncate">{stat.branchName}</p>
                        <span className="text-[9px] text-slate-900 dark:text-white/30 font-bold">{stat.agentCount} agents</span>
                    </div>
                    <div className="h-1.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                            className={clsx('h-full rounded-full', rank === 1 ? 'bg-gradient-to-r from-amber-400 to-amber-500' : 'bg-gradient-to-r from-blue-500 to-blue-400')}
                            initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, ease: 'easeOut' }} />
                    </div>
                </div>

                <div className="text-right flex-shrink-0">
                    <p className={clsx('text-2xl font-black font-mono leading-none', rank === 1 ? 'text-amber-300' : 'text-slate-900 dark:text-white')}>
                        <AnimatedNumber value={stat.totalLeads} />
                    </p>
                    <p className="text-[10px] text-slate-900 dark:text-white/30 mt-0.5">leads</p>
                </div>
            </div>

            {/* Agent breakdown pill row */}
            <div className="flex flex-wrap gap-1.5 mt-3">
                {stat.agents.sort((a, b) => b.leadsToday - a.leadsToday).map(a => (
                    <span key={a.agentId} className="inline-flex items-center gap-1 bg-black/5 dark:bg-white/5 border border-white/8 rounded-full px-2 py-0.5 text-[10px] text-slate-900 dark:text-white/50 font-bold">
                        <span className={`w-4 h-4 rounded-full bg-gradient-to-br ${getTierGradient(a.tier)} inline-flex items-center justify-center text-[8px] font-black text-slate-900 dark:text-white`}>
                            {getInitials(a.agentName)[0]}
                        </span>
                        {a.agentName.split(' ')[0]} · {a.leadsToday}
                    </span>
                ))}
            </div>
        </motion.div>
    );
}

// ── TugOfWarBar ───────────────────────────────────────────────────────────────

export function TugOfWarBar({ left, right }: { left: BranchStat; right: BranchStat }) {
    const total = Math.max(left.totalLeads + right.totalLeads, 1);
    const leftPct = (left.totalLeads / total) * 100;
    const rightPct = 100 - leftPct;

    const isLeftLeading = left.totalLeads > right.totalLeads;
    const isTie = left.totalLeads === right.totalLeads;
    const gap = Math.abs(left.totalLeads - right.totalLeads);

    return (
        <div className="mx-4 mb-2">
            {/* Branch name labels */}
            <div className="flex items-start justify-between mb-3">
                {/* Left branch */}
                <div className="flex-1 text-left">
                    <div className={clsx(
                        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all',
                        isLeftLeading ? 'bg-amber-500/20 border border-amber-400/50 text-amber-300 shadow-lg shadow-amber-500/20' : 'bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-slate-900 dark:text-white/60'
                    )}>
                        <Building2 size={11} />
                        {left.branchName}
                        {isLeftLeading && !isTie && <Crown size={10} className="text-amber-400 animate-pulse" />}
                    </div>
                    <p className={clsx('text-3xl font-black font-mono mt-2 ml-1 transition-all', isLeftLeading ? 'text-amber-300' : 'text-slate-900 dark:text-white/50')}>
                        <AnimatedNumber value={left.totalLeads} />
                    </p>
                    <p className="text-[10px] text-slate-900 dark:text-white/30 font-bold ml-1">{left.agentCount} agent{left.agentCount !== 1 ? 's' : ''}</p>
                </div>

                {/* VS badge */}
                <div className="flex flex-col items-center justify-center px-3 pt-1">
                    <div className={clsx('w-10 h-10 rounded-full border-2 flex items-center justify-center', isTie ? 'border-slate-500 bg-slate-100 dark:bg-slate-800' : 'border-amber-500/50 bg-amber-500/10')}>
                        <Swords size={14} className={isTie ? 'text-slate-600 dark:text-slate-400' : 'text-amber-400'} />
                    </div>
                    <p className="text-[9px] text-slate-900 dark:text-white/30 font-black uppercase tracking-widest mt-1">VS</p>
                </div>

                {/* Right branch */}
                <div className="flex-1 text-right">
                    <div className={clsx(
                        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all',
                        !isLeftLeading && !isTie ? 'bg-amber-500/20 border border-amber-400/50 text-amber-300 shadow-lg shadow-amber-500/20' : 'bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-slate-900 dark:text-white/60'
                    )}>
                        {!isLeftLeading && !isTie && <Crown size={10} className="text-amber-400 animate-pulse" />}
                        {right.branchName}
                        <Building2 size={11} />
                    </div>
                    <p className={clsx('text-3xl font-black font-mono mt-2 mr-1 transition-all', !isLeftLeading && !isTie ? 'text-amber-300' : 'text-slate-900 dark:text-white/50')}>
                        <AnimatedNumber value={right.totalLeads} />
                    </p>
                    <p className="text-[10px] text-slate-900 dark:text-white/30 font-bold mr-1">{right.agentCount} agent{right.agentCount !== 1 ? 's' : ''}</p>
                </div>
            </div>

            {/* The Tug-of-War bar */}
            <div className="relative h-8 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 shadow-inner shadow-black/50">
                <motion.div
                    className={clsx('absolute inset-y-0 left-0 rounded-l-full',
                        isLeftLeading ? 'bg-gradient-to-r from-amber-600 via-amber-400 to-amber-300' : 'bg-gradient-to-r from-blue-800 to-blue-600')}
                    initial={{ width: '50%' }} animate={{ width: `${leftPct}%` }}
                    transition={{ duration: 1.4, ease: [0.34, 1.56, 0.64, 1] }}>
                    {isLeftLeading && (
                        <motion.div className="absolute inset-y-0 w-12 bg-white/30 skew-x-12"
                            animate={{ x: ['-100%', '400%'] }}
                            transition={{ duration: 2, repeat: Infinity, repeatDelay: 1.5, ease: 'easeInOut' }} />
                    )}
                </motion.div>

                <motion.div
                    className={clsx('absolute inset-y-0 right-0 rounded-r-full',
                        !isLeftLeading && !isTie ? 'bg-gradient-to-l from-amber-600 via-amber-400 to-amber-300' : 'bg-gradient-to-l from-blue-800 to-blue-600')}
                    initial={{ width: '50%' }} animate={{ width: `${rightPct}%` }}
                    transition={{ duration: 1.4, ease: [0.34, 1.56, 0.64, 1] }}>
                    {!isLeftLeading && !isTie && (
                        <motion.div className="absolute inset-y-0 w-12 bg-white/30 -skew-x-12"
                            animate={{ x: ['400%', '-100%'] }}
                            transition={{ duration: 2, repeat: Infinity, repeatDelay: 1.5, ease: 'easeInOut' }} />
                    )}
                </motion.div>

                {/* Centre divider rope knot */}
                <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 flex items-center z-10">
                    <div className={clsx(
                        'w-6 h-6 rounded-full border-2 shadow-lg transition-all duration-700 flex items-center justify-center text-[10px] font-black',
                        isTie ? 'bg-slate-200 dark:bg-slate-700 border-slate-500 text-slate-700 dark:text-slate-300' : 'bg-amber-500 border-amber-300 text-amber-900 shadow-amber-500/50'
                    )}>
                        {isTie ? '=' : isLeftLeading ? '◀' : '▶'}
                    </div>
                </div>
            </div>

            {/* Gap label */}
            <motion.div key={gap} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-center gap-2 mt-3">
                {isTie ? (
                    <p className="text-slate-600 dark:text-slate-400 text-xs font-bold">⚖️ Tied — it's anyone's game!</p>
                ) : (
                    <p className="text-xs font-extrabold">
                        <span className="text-amber-400">{isLeftLeading ? left.branchName : right.branchName}</span>
                        <span className="text-slate-900 dark:text-white/50 mx-1.5">leads by</span>
                        <span className="text-amber-300 font-black">{gap} lead{gap !== 1 ? 's' : ''}</span>
                        <span className="ml-1.5 text-amber-400">🔥</span>
                    </p>
                )}
            </motion.div>

            {/* Glow rims when one branch is clearly ahead */}
            {!isTie && (
                <motion.div className="absolute -inset-1 rounded-2xl pointer-events-none blur-xl opacity-20 bg-amber-400"
                    animate={{ opacity: [0.12, 0.28, 0.12] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }} />
            )}
        </div>
    );
}

// ── BranchWarsPanel ───────────────────────────────────────────────────────────

export function BranchWarsPanel({ entries, totalLeads }: { entries: LeaderboardEntry[]; totalLeads: number }) {
    const branches = useMemo(() => aggregateBranches(entries), [entries]);

    if (branches.length === 0) {
        return (
            <div className="text-center py-16 text-slate-600">
                <Building2 size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm font-bold">No branch data yet</p>
            </div>
        );
    }

    const [top, challenger, ...rest] = branches;

    return (
        <div className="space-y-4 pb-20">
            {/* War Room header */}
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                className="mx-4 bg-gradient-to-r from-amber-950/60 to-white dark:to-slate-900/60 border border-amber-500/20 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-1">
                    <Swords size={15} className="text-amber-400" />
                    <p className="text-amber-300 text-xs font-black uppercase tracking-widest">Branch War Room</p>
                    <LivePulse />
                </div>
                <p className="text-slate-900 dark:text-white/40 text-[11px]">
                    {branches.length} branches · {entries.length} agents competing · {totalLeads} total leads captured
                </p>
            </motion.div>

            {/* Tug-of-war — top 2 branches only */}
            {top && challenger ? (
                <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                    className="mx-4 bg-white dark:bg-slate-900/80 border border-white/8 rounded-3xl p-5 relative overflow-hidden">
                    <motion.div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent pointer-events-none rounded-3xl"
                        animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 3, repeat: Infinity }} />
                    <TugOfWarBar left={top} right={challenger} />
                </motion.div>
            ) : top ? (
                <div className="mx-4 text-center py-6 text-slate-900 dark:text-white/40 text-sm">
                    🏆 {top.branchName} is the only branch on the floor!
                </div>
            ) : null}

            {/* All branches ranked */}
            {branches.length > 0 && (
                <div className="px-4 space-y-2">
                    <p className="text-[10px] font-bold text-slate-900 dark:text-white/30 uppercase tracking-[0.15em] flex items-center gap-1.5 mb-3">
                        <Building2 size={11} className="text-amber-400" /> Branch Standings
                    </p>
                    <AnimatePresence>
                        {branches.map((branch, i) => (
                            <BranchCard key={branch.branchName} stat={branch} rank={i + 1} />
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}
