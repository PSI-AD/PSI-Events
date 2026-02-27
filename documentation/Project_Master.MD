# 🏢 Project_Master: Enterprise Event Management & ROI Tracking Portal

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Next.js](https://img.shields.io/badge/next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![Firebase](https://img.shields.io/badge/firebase-ffca28?style=for-the-badge&logo=firebase&logoColor=black)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)

**Company:** Property Shop Investment LLC  
**Document Purpose:** Comprehensive System Architecture, Business Logic, and Technical Blueprint.  
**Target Audience:** Executive Management, Investors, System Architects, and Full-Stack Developers.

---

## 🚀 1. Executive Overview

The **Event Management & ROI Tracking Portal** is a custom-built, enterprise-grade web application designed to track roadshow expenses, automate staff logistics, and calculate highly granular **Return on Investment (ROI)**.

It bridges the gap between human operations (event planning, L&D, manager approvals) and complex financial analytics (tiered commission models, dynamic lead targets, and developer sponsorships).

### 🛠️ Tech Stack Philosophy
*   **🎨 Front-End:** Designed via Figma, utilizing **React/Next.js** for real-time dashboard updates and high-performance rendering.
*   **🗄️ Database:** **Firebase NoSQL (Firestore)** for rapid document retrieval and scalable analytics.
*   **⚡ Backend:** **Firebase Cloud Functions** for serverless, event-driven calculations.
*   **🔗 Integrations:** Secure, one-way API webhooks pulling personnel and inventory data strictly from the existing corporate CRM.

---

## 🏗️ 2. System Architecture & Data Integration

The system enforces a strict boundary between mirrored CRM data and natively generated portal data.

### 📍 A. Data Origins

| Data Source | Type | Fields Included |
| :--- | :--- | :--- |
| **CRM (Read-Only)** | 👤 Personnel | Name, Contact, Nationality, Languages, Department, Branch |
| **CRM (Read-Only)** | 🏢 Inventory | Developer Names, Projects, Tiers (Luxury/Medium/Average) |
| **CRM (Read-Only)** | 💰 Revenue | Post-event closed deals, Actual gross revenue |
| **Portal (Native)** | 📅 Logistics | Event Name, Location, Dates, Flight Details, Stand Size |
| **Portal (Native)** | ⚙️ Operations | Approvals, Document Verification, L&D Assessments |
| **Portal (Native)** | 📊 Analytics | Dynamic Lead Targets, Expense Ledger, Disciplinary Logs |

### 🔌 B. API Integration Contracts (CRM to Firebase)

Secure webhooks using **Bearer Tokens (JWT)** push updates into read-only Firebase collections.

*   **👥 1. Staff & Hierarchy Sync** (`/api/v1/sync/users` - POST/PUT)
    *   `crm_user_id`: Absolute source-of-truth ID.
    *   `manager_id`: Used for hierarchical approval routing.
*   **🏗️ 2. Property Inventory Sync** (`/api/v1/sync/projects` - POST/PUT)
    *   `project_id`: Matches PSI Maps database ID.
    *   `project_tier`: Restricted to *Luxury*, *Medium*, or *Average*.
*   **📈 3. Post-Event Revenue Sync** (`/api/v1/events/{event_id}/actuals` - PATCH)
    *   Includes **Idempotency Keys** to prevent double-counting of revenue.

---

## 🗃️ 3. Database Schema (Firebase NoSQL)

Strategic denormalization feeds fast-loading dashboards.

*   **📂 crm_users (Collection):** Mirrored CRM staff data.
    *   *Sub-collection:* `historical_kpis` (Past performance & native `penalized_no_show` tags).
*   **📂 crm_projects (Collection):** Mirrored property inventory categorized by tiers.
*   **📂 events (Collection - The Hub):** Master document for event logistics.
    *   *Sub-collection:* `attendees` (Role, Package, Approval Status, Docs, L&D Clearance).
    *   *Sub-collection:* `proposals` (Developer/Branch/Agent pitches, Expected ROI).
    *   *Sub-collection:* `expenses` (Granular cost ledger: Venue, Hospitality, Marketing, Travel).
*   **📂 analytics_snapshots (Collection):** Pre-calculated dashboard data updated via Cloud Functions.

---

## 💰 4. Core Business Logic & Financial Models

> ### 💎 Agent Commission Packages (Cost Logic)
> *Assuming AED 100,000 Gross Revenue and AED 8,000 in total costs:*
>
> *   **🥇 Gold Package (50%):** Agent gets 50% (AED 50k) but pays their own AED 8k costs. 
>     *   **Agent Net:** AED 42k | **Branch Net:** AED 50k
> *   **🥈 Silver Package (30%):** Agent gets 30% (AED 30k) but pays their own AED 8k costs. 
>     *   **Agent Net:** AED 22k | **Branch Net:** AED 70k
> *   **🥉 Bronze Package (20%):** Agent gets 20% (AED 20k). Branch pays the AED 8k costs. 
>     *   **Agent Net:** AED 20k | **Branch Net:** AED 72k

> ### 📊 Sponsorship vs. Branch Funded (P&L Scenarios)
> *Assuming AED 500,000 Gross Revenue, AED 100,000 Event Cost, AED 20,000 Travel Cost, 20% Bronze Agent Commissions (AED 100k), and a 10% Organizer Share:*
>
> *   **🏢 Scenario A (Sponsored):** Developer funds AED 120,000. Source Agent gets AED 10k reward.
>     *   **Sponsorship Profit:** AED 10k
>     *   **Gross Profit:** AED 390k
>     *   **Branch Net Profit:** **AED 351,000**
> *   **🏦 Scenario B (Non-Sponsored):** Branch funds event.
>     *   **Gross Profit:** AED 280k
>     *   **Branch Net Profit:** **AED 252,000**

---

## ⚙️ 5. Dynamic Lead Target Engine

The system automatically recalculates expectations if branch participation changes.

*   **🎯 The Trigger:** Function listens to `attendees` sub-collection for "Approved" status changes.
*   **🧮 The Math:** If a Branch targets 300 leads via 3 agents (100/agent) and 4 agents actually attend, the system recalculates the per-agent target to **75 leads**.
*   **📉 Deep Funnel Recalculation:** This fractional math applies to Marketing Leads, Walk-ins, Qualified, Meetings, and Deals.

---

## 📋 6. Operational Workflows & Accountability

### 🔐 A. Manager Approvals & No-Show Penalties
1.  **Survey:** Agent submits participation survey (Gold/Silver/Bronze).
2.  **Routing:** Routes to CRM-assigned Manager for *Approve*, *Reject*, or *Pending*.
3.  **Verification:** Once Approved, Agent uploads Visa/Flight docs for Organizer verification.
4.  **Penalty:** If an Agent reaches "Confirmed" but fails to attend, a **"Penalized"** tag is permanently added to their profile.

### 🎓 B. Learning & Development (L&D) Validation
*   **Locking:** Projects are locked for an event and tagged by CRM tier.
*   **Notification:** L&D team uploads tier-specific training and assessments.
*   **Clearance:** Agents must pass project assessments to gain final clearance for the roadshow floor.

---

## 🎨 7. UI/UX Interface Mapping

*   **🕹️ Organizer Dashboard:** Mission control for event creation, global settings, and expense ledgers.
*   **📝 Proposal Screens:** Interactive survey forms and exportable web-views for Developer Sponsorship pitches.
*   **📥 Logistics Desk:** Split-screen view for Manager Approval queues and Document Verification.
*   **📈 Analytics Dashboard:** Visual readouts of Gross Revenue, Funnel widgets, and Agent Leaderboards.

---

## 🔐 8. Role-Based Access Control (RBAC) Matrix

| Role | Access Level | Data Scope |
| :--- | :--- | :--- |
| **Organizer (Admin)** | 👑 Full Access | Global P&L, All Events, All Expenses |
| **Branch Manager** | 🏢 Branch View | Own Branch Approvals & Performance |
| **Agent (Sales)** | 👤 Personal View | Own Targets, Deals, and Net Revenue |
| **L&D Team** | 🎓 Specialist | Attendee Lists, Assessment Management |
| **Developer** | 🔗 External | Tokenized, View-only Proposal Links |

---

## 🔔 9. Automated Notification Matrix

*   **📢 Event Published:** Alert to Branch Managers to select participation model.
*   **📩 Agent Survey:** High-priority alert to Branch Manager for approval.
*   **✅ Manager Approval:** Request to Agent for Visa/Flight uploads.
*   **⚠️ Missing Docs:** Warning to Agent & Manager regarding spot forfeiture.
*   **🚫 No-Show:** Alert to Branch Manager regarding historical penalty tag.
*   **🔄 CRM Sync:** Notification that final ROI dashboards are updated.
