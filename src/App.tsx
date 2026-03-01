import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Layouts (small, load eagerly — they are the shells for every route)
import DashboardLayout from './layouts/DashboardLayout';
import PublicLayout from './layouts/PublicLayout';

// ── LAZY-LOADED ROUTES ────────────────────────────────────────────────────────
// Each import() becomes a separate chunk in the Vite/Rollup build.
// Vite automatically generates a <link rel="modulepreload"> for these
// so they start fetching as soon as the main bundle parses.

// Public (no sidebar)
const ExecutivePresentation = lazy(() => import('./pages/ExecutivePresentation'));
const Login = lazy(() => import('./pages/Login'));
const DeveloperPitch = lazy(() => import('./pages/public/DeveloperPitch'));
const LiveHQ = lazy(() => import('./pages/LiveHQ'));
const SponsorDashboard = lazy(() => import('./pages/public/SponsorDashboard'));

// Dashboard (authenticated)
const Dashboard = lazy(() => import('./components/Dashboard'));
const EventsList = lazy(() => import('./components/EventsList'));
const Proposals = lazy(() => import('./components/Proposals'));
const Projects = lazy(() => import('./components/Projects'));
const Team = lazy(() => import('./components/Team'));
const Analytics = lazy(() => import('./components/Analytics'));
const Settlement = lazy(() => import('./features/settlement/SettlementDashboard'));
const CheckIn = lazy(() => import('./features/check-in/CheckInDashboard'));
const ProductManual = lazy(() => import('./pages/ProductManual'));
const Settings = lazy(() => import('./pages/Settings'));
const ApprovalQueue = lazy(() => import('./features/approvals/ApprovalQueue'));
const EventJournalPage = lazy(() => import('./pages/EventJournalPage'));
const MediaCompliancePage = lazy(() => import('./pages/MediaCompliancePage'));
const BountySystemPage = lazy(() => import('./pages/BountySystemPage'));
const VIPIntercept = lazy(() => import('./features/leads/VIPIntercept'));
const BurnRateAuditor = lazy(() => import('./features/expenses/BurnRateAuditor'));
const ChecklistPage = lazy(() => import('./pages/ChecklistPage'));
const DigitalBrochurePage = lazy(() => import('./features/events/DigitalBrochure'));
const ClientPortalPage = lazy(() =>
  import('./features/events/DigitalBrochure').then(m => ({ default: m.ClientPortalPage }))
);
const FastPassPage = lazy(() => import('./features/clients/FastPass'));
const FloorplanHeatmap = lazy(() => import('./features/analytics/FloorplanHeatmap'));
const TravelDesk = lazy(() => import('./features/logistics/TravelDesk'));
const BusinessCardScanner = lazy(() => import('./features/leads/BusinessCardScanner'));
const LocalizedPitch = lazy(() => import('./features/events/LocalizedPitch'));
const AIPitchSimulator = lazy(() => import('./features/training/AIPitchSimulator'));
const IntelDropPage = lazy(() => import('./features/events/IntelDrop'));
const ExecutiveDebrief = lazy(() => import('./features/analytics/ExecutiveDebrief'));
const VIPConcierge = lazy(() => import('./features/clients/VIPConcierge'));
const FollowUpCopilot = lazy(() => import('./features/leads/FollowUpCopilot'));
const CashAdvancePage = lazy(() => import('./features/settlement/CashAdvance'));
const TrafficController = lazy(() => import('./features/logistics/TrafficController'));

// ── SUSPENSE FALLBACKS ────────────────────────────────────────────────────────

/** Full-screen spinner shown while a public page chunk loads */
function PublicPageLoader() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
    </div>
  );
}

/** Inline spinner shown while a dashboard page chunk loads */
function DashboardPageLoader() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-screen bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Loading…</p>
      </div>
    </div>
  );
}

