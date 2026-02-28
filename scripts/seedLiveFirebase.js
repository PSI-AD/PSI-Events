/**
 * seedLiveFirebase.js
 * ─────────────────────────────────────────────────────────────────────────────
 * High-fidelity live Firestore seeder for PSI Event Portal.
 * Injects realistic UAE real estate data for management presentations.
 *
 * ── Safety guardrails ──────────────────────────────────────────────────────
 * • Requires GOOGLE_APPLICATION_CREDENTIALS to point to a Service Account key,
 *   OR runs inside a CI environment with Application Default Credentials.
 * • Uses ONLY .doc('clean_id').set({...}) — ZERO auto-generated UUIDs.
 * • All batch writes are atomic: all succeed or all fail together.
 *
 * ── Run command ────────────────────────────────────────────────────────────
 *   node scripts/seedLiveFirebase.js --force     ← skip confirmation (recommended)
 *   node scripts/seedLiveFirebase.js              ← interactive Y/N prompt
 *
 * ── Prerequisites ──────────────────────────────────────────────────────────
 *   1. Download a Service Account key from Firebase Console:
 *      Project Settings → Service Accounts → Generate new private key
 *   2. Save it as: scripts/serviceAccountKey.json  (gitignored)
 *   3. Set: export GOOGLE_APPLICATION_CREDENTIALS="scripts/serviceAccountKey.json"
 *   4. Run: node scripts/seedLiveFirebase.js
 */

import admin from 'firebase-admin';
import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { createInterface } from 'readline';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── CLI flags ─────────────────────────────────────────────────────────────────
// --force skips the interactive Y/N prompt.
// Use this when running from a terminal that already has focus.

const FORCE = process.argv.includes('--force');

// ── Confirmation prompt ────────────────────────────────────────────────────────
// Only runs when --force is NOT passed.

async function confirm(question) {
    if (FORCE) return true; // --force bypasses prompt
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => {
        rl.question(question, answer => {
            rl.close();
            resolve(answer.trim().toUpperCase() === 'Y');
        });
    });
}

// ── Firebase Admin init ───────────────────────────────────────────────────────

function initFirebase() {
    if (admin.apps.length > 0) return; // already initialised

    const keyPath = join(__dirname, 'serviceAccountKey.json');

    try {
        const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'));
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
        console.log('✅ Initialised with Service Account:', serviceAccount.client_email);
    } catch {
        // Fall back to Application Default Credentials (CI / Cloud Run)
        admin.initializeApp();
        console.log('✅ Initialised with Application Default Credentials');
    }
}

// ── Timestamps ────────────────────────────────────────────────────────────────

const now = admin.firestore.Timestamp.now();
const TS = (iso) => admin.firestore.Timestamp.fromDate(new Date(iso));

// ── Seed data definitions ─────────────────────────────────────────────────────

