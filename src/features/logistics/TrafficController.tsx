/**
 * TrafficController.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * FLOOR TRAFFIC CONTROLLER — Organizer Command View
 *
 * A visual event-floor map with drag-and-drop agent zone management.
 *
 * Features:
 *   - Visual floor plan: Zone A (Main Floor), Zone B (Consultation Pods),
 *     VIP Lounge, Reception Desk, Overflow Area — each with a distinct
 *     colour, capacity indicator, and live agent badge cluster.
 *   - Drag-and-drop: grab an agent badge from any zone, drop onto another.
 *     Uses native HTML5 DnD API — zero extra deps.
 *   - Ping System: every zone-change fires mockPushNotification() which
 *     builds a real Gemini-style alert and writes to Firestore
 *     events/{eventId}/traffic_alerts/{id}.
 *   - Agent-side alert panel: <AgentTrafficAlert> listens on
 *     events/{eventId}/traffic_alerts and pops a fullscreen banner for the
 *     targeted agent.
 *   - Command stats strip: total present, unassigned count, zone utilisation.
 *
 * Firestore paths:
 *   events/{eventId}/zone_assignments/{agentId}   ← zone per agent
 *   events/{eventId}/traffic_alerts/{alertId}      ← push alerts
 *
 * Production:
 *   Replace mockPushNotification() with a Cloud Function that calls
 *   Firebase Cloud Messaging (FCM) for real device push notifications.
 */

import React, {
    useCallback, useEffect, useRef, useState,
} from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    MapPin, Users, Bell, Zap, CheckCircle2,
    Star, Loader2, X, Crown, ArrowRight,
    AlertTriangle, Radio, BellRing, Maximize2,
} from 'lucide-react';
import {
    addDoc, collection, doc, onSnapshot,
    orderBy, query, serverTimestamp, setDoc,
    limit, Unsubscribe,
} from 'firebase/firestore';
import { db } from '../../services/firebase/firebaseConfig';
import {
    CheckInAgent, DEMO_AGENTS, TIER_STYLES,
} from '../check-in/CheckInUtils';

// ═══════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════

export type ZoneId =
    | 'zone_a'
    | 'zone_b'
    | 'vip_lounge'
    | 'reception'
    | 'overflow'
    | 'unassigned';

export interface FloorZone {
    id: ZoneId;
    label: string;
    shortLabel: string;
    capacity: number;
    color: string;          // tailwind bg for the zone tile
    border: string;
    accent: string;         // badge / header accent
    textAccent: string;
    icon: React.ReactNode;
    gridArea: string;       // CSS grid-area name
    description: string;
}

export interface TrafficAlert {
    id: string;
    agentId: string;
    agentName: string;
    fromZone: ZoneId;
    toZone: ZoneId;
    message: string;
    createdAt: string;
    acknowledged: boolean;
}

// ═══════════════════════════════════════════════════════════════════
// Zone config
// ═══════════════════════════════════════════════════════════════════

const ZONES: FloorZone[] = [
    {
        id: 'zone_a', label: 'Zone A — Main Floor', shortLabel: 'Zone A',
        capacity: 6,
        color: 'bg-blue-500/10', border: 'border-blue-500/30', accent: 'bg-blue-600', textAccent: 'text-blue-400',
        icon: <Users size={14} />,
        gridArea: 'zone-a',
        description: 'Primary exhibition floor — high walk-in traffic',
    },
    {
        id: 'zone_b', label: 'Zone B — Consultation Pods', shortLabel: 'Zone B',
        capacity: 4,
        color: 'bg-indigo-500/10', border: 'border-indigo-500/30', accent: 'bg-indigo-600', textAccent: 'text-indigo-400',
        icon: <MapPin size={14} />,
        gridArea: 'zone-b',
        description: 'Private consultation booths for qualified buyers',
    },
    {
        id: 'vip_lounge', label: 'VIP Lounge', shortLabel: 'VIP',
        capacity: 3,
        color: 'bg-violet-500/10', border: 'border-violet-500/30', accent: 'bg-violet-600', textAccent: 'text-violet-400',
        icon: <Crown size={14} />,
        gridArea: 'vip',
        description: 'High-net-worth client exclusives — Platinum tier only',
    },
    {
        id: 'reception', label: 'Reception Desk', shortLabel: 'Reception',
        capacity: 2,
        color: 'bg-emerald-500/10', border: 'border-emerald-500/30', accent: 'bg-emerald-600', textAccent: 'text-emerald-400',
        icon: <Star size={14} />,
        gridArea: 'reception',
        description: 'Front-of-house welcome & registration',
    },
    {
        id: 'overflow', label: 'Overflow Area', shortLabel: 'Overflow',
        capacity: 4,
        color: 'bg-amber-500/10', border: 'border-amber-500/30', accent: 'bg-amber-600', textAccent: 'text-amber-400',
        icon: <AlertTriangle size={14} />,
        gridArea: 'overflow',
        description: 'Surge capacity — activate when main floor is full',
    },
    {
        id: 'unassigned', label: 'Unassigned', shortLabel: 'Unassigned',
        capacity: 999,
        color: 'bg-white/3', border: 'border-black/10 dark:border-white/10', accent: 'bg-slate-600', textAccent: 'text-slate-900 dark:text-white/40',
        icon: <Users size={14} />,
        gridArea: 'unassigned',
        description: 'Agents not yet assigned to a zone',
    },
];

