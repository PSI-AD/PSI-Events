/**
 * LiveLeaderboard.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * LIVE FLOOR LEADERBOARD + BRANCH WAR ROOM — mobile-first, real-time, gamified.
 *
 * This file is intentionally slim (~120 lines): Firestore subscription + demo
 * ticker + state only. All UI is in dedicated sub-modules:
 *
 *   leaderboard/types.ts                — TypeScript interfaces
 *   leaderboard/utils.ts                — pure helpers + demo data + aggregateBranches
 *   leaderboard/LeaderboardComponents.tsx — all shared presentational components
 *   leaderboard/BranchWars.tsx          — Branch War Room panel (tug-of-war, cards)
 *
 * Architecture:
 *   • Reads from crm_events/{eventId}/approvedAgents/{agentId}
 *   • onSnapshot → re-sorts and re-aggregates on every Firestore write
 *   • Demo mode: simulated ticks, random agent → branch spread
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Flame, Users, Building2, TrendingUp, Zap } from 'lucide-react';
import { collection, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db } from '../../services/firebase/firebaseConfig';
import type { LeaderboardEntry, LiveLeaderboardProps, ViewMode } from './leaderboard/types';
import { DEMO_ROSTER, sortByLeads, aggregateBranches } from './leaderboard/utils';
import {
    AnimatedNumber, LivePulse, GapToTargetBar,
    LeaderboardHeader, MotivationalFooter, LockedView, LeaderRow,
} from './leaderboard/LeaderboardComponents';
import { BranchWarsPanel } from './leaderboard/BranchWars';

// Re-export types and utilities that external consumers use
export type { BranchStat } from './leaderboard/types';
export { aggregateBranches } from './leaderboard/utils';

function getInitials(name: string): string {
    return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
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
    const [viewMode, setViewMode] = useState<ViewMode>('individual');
    const demoIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const isUnlocked = currentAgentStatus === 'physically_present';

    // ── Data feeds ────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!isUnlocked) return;

        let unsub: Unsubscribe | undefined;

        if (useDemoData) {
            const sorted = sortByLeads(DEMO_ROSTER);
            setEntries(sorted.map((e, i) => ({ ...e, prevRank: i + 1 })));
            setIsConnected(true);
            setLastUpdated(new Date());

            demoIntervalRef.current = setInterval(() => {
                setEntries(prev => {
                    const oldRanks: Record<string, number> = {};
                    prev.forEach((e, i) => { oldRanks[e.agentId] = i + 1; });
                    const idx = Math.floor(Math.random() * prev.length);
                    const delta = Math.floor(Math.random() * 3) + 1;
                    const updated = prev.map((e, i) => i === idx ? { ...e, leadsToday: Math.min(e.leadTarget, e.leadsToday + delta) } : e);
                    const reSorted = sortByLeads(updated);
                    setPrevRanks(oldRanks);
                    setFlashId(prev[idx].agentId);
                    setTimeout(() => setFlashId(null), 800);
                    setLastUpdated(new Date());
                    return reSorted.map(e => ({ ...e, prevRank: oldRanks[e.agentId] }));
                });
            }, Math.random() * 3000 + 4000);

            return () => { if (demoIntervalRef.current) clearInterval(demoIntervalRef.current); };
        }

        const colRef = collection(db, 'crm_events', eventId, 'approvedAgents');
        unsub = onSnapshot(colRef, snap => {
            const oldRanks: Record<string, number> = {};
            setEntries(prev => { prev.forEach((e, i) => { oldRanks[e.agentId] = i + 1; }); return prev; });

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
            setEntries(sorted.map(e => ({ ...e, prevRank: oldRanks[e.agentId] })));
            setPrevRanks(oldRanks);
            setLastUpdated(new Date());
            setIsConnected(true);
        }, () => setIsConnected(false));

        return () => unsub?.();
    }, [isUnlocked, eventId, useDemoData]);

    // ── Derived ───────────────────────────────────────────────────────────────
    const myEntry = useMemo(() => entries.find(e => e.agentId === currentAgentId) ?? null, [entries, currentAgentId]);
    const myRank = useMemo(() => entries.findIndex(e => e.agentId === currentAgentId) + 1, [entries, currentAgentId]);
    const totalLeadsToday = entries.reduce((s, e) => s + e.leadsToday, 0);

    // ── Locked gate ───────────────────────────────────────────────────────────
    if (!isUnlocked) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
                <LeaderboardHeader eventName={eventName} isConnected={false} lastUpdated={null}
                    totalAgents={0} viewMode={viewMode} onToggleView={setViewMode} />
                <LockedView status={currentAgentStatus} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 select-none overflow-x-hidden">

            <LeaderboardHeader eventName={eventName} isConnected={isConnected} lastUpdated={lastUpdated}
                totalAgents={entries.length} viewMode={viewMode} onToggleView={setViewMode} />

            {/* KPI strip */}
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                className="px-4 py-4 grid grid-cols-3 gap-3">
                {[
                    { label: 'On Floor', value: entries.length, icon: <Users size={14} />, color: 'text-blue-400', bg: 'bg-blue-500/10', isString: false },
                    { label: 'Total Leads', value: totalLeadsToday, icon: <Zap size={14} />, color: 'text-amber-400', bg: 'bg-amber-500/10', isString: false },
                    {
                        label: viewMode === 'branches' ? 'Branches' : 'Your Rank',
                        value: viewMode === 'branches' ? aggregateBranches(entries).length : myRank > 0 ? `#${myRank}` : '—',
                        isString: viewMode !== 'branches',
                        icon: viewMode === 'branches' ? <Building2 size={14} /> : <TrendingUp size={14} />,
                        color: 'text-emerald-400', bg: 'bg-emerald-500/10',
                    },
                ].map(({ label, value, icon, color, bg, isString }) => (
                    <div key={label} className={`${bg} rounded-2xl px-3 py-3 text-center`}>
                        <div className={`flex items-center justify-center gap-1 ${color} mb-1`}>{icon}</div>
                        <p className={`text-xl font-extrabold ${color} font-mono`}>
                            {isString ? value : <AnimatedNumber value={value as number} />}
                        </p>
                        <p className="text-[10px] text-slate-900 dark:text-white/30 font-bold uppercase tracking-wider mt-0.5">{label}</p>
                    </div>
                ))}
            </motion.div>

            {/* My progress card — individual mode only */}
            {viewMode === 'individual' && myEntry && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    className="mx-4 mb-4 bg-gradient-to-br from-blue-900/40 to-blue-900/10 border border-blue-700/30 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-slate-900 dark:text-white font-extrabold text-xs">
                                {getInitials(myEntry.agentName)}
                            </div>
                            <div>
                                <p className="text-slate-900 dark:text-white font-bold text-sm">{myEntry.agentName}</p>
                                <p className="text-blue-400 text-[10px] font-bold">#{myRank} of {entries.length} on floor</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono leading-none">
                                <AnimatedNumber value={myEntry.leadsToday} />
                            </p>
                            <p className="text-[10px] text-slate-900 dark:text-white/40 font-bold">leads today</p>
                        </div>
                    </div>
                    <GapToTargetBar leadsToday={myEntry.leadsToday} leadTarget={myEntry.leadTarget} />
                </motion.div>
            )}

            {/* ── Main content area ── */}
            <AnimatePresence mode="wait">
                {viewMode === 'individual' ? (
                    <motion.div key="individual" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                        className="px-4 pb-8 space-y-2">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-[10px] font-bold text-slate-900 dark:text-white/40 uppercase tracking-[0.15em] flex items-center gap-1.5">
                                <Flame size={11} className="text-amber-400" /> Floor Standings
                            </p>
                            <LivePulse />
                        </div>
                        <AnimatePresence mode="popLayout">
                            {entries.map((entry, i) => (
                                <LeaderRow key={entry.agentId} entry={entry} rank={i + 1}
                                    isCurrentAgent={entry.agentId === currentAgentId}
                                    isFirst={i === 0} flash={flashId === entry.agentId} />
                            ))}
                        </AnimatePresence>
                        {entries.length === 0 && (
                            <div className="text-center py-16 text-slate-600">
                                <Users size={32} className="mx-auto mb-3 opacity-30" />
                                <p className="text-sm font-bold">No agents checked in yet</p>
                            </div>
                        )}
                    </motion.div>
                ) : (
                    <motion.div key="branches" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                        <BranchWarsPanel entries={entries} totalLeads={totalLeadsToday} />
                    </motion.div>
                )}
            </AnimatePresence>

            {myEntry && myEntry.leadsToday > 0 && (
                <MotivationalFooter entry={myEntry} rank={myRank} total={entries.length} />
            )}
        </div>
    );
}
