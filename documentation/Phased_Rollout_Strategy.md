# Phased Rollout Strategy (V1 vs. V2)

**Purpose:** To define the Minimum Viable Product (MVP) for Phase 1 launch, ensuring the core business value is delivered quickly, while reserving complex automations and deep integrations for Phase 2.

---

## 🚀 Phase 1 (V1): The Core Logistics & Approval Engine
**Goal:** Replace manual spreadsheets, establish the database architecture, enforce manager approval workflows, and capture basic event costs.  
**Target Launch:** 3–4 Months

### Essential V1 Features:
*   **CRM Read-Only Sync (Users & Inventory):** The foundational API connection to pull Agent names, Manager hierarchies, and Property Tiers into the Firebase database.
*   **Event Creation Module:** The Organizer dashboard to set up the event, location, dates, and baseline targets.
*   **The Proposal/Survey Engine (Static):** Branches and Agents can log in, select their Commission Package (Gold/Silver/Bronze), and submit their intent to participate.
*   **Manager Approval Chokepoint:** The core operational flow where Managers must explicitly Approve or Reject their agents.
*   **Document Uploads (Manual Verification):** Agents can upload Visa/Flight PDFs. Organizers manually review and click "Verified."
*   **Basic Expense Ledger:** A manual input screen for Organizers to log Venue, Marketing, Hospitality, and Travel costs.
*   **Static Dashboards:** Dashboards show the baseline expected targets and the raw Gross Profit based on manual revenue inputs (no Cloud Function dynamic dilution yet).

> **Investor Value for V1:** "By the end of Phase 1, Property Shop Investment LLC will have completely digitized the roadshow application process, eliminating lost emails, enforcing manager accountability, and centralizing all event expenses into a single, auditable database."

---

## 📈 Phase 2 (V2): Analytics, Automation & L&D Integration
**Goal:** Introduce the complex serverless math, automate the target tracking, enforce disciplinary KPIs, and sync post-event actuals from the CRM.  
**Target Launch:** 2–3 Months post-V1

### Advanced V2 Features:
*   **Dynamic Target Engine (Cloud Functions):** The serverless backend logic that automatically recalculates and dilutes the per-agent lead/deal targets if the actual approved headcount changes.
*   **Closed-Deal CRM Sync (The Post-Event Loop):** The secure webhook that pulls actual closed revenue back into the portal months after the event to calculate final, finalized ROI.
*   **Automated Notification Engine:** Replacing manual follow-ups with automated Push/Email triggers (e.g., 48-hour pending escalation alerts, missing document warnings).
*   **Historical Disciplinary KPIs:** The automated logic that permanently tags an agent's profile with a "Penalized" warning if they reach "Confirmed" status but log a "No-Show."
*   **L&D Assessment Gatekeeper:** The integration allowing the Learning & Development team to block an agent's final clearance until they pass the tier-specific property quiz.
*   **Developer Pitch Links:** The external, tokenized web-views that Organizers can send to Developers to secure sponsorships.

> **Investor Value for V2:** "Phase 2 transforms the portal from a logistics tool into a predictive financial engine. It introduces automated accountability, dynamically adjusts expectations based on real-time headcount, and closes the loop on actual ROI, proving exactly how much profit every single roadshow generates."

---

## 🔮 Phase 3 (Future Considerations)
**Goal:** Expand the ecosystem beyond internal staff.

*   **AI-Powered ROI Prediction:** Using historical event data to predict which branches or agents will yield the highest ROI for specific cities.
*   **External Developer Portal:** A secure login for developers to view the real-time lead generation of the events they sponsored.
*   **Mobile App Wrapper:** Converting the responsive web app into a native iOS/Android application for agents to use on the roadshow floor.
