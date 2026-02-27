# Database Seeding & Mock Data Strategy

**Project:** Enterprise Event Management & ROI Tracking Portal  
**Company:** Property Shop Investment (PSI) LLC  
**Purpose:** To safely unblock front-end development by injecting highly structured, predictable dummy data into Firebase before the live CRM API integration is completed.

> **Technical Lead Context:** "Do not use random string generators for IDs during local testing. If IDs are constantly changing, it is impossible to test the Manager Approval routing consistently. Follow the exact deterministic ID structures outlined below so the front-end team can hardcode test logins and verify the RBAC security firewalls."

---

## 📐 1. The Golden Rules of Seeding
To ensure the UI components (`UI_Component_Schemas.md`) render correctly, your mock data must follow these strict environmental rules:

*   **🆔 Deterministic IDs:** Always use readable mock IDs (e.g., `user_agent_001`, `branch_dxb_marina`) instead of random Firebase UUIDs. This allows devs to test relationships easily.
*   **⚠️ Edge Case Injection:** You must seed "perfect" data, but you must also intentionally seed broken data to test the UI failsafes (e.g., an event with zero expenses, a branch with zero approved agents, an agent with an expired visa).
*   **🛡️ Isolated Environments:** Seed this data only into the Firebase Local Emulator Suite or a dedicated "Staging" Firebase project. Never inject this into the production environment.

---

## 👥 2. Mock CRM Profiles (crm_users Collection)
Seed exactly four distinct user personas to test the complete Role-Based Access Control (RBAC) matrix and approval chokepoints.

*   **Profile A: The "God-Mode" Organizer**
    *   **Document ID:** `user_org_master`
    *   **Role/Department:** Event Management
    *   **Purpose:** Use this profile to test the creation of events, global expense tracking, and verifying all uploaded documents across all branches.
*   **Profile B: The Strict Branch Manager**
    *   **Document ID:** `user_mgr_marina`
    *   **Branch Name:** Marina HQ
    *   **Purpose:** Use this profile to test the Approvals Queue. The UI should strictly filter out any agents not assigned to "Marina HQ".
*   **Profile C: The Perfect Agent**
    *   **Document ID:** `user_agt_gold`
    *   **Assigned Manager ID:** `user_mgr_marina`
    *   **Package Target:** "Gold (50%)"
    *   **Purpose:** Use this profile to test the happy path: Survey submission -> Manager Approval -> Visa Upload -> Organizer Verification.
*   **Profile D: The Penalized Agent (Edge Case)**
    *   **Document ID:** `user_agt_penalized`
    *   **Assigned Manager ID:** `user_mgr_marina`
    *   **Sub-collection Data:** Seed the `historical_kpis` sub-collection with `penalized_no_show: true`.
    *   **Purpose:** Use this profile to verify that the ⚠️ alert icon correctly renders on the Manager's approval dashboard.

---

## 🏢 3. Mock Inventory (crm_projects Collection)
Seed three distinct properties to represent the PSI Maps inventory integration, ensuring the L&D validation logic can be tested.

| Document ID | Developer Name | Project Name | Project Tier | Expected UI Behavior |
| :--- | :--- | :--- | :--- | :--- |
| `proj_aldar_01` | Aldar Properties | Mamsha Gardens | Luxury | Triggers the Luxury L&D Assessment requirement. |
| `proj_emaar_01` | Emaar | Marina Blue | Medium | Triggers the Medium L&D Assessment requirement. |
| `proj_damac_01` | Damac | Hills Estate | Average | Standard tracking; no heavy L&D blockers. |

---

## 📊 4. Mock Event Logistics (events Collection)
Seed two heavily contrasting roadshows to test the mathematical `/utils` functions and the dashboard rendering.

### Event 1: The Sponsored "Perfect" Event
*   **Document ID:** `evt_london_sponsored`
*   **Sponsorship Map:** Inject a Developer ID, a 150,000 AED sponsorship amount, and a 10,000 AED Source Agent Reward.
*   **Baseline Targets:** 300 Leads, 3 Deals.
*   **Attendees Sub-collection:** Seed 4 "Approved" agents.
*   **Purpose:** To verify the Cloud Function correctly dilutes the 300 leads into exactly 75 target leads per agent, and that the Gross Profit dashboard correctly adds the 150k AED sponsorship to the bottom line.

### Event 2: The Branch-Funded "Stress Test" Event
*   **Document ID:** `evt_cairo_branch`
*   **Sponsorship Map:** Leave completely empty or null.
*   **Expenses Sub-collection:** Inject 80,000 AED in Venue costs and 20,000 AED in Travel costs.
*   **Attendees Sub-collection:** Seed 3 "Pending" agents, 1 "Rejected" agent, and 0 "Approved" agents.
*   **Purpose:** To verify that the P&L dashboard accurately deducts the 100k AED total costs from the branch, and to ensure the Cloud Function catches the "divide by zero" error since there are 0 approved agents.

---

## 📈 5. Mock Analytics (analytics_snapshots Collection)
Since the front-end team cannot run the backend Cloud Functions directly without a local emulator, seed a static snapshot to allow them to build the executive charts.

*   **Document ID:** `evt_london_sponsored_Marina_HQ`
*   **Target Schema to Seed:**
    *   `dynamic_leads_per_agent`: 75
    *   `dynamic_marketing_leads`: 37.5
    *   `dynamic_walk_ins`: 37.5
    *   `dynamic_deals`: 0.75
*   **Financial Schema to Seed:**
    *   `total_event_cost`: 120,000
    *   `current_gross_profit`: 390,000
    *   `branch_net_profit`: 351,000
*   **Purpose:** The UI developers can immediately map their bar charts and waterfall graphs to these static numbers to perfect the visuals in Figma before the real math engine is turned on.
