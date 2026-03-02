/**
 * NetworkingHub.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Smart Networking & Matchmaking system for PSI Events.
 *
 * Tabs:
 *   Discover    → AI-ranked recommended connections
 *   My Network  → accepted connections
 *   Requests    → pending in/out requests
 *   Meetings    → scheduler + confirmed meeting slots
 *   Admin       → enable/disable + analytics (organizer role)
 */

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    Users, Sparkles, Calendar, Settings2, Search,
    Send, Check, X, Clock, MapPin, ChevronRight,
    Star, Zap, Building2, Globe, Heart, MessageSquare,
    UserCheck, UserX, Network, TrendingUp, BarChart3,
    Coffee, Shield, RefreshCw, Info, Award,
} from 'lucide-react';
import { toast } from 'sonner';
import {
    DEMO_ATTENDEES,
    rankMatches,
    generateLocalRationale,
    MEETING_LOCATIONS,
    MEETING_TIME_SLOTS,
    type Attendee,
    type MatchResult,
    type NetworkingRequest,
    type MeetingSlot,
} from './matchingEngine';

// ── Utility ───────────────────────────────────────────────────────────────────

function cn(...classes: (string | boolean | undefined)[]) {
    return classes.filter(Boolean).join(' ');
}

function getScoreColor(score: number) {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 60) return 'text-amber-400';
    return 'text-slate-400';
}

function getScoreBg(score: number) {
    if (score >= 80) return 'bg-emerald-500/20 border-emerald-500/30';
    if (score >= 60) return 'bg-amber-500/20 border-amber-500/30';
    return 'bg-slate-500/20 border-slate-500/30';
}

function getScoreLabel(score: number) {
    if (score >= 85) return 'Perfect Match';
    if (score >= 70) return 'Strong Match';
    if (score >= 55) return 'Good Match';
    return 'Potential Match';
}

const AVATAR_COLORS = [
    'from-emerald-500 to-teal-600',
    'from-violet-500 to-purple-600',
    'from-amber-500 to-orange-600',
    'from-rose-500 to-pink-600',
    'from-sky-500 to-blue-600',
    'from-lime-500 to-green-600',
];

function avatarColor(id: string) {
    const idx = id.charCodeAt(id.length - 1) % AVATAR_COLORS.length;
    return AVATAR_COLORS[idx];
}

// ── Tab definition ────────────────────────────────────────────────────────────

type Tab = 'discover' | 'network' | 'requests' | 'meetings' | 'admin';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'discover', label: 'Discover', icon: Sparkles },
    { id: 'network', label: 'My Network', icon: UserCheck },
    { id: 'requests', label: 'Requests', icon: MessageSquare },
    { id: 'meetings', label: 'Meetings', icon: Calendar },
    { id: 'admin', label: 'Admin', icon: Settings2 },
];

// ── Sub-components ────────────────────────────────────────────────────────────

/** Score ring with percentage */
function ScoreRing({ score }: { score: number }) {
    const r = 18;
    const circ = 2 * Math.PI * r;
    const offset = circ - (score / 100) * circ;
    return (
        <div className="relative w-14 h-14 flex-shrink-0">
            <svg className="w-14 h-14 -rotate-90" viewBox="0 0 44 44">
                <circle cx="22" cy="22" r={r} fill="none" strokeWidth="3" className="stroke-slate-700" />
                <circle
                    cx="22" cy="22" r={r} fill="none" strokeWidth="3"
                    strokeDasharray={circ}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    className={score >= 80 ? 'stroke-emerald-400' : score >= 60 ? 'stroke-amber-400' : 'stroke-slate-400'}
                    style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                <span className={cn('text-xs font-black', getScoreColor(score))}>{score}%</span>
            </div>
        </div>
    );
}

