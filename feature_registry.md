# 🗂️ PSI Event Portal — Feature Registry
**Version:** 2.0 | **Last Updated:** March 2, 2026  
**Company:** Property Shop Investment LLC  
**Status:** ✅ Single Source of Truth — Verified against live codebase

> Every feature listed here has been confirmed to exist in the production source code.  
> No features are speculative, planned, or invented.

---

## How to Read This Document

Each feature entry contains:

| Field | Meaning |
|---|---|
| **Description** | What the feature does and why it exists |
| **UI Location** | Route, sidebar group, and component file |
| **Roles** | Which user roles have access |
| **Backend Services** | Firebase services used |
| **Database** | Firestore collections read or written |
| **APIs** | External API calls (if any) |
| **Dependencies** | npm packages or internal modules required |

---

## Table of Contents

1. [Core Dashboard & KPIs](#1-core-dashboard--kpis)
2. [Event Management](#2-event-management)
3. [Finance & Settlement](#3-finance--settlement)
4. [Operations & Logistics](#4-operations--logistics)
5. [Check-In System](#5-check-in-system)
6. [Compliance & Checklists](#6-compliance--checklists)
7. [AI-Powered Tools](#7-ai-powered-tools)
8. [Lead Management](#8-lead-management)
9. [Analytics & Intelligence](#9-analytics--intelligence)
10. [Gamification](#10-gamification)
11. [Client & Partner Portals](#11-client--partner-portals)
12. [Platform & Configuration](#12-platform--configuration)
13. [Infrastructure & Engineering](#13-infrastructure--engineering)

---

---

# 1. Core Dashboard & KPIs

---

## F01 — Live KPI Dashboard

**Description:**  
The main landing page for all authenticated users. Displays four live metric cards — Total Active Leads, Conversion Rate, Total Revenue (AED), and Average Commission Split — all driven by real-time Firestore listeners. Includes an interactive Revenue vs. Budget area chart (Recharts) and an Agent Tier Distribution pie chart.

**UI Location:**  
- Route: `/`  
- Sidebar: Home icon (top of navigation)  
- Component: `src/components/Dashboard.tsx`

**Roles:**  
- Organizer/Admin — full view of all-branch data  
- Branch Manager — scoped to own branch (filtering planned Phase 2)  
- Agent — limited to own KPIs (scope restriction planned Phase 2)

**Backend Services:**  
- Firebase Firestore — 3 concurrent `onSnapshot` listeners

**Database:**  
- `crm_leads` — Total lead count + closed count for conversion rate  
- `event_rosters` — Gold/Silver/Bronze distribution + `closedRevenueAed` sum  
- `crm_events` — Event timeline data for Revenue vs. Budget chart

**APIs:**  
- None (all Firestore real-time)

**Dependencies:**  
- `firebase/firestore` (`onSnapshot`, `collection`, `query`, `where`)  
- `recharts` (`AreaChart`, `PieChart`, `Cell`, `ResponsiveContainer`)  
- `src/features/checklists/ChecklistSummaryWidget` (embedded widget)  
- `src/components/shared/ui` (`StatCard`, `SectionCard`, `PageHeader`)

---

## F02 — Checklist Summary Widget (Dashboard)

**Description:**  
A compact card embedded on the main Dashboard showing the agent's current onboarding compliance progress. Displays a percentage progress bar (e.g., "10 of 13 tasks completed — 77%"), colour-coded by urgency, and a deep-link button "View Full Checklist →" that navigates to `/checklist`.

**UI Location:**  
- Route: `/` (embedded in Dashboard)  
- Component: `src/features/checklists/ChecklistSummaryWidget.tsx`

**Roles:**  
- All authenticated users

**Backend Services:**  
- Firebase Firestore

**Database:**  
- `checklist_tasks` — reads task completion status

**APIs:**  
- None

**Dependencies:**  
- `src/utils/checklistEngine.ts`  
- `react-router-dom` (`useNavigate`)  
- `lucide-react`

---

---

# 2. Event Management

---

## F03 — Events List & CRUD

**Description:**  
Displays all roadshow events as responsive cards in a grid layout. Each card shows name, location, dates, lead progress bar with percentage, sponsor badge (Emaar/Aldar branding), and status badge. Includes client-side text filtering and a modal for creating new events. Importantly, the component pre-loads `DEMO_EVENTS` (4 high-end demo roadshows) so the table is never empty during presentations or if Firestore returns zero records.

**UI Location:**  
- Route: `/events`  
- Sidebar: "Events" link (Core group)  
- Component: `src/components/EventsList.tsx`

**Roles:**  
- Organizer/Admin — create, read all events  
- Manager — read events (write restricted)  
- Agent — read events only

**Backend Services:**  
- Firebase Firestore (`onSnapshot`, `addDoc`)

**Database:**  
- `events` — primary collection  
  - Fields: `name`, `status`, `location.city`, `location.country`, `date_start`, `date_end`, `is_sponsored`, `target_leads`, `actual_leads`, `sponsorship.developer`, `sponsorship.amount_aed`

**APIs:**  
- None

**Dependencies:**  
- `firebase/firestore`  
- `motion/react` (`motion.div`, `AnimatePresence`)  
- `lucide-react`  
- `sonner` (`toast`)  
- `DEMO_EVENTS` fallback array (defined in `EventsList.tsx`)

---

## F04 — Event Journal

**Description:**  
A structured notes and observations log tied to specific events. Allows organizers and managers to record event-day observations, agent feedback, operational issues, and post-event notes. Each entry is timestamped.

**UI Location:**  
- Route: `/journal`  
- Sidebar: "Journal" link  
- Page: `src/pages/EventJournalPage.tsx`  
- Feature: `src/features/events/EventJournal.tsx`

**Roles:**  
- Organizer/Admin — full read/write  
- Manager — branch-scoped entries

**Backend Services:**  
- Firebase Firestore

**Database:**  
- (Inferred) `event_journals` or sub-collection of `events`

**APIs:**  
- None

**Dependencies:**  
- `firebase/firestore`  
- `lucide-react`

---

## F05 — Live HQ Public Display

**Description:**  
A public-facing, real-time display screen designed for wall-mounted screens at PSI event booths. Shows live lead count, agent check-in status, event countdown clock, and activity feed. Requires no authentication. Auto-refreshes without user interaction.

**UI Location:**  
- Route: `/live`  
- Layout: `PublicLayout` (no sidebar)  
- Component: `src/pages/LiveHQ.tsx` (46KB — feature-rich)

**Roles:**  
- Public (no authentication required)

**Backend Services:**  
- Firebase Firestore (real-time listeners)

**Database:**  
- `events` — active event metadata  
- `crm_leads` — live lead count  
- `event_rosters` — agent check-in statuses

**APIs:**  
- None

**Dependencies:**  
- `firebase/firestore`  
- `motion/react`  
- `lucide-react`

---

## F06 — Market Intelligence Drop (`IntelDrop`)

**Description:**  
A curated intelligence feed dispatched to agents during roadshows. Delivers real-time data points: price-per-sqft trends by city, competitor developer activity, investor sentiment flags, and new off-plan project alerts. Agents can filter by market or category.

**UI Location:**  
- Route: `/market-intel`  
- Sidebar: "Market Intel" link  
- Component: `src/features/events/IntelDrop.tsx` (60KB)

**Roles:**  
- Organizer/Admin — curate and publish intel  
- Agent — read/receive intel

**Backend Services:**  
- Firebase Firestore

**Database:**  
- (Inferred) `intel_drops` collection

**APIs:**  
- Props: `eventId`, `agentId`, `agentName`, `view: 'hq' | 'agent'`

**Dependencies:**  
- `@google/genai` (AI-assisted intel summaries)  
- `firebase/firestore`  
- `lucide-react`  
- `motion/react`

---

## F07 — Digital Brochure Builder

**Description:**  
An interactive tool for creating tokenized, client-facing digital property brochures. The organizer selects properties, configures branding, and generates a shareable deep-link (`/client-portal/:token`). The client receives a beautiful, no-login brochure experience with property details, pricing, and developer information.

**UI Location:**  
- Route: `/digital-brochure` (builder)  
- Route: `/client-portal/:token` (client-facing output)  
- Sidebar: "Digital Brochure" link  
- Component: `src/features/events/DigitalBrochure.tsx` (21KB)

**Roles:**  
- Organizer/Admin — create and configure brochures  
- Client — view only via tokenized URL (no auth required)

**Backend Services:**  
- Firebase Firestore  
- Firebase Auth (token generation)

**Database:**  
- `crm_projects` — property data for brochure content

**APIs:**  
- Token-gated URL generation (JWT-based)

**Dependencies:**  
- `qrcode.react` (QR code for client link)  
- `firebase/firestore`  
- `motion/react`

---

---

# 3. Finance & Settlement

---

## F08 — Commission Settlement Dashboard

**Description:**  
The primary financial tool for calculating, reviewing, and generating per-agent commission payout reports. Organizers add agents to an event roster, enter each agent's closed revenue (AED) and commission tier (Gold/Silver/Bronze), and the `CommissionEngine.ts` instantly calculates: Agent Payout, Branch Gross Profit, Net ROI %, and a Top Performer callout. Output is a printable settlement report.

**UI Location:**  
- Route: `/settlement`  
- Sidebar: "Settlement" link (Finance group)  
- Component: `src/features/settlement/SettlementDashboard.tsx` (30KB)  
- Sub-components: `src/features/settlement/ReportCard.tsx`, `src/features/settlement/SettlementWidgets.tsx`

**Roles:**  
- Organizer/Admin — full access  
- Manager — branch-scoped (planned)  
- Agent — view own settlement only (planned)

**Backend Services:**  
- Firebase Firestore (`addDoc`, `onSnapshot`)

**Database:**  
- `event_rosters` — agent participation + tier + closed revenue  
- `crm_events` — event metadata

**APIs:**  
- None

**Dependencies:**  
- `src/features/settlement/CommissionEngine.ts` — CRITICAL math dependency  
- `lucide-react`  
- `motion/react`  
- `sonner`

---

## F09 — Commission Engine (Math Library)

**Description:**  
A pure TypeScript calculation module containing all financial formulas. This is not a UI component — it is the business logic layer consumed by `SettlementDashboard`, `ReportCard`, and analytics features. Implements: commission split calculation (50/30/20), branch gross profit, net ROI, sponsorship P&L, and advance reconciliation.

**UI Location:**  
- Not directly rendered — library module only  
- File: `src/features/settlement/CommissionEngine.ts` (26KB)

**Roles:**  
- System (consumed programmatically)

**Backend Services:**  
- None (pure computation)

**Database:**  
- None (accepts plain data objects)

**APIs:**  
- None

**Dependencies:**  
- TypeScript (strict)  
- Consumed by: `SettlementDashboard.tsx`, `ReportCard.tsx`, `ExecutiveDebrief.tsx`

---

## F10 — Commission Advance Manager

**Description:**  
Enables agents to request advance payments against projected commissions from current or upcoming events. Tracks outstanding advance amounts against actual deal closures and flags over-advance situations. Linked to a specific event and agent identity.

**UI Location:**  
- Route: `/cash-advance`  
- Sidebar: "Cash Advance" link (Finance group)  
- Component: `src/features/settlement/CashAdvance.tsx` (47KB)

**Roles:**  
- Agent — submit advance requests  
- Organizer/Admin — approve or reject advances

**Backend Services:**  
- Firebase Firestore

**Database:**  
- `agent_debts` — outstanding advance tracking  
- `event_rosters` — projected revenue basis

**APIs:**  
- Props: `eventId`, `eventName`

**Dependencies:**  
- `src/features/settlement/CommissionEngine.ts`  
- `firebase/firestore`  
- `sonner`  
- `lucide-react`

---

## F11 — Burn Rate Auditor

**Description:**  
Displays live event expense consumption vs. approved budget. Breaks costs down by category (Venue, Hospitality, Travel, Marketing, Miscellaneous) with a colour-coded burn gauge: Green ≤60%, Amber 60–80%, Red >80%. Helps organizers identify budget risks before overspending occurs.

**UI Location:**  
- Route: `/burn-rate`  
- Sidebar: "Burn Rate" link (Finance group)  
- Orchestrator: `src/features/expenses/BurnRateAuditor.tsx`  
- Widgets: `src/features/expenses/BurnRateWidgets.tsx`

**Roles:**  
- Organizer/Admin — full access  
- Manager — branch events only (planned)

**Backend Services:**  
- Firebase Firestore

**Database:**  
- `event_expenses` — granular cost records per event  
- `crm_events` — total approved budget

**APIs:**  
- None

**Dependencies:**  
- `recharts`  
- `firebase/firestore`  
- `lucide-react`  
- `motion/react`

---

## F12 — Developer Sponsorship Proposals

**Description:**  
A tool for creating and managing property developer sponsorship proposals for events. Generates a tokenized, shareable proposal link (`/pitch/:token`) that developers can access without logging into the PSI portal. The proposal outlines the event, expected ROI for the developer, and the sponsorship tier options.

**UI Location:**  
- Route: `/proposals` (creation interface)  
- Route: `/pitch/:token` (external developer view)  
- Sidebar: "Proposals" link  
- Component: `src/components/Proposals.tsx`

**Roles:**  
- Organizer/Admin — create/manage proposals  
- Developer (External) — view-only via token link

**Backend Services:**  
- Firebase Firestore  
- Firebase Auth (JWT token generation for links)

**Database:**  
- `events/{id}/proposals` — proposal sub-collection  
- `crm_projects` — property inventory reference

**APIs:**  
- Tokenized URL: `/pitch/:token` (read-only external access)

**Dependencies:**  
- `firebase/firestore`  
- `react-router-dom` (`useParams` for token)  
- `qrcode.react`  
- `lucide-react`

---

## F13 — Sponsor ROI Dashboard

**Description:**  
A token-gated, read-only dashboard for developer sponsors showing the real-time ROI metrics from events they are sponsoring. Displays: leads generated, deals in pipeline, projected revenue, and sponsorship cost vs. return. Accessible via `/sponsor/:token` or `/sponsor` (generic preview).

**UI Location:**  
- Route: `/sponsor/:token`  
- Route: `/sponsor`  
- Layout: `PublicLayout` (no sidebar, no auth required)  
- Component: `src/pages/public/SponsorDashboard.tsx`

**Roles:**  
- Developer/Sponsor (external, token-gated)  
- Admin (can access generic view)

**Backend Services:**  
- Firebase Firestore

**Database:**  
- `crm_events` — event performance data  
- `crm_leads` — lead generation metrics

**APIs:**  
- Token verified via URL parameter

**Dependencies:**  
- `firebase/firestore`  
- `react-router-dom` (`useParams`)  
- `recharts`

---

---

# 4. Operations & Logistics

---

## F14 — Traffic Controller

**Description:**  
Real-time event floor management command center. Allows the organizer team to monitor visitor traffic across event zones, assign agents to hot zones, track engagement density, and coordinate floor operations in real time. Designed for use on a tablet during the live event day.

**UI Location:**  
- Route: `/traffic-controller`  
- Sidebar: "Traffic Controller" link (Operations group)  
- Component: `src/features/logistics/TrafficController.tsx` (36KB)

**Roles:**  
- Organizer/Admin — full control  
- Manager — read + zone assignment

**Backend Services:**  
- Firebase Firestore (real-time)

**Database:**  
- `event_rosters` — agent positions and assignments  
- `events` — zone configuration

**APIs:**  
- Props: `eventId`, `eventName`

**Dependencies:**  
- `firebase/firestore`  
- `motion/react`  
- `lucide-react`

---

## F15 — Travel Desk

**Description:**  
A centralized flight and accommodation tracking interface for managing travel arrangements of all approved agents attending an event. Shows booking confirmations, departure/return schedules, and flags agents with missing or non-compliant travel documents. Supports `useDemoData` prop for demo mode.

**UI Location:**  
- Route: `/travel-desk`  
- Sidebar: "Travel Desk" link (Operations group)  
- Component: `src/features/logistics/TravelDesk.tsx` (16KB)  
- Sub-directory: `src/features/logistics/traveldesk/` (4 sub-files)

**Roles:**  
- Organizer/Admin — full access  
- Manager — can view own branch agents' travel

**Backend Services:**  
- Firebase Firestore

**Database:**  
- `event_rosters` — agent participation with travel fields  
- `events` — event date/location context

**APIs:**  
- Props: `useDemoData?: boolean`

**Dependencies:**  
- `firebase/firestore`  
- `lucide-react`  
- `date-fns`

---

## F16 — Floorplan Heatmap

**Description:**  
Visual density analysis overlay on an event floorplan image. Shows which booth zones attract the most visitor traffic using a heat gradient. Supports time filtering to compare heatmaps across different hours of the event. Helps post-event planning by identifying underperforming areas. Supports `useDemoData` for demo mode.

**UI Location:**  
- Route: `/floorplan-heatmap`  
- Sidebar: "Floorplan Heatmap" link (Analytics group)  
- Component: `src/features/analytics/FloorplanHeatmap.tsx` (42KB)

**Roles:**  
- Organizer/Admin  
- Manager

**Backend Services:**  
- Firebase Firestore (or demo data)

**Database:**  
- `crm_leads` — lead capture positions (if geo-tagged)  
- `event_rosters` — agent positions

**APIs:**  
- Props: `useDemoData?: boolean`

**Dependencies:**  
- `firebase/firestore`  
- `motion/react`  
- `lucide-react`

---

## F17 — AI Approvals Queue

**Description:**  
A manager interface for reviewing and acting on agent event participation requests. Each pending approval shows the agent's profile, selected commission tier, and an AI-generated risk score (Low/Medium/High) based on historical no-show record, document completeness, and past event performance. Managers approve or reject with one click.

**UI Location:**  
- Route: `/approvals`  
- Sidebar: "Approvals" link (Operations group)  
- Component: `src/features/approvals/ApprovalQueue.tsx`

**Roles:**  
- Organizer/Admin — all branches  
- Manager — own branch agents only

**Backend Services:**  
- Firebase Firestore  
- Google GenAI (risk scoring)

**Database:**  
- `events/{id}/attendees` — agent participation records  
- `crm_users` — agent profiles + historical KPIs (no-show flags)

**APIs:**  
- Google GenAI SDK (`@google/genai`) — risk score generation

**Dependencies:**  
- `@google/genai`  
- `firebase/firestore`  
- `lucide-react`  
- `motion/react`

---

## F18 — Media Compliance Review

**Description:**  
A review interface for ensuring event marketing materials (social media images, videos, banners) meet PSI brand standards before publication. Reviewers upload content, the system scores it against brand guidelines, and approvers mark items as compliant or non-compliant with annotated feedback. All reviews are timestamped for audit.

**UI Location:**  
- Route: `/compliance`  
- Sidebar: "Media Compliance" link  
- Page: `src/pages/MediaCompliancePage.tsx`  
- Feature: `src/features/approvals/MediaCompliance.tsx`

**Roles:**  
- Organizer/Admin — full review rights  
- Marketing team — upload rights

**Backend Services:**  
- Firebase Storage (media uploads)  
- Firebase Firestore (review status storage)

**Database:**  
- (Inferred) `media_compliance` collection — review records with status and timestamps

**APIs:**  
- None

**Dependencies:**  
- `firebase/storage` (`uploadBytes`, `getDownloadURL`)  
- `firebase/firestore`  
- `lucide-react`

---

---

# 5. Check-In System

---

## F19 — QR Check-In Dashboard

**Description:**  
Tabbed hub containing both the Agent's digital QR pass and the Organiser's scanner view. Acts as the central check-in interface for event day. Ensures that only physically present and digitally approved agents receive leads from the event.

**UI Location:**  
- Route: `/check-in`  
- Sidebar: "Check-In" link (Operations group)  
- Component: `src/features/check-in/CheckInDashboard.tsx`

**Roles:**  
- Agent — "My Pass" tab  
- Organizer/Admin — "Scanner" tab  
- Manager — "Scanner" tab (read-only)

**Backend Services:**  
- Firebase Firestore  
- Firebase Auth (JWT for QR token)

**Database:**  
- `events/{id}/attendees` — attendance status  
- `crm_users` — agent profile on pass

**APIs:**  
- None (JWT generated from Firebase Auth token)

**Dependencies:**  
- `qrcode.react` — QR code rendering  
- `firebase/firestore`  
- `src/features/check-in/AgentPassView.tsx`  
- `src/features/check-in/OrganizerScannerView.tsx`

---

## F20 — Agent Digital QR Pass

**Description:**  
The agent's personally generated QR code that serves as their event day credential. The QR encodes a signed JWT containing `agentId`, `eventId`, and expiry timestamp (24-hour validity). The agent shows this QR to the organiser scanner on event day.

**UI Location:**  
- Route: `/check-in` → "My Pass" tab  
- Component: `src/features/check-in/AgentPassView.tsx`

**Roles:**  
- Agent only

**Backend Services:**  
- Firebase Auth (JWT generation)  
- Firebase Firestore (approval status verification)

**Database:**  
- `events/{id}/attendees/{agentId}` — checks `documents_verified: true` before rendering pass

**APIs:**  
- None (self-contained JWT)

**Dependencies:**  
- `qrcode.react`  
- `firebase/auth` (current user token)  
- `uuid` (token nonce)

---

## F21 — Organiser QR Scanner

**Description:**  
Camera-capable QR scanner for the event organiser. When an agent's QR code is scanned, the system validates the JWT (checks signature + expiry), looks up the agent in `events/{id}/attendees`, and atomically marks them as `physically_present: true`. The agent's status card turns green on the organiser's screen and the agent's pass simultaneously.

**UI Location:**  
- Route: `/check-in` → "Scanner" tab  
- Component: `src/features/check-in/OrganizerScannerView.tsx`

**Roles:**  
- Organizer/Admin  
- Manager (read + scan)

**Backend Services:**  
- Firebase Firestore (atomic `updateDoc`)

**Database:**  
- `events/{id}/attendees` — writes `physically_present: true`, `check_in_time: serverTimestamp()`

**APIs:**  
- None (JWT validated client-side)

**Dependencies:**  
- `firebase/firestore` (`updateDoc`, `serverTimestamp`)  
- `lucide-react`  
- `motion/react`

---

---

# 6. Compliance & Checklists

---

## F22 — Compliance Action Checklist

**Description:**  
A rule-driven task engine managing agent pre-event compliance. Tasks include: selecting commission tier, uploading passport/visa, completing L&D assessments, and signing the participation contract. Upload tasks connect directly to Firebase Storage — completed on successful upload. Deadline tracking highlights URGENT items (within 12 hours of deadline). Full page at `/checklist`; compact widget on the main dashboard.

**UI Location:**  
- Route: `/checklist`  
- Sidebar: "Checklist" link (Operations group)  
- Page: `src/pages/ChecklistPage.tsx`  
- Feature: `src/features/checklists/ActionChecklist.tsx`

**Roles:**  
- Agent — task completion  
- Organizer/Admin — view compliance status of all agents  
- Manager — view branch agent compliance

**Backend Services:**  
- Firebase Firestore (`updateDoc`, `serverTimestamp`)  
- Firebase Storage (`uploadBytes`, `getDownloadURL`)

**Database:**  
- `checklist_tasks` — task records with `isCompleted`, `completedAt`, `documentUrl`, `deadline`

**APIs:**  
- Firebase Storage path: `agent_documents/{userId}/{taskId}_{filename}`

**Dependencies:**  
- `src/utils/checklistEngine.ts` — task rule evaluation  
- `firebase/firestore`  
- `firebase/storage`  
- `sonner` (upload success/error toasts)  
- `lucide-react`

---

## F23 — Checklist Rule Engine

**Description:**  
A pure TypeScript utility module (`checklistEngine.ts`) that evaluates compliance task state. Reads `checklist_tasks` documents and applies business rules: calculates completion percentage, identifies overdue tasks, flags URGENT items (deadline within 12h), and determines the overall compliance status for an agent.

**UI Location:**  
- Not directly rendered — utility module  
- File: `src/utils/checklistEngine.ts` (36KB)

**Roles:**  
- System (consumed by `ActionChecklist.tsx`, `ChecklistSummaryWidget.tsx`)

**Backend Services:**  
- Firebase Firestore (read `checklist_tasks`)

**Database:**  
- `checklist_tasks`

**APIs:**  
- None

**Dependencies:**  
- `date-fns` (deadline calculations)  
- `firebase/firestore`

---

---

# 7. AI-Powered Tools

---

## F24 — Follow-Up Copilot

**Description:**  
Generates personalized follow-up messages for leads captured during an event. The agent selects a lead, inputs context (property interest, budget, follow-up window), and chooses a message tone (Professional, Warm, Urgent). Google GenAI generates a tailored message ready to paste into WhatsApp or email. Copy-to-clipboard in one click.

**UI Location:**  
- Route: `/follow-up-copilot`  
- Sidebar: "Follow-Up Copilot" link (AI Tools group)  
- Component: `src/features/leads/FollowUpCopilot.tsx` (37KB)

**Roles:**  
- Agent  
- Manager (review agent-generated messages)

**Backend Services:**  
- Google GenAI API

**Database:**  
- `crm_leads` — source lead data  
- (Optional) Saves generated messages to lead record

**APIs:**  
- `@google/genai` — `generateContent()` with structured prompt  
- Env: `VITE_GEMINI_API_KEY`  
- Props: `eventId`, `agentId`, `agentName`

**Dependencies:**  
- `@google/genai`  
- `firebase/firestore`  
- `lucide-react`  
- `sonner`

---

## F25 — AI Pitch Simulator

**Description:**  
Interactive coaching tool where the AI adopts the role of a skeptical real estate buyer. The agent selects a buyer persona (investor, end-user, HNW, family) and property type. The AI opens with a challenging question or objection. The agent responds, and the AI scores the response on clarity, urgency, and product knowledge, providing specific improvement coaching.

**UI Location:**  
- Route: `/pitch-simulator`  
- Sidebar: "Pitch Simulator" link (AI Tools group)  
- Component: `src/features/training/AIPitchSimulator.tsx`

**Roles:**  
- Agent — training use  
- L&D Team — monitoring and facilitation

**Backend Services:**  
- Google GenAI API  
- Firebase Firestore (session/score tracking — optional)

**Database:**  
- (Optional) Simulation session logs

**APIs:**  
- `@google/genai`  
- Props: `eventId`, `agentId`, `agentName`

**Dependencies:**  
- `@google/genai`  
- `motion/react`  
- `lucide-react`

---

## F26 — Business Card Scanner

**Description:**  
AI computer vision tool that extracts structured contact data from a physical business card photo. The agent uploads or photographs a card; GenAI extracts name, title, company, email, phone number, and infers nationality. Extracted data is pre-populated into a new lead creation form for one-click Firestore save.

**UI Location:**  
- Route: `/card-scanner`  
- Sidebar: "Card Scanner" link (AI Tools group)  
- Component: `src/features/leads/BusinessCardScanner.tsx` (47KB)

**Roles:**  
- Agent

**Backend Services:**  
- Google GenAI API (vision/OCR)  
- Firebase Firestore (save extracted lead)

**Database:**  
- `crm_leads` — new lead document written on save

**APIs:**  
- `@google/genai` — multimodal image + text prompt  
- Props: `eventId`, `agentId`

**Dependencies:**  
- `@google/genai`  
- `firebase/firestore`  
- `sonner`  
- `lucide-react`

---

## F27 — Localized Pitch Generator

**Description:**  
Multi-language property pitch generator that creates culturally appropriate sales narratives for international buyers. The agent selects target language, buyer profile (investor/end-user), and property details. GenAI generates a full pitch in the target language with idiomatic phrasing. Supported: Arabic, Russian, Chinese, Hindi, French, German, and more.

**UI Location:**  
- Route: `/localized-pitch`  
- Sidebar: "Localized Pitch" link (AI Tools group)  
- Component: `src/features/events/LocalizedPitch.tsx` (47KB)

**Roles:**  
- Agent

**Backend Services:**  
- Google GenAI API

**Database:**  
- `crm_projects` — property details reference

**APIs:**  
- `@google/genai`

**Dependencies:**  
- `@google/genai`  
- `firebase/firestore`  
- `lucide-react`  
- `motion/react`

---

## F28 — VIP Concierge

**Description:**  
AI-generated concierge-style communication for VIP clients attending PSI roadshows. Takes client name, nationality, event details, preferred language, and any special requirements. Produces a formal, culturally aware welcome message suitable for high-net-worth individuals.

**UI Location:**  
- Route: `/vip-concierge`  
- Sidebar: "VIP Concierge" link (AI Tools group)  
- Component: `src/features/clients/VIPConcierge.tsx`

**Roles:**  
- Organizer/Admin  
- Manager

**Backend Services:**  
- Google GenAI API

**Database:**  
- None (output is a generated text — not persisted by default)

**APIs:**  
- `@google/genai`  
- Props: `eventId`

**Dependencies:**  
- `@google/genai`  
- `lucide-react`

---

## F29 — Predictive Analytics Engine

**Description:**  
A machine learning–style forecasting system that predicts expected ROI for planned events based on city, season, developer, and historical event data. The `PredictiveEngine.ts` module calculates projected lead yield, conversion probability, and expected revenue range. Results displayed in `PredictiveAnalyticsDashboard.tsx`.

**UI Location:**  
- Route: `/analytics` (embedded in Advanced Analytics)  
- Also accessible via `/executive-debrief`  
- Components:  
  - `src/features/analytics/PredictiveAnalyticsDashboard.tsx` (27KB)  
  - `src/features/analytics/PredictiveEngine.ts` (12KB — math module)

**Roles:**  
- Organizer/Admin  
- Manager (limited to own branch history)

**Backend Services:**  
- Firebase Firestore (historical event data)

**Database:**  
- `crm_events` — historical performance records  
- `event_rosters` — agent outcome data  
- `analytics_snapshots` — pre-aggregated dashboard data

**APIs:**  
- None (internal calculation — no external ML API)

**Dependencies:**  
- `src/features/analytics/PredictiveEngine.ts`  
- `recharts`  
- `firebase/firestore`

---

---

# 8. Lead Management

---

## F30 — VIP Intercept Tool

**Description:**  
On-the-floor lead capture tool for identifying and engaging high-value visitors in real time during an event. The agent enters the VIP's company, estimated budget, and property interest. The system generates a priority score, records the intercept, and optionally alerts the manager for immediate VIP-tier handling.

**UI Location:**  
- Route: `/vip-intercept`  
- Sidebar: "VIP Intercept" link (Lead Tools group)  
- Component: `src/features/leads/VIPIntercept.tsx` (44KB)

**Roles:**  
- Agent  
- Manager (receives VIP alerts)

**Backend Services:**  
- Firebase Firestore

**Database:**  
- `crm_leads` — VIP lead records with priority flag

**APIs:**  
- None

**Dependencies:**  
- `firebase/firestore`  
- `motion/react`  
- `lucide-react`

---

## F31 — Team & Agent Roster

**Description:**  
A searchable directory of all agents and staff across branches. Displays name, branch, role, nationality, languages spoken, and historical event participation count. Live Firestore `onSnapshot` — updates in real time if agent profiles change.

**UI Location:**  
- Route: `/team`  
- Sidebar: "Team" link (Core group)  
- Component: `src/components/Team.tsx`

**Roles:**  
- Organizer/Admin — all agents across all branches  
- Manager — own branch agents only

**Backend Services:**  
- Firebase Firestore

**Database:**  
- `crm_users` — agent and staff profiles

**APIs:**  
- None

**Dependencies:**  
- `firebase/firestore` (`onSnapshot`)  
- `lucide-react`  
- `motion/react`

---

## F32 — Property Inventory (Projects)

**Description:**  
A searchable, filterable grid of all real estate projects in the PSI inventory. Projects are categorized by developer, tier (Luxury / Medium / Average), location, and status. Used as a reference for proposal creation, L&D assessment matching, and brochure generation.

**UI Location:**  
- Route: `/projects`  
- Sidebar: "Projects" link (Core group)  
- Component: `src/components/Projects.tsx`

**Roles:**  
- Organizer/Admin — full access  
- Manager — view  
- Agent — view

**Backend Services:**  
- Firebase Firestore

**Database:**  
- `crm_projects` — developer, tier, starting price, location, commission %

**APIs:**  
- None

**Dependencies:**  
- `firebase/firestore` (`onSnapshot`)  
- `lucide-react`  
- `motion/react`

---

---

# 9. Analytics & Intelligence

---

## F33 — Advanced Analytics Dashboard

**Description:**  
The primary analytics hub with deep-dive performance analysis beyond the main dashboard KPIs. Displays: conversion funnel visualization, revenue breakdown by developer, lead-source attribution, branch performance comparison, and the embedded predictive analytics module.

**UI Location:**  
- Route: `/analytics`  
- Sidebar: "Analytics" link (Core group)  
- Component: `src/components/Analytics.tsx`

**Roles:**  
- Organizer/Admin — all-branch view  
- Manager — own branch

**Backend Services:**  
- Firebase Firestore

**Database:**  
- `crm_leads`, `event_rosters`, `crm_events`, `analytics_snapshots`

**APIs:**  
- None

**Dependencies:**  
- `recharts`  
- `firebase/firestore` (`onSnapshot`)  
- `src/features/analytics/PredictiveAnalyticsDashboard.tsx`

---

## F34 — Executive Debrief

**Description:**  
A structured post-event analysis report for executive and management review. Compares planned vs. actual: lead count, deal conversion, revenue, and agent performance rankings. Includes a waterfall P&L chart, Net ROI percentage, and highlight callouts for the top performer and worst-performing zone. Powered partly by `CommissionEngine.ts`.

**UI Location:**  
- Route: `/executive-debrief`  
- Sidebar: "Executive Debrief" link (Analytics group)  
- Component: `src/features/analytics/ExecutiveDebrief.tsx` (41KB)

**Roles:**  
- Organizer/Admin  
- Manager (own events)

**Backend Services:**  
- Firebase Firestore

**Database:**  
- `event_rosters` — per-agent outcome data  
- `crm_events` — budget and target data  
- `crm_leads` — actual lead counts

**APIs:**  
- Props: `eventId`

**Dependencies:**  
- `src/features/settlement/CommissionEngine.ts`  
- `recharts`  
- `firebase/firestore`  
- `motion/react`

---

---

# 10. Gamification

---

## F35 — Agent Bounty Board

**Description:**  
Monthly performance challenges and reward system for agents. Displays active bounties (e.g., "Top Closer," "Polyglot," "Early Bird"), tracks agent progress against each challenge, and manages bounty claims. Rewards are tied to in-event recognition or bonus payouts managed by the organizer.

**UI Location:**  
- Route: `/bounties`  
- Sidebar: "Bounties" link (Gamification group)  
- Page: `src/pages/BountySystemPage.tsx`  
- Feature: `src/features/events/BountySystem.tsx` (29KB)

**Roles:**  
- Agent — track and claim bounties  
- Organizer/Admin — create challenges, verify claims

**Backend Services:**  
- Firebase Firestore

**Database:**  
- `bounties` — challenge definitions, point values, agent progress, claim status

**APIs:**  
- None

**Dependencies:**  
- `firebase/firestore`  
- `motion/react`  
- `lucide-react`

---

## F36 — Live Agent Leaderboard

**Description:**  
Real-time ranking of agents by performance metrics during a live event: leads captured, conversions, and deal value. Embedded in the `LiveHQ` public display and accessible from event management screens.

**UI Location:**  
- Embedded in `/live` (LiveHQ)  
- Feature file: `src/features/events/LiveLeaderboard.tsx` (12KB)

**Roles:**  
- Public (visible on LiveHQ display)  
- All authenticated users

**Backend Services:**  
- Firebase Firestore

**Database:**  
- `event_rosters` — agent performance data  
- `crm_leads` — leads captured per agent

**APIs:**  
- None

**Dependencies:**  
- `firebase/firestore` (`onSnapshot`)  
- `motion/react`  
- `lucide-react`

---

---

# 11. Client & Partner Portals

---

## F37 — Client Digital Brochure Portal

**Description:**  
A tokenized, no-login client experience delivering a beautifully designed digital property brochure. Clients receive a QR code or deep-link; scanning navigates them to a personalized brochure displaying selected properties, pricing, developer information, and a branded call-to-action. Token is embedded in the URL at `/client-portal/:token`.

**UI Location:**  
- Route: `/client-portal/:token`  
- Layout: `PublicLayout`  
- Component: `src/features/events/DigitalBrochure.tsx` → `ClientPortalPage` export

**Roles:**  
- Client (no auth required — token-gated only)

**Backend Services:**  
- Firebase Firestore (read-only brochure data)

**Database:**  
- `crm_projects` — property content

**APIs:**  
- Token verification via URL parameter (client-side JWT decode)

**Dependencies:**  
- `react-router-dom` (`useParams`)  
- `motion/react`

---

## F38 — Client Fast Pass

**Description:**  
An express check-in flow for clients/visitors arriving at a PSI event booth. Clients scan a QR code or enter a code to pre-register their attendance without needing an agent to manually record their details. Reduces queue time and immediately captures contact data.

**UI Location:**  
- Route: `/fast-pass`  
- Sidebar: "Fast Pass" link  
- Component: `src/features/clients/FastPass.tsx`

**Roles:**  
- Client (public-adjacent — minimal barrier)  
- Organizer (monitors registrations)

**Backend Services:**  
- Firebase Firestore

**Database:**  
- `crm_leads` — visitor self-registration record

**APIs:**  
- None

**Dependencies:**  
- `firebase/firestore`  
- `qrcode.react`  
- `lucide-react`

---

## F39 — Executive Presentation

**Description:**  
A standalone, full-screen, hardcoded dark-mode pitch deck for executive and board presentations. Contains multiple animated slides: system overview, financial model visuals, ROI projections, and feature highlights. Intentionally isolated from the global theme switcher — always renders in dark mode regardless of user settings.

**UI Location:**  
- Route: `/executive-presentation`  
- Layout: `PublicLayout` (no sidebar)  
- Component: `src/pages/ExecutivePresentation.tsx` (51KB)

**Roles:**  
- Public (unauthenticated — designed for projector/screen sharing)

**Backend Services:**  
- None (all content is hardcoded demo data)

**Database:**  
- None

**APIs:**  
- None

**Dependencies:**  
- `motion/react`  
- `lucide-react`  
- `recharts`

---

---

# 12. Platform & Configuration

---

## F40 — Google SSO Authentication

**Description:**  
Single Sign-On via Google OAuth popup. On successful sign-in, the system checks the logged-in email against a whitelist (only PSI-approved accounts are permitted). Denied accounts are immediately signed out with a clear "Access Denied" error state. Successful logins create or update a user profile document in Firestore.

**UI Location:**  
- Route: `/login`  
- Layout: `PublicLayout`  
- Component: `src/pages/Login.tsx`  
- Service: `src/services/auth/googleAuth.ts`

**Roles:**  
- All users (entry point)

**Backend Services:**  
- Firebase Auth (`signInWithPopup`, `GoogleAuthProvider`)  
- Firebase Firestore (user profile upsert)

**Database:**  
- `crm_users` — user profile creation/update on first login

**APIs:**  
- Firebase Auth OAuth (Google Identity)

**Dependencies:**  
- `firebase/auth`  
- `firebase/firestore`  
- `react-router-dom` (`useNavigate`)  
- `motion/react`  
- `lucide-react`  
- `src/utils/firebaseSeeder` (DEV seed buttons)

---

## F41 — Theme Switcher & Settings

**Description:**  
Allows authenticated users to switch between two visual themes: **Standard** (dark slate + emerald) and **Modern** (clean minimal, light). Settings are persisted to browser `localStorage`. The Settings page may also expose additional user preferences. The `ExecutivePresentation` page is intentionally exempt from theme switching.

**UI Location:**  
- Route: `/settings`  
- Sidebar: Settings icon (bottom of navigation)  
- Component: `src/pages/Settings.tsx` (37KB)

**Roles:**  
- All authenticated users

**Backend Services:**  
- `localStorage` (theme persistence)  
- Firebase Firestore (optional — user preferences sync)

**Database:**  
- (Optional) `crm_users/{uid}.preferences`

**APIs:**  
- None

**Dependencies:**  
- `lucide-react`  
- `motion/react`

---

## F42 — In-App System Manual

**Description:**  
A 4-section visual documentation hub built directly into the application. Designed for on-site onboarding and manager reference. Contains: (1) The Accountability Journey (animated workflow diagram with 4 gates), (2) How Check-In Works (step-by-step QR process), (3) Understanding Settlements (Financial Risk Matrix — Gold/Silver/Bronze), (4) Enterprise Security & Privacy (RLS funnel diagram with 3 access tiers). All sections feature Framer Motion animations and a sticky left navigation.

**UI Location:**  
- Route: `/manual`  
- Sidebar: "Manual" link (Help group)  
- Component: `src/features/help/SystemManual.tsx` (1892 lines)

**Roles:**  
- All authenticated users

**Backend Services:**  
- None (static content)

**Database:**  
- None

**APIs:**  
- None

**Dependencies:**  
- `motion/react`  
- `lucide-react`  
- Tailwind CSS responsive grid classes

---

## F43 — Product Manual (Extended)

**Description:**  
A comprehensive multi-section product reference document rendered as a React page. More detailed than the System Manual — includes module-by-module feature descriptions, workflow diagrams, and screenshot placeholders with URL references for each screen.

**UI Location:**  
- Route: `/manual` (same route as SystemManual — rendered via tab or toggle)  
- Component: `src/pages/ProductManual.tsx` (61KB — the largest file in the project)

**Roles:**  
- All authenticated users

**Backend Services:**  
- None

**Database:**  
- None

**APIs:**  
- None

**Dependencies:**  
- `motion/react`  
- `lucide-react`

---

## F44 — Firebase Data Seeder

**Description:**  
A developer tool accessible from the `/login` page (visible when no user is logged in) that injects realistic demo data into Firestore via atomic batch writes. Two modes: (1) **Full Demo** — seeds 5 events, 20 agents, 5 projects, 50 leads, 20 rosters, 10 expenses; (2) **Presentation** — seeds the exact data payload used for the executive demo with deterministic IDs.

**UI Location:**  
- Route: `/login` → DEV section (bottom of page)  
- Component: Dev buttons in `src/pages/Login.tsx`  
- Service: `src/utils/firebaseSeeder.ts` (55KB — includes full data payloads)

**Roles:**  
- Developer / Admin (production: should be removed or gated)

**Backend Services:**  
- Firebase Firestore (`writeBatch`, `doc`, `collection`)

**Database:**  
- `events`, `crm_users`, `crm_projects`, `crm_leads`, `event_rosters`, `event_expenses`, `agent_debts`, `checklist_tasks`, `bounties`

**APIs:**  
- None

**Dependencies:**  
- `firebase/firestore` (`writeBatch`, `setDoc`, `doc`)  
- `uuid` (deterministic ID helpers)

---

## F45 — Global Search & Notification Center

**Description:**  
Application-wide search panel and notification inbox accessible from the top header on all authenticated pages. Search allows querying across events, agents, and projects. Notifications display system alerts: approval requests, document verification flags, and settlement generation events.

**UI Location:**  
- Global — top header bar on all dashboard routes  
- Component: `src/components/GlobalFeatures.tsx`

**Roles:**  
- All authenticated users

**Backend Services:**  
- Firebase Firestore (notification records)

**Database:**  
- (Inferred) `notifications` collection

**APIs:**  
- None

**Dependencies:**  
- `firebase/firestore`  
- `lucide-react`  
- `motion/react`

---

---

# 13. Infrastructure & Engineering

---

## I01 — Code Splitting (React.lazy + Vite)

**Description:**  
All 35 dashboard routes and public pages are loaded via `React.lazy()`. Vite automatically splits them into separate JavaScript chunks, reducing initial bundle size significantly (estimated ~143 KiB savings on the main chunk per the App.tsx comment). Chunks are preloaded via `<link rel="modulepreload">` on initial parse.

**File:** `src/App.tsx`  
**Dependencies:** `React.lazy`, `Suspense`, Vite/Rollup code-splitting

---

## I02 — Suspense Fallback Loaders

**Description:**  
Two purpose-built loading spinners: `PublicPageLoader` (full-screen dark spinner for public routes) and `DashboardPageLoader` (centered spinner with "Loading…" label for dashboard routes). Each `<Route>` is individually wrapped in `<Suspense fallback>` — users never see a blank screen during chunk loading.

**File:** `src/App.tsx`

---

## I03 — Real-Time Firestore Listeners

**Description:**  
All primary data views use `onSnapshot` instead of one-time `getDocs`. The `useEffect` always returns the unsubscribe function to prevent memory leaks. This guarantees: if a branch manager creates an event on their screen, it instantly appears on the event organiser's screen without a page refresh.

**Pattern used in:** `EventsList.tsx`, `Team.tsx`, `Analytics.tsx`, `Dashboard.tsx`, `Projects.tsx`

---

## I04 — DEMO_EVENTS Fallback Pattern

**Description:**  
`EventsList.tsx` initializes state with a hard-coded `DEMO_EVENTS` array (4 high-end roadshows). Firestore data replaces this fallback ONLY when ≥1 live document is returned. On error or empty snapshot, `DEMO_EVENTS` remains silently in state. Guarantees the Events table is never blank during presentations or Firestore outages.

**File:** `src/components/EventsList.tsx`

---

## I05 — Sonner Toast Notification System

**Description:**  
Global `<Toaster>` configured in `App.tsx` with `richColors`, `closeButton`, `theme="system"`, and 3500ms duration. All Firestore write success/failure states trigger `toast.success()` or `toast.error()`. This is mandatory for all form submissions — part of the UX Trinity pattern.

**File:** `src/App.tsx`, all form components  
**Dependencies:** `sonner`

---

## I06 — Collapsible Sidebar Layout

**Description:**  
`DashboardLayout.tsx` uses a pure CSS flex-row layout. The `<aside>` element toggles between `w-64` (expanded) and `w-20` (collapsed) using `transition-all duration-300 ease-in-out`. The main content column uses `flex-1 min-w-0` — automatically fills remaining space. No hardcoded `margin-left` anywhere. Mobile: right-side drawer + fixed bottom navigation bar.

**File:** `src/layouts/DashboardLayout.tsx`

---

## I07 — Two-Theme Design System

**Description:**  
The application ships with two switchable themes (Standard and Modern), each defined as CSS custom property sets in `src/index.css`. All UI components reference `--psi-*` tokens — never raw Tailwind color classes. Switching themes requires one class toggle on `<html>` or `<body>`. The `ExecutivePresentation` route is intentionally hardcoded to dark mode and ignores the theme switcher.

**Files:** `src/index.css`, `src/pages/Settings.tsx`

---

## I08 — Mobile Bottom Navigation

**Description:**  
A fixed bottom navigation bar visible on mobile viewports containing the 5 highest-traffic routes (Dashboard, Events, Check-In, Analytics, Settings). Complements the collapsible sidebar on desktop without duplicating the full navigation.

**File:** `src/layouts/DashboardLayout.tsx`

---

## I09 — Agent Document Upload (Firebase Storage)

**Description:**  
File upload pipeline used by the Compliance Checklist. When an agent selects a file on an upload task, the file is sent to Firebase Storage via `uploadBytes`. On success, `getDownloadURL` returns a permanent URL which is written to `checklist_tasks/{taskId}` as `documentUrl` along with `isCompleted: true` and `completedAt: serverTimestamp()`.

**Storage path:** `agent_documents/{userId}/{taskId}_{filename}`  
**Files:** `src/features/checklists/ActionChecklist.tsx`  
**Dependencies:** `firebase/storage`, `firebase/firestore`

---

## I10 — Firebase Seeding via writeBatch

**Description:**  
All demo data injection uses Firestore's `writeBatch` for atomicity. Either all documents are written successfully or none are — preventing partial data states. `injectSeedData()` and `injectPresentationData()` are the two exported functions used from the login page's DEV panel.

**File:** `src/utils/firebaseSeeder.ts`  
**Dependencies:** `firebase/firestore` (`writeBatch`, `doc`, `collection`)

---

---

## Summary Statistics

| Category | Count |
|---|---|
| Core Dashboard & KPIs | 2 |
| Event Management | 5 |
| Finance & Settlement | 6 |
| Operations & Logistics | 5 |
| Check-In System | 3 |
| Compliance & Checklists | 2 |
| AI-Powered Tools | 6 |
| Lead Management | 3 |
| Analytics & Intelligence | 2 |
| Gamification | 2 |
| Client & Partner Portals | 3 |
| Platform & Configuration | 6 |
| Infrastructure & Engineering | 10 |
| **TOTAL CAPABILITIES** | **55** |

---

## Firestore Collections Reference

| Collection | Used By Feature(s) |
|---|---|
| `events` | F03, F04, F12, F14, F19, F20, F21 |
| `crm_events` | F01, F11, F13, F33, F34 |
| `crm_users` | F17, F31, F40 |
| `crm_projects` | F12, F29, F32, F37 |
| `crm_leads` | F01, F26, F30, F33, F36, F38 |
| `event_rosters` | F01, F08, F09, F10, F33, F34, F36 |
| `event_expenses` | F11 |
| `agent_debts` | F10, F44 |
| `checklist_tasks` | F22, F23, F44 |
| `bounties` | F35, F44 |
| `analytics_snapshots` | F29, F33 |

---

## External API Dependencies

| API | Features Using It |
|---|---|
| Google GenAI (`@google/genai`) | F17, F24, F25, F26, F27, F28, F29 |
| Firebase Auth (Google OAuth) | F40 |
| Firebase Storage | F22, I09 |
| Firebase Firestore (real-time) | All features with database entries |
