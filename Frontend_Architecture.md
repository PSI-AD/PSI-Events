# 🏗️ Frontend Architecture: PSI Event Portal (v2.0)
**Updated:** March 2026 — Reflects actual production file structure.

---

## ⚠️ Key Correction from Original Document
The application is built with **React 19 + Vite 6**, not Next.js. There is no `pages/` directory with file-based routing — routing is handled by **React Router DOM v7** in `App.tsx`.

---

## 📂 Actual File Structure

```
src/
├── App.tsx                          # Root router (37 routes) + global Sonner <Toaster>
├── main.tsx                         # React 19 entry point
├── index.css                        # Full design system (CSS custom properties + Tailwind)
│
├── components/                      # Core full-page data views (legacy location)
│   ├── Dashboard.tsx                # Main KPI dashboard with onSnapshot + widgets
│   ├── EventsList.tsx               # Events CRUD, Firestore onSnapshot, DEMO_EVENTS fallback
│   ├── Analytics.tsx                # Advanced analytics — live Firestore listeners
│   ├── Team.tsx                     # Agent roster — live Firestore listeners
│   ├── Projects.tsx                 # Property inventory — live Firestore listeners
│   ├── Proposals.tsx                # Proposal management
│   ├── GlobalFeatures.tsx           # Search panel, notification center, AI assistant
│   └── shared/
│       └── ui.tsx                   # PageHeader, KPICard, StatusBadge primitives
│
├── features/                        # Domain-specific modules (Feature-Sliced Design)
│   ├── analytics/
│   │   ├── ExecutiveDebrief.tsx     # Post-event P&L debrief for executives
│   │   ├── FloorplanHeatmap.tsx     # Floor heatmap with real-time agent density
│   │   ├── PredictiveAnalyticsDashboard.tsx  # ML-based ROI forecasting by city
│   │   ├── PredictiveEngine.ts      # Calculation engine for predictive analytics
│   │   └── ROIDashboard.tsx         # Legacy ROI widget
│   ├── approvals/
│   │   ├── ApprovalQueue.tsx        # AI-assisted event-day approval queue
│   │   └── MediaCompliance.tsx      # Brand media compliance checker
│   ├── check-in/
│   │   ├── CheckInDashboard.tsx     # Tabbed hub (Agent Pass / Organiser Scanner)
│   │   ├── AgentPassView.tsx        # Agent's QR pass (JWT-signed)
│   │   ├── OrganizerScannerView.tsx # Organiser scanner + live roster
│   │   └── CheckInFlowDiagram.tsx   # Visual flow diagram
│   ├── checklists/
│   │   ├── ActionChecklist.tsx      # Full compliance task list with file uploads
│   │   └── ChecklistSummaryWidget.tsx  # Dashboard compact widget
│   ├── clients/
│   │   ├── FastPass.tsx             # Express client check-in
│   │   └── VIPConcierge.tsx         # AI-generated concierge messaging
│   ├── events/
│   │   ├── BountySystem.tsx         # Agent challenge & rewards board
│   │   ├── DigitalBrochure.tsx      # Interactive client brochure builder
│   │   ├── EventJournal.tsx         # Structured event notes / journal
│   │   ├── IntelDrop.tsx            # Market intelligence feed
│   │   └── LocalizedPitch.tsx       # Multi-language pitch generator (GenAI)
│   ├── expenses/
│   │   ├── BurnRateAuditor.tsx      # Orchestration layer for expense burn rate
│   │   └── BurnRateWidgets.tsx      # Burn rate chart components
│   ├── help/
│   │   └── SystemManual.tsx         # 4-section visual in-app manual
│   ├── leads/
│   │   ├── BusinessCardScanner.tsx  # AI business card → CRM contact extraction
│   │   ├── FollowUpCopilot.tsx      # AI personalized follow-up message generator
│   │   └── VIPIntercept.tsx         # Event-floor VIP lead intercept tool
│   ├── logistics/
│   │   ├── TrafficController.tsx    # Real-time event traffic command center
│   │   └── TravelDesk.tsx           # Flight & accommodation tracking
│   ├── proposals/
│   │   └── ProposalEngine.tsx       # Developer sponsorship proposal tooling
│   ├── settlement/
│   │   ├── SettlementDashboard.tsx  # Main commission settlement UI
│   │   ├── CashAdvance.tsx          # Agent commission advance manager
│   │   ├── CommissionEngine.ts      # Core 50/30/20 math engine
│   │   ├── ReportCard.tsx           # Printable settlement report card
│   │   └── SettlementWidgets.tsx    # Reusable settlement UI fragments
│   └── training/
│       └── AIPitchSimulator.tsx     # AI roleplay pitch objection simulator
│
├── layouts/
│   ├── DashboardLayout.tsx          # Collapsible sidebar + header + bottom mobile nav
│   └── PublicLayout.tsx             # Full-bleed public page wrapper
│
├── pages/                           # Full-page components (rendered by router)
│   ├── Login.tsx                    # Google SSO + DEV seed controls
│   ├── Settings.tsx                 # Theme switcher + app preferences
│   ├── ChecklistPage.tsx            # Full-page checklist action center
│   ├── ExecutivePresentation.tsx    # Dark-mode exec pitch deck (immune to theme)
│   ├── LiveHQ.tsx                   # Public live event display
│   ├── ProductManual.tsx            # Detailed multi-section product manual
│   ├── BountySystemPage.tsx         # Bounty system page wrapper
│   ├── EventJournalPage.tsx         # Journal page wrapper
│   └── MediaCompliancePage.tsx      # Media compliance page wrapper
│
├── services/
│   └── firebase/
│       ├── firebaseConfig.ts        # Firebase SDK init (db, auth, storage)
│       └── ...                      # Additional Firebase helpers
│
├── utils/
│   ├── checklistEngine.ts           # Task rule engine (deadlines, file upload, completion)
│   ├── firebaseSeeder.ts            # Demo data injection with writeBatch
│   ├── ai/                          # GenAI helper utilities
│   └── math/                        # Commission & ROI calculation helpers
│
└── types/                           # TypeScript interfaces
    ├── event.ts
    ├── user.ts
    └── ...
```