const ZONE_MAP = Object.fromEntries(ZONES.map(z => [z.id, z])) as Record<ZoneId, FloorZone>;

// ═══════════════════════════════════════════════════════════════════
// Demo agents — extend DEMO_AGENTS with zone colour overrides
// ═══════════════════════════════════════════════════════════════════

type ZoneAssignment = Record<string, ZoneId>;   // agentId → zoneId

const INITIAL_ASSIGNMENTS: ZoneAssignment = {
    agt_001: 'zone_a',
    agt_002: 'zone_a',
    agt_003: 'zone_b',
    agt_004: 'vip_lounge',
    agt_005: 'reception',
};

const DEMO_FLOOR_AGENTS: CheckInAgent[] = DEMO_AGENTS.map(a => ({
    ...a,
    status: 'physically_present' as const,
}));

// Add 4 extra demo agents for a richer map
const EXTRA_AGENTS: CheckInAgent[] = [
    { agentId: 'agt_006', agentName: 'Rashed Al-Nuaimi', email: '', phone: '+971506666666', branch: 'Abu Dhabi', tier: 'gold', managerApproved: true, flightUploaded: true, visaUploaded: true, status: 'physically_present' },
    { agentId: 'agt_007', agentName: 'Mia Zhang', email: '', phone: '+971507777777', branch: 'Dubai', tier: 'silver', managerApproved: true, flightUploaded: true, visaUploaded: true, status: 'physically_present' },
    { agentId: 'agt_008', agentName: 'Carlos Rivera', email: '', phone: '+971508888888', branch: 'Sharjah', tier: 'bronze', managerApproved: true, flightUploaded: true, visaUploaded: true, status: 'physically_present' },
    { agentId: 'agt_009', agentName: 'Priya Anand', email: '', phone: '+971509999999', branch: 'Abu Dhabi', tier: 'silver', managerApproved: true, flightUploaded: true, visaUploaded: true, status: 'physically_present' },
];

const ALL_AGENTS = [...DEMO_FLOOR_AGENTS, ...EXTRA_AGENTS];

const INITIAL_EXTRA: ZoneAssignment = {
    agt_006: 'zone_a',
    agt_007: 'zone_b',
    agt_008: 'overflow',
    agt_009: 'unassigned',
};

// ═══════════════════════════════════════════════════════════════════
// Push notification mock
// ═══════════════════════════════════════════════════════════════════

