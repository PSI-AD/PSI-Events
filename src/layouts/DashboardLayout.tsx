import React from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, Calendar, FileText, BarChart3,
    Settings, Users, Briefcase, Sparkles, Calculator,
    QrCode, Menu, X, TrendingUp, BookOpen,
    BrainCircuit, Zap, Crown, Flame, Gift,
    Map as MapIcon, Plane, Radio, Wallet, MessageSquare,
    ChevronRight, ChevronLeft, Search, ClipboardCheck, Network, Activity,
    Map,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useState } from 'react';
import {
    GlobalFeaturesProvider,
    GlobalActionButtons,
} from '../components/GlobalFeatures';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// ── Nav group structure ───────────────────────────────────────────────────────

const NAV_GROUPS = [
    {
        label: 'Core',
        items: [
            { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
            { to: '/events', icon: Calendar, label: 'Events' },
            { to: '/proposals', icon: FileText, label: 'Proposals' },
            { to: '/projects', icon: Briefcase, label: 'Projects' },
            { to: '/team', icon: Users, label: 'Team' },
            { to: '/analytics', icon: BarChart3, label: 'Analytics' },
            { to: '/event-analytics', icon: Activity, label: 'Event Analytics' },
        ],
    },
    {
        label: 'Finance',
        items: [
            { to: '/settlement', icon: Calculator, label: 'Settlement' },
            { to: '/cash-advance', icon: Wallet, label: 'Comm. Advance' },
            { to: '/burn-rate', icon: Flame, label: 'Burn Rate' },
        ],
    },
    {
        label: 'Operations',
        items: [
            { to: '/check-in', icon: QrCode, label: 'Check-In' },
            { to: '/checklist', icon: ClipboardCheck, label: 'Checklist' },
            { to: '/networking', icon: Network, label: 'Networking' },
            { to: '/venue-map', icon: Map, label: 'Venue Map' },
            { to: '/traffic-controller', icon: Radio, label: 'Traffic Control' },
            { to: '/vip-intercept', icon: Crown, label: 'VIP Intercept' },
            { to: '/vip-concierge', icon: MessageSquare, label: 'VIP Concierge' },
            { to: '/travel-desk', icon: Plane, label: 'Travel Desk' },
            { to: '/floorplan-heatmap', icon: MapIcon, label: 'Floor Heatmap' },
        ],
    },
    {
        label: 'AI Tools',
        items: [
            { to: '/approvals', icon: BrainCircuit, label: 'AI Approvals' },
            { to: '/follow-up-copilot', icon: Sparkles, label: 'Follow-Up AI' },
        ],
    },
    {
        label: 'Gamification',
        items: [
            { to: '/bounties', icon: Zap, label: 'Bounties' },
            { to: '/digital-brochure', icon: Gift, label: 'Digital Brochure' },
        ],
    },
];

// Flat list (kept for page-title lookup)
const NAV_ITEMS = NAV_GROUPS.flatMap(g => g.items);

// Extra pages not in nav groups but still need title lookup
const EXTRA_TITLE_MAP: Record<string, string> = {
    '/manual': 'System Manual',
    '/settings': 'Settings',
    '/checklist': 'Action Checklist',
    '/executive-debrief': 'Executive Debrief',
    '/cash-advance': 'Commission Advance',
    '/traffic-controller': 'Traffic Controller',
    '/vip-concierge': 'VIP Concierge',
    '/follow-up-copilot': 'Follow-Up Copilot',
    '/networking': 'Smart Networking',
    '/event-analytics': 'Event Analytics',
    '/agenda': 'Agenda Builder',
    '/venue-map': 'Venue Map',
};

// Bottom nav — 5 highest-traffic items
const BOTTOM_NAV_ITEMS = [
    { to: '/', icon: LayoutDashboard, label: 'Home' },
    { to: '/events', icon: Calendar, label: 'Events' },
    { to: '/check-in', icon: QrCode, label: 'Check-In' },
    { to: '/vip-intercept', icon: Crown, label: 'VIP' },
    { to: '/settlement', icon: Calculator, label: 'Settlement' },
];

// ── Sidebar link ──────────────────────────────────────────────────────────────

function SidebarLink({
    to, icon: Icon, label, onClick, collapsed,
}: {
    key?: React.Key;
    to: string;
    icon: React.ElementType;
    label: string;
    onClick?: () => void;
    collapsed?: boolean;
}) {
    const location = useLocation();
    const isActive = location.pathname === to;

    return (
        <Link
            to={to}
            onClick={onClick}
            title={collapsed ? label : undefined}
            className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group min-h-[40px] relative',
                collapsed && 'justify-center px-0',
                isActive
                    ? 'bg-slate-100 text-emerald-600 dark:bg-slate-800 dark:text-white shadow-none dark:shadow-lg dark:shadow-black/20'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-200'
            )}
        >
            <span className={cn(
                'transition-transform duration-150 flex-shrink-0',
                isActive ? 'text-emerald-500 dark:text-emerald-400' : 'group-hover:scale-105'
            )}>
                <Icon size={17} />
            </span>

            {/* Label + active dot — hidden when collapsed */}
            {!collapsed && (
                <>
                    <span className="text-sm font-medium leading-tight truncate">{label}</span>
                    {isActive && (
                        <motion.div
                            layoutId="sidebar-active-dot"
                            className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 flex-shrink-0"
                        />
                    )}
                </>
            )}

            {/* Collapsed active indicator — small dot below icon */}
            {collapsed && isActive && (
                <motion.div
                    layoutId="sidebar-active-dot"
                    className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-500 dark:bg-emerald-400"
                />
            )}
        </Link>
    );
}

