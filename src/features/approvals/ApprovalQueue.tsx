/**
 * ApprovalQueue.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Branch Manager Approval Queue with AI Roster Recommendation Engine.
 *
 * Features:
 *   • Mock agent queue for a selectable event/city context
 *   • AI badge per agent (STRONG_BUY / RISK / BLOCK / NEUTRAL)
 *   • "Sort by AI Recommendation" button — highest predicted earners first
 *   • Approve / Reject actions per agent row
 *   • Full dark: variant support
 */

import React, { useState, useMemo } from 'react';
import {
    UserCheck, UserX, BrainCircuit, ArrowUpDown,
    CheckCircle2, XCircle, Clock, ChevronDown,
    ChevronUp, Info, TrendingUp, MapPin,
    Sparkles, RotateCcw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
    getAgentRecommendation,
    sortByAiRecommendation,
    tierBadgeClasses,
    fmtAed,
    type RecommendationTier,
    type AgentRecommendation,
} from '../../utils/ai/rosterRecommendations';

// ── Mock pending agents ───────────────────────────────────────────────────────
// In production this would be an onSnapshot from events/{id}/attendees
// where status === 'pending_manager_approval'.

interface PendingAgent {
    id: string;
    name: string;
    email: string;
    branch: string;
    nationality: string;
    languages: string[];
    tier: 'Gold' | 'Silver' | 'Bronze';
    tierPct: number;
    visaUploaded: boolean;
    flightBooked: boolean;
    assessmentPct: number;
    appliedAt: string; // ISO date string
}

const PENDING_AGENTS: PendingAgent[] = [
    {
        id: 'usr_sara_almarzouqi_dxb',
        name: 'Sara Al Marzouqi',
        email: 'sara.almarzouqi@psi.ae',
        branch: 'Dubai Marina',
        nationality: 'Emirati',
        languages: ['Arabic', 'English'],
        tier: 'Gold',
        tierPct: 0.50,
        visaUploaded: true,
        flightBooked: true,
        assessmentPct: 92,
        appliedAt: '2026-02-20T08:30:00Z',
    },
    {
        id: 'usr_khalid_mansouri_auh',
        name: 'Khalid Mansouri',
        email: 'khalid.mansouri@psi.ae',
        branch: 'Abu Dhabi Main',
        nationality: 'Emirati',
        languages: ['Arabic', 'English'],
        tier: 'Silver',
        tierPct: 0.30,
        visaUploaded: false,
        flightBooked: false,
        assessmentPct: 71,
        appliedAt: '2026-02-21T10:15:00Z',
    },
    {
        id: 'usr_demo_no_show_agent',
        name: 'Rami Haddad',
        email: 'rami.haddad@psi.ae',
        branch: 'Sharjah',
        nationality: 'Jordanian',
        languages: ['Arabic', 'English', 'French'],
        tier: 'Bronze',
        tierPct: 0.20,
        visaUploaded: true,
        flightBooked: false,
        assessmentPct: 58,
        appliedAt: '2026-02-22T14:00:00Z',
    },
    {
        id: 'usr_mohammed_qubaisi_mgr',
        name: 'Mohammed Al Qubaisi',
        email: 'm.qubaisi@psi.ae',
        branch: 'Abu Dhabi Main',
        nationality: 'Emirati',
        languages: ['Arabic', 'English'],
        tier: 'Gold',
        tierPct: 0.50,
        visaUploaded: true,
        flightBooked: true,
        assessmentPct: 88,
        appliedAt: '2026-02-23T09:00:00Z',
    },
];

// ── Event city selector (mock) ────────────────────────────────────────────────

const EVENT_OPTIONS = [
    { id: 'evt_london_luxury_expo_oct2026', label: 'London Luxury Property Show', city: 'London' },
    { id: 'evt_cairo_invest_nov2026', label: 'Cairo Investor Summit', city: 'Cairo' },
    { id: 'evt_dubai_global_jan2027', label: 'Dubai Global Expo', city: 'Dubai' },
];

// ── Compliance pill ───────────────────────────────────────────────────────────

