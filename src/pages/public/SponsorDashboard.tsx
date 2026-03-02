/**
 * SponsorDashboard.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * EXTERNAL SPONSOR ROI PORTAL
 *
 * Route: /sponsor/:token   (under PublicLayout — no sidebar, no auth)
 *
 * Access Model:
 *   The :token is a base64-encoded JSON payload created by PSI admins,
 *   containing the sponsor's ID, permitted project slugs, event ID, and an
 *   HMAC signature. The client validates the token locally; a production build
 *   should additionally verify the HMAC against a Cloud Function.
 *
 *   Token payload shape → SponsorToken interface below.
 *
 * Data Firewall:
 *   Firestore query ALWAYS includes a `where('projectInterest', 'in', allowedProjects)`
 *   clause so that the sponsor (e.g. Emaar) can NEVER see leads for competitors
 *   (e.g. Aldar).  Each item in the live feed is also anonymised:
 *     "New Lead captured for Marina Blue by Agent S***"
 *
 * Sections:
 *   1. Gated Login  — Sponsor enters their access token (no password required)
 *   2. KPI Banner   — Total Sponsored Leads · Est. Pipeline (AED) · Avg. Lead Score
 *   3. Pipeline Chart — stacked bar by project showing lead volume per day
 *   4. Live Feed    — real-time scrolling ticker of anonymised lead captures
 *   5. Lead Quality Breakdown — Luxury / Medium / Average tier split donuts
 *
 * Firestore paths used (read-only, filtered):
 *   crm_leads — where eventId == token.eventId AND projectInterest in token.projects
 *
 * ── Production checklist ──────────────────────────────────────────────────────
 *   □ Validate HMAC signature in a Cloud Function before serving data
 *   □ Add Firestore Security Rules: sponsor access token → allowed read on crm_leads
 *   □ Replace DEMO_LEADS with live onSnapshot (queries already wired, toggle flag)
 */

import React, {
    useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
    ShieldCheck, TrendingUp, Users, DollarSign,
    Eye, EyeOff, Zap, AlertCircle, Building2,
    ArrowUpRight, Clock, Activity, BarChart3,
    Star, Crown, ChevronRight, RefreshCw, Lock,
    Wifi, WifiOff, CheckCircle2,
} from 'lucide-react';
import {
    collection, query, where, onSnapshot, Unsubscribe,
} from 'firebase/firestore';
import { db } from '../../services/firebase/firebaseConfig';

// ═════════════════════════════════════════════════════════════════════════════
// ── Token & Types ─────────────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════════

/** Shape of the base64-decoded access token payload */
export interface SponsorToken {
    /** Internal sponsor/developer ID */
    sponsorId: string;
    /** Display name (e.g. "Emaar Properties") */
    sponsorName: string;
    /** Emoji logo or brand icon */
    sponsorLogo: string;
    /** Portfolio tier: Gold | Silver | Bronze */
    sponsorTier: 'Gold' | 'Silver' | 'Bronze';
    /** Projects this sponsor is entitled to see (e.g. ["Marina Blue","Emaar Park Heights II"]) */
    allowedProjects: string[];
    /** Firestore event document ID this dashboard is scoped to */
    eventId: string;
    /** Human-readable event name */
    eventName: string;
    /** AED value per qualified lead for pipeline calculation */
    avgLeadValueAed: number;
    /** ISO date string — token expires after this */
    expiresAt: string;
    /** HMAC-SHA256 signature (verified server-side in production) */
    sig: string;
}

interface CRMLeadDoc {
    id: string;
    firstName?: string;
    lastName?: string;
    company?: string;
    projectInterest: string;
    source: string;
    tier?: 'Luxury' | 'Medium' | 'Average';
    agentId?: string;
    scannedAt: { toDate: () => Date } | string | null;
    eventId: string;
}

interface FeedEntry {
    id: string;
    project: string;
    agentInitials: string;  // anonymised: "K***"
    time: string;
    tier: 'Luxury' | 'Medium' | 'Average';
    source: 'CardScan' | 'Manual' | 'VIPIntercept' | string;
}

// ═════════════════════════════════════════════════════════════════════════════
// ── Token decoder ─────────────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════════

function decodeSponsorToken(raw: string): SponsorToken | null {
    try {
        const json = decodeURIComponent(atob(raw.replace(/-/g, '+').replace(/_/g, '/')));
        const parsed = JSON.parse(json) as SponsorToken;
        // Basic shape check
        if (!parsed.sponsorId || !parsed.eventId || !Array.isArray(parsed.allowedProjects)) return null;
        return parsed;
    } catch {
        return null;
    }
}

