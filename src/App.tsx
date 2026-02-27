import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Calendar, FileText, BarChart3, Settings, Users, Briefcase, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import EventsList from './components/EventsList';
import Dashboard from './components/Dashboard';
import Proposals from './components/Proposals';
import Projects from './components/Projects';
import Team from './components/Team';
import Analytics from './components/Analytics';
import ExecutivePresentation from './pages/ExecutivePresentation';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  return (
    <Router>
      <div className="flex h-screen bg-slate-50 font-sans">
        {/* Sidebar */}
        <aside className="w-64 bg-slate-900 text-white flex flex-col">
          <div className="p-6 border-b border-slate-800">
            <h1 className="text-xl font-bold tracking-tight">ROI Portal</h1>
            <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest">Real Estate Events</p>
          </div>
          
          <nav className="flex-1 p-4 space-y-2">
            <SidebarLink to="/" icon={<LayoutDashboard size={20} />} label="Dashboard" />
            <SidebarLink to="/events" icon={<Calendar size={20} />} label="Events" />
            <SidebarLink to="/proposals" icon={<FileText size={20} />} label="Proposals" />
            <SidebarLink to="/projects" icon={<Briefcase size={20} />} label="Projects" />
            <SidebarLink to="/team" icon={<Users size={20} />} label="Team" />
            <SidebarLink to="/analytics" icon={<BarChart3 size={20} />} label="Analytics" />
          </nav>

          <div className="p-4 border-t border-slate-800 space-y-2">
            <a 
              href="/executive-presentation" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-emerald-400 hover:bg-emerald-500/10 transition-all duration-200 group border border-emerald-500/20"
            >
              <span className="group-hover:scale-110 transition-transform">
                <Sparkles size={20} />
              </span>
              <span className="font-bold text-sm">ROI Vision</span>
            </a>
            <SidebarLink to="/settings" icon={<Settings size={20} />} label="Settings" />
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/events" element={<EventsList />} />
            <Route path="/proposals" element={<Proposals />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/team" element={<Team />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/executive-presentation" element={<ExecutivePresentation />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

function SidebarLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
        isActive 
          ? "bg-slate-800 text-white shadow-lg shadow-black/20" 
          : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
      )}
    >
      <span className={cn(
        "transition-transform duration-200",
        isActive ? "scale-110 text-emerald-400" : "group-hover:scale-110"
      )}>{icon}</span>
      <span className="font-medium">{label}</span>
      {isActive && (
        <motion.div 
          layoutId="sidebar-active"
          className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400"
        />
      )}
    </Link>
  );
}
