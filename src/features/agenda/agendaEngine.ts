/**
 * agendaEngine.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Data definitions, scoring algorithm, and conflict detection for the
 * Smart Agenda Builder feature.
 *
 * Algorithm (greedy interest-match scheduler):
 *  1. Score every session against the attendee's selected interest tags
 *  2. Sort by score (desc), then by capacity fill (prefer less-full rooms)
 *  3. Build a suggested agenda by greedily picking the highest-score
 *     non-conflicting session for each time slot
 *  4. Conflict detection: two sessions conflict when their time windows overlap
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type SessionType = 'Keynote' | 'Workshop' | 'Panel' | 'Networking' | 'Showcase' | 'Briefing' | 'Clinic';
export type SessionLevel = 'All' | 'Intermediate' | 'Expert';

export interface AgendaSession {
    id: string;
    name: string;
    speaker: string;
    organization: string;
    room: string;
    startTime: string;   // "HH:MM"
    endTime: string;     // "HH:MM"
    capacity: number;
    registered: number;
    topics: string[];    // matching tags
    type: SessionType;
    level: SessionLevel;
    description: string;
    color: string;       // Tailwind bg class for timeline display
}

export interface ScoredSession extends AgendaSession {
    relevanceScore: number;   // 0–100
    matchedTopics: string[];
}

// ── Interest topics (displayed as tag pills in UI) ────────────────────────────

export const ALL_TOPICS: { id: string; label: string; emoji: string }[] = [
    { id: 'luxury', label: 'Luxury Real Estate', emoji: '💎' },
    { id: 'investment', label: 'Property Investment', emoji: '📈' },
    { id: 'visa', label: 'Golden Visa', emoji: '🛂' },
    { id: 'offplan', label: 'Off-Plan Projects', emoji: '🏗' },
    { id: 'uhnw', label: 'UHNW Clients', emoji: '👑' },
    { id: 'market', label: 'Market Analytics', emoji: '📊' },
    { id: 'finance', label: 'Finance & Mortgages', emoji: '🏦' },
    { id: 'developer', label: 'Developer Projects', emoji: '🏢' },
    { id: 'agent', label: 'Agent Skills', emoji: '🤝' },
    { id: 'esg', label: 'ESG & Sustainability', emoji: '🌿' },
    { id: 'smart', label: 'Smart Cities', emoji: '🏙' },
    { id: 'asia', label: 'Asian Markets', emoji: '🌏' },
    { id: 'nri', label: 'NRI Investment', emoji: '🇮🇳' },
    { id: 'wealth', label: 'Wealth Management', emoji: '💼' },
    { id: 'proptech', label: 'PropTech', emoji: '🔬' },
    { id: 'gcc', label: 'GCC Markets', emoji: '🕌' },
];

// ── Full session catalogue (20 sessions across one event day) ─────────────────

export const ALL_SESSIONS: AgendaSession[] = [
    {
        id: 'ses_k1',
        name: 'Opening Keynote: UAE Real Estate 2026',
        speaker: 'H.E. Mohammed Al-Rashid',
        organization: 'UAE Ministry of Economy',
        room: 'Main Hall',
        startTime: '09:00', endTime: '09:45',
        capacity: 500, registered: 462,
        topics: ['investment', 'market', 'gcc', 'developer'],
        type: 'Keynote', level: 'All',
        description: 'Setting the stage: macro trends, policy changes, and the investment thesis for UAE property in 2026.',
        color: 'bg-emerald-600',
    },
    {
        id: 'ses_n1',
        name: 'Pre-Event Networking Breakfast',
        speaker: 'PSI Events Team',
        organization: 'Property Shop Investment',
        room: 'Sky Lounge',
        startTime: '08:00', endTime: '09:00',
        capacity: 200, registered: 148,
        topics: ['agent', 'uhnw', 'luxury'],
        type: 'Networking', level: 'All',
        description: 'Informal networking with fellow delegates over breakfast before the main programme begins.',
        color: 'bg-slate-600',
    },
    {
        id: 'ses_l1',
        name: 'Luxury Trends 2026: The New Buyer Profile',
        speaker: 'Sophie Laurent',
        organization: 'Banque Privée Européenne',
        room: 'Ballroom A',
        startTime: '10:00', endTime: '10:45',
        capacity: 250, registered: 247,
        topics: ['luxury', 'uhnw', 'investment', 'wealth'],
        type: 'Panel', level: 'Intermediate',
        description: 'How ultra-high-net-worth buyers have shifted their criteria — from location to lifestyle to legacy.',
        color: 'bg-violet-600',
    },
    {
        id: 'ses_g1',
        name: 'GCC Real Estate Outlook',
        speaker: 'Layla Al-Rashid',
        organization: 'CBRE Gulf',
        room: 'Ballroom B',
        startTime: '10:00', endTime: '10:45',
        capacity: 200, registered: 143,
        topics: ['gcc', 'market', 'investment', 'developer'],
        type: 'Briefing', level: 'Intermediate',
        description: 'Data-driven analysis of transaction volumes, price movements, and yield compression across GCC cities.',
        color: 'bg-cyan-600',
    },
    {
        id: 'ses_a1',
        name: 'Agent Commission Models Workshop',
        speaker: 'Priya Nair',
        organization: 'Emirates NBD Private Banking',
        room: 'Workshop Room',
        startTime: '10:00', endTime: '10:45',
        capacity: 100, registered: 98,
        topics: ['agent', 'finance', 'investment'],
        type: 'Workshop', level: 'Intermediate',
        description: 'Deep-dive into Gold/Silver/Bronze commission structures, advance mechanisms, and income optimisation.',
        color: 'bg-amber-600',
    },
    {
        id: 'ses_v1',
        name: 'Golden Visa Schemes 2026',
        speaker: 'Isabella Ferreira',
        organization: 'Lisbon Capital Partners',
        room: 'Ballroom A',
        startTime: '11:00', endTime: '11:45',
        capacity: 200, registered: 189,
        topics: ['visa', 'investment', 'luxury', 'wealth'],
        type: 'Briefing', level: 'All',
        description: 'Comprehensive update on UAE, Portugal, and Greece golden visa thresholds and real estate qualifying assets.',
        color: 'bg-blue-600',
    },
    {
        id: 'ses_as1',
        name: 'Asian Investor Briefing',
        speaker: 'Zhang Wei',
        organization: 'Sino Capital Partners',
        room: 'Boardroom',
        startTime: '11:00', endTime: '11:45',
        capacity: 60, registered: 55,
        topics: ['asia', 'investment', 'wealth', 'offplan'],
        type: 'Briefing', level: 'Expert',
        description: 'Understanding Chinese institutional and family office mandates — preferred structures, due diligence, and KPIs.',
        color: 'bg-rose-600',
    },
    {
        id: 'ses_e1',
        name: 'ESG in Real Estate: Sustainable Returns',
        speaker: 'Ahmed Bin Khalifa',
        organization: 'Gulf Sovereign Ventures',
        room: 'Conference Room 1',
        startTime: '11:00', endTime: '11:45',
        capacity: 150, registered: 112,
        topics: ['esg', 'investment', 'smart', 'developer'],
        type: 'Panel', level: 'Intermediate',
        description: 'Can ESG-aligned real estate deliver superior risk-adjusted returns? A sovereign wealth perspective.',
        color: 'bg-green-600',
    },
    {
        id: 'ses_nl',
        name: 'Networking Lunch',
        speaker: 'Open Format',
        organization: 'PSI Events Team',
        room: 'Restaurant Floor',
        startTime: '12:00', endTime: '13:00',
        capacity: 400, registered: 350,
        topics: ['agent', 'uhnw', 'gcc', 'investment'],
        type: 'Networking', level: 'All',
        description: 'Structured lunch networking with curated table assignments based on your interest profile.',
        color: 'bg-teal-600',
    },
    {
        id: 'ses_u1',
        name: 'UHNW Investment Strategies',
        speaker: 'Ahmed Bin Khalifa',
        organization: 'Gulf Sovereign Ventures',
        room: 'VIP Suite',
        startTime: '13:00', endTime: '13:45',
        capacity: 80, registered: 78,
        topics: ['uhnw', 'wealth', 'investment', 'luxury'],
        type: 'Briefing', level: 'Expert',
        description: 'Private session: portfolio construction for families with >$50M liquid assets seeking real estate exposure.',
        color: 'bg-violet-600',
    },
    {
        id: 'ses_d1',
        name: 'Developer Showcase: Saadiyat & Yas Island',
        speaker: 'Tariq Hassan',
        organization: 'Aldar Properties',
        room: 'Exhibition Hall',
        startTime: '13:00', endTime: '13:45',
        capacity: 300, registered: 264,
        topics: ['developer', 'offplan', 'investment', 'gcc'],
        type: 'Showcase', level: 'All',
        description: "Live showcase of Aldar's flagship 2026 pipeline with exclusive launch pricing for attendees.",
        color: 'bg-amber-600',
    },
    {
        id: 'ses_sc1',
        name: 'Smart City Development: NEOM & Beyond',
        speaker: 'Mohammed Al-Sayed',
        organization: 'Al-Sayed Real Estate Development',
        room: 'Conference Room 1',
        startTime: '13:00', endTime: '13:45',
        capacity: 150, registered: 118,
        topics: ['smart', 'developer', 'investment', 'gcc'],
        type: 'Panel', level: 'Intermediate',
        description: "Vision 2030 in practice: how mega-projects are reshaping land values and agent opportunity in the Kingdom.",
        color: 'bg-emerald-600',
    },
    {
        id: 'ses_f1',
        name: 'Mortgage & Finance Strategies',
        speaker: 'Priya Nair',
        organization: 'Emirates NBD Private Banking',
        room: 'Workshop Room',
        startTime: '14:00', endTime: '14:45',
        capacity: 100, registered: 89,
        topics: ['finance', 'investment', 'agent', 'nri'],
        type: 'Workshop', level: 'Intermediate',
        description: 'Structuring deals for international buyers: LTV ratios, pre-approval workflows, and cross-border currency management.',
        color: 'bg-cyan-600',
    },
    {
        id: 'ses_ab1',
        name: 'Abu Dhabi Investment Briefing',
        speaker: 'Tariq Hassan',
        organization: 'Aldar Properties',
        room: 'Ballroom A',
        startTime: '14:00', endTime: '14:45',
        capacity: 250, registered: 198,
        topics: ['gcc', 'developer', 'investment', 'offplan'],
        type: 'Briefing', level: 'All',
        description: 'Why Abu Dhabi is the undervalued opportunity of 2026: supply pipeline, rental yields, and capital appreciation data.',
        color: 'bg-blue-600',
    },
    {
        id: 'ses_md1',
        name: 'Market Data & Analytics Deep-Dive',
        speaker: 'Layla Al-Rashid',
        organization: 'CBRE Gulf',
        room: 'Ballroom B',
        startTime: '14:00', endTime: '14:45',
        capacity: 200, registered: 156,
        topics: ['market', 'investment', 'gcc', 'proptech'],
        type: 'Workshop', level: 'Expert',
        description: 'Live data modelling: building an underwriting model for Dubai residential using DLD transaction data and AI.',
        color: 'bg-rose-600',
    },
    {
        id: 'ses_nr1',
        name: 'NRI Investment Clinic',
        speaker: 'Priya Nair',
        organization: 'Emirates NBD Private Banking',
        room: 'Boardroom',
        startTime: '15:00', endTime: '15:45',
        capacity: 60, registered: 52,
        topics: ['nri', 'finance', 'investment', 'visa'],
        type: 'Clinic', level: 'All',
        description: 'Q&A clinic for Indian, Pakistani and Sri Lankan buyers: FEMA rules, repatriation, and UAE property structures.',
        color: 'bg-amber-600',
    },
    {
        id: 'ses_p1',
        name: 'Panel: Future of UAE Real Estate',
        speaker: 'All Speakers',
        organization: 'Moderated by CBRE',
        room: 'Main Hall',
        startTime: '15:00', endTime: '15:45',
        capacity: 500, registered: 420,
        topics: ['investment', 'gcc', 'luxury', 'developer', 'market'],
        type: 'Panel', level: 'All',
        description: 'Flagship panel debate — all keynote speakers answer audience questions on the 5-year outlook.',
        color: 'bg-violet-600',
    },
    {
        id: 'ses_sf1',
        name: 'Sovereign Fund Strategies',
        speaker: 'Ahmed Bin Khalifa',
        organization: 'Gulf Sovereign Ventures',
        room: 'VIP Suite',
        startTime: '16:00', endTime: '16:45',
        capacity: 50, registered: 48,
        topics: ['wealth', 'uhnw', 'esg', 'investment'],
        type: 'Briefing', level: 'Expert',
        description: 'Invitation-only: how $2B+ sovereign mandates are allocated to real assets in a VUCA macro environment.',
        color: 'bg-green-600',
    },
    {
        id: 'ses_pt1',
        name: 'PropTech Startup Showcase',
        speaker: 'Multiple Founders',
        organization: 'PSI Ventures',
        room: 'Exhibition Hall',
        startTime: '16:00', endTime: '16:45',
        capacity: 200, registered: 134,
        topics: ['proptech', 'smart', 'investment', 'market'],
        type: 'Showcase', level: 'All',
        description: 'Six UAE-based proptech startups present live demos: AI valuation, virtual tours, tokenisation, and CRM tools.',
        color: 'bg-slate-600',
    },
    {
        id: 'ses_cl',
        name: 'Closing Drinks & Free Networking',
        speaker: 'Open',
        organization: 'PSI Events Team',
        room: 'Sky Lounge',
        startTime: '17:00', endTime: '18:30',
        capacity: 300, registered: 210,
        topics: ['agent', 'uhnw', 'luxury', 'investment'],
        type: 'Networking', level: 'All',
        description: 'Informal closing reception on the rooftop terrace. Open bar, live entertainment, and structured speed-networking.',
        color: 'bg-teal-600',
    },
];

// ── Time utilities ────────────────────────────────────────────────────────────

function toMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
}

/** Returns true if two sessions have an overlapping time window */
export function hasConflict(a: AgendaSession, b: AgendaSession): boolean {
    const aStart = toMinutes(a.startTime);
    const aEnd = toMinutes(a.endTime);
    const bStart = toMinutes(b.startTime);
    const bEnd = toMinutes(b.endTime);
    return aStart < bEnd && bStart < aEnd;
}