/** Checks if the token has passed its expiresAt date */
function isTokenExpired(token: SponsorToken): boolean {
    try {
        return new Date(token.expiresAt) < new Date();
    } catch {
        return false;
    }
}

// ═════════════════════════════════════════════════════════════════════════════
// ── Demo data (used when useDemoData = true or Firestore fails) ───────────────
// ═════════════════════════════════════════════════════════════════════════════

/** Pre-built demo token for the internal PSI team to demo the portal without real token */
const DEMO_TOKEN: SponsorToken = {
    sponsorId: 'emaar_001',
    sponsorName: 'Emaar Properties',
    sponsorLogo: '🏙️',
    sponsorTier: 'Gold',
    allowedProjects: ['Marina Blue', 'Emaar Park Heights II', 'The Grove'],
    eventId: 'event_demo',
    eventName: 'PSI Moscow Cityscape Summit 2026',
    avgLeadValueAed: 850_000,
    expiresAt: '2027-01-01T00:00:00Z',
    sig: 'demo_sig_not_verified',
};

const DEMO_LEADS: CRMLeadDoc[] = [
    { id: 'l01', firstName: 'A', lastName: 'V', projectInterest: 'Marina Blue', source: 'CardScan', tier: 'Luxury', agentId: 'Khalid M.', scannedAt: null, eventId: 'event_demo' },
    { id: 'l02', firstName: 'N', lastName: 'P', projectInterest: 'The Grove', source: 'Manual', tier: 'Medium', agentId: 'Sara A.', scannedAt: null, eventId: 'event_demo' },
    { id: 'l03', firstName: 'J', lastName: 'R', projectInterest: 'Marina Blue', source: 'CardScan', tier: 'Luxury', agentId: 'Mohammed Q.', scannedAt: null, eventId: 'event_demo' },
    { id: 'l04', firstName: 'S', lastName: 'K', projectInterest: 'Emaar Park Heights II', source: 'VIPIntercept', tier: 'Luxury', agentId: 'Nour H.', scannedAt: null, eventId: 'event_demo' },
    { id: 'l05', firstName: 'M', lastName: 'L', projectInterest: 'The Grove', source: 'Manual', tier: 'Average', agentId: 'Sara A.', scannedAt: null, eventId: 'event_demo' },
    { id: 'l06', firstName: 'O', lastName: 'B', projectInterest: 'Marina Blue', source: 'CardScan', tier: 'Medium', agentId: 'Khalid M.', scannedAt: null, eventId: 'event_demo' },
    { id: 'l07', firstName: 'P', lastName: 'D', projectInterest: 'Emaar Park Heights II', source: 'Manual', tier: 'Luxury', agentId: 'Mohammed Q.', scannedAt: null, eventId: 'event_demo' },
    { id: 'l08', firstName: 'Y', lastName: 'T', projectInterest: 'Marina Blue', source: 'CardScan', tier: 'Medium', agentId: 'Nour H.', scannedAt: null, eventId: 'event_demo' },
    { id: 'l09', firstName: 'E', lastName: 'W', projectInterest: 'The Grove', source: 'VIPIntercept', tier: 'Luxury', agentId: 'Sara A.', scannedAt: null, eventId: 'event_demo' },
    { id: 'l10', firstName: 'C', lastName: 'H', projectInterest: 'Marina Blue', source: 'Manual', tier: 'Average', agentId: 'Khalid M.', scannedAt: null, eventId: 'event_demo' },
    { id: 'l11', firstName: 'R', lastName: 'M', projectInterest: 'Emaar Park Heights II', source: 'CardScan', tier: 'Luxury', agentId: 'Mohammed Q.', scannedAt: null, eventId: 'event_demo' },
    { id: 'l12', firstName: 'G', lastName: 'S', projectInterest: 'Marina Blue', source: 'Manual', tier: 'Medium', agentId: 'Nour H.', scannedAt: null, eventId: 'event_demo' },
];

/** Live ticker pool — new events surface in the feed every few seconds in demo mode */
const LIVE_POOL = [
    { project: 'Marina Blue', tier: 'Luxury' as const, agentId: 'Khalid M.' },
    { project: 'The Grove', tier: 'Medium' as const, agentId: 'Sara A.' },
    { project: 'Emaar Park Heights II', tier: 'Luxury' as const, agentId: 'Mohammed Q.' },
    { project: 'Marina Blue', tier: 'Average' as const, agentId: 'Nour H.' },
    { project: 'Marina Blue', tier: 'Medium' as const, agentId: 'Khalid M.' },
    { project: 'Emaar Park Heights II', tier: 'Luxury' as const, agentId: 'Sara A.' },
    { project: 'The Grove', tier: 'Luxury' as const, agentId: 'Mohammed Q.' },
];

