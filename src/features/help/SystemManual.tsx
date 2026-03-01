/**
 * SystemManual.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Visual System Manual for the PSI Event Portal.
 *
 * Layout:
 *   ┌──────────────┬──────────────────────────────────────────────────────────┐
 *   │ Left nav     │  Content panel (scrollable)                               │
 *   │ (sticky)     │   1. Accountability Journey  → SVG workflow diagram       │
 *   │              │   2. How to Check-In         → steps + screenshot placeholders │
 *   │              │   3. Understanding Settlements → tables + callouts        │
 *   └──────────────┴──────────────────────────────────────────────────────────┘
 *
 * Mobile: sidebar collapses to a top horizontal pill strip.
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    User, ShieldCheck, Plane, Target,
    QrCode, ScanLine, CheckCircle2, AlertCircle,
    DollarSign, BarChart3, BookOpen,
    ChevronRight, ArrowRight, Info,
    Calculator, TrendingUp, Award,
} from 'lucide-react';

// ── Tiny utility ──────────────────────────────────────────────────────────────

function cn(...c: (string | false | undefined | null)[]) {
    return c.filter(Boolean).join(' ');
}

// ── Section IDs ───────────────────────────────────────────────────────────────

const SECTIONS = [
    {
        id: 'journey',
        number: 1,
        label: 'The Accountability Journey',
        sublabel: 'End-to-end workflow diagram',
        accent: 'emerald',
    },
    {
        id: 'checkin',
        number: 2,
        label: 'How to Check-In',
        sublabel: 'Step-by-step with screenshots',
        accent: 'blue',
    },
    {
        id: 'settlements',
        number: 3,
        label: 'Understanding Settlements',
        sublabel: 'Commissions & ROI calculation',
        accent: 'amber',
    },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

// ─── Sub-component: Left sidebar nav ──────────────────────────────────────────

function ManualNav({
    active,
    onSelect,
}: {
    active: SectionId;
    onSelect: (id: SectionId) => void;
}) {
    return (
        <aside className="hidden md:flex flex-col w-64 lg:w-72 flex-shrink-0 sticky top-0 self-start h-screen border-r border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-900 py-8 px-4 overflow-y-auto scrollbar-none">
            {/* Logo cap */}
            <div className="flex items-center gap-3 px-2 mb-8">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-600/30">
                    <BookOpen size={15} className="text-white" />
                </div>
                <div>
                    <p className="text-slate-900 dark:text-white font-extrabold text-sm tracking-tight leading-none">
                        System Manual
                    </p>
                    <p className="text-slate-400 text-[10px] uppercase tracking-widest mt-0.5">
                        PSI Event Portal
                    </p>
                </div>
            </div>

            {/* Nav items */}
            <nav className="space-y-1 relative">
                {/* Vertical timeline line */}
                <div className="absolute left-[19px] top-1 bottom-1 w-px bg-slate-200 dark:bg-slate-700/60" />

                {SECTIONS.map((sec) => {
                    const isActive = sec.id === active;
                    const dotColor =
                        sec.accent === 'emerald'
                            ? 'bg-emerald-500'
                            : sec.accent === 'blue'
                                ? 'bg-blue-500'
                                : 'bg-amber-500';
                    const activeText =
                        sec.accent === 'emerald'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : sec.accent === 'blue'
                                ? 'text-blue-600 dark:text-blue-400'
                                : 'text-amber-600 dark:text-amber-400';
                    const activeBg =
                        sec.accent === 'emerald'
                            ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20'
                            : sec.accent === 'blue'
                                ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20'
                                : 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20';

                    return (
                        <button
                            key={sec.id}
                            id={`sidenav-${sec.id}`}
                            onClick={() => onSelect(sec.id)}
                            className={cn(
                                'relative w-full flex items-start gap-3 pl-3 pr-3 py-3 rounded-xl text-left transition-all group border',
                                isActive
                                    ? cn('border', activeBg)
                                    : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50'
                            )}
                        >
                            {/* Timeline dot */}
                            <div
                                className={cn(
                                    'w-3 h-3 rounded-full flex-shrink-0 mt-0.5 relative z-10 transition-all ring-2 ring-white dark:ring-slate-900',
                                    isActive ? cn(dotColor, 'scale-125') : 'bg-slate-300 dark:bg-slate-600'
                                )}
                            />
                            <div className="min-w-0">
                                <p
                                    className={cn(
                                        'text-[10px] font-black uppercase tracking-[0.18em] mb-0.5',
                                        isActive ? activeText : 'text-slate-400'
                                    )}
                                >
                                    Section {sec.number}
                                </p>
                                <p
                                    className={cn(
                                        'text-sm font-bold leading-snug',
                                        isActive
                                            ? 'text-slate-900 dark:text-white'
                                            : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200'
                                    )}
                                >
                                    {sec.label}
                                </p>
                                <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">
                                    {sec.sublabel}
                                </p>
                            </div>
                            {isActive && (
                                <ChevronRight
                                    size={13}
                                    className={cn('ml-auto flex-shrink-0 self-center', activeText)}
                                />
                            )}
                        </button>
                    );
                })}
            </nav>

            {/* Footer note */}
            <div className="mt-auto pt-6 border-t border-slate-200 dark:border-slate-800/60 px-2">
                <p className="text-[10px] text-slate-400 leading-relaxed">
                    This manual documents the live PSI Event Portal system. Screenshots are illustrative.
                </p>
            </div>
        </aside>
    );
}

