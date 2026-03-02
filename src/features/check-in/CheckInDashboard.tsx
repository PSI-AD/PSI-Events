/**
 * CheckInDashboard.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Root page for /check-in — role-based router with event selector.
 * Switches between AgentPassView and OrganizerScannerView.
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { QrCode, ScanLine, Calendar, ChevronDown, Loader2, Info, Trophy } from 'lucide-react';
import AgentPassView from './AgentPassView';
import OrganizerScannerView from './OrganizerScannerView';
import LiveLeaderboard from '../events/LiveLeaderboard';
import {
    CheckInAgent,
    CheckInEvent,
    DEMO_EVENT,
    DEMO_AGENTS,
    fetchUpcomingEvents,
} from './CheckInUtils';

type Role = 'agent' | 'organizer' | 'leaderboard';

function clsx(...c: (string | false | undefined | null)[]) {
    return c.filter(Boolean).join(' ');
}

export default function CheckInDashboard() {
    const [role, setRole] = useState<Role>('agent');
    const [events, setEvents] = useState<CheckInEvent[]>([]);
    const [selectedEvent, setSelectedEvent] = useState<CheckInEvent>(DEMO_EVENT);
    const [loadingEvents, setLoadingEvents] = useState(true);
    const [useDemoData, setUseDemoData] = useState(false);

    // For agent view — use first demo agent as the "current user"
    const demoAgent: CheckInAgent = DEMO_AGENTS[0];

    useEffect(() => {
        fetchUpcomingEvents()
            .then(evts => {
                if (evts.length > 0) {
                    setEvents(evts);
                    setSelectedEvent(evts[0]);
                    setUseDemoData(false);
                } else {
                    // No live events — fall back to demo
                    setEvents([DEMO_EVENT]);
                    setSelectedEvent(DEMO_EVENT);
                    setUseDemoData(true);
                }
            })
            .catch(() => {
                setEvents([DEMO_EVENT]);
                setSelectedEvent(DEMO_EVENT);
                setUseDemoData(true);
            })
            .finally(() => setLoadingEvents(false));
    }, []);

    return (
        <div className="min-h-screen bg-psi-page">

            {/* ── Controls bar ──────────────────────────────────────────────────── */}
            <div className="bg-psi-raised border-b border-psi px-4 py-3 no-print">

                {/* Role switcher */}
                <div className="flex gap-1 bg-psi-subtle p-1 mb-3 rounded-xl">
                    {([
                        { id: 'agent', label: 'My QR Pass', icon: <QrCode size={14} /> },
                        { id: 'organizer', label: 'Scanner', icon: <ScanLine size={14} /> },
                        { id: 'leaderboard', label: 'Leaderboard', icon: <Trophy size={14} /> },
                    ] as { id: Role; label: string; icon: React.ReactNode }[]).map(r => (
                        <button
                            key={r.id}
                            id={`role-${r.id}`}
                            onClick={() => setRole(r.id)}
                            className={clsx(
                                'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all',
                                role === r.id
                                    ? 'bg-amber-500 text-slate-900 dark:text-white shadow'
                                    : 'text-psi-muted hover:text-psi-primary'
                            )}
                        >
                            {r.icon}
                            {r.label}
                        </button>
                    ))}
                </div>

                {/* Event selector */}
                <div className="relative">
                    <Calendar size={13} className="absolute left-3 top-3 text-slate-600 dark:text-slate-400" />
                    {loadingEvents ? (
                        <div className="flex items-center gap-2 bg-psi-subtle rounded-xl pl-9 pr-4 py-2.5">
                            <Loader2 size={14} className="animate-spin text-psi-muted" />
                            <span className="text-psi-muted text-xs">Loading events...</span>
                        </div>
                    ) : (
                        <select
                            id="event-selector"
                            value={selectedEvent.eventId}
                            onChange={e => {
                                const ev = events.find(ev => ev.eventId === e.target.value);
                                if (ev) setSelectedEvent(ev);
                            }}
                            className="psi-input w-full pl-9 pr-8 py-2.5 text-xs appearance-none"
                        >
                            {events.map(ev => (
                                <option key={ev.eventId} value={ev.eventId}>{ev.eventName}</option>
                            ))}
                        </select>
                    )}
                    <ChevronDown size={12} className="absolute right-3 top-3 text-slate-600 dark:text-slate-400 pointer-events-none" />
                </div>

                {/* Demo data notice */}
                {useDemoData && (
                    <div className="mt-2 flex items-center gap-1.5 text-[10px] text-amber-400 bg-amber-500/5 border border-amber-500/20 rounded-lg px-2.5 py-1.5">
                        <Info size={11} />
                        <span>Demo mode — no Firestore events found. Connect crm_events to use live data.</span>
                    </div>
                )}
            </div>

            {/* ── Role view ────────────────────────────────────────────────── */}
            <AnimatePresence mode="wait">
                {role === 'agent' ? (
                    <motion.div key="agent" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <AgentPassView agent={demoAgent} event={selectedEvent} />
                    </motion.div>
                ) : role === 'leaderboard' ? (
                    <motion.div key="leaderboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <LiveLeaderboard
                            eventId={selectedEvent.eventId}
                            eventName={selectedEvent.eventName}
                            currentAgentId={demoAgent.agentId}
                            currentAgentStatus={demoAgent.status}
                            useDemoData={useDemoData}
                        />
                    </motion.div>
                ) : (
                    <motion.div key="organizer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <OrganizerScannerView
                            event={selectedEvent}
                            organizerUid="demo_organizer"
                            useDemoData={useDemoData}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