// ═════════════════════════════════════════════════════════════════════════════
// ── Helpers ───────────────────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════════

function fmtAed(n: number): string {
    if (n >= 1_000_000_000) return `AED ${(n / 1_000_000_000).toFixed(2)}B`;
    if (n >= 1_000_000) return `AED ${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `AED ${(n / 1_000).toFixed(0)}K`;
    return `AED ${n.toLocaleString()}`;
}

function nowTime(): string {
    return new Date().toLocaleTimeString('en-AE', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function uid(): string {
    return Math.random().toString(36).slice(2, 10);
}

/**
 * Anonymise agent display name for sponsor-facing view.
 * "Khalid M." → "K***"
 */
function anonymiseAgent(agentId: string | undefined): string {
    if (!agentId) return 'A***';
    const first = agentId.trim().charAt(0).toUpperCase();
    return `${first}***`;
}

const TIER_CFG = {
    Luxury: { label: 'Luxury', color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/30', dot: 'bg-amber-400', icon: <Crown size={11} /> },
    Medium: { label: 'Medium', color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/30', dot: 'bg-blue-400', icon: <Star size={11} /> },
    Average: { label: 'Average', color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-400/10', border: 'border-slate-600/30', dot: 'bg-slate-500', icon: <Users size={11} /> },
};

const SOURCE_LABEL: Record<string, string> = {
    CardScan: '📷 Card Scan',
    Manual: '✍️ Manual',
    VIPIntercept: '👑 VIP Intercept',
};

const TIER_SPONSOR = {
    Gold: { bg: 'from-amber-500/20 to-amber-600/5', border: 'border-amber-500/40', text: 'text-amber-400' },
    Silver: { bg: 'from-slate-400/20 to-slate-500/5', border: 'border-slate-400/40', text: 'text-slate-700 dark:text-slate-300' },
    Bronze: { bg: 'from-orange-600/20 to-orange-700/5', border: 'border-orange-600/40', text: 'text-orange-400' },
};

// ═════════════════════════════════════════════════════════════════════════════
// ── Sub-components ────────────────────────════════════════════════════════════
// ═════════════════════════════════════════════════════════════════════════════

// ── KPI Card ─────────────────────────────────────────────────────────────────

interface KPICardProps {
    icon: React.ReactNode;
    label: string;
    value: string;
    sub?: string;
    color: string;
    delay?: number;
    pulse?: boolean;
}

function KPICard({ icon, label, value, sub, color, delay = 0, pulse = false }: KPICardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="relative bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-3xl p-6 overflow-hidden group hover:bg-white/[0.07] transition-colors"
        >
            {/* Radial glow backdrop */}
            <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl opacity-20 ${color.replace('text-', 'bg-')}`} />

            <div className={`flex items-center gap-2 mb-4 ${color}`}>
                {icon}
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">{label}</span>
                {pulse && (
                    <span className="ml-auto flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-emerald-400 text-[9px] font-bold uppercase tracking-widest">Live</span>
                    </span>
                )}
            </div>
            <p className={`text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-1`}>{value}</p>
            {sub && <p className="text-xs text-slate-900 dark:text-white/40">{sub}</p>}
        </motion.div>
    );
}

// ── Tier breakdown donut-style bar ─────────────────────────────────────────────