/**
 * App.tsx — Root router
 *
 * Route Groups (React Router v6 Layout Routes):
 *
 * ┌─ PublicLayout (blank, full-bleed, no sidebar)
 * │   ├── /login
 * │   └── /executive-presentation
 * │
 * └─ DashboardLayout (sidebar + main shell)
 *     ├── /              → Dashboard
 *     ├── /events        → EventsList
 *     ├── /proposals     → Proposals
 *     ├── /projects      → Projects
 *     ├── /team          → Team
 *     └── /analytics     → Analytics
 *
 * Code-splitting: every page is React.lazy() so Vite splits them into
 * separate chunks. The /executive-presentation bundle only loads what
 * it needs — reducing initial JS by ~143 KiB.
 */
export default function App() {
  return (
    <Router>
      <Routes>
        {/* ── PUBLIC ROUTES ─────────────────────────────────────────────────
            Standalone pages. No sidebar, no header.
            Accessible to unauthenticated users (executives, guests).
        ──────────────────────────────────────────────────────────────────── */}
        <Route element={<PublicLayout />}>
          <Route
            path="/login"
            element={
              <Suspense fallback={<PublicPageLoader />}>
                <Login />
              </Suspense>
            }
          />
          <Route
            path="/executive-presentation"
            element={
              <Suspense fallback={<PublicPageLoader />}>
                <ExecutivePresentation />
              </Suspense>
            }
          />
          <Route
            path="/pitch/:token"
            element={
              <Suspense fallback={<PublicPageLoader />}>
                <DeveloperPitch />
              </Suspense>
            }
          />
          <Route
            path="/live"
            element={
              <Suspense fallback={<PublicPageLoader />}>
                <LiveHQ />
              </Suspense>
            }
          />
          {/* Sponsor ROI Portal — standalone, token-gated */}
          <Route
            path="/sponsor/:token"
            element={
              <Suspense fallback={<PublicPageLoader />}>
                <SponsorDashboard />
              </Suspense>
            }
          />
          <Route
            path="/sponsor"
            element={
              <Suspense fallback={<PublicPageLoader />}>
                <SponsorDashboard />
              </Suspense>
            }
          />
          {/* Client-facing Digital Brochure portal — no auth, no sidebar */}
          <Route
            path="/client-portal/:token"
            element={
              <Suspense fallback={<PublicPageLoader />}>
                <ClientPortalPage />
              </Suspense>
            }
          />
        </Route>

        {/* ── DASHBOARD ROUTES ──────────────────────────────────────────────
            All authenticated pages wrapped in the sidebar + main shell.
            Add <ProtectedRoute> guard here when auth is fully wired.
        ──────────────────────────────────────────────────────────────────── */}
        <Route element={<DashboardLayout />}>
          <Route
            path="/"
            element={
              <Suspense fallback={<DashboardPageLoader />}>
                <Dashboard />
              </Suspense>
            }
          />
          <Route
            path="/events"
            element={
              <Suspense fallback={<DashboardPageLoader />}>
                <EventsList />
              </Suspense>
            }
          />
          <Route
            path="/proposals"
            element={
              <Suspense fallback={<DashboardPageLoader />}>
                <Proposals />
              </Suspense>
            }
          />
          <Route
            path="/projects"
            element={
              <Suspense fallback={<DashboardPageLoader />}>
                <Projects />
              </Suspense>
            }
          />
          <Route
            path="/team"
            element={
              <Suspense fallback={<DashboardPageLoader />}>
                <Team />
              </Suspense>
            }
          />
          <Route
            path="/analytics"
            element={
              <Suspense fallback={<DashboardPageLoader />}>
                <Analytics />
              </Suspense>
            }
          />
          <Route
            path="/settlement"
            element={
              <Suspense fallback={<DashboardPageLoader />}>
                <Settlement />
              </Suspense>
            }
          />
          <Route
            path="/check-in"
            element={
              <Suspense fallback={<DashboardPageLoader />}>
                <CheckIn />
              </Suspense>
            }
          />
          <Route
            path="/manual"
            element={
              <Suspense fallback={<DashboardPageLoader />}>
                <ProductManual />
              </Suspense>
            }
          />
          <Route
            path="/settings"
            element={
              <Suspense fallback={<DashboardPageLoader />}>
                <Settings />
              </Suspense>
            }
          />
          <Route
            path="/approvals"
            element={
              <Suspense fallback={<DashboardPageLoader />}>
                <ApprovalQueue />
              </Suspense>
            }
          />
          <Route
            path="/journal"
            element={
              <Suspense fallback={<DashboardPageLoader />}>
                <EventJournalPage />
              </Suspense>
            }
          />
          <Route
            path="/compliance"
            element={
              <Suspense fallback={<DashboardPageLoader />}>
                <MediaCompliancePage />
              </Suspense>
            }
          />
          <Route
            path="/bounties"
            element={
              <Suspense fallback={<DashboardPageLoader />}>
                <BountySystemPage />
              </Suspense>
            }
          />
          <Route
            path="/vip-intercept"
            element={
              <Suspense fallback={<DashboardPageLoader />}>
                <VIPIntercept />
              </Suspense>
            }
          />
          <Route
            path="/burn-rate"
            element={
              <Suspense fallback={<DashboardPageLoader />}>
                <BurnRateAuditor />
              </Suspense>
            }
          />
          <Route
            path="/checklist"
            element={
              <Suspense fallback={<DashboardPageLoader />}>
                <ChecklistPage />
              </Suspense>
            }
          />
          <Route
            path="/digital-brochure"
            element={
              <Suspense fallback={<DashboardPageLoader />}>
                <DigitalBrochurePage />
              </Suspense>
            }
          />
          <Route
            path="/fast-pass"
            element={
              <Suspense fallback={<DashboardPageLoader />}>
                <FastPassPage />
              </Suspense>
            }
          />
          <Route
            path="/floorplan-heatmap"
            element={
              <Suspense fallback={<DashboardPageLoader />}>
                <FloorplanHeatmap useDemoData />
              </Suspense>
            }
          />
          <Route
            path="/travel-desk"
            element={
              <Suspense fallback={<DashboardPageLoader />}>
                <TravelDesk useDemoData />
              </Suspense>
            }
          />
          <Route
            path="/card-scanner"
            element={
              <Suspense fallback={<DashboardPageLoader />}>
                <BusinessCardScanner eventId="event_demo" agentId="agent_demo" />
              </Suspense>
            }
          />
          <Route
            path="/localized-pitch"
            element={
              <Suspense fallback={<DashboardPageLoader />}>
                <LocalizedPitch />
              </Suspense>
            }
          />
          <Route
            path="/pitch-simulator"
            element={
              <Suspense fallback={<DashboardPageLoader />}>
                <AIPitchSimulator eventId="event_demo" agentId="agent_demo_001" agentName="Khalid Al-Mansouri" />
              </Suspense>
            }
          />
          <Route
            path="/market-intel"
            element={
              <Suspense fallback={<DashboardPageLoader />}>
                <IntelDropPage eventId="event_demo" agentId="agent_demo_001" agentName="Khalid Al-Mansouri" view="hq" />
              </Suspense>
            }
          />
          <Route
            path="/executive-debrief"
            element={
              <Suspense fallback={<DashboardPageLoader />}>
                <ExecutiveDebrief eventId="event_demo" />
              </Suspense>
            }
          />
          <Route
            path="/vip-concierge"
            element={
              <Suspense fallback={<DashboardPageLoader />}>
                <VIPConcierge eventId="event_demo" />
              </Suspense>
            }
          />
          <Route
            path="/follow-up-copilot"
            element={
              <Suspense fallback={<DashboardPageLoader />}>
                <FollowUpCopilot eventId="event_demo" agentId="agent_demo_001" agentName="Khalid Al-Mansouri" />
              </Suspense>
            }
          />
          <Route
            path="/cash-advance"
            element={
              <Suspense fallback={<DashboardPageLoader />}>
                <CashAdvancePage eventId="event_demo" eventName="London Luxury Expo 2026" />
              </Suspense>
            }
          />
          <Route
            path="/traffic-controller"
            element={
              <Suspense fallback={<DashboardPageLoader />}>
                <TrafficController eventId="event_demo" eventName="London Luxury Property Expo 2026" />
              </Suspense>
            }
          />
        </Route>
      </Routes>
    </Router>
  );
}
