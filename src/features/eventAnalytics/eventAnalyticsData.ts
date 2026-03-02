/**
 * eventAnalyticsData.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Data engine for the Real-Time Event Analytics Dashboard.
 *
 * Design:
 *  - All data is self-contained (no external dependency on Firestore for demo)
 *  - A `useEventAnalytics()` hook drives live simulation via setInterval
 *  - Realistic drift is applied each tick so charts feel alive
 *  - Production swap: replace the interval with Firestore `onSnapshot` calls
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SessionStat {
    id: string;
    name: string;
    room: string;
    speaker: string;
    capacity: number;
    attendees: number;
    bookmarks: number;
    rating: number;       // 0–5
    tags: string[];
    isLive: boolean;
}

export interface TimePoint {
    time: string;         // "HH:MM"
    attendeesOnline: number;
    networkingEvents: number;
    sessionCheckIns: number;
    engagementScore: number;
}

export interface LiveCounter {
    attendeesOnline: number;
    sessionsLive: number;
    networkingConnections: number;
    messagesSent: number;
    bookmarks: number;
    avgEngagement: number;  // 0–100
}

export interface ActivityFeedItem {
    id: string;
    type: 'check_in' | 'connection' | 'bookmark' | 'message' | 'session_join';
    label: string;
    time: Date;
    icon: string;
}

export interface EngagementByType {
    type: string;
    value: number;
    color: string;
}

// ── Static session data ───────────────────────────────────────────────────────

export const SESSIONS: SessionStat[] = [
    {
        id: 'ses_01',
        name: 'Opening Keynote',
        room: 'Main Hall',
        speaker: 'H.E. Mohammed Al-Rashid',
        capacity: 500,
        attendees: 462,
        bookmarks: 318,
        rating: 4.8,
        tags: ['Keynote', 'UAE Market'],
        isLive: false,
    },
    {
        id: 'ses_02',
        name: 'Luxury Trends 2026',
        room: 'Ballroom A',
        speaker: 'Sophie Laurent',
        capacity: 250,
        attendees: 247,
        bookmarks: 205,
        rating: 4.7,
        tags: ['Luxury', 'Trends'],
        isLive: true,
    },
    {
        id: 'ses_03',
        name: 'Golden Visa Schemes 2026',
        room: 'Ballroom B',
        speaker: 'Isabella Ferreira',
        capacity: 200,
        attendees: 189,
        bookmarks: 176,
        rating: 4.6,
        tags: ['Visa', 'Investment'],
        isLive: true,
    },
    {
        id: 'ses_04',
        name: 'GCC Real Estate Outlook',
        room: 'Conference Room 1',
        speaker: 'Layla Al-Rashid',
        capacity: 150,
        attendees: 143,
        bookmarks: 112,
        rating: 4.5,
        tags: ['Market Data', 'GCC'],
        isLive: true,
    },
    {
        id: 'ses_05',
        name: 'UHNW Investment Strategies',
        room: 'VIP Suite',
        speaker: 'Ahmed Bin Khalifa',
        capacity: 80,
        attendees: 78,
        bookmarks: 74,
        rating: 4.9,
        tags: ['UHNW', 'Private Wealth'],
        isLive: false,
    },
    {
        id: 'ses_06',
        name: 'Developer Showcase',
        room: 'Exhibition Hall',
        speaker: 'Tariq Hassan',
        capacity: 300,
        attendees: 264,
        bookmarks: 198,
        rating: 4.3,
        tags: ['Developers', 'Projects'],
        isLive: true,
    },
    {
        id: 'ses_07',
        name: 'Agent Commission Models',
        room: 'Workshop Room',
        speaker: 'Priya Nair',
        capacity: 100,
        attendees: 98,
        bookmarks: 87,
        rating: 4.4,
        tags: ['Finance', 'Agents'],
        isLive: false,
    },
    {
        id: 'ses_08',
        name: 'Asian Investor Briefing',
        room: 'Boardroom',
        speaker: 'Zhang Wei',
        capacity: 60,
        attendees: 55,
        bookmarks: 48,
        rating: 4.6,
        tags: ['Asia', 'Institutional'],
        isLive: true,
    },
];

// ── Generate 24h time-series history ─────────────────────────────────────────

function padTime(h: number, m: number) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function generateTimeHistory(
    points: number = 96,    // 15-min intervals over 24h
    endHour: number = 17,   // 17:00
): TimePoint[] {
    const data: TimePoint[] = [];
    // Morning warmup curve peak around 10–11, afternoon dip, evening pickup
    for (let i = 0; i < points; i++) {
        const totalMins = i * 15;
        const hour = Math.floor(totalMins / 60);
        const min = totalMins % 60;
        // Attendance bell curve peaking 10:00–11:30
        const t = i / points;
        const bellBase = Math.sin(Math.PI * Math.pow(t, 0.7));
        const noise = (Math.random() - 0.5) * 0.08;
        const raw = Math.max(0, bellBase + noise);

        data.push({
            time: padTime(hour, min),
            attendeesOnline: Math.round(raw * 420 + 40),
            networkingEvents: Math.round(raw * 85 + 5 + Math.random() * 12),
            sessionCheckIns: Math.round(raw * 310 + 20),
            engagementScore: Math.round(raw * 45 + 50 + (Math.random() - 0.5) * 8),
        });
    }
    return data;
}

export const ENGAGEMENT_BY_TYPE: EngagementByType[] = [
    { type: 'Session Attendance', value: 68, color: '#10b981' },
    { type: 'Networking', value: 45, color: '#6366f1' },
    { type: 'Bookmarks', value: 32, color: '#f59e0b' },
    { type: 'Messages', value: 27, color: '#06b6d4' },
    { type: 'Connections', value: 19, color: '#ec4899' },
];

// ── Activity feed seed ────────────────────────────────────────────────────────

export function seedActivityFeed(): ActivityFeedItem[] {
    const events: Omit<ActivityFeedItem, 'id' | 'time'>[] = [
        { type: 'check_in', label: 'Natalia Sorokina checked in to Luxury Trends 2026', icon: '🎟' },
        { type: 'connection', label: 'Ahmed Bin Khalifa connected with Sophie Laurent', icon: '🤝' },
        { type: 'bookmark', label: 'Zhang Wei bookmarked UHNW Investment Strategies', icon: '🔖' },
        { type: 'session_join', label: 'Dmitri Volkov joined Golden Visa Schemes 2026', icon: '📍' },
        { type: 'message', label: 'Networking message sent between 3 attendees', icon: '💬' },
        { type: 'check_in', label: 'Isabella Ferreira checked in to Developer Showcase', icon: '🎟' },
        { type: 'connection', label: 'Priya Nair connected with Layla Al-Rashid', icon: '🤝' },
        { type: 'bookmark', label: 'Omar Yusuf bookmarked GCC Real Estate Outlook', icon: '🔖' },
        { type: 'session_join', label: 'Tariq Hassan joined Asian Investor Briefing', icon: '📍' },
        { type: 'message', label: 'VIP Concierge message dispatched to 2 attendees', icon: '💬' },
    ];
    const now = Date.now();
    return events.map((e, i) => ({
        ...e,
        id: `feed_${i}`,
        time: new Date(now - i * 47000),
    }));
}

// ── React hook ────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from 'react';

export type TimeRange = '15min' | '1h' | '4h' | 'today';

const RANGE_POINTS: Record<TimeRange, number> = {
    '15min': 4,
    '1h': 16,
    '4h': 32,
    'today': 96,
};

function drift(value: number, max: number, min: number, delta: number): number {
    const next = value + (Math.random() - 0.48) * delta;
    return Math.round(Math.max(min, Math.min(max, next)));
}

export function useEventAnalytics(tickMs: number = 3000) {
    const fullHistory = useRef(generateTimeHistory(96));
    const [timeRange, setTimeRange] = useState<TimeRange>('1h');
    const [sessionFilter, setSessionFilter] = useState<string>('all');
    const [counters, setCounters] = useState<LiveCounter>({
        attendeesOnline: 382,
        sessionsLive: 4,
        networkingConnections: 47,
        messagesSent: 213,
        bookmarks: 1018,
        avgEngagement: 72,
    });
    const [sessions, setSessions] = useState<SessionStat[]>(SESSIONS);
    const [activityFeed, setActivityFeed] = useState<ActivityFeedItem[]>(seedActivityFeed());
    const [lastTick, setLastTick] = useState(new Date());

    // Live tick — simulates Firestore snapshot arriving
    useEffect(() => {
        const id = setInterval(() => {
            setCounters(prev => ({
                attendeesOnline: drift(prev.attendeesOnline, 480, 200, 8),
                sessionsLive: Math.min(SESSIONS.filter(s => s.isLive).length, prev.sessionsLive),
                networkingConnections: drift(prev.networkingConnections, 200, 10, 3),
                messagesSent: drift(prev.messagesSent, 600, 50, 12),
                bookmarks: drift(prev.bookmarks, 2000, 500, 15),
                avgEngagement: drift(prev.avgEngagement, 95, 40, 2),
            }));

            // Drift session attendees
            setSessions(prev => prev.map(s => ({
                ...s,
                attendees: s.isLive
                    ? Math.min(s.capacity, Math.max(0, s.attendees + Math.round((Math.random() - 0.45) * 4)))
                    : s.attendees,
                bookmarks: Math.min(s.capacity, Math.max(0, s.bookmarks + Math.round(Math.random() * 2))),
            })));

            // Append to time history
            const lastPt = fullHistory.current[fullHistory.current.length - 1];
            const now = new Date();
            fullHistory.current = [
                ...fullHistory.current.slice(-95),
                {
                    time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
                    attendeesOnline: drift(lastPt.attendeesOnline, 480, 200, 8),
                    networkingEvents: drift(lastPt.networkingEvents, 90, 5, 4),
                    sessionCheckIns: drift(lastPt.sessionCheckIns, 350, 20, 10),
                    engagementScore: drift(lastPt.engagementScore, 95, 40, 2),
                },
            ];

            // Random activity feed item
            if (Math.random() > 0.5) {
                const FEED_TEMPLATES = [
                    { type: 'check_in' as const, label: 'New attendee checked in to ' + SESSIONS[Math.floor(Math.random() * SESSIONS.length)].name, icon: '🎟' },
                    { type: 'connection' as const, label: 'New networking connection made', icon: '🤝' },
                    { type: 'bookmark' as const, label: `Session bookmarked: ${SESSIONS[Math.floor(Math.random() * SESSIONS.length)].name}`, icon: '🔖' },
                    { type: 'message' as const, label: 'Networking message sent', icon: '💬' },
                ];
                const tmpl = FEED_TEMPLATES[Math.floor(Math.random() * FEED_TEMPLATES.length)];
                setActivityFeed(prev => [
                    { ...tmpl, id: `feed_${Date.now()}`, time: new Date() },
                    ...prev.slice(0, 24),
                ]);
            }

            setLastTick(new Date());
        }, tickMs);
        return () => clearInterval(id);
    }, [tickMs]);

    const getChartData = useCallback((): TimePoint[] => {
        const n = RANGE_POINTS[timeRange];
        return fullHistory.current.slice(-n);
    }, [timeRange]);

    const getFilteredSessions = useCallback((): SessionStat[] => {
        if (sessionFilter === 'all') return sessions;
        if (sessionFilter === 'live') return sessions.filter(s => s.isLive);
        return sessions.filter(s => s.id === sessionFilter);
    }, [sessions, sessionFilter]);

    // CSV export
    const exportCSV = useCallback(() => {
        const rows = [
            ['Time', 'Attendees Online', 'Networking Events', 'Session Check-ins', 'Engagement Score'],
            ...getChartData().map(p => [p.time, p.attendeesOnline, p.networkingEvents, p.sessionCheckIns, p.engagementScore]),
        ];
        const csv = rows.map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `event-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }, [getChartData]);

    return {
        counters, sessions, activityFeed, lastTick,
        timeRange, setTimeRange,
        sessionFilter, setSessionFilter,
        getChartData, getFilteredSessions, exportCSV,
    };
}
