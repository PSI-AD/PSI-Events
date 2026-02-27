# Architectural Context & QA Testing Protocol

**Purpose:** To document the strategic reasoning behind the system's architecture and provide a strict Quality Assurance (QA) checklist to guarantee financial and operational accuracy before deployment.

---

## 🏗️ 1. Strategic Architectural Context (The "Why")

### 🔗 A. CRM Integration vs. Odoo Bypass
*   **The Strategy:** We explicitly bypass Odoo for contact management and rely exclusively on the primary CRM for personnel and property inventory (like the data feeding PSI Maps).
*   **The "Why":** This prevents data duplication and establishes a single source of truth. If an agent changes branches, it is updated in the CRM and syncs downstream to the portal. The Event Management portal must never be used to create employees or inventory, only to track their event performance.

### ⚡ B. Serverless Logic for Analytics (Cloud Functions)
*   **The Strategy:** Dynamic target calculations (diluting 300 leads across 4 agents to equal 75 leads each) are executed entirely in the background via Firebase Cloud Functions.
*   **The "Why":** Doing complex fractional math on the front-end forces the user's browser to download massive amounts of data, slowing down the app. By using a Cloud Function to calculate the math the exact moment a manager clicks "Approve," the dashboard simply reads a single, pre-calculated snapshot document. This guarantees lightning-fast load times for executive dashboards and minimizes database read costs.

### 🧪 C. Mathematical Isolation (/utils directory)
*   **The Strategy:** All 50/30/20 splits and Gross Profit calculations are strictly isolated in a dedicated utility folder, completely separated from the UI components.
*   **The "Why":** This ensures a single source of truth for the company's financial accuracy. If executive management ever adjusts the Bronze package to 25%, developers only have to change one variable in one file, rather than hunting down formulas hidden inside dozens of visual dashboard components.

### 🔐 D. Strict Data Firewalls (RBAC)
*   **The Strategy:** Row-Level Security rules ensure Agents can only query their own performance, and Branch Managers can only query their specific branch.
*   **The "Why":** It is a critical business requirement that individual sales agents remain completely blind to the company's Gross Profit, total Event Costs, and Developer Sponsorship AED amounts. RBAC prevents catastrophic internal data leaks.

---

## 🧪 2. Quality Assurance (QA) Testing Master Checklist

Before this portal is deployed to the production environment, the QA team must execute and verify the following specific edge-case scenarios to ensure the logic holds up under pressure.

### 💰 Test Suite A: The Financial & Math Engine
- [ ] **Test Gold Package Math:** Create a test deal of AED 100,000. Verify the Agent Net Gross Revenue calculates exactly to AED 50,000 minus their individual Event/Travel costs.
- [ ] **Test Bronze Package Math:** Verify the Branch Net Profit correctly deducts the Agent's Event/Travel costs from the Branch's 80% share.
- [ ] **Test Sponsorship Profit Margin:** Input a Sponsorship AED of 120,000 and an Event Cost of 100,000. Verify the Gross Profit correctly increases by exactly 20,000 (minus the Source Agent Reward).
- [ ] **Test Empty Sponsorship Validation:** Run an event with zero sponsorship. Ensure the math defaults cleanly to Branch-funded logic without throwing "Null" or "NaN" (Not a Number) errors on the dashboard.

### 🎯 Test Suite B: Dynamic Target Dilution (The Funnel)
- [ ] **Test Baseline Division:** Set a Branch Target of 100 expected leads with 2 approved agents. Verify the individual dashboard shows exactly 50 target leads per agent.
- [ ] **Test Fractional Precision:** Change the approved agents to 3. Verify the individual target recalculates to exactly 33.33 leads. Ensure the system does not round this to 33, which would cause the branch roll-up to total 99 instead of 100.
- [ ] **Test Divide-by-Zero Failsafe:** Manually reject all agents for a branch. Verify the Cloud Function catches the "divide by zero" error and safely resets individual targets to 0 without crashing the portal.

### 📋 Test Suite C: Operational Workflow & Disciplinary Routing
- [ ] **Test Manager Routing:** Submit an Agent Survey. Log in as their specific CRM-assigned Manager and verify the request appears in their queue, isolated from other branches.
- [ ] **Test Pending Escalation:** Leave an application in "Pending" status for 48 hours. Verify the Organizer receives the automated escalation email alert.
- [ ] **Test Document Blockers:** Approve an agent. Verify the system strictly blocks them from achieving "Confirmed" status until the Organizer manually verifies their uploaded Visa/Flight tickets.
- [ ] **Test the No-Show Penalty:** Take a fully "Confirmed" agent and manually mark their actual event attendance as "No-Show". Verify the "Penalized" tag is instantly permanently written to their historical KPIs profile.
- [ ] **Test L&D Clearance:** Attempt to clear an agent for a "Luxury" tier event when they have only passed the "Medium" tier assessment. Verify the system blocks their final clearance.

### 🔐 Test Suite D: Security & Data Firewalls
- [ ] **Test Agent Blindfold:** Log in with Agent-level credentials. Attempt to access the `/analytics/gross-profit` URL route manually. Verify the system forces a redirect or shows an "Access Denied" error.
- [ ] **Test Developer Pitch Link:** Generate a Developer Sponsorship Proposal link. Open it in an incognito browser. Verify the external party can only see the Expected ROI and Project Tiers, with zero navigation access to the rest of the portal.