async function mockPushNotification(
    eventId: string,
    agent: CheckInAgent,
    fromZone: ZoneId,
    toZone: ZoneId,
): Promise<void> {
    const toLabel = ZONE_MAP[toZone].label;
    const fromLabel = ZONE_MAP[fromZone].label;

    const isVIP = toZone === 'vip_lounge';
    const isOverflow = toZone === 'overflow';

    const message = isVIP
        ? `🔔 Traffic Alert: ${agent.agentName}, please move to the VIP Lounge immediately. High-net-worth clients require premium assistance.`
        : isOverflow
            ? `⚠️ Traffic Alert: ${agent.agentName}, overflow capacity is being activated. Please report to the Overflow Area to manage visitor surge.`
            : `📍 Traffic Alert: ${agent.agentName}, you have been redeployed from ${fromLabel} to ${toLabel}. Please make your way there now.`;

    console.info(`[TrafficController] 🔔 Push → ${agent.agentName}: "${message}"`);

    // Write to Firestore (agent's AgentTrafficAlert listens here)
    await addDoc(collection(db, 'events', eventId, 'traffic_alerts'), {
        agentId: agent.agentId,
        agentName: agent.agentName,
        fromZone,
        toZone,
        message,
        createdAt: new Date().toISOString(),
        _createdAt: serverTimestamp(),
        acknowledged: false,
    });

    // Write zone assignment to Firestore
    await setDoc(
        doc(db, 'events', eventId, 'zone_assignments', agent.agentId),
        { zoneId: toZone, updatedAt: serverTimestamp(), agentName: agent.agentName },
        { merge: true }
    );
}

// ═══════════════════════════════════════════════════════════════════
// Agent badge pill (draggable)
// ═══════════════════════════════════════════════════════════════════

function AgentBadge({
    agent,
    onDragStart,
    isDragging,
    compact = false,
}: {
    agent: CheckInAgent;
    onDragStart: () => void;
    isDragging: boolean;
    compact?: boolean;
}) {
    const t = TIER_STYLES[agent.tier];
    const initials = agent.agentName.split(' ').map(w => w[0]).slice(0, 2).join('');

    return (
        <motion.div
            layout
            draggable
            onDragStart={onDragStart}
            whileTap={{ scale: 0.95 }}
            className={`
                flex items-center gap-2 px-2.5 py-1.5 rounded-xl cursor-grab active:cursor-grabbing
                border transition-all select-none
                ${isDragging
                    ? 'opacity-40 border-white/30 bg-black/10 dark:bg-white/10'
                    : 'border-black/10 dark:border-white/10 bg-white/6 hover:bg-white/12 hover:border-black/20 dark:hover:border-white/20'
                }
                ${compact ? 'py-1 px-2' : ''}
            `}
            title={`${agent.agentName} · ${agent.branch} · Drag to reassign`}
        >
            {/* Avatar */}
            <div className={`w-6 h-6 rounded-lg ${t.badge} flex items-center justify-center text-[9px] font-black flex-shrink-0`}>
                {initials}
            </div>
            {!compact && (
                <div className="min-w-0">
                    <p className="text-slate-900 dark:text-white text-[11px] font-bold truncate max-w-[90px]">
                        {agent.agentName.split(' ')[0]}
                    </p>
                    <p className="text-slate-900 dark:text-white/30 text-[8px] truncate">{agent.branch}</p>
                </div>
            )}
        </motion.div>
    );
}

// ═══════════════════════════════════════════════════════════════════
// Zone tile (drop target)
// ═══════════════════════════════════════════════════════════════════

