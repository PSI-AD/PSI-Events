/**
 * VIPConcierge.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * VIP WhatsApp Concierge — Concierge Control Center
 *
 * Exports:
 *   <VIPConcierge>          — Full control center (default export, /vip-concierge)
 *   <AgentInterceptAlert>   — Agent mobile fullscreen alert (drop into agent app)
 *
 * Firestore paths:
 *   events/{eventId}/vip_messages/{msgId}
 *     waMessageId, clientName, clientPhone, clientTier, preferredLanguage,
 *     body, receivedAt, status ('new'|'dispatched'|'completed'), assignedAgentId
 *
 *   events/{eventId}/intercept_tasks/{taskId}   ← NEW (distinct from vip_assignments)
 *     messageId, clientName, clientPhone, clientTier, snippet,
 *     assignedAgentId, assignedAgentName, status, createdAt, acknowledgedAt
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    MessageCircle, Crown, Zap, User, Phone, Clock,
    CheckCircle2, X, Send, Loader2, Bell, BellOff,
    ChevronRight, Star, AlertCircle, Users, Wifi,
    ArrowRight, Languages, Tag,
} from 'lucide-react';
import {
    addDoc, collection, doc, onSnapshot,
    orderBy, query, serverTimestamp, updateDoc,
    limit, Unsubscribe,
} from 'firebase/firestore';
import { db } from '../../services/firebase/firebaseConfig';

// ═══════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════

export type VIPTier = 'Platinum' | 'Gold' | 'Silver';
export type MsgStatus = 'new' | 'dispatched' | 'completed';
export type TaskStatus = 'pending' | 'acknowledged' | 'completed';

export interface VIPMessage {
    id: string;
    clientName: string;
    clientPhone: string;
    clientTier: VIPTier;
    preferredLanguage: string;
    body: string;
    receivedAt: string;
    status: MsgStatus;
    assignedAgentId?: string;
    assignedAgentName?: string;
    waMessageId?: string;
}

export interface InterceptTask {
    id: string;
    messageId: string;
    clientName: string;
    clientPhone: string;
    clientTier: VIPTier;
    snippet: string;
    preferredLanguage: string;
    assignedAgentId: string;
    assignedAgentName: string;
    status: TaskStatus;
    createdAt: string;
    acknowledgedAt?: string;
}

export interface ConciergeAgent {
    id: string;
    name: string;
    branch: string;
    tier: 'gold' | 'silver' | 'bronze';
    languages: string[];
    isPresent: boolean;
    activeTasks: number;
}

// ═══════════════════════════════════════════════════════════════════
// Constants & helpers
// ═══════════════════════════════════════════════════════════════════

const TIER_CONFIG: Record<VIPTier, { label: string; color: string; bg: string; ring: string; icon: React.ReactNode }> = {
    Platinum: { label: 'Platinum', color: 'text-violet-400', bg: 'bg-violet-500/15', ring: 'ring-violet-500/30', icon: <Crown size={11} /> },
    Gold: { label: 'Gold', color: 'text-amber-400', bg: 'bg-amber-500/15', ring: 'ring-amber-500/30', icon: <Star size={11} /> },
    Silver: { label: 'Silver', color: 'text-slate-300', bg: 'bg-slate-500/15', ring: 'ring-slate-500/30', icon: <Star size={11} /> },
};

const STATUS_COLORS: Record<MsgStatus, string> = {
    new: 'bg-rose-500',
    dispatched: 'bg-amber-500',
    completed: 'bg-emerald-500',
};

function timeAgo(iso: string) {
    const s = (Date.now() - new Date(iso).getTime()) / 1000;
    if (s < 60) return `${Math.floor(s)}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    return `${Math.floor(s / 3600)}h ago`;
}

// ── Demo data ────────────────────────────────────────────────────
const DEMO_MESSAGES: VIPMessage[] = [
    { id: 'm1', clientName: 'Dmitri Volkov', clientPhone: '+7 985 001 2345', clientTier: 'Platinum', preferredLanguage: 'Russian', body: 'Hello, I saw your Mamsha Al Saadiyat brochure. I am interested in a 3BR with sea view. What is the best price you can offer today at the expo?', receivedAt: new Date(Date.now() - 3 * 60000).toISOString(), status: 'new' },
    { id: 'm2', clientName: 'Li Wei', clientPhone: '+86 139 8765 4321', clientTier: 'Gold', preferredLanguage: 'Mandarin', body: 'We are a family of 4. Looking for investment property. Budget around 3M AED. Can someone meet us at the lobby in 10 minutes?', receivedAt: new Date(Date.now() - 8 * 60000).toISOString(), status: 'new' },
    { id: 'm3', clientName: 'Ahmed Al-Rashidi', clientPhone: '+971 50 444 7890', clientTier: 'Platinum', preferredLanguage: 'Arabic', body: 'Marhaba. Ana muhtaj musa\'ada fi al-taswiya. Areed aqabil muwazzaf mutakhasses fi Marina Blue.', receivedAt: new Date(Date.now() - 14 * 60000).toISOString(), status: 'dispatched', assignedAgentId: 'a2', assignedAgentName: 'Nour Al-Hamdan' },
    { id: 'm4', clientName: 'Isabella Rossi', clientPhone: '+39 02 8765 4321', clientTier: 'Silver', preferredLanguage: 'Italian', body: 'Good morning! I am attending the expo today. I would love to learn more about your off-plan properties on Yas Island. Is there someone available?', receivedAt: new Date(Date.now() - 22 * 60000).toISOString(), status: 'completed', assignedAgentId: 'a1', assignedAgentName: 'Khalid Al-Mansouri' },
    { id: 'm5', clientName: 'Priya Sharma', clientPhone: '+91 98765 43210', clientTier: 'Gold', preferredLanguage: 'Hindi', body: 'Hi! My husband and I are at the expo. We are seriously considering a 1BR or 2BR apartment. Can you send someone who speaks Hindi?', receivedAt: new Date(Date.now() - 31 * 60000).toISOString(), status: 'new' },
];

const DEMO_AGENTS: ConciergeAgent[] = [
    { id: 'a1', name: 'Khalid Al-Mansouri', branch: 'Dubai Marina', tier: 'gold', languages: ['Arabic', 'English'], isPresent: true, activeTasks: 1 },
    { id: 'a2', name: 'Nour Al-Hamdan', branch: 'Downtown', tier: 'gold', languages: ['Arabic', 'English', 'French'], isPresent: true, activeTasks: 1 },
    { id: 'a3', name: 'Sara Al-Marzouqi', branch: 'Business Bay', tier: 'silver', languages: ['Russian', 'English'], isPresent: true, activeTasks: 0 },
    { id: 'a4', name: 'Omar Bin Rashid', branch: 'Palm Jumeirah', tier: 'gold', languages: ['Arabic', 'English', 'Hindi'], isPresent: true, activeTasks: 0 },
    { id: 'a5', name: 'Yuki Tanaka', branch: 'JBR', tier: 'silver', languages: ['Japanese', 'English'], isPresent: false, activeTasks: 0 },
];

// ═══════════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════════

function TierBadge({ tier }: { tier: VIPTier }) {
    const c = TIER_CONFIG[tier];
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ring-1 ${c.bg} ${c.color} ${c.ring}`}>
            {c.icon}{c.label}
        </span>
    );
}

// ── Message Card ─────────────────────────────────────────────────
function MessageCard({
    msg, selected, onClick,
}: { msg: VIPMessage; selected: boolean; onClick: () => void }) {
    const isNew = msg.status === 'new';
    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            onClick={onClick}
            id={`vip-msg-${msg.id}`}
            className={`relative cursor-pointer rounded-2xl p-4 border transition-all ${selected
                    ? 'bg-indigo-500/10 border-indigo-500/40 ring-1 ring-indigo-500/30'
                    : 'bg-white/4 border-white/8 hover:border-white/15 hover:bg-white/6'
                }`}
        >
            {/* New indicator */}
            {isNew && (
                <span className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shadow-sm shadow-rose-500/60" />
            )}

            <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-sm ${TIER_CONFIG[msg.clientTier].bg} ${TIER_CONFIG[msg.clientTier].color}`}>
                    {msg.clientName.charAt(0)}
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-extrabold text-white text-sm truncate">{msg.clientName}</span>
                        <TierBadge tier={msg.clientTier} />
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                        <Languages size={10} className="text-white/30 flex-shrink-0" />
                        <span className="text-white/40 text-[10px]">{msg.preferredLanguage}</span>
                        <span className="text-white/20">·</span>
                        <Clock size={10} className="text-white/30 flex-shrink-0" />
                        <span className="text-white/40 text-[10px]">{timeAgo(msg.receivedAt)}</span>
                    </div>
                    <p className="text-white/60 text-xs leading-relaxed line-clamp-2">{msg.body}</p>

                    {/* Status */}
                    <div className="flex items-center gap-1.5 mt-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${STATUS_COLORS[msg.status]}`} />
                        <span className="text-[10px] font-bold text-white/30 capitalize">{msg.status}</span>
                        {msg.assignedAgentName && (
                            <span className="text-[10px] text-white/25">→ {msg.assignedAgentName.split(' ')[0]}</span>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

// ── Agent Picker ─────────────────────────────────────────────────
function AgentPicker({
    agents, selectedId, onSelect,
}: { agents: ConciergeAgent[]; selectedId: string | null; onSelect: (a: ConciergeAgent) => void }) {
    const tierColors = { gold: 'text-amber-400', silver: 'text-slate-300', bronze: 'text-orange-400' };
    return (
        <div className="space-y-2">
            {agents.map(agent => (
                <motion.button
                    key={agent.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onSelect(agent)}
                    disabled={!agent.isPresent}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${selectedId === agent.id
                            ? 'bg-indigo-500/15 border-indigo-500/40'
                            : agent.isPresent
                                ? 'bg-white/4 border-white/8 hover:border-white/15'
                                : 'bg-white/2 border-white/5 opacity-40 cursor-not-allowed'
                        }`}
                >
                    <div className={`w-8 h-8 rounded-xl bg-white/8 flex items-center justify-center font-black text-xs ${tierColors[agent.tier]}`}>
                        {agent.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-bold truncate">{agent.name}</p>
                        <p className="text-white/35 text-[10px]">{agent.branch} · {agent.languages.slice(0, 2).join(', ')}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {agent.activeTasks > 0 && (
                            <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 text-[9px] font-black flex items-center justify-center">{agent.activeTasks}</span>
                        )}
                        <span className={`w-2 h-2 rounded-full ${agent.isPresent ? 'bg-emerald-400' : 'bg-white/20'}`} />
                        {selectedId === agent.id && <CheckCircle2 size={14} className="text-indigo-400" />}
                    </div>
                </motion.button>
            ))}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════
// AgentInterceptAlert — mobile fullscreen alert for the agent
// ═══════════════════════════════════════════════════════════════════

export function AgentInterceptAlert({
    eventId, agentId,
}: { eventId: string; agentId: string }) {
    const [task, setTask] = useState<InterceptTask | null>(null);
    const [acking, setAcking] = useState(false);

    useEffect(() => {
        const unsub: Unsubscribe = onSnapshot(
            query(
                collection(db, 'events', eventId, 'intercept_tasks'),
                orderBy('createdAt', 'desc'),
                limit(5),
            ),
            snap => {
                const live = snap.docs
                    .map(d => ({ id: d.id, ...d.data() } as InterceptTask))
                    .find(t => t.assignedAgentId === agentId && t.status === 'pending');
                setTask(live ?? null);
            }
        );
        return () => unsub();
    }, [eventId, agentId]);

    const acknowledge = async () => {
        if (!task) return;
        setAcking(true);
        try {
            await updateDoc(doc(db, 'events', eventId, 'intercept_tasks', task.id), {
                status: 'acknowledged',
                acknowledgedAt: serverTimestamp(),
            });
        } catch (e) { console.error('[VIPConcierge] Ack error:', e); }
        finally { setAcking(false); }
    };

    if (!task) return null;

    const tc = TIER_CONFIG[task.clientTier];
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center px-6 text-center"
        >
            {/* Pulsing ring */}
            <div className="relative mb-8">
                {[1, 2, 3].map(i => (
                    <motion.div key={i} className="absolute inset-0 rounded-full border-2 border-rose-500/40"
                        initial={{ scale: 1, opacity: 0.6 }}
                        animate={{ scale: 1 + i * 0.4, opacity: 0 }}
                        transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.4, ease: 'easeOut' }}
                    />
                ))}
                <div className="w-20 h-20 rounded-full bg-rose-500/20 border-2 border-rose-500/60 flex items-center justify-center">
                    <Bell size={32} className="text-rose-400" />
                </div>
            </div>

            <p className="text-rose-400 text-[10px] font-black uppercase tracking-[0.3em] mb-2">Intercept Alert</p>
            <h2 className="text-white text-2xl font-extrabold mb-1">{task.clientName}</h2>
            <TierBadge tier={task.clientTier} />

            <div className="mt-6 bg-white/5 border border-white/10 rounded-2xl p-5 max-w-sm w-full text-left space-y-3">
                <div className="flex items-start gap-2">
                    <MessageCircle size={14} className="text-white/40 flex-shrink-0 mt-0.5" />
                    <p className="text-white/70 text-sm italic leading-relaxed">"{task.snippet}"</p>
                </div>
                <div className="flex items-center gap-2">
                    <Languages size={13} className="text-white/30" />
                    <span className="text-white/50 text-xs">Speak in: <strong className="text-white/80">{task.preferredLanguage}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                    <Phone size={13} className="text-white/30" />
                    <span className="text-white/50 text-xs">{task.clientPhone}</span>
                </div>
            </div>

            <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={acknowledge}
                disabled={acking}
                className="mt-8 w-full max-w-sm flex items-center justify-center gap-3 py-5 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-500 text-white font-extrabold text-base shadow-2xl shadow-rose-600/40 disabled:opacity-60"
            >
                {acking ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle2 size={20} />}
                {acking ? 'Confirming…' : 'I\'m On My Way — Acknowledge'}
            </motion.button>

            <p className="text-white/20 text-xs mt-4">Go meet the client now. Task will be tracked.</p>
        </motion.div>
    );
}

// ═══════════════════════════════════════════════════════════════════
// Main VIPConcierge — Control Center
// ═══════════════════════════════════════════════════════════════════

export default function VIPConcierge({
    eventId = 'event_demo',
}: { eventId?: string }) {
    const [messages, setMessages] = useState<VIPMessage[]>(DEMO_MESSAGES);
    const [agents] = useState<ConciergeAgent[]>(DEMO_AGENTS);
    const [selectedMsg, setSelectedMsg] = useState<VIPMessage | null>(DEMO_MESSAGES[0]);
    const [selectedAgent, setSelectedAgent] = useState<ConciergeAgent | null>(null);
    const [dispatching, setDispatching] = useState(false);
    const [justDispatched, setJustDispatched] = useState<string | null>(null);
    const [filterStatus, setFilterStatus] = useState<MsgStatus | 'all'>('all');
    const [tasks, setTasks] = useState<InterceptTask[]>([]);
    const pulseRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // ── Firestore real-time — messages & tasks ─────────────────────
    useEffect(() => {
        const unsub1: Unsubscribe = onSnapshot(
            query(collection(db, 'events', eventId, 'vip_messages'), orderBy('receivedAt', 'desc'), limit(30)),
            snap => {
                if (!snap.empty)
                    setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() } as VIPMessage)));
            }
        );
        const unsub2: Unsubscribe = onSnapshot(
            query(collection(db, 'events', eventId, 'intercept_tasks'), orderBy('createdAt', 'desc'), limit(20)),
            snap => setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as InterceptTask)))
        );
        // Simulate new incoming VIP message every 40s (demo)
        pulseRef.current = setInterval(() => {
            const fakeNames = ['Viktor Petrov', 'Mei Lin', 'Carlos Herrera', 'Fatima Al-Zahrawi'];
            const fakeLangs = ['Russian', 'Mandarin', 'Spanish', 'Arabic'];
            const fakeTiers: VIPTier[] = ['Platinum', 'Gold', 'Silver'];
            const fakeMsgs = [
                'Hello, we are at the lobby. Interested in 2-bedroom units. Can someone assist?',
                'Good day! We saw the Mamsha brochure. What ROI are you guaranteeing?',
                'We flew in from Moscow. Need to speak to a specialist urgently.',
            ];
            const idx = Math.floor(Math.random() * fakeNames.length);
            const newMsg: VIPMessage = {
                id: `sim_${Date.now()}`,
                clientName: fakeNames[idx],
                clientPhone: `+971 50 ${Math.floor(Math.random() * 9000000 + 1000000)}`,
                clientTier: fakeTiers[Math.floor(Math.random() * 3)],
                preferredLanguage: fakeLangs[idx],
                body: fakeMsgs[Math.floor(Math.random() * fakeMsgs.length)],
                receivedAt: new Date().toISOString(),
                status: 'new',
            };
            setMessages(prev => [newMsg, ...prev.slice(0, 19)]);
        }, 40_000);

        return () => { unsub1(); unsub2(); if (pulseRef.current) clearInterval(pulseRef.current); };
    }, [eventId]);

    // ── Dispatch intercept task ────────────────────────────────────
    const handleDispatch = useCallback(async () => {
        if (!selectedMsg || !selectedAgent) return;
        setDispatching(true);
        try {
            // Write Firestore task (real-time → agent's AgentInterceptAlert)
            await addDoc(collection(db, 'events', eventId, 'intercept_tasks'), {
                messageId: selectedMsg.id,
                clientName: selectedMsg.clientName,
                clientPhone: selectedMsg.clientPhone,
                clientTier: selectedMsg.clientTier,
                snippet: selectedMsg.body.slice(0, 120),
                preferredLanguage: selectedMsg.preferredLanguage,
                assignedAgentId: selectedAgent.id,
                assignedAgentName: selectedAgent.name,
                status: 'pending',
                createdAt: new Date().toISOString(),
                _createdAt: serverTimestamp(),
            });

            // Update message status in local state (simulate Firestore update)
            setMessages(prev => prev.map(m =>
                m.id === selectedMsg.id
                    ? { ...m, status: 'dispatched', assignedAgentId: selectedAgent.id, assignedAgentName: selectedAgent.name }
                    : m
            ));
            setJustDispatched(selectedMsg.id);
            setTimeout(() => setJustDispatched(null), 3000);
            setSelectedMsg(null);
            setSelectedAgent(null);
        } catch (e) {
            console.error('[VIPConcierge] Dispatch error:', e);
        } finally {
            setDispatching(false);
        }
    }, [selectedMsg, selectedAgent, eventId]);

    const filtered = messages.filter(m => filterStatus === 'all' || m.status === filterStatus);

    const kpis = {
        total: messages.length,
        newCount: messages.filter(m => m.status === 'new').length,
        dispatched: messages.filter(m => m.status === 'dispatched').length,
        completed: messages.filter(m => m.status === 'completed').length,
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col">

            {/* ── Header ─────────────────────────────────────── */}
            <header className="border-b border-white/8 px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <div className="flex items-center gap-2 mb-0.5">
                        <div className="w-6 h-6 rounded-lg bg-emerald-500 flex items-center justify-center">
                            <MessageCircle size={13} className="text-white" />
                        </div>
                        <span className="text-emerald-400 text-[10px] font-black uppercase tracking-[0.25em]">WhatsApp Concierge</span>
                        <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                            <Wifi size={9} /> Live
                        </span>
                    </div>
                    <h1 className="text-white text-xl font-extrabold">Concierge Control Center</h1>
                </div>

                {/* KPI strip */}
                <div className="flex gap-2">
                    {[
                        { label: 'New', value: kpis.newCount, color: 'text-rose-400', bg: 'bg-rose-500/10', ring: 'ring-rose-500/20' },
                        { label: 'Dispatched', value: kpis.dispatched, color: 'text-amber-400', bg: 'bg-amber-500/10', ring: 'ring-amber-500/20' },
                        { label: 'Completed', value: kpis.completed, color: 'text-emerald-400', bg: 'bg-emerald-500/10', ring: 'ring-emerald-500/20' },
                    ].map(({ label, value, color, bg, ring }) => (
                        <div key={label} className={`px-3 py-2 rounded-xl ring-1 ${bg} ${ring} text-center min-w-[64px]`}>
                            <p className={`text-lg font-extrabold ${color}`}>{value}</p>
                            <p className="text-[9px] font-bold uppercase tracking-widest text-white/30">{label}</p>
                        </div>
                    ))}
                </div>
            </header>

            {/* ── Body ───────────────────────────────────────── */}
            <div className="flex flex-1 overflow-hidden">

                {/* LEFT — Message feed */}
                <div className="w-full md:w-80 lg:w-96 flex flex-col border-r border-white/8 overflow-hidden flex-shrink-0">
                    {/* Filter bar */}
                    <div className="px-4 py-3 border-b border-white/6 flex gap-1.5 overflow-x-auto">
                        {(['all', 'new', 'dispatched', 'completed'] as const).map(s => (
                            <button key={s} id={`vip-filter-${s}`}
                                onClick={() => setFilterStatus(s)}
                                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${filterStatus === s
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-white/5 text-white/40 hover:text-white/70'
                                    }`}
                            >
                                {s === 'all' ? `All (${kpis.total})` : s}
                            </button>
                        ))}
                    </div>

                    {/* Messages scroll */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        <AnimatePresence mode="popLayout">
                            {filtered.map(msg => (
                                <MessageCard
                                    key={msg.id}
                                    msg={msg}
                                    selected={selectedMsg?.id === msg.id}
                                    onClick={() => { setSelectedMsg(msg); setSelectedAgent(null); }}
                                />
                            ))}
                        </AnimatePresence>
                        {filtered.length === 0 && (
                            <div className="text-center py-16 text-white/20">
                                <MessageCircle size={28} className="mx-auto mb-2 opacity-30" />
                                <p className="text-sm">No messages</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* CENTRE — Chat detail + dispatcher */}
                <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    <AnimatePresence mode="wait">
                        {selectedMsg ? (
                            <motion.div key={selectedMsg.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="flex-1 flex flex-col overflow-hidden">

                                {/* Chat header */}
                                <div className="px-6 py-4 border-b border-white/8 flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg ${TIER_CONFIG[selectedMsg.clientTier].bg} ${TIER_CONFIG[selectedMsg.clientTier].color}`}>
                                        {selectedMsg.clientName.charAt(0)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h2 className="text-white font-extrabold">{selectedMsg.clientName}</h2>
                                            <TierBadge tier={selectedMsg.clientTier} />
                                        </div>
                                        <div className="flex items-center gap-3 mt-0.5">
                                            <span className="text-white/40 text-xs flex items-center gap-1"><Phone size={10} />{selectedMsg.clientPhone}</span>
                                            <span className="text-white/40 text-xs flex items-center gap-1"><Languages size={10} />{selectedMsg.preferredLanguage}</span>
                                        </div>
                                    </div>
                                    <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[selectedMsg.status]} flex-shrink-0`} />
                                </div>

                                {/* Message bubble */}
                                <div className="flex-1 overflow-y-auto px-6 py-6">
                                    <div className="max-w-lg">
                                        {/* WhatsApp bubble */}
                                        <div className="bg-[#25D366]/10 border border-[#25D366]/25 rounded-2xl rounded-tl-sm px-4 py-3 mb-2">
                                            <p className="text-white/90 text-sm leading-relaxed">{selectedMsg.body}</p>
                                        </div>
                                        <div className="flex items-center gap-2 px-1">
                                            <div className="w-4 h-4 rounded-full bg-[#25D366] flex items-center justify-center flex-shrink-0">
                                                <MessageCircle size={9} className="text-white" />
                                            </div>
                                            <span className="text-white/30 text-[10px]">via WhatsApp · {timeAgo(selectedMsg.receivedAt)}</span>
                                        </div>
                                    </div>

                                    {/* Already dispatched notice */}
                                    {selectedMsg.status === 'dispatched' && (
                                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                                            className="mt-6 flex items-center gap-3 bg-amber-500/10 border border-amber-500/25 rounded-xl px-4 py-3">
                                            <CheckCircle2 size={16} className="text-amber-400 flex-shrink-0" />
                                            <p className="text-amber-400 text-xs font-bold">
                                                Dispatched to <strong>{selectedMsg.assignedAgentName}</strong> — waiting for acknowledgement.
                                            </p>
                                        </motion.div>
                                    )}
                                    {selectedMsg.status === 'completed' && (
                                        <div className="mt-6 flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/25 rounded-xl px-4 py-3">
                                            <CheckCircle2 size={16} className="text-emerald-400" />
                                            <p className="text-emerald-400 text-xs font-bold">Completed by {selectedMsg.assignedAgentName}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Dispatcher panel — only for 'new' messages */}
                                {selectedMsg.status === 'new' && (
                                    <div className="border-t border-white/8 px-6 py-5 space-y-4 bg-slate-900/60">
                                        <div className="flex items-center gap-2">
                                            <Zap size={14} className="text-indigo-400" />
                                            <p className="text-white font-extrabold text-sm">Assign Intercept Task</p>
                                        </div>

                                        <AgentPicker agents={agents} selectedId={selectedAgent?.id ?? null} onSelect={setSelectedAgent} />

                                        <AnimatePresence>
                                            {justDispatched === selectedMsg.id && (
                                                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                                    className="flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/30 rounded-xl px-4 py-2.5">
                                                    <CheckCircle2 size={14} className="text-emerald-400" />
                                                    <p className="text-emerald-400 text-xs font-bold">Alert sent to {selectedAgent?.name.split(' ')[0]}!</p>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        <motion.button
                                            id="vip-dispatch-btn"
                                            whileTap={{ scale: 0.97 }}
                                            onClick={handleDispatch}
                                            disabled={!selectedAgent || dispatching}
                                            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-extrabold text-sm shadow-lg shadow-indigo-600/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                        >
                                            {dispatching
                                                ? <><Loader2 size={15} className="animate-spin" /> Dispatching…</>
                                                : <><Send size={15} /> {selectedAgent ? `Dispatch → ${selectedAgent.name.split(' ')[0]}` : 'Select an Agent'}</>
                                            }
                                        </motion.button>
                                    </div>
                                )}
                            </motion.div>
                        ) : (
                            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                className="flex-1 flex flex-col items-center justify-center text-white/20 gap-3">
                                <MessageCircle size={40} className="opacity-20" />
                                <p className="text-sm font-bold">Select a VIP message</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* RIGHT — Live task tracker */}
                <div className="hidden lg:flex w-72 flex-col border-l border-white/8 overflow-hidden">
                    <div className="px-5 py-4 border-b border-white/8">
                        <div className="flex items-center gap-2">
                            <Users size={13} className="text-violet-400" />
                            <p className="text-white font-extrabold text-sm">Live Task Board</p>
                        </div>
                        <p className="text-white/30 text-[10px] mt-0.5">{tasks.length || agents.filter(a => a.activeTasks > 0).length} active assignments</p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        <AnimatePresence>
                            {(tasks.length > 0 ? tasks : messages.filter(m => m.status === 'dispatched' || m.status === 'completed').map(m => ({
                                id: m.id,
                                messageId: m.id,
                                clientName: m.clientName,
                                clientPhone: m.clientPhone,
                                clientTier: m.clientTier,
                                snippet: m.body.slice(0, 80),
                                preferredLanguage: m.preferredLanguage,
                                assignedAgentId: m.assignedAgentId ?? '',
                                assignedAgentName: m.assignedAgentName ?? '',
                                status: m.status === 'completed' ? 'completed' as TaskStatus : 'acknowledged' as TaskStatus,
                                createdAt: m.receivedAt,
                            }))).map(task => (
                                <motion.div key={task.id} layout initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
                                    className="bg-white/4 border border-white/8 rounded-xl p-3 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-white text-xs font-bold truncate">{task.clientName}</span>
                                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${task.status === 'pending' ? 'bg-rose-500 animate-pulse'
                                                : task.status === 'acknowledged' ? 'bg-amber-500'
                                                    : 'bg-emerald-500'
                                            }`} />
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[10px] text-white/40">
                                        <ArrowRight size={9} />
                                        <span className="truncate">{task.assignedAgentName}</span>
                                    </div>
                                    <div className={`text-[9px] font-black uppercase tracking-widest ${task.status === 'pending' ? 'text-rose-400'
                                            : task.status === 'acknowledged' ? 'text-amber-400'
                                                : 'text-emerald-400'
                                        }`}>
                                        {task.status}
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {tasks.length === 0 && messages.filter(m => m.status !== 'new').length === 0 && (
                            <div className="text-center py-10 text-white/15">
                                <BellOff size={24} className="mx-auto mb-2" />
                                <p className="text-xs">No tasks yet</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
