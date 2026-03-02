/**
 * matchingEngine.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Pure scoring engine for the Smart Networking feature.
 * No React, no Firebase, no side-effects — fully testable in isolation.
 *
 * Scoring rubric (max 100 pts):
 *   Industry match              → 25 pts
 *   Investment interests shared → 25 pts  (5 pts / shared tag, max 5 tags)
 *   General interests shared    → 20 pts  (4 pts / shared tag, max 5 tags)
 *   Session attendance shared   → 15 pts  (5 pts / shared session, max 3)
 *   Company-type affinity       → 10 pts
 *   Job-level complementarity   →  5 pts
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type JobLevel = 'C-Suite' | 'Director' | 'Manager' | 'Associate' | 'Investor' | 'Developer';

export interface Attendee {
    id: string;
    name: string;
    avatar: string;            // initials or emoji fallback
    jobTitle: string;
    jobLevel: JobLevel;
    company: string;
    companyType: 'Developer' | 'Agency' | 'Investment Fund' | 'Family Office' | 'Bank' | 'Consultancy' | 'Other';
    industry: string;
    location: string;
    interests: string[];          // general tags
    investmentInterests: string[]; // real-estate-specific tags
    sessions: string[];           // session IDs / names attended
    bio: string;
    linkedIn?: string;
    isOnline: boolean;
    networkingEnabled: boolean;
}

export interface MatchResult {
    attendee: Attendee;
    score: number;               // 0–100
    breakdown: ScoreBreakdown;
    sharedInterests: string[];
    sharedSessions: string[];
    aiRationale?: string;        // filled by GenAI call (optional)
}

export interface ScoreBreakdown {
    industry: number;
    investmentInterests: number;
    interests: number;
    sessions: number;
    companyType: number;
    jobLevel: number;
}

export type RequestStatus = 'pending' | 'accepted' | 'declined' | 'withdrawn';

export interface NetworkingRequest {
    id: string;
    fromId: string;
    toId: string;
    fromName: string;
    toName: string;
    fromTitle: string;
    message: string;
    status: RequestStatus;
    sentAt: Date;
    respondedAt?: Date;
}

export interface MeetingSlot {
    id: string;
    requestId: string;
    attendeeAId: string;
    attendeeBId: string;
    attendeeAName: string;
    attendeeBName: string;
    startTime: Date;
    endTime: Date;
    location: string;   // e.g. "Booth 12", "Networking Lounge"
    notes: string;
    status: 'confirmed' | 'proposed' | 'cancelled';
}

// ── Scoring weights ───────────────────────────────────────────────────────────

const W = {
    industry: 25,
    investmentInterests: 25,   // up to 5 × 5
    interests: 20,              // up to 5 × 4
    sessions: 15,               // up to 3 × 5
    companyType: 10,
    jobLevel: 5,
} as const;

// Company-type affinity pairs that score full marks
const COMPANY_AFFINITY: Record<string, string[]> = {
    'Developer': ['Agency', 'Investment Fund', 'Family Office', 'Bank'],
    'Agency': ['Developer', 'Investment Fund', 'Bank'],
    'Investment Fund': ['Developer', 'Agency', 'Family Office'],
    'Family Office': ['Developer', 'Investment Fund'],
    'Bank': ['Developer', 'Agency', 'Investment Fund'],
    'Consultancy': ['Developer', 'Agency', 'Investment Fund', 'Family Office', 'Bank'],
};

// Job levels that are naturally complementary (transactional matches)
const LEVEL_AFFINITY: Record<JobLevel, JobLevel[]> = {
    'C-Suite': ['Investor', 'Developer', 'C-Suite'],
    'Director': ['Investor', 'Manager', 'Director', 'Developer'],
    'Manager': ['Director', 'Manager', 'Investor'],
    'Associate': ['Associate', 'Manager'],
    'Investor': ['Developer', 'C-Suite', 'Director', 'Manager'],
    'Developer': ['Investor', 'C-Suite', 'Director'],
};

// ── Core scoring function ─────────────────────────────────────────────────────

export function scoreMatch(me: Attendee, other: Attendee): MatchResult {
    const breakdown: ScoreBreakdown = {
        industry: 0,
        investmentInterests: 0,
        interests: 0,
        sessions: 0,
        companyType: 0,
        jobLevel: 0,
    };

    // 1. Industry match (exact string)
    if (me.industry.toLowerCase() === other.industry.toLowerCase()) {
        breakdown.industry = W.industry;
    } else if (
        me.industry.toLowerCase().includes(other.industry.toLowerCase()) ||
        other.industry.toLowerCase().includes(me.industry.toLowerCase())
    ) {
        breakdown.industry = Math.round(W.industry * 0.5);
    }

    // 2. Investment interests overlap
    const sharedInvestment = me.investmentInterests.filter(i =>
        other.investmentInterests.some(j => j.toLowerCase() === i.toLowerCase())
    );
    breakdown.investmentInterests = Math.min(sharedInvestment.length * 5, W.investmentInterests);

    // 3. General interests overlap
    const sharedInterests = me.interests.filter(i =>
        other.interests.some(j => j.toLowerCase() === i.toLowerCase())
    );
    breakdown.interests = Math.min(sharedInterests.length * 4, W.interests);

    // 4. Sessions attended overlap
    const sharedSessions = me.sessions.filter(s =>
        other.sessions.some(t => t.toLowerCase() === s.toLowerCase())
    );
    breakdown.sessions = Math.min(sharedSessions.length * 5, W.sessions);

    // 5. Company-type affinity
    const partners = COMPANY_AFFINITY[me.companyType] ?? [];
    if (partners.includes(other.companyType)) {
        breakdown.companyType = W.companyType;
    } else if (me.companyType !== other.companyType) {
        breakdown.companyType = Math.round(W.companyType * 0.3);
    }

    // 6. Job-level complementarity
    const complementLevels = LEVEL_AFFINITY[me.jobLevel] ?? [];
    if (complementLevels.includes(other.jobLevel)) {
        breakdown.jobLevel = W.jobLevel;
    }

    const score = Math.min(
        100,
        breakdown.industry +
        breakdown.investmentInterests +
        breakdown.interests +
        breakdown.sessions +
        breakdown.companyType +
        breakdown.jobLevel
    );

    return {
        attendee: other,
        score,
        breakdown,
        sharedInterests: [...sharedInvestment, ...sharedInterests],
        sharedSessions,
    };
}

/**
 * Rank all candidates against `me`, filter out very poor matches, and sort
 * descending by score.
 */
