/**
 * SmartAgendaBuilder.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Personalized Event Agenda Builder
 * Route: /agenda
 *
 * Three-step flow:
 *  Step 1 — Interest Picker   (select up to 8 topic tags)
 *  Step 2 — Recommended      (AI-scored session recommendations)
 *  Step 3 — My Agenda        (chronological personal schedule view)
 *
 * At any time an "All Sessions" catalog is accessible via tab.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    Sparkles, Calendar, CheckCircle2, Clock, MapPin,
    Users, Star, Plus, Minus, AlertTriangle, BookOpen,
    Search, Filter, ChevronRight, RefreshCw, Download,
    Zap, Tag, Info, X, Layout,
} from 'lucide-react';
import { toast } from 'sonner';
import {
    ALL_TOPICS, ALL_SESSIONS,
    buildSuggestedAgenda, scoreAllSessions, conflictsWithAgenda, groupByTimeSlot,
    TYPE_COLORS,
    type AgendaSession, type ScoredSession, type SessionType,
} from './agendaEngine';

// ── Utility ───────────────────────────────────────────────────────────────────

function cn(...cs: (string | boolean | undefined)[]) {
    return cs.filter(Boolean).join(' ');
}

function pct(a: number, b: number) {
    return b === 0 ? 0 : Math.round((a / b) * 100);
}

function durationMins(s: AgendaSession): number {
    const [sh, sm] = s.startTime.split(':').map(Number);
    const [eh, em] = s.endTime.split(':').map(Number);
    return (eh * 60 + em) - (sh * 60 + sm);
}

// ── Score badge ───────────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
    const color =
        score >= 80 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
            score >= 55 ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                'bg-psi-border text-psi-secondary border-slate-600';
    const label =
        score >= 80 ? 'Top Pick' :
            score >= 55 ? 'Recommended' : 'Discover';
    return (
        <span className={cn('inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full border', color)}>
            <Sparkles size={8} /> {label} {score}%
        </span>
    );
}

// ── Session card (Recommendations + All Sessions) ────────────────────────────

function SessionCard({
    session, inAgenda, hasConflict, onAdd, onRemove, interests,
}: {
    session: ScoredSession;
    inAgenda: boolean;
    hasConflict: boolean;
    onAdd: (s: AgendaSession) => void;
    onRemove: (id: string) => void;
    interests: string[];
}) {
    const [expanded, setExpanded] = useState(false);
    const typeStyle = TYPE_COLORS[session.type];
    const fill = pct(session.registered, session.capacity);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                'bg-psi-surface border rounded-2xl overflow-hidden transition-colors',
                inAgenda ? 'border-emerald-700/50' : hasConflict ? 'border-amber-700/40' : 'border-psi hover:border-psi-strong'
            )}
        >
            {/* Top colour bar */}
            <div className={cn('h-1', session.color)} />

            <div className="p-5">
                {/* Header row */}
                <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap gap-1.5 mb-2">
                            <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border', typeStyle.bg, typeStyle.text, typeStyle.border)}>
                                {session.type}
                            </span>
                            {interests.length > 0 && <ScoreBadge score={session.relevanceScore} />}
                            {session.level !== 'All' && (
                                <span className="text-[10px] font-medium text-psi-secondary border border-psi-strong px-2 py-0.5 rounded-full">{session.level}</span>
                            )}
                        </div>
                        <h3 className="text-psi-primary font-bold text-sm leading-snug">{session.name}</h3>
                        <p className="text-psi-secondary text-xs mt-0.5">{session.speaker} · {session.organization}</p>
                    </div>
                </div>

                {/* Meta row */}
                <div className="flex flex-wrap gap-3 mb-3">
                    <span className="flex items-center gap-1 text-psi-secondary text-xs"><Clock size={11} />{session.startTime}–{session.endTime} ({durationMins(session)} min)</span>
                    <span className="flex items-center gap-1 text-psi-secondary text-xs"><MapPin size={11} />{session.room}</span>
                    <span className="flex items-center gap-1 text-xs">
                        <Users size={11} className={fill >= 95 ? 'text-red-400' : 'text-psi-secondary'} />
                        <span className={fill >= 95 ? 'text-red-400 font-bold' : 'text-psi-secondary'}>{session.registered}/{session.capacity}</span>
                    </span>
                </div>

                {/* Capacity bar */}
                <div className="w-full bg-psi-subtle rounded-full h-1.5 mb-3">
                    <div
                        className={cn('h-1.5 rounded-full transition-all', fill >= 95 ? 'bg-red-500' : fill >= 80 ? 'bg-amber-500' : 'bg-emerald-500')}
                        style={{ width: `${fill}%` }}
                    />
                </div>

                {/* Matched topics */}
                {session.matchedTopics.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                        {session.matchedTopics.map(t => {
                            const topic = ALL_TOPICS.find(x => x.id === t);
                            return (
                                <span key={t} className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">
                                    {topic?.emoji} {topic?.label ?? t}
                                </span>
                            );
                        })}
                    </div>
                )}

                {/* Warning if conflict */}
                {hasConflict && !inAgenda && (
                    <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2 mb-3">
                        <AlertTriangle size={12} className="text-amber-400 flex-shrink-0" />
                        <p className="text-amber-300 text-[11px]">Time conflict with your agenda</p>
                    </div>
                )}

                {/* Expandable description */}
                {expanded && (
                    <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="text-psi-secondary text-xs leading-relaxed mb-3 bg-psi-subtle/60 rounded-xl p-3"
                    >
                        {session.description}
                    </motion.p>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                    {inAgenda ? (
                        <button
                            onClick={() => onRemove(session.id)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-600/20 border border-emerald-600/40 text-emerald-400 text-sm font-semibold hover:bg-red-600/20 hover:border-red-600/40 hover:text-red-400 transition-colors group"
                        >
                            <CheckCircle2 size={14} className="group-hover:hidden" />
                            <Minus size={14} className="hidden group-hover:block" />
                            <span className="group-hover:hidden">In My Agenda</span>
                            <span className="hidden group-hover:block">Remove</span>
                        </button>
                    ) : (
                        <button
                            onClick={() => { if (!hasConflict) { onAdd(session); } else toast.error('Time conflict — remove a conflicting session first'); }}
                            className={cn(
                                'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-colors',
                                hasConflict
                                    ? 'bg-amber-500/10 border border-amber-500/20 text-amber-500/60 cursor-not-allowed'
                                    : 'bg-psi-subtle border border-psi-strong text-psi-secondary hover:bg-emerald-600 hover:border-emerald-600 hover:text-white'
                            )}
                        >
                            <Plus size={14} /> Add to Agenda
                        </button>
                    )}
                    <button
                        onClick={() => setExpanded(e => !e)}
                        className="px-4 py-2.5 rounded-xl bg-psi-subtle border border-psi-strong text-psi-secondary hover:text-psi-primary transition-colors"
                        title="View description"
                    >
                        <Info size={14} />
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

// ── Agenda timeline card ──────────────────────────────────────────────────────

function AgendaTimelineCard({ session, onRemove }: { session: AgendaSession; onRemove: (id: string) => void }) {
    const typeStyle = TYPE_COLORS[session.type];
    const fill = pct(session.registered, session.capacity);

    return (
        <div className={cn(
            'relative border-l-4 pl-5 py-1',
            session.color.replace('bg-', 'border-')
        )}>
            <div className="bg-psi-surface border border-psi rounded-xl p-4 hover:border-psi-strong transition-colors">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap gap-1.5 mb-1.5">
                            <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border', typeStyle.bg, typeStyle.text, typeStyle.border)}>
                                {session.type}
                            </span>
                        </div>
                        <h3 className="text-psi-primary font-bold text-sm">{session.name}</h3>
                        <p className="text-psi-secondary text-xs mt-0.5">{session.speaker}</p>
                        <div className="flex flex-wrap gap-3 mt-2">
                            <span className="flex items-center gap-1 text-psi-secondary text-xs"><MapPin size={10} />{session.room}</span>
                            <span className="flex items-center gap-1 text-psi-secondary text-xs"><Clock size={10} />{durationMins(session)} min</span>
                            <span className="flex items-center gap-1 text-xs">
                                <Users size={10} className={fill >= 95 ? 'text-red-400' : 'text-psi-secondary'} />
                                <span className={fill >= 95 ? 'text-red-400 text-xs' : 'text-psi-secondary text-xs'}>{fill}% full</span>
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={() => onRemove(session.id)}
                        className="p-2 rounded-xl bg-psi-subtle text-psi-secondary hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0"
                        title="Remove from agenda"
                    >
                        <X size={13} />
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Step 1: Interest picker ───────────────────────────────────────────────────

function InterestPicker({
    selected,
    onToggle,
    onBuild,
}: {
    selected: string[];
    onToggle: (id: string) => void;
    onBuild: () => void;
}) {
    return (
        <div className="max-w-2xl mx-auto py-8">
            <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
                    <Tag size={28} className="text-emerald-400" />
                </div>
                <h2 className="text-psi-primary font-black text-2xl mb-2">What are you here for?</h2>
                <p className="text-psi-secondary text-sm">
                    Pick the topics that matter most to you — we'll build a personalized schedule optimized around your goals.
                </p>
                <p className="text-slate-600 text-xs mt-1">Select 1–8 interests · {selected.length} selected</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
                {ALL_TOPICS.map(topic => {
                    const active = selected.includes(topic.id);
                    return (
                        <button
                            key={topic.id}
                            onClick={() => onToggle(topic.id)}
                            disabled={!active && selected.length >= 8}
                            className={cn(
                                'flex flex-col items-center gap-2 p-4 rounded-2xl border text-sm font-semibold transition-all',
                                active
                                    ? 'bg-emerald-600 border-emerald-500 text-psi-primary shadow-lg shadow-emerald-900/40'
                                    : 'bg-psi-surface border-psi text-psi-secondary hover:border-slate-600 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed'
                            )}
                        >
                            <span className="text-2xl">{topic.emoji}</span>
                            <span className="text-xs text-center leading-tight">{topic.label}</span>
                            {active && <CheckCircle2 size={14} className="text-emerald-200" />}
                        </button>
                    );
                })}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
                <button
                    onClick={onBuild}
                    disabled={selected.length === 0}
                    className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-psi-primary font-bold text-base transition-colors shadow-lg shadow-emerald-900/40"
                >
                    <Sparkles size={18} /> Build My Agenda
                </button>
                <button
                    onClick={onBuild}
                    className="px-6 py-3.5 rounded-2xl bg-psi-subtle border border-psi-strong text-psi-secondary font-semibold hover:bg-psi-subtle transition-colors text-sm"
                >
                    Skip → Browse All Sessions
                </button>
            </div>
        </div>
    );
}

// ── Main component ────────────────────────────────────────────────────────────

type View = 'pick' | 'recommended' | 'catalog' | 'agenda';

export default function SmartAgendaBuilder() {
    const [view, setView] = useState<View>('pick');
    const [interests, setInterests] = useState<string[]>([]);
    const [myAgenda, setMyAgenda] = useState<AgendaSession[]>([]);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState<SessionType | 'All'>('All');
    const [building, setBuilding] = useState(false);

    // Scored and greedy-built suggestions (recomputed when interests or agenda changes)
    const { suggested, allScored } = useMemo(() => {
        const scored = scoreAllSessions(interests);
        const { agenda: greedy } = buildSuggestedAgenda(interests);
        return { suggested: greedy, allScored: scored };
    }, [interests]);

    const toggleInterest = useCallback((id: string) => {
        setInterests(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id].slice(0, 8)
        );
    }, []);

    async function handleBuild() {
        setBuilding(true);
        // Simulate "AI thinking"
        await new Promise(r => setTimeout(r, 900));
        setMyAgenda(suggested);
        setBuilding(false);
        setView('recommended');
        toast.success(`Agenda generated! ${suggested.length} sessions matched your interests.`);
    }

    const addSession = useCallback((session: AgendaSession) => {
        if (conflictsWithAgenda(session, myAgenda)) {
            toast.error('Time conflict — please remove the conflicting session first');
            return;
        }
        setMyAgenda(prev => [...prev, session]);
        toast.success(`Added: ${session.name}`);
    }, [myAgenda]);

    const removeSession = useCallback((id: string) => {
        const s = myAgenda.find(x => x.id === id);
        setMyAgenda(prev => prev.filter(x => x.id !== id));
        if (s) toast.success(`Removed: ${s.name}`);
    }, [myAgenda]);

    const agendaIds = useMemo(() => new Set(myAgenda.map(s => s.id)), [myAgenda]);

    const filteredCatalog = useMemo(() => {
        const q = search.toLowerCase();
        return allScored.filter(s =>
            (typeFilter === 'All' || s.type === typeFilter) &&
            (!q || s.name.toLowerCase().includes(q) || s.speaker.toLowerCase().includes(q) || s.room.toLowerCase().includes(q))
        );
    }, [allScored, search, typeFilter]);

    const timelineGroups = useMemo(() => groupByTimeSlot(
        [...myAgenda].sort((a, b) => a.startTime.localeCompare(b.startTime))
    ), [myAgenda]);

    // Export agenda as PDF-ready text file
    function exportAgenda() {
        const lines = [
            'PSI EVENTS — MY PERSONAL AGENDA',
            '='.repeat(40),
            '',
            ...timelineGroups.flatMap(g => [
                `▸ ${g.slotKey}`,
                ...g.sessions.map(s => `  ${s.name} | ${s.room} | ${s.startTime}–${s.endTime}`),
                '',
            ]),
        ];
        const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'my-agenda.txt'; a.click();
        URL.revokeObjectURL(url);
        toast.success('Agenda exported!');
    }

    const SESSION_TYPES: (SessionType | 'All')[] = ['All', 'Keynote', 'Panel', 'Workshop', 'Briefing', 'Showcase', 'Clinic', 'Networking'];

    return (
        <div className="min-h-screen bg-psi-page font-sans">

            {/* ── Header ──────────────────────────────────────────────────── */}
            <div className="bg-psi-surface border-b border-psi px-6 py-5 sticky top-0 z-20">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
                        <div>
                            <div className="flex items-center gap-2 mb-0.5">
                                <Layout size={20} className="text-emerald-400" />
                                <h1 className="text-psi-primary font-extrabold text-xl">Smart Agenda Builder</h1>
                            </div>
                            <p className="text-psi-secondary text-xs">
                                AI-personalized schedule · {myAgenda.length} sessions selected · {interests.length} interests
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            {myAgenda.length > 0 && (
                                <button
                                    onClick={exportAgenda}
                                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-psi-subtle border border-psi-strong text-psi-secondary text-xs font-semibold hover:bg-psi-subtle transition-colors"
                                >
                                    <Download size={13} /> Export
                                </button>
                            )}
                            <button
                                onClick={() => { setView('pick'); setInterests([]); setMyAgenda([]); }}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-psi-subtle border border-psi-strong text-psi-secondary text-xs font-medium hover:text-psi-primary transition-colors"
                            >
                                <RefreshCw size={12} /> Start Over
                            </button>
                        </div>
                    </div>

                    {/* Tab bar */}
                    <div className="flex gap-1 bg-psi-subtle/60 p-1 rounded-xl w-fit">
                        {([
                            { id: 'pick', label: 'Interests', icon: Tag },
                            { id: 'recommended', label: 'Recommended', icon: Sparkles },
                            { id: 'catalog', label: 'All Sessions', icon: BookOpen },
                            { id: 'agenda', label: `My Agenda${myAgenda.length ? ` (${myAgenda.length})` : ''}`, icon: Calendar },
                        ] as { id: View; label: string; icon: React.ElementType }[]).map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setView(tab.id)}
                                className={cn(
                                    'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all',
                                    view === tab.id
                                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40'
                                        : 'text-psi-secondary hover:text-slate-200'
                                )}
                            >
                                <tab.icon size={13} />
                                <span className="hidden sm:inline">{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Content ─────────────────────────────────────────────────── */}
            <div className="max-w-7xl mx-auto px-6 py-8">
                <AnimatePresence mode="wait">

                    {/* ── STEP 1: INTEREST PICKER ──────────────────────────── */}
                    {view === 'pick' && (
                        <motion.div key="pick" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                            {building ? (
                                <div className="flex flex-col items-center justify-center py-32">
                                    <div className="w-20 h-20 rounded-3xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mb-6">
                                        <Sparkles size={36} className="text-emerald-400 animate-pulse" />
                                    </div>
                                    <h2 className="text-psi-primary font-black text-xl mb-2">Building your agenda…</h2>
                                    <p className="text-psi-secondary text-sm">Scoring {ALL_SESSIONS.length} sessions against your {interests.length} interests</p>
                                    <div className="flex gap-1 mt-6">
                                        {[0, 1, 2].map(i => (
                                            <div key={i} className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <InterestPicker selected={interests} onToggle={toggleInterest} onBuild={handleBuild} />
                            )}
                        </motion.div>
                    )}

                    {/* ── STEP 2: RECOMMENDED ──────────────────────────────── */}
                    {view === 'recommended' && (
                        <motion.div key="recommended" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                            {/* Summary banner */}
                            <div className="bg-gradient-to-r from-emerald-900/40 to-teal-900/20 border border-emerald-800/40 rounded-2xl p-5 mb-6 flex items-center gap-4 flex-wrap">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                                    <Sparkles size={22} className="text-emerald-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h2 className="text-psi-primary font-bold text-base">Your Recommended Sessions</h2>
                                    <p className="text-psi-secondary text-xs mt-0.5">
                                        {allScored.filter(s => s.relevanceScore >= 75).length} Top Picks · {allScored.filter(s => s.relevanceScore >= 50 && s.relevanceScore < 75).length} Recommended · based on: {interests.map(id => ALL_TOPICS.find(t => t.id === id)?.label).filter(Boolean).join(', ')}
                                    </p>
                                </div>
                                <div className="flex gap-4 flex-shrink-0">
                                    <div className="text-center">
                                        <p className="text-emerald-400 font-black text-xl">{myAgenda.length}</p>
                                        <p className="text-psi-secondary text-[10px] uppercase">In Agenda</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-psi-primary font-black text-xl">{allScored.filter(s => s.relevanceScore >= 50).length}</p>
                                        <p className="text-psi-secondary text-[10px] uppercase">Matched</p>
                                    </div>
                                </div>
                            </div>

                            {/* Score legend */}
                            <div className="flex flex-wrap gap-3 mb-6">
                                {[
                                    { label: 'Top Pick (80%+)', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
                                    { label: 'Recommended (55–79%)', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
                                    { label: 'Discover (<55%)', color: 'text-psi-secondary bg-psi-border border-slate-600' },
                                ].map(l => (
                                    <span key={l.label} className={cn('text-[10px] font-bold px-2.5 py-1 rounded-full border', l.color)}>{l.label}</span>
                                ))}
                                <span className="text-[10px] text-psi-secondary flex items-center gap-1"><AlertTriangle size={10} className="text-amber-500" /> Conflict warning shown when added to agenda</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                                {allScored.map(session => (
                                    <SessionCard
                                        key={session.id}
                                        session={session}
                                        inAgenda={agendaIds.has(session.id)}
                                        hasConflict={!agendaIds.has(session.id) && conflictsWithAgenda(session, myAgenda)}
                                        onAdd={addSession}
                                        onRemove={removeSession}
                                        interests={interests}
                                    />
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* ── ALL SESSIONS CATALOG ─────────────────────────────── */}
                    {view === 'catalog' && (
                        <motion.div key="catalog" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                            {/* Search + filter */}
                            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                                <div className="relative flex-1 max-w-sm">
                                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-psi-secondary" />
                                    <input
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                        placeholder="Search sessions, speakers, rooms…"
                                        className="w-full bg-psi-surface border border-psi-strong rounded-xl pl-9 pr-3 py-2.5 text-sm text-psi-primary placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                                    />
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {SESSION_TYPES.map(type => (
                                        <button
                                            key={type}
                                            onClick={() => setTypeFilter(type)}
                                            className={cn(
                                                'px-3 py-2 rounded-lg text-xs font-semibold border transition-all',
                                                typeFilter === type
                                                    ? 'bg-emerald-600 border-emerald-500 text-psi-primary'
                                                    : 'bg-psi-surface border-psi-strong text-psi-secondary hover:border-slate-600'
                                            )}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <p className="text-psi-secondary text-xs mb-4">{filteredCatalog.length} sessions</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                                {filteredCatalog.map(session => (
                                    <SessionCard
                                        key={session.id}
                                        session={session}
                                        inAgenda={agendaIds.has(session.id)}
                                        hasConflict={!agendaIds.has(session.id) && conflictsWithAgenda(session, myAgenda)}
                                        onAdd={addSession}
                                        onRemove={removeSession}
                                        interests={interests}
                                    />
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* ── MY AGENDA (TIMELINE) ──────────────────────────────── */}
                    {view === 'agenda' && (
                        <motion.div key="agenda" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                            {myAgenda.length === 0 ? (
                                <div className="flex flex-col items-center py-28 bg-psi-surface/60 border-2 border-dashed border-psi rounded-3xl text-center">
                                    <Calendar size={44} className="text-slate-700 mb-4" />
                                    <h3 className="text-psi-primary font-bold text-lg mb-2">Your agenda is empty</h3>
                                    <p className="text-psi-secondary text-sm mb-6 max-w-xs">
                                        Go to the <strong className="text-psi-secondary">Interests</strong> tab and build your personalized schedule, or browse <strong className="text-psi-secondary">All Sessions</strong> to add manually.
                                    </p>
                                    <div className="flex gap-3">
                                        <button onClick={() => setView('pick')} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-500 transition-colors">
                                            <Sparkles size={14} /> Build Agenda
                                        </button>
                                        <button onClick={() => setView('catalog')} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-psi-subtle border border-psi-strong text-psi-secondary text-sm font-medium hover:bg-psi-subtle transition-colors">
                                            <BookOpen size={14} /> Browse Sessions
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                                    {/* Timeline */}
                                    <div className="xl:col-span-2">
                                        <div className="flex items-center justify-between mb-6">
                                            <h2 className="text-psi-primary font-bold text-base flex items-center gap-2">
                                                <Calendar size={16} className="text-emerald-400" />
                                                My Schedule — {myAgenda.length} sessions
                                            </h2>
                                            <button onClick={exportAgenda} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-psi-subtle border border-psi-strong text-psi-secondary text-xs font-semibold hover:bg-psi-subtle transition-colors">
                                                <Download size={12} /> Export
                                            </button>
                                        </div>

                                        <div className="space-y-6">
                                            {timelineGroups.map(group => (
                                                <div key={group.slotKey}>
                                                    {/* Time marker */}
                                                    <div className="flex items-center gap-3 mb-3">
                                                        <div className="flex items-center gap-2 bg-psi-subtle border border-psi-strong rounded-xl px-3 py-1.5">
                                                            <Clock size={12} className="text-emerald-400" />
                                                            <span className="text-emerald-400 font-black text-sm">{group.slotKey}</span>
                                                        </div>
                                                        <div className="flex-1 h-px bg-psi-subtle" />
                                                    </div>
                                                    <div className="space-y-3 pl-2">
                                                        {group.sessions.map(s => (
                                                            <AgendaTimelineCard key={s.id} session={s} onRemove={removeSession} />
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Sidebar summary */}
                                    <div className="space-y-5">
                                        {/* Stats */}
                                        <div className="bg-psi-surface border border-psi rounded-2xl p-5">
                                            <h3 className="text-psi-primary font-bold text-sm mb-4">Agenda Summary</h3>
                                            <div className="grid grid-cols-2 gap-3">
                                                {[
                                                    { label: 'Sessions', value: myAgenda.length, icon: Calendar },
                                                    { label: 'Hours', value: `${(myAgenda.reduce((s, x) => s + durationMins(x), 0) / 60).toFixed(1)}h`, icon: Clock },
                                                    { label: 'Rooms', value: new Set(myAgenda.map(s => s.room)).size, icon: MapPin },
                                                    { label: 'Types', value: new Set(myAgenda.map(s => s.type)).size, icon: Tag },
                                                ].map(s => (
                                                    <div key={s.label} className="bg-psi-subtle rounded-xl p-3 text-center">
                                                        <s.icon size={16} className="mx-auto mb-1.5 text-emerald-400" />
                                                        <p className="text-psi-primary font-black text-lg">{s.value}</p>
                                                        <p className="text-psi-secondary text-[10px] uppercase tracking-wider">{s.label}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Type breakdown */}
                                        <div className="bg-psi-surface border border-psi rounded-2xl p-5">
                                            <h3 className="text-psi-primary font-bold text-sm mb-4">Session Types</h3>
                                            <div className="space-y-2">
                                                {Array.from(new Set(myAgenda.map(s => s.type))).map(type => {
                                                    const count = myAgenda.filter(s => s.type === type).length;
                                                    const style = TYPE_COLORS[type as SessionType];
                                                    return (
                                                        <div key={type} className="flex items-center justify-between">
                                                            <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full border', style.bg, style.text, style.border)}>
                                                                {type}
                                                            </span>
                                                            <span className="text-psi-primary text-sm font-bold">{count}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Selected interests */}
                                        {interests.length > 0 && (
                                            <div className="bg-psi-surface border border-psi rounded-2xl p-5">
                                                <h3 className="text-psi-primary font-bold text-sm mb-3">Your Interests</h3>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {interests.map(id => {
                                                        const topic = ALL_TOPICS.find(t => t.id === id);
                                                        return (
                                                            <span key={id} className="text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
                                                                {topic?.emoji} {topic?.label}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                                <button
                                                    onClick={() => setView('pick')}
                                                    className="mt-3 text-psi-secondary text-xs hover:text-psi-primary transition-colors flex items-center gap-1"
                                                >
                                                    <RefreshCw size={10} /> Change interests & rebuild
                                                </button>
                                            </div>
                                        )}

                                        {/* CTA to add more */}
                                        <div className="bg-psi-surface border border-psi rounded-2xl p-5 text-center">
                                            <Zap size={20} className="text-amber-400 mx-auto mb-2" />
                                            <p className="text-psi-primary font-semibold text-sm mb-1">Want more sessions?</p>
                                            <p className="text-psi-secondary text-xs mb-3">Browse the full catalog and add any session manually</p>
                                            <button
                                                onClick={() => setView('catalog')}
                                                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-psi-subtle border border-psi-strong text-psi-secondary text-sm font-semibold hover:bg-psi-subtle transition-colors"
                                            >
                                                <BookOpen size={14} /> Browse All Sessions
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>
        </div>
    );
}
