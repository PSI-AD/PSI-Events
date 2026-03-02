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
    FileCheck2, UserCheck,
    Building2, Lock, Database, Users,
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
    {
        id: 'security',
        number: 4,
        label: 'Enterprise Security & Privacy',
        sublabel: 'Row-Level Security & RLS model',
        accent: 'violet',
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
                                : sec.accent === 'amber'
                                    ? 'bg-amber-500'
                                    : 'bg-violet-500';
                    const activeText =
                        sec.accent === 'emerald'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : sec.accent === 'blue'
                                ? 'text-blue-600 dark:text-blue-400'
                                : sec.accent === 'amber'
                                    ? 'text-amber-600 dark:text-amber-400'
                                    : 'text-violet-600 dark:text-violet-400';
                    const activeBg =
                        sec.accent === 'emerald'
                            ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20'
                            : sec.accent === 'blue'
                                ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20'
                                : sec.accent === 'amber'
                                    ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20'
                                    : 'bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/20';

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
                                : sec.accent === 'amber'
                                    ? 'bg-amber-500 text-white shadow-amber-500/30'
                                    : 'bg-violet-500 text-white shadow-violet-500/30';
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
    accent: 'emerald' | 'blue' | 'amber' | 'violet';
}) {
    const badgeColors = {
        emerald:
            'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30',
        blue: 'bg-blue-50   dark:bg-blue-500/10   text-blue-700   dark:text-blue-400   border border-blue-200   dark:border-blue-500/30',
        amber: 'bg-amber-50  dark:bg-amber-500/10  text-amber-700  dark:text-amber-400  border border-amber-200  dark:border-amber-500/30',
        violet: 'bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400 border border-violet-200 dark:border-violet-500/30',
    };
    const barColors = {
        emerald: 'from-emerald-500 to-emerald-400',
        blue: 'from-blue-500    to-blue-400',
        amber: 'from-amber-500   to-amber-400',
        violet: 'from-violet-500  to-violet-400',
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
    filename: string;
    alt: string;
    caption?: string;
    url?: string;
}) {
    const [imgError, setImgError] = useState(false);
    const [copied, setCopied] = useState(false);
    const src = `/manual/${filename}`;

    function copyFilename(e: React.MouseEvent) {
        e.preventDefault();
        e.stopPropagation();
        navigator.clipboard.writeText(filename).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        });
    }

    // Split "localhost:5173/check-in → Scanner tab" into:
    //   baseHref:        "http://localhost:5173/check-in"   ← the link to open
    //   thenInstruction: "Scanner tab"                      ← distinct action once there
    const { baseHref, thenInstruction } = (() => {
        if (!url) return { baseHref: null, thenInstruction: null };
        const arrowMatch = url.match(/^([^→>]+?)\s*[→>]\s*(.+)$/);
        if (arrowMatch) {
            const raw = arrowMatch[1].trim();
            return {
                baseHref: raw.startsWith('http') ? raw : `http://${raw}`,
                thenInstruction: arrowMatch[2].trim().replace(/^["']|["']$/g, ''),
            };
        }
        const raw = url.trim();
        return { baseHref: raw.startsWith('http') ? raw : `http://${raw}`, thenInstruction: null };
    })();

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
                    /* ── Fallback placeholder — entire area is a link, opens target page ── */
                    <a
                        href={baseHref ?? '#'}
                        target={baseHref ? '_blank' : undefined}
                        rel="noopener noreferrer"
                        onClick={!baseHref ? (e) => e.preventDefault() : undefined}
                        className={[
                            'block rounded-xl border border-white/10 bg-slate-800/60',
                            'min-h-[240px] md:min-h-[300px] flex flex-col items-center justify-center gap-5 px-6 py-10',
                            baseHref
                                ? 'cursor-pointer hover:bg-slate-700/60 hover:border-blue-500/50 hover:ring-2 hover:ring-blue-500/30 transition-all duration-200 group'
                                : 'cursor-default',
                        ].join(' ')}
                    >
                        {/* Decorative UI chrome */}
                        <div className="w-full max-w-xs flex flex-col gap-2 opacity-25 pointer-events-none select-none group-hover:opacity-40 transition-opacity duration-200">
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

                        {/* CTA block */}
                        <div className="text-center space-y-3 w-full max-w-sm">

                            {/* ── Step 1: Open the page ── */}
                            {baseHref ? (
                                <div className="inline-flex items-center gap-2 bg-blue-600 group-hover:bg-blue-500 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-all duration-150 shadow-lg shadow-blue-900/40 group-hover:scale-105">
                                    <span>📸 Click to open this screen</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                        <polyline points="15 3 21 3 21 9" />
                                        <line x1="10" y1="14" x2="21" y2="3" />
                                    </svg>
                                </div>
                            ) : (
                                <p className="text-slate-300 font-bold text-sm">Screenshot needed</p>
                            )}

                            {/* ── Step 2: What to do once on that page (distinct per screenshot) ── */}
                            {thenInstruction && (
                                <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2 text-left">
                                    <span className="text-amber-400 text-[10px] font-black uppercase tracking-widest mt-0.5 flex-shrink-0">Then:</span>
                                    <span className="text-amber-200 text-xs font-semibold leading-snug">{thenInstruction}</span>
                                </div>
                            )}

                            {/* ── Step 3: Click-to-copy filename ── */}
                            <div className="flex items-center justify-center gap-1.5 text-xs font-mono">
                                <span className="text-slate-500">Save as</span>
                                <button
                                    type="button"
                                    onClick={copyFilename}
                                    title="Click to copy filename"
                                    className="relative inline-flex items-center gap-1 bg-slate-700/60 hover:bg-slate-600/80 border border-slate-600/60 hover:border-emerald-500/50 text-emerald-400 font-bold px-2 py-0.5 rounded-lg transition-all duration-150 cursor-pointer select-all"
                                >
                                    {filename}
                                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 flex-shrink-0">
                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                    </svg>
                                    {/* Copied! flash */}
                                    {copied && (
                                        <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap shadow-lg">
                                            ✓ Copied!
                                        </span>
                                    )}
                                </button>
                                <span className="text-slate-500">→</span>
                                <span className="text-blue-400">public/manual/</span>
                            </div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mt-6">
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

// ─── Section 2: Check-In Flow Diagram ────────────────────────────────────────

const FLOW_STEPS = [
    {
        id: 1,
        icon: QrCode,
        label: 'Digital Pass',
        sublabel: 'Agent presents Apple / Google Wallet Pass',
        accent: 'blue' as const,
    },
    {
        id: 2,
        icon: ScanLine,
        label: 'Security Scan',
        sublabel: 'Organizer scans QR via mobile portal',
        accent: 'blue' as const,
    },
    {
        id: 3,
        icon: FileCheck2,
        label: 'Logistics Check',
        sublabel: 'System verifies Visa & Flight uploads',
        accent: 'blue' as const,
    },
    {
        id: 4,
        icon: UserCheck,
        label: 'Floor Access',
        sublabel: 'Agent status → Physically Present',
        accent: 'emerald' as const,
    },
];

const ACCENT_STYLES = {
    blue: {
        ring: 'ring-2 ring-blue-300/40 dark:ring-blue-500/30',
        iconBg: 'bg-blue-50 dark:bg-blue-500/10',
        iconColor: 'text-blue-600 dark:text-blue-400',
        badge: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300',
        labelColor: 'text-slate-800 dark:text-white',
        sublabelColor: 'text-slate-500 dark:text-slate-400',
        border: 'border-blue-100 dark:border-blue-500/20',
        glow: '',
    },
    emerald: {
        ring: 'ring-2 ring-emerald-300/60 dark:ring-emerald-500/40',
        iconBg: 'bg-emerald-50 dark:bg-emerald-500/15',
        iconColor: 'text-emerald-600 dark:text-emerald-400',
        badge: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
        labelColor: 'text-emerald-700 dark:text-emerald-300',
        sublabelColor: 'text-emerald-600/80 dark:text-emerald-400/80',
        border: 'border-emerald-200 dark:border-emerald-500/30',
        glow: 'shadow-emerald-500/20 shadow-xl',
    },
};

function CheckInFlowDiagram() {
    return (
        <div className="my-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 md:p-8 lg:p-12 shadow-lg shadow-slate-900/5 overflow-hidden">
            {/* CSS for dashed line animation */}
            <style>{`
                @keyframes dash-flow {
                    from { stroke-dashoffset: 24; }
                    to   { stroke-dashoffset: 0; }
                }
                .dash-animated {
                    animation: dash-flow 1.2s linear infinite;
                    stroke-dasharray: 6 6;
                }
            `}</style>

            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500 mb-6 text-center">
                Check-In Process · Event Day Flow
            </p>

            {/* ── Mobile: vertical stack ── Desktop: horizontal row ── */}
            <div className="flex flex-col md:flex-row items-center justify-center gap-0">
                {FLOW_STEPS.map((step, idx) => {
                    const Icon = step.icon;
                    const s = ACCENT_STYLES[step.accent];
                    const isLast = idx === FLOW_STEPS.length - 1;

                    return (
                        <React.Fragment key={step.id}>
                            {/* ── Step card ── */}
                            <motion.div
                                initial={{ opacity: 0, y: 16 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.4, delay: idx * 0.12 }}
                                className={cn(
                                    'flex flex-col items-center gap-3 p-5 rounded-2xl border',
                                    'w-full md:w-44 flex-shrink-0 transition-shadow duration-300',
                                    s.ring, s.border, s.glow,
                                    step.accent === 'emerald'
                                        ? 'bg-gradient-to-b from-emerald-50/80 to-white dark:from-emerald-950/40 dark:to-slate-900'
                                        : 'bg-white dark:bg-slate-800/60',
                                )}
                            >
                                {/* Step badge */}
                                <span className={cn(
                                    'text-[9px] font-black uppercase tracking-[0.18em] px-2 py-0.5 rounded-full',
                                    s.badge,
                                )}>
                                    Step {step.id}
                                </span>

                                {/* Icon circle */}
                                <div className={cn(
                                    'w-14 h-14 rounded-2xl flex items-center justify-center',
                                    s.iconBg,
                                    step.accent === 'emerald' && 'ring-2 ring-emerald-400/30',
                                )}>
                                    {step.accent === 'emerald' ? (
                                        <motion.div
                                            animate={{ scale: [1, 1.08, 1] }}
                                            transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
                                        >
                                            <Icon size={26} className={s.iconColor} />
                                        </motion.div>
                                    ) : (
                                        <Icon size={26} className={s.iconColor} />
                                    )}
                                </div>

                                {/* Text */}
                                <div className="text-center">
                                    <p className={cn('text-sm font-extrabold leading-tight', s.labelColor)}>
                                        {step.label}
                                    </p>
                                    <p className={cn('text-[11px] mt-1 leading-snug', s.sublabelColor)}>
                                        {step.sublabel}
                                    </p>
                                </div>

                                {/* Emerald success pulse */}
                                {step.accent === 'emerald' && (
                                    <div className="flex items-center gap-1.5">
                                        <motion.div
                                            animate={{ scale: [1, 1.5, 1], opacity: [1, 0.4, 1] }}
                                            transition={{ repeat: Infinity, duration: 1.8 }}
                                            className="w-2 h-2 rounded-full bg-emerald-500"
                                        />
                                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                                            Live
                                        </span>
                                    </div>
                                )}
                            </motion.div>

                            {/* ── Animated connector — hidden after last step ── */}
                            {!isLast && (
                                <div className="flex md:flex-row flex-col items-center justify-center flex-shrink-0">
                                    {/* Desktop: horizontal SVG arrow */}
                                    <div className="hidden md:block w-10">
                                        <svg width="40" height="24" viewBox="0 0 40 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <line
                                                x1="2" y1="12" x2="34" y2="12"
                                                stroke={idx === FLOW_STEPS.length - 2 ? '#10b981' : '#94a3b8'}
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                className="dash-animated"
                                            />
                                            <polyline
                                                points="28,6 36,12 28,18"
                                                stroke={idx === FLOW_STEPS.length - 2 ? '#10b981' : '#94a3b8'}
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                fill="none"
                                            />
                                        </svg>
                                    </div>
                                    {/* Mobile: vertical SVG arrow */}
                                    <div className="md:hidden h-8 flex items-center">
                                        <svg width="24" height="32" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <line
                                                x1="12" y1="2" x2="12" y2="26"
                                                stroke={idx === FLOW_STEPS.length - 2 ? '#10b981' : '#94a3b8'}
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                className="dash-animated"
                                            />
                                            <polyline
                                                points="6,22 12,30 18,22"
                                                stroke={idx === FLOW_STEPS.length - 2 ? '#10b981' : '#94a3b8'}
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                fill="none"
                                            />
                                        </svg>
                                    </div>
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-blue-400/60" />
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">Security Gate</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">Access Granted</span>
                </div>
                <div className="flex items-center gap-2">
                    <svg width="20" height="6" viewBox="0 0 20 6" fill="none">
                        <line x1="0" y1="3" x2="20" y2="3" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4 3" strokeLinecap="round" />
                    </svg>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">Data flow</span>
                </div>
            </div>
        </div>
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

            {/* ── Animated flow diagram ── */}
            <CheckInFlowDiagram />

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

// ─── Financial Risk Matrix — three-pillar animated infographic ──────────────────────

const RISK_PILLARS = [
    {
        id: 'gold',
        medal: '🥇',
        label: 'Gold',
        share: '50',
        riskLabel: '100% Agent Risk',
        riskDesc: 'Agent bears full financial exposure',
        rewardLabel: '50% Reward',
        flowLabel: 'High Risk  →  High Reward',
        barColor: 'bg-amber-400',
        barGlow: 'shadow-amber-400/40',
        // Light mode
        cardBorder: 'border-amber-300',
        cardBg: 'bg-white',
        pctColor: 'text-amber-500',
        badgeBg: 'bg-amber-100 text-amber-700',
        riskBg: 'bg-amber-50 border-amber-200',
        riskText: 'text-amber-700',
        flowText: 'text-amber-600',
        // Dark mode
        darkCardBg: 'dark:bg-gradient-to-b dark:from-amber-950/60 dark:to-slate-900',
        darkBorder: 'dark:border-amber-600/40',
        darkPct: 'dark:text-amber-400',
        darkBadge: 'dark:bg-amber-500/20 dark:text-amber-300',
        darkRiskBg: 'dark:bg-amber-900/20 dark:border-amber-700/40',
        darkRiskText: 'dark:text-amber-300',
        darkFlow: 'dark:text-amber-400',
        barWidth: 'w-full',
        topAgent: true,
    },
    {
        id: 'silver',
        medal: '🥈',
        label: 'Silver',
        share: '30',
        riskLabel: 'Shared Risk',
        riskDesc: 'Risk split between agent & branch',
        rewardLabel: '30% Reward',
        flowLabel: 'Balanced Risk  →  Balanced Reward',
        barColor: 'bg-slate-400',
        barGlow: 'shadow-slate-400/30',
        cardBorder: 'border-slate-300',
        cardBg: 'bg-white',
        pctColor: 'text-slate-600',
        badgeBg: 'bg-slate-100 text-slate-600',
        riskBg: 'bg-slate-50 border-slate-200',
        riskText: 'text-slate-600',
        flowText: 'text-slate-500',
        darkCardBg: 'dark:bg-gradient-to-b dark:from-slate-800/80 dark:to-slate-900',
        darkBorder: 'dark:border-slate-600/50',
        darkPct: 'dark:text-slate-300',
        darkBadge: 'dark:bg-slate-500/20 dark:text-slate-300',
        darkRiskBg: 'dark:bg-slate-800/60 dark:border-slate-700/50',
        darkRiskText: 'dark:text-slate-300',
        darkFlow: 'dark:text-slate-400',
        barWidth: 'w-[60%]',
        topAgent: false,
    },
    {
        id: 'bronze',
        medal: '🥉',
        label: 'Bronze',
        share: '20',
        riskLabel: '100% Branch Risk',
        riskDesc: 'Branch absorbs all financial exposure',
        rewardLabel: '20% Reward',
        flowLabel: 'No Risk  →  Entry-Level Reward',
        barColor: 'bg-emerald-400',
        barGlow: 'shadow-emerald-400/30',
        cardBorder: 'border-emerald-300',
        cardBg: 'bg-white',
        pctColor: 'text-emerald-600',
        badgeBg: 'bg-emerald-100 text-emerald-700',
        riskBg: 'bg-emerald-50 border-emerald-200',
        riskText: 'text-emerald-700',
        flowText: 'text-emerald-600',
        darkCardBg: 'dark:bg-gradient-to-b dark:from-emerald-950/50 dark:to-slate-900',
        darkBorder: 'dark:border-emerald-600/40',
        darkPct: 'dark:text-emerald-400',
        darkBadge: 'dark:bg-emerald-500/20 dark:text-emerald-300',
        darkRiskBg: 'dark:bg-emerald-900/20 dark:border-emerald-700/40',
        darkRiskText: 'dark:text-emerald-300',
        darkFlow: 'dark:text-emerald-400',
        barWidth: 'w-[40%]',
        topAgent: false,
    },
];

function RiskMatrixDiagram() {
    return (
        <div className="my-10">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500 mb-5 text-center">
                Financial Risk Matrix · Commission Split Model
            </p>

            {/* Three pillars */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {RISK_PILLARS.map((p, idx) => (
                    <motion.div
                        key={p.id}
                        initial={{ opacity: 0, y: 32 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-40px' }}
                        transition={{ duration: 0.5, delay: idx * 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
                        className={cn(
                            'rounded-2xl border-2 overflow-hidden flex flex-col',
                            p.cardBg, p.cardBorder,
                            p.darkCardBg, p.darkBorder,
                            // Gold gets a subtle top shadow accent
                            p.id === 'gold' && 'shadow-lg shadow-amber-200/50 dark:shadow-amber-900/30',
                        )}
                    >
                        {/* ── Header strip ── */}
                        <div className={cn(
                            'px-5 pt-5 pb-4 flex items-center gap-3',
                        )}>
                            <span className="text-2xl leading-none">{p.medal}</span>
                            <div>
                                <p className={cn(
                                    'text-xs font-black uppercase tracking-[0.18em]',
                                    p.badgeBg, p.darkBadge,
                                    'px-2 py-0.5 rounded-full inline-block',
                                )}>
                                    {p.label} Tier
                                </p>
                                {p.topAgent && (
                                    <p className="text-[9px] text-amber-500 dark:text-amber-400 font-bold uppercase tracking-widest mt-0.5">
                                        Top Performers
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* ── Giant percentage ── */}
                        <div className="px-5 pb-2 flex items-end gap-1">
                            <motion.span
                                initial={{ opacity: 0, scale: 0.7 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.45, delay: idx * 0.15 + 0.2, ease: 'backOut' }}
                                className={cn(
                                    'text-7xl font-black leading-none tracking-tighter tabular-nums',
                                    p.pctColor, p.darkPct,
                                )}
                            >
                                {p.share}
                            </motion.span>
                            <span className={cn('text-2xl font-black mb-2', p.pctColor, p.darkPct)}>%</span>
                        </div>
                        <p className="px-5 text-[11px] text-slate-500 dark:text-slate-400 font-semibold pb-3">
                            of Agent's Closed Revenue
                        </p>

                        {/* ── Animated bar ── */}
                        <div className="px-5 pb-4">
                            <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                <motion.div
                                    initial={{ width: '0%' }}
                                    whileInView={{ width: p.id === 'gold' ? '100%' : p.id === 'silver' ? '60%' : '40%' }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.7, delay: idx * 0.15 + 0.3, ease: 'easeOut' }}
                                    className={cn('h-full rounded-full shadow-lg', p.barColor, p.barGlow)}
                                />
                            </div>
                            {/* Bar label */}
                            <div className="flex justify-between mt-1">
                                <span className="text-[9px] text-slate-400 font-mono">0%</span>
                                <span className={cn('text-[9px] font-bold font-mono', p.pctColor, p.darkPct)}>{p.share}%</span>
                                <span className="text-[9px] text-slate-400 font-mono">100%</span>
                            </div>
                        </div>

                        {/* ── Risk → Reward mini-diagram ── */}
                        <div className={cn(
                            'mx-4 mb-4 rounded-xl border p-4 flex flex-col gap-2',
                            p.riskBg, p.riskText,
                            p.darkRiskBg, p.darkRiskText,
                        )}>
                            {/* Risk box */}
                            <div className="flex items-center justify-between">
                                <div className="text-left">
                                    <p className="text-[9px] font-black uppercase tracking-widest opacity-60">Risk</p>
                                    <p className="text-xs font-bold leading-tight">{p.riskLabel}</p>
                                </div>
                                {/* Arrow */}
                                <svg width="28" height="12" viewBox="0 0 28 12" fill="none" className="flex-shrink-0 mx-1">
                                    <line x1="2" y1="6" x2="22" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="3 3" className="opacity-50" />
                                    <polyline points="17,2 24,6 17,10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                                </svg>
                                {/* Reward */}
                                <div className="text-right">
                                    <p className="text-[9px] font-black uppercase tracking-widest opacity-60">Reward</p>
                                    <p className="text-xs font-extrabold leading-tight">{p.rewardLabel}</p>
                                </div>
                            </div>
                            {/* Flow label */}
                            <p className={cn(
                                'text-[10px] font-semibold text-center border-t pt-2 opacity-80',
                                p.id === 'gold' ? 'border-amber-200 dark:border-amber-800/50' :
                                    p.id === 'silver' ? 'border-slate-200 dark:border-slate-700/50' :
                                        'border-emerald-200 dark:border-emerald-800/50',
                            )}>
                                {p.flowLabel}
                            </p>
                        </div>

                        {/* ── Bottom description ── */}
                        <p className="px-5 pb-5 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                            {p.riskDesc}
                        </p>
                    </motion.div>
                ))}
            </div>

            {/* Bottom rule */}
            <div className="mt-6 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 flex items-start gap-3">
                <span className="text-base flex-shrink-0">⚖️</span>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    <strong className="text-slate-800 dark:text-slate-200">Risk Principle:</strong>{' '}
                    The higher the financial risk an agent accepts, the greater their share of the upside. Bronze agents are fully protected by the branch — ideal for onboarding new talent without financial friction.
                </p>
            </div>
        </div>
    );
}

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

            {/* ── Financial Risk Matrix infographic ── */}
            <RiskMatrixDiagram />

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

// ─── Section 4: Enterprise Security & Privacy ───────────────────────────────────

const RLS_LAYERS = [
    {
        id: 'executive',
        role: 'Executive',
        icon: Building2,
        label: 'Full P&L Visibility',
        desc: 'Sees all branches, all events, all agent settlements — real-time gross profit and net ROI.',
        access: ['All Events', 'All Agents', 'All P&L', 'All Branches'],
        // Light mode
        border: 'border-blue-200',
        bg: 'bg-blue-50',
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-700',
        badgeBg: 'bg-blue-100 text-blue-700',
        tagBg: 'bg-blue-100/80 text-blue-700',
        // Dark mode
        darkBorder: 'dark:border-blue-500/30',
        darkBg: 'dark:bg-gradient-to-br dark:from-blue-950/60 dark:to-slate-900',
        darkIconBg: 'dark:bg-blue-500/20',
        darkIconColor: 'dark:text-blue-400',
        darkBadge: 'dark:bg-blue-500/20 dark:text-blue-300',
        darkTag: 'dark:bg-blue-500/10 dark:text-blue-400',
        lineColor: '#3b82f6',
        width: 'w-full',
    },
    {
        id: 'manager',
        role: 'Manager',
        icon: ShieldCheck,
        label: 'Branch-Level Visibility',
        desc: 'Sees all agents and events within their assigned branch. Cannot access other branches.',
        access: ['Branch Events', 'Branch Agents', 'Branch P&L'],
        border: 'border-emerald-200',
        bg: 'bg-emerald-50',
        iconBg: 'bg-emerald-100',
        iconColor: 'text-emerald-700',
        badgeBg: 'bg-emerald-100 text-emerald-700',
        tagBg: 'bg-emerald-100/80 text-emerald-700',
        darkBorder: 'dark:border-emerald-500/30',
        darkBg: 'dark:bg-gradient-to-br dark:from-emerald-950/50 dark:to-slate-900',
        darkIconBg: 'dark:bg-emerald-500/20',
        darkIconColor: 'dark:text-emerald-400',
        darkBadge: 'dark:bg-emerald-500/20 dark:text-emerald-300',
        darkTag: 'dark:bg-emerald-500/10 dark:text-emerald-400',
        lineColor: '#10b981',
        width: 'w-4/5',
    },
    {
        id: 'agent',
        role: 'Agent',
        icon: Users,
        label: 'Personal Leads Only',
        desc: 'Restricted to their own leads, their own QR pass, and their own settlement data. Zero cross-agent visibility.',
        access: ['Own Leads Only', 'Own QR Pass', 'Own Settlement'],
        border: 'border-slate-300',
        bg: 'bg-slate-50',
        iconBg: 'bg-slate-200',
        iconColor: 'text-slate-600',
        badgeBg: 'bg-slate-200 text-slate-600',
        tagBg: 'bg-slate-200/80 text-slate-600',
        darkBorder: 'dark:border-slate-600/40',
        darkBg: 'dark:bg-gradient-to-br dark:from-slate-800/80 dark:to-slate-900',
        darkIconBg: 'dark:bg-slate-700',
        darkIconColor: 'dark:text-slate-400',
        darkBadge: 'dark:bg-slate-700 dark:text-slate-300',
        darkTag: 'dark:bg-slate-700/60 dark:text-slate-400',
        lineColor: '#94a3b8',
        width: 'w-3/5',
    },
];

function RLSDiagram() {
    return (
        <div className="relative my-10 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden shadow-xl shadow-slate-900/5">

            {/* ── Giant background lock watermark ── */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
                <Lock
                    size={320}
                    className="text-violet-500 dark:text-violet-400 opacity-[0.03]"
                    strokeWidth={1.2}
                />
            </div>

            <div className="relative z-10 p-6 md:p-10 lg:p-14">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-violet-500 dark:text-violet-400 mb-2 text-center">
                    Row-Level Security Model
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 text-center mb-8">
                    Every Firestore read is filtered server-side — no client-side bypass possible
                </p>

                {/* Central database node */}
                <div className="flex justify-center mb-2">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        whileInView={{ scale: 1, opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4, ease: 'backOut' }}
                        className="flex flex-col items-center gap-2"
                    >
                        <div className="w-16 h-16 rounded-2xl bg-violet-100 dark:bg-violet-500/20 border-2 border-violet-300 dark:border-violet-500/50 flex items-center justify-center shadow-lg shadow-violet-500/10">
                            <Database size={28} className="text-violet-600 dark:text-violet-400" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-violet-600 dark:text-violet-400">
                            Firestore DB
                        </span>
                        <div className="flex items-center gap-1 bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 rounded-full px-2.5 py-0.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
                            <span className="text-[9px] font-bold text-violet-600 dark:text-violet-400">RLS Active</span>
                        </div>
                    </motion.div>
                </div>

                {/* SVG connector lines from DB to layers */}
                <div className="flex justify-center mb-4">
                    <svg width="320" height="56" viewBox="0 0 320 56" fill="none" className="overflow-visible">
                        {/* Centre trunk */}
                        <line x1="160" y1="0" x2="160" y2="24" stroke="#8b5cf6" strokeWidth="2" strokeDasharray="4 3" strokeLinecap="round" className="opacity-60" />
                        {/* Horizontal spread */}
                        <line x1="60" y1="24" x2="260" y2="24" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" className="opacity-40" />
                        {/* Left branch to Executive */}
                        <line x1="60" y1="24" x2="60" y2="56" stroke="#3b82f6" strokeWidth="2" strokeDasharray="4 3" strokeLinecap="round" className="opacity-70" />
                        {/* Centre branch to Manager */}
                        <line x1="160" y1="24" x2="160" y2="56" stroke="#10b981" strokeWidth="2" strokeDasharray="4 3" strokeLinecap="round" className="opacity-70" />
                        {/* Right branch to Agent */}
                        <line x1="260" y1="24" x2="260" y2="56" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4 3" strokeLinecap="round" className="opacity-70" />
                        {/* Arrowheads */}
                        <polyline points="55,50 60,56 65,50" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                        <polyline points="155,50 160,56 165,50" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                        <polyline points="255,50 260,56 265,50" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    </svg>
                </div>

                {/* Three role layer cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {RLS_LAYERS.map((layer, idx) => {
                        const Icon = layer.icon;
                        return (
                            <motion.div
                                key={layer.id}
                                initial={{ opacity: 0, y: 24 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: '-30px' }}
                                transition={{ duration: 0.45, delay: idx * 0.13, ease: [0.25, 0.46, 0.45, 0.94] }}
                                className={cn(
                                    'rounded-2xl border-2 overflow-hidden',
                                    layer.border, layer.bg,
                                    layer.darkBorder, layer.darkBg,
                                )}
                            >
                                {/* Header */}
                                <div className="px-4 pt-4 pb-3 flex items-center gap-3">
                                    <div className={cn(
                                        'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                                        layer.iconBg, layer.darkIconBg,
                                    )}>
                                        <Icon size={18} className={cn(layer.iconColor, layer.darkIconColor)} />
                                    </div>
                                    <div>
                                        <span className={cn(
                                            'text-[9px] font-black uppercase tracking-[0.18em] px-2 py-0.5 rounded-full',
                                            layer.badgeBg, layer.darkBadge,
                                        )}>
                                            {layer.role}
                                        </span>
                                        <p className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5 leading-tight">
                                            {layer.label}
                                        </p>
                                    </div>
                                </div>

                                {/* Access scope tags */}
                                <div className="px-4 pb-3 flex flex-wrap gap-1.5">
                                    {layer.access.map(tag => (
                                        <span
                                            key={tag}
                                            className={cn(
                                                'text-[9px] font-bold px-2 py-0.5 rounded-md',
                                                layer.tagBg, layer.darkTag,
                                            )}
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>

                                {/* Funnel width bar — represents data scope */}
                                <div className="px-4 pb-3">
                                    <div className="h-1.5 bg-white/50 dark:bg-slate-800/50 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: '0%' }}
                                            whileInView={{ width: layer.width.replace('w-full', '100%').replace('w-4/5', '80%').replace('w-3/5', '60%') }}
                                            viewport={{ once: true }}
                                            transition={{ duration: 0.7, delay: idx * 0.13 + 0.3 }}
                                            className="h-full rounded-full"
                                            style={{ backgroundColor: layer.lineColor, opacity: 0.7 }}
                                        />
                                    </div>
                                    <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1 font-mono">
                                        Data scope: {layer.id === 'executive' ? '100%' : layer.id === 'manager' ? '~80%' : '~20%'}
                                    </p>
                                </div>

                                {/* Description */}
                                <div className="px-4 pb-4">
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                        {layer.desc}
                                    </p>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {/* Bottom principle box */}
                <div className="mt-6 flex items-start gap-3 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-700/40 rounded-2xl px-4 py-4">
                    <Lock size={16} className="text-violet-500 dark:text-violet-400 flex-shrink-0 mt-0.5" />
                    <p className="text-[11px] text-violet-700 dark:text-violet-300 leading-relaxed">
                        <strong>Zero Trust Architecture:</strong>{' '}
                        Firestore Security Rules enforce role checks server-side on every read and write. No client code can bypass this — even if an agent modifies the frontend JS, the server rejects unauthorized queries at the database level.
                    </p>
                </div>
            </div>
        </div>
    );
}

function SecuritySection() {
    return (
        <section id="security" className="scroll-mt-6 pb-16 border-t border-slate-200 dark:border-slate-800/60 pt-12">
            <SectionHeader
                number={4}
                title="Enterprise Security & Privacy"
                subtitle="The PSI portal enforces strict Row-Level Security (RLS) rules. Every Firestore query is filtered server-side based on the authenticated user's role. Agents can never see each other's data."
                accent="violet"
            />

            <Callout type="warning">
                <strong>Zero-Override Policy:</strong> Access boundaries are enforced at the database layer via
                Firestore Security Rules. There is no admin UI switch to bypass them — a code deployment
                is required to change any access policy.
            </Callout>

            {/* RLS Funnel Diagram */}
            <RLSDiagram />

            {/* Feature grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mt-8">
                {[
                    {
                        icon: ShieldCheck,
                        title: 'JWT Authentication',
                        desc: 'Every session is authenticated via Firebase Auth. QR tokens are signed JWTs that expire after 24h — non-repudiable and tamper-proof.',
                        color: 'violet',
                    },
                    {
                        icon: Database,
                        title: 'Atomic Writes',
                        desc: 'All multi-document operations use Firestore writeBatch — either 100% succeeds or 100% fails. No partial state corruption possible.',
                        color: 'blue',
                    },
                    {
                        icon: Lock,
                        title: 'No Raw DB Access',
                        desc: 'Agents and managers never interact with Firestore directly. All queries are mediated through typed service layers.',
                        color: 'emerald',
                    },
                    {
                        icon: CheckCircle2,
                        title: 'Immutable Audit Trail',
                        desc: 'Every check-in, approval, and settlement write is timestamped server-side. Firestore timestamps cannot be overwritten by client code.',
                        color: 'amber',
                    },
                ].map((card, idx) => {
                    const Icon = card.icon;
                    const colorMap: Record<string, string> = {
                        violet: 'bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/20 text-violet-600 dark:text-violet-400',
                        blue: 'bg-blue-50   dark:bg-blue-500/10   border-blue-200   dark:border-blue-500/20   text-blue-600   dark:text-blue-400',
                        emerald: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400',
                        amber: 'bg-amber-50  dark:bg-amber-500/10  border-amber-200  dark:border-amber-500/20  text-amber-600  dark:text-amber-400',
                    };
                    return (
                        <motion.div
                            key={card.title}
                            initial={{ opacity: 0, y: 16 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.4, delay: idx * 0.1 }}
                            className="rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 p-5 flex gap-4"
                        >
                            <div className={cn('w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0', colorMap[card.color])}>
                                <Icon size={17} />
                            </div>
                            <div>
                                <p className="text-sm font-extrabold text-slate-900 dark:text-white">{card.title}</p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{card.desc}</p>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </section>
    );
}

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
                <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800/60 px-6 md:px-10 lg:px-16 py-8 lg:py-10">
                    <div className="max-w-7xl w-full">
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
                    <div className="max-w-7xl w-full">
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
                                <SecuritySection />
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </main>
            </div>
        </div>
    );
}
