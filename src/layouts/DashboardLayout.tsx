import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Calendar,
    FileText,
    BarChart3,
    Settings,
    Users,
    Briefcase,
    Sparkles,
    Calculator,
    QrCode,
    Menu,
    X,
    TrendingUp,
    BookOpen,
    Sun,
    Moon,
    BrainCircuit,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// ── All nav items ─────────────────────────────────────────────────────────────

const NAV_ITEMS = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/events', icon: Calendar, label: 'Events' },
    { to: '/proposals', icon: FileText, label: 'Proposals' },
    { to: '/projects', icon: Briefcase, label: 'Projects' },
    { to: '/team', icon: Users, label: 'Team' },
    { to: '/approvals', icon: BrainCircuit, label: 'AI Approvals' },
    { to: '/analytics', icon: BarChart3, label: 'Analytics' },
    { to: '/settlement', icon: Calculator, label: 'Settlement' },
    { to: '/check-in', icon: QrCode, label: 'Check-In' },
    { to: '/manual', icon: BookOpen, label: 'System Manual' },
];

// Bottom nav shows the 4 highest-traffic items on mobile
const BOTTOM_NAV_ITEMS = [
    { to: '/', icon: LayoutDashboard, label: 'Home' },
    { to: '/events', icon: Calendar, label: 'Events' },
    { to: '/approvals', icon: BrainCircuit, label: 'Approvals' },
    { to: '/analytics', icon: TrendingUp, label: 'Analytics' },
];

// ── Sidebar link ──────────────────────────────────────────────────────────────

function SidebarLink({
    to,
    icon: Icon,
    label,
    onClick,
}: {
    to: string;
    icon: React.ElementType;
    label: string;
    onClick?: () => void;
}) {
    const location = useLocation();
    const isActive = location.pathname === to;

    return (
        <Link
            to={to}
            onClick={onClick}
            className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group min-h-[44px]',
                isActive
                    ? 'bg-slate-800 text-white shadow-lg shadow-black/20'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
            )}
        >
            <span className={cn(
                'transition-transform duration-200 flex-shrink-0',
                isActive ? 'scale-110 text-emerald-400' : 'group-hover:scale-110'
            )}>
                <Icon size={20} />
            </span>
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

// ── Mobile bottom nav link ────────────────────────────────────────────────────

function BottomNavItem({ to, icon: Icon, label }: { to: string; icon: React.ElementType; label: string }) {
    const location = useLocation();
    const isActive = location.pathname === to;

    return (
        <Link
            to={to}
            className={cn(
                'flex flex-col items-center justify-center flex-1 py-2 gap-1 min-h-[56px] transition-colors',
                isActive ? 'text-emerald-400' : 'text-slate-500'
            )}
        >
            <Icon size={22} className={cn('transition-transform', isActive && 'scale-110')} />
            <span className={cn('text-[10px] font-bold', isActive ? 'text-emerald-400' : 'text-slate-500')}>
                {label}
            </span>
        </Link>
    );
}

// ── Page title from route ─────────────────────────────────────────────────────

function usePageTitle(): string {
    const location = useLocation();
    const match = NAV_ITEMS.find(n => n.to === location.pathname);
    return match?.label ?? 'PSI Portal';
}

// ── Main Layout ───────────────────────────────────────────────────────────────

/**
 * DashboardLayout
 * ─  Desktop: fixed w-64 sidebar (md and above)
 * ─  Mobile: top header bar + fixed bottom navigation bar (below md)
 * ─  Content: pb-20 on mobile so bottom nav never covers content
 */
// ── Theme toggle button (reusable in sidebar + drawer) ──────────────────────

function ThemeToggle({ compact = false }: { compact?: boolean }) {
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'dark';

    return (
        <button
            id="theme-toggle-btn"
            onClick={toggleTheme}
            aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
            className="
                w-full flex items-center gap-3 px-4 py-3 rounded-xl
                transition-all duration-200 group min-h-[44px] select-none
                text-slate-400 hover:bg-slate-800/50 hover:text-slate-200
                active:scale-[0.97]
            "
        >
            {/* Animated icon swap */}
            <span className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110">
                {isDark ? (
                    <Sun size={20} className="text-amber-400" />
                ) : (
                    <Moon size={20} className="text-slate-400" />
                )}
            </span>

            {/* Label */}
            {!compact && (
                <span className="font-medium flex-1 text-left">
                    {isDark ? 'Light Mode' : 'Dark Mode'}
                </span>
            )}

            {/* Pill toggle switch */}
            <div
                className={`
                    relative flex-shrink-0 w-10 h-5 rounded-full transition-colors duration-300
                    ${isDark ? 'bg-amber-500' : 'bg-slate-700'}
                `}
            >
                <div
                    className={`
                        absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm
                        transition-transform duration-300
                        ${isDark ? 'translate-x-5' : 'translate-x-0.5'}
                    `}
                />
            </div>
        </button>
    );
}