export function rankMatches(me: Attendee, candidates: Attendee[]): MatchResult[] {
    return candidates
        .filter(a => a.id !== me.id && a.networkingEnabled)
        .map(a => scoreMatch(me, a))
        .filter(r => r.score >= 20)         // floor — at least some overlap
        .sort((a, b) => b.score - a.score);
}

// ── Demo attendees dataset ────────────────────────────────────────────────────

export const DEMO_ATTENDEES: Attendee[] = [
    {
        id: 'atd_001',
        name: 'Khalid Al-Mansouri',
        avatar: 'KM',
        jobTitle: 'Head of International Sales',
        jobLevel: 'Director',
        company: 'Property Shop Investment',
        companyType: 'Agency',
        industry: 'Real Estate',
        location: 'Dubai, UAE',
        interests: ['Luxury Property', 'Off-Plan Investments', 'Roadshows'],
        investmentInterests: ['Emaar Projects', 'Saadiyat Island', 'Dubai Marina', 'Waterfront Living'],
        sessions: ['Opening Keynote', 'Luxury Trends 2026', 'Agent Commission Models'],
        bio: 'Leading international property sales with 10+ years across GCC markets.',
        isOnline: true,
        networkingEnabled: true,
    },
    {
        id: 'atd_002',
        name: 'Natalia Sorokina',
        avatar: 'NS',
        jobTitle: 'Managing Partner',
        jobLevel: 'C-Suite',
        company: 'Sorokina Capital Group',
        companyType: 'Family Office',
        industry: 'Real Estate Investment',
        location: 'Moscow, Russia',
        interests: ['Capital Preservation', 'Golden Visa', 'Luxury Apartments'],
        investmentInterests: ['Saadiyat Island', 'Downtown Dubai', 'Abu Dhabi Waterfront', 'Palm Jumeirah'],
        sessions: ['Golden Visa Schemes 2026', 'Luxury Trends 2026', 'Opening Keynote'],
        bio: 'Managing $400M+ family office portfolio with focus on international real estate.',
        isOnline: true,
        networkingEnabled: true,
    },
    {
        id: 'atd_003',
        name: 'Mohammed Al-Sayed',
        avatar: 'MS',
        jobTitle: 'CEO',
        jobLevel: 'C-Suite',
        company: 'Al-Sayed Real Estate Development',
        companyType: 'Developer',
        industry: 'Real Estate Development',
        location: 'Riyadh, KSA',
        interests: ['Mixed-Use Developments', 'Vision 2030 Projects', 'Smart Cities'],
        investmentInterests: ['NEOM', 'Diriyah', 'Riyadh Downtown', 'Red Sea Project'],
        sessions: ['GCC Real Estate Outlook', 'Smart City Development', 'Developer Showcase'],
        bio: 'Building flagship developments across the Kingdom under Vision 2030.',
        isOnline: false,
        networkingEnabled: true,
    },
    {
        id: 'atd_004',
        name: 'Sophie Laurent',
        avatar: 'SL',
        jobTitle: 'Portfolio Manager',
        jobLevel: 'Director',
        company: 'Banque Privée Européenne',
        companyType: 'Bank',
        industry: 'Private Banking',
        location: 'Monaco',
        interests: ['UHNW Clients', 'Asset Diversification', 'Mediterranean Properties'],
        investmentInterests: ['Palm Jumeirah', 'Emirates Hills', 'Downtown Dubai', 'Saadiyat Island'],
        sessions: ['UHNW Investment Strategies', 'Luxury Trends 2026', 'Opening Keynote'],
        bio: 'Managing a €1.2B portfolio for Europe\'s wealthiest families seeking global diversification.',
        isOnline: true,
        networkingEnabled: true,
    },
    {
        id: 'atd_005',
        name: 'Ahmed Bin Khalifa',
        avatar: 'AK',
        jobTitle: 'Chief Investment Officer',
        jobLevel: 'C-Suite',
        company: 'Gulf Sovereign Ventures',
        companyType: 'Investment Fund',
        industry: 'Alternative Investments',
        location: 'Abu Dhabi, UAE',
        interests: ['Sovereign Wealth', 'Alternative Assets', 'ESG Real Estate'],
        investmentInterests: ['Yas Island', 'Saadiyat Island', 'Masdar City', 'Abu Dhabi Waterfront'],
        sessions: ['ESG in Real Estate', 'Sovereign Fund Strategies', 'Opening Keynote'],
        bio: 'Deploying $2B+ annually into global alternative assets with a focus on sustainable real estate.',
        isOnline: true,
        networkingEnabled: true,
    },
    {
        id: 'atd_006',
        name: 'Zhang Wei',
        avatar: 'ZW',
        jobTitle: 'Real Estate Director',
        jobLevel: 'Director',
        company: 'Sino Capital Partners',
        companyType: 'Investment Fund',
        industry: 'Real Estate Investment',
        location: 'Hong Kong',
        interests: ['Golden Visa', 'Tech-Enabled Properties', 'Urban Regeneration'],
        investmentInterests: ['Dubai Marina', 'Downtown Dubai', 'Emaar Projects', 'Palm Jumeirah'],
        sessions: ['Asian Investor Briefing', 'Golden Visa Schemes 2026', 'Luxury Trends 2026'],
        bio: 'Directing cross-border real estate mandates for Chinese institutional investors across MENA and Europe.',
        isOnline: false,
        networkingEnabled: true,
    },
    {
        id: 'atd_007',
        name: 'Priya Nair',
        avatar: 'PN',
        jobTitle: 'Senior Investment Advisor',
        jobLevel: 'Manager',
        company: 'Emirates NBD Private Banking',
        companyType: 'Bank',
        industry: 'Wealth Management',
        location: 'Dubai, UAE',
        interests: ['HNW Clients', 'Mortgage Structuring', 'NRI Investments'],
        investmentInterests: ['Dubai Marina', 'JVC', 'Business Bay', 'Emaar Projects'],
        sessions: ['Mortgage & Finance Strategies', 'NRI Investment Clinic', 'Agent Commission Models'],
        bio: 'Advising high-net-worth individuals on optimizing real estate investments through structured financing.',
        isOnline: true,
        networkingEnabled: true,
    },
    {
        id: 'atd_008',
        name: 'Dmitri Volkov',
        avatar: 'DV',
        jobTitle: 'Founder & Chairman',
        jobLevel: 'Investor',
        company: 'Volkov Group International',
        companyType: 'Family Office',
        industry: 'Real Estate Investment',
        location: 'London, UK',
        interests: ['Capital Deployment', 'Beachfront Properties', 'Residency Programs'],
        investmentInterests: ['Palm Jumeirah', 'Saadiyat Island', 'Dubai Marina', 'Emirates Hills'],
        sessions: ['Luxury Trends 2026', 'UHNW Investment Strategies', 'Golden Visa Schemes 2026'],
        bio: 'Serial entrepreneur deploying private capital into trophy assets across Europe and UAE.',
        isOnline: true,
        networkingEnabled: true,
    },
    {
        id: 'atd_009',
        name: 'Layla Al-Rashid',
        avatar: 'LR',
        jobTitle: 'Head of Market Research',
        jobLevel: 'Manager',
        company: 'CBRE Gulf',
        companyType: 'Consultancy',
        industry: 'Real Estate Advisory',
        location: 'Dubai, UAE',
        interests: ['Market Analytics', 'Feasibility Studies', 'Data-Driven Investment'],
        investmentInterests: ['Dubai Marina', 'Business Bay', 'Emaar Projects', 'Waterfront Living'],
        sessions: ['Market Data & Analytics', 'GCC Real Estate Outlook', 'Agent Commission Models'],
        bio: 'Producing the GCC\'s most-cited real estate market reports with 8 years of data science expertise.',
        isOnline: true,
        networkingEnabled: true,
    },
    {
        id: 'atd_010',
        name: 'Tariq Hassan',
        avatar: 'TH',
        jobTitle: 'Senior Sales Director',
        jobLevel: 'Director',
        company: 'Aldar Properties',
        companyType: 'Developer',
        industry: 'Real Estate Development',
        location: 'Abu Dhabi, UAE',
        interests: ['Luxury Developments', 'International Agents', 'Abu Dhabi Growth Story'],
        investmentInterests: ['Saadiyat Island', 'Yas Island', 'Abu Dhabi Waterfront', 'Masdar City'],
        sessions: ['Developer Showcase', 'Abu Dhabi Investment Briefing', 'Opening Keynote'],
        bio: 'Driving international sales for Aldar\'s flagship portfolio across Saadiyat and Yas Island.',
        isOnline: false,
        networkingEnabled: true,
    },
    {
        id: 'atd_011',
        name: 'Isabella Ferreira',
        avatar: 'IF',
        jobTitle: 'Investment Director',
        jobLevel: 'Director',
        company: 'Lisbon Capital Partners',
        companyType: 'Investment Fund',
        industry: 'Real Estate Investment',
        location: 'Lisbon, Portugal',
        interests: ['Golden Visa', 'Residency Programs', 'Portfolio Diversification'],
        investmentInterests: ['Downtown Dubai', 'Dubai Marina', 'Emaar Projects', 'Palm Jumeirah'],
        sessions: ['Golden Visa Schemes 2026', 'UHNW Investment Strategies', 'Luxury Trends 2026'],
        bio: 'Helping European investors access UAE property markets through structured visa-linked investment vehicles.',
        isOnline: true,
        networkingEnabled: true,
    },
    {
        id: 'atd_012',
        name: 'Omar Yusuf',
        avatar: 'OY',
        jobTitle: 'Associate Director',
        jobLevel: 'Associate',
        company: 'JLL Middle East',
        companyType: 'Consultancy',
        industry: 'Real Estate Advisory',
        location: 'Dubai, UAE',
        interests: ['Transaction Advisory', 'Institutional Sales', 'Market Intelligence'],
        investmentInterests: ['Business Bay', 'DIFC', 'Dubai Marina', 'Downtown Dubai'],
        sessions: ['Market Data & Analytics', 'GCC Real Estate Outlook', 'Opening Keynote'],
        bio: 'Specializing in large-ticket institutional transactions across Dubai\'s primary markets.',
        isOnline: true,
        networkingEnabled: true,
    },
];

