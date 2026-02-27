import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Layouts
import DashboardLayout from './layouts/DashboardLayout';
import PublicLayout from './layouts/PublicLayout';

// Dashboard (authenticated) pages
import Dashboard from './components/Dashboard';
import EventsList from './components/EventsList';
import Proposals from './components/Proposals';
import Projects from './components/Projects';
import Team from './components/Team';
import Analytics from './components/Analytics';

// Public (standalone, no sidebar) pages
import ExecutivePresentation from './pages/ExecutivePresentation';
import Login from './pages/Login';

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
 */
export default function App() {
  return (
    <Router>
      <Routes>
        {/* ── PUBLIC ROUTES ─────────────────────────────────────────────────
            These pages are completely standalone. No sidebar, no header.
            Accessible to unauthenticated users (e.g. executives, guests).
        ──────────────────────────────────────────────────────────────────── */}
        <Route element={<PublicLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/executive-presentation" element={<ExecutivePresentation />} />
        </Route>

        {/* ── DASHBOARD ROUTES ──────────────────────────────────────────────
            All authenticated pages wrapped in the sidebar + main shell.
            Add protected-route guards here when auth is fully wired.
        ──────────────────────────────────────────────────────────────────── */}
        <Route element={<DashboardLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/events" element={<EventsList />} />
          <Route path="/proposals" element={<Proposals />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/team" element={<Team />} />
          <Route path="/analytics" element={<Analytics />} />
        </Route>
      </Routes>
    </Router>
  );
}
