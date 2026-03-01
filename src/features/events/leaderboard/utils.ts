/**
 * leaderboard/utils.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Pure utility functions and demo data for the Live Floor Leaderboard.
 * Zero React imports — fully testable in isolation.
 */

import type { LeaderboardEntry, BranchStat } from './types';

// ── Demo data ─────────────────────────────────────────────────────────────────

export const DEMO_ROSTER: LeaderboardEntry[] = [
    { agentId: 'agt_001', agentName: 'Khalid Al-Mansouri', branch: 'Dubai Marina', tier: 'gold', leadsToday: 52, leadTarget: 75, checkedInAt: new Date('2026-02-28T07:30:00') },
    { agentId: 'agt_002', agentName: 'Sara Almarzouqi', branch: 'Abu Dhabi HQ', tier: 'gold', leadsToday: 47, leadTarget: 75, checkedInAt: new Date('2026-02-28T07:45:00') },
    { agentId: 'agt_003', agentName: 'Mohammed Al-Qubaisi', branch: 'Dubai Marina', tier: 'gold', leadsToday: 44, leadTarget: 75, checkedInAt: new Date('2026-02-28T08:00:00') },
    { agentId: 'agt_004', agentName: 'Nour Al-Hamdan', branch: 'Sharjah', tier: 'silver', leadsToday: 38, leadTarget: 60, checkedInAt: new Date('2026-02-28T08:15:00') },
    { agentId: 'agt_005', agentName: 'Omar Bin Rashid', branch: 'Abu Dhabi HQ', tier: 'silver', leadsToday: 34, leadTarget: 60, checkedInAt: new Date('2026-02-28T08:30:00') },
    { agentId: 'agt_006', agentName: 'Fatima Al-Zaabi', branch: 'Abu Dhabi HQ', tier: 'bronze', leadsToday: 28, leadTarget: 45, checkedInAt: new Date('2026-02-28T08:45:00') },
    { agentId: 'agt_007', agentName: 'Rami Haddad', branch: 'Sharjah', tier: 'silver', leadsToday: 21, leadTarget: 60, checkedInAt: new Date('2026-02-28T09:00:00') },
    { agentId: 'agt_008', agentName: 'Layla Barakati', branch: 'Dubai Marina', tier: 'bronze', leadsToday: 17, leadTarget: 45, checkedInAt: new Date('2026-02-28T09:15:00') },
    { agentId: 'agt_009', agentName: 'Tariq Al-Rashedi', branch: 'Abu Dhabi HQ', tier: 'bronze', leadsToday: 14, leadTarget: 45, checkedInAt: new Date('2026-02-28T09:30:00') },
    { agentId: 'agt_010', agentName: 'Hana Mostafa', branch: 'Sharjah', tier: 'bronze', leadsToday: 11, leadTarget: 45, checkedInAt: new Date('2026-02-28T09:45:00') },
];

// ── Pure utils ────────────────────────────────────────────────────────────────

export function clsx(...c: (string | boolean | undefined | null)[]): string {
    return c.filter(Boolean).join(' ');
}

export function getInitials(name: string): string {
    return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

export function getTierGradient(tier: 'gold' | 'silver' | 'bronze'): string {
    return tier === 'gold' ? 'from-amber-400 to-amber-600' :
        tier === 'silver' ? 'from-slate-300 to-slate-500' :
            'from-orange-500 to-orange-700';
}

export function sortByLeads(entries: LeaderboardEntry[]): LeaderboardEntry[] {
    return [...entries].sort((a, b) => b.leadsToday - a.leadsToday);
}

/**
 * aggregateBranches
 * Pure aggregation: groups agents by branch_name, sums leads + targets, ranks desc.
 */
export function aggregateBranches(entries: LeaderboardEntry[]): BranchStat[] {
    const map = new Map<string, BranchStat>();

    for (const agent of entries) {
        const key = agent.branch || 'Unknown Branch';
        if (!map.has(key)) {
            map.set(key, { branchName: key, totalLeads: 0, totalTarget: 0, agentCount: 0, agents: [] });
        }
        const stat = map.get(key)!;
        stat.totalLeads += agent.leadsToday;
        stat.totalTarget += agent.leadTarget;
        stat.agentCount += 1;
        stat.agents.push(agent);
    }

    return Array.from(map.values()).sort((a, b) => b.totalLeads - a.totalLeads);
}
