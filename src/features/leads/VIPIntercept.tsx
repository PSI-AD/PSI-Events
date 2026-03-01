/**
 * VIPIntercept.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * VIP Intercept Module — two distinct interfaces in one file:
 *
 *  1. FrontDeskIntercept  — The reception/concierge tablet UI.
 *     Staff enters: Client Name, Language, Interested Tier.
 *     The matching engine finds the best physically-present agent
 *     and writes a vip_assignments doc to Firestore.
 *
 *  2. AgentVIPAlert — What the matched agent sees on their device.
 *     Firestore onSnapshot watches for a live assignment addressed
 *     to the current agent. When one arrives it takes over the screen
 *     with an animated, high-urgency alert they must acknowledge.
 *
 *  3. matchBestAgent() — Pure matching utility.
 *     Scores present agents against VIP criteria (language, tier),
 *     returns the highest-scoring agent.
 *
 * Firestore paths
 * ───────────────
 *   crm_events/{eventId}/approvedAgents/{agentId}
 *     status: 'physically_present'
 *     languages: string[]       ← optional, defaults to ['Arabic','English']
 *     speciality: string[]      ← optional capability tags
 *
 *   crm_events/{eventId}/vip_assignments/{assignmentId}
 *     clientName:        string
 *     language:          string
 *     tier:              'Luxury' | 'Medium' | 'Average'
 *     assignedAgentId:   string
 *     assignedAgentName: string
 *     status:            'pending' | 'acknowledged' | 'completed'
 *     createdAt:         ServerTimestamp
 *     acknowledgedAt?:   ServerTimestamp
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    Crown, User, Languages, Star, Zap, Check,
    Loader2, AlertCircle, UserCheck, Phone,
    Clock, ChevronDown, MapPin, Bell,
} from 'lucide-react';
import {
    collection,
    addDoc,
    updateDoc,
    doc,
    onSnapshot,
    query,
    where,
    serverTimestamp,
    Unsubscribe,
} from 'firebase/firestore';
import { db } from '../../services/firebase/firebaseConfig';
import {
    CheckInAgent,
    CheckInEvent,
    TIER_STYLES,
    DEMO_EVENT,
    DEMO_AGENTS,
    subscribeToEventAgents,
} from '../check-in/CheckInUtils';

// ── Constants ─────────────────────────────────────────────────────────────────

const TIER_OPTIONS = ['Luxury', 'Medium', 'Average'] as const;
type VIPTier = (typeof TIER_OPTIONS)[number];

const LANGUAGE_OPTIONS = [
    'Arabic', 'English', 'Russian', 'Chinese (Mandarin)',
    'Hindi', 'French', 'German', 'Farsi',
] as const;
type Language = (typeof LANGUAGE_OPTIONS)[number];

type AssignmentStatus = 'pending' | 'acknowledged' | 'completed';

// ── Firestore document shape ───────────────────────────────────────────────────

interface VIPAssignment {
    id: string;
    clientName: string;
    language: Language;
    tier: VIPTier;
    assignedAgentId: string;
    assignedAgentName: string;
    assignedAgentPhone: string;
    assignedAgentBranch: string;
    status: AssignmentStatus;
    createdAt: Date | null;
    acknowledgedAt?: Date | null;
    eventId: string;
    score: number;
}

// ── Tier-to-agent-tier mapping ────────────────────────────────────────────────

const VIP_TIER_TO_AGENT_TIER: Record<VIPTier, ('gold' | 'silver' | 'bronze')[]> = {
    Luxury: ['gold'],
    Medium: ['gold', 'silver'],
    Average: ['gold', 'silver', 'bronze'],
};

// ── Matching Engine ───────────────────────────────────────────────────────────

/**
 * matchBestAgent
 * ──────────────
 * Scores every physically-present agent and returns the single best match.
 *
 * Scoring rubric (higher = better):
 *   +40 — agent tier satisfies VIP tier requirement (e.g., gold for Luxury)
 *   +30 — agent speaks the VIP's preferred language (from agent.languages[])
 *   +20 — agent tier is gold (top performer, always preferred)
 *   +10 — agent tier is silver
 *    ±0 — bronze
 *   Agents NOT physically_present are excluded entirely.
 */