const CRM_PROJECTS = [
    {
        id: 'proj_aldar_mamsha_gardens',
        data: {
            name: 'Mamsha Gardens',
            developer: 'Aldar Properties',
            developer_logo_url: 'https://logo.clearbit.com/aldar.com',
            tier: 'Luxury',
            price_range_aed: { min: 2_800_000, max: 12_500_000 },
            location: {
                city: 'Abu Dhabi',
                community: 'Yas Island',
                coordinates: { lat: 24.4672, lng: 54.6031 },
            },
            unit_types: ['1BR Apartment', '2BR Apartment', '3BR Apartment', 'Penthouse'],
            completion_date: '2026-Q4',
            handover_status: 'Off-Plan',
            commission_pct: 4.5,
            description: 'Mamsha Gardens is Aldar\'s flagship waterfront residential community on Yas Island, offering panoramic marina views and resort-style amenities. Exclusive PSI preferred-partner pricing.',
            amenities: [
                'Private Beach Access',
                'Infinity Pool',
                'Concierge Service',
                'Smart Home Integration',
                'Underground Parking',
            ],
            total_units: 480,
            sold_units: 312,
            commission_notes: 'Aldar pays 4.5% on SPA. Bonus 0.5% if agent closes >3 units per quarter.',
            is_featured: true,
            created_at: now,
            updated_at: now,
        },
    },
    {
        id: 'proj_emaar_marina_blue',
        data: {
            name: 'Marina Blue Residences',
            developer: 'Emaar Properties',
            developer_logo_url: 'https://logo.clearbit.com/emaar.com',
            tier: 'Medium',
            price_range_aed: { min: 850_000, max: 3_200_000 },
            location: {
                city: 'Dubai',
                community: 'Dubai Marina',
                coordinates: { lat: 25.0657, lng: 55.1403 },
            },
            unit_types: ['Studio', '1BR Apartment', '2BR Apartment', '3BR Apartment'],
            completion_date: '2025-Q2',
            handover_status: 'Ready',
            commission_pct: 3.5,
            description: 'Marina Blue is a statement address within Dubai Marina — a fully-handed-over, income-generating residential tower with immediate rental yields of 6–8% p.a. Ideal for international investors.',
            amenities: [
                'Rooftop Pool',
                'Fully-Fitted Kitchen',
                'Gymnasium',
                'Children\'s Play Area',
                'Marina View Balconies',
            ],
            total_units: 340,
            sold_units: 280,
            commission_notes: 'Emaar standard 3.5% on SPA. Paid within 30 days of handover.',
            is_featured: true,
            created_at: now,
            updated_at: now,
        },
    },
];

const CRM_USERS = [
    {
        id: 'usr_sara_almarzouqi_dxb',
        data: {
            full_name: 'Sara Al Marzouqi',
            email: 'sara.almarzouqi@propertyshop.ae',
            phone: '+971 50 234 5678',
            role: 'Agent',
            branch: 'Dubai Marina',
            nationality: 'Emirati',
            languages: ['Arabic', 'English'],
            specialisation: ['Luxury', 'Waterfront', 'Off-Plan'],
            rera_number: 'RERA-DXB-29843',
            performance: {
                total_closed_aed: 14_200_000,
                ytd_deals: 8,
                avg_deal_size_aed: 1_775_000,
                roadshows_attended: 4,
                roadshow_closings: 11,
            },
            preferred_projects: ['proj_emaar_marina_blue'],
            joined_at: TS('2022-03-15T09:00:00Z'),
            created_at: now,
            updated_at: now,
            is_active: true,
        },
    },
    {
        id: 'usr_khalid_mansouri_auh',
        data: {
            full_name: 'Khalid Mansouri',
            email: 'khalid.mansouri@propertyshop.ae',
            phone: '+971 55 876 4321',
            role: 'Agent',
            branch: 'Abu Dhabi Main',
            nationality: 'Emirati',
            languages: ['Arabic', 'English', 'French'],
            specialisation: ['Luxury', 'Developer Relations', 'Investment Units'],
            rera_number: 'RERA-AUH-18822',
            performance: {
                total_closed_aed: 28_500_000,
                ytd_deals: 14,
                avg_deal_size_aed: 2_035_714,
                roadshows_attended: 7,
                roadshow_closings: 22,
            },
            preferred_projects: ['proj_aldar_mamsha_gardens'],
            joined_at: TS('2020-07-01T09:00:00Z'),
            created_at: now,
            updated_at: now,
            is_active: true,
        },
    },
    {
        id: 'usr_mohammed_qubaisi_mgr',
        data: {
            full_name: 'Mohammed Al Qubaisi',
            email: 'm.qubaisi@propertyshop.ae',
            phone: '+971 50 999 1122',
            role: 'Manager',
            branch: 'Abu Dhabi Main',
            nationality: 'Emirati',
            languages: ['Arabic', 'English'],
            specialisation: ['Operations', 'Compliance', 'Roadshow Management'],
            rera_number: 'RERA-AUH-00441',
            approval_authority: true,
            manages_branches: ['Abu Dhabi Main', 'Al Reem Island'],
            performance: {
                team_size: 12,
                team_ytd_revenue_aed: 89_000_000,
                events_managed_ytd: 3,
            },
            joined_at: TS('2018-01-10T09:00:00Z'),
            created_at: now,
            updated_at: now,
            is_active: true,
        },
    },
    // Keep the canonical admin profile intact (created by Google Auth flow)
    {
        id: 'usr_said_abu_laila_admin',
        data: {
            name: 'Said Abu Laila',
            email: 'propertyshopinvest@gmail.com',
            role: 'God-Mode Organizer',
            branch: 'Abu Dhabi HQ',
            created_at: now,
            updated_at: now,
        },
    },
];