/** Attendee profile card for Discover tab */
function MatchCard({
    result,
    onConnect,
    onSchedule,
    alreadyConnected,
    requestPending,
}: {
    result: MatchResult;
    onConnect: (id: string, msg: string) => void;
    onSchedule: (attendee: Attendee) => void;
    alreadyConnected: boolean;
    requestPending: boolean;
}) {
    const { attendee, score, sharedInterests, sharedSessions } = result;
    const [expanded, setExpanded] = useState(false);
    const [connecting, setConnecting] = useState(false);
    const [msg, setMsg] = useState('');

    const rationale = useMemo(() => generateLocalRationale(result, 'You'), [result]);

    async function handleConnect() {
        if (!msg.trim()) { toast.error('Add a short message before connecting'); return; }
        setConnecting(true);
        await new Promise(r => setTimeout(r, 800));
        onConnect(attendee.id, msg);
        setConnecting(false);
        setExpanded(false);
        setMsg('');
    }

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-colors"
        >
            {/* Card Header */}
            <div className="p-5 flex gap-4">
                {/* Avatar */}
                <div className={cn(
                    'w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center flex-shrink-0 text-white font-black text-lg shadow-lg',
                    avatarColor(attendee.id)
                )}>
                    {attendee.avatar}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-white font-bold text-base leading-tight">{attendee.name}</h3>
                                {attendee.isOnline && (
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" title="Online now" />
                                )}
                            </div>
                            <p className="text-slate-400 text-xs mt-0.5 leading-tight">{attendee.jobTitle}</p>
                            <p className="text-slate-500 text-xs leading-tight">{attendee.company}</p>
                        </div>
                        <ScoreRing score={score} />
                    </div>

                    {/* Match label + location */}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className={cn(
                            'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border',
                            getScoreBg(score), getScoreColor(score)
                        )}>
                            {getScoreLabel(score)}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-slate-500">
                            <Globe size={10} /> {attendee.location}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-slate-500">
                            <Building2 size={10} /> {attendee.companyType}
                        </span>
                    </div>
                </div>
            </div>

            {/* Rationale */}
            <div className="px-5 pb-3">
                <div className="bg-slate-800/60 rounded-xl p-3 flex gap-2">
                    <Sparkles size={13} className="text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-slate-300 text-xs leading-relaxed">{rationale}</p>
                </div>
            </div>

            {/* Shared tags */}
            {sharedInterests.length > 0 && (
                <div className="px-5 pb-3 flex flex-wrap gap-1.5">
                    {sharedInterests.slice(0, 4).map(tag => (
                        <span key={tag} className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
                            {tag}
                        </span>
                    ))}
                    {sharedInterests.length > 4 && (
                        <span className="text-[10px] text-slate-500">+{sharedInterests.length - 4} more</span>
                    )}
                </div>
            )}

            {sharedSessions.length > 0 && (
                <div className="px-5 pb-3">
                    <p className="text-[10px] text-slate-500 font-medium mb-1.5">ATTENDED TOGETHER</p>
                    <div className="flex flex-wrap gap-1.5">
                        {sharedSessions.map(s => (
                            <span key={s} className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full">
                                {s}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="px-5 pb-5 flex gap-2">
                {alreadyConnected ? (
                    <>
                        <span className="flex-1 flex items-center justify-center gap-1.5 text-emerald-400 text-sm font-semibold bg-emerald-500/10 border border-emerald-500/20 rounded-xl py-2.5">
                            <UserCheck size={14} /> Connected
                        </span>
                        <button
                            onClick={() => onSchedule(attendee)}
                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-sm font-medium hover:bg-slate-700 transition-colors"
                        >
                            <Calendar size={14} /> Meet
                        </button>
                    </>
                ) : requestPending ? (
                    <span className="flex-1 flex items-center justify-center gap-1.5 text-amber-400 text-sm font-semibold bg-amber-500/10 border border-amber-500/20 rounded-xl py-2.5">
                        <Clock size={14} /> Request Sent
                    </span>
                ) : (
                    <>
                        <button
                            onClick={() => setExpanded(e => !e)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors"
                        >
                            <Send size={14} /> Connect
                        </button>
                        <button
                            onClick={() => onSchedule(attendee)}
                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-sm font-medium hover:bg-slate-700 transition-colors"
                        >
                            <Calendar size={14} />
                        </button>
                        <button
                            onClick={() => setExpanded(e => !e)}
                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-sm font-medium hover:bg-slate-700 transition-colors"
                        >
                            <Info size={14} />
                        </button>
                    </>
                )}
            </div>

            {/* Expanded connect panel */}
            <AnimatePresence>
                {expanded && !alreadyConnected && !requestPending && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="px-5 pb-5 border-t border-slate-800 pt-4 space-y-3">
                            <p className="text-slate-400 text-xs">Add a personal note to your request:</p>
                            <textarea
                                value={msg}
                                onChange={e => setMsg(e.target.value)}
                                maxLength={200}
                                rows={3}
                                placeholder={`Hi ${attendee.name.split(' ')[0]}, I'd love to connect — we share interest in ${sharedInterests[0] ?? 'real estate'}!`}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 resize-none focus:outline-none focus:border-emerald-500 transition-colors"
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={handleConnect}
                                    disabled={connecting}
                                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-sm font-semibold transition-colors"
                                >
                                    {connecting ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
                                    {connecting ? 'Sending…' : 'Send Request'}
                                </button>
                                <button onClick={() => setExpanded(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-400 text-sm hover:bg-slate-700 transition-colors">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

/** Meeting scheduler modal */
function MeetingScheduler({
    attendee,
    onConfirm,
    onClose,
}: {
    attendee: Attendee;
    onConfirm: (slot: Omit<MeetingSlot, 'id'>) => void;
    onClose: () => void;
}) {
    const [selectedTime, setSelectedTime] = useState('');
    const [selectedLocation, setSelectedLocation] = useState('');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    async function handleConfirm() {
        if (!selectedTime || !selectedLocation) { toast.error('Please select a time slot and location'); return; }
        setSubmitting(true);
        await new Promise(r => setTimeout(r, 700));
        const timeSlot = MEETING_TIME_SLOTS.find(t => t.label === selectedTime)!;
        const today = new Date();
        const [sh, sm] = timeSlot.start.split(':').map(Number);
        const [eh, em] = timeSlot.end.split(':').map(Number);
        const start = new Date(today.setHours(sh, sm, 0));
        const end = new Date(new Date().setHours(eh, em, 0));
        onConfirm({
            requestId: '',
            attendeeAId: 'me',
            attendeeBId: attendee.id,
            attendeeAName: 'You',
            attendeeBName: attendee.name,
            startTime: start,
            endTime: end,
            location: selectedLocation,
            notes,
            status: 'confirmed',
        });
        setSubmitting(false);
        onClose();
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl"
            >
                {/* Header */}
                <div className="p-6 border-b border-slate-800">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-white font-bold text-lg">Schedule Meeting</h2>
                        <button onClick={onClose} className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors"><X size={16} /></button>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white font-bold text-sm', avatarColor(attendee.id))}>
                            {attendee.avatar}
                        </div>
                        <div>
                            <p className="text-white font-semibold text-sm">{attendee.name}</p>
                            <p className="text-slate-400 text-xs">{attendee.jobTitle} · {attendee.company}</p>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5">
                    {/* Time slots */}
                    <div>
                        <label className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 block">Select Time Slot</label>
                        <div className="grid grid-cols-2 gap-2">
                            {MEETING_TIME_SLOTS.map(slot => (
                                <button
                                    key={slot.label}
                                    onClick={() => setSelectedTime(slot.label)}
                                    className={cn(
                                        'py-2 px-3 rounded-xl text-xs font-semibold border transition-all',
                                        selectedTime === slot.label
                                            ? 'bg-emerald-600 border-emerald-500 text-white'
                                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                                    )}
                                >
                                    {slot.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Location */}
                    <div>
                        <label className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 block">Meeting Location</label>
                        <div className="space-y-1.5">
                            {MEETING_LOCATIONS.map(loc => (
                                <button
                                    key={loc}
                                    onClick={() => setSelectedLocation(loc)}
                                    className={cn(
                                        'w-full flex items-center gap-2 py-2 px-3 rounded-xl text-xs font-medium border transition-all text-left',
                                        selectedLocation === loc
                                            ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-300'
                                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                                    )}
                                >
                                    <MapPin size={11} className="flex-shrink-0" />
                                    {loc}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 block">Notes (optional)</label>
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            rows={2}
                            placeholder="Topics to discuss, preparation notes…"
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 resize-none focus:outline-none focus:border-emerald-500 transition-colors"
                        />
                    </div>

                    <button
                        onClick={handleConfirm}
                        disabled={submitting}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold transition-colors"
                    >
                        {submitting ? <RefreshCw size={15} className="animate-spin" /> : <Calendar size={15} />}
                        {submitting ? 'Confirming…' : 'Confirm Meeting'}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

// ── Main NetworkingHub ────────────────────────────────────────────────────────

const ME = DEMO_ATTENDEES[0]; // "logged in" user = Khalid

export default function NetworkingHub() {
    const [activeTab, setActiveTab] = useState<Tab>('discover');
    const [search, setSearch] = useState('');
    const [requests, setRequests] = useState<NetworkingRequest[]>([
        // Seed one incoming request for demo
        {
            id: 'req_demo_001',
            fromId: 'atd_005',
            toId: ME.id,
            fromName: 'Ahmed Bin Khalifa',
            toName: ME.name,
            fromTitle: 'Chief Investment Officer — Gulf Sovereign Ventures',
            message: "Hi Khalid, I'm interested in exploring PSI's agent network for our off-plan investment mandates. Would love to connect.",
            status: 'pending',
            sentAt: new Date(Date.now() - 3600_000),
        },
    ]);
    const [meetings, setMeetings] = useState<MeetingSlot[]>([]);
    const [schedulerTarget, setSchedulerTarget] = useState<Attendee | null>(null);
    const [networkingEnabled, setNetworkingEnabled] = useState(true);
    const [filterMin, setFilterMin] = useState(0);

    // Compute ranked matches (memoised — only recalculates when search / filter changes)
    const allMatches = useMemo(() =>
        rankMatches(ME, DEMO_ATTENDEES),
        []
    );

    const filteredMatches = useMemo(() => {
        const q = search.toLowerCase();
        return allMatches
            .filter(r => r.score >= filterMin)
            .filter(r =>
                !q ||
                r.attendee.name.toLowerCase().includes(q) ||
                r.attendee.company.toLowerCase().includes(q) ||
                r.attendee.industry.toLowerCase().includes(q) ||
                r.attendee.jobTitle.toLowerCase().includes(q)
            );
    }, [allMatches, search, filterMin]);

    const acceptedIds = useMemo(() =>
        new Set(requests.filter(r => r.status === 'accepted').map(r =>
            r.fromId === ME.id ? r.toId : r.fromId
        )),
        [requests]
    );

    const pendingOutIds = useMemo(() =>
        new Set(requests.filter(r => r.status === 'pending' && r.fromId === ME.id).map(r => r.toId)),
        [requests]
    );

    const incomingPending = requests.filter(r => r.status === 'pending' && r.toId === ME.id);
    const outgoingPending = requests.filter(r => r.status === 'pending' && r.fromId === ME.id);

    const sendRequest = useCallback((toId: string, msg: string) => {
        const attendee = DEMO_ATTENDEES.find(a => a.id === toId)!;
        const req: NetworkingRequest = {
            id: `req_${Date.now()}`,
            fromId: ME.id,
            toId,
            fromName: ME.name,
            toName: attendee.name,
            fromTitle: `${ME.jobTitle} — ${ME.company}`,
            message: msg,
            status: 'pending',
            sentAt: new Date(),
        };
        setRequests(prev => [...prev, req]);
        toast.success(`Connection request sent to ${attendee.name}!`);
    }, []);

    const respondToRequest = useCallback((id: string, accept: boolean) => {
        setRequests(prev => prev.map(r =>
            r.id === id ? { ...r, status: accept ? 'accepted' : 'declined', respondedAt: new Date() } : r
        ));
        const req = requests.find(r => r.id === id);
        if (req) toast.success(accept ? `Connected with ${req.fromName}!` : `Request from ${req.fromName} declined`);
    }, [requests]);

    const withdrawRequest = useCallback((id: string) => {
        setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'withdrawn' } : r));
        toast.success('Request withdrawn');
    }, []);

    const addMeeting = useCallback((slot: Omit<MeetingSlot, 'id'>) => {
        setMeetings(prev => [{ ...slot, id: `mtg_${Date.now()}` }, ...prev]);
        toast.success(`Meeting scheduled with ${slot.attendeeBName}!`);
    }, []);

    // ── Render ─────────────────────────────────────────────────────────────────

    return (
        <div className="min-h-screen bg-slate-950 font-sans">

            {/* ── Page Header ─────────────────────────────────────────────── */}
            <div className="bg-slate-900 border-b border-slate-800 px-6 py-5">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Network size={20} className="text-emerald-400" />
                                <h1 className="text-white font-extrabold text-xl">Smart Networking</h1>
                                {networkingEnabled
                                    ? <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Live</span>
                                    : <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Disabled</span>
                                }
                            </div>
                            <p className="text-slate-400 text-sm">AI-powered attendee matchmaking · {allMatches.length} recommended connections</p>
                        </div>
                        {/* Stats row */}
                        <div className="flex gap-4">
                            {[
                                { label: 'Matches', value: allMatches.length, icon: Star, color: 'text-amber-400' },
                                { label: 'Connected', value: acceptedIds.size, icon: UserCheck, color: 'text-emerald-400' },
                                { label: 'Pending', value: incomingPending.length + outgoingPending.length, icon: Clock, color: 'text-blue-400' },
                                { label: 'Meetings', value: meetings.length, icon: Calendar, color: 'text-violet-400' },
                            ].map(s => (
                                <div key={s.label} className="text-center">
                                    <s.icon size={14} className={cn('mx-auto mb-0.5', s.color)} />
                                    <p className="text-white font-black text-base leading-none">{s.value}</p>
                                    <p className="text-slate-500 text-[10px] font-medium uppercase tracking-wider">{s.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-1 mt-5 bg-slate-800/60 p-1 rounded-xl w-fit">
                        {TABS.map(tab => {
                            const badge =
                                tab.id === 'requests' ? incomingPending.length :
                                    tab.id === 'meetings' ? meetings.length : 0;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        'relative flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all',
                                        activeTab === tab.id
                                            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40'
                                            : 'text-slate-400 hover:text-slate-200'
                                    )}
                                >
                                    <tab.icon size={14} />
                                    <span className="hidden sm:inline">{tab.label}</span>
                                    {badge > 0 && (
                                        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center">
                                            {badge}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ── Tab Content ─────────────────────────────────────────────── */}
            <div className="max-w-7xl mx-auto px-6 py-8">
                <AnimatePresence mode="wait">

                    {/* ── DISCOVER ─────────────────────────────────────────── */}
                    {activeTab === 'discover' && (
                        <motion.div key="discover" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                            {/* Filters */}
                            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                                <div className="relative flex-1 max-w-sm">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                    <input
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                        placeholder="Search by name, company, industry…"
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-500 text-xs whitespace-nowrap">Min match:</span>
                                    {[0, 40, 60, 75].map(v => (
                                        <button
                                            key={v}
                                            onClick={() => setFilterMin(v)}
                                            className={cn(
                                                'px-3 py-2 rounded-lg text-xs font-bold border transition-all',
                                                filterMin === v
                                                    ? 'bg-emerald-600 border-emerald-500 text-white'
                                                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                                            )}
                                        >
                                            {v === 0 ? 'All' : `${v}%+`}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* My profile card */}
                            <div className="mb-6 bg-gradient-to-r from-emerald-900/40 to-teal-900/20 border border-emerald-800/40 rounded-2xl p-4 flex items-center gap-4">
                                <div className={cn('w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white font-black text-base', avatarColor(ME.id))}>
                                    {ME.avatar}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-white font-bold text-sm">Matching as: {ME.name}</p>
                                    <p className="text-slate-400 text-xs">{ME.jobTitle} · {ME.company} · {ME.industry}</p>
                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                        {ME.investmentInterests.slice(0, 3).map(i => (
                                            <span key={i} className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">{i}</span>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex-shrink-0 text-right">
                                    <p className="text-emerald-400 font-black text-2xl">{allMatches.length}</p>
                                    <p className="text-slate-500 text-[10px] uppercase tracking-wider">matches found</p>
                                </div>
                            </div>

                            {/* Match grid */}
                            {filteredMatches.length === 0 ? (
                                <div className="flex flex-col items-center py-24 bg-slate-900/60 border-2 border-dashed border-slate-800 rounded-3xl text-center">
                                    <Users size={40} className="text-slate-700 mb-4" />
                                    <h3 className="text-white font-bold text-lg mb-1">No matches found</h3>
                                    <p className="text-slate-500 text-sm">Try lowering the minimum match threshold or clearing the search</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                                    {filteredMatches.map(result => (
                                        <MatchCard
                                            key={result.attendee.id}
                                            result={result}
                                            onConnect={sendRequest}
                                            onSchedule={setSchedulerTarget}
                                            alreadyConnected={acceptedIds.has(result.attendee.id)}
                                            requestPending={pendingOutIds.has(result.attendee.id)}
                                        />
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* ── MY NETWORK ───────────────────────────────────────── */}
                    {activeTab === 'network' && (
                        <motion.div key="network" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                            {acceptedIds.size === 0 ? (
                                <div className="flex flex-col items-center py-24 bg-slate-900/60 border-2 border-dashed border-slate-800 rounded-3xl text-center">
                                    <UserCheck size={40} className="text-slate-700 mb-4" />
                                    <h3 className="text-white font-bold text-lg mb-2">No connections yet</h3>
                                    <p className="text-slate-500 text-sm mb-6">Go to Discover and send your first connection request</p>
                                    <button onClick={() => setActiveTab('discover')} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-500 transition-colors">
                                        <Sparkles size={14} /> Find Connections
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                                    {allMatches.filter(r => acceptedIds.has(r.attendee.id)).map(result => (
                                        <div key={result.attendee.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                                            <div className="flex items-center gap-4 mb-4">
                                                <div className={cn('w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white font-black', avatarColor(result.attendee.id))}>
                                                    {result.attendee.avatar}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-white font-bold text-sm">{result.attendee.name}</p>
                                                    <p className="text-slate-400 text-xs">{result.attendee.jobTitle}</p>
                                                    <p className="text-slate-500 text-xs">{result.attendee.company}</p>
                                                </div>
                                                <span className="flex items-center gap-1 text-emerald-400 text-xs font-bold">
                                                    <UserCheck size={12} /> Connected
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => setSchedulerTarget(result.attendee)}
                                                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-sm font-medium hover:bg-slate-700 transition-colors"
                                            >
                                                <Calendar size={13} /> Schedule Meeting
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* ── REQUESTS ─────────────────────────────────────────── */}
                    {activeTab === 'requests' && (
                        <motion.div key="requests" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-8">
                            {/* Incoming */}
                            <section>
                                <h2 className="text-white font-bold text-base mb-4 flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs font-black">{incomingPending.length}</span>
                                    Incoming Requests
                                </h2>
                                {incomingPending.length === 0 ? (
                                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-500 text-sm">No incoming requests</div>
                                ) : (
                                    <div className="space-y-3">
                                        {incomingPending.map(req => {
                                            const sender = DEMO_ATTENDEES.find(a => a.id === req.fromId);
                                            return (
                                                <div key={req.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                                                    <div className="flex items-start gap-4">
                                                        {sender && (
                                                            <div className={cn('w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center text-white font-black text-sm flex-shrink-0', avatarColor(sender.id))}>
                                                                {sender.avatar}
                                                            </div>
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-white font-bold text-sm">{req.fromName}</p>
                                                            <p className="text-slate-400 text-xs mb-2">{req.fromTitle}</p>
                                                            <div className="bg-slate-800 rounded-xl p-3 mb-3">
                                                                <p className="text-slate-300 text-xs italic">"{req.message}"</p>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <button onClick={() => respondToRequest(req.id, true)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors">
                                                                    <Check size={12} /> Accept
                                                                </button>
                                                                <button onClick={() => respondToRequest(req.id, false)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-xs font-medium hover:bg-slate-700 transition-colors">
                                                                    <X size={12} /> Decline
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <p className="text-slate-600 text-[10px] flex-shrink-0">
                                                            {Math.round((Date.now() - req.sentAt.getTime()) / 60000)}m ago
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </section>

                            {/* Outgoing */}
                            <section>
                                <h2 className="text-white font-bold text-base mb-4 flex items-center gap-2">
                                    <Send size={14} className="text-slate-500" />
                                    Sent Requests
                                </h2>
                                {outgoingPending.length === 0 ? (
                                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-500 text-sm">No outgoing requests</div>
                                ) : (
                                    <div className="space-y-3">
                                        {outgoingPending.map(req => {
                                            const target = DEMO_ATTENDEES.find(a => a.id === req.toId);
                                            return (
                                                <div key={req.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center gap-4">
                                                    {target && (
                                                        <div className={cn('w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center text-white font-black text-sm flex-shrink-0', avatarColor(target.id))}>
                                                            {target.avatar}
                                                        </div>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-white font-bold text-sm">{req.toName}</p>
                                                        <p className="text-amber-400 text-xs flex items-center gap-1"><Clock size={10} /> Pending response</p>
                                                    </div>
                                                    <button onClick={() => withdrawRequest(req.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 text-xs hover:text-red-400 hover:border-red-800 transition-colors">
                                                        <X size={11} /> Withdraw
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </section>
                        </motion.div>
                    )}

                    {/* ── MEETINGS ─────────────────────────────────────────── */}
                    {activeTab === 'meetings' && (
                        <motion.div key="meetings" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-white font-bold text-base">Scheduled Meetings ({meetings.length})</h2>
                                <button
                                    onClick={() => setActiveTab('network')}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors"
                                >
                                    <Calendar size={14} /> Schedule New
                                </button>
                            </div>
                            {meetings.length === 0 ? (
                                <div className="flex flex-col items-center py-24 bg-slate-900/60 border-2 border-dashed border-slate-800 rounded-3xl text-center">
                                    <Coffee size={40} className="text-slate-700 mb-4" />
                                    <h3 className="text-white font-bold text-lg mb-2">No meetings yet</h3>
                                    <p className="text-slate-500 text-sm">Connect with attendees and schedule your first meeting</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {meetings.map(m => (
                                        <div key={m.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center gap-5">
                                            <div className="flex-shrink-0 bg-emerald-900/40 border border-emerald-800/50 rounded-2xl w-14 h-14 flex flex-col items-center justify-center">
                                                <Calendar size={16} className="text-emerald-400 mb-0.5" />
                                                <p className="text-emerald-400 font-black text-[10px]">{m.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-white font-bold text-sm">{m.attendeeBName}</p>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <span className="flex items-center gap-1 text-slate-400 text-xs"><Clock size={10} /> {m.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {m.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    <span className="flex items-center gap-1 text-slate-400 text-xs"><MapPin size={10} /> {m.location}</span>
                                                </div>
                                                {m.notes && <p className="text-slate-500 text-xs mt-1 italic">"{m.notes}"</p>}
                                            </div>
                                            <span className="flex-shrink-0 text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-1 rounded-full font-bold uppercase">{m.status}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* ── ADMIN ─────────────────────────────────────────────── */}
                    {activeTab === 'admin' && (
                        <motion.div key="admin" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-8">
                            {/* Toggle */}
                            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                                <h2 className="text-white font-bold text-base mb-1 flex items-center gap-2"><Shield size={16} className="text-emerald-400" /> Networking Control</h2>
                                <p className="text-slate-400 text-sm mb-5">Enable or disable the networking system for this event. When disabled, attendees cannot discover or send connection requests.</p>
                                <div className="flex items-center justify-between p-4 bg-slate-800 rounded-xl">
                                    <div>
                                        <p className="text-white font-semibold text-sm">Smart Networking</p>
                                        <p className="text-slate-400 text-xs">AI matchmaking + requests + scheduling</p>
                                    </div>
                                    <button
                                        onClick={() => { setNetworkingEnabled(e => !e); toast.success(`Networking ${networkingEnabled ? 'disabled' : 'enabled'}`); }}
                                        className={cn(
                                            'relative w-12 h-6 rounded-full transition-colors duration-300',
                                            networkingEnabled ? 'bg-emerald-500' : 'bg-slate-700'
                                        )}
                                    >
                                        <span className={cn('absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300', networkingEnabled ? 'translate-x-6' : 'translate-x-0')} />
                                    </button>
                                </div>
                            </div>

                            {/* Analytics */}
                            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                                <h2 className="text-white font-bold text-base mb-5 flex items-center gap-2"><BarChart3 size={16} className="text-emerald-400" /> Networking Analytics</h2>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {[
                                        { label: 'Total Attendees', value: DEMO_ATTENDEES.length, icon: Users, color: 'emerald' },
                                        { label: 'Avg Match Score', value: `${Math.round(allMatches.reduce((s, r) => s + r.score, 0) / allMatches.length)}%`, icon: Star, color: 'amber' },
                                        { label: 'Requests Sent', value: requests.length, icon: Send, color: 'blue' },
                                        { label: 'Connections Made', value: acceptedIds.size, icon: Heart, color: 'rose' },
                                    ].map(s => (
                                        <div key={s.label} className="bg-slate-800 rounded-xl p-4 text-center">
                                            <s.icon size={20} className={`mx-auto mb-2 text-${s.color}-400`} />
                                            <p className="text-white font-black text-2xl">{s.value}</p>
                                            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mt-0.5">{s.label}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Score distribution */}
                            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                                <h2 className="text-white font-bold text-base mb-5 flex items-center gap-2"><TrendingUp size={16} className="text-emerald-400" /> Match Quality Distribution</h2>
                                <div className="space-y-3">
                                    {[
                                        { label: 'Perfect Match (85–100%)', min: 85, color: 'bg-emerald-500' },
                                        { label: 'Strong Match (70–84%)', min: 70, color: 'bg-teal-500' },
                                        { label: 'Good Match (55–69%)', min: 55, color: 'bg-amber-500' },
                                        { label: 'Potential Match (20–54%)', min: 20, color: 'bg-slate-500' },
                                    ].map(band => {
                                        const count = allMatches.filter(r => r.score >= band.min && (band.min === 20 || r.score < band.min + 15)).length;
                                        const pct = Math.round((count / allMatches.length) * 100);
                                        return (
                                            <div key={band.label} className="flex items-center gap-3">
                                                <p className="text-slate-400 text-xs w-48 flex-shrink-0">{band.label}</p>
                                                <div className="flex-1 bg-slate-800 rounded-full h-2">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${pct}%` }}
                                                        transition={{ delay: 0.2, duration: 0.6 }}
                                                        className={cn('h-2 rounded-full', band.color)}
                                                    />
                                                </div>
                                                <span className="text-slate-400 text-xs w-8 text-right">{count}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Attendee list */}
                            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                                <h2 className="text-white font-bold text-base mb-4 flex items-center gap-2"><Users size={16} className="text-emerald-400" /> All Attendees ({DEMO_ATTENDEES.length})</h2>
                                <div className="space-y-2">
                                    {DEMO_ATTENDEES.map(a => (
                                        <div key={a.id} className="flex items-center gap-3 py-2 border-b border-slate-800 last:border-0">
                                            <div className={cn('w-8 h-8 rounded-xl bg-gradient-to-br flex items-center justify-center text-white font-black text-xs flex-shrink-0', avatarColor(a.id))}>
                                                {a.avatar}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-white text-sm font-semibold truncate">{a.name}</p>
                                                <p className="text-slate-500 text-xs truncate">{a.jobTitle} · {a.company}</p>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <span className={cn('w-1.5 h-1.5 rounded-full', a.isOnline ? 'bg-emerald-400' : 'bg-slate-600')} />
                                                <span className={cn('text-[10px] font-bold', a.networkingEnabled ? 'text-emerald-400' : 'text-red-400')}>
                                                    {a.networkingEnabled ? 'Networking ON' : 'Networking OFF'}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>

            {/* ── Meeting Scheduler Modal ──────────────────────────────────── */}
            <AnimatePresence>
                {schedulerTarget && (
                    <MeetingScheduler
                        attendee={schedulerTarget}
                        onConfirm={addMeeting}
                        onClose={() => setSchedulerTarget(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
