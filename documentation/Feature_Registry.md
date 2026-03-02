# 📋 Feature Registry — PSI Event Portal
**Version:** 2.0 | **Last Updated:** March 2, 2026  
**Source of Truth:** Live codebase audit of `src/`

> Every capability listed here was verified to exist in the production codebase. No features are invented or speculative.

---

## 🗂️ Feature Registry by Category

### CATEGORY 1 — CORE DASHBOARD & ANALYTICS

| ID | Feature Name | Route | File | Status |
|---|---|---|---|---|
| F01 | Live KPI Dashboard | `/` | `src/components/Dashboard.tsx` | ✅ Live |
| F02 | Advanced Analytics | `/analytics` | `src/components/Analytics.tsx` | ✅ Live |
| F03 | Executive Debrief | `/executive-debrief` | `src/features/analytics/ExecutiveDebrief.tsx` | ✅ Live |
| F04 | Predictive Analytics | `/analytics` | `src/features/analytics/PredictiveAnalyticsDashboard.tsx` | ✅ Live |
| F05 | Floorplan Heatmap | `/floorplan-heatmap` | `src/features/analytics/FloorplanHeatmap.tsx` | ✅ Live |

### CATEGORY 2 — EVENT MANAGEMENT

| ID | Feature Name | Route | File | Status |
|---|---|---|---|---|
| F06 | Events CRUD | `/events` | `src/components/EventsList.tsx` | ✅ Live |
| F07 | Event Journal | `/journal` | `src/pages/EventJournalPage.tsx` | ✅ Live |
| F08 | Market Intel Drop | `/market-intel` | `src/features/events/IntelDrop.tsx` | ✅ Live |
| F09 | Digital Brochure Builder | `/digital-brochure` | `src/features/events/DigitalBrochure.tsx` | ✅ Live |
| F10 | Client Brochure Portal | `/client-portal/:token` | `src/features/events/DigitalBrochure.tsx` | ✅ Live |
| F11 | Live HQ Public Display | `/live` | `src/pages/LiveHQ.tsx` | ✅ Live |

### CATEGORY 3 — FINANCE & SETTLEMENT

| ID | Feature Name | Route | File | Status |
|---|---|---|---|---|
| F12 | Commission Settlement | `/settlement` | `src/features/settlement/SettlementDashboard.tsx` | ✅ Live |
| F13 | Commission Math Engine | _(library)_ | `src/features/settlement/CommissionEngine.ts` | ✅ Live |
| F14 | Settlement Report Card | `/settlement` | `src/features/settlement/ReportCard.tsx` | ✅ Live |
| F15 | Commission Advance | `/cash-advance` | `src/features/settlement/CashAdvance.tsx` | ✅ Live |
| F16 | Burn Rate Auditor | `/burn-rate` | `src/features/expenses/BurnRateAuditor.tsx` | ✅ Live |
| F17 | Proposals Engine | `/proposals` | `src/components/Proposals.tsx` | ✅ Live |
| F18 | Developer Pitch Portal | `/pitch/:token` | `src/pages/public/DeveloperPitch.tsx` | ✅ Live |
| F19 | Sponsor Dashboard | `/sponsor/:token` | `src/pages/public/SponsorDashboard.tsx` | ✅ Live |

### CATEGORY 4 — OPERATIONS & LOGISTICS

| ID | Feature Name | Route | File | Status |
|---|---|---|---|---|
| F20 | QR Check-In Dashboard | `/check-in` | `src/features/check-in/CheckInDashboard.tsx` | ✅ Live |
| F21 | Agent Digital QR Pass | `/check-in` | `src/features/check-in/AgentPassView.tsx` | ✅ Live |
| F22 | Organiser QR Scanner | `/check-in` | `src/features/check-in/OrganizerScannerView.tsx` | ✅ Live |
| F23 | Traffic Controller | `/traffic-controller` | `src/features/logistics/TrafficController.tsx` | ✅ Live |
| F24 | Travel Desk | `/travel-desk` | `src/features/logistics/TravelDesk.tsx` | ✅ Live |
| F25 | Compliance Action Checklist | `/checklist` | `src/pages/ChecklistPage.tsx` | ✅ Live |
| F26 | Checklist Summary Widget | `/` (dashboard) | `src/features/checklists/ChecklistSummaryWidget.tsx` | ✅ Live |
| F27 | Media Compliance Review | `/compliance` | `src/pages/MediaCompliancePage.tsx` | ✅ Live |
| F28 | AI Approvals Queue | `/approvals` | `src/features/approvals/ApprovalQueue.tsx` | ✅ Live |

### CATEGORY 5 — AI-POWERED TOOLS

