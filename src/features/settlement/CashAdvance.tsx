/**
 * CashAdvance.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * COMMISSION ADVANCE REQUEST MODULE — Settlement Engine Extension
 *
 * Two views in one file:
 *
 *  1. <AgentAdvanceView>   — Agent's personal settlement card.
 *     Shows locked commission balance. If balance > 0 AED, renders a
 *     "Request Commission Advance" button and slider (up to 50% of payout).
 *     Submits request to Firestore: events/{eventId}/advance_requests/{id}
 *
 *  2. <ManagerAdvanceQueue> — Branch Manager financial queue.
 *     Real-time list of all pending requests. Manager can see the 2%
 *     advance fee, net draw amount, and click [Approve Draw] or [Decline].
 *     Approved → status:'approved', writes approvedAt + feeAed to doc.
 *
 *  3. <CashAdvancePage>    — Tabbed wrapper (default export, route /cash-advance)
 *     Switches between Agent view and Manager queue based on role prop.
 *
 * Firestore paths:
 *   events/{eventId}/advance_requests/{requestId}
 *     agentId, agentName, agentBranch, agentTier
 *     lockedCommission, requestedAmount, feeAed, netDrawAed
 *     status: 'pending' | 'approved' | 'declined'
 *     requestedAt (serverTimestamp), approvedAt?, declinedAt?
 *     approvedBy?, declinedBy?, declineReason?
 *     eventId, eventName
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    Wallet, Zap, CheckCircle2, X, Loader2, Clock,
    AlertTriangle, ChevronRight, TrendingUp, DollarSign,
    Shield, User, Building2, Star, BadgeCheck,
    FileText, AlertCircle, Percent, ArrowRight, Lock,
    ThumbsDown, ClipboardList,
} from 'lucide-react';
import {
    addDoc, collection, doc, onSnapshot, orderBy,
    query, serverTimestamp, updateDoc, Unsubscribe, where,
} from 'firebase/firestore';
import { db } from '../../services/firebase/firebaseConfig';

// ═══════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════

export type AdvanceStatus = 'pending' | 'approved' | 'declined';
export type AgentTier = 'gold' | 'silver' | 'bronze';

export interface AdvanceRequest {
    id: string;
    agentId: string;
    agentName: string;
    agentBranch: string;
    agentTier: AgentTier;
    lockedCommission: number;   // AED — total earned, not yet paid
    requestedAmount: number;    // AED — what agent wants upfront (≤ 50%)
    feeAed: number;             // AED — 2% advance fee
    netDrawAed: number;         // requestedAmount − feeAed
    status: AdvanceStatus;
    requestedAt: string;
    approvedAt?: string;
    declinedAt?: string;
    approvedBy?: string;
    declinedBy?: string;
    declineReason?: string;
    eventId: string;
    eventName: string;
}

// ═══════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════

const ADVANCE_FEE_PCT = 0.02;          // 2% fee on requested amount
const MAX_ADVANCE_PCT = 0.50;          // cap at 50% of locked commission

const TIER_LABELS: Record<AgentTier, { label: string; color: string; bg: string; ring: string }> = {
    gold: { label: 'Gold', color: 'text-amber-400', bg: 'bg-amber-500/15', ring: 'ring-amber-500/30' },
    silver: { label: 'Silver', color: 'text-psi-secondary', bg: 'bg-psi-subtle', ring: 'ring-slate-400/25' },
    bronze: { label: 'Bronze', color: 'text-orange-400', bg: 'bg-orange-500/15', ring: 'ring-orange-500/25' },
};

const STATUS_CONFIG: Record<AdvanceStatus, { label: string; color: string; bg: string; ring: string; dot: string }> = {
    pending: { label: 'Pending Review', color: 'text-amber-400', bg: 'bg-amber-500/10', ring: 'ring-amber-500/25', dot: 'bg-amber-500 animate-pulse' },
    approved: { label: 'Approved', color: 'text-emerald-400', bg: 'bg-emerald-500/10', ring: 'ring-emerald-500/25', dot: 'bg-emerald-500' },
    declined: { label: 'Declined', color: 'text-rose-400', bg: 'bg-rose-500/10', ring: 'ring-rose-500/25', dot: 'bg-rose-500' },
};

// ═══════════════════════════════════════════════════════════════════
// Demo seed
// ═══════════════════════════════════════════════════════════════════

const DEMO_REQUESTS: AdvanceRequest[] = [
    {
        id: 'adv_001', agentId: 'a1', agentName: 'Sara Al-Marzouqi', agentBranch: 'Business Bay',
        agentTier: 'silver', lockedCommission: 28_400, requestedAmount: 14_200,
        feeAed: 284, netDrawAed: 13_916, status: 'pending',
        requestedAt: new Date(Date.now() - 1.5 * 3600000).toISOString(),
        eventId: 'event_demo', eventName: 'London Luxury Expo 2026',
    },
    {
        id: 'adv_002', agentId: 'a2', agentName: 'Omar Bin Rashid', agentBranch: 'Palm Jumeirah',
        agentTier: 'gold', lockedCommission: 55_000, requestedAmount: 27_500,
        feeAed: 550, netDrawAed: 26_950, status: 'pending',
        requestedAt: new Date(Date.now() - 3 * 3600000).toISOString(),
        eventId: 'event_demo', eventName: 'London Luxury Expo 2026',
    },
    {
        id: 'adv_003', agentId: 'a3', agentName: 'Nour Al-Hamdan', agentBranch: 'Downtown',
        agentTier: 'gold', lockedCommission: 68_200, requestedAmount: 30_000,
        feeAed: 600, netDrawAed: 29_400, status: 'approved',
        requestedAt: new Date(Date.now() - 8 * 3600000).toISOString(),
        approvedAt: new Date(Date.now() - 4 * 3600000).toISOString(),
        approvedBy: 'Mohammed Al-Qubaisi',
        eventId: 'event_demo', eventName: 'London Luxury Expo 2026',
    },
    {
        id: 'adv_004', agentId: 'a4', agentName: 'Yuki Tanaka', agentBranch: 'JBR',
        agentTier: 'silver', lockedCommission: 12_000, requestedAmount: 6_000,
        feeAed: 120, netDrawAed: 5_880, status: 'declined',
        requestedAt: new Date(Date.now() - 12 * 3600000).toISOString(),
        declinedAt: new Date(Date.now() - 10 * 3600000).toISOString(),
        declinedBy: 'Mohammed Al-Qubaisi',
        declineReason: 'Insufficient settlement period — please reapply post-final audit.',
        eventId: 'event_demo', eventName: 'London Luxury Expo 2026',
    },
];

// ═══════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════

const fmt = (n: number) => 'AED ' + n.toLocaleString('en-AE', { maximumFractionDigits: 0 });
const fmtPct = (n: number) => (n * 100).toFixed(1) + '%';
function timeAgo(iso?: string) {
    if (!iso) return '—';
    const s = (Date.now() - new Date(iso).getTime()) / 1000;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
}

// ═══════════════════════════════════════════════════════════════════
// Shared UI atoms
// ═══════════════════════════════════════════════════════════════════

function TierBadge({ tier }: { tier: AgentTier }) {
    const c = TIER_LABELS[tier];
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ring-1 ${c.bg} ${c.color} ${c.ring}`}>
            <Star size={8} />{c.label}
        </span>
    );
}

function StatusBadge({ status }: { status: AdvanceStatus }) {
    const c = STATUS_CONFIG[status];
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ring-1 ${c.bg} ${c.color} ${c.ring}`}>
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.dot}`} />
            {c.label}
        </span>
    );
}

function KPITile({ label, value, sub, icon, accent }: {
    label: string; value: string; sub?: string;
    icon: React.ReactNode; accent: 'amber' | 'emerald' | 'violet' | 'rose';
}) {
    const colors: Record<string, string> = {
        amber: 'text-amber-400 bg-amber-500/10 ring-amber-500/20',
        emerald: 'text-emerald-400 bg-emerald-500/10 ring-emerald-500/20',
        violet: 'text-violet-400 bg-violet-500/10 ring-violet-500/20',
        rose: 'text-rose-400 bg-rose-500/10 ring-rose-500/20',
    };
    const iconColors: Record<string, string> = {
        amber: 'text-amber-400', emerald: 'text-emerald-400',
        violet: 'text-violet-400', rose: 'text-rose-400',
    };
    return (
        <div className={`rounded-2xl p-4 ring-1 ${colors[accent]}`}>
            <div className={`w-8 h-8 rounded-xl ${colors[accent]} flex items-center justify-center mb-3 ring-1 ${colors[accent]}`}>
                <span className={iconColors[accent]}>{icon}</span>
            </div>
            <p className="text-psi-primary font-extrabold text-xl font-mono">{value}</p>
            <p className="text-psi-muted text-[10px] font-bold uppercase tracking-widest mt-0.5">{label}</p>
            {sub && <p className="text-psi-muted text-[9px] mt-0.5">{sub}</p>}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════
// Agent Advance View
// ═══════════════════════════════════════════════════════════════════

export interface AgentAdvanceViewProps {
    eventId?: string;
    eventName?: string;
    agentId?: string;
    agentName?: string;
    agentBranch?: string;
    agentTier?: AgentTier;
    /** AED commission locked in this settlement cycle */
    lockedCommission?: number;
}

