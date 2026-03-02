/**
 * brochure/ClientPortalPage.tsx
 * The public-facing client portal route (/client-portal/:token).
 * Displays the personalised property presentation and fires the tracking pixel.
 */

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
    Building2, ShieldCheck, Phone, Mail, Globe, Star,
    CheckCircle2, ChevronRight, Loader2, Zap, UserCircle2,
} from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../services/firebase/firebaseConfig';
import type { BrochureToken } from './types';
import { TIER_COLORS } from './types';
import { fetchBrochureByToken, recordView, requestCallback, fmtAED } from './data';

export function ClientPortalPage() {
    const { token } = useParams<{ token: string }>();

    const [brochure, setBrochure] = useState<BrochureToken | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [activePropertyIdx, setActivePropertyIdx] = useState(0);
    const [callbackSent, setCallbackSent] = useState(false);
    const [sendingCallback, setSendingCallback] = useState(false);
    const [viewTracked, setViewTracked] = useState(false);

    // ── Tracking pixel: fires once on mount ──────────────────────────────────
    useEffect(() => {
        if (!token) return;

        const trackView = async () => {
            const found = await fetchBrochureByToken(token);
            if (!found) { setNotFound(true); setLoading(false); return; }

            setBrochure(found);
            setLoading(false);

            if (!viewTracked) {
                setViewTracked(true);
                const isFirst = found.viewCount === 0;
                await recordView(found.id, isFirst);

                const projNames = found.projectSnapshots.map(p => p.name).join(', ');
                try {
                    await addDoc(
                        collection(db, 'users', found.agentId, 'notifications'),
                        {
                            type: 'brochure_view',
                            token,
                            clientName: found.clientName,
                            projectNames: found.projectSnapshots.map(p => p.name),
                            message: isFirst
                                ? `🔥 ${found.clientName} just opened your presentation for the first time! Properties: ${projNames}. Call them now!`
                                : `👁 ${found.clientName} is viewing your presentation again (view #${found.viewCount + 1}). Properties: ${projNames}.`,
                            read: false,
                            createdAt: serverTimestamp(),
                            fcmPayload: {
                                title: `🔥 ${found.clientName} is viewing your brochure!`,
                                body: `Your VIP lead is currently viewing the ${found.projectSnapshots[0]?.name ?? 'property'} brochure. Call them now!`,
                                data: { type: 'brochure_view', token, agentId: found.agentId },
                            },
                        }
                    );
                } catch { /* agent notification is best-effort */ }
            }
        };

        trackView();
    }, [token]);

    const handleRequestCallback = async () => {
        if (!brochure || callbackSent) return;
        setSendingCallback(true);
        try {
            await requestCallback(brochure.id, brochure);
            setCallbackSent(true);
        } finally {
            setSendingCallback(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-psi-page flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
                <p className="text-psi-secondary text-sm">Loading your presentation…</p>
            </div>
        </div>
    );

    if (notFound) return (
        <div className="min-h-screen bg-psi-page flex items-center justify-center text-center px-4">
            <div>
                <p className="text-6xl mb-4">🔍</p>
                <h1 className="text-psi-primary text-2xl font-bold mb-2">Presentation not found</h1>
                <p className="text-psi-secondary text-sm">This link may have expired or is invalid.</p>
                <p className="text-psi-secondary text-xs mt-2">Contact your PSI agent for a new link.</p>
            </div>
        </div>
    );

    if (!brochure) return null;

    const activeProject = brochure.projectSnapshots[activePropertyIdx];

    return (
        <div className="min-h-screen bg-psi-page">

            {/* Top brand bar */}
            <div className="bg-psi-surface border-b border-psi px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-gradient-to-br from-amber-500 to-rose-500 rounded-lg flex items-center justify-center">
                        <Building2 size={14} className="text-psi-primary" />
                    </div>
                    <span className="text-psi-primary text-sm font-bold tracking-tight">PSI Events</span>
                    <span className="text-psi-secondary text-xs">· Property Presentation</span>
                </div>
                <div className="flex items-center gap-2">
                    <ShieldCheck size={12} className="text-emerald-400" />
                    <span className="text-psi-secondary text-[10px]">Secure · Personalised</span>
                </div>
            </div>

            {/* Hero section */}
            <div className="relative">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activePropertyIdx}
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        transition={{ duration: 0.4 }}
                        className="relative h-[50vh] md:h-[60vh] overflow-hidden"
                    >
                        {activeProject?.imageUrl ? (
                            <img src={activeProject.imageUrl} alt={activeProject.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-psi-subtle" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-50 dark:from-slate-950 via-slate-50 dark:via-slate-950/40 to-transparent" />
                        <div className="absolute inset-0 bg-gradient-to-r from-slate-50 dark:from-slate-950/60 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
                            <span className={`inline-block text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full mb-3 ${TIER_COLORS[activeProject?.tier ?? 'Luxury']}`}>
                                {activeProject?.tier}
                            </span>
                            <h2 className="text-psi-primary text-3xl md:text-4xl font-extrabold tracking-tight leading-tight mb-1">
                                {activeProject?.name}
                            </h2>
                            <p className="text-psi-secondary text-sm">{activeProject?.developer_name} · {activeProject?.location}</p>
                        </div>
                    </motion.div>
                </AnimatePresence>

                {brochure.projectSnapshots.length > 1 && (
                    <div className="absolute right-4 bottom-4 flex flex-col gap-2">
                        {brochure.projectSnapshots.map((p, i) => (
                            <button key={p.id} onClick={() => setActivePropertyIdx(i)}
                                className={`w-12 h-12 rounded-xl overflow-hidden border-2 transition-all ${i === activePropertyIdx ? 'border-amber-500 scale-110' : 'border-psi-strong opacity-60 hover:opacity-100'}`}>
                                {p.imageUrl ? (
                                    <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-psi-border flex items-center justify-center">
                                        <Building2 size={14} className="text-psi-secondary" />
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Content body */}
            <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">

                {brochure.personalNote && (
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                        className="bg-psi-subtle border border-psi-strong/60 rounded-2xl p-5">
                        <p className="text-psi-secondary text-xs font-bold uppercase tracking-widest mb-2">A personal note from {brochure.agentName}</p>
                        <p className="text-psi-secondary text-sm leading-relaxed italic">"{brochure.personalNote}"</p>
                    </motion.div>
                )}

                <motion.div key={activePropertyIdx} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                    {/* Stats strip */}
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { label: 'Price Range', value: activeProject?.priceRange ?? fmtAED(activeProject?.expected_avg_deal ?? 0) },
                            { label: 'Bedrooms', value: activeProject?.bedrooms ?? 'Varies' },
                            { label: 'Handover', value: activeProject?.completionYear ?? 'TBC' },
                        ].map(({ label, value }) => (
                            <div key={label} className="bg-psi-subtle/60 border border-psi-strong/50 rounded-xl p-3 text-center">
                                <p className="text-psi-secondary text-[10px] font-bold uppercase tracking-widest">{label}</p>
                                <p className="text-psi-primary font-bold text-sm mt-0.5">{value}</p>
                            </div>
                        ))}
                    </div>

                    {activeProject?.description && (
                        <div>
                            <p className="text-psi-primary font-bold text-lg mb-2 flex items-center gap-2">
                                <Globe size={16} className="text-amber-400" /> About this development
                            </p>
                            <p className="text-psi-secondary text-sm leading-relaxed">{activeProject.description}</p>
                        </div>
                    )}

                    {activeProject?.highlights && activeProject.highlights.length > 0 && (
                        <div>
                            <p className="text-psi-primary font-bold text-sm mb-3 flex items-center gap-2">
                                <Star size={14} className="text-amber-400" /> Key Highlights
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {activeProject.highlights.map(h => (
                                    <span key={h} className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full text-xs font-medium text-amber-300">
                                        <CheckCircle2 size={10} /> {h}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </motion.div>

                {brochure.projectSnapshots.length > 1 && (
                    <div>
                        <p className="text-psi-secondary text-xs font-bold uppercase tracking-widest mb-3">All curated properties for you</p>
                        <div className="grid grid-cols-1 gap-2">
                            {brochure.projectSnapshots.map((p, i) => (
                                <button key={p.id} onClick={() => setActivePropertyIdx(i)}
                                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${i === activePropertyIdx
                                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                                        : 'border-psi text-psi-secondary hover:border-psi-strong hover:text-psi-primary'
                                        }`}>
                                    <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-psi-subtle">
                                        {p.imageUrl && <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-sm leading-tight">{p.name}</p>
                                        <p className="text-xs text-psi-secondary mt-0.5">{p.developer_name} · {p.priceRange ?? fmtAED(p.expected_avg_deal)}</p>
                                    </div>
                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${TIER_COLORS[p.tier]}`}>{p.tier}</span>
                                    <ChevronRight size={14} className="flex-shrink-0" />
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Agent Contact Card */}
                <div className="bg-gradient-to-br from-slate-800 to-white dark:to-slate-900 border border-psi-strong/50 rounded-3xl p-6">
                    <p className="text-psi-secondary text-xs font-bold uppercase tracking-widest mb-4">Your dedicated PSI agent</p>
                    <div className="flex items-start gap-4">
                        <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 bg-psi-border">
                            {brochure.agentAvatar ? (
                                <img src={brochure.agentAvatar} alt={brochure.agentName} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <UserCircle2 size={36} className="text-psi-secondary" />
                                </div>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-psi-primary font-extrabold text-lg leading-tight">{brochure.agentName}</p>
                            <p className="text-psi-secondary text-sm mt-0.5">Property Investment Specialist · PSI</p>
                            <div className="flex flex-col gap-1.5 mt-3">
                                <a href={`tel:${brochure.agentPhone}`}
                                    className="flex items-center gap-2 text-sm text-psi-secondary hover:text-amber-400 transition-colors">
                                    <Phone size={13} className="text-amber-400" /> {brochure.agentPhone}
                                </a>
                                <a href={`mailto:${brochure.agentEmail}`}
                                    className="flex items-center gap-2 text-sm text-psi-secondary hover:text-amber-400 transition-colors">
                                    <Mail size={13} className="text-amber-400" /> {brochure.agentEmail}
                                </a>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 mt-6">
                        <motion.button id="request-callback-btn" whileTap={{ scale: 0.97 }}
                            onClick={handleRequestCallback} disabled={callbackSent || sendingCallback}
                            className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-extrabold text-sm transition-all ${callbackSent
                                ? 'bg-emerald-600 text-white cursor-default'
                                : 'bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-white shadow-lg shadow-amber-500/20'
                                }`}>
                            {sendingCallback ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : callbackSent ? (
                                <><CheckCircle2 size={16} /> Callback Requested!</>
                            ) : (
                                <><Phone size={16} /> Request a Callback</>
                            )}
                        </motion.button>
                        {brochure.agentPhone && (
                            <a href={`tel:${brochure.agentPhone}`}
                                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-psi-border hover:bg-slate-600 text-psi-primary font-bold text-sm transition-colors">
                                <Phone size={16} /> Call Now
                            </a>
                        )}
                    </div>

                    {callbackSent && (
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                            className="mt-3 flex items-center gap-2 text-xs text-emerald-400">
                            <Zap size={11} className="animate-pulse" />
                            {brochure.agentName} has been instantly notified and will contact you shortly.
                        </motion.div>
                    )}
                </div>

                {/* Footer */}
                <div className="text-center py-6 border-t border-psi">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <div className="w-6 h-6 bg-gradient-to-br from-amber-500 to-rose-500 rounded-md flex items-center justify-center">
                            <Building2 size={12} className="text-psi-primary" />
                        </div>
                        <span className="text-psi-secondary text-sm font-bold">PSI Events · Property Shop Investment</span>
                    </div>
                    <p className="text-slate-600 text-xs">This presentation was curated exclusively for {brochure.clientName}</p>
                    <p className="text-slate-700 text-[10px] mt-1">© {new Date().getFullYear()} Property Shop Investment LLC. All rights reserved.</p>
                </div>
            </div>
        </div>
    );
}
