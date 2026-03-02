/**
 * contentHubData.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Seed data for the Post-Event Content Hub.
 * Production swap: replace arrays with Firestore `event_content` collection.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type ContentType = 'video' | 'slides' | 'document' | 'speaker';
export type SessionTrack = 'Keynote' | 'Investment' | 'ESG' | 'Technology' | 'Networking' | 'Workshop';

export interface Speaker {
    id: string;
    name: string;
    title: string;
    company: string;
    country: string;
    avatar: string;        // emoji fallback
    bio: string;
    topics: string[];
    linkedin?: string;
    sessions: string[];    // session IDs
}

export interface SessionDocument {
    id: string;
    name: string;
    type: 'Slides' | 'Report' | 'Factsheet' | 'Notes' | 'Summary';
    sizeLabel: string;
    emoji: string;
    downloads: number;
}

export interface HubSession {
    id: string;
    title: string;
    track: SessionTrack;
    speakerIds: string[];
    room: string;
    duration: string;        // e.g. "42 min"
    durationSec: number;     // for player simulation
    recordingAvailable: boolean;
    views: number;
    description: string;
    keyTakeaways: string[];
    documents: SessionDocument[];
    tags: string[];
    thumbnail: string;       // emoji for visual
    thumbnailColor: string;  // tailwind gradient
    publishedAt: string;     // ISO date
}

export interface HubEvent {
    id: string;
    name: string;
    location: string;
    date: string;
    status: 'Published' | 'Processing' | 'Upcoming';
    coverEmoji: string;
    coverColor: string;
    totalSessions: number;
    totalAttendees: number;
    description: string;
    sessions: HubSession[];
}

// ── Speakers ──────────────────────────────────────────────────────────────────

export const SPEAKERS: Speaker[] = [
    {
        id: 'sp1',
        name: 'H.E. Mohammed Al-Rashid',
        title: 'Chairman',
        company: 'Dubai Real Estate Authority',
        country: 'UAE',
        avatar: '👨‍⚖️',
        bio: 'His Excellency Mohammed Al-Rashid has served as Chairman of the Dubai Real Estate Authority for over a decade, shaping transformative policy that has made Dubai the world\'s most transactionally active luxury property market. A seasoned economist and legal scholar, he holds degrees from LSE and Harvard Kennedy School.',
        topics: ['Policy', 'Regulation', 'Market Vision', 'Luxury Trends'],
        sessions: ['s1'],
    },
    {
        id: 'sp2',
        name: 'Sophie Laurent',
        title: 'Global Head of Luxury Residential',
        company: 'Knight Frank',
        country: 'UK',
        avatar: '👩‍💼',
        bio: 'Sophie Laurent leads Knight Frank\'s luxury residential division across 60 countries. She is the author of the annual "Wealth Report" and has been featured in the FT, Bloomberg, and Forbes as one of the world\'s top 25 real estate influencers.',
        topics: ['Luxury Market', 'UHNW Buyers', 'Price Forecasting', 'Cross-Border Investment'],
        sessions: ['s1', 's2'],
    },
    {
        id: 'sp3',
        name: 'Layla Al-Rashid',
        title: 'Director of Research, GCC',
        company: 'JLL Middle East',
        country: 'UAE',
        avatar: '👩‍🔬',
        bio: 'Layla Al-Rashid heads JLL\'s Gulf research division, producing quarterly market intelligence reports consumed by sovereign wealth funds, family offices, and institutional investors across the GCC and Asia. MSc Real Estate Economics, LSE.',
        topics: ['GCC Markets', 'Transaction volumes', 'Capital Flows', 'Supply/Demand'],
        sessions: ['s3'],
    },
    {
        id: 'sp4',
        name: 'Dr. Ahmed Bin Khalifa',
        title: 'Head of Sustainable Finance',
        company: 'Abu Dhabi Investment Authority',
        country: 'UAE',
        avatar: '👨‍🔬',
        bio: 'Dr. Ahmed Bin Khalifa is a pioneer in ESG integration within GCC real estate. He chairs the UAE Sustainable Buildings Working Group and advises MIPIM on emerging market sustainability standards.',
        topics: ['ESG', 'Green Finance', 'Net Zero', 'LEED Certification'],
        sessions: ['s4'],
    },
    {
        id: 'sp5',
        name: 'Zhang Wei',
        title: 'Managing Partner',
        company: 'Horizon Capital Partners, Shanghai',
        country: 'China',
        avatar: '👨‍💼',
        bio: 'Zhang Wei manages a $2.1B real estate fund focused on outbound Chinese capital into Gulf, European and Southeast Asian markets. A former Goldman Sachs MD, he brings institutional discipline to Asian investor allocations into Dubai.',
        topics: ['Asian Capital', 'Outbound Investment', 'Fund Structures', 'Currency Hedging'],
        sessions: ['s5'],
    },
    {
        id: 'sp6',
        name: 'Natalia Sorokina',
        title: 'Head of Private Clients, Russia & CIS',
        company: 'PSI — Property Shop Investment',
        country: 'Russia',
        avatar: '👩‍💼',
        bio: 'Natalia Sorokina leads PSI\'s CIS private client division, managing relationships with over 400 high-net-worth families from Russia, Kazakhstan, and Ukraine. Fluent in five languages and a licensed UAE broker since 2016.',
        topics: ['Russian Market', 'CIS Buyers', 'NRI Structures', 'Family Office'],
        sessions: ['s6'],
    },
];

// ── Shared docs helper ────────────────────────────────────────────────────────

function doc(
    id: string, name: string,
    type: SessionDocument['type'],
    sizeLabel: string,
    emoji: string,
    downloads: number,
): SessionDocument {
    return { id, name, type, sizeLabel, emoji, downloads };
}

// ── Content Hub data ──────────────────────────────────────────────────────────

export const CONTENT_HUB: HubEvent[] = [
    // ── EVENT 1: Moscow Luxury Property Expo (concluded) ─────────────────────
    {
        id: 'ev1',
        name: 'Moscow Luxury Property Expo 2026',
        location: 'Moscow, Russia',
        date: '2026-03-15',
        status: 'Published',
        coverEmoji: '🏙',
        coverColor: 'from-violet-900 to-slate-900',
        totalSessions: 6,
        totalAttendees: 412,
        description: 'Six concentrated sessions of luxury UAE real estate insight for 412 pre-qualified Russian and CIS investors. Content recorded, processed, and published for on-demand replay.',
        sessions: [
            {
                id: 's1',
                title: 'Opening Keynote: Luxury Trends in UAE Real Estate 2026',
                track: 'Keynote',
                speakerIds: ['sp1', 'sp2'],
                room: 'Grand Ballroom',
                duration: '48 min',
                durationSec: 2880,
                recordingAvailable: true,
                views: 1241,
                description: 'A comprehensive overview of the forces shaping the UAE luxury residential market in 2026 — from supply pipeline constraints and DLD regulatory changes to the continued surge in Russian and European capital flows.',
                keyTakeaways: [
                    'Dubai luxury transactions up 34% YoY in Q1 2026',
                    'Off-plan now represents 68% of all sales by value',
                    'Russian buyer volumes increased 2.1× since 2024',
                    'New DLD regulations tighten foreign SPA requirements from Q3 2026',
                    'Sub-$3M segment shows highest YoY price appreciation at +22%',
                ],
                tags: ['Luxury', 'Market Outlook', 'DLD', 'Policy', 'Capital Flows'],
                documents: [
                    doc('d1', 'Opening Keynote Slides', 'Slides', '8.4 MB', '📊', 887),
                    doc('d2', 'Dubai Luxury Market Report Q1 2026', 'Report', '14.2 MB', '📈', 1103),
                    doc('d3', 'Executive Summary — Key Stats', 'Summary', '1.1 MB', '📄', 654),
                ],
                thumbnail: '🏙',
                thumbnailColor: 'from-violet-800 to-indigo-900',
                publishedAt: '2026-03-16',
            },
            {
                id: 's2',
                title: 'Deep Dive: Prime Residential Price Forecasting 2026–2030',
                track: 'Investment',
                speakerIds: ['sp2'],
                room: 'Grand Ballroom',
                duration: '41 min',
                durationSec: 2460,
                recordingAvailable: true,
                views: 876,
                description: 'A forensic, data-driven session using Knight Frank\'s proprietary Prime Property Index to model 5-year price appreciation scenarios across 12 Dubai micro-markets, with stress-tested bearish, base and bull cases.',
                keyTakeaways: [
                    'Bull case: +18% cumulative 2026–2030 in Palm Jumeirah, Downtown',
                    'Base case: +11% annual for Marina & JBR prime stock',
                    'Bearish scenario triggers: oil price collapse, GCC regional instability',
                    'Safe harbour picks: Emaar and Aldar off-plan with 24-month handover',
                    'Recommended entry window: Q2–Q3 2026 before post-summer seasonal premium',
                ],
                tags: ['Price Forecasting', 'Data Analysis', 'Palm Jumeirah', 'ROI'],
                documents: [
                    doc('d4', 'Price Forecast Model 2026–2030 (Excel)', 'Factsheet', '3.1 MB', '📊', 734),
                    doc('d5', 'Prime Residential Index Slides', 'Slides', '6.8 MB', '📋', 612),
                ],
                thumbnail: '📈',
                thumbnailColor: 'from-emerald-900 to-slate-900',
                publishedAt: '2026-03-16',
            },
            {
                id: 's3',
                title: 'GCC Real Estate: Macro Flows and Institutional Capital',
                track: 'Investment',
                speakerIds: ['sp3'],
                room: 'Amber Hall',
                duration: '38 min',
                durationSec: 2280,
                recordingAvailable: true,
                views: 619,
                description: 'JLL\'s Gulf Research Director presents the quarterly GCC market pulse — analysing cross-border capital flows, sovereign wealth fund activity, and the impact of Vision 2030 on the UAE competitive position.',
                keyTakeaways: [
                    '$8.4B of institutional foreign capital entered UAE RE in Q1 2026',
                    'Saudi Vision 2030 accelerating Riyadh residential demand at 28% YoY',
                    'Bahrain emerging as value alternative for GCC residential yield play',
                    'Office-to-residential conversion pipeline in DIFC signals supply normalisation',
                    'Net-zero targets require 40% of Dubai stock to be retrofitted by 2035',
                ],
                tags: ['GCC', 'Macro', 'Institutional', 'Capital Flows', 'JLL'],
                documents: [
                    doc('d6', 'GCC Macro Capital Flow Deck', 'Slides', '11.2 MB', '🌐', 488),
                    doc('d7', 'JLL GCC Market Snapshot Mar 2026', 'Report', '5.6 MB', '📑', 417),
                ],
                thumbnail: '🌍',
                thumbnailColor: 'from-sky-900 to-slate-900',
                publishedAt: '2026-03-17',
            },
            {
                id: 's4',
                title: 'ESG and Net Zero: The Premium or the Price of Entry?',
                track: 'ESG',
                speakerIds: ['sp4'],
                room: 'Amber Hall',
                duration: '35 min',
                durationSec: 2100,
                recordingAvailable: true,
                views: 502,
                description: 'ADIA\'s sustainability lead challenges the room on whether ESG credentials now command a true price premium in UAE real estate, or whether they are becoming the baseline expectation for institutional-grade stock.',
                keyTakeaways: [
                    'LEED Platinum UAE buildings trade at 8–12% premium over equivalents',
                    'ESG non-compliance creating 15–20% discount risk by 2028 under new codes',
                    'Scope 3 emissions reporting now mandatory for Abu Dhabi developments > AED 100M',
                    'Solar and greywater integration raises build cost 4% but boosts service charge income',
                    'Sovereign wealth funds now exclude non-ESG compliant RE from mandates',
                ],
                tags: ['ESG', 'Sustainability', 'LEED', 'Net Zero', 'Abu Dhabi'],
                documents: [
                    doc('d8', 'ESG Premium Research Paper', 'Report', '9.4 MB', '♻️', 361),
                    doc('d9', 'Net Zero Roadmap for Developers', 'Factsheet', '2.3 MB', '🌱', 298),
                ],
                thumbnail: '🌿',
                thumbnailColor: 'from-teal-900 to-slate-900',
                publishedAt: '2026-03-17',
            },
            {
                id: 's5',
                title: 'Briefing: Asian Capital & the Gulf Real Estate Opportunity',
                track: 'Investment',
                speakerIds: ['sp5'],
                room: 'Boardroom Suite',
                duration: '29 min',
                durationSec: 1740,
                recordingAvailable: true,
                views: 388,
                description: 'A candid investor briefing from Horizon Capital\'s Managing Partner on how Chinese family offices and institutional funds are structuring GCC real estate allocations, navigating SAFE bureau restrictions, and selecting preferred developer partners.',
                keyTakeaways: [
                    'Chinese outbound RE hit $18B globally in 2025; GCC captured 11%',
                    'SAFE bureau restriction workaround via Hong Kong SPV structures',
                    'Emaar and Aldar preferred by Chinese institutions for ESG ratings',
                    'USD-denominated assets provide natural hedge against CNY volatility',
                    'Education facilities proximity is the top filter for Chinese family office buyers',
                ],
                tags: ['China', 'Asian Capital', 'Family Office', 'SPV', 'Currency'],
                documents: [
                    doc('d10', 'Asian Capital GCC Allocation Deck', 'Slides', '7.1 MB', '🇨🇳', 267),
                ],
                thumbnail: '🏮',
                thumbnailColor: 'from-red-900 to-slate-900',
                publishedAt: '2026-03-18',
            },
            {
                id: 's6',
                title: 'CIS Buyer Behaviour: Motivations, Structures & Deal Patterns',
                track: 'Workshop',
                speakerIds: ['sp6'],
                room: 'Workshop Room',
                duration: '52 min',
                durationSec: 3120,
                recordingAvailable: true,
                views: 744,
                description: 'PSI\'s CIS private client lead delivers an unfiltered walkthrough of the psychology, legal structures, and deal patterns of Russian, Kazakh, and Ukrainian high-net-worth buyers in the UAE market — including how to handle golden visa planning, currency structuring, and family-level multi-property portfolios.',
                keyTakeaways: [
                    'Avg CIS ticket size increased to AED 4.2M in 2025 from AED 2.8M in 2023',
                    'Golden Visa qualifying at AED 2M threshold drives 61% of CIS deals',
                    'Cash or crypto-to-fiat buyers account for 78% of Russian purchases',
                    'Multi-unit family portfolio buys (parents + children) now 34% of CIS volume',
                    'Preferred locations: Palm Jumeirah (36%), Downtown (28%), Dubai Hills (18%)',
                ],
                tags: ['Russia', 'CIS', 'Golden Visa', 'Buyer Psychology', 'Portfolio'],
                documents: [
                    doc('d11', 'CIS Buyer Profile 2026 Report', 'Report', '6.7 MB', '🧑‍🤝‍🧑', 581),
                    doc('d12', 'Golden Visa Structuring Guide', 'Factsheet', '1.8 MB', '🛂', 834),
                    doc('d13', 'PSI CIS Sales Playbook', 'Notes', '3.2 MB', '📒', 442),
                ],
                thumbnail: '🏔',
                thumbnailColor: 'from-blue-900 to-slate-900',
                publishedAt: '2026-03-18',
            },
        ],
    },
    // ── EVENT 2: London VIP Roadshow (content in processing) ─────────────────
    {
        id: 'ev2',
        name: 'London VIP Roadshow 2026',
        location: 'London, UK',
        date: '2026-04-10',
        status: 'Processing',
        coverEmoji: '🎡',
        coverColor: 'from-sky-900 to-slate-900',
        totalSessions: 5,
        totalAttendees: 0,
        description: 'Content from the London VIP Roadshow is currently being processed and will be published within 48 hours of the event conclusion.',
        sessions: [],
    },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getAllSessions(): HubSession[] {
    return CONTENT_HUB.flatMap(e => e.sessions);
}

export function getAllDocuments(): SessionDocument[] {
    return getAllSessions().flatMap(s => s.documents);
}

export function getSpeakerById(id: string): Speaker | undefined {
    return SPEAKERS.find(s => s.id === id);
}

export function getSessionsForSpeaker(speakerId: string): HubSession[] {
    return getAllSessions().filter(s => s.speakerIds.includes(speakerId));
}

export const TRACK_COLORS: Record<SessionTrack, string> = {
    Keynote: 'bg-violet-500/15 text-violet-300 border-violet-500/20',
    Investment: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
    ESG: 'bg-teal-500/15 text-teal-300 border-teal-500/20',
    Technology: 'bg-sky-500/15 text-sky-300 border-sky-500/20',
    Networking: 'bg-pink-500/15 text-pink-300 border-pink-500/20',
    Workshop: 'bg-amber-500/15 text-amber-300 border-amber-500/20',
};