// ── Meeting slot helpers ──────────────────────────────────────────────────────

export const MEETING_LOCATIONS = [
    'Networking Lounge — Table A',
    'Networking Lounge — Table B',
    'Networking Lounge — Table C',
    'VIP Suite — Room 1',
    'VIP Suite — Room 2',
    'PSI Booth — Meeting Corner',
    'Coffee Bar — West Side',
    'Outdoor Terrace',
];

export const MEETING_TIME_SLOTS: { label: string; start: string; end: string }[] = [
    { label: '09:00 – 09:30', start: '09:00', end: '09:30' },
    { label: '09:30 – 10:00', start: '09:30', end: '10:00' },
    { label: '10:30 – 11:00', start: '10:30', end: '11:00' },
    { label: '11:00 – 11:30', start: '11:00', end: '11:30' },
    { label: '12:00 – 12:30', start: '12:00', end: '12:30' },
    { label: '14:00 – 14:30', start: '14:00', end: '14:30' },
    { label: '14:30 – 15:00', start: '14:30', end: '15:00' },
    { label: '15:30 – 16:00', start: '15:30', end: '16:00' },
    { label: '16:00 – 16:30', start: '16:00', end: '16:30' },
    { label: '17:00 – 17:30', start: '17:00', end: '17:30' },
];

/** Generate a concise, human-readable match rationale without API calls */
export function generateLocalRationale(result: MatchResult, myName: string): string {
    const { attendee, sharedInterests, sharedSessions, breakdown } = result;
    const parts: string[] = [];

    if (breakdown.industry >= 20) parts.push(`both active in ${attendee.industry}`);
    if (sharedInterests.length) parts.push(`mutual interest in ${sharedInterests.slice(0, 2).join(' & ')}`);
    if (sharedSessions.length) parts.push(`attended "${sharedSessions[0]}" together`);
    if (breakdown.companyType === 10) parts.push(`${attendee.companyType} firms are natural partners for Agencies`);
    if (breakdown.jobLevel === 5) parts.push(`complementary seniority levels`);

    if (!parts.length) return `${attendee.name} has a compatible profile for networking.`;
    return parts.map((p, i) => i === 0 ? p.charAt(0).toUpperCase() + p.slice(1) : p).join(', ') + '.';
}