// ── Main Layout ───────────────────────────────────────────────────────────────

export default function DashboardLayout() {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const pageTitle = usePageTitle();

    return (
        <div className="flex h-screen bg-slate-50 font-sans">

            {/* ── Desktop Sidebar (hidden on mobile) ───────────────── */}
            <aside className="hidden md:flex w-64 bg-slate-900 text-white flex-col flex-shrink-0">
                <div className="p-6 border-b border-slate-800">
                    <h1 className="text-xl font-bold tracking-tight">ROI Portal</h1>
                    <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest">
                        Real Estate Events
                    </p>
                </div>

                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    {NAV_ITEMS.map(({ to, icon, label }) => (
                        <SidebarLink key={to} to={to} icon={icon} label={label} />
                    ))}
                </nav>

                <div className="p-4 border-t border-slate-800 space-y-1">
                    <a
                        href="/executive-presentation"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-emerald-400 hover:bg-emerald-500/10 transition-all duration-200 group border border-emerald-500/20 min-h-[44px]"
                    >
                        <span className="group-hover:scale-110 transition-transform flex-shrink-0">
                            <Sparkles size={20} />
                        </span>
                        <span className="font-bold text-sm">ROI Vision</span>
                    </a>
                    {/* Theme toggle — sits above Settings */}
                    <ThemeToggle />
                    <SidebarLink to="/settings" icon={Settings} label="Settings" />
                </div>
            </aside>

            {/* ── Main content column ───────────────────────────────── */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

                {/* ── Mobile top header bar (hidden on md+) ─────────── */}
                <header className="md:hidden flex items-center justify-between bg-slate-900 text-white px-4 py-3 border-b border-slate-800 flex-shrink-0 z-40">
                    <div>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">PSI Portal</p>
                        <h1 className="text-base font-extrabold tracking-tight leading-tight">{pageTitle}</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <a
                            href="/executive-presentation"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-xl text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/10 transition-colors"
                            aria-label="ROI Vision"
                        >
                            <Sparkles size={18} />
                        </a>
                        <button
                            id="mobile-menu-btn"
                            onClick={() => setDrawerOpen(true)}
                            className="p-2 rounded-xl text-slate-400 hover:bg-slate-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                            aria-label="Open menu"
                        >
                            <Menu size={22} />
                        </button>
                    </div>
                </header>

                {/* ── Main scrollable content ───────────────────────── */}
                <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
                    <Outlet />
                </main>
            </div>

            {/* ── Mobile drawer (all nav links) ─────────────────────── */}
            <AnimatePresence>
                {drawerOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            key="backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 z-50 md:hidden"
                            onClick={() => setDrawerOpen(false)}
                        />
                        {/* Drawer panel */}
                        <motion.div
                            key="drawer"
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                            className="fixed top-0 right-0 bottom-0 w-72 bg-slate-900 z-50 md:hidden flex flex-col shadow-2xl"
                        >
                            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
                                <div>
                                    <p className="text-white font-extrabold">PSI Event Portal</p>
                                    <p className="text-slate-500 text-xs">All Modules</p>
                                </div>
                                <button
                                    id="close-menu-btn"
                                    onClick={() => setDrawerOpen(false)}
                                    className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                                {NAV_ITEMS.map(({ to, icon, label }) => (
                                    <SidebarLink
                                        key={to} to={to} icon={icon} label={label}
                                        onClick={() => setDrawerOpen(false)}
                                    />
                                ))}
                            </nav>
                            <div className="p-4 border-t border-slate-800 space-y-1">
                                {/* Theme toggle in the mobile drawer */}
                                <ThemeToggle />
                                <SidebarLink to="/settings" icon={Settings} label="Settings" onClick={() => setDrawerOpen(false)} />
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* ── Mobile Bottom Navigation Bar ─────────────────────── */}
            <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-slate-900 border-t border-slate-800 flex safe-area-inset-bottom">
                {BOTTOM_NAV_ITEMS.map(({ to, icon, label }) => (
                    <BottomNavItem key={to} to={to} icon={icon} label={label} />
                ))}
            </nav>
        </div>
    );
}