export function matchBestAgent(
    agents: CheckInAgent[],
    vipTier: VIPTier,
    vipLanguage: Language
): CheckInAgent | null {
    const eligible = agents.filter(a => a.status === 'physically_present');
    if (eligible.length === 0) return null;

    const preferredTiers = VIP_TIER_TO_AGENT_TIER[vipTier];

    const scored = eligible.map(agent => {
        let score = 0;

        // Tier eligibility
        if (preferredTiers.includes(agent.tier)) score += 40;

        // Language match — agent.languages is optional; default to ['Arabic','English']
        const agentLangs: string[] = (agent as CheckInAgent & { languages?: string[] }).languages ?? ['Arabic', 'English'];
        if (agentLangs.map(l => l.toLowerCase()).includes(vipLanguage.toLowerCase())) score += 30;

        // Intrinsic tier quality bonus
        if (agent.tier === 'gold') score += 20;
        else if (agent.tier === 'silver') score += 10;

        return { agent, score };
    });

    // Sort descending by score; on tie prefer gold > silver > bronze
    scored.sort((a, b) => b.score - a.score);
    return scored[0]?.agent ?? null;
}

// ── Firestore helpers ─────────────────────────────────────────────────────────

async function createVIPAssignment(
    eventId: string,
    clientName: string,
    language: Language,
    tier: VIPTier,
    agent: CheckInAgent,
    score: number
): Promise<string> {
    const ref = await addDoc(
        collection(db, 'crm_events', eventId, 'vip_assignments'),
        {
            clientName,
            language,
            tier,
            assignedAgentId: agent.agentId,
            assignedAgentName: agent.agentName,
            assignedAgentPhone: agent.phone,
            assignedAgentBranch: agent.branch,
            status: 'pending',
            score,
            eventId,
            createdAt: serverTimestamp(),
        }
    );
    return ref.id;
}

async function acknowledgeAssignment(
    eventId: string,
    assignmentId: string
): Promise<void> {
    await updateDoc(doc(db, 'crm_events', eventId, 'vip_assignments', assignmentId), {
        status: 'acknowledged',
        acknowledgedAt: serverTimestamp(),
    });
}

// ── Sub-components ────────────────────────────────────────────────────────────

/** Tier badge pills */
function TierBadge({ tier, agentTier = false }: { tier: string; agentTier?: boolean }) {
    if (agentTier) {
        const s = TIER_STYLES[tier as keyof typeof TIER_STYLES] ?? TIER_STYLES.bronze;
        return (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${s.badge}`}>
                <Star size={9} />
                {tier.charAt(0).toUpperCase() + tier.slice(1)}
            </span>
        );
    }
    const map: Record<string, string> = {
        Luxury: 'bg-amber-500 text-white',
        Medium: 'bg-blue-600 text-white',
        Average: 'bg-psi-subtle text-psi-primary border border-psi',
    };
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${map[tier] ?? map.Average}`}>
            {tier === 'Luxury' && <Crown size={10} />}
            {tier}
        </span>
    );
}

/** Animated pulsing red alert ring */
function UrgencyRing() {
    return (
        <div className="relative flex items-center justify-center">
            <motion.div
                className="absolute w-28 h-28 rounded-full border-4 border-rose-500 opacity-30"
                animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
                className="absolute w-20 h-20 rounded-full border-4 border-rose-400 opacity-50"
                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
            />
            <div className="w-14 h-14 rounded-full bg-rose-500 flex items-center justify-center shadow-xl shadow-rose-500/40">
                <Crown size={28} className="text-white" />
            </div>
        </div>
    );
}

// ── INTERFACE 1: Front Desk Intercept ────────────────────────────────────────

interface FrontDeskInterceptProps {
    event: CheckInEvent;
}

type FrontDeskState = 'form' | 'matching' | 'assigned' | 'error_no_agents';

