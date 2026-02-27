import * as admin from 'firebase-admin';

/**
 * seedLocalFirebase.ts
 * Deterministic database seeding script for PSI Event Portal Local Emulator.
 * Strictly follows Database_Seeding_Strategy.md
 */

// 🛑 Environment Guardrail
const NODE_ENV = process.env.NODE_ENV;
if (NODE_ENV === 'production') {
  console.error('❌ FATAL ERROR: Seeding script detected PRODUCTION environment.');
  console.error('This script is strictly for development/emulator use only.');
  process.exit(1);
}

// Initialize Firebase Admin for Emulator
// Ensure FIRESTORE_EMULATOR_HOST is set in your environment
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'psi-event-portal-dev'
  });
}

const db = admin.firestore();

async function seedDatabase() {
  console.log('🚀 Starting deterministic database seeding...');
  const batch = db.batch();

  // --- 👥 1. CRM Users (crm_users) ---
  const users = [
    {
      id: 'user_org_master',
      data: {
        full_name: 'Master Organizer',
        email: 'organizer@psi.ae',
        role: 'organizer',
        department: 'Event Management',
        company_entity: 'PROPERTY SHOP INVESTMENT LLC',
        branch_name: 'Abu Dhabi HQ'
      }
    },
    {
      id: 'user_mgr_marina',
      data: {
        full_name: 'Marina Branch Manager',
        email: 'manager.marina@psi.ae',
        role: 'manager',
        department: 'Sales',
        company_entity: 'PROPERTY SHOP INVESTMENT LLC',
        branch_name: 'Marina HQ'
      }
    },
    {
      id: 'user_agt_gold',
      data: {
        full_name: 'Perfect Gold Agent',
        email: 'agent.gold@psi.ae',
        role: 'agent',
        department: 'Sales',
        company_entity: 'PROPERTY SHOP INVESTMENT LLC',
        branch_name: 'Marina HQ',
        manager_id: 'user_mgr_marina',
        package_target: 'Gold (50%)'
      }
    },
    {
      id: 'user_agt_penalized',
      data: {
        full_name: 'Penalized Agent',
        email: 'agent.penalized@psi.ae',
        role: 'agent',
        department: 'Sales',
        company_entity: 'PROPERTY SHOP INVESTMENT LLC',
        branch_name: 'Marina HQ',
        manager_id: 'user_mgr_marina'
      }
    }
  ];

  users.forEach(u => {
    const ref = db.collection('crm_users').doc(u.id);
    batch.set(ref, { ...u.data, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
  });

  // --- 🏢 2. CRM Projects (crm_projects) ---
  const projects = [
    {
      id: 'proj_aldar_01',
      data: { developer_name: 'Aldar Properties', project_name: 'Mamsha Gardens', project_tier: 'Luxury', status: 'Active' }
    },
    {
      id: 'proj_emaar_01',
      data: { developer_name: 'Emaar', project_name: 'Marina Blue', project_tier: 'Medium', status: 'Active' }
    },
    {
      id: 'proj_damac_01',
      data: { developer_name: 'Damac', project_name: 'Hills Estate', project_tier: 'Average', status: 'Active' }
    }
  ];

  projects.forEach(p => {
    const ref = db.collection('crm_projects').doc(p.id);
    batch.set(ref, { ...p.data, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
  });

  // --- 📅 3. Events (events) ---
  
  // Event 1: The Sponsored "Perfect" Event
  const evt1Ref = db.collection('events').doc('evt_london_sponsored');
  batch.set(evt1Ref, {
    eventName: 'London Luxury Roadshow 2026',
    locationCity: 'London',
    dateRange: 'Oct 12 - Oct 15',
    totalBudgetAED: 150000,
    approvalStatus: 'Confirmed',
    sponsorship: {
      developerId: 'proj_aldar_01',
      amount: 150000,
      sourceAgentReward: 10000
    },
    baselineTargets: {
      leads: 300,
      deals: 3
    },
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  // Event 2: The Branch-Funded "Stress Test" Event
  const evt2Ref = db.collection('events').doc('evt_cairo_branch');
  batch.set(evt2Ref, {
    eventName: 'Cairo Branch Stress Test',
    locationCity: 'Cairo',
    dateRange: 'Nov 05 - Nov 08',
    totalBudgetAED: 100000,
    approvalStatus: 'Pending',
    sponsorship: null,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  // --- 📈 4. Analytics Snapshots (analytics_snapshots) ---
  const snapshotRef = db.collection('analytics_snapshots').doc('evt_london_sponsored_Marina_HQ');
  batch.set(snapshotRef, {
    eventId: 'evt_london_sponsored',
    branchName: 'Marina HQ',
    dynamic_leads_per_agent: 75,
    dynamic_marketing_leads: 37.5,
    dynamic_walk_ins: 37.5,
    dynamic_deals: 0.75,
    financials: {
      total_event_cost: 120000,
      current_gross_profit: 390000,
      branch_net_profit: 351000,
      totalGrossRevenue: 500000, // Derived for UI
      sponsorshipAmount: 150000,
      sponsorshipProfit: 10000
    },
    funnel: [
      { stageName: 'Qualified Leads', dynamicTarget: 75, actualAchieved: 80, variancePercent: 6.6 },
      { stageName: 'Scheduled Meetings', dynamicTarget: 37.5, actualAchieved: 35, variancePercent: -6.6 }
    ],
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  // Commit the main batch
  await batch.commit();
  console.log('✅ Main collections seeded.');

  // --- 📂 5. Sub-collections (Requires separate operations) ---
  
  // Penalized Agent KPI
  await db.collection('crm_users').doc('user_agt_penalized')
    .collection('historical_kpis').doc('current')
    .set({ penalized_no_show: true, updatedAt: admin.firestore.FieldValue.serverTimestamp() });

  // Event 1 Attendees (4 Approved)
  const evt1Attendees = ['user_agt_gold', 'agent_002', 'agent_003', 'agent_004'];
  for (const id of evt1Attendees) {
    await db.collection('events').doc('evt_london_sponsored')
      .collection('attendees').doc(id)
      .set({ 
        status: 'Approved', 
        branch_name: 'Marina HQ',
        updatedAt: admin.firestore.FieldValue.serverTimestamp() 
      });
  }

  // Event 2 Attendees (0 Approved)
  const evt2Attendees = [
    { id: 'agent_pending_1', status: 'Pending' },
    { id: 'agent_pending_2', status: 'Pending' },
    { id: 'agent_pending_3', status: 'Pending' },
    { id: 'agent_rejected_1', status: 'Rejected' }
  ];
  for (const att of evt2Attendees) {
    await db.collection('events').doc('evt_cairo_branch')
      .collection('attendees').doc(att.id)
      .set({ 
        status: att.status, 
        branch_name: 'Marina HQ',
        updatedAt: admin.firestore.FieldValue.serverTimestamp() 
      });
  }

  // Event 2 Expenses
  const evt2Expenses = [
    { category: 'Venue', subcategory: 'Hotel Ballroom', amount: 80000, paidBy: 'Branch' },
    { category: 'Travel', subcategory: 'Flights', amount: 20000, paidBy: 'Branch' }
  ];
  for (const exp of evt2Expenses) {
    await db.collection('events').doc('evt_cairo_branch')
      .collection('expenses').add({
        ...exp,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
  }

  console.log('🏁 Seeding complete. Local emulator is now ready for development.');
}

seedDatabase().catch(err => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