function ZoneTile({
    zone,
    agents,
    isDragOver,
    onDragOver,
    onDragLeave,
    onDrop,
    draggingAgentId,
    onAgentDragStart,
    pinging,
}: {
    zone: FloorZone;
    agents: CheckInAgent[];
    isDragOver: boolean;
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: () => void;
    onDrop: (e: React.DragEvent) => void;
    draggingAgentId: string | null;
    onAgentDragStart: (agentId: string) => void;
    pinging: string | null;    // agentId that just got pinged
}) {
    const utilPct = Math.min((agents.length / zone.capacity) * 100, 100);
    const isFull = agents.length >= zone.capacity;
    const isUnassigned = zone.id === 'unassigned';

    return (
        <div
            onDragOver={e => { e.preventDefault(); onDragOver(e); }}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={`
                relative rounded-2xl border-2 transition-all duration-150 p-3 flex flex-col gap-2
                ${zone.color} ${zone.border}
                ${isDragOver
                    ? `ring-2 ${zone.accent.replace('bg-', 'ring-')}/60 scale-[1.01] border-opacity-100`
                    : ''}
                ${isUnassigned ? 'border-dashed' : ''}
                min-h-[120px]
            `}
        >
            {/* Zone header */}
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                    <span className={`${zone.textAccent}`}>{zone.icon}</span>
                    <span className={`text-[11px] font-extrabold uppercase tracking-widest ${zone.textAccent}`}>
                        {zone.shortLabel}
                    </span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-black ${isFull ? 'text-rose-400' : 'text-slate-900 dark:text-white/30'}`}>
                        {agents.length}/{zone.capacity}
                    </span>
                    {isFull && <AlertTriangle size={10} className="text-rose-400" />}
                </div>
            </div>

            {/* Capacity bar */}
            {!isUnassigned && (
                <div className="h-1 bg-white/8 rounded-full overflow-hidden">
                    <motion.div
                        className={`h-full rounded-full ${utilPct >= 100 ? 'bg-rose-500'
                                : utilPct >= 75 ? 'bg-amber-500'
                                    : zone.accent
                            }`}
                        animate={{ width: `${utilPct}%` }}
                        transition={{ type: 'spring', stiffness: 200, damping: 24 }}
                    />
                </div>
            )}

            {/* Agent badges */}
            <div className="flex flex-wrap gap-1.5 min-h-[36px]">
                <AnimatePresence>
                    {agents.map(agent => (
                        <motion.div key={agent.agentId}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                        >
                            <div className="relative">
                                <AgentBadge
                                    agent={agent}
                                    onDragStart={() => onAgentDragStart(agent.agentId)}
                                    isDragging={draggingAgentId === agent.agentId}
                                />
                                {/* Ping flash */}
                                {pinging === agent.agentId && (
                                    <motion.div
                                        className="absolute inset-0 rounded-xl bg-indigo-500/60 pointer-events-none"
                                        initial={{ opacity: 1 }} animate={{ opacity: 0 }}
                                        transition={{ duration: 0.8 }}
                                    />
                                )}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
                {agents.length === 0 && (
                    <div className="flex items-center gap-1.5 text-slate-900 dark:text-white/15 text-[10px]">
                        <MapPin size={10} />
                        <span>Drop agent here</span>
                    </div>
                )}
            </div>

            {/* Drop indicator */}
            {isDragOver && (
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="absolute inset-0 rounded-2xl border-2 border-dashed border-white/40 bg-black/5 dark:bg-white/5 flex items-center justify-center pointer-events-none"
                >
                    <span className="text-slate-900 dark:text-white/50 text-xs font-bold">Drop here</span>
                </motion.div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════
// Alert log panel
// ═══════════════════════════════════════════════════════════════════

function AlertLogEntry({ alert }: { alert: TrafficAlert }) {
    const from = ZONE_MAP[alert.fromZone];
    const to = ZONE_MAP[alert.toZone];
    return (
        <motion.div
            initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
            className="bg-white/4 border border-white/8 rounded-xl p-3"
        >
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                <span className={`text-[9px] font-black uppercase tracking-widest ${from.textAccent}`}>{from.shortLabel}</span>
                <ArrowRight size={9} className="text-slate-900 dark:text-white/20" />
                <span className={`text-[9px] font-black uppercase tracking-widest ${to.textAccent}`}>{to.shortLabel}</span>
            </div>
            <p className="text-slate-900 dark:text-white/70 text-xs font-bold truncate">{alert.agentName}</p>
            <p className="text-slate-900 dark:text-white/30 text-[10px] mt-0.5 leading-relaxed line-clamp-2">{alert.message}</p>
        </motion.div>
    );
}

// ═══════════════════════════════════════════════════════════════════
// AgentTrafficAlert — mobile fullscreen alert for the field agent
// ═══════════════════════════════════════════════════════════════════

export function AgentTrafficAlert({
    eventId, agentId,
}: { eventId: string; agentId: string }) {
    const [alert, setAlert] = useState<TrafficAlert | null>(null);

    useEffect(() => {
        const unsub: Unsubscribe = onSnapshot(
            query(
                collection(db, 'events', eventId, 'traffic_alerts'),
                orderBy('_createdAt', 'desc'),
                limit(5),
            ),
            snap => {
                const live = snap.docs
                    .map(d => ({ id: d.id, ...d.data() } as TrafficAlert))
                    .find(a => a.agentId === agentId && !a.acknowledged);
                setAlert(live ?? null);
            }
        );
        return () => unsub();
    }, [eventId, agentId]);

    if (!alert) return null;

    const toZone = ZONE_MAP[alert.toZone];

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center px-6 text-center"
            >
                {/* Pulsing rings */}
                <div className="relative mb-8">
                    {[1, 2, 3].map(i => (
                        <motion.div key={i}
                            className="absolute inset-0 rounded-full border-2 border-indigo-500/40"
                            initial={{ scale: 1, opacity: 0.7 }}
                            animate={{ scale: 1 + i * 0.4, opacity: 0 }}
                            transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.4, ease: 'easeOut' }}
                        />
                    ))}
                    <div className="w-20 h-20 rounded-full bg-indigo-500/20 border-2 border-indigo-500/60 flex items-center justify-center">
                        <BellRing size={32} className="text-indigo-400" />
                    </div>
                </div>

                <p className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em] mb-2">
                    Floor Traffic Alert
                </p>
                <h2 className="text-slate-900 dark:text-white text-2xl font-extrabold mb-2">Zone Reassignment</h2>
                <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl ${toZone.color} border ${toZone.border} mb-6`}>
                    <span className={toZone.textAccent}>{toZone.icon}</span>
                    <span className={`text-sm font-extrabold ${toZone.textAccent}`}>{toZone.label}</span>
                </div>

                <div className="bg-white/6 border border-black/10 dark:border-white/10 rounded-2xl p-5 max-w-sm w-full text-left mb-6">
                    <p className="text-slate-900 dark:text-white/80 text-sm leading-relaxed">{alert.message}</p>
                </div>

                <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setAlert(null)}
                    className="w-full max-w-sm flex items-center justify-center gap-3 py-5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-slate-900 dark:text-white font-extrabold text-base shadow-2xl shadow-indigo-600/40"
                >
                    <CheckCircle2 size={20} /> Acknowledged — Moving Now
                </motion.button>
                <p className="text-slate-900 dark:text-white/20 text-xs mt-4">Please make your way to the {toZone.shortLabel} immediately.</p>
            </motion.div>
        </AnimatePresence>
    );
}