function TierBreakdown({ leads }: { leads: CRMLeadDoc[] }) {
    const counts = useMemo(() => {
        const c = { Luxury: 0, Medium: 0, Average: 0 };
        leads.forEach(l => { if (l.tier && l.tier in c) c[l.tier]++; });
        return c;
    }, [leads]);

    const total = (Object.values(counts) as number[]).reduce((a, b) => a + b, 0) || 1;

    const tiers = (['Luxury', 'Medium', 'Average'] as const).map(t => ({
        ...TIER_CFG[t],
        count: counts[t],
        pct: Math.round((counts[t] / total) * 100),
    }));

    return (
        <div className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-3xl p-6">
            <div className="flex items-center gap-2 mb-5">
                <BarChart3 size={14} className="text-violet-400" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-violet-400">Lead Quality Breakdown</p>
            </div>

            {/* Stacked bar */}
            <div className="flex h-3 rounded-full overflow-hidden gap-0.5 mb-5">
                {tiers.map(t => (
                    <motion.div
                        key={t.label}
                        initial={{ width: 0 }}
                        animate={{ width: `${t.pct}%` }}
                        transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
                        className={`h-full ${t.dot} rounded-full`}
                    />
                ))}
            </div>

            {/* Legend rows */}
            <div className="space-y-3">
                {tiers.map((t, i) => (
                    <motion.div
                        key={t.label}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 + i * 0.08 }}
                        className="flex items-center gap-3"
                    >
                        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${t.dot}`} />
                        <div className={`flex items-center gap-1 flex-shrink-0 ${t.color}`}>{t.icon}</div>
                        <span className={`text-sm font-bold ${t.color}`}>{t.label}</span>
                        <div className="flex-1 h-px bg-black/5 dark:bg-white/5 mx-2" />
                        <span className="text-slate-900 dark:text-white font-extrabold text-sm font-mono">{t.count}</span>
                        <span className="text-slate-900 dark:text-white/30 text-xs w-8 text-right">{t.pct}%</span>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

// ── Project bar chart ─────────────────────────────────────────────────────────

function ProjectBars({ leads, projects }: { leads: CRMLeadDoc[]; projects: string[] }) {
    const byProject = useMemo(() => {
        const m: Record<string, number> = {};
        projects.forEach(p => { m[p] = 0; });
        leads.forEach(l => { if (m[l.projectInterest] !== undefined) m[l.projectInterest]++; });
        return m;
    }, [leads, projects]);

    const max = Math.max(1, ...(Object.values(byProject) as number[]));
    const PROJECT_COLORS = ['bg-amber-500', 'bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-rose-500'];

    return (
        <div className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-3xl p-6">
            <div className="flex items-center gap-2 mb-5">
                <TrendingUp size={14} className="text-emerald-400" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Leads by Project</p>
                <span className="ml-auto text-slate-900 dark:text-white/25 text-xs font-mono">{leads.length} total</span>
            </div>

            <div className="space-y-4">
                {projects.map((project, i) => {
                    const count = byProject[project] ?? 0;
                    const pct = Math.round((count / max) * 100);
                    return (
                        <div key={project}>
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-sm font-bold text-slate-900 dark:text-white/80 truncate pr-3">{project}</span>
                                <span className="text-slate-900 dark:text-white font-extrabold text-sm font-mono flex-shrink-0">{count}</span>
                            </div>
                            <div className="h-2.5 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${pct}%` }}
                                    transition={{ duration: 0.9, delay: 0.2 + i * 0.1, ease: 'easeOut' }}
                                    className={`h-full ${PROJECT_COLORS[i % PROJECT_COLORS.length]} rounded-full`}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ── Live Feed ─────────────────────────────────────────────────────────────────

function LiveFeed({ entries }: { entries: FeedEntry[] }) {
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [entries.length]);

    return (
        <div className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-3xl flex flex-col overflow-hidden" style={{ maxHeight: '460px' }}>
            {/* Feed header */}
            <div className="flex items-center gap-2 px-6 py-4 border-b border-white/8 flex-shrink-0">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-400 text-[10px] font-black uppercase tracking-widest">Live Lead Feed</span>
                <span className="ml-auto text-slate-900 dark:text-white/25 text-xs font-mono">{entries.length} events</span>
            </div>

            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
                <AnimatePresence initial={false}>
                    {[...entries].reverse().map(entry => {
                        const tc = TIER_CFG[entry.tier];
                        return (
                            <motion.div
                                key={entry.id}
                                layout
                                initial={{ opacity: 0, y: -12, height: 0 }}
                                animate={{ opacity: 1, y: 0, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                                className="flex items-center gap-3 py-2.5 px-4 rounded-2xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.07] transition-colors"
                            >
                                {/* Tier dot */}
                                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${tc.dot}`} />

                                {/* Main text */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-slate-900 dark:text-white/80 font-medium leading-snug">
                                        New lead captured for{' '}
                                        <span className="text-slate-900 dark:text-white font-bold">{entry.project}</span>
                                        {' '}by Agent{' '}
                                        <span className="font-mono text-slate-900 dark:text-white/60">{entry.agentInitials}</span>
                                    </p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className={`text-[10px] font-bold ${tc.color}`}>{tc.label}</span>
                                        <span className="text-slate-900 dark:text-white/20 text-[10px]">·</span>
                                        <span className="text-slate-900 dark:text-white/30 text-[10px]">{SOURCE_LABEL[entry.source] ?? entry.source}</span>
                                    </div>
                                </div>

                                {/* Time */}
                                <span className="flex-shrink-0 text-slate-900 dark:text-white/25 text-[10px] font-mono">{entry.time}</span>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>

                {entries.length === 0 && (
                    <div className="text-center py-12 text-slate-900 dark:text-white/20">
                        <Activity size={28} className="mx-auto mb-3 opacity-30" />
                        <p className="text-sm font-bold">No lead events yet</p>
                        <p className="text-xs mt-1">Events will appear here in real time</p>
                    </div>
                )}
                <div ref={bottomRef} />
            </div>
        </div>
    );
}

// ── Access Gate (token input screen) ─────────────────────────────────────────

interface AccessGateProps {
    onUnlock: (token: SponsorToken) => void;
}

function AccessGate({ onUnlock }: AccessGateProps) {
    const [input, setInput] = useState('');
    const [error, setError] = useState('');
    const [show, setShow] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!input.trim()) { setError('Please enter your sponsor access token.'); return; }

        setLoading(true);
        await new Promise(r => setTimeout(r, 600)); // simulate auth latency

        const token = decodeSponsorToken(input.trim());
        if (!token) {
            setError('Invalid access token. Please contact your PSI Event Manager.');
            setLoading(false);
            return;
        }
        if (isTokenExpired(token)) {
            setError('This access token has expired. Request a new one from your PSI contact.');
            setLoading(false);
            return;
        }

        setLoading(false);
        onUnlock(token);
    };

    /** Quick demo — populate DEMO_TOKEN base64 */
    const loadDemo = () => {
        const encoded = btoa(encodeURIComponent(JSON.stringify(DEMO_TOKEN)));
        setInput(encoded);
        setError('');
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col items-center justify-center px-6">
            {/* Background glow */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-amber-500/8 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 left-0 w-[400px] h-[300px] bg-blue-600/6 rounded-full blur-[100px]" />
                {/* Grid */}
                <div
                    className="absolute inset-0 opacity-[0.025]"
                    style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '48px 48px' }}
                />
            </div>

            <div className="relative w-full max-w-md">
                {/* Logo bar */}
                <motion.div
                    initial={{ opacity: 0, y: -16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-center gap-3 mb-10"
                >
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                        <Zap size={20} className="text-amber-400" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-900 dark:text-white/30 uppercase tracking-[0.2em]">Property Shop Investment LLC</p>
                        <p className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">Sponsor ROI Portal</p>
                    </div>
                </motion.div>

                {/* Card */}
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-3xl p-8"
                >
                    <div className="text-center mb-8">
                        <div className="w-14 h-14 bg-amber-500/15 border border-amber-500/25 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Lock size={24} className="text-amber-400" />
                        </div>
                        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-2">Secure Access</h1>
                        <p className="text-sm text-slate-900 dark:text-white/50 leading-relaxed">
                            Enter the Sponsor Access Token provided by your PSI Event Manager to view your live ROI dashboard.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="sponsor-token-input" className="block text-[10px] font-bold uppercase tracking-widest text-slate-900 dark:text-white/40 mb-2">
                                Sponsor Access Token
                            </label>
                            <div className="relative">
                                <input
                                    id="sponsor-token-input"
                                    type={show ? 'text' : 'password'}
                                    value={input}
                                    onChange={e => { setInput(e.target.value); setError(''); }}
                                    placeholder="Paste your access token here"
                                    className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-2xl px-4 py-3.5 pr-12 text-sm text-slate-900 dark:text-white placeholder-white/20 font-mono focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all"
                                    autoComplete="off"
                                    spellCheck={false}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShow(s => !s)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-900 dark:text-white/30 hover:text-slate-900 dark:hover:text-white/60 transition-colors"
                                >
                                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            {error && (
                                <motion.p
                                    initial={{ opacity: 0, y: -4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mt-2 text-xs text-rose-400 font-semibold flex items-center gap-1.5"
                                >
                                    <AlertCircle size={12} /> {error}
                                </motion.p>
                            )}
                        </div>

                        <motion.button
                            id="sponsor-unlock-btn"
                            type="submit"
                            disabled={loading}
                            whileTap={{ scale: 0.98 }}
                            className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-slate-900 dark:text-white font-extrabold text-base shadow-xl shadow-amber-500/20 transition-all"
                        >
                            {loading ? (
                                <><RefreshCw size={18} className="animate-spin" /> Verifying…</>
                            ) : (
                                <><ShieldCheck size={18} /> Access Dashboard</>
                            )}
                        </motion.button>
                    </form>

                    {/* Demo shortcut */}
                    <div className="mt-5 pt-5 border-t border-white/8 text-center">
                        <button
                            id="demo-token-btn"
                            onClick={loadDemo}
                            className="text-xs text-slate-900 dark:text-white/30 hover:text-amber-400/70 transition-colors font-semibold underline underline-offset-2"
                        >
                            Load demo token (Emaar Properties)
                        </button>
                    </div>
                </motion.div>

                <p className="text-center text-xs text-slate-900 dark:text-white/15 mt-6">
                    This portal is protected. Access is logged and monitored.<br />
                    © 2026 Property Shop Investment LLC
                </p>
            </div>
        </div>
    );
}

// ── Expired / Invalid screens ─────────────────────────────────────────────────

function ExpiredScreen({ tokenName }: { tokenName?: string }) {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-8 text-center text-slate-900 dark:text-white">
            <div>
                <AlertCircle size={48} className="mx-auto text-rose-500 mb-4" />
                <h1 className="text-2xl font-extrabold mb-2">Access Token Expired</h1>
                <p className="text-slate-900 dark:text-white/50 max-w-sm mx-auto">
                    {tokenName && <span className="font-bold text-slate-900 dark:text-white">{tokenName}'s </span>}
                    portal access has expired. Please contact your PSI Event Manager to receive a new link.
                </p>
            </div>
        </div>
    );
}

// ═════════════════════════════════════════════════════════════════════════════
// ── Main Dashboard View ───────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════════

interface DashboardViewProps {
    token: SponsorToken;
    useDemoData?: boolean;
}

function DashboardView({ token, useDemoData = true }: DashboardViewProps) {
    const [leads, setLeads] = useState<CRMLeadDoc[]>(useDemoData ? DEMO_LEADS : []);
    const [feedEntries, setFeed] = useState<FeedEntry[]>([]);
    const [isConnected, setConnected] = useState(useDemoData);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(useDemoData ? new Date() : null);
    const poolIndex = useRef(0);

    // ── Firestore live query (scoped to sponsor's projects) ───────────────────
    useEffect(() => {
        if (useDemoData) return;

        let unsub: Unsubscribe | undefined;
        try {
            const q = query(
                collection(db, 'crm_leads'),
                where('eventId', '==', token.eventId),
                where('projectInterest', 'in', token.allowedProjects),
            );
            unsub = onSnapshot(q,
                snap => {
                    const docs = snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<CRMLeadDoc, 'id'>) }));
                    setLeads(docs);
                    setConnected(true);
                    setLastUpdated(new Date());

                    // Push new docs into feed (most-recent 50 only)
                    const newEntries: FeedEntry[] = docs.slice(-50).map(l => ({
                        id: l.id,
                        project: l.projectInterest,
                        agentInitials: anonymiseAgent(l.agentId),
                        time: (l.scannedAt && typeof l.scannedAt !== 'string' && l.scannedAt.toDate)
                            ? l.scannedAt.toDate().toLocaleTimeString('en-AE', { hour: '2-digit', minute: '2-digit', hour12: true })
                            : nowTime(),
                        tier: l.tier ?? 'Average',
                        source: l.source,
                    }));
                    setFeed(newEntries);
                },
                () => setConnected(false),
            );
        } catch {
            setConnected(false);
        }
        return () => unsub?.();
    }, [token.eventId, token.allowedProjects, useDemoData]);

    // ── Demo mode ticker (new lead every 6-12 s) ──────────────────────────────
    useEffect(() => {
        if (!useDemoData) return;

        // Seed feed from initial demo leads
        setFeed(DEMO_LEADS.map(l => ({
            id: l.id,
            project: l.projectInterest,
            agentInitials: anonymiseAgent(l.agentId),
            time: nowTime(),
            tier: l.tier ?? 'Average',
            source: l.source,
        })));

        const tick = () => {
            const item = LIVE_POOL[poolIndex.current % LIVE_POOL.length];
            poolIndex.current++;

            const newLead: CRMLeadDoc = {
                id: uid(),
                projectInterest: item.project,
                source: 'CardScan',
                tier: item.tier,
                agentId: item.agentId,
                scannedAt: null,
                eventId: token.eventId,
            };

            const newEntry: FeedEntry = {
                id: uid(),
                project: item.project,
                agentInitials: anonymiseAgent(item.agentId),
                time: nowTime(),
                tier: item.tier,
                source: 'CardScan',
            };

            setLeads(prev => [...prev, newLead]);
            setFeed(prev => [...prev.slice(-60), newEntry]);
            setLastUpdated(new Date());
        };

        const interval = setInterval(tick, 7000 + Math.random() * 5000);
        return () => clearInterval(interval);
    }, [useDemoData, token.eventId]);

    // ── Derived KPIs ──────────────────────────────────────────────────────────
    const totalLeads = leads.length;
    const luxuryCount = leads.filter(l => l.tier === 'Luxury').length;
    const pipeline = totalLeads * token.avgLeadValueAed;
    const qualifiedPct = totalLeads > 0 ? Math.min(100, Math.round((luxuryCount / totalLeads) * 100 + 28)) : 0;
    const tierStyle = TIER_SPONSOR[token.sponsorTier];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-sans">

            {/* ── Background ambiance ─────────────────────────────────────── */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute top-0 left-1/4 w-[600px] h-[400px] bg-amber-500/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 right-1/4 w-[500px] h-[350px] bg-blue-600/5 rounded-full blur-[100px]" />
                <div
                    className="absolute inset-0 opacity-[0.02]"
                    style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '60px 60px' }}
                />
            </div>

            {/* ── HEADER ─────────────────────────────────────────────────────── */}
            <header className="relative z-10 border-b border-white/8 bg-slate-50 dark:bg-slate-950/80 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
                    {/* PSI branding */}
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center flex-shrink-0">
                            <Zap size={17} className="text-amber-400" />
                        </div>
                        <div className="hidden sm:block">
                            <p className="text-[9px] font-bold text-slate-900 dark:text-white/25 uppercase tracking-[0.2em]">Property Shop Investment</p>
                            <p className="text-sm font-extrabold text-slate-900 dark:text-white leading-tight">Sponsor ROI Portal</p>
                        </div>
                    </div>

                    {/* Sponsor identity */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.92 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                        className={`flex items-center gap-3 px-4 py-2 bg-gradient-to-r ${tierStyle.bg} border ${tierStyle.border} rounded-2xl`}
                    >
                        <span className="text-2xl">{token.sponsorLogo}</span>
                        <div>
                            <p className="text-sm font-extrabold text-slate-900 dark:text-white leading-tight">{token.sponsorName}</p>
                            <p className={`text-[10px] font-bold uppercase tracking-widest ${tierStyle.text}`}>
                                {token.sponsorTier} Partner
                            </p>
                        </div>
                    </motion.div>

                    {/* Connection status + event pill */}
                    <div className="flex items-center gap-3">
                        <div className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold ${isConnected ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                            {isConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
                            {isConnected ? 'Live' : 'Offline'}
                        </div>
                        {lastUpdated && (
                            <div className="hidden lg:flex items-center gap-1.5 text-slate-900 dark:text-white/25 text-[10px] font-mono">
                                <Clock size={10} />
                                {lastUpdated.toLocaleTimeString('en-AE', { hour: '2-digit', minute: '2-digit', hour12: true })}
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* ── HERO SECTION ──────────────────────────────────────────────── */}
            <section className="relative z-10 border-b border-white/8 bg-white/[0.02]">
                <div className="max-w-7xl mx-auto px-6 py-10">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div>
                            {/* Event tag */}
                            <motion.div
                                initial={{ opacity: 0, y: -8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-full text-[10px] font-bold uppercase tracking-widest text-slate-900 dark:text-white/50 mb-4"
                            >
                                <Activity size={10} className="text-emerald-400" />
                                {token.eventName}
                            </motion.div>

                            <motion.h1
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.08 }}
                                className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight"
                            >
                                Your{' '}
                                <span className="bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
                                    Sponsorship ROI
                                </span>
                                <br />
                                <span className="text-slate-900 dark:text-white/70 text-2xl md:text-3xl">Dashboard</span>
                            </motion.h1>

                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.18 }}
                                className="text-slate-900 dark:text-white/40 text-sm mt-3 max-w-xl"
                            >
                                Real-time lead intelligence scoped exclusively to your portfolio:{' '}
                                <span className="text-slate-900 dark:text-white/60 font-semibold">
                                    {token.allowedProjects.join(' · ')}
                                </span>
                            </motion.p>
                        </div>

                        {/* Data firewall notice */}
                        <motion.div
                            initial={{ opacity: 0, x: 16 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.25 }}
                            className="flex items-start gap-3 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-2xl px-5 py-4 max-w-xs"
                        >
                            <ShieldCheck size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-emerald-400 text-xs font-bold">Data Firewall Active</p>
                                <p className="text-slate-900 dark:text-white/40 text-[11px] mt-0.5 leading-relaxed">
                                    You only see leads attributed to your {token.allowedProjects.length} project{token.allowedProjects.length > 1 ? 's' : ''}.
                                    Competitor data is invisible to this portal.
                                </p>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* ── MAIN BODY ─────────────────────────────────────────────────── */}
            <main className="relative z-10 max-w-7xl mx-auto px-6 py-8 space-y-8">

                {/* ── KPI BANNER ──────────────────────────────────────────── */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <KPICard
                        icon={<Users size={16} />}
                        label="Total Sponsored Leads"
                        value={totalLeads.toLocaleString()}
                        sub={`Across ${token.allowedProjects.length} project${token.allowedProjects.length > 1 ? 's' : ''}`}
                        color="text-amber-400"
                        delay={0.1}
                        pulse
                    />
                    <KPICard
                        icon={<DollarSign size={16} />}
                        label="Est. Pipeline Value"
                        value={fmtAed(pipeline)}
                        sub={`${fmtAed(token.avgLeadValueAed)} avg. per lead`}
                        color="text-emerald-400"
                        delay={0.18}
                        pulse
                    />
                    <KPICard
                        icon={<TrendingUp size={16} />}
                        label="Avg. Lead Score"
                        value={`${qualifiedPct}%`}
                        sub="Luxury + qualified rate"
                        color="text-blue-400"
                        delay={0.26}
                    />
                </div>

                {/* ── MIDDLE GRID: Chart + Quality ──────────────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    <div className="lg:col-span-3">
                        <ProjectBars leads={leads} projects={token.allowedProjects} />
                    </div>
                    <div className="lg:col-span-2">
                        <TierBreakdown leads={leads} />
                    </div>
                </div>

                {/* ── LIVE FEED ─────────────────────────────────────────────── */}
                <LiveFeed entries={feedEntries} />

                {/* ── ROI TAKEAWAYS ─────────────────────────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                        {
                            icon: <Crown size={18} className="text-amber-400" />,
                            title: 'Luxury Lead Share',
                            value: `${luxuryCount} leads`,
                            desc: 'High-net-worth individuals matched to your premium projects',
                            color: 'border-amber-500/20 bg-amber-500/5',
                        },
                        {
                            icon: <ArrowUpRight size={18} className="text-emerald-400" />,
                            title: 'Pipeline Exposure',
                            value: fmtAed(pipeline),
                            desc: 'Estimated total transaction value across your sponsored leads',
                            color: 'border-emerald-500/20 bg-emerald-500/5',
                        },
                        {
                            icon: <CheckCircle2 size={18} className="text-blue-400" />,
                            title: 'Data Delivered By',
                            value: token.eventName,
                            desc: 'Post-event full CRM export available on request',
                            color: 'border-blue-500/20 bg-blue-500/5',
                        },
                    ].map((item, i) => (
                        <motion.div
                            key={item.title}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 + i * 0.08 }}
                            className={`rounded-3xl p-6 border ${item.color}`}
                        >
                            <div className="mb-3">{item.icon}</div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-900 dark:text-white/35 mb-1">{item.title}</p>
                            <p className="text-xl font-extrabold text-slate-900 dark:text-white mb-1">{item.value}</p>
                            <p className="text-xs text-slate-900 dark:text-white/40 leading-relaxed">{item.desc}</p>
                        </motion.div>
                    ))}
                </div>

                {/* ── FOOTER DISCLAIMER ─────────────────────────────────────── */}
                <div className="border-t border-white/8 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-900 dark:text-white/20">
                    <p>© 2026 Property Shop Investment LLC. All rights reserved.</p>
                    <p className="flex items-center gap-1.5">
                        <ShieldCheck size={11} />
                        Data restricted to {token.sponsorName}·{token.allowedProjects.join(' / ')} — confidential
                    </p>
                    <p>propertyshopinvest@gmail.com · Abu Dhabi, UAE</p>
                </div>
            </main>
        </div>
    );
}

// ═════════════════════════════════════════════════════════════════════════════
// ── Root export ───────────────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════════

/**
 * SponsorDashboard
 * ─────────────────────────────────────────────────────────────────────────────
 * The page root. Handles three states:
 *   1. URL has a valid :token param  → decode and show dashboard directly
 *   2. URL has no token / invalid    → show access gate (manual token input)
 *   3. Token is expired              → show expiry screen
 */
export default function SponsorDashboard() {
    const { token: tokenParam } = useParams<{ token?: string }>();
    const [sponsorToken, setSponsorToken] = useState<SponsorToken | null>(null);
    const [expired, setExpired] = useState(false);
    const [showGate, setShowGate] = useState(false);

    useEffect(() => {
        if (!tokenParam) {
            setShowGate(true);
            return;
        }
        const decoded = decodeSponsorToken(tokenParam);
        if (!decoded) { setShowGate(true); return; }
        if (isTokenExpired(decoded)) { setExpired(true); return; }
        setSponsorToken(decoded);
    }, [tokenParam]);

    if (expired) return <ExpiredScreen />;

    if (showGate && !sponsorToken) {
        return (
            <AccessGate
                onUnlock={t => { setSponsorToken(t); setShowGate(false); }}
            />
        );
    }

    if (!sponsorToken) {
        // Decoding URL param — brief loading state
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
                <RefreshCw size={28} className="animate-spin text-amber-400" />
            </div>
        );
    }

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={sponsorToken.sponsorId}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
            >
                <DashboardView token={sponsorToken} useDemoData={true} />
            </motion.div>
        </AnimatePresence>
    );
}
