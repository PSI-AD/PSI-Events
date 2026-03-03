/**
 * TravelDesk.tsx — Orchestration layer
 * ─────────────────────────────────────────────────────────────────────────────
 * Integrated Corporate Travel Desk
 *
 * Refactored from a 1,003-line monolith. Sub-concerns live in:
 *
 *  traveldesk/types.ts          — all TS interfaces
 *  traveldesk/data.ts           — mock API, demo config, utility functions
 *  traveldesk/FlightSearch.tsx  — FlightCard + AgentFlightSearch panel
 *  traveldesk/OrganizerView.tsx — OrganizerConfigPanel + BookingLedger
 *
 * Backward-compatible exports are preserved at the bottom.
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    Plane, Users, CheckCircle2, Clock, Banknote,
    ReceiptText, Settings2, ChevronDown, ChevronUp, BadgeCheck, Loader2,
} from 'lucide-react';
import { onSnapshot, collection, Unsubscribe, query, where, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase/firebaseConfig';
import { toast } from 'sonner';

import type { ApprovedAgent, EventTravelConfig, FlightOption } from './traveldesk/types';
import {
    DEMO_CONFIG, clsx, fmtAed, tierColour, statusBadge,
} from './traveldesk/data';
import { AgentFlightSearch } from './traveldesk/FlightSearch';
import { OrganizerConfigPanel, BookingLedger } from './traveldesk/OrganizerView';

// Re-exports for backward compatibility
export type {
    AgentBookingStatus, ApprovedAgent, FlightRoute, TravelBudget,
    FlightOption, EventTravelConfig,
} from './traveldesk/types';

// ── Props ─────────────────────────────────────────────────────────────────────

interface TravelDeskProps {
    eventId?: string;
    role?: 'organizer' | 'manager' | 'agent';
    currentAgent?: ApprovedAgent;
    useDemoData?: boolean;
}

type TabId = 'roster' | 'ledger' | 'config' | 'logistics';

// ── Logistics Desk Record type ────────────────────────────────────────────────

interface LogisticsRecord {
    id: string;
    agentName: string;
    flightStatus: string;
    flightRef?: string;
    returnFlightRef?: string;
    visaStatus: string;
    visaRef?: string;
    hotelRef?: string;
    hotel?: string;
    checkIn?: string;
    checkOut?: string;
    pcr?: string;
    insurance?: string;
    notes?: string;
}

const VISA_OPTIONS = ['Pending', 'Submitted', 'Approved', 'Rejected', 'Not Required'] as const;
const FLIGHT_OPTIONS = ['Not Booked', 'Booked', 'Checked In', 'Boarded', 'Cancelled'] as const;
const PCR_OPTIONS = ['Required', 'Submitted', 'Cleared', 'Not Required'] as const;

// ── Logistics Status Panel ────────────────────────────────────────────────────

function LogisticsStatusPanel({ eventId, useDemoData }: { eventId: string; useDemoData: boolean }) {
    const [records, setRecords] = React.useState<LogisticsRecord[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [updating, setUpdating] = React.useState<string | null>(null); // docId being updated

    React.useEffect(() => {
        if (useDemoData) {
            // Show demo records from the seeder so the UI is always populated
            setRecords([
                { id: 'demo_lgst_amr', agentName: 'Amr ElFangary', flightStatus: 'Booked', flightRef: 'EK009 — DXB→LHR', returnFlightRef: 'EK010 — LHR→DXB', visaStatus: 'Approved', visaRef: 'UK MRV-2026-AE-00341', hotel: 'The Dorchester', checkIn: '2026-04-09', checkOut: '2026-04-14', pcr: 'Cleared', insurance: 'Covered' },
                { id: 'demo_lgst_sara', agentName: 'Sara Almarzouqi', flightStatus: 'Booked', flightRef: 'EK009 — DXB→LHR', returnFlightRef: 'EK010 — LHR→DXB', visaStatus: 'Approved', visaRef: 'UK MRV-2026-AE-00425', hotel: 'Ritz-Carlton Westminster', checkIn: '2026-04-09', checkOut: '2026-04-14', pcr: 'Cleared', insurance: 'Covered' },
                { id: 'demo_lgst_khalid', agentName: 'Khalid Al-Mansouri', flightStatus: 'Booked', flightRef: 'EK009 — DXB→LHR', returnFlightRef: 'EK010 — LHR→DXB', visaStatus: 'Pending', visaRef: undefined, hotel: 'Ritz-Carlton Westminster', checkIn: '2026-04-09', checkOut: '2026-04-14', pcr: 'Required', insurance: 'Covered' },
            ]);
            setLoading(false);
            return;
        }
        const q = query(collection(db, 'logistics_desk'), where('eventId', '==', eventId));
        const unsub = onSnapshot(
            q,
            snap => {
                setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() } as LogisticsRecord)));
                setLoading(false);
            },
            err => { console.error('[TravelDesk] logistics_desk snapshot:', err); setLoading(false); }
        );
        return () => unsub();
    }, [eventId, useDemoData]);

    const handleUpdate = async (
        record: LogisticsRecord,
        field: 'visaStatus' | 'flightStatus' | 'pcr',
        newValue: string,
    ) => {
        setUpdating(record.id);
        // Optimistic local update for demo mode
        setRecords(prev => prev.map(r => r.id === record.id ? { ...r, [field]: newValue } : r));
        try {
            if (!useDemoData) {
                await updateDoc(doc(db, 'logistics_desk', record.id), {
                    [field]: newValue,
                    updatedAt: serverTimestamp(),
                });
            }
            toast.success(`${record.agentName} — ${field.replace('Status', '')} updated`, {
                description: `→ ${newValue}`,
            });
        } catch (err) {
            toast.error('Failed to update status', {
                description: err instanceof Error ? err.message : 'Unknown error',
            });
            // Revert optimistic update
            setRecords(prev => prev.map(r => r.id === record.id ? { ...r, [field]: record[field] } : r));
        } finally {
            setUpdating(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 size={24} className="text-psi-muted animate-spin" />
            </div>
        );
    }

    if (!records.length) {
        return (
            <div className="psi-card rounded-2xl p-12 text-center border border-psi">
                <Plane size={32} className="mx-auto text-psi-muted mb-3" />
                <p className="text-psi-muted text-sm">No logistics records for this event.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <p className="text-xs font-bold text-psi-muted uppercase tracking-widest px-0.5">
                Visa, Flight &amp; PCR Status
                {useDemoData && <span className="ml-2 text-amber-400">(Demo — optimistic updates)</span>}
                {!useDemoData && <span className="ml-2 text-emerald-400">(Live Firestore)</span>}
            </p>
            {records.map(r => (
                <motion.div key={r.id}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="psi-card rounded-2xl p-4 border border-psi space-y-3"
                >
                    {/* Agent header */}
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-psi-primary font-black text-sm flex-shrink-0">
                            {r.agentName.split(' ').map((p: string) => p[0]).join('').slice(0, 2)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-extrabold text-psi-primary text-sm">{r.agentName}</p>
                            <p className="text-psi-muted text-[10px] truncate">
                                {r.hotel ?? '—'} &middot; {r.checkIn ?? '?'} → {r.checkOut ?? '?'}
                            </p>
                        </div>
                        {updating === r.id && (
                            <Loader2 size={14} className="animate-spin text-psi-muted flex-shrink-0" />
                        )}
                    </div>

                    {/* Flight reference strip */}
                    {r.flightRef && (
                        <p className="text-psi-secondary text-[11px] font-mono bg-psi-subtle border border-psi rounded-lg px-3 py-1.5">
                            ✈️  {r.flightRef}{r.returnFlightRef ? ` / ${r.returnFlightRef}` : ''}
                        </p>
                    )}

                    {/* Status dropdowns */}
                    <div className="grid grid-cols-3 gap-2">
                        {([
                            { field: 'visaStatus' as const, label: 'Visa Status', options: VISA_OPTIONS, id: `visa-${r.id}` },
                            { field: 'flightStatus' as const, label: 'Flight Status', options: FLIGHT_OPTIONS, id: `flt-${r.id}` },
                            { field: 'pcr' as const, label: 'PCR / Health', options: PCR_OPTIONS, id: `pcr-${r.id}` },
                        ]).map(({ field, label, options, id }) => (
                            <div key={field} className="space-y-1">
                                <label htmlFor={id} className="text-psi-muted text-[9px] font-black uppercase tracking-widest">
                                    {label}
                                </label>
                                <select
                                    id={id}
                                    value={r[field] ?? ''}
                                    disabled={updating === r.id}
                                    onChange={e => handleUpdate(r, field, e.target.value)}
                                    className={`w-full psi-input px-2 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer transition-all
                                        ${r[field] === 'Approved' || r[field] === 'Cleared' || r[field] === 'Boarded' || r[field] === 'Checked In'
                                            ? 'text-emerald-400'
                                            : r[field] === 'Pending' || r[field] === 'Submitted' || r[field] === 'Required'
                                                ? 'text-amber-400'
                                                : r[field] === 'Rejected' || r[field] === 'Cancelled'
                                                    ? 'text-rose-400'
                                                    : 'text-psi-primary'
                                        }`}
                                >
                                    {options.map(o => (
                                        <option key={o} value={o}>{o}</option>
                                    ))}
                                </select>
                            </div>
                        ))}
                    </div>

                    {/* Notes */}
                    {r.notes && (
                        <p className="text-psi-muted text-[10px] leading-relaxed border-l-2 border-amber-500/40 pl-2">
                            {r.notes}
                        </p>
                    )}
                </motion.div>
            ))}
        </div>
    );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function TravelDesk({
    eventId = DEMO_CONFIG.eventId,
    role = 'organizer',
    currentAgent,
    useDemoData = true,
}: TravelDeskProps) {
    const [config, setConfig] = useState<EventTravelConfig>(DEMO_CONFIG);
    const [agents, setAgents] = useState<ApprovedAgent[]>(DEMO_CONFIG.agents);
    const [tab, setTab] = useState<TabId>('roster');
    const [expandedAgent, setExpanded] = useState<string | null>(null);

    // Live Firestore sync in production
    useEffect(() => {
        if (useDemoData) return;
        let unsub: Unsubscribe | undefined;
        try {
            unsub = onSnapshot(collection(db, 'events', eventId, 'attendees'), snap => {
                const live: ApprovedAgent[] = snap.docs.map(d => ({
                    id: d.id, ...d.data(),
                    status: d.data().status?.toLowerCase() as ApprovedAgent['status'] ?? 'approved',
                } as ApprovedAgent));
                setAgents(live);
            });
        } catch { /* demo */ }
        return () => unsub?.();
    }, [eventId, useDemoData]);

    const handleBooked = (agent: ApprovedAgent, flight: FlightOption, expenseRef: string) => {
        setAgents(prev => prev.map(a =>
            a.id === agent.id
                ? { ...a, status: 'confirmed', bookedFlight: flight, expenseRef }
                : a
        ));
    };

    const bookedCount = agents.filter(a => a.status === 'confirmed').length;
    const awaitingCount = agents.filter(a => a.status === 'approved').length;
    const totalSpend = agents.filter(a => a.status === 'confirmed')
        .reduce((s, a) => s + (a.bookedFlight?.price ?? 0), 0);

    // ── Agent view ──────────────────────────────────────────────────────────
    if (role === 'agent' && currentAgent) {
        const agentData = agents.find(a => a.id === currentAgent.id) ?? {
            ...currentAgent, status: 'approved' as AgentBookingStatus,
        };
        return (
            <div className="min-h-screen bg-psi-page p-4 md:p-6 max-w-2xl mx-auto space-y-6">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/20">
                            <Plane size={18} className="text-psi-primary" />
                        </div>
                        <span className="text-blue-400 text-xs font-black tracking-[0.2em] uppercase">Corporate Travel Desk</span>
                    </div>
                    <h1 className="text-2xl font-extrabold text-psi-primary tracking-tight">Book Your Flight</h1>
                    <p className="text-psi-secondary text-sm mt-1">
                        {config.eventName} · {config.route.fromCity} → {config.route.toCity}
                    </p>
                </div>
                <AgentFlightSearch
                    agent={agentData}
                    config={config}
                    useDemoData={useDemoData}
                    onBooked={handleBooked}
                />
            </div>
        );
    }

    // ── Organizer / Manager view ────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-psi-page p-4 md:p-6 space-y-6 max-w-5xl mx-auto">

            {/* Header */}
            <div>
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/20">
                        <Plane size={18} className="text-psi-primary" />
                    </div>
                    <span className="text-blue-400 text-xs font-black tracking-[0.2em] uppercase">Integrated Travel Desk</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-psi-primary tracking-tight">Corporate Travel</h1>
                <p className="text-psi-secondary text-sm mt-1">
                    {config.eventName} · Automatic flight booking &amp; expense ledger
                </p>

                {/* KPI pills */}
                <div className="flex items-center gap-3 mt-3 flex-wrap">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-psi-muted bg-psi-subtle border border-psi px-3 py-1.5 rounded-full">
                        <Users size={11} className="text-blue-400" />
                        <span className="text-blue-400 font-black">{agents.length}</span> agents
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-psi-muted bg-psi-subtle border border-psi px-3 py-1.5 rounded-full">
                        <CheckCircle2 size={11} className="text-emerald-400" />
                        <span className="text-emerald-400 font-black">{bookedCount}</span> booked
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-psi-muted bg-psi-subtle border border-psi px-3 py-1.5 rounded-full">
                        <Clock size={11} className="text-amber-400" />
                        <span className="text-amber-400 font-black">{awaitingCount}</span> awaiting
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-psi-muted bg-psi-subtle border border-psi px-3 py-1.5 rounded-full">
                        <Banknote size={11} className="text-rose-400" />
                        <span className="text-rose-400 font-black">{fmtAed(totalSpend)}</span> spent
                    </div>
                    {useDemoData && (
                        <span className="text-[10px] text-psi-muted bg-psi-subtle border border-psi px-2 py-1 rounded-full font-bold">Demo Mode</span>
                    )}
                </div>
            </div>

            {/* Tab bar */}
            <div className="flex gap-1 bg-psi-subtle p-1 rounded-2xl">
                {([
                    { id: 'roster' as TabId, label: 'Agent Roster', icon: <Users size={13} /> },
                    { id: 'ledger' as TabId, label: 'Expense Ledger', icon: <ReceiptText size={13} /> },
                    { id: 'logistics' as TabId, label: 'Travel Desk', icon: <Plane size={13} /> },
                    { id: 'config' as TabId, label: 'Configuration', icon: <Settings2 size={13} /> },
                ] as const).map(t => (
                    <button key={t.id} id={`td-tab-${t.id}`} onClick={() => setTab(t.id)}
                        className={clsx(
                            'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all',
                            tab === t.id
                                ? 'bg-blue-600 text-psi-primary shadow-md shadow-blue-500/20'
                                : 'text-psi-muted hover:text-psi-primary'
                        )}>
                        {t.icon} {t.label}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            <AnimatePresence mode="wait">
                <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15 }}>

                    {/* ROSTER tab */}
                    {tab === 'roster' && (
                        <div className="space-y-3">
                            {agents.map((agent, i) => {
                                const badge = statusBadge(agent.status);
                                const isOpen = expandedAgent === agent.id;
                                return (
                                    <motion.div key={agent.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                                        className="psi-card rounded-2xl overflow-hidden border border-psi">
                                        <div className="p-4 flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-white dark:to-slate-900 flex items-center justify-center text-psi-primary font-bold text-sm flex-shrink-0">
                                                {agent.name.split(' ').map(p => p[0]).join('').slice(0, 2)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className="font-extrabold text-psi-primary text-sm">{agent.name}</p>
                                                    <span className={clsx('text-[10px] font-black px-2 py-0.5 rounded-full', tierColour(agent.tier))}>{agent.tier}</span>
                                                    <span className={clsx('text-[10px] font-black px-2 py-0.5 rounded-full border', badge.cls)}>{badge.label}</span>
                                                </div>
                                                <p className="text-psi-muted text-xs">{agent.email} · {agent.branch}</p>
                                                {agent.status === 'confirmed' && agent.bookedFlight && (
                                                    <p className="text-emerald-500 text-xs font-bold mt-0.5">
                                                        {agent.bookedFlight.flightNumber} · {fmtAed(agent.bookedFlight.price)} auto-expensed
                                                    </p>
                                                )}
                                            </div>
                                            {agent.status === 'approved' && (
                                                <button id={`expand-agent-${agent.id}`}
                                                    onClick={() => setExpanded(isOpen ? null : agent.id)}
                                                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-psi-primary text-xs font-extrabold flex-shrink-0 shadow-md shadow-blue-500/20 transition-all">
                                                    <Plane size={12} />
                                                    {isOpen ? 'Close' : 'Search Flights'}
                                                    {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                                </button>
                                            )}
                                            {agent.status === 'confirmed' && (
                                                <BadgeCheck size={20} className="text-emerald-400 flex-shrink-0" />
                                            )}
                                        </div>
                                        <AnimatePresence>
                                            {isOpen && agent.status === 'approved' && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.22 }}
                                                    className="overflow-hidden border-t border-psi">
                                                    <div className="p-4 bg-psi-subtle">
                                                        <AgentFlightSearch
                                                            agent={agent}
                                                            config={config}
                                                            useDemoData={useDemoData}
                                                            onBooked={(a, f, ref) => {
                                                                handleBooked(a, f, ref);
                                                                setExpanded(null);
                                                            }}
                                                        />
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </motion.div>
                                );
                            })}
                            {agents.length === 0 && (
                                <div className="psi-card rounded-2xl p-12 text-center border border-psi">
                                    <Users size={32} className="mx-auto text-psi-muted mb-3" />
                                    <p className="text-psi-muted text-sm">No approved agents yet.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {tab === 'ledger' && <BookingLedger agents={agents} />}
                    {tab === 'logistics' && <LogisticsStatusPanel eventId={eventId} useDemoData={useDemoData} />}
                    {tab === 'config' && <OrganizerConfigPanel config={config} onSave={c => setConfig(c)} />}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}

// ── Type alias for backward compat ────────────────────────────────────────────
type AgentBookingStatus = import('./traveldesk/types').AgentBookingStatus;
