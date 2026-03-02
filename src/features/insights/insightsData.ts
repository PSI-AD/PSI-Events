/**
 * insightsData.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Seed data for the AI Event Insights Engine.
 * Production: replace with live Firestore aggregation queries.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface HourlyMetric {
    hour: number;         // 8–20 (8 AM → 8 PM)
    label: string;        // "9:00 AM"
    attendance: number;   // 0–100 %
    engagement: number;   // 0–100 %
    networkingPings: number;
    pollVotes: number;
    boothVisits: number;
}

export interface TopicScore {
    topic: string;
    score: number;       // 0–100
    mentions: number;
    sessions: number;
    trend: 'rising' | 'stable' | 'falling';
    color: string;
}

export interface SpeakerMetric {
    name: string;
    avatar: string;
    company: string;
    sessions: number;
    avgEngagement: number;  // 0–100
    totalReach: number;
    feedbackScore: number;  // 0–5
    topTopics: string[];
    peakMinute: number;     // minute into session with highest engagement
}

export interface NetworkingCluster {
    id: string;
    label: string;
    size: number;
    connections: number;
    topPairs: string[];
    color: string;
}

export interface ActivityPoint {
    minute: number;   // minutes from event start (0 = 8 AM)
    label: string;
    attendance: number;
    networking: number;
    content: number;
}

export interface AIInsight {
    id: string;
    category: 'engagement' | 'speaker' | 'topic' | 'networking' | 'operational';
    priority: 'critical' | 'high' | 'medium';
    title: string;
    finding: string;
    recommendation: string;
    metric: string;
    metricLabel: string;
    emoji: string;
}

// ── Hourly data ───────────────────────────────────────────────────────────────

export const HOURLY_DATA: HourlyMetric[] = [
    { hour: 8, label: '8 AM', attendance: 48, engagement: 52, networkingPings: 34, pollVotes: 12, boothVisits: 67 },
    { hour: 9, label: '9 AM', attendance: 71, engagement: 68, networkingPings: 87, pollVotes: 41, boothVisits: 112 },
    { hour: 10, label: '10 AM', attendance: 94, engagement: 91, networkingPings: 143, pollVotes: 88, boothVisits: 178 },
    { hour: 11, label: '11 AM', attendance: 88, engagement: 84, networkingPings: 102, pollVotes: 74, boothVisits: 154 },
    { hour: 12, label: '12 PM', attendance: 62, engagement: 55, networkingPings: 201, pollVotes: 23, boothVisits: 89 },
    { hour: 13, label: '1 PM', attendance: 57, engagement: 49, networkingPings: 187, pollVotes: 18, boothVisits: 76 },
    { hour: 14, label: '2 PM', attendance: 83, engagement: 79, networkingPings: 98, pollVotes: 61, boothVisits: 143 },
    { hour: 15, label: '3 PM', attendance: 97, engagement: 95, networkingPings: 112, pollVotes: 93, boothVisits: 168 },
    { hour: 16, label: '4 PM', attendance: 91, engagement: 88, networkingPings: 134, pollVotes: 81, boothVisits: 159 },
    { hour: 17, label: '5 PM', attendance: 76, engagement: 71, networkingPings: 178, pollVotes: 54, boothVisits: 123 },
    { hour: 18, label: '6 PM', attendance: 53, engagement: 61, networkingPings: 212, pollVotes: 31, boothVisits: 94 },
    { hour: 19, label: '7 PM', attendance: 34, engagement: 43, networkingPings: 98, pollVotes: 14, boothVisits: 47 },
    { hour: 20, label: '8 PM', attendance: 18, engagement: 22, networkingPings: 41, pollVotes: 6, boothVisits: 21 },
];

// ── Topics ────────────────────────────────────────────────────────────────────

export const TOPIC_SCORES: TopicScore[] = [
    { topic: 'Dubai Luxury Properties', score: 96, mentions: 847, sessions: 4, trend: 'rising', color: 'bg-violet-500' },
    { topic: 'Golden Visa Structuring', score: 91, mentions: 712, sessions: 3, trend: 'rising', color: 'bg-emerald-500' },
    { topic: 'Off-Plan Investment', score: 87, mentions: 634, sessions: 4, trend: 'stable', color: 'bg-sky-500' },
    { topic: 'CIS Buyer Behaviour', score: 84, mentions: 581, sessions: 2, trend: 'rising', color: 'bg-amber-500' },
    { topic: 'ESG & Net Zero', score: 72, mentions: 423, sessions: 2, trend: 'rising', color: 'bg-teal-500' },
    { topic: 'Asian Capital Flows', score: 68, mentions: 387, sessions: 1, trend: 'stable', color: 'bg-pink-500' },
    { topic: 'Price Forecasting 2030', score: 65, mentions: 344, sessions: 2, trend: 'falling', color: 'bg-orange-500' },
    { topic: 'Mortgage & Finance', score: 58, mentions: 298, sessions: 1, trend: 'stable', color: 'bg-blue-500' },
    { topic: 'Short-Term Rentals (STR)', score: 51, mentions: 241, sessions: 1, trend: 'rising', color: 'bg-red-500' },
    { topic: 'Ras Al Khaimah Expansion', score: 44, mentions: 187, sessions: 1, trend: 'rising', color: 'bg-indigo-500' },
];

// ── Speakers ──────────────────────────────────────────────────────────────────

export const SPEAKER_METRICS: SpeakerMetric[] = [
    {
        name: 'Natalia Sorokina',
        avatar: '👩‍💼',
        company: 'PSI — Property Shop Investment',
        sessions: 1,
        avgEngagement: 94,
        totalReach: 412,
        feedbackScore: 4.9,
        topTopics: ['CIS Buyers', 'Golden Visa', 'Portfolio Strategy'],
        peakMinute: 38,
    },
    {
        name: 'H.E. Mohammed Al-Rashid',
        avatar: '👨‍⚖️',
        company: 'Dubai Real Estate Authority',
        sessions: 1,
        avgEngagement: 91,
        totalReach: 412,
        feedbackScore: 4.8,
        topTopics: ['Policy', 'Market Vision', 'Regulation'],
        peakMinute: 22,
    },
    {
        name: 'Sophie Laurent',
        avatar: '👩‍💼',
        company: 'Knight Frank',
        sessions: 2,
        avgEngagement: 88,
        totalReach: 387,
        feedbackScore: 4.7,
        topTopics: ['Price Forecasting', 'Luxury Trends', 'UHNW Buyers'],
        peakMinute: 31,
    },
    {
        name: 'Layla Al-Rashid',
        avatar: '👩‍🔬',
        company: 'JLL Middle East',
        sessions: 1,
        avgEngagement: 79,
        totalReach: 284,
        feedbackScore: 4.6,
        topTopics: ['GCC Macro', 'Capital Flows', 'Institutional'],
        peakMinute: 19,
    },
    {
        name: 'Zhang Wei',
        avatar: '👨‍💼',
        company: 'Horizon Capital Partners',
        sessions: 1,
        avgEngagement: 73,
        totalReach: 234,
        feedbackScore: 4.4,
        topTopics: ['Asian Capital', 'SPV Structures', 'Currency Hedging'],
        peakMinute: 14,
    },
    {
        name: 'Dr. Ahmed Bin Khalifa',
        avatar: '👨‍🔬',
        company: 'Abu Dhabi Investment Authority',
        sessions: 1,
        avgEngagement: 71,
        totalReach: 246,
        feedbackScore: 4.3,
        topTopics: ['ESG', 'Net Zero', 'LEED Certification'],
        peakMinute: 27,
    },
];

// ── Networking clusters ───────────────────────────────────────────────────────

export const NETWORKING_CLUSTERS: NetworkingCluster[] = [
    { id: 'c1', label: 'Russian HNW Investors', size: 87, connections: 342, topPairs: ['Moscow × Dubai Buyer', 'Family Office × Developer'], color: 'bg-violet-500' },
    { id: 'c2', label: 'UAE Developer Network', size: 64, connections: 218, topPairs: ['Emaar × Agent', 'Aldar × Investor'], color: 'bg-emerald-500' },
    { id: 'c3', label: 'Asian Capital Group', size: 41, connections: 134, topPairs: ['Hong Kong × Fund', 'Shanghai × Family'], color: 'bg-sky-500' },
    { id: 'c4', label: 'GCC Institutional', size: 38, connections: 112, topPairs: ['ADIA × PE Fund', 'Mubadala × REIT'], color: 'bg-amber-500' },
    { id: 'c5', label: 'European Buyers', size: 29, connections: 87, topPairs: ['London × Villa', 'Paris × Apartment'], color: 'bg-pink-500' },
    { id: 'c6', label: 'UK/EU Agents', size: 22, connections: 64, topPairs: ['Agency × Referral', 'Broker × Developer'], color: 'bg-teal-500' },
];

// ── Activity timeline (15-min intervals, 8 AM–8 PM = 48 points) ──────────────

function mkPoint(m: number, a: number, n: number, c: number): ActivityPoint {
    const totalMin = 8 * 60 + m;
    const h = Math.floor(totalMin / 60);
    const min = totalMin % 60;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h > 12 ? h - 12 : h;
    return { minute: m, label: `${h12}:${String(min).padStart(2, '0')} ${ampm}`, attendance: a, networking: n, content: c };
}

export const ACTIVITY_TIMELINE: ActivityPoint[] = [
    mkPoint(0, 31, 12, 18), mkPoint(15, 48, 22, 34), mkPoint(30, 67, 38, 52), mkPoint(45, 78, 54, 71),
    mkPoint(60, 88, 87, 84), mkPoint(75, 94, 103, 91), mkPoint(90, 97, 121, 95), mkPoint(105, 93, 112, 89),
    mkPoint(120, 89, 98, 86), mkPoint(135, 84, 91, 82), mkPoint(150, 76, 84, 74), mkPoint(165, 68, 77, 67),
    mkPoint(180, 54, 178, 41), mkPoint(195, 51, 201, 38), mkPoint(210, 48, 212, 35), mkPoint(225, 52, 198, 39),
    mkPoint(240, 65, 134, 63), mkPoint(255, 72, 121, 71), mkPoint(270, 81, 108, 79), mkPoint(285, 87, 98, 84),
    mkPoint(300, 94, 91, 92), mkPoint(315, 97, 87, 95), mkPoint(330, 96, 93, 96), mkPoint(345, 92, 98, 91),
    mkPoint(360, 87, 112, 86), mkPoint(375, 82, 124, 81), mkPoint(390, 76, 142, 74), mkPoint(405, 69, 168, 67),
    mkPoint(420, 58, 198, 51), mkPoint(435, 52, 212, 44), mkPoint(450, 47, 187, 38), mkPoint(465, 43, 164, 34),
    mkPoint(480, 39, 134, 31), mkPoint(495, 34, 112, 28), mkPoint(510, 29, 91, 24), mkPoint(525, 23, 74, 19),
    mkPoint(540, 18, 58, 15), mkPoint(555, 14, 44, 12), mkPoint(570, 11, 34, 9), mkPoint(585, 8, 24, 6),
    mkPoint(600, 6, 18, 4), mkPoint(615, 4, 12, 3), mkPoint(630, 3, 8, 2), mkPoint(645, 2, 5, 1),
    mkPoint(660, 2, 4, 1), mkPoint(675, 1, 3, 1), mkPoint(690, 1, 2, 0), mkPoint(705, 0, 1, 0),
];

// ── AI Insights ───────────────────────────────────────────────────────────────

export const AI_INSIGHTS: AIInsight[] = [
    {
        id: 'i1',
        category: 'engagement',
        priority: 'critical',
        title: 'Peak engagement window identified: 3–4 PM',
        finding: 'Engagement reached 95% at 3–4 PM — 41% above the daily average. This 60-minute window had the highest co-occurrence of session attendance, poll participation, and booth traffic simultaneously.',
        recommendation: 'For the next event, schedule your highest-priority keynote or product launch within the 3–4 PM window. Pre-announce it 24 hours in advance with a dedicated push notification to maximize attendance.',
        metric: '+41%',
        metricLabel: 'above avg engagement',
        emoji: '🔥',
    },
    {
        id: 'i2',
        category: 'speaker',
        priority: 'critical',
        title: 'Natalia Sorokina generated the highest attendee retention',
        finding: '94% engagement sustained throughout her 52-minute CIS Buyer Behaviour session — the longest high-engagement run of the event. Attendees who attended her session were 3.2× more likely to book follow-up meetings.',
        recommendation: 'Expand her segment to a 75-minute format at the next event. Add a live Q&A segment at the 38-minute mark (identified as her engagement peak) to capitalize on the natural climax of audience attention.',
        metric: '4.9 / 5.0',
        metricLabel: 'audience feedback score',
        emoji: '⭐',
    },
    {
        id: 'i3',
        category: 'topic',
        priority: 'critical',
        title: 'Golden Visa Structuring is the #2 topic with accelerating demand',
        finding: 'Golden Visa content generated 712 organic mentions — a 34% increase over the previous roadshow. Attendees spent 2.4× longer interacting with Golden Visa booth materials than any other compliance topic.',
        recommendation: 'Dedicate a standalone Golden Visa Workshop session at the next event. Partner with a licensed UAE immigration attorney as co-host to add legal authority. This single addition is projected to increase VIP ticket conversions by 18–22%.',
        metric: '712',
        metricLabel: 'organic mentions (+34%)',
        emoji: '🛂',
    },
    {
        id: 'i4',
        category: 'networking',
        priority: 'high',
        title: 'Russian HNW cluster is under-connected to UAE developers',
        finding: 'The Russian HNW group (87 attendees, 342 internal connections) generated the most networking activity but had only 12 cross-cluster connections to UAE developers — a missed conversion opportunity.',
        recommendation: 'Implement a structured Meet-the-Developer speed-networking segment between 12–1 PM (existing low-content window). Pre-match Russian investors with developer representatives using investment size and property type compatibility.',
        metric: '12 of 342',
        metricLabel: 'cross-cluster connections',
        emoji: '🤝',
    },
    {
        id: 'i5',
        category: 'operational',
        priority: 'high',
        title: 'Grand Ballroom capacity reached 90% ceiling 3 times',
        finding: 'The Grand Ballroom hit 90%+ capacity during the Opening Keynote, Price Forecasting, and CIS sessions. Overflow signage activated late on each occasion, indicating response lag of 8–12 minutes.',
        recommendation: 'Pre-assign 15% of Keynote registrations to a simulcast overflow room with live streaming. Create an automated Slack alert when the room hits 75% (not 90%) to give ops team 20 minutes response time.',
        metric: '×3',
        metricLabel: 'capacity ceiling events',
        emoji: '📊',
    },
    {
        id: 'i6',
        category: 'engagement',
        priority: 'high',
        title: 'Lunch break (12–2 PM) has untapped networking potential',
        finding: 'The 12–2 PM window had the highest networking activity of the day (201–212 pings/hour) but the lowest content attendance (48–62%). Attendees are self-organizing during this window without structured programming.',
        recommendation: 'Introduce 2–3 themed lunch tables with assigned seating by investment tier. Add a facilitated 10-minute "table introduction" prompt at 12:15 PM to break the ice and increase cross-cluster connections by an estimated 40–60%.',
        metric: '212',
        metricLabel: 'peak networking pings/hour',
        emoji: '🍽',
    },
    {
        id: 'i7',
        category: 'topic',
        priority: 'medium',
        title: 'STR (Short-Term Rentals) shows fastest-growing interest trajectory',
        finding: 'Despite being the 9th-ranked topic overall, Short-Term Rentals had the steepest mention-velocity curve — growing from 14 mentions in the morning to 78 in the final session. It appears to be an emerging buyer concern.',
        recommendation: 'Add one dedicated STR Investment session at the next event. Target the 5–6 PM slot when content engagement is tapering — this topic will attract attendees who missed earlier sessions and extend their stay.',
        metric: '+457%',
        metricLabel: 'intra-day mention growth',
        emoji: '📈',
    },
    {
        id: 'i8',
        category: 'speaker',
        priority: 'medium',
        title: 'ESG session attendance fell below forecast by 28%',
        finding: 'Dr. Ahmed Bin Khalifa\'s ESG session drew 246 attendees vs a forecast of 342 — a 28% shortfall. Post-session surveys suggest the abstract was perceived as "too technical" by non-institutional buyers.',
        recommendation: 'Reframe future ESG content around practical ROI impact (e.g. "How ESG certification adds 8–12% to your resale value") rather than regulatory compliance. Blend with a developer case study to make it tangible for retail buyers.',
        metric: '-28%',
        metricLabel: 'vs attendance forecast',
        emoji: '🌿',
    },
];

// ── Summary stats ─────────────────────────────────────────────────────────────

export const EVENT_SUMMARY = {
    totalAttendees: 412,
    avgEngagement: 81,
    totalNetworkingConnections: 957,
    totalPollVotes: 549,
    totalBoothVisits: 1334,
    avgFeedbackScore: 4.6,
    peakHour: '3 PM',
    peakEngagement: 95,
    sessionsDelivered: 6,
    contentHubViews: 3370,
};
