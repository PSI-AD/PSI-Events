/**
 * DigitalBrochure.tsx — Orchestration layer
 * ─────────────────────────────────────────────────────────────────────────────
 * Digital Goodie Bag system for PSI Agents.
 *
 * This file has been refactored from a 1,149-line monolith.
 * Responsibilities are now split across dedicated modules:
 *
 *  brochure/types.ts            — all TypeScript interfaces + TIER_COLORS constant
 *  brochure/data.ts             — demo data, Firestore helpers, token utils
 *  brochure/BrochureComponents  — ProjectPickerCard, SentBrochureRow, NotificationToast
 *  brochure/ClientPortalPage    — public /client-portal/:token view + tracking pixel
 *
 * This file exports:
 *  DigitalBrochurePage  — the agent-facing composer (default export)
 *  ClientPortalPage     — re-exported from brochure/ClientPortalPage
 *  CRMProject, BrochureToken, ViewEvent — re-exported for downstream consumers
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
    Send, Eye, Loader2, X, ArrowLeft,
    Activity, MessageCircle, QrCode, Link2, RefreshCw,
    Calendar, ClipboardList, Sparkles,
} from 'lucide-react';
import {
    collection, onSnapshot, query, where, orderBy,
} from 'firebase/firestore';
import { db } from '../../services/firebase/firebaseConfig';

// Sub-modules
import type { CRMProject, BrochureToken } from './brochure/types';
import {
    DEMO_PROJECTS, DEMO_AGENT, fetchCRMProjects,
    createBrochureToken, generateToken, fmtAED,
} from './brochure/data';
import {
    ProjectPickerCard, SentBrochureRow, NotificationToast,
} from './brochure/BrochureComponents';

// Re-exports for backward compatibility
export type { CRMProject, BrochureToken } from './brochure/types';
export type { ViewEvent } from './brochure/types';
export { ClientPortalPage } from './brochure/ClientPortalPage';

// ── Types used only in the agent composer ────────────────────────────────────

type ComposerTab = 'compose' | 'sent' | 'analytics';

interface AgentComposerState {
    projects: CRMProject[];
    loadingProjects: boolean;
    selectedProjectIds: string[];
    clientName: string;
    clientEmail: string;
    personalNote: string;
    sending: boolean;
    sentUrl: string | null;
    notification: string | null;
    sentBrochures: BrochureToken[];
    loadingSent: boolean;
    tab: ComposerTab;
}

// ── Agent Composer ────────────────────────────────────────────────────────────

interface DigitalBrochurePageProps {
    agentId?: string;
    agentName?: string;
    agentEmail?: string;
    agentPhone?: string;
    agentAvatar?: string;
    useDemoData?: boolean;
}

export default function DigitalBrochurePage({
    agentId = DEMO_AGENT.id,
    agentName = DEMO_AGENT.name,
    agentEmail = DEMO_AGENT.email,
    agentPhone = DEMO_AGENT.phone,
    agentAvatar = DEMO_AGENT.avatar,
    useDemoData = true,
}: DigitalBrochurePageProps) {
    const [state, setState] = useState<AgentComposerState>({
        projects: [],
        loadingProjects: true,
        selectedProjectIds: [],
        clientName: '',
        clientEmail: '',
        personalNote: '',
        sending: false,
        sentUrl: null,
        notification: null,
        sentBrochures: [],
        loadingSent: true,
        tab: 'compose',
    });

    const update = useCallback(<K extends keyof AgentComposerState>(k: K, v: AgentComposerState[K]) =>
        setState(s => ({ ...s, [k]: v })), []);

    // ── Load CRM projects ───────────────────────────────────────────────────
    useEffect(() => {
        fetchCRMProjects().then(projects => setState(s => ({ ...s, projects, loadingProjects: false })));
    }, []);

    // ── Live sent brochures listener ───────────────────────────────────────
    useEffect(() => {
        if (useDemoData) {
            setState(s => ({ ...s, sentBrochures: [], loadingSent: false }));
            return;
        }
        const q = query(
            collection(db, 'brochure_tokens'),
            where('agentId', '==', agentId),
            orderBy('createdAt', 'desc')
        );
        const unsub = onSnapshot(q, snap => {
            const tokens = snap.docs.map(d => ({ id: d.id, ...d.data() } as BrochureToken));
            setState(s => ({ ...s, sentBrochures: tokens, loadingSent: false }));
        }, () => setState(s => ({ ...s, loadingSent: false })));
        return () => unsub();
    }, [agentId, useDemoData]);

    // ── Project selection toggle ────────────────────────────────────────────
    const toggleProject = useCallback((id: string) => {
        setState(s => ({
            ...s,
            selectedProjectIds: s.selectedProjectIds.includes(id)
                ? s.selectedProjectIds.filter(p => p !== id)
                : [...s.selectedProjectIds, id],
        }));
    }, []);

    // ── Send brochure ───────────────────────────────────────────────────────
    const handleSend = useCallback(async () => {
        const { selectedProjectIds, clientName, clientEmail, personalNote, projects } = state;
        if (!selectedProjectIds.length || !clientName.trim() || !clientEmail.trim()) return;
        update('sending', true);
        try {
            const token = generateToken();
            const snapshots = projects.filter(p => selectedProjectIds.includes(p.id));
            if (!useDemoData) {
                await createBrochureToken({
                    token, agentId, agentName, agentEmail,
                    agentPhone, agentAvatar,
                    clientName: clientName.trim(),
                    clientEmail: clientEmail.trim(),
                    personalNote: personalNote.trim(),
                    selectedProjectIds,
                    projectSnapshots: snapshots,
                });
            }
            const url = `${window.location.origin}/client-portal/${token}`;
            const projNames = snapshots.map(p => p.name).join(', ');
            setState(s => ({
                ...s,
                sending: false,
                sentUrl: url,
                selectedProjectIds: [],
                clientName: '',
                clientEmail: '',
                personalNote: '',
                tab: 'sent',
                notification: `🔥 ${clientName} just opened your presentation for the first time! Properties: ${projNames}. Call them now!`,
            }));
            setTimeout(() => update('notification', null), 8000);
        } catch {
            update('sending', false);
        }
    }, [state, agentId, agentName, agentEmail, agentPhone, agentAvatar, useDemoData, update]);

    const canSend = state.selectedProjectIds.length > 0
        && state.clientName.trim().length > 0
        && state.clientEmail.trim().length > 0
        && !state.sending;

    const selectedProjects = useMemo(
        () => state.projects.filter(p => state.selectedProjectIds.includes(p.id)),
        [state.projects, state.selectedProjectIds]
    );

    // ── UI ──────────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-psi-page p-4 md:p-6 max-w-3xl mx-auto space-y-6">

            {/* Header */}
            <div>
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-9 h-9 bg-gradient-to-br from-amber-500 to-rose-500 rounded-xl flex items-center justify-center shadow-md shadow-amber-500/20">
                        <QrCode size={18} className="text-slate-900 dark:text-white" />
                    </div>
                    <span className="text-amber-500 text-xs font-black tracking-[0.2em] uppercase">Digital Goodie Bag</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-psi-primary tracking-tight">
                    Property Brochure Composer
                </h1>
                <p className="text-psi-secondary text-sm mt-1">
                    Curate a personalised property presentation. Send it to a lead and get notified the moment they open it.
                </p>
                {useDemoData && (
                    <span className="inline-block mt-2 text-[10px] text-psi-muted bg-psi-subtle border border-psi px-2 py-1 rounded-full font-bold">
                        Demo Mode
                    </span>
                )}
            </div>

            {/* Tab bar */}
            <div className="flex gap-1 bg-psi-subtle p-1 rounded-2xl">
                {([
                    { id: 'compose' as ComposerTab, label: 'Compose', icon: <Sparkles size={13} /> },
                    { id: 'sent' as ComposerTab, label: 'Sent', icon: <Eye size={13} /> },
                    { id: 'analytics' as ComposerTab, label: 'Analytics', icon: <Activity size={13} /> },
                ] as const).map(t => (
                    <button key={t.id} id={`brochure-tab-${t.id}`}
                        onClick={() => update('tab', t.id)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${state.tab === t.id
                            ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-slate-900 dark:text-white shadow-md shadow-amber-500/20'
                            : 'text-psi-muted hover:text-psi-primary'
                            }`}>
                        {t.icon} {t.label}
                    </button>
                ))}
            </div>

            {/* ── Tab: Compose ── */}
            {state.tab === 'compose' && (
                <div className="space-y-6">

                    {/* Property grid */}
                    <div className="psi-card rounded-2xl p-5">
                        <p className="text-psi-primary font-bold text-sm mb-3 flex items-center gap-2">
                            <ClipboardList size={14} className="text-amber-500" />
                            Select Properties
                            {state.selectedProjectIds.length > 0 && (
                                <span className="ml-auto text-xs font-black text-amber-500">
                                    {state.selectedProjectIds.length} selected
                                </span>
                            )}
                        </p>

                        {state.loadingProjects ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 size={24} className="text-psi-muted animate-spin" />
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {state.projects.map(p => (
                                    <ProjectPickerCard
                                        key={p.id}
                                        project={p}
                                        selected={state.selectedProjectIds.includes(p.id)}
                                        onToggle={() => toggleProject(p.id)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Client details */}
                    <div className="psi-card rounded-2xl p-5 space-y-4">
                        <p className="text-psi-primary font-bold text-sm flex items-center gap-2">
                            <MessageCircle size={14} className="text-amber-500" /> Client Details
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-psi-muted text-[10px] font-black uppercase tracking-widest">Client Name *</label>
                                <input id="brochure-client-name" type="text" value={state.clientName}
                                    onChange={e => update('clientName', e.target.value)}
                                    placeholder="e.g. Mohammed Al Rashid"
                                    className="psi-input w-full px-3 py-2.5 rounded-xl text-sm" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-psi-muted text-[10px] font-black uppercase tracking-widest">Client Email *</label>
                                <input id="brochure-client-email" type="email" value={state.clientEmail}
                                    onChange={e => update('clientEmail', e.target.value)}
                                    placeholder="client@email.com"
                                    className="psi-input w-full px-3 py-2.5 rounded-xl text-sm" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-psi-muted text-[10px] font-black uppercase tracking-widest">Personal Note (optional)</label>
                            <textarea id="brochure-personal-note" rows={3} value={state.personalNote}
                                onChange={e => update('personalNote', e.target.value)}
                                placeholder="e.g. It was great meeting you at our stand today, Mohammed! As promised, here's our curated selection…"
                                className="psi-input w-full px-3 py-2 rounded-xl text-sm resize-none" />
                        </div>
                    </div>

                    {/* Selected summary */}
                    {selectedProjects.length > 0 && (
                        <div className="psi-card rounded-2xl p-4 flex flex-wrap gap-2">
                            <span className="text-psi-muted text-xs font-bold w-full mb-1">Sending:</span>
                            {selectedProjects.map(p => (
                                <span key={p.id}
                                    className="flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-xs font-bold text-amber-600 dark:text-amber-400">
                                    {p.name}
                                    <button onClick={() => toggleProject(p.id)} className="w-4 h-4 rounded-full bg-amber-500/20 hover:bg-amber-500/40 flex items-center justify-center transition-colors">
                                        <X size={10} />
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Send button */}
                    <motion.button
                        id="send-brochure-btn"
                        whileHover={{ scale: canSend ? 1.01 : 1 }}
                        whileTap={{ scale: canSend ? 0.97 : 1 }}
                        onClick={handleSend}
                        disabled={!canSend}
                        className={`w-full flex items-center justify-center gap-2.5 py-5 rounded-2xl font-extrabold text-sm transition-all ${canSend
                            ? 'bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-900 dark:text-white shadow-xl shadow-amber-500/20'
                            : 'bg-psi-subtle text-psi-muted cursor-not-allowed'
                            }`}
                    >
                        {state.sending ? (
                            <><Loader2 size={18} className="animate-spin" /> Generating Link…</>
                        ) : (
                            <><Send size={18} /> Send Presentation</>
                        )}
                    </motion.button>
                </div>
            )}

            {/* ── Tab: Sent ── */}
            {state.tab === 'sent' && (
                <div className="space-y-4">
                    {state.sentUrl && (
                        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                            className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4">
                            <p className="text-emerald-600 dark:text-emerald-400 font-bold text-sm mb-2 flex items-center gap-2">
                                ✅ Presentation link ready!
                            </p>
                            <div className="flex items-center gap-2 bg-psi-subtle border border-psi rounded-xl px-3 py-2 overflow-hidden">
                                <Link2 size={12} className="text-psi-muted flex-shrink-0" />
                                <span className="text-xs text-psi-secondary truncate font-mono flex-1">{state.sentUrl}</span>
                                <button onClick={() => navigator.clipboard.writeText(state.sentUrl!)}
                                    className="flex-shrink-0 text-xs font-bold text-amber-500 hover:text-amber-400 px-2 py-1 rounded-lg hover:bg-amber-500/10 transition-all">
                                    Copy
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {state.loadingSent ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 size={24} className="text-psi-muted animate-spin" />
                        </div>
                    ) : state.sentBrochures.length === 0 ? (
                        <div className="psi-card rounded-2xl p-12 text-center border border-psi">
                            <Calendar size={32} className="mx-auto text-psi-muted mb-3" />
                            <p className="text-psi-muted text-sm font-medium">No brochures sent yet.</p>
                            <p className="text-psi-muted text-xs mt-1">Send your first presentation above.</p>
                            <button onClick={() => update('tab', 'compose')}
                                className="mt-4 flex items-center gap-2 mx-auto text-amber-500 text-xs font-bold">
                                <ArrowLeft size={12} /> Go to Composer
                            </button>
                        </div>
                    ) : (
                        <AnimatePresence>
                            {state.sentBrochures.map(b => (
                                <SentBrochureRow
                                    key={b.id}
                                    brochure={b}
                                    onCopy={url => navigator.clipboard.writeText(url)}
                                />
                            ))}
                        </AnimatePresence>
                    )}
                </div>
            )}

            {/* ── Tab: Analytics ── */}
            {state.tab === 'analytics' && (
                <div className="psi-card rounded-2xl p-6 text-center border border-psi">
                    <Activity size={36} className="mx-auto text-psi-muted mb-3" />
                    <p className="text-psi-primary font-bold">Analytics Dashboard</p>
                    <p className="text-psi-muted text-sm mt-1">
                        View opens, callback requests, and engagement metrics across all sent brochures.
                    </p>
                    <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                        {[['Total Sent', state.sentBrochures.length.toString()], ['Total Views', state.sentBrochures.reduce((a, b) => a + b.viewCount, 0).toString()], ['Callbacks', state.sentBrochures.filter(b => b.status === 'callback_requested').length.toString()]].map(([label, val]) => (
                            <div key={label} className="bg-psi-subtle border border-psi rounded-xl p-3">
                                <p className="text-psi-muted text-[10px] font-bold uppercase tracking-widest">{label}</p>
                                <p className="text-psi-primary font-extrabold text-2xl mt-1">{val}</p>
                            </div>
                        ))}
                    </div>
                    <button onClick={() => update('tab', 'sent')}
                        className="mt-4 flex items-center gap-2 mx-auto text-amber-500 text-xs font-bold">
                        <RefreshCw size={12} /> View Sent Brochures
                    </button>
                </div>
            )}

            {/* Push notification toast */}
            <AnimatePresence>
                {state.notification && (
                    <NotificationToast
                        message={state.notification}
                        onDismiss={() => update('notification', null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
