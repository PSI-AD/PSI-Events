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

// Dashboard (authenticated)
const Dashboard = lazy(() => import('./components/Dashboard'));
const EventsList = lazy(() => import('./components/EventsList'));
const Proposals = lazy(() => import('./components/Proposals'));
const Projects = lazy(() => import('./components/Projects'));
const Team = lazy(() => import('./components/Team'));
const Analytics = lazy(() => import('./components/Analytics'));

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
        </Route>
      </Routes>
    </Router>
  );
}