function CompliancePill({ ok, label }: { ok: boolean; label: string }) {
    return (
        <span className={`
            flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider
            ${ok ? 'badge-success' : 'badge-error'}
        `}>
            {ok ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
            {label}
        </span>
    );
}

// ── AI badge ──────────────────────────────────────────────────────────────────

function AiBadge({
    recommendation,
    expanded,
    onToggle,
}: {
    recommendation: AgentRecommendation;
    expanded: boolean;
    onToggle: () => void;
}) {
    const style = tierBadgeClasses(recommendation.tier);

    const icon: Record<RecommendationTier, React.ReactNode> = {
        STRONG_BUY: <TrendingUp size={12} />,
        RISK: <Info size={12} />,
        BLOCK: <XCircle size={12} />,
        NEUTRAL: <Clock size={12} />,
    };

    return (
        <div className="flex flex-col items-end gap-1">
            <button
                onClick={onToggle}
                className={`
                    flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold
                    cursor-pointer select-none transition-all duration-150 active:scale-[0.97]
                    ${style.bg} ${style.text} ${style.border}
                `}
            >
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${style.dot}`} />
                {icon[recommendation.tier]}
                {recommendation.headline}
                {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            </button>

            {/* Predicted AED (only show if non-zero) */}
            {recommendation.predictedAed > 0 && (
                <span className="text-[10px] text-psi-secondary font-mono">
                    Est. {fmtAed(recommendation.predictedAed)}
                </span>
            )}
        </div>
    );
}

// ── Agent row ─────────────────────────────────────────────────────────────────

type ApprovalAction = 'approved' | 'rejected' | 'pending';

function AgentRow({
    agent,
    city,
    index,
    action,
    onAction,
}: {
    agent: PendingAgent;
    city: string;
    index: number;
    action: ApprovalAction;
    onAction: (id: string, action: 'approved' | 'rejected') => void;
}) {
    const [badgeExpanded, setBadgeExpanded] = useState(false);
    const rec = useMemo(
        () => getAgentRecommendation(agent.id, city, agent.tierPct),
        [agent.id, city, agent.tierPct]
    );

    const tierColor: Record<string, string> = {
        Gold: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20',
        Silver: 'text-psi-secondary bg-slate-100/40',
        Bronze: 'text-amber-800 bg-amber-50/80 dark:bg-amber-900/10',
    };

    const isBlocked = rec.tier === 'BLOCK';

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.07 }}
            className={`
                psi-card rounded-2xl overflow-hidden
                transition-all duration-200
                ${action === 'approved' ? 'border-emerald-300 dark:border-emerald-700/50' :
                    action === 'rejected' ? 'border-rose-300 dark:border-rose-700/50' : ''}
            `}
        >
            {/* Main row */}
            <div className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">

                    {/* Avatar + identity */}
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                        {/* Rank badge */}
                        <div className="w-8 h-8 flex-shrink-0 rounded-full bg-psi-subtle border border-psi flex items-center justify-center text-xs font-extrabold text-psi-secondary">
                            {index + 1}
                        </div>

                        {/* Avatar */}
                        <div className="w-11 h-11 flex-shrink-0 rounded-xl bg-gradient-to-br from-slate-700 to-white dark:to-slate-900 flex items-center justify-center text-psi-primary font-bold text-sm">
                            {agent.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}
                        </div>

                        <div className="min-w-0">
                            {/* Name + AI badge */}
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                <span className="font-extrabold text-psi-primary">
                                    {agent.name}
                                </span>
                                <AiBadge
                                    recommendation={rec}
                                    expanded={badgeExpanded}
                                    onToggle={() => setBadgeExpanded(v => !v)}
                                />
                            </div>

                            {/* Meta */}
                            <p className="text-xs text-psi-muted">
                                {agent.email} · {agent.branch}
                            </p>

                            {/* Languages + tier */}
                            <div className="flex flex-wrap gap-1.5 mt-2">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${tierColor[agent.tier]}`}>
                                    {agent.tier} {Math.round(agent.tierPct * 100)}%
                                </span>
                                {agent.languages.map(l => (
                                    <span key={l} className="px-2 py-0.5 bg-psi-subtle border border-psi text-psi-secondary rounded-full text-[10px] font-bold uppercase">
                                        {l}
                                    </span>
                                ))}
                            </div>

                            {/* Compliance */}
                            <div className="flex flex-wrap gap-1.5 mt-2">
                                <CompliancePill ok={agent.visaUploaded} label="Visa" />
                                <CompliancePill ok={agent.flightBooked} label="Flight" />
                                <CompliancePill ok={agent.assessmentPct >= 80} label={`Assessment ${agent.assessmentPct}%`} />
                            </div>
                        </div>
                    </div>

                    {/* Action buttons / status */}
                    <div className="flex items-center gap-2 self-center sm:self-start sm:mt-1">
                        {action === 'pending' ? (
                            <>
                                <button
                                    id={`approve-btn-${agent.id}`}
                                    disabled={isBlocked}
                                    onClick={() => onAction(agent.id, 'approved')}
                                    className={`
                                        flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold
                                        transition-all active:scale-[0.97] select-none
                                        ${isBlocked
                                            ? 'bg-psi-subtle border border-psi text-psi-muted cursor-not-allowed'
                                            : 'btn-accent shadow-sm'
                                        }
                                    `}
                                    title={isBlocked ? 'Cannot approve — penalty on record' : 'Approve agent'}
                                >
                                    <UserCheck size={14} />
                                    Approve
                                </button>
                                <button
                                    id={`reject-btn-${agent.id}`}
                                    onClick={() => onAction(agent.id, 'rejected')}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-psi-subtle border border-psi text-psi-secondary hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-600 dark:hover:text-rose-400 transition-all active:scale-[0.97] select-none"
                                >
                                    <UserX size={14} />
                                    Reject
                                </button>
                            </>
                        ) : (
                            <span className={`
                                flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold
                                ${action === 'approved'
                                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                                    : 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-300'
                                }
                            `}>
                                {action === 'approved'
                                    ? <><CheckCircle2 size={14} /> Approved</>
                                    : <><XCircle size={14} /> Rejected</>
                                }
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* AI rationale expand panel */}
            <AnimatePresence>
                {badgeExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="overflow-hidden"
                    >
                        <div className={`
                            px-5 py-4 border-t
                            ${tierBadgeClasses(rec.tier).bg}
                            ${tierBadgeClasses(rec.tier).border}
                            border-t-current
                        `}>
                            <div className="flex items-start gap-2.5">
                                <BrainCircuit size={16} className={`flex-shrink-0 mt-0.5 ${tierBadgeClasses(rec.tier).text}`} />
                                <div>
                                    <p className={`text-xs font-bold mb-1 ${tierBadgeClasses(rec.tier).text}`}>
                                        AI System Recommendation
                                    </p>
                                    <p className="text-xs text-psi-secondary leading-relaxed">
                                        {rec.rationale}
                                    </p>
                                    {rec.predictedAed > 0 && (
                                        <div className="mt-2 flex items-center gap-4">
                                            <div>
                                                <p className="text-[10px] font-bold text-psi-secondary uppercase tracking-widest">Predicted Net</p>
                                                <p className={`text-sm font-extrabold ${tierBadgeClasses(rec.tier).text}`}>
                                                    {fmtAed(rec.predictedAed)}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-psi-secondary uppercase tracking-widest">Conv. Rate</p>
                                                <p className={`text-sm font-extrabold ${tierBadgeClasses(rec.tier).text}`}>
                                                    {(rec.conversionRate * 100).toFixed(1)}%
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// ── Legend ────────────────────────────────────────────────────────────────────

function Legend() {
    const items: { tier: RecommendationTier; label: string; desc: string }[] = [
        { tier: 'STRONG_BUY', label: 'Strong Buy', desc: 'Proven performer in this market' },
        { tier: 'RISK', label: 'New Market', desc: 'No conversion history for this city' },
        { tier: 'BLOCK', label: 'Block', desc: 'No-show or penalty on record' },
    ];
    return (
        <div className="psi-card rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
                <BrainCircuit size={15} className="text-psi-muted" />
                <p className="text-xs font-bold text-psi-secondary uppercase tracking-widest">AI Badge Legend</p>
            </div>
            <div className="space-y-2">
                {items.map(({ tier, label, desc }) => {
                    const style = tierBadgeClasses(tier);
                    return (
                        <div key={tier} className="flex items-start gap-2.5">
                            <div className={`flex-shrink-0 mt-0.5 w-2 h-2 rounded-full ${style.dot}`} />
                            <div>
                                <p className={`text-[11px] font-bold ${style.text}`}>{label}</p>
                                <p className="text-[10px] text-psi-muted">{desc}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ── Main component ────────────────────────────────────────────────────────────

type SortMode = 'applied' | 'ai';

export default function ApprovalQueue() {
    const [selectedEvent, setSelectedEvent] = useState(EVENT_OPTIONS[0]);
    const [sortMode, setSortMode] = useState<SortMode>('applied');
    const [actions, setActions] = useState<Record<string, ApprovalAction>>({});
    const [showEventDrop, setShowEventDrop] = useState(false);

    function handleAction(agentId: string, action: 'approved' | 'rejected') {
        setActions(prev => ({ ...prev, [agentId]: action }));
    }

    function resetAll() {
        setActions({});
    }

    // Sort agents
    const sortedAgents = useMemo(() => {
        if (sortMode === 'ai') {
            return sortByAiRecommendation(PENDING_AGENTS, selectedEvent.city);
        }
        // Default: by applied date
        return [...PENDING_AGENTS].sort(
            (a, b) => new Date(a.appliedAt).getTime() - new Date(b.appliedAt).getTime()
        );
    }, [sortMode, selectedEvent.city]);

    const pendingCount = PENDING_AGENTS.length - Object.keys(actions).length;
    const approvedCount = Object.values(actions).filter(a => a === 'approved').length;
    const rejectedCount = Object.values(actions).filter(a => a === 'rejected').length;

    return (
        <div className="min-h-screen bg-psi-page p-4 md:p-6 lg:p-8">
            <div className="max-w-5xl mx-auto">

                {/* Page header */}
                <header className="mb-8">
                    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <BrainCircuit size={22} className="text-emerald-500" />
                                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-psi-primary">
                                    Approval Queue
                                </h1>
                            </div>
                            <p className="text-psi-secondary text-sm">
                                AI-powered roster recommendations for Branch Managers.
                            </p>
                        </div>

                        {/* Event selector */}
                        <div className="relative">
                            <button
                                id="event-selector-btn"
                                onClick={() => setShowEventDrop(v => !v)}
                                className="psi-card flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-psi-primary hover:bg-psi-subtle transition-all shadow-sm select-none"
                            >
                                <MapPin size={14} className="text-psi-action" />
                                {selectedEvent.label}
                                <ChevronDown size={14} className="text-psi-muted" />
                            </button>
                            <AnimatePresence>
                                {showEventDrop && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -8 }}
                                        className="absolute right-0 mt-2 w-64 psi-card rounded-2xl shadow-xl z-50 overflow-hidden"
                                    >
                                        {EVENT_OPTIONS.map(ev => (
                                            <button
                                                key={ev.id}
                                                onClick={() => { setSelectedEvent(ev); setShowEventDrop(false); setSortMode('applied'); setActions({}); }}
                                                className={`w-full text-left px-4 py-3 text-sm transition-colors border-b border-psi last:border-0 ${ev.id === selectedEvent.id
                                                    ? 'bg-psi-action-subtle text-psi-action font-bold'
                                                    : 'text-psi-primary hover:bg-psi-subtle'
                                                    }`}
                                            >
                                                <p className="font-bold">{ev.label}</p>
                                                <p className="text-[11px] text-psi-secondary mt-0.5">
                                                    <MapPin size={10} className="inline mr-0.5" />{ev.city}
                                                </p>
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

                    {/* ── Left sidebar ── */}
                    <div className="space-y-4">

                        {/* Stats */}
                        <div className="grid grid-cols-3 lg:grid-cols-1 gap-3">
                            {[
                                { label: 'Pending', value: pendingCount, color: 'text-amber-500' },
                                { label: 'Approved', value: approvedCount, color: 'text-psi-success' },
                                { label: 'Rejected', value: rejectedCount, color: 'text-psi-error' },
                            ].map(({ label, value, color }) => (
                                <div key={label} className="psi-card rounded-2xl p-4">
                                    <p className="text-[10px] font-bold text-psi-muted uppercase tracking-widest">{label}</p>
                                    <p className={`text-3xl font-extrabold ${color}`}>{value}</p>
                                </div>
                            ))}
                        </div>

                        {/* Sort button */}
                        <div className="psi-card rounded-2xl p-4 space-y-2">
                            <p className="text-[10px] font-bold text-psi-muted uppercase tracking-widest mb-2">Sort Order</p>
                            <button
                                id="sort-by-ai-btn"
                                onClick={() => setSortMode('ai')}
                                className={`
                                    w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold
                                    transition-all select-none active:scale-[0.97]
                                    ${sortMode === 'ai'
                                        ? 'btn-accent shadow-sm'
                                        : 'bg-psi-subtle text-psi-secondary hover:bg-psi-raised'
                                    }
                                `}
                            >
                                <Sparkles size={13} />
                                Sort by AI Recommendation
                            </button>
                            <button
                                id="sort-by-date-btn"
                                onClick={() => setSortMode('applied')}
                                className={`
                                    w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold
                                    transition-all select-none active:scale-[0.97]
                                    ${sortMode === 'applied'
                                        ? 'psi-card border-psi-action text-psi-action'
                                        : 'bg-psi-subtle text-psi-secondary hover:bg-psi-raised'
                                    }
                                `}
                            >
                                <ArrowUpDown size={13} />
                                Sort by Applied Date
                            </button>
                            {Object.keys(actions).length > 0 && (
                                <button
                                    onClick={resetAll}
                                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-psi-secondary hover:text-rose-500 transition-colors select-none"
                                >
                                    <RotateCcw size={12} />
                                    Reset All Actions
                                </button>
                            )}
                        </div>

                        {/* AI legend */}
                        <Legend />

                        {/* Event context card */}
                        <div className="psi-card rounded-2xl p-4">
                            <p className="text-[10px] font-bold text-psi-muted uppercase tracking-widest mb-1">Context</p>
                            <p className="font-extrabold text-psi-primary text-sm">{selectedEvent.label}</p>
                            <div className="flex items-center gap-1 mt-1">
                                <MapPin size={11} className="text-psi-action" />
                                <p className="text-xs text-psi-secondary">{selectedEvent.city}</p>
                            </div>
                            <div className="mt-3 text-[10px] text-psi-muted leading-relaxed">
                                AI recommendations are calculated using historical conversion data for the {selectedEvent.city} market across all PSI agents on record.
                            </div>
                        </div>
                    </div>

                    {/* ── Agent list ── */}
                    <div className="lg:col-span-3 space-y-3">

                        {/* Sort mode indicator */}
                        <div className={`
                            flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold
                            ${sortMode === 'ai'
                                ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700/50'
                                : 'bg-psi-subtle/60 text-psi-secondary'
                            }
                        `}>
                            {sortMode === 'ai' ? (
                                <><Sparkles size={13} /> Sorted by AI Recommendation — highest predicted earners first</>
                            ) : (
                                <><Clock size={13} /> Sorted by application date</>
                            )}
                        </div>

                        {/* Agent rows */}
                        <AnimatePresence mode="popLayout">
                            {sortedAgents.map((agent, idx) => (
                                <AgentRow
                                    key={agent.id}
                                    agent={agent}
                                    city={selectedEvent.city}
                                    index={idx}
                                    action={actions[agent.id] ?? 'pending'}
                                    onAction={handleAction}
                                />
                            ))}
                        </AnimatePresence>

                        {/* All actioned */}
                        {pendingCount === 0 && PENDING_AGENTS.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="py-16 text-center psi-card rounded-2xl"
                            >
                                <CheckCircle2 size={36} className="mx-auto text-psi-success mb-3" />
                                <p className="font-extrabold text-psi-primary">Queue cleared</p>
                                <p className="text-psi-muted text-sm mt-1">
                                    All {PENDING_AGENTS.length} agents have been actioned.
                                </p>
                                <button onClick={resetAll} className="mt-4 text-xs font-bold text-psi-muted hover:text-psi-primary flex items-center gap-1.5 mx-auto transition-colors">
                                    <RotateCcw size={12} /> Reset queue
                                </button>
                            </motion.div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