export function FrontDeskIntercept({ event }: FrontDeskInterceptProps) {
    const [name, setName] = useState('');
    const [language, setLanguage] = useState<Language>('Arabic');
    const [tier, setTier] = useState<VIPTier>('Luxury');
    const [agents, setAgents] = useState<CheckInAgent[]>([]);
    const [state, setState] = useState<FrontDeskState>('form');
    const [assignedAgent, setAssignedAgent] = useState<CheckInAgent | null>(null);
    const [assignmentId, setAssignmentId] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    // Subscribe to live agent list
    useEffect(() => {
        const unsub = subscribeToEventAgents(event.eventId, setAgents);
        return unsub;
    }, [event.eventId]);

    const presentCount = agents.filter(a => a.status === 'physically_present').length;

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setState('matching');
        await new Promise(r => setTimeout(r, 1200)); // simulate matching computation

        const best = matchBestAgent(agents, tier, language);

        if (!best) {
            setState('error_no_agents');
            setErrorMsg('No physically-present agents are currently available. Please try again or assign manually.');
            return;
        }

        try {
            const scored = agents
                .filter(a => a.status === 'physically_present')
                .map(a => {
                    let s = 0;
                    const preferredTiers = VIP_TIER_TO_AGENT_TIER[tier];
                    if (preferredTiers.includes(a.tier)) s += 40;
                    const langs: string[] = (a as CheckInAgent & { languages?: string[] }).languages ?? ['Arabic', 'English'];
                    if (langs.map(l => l.toLowerCase()).includes(language.toLowerCase())) s += 30;
                    if (a.tier === 'gold') s += 20;
                    else if (a.tier === 'silver') s += 10;
                    return { a, s };
                })
                .find(x => x.a.agentId === best.agentId);

            const id = await createVIPAssignment(
                event.eventId, name.trim(), language, tier, best, scored?.s ?? 0
            );
            setAssignedAgent(best);
            setAssignmentId(id);
            setState('assigned');
        } catch (err) {
            setState('error_no_agents');
            setErrorMsg(`Failed to dispatch assignment: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
    }, [agents, event.eventId, name, language, tier]);

    function handleReset() {
        setName('');
        setLanguage('Arabic');
        setTier('Luxury');
        setAssignedAgent(null);
        setAssignmentId('');
        setState('form');
        setErrorMsg('');
    }

    return (
        <div className="min-h-screen bg-psi-page flex flex-col items-center justify-center p-4">

            {/* Header */}
            <div className="w-full max-w-lg mb-6 flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 mb-4">
                    <Crown size={26} className="text-white" />
                </div>
                <h1 className="text-2xl font-extrabold text-psi-primary tracking-tight">VIP Intercept</h1>
                <p className="text-psi-muted text-sm mt-1">Front Desk — {event.eventName}</p>
                <div className="flex items-center gap-1.5 mt-2">
                    <div className={`w-2 h-2 rounded-full ${presentCount > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                    <span className={`text-xs font-bold ${presentCount > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                        {presentCount} agent{presentCount !== 1 ? 's' : ''} on the floor
                    </span>
                </div>
            </div>

            <AnimatePresence mode="wait">

                {/* ── STATE: Form ── */}
                {state === 'form' && (
                    <motion.form
                        key="form"
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -16 }}
                        onSubmit={handleSubmit}
                        className="psi-card w-full max-w-lg p-8 space-y-6"
                    >
                        {/* Client Name */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-psi-muted mb-2">
                                VIP Client Name *
                            </label>
                            <div className="relative">
                                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-psi-muted" />
                                <input
                                    id="vip-client-name"
                                    type="text"
                                    required
                                    autoFocus
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="e.g. Mr. Khalid Al-Saud"
                                    className="psi-input w-full pl-11 pr-4 py-3.5 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all text-psi-primary text-base"
                                />
                            </div>
                        </div>

                        {/* Language Preference */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-psi-muted mb-2">
                                Language Preference *
                            </label>
                            <div className="relative">
                                <Languages size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-psi-muted pointer-events-none z-10" />
                                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-psi-muted pointer-events-none z-10" />
                                <select
                                    id="vip-language"
                                    value={language}
                                    onChange={e => setLanguage(e.target.value as Language)}
                                    className="psi-input w-full pl-11 pr-10 py-3.5 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all appearance-none text-psi-primary text-base cursor-pointer"
                                >
                                    {LANGUAGE_OPTIONS.map(l => (
                                        <option key={l} value={l}>{l}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Interested Tier */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-psi-muted mb-3">
                                Interested Tier *
                            </label>
                            <div className="grid grid-cols-3 gap-3">
                                {TIER_OPTIONS.map(t => (
                                    <button
                                        key={t}
                                        type="button"
                                        id={`tier-btn-${t.toLowerCase()}`}
                                        onClick={() => setTier(t)}
                                        className={`
                                            relative py-4 rounded-2xl border-2 text-sm font-bold transition-all select-none
                                            flex flex-col items-center gap-2
                                            ${tier === t
                                                ? t === 'Luxury'
                                                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 shadow-md shadow-amber-500/10'
                                                    : t === 'Medium'
                                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 shadow-md'
                                                        : 'border-psi-strong bg-psi-subtle text-psi-primary shadow-sm'
                                                : 'border-psi psi-card text-psi-secondary hover:border-psi-strong'
                                            }
                                        `}
                                    >
                                        {t === 'Luxury' && <Crown size={18} className={tier === t ? 'text-amber-500' : 'text-psi-muted'} />}
                                        {t === 'Medium' && <Star size={18} className={tier === t ? 'text-blue-500' : 'text-psi-muted'} />}
                                        {t === 'Average' && <User size={18} className={tier === t ? 'text-psi-primary' : 'text-psi-muted'} />}
                                        {t}
                                        {tier === t && (
                                            <motion.div
                                                layoutId="tier-indicator"
                                                className="absolute top-2 right-2 w-2 h-2 rounded-full bg-current"
                                            />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            id="vip-intercept-submit"
                            type="submit"
                            disabled={!name.trim() || presentCount === 0}
                            className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:from-psi-muted disabled:to-psi-muted text-white font-extrabold text-base rounded-2xl transition-all shadow-lg shadow-amber-500/20 disabled:shadow-none active:scale-[0.98] select-none"
                        >
                            <Zap size={18} />
                            {presentCount === 0 ? 'No Agents on Floor' : 'Match & Dispatch VIP Alert'}
                        </button>

                        {presentCount === 0 && (
                            <p className="text-xs text-rose-500 text-center -mt-3 font-medium">
                                ⚠ Agents must be checked in via QR scan before they can be assigned.
                            </p>
                        )}
                    </motion.form>
                )}

                {/* ── STATE: Matching ── */}
                {state === 'matching' && (
                    <motion.div
                        key="matching"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="psi-card w-full max-w-lg p-12 flex flex-col items-center gap-6 text-center"
                    >
                        <div className="relative">
                            <div className="w-20 h-20 rounded-full border-4 border-psi-subtle flex items-center justify-center">
                                <Crown size={32} className="text-amber-500" />
                            </div>
                            <motion.div
                                className="absolute inset-0 rounded-full border-4 border-t-amber-500 border-r-amber-500 border-b-transparent border-l-transparent"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            />
                        </div>
                        <div>
                            <p className="text-xl font-extrabold text-psi-primary">Matching Best Agent…</p>
                            <p className="text-psi-secondary text-sm mt-2">
                                Scanning {presentCount} on-floor agent{presentCount !== 1 ? 's' : ''} for{' '}
                                <span className="font-bold text-amber-500">{tier}</span>{' '}
                                +{' '}<span className="font-bold">{language}</span>
                            </p>
                        </div>
                        <div className="flex gap-1.5">
                            {[0, 0.15, 0.3].map((d, i) => (
                                <motion.div
                                    key={i}
                                    className="w-2 h-2 rounded-full bg-amber-500"
                                    animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                                    transition={{ duration: 0.8, repeat: Infinity, delay: d }}
                                />
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* ── STATE: Assigned ── */}
                {state === 'assigned' && assignedAgent && (
                    <motion.div
                        key="assigned"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="w-full max-w-lg space-y-4"
                    >
                        {/* Success header */}
                        <div className="psi-card p-6 border-2 border-emerald-500/40 text-center space-y-2">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                                className="w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30"
                            >
                                <Check size={28} className="text-white" />
                            </motion.div>
                            <h2 className="text-xl font-extrabold text-psi-primary">VIP Alert Dispatched!</h2>
                            <p className="text-psi-secondary text-sm">
                                <span className="font-bold text-emerald-600 dark:text-emerald-400">{assignedAgent.agentName}</span>{' '}
                                has been notified and is en route to reception.
                            </p>
                        </div>

                        {/* Assignment card */}
                        <div className="psi-card p-6 space-y-5">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-psi-muted mb-1">VIP Client</p>
                                    <p className="text-xl font-extrabold text-psi-primary">{name}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <TierBadge tier={tier} />
                                        <span className="text-xs text-psi-muted flex items-center gap-1">
                                            <Languages size={11} />{language}
                                        </span>
                                    </div>
                                </div>
                                <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center flex-shrink-0">
                                    <Crown size={24} className="text-amber-500" />
                                </div>
                            </div>

                            <div className="border-t border-psi pt-4">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-psi-muted mb-3">Assigned Agent</p>
                                <div className="flex items-center gap-3">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${TIER_STYLES[assignedAgent.tier].badge}`}>
                                        <UserCheck size={22} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-extrabold text-psi-primary text-base truncate">{assignedAgent.agentName}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <TierBadge tier={assignedAgent.tier} agentTier />
                                            <span className="text-xs text-psi-muted">{assignedAgent.branch}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-3 flex gap-3">
                                    <a
                                        href={`tel:${assignedAgent.phone}`}
                                        className="flex-1 flex items-center justify-center gap-2 py-2.5 psi-card border border-psi rounded-xl text-sm font-bold text-psi-primary hover:bg-psi-subtle transition-all"
                                    >
                                        <Phone size={14} /> Call Agent
                                    </a>
                                    <div className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-psi-subtle border border-psi rounded-xl text-xs text-psi-muted">
                                        <Clock size={12} /> ID: {assignmentId.slice(0, 8)}…
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button
                            id="vip-new-intercept-btn"
                            onClick={handleReset}
                            className="w-full py-3.5 btn-accent rounded-2xl font-bold text-base active:scale-[0.98] transition-all"
                        >
                            + New VIP Intercept
                        </button>
                    </motion.div>
                )}

                {/* ── STATE: Error ── */}
                {state === 'error_no_agents' && (
                    <motion.div
                        key="error"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="psi-card w-full max-w-lg p-8 text-center space-y-4 border-2 border-rose-400/40"
                    >
                        <div className="w-14 h-14 rounded-full bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center mx-auto">
                            <AlertCircle size={28} className="text-rose-500" />
                        </div>
                        <h2 className="text-xl font-extrabold text-psi-primary">Match Failed</h2>
                        <p className="text-psi-secondary text-sm">{errorMsg}</p>
                        <button
                            onClick={handleReset}
                            className="w-full py-3.5 btn-accent rounded-2xl font-bold active:scale-[0.98] transition-all"
                        >
                            Try Again
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ── INTERFACE 2: Agent VIP Alert (Screen Takeover) ────────────────────────────

interface AgentVIPAlertProps {
    /** The current agent's ID — used to filter assignments addressed to them */
    currentAgentId: string;
    eventId: string;
    /** Optional: what to render underneath when no alert is active */
    children?: React.ReactNode;
}

/**
 * AgentVIPAlert
 * ─────────────
 * Wraps the agent's normal view. Subscribes to vip_assignments where
 * assignedAgentId === currentAgentId AND status === 'pending'.
 * When one arrives, a full-screen animated takeover renders on top.
 */
export function AgentVIPAlert({ currentAgentId, eventId, children }: AgentVIPAlertProps) {
    const [activeAssignment, setActiveAssignment] = useState<VIPAssignment | null>(null);
    const [acknowledging, setAcknowledging] = useState(false);

    useEffect(() => {
        if (!eventId || !currentAgentId) return;

        const q = query(
            collection(db, 'crm_events', eventId, 'vip_assignments'),
            where('assignedAgentId', '==', currentAgentId),
            where('status', '==', 'pending')
        );

        const unsub: Unsubscribe = onSnapshot(q, snap => {
            if (snap.empty) {
                setActiveAssignment(null);
                return;
            }
            // Take the most recent pending assignment
            const docs = snap.docs
                .map(d => {
                    const data = d.data();
                    return {
                        id: d.id,
                        clientName: data.clientName ?? 'Unknown Client',
                        language: data.language as Language,
                        tier: data.tier as VIPTier,
                        assignedAgentId: data.assignedAgentId,
                        assignedAgentName: data.assignedAgentName,
                        assignedAgentPhone: data.assignedAgentPhone ?? '',
                        assignedAgentBranch: data.assignedAgentBranch ?? '',
                        status: data.status as AssignmentStatus,
                        createdAt: data.createdAt?.toDate?.() ?? null,
                        eventId: data.eventId ?? eventId,
                        score: data.score ?? 0,
                    } as VIPAssignment;
                })
                .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));

            setActiveAssignment(docs[0] ?? null);
        });

        return () => unsub();
    }, [currentAgentId, eventId]);

    const handleAcknowledge = useCallback(async () => {
        if (!activeAssignment) return;
        setAcknowledging(true);
        try {
            await acknowledgeAssignment(activeAssignment.eventId, activeAssignment.id);
            // onSnapshot will pick up the status change and clear activeAssignment
        } catch (err) {
            console.error('Failed to acknowledge VIP assignment:', err);
        } finally {
            setAcknowledging(false);
        }
    }, [activeAssignment]);

    return (
        <>
            {children}

            {/* Full-screen VIP alert overlay */}
            <AnimatePresence>
                {activeAssignment && (
                    <motion.div
                        key={activeAssignment.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col items-center justify-center p-6 overflow-hidden"
                    >
                        {/* Animated background pulse */}
                        <motion.div
                            className="absolute inset-0 bg-rose-900/20"
                            animate={{ opacity: [0.2, 0.4, 0.2] }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
                        />
                        <motion.div
                            className="absolute inset-0"
                            style={{
                                background: 'radial-gradient(ellipse at center, rgba(245,158,11,0.05) 0%, transparent 70%)',
                            }}
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        />

                        {/* Content */}
                        <div className="relative z-10 w-full max-w-sm flex flex-col items-center gap-6 text-center">

                            {/* Pulsing alert ring */}
                            <UrgencyRing />

                            {/* VIP label */}
                            <motion.div
                                initial={{ y: 10, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.15 }}
                            >
                                <p className="text-rose-400 text-xs font-bold tracking-[0.3em] uppercase mb-1 flex items-center justify-center gap-2">
                                    <Bell size={12} className="animate-bounce" />
                                    PRIORITY ALERT
                                    <Bell size={12} className="animate-bounce" />
                                </p>
                                <h1 className="text-3xl font-black text-white tracking-tight leading-tight">
                                    VIP Client<br />Incoming!
                                </h1>
                            </motion.div>

                            {/* Client details card */}
                            <motion.div
                                initial={{ y: 16, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.25 }}
                                className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
                                        <Crown size={26} className="text-amber-400" />
                                    </div>
                                    <div className="text-left min-w-0">
                                        <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-0.5">Client Name</p>
                                        <p className="text-white text-xl font-extrabold truncate">{activeAssignment.clientName}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-white/5 rounded-xl p-3 text-left">
                                        <p className="text-white/40 text-[9px] font-bold uppercase tracking-widest mb-1">Language</p>
                                        <p className="text-white font-bold text-sm flex items-center gap-1.5">
                                            <Languages size={13} className="text-blue-400" />
                                            {activeAssignment.language}
                                        </p>
                                    </div>
                                    <div className="bg-white/5 rounded-xl p-3 text-left">
                                        <p className="text-white/40 text-[9px] font-bold uppercase tracking-widest mb-1">Tier</p>
                                        <p className="text-white font-bold text-sm flex items-center gap-1.5">
                                            {activeAssignment.tier === 'Luxury' && <Crown size={13} className="text-amber-400" />}
                                            {activeAssignment.tier === 'Medium' && <Star size={13} className="text-blue-400" />}
                                            {activeAssignment.tier === 'Average' && <User size={13} className="text-slate-400" />}
                                            {activeAssignment.tier}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Instruction */}
                            <motion.div
                                initial={{ y: 16, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.35 }}
                                className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-2xl px-4 py-3 w-full"
                            >
                                <MapPin size={16} className="text-amber-400 flex-shrink-0" />
                                <p className="text-amber-300 text-sm font-bold text-left">
                                    Please proceed to <span className="text-white">Reception</span> immediately to greet your VIP.
                                </p>
                            </motion.div>

                            {/* Acknowledge button */}
                            <motion.button
                                id="vip-acknowledge-btn"
                                initial={{ y: 16, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.45 }}
                                whileTap={{ scale: 0.96 }}
                                onClick={handleAcknowledge}
                                disabled={acknowledging}
                                className="w-full flex items-center justify-center gap-3 py-5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-extrabold text-lg rounded-2xl shadow-2xl shadow-amber-500/30 transition-all select-none disabled:opacity-70"
                            >
                                {acknowledging
                                    ? <><Loader2 size={20} className="animate-spin" /> Confirming…</>
                                    : <><Check size={20} /> I'm on my way!</>
                                }
                            </motion.button>

                            <p className="text-white/30 text-xs">
                                Tap to acknowledge and dismiss this alert.
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

// ── Page Wrapper (demo / route component) ────────────────────────────────────

type DemoMode = 'front-desk' | 'agent';

/**
 * VIPInterceptPage
 * ────────────────
 * Route: /vip-intercept
 * Provides a role toggle so you can demo both interfaces.
 * In production the view would be determined by the user's role.
 */
export default function VIPInterceptPage() {
    const [mode, setMode] = useState<DemoMode>('front-desk');
    const [selectedEvent] = useState<CheckInEvent>(DEMO_EVENT);

    // Demo: simulate present agents by marking agt_004 as physically_present
    const demoAgent = DEMO_AGENTS.find(a => a.status === 'physically_present') ?? DEMO_AGENTS[0];

    return (
        <div className="relative min-h-screen bg-psi-page">

            {/* Demo mode toggle bar */}
            <div className="sticky top-0 z-50 bg-psi-raised border-b border-psi px-4 py-3">
                <div className="max-w-lg mx-auto">
                    <p className="text-[10px] font-bold text-psi-muted uppercase tracking-widest text-center mb-2">
                        Demo View Toggle
                    </p>
                    <div className="flex gap-1 bg-psi-subtle p-1 rounded-xl">
                        <button
                            id="view-front-desk"
                            onClick={() => setMode('front-desk')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${mode === 'front-desk' ? 'btn-accent shadow' : 'text-psi-muted hover:text-psi-primary'}`}
                        >
                            <Crown size={13} />
                            Front Desk
                        </button>
                        <button
                            id="view-agent"
                            onClick={() => setMode('agent')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${mode === 'agent' ? 'btn-accent shadow' : 'text-psi-muted hover:text-psi-primary'}`}
                        >
                            <UserCheck size={13} />
                            Agent View
                        </button>
                    </div>
                </div>
            </div>

            {/* Render selected mode */}
            {mode === 'front-desk' && (
                <FrontDeskIntercept event={selectedEvent} />
            )}

            {mode === 'agent' && (
                <AgentVIPAlert
                    currentAgentId={demoAgent.agentId}
                    eventId={selectedEvent.eventId}
                >
                    {/* Normal agent content shown when no alert is active */}
                    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 gap-4">
                        <div className="w-16 h-16 rounded-full bg-psi-subtle border border-psi flex items-center justify-center">
                            <Bell size={28} className="text-psi-muted" />
                        </div>
                        <h2 className="text-xl font-extrabold text-psi-primary">Standby Mode</h2>
                        <p className="text-psi-secondary text-sm max-w-xs">
                            You are on the floor as <strong>{demoAgent.agentName}</strong>.
                            When Front Desk assigns a VIP to you, a full-screen alert will appear here.
                        </p>
                        <p className="text-xs text-psi-muted italic">
                            Switch to Front Desk view, submit a VIP, then switch back to see the takeover.
                        </p>
                    </div>
                </AgentVIPAlert>
            )}
        </div>
    );
}
