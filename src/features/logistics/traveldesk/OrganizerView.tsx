/**
 * traveldesk/OrganizerView.tsx
 * Organizer-facing panels for the Corporate Travel Desk:
 *  - OrganizerConfigPanel   — travel route + budget configuration
 *  - BookingLedger          — auto-injected flight expense list
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
    CheckCircle2, Loader2, ReceiptText, Settings2,
} from 'lucide-react';
import type { ApprovedAgent, EventTravelConfig, FlightRoute } from './types';
import { fmtAed } from './data';

// ── Organizer config panel ────────────────────────────────────────────────────

export function OrganizerConfigPanel({
    config, onSave,
}: {
    config: EventTravelConfig;
    onSave: (c: EventTravelConfig) => void;
}) {
    const [draft, setDraft] = useState(config);
    const [saved, setSaved] = useState(false);

    const updateRoute = <K extends keyof FlightRoute>(key: K, val: FlightRoute[K]) =>
        setDraft(d => ({ ...d, route: { ...d.route, [key]: val } }));

    const handleSave = () => {
        onSave(draft);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    return (
        <div className="psi-card rounded-2xl p-5 space-y-5">
            <div className="flex items-center gap-2">
                <Settings2 size={15} className="text-amber-500" />
                <p className="text-psi-primary font-bold text-sm">Travel Configuration</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                    <label className="text-psi-muted text-[10px] font-black uppercase tracking-widest">Departure (IATA)</label>
                    <input id="config-from" value={draft.route.from}
                        onChange={e => updateRoute('from', e.target.value.toUpperCase().slice(0, 3))}
                        className="psi-input w-full px-3 py-2.5 rounded-xl text-sm font-bold font-mono"
                        maxLength={3} placeholder="DXB" />
                </div>
                <div className="space-y-1">
                    <label className="text-psi-muted text-[10px] font-black uppercase tracking-widest">Destination (IATA)</label>
                    <input id="config-to" value={draft.route.to}
                        onChange={e => updateRoute('to', e.target.value.toUpperCase().slice(0, 3))}
                        className="psi-input w-full px-3 py-2.5 rounded-xl text-sm font-bold font-mono"
                        maxLength={3} placeholder="LHR" />
                </div>
                <div className="space-y-1">
                    <label className="text-psi-muted text-[10px] font-black uppercase tracking-widest">Outbound Date</label>
                    <input id="config-date" type="date" value={draft.route.date}
                        onChange={e => updateRoute('date', e.target.value)}
                        className="psi-input w-full px-3 py-2.5 rounded-xl text-sm" />
                </div>
                <div className="space-y-1">
                    <label className="text-psi-muted text-[10px] font-black uppercase tracking-widest">Budget Cap per Agent (AED)</label>
                    <input id="config-budget" type="number" value={draft.budget.maxPerAgent}
                        onChange={e => setDraft(d => ({ ...d, budget: { ...d.budget, maxPerAgent: +e.target.value } }))}
                        className="psi-input w-full px-3 py-2.5 rounded-xl text-sm font-mono"
                        min={500} step={50} />
                </div>
            </div>

            <motion.button id="save-travel-config" whileTap={{ scale: 0.97 }} onClick={handleSave}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-extrabold text-sm transition-all shadow-md shadow-amber-500/20">
                {saved ? <><CheckCircle2 size={14} /> Configuration Saved ✓</> : <><CheckCircle2 size={14} /> Save Configuration</>}
            </motion.button>
        </div>
    );
}

// ── Booking ledger ────────────────────────────────────────────────────────────

export function BookingLedger({ agents }: { agents: ApprovedAgent[] }) {
    const booked = agents.filter(a => a.status === 'confirmed' && a.bookedFlight);
    const total = booked.reduce((s, a) => s + (a.bookedFlight?.price ?? 0), 0);

    if (!booked.length) {
        return (
            <div className="psi-card rounded-2xl p-5 text-center">
                <ReceiptText size={28} className="mx-auto text-psi-muted mb-2" />
                <p className="text-psi-muted text-sm">No flights booked yet.</p>
            </div>
        );
    }

    return (
        <div className="psi-card rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2">
                <ReceiptText size={15} className="text-amber-500" />
                <p className="text-psi-primary font-bold text-sm flex-1">Auto-Injected Expense Ledger</p>
                <span className="text-psi-muted text-xs">{booked.length} bookings</span>
            </div>
            <div className="space-y-2">
                {booked.map(a => (
                    <motion.div key={a.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="flex items-center gap-3 p-3 bg-psi-subtle rounded-xl border border-psi">
                        <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-sm flex-shrink-0">
                            {a.bookedFlight!.logo}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-psi-primary font-bold text-sm truncate">{a.name}</p>
                            <p className="text-psi-muted text-[10px]">
                                {a.bookedFlight!.flightNumber} · {a.expenseRef ?? '—'}
                            </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                            <p className="text-emerald-400 font-black font-mono text-sm">{fmtAed(a.bookedFlight!.price)}</p>
                            <span className="text-[10px] text-psi-muted">Travel · Agent</span>
                        </div>
                    </motion.div>
                ))}
            </div>
            <div className="border-t border-psi pt-3 flex items-center justify-between">
                <p className="text-psi-secondary text-xs font-bold uppercase tracking-widest">Total Flight Costs</p>
                <p className="text-psi-primary font-extrabold font-mono">{fmtAed(total)}</p>
            </div>
        </div>
    );
}
