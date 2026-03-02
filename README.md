# 🏢 Enterprise Event Management & ROI Tracking Portal
## Property Shop Investment (PSI) LLC — v2.0

**Mission Statement:** To transform international real estate roadshows from logistical black boxes into highly measurable, predictable, and accountable revenue engines.

---

## 🚀 Overview

The **PSI Event Portal** is a production-deployed, enterprise-grade Single Page Application (SPA). It completely replaces manual spreadsheet tracking and disconnected approvals by providing a unified, real-time platform for the full roadshow lifecycle — from agent registration to final commission settlement. Built on **React 19 + Vite 6**, backed by **Firebase**.

### Core Value Pillars
- **📊 Live ROI Tracking:** `onSnapshot` listeners update every KPI in real time without page reloads
- **⚖️ Financial Accountability:** A strict 50/30/20 (Gold/Silver/Bronze) commission matrix dictates who absorbs costs
- **🔐 Absolute Data Security:** Row-Level Security via Firestore Security Rules — enforced server-side only
- **🛂 Operational Chokepoints:** Agents cannot attend without digital Manager Approval, document upload, and L&D clearance
- **🤖 AI-Powered Tools:** Google GenAI integration across 6+ modules for follow-ups, pitching, and card scanning

---

## 📚 Documentation Library

### 🏛️ Architecture & Business Logic
- **[Project_Master.MD](./documentation/Project_Master.MD)** — System architecture, all routes, database schema, financial models
- **[Frontend_Architecture.md](./Frontend_Architecture.md)** — Folder structure and feature-sliced design principles
- **[Utils_Math_Specifications.md](./documentation/Utils_Math_Specifications.md)** — Math formulas for settlement and ROI
- **[QA_and_Architectural_Context.md](./documentation/QA_and_Architectural_Context.md)** — Tech stack rationale and QA checklists

### 🎨 Design & UX
- **[UI_Component_Schemas.md](./documentation/UI_Component_Schemas.md)** — Component prop signatures and design tokens
- **[UAT_Scripts_Phase1.md](./documentation/UAT_Scripts_Phase1.md)** — User Acceptance Testing scripts

### ⚙️ Data & DevOps
- **[Firestore_Security_Rules_Logic.md](./documentation/Firestore_Security_Rules_Logic.md)** — RLS and server-side security rules
- **[Database_Seeding_Strategy.md](./documentation/Database_Seeding_Strategy.md)** — `firebaseSeeder.ts` usage and data structure
- **[API_Postman_Collection.md](./documentation/API_Postman_Collection.md)** — CRM webhook payloads
- **[Deployment_and_CICD_Strategy.md](./documentation/Deployment_and_CICD_Strategy.md)** — Firebase Hosting + GitHub Actions

### 🚦 Onboarding
- **[Developer_Onboarding_Guide.md](./documentation/Developer_Onboarding_Guide.md)** — Day 1 environment setup

---

## 🛠️ Technology Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React 19 + Vite 6 | SPA — **not** Next.js |
| Language | TypeScript 5.8 | Strict mode |
| Styling | Tailwind CSS 4 + custom CSS tokens | Design system via `--psi-*` variables |
| Animations | Motion (Framer Motion) 12 | Used across all feature modules |
| Routing | React Router DOM 7 | 37 routes total |
| Charts | Recharts 3 | Analytics + settlement views |
| Toasts | Sonner 2 | Global `<Toaster>` in `App.tsx` |
| Database | Firebase Firestore 12 | Live `onSnapshot` throughout |
| Auth | Firebase Auth | Google SSO |
| Storage | Firebase Storage | Agent document uploads |
| AI | `@google/genai` 1.29 | 6+ AI-powered features |
| QR | qrcode.react 4 | Agent digital passes |

---

## 🚦 Getting Started for Developers

1. **Clone the repo** and copy `.env.example` → `.env.local`. Fill in all Firebase and GenAI keys.
2. **Install:** `npm install`
3. **Dev server:** `npm run dev` (runs on port 3000)
4. **Seed demo data:** Navigate to `/login` and click either DEV seed button to populate Firestore with a full rich dataset or presentation-ready data.
5. **Type check:** `npm run lint` (`tsc --noEmit`)
6. **Build:** `npm run build`

> ⚠️ **Do not connect to the production Firebase project during local development.** Use the seeder to create demo data. Never delete production Firestore collections.

---

## 🗺️ Application Routes (37 Routes)

### Public (unauthenticated)
| Route | Purpose |
|---|---|
| `/login` | Google SSO + DEV seed buttons |
| `/executive-presentation` | Hardcoded dark executive pitch deck |
| `/pitch/:token` | Tokenized developer sponsorship pitch |
| `/live` | Public live event HQ feed |
| `/sponsor/:token` | Sponsor-facing dashboard |
| `/client-portal/:token` | Client brochure portal |

### Dashboard (requires auth, collapsible sidebar)
| Category | Routes |
|---|---|
| **Core** | `/`, `/events`, `/proposals`, `/projects`, `/team`, `/analytics` |
| **Finance** | `/settlement`, `/cash-advance`, `/burn-rate` |
| **Operations** | `/check-in`, `/checklist`, `/traffic-controller`, `/vip-intercept`, `/vip-concierge`, `/travel-desk`, `/floorplan-heatmap`, `/compliance` |
| **AI Tools** | `/approvals`, `/follow-up-copilot`, `/card-scanner`, `/pitch-simulator`, `/localized-pitch` |
| **Gamification** | `/bounties`, `/digital-brochure` |
| **Intel & Analytics** | `/market-intel`, `/executive-debrief`, `/analytics` |
| **Config / Help** | `/manual`, `/settings`, `/journal`, `/fast-pass` |
