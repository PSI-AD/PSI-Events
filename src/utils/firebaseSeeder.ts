/**
 * firebaseSeeder.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Database Seed Utility for the PSI Event Portal.
 *
 * Populates Firestore with rich, realistic UAE real estate roadshow data
 * suitable for executive presentations and live demos.
 *
 * Collections written:
 *   • crm_events            — 2 roadshow events (Moscow & London)
 *   • crm_events/{id}/approvedAgents  — sub-collection for check-in module
 *   • crm_projects          — 4 premium UAE/Abu Dhabi developments
 *   • users                 — 5 agents + 1 branch manager
 *   • crm_leads             — 18 leads tied to the Moscow event + 1 demo lead
 *   • event_rosters         — agent-event assignments with tier & financials
 *   • expenses              — 6 itemised expenses (London) + 2 Moscow preview docs
 *   • agent_debts           — 2 outstanding clawback debts (for demo settlement)
 *   • checklists            — pre-event task templates
 *   • bounties              — active agent incentive challenges
 *
 * WARNING:
 *   This function writes REAL data to your Firestore instance.
 *   It uses a writeBatch for atomicity where Firestore rules allow,
 *   but because sub-collections (approvedAgents) cannot be written
 *   in the same batch as their parent, those are written sequentially
 *   after the main batch commits.
 *
 *   Run this ONLY ONCE against a fresh database.  Running it twice
 *   will produce duplicate documents (new auto-IDs are generated each time).
 *   To clean up, delete the seeded collections from the Firebase Console.
 *
 * Usage:
 *   import { injectSeedData } from '../utils/firebaseSeeder';
 *   await injectSeedData();
 */

import {
    collection,
    doc,
    writeBatch,
    setDoc,
    Timestamp,
    serverTimestamp,
} from 'firebase/firestore';
import { db } from '../services/firebase/firebaseConfig';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Convert a JS Date (or ISO string) to a Firestore Timestamp */
function ts(isoOrDate: string | Date): Timestamp {
    const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
    return Timestamp.fromDate(d);
}