type RequestPhase = 'idle' | 'submitting' | 'submitted' | 'error';

export function AgentAdvanceView({
    eventId = 'event_demo',
    eventName = 'London Luxury Expo 2026',
    agentId = 'agent_demo_001',
    agentName = 'Khalid Al-Mansouri',
    agentBranch = 'Dubai Marina',
    agentTier = 'gold',
    lockedCommission = 42_600,
}: AgentAdvanceViewProps) {
    const maxAdvance = Math.floor(lockedCommission * MAX_ADVANCE_PCT);
    const [requestedAmount, setRequestedAmount] = useState(Math.floor(maxAdvance * 0.5));
    const [phase, setPhase] = useState<RequestPhase>('idle');
    const [existingRequest, setExistingRequest] = useState<AdvanceRequest | null>(null);
    const [showForm, setShowForm] = useState(false);

    const feeAed = Math.round(requestedAmount * ADVANCE_FEE_PCT);
    const netDrawAed = requestedAmount - feeAed;

    // Watch for existing request by this agent
    useEffect(() => {
        const unsub: Unsubscribe = onSnapshot(
            query(
                collection(db, 'events', eventId, 'advance_requests'),
                where('agentId', '==', agentId),
                orderBy('requestedAt', 'desc'),
            ),
            snap => {
                const live = snap.docs.map(d => ({ id: d.id, ...d.data() } as AdvanceRequest));
                const pending = live.find(r => r.status === 'pending' || r.status === 'approved');
                setExistingRequest(pending ?? live[0] ?? null);
            },
            () => { /* Firestore unavailable */ }
        );
        return () => unsub();
    }, [eventId, agentId]);

    const handleSubmit = async () => {
        if (requestedAmount <= 0) return;
        setPhase('submitting');
        try {
            await addDoc(collection(db, 'events', eventId, 'advance_requests'), {
                agentId, agentName, agentBranch, agentTier,
                lockedCommission, requestedAmount,
                feeAed, netDrawAed,
                status: 'pending',
                requestedAt: new Date().toISOString(),
                _requestedAt: serverTimestamp(),
                eventId, eventName,
            });
            setPhase('submitted');
            setShowForm(false);
        } catch (err) {
            console.error('[CashAdvance] Submit error:', err);
            setPhase('error');
        }
    };

    if (lockedCommission <= 0) return null;

    return (
        <div className="space-y-5">

            {/* Locked commission banner */}
            <div className="relative overflow-hidden rounded-3xl psi-card p-6">
                {/* Top accent bar */}
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500" />

                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Lock size={12} className="text-amber-400" />
                            <span className="text-amber-400 text-[10px] font-black uppercase tracking-[0.25em]">Locked Commission</span>
                        </div>
                        <p className="text-4xl font-extrabold text-psi-primary font-mono mb-1">{fmt(lockedCommission)}</p>
                        <p className="text-psi-muted text-xs">{eventName} · Pending final settlement</p>
                        <div className="mt-2">
                            <TierBadge tier={agentTier} />
                        </div>
                    </div>

                    {/* Max advance callout */}
                    <div className="bg-psi-subtle border border-psi rounded-2xl px-5 py-4 text-right">
                        <p className="text-psi-muted text-[10px] font-bold uppercase tracking-widest mb-1">Max Advance (50%)</p>
                        <p className="text-emerald-400 font-extrabold text-2xl font-mono">{fmt(maxAdvance)}</p>
                        <p className="text-psi-muted text-[9px] mt-0.5">After 2% fee: {fmt(Math.round(maxAdvance * 0.98))}</p>
                    </div>
                </div>

                {/* Progress bar: remaining after max advance */}
                <div className="mt-5">
                    <div className="flex justify-between text-[9px] text-psi-muted mb-1">
                        <span>Advanceable (50%)</span>
                        <span>Held until settlement (50%)</span>
                    </div>
                    <div className="h-2 bg-psi-subtle rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full" style={{ width: '50%' }} />
                    </div>
                </div>
            </div>

            {/* Existing request status */}
            {existingRequest && !showForm && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className={`rounded-2xl p-5 ring-1 ${STATUS_CONFIG[existingRequest.status].bg} ${STATUS_CONFIG[existingRequest.status].ring}`}>
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <StatusBadge status={existingRequest.status} />
                            <p className="text-psi-primary font-extrabold mt-2">{fmt(existingRequest.requestedAmount)} advance requested</p>
                            <p className="text-psi-muted text-xs mt-0.5">
                                Fee: {fmt(existingRequest.feeAed)} · Net draw: {fmt(existingRequest.netDrawAed)}
                            </p>
                            <p className="text-psi-muted text-[10px] mt-1.5">{timeAgo(existingRequest.requestedAt)}</p>
                            {existingRequest.status === 'declined' && existingRequest.declineReason && (
                                <div className="mt-3 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2">
                                    <p className="text-rose-400 text-xs italic">"{existingRequest.declineReason}"</p>
                                    <p className="text-rose-400/50 text-[9px] mt-1">— {existingRequest.declinedBy}</p>
                                </div>
                            )}
                            {existingRequest.status === 'approved' && (
                                <div className="mt-3 flex items-center gap-2">
                                    <BadgeCheck size={14} className="text-emerald-400" />
                                    <p className="text-emerald-400 text-xs font-bold">Approved by {existingRequest.approvedBy} · {timeAgo(existingRequest.approvedAt)}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Request form */}
            <AnimatePresence>
                {showForm && (
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                        className="rounded-3xl psi-card p-6 space-y-6">

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Zap size={14} className="text-emerald-400" />
                                <p className="text-psi-primary font-extrabold text-sm">Configure Advance Request</p>
                            </div>
                            <button onClick={() => setShowForm(false)}
                                className="w-7 h-7 rounded-lg bg-psi-subtle border border-psi flex items-center justify-center text-psi-muted hover:text-psi-primary transition-all">
                                <X size={12} />
                            </button>
                        </div>

                        {/* Slider */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-psi-secondary text-xs font-bold">Advance Amount</span>
                                <span className="text-psi-primary font-extrabold text-lg font-mono">{fmt(requestedAmount)}</span>
                            </div>
                            <input
                                id="advance-slider"
                                type="range"
                                min={1000}
                                max={maxAdvance}
                                step={500}
                                value={requestedAmount}
                                onChange={e => setRequestedAmount(Number(e.target.value))}
                                className="w-full accent-emerald-500 cursor-pointer"
                            />
                            <div className="flex justify-between text-[9px] text-psi-muted mt-1">
                                <span>AED 1,000</span>
                                <span>Max {fmt(maxAdvance)}</span>
                            </div>
                        </div>

                        {/* Breakdown */}
                        <div className="space-y-2">
                            {[
                                { label: 'Advance Requested', value: fmt(requestedAmount), color: 'text-psi-primary' },
                                { label: 'Advance Fee (2%)', value: '− ' + fmt(feeAed), color: 'text-rose-400' },
                                { label: 'Net Amount Received', value: fmt(netDrawAed), color: 'text-emerald-400' },
                                { label: 'Held to Settlement', value: fmt(lockedCommission - requestedAmount), color: 'text-psi-muted' },
                            ].map(({ label, value, color }) => (
                                <div key={label} className="flex items-center justify-between py-1.5 border-b border-psi last:border-0">
                                    <span className="text-psi-muted text-xs">{label}</span>
                                    <span className={`font-extrabold text-sm font-mono ${color}`}>{value}</span>
                                </div>
                            ))}
                        </div>

                        {/* Disclaimer */}
                        <div className="flex items-start gap-2.5 bg-amber-500/8 border border-amber-500/20 rounded-xl p-3">
                            <AlertTriangle size={13} className="text-amber-400 flex-shrink-0 mt-0.5" />
                            <p className="text-amber-400/80 text-xs leading-relaxed">
                                The 2% advance fee ({fmt(feeAed)}) will be deducted from your final settlement payout. By submitting, you acknowledge this deduction.
                            </p>
                        </div>

                        {/* Submit */}
                        <motion.button
                            id="submit-advance-btn"
                            whileTap={{ scale: 0.97 }}
                            onClick={handleSubmit}
                            disabled={phase === 'submitting' || requestedAmount <= 0}
                            className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-extrabold text-base shadow-xl shadow-emerald-600/20 disabled:opacity-40 transition-all"
                        >
                            {phase === 'submitting'
                                ? <><Loader2 size={16} className="animate-spin" /> Submitting…</>
                                : <><Zap size={16} /> Request {fmt(netDrawAed)} Advance</>
                            }
                        </motion.button>

                        {phase === 'error' && (
                            <p className="text-rose-400 text-xs flex items-center gap-1 justify-center">
                                <AlertCircle size={12} /> Submission failed — please try again.
                            </p>
                        )}
                        {phase === 'submitted' && (
                            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                className="text-emerald-400 text-xs flex items-center gap-1 justify-center font-bold">
                                <CheckCircle2 size={12} /> Request submitted! Your manager will review shortly.
                            </motion.p>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Primary CTA */}
            {!showForm && !existingRequest?.status && (
                <motion.button
                    id="request-advance-btn"
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setShowForm(true)}
                    className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-extrabold text-base shadow-xl shadow-emerald-600/20 hover:from-emerald-500 hover:to-teal-500 transition-all"
                >
                    <Wallet size={18} /> Request Commission Advance
                </motion.button>
            )}
            {!showForm && existingRequest && existingRequest.status === 'declined' && (
                <motion.button
                    id="request-advance-btn-retry"
                    whileTap={{ scale: 0.97 }}
                    onClick={() => { setShowForm(true); setPhase('idle'); }}
                    className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl bg-psi-subtle border border-psi text-psi-primary font-bold text-sm transition-all hover:bg-psi-border"
                >
                    <Zap size={15} /> Submit New Request
                </motion.button>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════
// Manager Advance Queue
// ═══════════════════════════════════════════════════════════════════

export interface ManagerAdvanceQueueProps {
    eventId?: string;
    managerName?: string;
}

type ActionPhase = Record<string, 'approving' | 'declining' | 'done'>;

export function ManagerAdvanceQueue({
    eventId = 'event_demo',
    managerName = 'Mohammed Al-Qubaisi',
}: ManagerAdvanceQueueProps) {
    const [requests, setRequests] = useState<AdvanceRequest[]>(DEMO_REQUESTS);
    const [actionPhase, setActionPhase] = useState<ActionPhase>({});
    const [declineId, setDeclineId] = useState<string | null>(null);
    const [declineReason, setDeclineReason] = useState('');
    const [filterStatus, setFilterStatus] = useState<AdvanceStatus | 'all'>('all');

    // Real-time listener
    useEffect(() => {
        const unsub: Unsubscribe = onSnapshot(
            query(
                collection(db, 'events', eventId, 'advance_requests'),
                orderBy('requestedAt', 'desc'),
            ),
            snap => {
                if (!snap.empty)
                    setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() } as AdvanceRequest)));
            },
            () => { /* use demo data */ }
        );
        return () => unsub();
    }, [eventId]);

    const setPhase = (id: string, p: 'approving' | 'declining' | 'done') =>
        setActionPhase(prev => ({ ...prev, [id]: p }));

    const handleApprove = async (req: AdvanceRequest) => {
        setPhase(req.id, 'approving');
        try {
            await updateDoc(doc(db, 'events', eventId, 'advance_requests', req.id), {
                status: 'approved',
                approvedAt: new Date().toISOString(),
                _approvedAt: serverTimestamp(),
                approvedBy: managerName,
            });
            setRequests(prev => prev.map(r => r.id === req.id
                ? { ...r, status: 'approved', approvedAt: new Date().toISOString(), approvedBy: managerName }
                : r
            ));
        } catch (e) { console.error('[CashAdvance] Approve error:', e); }
        finally { setPhase(req.id, 'done'); }
    };

    const handleDecline = async (req: AdvanceRequest) => {
        setPhase(req.id, 'declining');
        try {
            await updateDoc(doc(db, 'events', eventId, 'advance_requests', req.id), {
                status: 'declined',
                declinedAt: new Date().toISOString(),
                _declinedAt: serverTimestamp(),
                declinedBy: managerName,
                declineReason: declineReason.trim() || 'Request declined by manager.',
            });
            setRequests(prev => prev.map(r => r.id === req.id
                ? { ...r, status: 'declined', declinedBy: managerName, declineReason }
                : r
            ));
            setDeclineId(null);
            setDeclineReason('');
        } catch (e) { console.error('[CashAdvance] Decline error:', e); }
        finally { setPhase(req.id, 'done'); }
    };

    const filtered = requests.filter(r => filterStatus === 'all' || r.status === filterStatus);
    const pendingCount = requests.filter(r => r.status === 'pending').length;
    const totalPending = requests.filter(r => r.status === 'pending').reduce((s, r) => s + r.netDrawAed, 0);
    const totalApproved = requests.filter(r => r.status === 'approved').reduce((s, r) => s + r.netDrawAed, 0);

    return (
        <div className="space-y-6">

            {/* Manager KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KPITile label="Pending Requests" value={String(pendingCount)} sub="awaiting your review" icon={<ClipboardList size={16} />} accent="amber" />
                <KPITile label="Pending Draw (AED)" value={fmt(totalPending).replace('AED ', '')} sub="total net draw to approve" icon={<DollarSign size={16} />} accent="violet" />
                <KPITile label="Approved (AED)" value={fmt(totalApproved).replace('AED ', '')} sub="disbursed this cycle" icon={<CheckCircle2 size={16} />} accent="emerald" />
                <KPITile label="Advance Fee Rate" value={fmtPct(ADVANCE_FEE_PCT)} sub="standard PSI rate" icon={<Percent size={16} />} accent="amber" />
            </div>

            {/* Filter pills */}
            <div className="flex gap-2 overflow-x-auto pb-1">
                {(['all', 'pending', 'approved', 'declined'] as const).map(s => (
                    <button key={s} id={`queue-filter-${s}`}
                        onClick={() => setFilterStatus(s)}
                        className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${filterStatus === s
                            ? 'bg-indigo-600 text-white'
                            : 'bg-psi-subtle text-psi-muted hover:text-psi-primary'
                            }`}
                    >
                        {s === 'all' ? `All (${requests.length})` : `${s} (${requests.filter(r => r.status === s).length})`}
                    </button>
                ))}
            </div>

            {/* Request cards */}
            <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                    {filtered.map(req => {
                        const isActing = actionPhase[req.id];
                        return (
                            <motion.div key={req.id} layout
                                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                                className={`rounded-3xl border ${req.status === 'pending'
                                    ? 'bg-psi-subtle border-psi'
                                    : req.status === 'approved'
                                        ? 'bg-emerald-500/5 border-emerald-500/20'
                                        : 'bg-rose-500/4 border-rose-500/15'
                                    } overflow-hidden`}
                            >
                                {/* Card header */}
                                <div className="px-5 py-4 flex items-start justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        {/* Avatar */}
                                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white font-black text-base flex-shrink-0">
                                            {req.agentName.split(' ').map(w => w[0]).slice(0, 2).join('')}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-psi-primary font-extrabold">{req.agentName}</span>
                                                <TierBadge tier={req.agentTier} />
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <Building2 size={10} className="text-psi-muted" />
                                                <span className="text-psi-primary/35 text-[10px]">{req.agentBranch}</span>
                                                <span className="text-psi-primary/15">·</span>
                                                <Clock size={10} className="text-psi-muted" />
                                                <span className="text-psi-primary/35 text-[10px]">{timeAgo(req.requestedAt)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <StatusBadge status={req.status} />
                                </div>

                                {/* Financial breakdown */}
                                <div className="px-5 pb-4">
                                    <div className="grid grid-cols-3 gap-3 mb-4">
                                        {[
                                            { label: 'Locked Commission', value: fmt(req.lockedCommission), color: 'text-psi-primary' },
                                            { label: 'Amount Requested', value: fmt(req.requestedAmount), color: 'text-amber-400' },
                                            { label: 'Net Draw (after 2% fee)', value: fmt(req.netDrawAed), color: 'text-emerald-400' },
                                        ].map(({ label, value, color }) => (
                                            <div key={label} className="bg-psi-subtle rounded-xl p-3 border border-psi">
                                                <p className={`font-extrabold text-sm font-mono ${color}`}>{value}</p>
                                                <p className="text-psi-muted text-[9px] mt-0.5 leading-tight">{label}</p>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Fee highlight */}
                                    <div className="flex items-center justify-between px-3 py-2 bg-psi-subtle border border-psi rounded-xl mb-4">
                                        <div className="flex items-center gap-2">
                                            <Percent size={11} className="text-rose-400" />
                                            <span className="text-psi-muted text-xs">Advance Fee (2%)</span>
                                        </div>
                                        <span className="text-rose-400 font-extrabold text-sm font-mono">− {fmt(req.feeAed)}</span>
                                    </div>

                                    {/* Decline reason input */}
                                    {declineId === req.id && (
                                        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
                                            <label className="block text-[10px] font-bold uppercase tracking-widest text-psi-muted mb-1.5">
                                                Decline Reason (optional)
                                            </label>
                                            <textarea
                                                id={`decline-reason-${req.id}`}
                                                value={declineReason} onChange={e => setDeclineReason(e.target.value)}
                                                rows={2} placeholder="e.g. Pending final audit completion…"
                                                className="w-full bg-psi-subtle border border-rose-500/30 rounded-xl px-3 py-2.5 text-psi-primary text-xs leading-relaxed focus:outline-none focus:border-rose-500/60 resize-none"
                                            />
                                        </motion.div>
                                    )}

                                    {/* Status messages */}
                                    {req.status === 'approved' && (
                                        <div className="flex items-center gap-2 mb-4">
                                            <BadgeCheck size={14} className="text-emerald-400" />
                                            <p className="text-emerald-400/80 text-xs">Approved by {req.approvedBy} · {timeAgo(req.approvedAt)}</p>
                                        </div>
                                    )}
                                    {req.status === 'declined' && req.declineReason && (
                                        <div className="bg-rose-500/8 border border-rose-500/20 rounded-xl px-3 py-2.5 mb-4">
                                            <p className="text-rose-400 text-xs italic">"{req.declineReason}"</p>
                                            <p className="text-rose-400/40 text-[9px] mt-1">— {req.declinedBy}</p>
                                        </div>
                                    )}

                                    {/* Actions — only for pending */}
                                    {req.status === 'pending' && (
                                        <div className="flex gap-2">
                                            {declineId === req.id ? (
                                                <>
                                                    <button id={`confirm-decline-${req.id}`}
                                                        onClick={() => handleDecline(req)}
                                                        disabled={!!isActing}
                                                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-sm disabled:opacity-50 transition-all"
                                                    >
                                                        {isActing === 'declining' ? <Loader2 size={14} className="animate-spin" /> : <ThumbsDown size={14} />}
                                                        Confirm Decline
                                                    </button>
                                                    <button onClick={() => setDeclineId(null)}
                                                        className="px-4 rounded-xl bg-psi-subtle border border-psi text-psi-secondary hover:text-psi-primary transition-all">
                                                        Cancel
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    {/* Approve Draw */}
                                                    <motion.button
                                                        id={`approve-draw-${req.id}`}
                                                        whileTap={{ scale: 0.97 }}
                                                        onClick={() => handleApprove(req)}
                                                        disabled={!!isActing}
                                                        className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-extrabold text-sm shadow-lg shadow-emerald-600/20 disabled:opacity-40 transition-all"
                                                    >
                                                        {isActing === 'approving'
                                                            ? <><Loader2 size={14} className="animate-spin" /> Processing…</>
                                                            : <><CheckCircle2 size={14} /> Approve Draw — {fmt(req.netDrawAed)}</>
                                                        }
                                                    </motion.button>

                                                    {/* Decline */}
                                                    <button
                                                        id={`decline-btn-${req.id}`}
                                                        onClick={() => setDeclineId(req.id)}
                                                        className="px-4 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 hover:bg-rose-500/20 transition-all font-bold text-sm"
                                                    >
                                                        <X size={15} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>

                {filtered.length === 0 && (
                    <div className="text-center py-16 text-psi-primary/15">
                        <ClipboardList size={32} className="mx-auto mb-3 opacity-30" />
                        <p className="text-sm">No requests in this view</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════
// CashAdvancePage — tabbed wrapper (default export)
// ═══════════════════════════════════════════════════════════════════

type ViewRole = 'agent' | 'manager';

export default function CashAdvancePage({
    eventId = 'event_demo',
    eventName = 'London Luxury Expo 2026',
    defaultRole = 'agent' as ViewRole,
}: {
    eventId?: string;
    eventName?: string;
    defaultRole?: ViewRole;
}) {
    const [role, setRole] = useState<ViewRole>(defaultRole);

    return (
        <div className="min-h-screen bg-psi-page text-psi-primary">

            {/* Header */}
            <header className="border-b border-psi px-5 py-4">
                <div className="flex items-center gap-2 mb-0.5">
                    <div className="w-6 h-6 rounded-lg bg-emerald-600 flex items-center justify-center">
                        <Wallet size={13} className="text-white" />
                    </div>
                    <span className="text-emerald-400 text-[10px] font-black uppercase tracking-[0.25em]">Settlement Engine</span>
                </div>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                        <h1 className="text-psi-primary text-xl font-extrabold">Commission Advance</h1>
                        <p className="text-psi-muted text-xs mt-0.5">{eventName} · Advance at 2% fee · 50% cap</p>
                    </div>

                    {/* Role switcher */}
                    <div className="flex bg-psi-subtle border border-psi rounded-xl p-1 gap-1">
                        {(['agent', 'manager'] as const).map(r => (
                            <button key={r} id={`role-tab-${r}`}
                                onClick={() => setRole(r)}
                                className={`px-4 py-2 rounded-lg text-xs font-extrabold uppercase tracking-wider transition-all ${role === r
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : 'text-psi-muted hover:text-psi-primary'
                                    }`}
                            >
                                {r === 'agent' ? <><User size={10} className="inline mr-1" />Agent View</> : <><Shield size={10} className="inline mr-1" />Manager Queue</>}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            {/* Body */}
            <div className="max-w-4xl mx-auto px-4 md:px-6 py-8">
                <AnimatePresence mode="wait">
                    {role === 'agent' ? (
                        <motion.div key="agent" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                            {/* Info strip */}
                            <div className="flex items-center gap-3 bg-emerald-500/8 border border-emerald-500/20 rounded-2xl px-4 py-3 mb-6">
                                <Shield size={14} className="text-emerald-400 flex-shrink-0" />
                                <p className="text-emerald-400/80 text-xs leading-relaxed">
                                    You can request up to <strong className="text-emerald-400">50%</strong> of your locked commission upfront. A standard <strong className="text-emerald-400">2% advance fee</strong> will be deducted from your final settlement payout.
                                </p>
                            </div>
                            <AgentAdvanceView
                                eventId={eventId}
                                eventName={eventName}
                                agentId="agent_demo_001"
                                agentName="Khalid Al-Mansouri"
                                agentBranch="Dubai Marina"
                                agentTier="gold"
                                lockedCommission={42_600}
                            />
                        </motion.div>
                    ) : (
                        <motion.div key="manager" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                            <div className="flex items-center gap-3 bg-indigo-500/8 border border-indigo-500/20 rounded-2xl px-4 py-3 mb-6">
                                <Shield size={14} className="text-indigo-400 flex-shrink-0" />
                                <p className="text-indigo-400/80 text-xs leading-relaxed">
                                    Review advance requests from your team. The <strong className="text-indigo-400">2% fee</strong> is automatically applied. Click <strong className="text-indigo-400">Approve Draw</strong> to release the net amount to the agent.
                                </p>
                            </div>
                            <ManagerAdvanceQueue
                                eventId={eventId}
                                managerName="Mohammed Al-Qubaisi"
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