const EVENTS = [
    {
        id: 'evt_london_luxury_expo_oct2026',
        data: {
            name: 'London Luxury Property Show',
            description: 'PSI\'s flagship international roadshow targeting high-net-worth investors at the Old Billingsgate, London. Featuring exclusive Aldar and Emaar developer pavilions.',
            location: {
                city: 'London',
                country: 'United Kingdom',
                venue: 'Old Billingsgate, 1 Old Billingsgate Walk, London EC3R 6DX',
            },
            date_start: TS('2026-10-12T09:00:00Z'),
            date_end: TS('2026-10-15T20:00:00Z'),
            document_deadline: TS('2026-09-28T23:59:00Z'),
            status: 'Active',
            target_leads: 300,
            actual_leads: 0, // Pre-event — populates during roadshow
            is_sponsored: true,
            sponsorship: {
                developer: 'Aldar Properties',
                amount_aed: 150_000,
                confirmed_at: TS('2026-08-15T10:00:00Z'),
                contract_ref: 'ALDAR-PSI-2026-LDN-001',
            },
            budget: {
                type: 'Sponsored',
                target_gross_aed: 2_500_000,
                target_margin_pct: 40,
            },
            organizer_id: 'usr_said_abu_laila_admin',
            manager_id: 'usr_mohammed_qubaisi_mgr',
            roundRobinIndex: 0,
            created_at: now,
            updated_at: now,
        },
        // Subcollections handled separately below
    },
    {
        id: 'evt_cairo_invest_nov2026',
        data: {
            name: 'Cairo Investor Summit',
            description: 'A targeted investor summit in Cairo, Egypt, focused on Egyptian nationals and ex-pats holding GCC savings. Medium-tier event with a focus on Emaar entry-level products and off-plan ROI pitch.',
            location: {
                city: 'Cairo',
                country: 'Egypt',
                venue: 'Four Seasons Hotel Cairo at Nile Plaza, Garden City',
            },
            date_start: TS('2026-11-03T09:00:00Z'),
            date_end: TS('2026-11-04T20:00:00Z'),
            document_deadline: TS('2026-10-20T23:59:00Z'),
            status: 'Completed',
            target_leads: 150,
            actual_leads: 134,
            is_sponsored: false,
            sponsorship: null,
            budget: {
                type: 'Branch Funded',
                total_cost_aed: 95_000,
                gross_revenue_aed: 1_820_000,
                gross_profit_aed: 1_725_000,
                branch_net_profit_aed: 1_380_000,
                organizer_commission_aed: 172_500,
                net_roi_pct: 148,
                target_margin_pct: 35,
            },
            organizer_id: 'usr_said_abu_laila_admin',
            manager_id: 'usr_mohammed_qubaisi_mgr',
            roundRobinIndex: 134,
            created_at: now,
            updated_at: now,
        },
    },
];