// ── Mobile bottom nav link ────────────────────────────────────────────────────

function BottomNavItem({ to, icon: Icon, label }: { key?: React.Key; to: string; icon: React.ElementType; label: string }) {
    const location = useLocation();
    const isActive = location.pathname === to;

    return (
        <Link
            to={to}
            className={cn(
                'flex flex-col items-center justify-center flex-1 py-2 gap-0.5 min-h-[56px] transition-colors relative',
                isActive ? 'text-emerald-400' : 'text-slate-500'
            )}
        >
            {isActive && (
                <motion.div
                    layoutId="bottom-nav-indicator"
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-emerald-400 rounded-full"
                />
            )}
            <Icon size={20} className={cn('transition-transform', isActive && 'scale-110')} />
            <span className={cn('text-[9px] font-bold tracking-wide', isActive ? 'text-emerald-400' : 'text-slate-500')}>
                {label}
            </span>
        </Link>
    );
}

// ── Page title from route ─────────────────────────────────────────────────────

function usePageTitle(): string {
    const location = useLocation();
    const match = NAV_ITEMS.find(n => n.to === location.pathname);
    if (match) return match.label;
    return EXTRA_TITLE_MAP[location.pathname] ?? 'PSI Portal';
}

// ── Main Layout ───────────────────────────────────────────────────────────────