/** Returns true if `session` conflicts with any session already in `agenda` */
export function conflictsWithAgenda(session: AgendaSession, agenda: AgendaSession[]): boolean {
    return agenda.some(s => s.id !== session.id && hasConflict(s, session));
}

// ── Scoring algorithm ─────────────────────────────────────────────────────────

/**
 * Score a session against a set of selected interest IDs.
 * Score = (matching tags / session.topics.length) × 100
 * Tie-break bonus: prefer sessions with available capacity (< 90% full)
 */
export function scoreSession(session: AgendaSession, selectedInterests: string[]): ScoredSession {
    if (selectedInterests.length === 0) {
        return { ...session, relevanceScore: 50, matchedTopics: [] };
    }
    const matched = session.topics.filter(t => selectedInterests.includes(t));
    const raw = (matched.length / Math.max(session.topics.length, 1)) * 100;
    // Capacity bonus: up to 5 extra points for rooms not nearly full
    const fillRatio = session.registered / session.capacity;
    const capacityBonus = fillRatio < 0.9 ? 5 : 0;
    const score = Math.round(Math.min(100, raw + capacityBonus));
    return { ...session, relevanceScore: score, matchedTopics: matched };
}

/** Score every session and return sorted descending */
export function scoreAllSessions(interests: string[]): ScoredSession[] {
    return ALL_SESSIONS
        .map(s => scoreSession(s, interests))
        .sort((a, b) => b.relevanceScore - a.relevanceScore || a.startTime.localeCompare(b.startTime));
}

