# 🏢 Project Master: PSI Event Management & ROI Tracking Portal
**Version:** 2.0 (Updated March 2026)

![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite_6-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase_12-ffca28?style=for-the-badge&logo=firebase&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript_5.8-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

**Company:** Property Shop Investment LLC  
**Document Purpose:** Comprehensive System Architecture, Business Logic, and Technical Blueprint.  
**Target Audience:** Executive Management, System Architects, and Full-Stack Developers.

---

## 🚀 1. Executive Overview

The **PSI Event Portal** is a production-deployed, enterprise-grade SPA built on **React 19 + Vite 6**, backed by **Firebase (Firestore, Auth, Storage)**. It replaces all spreadsheet-based event tracking and disconnected WhatsApp approvals with a single, auditable platform.

The platform covers the complete roadshow lifecycle:
- Agent registration and manager approvals
- Logistics verification (visa, flight, travel desk)
- QR-based physical check-in on event day
- Live lead distribution and KPI tracking
- Commission settlement with the 50/30/20 tiered model
- AI-powered tools (Follow-Up Copilot, Business Card Scanner, Pitch Simulator)
- Executive analytics and post-event debrief

---

## 🛠️ 2. Actual Technology Stack (v2.0)

> ⚠️ Earlier docs referenced Next.js. The production application uses **Vite 6** (not Next.js). This section reflects the live codebase.

| Layer | Technology | Version |
|---|---|---|
| Frontend Framework | React | 19.0 |
| Build Tool | Vite | 6.2 |
| Language | TypeScript | 5.8 |
| Styling | Tailwind CSS | 4.1 |
| Animations | Motion (Framer Motion) | 12.x |
| Routing | React Router DOM | 7.x |
| Charts | Recharts | 3.x |
| Icons | Lucide React | 0.546 |
| Toast Notifications | Sonner | 2.x |
| Database | Firebase Firestore | 12.x |
| Auth | Firebase Auth (Google SSO) | 12.x |
| File Storage | Firebase Storage | 12.x |
| AI Integration | Google GenAI SDK (`@google/genai`) | 1.29 |
| QR Codes | qrcode.react | 4.x |
| Date Utilities | date-fns | 4.x |
| Utility | clsx + tailwind-merge | — |
| Fonts | Inter + JetBrains Mono (Fontsource) | — |

---

## 🗂️ 3. Complete Route Inventory (37 Routes)

### Public Routes (no sidebar, unauthenticated access)

| Route | Component | Description |
|---|---|---|
| `/login` | `Login.tsx` | Google SSO login + DEV seed buttons |
| `/executive-presentation` | `ExecutivePresentation.tsx` | Hardcoded dark-mode exec pitch deck |
| `/pitch/:token` | `DeveloperPitch` | Tokenized developer sponsorship pitch |
| `/live` | `LiveHQ.tsx` | Public live event HQ display |
| `/sponsor/:token` | `SponsorDashboard` | Tokenized sponsor-facing dashboard |
| `/sponsor` | `SponsorDashboard` | Generic sponsor view |
| `/client-portal/:token` | `ClientPortalPage` | Client-facing brochure portal |

### Dashboard Routes (requires authentication, collapsible sidebar)

| Route | Component | Category |
|---|---|---|
| `/` | `Dashboard.tsx` | Core — Live KPI dashboard |
| `/events` | `EventsList.tsx` | Core — Roadshow event management |
| `/proposals` | `Proposals.tsx` | Core — Proposal & AI tools config |
| `/projects` | `Projects.tsx` | Core — CRM property inventory |
| `/team` | `Team.tsx` | Core — Agent & staff roster |
| `/analytics` | `Analytics.tsx` | Core — Advanced analytics |
| `/settlement` | `SettlementDashboard.tsx` | Finance — Commission & ROI settlement |
| `/cash-advance` | `CashAdvance.tsx` | Finance — Commission advance requests |
| `/burn-rate` | `BurnRateAuditor.tsx` | Finance — Live expense burn rate |
| `/check-in` | `CheckInDashboard.tsx` | Operations — QR check-in & scanner |
| `/checklist` | `ChecklistPage.tsx` | Operations — Logistics action checklist |
| `/traffic-controller` | `TrafficController.tsx` | Operations — Event traffic command center |
| `/vip-intercept` | `VIPIntercept.tsx` | Operations — VIP lead intercept tool |
| `/vip-concierge` | `VIPConcierge.tsx` | Operations — AI concierge messaging |
| `/travel-desk` | `TravelDesk.tsx` | Operations — Flight & hotel logistics |
| `/floorplan-heatmap` | `FloorplanHeatmap.tsx` | Operations — Floor heatmap analytics |
| `/approvals` | `ApprovalQueue.tsx` | AI — AI-powered approval queue |
| `/follow-up-copilot` | `FollowUpCopilot.tsx` | AI — AI follow-up message generator |
| `/bounties` | `BountySystemPage.tsx` | Gamification — Agent bounty board |
| `/digital-brochure` | `DigitalBrochure.tsx` | Gamification — Digital brochure builder |
| `/fast-pass` | `FastPass.tsx` | Client — Express client check-in |
| `/card-scanner` | `BusinessCardScanner.tsx` | Leads — AI business card scanner |
| `/localized-pitch` | `LocalizedPitch.tsx` | Leads — Multi-language pitch builder |
| `/pitch-simulator` | `AIPitchSimulator.tsx` | Training — AI pitch roleplay simulator |
| `/market-intel` | `IntelDrop.tsx` | Intel — Market intelligence drops |
| `/executive-debrief` | `ExecutiveDebrief.tsx` | Analytics — Post-event exec debrief |
| `/journal` | `EventJournalPage.tsx` | Events — Event journal & notes |
| `/compliance` | `MediaCompliancePage.tsx` | Operations — Media compliance review |
| `/manual` | `SystemManual.tsx` | Help — In-app visual system manual |
| `/settings` | `Settings.tsx` | Config — App settings & theme |

---

## 🗃️ 4. Database Schema (Firestore Collections)

| Collection | Description |
|---|---|
| `events` | Master event documents (name, location, status, budget) |
| `crm_events` | Enriched event data for analytics (budget, sponsorship, agents) |
| `crm_users` | Mirrored CRM staff records (name, branch, role, nationality) |
| `crm_projects` | Property inventory (developer, tier, price, location) |
| `crm_leads` | Lead records linked to events and agents |
| `event_rosters` | Per-event agent participation records (tier, closed revenue) |
| `event_expenses` | Granular expense ledger per event |
| `agent_debts` | Outstanding cost-recovery tracking per agent |
| `checklist_tasks` | Onboarding/compliance task items |
| `bounties` | Agent challenge and reward records |
| `analytics_snapshots` | Pre-aggregated KPI snapshots for dashboards |

---

## 💰 5. Core Financial Models

### 5A. Commission Package Matrix (50/30/20)

| Tier | Agent Share | Risk Bearer | Use Case |
|---|---|---|---|
| 🥇 Gold | 50% of closed revenue | Agent pays all costs | Top performers seeking maximum upside |
| 🥈 Silver | 30% of closed revenue | Shared risk | Mid-tier agents with solid track record |
| 🥉 Bronze | 20% of closed revenue | Branch pays all costs | New agents; zero financial barrier |

**Example** (AED 1,000,000 closed revenue, AED 8,000 costs):
- **Gold:** Agent nets AED 492,000 | Branch nets AED 500,000
- **Silver:** Agent nets AED 292,000 | Branch nets AED 700,000
- **Bronze:** Agent nets AED 200,000 | Branch nets AED 792,000

### 5B. Sponsorship P&L Scenarios

| Scenario | Event Cost | Sponsorship | Branch Net |
|---|---|---|---|
| Developer Sponsored | AED 120,000 | AED 120,000+ | Higher ROI |
| Branch Funded | AED 120,000 | AED 0 | Lower ROI |

### 5C. Commission Advance System (`/cash-advance`)
Agents may request an advance against projected closing commissions. The system tracks outstanding advances against actual deal closures and flags over-advance situations.

---

## 🤖 6. AI & Automation Systems

### 6A. Google GenAI Integration (`@google/genai`)
The portal integrates Google's Generative AI SDK across multiple modules:

- **Follow-Up Copilot** (`/follow-up-copilot`): Generates personalized follow-up messages per lead with tone controls (Professional, Warm, Urgent).
- **AI Pitch Simulator** (`/pitch-simulator`): Interactive roleplay simulator with AI-powered objection handling.
- **Business Card Scanner** (`/card-scanner`): AI extracts contact data from business card photos.
- **VIP Concierge** (`/vip-concierge`): AI-generated concierge messages for VIP clients.
- **Localized Pitch** (`/localized-pitch`): Multi-language pitch generation (Arabic, Russian, Chinese, etc.).
- **AI Approvals Queue** (`/approvals`): AI-assisted agent approval with risk-scoring.
- **Predictive Analytics Engine** (`PredictiveEngine.ts`): ML-driven ROI forecasting per city/event.

### 6B. Automated Engine: 48-Hour Nudger
Firestore-triggered function that fires notifications to agents with incomplete document uploads within 48 hours of the document deadline. Protects against last-minute no-shows.

### 6C. Dynamic Lead Target Dilution
When approved headcount changes, the per-agent lead target auto-recalculates:
```
Per-Agent Target = Branch Total Target ÷ Actual Approved Agents
```
Applied across the full funnel: Marketing Leads → Walk-ins → Qualified → Meetings → Deals.

---

## 📋 7. Checklist & Compliance Engine (`checklistEngine.ts`)

A rule-driven task engine managing agent onboarding and pre-event compliance:
- Supports file uploads (Firebase Storage: `agent_documents/{userId}/{taskId}_{filename}`)
- Upload tasks auto-complete on successful Firestore `updateDoc`
- Deadline tracking with `URGENT` / overdue highlighting
- Progress bar widget on Dashboard; full view at `/checklist`
- Firestore collections: `checklist_tasks`

---

## 🔐 8. Row-Level Security (RLS) Model

| Role | Firestore Access |
|---|---|
| **Executive / Admin** | All collections, all branches, all P&L |
| **Branch Manager** | Own branch agents, events, and P&L only |
| **Agent (Sales)** | Own leads, own QR pass, own settlement only |
| **L&D Team** | Attendee lists and assessment management |
| **Developer (External)** | Tokenized read-only proposal/brochure links |

Security is enforced server-side via **Firestore Security Rules** — not client-side. Client JS cannot bypass these rules.

---

## 🎨 9. UI/UX Architecture

### Layout System
- **DashboardLayout** (`src/layouts/DashboardLayout.tsx`): Collapsible sidebar (`w-64` expanded, `w-20` collapsed), responsive top header, mobile drawer + bottom nav.
- **PublicLayout** (`src/layouts/PublicLayout.tsx`): Full-bleed, no sidebar — used for executive presentation, sponsor portals, live HQ.

### Theme System (`Settings.tsx`)
Two switchable themes:
1. **Standard Theme** — Dark slate + emerald accent (default)
2. **Modern Theme** — Clean minimal, Google/ChatGPT inspired

### Global Features
- **Sonner Toasts** — Global `<Toaster>` in `App.tsx`; `toast.success` / `toast.error` fired on all Firestore writes
- **Button Loading Spinners** — All form submit buttons show inline spinner + `disabled` state during async operations
- **Beautiful Empty States** — All data views render a centered empty state with CTA when collections return 0 records
- **Skeleton Loaders** — Shimmer placeholders shown during initial Firestore hydration

### Design System (`src/index.css`)
CSS custom properties (`--psi-*`) provide theme tokens:
- `--psi-surface`, `--psi-raised`, `--psi-subtle` — background layers
- `--psi-primary`, `--psi-secondary`, `--psi-muted` — text hierarchy
- `--psi-border`, `--psi-border-strong` — border tokens
- Utility classes: `psi-card`, `psi-input`, `btn-accent`, `badge-success`, etc.

---

## 📊 10. Dashboard KPI Architecture

The main Dashboard (`/`) uses live `onSnapshot` listeners:

| KPI | Source Collection | Calculation |
|---|---|---|
| Total Leads | `crm_leads` | `docs.length` |
| Conversion Rate | `crm_leads` | `deal_closed` / total × 100 |
| Total Revenue | `event_rosters` | `SUM(closedRevenueAed)` |
| Avg Commission Split | `event_rosters` | `SUM(tierPercentage)` / count |
| Revenue vs Budget Chart | `crm_events` | Timeline area chart |
| Agent Tiers Pie | `event_rosters` | Gold/Silver/Bronze counts |

Checklist Summary Widget shows task completion progress with deep-link to `/checklist`.

---

## 🔔 11. Notification Matrix

| Trigger | Recipient | Channel |
|---|---|---|
| Event Published | Branch Managers | In-app + email |
| Agent Nominates | Branch Manager | In-app approval queue |
| Manager Approves | Agent | In-app notification |
| 48hr Doc Missing | Agent + Manager | Sonner toast + email nudge |
| Check-In Complete | Both screens | Real-time Firestore update |
| Settlement Generated | Finance team | PDF download available |

---

## 🌱 12. Data Seeding (`firebaseSeeder.ts`)

Two seeder functions are accessible via DEV buttons on the Login page:

1. **`injectSeedData()`** — Full rich dataset covering events, users, projects, leads, rosters, expenses, and agent debts
2. **`injectPresentationData()`** — Exact data payload for executive demo (specific IDs and collection paths)

Both use Firestore `writeBatch` for atomic multi-document writes.

---

## 🚀 13. Deployment

- **Platform:** Firebase Hosting
- **Build:** `vite build` → `dist/`
- **CI/CD:** GitHub Actions (`.github/workflows/`)
- **Dev Server:** `npm run dev` (port 3000, `0.0.0.0` host)
- **Lint:** `tsc --noEmit`

---

## 📁 14. Actual Folder Structure (Current)

```
src/
├── App.tsx                  # Router with 37 routes, Sonner Toaster
├── index.css                # Design system CSS custom properties
├── main.tsx                 # React 19 entry point
├── components/              # Core data views
│   ├── Dashboard.tsx        # Live KPI dashboard
│   ├── EventsList.tsx       # Events CRUD + demo fallback
│   ├── Team.tsx             # Agent roster
│   ├── Projects.tsx         # Property inventory
│   ├── Analytics.tsx        # Advanced analytics (live onSnapshot)
│   ├── Proposals.tsx        # AI proposal config
│   └── shared/ui.tsx        # Shared UI primitives
├── features/
│   ├── analytics/           # ExecutiveDebrief, FloorplanHeatmap, PredictiveEngine
│   ├── approvals/           # ApprovalQueue, MediaCompliance
│   ├── check-in/            # CheckInDashboard, OrganizerScannerView, AgentPassView
│   ├── checklists/          # ActionChecklist, ChecklistSummaryWidget
│   ├── clients/             # FastPass, VIPConcierge
│   ├── events/              # BountySystem, DigitalBrochure, EventJournal, IntelDrop, LocalizedPitch
│   ├── expenses/            # BurnRateAuditor, BurnRateWidgets
│   ├── help/                # SystemManual (4-section visual guide)
│   ├── leads/               # BusinessCardScanner, FollowUpCopilot, VIPIntercept
│   ├── logistics/           # TrafficController, TravelDesk
│   ├── proposals/           # ProposalEngine
│   ├── settlement/          # SettlementDashboard, CashAdvance, CommissionEngine, ReportCard
│   └── training/            # AIPitchSimulator
├── layouts/
│   ├── DashboardLayout.tsx  # Collapsible sidebar + header + mobile nav
│   └── PublicLayout.tsx     # Full-bleed public page wrapper
├── pages/
│   ├── Login.tsx            # Google SSO + DEV seeders
│   ├── Settings.tsx         # Theme + preferences
│   ├── ChecklistPage.tsx    # Full checklist action center
│   ├── ExecutivePresentation.tsx  # Dark-mode pitch deck
│   ├── LiveHQ.tsx           # Public live event feed
│   ├── ProductManual.tsx    # Detailed product manual
│   ├── BountySystemPage.tsx
│   ├── EventJournalPage.tsx
│   └── MediaCompliancePage.tsx
├── services/
│   └── firebase/            # Firestore, Auth, Storage config
├── utils/
│   ├── checklistEngine.ts   # Task rule engine
│   ├── firebaseSeeder.ts    # Demo data injection
│   ├── ai/                  # AI helper utilities
│   └── math/                # Commission & ROI calculations
└── types/                   # TypeScript interfaces
```
