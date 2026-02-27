# Agile Project Management: Epics & User Stories

**Project:** Enterprise Event Management & ROI Tracking Portal  
**Purpose:** To translate the `Project_Master.md` architectural blueprint into actionable development tickets (Jira/Trello).

---

## 📋 Project Manager Context & Strategy (The "Why")
This document bridges the gap between the grand vision and daily developer tasks. We are using the **"Given-When-Then"** format for Acceptance Criteria. This leaves zero ambiguity for the developers and the QA team. If a feature does not pass the Acceptance Criteria exactly as written here, the ticket fails and is sent back to development. We are prioritizing **Epic 1** and **Epic 2** for the initial Phase 1 MVP sprint.

---

## 🏗️ EPIC 1: System Foundation & CRM Integration
**Objective:** Establish the core Firebase NoSQL database, configure the front-end repository (`Frontend_Architecture.md`), and build the secure API webhooks to pull read-only data from the CRM (bypassing Odoo).

### 👤 User Story 1.1: Initialize Front-End Architecture
**As a** Lead Developer,  
**I want to** initialize the React/Next.js repository using the strict Feature-Sliced Design folder structure (`/features`, `/utils`, `/components`),  
**So that** the codebase remains scalable and mathematically isolated from day one.

**Acceptance Criteria:**
*   **Given** the repository is cloned, **When** a developer inspects the root, **Then** they must see the exact folder structure mandated in the documentation.
*   **Given** the `/utils` folder is created, **When** math functions are needed, **Then** they must exclusively live in this directory.

### 👤 User Story 1.2: CRM Staff & Hierarchy API Sync
**As a** System Architect,  
**I want to** build a secure POST webhook to sync Agent profiles, Branch assignments, and Manager IDs from the CRM into the Firebase `crm_users` collection,  
**So that** we have a live, single source of truth for all personnel without manual data entry.

**Acceptance Criteria:**
*   **Given** a payload arrives from the CRM, **When** the `manager_id` is processed, **Then** it must correctly map to an existing `crm_user_id` for approval routing.
*   **Given** the API is called, **When** it lacks a valid Bearer Token, **Then** it must reject the payload with a `401 Unauthorized` error.

### 👤 User Story 1.3: PSI Maps Property Inventory Sync
**As an** Event Organizer,  
**I want** the system to automatically pull live property inventory (Developer Name, Project Name, Tier) into the `crm_projects` collection,  
**So that** I can accurately tag roadshows with the correct Luxury, Medium, or Average properties.

**Acceptance Criteria:**
*   **Given** the CRM has an active property, **When** the sync runs, **Then** it appears in the portal.
*   **Given** a property is tagged as "Luxury" in the CRM, **When** it syncs to Firebase, **Then** the exact tier string must be preserved to trigger future L&D workflows.

---

## 📅 EPIC 2: Event Creation & Core Logistics
**Objective:** Build the Organizer Dashboard to replace manual spreadsheets, allowing the creation of roadshows, baseline targets, and expense ledgers.

### 👤 User Story 2.1: The Event Creation Wizard
**As an** Event Organizer,  
**I want to** use a multi-step form to input event logistics, global commission shares, and expected baseline targets,  
**So that** a master event document is created in the Firebase `events` collection.

**Acceptance Criteria:**
*   **Given** the Organizer is on Step 3, **When** they input "100" for expected leads, **Then** it is saved cleanly to the `baseline_targets` map.
*   **Given** the form is submitted, **When** successful, **Then** the user is routed to the active Event Dashboard.

### 👤 User Story 2.2: The Expense Tracker Ledger
**As an** Event Organizer,  
**I want to** log expenses across Venue, Hospitality, Marketing, and Travel categories,  
**So that** the total event cost is accurately tracked for the Gross Profit calculation.

**Acceptance Criteria:**
*   **Given** an Organizer adds a 50,000 AED venue cost, **When** submitted, **Then** the `totalEventCost` KPI on the dashboard updates instantly.
*   **Given** an expense is entered, **When** selecting "Paid By", **Then** the user must be forced to choose between Branch, Sponsor, or Agent.