// ── Greedy agenda builder ─────────────────────────────────────────────────────

/**
 * Build a suggested agenda by greedily picking the highest-relevance
 * non-conflicting session for each available time slot.
 *
 * Strategy:
 *  1. Sort scored sessions desc by relevanceScore
 *  2. Iterate and greedily add if no conflict with already-added sessions
 *  3. Stop when no more non-conflicting sessions are available
 */
export function buildSuggestedAgenda(interests: string[]): {
    agenda: AgendaSession[];
    scored: ScoredSession[];
} {
    const scored = scoreAllSessions(interests);
    const agenda: AgendaSession[] = [];

    for (const session of scored) {
        if (!conflictsWithAgenda(session, agenda)) {
            agenda.push(session);
        }
    }

    // Sort agenda chronologically for display
    agenda.sort((a, b) => a.startTime.localeCompare(b.startTime));
    return { agenda, scored };
}

// ── Time slot grouping (for timeline view) ────────────────────────────────────

export interface TimeSlotGroup {
    slotKey: string;     // "09:00"
    sessions: AgendaSession[];
}

/** Group agenda sessions by their start time */
export function groupByTimeSlot(sessions: AgendaSession[]): TimeSlotGroup[] {
    const map = new Map<string, AgendaSession[]>();
    for (const s of sessions) {
        const existing = map.get(s.startTime) ?? [];
        map.set(s.startTime, [...existing, s]);
    }
    return Array.from(map.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([slotKey, sessions]) => ({ slotKey, sessions }));
}

// ── Conflict helpers for UI ───────────────────────────────────────────────────

/** Given a session, return any other sessions in `agenda` it conflicts with */
export function getConflicts(session: AgendaSession, agenda: AgendaSession[]): AgendaSession[] {
    return agenda.filter(s => s.id !== session.id && hasConflict(s, session));
}

// ── Session type colours ──────────────────────────────────────────────────────

export const TYPE_COLORS: Record<SessionType, { bg: string; text: string; border: string }> = {
    Keynote: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/40' },
    Workshop: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/40' },
    Panel: { bg: 'bg-violet-500/20', text: 'text-violet-400', border: 'border-violet-500/40' },
    Networking: { bg: 'bg-teal-500/20', text: 'text-teal-400', border: 'border-teal-500/40' },
    Showcase: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/40' },
    Briefing: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/40' },
    Clinic: { bg: 'bg-rose-500/20', text: 'text-rose-400', border: 'border-rose-500/40' },
};
