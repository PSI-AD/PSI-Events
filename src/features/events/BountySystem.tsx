/**
 * BountySystem.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * LIVE FLOOR BOUNTY SYSTEM — Orchestration Layer
 *
 * This file is intentionally slim (~190 lines).
 * All business logic, types, and pure UI have been extracted to:
 *
 *   bounty/types.ts              — TypeScript interfaces
 *   bounty/constants.ts          — Demo data & presets
 *   bounty/utils.ts              — Pure helper functions
 *   bounty/BountyCard.tsx        — Shared bounty card + sub-components
 *   bounty/BountyAlertOverlay.tsx — Agent full-screen alert
 *
 * ── Components exported ───────────────────────────────────────────────────────
 *   <OrganizerBountyManager>    — Organizer panel: create & monitor bounties
 *   <AgentBountyView>           — Agent mobile view: claim tab + alert overlay
 *   <BountyAlertOverlay>        — Standalone animated alert (re-exported)
 *   useBountySettlementBonus()  — Hook: returns total bonus AED for a given agent
 */

import React, {
    useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    Zap, Trophy, Clock, ShieldCheck, AlertTriangle,
    CheckCircle2, XCircle, Plus, Flame, Loader2,
    Timer, Award, DollarSign, Percent, Package,
} from 'lucide-react';
import {
    collection, onSnapshot, addDoc, updateDoc, doc,
    serverTimestamp, query, where, orderBy, Unsubscribe,
} from 'firebase/firestore';
import { db } from '../../services/firebase/firebaseConfig';

// ── Sub-modules ───────────────────────────────────────────────────────────────
export type { BountyDocument, BountyStatus, IncentiveType, NewBounty } from './bounty/types';
export { BountyAlertOverlay } from './bounty/BountyAlertOverlay';
import type { BountyDocument, BountyStatus, NewBounty, IncentiveType } from './bounty/types';
import { DEMO_PROJECTS, DURATION_PRESETS, INCENTIVE_PRESETS } from './bounty/constants';
import { clsx } from './bounty/utils';
import { BountyCard, IncentiveIcon } from './bounty/BountyCard';
import { BountyAlertOverlay } from './bounty/BountyAlertOverlay';

// ── Bounty Creator Form ───────────────────────────────────────────────────────

