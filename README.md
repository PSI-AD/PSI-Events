# 🏢 Enterprise Event Management & ROI Tracking Portal
## Property Shop Investment (PSI) LLC

**Mission Statement:** To transform real estate roadshows from logistical black boxes into highly measurable, predictable, and accountable revenue engines. This portal digitizes event logistics, enforces strict manager approval chokepoints, and dynamically calculates granular Agent and Branch ROI using a tiered commission math engine.

---

## 🚀 Overview
The **PSI Event Portal** is a custom-built, enterprise-grade web application. It completely replaces manual spreadsheet tracking and disconnected email approvals. By integrating directly with our primary CRM (bypassing Odoo for contacts) and our live property inventory (PSI Maps), this system serves as the single source of truth for all roadshow operations and financial tracking.

### Core Value Pillars
*   **📊 Dynamic ROI Tracking:** Serverless functions automatically recalculate lead expectations based on live, approved headcount.
*   **⚖️ Financial Accountability:** A strict 50/30/20 (Gold/Silver/Bronze) commission matrix dictates exactly who absorbs event and travel costs.
*   **🔐 Absolute Data Security:** Row-Level Security ensures Sales Agents are completely blind to company Gross Profit and Sponsorship margins.
*   **🛂 Operational Chokepoints:** Agents cannot attend events without digital Manager Approval and L&D project assessment clearance.

---

## 📚 The Master Documentation Library
This repository contains an exhaustive suite of architectural blueprints. All developers, product managers, and QA engineers must read the following documents before contributing to this codebase.

### 🏛️ 1. Architecture & Business Logic
*   **[Project_Master.md](./documentation/Project_Master.MD)** - The central architectural blueprint and core business logic.
*   **[Frontend_Architecture.md](./Frontend_Architecture.md)** - The strict Feature-Sliced Design folder structure required for the UI.
*   **[Utils_Math_Specifications.md](./documentation/Utils_Math_Specifications.md)** - The isolated, exact mathematical formulas for all financial tracking.
*   **[QA_and_Architectural_Context.md](./documentation/QA_and_Architectural_Context.md)** - The strategic reasoning behind our tech stack and the strict QA testing checklists.

### 🎨 2. Design & User Experience
*   **[UI_Component_Schemas.md](./documentation/UI_Component_Schemas.md)** - The exact data structures (props) the front-end components must accept.
*   **[UAT_Scripts_Phase1.md](./documentation/UAT_Scripts_Phase1.md)** - Step-by-step User Acceptance Testing scripts for our Beta rollout.

### ⚙️ 3. Data & DevOps
*   **[System_Audit_and_Error_Logging.md](./documentation/System_Audit_and_Error_Logging.md)** - Protocols for tracking human actions, API failures, and security breaches.
*   **[Firestore_Security_Rules_Logic.md](./documentation/Firestore_Security_Rules_Logic.md)** - The strict backend Row-Level Security (RLS) and firewall logic.
*   **[API_Postman_Collection.md](./documentation/API_Postman_Collection.md)** - The exact API request/response payloads for CRM integration.
*   **[Database_Seeding_Strategy.md](./documentation/Database_Seeding_Strategy.md)** - Guidelines for injecting deterministic mock data into local emulators.
*   **[Deployment_and_CICD_Strategy.md](./documentation/Deployment_and_CICD_Strategy.md)** - Our strict Git branching, automated testing, and zero-downtime release protocols.

### 📅 4. Project Management
*   **[Phased_Rollout_Strategy.md](./documentation/Phased_Rollout_Strategy.md)** - Our roadmap separating the Phase 1 MVP from Phase 2 automation.
*   **[Jira_Epics_and_User_Stories.md](./documentation/Jira_Epics_and_User_Stories.md)** - The Agile tickets driving the daily development sprints.
*   **[Executive_Readout_Presentation.md](./documentation/Executive_Readout_Presentation.md)** - The pitch deck outline for board members and investors.
*   **[Project_Kickoff_Email.md](./documentation/Project_Kickoff_Email.md)** - The official project launch communication and team directives.

### 🚦 5. Onboarding & Training
*   **[Developer_Onboarding_Guide.md](./documentation/Developer_Onboarding_Guide.md)** - Day 1 setup instructions and core development rules for new engineers.

---

## 🛠️ Technology Stack
*   **Front-End Interface:** React / Next.js (Strictly adhering to Feature-Sliced Design).
*   **Database Engine:** Firebase NoSQL (Firestore) for rapid document retrieval and real-time dashboard updates.
*   **Serverless Compute:** Firebase Cloud Functions for backend mathematical processing and dynamic target dilution.
*   **Integrations:** Secure, one-way API Webhooks utilizing Bearer Tokens (JWT) to pull from the primary CRM.

---

## 🚦 Getting Started for Developers
1.  **Read the Documentation:** Start with `Project_Master.md` to understand the 50/30/20 commission rules. You cannot build the UI if you do not understand the math.
2.  **Review the Folder Structure:** Ensure your local environment perfectly matches the guidelines in `Frontend_Architecture.md`.
3.  **Seed Your Local Environment:** Follow `Database_Seeding_Strategy.md` to populate your local Firebase emulator with the required God-Mode Organizers and test agents. Do not connect to the live production database.