// ─── Sub-component: Mobile horizontal pill nav ────────────────────────────────

function MobileNav({
    active,
    onSelect,
}: {
    active: SectionId;
    onSelect: (id: SectionId) => void;
}) {
    return (
        <div className="md:hidden sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800/60 px-4 py-3">
            <div className="flex gap-2 overflow-x-auto scrollbar-none pb-0.5">
                {SECTIONS.map((sec) => {
                    const isActive = sec.id === active;
                    const activeStyle =
                        sec.accent === 'emerald'
                            ? 'bg-emerald-500 text-white shadow-emerald-500/30'
                            : sec.accent === 'blue'
                                ? 'bg-blue-500 text-white shadow-blue-500/30'
                                : 'bg-amber-500 text-white shadow-amber-500/30';
                    return (
                        <button
                            key={sec.id}
                            onClick={() => onSelect(sec.id)}
                            className={cn(
                                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all',
                                isActive
                                    ? cn(activeStyle, 'shadow-md')
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                            )}
                        >
                            <span className="opacity-70 text-[9px] font-black">{sec.number}.</span>
                            {sec.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Sub-component: Section header ───────────────────────────────────────────

function SectionHeader({
    number,
    title,
    subtitle,
    accent,
}: {
    number: number;
    title: string;
    subtitle: string;
    accent: 'emerald' | 'blue' | 'amber';
}) {
    const badgeColors = {
        emerald:
            'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30',
        blue: 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30',
        amber: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30',
    };
    const barColors = {
        emerald: 'from-emerald-500 to-emerald-400',
        blue: 'from-blue-500 to-blue-400',
        amber: 'from-amber-500 to-amber-400',
    };

    return (
        <div className="mb-8">
            <div className="flex items-center gap-3 mb-3">
                <span
                    className={cn(
                        'text-[10px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-full',
                        badgeColors[accent]
                    )}
                >
                    Section {number}
                </span>
                <div className={cn('flex-1 h-px bg-gradient-to-r max-w-[80px]', barColors[accent])} />
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
                {title}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-base leading-relaxed">
                {subtitle}
            </p>
        </div>
    );
}

// ─── Sub-component: Callout box ───────────────────────────────────────────────

function Callout({
    type,
    children,
}: {
    type: 'info' | 'warning' | 'success';
    children: React.ReactNode;
}) {
    const styles = {
        info: {
            wrap: 'bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-700/50',
            icon: <Info size={14} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />,
            text: 'text-blue-800 dark:text-blue-200',
        },
        warning: {
            wrap: 'bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-700/50',
            icon: <AlertCircle size={14} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />,
            text: 'text-amber-800 dark:text-amber-200',
        },
        success: {
            wrap: 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-700/50',
            icon: <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />,
            text: 'text-emerald-800 dark:text-emerald-200',
        },
    };
    const s = styles[type];
    return (
        <div className={cn('rounded-xl p-4 flex items-start gap-3', s.wrap)}>
            {s.icon}
            <p className={cn('text-sm leading-relaxed', s.text)}>{children}</p>
        </div>
    );
}

// ─── Sub-component: Apple-style screenshot placeholder ────────────────────────

function ScreenshotPlaceholder({
    filename,
    alt,
    caption,
    url,
}: {
    filename: string;   // any extension: agent-pass.png, scanner-step.jpg, etc.
    alt: string;
    caption?: string;
    url?: string;       // app route to navigate to before taking the screenshot
}) {
    const [imgError, setImgError] = useState(false);
    // Works with any browser-supported image format — png, jpg, jpeg, webp, avif.
    // Just drop the file into public/manual/ with the exact filename used here.
    const src = `/manual/${filename}`;

    // Derive a clean, clickable href from the descriptive url string
    // e.g. "localhost:5173/check-in  →  My QR Pass tab"  →  "http://localhost:5173/check-in"
    const clickHref = url
        ? (() => {
            const cleanPath = url.split(/\s*[→>]\s*|\s{2,}/)[0].trim();
            return cleanPath.startsWith('http') ? cleanPath : `http://${cleanPath}`;
        })()
        : null;

    return (
        <figure className="my-6">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-xl shadow-slate-900/10 overflow-hidden bg-slate-900 p-2">
                {!imgError ? (
                    <img
                        src={src}
                        alt={alt}
                        onError={() => setImgError(true)}
                        className="w-full h-auto rounded-xl border border-white/10 block"
                    />
                ) : (
                    /* ── Fallback placeholder — ENTIRE AREA is clickable ── */
                    <a
                        href={clickHref ?? '#'}
                        target={clickHref ? '_blank' : undefined}
                        rel="noopener noreferrer"
                        onClick={!clickHref ? (e) => e.preventDefault() : undefined}
                        className={[
                            'block rounded-xl border border-white/10 bg-slate-800/60',
                            'min-h-[220px] md:min-h-[280px] flex flex-col items-center justify-center gap-4 px-6 py-10',
                            clickHref
                                ? 'cursor-pointer hover:bg-slate-700/60 hover:border-blue-500/50 hover:ring-2 hover:ring-blue-500/30 transition-all duration-200 group'
                                : 'cursor-default',
                        ].join(' ')}
                    >
                        {/* Decorative fake UI chrome */}
                        <div className="w-full max-w-xs flex flex-col gap-2 opacity-30 pointer-events-none select-none group-hover:opacity-50 transition-opacity duration-200">
                            <div className="flex items-center gap-1.5 mb-1">
                                <div className="w-2 h-2 rounded-full bg-red-400" />
                                <div className="w-2 h-2 rounded-full bg-amber-400" />
                                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                            </div>
                            <div className="h-3 bg-slate-600 rounded-md w-3/4" />
                            <div className="h-3 bg-slate-700 rounded-md w-1/2" />
                            <div className="h-20 bg-slate-700/60 rounded-xl mt-2" />
                            <div className="flex gap-2">
                                <div className="h-8 bg-emerald-500/30 rounded-lg flex-1" />
                                <div className="h-8 bg-slate-600/60 rounded-lg flex-1" />
                            </div>
                        </div>

                        {/* CTA — prominent blue button + instructions */}
                        <div className="text-center space-y-3">
                            {clickHref ? (
                                <>
                                    <div className="inline-flex items-center gap-2 bg-blue-600 group-hover:bg-blue-500 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-all duration-150 shadow-lg shadow-blue-900/40 group-hover:scale-105 group-hover:shadow-blue-500/40">
                                        <span>📸 Click to open this screen</span>
                                        {/* External link icon */}
                                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                            <polyline points="15 3 21 3 21 9" />
                                            <line x1="10" y1="14" x2="21" y2="3" />
                                        </svg>
                                    </div>
                                    <p className="text-slate-400 text-[10px] font-mono break-all">{clickHref}</p>
                                </>
                            ) : (
                                <p className="text-slate-300 font-bold text-sm">Screenshot coming soon</p>
                            )}
                            <p className="text-slate-500 text-xs font-mono">
                                Save screenshot as{' '}
                                <span className="text-emerald-400 font-semibold">{filename}</span>
                                {' '}→{' '}
                                <span className="text-blue-400">public/manual/</span>
                            </p>
                        </div>
                    </a>
                )}
            </div>
            {caption && (
                <figcaption className="text-center text-[11px] text-slate-400 mt-2 font-medium">
                    {caption}
                </figcaption>
            )}
        </figure>
    );
}

// ─── THE BIG ONE: Accountability Journey Diagram ──────────────────────────────
//
// Built entirely in SVG + Tailwind — no image tags.
// Nodes: Agent Registration → Manager Approval → Logistics Desk → Event Floor
// Animated gradient connector lines pulse left-to-right.

const FLOW_NODES = [
    {
        id: 'registration',
        icon: User,
        label: 'Agent\nRegistration',
        sublabel: 'Upload docs & sign risk tier',
        accentFrom: '#10b981',
        accentTo: '#059669',
        badge: '01',
    },
    {
        id: 'approval',
        icon: ShieldCheck,
        label: 'Manager\nApproval',
        sublabel: 'Branch head authorises travel',
        accentFrom: '#3b82f6',
        accentTo: '#2563eb',
        badge: '02',
    },
    {
        id: 'logistics',
        icon: Plane,
        label: 'Logistics\nDesk',
        sublabel: 'Flight & visa compliance gate',
        accentFrom: '#8b5cf6',
        accentTo: '#7c3aed',
        badge: '03',
    },
    {
        id: 'floor',
        icon: Target,
        label: 'Event Floor\nExecution',
        sublabel: 'QR check-in unlocks lead engine',
        accentFrom: '#f59e0b',
        accentTo: '#d97706',
        badge: '04',
    },
] as const;

function AnimatedConnector({ index }: { index: number }) {
    return (
        <div className="flex items-center justify-center flex-shrink-0 w-10 md:w-16 relative">
            {/* Static track */}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-slate-200 dark:bg-slate-700" />
            {/* Animated pulse dot */}
            <motion.div
                className="relative z-10 w-2 h-2 rounded-full bg-emerald-400 shadow-md shadow-emerald-400/50"
                animate={{ x: ['0%', '60px', '0%'], opacity: [0, 1, 0] }}
                transition={{
                    duration: 2.4,
                    delay: index * 0.6,
                    repeat: Infinity,
                    ease: 'easeInOut',
                }}
            />
            {/* Arrow head */}
            <ArrowRight
                size={13}
                className="absolute right-0 text-slate-300 dark:text-slate-600"
            />
        </div>
    );
}

function WorkflowNode({
    node,
    index,
}: {
    node: (typeof FLOW_NODES)[number];
    index: number;
}) {
    const Icon = node.icon;
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.12 }}
            className="flex flex-col items-center text-center w-32 md:w-36 lg:w-40 flex-shrink-0"
        >
            {/* Step badge */}
            <div
                className="text-[9px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-full mb-3 text-white"
                style={{
                    background: `linear-gradient(135deg, ${node.accentFrom}, ${node.accentTo})`,
                }}
            >
                Step {node.badge}
            </div>

            {/* Icon circle */}
            <div
                className="w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center mb-3 shadow-lg transition-transform hover:scale-105"
                style={{
                    background: `linear-gradient(135deg, ${node.accentFrom}22, ${node.accentTo}11)`,
                    border: `1.5px solid ${node.accentFrom}44`,
                    boxShadow: `0 8px 24px -4px ${node.accentFrom}30`,
                }}
            >
                <Icon
                    size={24}
                    style={{ color: node.accentFrom }}
                />
            </div>

            {/* Label */}
            <p className="text-sm font-extrabold text-slate-900 dark:text-white leading-tight whitespace-pre-line">
                {node.label}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug max-w-[120px]">
                {node.sublabel}
            </p>
        </motion.div>
    );
}

function AccountabilityJourneyDiagram() {
    return (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800/50 overflow-hidden shadow-xl shadow-slate-900/5 my-8">
            {/* Header bar */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">
                        Live Process Diagram
                    </p>
                    <p className="text-slate-900 dark:text-white font-bold text-sm mt-0.5">
                        Agent Accountability Chain
                    </p>
                </div>
                <div className="flex items-center gap-1.5">
                    <motion.div
                        className="w-2 h-2 rounded-full bg-emerald-400"
                        animate={{ scale: [1, 1.4, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                    />
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                        Live System
                    </span>
                </div>
            </div>

            {/* Diagram body */}
            <div className="px-6 py-8 overflow-x-auto scrollbar-none">
                <div className="flex items-center justify-start md:justify-center min-w-max md:min-w-0 gap-0">
                    {FLOW_NODES.map((node, i) => (
                        <React.Fragment key={node.id}>
                            <WorkflowNode node={node} index={i} />
                            {i < FLOW_NODES.length - 1 && (
                                <AnimatedConnector index={i} />
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </div>

            {/* Footer legend */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800/30 grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: 'Gate: Document Upload', color: '#10b981' },
                    { label: 'Gate: Manager Token', color: '#3b82f6' },
                    { label: 'Gate: 48-hr Nudger', color: '#8b5cf6' },
                    { label: 'Gate: QR Check-In', color: '#f59e0b' },
                ].map((item) => (
                    <div key={item.label} className="flex items-center gap-2">
                        <div
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: item.color }}
                        />
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium leading-tight">
                            {item.label}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Section 1: Accountability Journey ───────────────────────────────────────

function JourneySection() {
    return (
        <section id="journey" className="scroll-mt-6 pb-16">
            <SectionHeader
                number={1}
                title="The Accountability Journey"
                subtitle="Every agent travels through four enforced gates before a single lead reaches their name. No shortcuts. No exceptions."
                accent="emerald"
            />

            {/* The Workflow Diagram */}
            <AccountabilityJourneyDiagram />

            {/* Node-by-node explanation */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                {[
                    {
                        icon: User,
                        color: 'emerald',
                        title: '01 · Agent Registration',
                        desc: 'The agent nominates themselves (or is nominated by their Branch Manager) for a roadshow. They must upload their passport, visa, and flight details before the document deadline. If any field is missing, the 48-hour nudger fires automatically.',
                    },
                    {
                        icon: ShieldCheck,
                        color: 'blue',
                        title: '02 · Manager Approval',
                        desc: 'The Branch Manager reviews each nominee in the AI Approvals queue. A single "Approve" click changes the agent\'s Firestore status from pending to approved and issues their Event Pass. Without this, no QR code is generated.',
                    },
                    {
                        icon: Plane,
                        color: 'violet',
                        title: '03 · Logistics Desk',
                        desc: 'The Travel Desk module tracks flight bookings, accommodation, and ground transport for the entire approved roster. Any agent flagged as non-compliant at this stage can be benched before departure — protecting the branch from no-shows.',
                    },
                    {
                        icon: Target,
                        color: 'amber',
                        title: '04 · Event Floor Execution',
                        desc: 'On event day, the Organiser scans each agent\'s QR pass. The atomic Firestore write sets status: physically_present. The Lead Distribution engine only distributes to agents with this status — guaranteeing fair, fraud-proof assignment.',
                    },
                ].map((card) => {
                    const Icon = card.icon;
                    const borderMap: Record<string, string> = {
                        emerald: 'border-emerald-200 dark:border-emerald-600/30 bg-emerald-50 dark:bg-emerald-950/30',
                        blue: 'border-blue-200 dark:border-blue-600/30 bg-blue-50 dark:bg-blue-950/30',
                        violet: 'border-violet-200 dark:border-violet-600/30 bg-violet-50 dark:bg-violet-950/30',
                        amber: 'border-amber-200 dark:border-amber-600/30 bg-amber-50 dark:bg-amber-950/30',
                    };
                    const iconColorMap: Record<string, string> = {
                        emerald: 'text-emerald-600 dark:text-emerald-400',
                        blue: 'text-blue-600 dark:text-blue-400',
                        violet: 'text-violet-600 dark:text-violet-400',
                        amber: 'text-amber-600 dark:text-amber-400',
                    };
                    return (
                        <div
                            key={card.title}
                            className={cn(
                                'rounded-2xl border p-5 flex flex-col gap-3',
                                borderMap[card.color]
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <Icon size={18} className={iconColorMap[card.color]} />
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                    {card.title}
                                </h3>
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                {card.desc}
                            </p>
                        </div>
                    );
                })}
            </div>

            <div className="mt-6">
                <Callout type="success">
                    <strong>Why this matters:</strong> The four-gate chain creates an unbroken audit trail
                    from nomination to lead assignment. Every action — approval, nudge, check-in — is
                    timestamped in Firestore. In the event of a dispute, the system log is the single source
                    of truth.
                </Callout>
            </div>
        </section>
    );
}

// ─── Section 2: How to Check-In ──────────────────────────────────────────────

const CHECKIN_STEPS = [
    {
        step: 1,
        role: 'Agent',
        title: 'Open My QR Pass',
        url: 'localhost:5173/check-in  →  "My QR Pass" tab',
        desc: 'Navigate to Check-In → "My QR Pass" tab on your smartphone. The pass is automatically generated once your manager has approved your attendance.',
        icon: QrCode,
        screenshot: 'agent-pass.png',
        screenshotAlt: 'Agent pass view showing QR code and event details',
        screenshotCaption: 'Agent Pass View — QR code auto-generated post-approval',
    },
    {
        step: 2,
        role: 'Organiser',
        title: 'Open the Scanner',
        url: 'localhost:5173/check-in  →  "Scanner" tab',
        desc: 'The event organiser opens Check-In → "Scanner" tab on their device. This view shows a real-time agent roster with their check-in statuses.',
        icon: ScanLine,
        screenshot: 'scanner-step.png',
        screenshotAlt: 'Scanner View showing QR code input and real-time roster',
        screenshotCaption: 'Organiser Scanner View — live roster updates as agents check in',
    },
    {
        step: 3,
        role: 'System',
        title: 'Verification & Status Lock',
        url: 'localhost:5173/check-in  →  scan a QR code to see confirmed state',
        desc: 'The organiser scans or pastes the agent\'s QR token. The system validates the JWT signature and atomically writes status: physically_present to Firestore. The agent card turns green on both screens simultaneously.',
        icon: CheckCircle2,
        screenshot: 'check-in-confirmed.png',
        screenshotAlt: 'Confirmation screen showing physically_present status',
        screenshotCaption: 'Confirmation — agent status locked, lead engine activated',
    },
];

function CheckInSection() {
    return (
        <section id="checkin" className="scroll-mt-6 pb-16 border-t border-slate-200 dark:border-slate-800/60 pt-12">
            <SectionHeader
                number={2}
                title="How to Check-In"
                subtitle="The QR check-in process is the most critical operation on event day. Follow these steps exactly."
                accent="blue"
            />

            <Callout type="warning">
                <strong>Critical gate:</strong> An agent who has not physically checked in via QR will
                receive <strong>zero leads</strong> from the automated distribution engine — regardless of
                approval status. There are no overrides.
            </Callout>

            <div className="mt-8 space-y-12">
                {CHECKIN_STEPS.map((s, idx) => {
                    const Icon = s.icon;
                    const roleColor =
                        s.role === 'Agent'
                            ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30'
                            : s.role === 'Organiser'
                                ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30'
                                : 'bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-500/30';
                    return (
                        <div key={s.step}>
                            {/* Step header */}
                            <div className="flex items-start gap-4 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <Icon size={18} className="text-blue-600 dark:text-blue-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                        <span className="text-[10px] font-black uppercase tracking-[0.15em] text-blue-600 dark:text-blue-400">
                                            Step {s.step}
                                        </span>
                                        <span
                                            className={cn(
                                                'text-[10px] font-bold uppercase tracking-[0.1em] px-2 py-0.5 rounded-full border',
                                                roleColor
                                            )}
                                        >
                                            {s.role}
                                        </span>
                                    </div>
                                    <h3 className="text-lg font-extrabold text-slate-900 dark:text-white leading-tight">
                                        {s.title}
                                    </h3>
                                    {s.url && (
                                        <div className="mt-1.5 inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 rounded-lg px-2.5 py-1">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">📸 URL</span>
                                            <span className="text-[11px] font-mono font-semibold text-blue-600 dark:text-blue-400">{s.url}</span>
                                        </div>
                                    )}
                                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                                        {s.desc}
                                    </p>
                                </div>
                            </div>

                            {/* Screenshot placeholder / real image */}
                            <ScreenshotPlaceholder
                                filename={s.screenshot}
                                alt={s.screenshotAlt}
                                caption={s.screenshotCaption}
                                url={s.url}
                            />

                            {/* Divider between steps */}
                            {idx < CHECKIN_STEPS.length - 1 && (
                                <div className="flex items-center gap-3 mt-4">
                                    <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700/60" />
                                    <div className="w-6 h-6 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 flex items-center justify-center">
                                        <ChevronRight size={11} className="text-blue-500" />
                                    </div>
                                    <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700/60" />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="mt-8">
                <Callout type="info">
                    QR codes are signed JWTs and expire after{' '}
                    <strong>24 hours</strong> for security. Agents should open their pass on the morning of
                    the event, not the night before.
                </Callout>
            </div>
        </section>
    );
}

// ─── Section 3: Understanding Settlements ────────────────────────────────────

const TIER_TABLE = [
    { tier: '🥇 Gold', share: '50%', example: 'AED 1,000,000 × 50% = AED 500,000', who: 'Top performers from previous events' },
    { tier: '🥈 Silver', share: '30%', example: 'AED 1,000,000 × 30% = AED 300,000', who: 'Mid-tier agents with solid track record' },
    { tier: '🥉 Bronze', share: '20%', example: 'AED 1,000,000 × 20% = AED 200,000', who: 'New or unproven agents' },
];

function SettlementsSection() {
    return (
        <section id="settlements" className="scroll-mt-6 pb-16 border-t border-slate-200 dark:border-slate-800/60 pt-12">
            <SectionHeader
                number={3}
                title="Understanding Settlements"
                subtitle="The commission engine calculates exact AED payouts per agent based on their closed revenue and pre-assigned risk tier. Zero ambiguity, zero disputes."
                accent="amber"
            />

            {/* Formula card */}
            <div className="rounded-2xl border border-amber-200 dark:border-amber-700/40 bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/30 dark:to-slate-900 p-6 mb-8 shadow-lg shadow-amber-500/5">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center">
                        <Calculator size={17} className="text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400">
                            Core Formula
                        </p>
                        <p className="text-slate-900 dark:text-white font-bold text-sm">
                            Agent Commission Calculation
                        </p>
                    </div>
                </div>
                <div className="space-y-3 font-mono">
                    {[
                        {
                            label: 'Agent Payout',
                            expr: 'Closed Revenue  ×  Tier Share %',
                            highlight: true,
                        },
                        {
                            label: 'Branch Gross Profit',
                            expr: 'Total Revenue  −  All Agent Payouts',
                        },
                        {
                            label: 'Net ROI %',
                            expr: '(Branch Gross Profit ÷ Total Costs)  ×  100',
                        },
                    ].map((row) => (
                        <div
                            key={row.label}
                            className={cn(
                                'flex flex-wrap items-center gap-2 px-4 py-3 rounded-xl',
                                row.highlight
                                    ? 'bg-amber-100 dark:bg-amber-500/15 border border-amber-300 dark:border-amber-500/30'
                                    : 'bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50'
                            )}
                        >
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 w-36 flex-shrink-0">
                                {row.label}
                            </span>
                            <span className="text-xs text-slate-800 dark:text-slate-200 font-semibold">
                                = {row.expr}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Tier table */}
            <div className="mb-8">
                <h3 className="text-sm font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400 mb-4">
                    Risk Tiers — 50 / 30 / 20 Model
                </h3>
                <div className="rounded-2xl border border-slate-200 dark:border-slate-700/60 overflow-hidden shadow-sm">
                    {/* Table header */}
                    <div className="grid grid-cols-3 gap-0 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700/60">
                        {['Tier', 'Agent Share', 'Who Gets It'].map((h) => (
                            <div key={h} className="px-4 py-3 text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                {h}
                            </div>
                        ))}
                    </div>
                    {/* Table rows */}
                    {TIER_TABLE.map((row, i) => (
                        <div
                            key={row.tier}
                            className={cn(
                                'grid grid-cols-3 gap-0 transition-colors',
                                i < TIER_TABLE.length - 1 ? 'border-b border-slate-100 dark:border-slate-800/60' : ''
                            )}
                        >
                            <div className="px-4 py-4 text-sm font-bold text-slate-900 dark:text-white">
                                {row.tier}
                            </div>
                            <div className="px-4 py-4">
                                <span className="text-sm font-extrabold text-amber-600 dark:text-amber-400">
                                    {row.share}
                                </span>
                                <p className="text-[11px] text-slate-400 mt-0.5 font-mono leading-tight">
                                    {row.example}
                                </p>
                            </div>
                            <div className="px-4 py-4 text-xs text-slate-600 dark:text-slate-400 leading-snug self-center">
                                {row.who}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Step-by-step settlement process */}
            <h3 className="text-sm font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400 mb-4">
                Generating the Final Settlement Report
            </h3>
            <div className="space-y-3 mb-8">
                {[
                    { n: '01', text: 'Navigate to Settlement in the left sidebar.', icon: Calculator },
                    { n: '02', text: 'Verify the Event Details: name, date, venue, and managing branch.', icon: BookOpen },
                    { n: '03', text: 'Add each closing agent to the Roster with their Closed Revenue amount.', icon: User },
                    { n: '04', text: 'Confirm or adjust their Risk Tier (Gold / Silver / Bronze).', icon: Award },
                    { n: '05', text: 'Click "Generate Final Settlement Report" — payouts calculate instantly.', icon: BarChart3 },
                    { n: '06', text: 'Review the Top Performer callout and Net ROI. Print or save as PDF.', icon: TrendingUp },
                ].map((step) => {
                    const Icon = step.icon;
                    return (
                        <div
                            key={step.n}
                            className="flex items-start gap-4 rounded-xl border border-slate-100 dark:border-slate-800/60 bg-white dark:bg-slate-900/50 px-5 py-4"
                        >
                            <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <Icon size={13} className="text-amber-600 dark:text-amber-400" />
                            </div>
                            <div className="min-w-0">
                                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-amber-600 dark:text-amber-400">
                                    Step {step.n}
                                </span>
                                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed mt-0.5">
                                    {step.text}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Screenshot placeholder for settlement report */}
            <ScreenshotPlaceholder
                filename="settlement-report.png"
                alt="Final Settlement Report screen showing per-agent payouts and branch ROI"
                caption="Settlement Report — generated PDF with per-agent payouts, branch gross profit, and Net ROI %"
                url="localhost:5173/settlement  →  fill in agents, click 'Generate Final Settlement Report'"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Callout type="success">
                    <strong>Lock & Print:</strong> Once generated, the Settlement Report is the single
                    source of truth for Finance, Manager, and Agent — disputes are resolved by the same
                    document.
                </Callout>
                <Callout type="info">
                    <strong>Timing:</strong> Target is to generate the report within 24 hours of the final
                    deal being marked <code className="font-mono text-xs">deal_closed</code> in Firestore.
                </Callout>
            </div>
        </section>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SystemManual() {
    const [activeSection, setActiveSection] = useState<SectionId>('journey');
    const contentRef = useRef<HTMLDivElement>(null);

    // Update active nav item based on scroll position
    useEffect(() => {
        const sections = SECTIONS.map((s) => document.getElementById(s.id));
        const observer = new IntersectionObserver(
            (entries) => {
                const visible = entries.filter((e) => e.isIntersecting);
                if (visible.length > 0) {
                    const topmost = visible.sort(
                        (a, b) => a.boundingClientRect.top - b.boundingClientRect.top
                    )[0];
                    setActiveSection(topmost.target.id as SectionId);
                }
            },
            { rootMargin: '-20% 0px -60% 0px', threshold: 0 }
        );
        sections.forEach((el) => el && observer.observe(el));
        return () => observer.disconnect();
    }, []);

    const handleSelect = (id: SectionId) => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setActiveSection(id);
    };

    return (
        <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 font-sans">

            {/* ── Desktop Left Sidebar ── */}
            <ManualNav active={activeSection} onSelect={handleSelect} />

            {/* ── Right: content column ── */}
            <div className="flex-1 min-w-0 flex flex-col">

                {/* Mobile nav pill strip */}
                <MobileNav active={activeSection} onSelect={handleSelect} />

                {/* Page header */}
                <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800/60 px-6 md:px-10 lg:px-16 py-8">
                    <div className="max-w-3xl">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30">
                                Visual System Manual
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                v2.0
                            </span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
                            PSI Event Portal
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-2 text-base leading-relaxed max-w-xl">
                            A complete visual reference for the end-to-end event lifecycle — from agent
                            registration to final commission settlement.
                        </p>
                    </div>
                </div>

                {/* Main scrollable content */}
                <main
                    ref={contentRef}
                    className="flex-1 overflow-y-auto px-6 md:px-10 lg:px-16 py-10"
                >
                    <div className="max-w-3xl">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key="content"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.3 }}
                            >
                                <JourneySection />
                                <CheckInSection />
                                <SettlementsSection />
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </main>
            </div>
        </div>
    );
}
