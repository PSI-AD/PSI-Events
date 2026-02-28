/**
 * OrganizerScannerView.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Organizer's venue check-in scanner — mobile-first.
 *
 * Two-panel workflow:
 *   1. SCAN PANEL  — animated mock QR scanner + paste-token field to verify
 *   2. ROSTER PANEL — real-time list of all approved agents with
 *                      one-tap "Verify Attendance" buttons
 *
 * On verification: updates Firestore status from 'approved' → 'physically_present'
 * This is the lock-in gate — lead distribution only fires for physically_present agents.
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    ScanLine,
    Users,
    CheckCircle2,
    Clock,
    Search,
    AlertTriangle,
    BadgeCheck,
    Loader2,
    Star,
    X,
    ShieldCheck,
    Hourglass,
    ListFilter,
} from 'lucide-react';
import {
    CheckInAgent,
    CheckInEvent,
    TIER_STYLES,
    markAgentPresent,
    subscribeToEventAgents,
    DEMO_AGENTS,
    verifyCheckInJWT,
    decodeJWTPayload,
    CheckInJWTPayload,
} from './CheckInUtils';

// ── Helpers ───────────────────────────────────────────────────────────────────

function clsx(...c: (string | false | undefined | null)[]) {
    return c.filter(Boolean).join(' ');
}

function formatTime(date?: Date): string {
    if (!date) return '—';
    return date.toLocaleTimeString('en-AE', { hour: '2-digit', minute: '2-digit' });
}

// ── Sub-components ────────────────────────────────────────────────────────────

/** Animated scan line inside the QR viewfinder */
function ScannerFrame({ active }: { active: boolean }) {
    return (
        <div className="relative w-64 h-64 mx-auto">
            {/* Corner brackets */}
            {['top-0 left-0', 'top-0 right-0 rotate-90', 'bottom-0 right-0 rotate-180', 'bottom-0 left-0 -rotate-90'].map(
                (pos, i) => (
                    <div key={i} className={clsx('absolute w-8 h-8', pos)}>
                        <div className="absolute top-0 left-0 w-full h-0.5 bg-amber-400" />
                        <div className="absolute top-0 left-0 h-full w-0.5 bg-amber-400" />
                    </div>
                )
            )}

            {/* Background grid */}
            <div className="absolute inset-3 bg-slate-900/80 rounded-sm grid grid-cols-6 grid-rows-6 gap-px opacity-30">
                {Array.from({ length: 36 }).map((_, i) => (
                    <div key={i} className="bg-slate-700 rounded-sm" />
                ))}
            </div>

            {/* Scanning line */}
            {active && (
                <motion.div
                    className="absolute left-3 right-3 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_8px_2px_rgba(251,191,36,0.5)]"
                    animate={{ top: ['12px', 'calc(100% - 12px)', '12px'] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                />
            )}

            {/* Center target */}
            <div className="absolute inset-0 flex items-center justify-center">
                <div className={clsx(
                    'w-12 h-12 rounded-full border-2 flex items-center justify-center transition-colors',
                    active ? 'border-amber-400/60' : 'border-slate-700'
                )}>
                    <ScanLine size={20} className={active ? 'text-amber-400' : 'text-slate-600'} />
                </div>
            </div>
        </div>
    );
}

/** Individual agent card in the roster */
function AgentRosterCard({
    agent,
    onVerify,
    verifying,
}: {
    agent: CheckInAgent;
    onVerify: (agent: CheckInAgent) => void;
    verifying: boolean;
}) {
    const tierStyle = TIER_STYLES[agent.tier];
    const isPresent = agent.status === 'physically_present';

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: 24 }}
            className={clsx(
                'rounded-2xl border p-4 transition-all',
                isPresent
                    ? 'bg-emerald-950/40 border-emerald-800/50'
                    : 'bg-slate-800/60 border-slate-700/50 hover:border-slate-600'
            )}
        >
            <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className={clsx(
                    'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold',
                    tierStyle.badge
                )}>
                    {agent.agentName.charAt(0)}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <p className="text-white font-bold text-sm truncate">{agent.agentName}</p>
                        <span className={clsx('text-[10px] font-bold px-1.5 py-0.5 rounded-full', tierStyle.badge)}>
                            <Star size={8} className="inline mr-0.5" />
                            {agent.tier}
                        </span>
                    </div>
                    <p className="text-slate-400 text-xs truncate">{agent.branch}</p>

                    {/* Compliance mini-badges */}
                    <div className="flex gap-1.5 mt-1.5">
                        {[
                            { label: 'Flight', ok: agent.flightUploaded },
                            { label: 'Visa', ok: agent.visaUploaded },
                        ].map(({ label, ok }) => (
                            <span
                                key={label}
                                className={clsx(
                                    'text-[10px] font-bold px-1.5 py-0.5 rounded',
                                    ok ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                                )}
                            >
                                {ok ? '✓' : '✗'} {label}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Status / action */}
                {isPresent ? (
                    <div className="flex flex-col items-center flex-shrink-0">
                        <CheckCircle2 size={22} className="text-emerald-400" />
                        <span className="text-[9px] text-emerald-500 mt-0.5 font-bold">
                            {formatTime(agent.checkedInAt)}
                        </span>
                    </div>
                ) : (
                    <button
                        id={`verify-agent-${agent.agentId}`}
                        onClick={() => onVerify(agent)}
                        disabled={verifying}
                        className={clsx(
                            'flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold transition-all',
                            verifying
                                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                : 'bg-amber-500 hover:bg-amber-400 text-white shadow-lg shadow-amber-500/20'
                        )}
                    >
                        {verifying ? <Loader2 size={14} className="animate-spin" /> : 'Verify'}
                    </button>
                )}
            </div>
        </motion.div>
    );
}

/** Confirmation toast overlay */
function VerifySuccessToast({ agent, onDismiss }: { agent: CheckInAgent; onDismiss: () => void }) {
    useEffect(() => {
        const t = setTimeout(onDismiss, 3500);
        return () => clearTimeout(t);
    }, []);

    return (
        <motion.div
            initial={{ opacity: 0, y: 48, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 48, scale: 0.9 }}
            className="fixed bottom-6 left-0 right-0 flex justify-center z-50 px-4"
        >
            <div className="bg-emerald-950 border border-emerald-700 rounded-2xl px-5 py-4 shadow-2xl shadow-emerald-900/50 flex items-center gap-4 max-w-sm w-full">
                <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <BadgeCheck size={20} className="text-white" />
                </div>
                <div className="flex-1">
                    <p className="text-white font-bold text-sm">{agent.agentName}</p>
                    <p className="text-emerald-400 text-xs">Marked as physically present ✓</p>
                    <p className="text-emerald-600 text-[10px]">Lead distribution unlocked</p>
                </div>
                <button onClick={onDismiss} className="text-emerald-700 hover:text-emerald-400">
                    <X size={16} />
                </button>
            </div>
        </motion.div>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────

interface OrganizerScannerViewProps {
    event: CheckInEvent;
    organizerUid?: string;
    useDemoData?: boolean;
}

type TabId = 'scanner' | 'roster';
type FilterId = 'all' | 'pending' | 'present';

export default function OrganizerScannerView({
    event,
    organizerUid = 'organizer_demo',
    useDemoData = false,
}: OrganizerScannerViewProps) {
    const [activeTab, setActiveTab] = useState<TabId>('scanner');
    const [agents, setAgents] = useState<CheckInAgent[]>([]);
    const [filter, setFilter] = useState<FilterId>('pending');
    const [search, setSearch] = useState('');
    const [verifyingId, setVerifyingId] = useState<string | null>(null);
    const [successAgent, setSuccessAgent] = useState<CheckInAgent | null>(null);
    const [scannerActive, setScannerActive] = useState(true);

    // Token paste state (manual verification via pasted JWT)
    const [pastedToken, setPastedToken] = useState('');
    const [tokenResult, setTokenResult] = useState<{ ok: boolean; payload?: CheckInJWTPayload; msg: string } | null>(null);
    const [verifyingToken, setVerifyingToken] = useState(false);

    // Load agents
    useEffect(() => {
        if (useDemoData) {
            setAgents(DEMO_AGENTS);
            return;
        }
        const unsub = subscribeToEventAgents(event.eventId, setAgents);
        return () => unsub();
    }, [event.eventId, useDemoData]);

    const presentCount = agents.filter(a => a.status === 'physically_present').length;
    const pendingCount = agents.filter(a => a.status === 'approved').length;

    const filteredAgents = agents
        .filter(a => a.managerApproved)
        .filter(a => {
            if (filter === 'pending') return a.status === 'approved';
            if (filter === 'present') return a.status === 'physically_present';
            return true;
        })
        .filter(a =>
            search === '' ||
            a.agentName.toLowerCase().includes(search.toLowerCase()) ||
            a.branch.toLowerCase().includes(search.toLowerCase())
        );

    const handleVerify = async (agent: CheckInAgent) => {
        setVerifyingId(agent.agentId);
        try {
            if (!useDemoData) {
                await markAgentPresent(event.eventId, agent.agentId, organizerUid);
            } else {
                // Demo mode: update local state
                await new Promise(r => setTimeout(r, 800));
                setAgents(prev => prev.map(a =>
                    a.agentId === agent.agentId
                        ? { ...a, status: 'physically_present', checkedInAt: new Date() }
                        : a
                ));
            }
            setSuccessAgent(agent);
        } catch (err) {
            console.error('Verification failed:', err);
        } finally {
            setVerifyingId(null);
        }
    };

    const handleTokenVerify = async () => {
        if (!pastedToken.trim()) return;
        setVerifyingToken(true);
        setTokenResult(null);
        try {
            const payload = await verifyCheckInJWT(pastedToken.trim());
            if (!payload) {
                const decoded = decodeJWTPayload(pastedToken.trim());
                if (decoded) {
                    setTokenResult({ ok: false, msg: 'Token signature invalid or expired. Do not grant access.' });
                } else {
                    setTokenResult({ ok: false, msg: 'Not a valid check-in token.' });
                }
                return;
            }
            if (payload.eid !== event.eventId) {
                setTokenResult({ ok: false, msg: `Token is for a different event (${payload.eid}). Access denied.` });
                return;
            }
            setTokenResult({ ok: true, payload, msg: 'Valid token. Agent verified.' });
            // Find agent in roster and mark present
            const agent = agents.find(a => a.agentId === payload.sub);
            if (agent) await handleVerify(agent);
        } finally {
            setVerifyingToken(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col max-w-lg mx-auto">

            {/* Header */}
            <div className="bg-slate-900 border-b border-slate-800 px-4 pt-6 pb-4">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <p className="text-amber-400 text-[10px] font-bold tracking-[0.2em] uppercase">Organizer Console</p>
                        <h1 className="text-white text-xl font-extrabold tracking-tight mt-1">Venue Check-In</h1>
                        <p className="text-slate-400 text-xs mt-0.5 truncate max-w-[240px]">{event.eventName}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 bg-emerald-950/60 border border-emerald-800 rounded-lg px-2.5 py-1">
                                <CheckCircle2 size={12} className="text-emerald-400" />
                                <span className="text-emerald-400 text-xs font-bold">{presentCount}</span>
                            </div>
                            <div className="flex items-center gap-1 bg-amber-950/60 border border-amber-800 rounded-lg px-2.5 py-1">
                                <Hourglass size={12} className="text-amber-400" />
                                <span className="text-amber-400 text-xs font-bold">{pendingCount}</span>
                            </div>
                        </div>
                        <p className="text-slate-600 text-[10px]">present · pending</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-slate-800 rounded-xl p-1">
                    {([
                        { id: 'scanner', label: 'QR Scanner', icon: <ScanLine size={14} /> },
                        { id: 'roster', label: 'Agent Roster', icon: <Users size={14} /> },
                    ] as { id: TabId; label: string; icon: React.ReactNode }[]).map(tab => (
                        <button
                            key={tab.id}
                            id={`tab-${tab.id}`}
                            onClick={() => setActiveTab(tab.id)}
                            className={clsx(
                                'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all',
                                activeTab === tab.id
                                    ? 'bg-amber-500 text-white shadow'
                                    : 'text-slate-400 hover:text-white'
                            )}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                <AnimatePresence mode="wait">

                    {/* ── SCANNER TAB ─────────────────────────────────────────── */}
                    {activeTab === 'scanner' && (
                        <motion.div
                            key="scanner"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="p-4 space-y-5"
                        >
                            {/* Viewfinder */}
                            <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800">
                                <div className="flex items-center justify-between mb-4">
                                    <p className="text-slate-300 text-sm font-bold flex items-center gap-2">
                                        <ScanLine size={15} className="text-amber-400" />
                                        Point camera at agent's QR
                                    </p>
                                    <button
                                        id="toggle-scanner-btn"
                                        onClick={() => setScannerActive(p => !p)}
                                        className={clsx(
                                            'text-xs px-3 py-1 rounded-lg font-bold transition-colors',
                                            scannerActive
                                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                                : 'bg-slate-700 text-slate-400'
                                        )}
                                    >
                                        {scannerActive ? 'Active' : 'Paused'}
                                    </button>
                                </div>
                                <ScannerFrame active={scannerActive} />
                                <p className="text-center text-slate-600 text-xs mt-4">
                                    Camera integration requires HTTPS + device permission
                                </p>
                            </div>

                            {/* Manual token paste */}
                            <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
                                <p className="text-slate-300 text-sm font-bold mb-3 flex items-center gap-2">
                                    <ShieldCheck size={15} className="text-amber-400" />
                                    Manual Token Verification
                                </p>
                                <p className="text-slate-500 text-xs mb-3">
                                    Paste the agent's QR token (JWT) to verify without camera:
                                </p>
                                <textarea
                                    id="paste-token-input"
                                    value={pastedToken}
                                    onChange={e => { setPastedToken(e.target.value); setTokenResult(null); }}
                                    placeholder="Paste JWT token here..."
                                    rows={3}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 resize-none"
                                />

                                <button
                                    id="verify-token-btn"
                                    onClick={handleTokenVerify}
                                    disabled={!pastedToken.trim() || verifyingToken}
                                    className="mt-3 w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
                                >
                                    {verifyingToken ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
                                    {verifyingToken ? 'Verifying...' : 'Verify Token & Mark Present'}
                                </button>

                                {/* Token result */}
                                <AnimatePresence>
                                    {tokenResult && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className={clsx(
                                                'mt-3 rounded-xl p-3 border text-xs',
                                                tokenResult.ok
                                                    ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                                                    : 'bg-red-950/60 border-red-800 text-red-300'
                                            )}
                                        >
                                            {tokenResult.ok ? (
                                                <div>
                                                    <p className="font-bold flex items-center gap-1.5 mb-1">
                                                        <CheckCircle2 size={13} /> Valid Token ✓
                                                    </p>
                                                    <p><span className="text-slate-400">Agent:</span> {tokenResult.payload?.name}</p>
                                                    <p><span className="text-slate-400">Tier:</span> {tokenResult.payload?.tier}</p>
                                                    <p className="text-emerald-500 mt-1 font-bold">Lead access unlocked.</p>
                                                </div>
                                            ) : (
                                                <p className="flex items-start gap-1.5">
                                                    <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" />
                                                    {tokenResult.msg}
                                                </p>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    )}

                    {/* ── ROSTER TAB ──────────────────────────────────────────── */}
                    {activeTab === 'roster' && (
                        <motion.div
                            key="roster"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="p-4 space-y-4"
                        >
                            {/* Search + filter */}
                            <div className="space-y-3">
                                <div className="relative">
                                    <Search size={14} className="absolute left-3 top-3 text-slate-500" />
                                    <input
                                        id="agent-search-input"
                                        type="text"
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                        placeholder="Search agents or branches..."
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                                    />
                                </div>

                                <div className="flex gap-2">
                                    <ListFilter size={14} className="text-slate-500 self-center" />
                                    {([
                                        { id: 'pending', label: `Pending (${pendingCount})` },
                                        { id: 'present', label: `Present (${presentCount})` },
                                        { id: 'all', label: 'All' },
                                    ] as { id: FilterId; label: string }[]).map(f => (
                                        <button
                                            key={f.id}
                                            id={`filter-${f.id}`}
                                            onClick={() => setFilter(f.id)}
                                            className={clsx(
                                                'flex-1 py-1.5 rounded-lg text-xs font-bold transition-all',
                                                filter === f.id
                                                    ? 'bg-amber-500 text-white'
                                                    : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                                            )}
                                        >
                                            {f.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Progress bar */}
                            {agents.length > 0 && (
                                <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
                                    <div className="flex justify-between text-xs mb-2">
                                        <span className="text-slate-400 font-bold">Check-in Progress</span>
                                        <span className="text-white font-bold">
                                            {presentCount} / {agents.filter(a => a.managerApproved).length}
                                        </span>
                                    </div>
                                    <div className="h-2.5 bg-slate-700 rounded-full overflow-hidden">
                                        <motion.div
                                            className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full"
                                            initial={{ width: 0 }}
                                            animate={{
                                                width: agents.filter(a => a.managerApproved).length > 0
                                                    ? `${(presentCount / agents.filter(a => a.managerApproved).length) * 100}%`
                                                    : '0%'
                                            }}
                                            transition={{ duration: 0.6, ease: 'easeOut' }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Agent cards */}
                            <div className="space-y-2">
                                <AnimatePresence>
                                    {filteredAgents.map(agent => (
                                        <AgentRosterCard
                                            key={agent.agentId}
                                            agent={agent}
                                            onVerify={handleVerify}
                                            verifying={verifyingId === agent.agentId}
                                        />
                                    ))}
                                </AnimatePresence>

                                {filteredAgents.length === 0 && (
                                    <div className="text-center py-10">
                                        <Clock size={28} className="mx-auto text-slate-700 mb-3" />
                                        <p className="text-slate-500 text-sm">
                                            {filter === 'pending' ? 'All agents checked in!' : 'No agents to show'}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>

            {/* Success toast */}
            <AnimatePresence>
                {successAgent && (
                    <VerifySuccessToast
                        agent={successAgent}
                        onDismiss={() => setSuccessAgent(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