/** Generate a deterministic document ID */
function id(prefix: string, suffix: string): string {
    return `${prefix}_${suffix}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// SEED DATA DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────

// ── IDs (stable — used across collections for cross-referencing) ──────────────

const EVENT_MOSCOW_ID = 'psi_evt_moscow_2026';
const EVENT_LONDON_ID = 'psi_evt_london_2025';

const AGENT_IDS = {
    khalid: 'usr_khalid_almansouri',
    sara: 'usr_sara_almarzouqi',
    omar: 'usr_omar_binrashid',
    nour: 'usr_nour_alhamdan',
    fatima: 'usr_fatima_alzaabi',
    elena: 'usr_elena_rostova',
};

const MANAGER_ID = 'usr_ahmed_alfalasi_mgr';

const PROJECT_IDS = {
    vida: 'proj_vida_residence',
    mamsha: 'proj_mamsha_gardens',
    louvre: 'proj_louvre_abudhabi',
    marina: 'proj_marina_blue',
};

// ── 1. Events ─────────────────────────────────────────────────────────────────

const EVENTS = [
    {
        id: EVENT_MOSCOW_ID,
        data: {
            eventName: 'Moscow Luxury Property Expo 2026',
            city: 'Moscow',
            country: 'Russia',
            venue: 'Crocus Expo International Exhibition Centre',
            eventDate: '2026-03-15',
            endDate: '2026-03-17',
            status: 'active',
            budgetType: 'developer_sponsored',
            sponsorDeveloper: 'Aldar Properties',
            targetHeadcount: 250,
            targetRevenue: 28_000_000,
            totalBudgetAed: 185_000,
            sponsorshipAed: 200_000,
            localCurrency: 'USD',
            fxRateToAed: 3.6725,
            branchManager: 'Ahmed Al-Falasi',
            branchManagerId: MANAGER_ID,
            documentDeadline: '2026-03-08',
            roundRobinIndex: 3,
            agentCount: 5,
            createdAt: ts('2026-01-10T09:00:00Z'),
            updatedAt: ts('2026-03-01T08:00:00Z'),
            notes: 'Flagship Moscow roadshow. All four Aldar development projects on showcase. VIP dinner at Ritz-Carlton on Day 2.',
        },
    },
    {
        id: EVENT_LONDON_ID,
        data: {
            eventName: 'London VIP Roadshow — Autumn 2025',
            city: 'London',
            country: 'United Kingdom',
            venue: 'The Langham Hotel, Portland Place',
            eventDate: '2025-10-20',
            endDate: '2025-10-21',
            status: 'completed',
            budgetType: 'branch_funded',
            sponsorDeveloper: null,
            targetHeadcount: 180,
            targetRevenue: 22_000_000,
            totalBudgetAed: 152_000,
            sponsorshipAed: 0,
            localCurrency: 'GBP',
            fxRateToAed: 4.6519,
            branchManager: 'Ahmed Al-Falasi',
            branchManagerId: MANAGER_ID,
            documentDeadline: '2025-10-13',
            roundRobinIndex: 0,
            agentCount: 5,
            createdAt: ts('2025-08-05T10:00:00Z'),
            updatedAt: ts('2025-10-22T18:00:00Z'),
            notes: 'Closed-door VIP sessions with HNW London-based Arab diaspora. Focused on Emaar and Aldar off-plan portfolio.',
        },
    },
];

// ── 2. Users (Agents + Manager) ───────────────────────────────────────────────

const USERS = [
    {
        id: AGENT_IDS.khalid,
        data: {
            displayName: 'Khalid Al-Mansouri',
            email: 'khalid.almansouri@psi.ae',
            phone: '+971-50-111-1001',
            branch: 'Abu Dhabi Main',
            role: 'agent',
            nationality: 'Emirati',
            languages: ['Arabic', 'English'],
            yearsExperience: 9,
            totalSalesAed: 42_500_000,
            currentTier: 'gold',
            avatarInitials: 'KA',
            isActive: true,
            joinedAt: ts('2017-03-01T00:00:00Z'),
        },
    },
    {
        id: AGENT_IDS.sara,
        data: {
            displayName: 'Sara Almarzouqi',
            email: 'sara.almarzouqi@psi.ae',
            phone: '+971-50-222-2002',
            branch: 'Dubai Marina',
            role: 'agent',
            nationality: 'Emirati',
            languages: ['Arabic', 'English', 'French'],
            yearsExperience: 6,
            totalSalesAed: 31_200_000,
            currentTier: 'gold',
            avatarInitials: 'SA',
            isActive: true,
            joinedAt: ts('2020-01-15T00:00:00Z'),
        },
    },
    {
        id: AGENT_IDS.omar,
        data: {
            displayName: 'Omar Bin Rashid',
            email: 'omar.binrashid@psi.ae',
            phone: '+971-50-333-3003',
            branch: 'Abu Dhabi Main',
            role: 'agent',
            nationality: 'Emirati',
            languages: ['Arabic', 'English'],
            yearsExperience: 4,
            totalSalesAed: 18_700_000,
            currentTier: 'silver',
            avatarInitials: 'OB',
            isActive: true,
            joinedAt: ts('2022-06-01T00:00:00Z'),
        },
    },
    {
        id: AGENT_IDS.nour,
        data: {
            displayName: 'Nour Al-Hamdan',
            email: 'nour.alhamdan@psi.ae',
            phone: '+971-50-444-4004',
            branch: 'Sharjah',
            role: 'agent',
            nationality: 'Saudi',
            languages: ['Arabic', 'English'],
            yearsExperience: 5,
            totalSalesAed: 22_400_000,
            currentTier: 'silver',
            avatarInitials: 'NH',
            isActive: true,
            joinedAt: ts('2021-09-10T00:00:00Z'),
        },
    },
    {
        id: AGENT_IDS.fatima,
        data: {
            displayName: 'Fatima Al-Zaabi',
            email: 'fatima.alzaabi@psi.ae',
            phone: '+971-50-555-5005',
            branch: 'Abu Dhabi Main',
            role: 'agent',
            nationality: 'Emirati',
            languages: ['Arabic', 'English'],
            yearsExperience: 2,
            totalSalesAed: 8_900_000,
            currentTier: 'bronze',
            avatarInitials: 'FZ',
            isActive: true,
            joinedAt: ts('2024-02-01T00:00:00Z'),
        },
    },
    {
        id: AGENT_IDS.elena,
        data: {
            displayName: 'Elena Rostova',
            email: 'elena.rostova@psi.ae',
            phone: '+971-50-666-6006',
            branch: 'Dubai Marina',
            role: 'agent',
            nationality: 'Russian',
            languages: ['Russian', 'English', 'Arabic'],
            yearsExperience: 7,
            totalSalesAed: 26_800_000,
            currentTier: 'gold',
            avatarInitials: 'ER',
            isActive: true,
            joinedAt: ts('2019-04-15T00:00:00Z'),
            notes: 'Russian-speaking liaison. Key asset for Moscow and CIS roadshows.',
        },
    },
    {
        id: MANAGER_ID,
        data: {
            displayName: 'Ahmed Al-Falasi',
            email: 'ahmed.alfalasi@psi.ae',
            phone: '+971-50-000-9999',
            branch: 'Abu Dhabi HQ',
            role: 'manager',
            nationality: 'Emirati',
            languages: ['Arabic', 'English'],
            yearsExperience: 18,
            avatarInitials: 'AA',
            isActive: true,
            joinedAt: ts('2008-09-01T00:00:00Z'),
        },
    },
];

// ── 3. Projects (CRM Catalogue) ───────────────────────────────────────────────

const PROJECTS = [
    {
        id: PROJECT_IDS.vida,
        data: {
            projectName: 'Vida Residence Dubai Marina',
            developer: 'Emaar Properties',
            developerLogoUrl: 'https://logo.clearbit.com/emaar.com',
            location: 'Dubai Marina, Dubai',
            city: 'Dubai',
            country: 'UAE',
            startingPriceAed: 1_850_000,
            averagePriceAed: 3_400_000,
            pricePerSqftAed: 2_850,
            handoverDate: '2027-Q4',
            status: 'off_plan',
            completionPercent: 28,
            propertyTypes: ['1BR', '2BR', '3BR', 'Penthouse'],
            totalUnits: 412,
            availableUnits: 188,
            amenities: ['Infinity Pool', 'Spa', 'Private Beach Access', 'Concierge'],
            serviceChargeAed: 22,
            paymentPlan: '40/60',
            downPaymentPercent: 10,
            brokerCommissionPercent: 4,
            summary: 'Vida Residence offers waterfront living in Dubai Marina with direct access to 2km of private promenade. Hotel-managed by Vida Hotels & Resorts.',
            createdAt: ts('2025-06-01T00:00:00Z'),
            isActive: true,
            isFeatured: true,
        },
    },
    {
        id: PROJECT_IDS.mamsha,
        data: {
            projectName: 'Mamsha Al Saadiyat Gardens',
            developer: 'Aldar Properties',
            developerLogoUrl: 'https://logo.clearbit.com/aldar.com',
            location: 'Saadiyat Island, Abu Dhabi',
            city: 'Abu Dhabi',
            country: 'UAE',
            startingPriceAed: 2_100_000,
            averagePriceAed: 4_750_000,
            pricePerSqftAed: 3_200,
            handoverDate: '2027-Q2',
            status: 'off_plan',
            completionPercent: 45,
            propertyTypes: ['2BR', '3BR', '4BR', 'Garden Villa'],
            totalUnits: 308,
            availableUnits: 121,
            amenities: ['Private Garden', 'Beach Club', 'Cultural District Access', 'Concierge'],
            serviceChargeAed: 18,
            paymentPlan: '50/50',
            downPaymentPercent: 10,
            brokerCommissionPercent: 3,
            summary: 'Mamsha Al Saadiyat Gardens is a low-density beachfront community on Saadiyat Island, minutes from the Louvre Abu Dhabi and Guggenheim.',
            createdAt: ts('2025-04-15T00:00:00Z'),
            isActive: true,
            isFeatured: true,
        },
    },
    {
        id: PROJECT_IDS.louvre,
        data: {
            projectName: 'Louvre Abu Dhabi Residences',
            developer: 'Aldar Properties',
            developerLogoUrl: 'https://logo.clearbit.com/aldar.com',
            location: 'Saadiyat Cultural District, Abu Dhabi',
            city: 'Abu Dhabi',
            country: 'UAE',
            startingPriceAed: 3_800_000,
            averagePriceAed: 7_200_000,
            pricePerSqftAed: 4_800,
            handoverDate: '2028-Q1',
            status: 'off_plan',
            completionPercent: 12,
            propertyTypes: ['2BR', '3BR', '4BR', 'Sky Villa'],
            totalUnits: 220,
            availableUnits: 198,
            amenities: ['Museum Access', 'Infinity Pool', 'Art Concierge', 'Private Marina'],
            serviceChargeAed: 25,
            paymentPlan: '30/70',
            downPaymentPercent: 10,
            brokerCommissionPercent: 4,
            summary: 'Ultra-luxury residences adjacent to the Louvre Abu Dhabi. The first branded museum-residence in the Middle East, with curated art installations throughout.',
            createdAt: ts('2025-09-01T00:00:00Z'),
            isActive: true,
            isFeatured: true,
        },
    },
    {
        id: PROJECT_IDS.marina,
        data: {
            projectName: 'Marina Blue by Emaar',
            developer: 'Emaar Properties',
            developerLogoUrl: 'https://logo.clearbit.com/emaar.com',
            location: 'Dubai Creek Harbour, Dubai',
            city: 'Dubai',
            country: 'UAE',
            startingPriceAed: 1_350_000,
            averagePriceAed: 2_900_000,
            pricePerSqftAed: 2_450,
            handoverDate: '2026-Q4',
            status: 'off_plan',
            completionPercent: 68,
            propertyTypes: ['Studio', '1BR', '2BR', '3BR'],
            totalUnits: 624,
            availableUnits: 214,
            amenities: ['Creek Views', 'Rooftop Pool', 'Community Retail', 'Smart Home'],
            serviceChargeAed: 16,
            paymentPlan: '60/40',
            downPaymentPercent: 5,
            brokerCommissionPercent: 3.5,
            summary: 'Marina Blue offers creek-view residences with smart home technology and a vibrant waterfront community lifestyle, positioned next to the Dubai Creek Tower.',
            createdAt: ts('2025-02-20T00:00:00Z'),
            isActive: true,
            isFeatured: false,
        },
    },
];

// ── 4. CRM Leads (tied to Moscow event) ──────────────────────────────────────

type LeadStatus = 'new' | 'contacted' | 'qualified' | 'meeting_scheduled' | 'contract_sent' | 'deal_closed' | 'lost';

interface LeadSeed {
    id: string;
    fullName: string;
    nationality: string;
    phone: string;
    email: string;
    budget: number;
    interestedProject: string;
    status: LeadStatus;
    source: string;
    notes: string;
    assignedAgentId: string;
    assignedAgentName: string;
    eventId: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    closedRevenueAed?: number;
}

const LEADS: LeadSeed[] = [
    // Closed deals
    {
        id: id('lead_msc', '001'),
        fullName: 'Dmitri Volkov', nationality: 'Russian', phone: '+7-985-111-0001', email: 'dmitri.volkov@example.com',
        budget: 5_500_000, interestedProject: 'Mamsha Al Saadiyat Gardens', status: 'deal_closed', source: 'walk_in',
        notes: 'Purchased 3BR Garden Villa. Full payment via bank transfer. Close family in Abu Dhabi.',
        assignedAgentId: AGENT_IDS.khalid, assignedAgentName: 'Khalid Al-Mansouri', eventId: EVENT_MOSCOW_ID,
        createdAt: ts('2026-03-15T10:30:00Z'), updatedAt: ts('2026-03-28T14:00:00Z'), closedRevenueAed: 5_400_000,
    },
    {
        id: id('lead_msc', '002'),
        fullName: 'Anastasia Morozova', nationality: 'Russian', phone: '+7-916-222-0002', email: 'a.morozova@example.com',
        budget: 7_200_000, interestedProject: 'Louvre Abu Dhabi Residences', status: 'deal_closed', source: 'referral',
        notes: 'Purchased 3BR — has a sister already living in Saadiyat. Very motivated buyer.',
        assignedAgentId: AGENT_IDS.elena, assignedAgentName: 'Elena Rostova', eventId: EVENT_MOSCOW_ID,
        createdAt: ts('2026-03-15T11:00:00Z'), updatedAt: ts('2026-04-02T16:00:00Z'), closedRevenueAed: 7_100_000,
    },
    {
        id: id('lead_msc', '003'),
        fullName: 'Sergei Kuznetsov', nationality: 'Russian', phone: '+7-903-333-0003', email: 's.kuznetsov@example.com',
        budget: 3_800_000, interestedProject: 'Marina Blue by Emaar', status: 'deal_closed', source: 'walk_in',
        notes: 'Purchased 2BR creek-view unit. Motivated by handover timeline and payment plan flexibility.',
        assignedAgentId: AGENT_IDS.sara, assignedAgentName: 'Sara Almarzouqi', eventId: EVENT_MOSCOW_ID,
        createdAt: ts('2026-03-16T09:15:00Z'), updatedAt: ts('2026-03-30T11:00:00Z'), closedRevenueAed: 3_650_000,
    },
    {
        id: id('lead_msc', '004'),
        fullName: 'Irina Petrovskaya', nationality: 'Ukrainian', phone: '+380-63-444-0004', email: 'i.petrovskaya@example.com',
        budget: 9_500_000, interestedProject: 'Louvre Abu Dhabi Residences', status: 'deal_closed', source: 'event_registration',
        notes: 'Sky Villa purchase. Paid 30% down. Works in tech, relocating family to Abu Dhabi.',
        assignedAgentId: AGENT_IDS.khalid, assignedAgentName: 'Khalid Al-Mansouri', eventId: EVENT_MOSCOW_ID,
        createdAt: ts('2026-03-15T14:00:00Z'), updatedAt: ts('2026-04-05T10:00:00Z'), closedRevenueAed: 9_200_000,
    },

    // Contract Sent
    {
        id: id('lead_msc', '005'),
        fullName: 'Alexei Romanov', nationality: 'Russian', phone: '+7-926-555-0005', email: 'a.romanov@example.com',
        budget: 4_200_000, interestedProject: 'Mamsha Al Saadiyat Gardens', status: 'contract_sent', source: 'walk_in',
        notes: 'SPA issued for 2BR beachfront unit. Waiting on NOC from legal team. 10 days to sign.',
        assignedAgentId: AGENT_IDS.omar, assignedAgentName: 'Omar Bin Rashid', eventId: EVENT_MOSCOW_ID,
        createdAt: ts('2026-03-16T10:00:00Z'), updatedAt: ts('2026-04-01T09:00:00Z'),
    },
    {
        id: id('lead_msc', '006'),
        fullName: 'Natasha Belova', nationality: 'Belarusian', phone: '+375-29-666-0006', email: 'n.belova@example.com',
        budget: 2_800_000, interestedProject: 'Vida Residence Dubai Marina', status: 'contract_sent', source: 'social_media',
        notes: 'Signed reservation form for 1BR Vida Marina. SPA being prepared by developer.',
        assignedAgentId: AGENT_IDS.nour, assignedAgentName: 'Nour Al-Hamdan', eventId: EVENT_MOSCOW_ID,
        createdAt: ts('2026-03-17T15:00:00Z'), updatedAt: ts('2026-03-31T11:00:00Z'),
    },
    {
        id: id('lead_msc', '007'),
        fullName: 'Yuri Gagarin Jr.', nationality: 'Russian', phone: '+7-495-777-0007', email: 'y.gagarin@example.com',
        budget: 6_000_000, interestedProject: 'Louvre Abu Dhabi Residences', status: 'contract_sent', source: 'referral',
        notes: 'Referred by Anastasia Morozova (lead_002). Interested in 2BR for investment. SPA sent, reviewing with lawyer.',
        assignedAgentId: AGENT_IDS.elena, assignedAgentName: 'Elena Rostova', eventId: EVENT_MOSCOW_ID,
        createdAt: ts('2026-03-16T12:30:00Z'), updatedAt: ts('2026-04-03T14:00:00Z'),
    },

    // Meeting Scheduled
    {
        id: id('lead_msc', '008'),
        fullName: 'Viktor Orlov', nationality: 'Russian', phone: '+7-812-888-0008', email: 'v.orlov@example.com',
        budget: 3_200_000, interestedProject: 'Marina Blue by Emaar', status: 'meeting_scheduled', source: 'walk_in',
        notes: 'Video call scheduled 10 April to review floor plans. Wants to bring daughter.',
        assignedAgentId: AGENT_IDS.sara, assignedAgentName: 'Sara Almarzouqi', eventId: EVENT_MOSCOW_ID,
        createdAt: ts('2026-03-17T09:00:00Z'), updatedAt: ts('2026-04-02T08:00:00Z'),
    },
    {
        id: id('lead_msc', '009'),
        fullName: 'Olga Sharapova', nationality: 'Russian', phone: '+7-915-999-0009', email: 'o.sharapova@example.com',
        budget: 5_000_000, interestedProject: 'Mamsha Al Saadiyat Gardens', status: 'meeting_scheduled', source: 'event_registration',
        notes: 'Scheduled site visit to Abu Dhabi showroom 15 April. High intent — wants to see sealine.',
        assignedAgentId: AGENT_IDS.khalid, assignedAgentName: 'Khalid Al-Mansouri', eventId: EVENT_MOSCOW_ID,
        createdAt: ts('2026-03-15T16:30:00Z'), updatedAt: ts('2026-03-29T10:00:00Z'),
    },
    {
        id: id('lead_msc', '010'),
        fullName: 'Pavel Kalinichenko', nationality: 'Russian', phone: '+7-911-000-0010', email: 'p.kali@example.com',
        budget: 4_500_000, interestedProject: 'Vida Residence Dubai Marina', status: 'meeting_scheduled', source: 'partner_agency',
        notes: 'Referred by Moscow luxury agency. Meeting at our Abu Dhabi office on 20 April.',
        assignedAgentId: AGENT_IDS.fatima, assignedAgentName: 'Fatima Al-Zaabi', eventId: EVENT_MOSCOW_ID,
        createdAt: ts('2026-03-16T11:00:00Z'), updatedAt: ts('2026-04-01T12:00:00Z'),
    },

    // Qualified
    {
        id: id('lead_msc', '011'),
        fullName: 'Marina Sokolova', nationality: 'Kazakhstani', phone: '+7-777-111-1011', email: 'msokolova@example.com',
        budget: 2_100_000, interestedProject: 'Marina Blue by Emaar', status: 'qualified', source: 'walk_in',
        notes: 'First-time investor. Pre-approved mortgage from FAB. Shortlisted 2 units.',
        assignedAgentId: AGENT_IDS.nour, assignedAgentName: 'Nour Al-Hamdan', eventId: EVENT_MOSCOW_ID,
        createdAt: ts('2026-03-16T14:00:00Z'), updatedAt: ts('2026-03-28T09:00:00Z'),
    },
    {
        id: id('lead_msc', '012'),
        fullName: 'Boris Nikolaev', nationality: 'Russian', phone: '+7-921-222-1012', email: 'b.nikolaev@example.com',
        budget: 8_000_000, interestedProject: 'Louvre Abu Dhabi Residences', status: 'qualified', source: 'vip_invitation',
        notes: 'Art collector. Attended VIP dinner. Has 3 properties in Dubai already.',
        assignedAgentId: AGENT_IDS.elena, assignedAgentName: 'Elena Rostova', eventId: EVENT_MOSCOW_ID,
        createdAt: ts('2026-03-16T20:00:00Z'), updatedAt: ts('2026-04-01T10:00:00Z'),
    },
    {
        id: id('lead_msc', '013'),
        fullName: 'Tatiana Zhukova', nationality: 'Russian', phone: '+7-909-333-1013', email: 't.zhukova@example.com',
        budget: 3_500_000, interestedProject: 'Mamsha Al Saadiyat Gardens', status: 'qualified', source: 'walk_in',
        notes: 'Relocated to Dubai in 2024. Looking for Abu Dhabi investment. Keen on garden villa lifestyle.',
        assignedAgentId: AGENT_IDS.omar, assignedAgentName: 'Omar Bin Rashid', eventId: EVENT_MOSCOW_ID,
        createdAt: ts('2026-03-17T10:30:00Z'), updatedAt: ts('2026-03-30T08:00:00Z'),
    },

    // Contacted
    {
        id: id('lead_msc', '014'),
        fullName: 'Mikhail Petrov', nationality: 'Russian', phone: '+7-903-444-1014', email: 'm.petrov@example.com',
        budget: 1_800_000, interestedProject: 'Marina Blue by Emaar', status: 'contacted', source: 'walk_in',
        notes: 'WhatsApp call on 22 March. Sent brochure. Following up next week.',
        assignedAgentId: AGENT_IDS.fatima, assignedAgentName: 'Fatima Al-Zaabi', eventId: EVENT_MOSCOW_ID,
        createdAt: ts('2026-03-17T11:00:00Z'), updatedAt: ts('2026-03-22T16:00:00Z'),
    },
    {
        id: id('lead_msc', '015'),
        fullName: 'Yelena Ivanova', nationality: 'Russian', phone: '+7-985-555-1015', email: 'y.ivanova@example.com',
        budget: 4_000_000, interestedProject: 'Vida Residence Dubai Marina', status: 'contacted', source: 'event_registration',
        notes: 'Pre-registered online. Called post-event. Evaluating Dubai vs Lisbon investment.',
        assignedAgentId: AGENT_IDS.sara, assignedAgentName: 'Sara Almarzouqi', eventId: EVENT_MOSCOW_ID,
        createdAt: ts('2026-03-14T09:00:00Z'), updatedAt: ts('2026-03-20T14:00:00Z'),
    },

    // New
    {
        id: id('lead_msc', '016'),
        fullName: 'Andrei Kuznetsov', nationality: 'Russian', phone: '+7-916-666-1016', email: 'andrei.k@example.com',
        budget: 6_500_000, interestedProject: 'Louvre Abu Dhabi Residences', status: 'new', source: 'walk_in',
        notes: 'Picked up brochure on Day 3. No follow-up yet. High budget — priority outreach.',
        assignedAgentId: AGENT_IDS.khalid, assignedAgentName: 'Khalid Al-Mansouri', eventId: EVENT_MOSCOW_ID,
        createdAt: ts('2026-03-17T15:30:00Z'), updatedAt: ts('2026-03-17T15:30:00Z'),
    },
    {
        id: id('lead_msc', '017'),
        fullName: 'Daria Volkova', nationality: 'Georgian', phone: '+995-555-777-1017', email: 'd.volkova@example.com',
        budget: 2_500_000, interestedProject: 'Mamsha Al Saadiyat Gardens', status: 'new', source: 'social_media',
        notes: 'Found us via Instagram ad. Filled form at expo stand. Not yet called.',
        assignedAgentId: AGENT_IDS.nour, assignedAgentName: 'Nour Al-Hamdan', eventId: EVENT_MOSCOW_ID,
        createdAt: ts('2026-03-17T13:00:00Z'), updatedAt: ts('2026-03-17T13:00:00Z'),
    },
    {
        id: id('lead_msc', '018'),
        fullName: 'Konstantin Sorokin', nationality: 'Russian', phone: '+7-926-888-1018', email: 'k.sorokin@example.com',
        budget: 5_200_000, interestedProject: 'Vida Residence Dubai Marina', status: 'new', source: 'walk_in',
        notes: 'Late Day 3 walk-in. Left business card. No further contact.',
        assignedAgentId: AGENT_IDS.elena, assignedAgentName: 'Elena Rostova', eventId: EVENT_MOSCOW_ID,
        createdAt: ts('2026-03-17T16:45:00Z'), updatedAt: ts('2026-03-17T16:45:00Z'),
    },
];

// ── 5. Event Rosters ──────────────────────────────────────────────────────────

interface RosterEntry {
    agentId: string;
    agentName: string;
    branch: string;
    tier: 'gold' | 'silver' | 'bronze';
    status: 'approved' | 'pending_logistics' | 'physically_present' | 'rejected';
    flightUploaded: boolean;
    visaUploaded: boolean;
    managerApproved: boolean;
    flightNumber?: string;
    hotelName?: string;
    travelCostLocal: number;
    eventCostLocal: number;
    closedRevenueAed: number;
    roundRobinIndex: number;
    joinedAt: Timestamp;
}

// Moscow roster (5 agents + Elena — our Russian-speaking key asset)
const MOSCOW_ROSTER: (RosterEntry & { eventId: string; rosterId: string })[] = [
    {
        rosterId: id('roster_msc', AGENT_IDS.khalid), eventId: EVENT_MOSCOW_ID,
        agentId: AGENT_IDS.khalid, agentName: 'Khalid Al-Mansouri', branch: 'Abu Dhabi Main',
        tier: 'gold', status: 'physically_present',
        flightUploaded: true, visaUploaded: true, managerApproved: true,
        flightNumber: 'EK043', hotelName: 'Ritz-Carlton Moscow',
        travelCostLocal: 2_200, eventCostLocal: 4_000,
        closedRevenueAed: 14_600_000, roundRobinIndex: 0,
        joinedAt: ts('2026-01-12T08:00:00Z'),
    },
    {
        rosterId: id('roster_msc', AGENT_IDS.sara), eventId: EVENT_MOSCOW_ID,
        agentId: AGENT_IDS.sara, agentName: 'Sara Almarzouqi', branch: 'Dubai Marina',
        tier: 'gold', status: 'physically_present',
        flightUploaded: true, visaUploaded: true, managerApproved: true,
        flightNumber: 'EK043', hotelName: 'Ritz-Carlton Moscow',
        travelCostLocal: 2_200, eventCostLocal: 4_000,
        closedRevenueAed: 10_750_000, roundRobinIndex: 1,
        joinedAt: ts('2026-01-15T09:00:00Z'),
    },
    {
        rosterId: id('roster_msc', AGENT_IDS.elena), eventId: EVENT_MOSCOW_ID,
        agentId: AGENT_IDS.elena, agentName: 'Elena Rostova', branch: 'Dubai Marina',
        tier: 'gold', status: 'physically_present',
        flightUploaded: true, visaUploaded: true, managerApproved: true,
        flightNumber: 'EK043', hotelName: 'Ritz-Carlton Moscow',
        travelCostLocal: 2_200, eventCostLocal: 4_000,
        closedRevenueAed: 13_100_000, roundRobinIndex: 2,
        joinedAt: ts('2026-01-20T10:00:00Z'),
    },
    {
        rosterId: id('roster_msc', AGENT_IDS.omar), eventId: EVENT_MOSCOW_ID,
        agentId: AGENT_IDS.omar, agentName: 'Omar Bin Rashid', branch: 'Abu Dhabi Main',
        tier: 'silver', status: 'approved',
        flightUploaded: false, visaUploaded: true, managerApproved: true,
        flightNumber: 'EK043', hotelName: 'Radisson Blu Moscow',
        travelCostLocal: 1_800, eventCostLocal: 3_000,
        closedRevenueAed: 7_650_000, roundRobinIndex: 3,
        joinedAt: ts('2026-02-01T08:00:00Z'),
    },
    {
        rosterId: id('roster_msc', AGENT_IDS.nour), eventId: EVENT_MOSCOW_ID,
        agentId: AGENT_IDS.nour, agentName: 'Nour Al-Hamdan', branch: 'Sharjah',
        tier: 'silver', status: 'pending_logistics',
        flightUploaded: false, visaUploaded: false, managerApproved: true,
        travelCostLocal: 1_800, eventCostLocal: 3_000,
        closedRevenueAed: 6_100_000, roundRobinIndex: 4,
        joinedAt: ts('2026-02-10T10:00:00Z'),
    },
    {
        rosterId: id('roster_msc', AGENT_IDS.fatima), eventId: EVENT_MOSCOW_ID,
        agentId: AGENT_IDS.fatima, agentName: 'Fatima Al-Zaabi', branch: 'Abu Dhabi Main',
        tier: 'bronze', status: 'approved',
        flightUploaded: true, visaUploaded: true, managerApproved: true,
        flightNumber: 'EK043', hotelName: 'Radisson Blu Moscow',
        travelCostLocal: 1_500, eventCostLocal: 2_500,
        closedRevenueAed: 1_800_000, roundRobinIndex: 5,
        joinedAt: ts('2026-02-15T09:00:00Z'),
    },
];

// London roster (historical — completed event)
const LONDON_ROSTER: (RosterEntry & { eventId: string; rosterId: string })[] = [
    {
        rosterId: id('roster_ldn', AGENT_IDS.khalid), eventId: EVENT_LONDON_ID,
        agentId: AGENT_IDS.khalid, agentName: 'Khalid Al-Mansouri', branch: 'Abu Dhabi Main',
        tier: 'gold', status: 'physically_present',
        flightUploaded: true, visaUploaded: true, managerApproved: true,
        flightNumber: 'EK005', hotelName: 'The Langham London',
        travelCostLocal: 1_850, eventCostLocal: 3_600,
        closedRevenueAed: 4_200_000, roundRobinIndex: 0,
        joinedAt: ts('2025-09-01T08:00:00Z'),
    },
    {
        rosterId: id('roster_ldn', AGENT_IDS.sara), eventId: EVENT_LONDON_ID,
        agentId: AGENT_IDS.sara, agentName: 'Sara Almarzouqi', branch: 'Dubai Marina',
        tier: 'gold', status: 'physically_present',
        flightUploaded: true, visaUploaded: true, managerApproved: true,
        flightNumber: 'EK005', hotelName: 'The Langham London',
        travelCostLocal: 1_800, eventCostLocal: 3_600,
        closedRevenueAed: 3_800_000, roundRobinIndex: 1,
        joinedAt: ts('2025-09-05T09:00:00Z'),
    },
    {
        rosterId: id('roster_ldn', AGENT_IDS.omar), eventId: EVENT_LONDON_ID,
        agentId: AGENT_IDS.omar, agentName: 'Omar Bin Rashid', branch: 'Abu Dhabi Main',
        tier: 'silver', status: 'physically_present',
        flightUploaded: true, visaUploaded: true, managerApproved: true,
        flightNumber: 'EK005', hotelName: 'Marriott London',
        travelCostLocal: 1_450, eventCostLocal: 2_300,
        closedRevenueAed: 2_100_000, roundRobinIndex: 2,
        joinedAt: ts('2025-09-10T10:00:00Z'),
    },
    {
        rosterId: id('roster_ldn', AGENT_IDS.nour), eventId: EVENT_LONDON_ID,
        agentId: AGENT_IDS.nour, agentName: 'Nour Al-Hamdan', branch: 'Sharjah',
        tier: 'silver', status: 'physically_present',
        flightUploaded: true, visaUploaded: true, managerApproved: true,
        flightNumber: 'EK005', hotelName: 'Marriott London',
        travelCostLocal: 1_450, eventCostLocal: 2_300,
        closedRevenueAed: 1_750_000, roundRobinIndex: 3,
        joinedAt: ts('2025-09-12T09:00:00Z'),
    },
    {
        rosterId: id('roster_ldn', AGENT_IDS.fatima), eventId: EVENT_LONDON_ID,
        agentId: AGENT_IDS.fatima, agentName: 'Fatima Al-Zaabi', branch: 'Abu Dhabi Main',
        tier: 'bronze', status: 'physically_present',
        flightUploaded: true, visaUploaded: true, managerApproved: true,
        flightNumber: 'EK005', hotelName: 'Marriott London',
        travelCostLocal: 1_100, eventCostLocal: 1_500,
        closedRevenueAed: 950_000, roundRobinIndex: 4,
        joinedAt: ts('2025-09-15T10:00:00Z'),
    },
];

// ── 6. Expenses (London event — itemised P&L) ─────────────────────────────────

interface ExpenseSeed {
    id: string;
    eventId: string;
    amount: number;
    currency: string;
    amountAed: number;
    category: 'Venue' | 'Hospitality' | 'Marketing' | 'Travel';
    subcategory: string;
    paidBy: 'Branch' | 'Sponsor' | 'Agent';
    description: string;
    vendorName: string;
    receiptRef: string;
    createdAt: Timestamp;
    createdBy: string;
}

const EXPENSES: ExpenseSeed[] = [
    {
        id: id('exp_ldn', '001'), eventId: EVENT_LONDON_ID,
        amount: 12_500, currency: 'GBP', amountAed: 58_149,
        category: 'Travel', subcategory: 'Flights',
        paidBy: 'Branch', description: 'Emirates Business Class return — 5 agents (EK005/EK006)',
        vendorName: 'Emirates Airlines', receiptRef: 'EK-INV-20251014-881',
        createdAt: ts('2025-09-20T10:00:00Z'), createdBy: MANAGER_ID,
    },
    {
        id: id('exp_ldn', '002'), eventId: EVENT_LONDON_ID,
        amount: 9_800, currency: 'GBP', amountAed: 45_588,
        category: 'Venue', subcategory: 'Hotel',
        paidBy: 'Branch', description: '2-night stay for 5 agents — The Langham London (2 nights × 5 rooms × GBP 980)',
        vendorName: 'The Langham London', receiptRef: 'LANG-2025-OCT-4412',
        createdAt: ts('2025-09-22T09:00:00Z'), createdBy: MANAGER_ID,
    },
    {
        id: id('exp_ldn', '003'), eventId: EVENT_LONDON_ID,
        amount: 8_200, currency: 'GBP', amountAed: 38_145,
        category: 'Venue', subcategory: 'Booth Construction',
        paidBy: 'Branch', description: 'Exhibition stand design, build, and AV installation — 6m × 4m custom booth',
        vendorName: 'Expo Solutions UK Ltd', receiptRef: 'EXPO-UK-22819',
        createdAt: ts('2025-09-25T11:00:00Z'), createdBy: MANAGER_ID,
    },
    {
        id: id('exp_ldn', '004'), eventId: EVENT_LONDON_ID,
        amount: 4_400, currency: 'GBP', amountAed: 20_468,
        category: 'Hospitality', subcategory: 'VIP Dinner',
        paidBy: 'Branch', description: 'VIP networking dinner — Nobu London, 22 covers. Day 1 evening.',
        vendorName: 'Nobu London', receiptRef: 'NOBU-LDN-2025102001',
        createdAt: ts('2025-10-21T10:00:00Z'), createdBy: MANAGER_ID,
    },
    {
        id: id('exp_ldn', '005'), eventId: EVENT_LONDON_ID,
        amount: 2_100, currency: 'GBP', amountAed: 9_769,
        category: 'Marketing', subcategory: 'Print Collateral',
        paidBy: 'Branch', description: 'High-gloss project brochures (500 units), rollup banners (10 units), branded bags',
        vendorName: 'London Print Group', receiptRef: 'LPG-20251010-7741',
        createdAt: ts('2025-10-08T09:00:00Z'), createdBy: MANAGER_ID,
    },
    {
        id: id('exp_ldn', '006'), eventId: EVENT_LONDON_ID,
        amount: 1_650, currency: 'GBP', amountAed: 7_676,
        category: 'Marketing', subcategory: 'Digital Advertising',
        paidBy: 'Branch', description: 'LinkedIn + Instagram geo-targeted ad campaign (London HNW audience, 14-day pre-event)',
        vendorName: 'Meta Ads / LinkedIn', receiptRef: 'DIG-ADS-OCT25-PSI',
        createdAt: ts('2025-10-07T08:00:00Z'), createdBy: MANAGER_ID,
    },
];

// ── 7. Agent Debts (clawback scenarios) ───────────────────────────────────────

const AGENT_DEBTS = [
    {
        id: 'debt_khalid_msc_001',
        agentId: AGENT_IDS.khalid,
        agentName: 'Khalid Al-Mansouri',
        amountAed: 75_000,
        reason: 'cancelled_deal',
        description: 'Commission reversal — Marina Blue Unit 1204 buyer withdrawal post-SPA (Cairo Cityscape Q3 2025)',
        sourceEventId: 'psi_evt_cairo_2025',
        sourceEventName: 'Cairo Cityscape Q3 2025',
        createdAt: ts('2025-09-20T10:00:00Z'),
        status: 'outstanding',
        recoveredAed: 0,
        remainingAed: 75_000,
    },
    {
        id: 'debt_omar_ldn_001',
        agentId: AGENT_IDS.omar,
        agentName: 'Omar Bin Rashid',
        amountAed: 15_000,
        reason: 'advance_recovery',
        description: 'Commission advance paid February 2025 for London event — not yet recovered via settlement',
        sourceEventId: EVENT_LONDON_ID,
        sourceEventName: 'London VIP Roadshow — Autumn 2025',
        createdAt: ts('2025-02-01T08:30:00Z'),
        status: 'outstanding',
        recoveredAed: 0,
        remainingAed: 15_000,
    },
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SEEDER FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * injectSeedData
 * ──────────────
 * Writes all seed data to Firestore atomically using a writeBatch.
 * Sub-collection documents (approvedAgents) are written sequentially
 * after the main batch because Firestore batches do not support
 * cross-collection atomic writes with subcollections in all SDK versions.
 *
 * Returns a detailed result object describing what was written.
 */
export async function injectSeedData(): Promise<{
    success: boolean;
    written: Record<string, number>;
    errors: string[];
    durationMs: number;
}> {
    const startTime = Date.now();
    const written: Record<string, number> = {};
    const errors: string[] = [];

    console.group('🌱 PSI Firebase Seeder — Starting data injection');
    console.log('Target project:', (db as any)._databaseId?.projectId ?? 'unknown');

    try {
        // ── Batch 1: crm_events, crm_projects, users, crm_leads ──────────────

        console.log('📦 Batch 1: Events, Projects, Users, Leads...');
        const batch1 = writeBatch(db);

        // Events
        EVENTS.forEach(({ id: eventId, data }) => {
            batch1.set(doc(db, 'crm_events', eventId), data);
        });
        written.crm_events = EVENTS.length;

        // Projects
        PROJECTS.forEach(({ id: projId, data }) => {
            batch1.set(doc(db, 'crm_projects', projId), data);
        });
        written.crm_projects = PROJECTS.length;

        // Users
        USERS.forEach(({ id: userId, data }) => {
            batch1.set(doc(db, 'users', userId), data);
        });
        written.users = USERS.length;

        // Leads
        LEADS.forEach(lead => {
            const { id: leadId, ...leadData } = lead;
            batch1.set(doc(db, 'crm_leads', leadId), leadData);
        });
        written.crm_leads = LEADS.length;

        await batch1.commit();
        console.log(`✅ Batch 1 committed — ${EVENTS.length} events, ${PROJECTS.length} projects, ${USERS.length} users, ${LEADS.length} leads`);

        // ── Batch 2: event_rosters, expenses, agent_debts ────────────────────

        console.log('📦 Batch 2: Rosters, Expenses, Agent Debts...');
        const batch2 = writeBatch(db);
        const allRosters = [...MOSCOW_ROSTER, ...LONDON_ROSTER];

        allRosters.forEach(roster => {
            const { rosterId, ...rosterData } = roster;
            batch2.set(doc(db, 'event_rosters', rosterId), rosterData);
        });
        written.event_rosters = allRosters.length;

        EXPENSES.forEach(expense => {
            const { id: expId, ...expData } = expense;
            batch2.set(doc(db, 'expenses', expId), expData);
        });
        written.expenses = EXPENSES.length;

        AGENT_DEBTS.forEach(debt => {
            const { id: debtId, ...debtData } = debt;
            batch2.set(doc(db, 'agent_debts', debtId), debtData);
        });
        written.agent_debts = AGENT_DEBTS.length;

        await batch2.commit();
        console.log(`✅ Batch 2 committed — ${allRosters.length} rosters, ${EXPENSES.length} expenses, ${AGENT_DEBTS.length} debts`);

        // ── Batch 3: expenses (Moscow preview), crm_leads (demo), checklists, bounties ──

        console.log('📦 Batch 3: Moscow Expenses, Demo Lead, Checklists, Bounties...');
        const batch3 = writeBatch(db);

        // ── 3a. Moscow expenses (2 preview docs so the collection is populated) ──
        const MOSCOW_EXPENSES = [
            {
                id: 'exp_msc_001',
                eventId: EVENT_MOSCOW_ID,
                amount: 50_000,
                currency: 'AED',
                amountAed: 50_000,
                category: 'Venue',
                subcategory: 'Exhibition Space',
                paidBy: 'Branch' as const,
                status: 'Approved',
                description: 'Crocus Expo — premium 6×8m exhibition booth, 3 days',
                vendorName: 'Crocus Expo International',
                receiptRef: 'CROCUS-2026-PSI-001',
                createdAt: ts('2026-02-01T09:00:00Z'),
                createdBy: MANAGER_ID,
            },
            {
                id: 'exp_msc_002',
                eventId: EVENT_MOSCOW_ID,
                amount: 28_500,
                currency: 'AED',
                amountAed: 28_500,
                category: 'Travel',
                subcategory: 'Flights',
                paidBy: 'Branch' as const,
                status: 'Approved',
                description: 'Emirates Business Class return — 6 agents (EK043/EK044)',
                vendorName: 'Emirates Airlines',
                receiptRef: 'EK-INV-20260210-992',
                createdAt: ts('2026-02-10T10:00:00Z'),
                createdBy: MANAGER_ID,
            },
        ];
        MOSCOW_EXPENSES.forEach(({ id: expId, ...expData }) => {
            batch3.set(doc(db, 'expenses', expId), expData);
        });
        written.expenses = (written.expenses ?? 0) + MOSCOW_EXPENSES.length;

        // ── 3b. Demo CRM lead (Ahmed Al Maktoum — canonical demo persona) ─────
        const DEMO_LEAD = {
            id: 'lead_demo_ahmed_001',
            name: 'Ahmed Al Maktoum',
            fullName: 'Ahmed Al Maktoum',
            interest: 'Vida Residence',
            interestedProject: PROJECT_IDS.vida,
            stage: 'Hot',
            status: 'qualified',
            budget: '3M AED',
            budgetAed: 3_000_000,
            eventId: EVENT_MOSCOW_ID,
            assignedAgentId: AGENT_IDS.khalid,
            assignedAgentName: 'Khalid Al-Mansouri',
            nationality: 'Emirati',
            phone: '+971-50-100-0001',
            email: 'ahmed.almaktoum.demo@example.com',
            source: 'vip_invitation',
            notes: 'VIP invitee. Senior family member. High intent — seeking investment diversification.',
            createdAt: ts('2026-03-15T09:00:00Z'),
            updatedAt: ts('2026-03-15T09:00:00Z'),
        };
        const { id: demoLeadId, ...demoLeadData } = DEMO_LEAD;
        batch3.set(doc(db, 'crm_leads', demoLeadId), demoLeadData);
        written.crm_leads = (written.crm_leads ?? 0) + 1;

        // ── 3c. Checklists ─────────────────────────────────────────────────────
        const CHECKLISTS = [
            {
                id: 'chk_msc_001',
                eventId: EVENT_MOSCOW_ID,
                task: 'Confirm VIP Catering',
                description: 'Coordinate with Ritz-Carlton banquet team. Confirm guest count and dietary requirements.',
                assignedTo: 'Logistics',
                assignedAgentId: MANAGER_ID,
                status: 'Pending',
                priority: 'High',
                dueDate: ts('2026-03-08T17:00:00Z'),
                createdAt: ts('2026-02-20T09:00:00Z'),
                createdBy: MANAGER_ID,
            },
            {
                id: 'chk_msc_002',
                eventId: EVENT_MOSCOW_ID,
                task: 'Submit Visa Applications',
                description: 'Russian tourist visa required for all non-CIS agents. Submit via consular services.',
                assignedTo: 'Logistics',
                assignedAgentId: MANAGER_ID,
                status: 'Done',
                priority: 'Critical',
                dueDate: ts('2026-02-15T12:00:00Z'),
                createdAt: ts('2026-01-20T09:00:00Z'),
                createdBy: MANAGER_ID,
            },
            {
                id: 'chk_msc_003',
                eventId: EVENT_MOSCOW_ID,
                task: 'Print & Ship Collateral',
                description: '500 brochures, 50 A4 project folders, 10 pull-up banners — ship by DHL before Feb 28.',
                assignedTo: 'Marketing',
                assignedAgentId: MANAGER_ID,
                status: 'In Progress',
                priority: 'Medium',
                dueDate: ts('2026-02-28T23:59:59Z'),
                createdAt: ts('2026-02-01T10:00:00Z'),
                createdBy: MANAGER_ID,
            },
        ];
        CHECKLISTS.forEach(({ id: chkId, ...chkData }) => {
            batch3.set(doc(db, 'checklists', chkId), chkData);
        });
        written.checklists = CHECKLISTS.length;

        // ── 3d. Bounties ───────────────────────────────────────────────────────
        const BOUNTIES = [
            {
                id: 'bounty_001',
                title: 'Sell 2 Penthouses',
                description: 'First agent to close 2 penthouse units (any project) during the Moscow Expo earns a 2% bonus on both deals.',
                reward: '2% Bonus',
                rewardType: 'commission_bonus',
                rewardValuePercent: 2,
                status: 'Active',
                eventId: EVENT_MOSCOW_ID,
                targetProjectIds: [PROJECT_IDS.louvre, PROJECT_IDS.mamsha],
                currentLeaderId: null,
                progressCount: 0,
                targetCount: 2,
                createdAt: ts('2026-02-15T09:00:00Z'),
                expiresAt: ts('2026-03-17T23:59:59Z'),
                createdBy: MANAGER_ID,
            },
            {
                id: 'bounty_002',
                title: 'Top Lead Collector',
                description: 'Agent with the most walk-in leads captured on Event Day 1 receives AED 5,000 cash bonus.',
                reward: 'AED 5,000',
                rewardType: 'cash',
                rewardValueAed: 5_000,
                status: 'Active',
                eventId: EVENT_MOSCOW_ID,
                targetProjectIds: [],
                currentLeaderId: null,
                progressCount: 0,
                targetCount: 1,
                createdAt: ts('2026-02-15T09:00:00Z'),
                expiresAt: ts('2026-03-15T23:59:59Z'),
                createdBy: MANAGER_ID,
            },
            {
                id: 'bounty_003',
                title: 'Revenue Sprint — AED 10M',
                description: 'First agent to surpass AED 10M in confirmed closings during the event period earns Gold Tier for next 3 roadshows.',
                reward: 'Gold Tier (3 events)',
                rewardType: 'tier_upgrade',
                status: 'Active',
                eventId: EVENT_MOSCOW_ID,
                targetProjectIds: [],
                currentLeaderId: AGENT_IDS.khalid,
                progressCount: 1,
                targetCount: 1,
                createdAt: ts('2026-02-15T09:00:00Z'),
                expiresAt: ts('2026-03-17T23:59:59Z'),
                createdBy: MANAGER_ID,
            },
        ];
        BOUNTIES.forEach(({ id: btyId, ...btyData }) => {
            batch3.set(doc(db, 'bounties', btyId), btyData);
        });
        written.bounties = BOUNTIES.length;

        await batch3.commit();
        console.log(`✅ Batch 3 committed — ${MOSCOW_EXPENSES.length} expenses, 1 demo lead, ${CHECKLISTS.length} checklists, ${BOUNTIES.length} bounties`);

        // ── Phase 3: approvedAgents sub-collections (sequential) ─────────────
        // These MUST be written after their parent event documents exist.
        // Kept separate because Firestore batches and queries don't traverse
        // sub-collections in the same atomic unit.

        console.log('📦 Phase 3: approvedAgents sub-collections...');
        let approvedAgentsWritten = 0;

        const agentSubcollectionPayloads = [
            // Moscow — 6 agents
            ...MOSCOW_ROSTER.map(r => ({
                eventId: r.eventId,
                agentId: r.agentId,
                data: {
                    agentName: r.agentName,
                    email: `${r.agentId.replace('usr_', '').replace(/_/g, '.')}@psi.ae`,
                    phone: '',
                    branch: r.branch,
                    tier: r.tier,
                    managerApproved: r.managerApproved,
                    flightUploaded: r.flightUploaded,
                    visaUploaded: r.visaUploaded,
                    status: r.status,
                    roundRobinIndex: r.roundRobinIndex,
                    ...(r.status === 'physically_present' ? { checkedInAt: ts('2026-03-15T08:00:00Z'), checkedInBy: MANAGER_ID } : {}),
                },
            })),
            // London — 5 agents (all present — completed event)
            ...LONDON_ROSTER.map(r => ({
                eventId: r.eventId,
                agentId: r.agentId,
                data: {
                    agentName: r.agentName,
                    email: `${r.agentId.replace('usr_', '').replace(/_/g, '.')}@psi.ae`,
                    phone: '',
                    branch: r.branch,
                    tier: r.tier,
                    managerApproved: r.managerApproved,
                    flightUploaded: r.flightUploaded,
                    visaUploaded: r.visaUploaded,
                    status: r.status,
                    roundRobinIndex: r.roundRobinIndex,
                    checkedInAt: ts('2025-10-20T08:30:00Z'),
                    checkedInBy: MANAGER_ID,
                },
            })),
        ];

        for (const entry of agentSubcollectionPayloads) {
            await setDoc(
                doc(db, 'crm_events', entry.eventId, 'approvedAgents', entry.agentId),
                entry.data
            );
            approvedAgentsWritten++;
        }

        written.approvedAgents = approvedAgentsWritten;
        console.log(`✅ Phase 3 complete — ${approvedAgentsWritten} approvedAgent sub-documents written`);

    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push(message);
        console.error('❌ Seeder error:', message);
    }

    const durationMs = Date.now() - startTime;

    // Summary
    const totalDocs = Object.values(written).reduce((s, n) => s + n, 0);
    console.log('\n─────────────────────────────────');
    console.log(`📊 Seeder Summary (${durationMs}ms)`);
    Object.entries(written).forEach(([col, count]) => {
        console.log(`   ${col.padEnd(24)} → ${count} documents`);
    });
    console.log(`   ${'TOTAL'.padEnd(24)} → ${totalDocs} documents`);
    if (errors.length > 0) {
        console.log('\n⚠️  Errors encountered:');
        errors.forEach(e => console.log('   •', e));
    } else {
        console.log('\n✅ All data injected successfully. No errors.');
    }
    console.groupEnd();

    return {
        success: errors.length === 0,
        written,
        errors,
        durationMs,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// PRESENTATION-READY SEEDER  (exact IDs & schema from the brief)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * injectPresentationData
 * ──────────────────────
 * Writes the exact payload specified for the executive boardroom demo.
 * Uses the canonical document IDs from the brief so cross-references work
 * in every UI component that reads from Firebase.
 *
 * Collections written:
 *   • crm_projects                       — 3 premium developments
 *   • users                              — 1 manager + 2 agents
 *   • events                             — 1 roadshow event (evt_moscow_26)
 *   • events/evt_moscow_26/roster        — 2 agent roster entries
 *   • events/evt_moscow_26/expenses      — 2 itemised expense lines
 *   • crm_leads                          — 10 leads (6 Sara, 4 Khalid)
 *
 * Fires browser alert() on success so the presenter gets instant confirmation.
 */
export async function injectPresentationData(): Promise<void> {
    console.group('🎯 PSI Presentation Seeder — Injecting demo data');

    // ── Batch 1: crm_projects, users, events ──────────────────────────────────
    const batch1 = writeBatch(db);

    // 1a. Projects
    const PRES_PROJECTS = [
        { id: 'p_vida', projectName: 'Vida Residence', developer: 'Emaar', startingPriceAed: 2_200_000, location: 'Dubai Marina', status: 'active', commissionPercentage: 5, createdAt: ts('2026-01-01T00:00:00Z') },
        { id: 'p_mamsha', projectName: 'Mamsha Gardens', developer: 'Aldar', startingPriceAed: 3_500_000, location: 'Saadiyat Island', status: 'active', commissionPercentage: 4, createdAt: ts('2026-01-01T00:00:00Z') },
        { id: 'p_louvre', projectName: 'Louvre Abu Dhabi Residences', developer: 'Aldar', startingPriceAed: 4_100_000, location: 'Saadiyat Island', status: 'active', commissionPercentage: 4, createdAt: ts('2026-01-01T00:00:00Z') },
    ] as const;
    PRES_PROJECTS.forEach(({ id: projId, ...data }) => {
        batch1.set(doc(db, 'crm_projects', projId), data);
    });

    // 1b. Users
    const PRES_USERS = [
        { id: 'u_mgr_amr', name: 'Amr ElFangary', role: 'branch_manager', branch: 'Abu Dhabi HQ', email: 'propertyshopinvest@gmail.com', status: 'active', joinedAt: ts('2020-01-01T00:00:00Z') },
        { id: 'u_agt_sara', name: 'Sara Almarzouqi', role: 'agent', branch: 'Abu Dhabi HQ', status: 'active', closeRate: 12.4, joinedAt: ts('2021-03-01T00:00:00Z') },
        { id: 'u_agt_khalid', name: 'Khalid Al-Mansouri', role: 'agent', branch: 'Dubai Marina', status: 'active', closeRate: 15.1, joinedAt: ts('2019-06-01T00:00:00Z') },
    ] as const;
    PRES_USERS.forEach(({ id: userId, ...data }) => {
        batch1.set(doc(db, 'users', userId), data);
    });

    // 1c. Event
    batch1.set(doc(db, 'events', 'evt_moscow_26'), {
        name: 'Moscow Luxury Property Expo 2026',
        status: 'active',
        startDate: '2026-03-15',
        endDate: '2026-03-18',
        budget: 150_000,
        sponsorship: 150_000,
        targetLeads: 300,
        location: 'Moscow, Russia',
        createdAt: ts('2026-01-10T09:00:00Z'),
        updatedAt: ts('2026-03-01T08:00:00Z'),
    });

    await batch1.commit();
    console.log(`  ✔ Batch 1 committed — ${PRES_PROJECTS.length} projects, ${PRES_USERS.length} users, 1 event`);

    // ── Sub-collections (sequential — parent docs must exist first) ───────────

    // events/evt_moscow_26/roster
    const PRES_ROSTER = [
        { id: 'roster_sara', userId: 'u_agt_sara', status: 'approved', financialTier: 'Gold', commissionSplit: 50, logisticsComplete: true, joinedAt: ts('2026-01-15T09:00:00Z') },
        { id: 'roster_khalid', userId: 'u_agt_khalid', status: 'pending_logistics', financialTier: 'Silver', commissionSplit: 30, logisticsComplete: false, joinedAt: ts('2026-01-20T10:00:00Z') },
    ] as const;
    for (const { id: rosterId, ...rosterData } of PRES_ROSTER) {
        await setDoc(doc(db, 'events', 'evt_moscow_26', 'roster', rosterId), rosterData);
    }
    console.log(`  ✔ ${PRES_ROSTER.length} roster entries written (events/evt_moscow_26/roster)`);

    // events/evt_moscow_26/expenses
    const PRES_EXPENSES = [
        { id: 'exp_001', category: 'Venue', amount: 65_000, currency: 'AED', description: 'Booth Construction & Space', loggedBy: 'u_mgr_amr', loggedAt: ts('2026-02-10T10:00:00Z') },
        { id: 'exp_002', category: 'Travel', amount: 18_500, currency: 'AED', description: 'Emirates Business Class Flights', loggedBy: 'u_mgr_amr', loggedAt: ts('2026-02-15T11:00:00Z') },
    ] as const;
    for (const { id: expId, ...expData } of PRES_EXPENSES) {
        await setDoc(doc(db, 'events', 'evt_moscow_26', 'expenses', expId), expData);
    }
    console.log(`  ✔ ${PRES_EXPENSES.length} expenses written (events/evt_moscow_26/expenses)`);

    // ── Batch 2: crm_leads (10 leads — 6 Sara, 4 Khalid) ─────────────────────
    const batch2 = writeBatch(db);

    const PRES_LEADS = [
        // Sara — 6 leads
        { id: 'lead_p_001', eventId: 'evt_moscow_26', assignedAgentId: 'u_agt_sara', assignedAgentName: 'Sara Almarzouqi', status: 'Qualified', projectInterest: 'p_vida', fullName: 'Natalia Petrova', nationality: 'Russian', budget: 2_800_000, source: 'walk_in', createdAt: ts('2026-03-15T10:30:00Z') },
        { id: 'lead_p_002', eventId: 'evt_moscow_26', assignedAgentId: 'u_agt_sara', assignedAgentName: 'Sara Almarzouqi', status: 'Proposal Sent', projectInterest: 'p_mamsha', fullName: 'Irina Sorokina', nationality: 'Russian', budget: 4_200_000, source: 'referral', createdAt: ts('2026-03-15T11:00:00Z') },
        { id: 'lead_p_003', eventId: 'evt_moscow_26', assignedAgentId: 'u_agt_sara', assignedAgentName: 'Sara Almarzouqi', status: 'New', projectInterest: 'p_vida', fullName: 'Yelena Kuznetsova', nationality: 'Russian', budget: 2_200_000, source: 'event_registration', createdAt: ts('2026-03-16T09:00:00Z') },
        { id: 'lead_p_004', eventId: 'evt_moscow_26', assignedAgentId: 'u_agt_sara', assignedAgentName: 'Sara Almarzouqi', status: 'Qualified', projectInterest: 'p_mamsha', fullName: 'Olga Volkova', nationality: 'Kazakhstani', budget: 3_800_000, source: 'walk_in', createdAt: ts('2026-03-16T14:00:00Z') },
        { id: 'lead_p_005', eventId: 'evt_moscow_26', assignedAgentId: 'u_agt_sara', assignedAgentName: 'Sara Almarzouqi', status: 'Proposal Sent', projectInterest: 'p_vida', fullName: 'Anastasia Romanova', nationality: 'Russian', budget: 2_600_000, source: 'social_media', createdAt: ts('2026-03-17T10:00:00Z') },
        { id: 'lead_p_006', eventId: 'evt_moscow_26', assignedAgentId: 'u_agt_sara', assignedAgentName: 'Sara Almarzouqi', status: 'New', projectInterest: 'p_mamsha', fullName: 'Maria Belova', nationality: 'Russian', budget: 3_500_000, source: 'partner_agency', createdAt: ts('2026-03-17T15:00:00Z') },
        // Khalid — 4 leads
        { id: 'lead_p_007', eventId: 'evt_moscow_26', assignedAgentId: 'u_agt_khalid', assignedAgentName: 'Khalid Al-Mansouri', status: 'Proposal Sent', projectInterest: 'p_mamsha', fullName: 'Dmitri Volkov', nationality: 'Russian', budget: 5_500_000, source: 'vip_invitation', createdAt: ts('2026-03-15T12:00:00Z') },
        { id: 'lead_p_008', eventId: 'evt_moscow_26', assignedAgentId: 'u_agt_khalid', assignedAgentName: 'Khalid Al-Mansouri', status: 'Qualified', projectInterest: 'p_mamsha', fullName: 'Viktor Morozov', nationality: 'Russian', budget: 4_800_000, source: 'walk_in', createdAt: ts('2026-03-16T10:30:00Z') },
        { id: 'lead_p_009', eventId: 'evt_moscow_26', assignedAgentId: 'u_agt_khalid', assignedAgentName: 'Khalid Al-Mansouri', status: 'New', projectInterest: 'p_vida', fullName: 'Andrei Orlov', nationality: 'Georgian', budget: 2_400_000, source: 'walk_in', createdAt: ts('2026-03-17T09:00:00Z') },
        { id: 'lead_p_010', eventId: 'evt_moscow_26', assignedAgentId: 'u_agt_khalid', assignedAgentName: 'Khalid Al-Mansouri', status: 'Proposal Sent', projectInterest: 'p_vida', fullName: 'Sergei Kalinichenko', nationality: 'Russian', budget: 2_900_000, source: 'referral', createdAt: ts('2026-03-17T13:30:00Z') },
    ];

    PRES_LEADS.forEach(({ id: leadId, ...leadData }) => {
        batch2.set(doc(db, 'crm_leads', leadId), leadData);
    });
    await batch2.commit();
    console.log(`  ✔ ${PRES_LEADS.length} leads written — 6 Sara, 4 Khalid`);

    // ── Summary ───────────────────────────────────────────────────────────────
    const totalDocs = PRES_PROJECTS.length + PRES_USERS.length + 1 + PRES_ROSTER.length + PRES_EXPENSES.length + PRES_LEADS.length;
    console.log(`\n✅ Presentation seeder complete — ${totalDocs} documents written`);
    console.groupEnd();

    alert(
        'Enterprise Data Injected Successfully! ✅\n\n' +
        `• ${PRES_PROJECTS.length} Projects   (crm_projects)\n` +
        `• ${PRES_USERS.length} Users       (users)\n` +
        `• 1 Event        (events/evt_moscow_26)\n` +
        `• ${PRES_ROSTER.length} Roster      (events/evt_moscow_26/roster)\n` +
        `• ${PRES_EXPENSES.length} Expenses   (events/evt_moscow_26/expenses)\n` +
        `• ${PRES_LEADS.length} Leads       (crm_leads — 6 Sara · 4 Khalid)\n\n` +
        `Total: ${totalDocs} documents`
    );
}
