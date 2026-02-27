# User Acceptance Testing (UAT) Scripts - Phase 1 Beta

**Purpose:** To provide strictly guided testing scenarios for beta users (Organizers, Managers, and Agents) to validate the core business logic, UX flow, and RBAC security before company-wide deployment.

> **Investor & Management Note:** "A successful UAT phase proves that the system's human-in-the-loop workflows—specifically the financial risk selection and manager approvals—function flawlessly in a real-world environment, ensuring zero logistical errors when the portal goes live."

---

## 🧑💼 UAT Script 1: The Event Organizer
**Tester Role:** Event Organizer (Admin Access)  
**Objective:** Successfully create a new roadshow event and verify logistics tracking.

| Step | Action (What the Tester Does) | Expected System Result | Pass / Fail |
| :--- | :--- | :--- | :--- |
| 1.1 | Log into the portal and click "Create New Event". | The multi-step Event Creation Wizard opens. | [ ] Pass / [ ] Fail |
| 1.2 | Enter "London Roadshow 2026", select UK/London, and pick dates. | Data is accepted; UI proceeds to Step 2. | [ ] Pass / [ ] Fail |
| 1.3 | Input baseline targets: 100 Leads, 1 Deal per agent. | Data is saved to the Firebase events collection. | [ ] Pass / [ ] Fail |
| 1.4 | Navigate to the Expense Tracker tab for this event. | The four-category ledger (Venue, Hospitality, Marketing, Travel) appears. | [ ] Pass / [ ] Fail |
| 1.5 | Add a "Venue Booking" expense of 50,000 AED paid by "Branch". | The Event Total Cost KPI instantly updates to 50,000 AED. | [ ] Pass / [ ] Fail |

---

## 🕵️♂️ UAT Script 2: The Sales Agent
**Tester Role:** Agent (Isolated Access)  
**Objective:** Navigate the participation survey, select a financial risk package, and test security firewalls.

| Step | Action (What the Tester Does) | Expected System Result | Pass / Fail |
| :--- | :--- | :--- | :--- |
| 2.1 | Log in as an Agent and open the "London Roadshow 2026" invite. | The Participation Survey UI loads. | [ ] Pass / [ ] Fail |
| 2.2 | Select "Yes" to attend and "Yes" for requiring a Visa. | The UI expands to show the Tier Selection Cards. | [ ] Pass / [ ] Fail |
| 2.3 | Click the "Silver (30%)" Package Card. | The card highlights, and the warning tooltip "Agent Covers Costs" is visible. | [ ] Pass / [ ] Fail |
| 2.4 | Click "Submit Application". | The UI updates to a "Pending Manager Approval" state. Document upload zones remain strictly locked. | [ ] Pass / [ ] Fail |
| 2.5 | Security Test: Try to navigate to the "Gross Profit Analytics" tab. | System blocks access, redirecting to the Agent Dashboard or showing an error. | [ ] Pass / [ ] Fail |

---

## 👔 UAT Script 3: The Branch Manager
**Tester Role:** Branch Manager (Branch-Level Access)  
**Objective:** Process the pending agent application and verify data isolation.

| Step | Action (What the Tester Does) | Expected System Result | Pass / Fail |
| :--- | :--- | :--- | :--- |
| 3.1 | Log in as a Branch Manager and navigate to the Approvals Queue. | The dashboard loads only agents from the tester's assigned CRM branch. | [ ] Pass / [ ] Fail |
| 3.2 | Locate the test Agent from Script 2 in the queue. | The row displays the Agent's name, "Silver" package request, and "Pending" status. | [ ] Pass / [ ] Fail |
| 3.3 | Click the "Approve" button next to the Agent's name. | The row moves from the "Pending" list to the "Approved" list. | [ ] Pass / [ ] Fail |
| 3.4 | Security Test: Search for an Agent known to be in a different branch. | The system returns zero results, proving Row-Level Security works. | [ ] Pass / [ ] Fail |

---

## ✈️ UAT Script 4: Logistics & Verification Loop
**Tester Role:** Agent & Organizer (Cross-Functional)  
**Objective:** Verify the document upload and final confirmation chokepoint.

| Step | Action (What the Tester Does) | Expected System Result | Pass / Fail |
| :--- | :--- | :--- | :--- |
| 4.1 | (Agent) Log back in. Check the London Roadshow status. | The status now reads "Approved". The Visa/Flight upload zones are now unlocked. | [ ] Pass / [ ] Fail |
| 4.2 | (Agent) Upload a dummy PDF into the Visa slot and input expiry dates. | The file uploads successfully. Status changes to "Pending Verification". | [ ] Pass / [ ] Fail |
| 4.3 | (Organizer) Log in and navigate to the Logistics Desk. | The Agent appears in the Verification Queue with a viewable PDF link. | [ ] Pass / [ ] Fail |
| 4.4 | (Organizer) Click "Verify & Confirm". | The Agent's status updates globally to "Confirmed", officially adding them to the target calculation pool. | [ ] Pass / [ ] Fail |

---

## 📝 UAT Feedback Protocol
If any of these boxes result in a "Fail," the beta tester must screenshot the error and log it directly with the development team noting the exact **Step Number** (e.g., "Failed at Step 2.4 - Document upload zone unlocked prematurely").