---

## 🏗️ Architectural Principles

### 1. Feature-Based Modularity
Logic is encapsulated in `features/`. Each feature owns its components, hooks, and Firestore queries. The `events` module is decoupled from `settlement`, which is decoupled from `analytics`.

### 2. Real-Time Data by Default
All primary data views use `onSnapshot` (not `getDocs`). The `useEffect` always returns the unsubscribe function to prevent memory leaks:
```tsx
useEffect(() => {
  const unsub = onSnapshot(collection(db, 'events'), snap => { ... });
  return () => unsub();
}, []);
```

### 3. Bulletproof Fallback Data
`EventsList.tsx` (and planned for other views) ships with `DEMO_EVENTS` pre-loaded in state. Firestore data replaces the fallback only if ≥1 live document is returned. This guarantees the UI is never blank.

### 4. Design System via CSS Custom Properties
The `index.css` defines all visual tokens as `--psi-*` CSS variables. Tailwind classes should use these tokens via utility classes (`psi-card`, `psi-input`, `btn-accent`) rather than raw color classes.

### 5. Two Theme Support
The app ships two themes switchable from `/settings`:
- **Standard** — Dark slate + emerald (default enterprise look)
- **Modern** — Light/minimal Google-inspired

### 6. UX Trinity Pattern
Every user-facing form interaction must implement:
1. **Loading Spinner** — `isSubmitting` state + `Loader2` icon + `disabled` button
2. **Success Toast** — `toast.success()` from Sonner on Firestore write success
3. **Error Toast** — `toast.error()` on failure with descriptive message

### 7. Collapsible Sidebar Layout
`DashboardLayout.tsx` uses a flex-row layout:
- `<aside>`: `shrink-0 transition-all` — `w-64` expanded, `w-20` collapsed
- `<main wrapper>`: `flex-1 min-w-0` — fills remaining screen width automatically
- No hard-coded `margin-left` anywhere in the codebase