function BountyCreatorForm({
    eventId,
    organizerName,
    onCreated,
}: {
    eventId: string;
    organizerName: string;
    onCreated: () => void;
}) {
    const [project, setProject] = useState('');
    const [customProject, setCustomProject] = useState('');
    const [incentivePreset, setIncentivePreset] = useState<typeof INCENTIVE_PRESETS[0] | null>(null);
    const [customIncentive, setCustomIncentive] = useState('');
    const [customAed, setCustomAed] = useState(0);
    const [duration, setDuration] = useState(120);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const finalProject = project === '__custom__' ? customProject.trim() : project;
    const finalIncentive = incentivePreset ? incentivePreset.label : customIncentive.trim() || '';
    const finalAed = incentivePreset ? incentivePreset.aed : customAed;
    const finalType: IncentiveType = incentivePreset ? incentivePreset.type : 'cash';
    const finalPct = incentivePreset && 'pct' in incentivePreset ? incentivePreset.pct : undefined;
    const canSubmit = finalProject.length > 0 && finalIncentive.length > 0 && duration > 0;

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        if (!canSubmit) return;
        setSaving(true);
        setError('');
        try {
            const now = new Date();
            const expiresAt = new Date(now.getTime() + duration * 60 * 1000).toISOString();
            const bountyData: NewBounty = {
                eventId, targetProject: finalProject, incentiveLabel: finalIncentive,
                incentiveAed: finalAed, incentiveType: finalType,
                commissionPctBonus: finalPct, durationMinutes: duration,
                expiresAt, issuedAt: now.toISOString(), issuedBy: organizerName,
            };
            await addDoc(
                collection(db, 'events', eventId, 'bounties'),
                { ...bountyData, _createdAt: serverTimestamp() }
            );
            onCreated();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to create bounty');
        } finally {
            setSaving(false);
        }
    }

    return (
        <form onSubmit={handleCreate} className="space-y-5">
            {/* Target Project */}
            <div>
                <label className="block text-xs font-extrabold text-psi-muted uppercase tracking-widest mb-2">Target Project</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2">
                    {DEMO_PROJECTS.map(p => (
                        <button key={p} type="button" onClick={() => setProject(p)}
                            className={clsx('px-3 py-2.5 rounded-xl text-xs font-bold border transition-all text-left leading-tight',
                                project === p ? 'bg-psi-action-subtle border-psi-action text-psi-action' : 'bg-psi-subtle border-psi text-psi-secondary hover:border-psi-strong')}>
                            {p}
                        </button>
                    ))}
                    <button type="button" onClick={() => setProject('__custom__')}
                        className={clsx('px-3 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1',
                            project === '__custom__' ? 'bg-psi-action-subtle border-psi-action text-psi-action' : 'bg-psi-subtle border-psi text-psi-muted hover:border-psi-strong')}>
                        <Plus size={12} /> Custom
                    </button>
                </div>
                {project === '__custom__' && (
                    <input type="text" value={customProject} onChange={e => setCustomProject(e.target.value)}
                        placeholder="Enter project name…" className="psi-input w-full mt-1" autoFocus />
                )}
            </div>

            {/* Incentive */}
            <div>
                <label className="block text-xs font-extrabold text-psi-muted uppercase tracking-widest mb-2">Incentive / Reward</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2">
                    {INCENTIVE_PRESETS.map(preset => (
                        <button key={preset.label} type="button"
                            onClick={() => setIncentivePreset(prev => prev?.label === preset.label ? null : preset)}
                            className={clsx('px-3 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5',
                                incentivePreset?.label === preset.label ? 'bg-psi-action-subtle border-psi-action text-psi-action' : 'bg-psi-subtle border-psi text-psi-secondary hover:border-psi-strong')}>
                            <IncentiveIcon type={preset.type} size={12} />
                            {preset.label}
                        </button>
                    ))}
                </div>
                {!incentivePreset && (
                    <div className="flex gap-2">
                        <input type="text" value={customIncentive} onChange={e => setCustomIncentive(e.target.value)}
                            placeholder="e.g. Weekend for 2 in Dubai" className="psi-input flex-1" />
                        <input type="number" value={customAed || ''} onChange={e => setCustomAed(Number(e.target.value))}
                            placeholder="AED value" min={0} className="psi-input w-28" />
                    </div>
                )}
            </div>

            {/* Duration */}
            <div>
                <label className="block text-xs font-extrabold text-psi-muted uppercase tracking-widest mb-2">Time Limit</label>
                <div className="flex gap-2">
                    {DURATION_PRESETS.map(d => (
                        <button key={d.value} type="button" onClick={() => setDuration(d.value)}
                            className={clsx('flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all',
                                duration === d.value ? 'bg-psi-action-subtle border-psi-action text-psi-action' : 'bg-psi-subtle border-psi text-psi-secondary hover:border-psi-strong')}>
                            {d.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Preview */}
            {canSubmit && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-2xl bg-emerald-500/8 border border-emerald-500/25">
                    <p className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1.5">Preview</p>
                    <p className="text-psi-primary font-bold text-sm">🎯 {finalProject}</p>
                    <p className="text-psi-secondary text-sm">Reward: <strong className="text-psi-primary">{finalIncentive}</strong></p>
                    <p className="text-psi-muted text-xs mt-1">
                        ⏱ {DURATION_PRESETS.find(d => d.value === duration)?.label || `${duration} min`} window · Issued by <strong>{organizerName}</strong>
                    </p>
                </motion.div>
            )}

            {error && (
                <p className="text-psi-error text-xs flex items-center gap-1">
                    <AlertTriangle size={12} /> {error}
                </p>
            )}

            <button type="submit" disabled={!canSubmit || saving}
                className="btn-accent w-full py-4 rounded-2xl font-extrabold text-base flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />}
                {saving ? 'Issuing Bounty…' : '🚀 Issue Live Bounty to Floor'}
            </button>
        </form>
    );
}

// ── OrganizerBountyManager ────────────────────────────────────────────────────

export function OrganizerBountyManager({
    eventId, organizerName = 'Organizer',
}: {
    eventId: string;
    organizerName?: string;
}) {
    const [bounties, setBounties] = useState<BountyDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreator, setShowCreator] = useState(false);
    const [filterStatus, setFilterStatus] = useState<BountyStatus | 'all'>('all');

    useEffect(() => {
        const unsub: Unsubscribe = onSnapshot(
            query(collection(db, 'events', eventId, 'bounties'), orderBy('_createdAt', 'desc')),
            snap => { setBounties(snap.docs.map(d => ({ id: d.id, ...d.data() } as BountyDocument))); setLoading(false); },
            err => { console.error('[BountySystem] Firestore read error:', err); setLoading(false); }
        );
        return () => unsub();
    }, [eventId]);

    const handleVerify = useCallback(async (bountyId: string) => {
        const bounty = bounties.find(b => b.id === bountyId);
        if (!bounty) return;
        try {
            await updateDoc(doc(db, 'events', eventId, 'bounties', bountyId), {
                status: 'verified', verifiedBy: organizerName,
                verifiedAt: new Date().toISOString(), bonusAed: bounty.incentiveAed,
            });
        } catch (err) { console.error('[BountySystem] Verify error:', err); }
    }, [bounties, eventId, organizerName]);

    const handleExpired = useCallback(async (bountyId: string) => {
        const bounty = bounties.find(b => b.id === bountyId);
        if (!bounty || bounty.status !== 'active') return;
        try { await updateDoc(doc(db, 'events', eventId, 'bounties', bountyId), { status: 'expired' }); } catch { }
    }, [bounties, eventId]);

    const filtered = useMemo(
        () => filterStatus === 'all' ? bounties : bounties.filter(b => b.status === filterStatus),
        [bounties, filterStatus]
    );
    const stats = useMemo(() => ({
        active: bounties.filter(b => b.status === 'active').length,
        claimed: bounties.filter(b => b.status === 'claimed').length,
        verified: bounties.filter(b => b.status === 'verified').length,
    }), [bounties]);

    const FILTERS: { key: BountyStatus | 'all'; label: string }[] = [
        { key: 'all', label: 'All' }, { key: 'active', label: 'Active' },
        { key: 'claimed', label: 'Claimed' }, { key: 'verified', label: 'Verified' },
        { key: 'expired', label: 'Expired' },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-7 h-7 bg-amber-500 rounded-lg flex items-center justify-center">
                            <Zap size={15} className="text-white fill-white" />
                        </div>
                        <span className="text-amber-600 dark:text-amber-400 text-xs font-extrabold tracking-[0.2em] uppercase">Live Floor Bounties</span>
                    </div>
                    <h2 className="text-psi-primary text-xl font-extrabold tracking-tight">Bounty Manager</h2>
                    <p className="text-psi-muted text-sm">Issue time-sensitive lead incentives to your agents on the floor.</p>
                </div>
                <button onClick={() => setShowCreator(v => !v)}
                    className={clsx('flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm select-none',
                        showCreator ? 'btn-accent-outline' : 'btn-accent')}>
                    {showCreator ? <XCircle size={16} /> : <Plus size={16} />}
                    {showCreator ? 'Cancel' : 'New Bounty'}
                </button>
            </div>

            {/* KPI strip */}
            <div className="grid grid-cols-3 gap-3">
                {[
                    { label: 'Active', value: stats.active, color: 'text-emerald-500', bg: 'bg-emerald-500/10', ring: 'ring-emerald-500/20' },
                    { label: 'Claimed', value: stats.claimed, color: 'text-amber-500', bg: 'bg-amber-500/10', ring: 'ring-amber-500/20' },
                    { label: 'Verified', value: stats.verified, color: 'text-blue-500', bg: 'bg-blue-500/10', ring: 'ring-blue-500/20' },
                ].map(({ label, value, color, bg, ring }) => (
                    <div key={label} className={clsx('psi-card rounded-2xl p-4 ring-1', ring)}>
                        <div className={clsx('w-8 h-8 rounded-xl flex items-center justify-center mb-2', bg)}>
                            <Trophy size={15} className={color} />
                        </div>
                        <p className="text-psi-muted text-[10px] font-extrabold uppercase tracking-widest">{label}</p>
                        <p className={clsx('text-2xl font-extrabold', color)}>{value}</p>
                    </div>
                ))}
            </div>

            {/* Creator form */}
            <AnimatePresence>
                {showCreator && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                        <div className="psi-card rounded-2xl p-5 ring-1 ring-amber-500/20 border-amber-500/20">
                            <h3 className="text-psi-primary font-extrabold mb-4 flex items-center gap-2">
                                <Flame size={16} className="text-orange-500" />
                                Create New Bounty
                            </h3>
                            <BountyCreatorForm eventId={eventId} organizerName={organizerName}
                                onCreated={() => setShowCreator(false)} />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Filter strip */}
            <div className="flex gap-1.5 bg-psi-subtle border border-psi p-1 rounded-2xl w-fit flex-wrap">
                {FILTERS.map(f => (
                    <button key={f.key} onClick={() => setFilterStatus(f.key)}
                        className={clsx('px-4 py-2 rounded-xl text-xs font-bold transition-all select-none',
                            filterStatus === f.key ? 'btn-accent shadow-sm' : 'text-psi-muted hover:text-psi-primary hover:bg-psi-raised')}>
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Bounty list */}
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 size={24} className="animate-spin text-psi-muted" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-16 psi-card rounded-2xl">
                    <Trophy size={36} className="mx-auto text-psi-muted mb-3 opacity-40" />
                    <p className="font-extrabold text-psi-primary">No bounties yet</p>
                    <p className="text-psi-muted text-sm mt-1">Issue the first bounty to fire up your floor agents.</p>
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <AnimatePresence mode="popLayout">
                        {filtered.map(bounty => (
                            <BountyCard key={bounty.id} bounty={bounty} viewAs="organizer"
                                onVerify={handleVerify} onExpired={handleExpired} />
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}

// ── AgentBountyView ───────────────────────────────────────────────────────────

export function AgentBountyView({
    eventId, agentId, agentName,
}: {
    eventId: string;
    agentId: string;
    agentName: string;
}) {
    const [bounties, setBounties] = useState<BountyDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [alertBounty, setAlertBounty] = useState<BountyDocument | null>(null);
    const [claiming, setClaiming] = useState<string | null>(null);
    const seenIds = useRef<Set<string>>(new Set());

    useEffect(() => {
        const unsub: Unsubscribe = onSnapshot(
            query(collection(db, 'events', eventId, 'bounties'), orderBy('_createdAt', 'desc')),
            snap => {
                const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as BountyDocument));
                setBounties(docs);
                setLoading(false);
                for (const b of docs) {
                    if (b.status === 'active' && !seenIds.current.has(b.id)) {
                        seenIds.current.add(b.id);
                        setAlertBounty(b);
                        break;
                    }
                }
            }
        );
        return () => unsub();
    }, [eventId]);

    const handleClaim = useCallback(async (bountyId: string) => {
        if (claiming) return;
        setClaiming(bountyId);
        try {
            await updateDoc(doc(db, 'events', eventId, 'bounties', bountyId), {
                status: 'claimed', claimedBy: agentId,
                claimedByName: agentName, claimedAt: new Date().toISOString(),
            });
        } catch (err) { console.error('[BountySystem] Claim error:', err); }
        finally { setClaiming(null); setAlertBounty(null); }
    }, [eventId, agentId, agentName, claiming]);

    const handleExpired = useCallback(async (bountyId: string) => {
        const bounty = bounties.find(b => b.id === bountyId);
        if (!bounty || bounty.status !== 'active') return;
        try { await updateDoc(doc(db, 'events', eventId, 'bounties', bountyId), { status: 'expired' }); } catch { }
        if (alertBounty?.id === bountyId) setAlertBounty(null);
    }, [bounties, eventId, alertBounty]);

    const myVerified = useMemo(() => bounties.filter(b => b.claimedBy === agentId && b.status === 'verified'), [bounties, agentId]);
    const myTotalBonus = useMemo(() => myVerified.reduce((s, b) => s + (b.bonusAed ?? 0), 0), [myVerified]);
    const activeBounties = useMemo(() => bounties.filter(b => b.status === 'active'), [bounties]);
    const myClaimedPending = useMemo(() => bounties.filter(b => b.claimedBy === agentId && b.status === 'claimed'), [bounties, agentId]);

    return (
        <>
            <AnimatePresence>
                {alertBounty && (
                    <BountyAlertOverlay bounty={alertBounty}
                        onClaim={() => handleClaim(alertBounty.id)}
                        onDismiss={() => setAlertBounty(null)} />
                )}
            </AnimatePresence>

            <div className="max-w-md mx-auto space-y-5 px-1 pb-24">
                {/* Header */}
                <div className="text-center pt-2">
                    <div className="flex items-center justify-center gap-2 mb-1">
                        <motion.div animate={{ rotate: [0, -8, 8, 0] }} transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 3 }}>
                            <Zap size={18} className="text-amber-500 fill-amber-500" />
                        </motion.div>
                        <span className="text-amber-600 dark:text-amber-400 text-xs font-extrabold tracking-[0.2em] uppercase">Live Floor Bounties</span>
                    </div>
                    <h2 className="text-psi-primary text-xl font-extrabold">Bounty Board</h2>
                </div>

                {/* My stats strip */}
                {(myVerified.length > 0 || myClaimedPending.length > 0) && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 gap-3">
                        <div className="psi-card rounded-2xl p-4 ring-1 ring-blue-500/20">
                            <div className="w-8 h-8 bg-blue-500/10 rounded-xl flex items-center justify-center mb-2">
                                <Award size={15} className="text-blue-500" />
                            </div>
                            <p className="text-psi-muted text-[10px] font-extrabold uppercase tracking-widest">My Verified</p>
                            <p className="text-blue-500 text-2xl font-extrabold">{myVerified.length}</p>
                            {myTotalBonus > 0 && <p className="text-[10px] text-psi-muted mt-0.5">+{myTotalBonus.toLocaleString('en-AE')} AED</p>}
                        </div>
                        <div className="psi-card rounded-2xl p-4 ring-1 ring-amber-500/20">
                            <div className="w-8 h-8 bg-amber-500/10 rounded-xl flex items-center justify-center mb-2">
                                <Clock size={15} className="text-amber-500" />
                            </div>
                            <p className="text-psi-muted text-[10px] font-extrabold uppercase tracking-widest">Pending Verify</p>
                            <p className="text-amber-500 text-2xl font-extrabold">{myClaimedPending.length}</p>
                            <p className="text-[10px] text-psi-muted mt-0.5">Awaiting Organizer</p>
                        </div>
                    </motion.div>
                )}

                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 size={24} className="animate-spin text-psi-muted" />
                    </div>
                ) : (
                    <>
                        {activeBounties.length > 0 && (
                            <section>
                                <div className="flex items-center gap-2 mb-3">
                                    <Flame size={14} className="text-orange-500" />
                                    <h3 className="text-psi-primary font-extrabold text-sm uppercase tracking-widest">Active — {activeBounties.length} open</h3>
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-auto" />
                                </div>
                                <div className="space-y-3">
                                    <AnimatePresence>
                                        {activeBounties.map(b => (
                                            <BountyCard key={b.id} bounty={b} viewAs="agent" onClaim={handleClaim} onExpired={handleExpired} />
                                        ))}
                                    </AnimatePresence>
                                </div>
                            </section>
                        )}

                        {myClaimedPending.length > 0 && (
                            <section>
                                <div className="flex items-center gap-2 mb-3">
                                    <Timer size={14} className="text-amber-500" />
                                    <h3 className="text-psi-primary font-extrabold text-sm uppercase tracking-widest">My Claims — Awaiting Verification</h3>
                                </div>
                                <div className="space-y-3">
                                    {myClaimedPending.map(b => (
                                        <BountyCard key={b.id} bounty={b} viewAs="agent" onExpired={handleExpired} />
                                    ))}
                                </div>
                            </section>
                        )}

                        {myVerified.length > 0 && (
                            <section>
                                <div className="flex items-center gap-2 mb-3">
                                    <Trophy size={14} className="text-blue-500" />
                                    <h3 className="text-psi-primary font-extrabold text-sm uppercase tracking-widest">My Wins ({myVerified.length})</h3>
                                </div>
                                <div className="space-y-3">
                                    {myVerified.map(b => (
                                        <BountyCard key={b.id} bounty={b} viewAs="agent" onExpired={handleExpired} />
                                    ))}
                                </div>
                            </section>
                        )}

                        {activeBounties.length === 0 && myClaimedPending.length === 0 && myVerified.length === 0 && (
                            <div className="text-center py-16 psi-card rounded-2xl">
                                <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.4, 0.7, 0.4] }} transition={{ duration: 2.5, repeat: Infinity }}>
                                    <Zap size={40} className="mx-auto text-psi-muted mb-3" />
                                </motion.div>
                                <p className="font-extrabold text-psi-primary">No bounties right now</p>
                                <p className="text-psi-muted text-sm mt-1">Stay sharp — your Organizer can issue a bounty any time.</p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </>
    );
}

