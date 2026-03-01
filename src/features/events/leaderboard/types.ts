/**
 * leaderboard/types.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * TypeScript interfaces and types for the Live Floor Leaderboard system.
 */

export interface LeaderboardEntry {
    agentId: string;
    agentName: string;
    branch: string;
    tier: 'gold' | 'silver' | 'bronze';
    leadsToday: number;
    leadTarget: number;
    checkedInAt: Date | null;
    prevRank?: number;
}

export interface BranchStat {
    branchName: string;
    totalLeads: number;
    totalTarget: number;
    agentCount: number;
    agents: LeaderboardEntry[];
    prevTotalLeads?: number;
}

export interface LiveLeaderboardProps {
    eventId: string;
    eventName?: string;
    currentAgentId: string;
    currentAgentStatus: import('../check-in/CheckInUtils').AgentStatus;
    useDemoData?: boolean;
}

export type ViewMode = 'individual' | 'branches';