export default function DashboardLayout() {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const pageTitle = usePageTitle();

    return (
        <GlobalFeaturesProvider>
            <div className="flex h-screen bg-psi-page font-sans overflow-hidden">

                {/* ── Desktop Sidebar ──────────────────────────────────── */}
                <aside
                    className={cn(
                        'hidden md:flex flex-col shrink-0',
                        'bg-white dark:bg-slate-900 text-slate-900 dark:text-white',
                        'border-r border-slate-200 dark:border-slate-800/60',
                        'transition-all duration-300 ease-in-out',
                        isCollapsed ? 'w-20' : 'w-64',
                    )}
                >
                    {/* ── Logo / Branding ── */}
                    <div className={cn(
                        'flex items-center gap-3 border-b border-slate-200 dark:border-slate-800/60',
                        'transition-all duration-300 ease-in-out overflow-hidden',
                        isCollapsed ? 'px-0 py-4 justify-center' : 'px-5 py-4',
                    )}>
                        {/* Icon — always visible */}
                        <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center flex-shrink-0">
                            <TrendingUp size={16} className="text-white" />
                        </div>
                        {/* Text — hidden when collapsed */}
                        {!isCollapsed && (
                            <div className="min-w-0 overflow-hidden">
                                <p className="text-slate-900 dark:text-white font-extrabold text-sm tracking-tight leading-none whitespace-nowrap">ROI Portal</p>
                                <p className="text-slate-500 dark:text-slate-400 text-[9px] uppercase tracking-widest mt-0.5 whitespace-nowrap">Real Estate Events</p>
                            </div>
                        )}
                    </div>

                    {/* ── Nav groups ── */}
                    <nav className="flex-1 overflow-y-auto scrollbar-none py-3 px-2 space-y-4">
                        {NAV_GROUPS.map(group => (
                            <div key={group.label}>
                                {/* Group label — hidden when collapsed */}
                                {!isCollapsed && (
                                    <div className="px-3 mb-1">
                                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600">{group.label}</p>
                                    </div>
                                )}
                                {/* Collapsed: thin divider line instead of label */}
                                {isCollapsed && (
                                    <div className="mx-3 mb-1 h-px bg-slate-100 dark:bg-slate-800/60" />
                                )}
                                <div className="space-y-0.5">
                                    {group.items.map(({ to, icon, label }) => (
                                        <SidebarLink
                                            key={to}
                                            to={to}
                                            icon={icon}
                                            label={label}
                                            collapsed={isCollapsed}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </nav>

                    {/* ── Footer links ── */}
                    <div className="border-t border-slate-200 dark:border-slate-800/60 p-2 space-y-0.5">
                        {/* ROI Vision special link */}
                        <a
                            href="/executive-presentation"
                            target="_blank"
                            rel="noopener noreferrer"
                            title={isCollapsed ? 'ROI Vision' : undefined}
                            className={cn(
                                'flex items-center gap-3 px-3 py-2.5 rounded-xl',
                                'text-emerald-600 dark:text-emerald-400',
                                'hover:bg-emerald-50 dark:hover:bg-emerald-500/10',
                                'transition-all duration-150 group',
                                'border border-emerald-200 dark:border-emerald-500/20 min-h-[40px]',
                                isCollapsed && 'justify-center px-0',
                            )}
                        >
                            <span className="group-hover:scale-105 transition-transform flex-shrink-0">
                                <Sparkles size={17} />
                            </span>
                            {!isCollapsed && <span className="font-bold text-sm">ROI Vision</span>}
                        </a>
                        <SidebarLink to="/manual" icon={BookOpen} label="System Manual" collapsed={isCollapsed} />
                        <SidebarLink to="/settings" icon={Settings} label="Settings" collapsed={isCollapsed} />
                    </div>

                    {/* ── Collapse toggle button ── */}
                    <button
                        id="sidebar-collapse-toggle"
                        onClick={() => setIsCollapsed(c => !c)}
                        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        className={cn(
                            'w-full flex items-center gap-2 px-4 py-3',
                            'border-t border-slate-200 dark:border-slate-800/60',
                            'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200',
                            'hover:bg-slate-50 dark:hover:bg-slate-800',
                            'transition-all duration-150 select-none',
                            isCollapsed ? 'justify-center' : 'justify-between',
                        )}
                    >
                        {!isCollapsed && (
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                Collapse
                            </span>
                        )}
                        {isCollapsed
                            ? <ChevronRight size={16} />
                            : <ChevronLeft size={16} />
                        }
                    </button>
                </aside>

                {/* ── Main content column ─────────────────────────────── */}
                <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

                    {/* ── Top header (mobile + desktop) ────────────────── */}
                    <header className="flex items-center justify-between bg-slate-900 text-white px-4 py-3 border-b border-slate-800/60 flex-shrink-0 z-40">
                        {/* Left: brand (mobile only) + page title */}
                        <div className="flex items-center gap-3 min-w-0">
                            {/* Mobile brand mark */}
                            <div className="md:hidden w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center flex-shrink-0">
                                <TrendingUp size={13} className="text-white" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold hidden md:block">PSI Event Portal</p>
                                <h1 className="text-sm md:text-base font-extrabold tracking-tight leading-tight text-white truncate">{pageTitle}</h1>
                            </div>
                        </div>

                        {/* Right: global actions */}
                        <div className="flex items-center gap-1.5">
                            {/* ROI Vision — desktop only */}
                            <a
                                href="/executive-presentation"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/10 transition-all text-xs font-bold"
                                aria-label="ROI Vision"
                            >
                                <Sparkles size={13} />
                                <span>ROI Vision</span>
                            </a>

                            {/* Global action buttons (search + notif + AI) */}
                            <GlobalActionButtons />

                            {/* Mobile hamburger */}
                            <button
                                id="mobile-menu-btn"
                                onClick={() => setDrawerOpen(true)}
                                className="md:hidden p-2 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                                aria-label="Open menu"
                            >
                                <Menu size={20} />
                            </button>
                        </div>
                    </header>

                    {/* ── Main scrollable content ──────────────────────── */}
                    <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
                        <Outlet />
                    </main>
                </div>

                {/* ── Mobile drawer ────────────────────────────────────── */}
                <AnimatePresence>
                    {drawerOpen && (
                        <>
                            <motion.div
                                key="backdrop"
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 md:hidden"
                                onClick={() => setDrawerOpen(false)}
                            />
                            <motion.div
                                key="drawer"
                                initial={{ x: '100%' }}
                                animate={{ x: 0 }}
                                exit={{ x: '100%' }}
                                transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                                className="fixed top-0 right-0 bottom-0 w-72 bg-white dark:bg-slate-900 z-50 md:hidden flex flex-col shadow-2xl border-l border-slate-200 dark:border-slate-800/60"
                            >
                                {/* Drawer header */}
                                <div className="flex items-center justify-between px-4 py-4 border-b border-slate-200 dark:border-slate-800/60">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center">
                                            <TrendingUp size={14} className="text-white" />
                                        </div>
                                        <div>
                                            <p className="text-slate-900 dark:text-white font-extrabold text-sm">PSI Event Portal</p>
                                            <p className="text-slate-500 dark:text-slate-400 text-[9px]">All Modules</p>
                                        </div>
                                    </div>
                                    <button
                                        id="close-menu-btn"
                                        onClick={() => setDrawerOpen(false)}
                                        className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                {/* Drawer nav groups */}
                                <nav className="flex-1 overflow-y-auto scrollbar-none py-3 px-2 space-y-4">
                                    {NAV_GROUPS.map(group => (
                                        <div key={group.label}>
                                            <div className="px-3 mb-1">
                                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600">{group.label}</p>
                                            </div>
                                            <div className="space-y-0.5">
                                                {group.items.map(({ to, icon, label }) => (
                                                    <SidebarLink key={to} to={to} icon={icon} label={label} onClick={() => setDrawerOpen(false)} />
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </nav>

                                {/* Drawer footer */}
                                <div className="border-t border-slate-200 dark:border-slate-800/60 p-2 space-y-0.5">
                                    <a
                                        href="/executive-presentation"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-all group border border-emerald-200 dark:border-emerald-500/20 min-h-[40px]"
                                    >
                                        <Sparkles size={17} />
                                        <span className="font-bold text-sm">ROI Vision</span>
                                    </a>
                                    <SidebarLink to="/manual" icon={BookOpen} label="System Manual" onClick={() => setDrawerOpen(false)} />
                                    <SidebarLink to="/settings" icon={Settings} label="Settings" onClick={() => setDrawerOpen(false)} />
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>

                {/* ── Mobile Bottom Navigation ─────────────────────────── */}
                <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-slate-900 border-t border-slate-800/60">
                    <div className="flex" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
                        {BOTTOM_NAV_ITEMS.map(({ to, icon, label }) => (
                            <BottomNavItem key={to} to={to} icon={icon} label={label} />
                        ))}
                    </div>
                </nav>
            </div>
        </GlobalFeaturesProvider>
    );
}