// ═══════════════════════════════════════════════════════════════════
// Main TrafficController
// ═══════════════════════════════════════════════════════════════════

export default function TrafficController({
    eventId = 'event_demo',
    eventName = 'London Luxury Property Expo 2026',
}: {
    eventId?: string;
    eventName?: string;
}) {
    const [assignments, setAssignments] = useState<ZoneAssignment>({
        ...INITIAL_ASSIGNMENTS,
        ...INITIAL_EXTRA,
    });
    const [agents] = useState<CheckInAgent[]>(ALL_AGENTS);
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [dragOverZone, setDragOverZone] = useState<ZoneId | null>(null);
    const [alerts, setAlerts] = useState<TrafficAlert[]>([]);
    const [pingingId, setPingingId] = useState<string | null>(null);
    const [dispatching, setDispatching] = useState(false);
    const [lastAction, setLastAction] = useState<string | null>(null);

    // Live alert log from Firestore
    useEffect(() => {
        const unsub: Unsubscribe = onSnapshot(
            query(
                collection(db, 'events', eventId, 'traffic_alerts'),
                orderBy('createdAt', 'desc'),
                limit(20),
            ),
            snap => {
                if (!snap.empty)
                    setAlerts(snap.docs.map(d => ({ id: d.id, ...d.data() } as TrafficAlert)));
            },
            () => { /* Firestore unavailable — use local state */ }
        );
        return () => unsub();
    }, [eventId]);

    // Live zone assignments from Firestore
    useEffect(() => {
        const unsub: Unsubscribe = onSnapshot(
            collection(db, 'events', eventId, 'zone_assignments'),
            snap => {
                if (!snap.empty) {
                    const live: ZoneAssignment = {};
                    snap.docs.forEach(d => { live[d.id] = (d.data().zoneId as ZoneId) ?? 'unassigned'; });
                    setAssignments(prev => ({ ...prev, ...live }));
                }
            },
            () => { }
        );
        return () => unsub();
    }, [eventId]);

    // DnD handlers
    const handleDragStart = useCallback((agentId: string) => {
        setDraggingId(agentId);
    }, []);

    const handleDrop = useCallback(async (targetZoneId: ZoneId) => {
        if (!draggingId || targetZoneId === assignments[draggingId]) {
            setDraggingId(null);
            setDragOverZone(null);
            return;
        }

        const agent = agents.find(a => a.agentId === draggingId);
        const fromZone = assignments[draggingId] ?? 'unassigned';

        if (!agent) { setDraggingId(null); setDragOverZone(null); return; }

        // Optimistic UI update
        setAssignments(prev => ({ ...prev, [draggingId]: targetZoneId }));
        setDraggingId(null);
        setDragOverZone(null);

        // Ping flash
        setPingingId(agent.agentId);
        setTimeout(() => setPingingId(null), 900);

        // Fire notification + Firestore write
        setDispatching(true);
        try {
            await mockPushNotification(eventId, agent, fromZone as ZoneId, targetZoneId);

            // Add to local alert log if Firestore is unavailable
            const toZoneLabel = ZONE_MAP[targetZoneId].label;
            const fromZoneLabel = ZONE_MAP[fromZone as ZoneId].label;
            const message = targetZoneId === 'vip_lounge'
                ? `🔔 Traffic Alert: ${agent.agentName}, please move to the VIP Lounge immediately. High-net-worth clients require premium assistance.`
                : `📍 Traffic Alert: ${agent.agentName}, redeployed from ${fromZoneLabel} to ${toZoneLabel}. Please make your way there now.`;

            const newAlert: TrafficAlert = {
                id: `local_${Date.now()}`,
                agentId: agent.agentId,
                agentName: agent.agentName,
                fromZone: fromZone as ZoneId,
                toZone: targetZoneId,
                message,
                createdAt: new Date().toISOString(),
                acknowledged: false,
            };
            setAlerts(prev => [newAlert, ...prev.slice(0, 19)]);
            setLastAction(`📍 ${agent.agentName.split(' ')[0]} → ${ZONE_MAP[targetZoneId].shortLabel}`);
            setTimeout(() => setLastAction(null), 4000);
        } finally {
            setDispatching(false);
        }
    }, [draggingId, assignments, agents, eventId]);

    // Agent grouping
    const agentsInZone = useCallback((zoneId: ZoneId): CheckInAgent[] => {
        return agents.filter(a => (assignments[a.agentId] ?? 'unassigned') === zoneId);
    }, [agents, assignments]);

    const totalAssigned = agents.filter(a => (assignments[a.agentId] ?? 'unassigned') !== 'unassigned').length;
    const totalUnassigned = agents.filter(a => (assignments[a.agentId] ?? 'unassigned') === 'unassigned').length;

    // Zones to render on the floor map (all except 'unassigned')
    const floorZones = ZONES.filter(z => z.id !== 'unassigned');
    const unassignedZone = ZONES.find(z => z.id === 'unassigned')!;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col">

            {/* ── Header ─────────────────────────────────────── */}
            <header className="border-b border-white/8 px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <div className="flex items-center gap-2 mb-0.5">
                        <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center">
                            <Radio size={13} className="text-slate-900 dark:text-white" />
                        </div>
                        <span className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.25em]">Floor Control</span>
                        {dispatching && (
                            <span className="flex items-center gap-1 text-[10px] text-indigo-400">
                                <Loader2 size={9} className="animate-spin" /> Sending alert…
                            </span>
                        )}
                    </div>
                    <h1 className="text-slate-900 dark:text-white text-xl font-extrabold">Traffic Controller</h1>
                    <p className="text-slate-900 dark:text-white/30 text-xs mt-0.5">{eventName}</p>
                </div>

                {/* KPI strip */}
                <div className="flex items-center gap-2 flex-wrap">
                    {[
                        { label: 'On Floor', value: totalAssigned, color: 'text-emerald-400', bg: 'bg-emerald-500/10', ring: 'ring-emerald-500/20' },
                        { label: 'Unassigned', value: totalUnassigned, color: 'text-amber-400', bg: 'bg-amber-500/10', ring: 'ring-amber-500/20' },
                        { label: 'Alerts Sent', value: alerts.length, color: 'text-indigo-400', bg: 'bg-indigo-500/10', ring: 'ring-indigo-500/20' },
                    ].map(({ label, value, color, bg, ring }) => (
                        <div key={label} className={`px-3 py-2 rounded-xl ring-1 ${bg} ${ring} text-center min-w-[64px]`}>
                            <p className={`text-xl font-extrabold ${color}`}>{value}</p>
                            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-900 dark:text-white/25">{label}</p>
                        </div>
                    ))}
                </div>
            </header>

            {/* Success toast */}
            <AnimatePresence>
                {lastAction && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 bg-indigo-600 text-slate-900 dark:text-white text-xs font-extrabold px-4 py-2.5 rounded-2xl shadow-2xl shadow-indigo-600/30"
                    >
                        <Bell size={13} />{lastAction} — Push notification sent ✓
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Body ───────────────────────────────────────── */}
            <div className="flex flex-1 overflow-hidden gap-0">

                {/* LEFT — Floor map */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Maximize2 size={13} className="text-slate-900 dark:text-white/30" />
                        <p className="text-slate-900 dark:text-white/30 text-xs font-bold uppercase tracking-widest">Event Floor Plan</p>
                        <span className="text-slate-900 dark:text-white/15 text-[10px]">— drag agent badges between zones to redeploy</span>
                    </div>

                    {/* Floor grid */}
                    <div
                        className="grid gap-3"
                        style={{
                            gridTemplateAreas: `
                                "zone-a zone-a zone-b"
                                "vip reception overflow"
                            `,
                            gridTemplateColumns: '1fr 1fr 1fr',
                        }}
                    >
                        {floorZones.map(zone => (
                            <div key={zone.id} style={{ gridArea: zone.gridArea }}>
                                <ZoneTile
                                    zone={zone}
                                    agents={agentsInZone(zone.id)}
                                    isDragOver={dragOverZone === zone.id}
                                    onDragOver={() => setDragOverZone(zone.id)}
                                    onDragLeave={() => setDragOverZone(null)}
                                    onDrop={() => handleDrop(zone.id)}
                                    draggingAgentId={draggingId}
                                    onAgentDragStart={handleDragStart}
                                    pinging={pingingId}
                                />
                            </div>
                        ))}
                    </div>

                    {/* Unassigned bench */}
                    <div className="mt-4">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-slate-900 dark:text-white/20 text-[10px] font-bold uppercase tracking-widest">Holding Area</span>
                            <span className="text-slate-900 dark:text-white/15 text-[9px]">← agents here are not yet deployed</span>
                        </div>
                        <ZoneTile
                            zone={unassignedZone}
                            agents={agentsInZone('unassigned')}
                            isDragOver={dragOverZone === 'unassigned'}
                            onDragOver={() => setDragOverZone('unassigned')}
                            onDragLeave={() => setDragOverZone(null)}
                            onDrop={() => handleDrop('unassigned')}
                            draggingAgentId={draggingId}
                            onAgentDragStart={handleDragStart}
                            pinging={pingingId}
                        />
                    </div>

                    {/* Legend */}
                    <div className="mt-4 flex flex-wrap gap-3">
                        {[
                            { label: '≥ 75% capacity', color: 'bg-amber-500' },
                            { label: '100% / full', color: 'bg-rose-500' },
                            { label: 'Normal', color: 'bg-emerald-500' },
                        ].map(({ label, color }) => (
                            <div key={label} className="flex items-center gap-1.5 text-[10px] text-slate-900 dark:text-white/30">
                                <span className={`w-2 h-2 rounded-sm ${color}`} />
                                {label}
                            </div>
                        ))}
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-900 dark:text-white/20 ml-auto">
                            <Zap size={10} /> Drag agent → zone to redeploy &amp; send push alert
                        </div>
                    </div>
                </div>

                {/* RIGHT — Alert log */}
                <div className="hidden lg:flex w-72 flex-col border-l border-white/8 overflow-hidden">
                    <div className="px-4 py-4 border-b border-white/8">
                        <div className="flex items-center gap-2">
                            <Bell size={13} className="text-indigo-400" />
                            <p className="text-slate-900 dark:text-white font-extrabold text-sm">Alert Log</p>
                        </div>
                        <p className="text-slate-900 dark:text-white/25 text-[10px] mt-0.5">{alerts.length} notifications sent</p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        <AnimatePresence mode="popLayout">
                            {alerts.map(alert => (
                                <AlertLogEntry key={alert.id} alert={alert} />
                            ))}
                        </AnimatePresence>
                        {alerts.length === 0 && (
                            <div className="text-center py-12 text-slate-900 dark:text-white/15">
                                <Bell size={24} className="mx-auto mb-2 opacity-30" />
                                <p className="text-xs">No alerts yet</p>
                                <p className="text-[10px] mt-1">Drag an agent to trigger one</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
