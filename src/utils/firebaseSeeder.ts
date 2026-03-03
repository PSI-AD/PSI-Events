/**
 * firebaseSeeder.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * PSI Event Portal — Firestore Data Seeder
 *
 * Exports two seeder functions:
 *
 *   injectSeedData()
 *   ─────────────────
 *   The "one-click demo ready" seeder. Populates every collection the app
 *   reads from so the Firestore console shows data immediately.
 *
 *   Collections written (8):
 *     • crm_projects     — 3 premium UAE developments
 *     • events           — 2 active roadshow events
 *     • crm_users        — 1 manager + 2 agents
 *     • event_rosters    — 3 agents on the London roadshow
 *     • bounties         — 2 active agent incentive challenges
 *     • expenses         — 2 itemised expense lines
 *     • checklists       — 2 pre-event tasks
 *     • crm_leads        — 2 qualified leads
 *
 *   injectPresentationData()
 *   ─────────────────────────
 *   Legacy executive-demo seeder kept for backwards compatibility.
 *
 * WARNING:
 *   Both functions write REAL data to your Firestore instance.
 *   Safe to run multiple times — all writes use doc IDs (upsert/set).
 */

import {
    doc,
    writeBatch,
    serverTimestamp,
    Timestamp,
    setDoc,
} from 'firebase/firestore';
import { db } from '../services/firebase/firebaseConfig';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Convert an ISO string to a Firestore Timestamp (used for fixed past/future dates) */
function ts(iso: string): Timestamp {
    return Timestamp.fromDate(new Date(iso));
}

// ─────────────────────────────────────────────────────────────────────────────
// Canonical IDs  (referenced across collections for consistent cross-linking)
// ─────────────────────────────────────────────────────────────────────────────