---

## ⚖️ EPIC 3: The Proposal Engine & Approval Chokepoint
**Objective:** Deploy the interactive surveys where agents choose their financial risk (Gold/Silver/Bronze) and enforce the strict Manager Approval and Document Verification workflows.

### 👤 User Story 3.1: Agent Commission Tier Selection
**As a** Sales Agent,  
**I want to** view an interactive survey that clearly displays the Gold (50%), Silver (30%), and Bronze (20%) packages,  
**So that** I can select my financial risk profile for the roadshow.

**Acceptance Criteria:**
*   **Given** the Agent opens the survey, **When** they click "Gold", **Then** a warning must explicitly state "Agent Covers All Costs."
*   **Given** the survey is submitted, **When** processed, **Then** the Agent's status automatically changes to "Pending Manager Approval".

### 👤 User Story 3.2: Branch Manager Approval Routing
**As a** Branch Manager,  
**I want to** see a filtered queue of only my assigned agents who have applied,  
**So that** I can Approve or Reject them without seeing data from other branches.

**Acceptance Criteria:**
*   **Given** a Manager logs in, **When** they view the queue, **Then** the Row-Level Security rules must block all agents outside their `branch_name`.
*   **Given** a Manager clicks "Approve", **When** the database updates, **Then** an automated push notification is triggered to the Agent to upload travel documents.

### 👤 User Story 3.3: Visa & Flight Document Verification
**As an** Event Organizer,  
**I want to** review uploaded PDF documents from Approved agents,  
**So that** I can manually click "Verify" to officially lock them into the "Confirmed" attendee pool.

**Acceptance Criteria:**
*   **Given** an Agent is "Approved", **When** they have not uploaded documents, **Then** their final status cannot change to "Confirmed".
*   **Given** an Organizer clicks "Verify", **When** successful, **Then** the Agent is officially added to the dynamic target calculation pool.

---

## 🧠 EPIC 4: Serverless Math & ROI Analytics
**Objective:** Implement the Cloud Functions to dynamically dilute targets based on headcount, and build the executive dashboards to calculate Gross Profit using the isolated `/utils` math logic.

### 👤 User Story 4.1: Dynamic Target Dilution (Cloud Function)
**As a** Branch Manager,  
**I want to** the system to automatically divide my branch's total expected leads by the actual number of "Approved" agents,  
**So that** individual expectations are perfectly fair and mathematically accurate.

**Acceptance Criteria:**
*   **Given** a Branch Target of 300 leads, **When** the 4th agent is "Approved", **Then** the Cloud Function must instantly recalculate the per-agent target to exactly 75.
*   **Given** the approved agent count drops to 0, **When** the function runs, **Then** it must catch the divide-by-zero error and return 0 targets without crashing.

### 👤 User Story 4.2: Sponsorship vs. Non-Sponsorship P&L Math
**As an** Executive,  
**I want the** dashboard to calculate Gross Profit accurately whether the event is Branch-Funded or Developer-Sponsored,  
**So that** I can see our exact financial liability and final ROI.

**Acceptance Criteria:**
*   **Given** a Sponsorship amount of 120,000 AED and an Event Cost of 100,000 AED, **When** the dashboard loads, **Then** the Gross Profit must include the 20,000 AED Sponsorship Profit.
*   **Given** no sponsorship exists, **When** the dashboard loads, **Then** the math must cleanly default to deducting the Event Cost from the Branch Gross Revenue.

### 👤 User Story 4.3: The Agent "Blindfold" (Security Rule)
**As a** System Admin,  
**I want to** enforce strict Row-Level Security on the analytics collections,  
**So that** Agents cannot see the company's Total Gross Profit or Sponsorship amounts.

**Acceptance Criteria:**
*   **Given** an Agent logs in, **When** they attempt to view the Executive Dashboard, **Then** they are blocked.
*   **Given** an Agent views their personal dashboard, **When** it loads, **Then** they can only see their dynamic target leads, their actual deals, and their specific Bronze/Silver/Gold net revenue.
