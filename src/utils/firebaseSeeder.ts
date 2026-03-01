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
 *   • crm_leads             — 18 leads tied to the Moscow event
 *   • event_rosters         — agent-event assignments with tier & financials
 *   • expenses              — 6 itemised expenses for the London event
 *   • agent_debts           — 2 outstanding clawback debts (for demo settlement)
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