const IDS = {
    // Projects
    projVida: 'proj_vida_residence',
    projMamsha: 'proj_mamsha_gardens',
    projLouvre: 'proj_louvre_residences',

    // Events
    evtLondon: 'evt_london_vip_2026',
    evtMoscow: 'evt_moscow_expo_2026',

    // Users
    usrAmr: 'usr_amr_elfangary',
    usrSara: 'usr_sara_almarzouqi',
    usrKhalid: 'usr_khalid_almansouri',

    // Rosters
    rosterAmrLdn: 'roster_amr_london',
    rosterSaraLdn: 'roster_sara_london',
    rosterKhalidLdn: 'roster_khalid_london',

    // Bounties
    bountyPenthouse: 'bounty_sell_two_penthouses',
    bountyFirstDay: 'bounty_first_day_closer',

    // Expenses
    expVenue: 'exp_london_venue_deposit',
    expFlights: 'exp_london_flights',

    // Checklists
    chkVisa: 'chk_sara_visa_upload',
    chkCatering: 'chk_amr_catering',

    // Leads
    leadAhmed: 'lead_ahmed_almaktoum',
    leadJohn: 'lead_john_smith',
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SEEDER — injectSeedData
// ─────────────────────────────────────────────────────────────────────────────

export async function injectSeedData(): Promise<{
    success: boolean;
    written: Record<string, number>;
    errors: string[];
    durationMs: number;
}> {
    const t0 = Date.now();
    const written: Record<string, number> = {};
    const errors: string[] = [];

    console.group('🌱 PSI Seeder — injectSeedData()');

    try {
        // ── Batch 1: Projects, Events, Users ─────────────────────────────────
        console.log('📦 Batch 1 — crm_projects, events, crm_users...');
        const b1 = writeBatch(db);

        // ── A. crm_projects ──────────────────────────────────────────────────
        b1.set(doc(db, 'crm_projects', IDS.projVida), {
            projectName: 'Vida Residence',
            developer: 'Emaar',
            location: 'Dubai Marina, Dubai',
            startingPriceAed: 2_200_000,
            commissionPercentage: 5,
            status: 'active',
            description: 'Waterfront luxury residences by Emaar with panoramic marina views.',
            bedroomOptions: [1, 2, 3],
            handoverYear: 2027,
            imageUrl: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800',
            createdAt: ts('2026-01-01T09:00:00Z'),
        });

        b1.set(doc(db, 'crm_projects', IDS.projMamsha), {
            projectName: 'Mamsha Gardens',
            developer: 'Aldar',
            location: 'Saadiyat Island, Abu Dhabi',
            startingPriceAed: 3_500_000,
            commissionPercentage: 4,
            status: 'active',
            description: 'Beachfront villas and apartments on Abu Dhabi\'s cultural island.',
            bedroomOptions: [2, 3, 4],
            handoverYear: 2027,
            imageUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800',
            createdAt: ts('2026-01-01T09:00:00Z'),
        });

        b1.set(doc(db, 'crm_projects', IDS.projLouvre), {
            projectName: 'Louvre Abu Dhabi Residences',
            developer: 'Aldar',
            location: 'Saadiyat Island, Abu Dhabi',
            startingPriceAed: 4_100_000,
            commissionPercentage: 4,
            status: 'active',
            description: 'Ultra-prime residences adjacent to the Louvre Abu Dhabi museum.',
            bedroomOptions: [2, 3, 4, 5],
            handoverYear: 2028,
            imageUrl: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800',
            createdAt: ts('2026-01-01T09:00:00Z'),
        });

        written.crm_projects = 3;

        // ── B. events ────────────────────────────────────────────────────────
        b1.set(doc(db, 'events', IDS.evtLondon), {
            name: 'London VIP Roadshow',
            status: 'active',
            location: 'The Dorchester, Park Lane, London',
            startDate: '2026-04-10',
            endDate: '2026-04-13',
            budget: 120_000,
            sponsorship: 80_000,
            targetLeads: 450,
            actualLeads: 312,
            closedRevenueAed: 6_600_000,
            currency: 'AED',
            projectIds: [IDS.projVida, IDS.projMamsha, IDS.projLouvre],
            createdAt: ts('2026-02-01T09:00:00Z'),
            updatedAt: ts('2026-03-01T08:00:00Z'),
        });

        b1.set(doc(db, 'events', IDS.evtMoscow), {
            name: 'Moscow Luxury Property Expo',
            status: 'upcoming',
            location: 'Crocus Expo, Moscow, Russia',
            startDate: '2026-06-15',
            endDate: '2026-06-18',
            budget: 150_000,
            sponsorship: 150_000,
            targetLeads: 300,
            actualLeads: 0,
            closedRevenueAed: 0,
            currency: 'AED',
            projectIds: [IDS.projVida, IDS.projMamsha],
            createdAt: ts('2026-03-01T09:00:00Z'),
            updatedAt: ts('2026-03-01T09:00:00Z'),
        });

        written.events = 2;

        // ── C. crm_users ─────────────────────────────────────────────────────
        b1.set(doc(db, 'crm_users', IDS.usrAmr), {
            name: 'Amr ElFangary',
            email: 'propertyshopinvest@gmail.com',
            phone: '+971-50-100-0000',
            role: 'branch_manager',
            branch: 'Global',
            tier: 'Platinum',
            status: 'active',
            closeRate: 18.5,
            totalSalesAed: 42_000_000,
            joinedAt: ts('2020-01-01T00:00:00Z'),
            avatarInitials: 'AE',
            nationality: 'Egyptian',
        });

        b1.set(doc(db, 'crm_users', IDS.usrSara), {
            name: 'Sara Almarzouqi',
            email: 'sara.almarzouqi@psi.ae',
            phone: '+971-50-200-0001',
            role: 'agent',
            branch: 'Abu Dhabi HQ',
            tier: 'Gold',
            status: 'active',
            closeRate: 12.4,
            totalSalesAed: 18_500_000,
            joinedAt: ts('2021-03-01T00:00:00Z'),
            avatarInitials: 'SA',
            nationality: 'Emirati',
        });

        b1.set(doc(db, 'crm_users', IDS.usrKhalid), {
            name: 'Khalid Al-Mansouri',
            email: 'khalid.almansouri@psi.ae',
            phone: '+971-55-300-0002',
            role: 'agent',
            branch: 'Dubai Marina',
            tier: 'Silver',
            status: 'active',
            closeRate: 15.1,
            totalSalesAed: 24_200_000,
            joinedAt: ts('2019-06-01T00:00:00Z'),
            avatarInitials: 'KM',
            nationality: 'Emirati',
        });

        written.crm_users = 3;

        await b1.commit();
        console.log('✅ Batch 1 committed — 3 projects, 2 events, 3 users');

        // ── Batch 2: Rosters, Bounties, Expenses, Checklists, Leads ──────────
        console.log('📦 Batch 2 — rosters, bounties, expenses, checklists, leads...');
        const b2 = writeBatch(db);

        // ── D. event_rosters (London) ────────────────────────────────────────
        b2.set(doc(db, 'event_rosters', IDS.rosterAmrLdn), {
            eventId: IDS.evtLondon,
            eventName: 'London VIP Roadshow',
            userId: IDS.usrAmr,
            agentName: 'Amr ElFangary',
            agentEmail: 'propertyshopinvest@gmail.com',
            branch: 'Global',
            tier: 'Platinum',
            role: 'branch_manager',
            status: 'physically_present',
            managerApproved: true,
            flightUploaded: true,
            visaUploaded: true,
            commissionSplit: 10,
            closedRevenueAed: 4_500_000,
            leadsAssigned: 85,
            leadsClosed: 14,
            roundRobinIndex: 0,
            checkedInAt: ts('2026-04-10T08:00:00Z'),
            joinedAt: ts('2026-02-05T10:00:00Z'),
        });

        b2.set(doc(db, 'event_rosters', IDS.rosterSaraLdn), {
            eventId: IDS.evtLondon,
            eventName: 'London VIP Roadshow',
            userId: IDS.usrSara,
            agentName: 'Sara Almarzouqi',
            agentEmail: 'sara.almarzouqi@psi.ae',
            branch: 'Abu Dhabi HQ',
            tier: 'Gold',
            role: 'agent',
            status: 'physically_present',
            managerApproved: true,
            flightUploaded: true,
            visaUploaded: true,
            commissionSplit: 50,
            closedRevenueAed: 2_100_000,
            leadsAssigned: 124,
            leadsClosed: 8,
            roundRobinIndex: 1,
            checkedInAt: ts('2026-04-10T08:30:00Z'),
            joinedAt: ts('2026-02-06T11:00:00Z'),
        });

        b2.set(doc(db, 'event_rosters', IDS.rosterKhalidLdn), {
            eventId: IDS.evtLondon,
            eventName: 'London VIP Roadshow',
            userId: IDS.usrKhalid,
            agentName: 'Khalid Al-Mansouri',
            agentEmail: 'khalid.almansouri@psi.ae',
            branch: 'Dubai Marina',
            tier: 'Silver',
            role: 'agent',
            status: 'pending_logistics',
            managerApproved: true,
            flightUploaded: true,
            visaUploaded: false,
            commissionSplit: 40,
            closedRevenueAed: 0,
            leadsAssigned: 103,
            leadsClosed: 0,
            roundRobinIndex: 2,
            joinedAt: ts('2026-02-10T09:00:00Z'),
        });

        written.event_rosters = 3;

        // ── E. bounties ───────────────────────────────────────────────────────
        b2.set(doc(db, 'bounties', IDS.bountyPenthouse), {
            title: 'Sell 2 Penthouses',
            description: 'First agent to close 2 penthouse units earns a 2% bonus on both deals.',
            reward: '2% Commission Bonus',
            rewardType: 'commission_bonus',
            rewardValuePercent: 2,
            status: 'Active',
            eventId: IDS.evtLondon,
            targetProjectIds: [IDS.projLouvre, IDS.projMamsha],
            progressCount: 1,
            targetCount: 2,
            currentLeaderId: IDS.usrSara,
            currentLeaderName: 'Sara Almarzouqi',
            createdAt: ts('2026-02-15T09:00:00Z'),
            expiresAt: ts('2026-04-13T23:59:59Z'),
            createdBy: IDS.usrAmr,
        });

        b2.set(doc(db, 'bounties', IDS.bountyFirstDay), {
            title: 'First Day Closer',
            description: 'Agent with highest revenue on Day 1 of event receives AED 5,000 cash reward.',
            reward: 'AED 5,000 Cash',
            rewardType: 'cash',
            rewardValueAed: 5_000,
            status: 'Active',
            eventId: IDS.evtLondon,
            targetProjectIds: [],
            progressCount: 0,
            targetCount: 1,
            currentLeaderId: null,
            currentLeaderName: null,
            createdAt: ts('2026-02-15T09:00:00Z'),
            expiresAt: ts('2026-04-10T23:59:59Z'),
            createdBy: IDS.usrAmr,
        });

        written.bounties = 2;

        // ── F. expenses ───────────────────────────────────────────────────────
        b2.set(doc(db, 'expenses', IDS.expVenue), {
            eventId: IDS.evtLondon,
            eventName: 'London VIP Roadshow',
            category: 'Venue',
            subcategory: 'Deposit',
            amount: 50_000,
            amountAed: 50_000,
            currency: 'AED',
            status: 'Approved',
            description: 'The Dorchester — exclusive event space deposit for 3 nights',
            vendorName: 'The Dorchester Hotel',
            receiptRef: 'DORCH-PSI-2026-001',
            paidBy: 'Branch',
            loggedBy: IDS.usrAmr,
            approvedBy: IDS.usrAmr,
            createdAt: ts('2026-02-10T10:00:00Z'),
        });

        b2.set(doc(db, 'expenses', IDS.expFlights), {
            eventId: IDS.evtLondon,
            eventName: 'London VIP Roadshow',
            category: 'Travel',
            subcategory: 'Flights & Accommodation',
            amount: 25_000,
            amountAed: 25_000,
            currency: 'AED',
            status: 'Pending',
            description: 'Emirates Business Class — 3 agents return LHR + 2 nights Park Lane hotel',
            vendorName: 'Emirates Airlines / Booking.com',
            receiptRef: 'EK-PSI-LDN-2026-002',
            paidBy: 'Agent',
            loggedBy: IDS.usrAmr,
            approvedBy: null,
            createdAt: ts('2026-02-18T11:00:00Z'),
        });

        written.expenses = 2;

        // ── G. checklists ─────────────────────────────────────────────────────
        b2.set(doc(db, 'checklists', IDS.chkVisa), {
            eventId: IDS.evtLondon,
            eventName: 'London VIP Roadshow',
            task: 'Upload UK Visa',
            description: 'Sara must upload a copy of her valid UK multiple-entry visa to the portal.',
            assignedTo: 'Sara Almarzouqi',
            assignedUserId: IDS.usrSara,
            status: 'Done',
            priority: 'Critical',
            doneAt: ts('2026-03-01T14:30:00Z'),
            dueDate: ts('2026-03-05T23:59:59Z'),
            createdAt: ts('2026-02-20T09:00:00Z'),
            createdBy: IDS.usrAmr,
        });

        b2.set(doc(db, 'checklists', IDS.chkCatering), {
            eventId: IDS.evtLondon,
            eventName: 'London VIP Roadshow',
            task: 'Confirm VIP Catering',
            description: 'Coordinate with Dorchester banquet team — confirm guest count (40 pax) and Halal menu.',
            assignedTo: 'Amr ElFangary',
            assignedUserId: IDS.usrAmr,
            status: 'Pending',
            priority: 'High',
            doneAt: null,
            dueDate: ts('2026-04-01T17:00:00Z'),
            createdAt: ts('2026-02-22T10:00:00Z'),
            createdBy: IDS.usrAmr,
        });

        written.checklists = 2;

        // ── H. crm_leads ──────────────────────────────────────────────────────
        b2.set(doc(db, 'crm_leads', IDS.leadAhmed), {
            fullName: 'Ahmed Al Maktoum',
            name: 'Ahmed Al Maktoum',
            email: 'ahmed.almaktoum@example.ae',
            phone: '+971-50-100-0001',
            nationality: 'Emirati',
            interest: 'Vida Residence',
            interestedProjectId: IDS.projVida,
            stage: 'Hot',
            status: 'qualified',
            budget: '5M AED',
            budgetAed: 5_000_000,
            source: 'vip_invitation',
            eventId: IDS.evtLondon,
            assignedAgentId: IDS.usrKhalid,
            assignedAgentName: 'Khalid Al-Mansouri',
            notes: 'VIP guest. Interested in penthouse unit. Has visited Vida show apartment twice.',
            lastContactedAt: ts('2026-04-10T15:00:00Z'),
            createdAt: ts('2026-04-10T11:00:00Z'),
            updatedAt: ts('2026-04-10T15:00:00Z'),
        });

        b2.set(doc(db, 'crm_leads', IDS.leadJohn), {
            fullName: 'John Smith',
            name: 'John Smith',
            email: 'john.smith@example.co.uk',
            phone: '+44-79-0000-0002',
            nationality: 'British',
            interest: 'Mamsha Gardens',
            interestedProjectId: IDS.projMamsha,
            stage: 'Warm',
            status: 'contacted',
            budget: '3.5M AED',
            budgetAed: 3_500_000,
            source: 'walk_in',
            eventId: IDS.evtLondon,
            assignedAgentId: IDS.usrSara,
            assignedAgentName: 'Sara Almarzouqi',
            notes: 'Walk-in lead from event floor. Already owns a property in Dubai. Interested in Saadiyat for portfolio diversification.',
            lastContactedAt: ts('2026-04-11T10:00:00Z'),
            createdAt: ts('2026-04-11T09:30:00Z'),
            updatedAt: ts('2026-04-11T10:00:00Z'),
        });

        written.crm_leads = 2;

        await b2.commit();
        console.log('✅ Batch 2 committed — 3 rosters, 2 bounties, 2 expenses, 2 checklists, 2 leads');

    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push(message);
        console.error('❌ Seeder error:', message);
    }

    const durationMs = Date.now() - t0;
    const totalDocs = Object.values(written).reduce((s, n) => s + n, 0);

    // ── Summary log ───────────────────────────────────────────────────────────
    console.log('\n─────────────────────────────────────────');
    console.log(`📊 Seeder Summary (${durationMs}ms)`);
    Object.entries(written).forEach(([col, count]) => {
        console.log(`   ${col.padEnd(20)} → ${count} documents`);
    });
    console.log(`   ${'TOTAL'.padEnd(20)} → ${totalDocs} documents`);
    if (errors.length > 0) {
        console.warn('⚠️  Errors:', errors);
    } else {
        console.log('✅ All data injected successfully — no errors.');
    }
    console.groupEnd();

    return { success: errors.length === 0, written, errors, durationMs };
}

// ─────────────────────────────────────────────────────────────────────────────
// PRESENTATION SEEDER  (executive boardroom demo — canonical IDs from brief)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * injectPresentationData
 * ──────────────────────
 * Writes the exact payload for the executive boardroom demo.
 * Uses canonical IDs so cross-references work in every UI component.
 *
 * Collections:
 *   crm_projects × 3  |  users × 3  |  events × 1
 *   events/{id}/roster × 2  |  events/{id}/expenses × 2
 *   crm_leads × 10  (6 Sara · 4 Khalid)
 */
export async function injectPresentationData(): Promise<void> {
    console.group('🎯 PSI Presentation Seeder — Injecting demo data');

    const batch1 = writeBatch(db);

    // Projects
    const PRES_PROJECTS = [
        { id: 'p_vida', projectName: 'Vida Residence', developer: 'Emaar', startingPriceAed: 2_200_000, location: 'Dubai Marina', status: 'active', commissionPercentage: 5, createdAt: ts('2026-01-01T00:00:00Z') },
        { id: 'p_mamsha', projectName: 'Mamsha Gardens', developer: 'Aldar', startingPriceAed: 3_500_000, location: 'Saadiyat Island', status: 'active', commissionPercentage: 4, createdAt: ts('2026-01-01T00:00:00Z') },
        { id: 'p_louvre', projectName: 'Louvre Abu Dhabi Residences', developer: 'Aldar', startingPriceAed: 4_100_000, location: 'Saadiyat Island', status: 'active', commissionPercentage: 4, createdAt: ts('2026-01-01T00:00:00Z') },
    ] as const;
    PRES_PROJECTS.forEach(({ id, ...data }) => batch1.set(doc(db, 'crm_projects', id), data));

    // Users
    const PRES_USERS = [
        { id: 'u_mgr_amr', name: 'Amr ElFangary', role: 'branch_manager', branch: 'Abu Dhabi HQ', email: 'propertyshopinvest@gmail.com', status: 'active', closeRate: 18.5, joinedAt: ts('2020-01-01T00:00:00Z') },
        { id: 'u_agt_sara', name: 'Sara Almarzouqi', role: 'agent', branch: 'Abu Dhabi HQ', email: 'sara@psi.ae', status: 'active', closeRate: 12.4, joinedAt: ts('2021-03-01T00:00:00Z') },
        { id: 'u_agt_khalid', name: 'Khalid Al-Mansouri', role: 'agent', branch: 'Dubai Marina', email: 'khalid@psi.ae', status: 'active', closeRate: 15.1, joinedAt: ts('2019-06-01T00:00:00Z') },
    ] as const;
    PRES_USERS.forEach(({ id, ...data }) => batch1.set(doc(db, 'users', id), data));

    // Event
    batch1.set(doc(db, 'events', 'evt_moscow_26'), {
        name: 'Moscow Luxury Property Expo 2026', status: 'active',
        startDate: '2026-03-15', endDate: '2026-03-18',
        budget: 150_000, sponsorship: 150_000, targetLeads: 300,
        location: 'Moscow, Russia',
        createdAt: ts('2026-01-10T09:00:00Z'),
        updatedAt: ts('2026-03-01T08:00:00Z'),
    });

    await batch1.commit();
    console.log('✔ Batch 1 — 3 projects, 3 users, 1 event');

    // Sub-collections
    for (const { id: rosterId, ...data } of [
        { id: 'roster_sara', userId: 'u_agt_sara', status: 'approved', financialTier: 'Gold', commissionSplit: 50, logisticsComplete: true, joinedAt: ts('2026-01-15T09:00:00Z') },
        { id: 'roster_khalid', userId: 'u_agt_khalid', status: 'pending_logistics', financialTier: 'Silver', commissionSplit: 30, logisticsComplete: false, joinedAt: ts('2026-01-20T10:00:00Z') },
    ] as const) {
        await setDoc(doc(db, 'events', 'evt_moscow_26', 'roster', rosterId), data);
    }

    for (const { id: expId, ...data } of [
        { id: 'exp_001', category: 'Venue', amount: 65_000, currency: 'AED', description: 'Booth Construction & Space', loggedBy: 'u_mgr_amr', loggedAt: ts('2026-02-10T10:00:00Z') },
        { id: 'exp_002', category: 'Travel', amount: 18_500, currency: 'AED', description: 'Emirates Business Class Flights', loggedBy: 'u_mgr_amr', loggedAt: ts('2026-02-15T11:00:00Z') },
    ] as const) {
        await setDoc(doc(db, 'events', 'evt_moscow_26', 'expenses', expId), data);
    }

    // Leads
    const batch2 = writeBatch(db);
    const PRES_LEADS = [
        { id: 'lead_p_001', assignedAgentId: 'u_agt_sara', assignedAgentName: 'Sara Almarzouqi', status: 'Qualified', projectInterest: 'p_vida', fullName: 'Natalia Petrova', nationality: 'Russian', budget: 2_800_000, source: 'walk_in', eventId: 'evt_moscow_26', createdAt: ts('2026-03-15T10:30:00Z') },
        { id: 'lead_p_002', assignedAgentId: 'u_agt_sara', assignedAgentName: 'Sara Almarzouqi', status: 'Proposal Sent', projectInterest: 'p_mamsha', fullName: 'Irina Sorokina', nationality: 'Russian', budget: 4_200_000, source: 'referral', eventId: 'evt_moscow_26', createdAt: ts('2026-03-15T11:00:00Z') },
        { id: 'lead_p_003', assignedAgentId: 'u_agt_sara', assignedAgentName: 'Sara Almarzouqi', status: 'New', projectInterest: 'p_vida', fullName: 'Yelena Kuznetsova', nationality: 'Russian', budget: 2_200_000, source: 'event_registration', eventId: 'evt_moscow_26', createdAt: ts('2026-03-16T09:00:00Z') },
        { id: 'lead_p_004', assignedAgentId: 'u_agt_sara', assignedAgentName: 'Sara Almarzouqi', status: 'Qualified', projectInterest: 'p_mamsha', fullName: 'Olga Volkova', nationality: 'Kazakhstani', budget: 3_800_000, source: 'walk_in', eventId: 'evt_moscow_26', createdAt: ts('2026-03-16T14:00:00Z') },
        { id: 'lead_p_005', assignedAgentId: 'u_agt_sara', assignedAgentName: 'Sara Almarzouqi', status: 'Proposal Sent', projectInterest: 'p_vida', fullName: 'Anastasia Romanova', nationality: 'Russian', budget: 2_600_000, source: 'social_media', eventId: 'evt_moscow_26', createdAt: ts('2026-03-17T10:00:00Z') },
        { id: 'lead_p_006', assignedAgentId: 'u_agt_sara', assignedAgentName: 'Sara Almarzouqi', status: 'New', projectInterest: 'p_mamsha', fullName: 'Maria Belova', nationality: 'Russian', budget: 3_500_000, source: 'partner_agency', eventId: 'evt_moscow_26', createdAt: ts('2026-03-17T15:00:00Z') },
        { id: 'lead_p_007', assignedAgentId: 'u_agt_khalid', assignedAgentName: 'Khalid Al-Mansouri', status: 'Proposal Sent', projectInterest: 'p_mamsha', fullName: 'Dmitri Volkov', nationality: 'Russian', budget: 5_500_000, source: 'vip_invitation', eventId: 'evt_moscow_26', createdAt: ts('2026-03-15T12:00:00Z') },
        { id: 'lead_p_008', assignedAgentId: 'u_agt_khalid', assignedAgentName: 'Khalid Al-Mansouri', status: 'Qualified', projectInterest: 'p_mamsha', fullName: 'Viktor Morozov', nationality: 'Russian', budget: 4_800_000, source: 'walk_in', eventId: 'evt_moscow_26', createdAt: ts('2026-03-16T10:30:00Z') },
        { id: 'lead_p_009', assignedAgentId: 'u_agt_khalid', assignedAgentName: 'Khalid Al-Mansouri', status: 'New', projectInterest: 'p_vida', fullName: 'Andrei Orlov', nationality: 'Georgian', budget: 2_400_000, source: 'walk_in', eventId: 'evt_moscow_26', createdAt: ts('2026-03-17T09:00:00Z') },
        { id: 'lead_p_010', assignedAgentId: 'u_agt_khalid', assignedAgentName: 'Khalid Al-Mansouri', status: 'Proposal Sent', projectInterest: 'p_vida', fullName: 'Sergei Kalinichenko', nationality: 'Russian', budget: 2_900_000, source: 'referral', eventId: 'evt_moscow_26', createdAt: ts('2026-03-17T13:30:00Z') },
    ];
    PRES_LEADS.forEach(({ id, ...data }) => batch2.set(doc(db, 'crm_leads', id), data));
    await batch2.commit();

    const total = PRES_PROJECTS.length + PRES_USERS.length + 1 + 2 + 2 + PRES_LEADS.length;
    console.log(`\n✅ Presentation seeder complete — ${total} documents written`);
    console.groupEnd();

    alert(
        '✅ Enterprise Data Injected!\n\n' +
        `• 3 Projects    (crm_projects)\n` +
        `• 3 Users       (users)\n` +
        `• 1 Event       (events/evt_moscow_26)\n` +
        `• 2 Roster      (events/evt_moscow_26/roster)\n` +
        `• 2 Expenses    (events/evt_moscow_26/expenses)\n` +
        `• 10 Leads      (crm_leads — 6 Sara · 4 Khalid)\n\n` +
        `Total: ${total} documents`
    );
}