| ID | Feature Name | Route | File | Status |
|---|---|---|---|---|
| F29 | Follow-Up Copilot | `/follow-up-copilot` | `src/features/leads/FollowUpCopilot.tsx` | ✅ Live |
| F30 | AI Pitch Simulator | `/pitch-simulator` | `src/features/training/AIPitchSimulator.tsx` | ✅ Live |
| F31 | Business Card Scanner | `/card-scanner` | `src/features/leads/BusinessCardScanner.tsx` | ✅ Live |
| F32 | Localized Pitch Generator | `/localized-pitch` | `src/features/events/LocalizedPitch.tsx` | ✅ Live |
| F33 | VIP Concierge | `/vip-concierge` | `src/features/clients/VIPConcierge.tsx` | ✅ Live |
| F34 | Predictive Engine | _(library)_ | `src/features/analytics/PredictiveEngine.ts` | ✅ Live |

### CATEGORY 6 — LEAD MANAGEMENT

| ID | Feature Name | Route | File | Status |
|---|---|---|---|---|
| F35 | VIP Intercept Tool | `/vip-intercept` | `src/features/leads/VIPIntercept.tsx` | ✅ Live |
| F36 | Team/Agent Roster | `/team` | `src/components/Team.tsx` | ✅ Live |
| F37 | Projects Inventory | `/projects` | `src/components/Projects.tsx` | ✅ Live |

### CATEGORY 7 — GAMIFICATION

| ID | Feature Name | Route | File | Status |
|---|---|---|---|---|
| F38 | Bounty System | `/bounties` | `src/pages/BountySystemPage.tsx` | ✅ Live |
| F39 | Agent Leaderboard | _(embedded)_ | `src/features/events/LiveLeaderboard.tsx` | ✅ Live |

### CATEGORY 8 — CLIENT-FACING TOOLS

| ID | Feature Name | Route | File | Status |
|---|---|---|---|---|
| F40 | Client Fast Pass | `/fast-pass` | `src/features/clients/FastPass.tsx` | ✅ Live |
| F41 | Executive Presentation | `/executive-presentation` | `src/pages/ExecutivePresentation.tsx` | ✅ Live |

### CATEGORY 9 — PLATFORM & CONFIGURATION

| ID | Feature Name | Route | File | Status |
|---|---|---|---|---|
| F42 | Google SSO Auth | `/login` | `src/pages/Login.tsx` | ✅ Live |
| F43 | Email Whitelist Access Control | _(auth layer)_ | `src/services/auth/googleAuth.ts` | ✅ Live |
| F44 | Settings & Theme Switcher | `/settings` | `src/pages/Settings.tsx` | ✅ Live |
| F45 | In-App System Manual | `/manual` | `src/features/help/SystemManual.tsx` | ✅ Live |
| F46 | Product Manual | `/manual` | `src/pages/ProductManual.tsx` | ✅ Live |
| F47 | Global Search Panel | _(global)_ | `src/components/GlobalFeatures.tsx` | ✅ Live |
| F48 | Notification Center | _(global)_ | `src/components/GlobalFeatures.tsx` | ✅ Live |
| F49 | Firebase Data Seeder | `/login` (DEV) | `src/utils/firebaseSeeder.ts` | ✅ Live |
| F50 | Checklist Rule Engine | _(library)_ | `src/utils/checklistEngine.ts` | ✅ Live |

### CATEGORY 10 — INFRASTRUCTURE

| ID | Feature | Implementation |
|---|---|---|
| I01 | Code Splitting | All 30+ routes are `React.lazy()` — separate Vite chunks |
| I02 | Suspense Fallbacks | Per-layout spinner components (`PublicPageLoader`, `DashboardPageLoader`) |
| I03 | Real-Time Listeners | All data views use `onSnapshot` with cleanup unsubscribe |
| I04 | Demo Data Fallback | `DEMO_EVENTS` pre-loaded state in `EventsList.tsx` |
| I05 | Toast Notifications | Global Sonner `<Toaster>` in `App.tsx` |
| I06 | Collapsible Sidebar | Pure CSS `transition-all`, `w-64`/`w-20`, no hardcoded margins |
| I07 | Two-Theme System | Standard (dark slate) + Modern (light minimal) |
| I08 | Mobile Bottom Nav | Fixed bottom bar — 5 highest-traffic routes |
| I09 | Mobile Drawer Nav | Right-side slide-in menu via Framer Motion |
| I10 | Agent Document Upload | Firebase Storage: `agent_documents/{userId}/{taskId}_{filename}` |

---

## 📊 Registry Statistics

| Category | Feature Count |
|---|---|
| Core Dashboard & Analytics | 5 |
| Event Management | 6 |
| Finance & Settlement | 8 |
| Operations & Logistics | 9 |
| AI-Powered Tools | 6 |
| Lead Management | 3 |
| Gamification | 2 |
| Client-Facing Tools | 2 |
| Platform & Configuration | 9 |
| Infrastructure | 10 |
| **TOTAL** | **60** |