// Attendees (subcollection: events/{id}/attendees) — London only
const LONDON_ATTENDEES = [
    {
        id: 'att_sara_almarzouqi',
        data: {
            agent_id: 'usr_sara_almarzouqi_dxb',
            agent_name: 'Sara Al Marzouqi',
            agent_email: 'sara.almarzouqi@propertyshop.ae',
            agent_branch: 'Dubai Marina',
            tier: 'Gold',
            tier_agent_share: 0.50,
            status: 'physically_present',
            checked_in_at: now,
            flight_uploaded: true,
            visa_uploaded: true,
            approved_by: 'usr_mohammed_qubaisi_mgr',
            approved_at: TS('2026-09-30T11:00:00Z'),
            closed_revenue_aed: 0, // To be updated post-event
            created_at: now,
        },
    },
    {
        id: 'att_khalid_mansouri',
        data: {
            agent_id: 'usr_khalid_mansouri_auh',
            agent_name: 'Khalid Mansouri',
            agent_email: 'khalid.mansouri@propertyshop.ae',
            agent_branch: 'Abu Dhabi Main',
            tier: 'Silver',
            tier_agent_share: 0.30,
            status: 'approved',
            checked_in_at: null,
            flight_uploaded: true,
            visa_uploaded: false, // Will trigger the 48-hour nudger
            approved_by: 'usr_mohammed_qubaisi_mgr',
            approved_at: TS('2026-09-30T11:30:00Z'),
            closed_revenue_aed: 0,
            created_at: now,
        },
    },
];

// Expenses (subcollection: events/{id}/expenses) — London only
const LONDON_EXPENSES = [
    {
        id: 'exp_london_venue_four_seasons',
        data: {
            name: 'Old Billingsgate Venue Hire',
            category: 'Venue',
            vendor: 'Old Billingsgate Events Ltd',
            amount_aed: 85_000,
            currency_original: 'GBP',
            amount_original: 18_500,
            exchange_rate_used: 4.59,
            invoice_ref: 'INV-BILL-2026-0387',
            paid: true,
            paid_at: TS('2026-09-01T00:00:00Z'),
            notes: 'Full venue for 4 days including setup/breakdown. Includes AV rig and break allowance.',
            created_at: now,
        },
    },
    {
        id: 'exp_london_flights_emirates',
        data: {
            name: 'Emirates Business Class Flights (Team)',
            category: 'Travel',
            vendor: 'Emirates Airlines',
            amount_aed: 22_000,
            currency_original: 'AED',
            amount_original: 22_000,
            exchange_rate_used: 1,
            invoice_ref: 'EK-2026-GRPBK-7745',
            paid: true,
            paid_at: TS('2026-09-05T00:00:00Z'),
            notes: 'Group booking — 2 agents + 1 organiser. AUH → LHR → AUH. Emirates 10% corporate discount applied.',
            created_at: now,
        },
    },
    {
        id: 'exp_london_hotel_andaz',
        data: {
            name: 'Andaz London Hotel (5 nights)',
            category: 'Accommodation',
            vendor: 'Hyatt Hotels',
            amount_aed: 18_400,
            currency_original: 'GBP',
            amount_original: 4_000,
            exchange_rate_used: 4.60,
            invoice_ref: 'ANDAZ-LON-2026-1122',
            paid: false,
            paid_at: null,
            notes: '3 rooms × 5 nights. Includes daily breakfast. Payment due on checkout.',
            created_at: now,
        },
    },
    {
        id: 'exp_london_marketing_materials',
        data: {
            name: 'Print Marketing & Brochures',
            category: 'Marketing',
            vendor: 'Printsmith London',
            amount_aed: 6_200,
            currency_original: 'GBP',
            amount_original: 1_350,
            exchange_rate_used: 4.59,
            invoice_ref: 'PRNTSM-2026-4401',
            paid: true,
            paid_at: TS('2026-09-20T00:00:00Z'),
            notes: 'Brochures, floor-plans, and bespoke investor packs for Aldar + Emaar portfolios.',
            created_at: now,
        },
    },
];

// ── Main seed function ────────────────────────────────────────────────────────