// ── useBountySettlementBonus ──────────────────────────────────────────────────

export function useBountySettlementBonus(eventId: string, agentId: string): number {
    const [bonus, setBonus] = useState(0);
    useEffect(() => {
        if (!eventId || !agentId) return;
        const unsub = onSnapshot(
            query(collection(db, 'events', eventId, 'bounties'),
                where('claimedBy', '==', agentId),
                where('status', '==', 'verified')),
            snap => setBonus(snap.docs.reduce((sum, d) => sum + ((d.data().bonusAed as number) || 0), 0))
        );
        return () => unsub();
    }, [eventId, agentId]);
    return bonus;
}

// ── BountyPage — route wrapper ────────────────────────────────────────────────

export default function BountyPage({
    eventId, viewAs, userName, agentId,
}: {
    eventId: string;
    viewAs: 'organizer' | 'agent';
    userName: string;
    agentId?: string;
}) {
    const eid = eventId || 'evt_london_luxury_expo_2026';
    return (
        <div className="min-h-screen bg-psi-page">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
                {viewAs === 'organizer'
                    ? <OrganizerBountyManager eventId={eid} organizerName={userName} />
                    : <AgentBountyView eventId={eid} agentId={agentId ?? 'demo_agent'} agentName={userName} />
                }
            </div>
        </div>
    );
}