async function seed() {
    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║   PSI Event Portal — Live Firestore Seeder                  ║');
    console.log('║   ⚠️  This script writes to your LIVE production database.   ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('\nThe following collections will be seeded / overwritten:');
    console.log('  📁 crm_projects       ×2 documents');
    console.log('  📁 crm_users          ×4 documents');
    console.log('  📁 events             ×2 documents');
    console.log('  📁 events/evt_london.../attendees  ×2 documents');
    console.log('  📁 events/evt_london.../expenses   ×4 documents');
    console.log('\n  All existing documents with the same IDs will be OVERWRITTEN.\n');

    if (FORCE) {
        console.log('  ⚡ --force flag detected. Skipping confirmation prompt.\n');
    } else {
        const ok = await confirm('  Type Y and press Enter to proceed, or anything else to abort: ');
        if (!ok) {
            console.log('\n  ❌ Seeding aborted. No data was written.\n');
            process.exit(0);
        }
    }

    console.log('\n  🌱 Seeding in progress...\n');

    const db = admin.firestore();

    // ── Batch 1: Top-level collections ─────────────────────────────────────────
    // (Firestore allows max 500 operations per batch write)

    const batch1 = db.batch();

    // crm_projects
    for (const proj of CRM_PROJECTS) {
        batch1.set(db.doc(`crm_projects/${proj.id}`), proj.data);
        console.log(`  ➕ crm_projects/${proj.id}`);
    }

    // crm_users
    for (const user of CRM_USERS) {
        batch1.set(db.doc(`crm_users/${user.id}`), user.data);
        console.log(`  ➕ crm_users/${user.id}`);
    }

    // events
    for (const event of EVENTS) {
        batch1.set(db.doc(`events/${event.id}`), event.data);
        console.log(`  ➕ events/${event.id}`);
    }

    await batch1.commit();
    console.log('\n  ✅ Batch 1 committed (projects + users + events)\n');

    // ── Batch 2: Subcollections for London event ────────────────────────────────

    const batch2 = db.batch();
    const londonId = 'evt_london_luxury_expo_oct2026';

    for (const att of LONDON_ATTENDEES) {
        batch2.set(db.doc(`events/${londonId}/attendees/${att.id}`), att.data);
        console.log(`  ➕ events/${londonId}/attendees/${att.id}`);
    }

    for (const exp of LONDON_EXPENSES) {
        batch2.set(db.doc(`events/${londonId}/expenses/${exp.id}`), exp.data);
        console.log(`  ➕ events/${londonId}/expenses/${exp.id}`);
    }

    await batch2.commit();
    console.log('\n  ✅ Batch 2 committed (attendees + expenses)\n');

    // ── Summary ─────────────────────────────────────────────────────────────────

    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║   ✅ Seeding complete — data is live in Firestore            ║');
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log('║                                                              ║');
    console.log('║   Collection            Documents                           ║');
    console.log('║   ─────────────────     ─────────────────────────────────── ║');
    console.log('║   crm_projects          proj_aldar_mamsha_gardens           ║');
    console.log('║                         proj_emaar_marina_blue              ║');
    console.log('║   crm_users             usr_sara_almarzouqi_dxb             ║');
    console.log('║                         usr_khalid_mansouri_auh             ║');
    console.log('║                         usr_mohammed_qubaisi_mgr            ║');
    console.log('║                         usr_said_abu_laila_admin            ║');
    console.log('║   events                evt_london_luxury_expo_oct2026      ║');
    console.log('║                         evt_cairo_invest_nov2026            ║');
    console.log('║   events/london/        att_sara_almarzouqi                 ║');
    console.log('║     attendees           att_khalid_mansouri                 ║');
    console.log('║   events/london/        exp_london_venue_four_seasons       ║');
    console.log('║     expenses            exp_london_flights_emirates         ║');
    console.log('║                         exp_london_hotel_andaz              ║');
    console.log('║                         exp_london_marketing_materials      ║');
    console.log('║                                                              ║');
    console.log('║   Sara Al Marzouqi → Gold (50%), physically_present ✓      ║');
    console.log('║   Khalid Mansouri  → Silver (30%), approved, visa ⚠️        ║');
    console.log('║   (Khalid missing visa — will trigger the 48-hr nudger)     ║');
    console.log('║                                                              ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('');
}

// ── Entrypoint ────────────────────────────────────────────────────────────────

initFirebase();
seed().catch(err => {
    console.error('\n  ❌ Seeding failed:', err.message);
    console.error(err);
    process.exit(1);
});
