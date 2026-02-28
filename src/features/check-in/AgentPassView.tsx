/**
 * AgentPassView.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * The agent's digital event pass — a mobile-first QR code card.
 * Shows a unique signed QR code that the organizer scans to mark attendance.
 */

import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { motion } from 'motion/react';
import {
    ShieldCheck,
    Clock,
    MapPin,
    User,
    RefreshCw,
    Wifi,
    WifiOff,
    Star,
    CheckCircle2,
} from 'lucide-react';
import {
    generateCheckInJWT,
    CheckInEvent,
    CheckInAgent,
    TIER_STYLES,
} from './CheckInUtils';

// ── Types ─────────────────────────────────────────────────────────────────────

interface AgentPassViewProps {
    agent: CheckInAgent;
    event: CheckInEvent;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function clsx(...c: (string | false | undefined | null)[]) {
    return c.filter(Boolean).join(' ');
}

function formatTime(date: Date): string {
    return date.toLocaleTimeString('en-AE', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string): string {
    return new Intl.DateTimeFormat('en-AE', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    }).format(new Date(iso));
}

function secondsUntil(expUnix: number): number {
    return Math.max(0, expUnix - Math.floor(Date.now() / 1000));
}

function hms(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AgentPassView({ agent, event }: AgentPassViewProps) {
    const [jwt, setJwt] = useState<string | null>(null);
    const [expUnix, setExpUnix] = useState<number>(0);
    const [timeLeft, setTimeLeft] = useState<number>(0);
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    const tierStyle = TIER_STYLES[agent.tier];
    const isPresent = agent.status === 'physically_present';

    // Generate JWT on mount & when regenerated
    const generateToken = async () => {
        setJwt(null);
        const token = await generateCheckInJWT(
            agent.agentId, event.eventId, agent.agentName, agent.tier
        );
        const exp = Math.floor(Date.now() / 1000) + 86400;
        setJwt(token);
        setExpUnix(exp);
        setTimeLeft(secondsUntil(exp));
    };

    useEffect(() => { generateToken(); }, [agent.agentId, event.eventId]);

    // Countdown ticker
    useEffect(() => {
        if (!expUnix) return;
        const id = setInterval(() => {
            const left = secondsUntil(expUnix);
            setTimeLeft(left);
            if (left === 0) generateToken(); // auto-renew on expiry
        }, 1000);
        return () => clearInterval(id);
    }, [expUnix]);

    // Online/offline indicator
    useEffect(() => {
        const on = () => setIsOnline(true);
        const off = () => setIsOnline(false);
        window.addEventListener('online', on);
        window.addEventListener('offline', off);
        return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
    }, []);

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">

            {/* Status bar */}
            <div className="w-full max-w-sm flex items-center justify-between mb-4 px-1">
                <span className="text-xs text-slate-500 font-mono">{formatTime(new Date())}</span>
                <div className="flex items-center gap-1.5">
                    {isOnline
                        ? <><Wifi size={12} className="text-emerald-400" /><span className="text-xs text-emerald-400">Live</span></>
                        : <><WifiOff size={12} className="text-amber-400" /><span className="text-xs text-amber-400">Offline</span></>
                    }
                </div>
            </div>

            {/* Pass card */}
            <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', duration: 0.6 }}
                className="w-full max-w-sm"
            >
                {/* If already checked in — show confirmation state */}
                {isPresent ? (
                    <div className="bg-gradient-to-b from-emerald-950 to-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-emerald-800/50">
                        {/* Confirmed header */}
                        <div className="bg-emerald-900/60 border-b border-emerald-700/40 px-6 pt-6 pb-5">
                            <p className="text-emerald-300 text-xs font-bold tracking-[0.2em] uppercase mb-2">
                                Property Shop Investment
                            </p>
                            <div className="flex items-center gap-3">
                                <CheckCircle2 size={28} className="text-emerald-400" />
                                <div>
                                    <h1 className="text-white text-xl font-extrabold tracking-tight">Attendance Confirmed</h1>
                                    <p className="text-emerald-400 text-sm">You're physically verified ✓</p>
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-6 space-y-4">
                            <div className="bg-emerald-900/30 border border-emerald-800/50 rounded-2xl p-4">
                                <p className="text-emerald-500 text-xs font-bold uppercase tracking-widest mb-1">Checked In</p>
                                <p className="text-white font-bold text-lg">{agent.agentName}</p>
                                <p className="text-emerald-400 text-sm">{event.eventName}</p>
                                {agent.checkedInAt && (
                                    <p className="text-slate-400 text-xs mt-2">
                                        Verified at {formatTime(agent.checkedInAt)}
                                    </p>
                                )}
                            </div>
                            <p className="text-center text-slate-400 text-sm">
                                Lead distribution is now <strong className="text-emerald-400">unlocked</strong> for you.
                            </p>
                        </div>
                    </div>
                ) : (
                    /* Main pass card */
                    <div className="bg-slate-900 rounded-3xl overflow-hidden shadow-2xl shadow-black/50 border border-slate-800">

                        {/* Header stripe */}
                        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-6 pt-6 pb-5 border-b border-slate-700/50">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-amber-400 text-[10px] font-bold tracking-[0.25em] uppercase mb-1.5">
                                        PSI Event Portal
                                    </p>
                                    <h1 className="text-white text-xl font-extrabold tracking-tight leading-tight">
                                        Event Access Pass
                                    </h1>
                                </div>
                                {/* Tier badge */}
                                <span className={clsx('text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1', tierStyle.badge)}>
                                    <Star size={10} />
                                    {agent.tier.charAt(0).toUpperCase() + agent.tier.slice(1)}
                                </span>
                            </div>
                        </div>

                        {/* QR Code section */}
                        <div className="flex flex-col items-center px-6 pt-6 pb-4">
                            {jwt ? (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className={clsx(
                                        'p-4 bg-white rounded-2xl shadow-lg ring-4',
                                        tierStyle.ring
                                    )}
                                >
                                    <QRCodeSVG
                                        value={jwt}
                                        size={200}
                                        level="H"
                                        includeMargin={false}
                                        imageSettings={{
                                            src: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIgMkw0IDZWMTJDNCAyMCAxMiAyMiAxMiAyMkMyMCAyMiAyMCAxNSAyMCAxMlY2TDEyIDJaIiBmaWxsPSIjMGYxNzJhIi8+PC9zdmc+',
                                            height: 28,
                                            width: 28,
                                            excavate: true,
                                        }}
                                    />
                                </motion.div>
                            ) : (
                                <div className="w-[216px] h-[216px] bg-slate-800 rounded-2xl flex items-center justify-center">
                                    <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                                </div>
                            )}

                            {/* Token expiry countdown */}
                            <div className="mt-4 flex items-center gap-2">
                                <Clock size={12} className="text-slate-500" />
                                <span className="text-xs text-slate-400">
                                    QR refreshes in{' '}
                                    <span className={clsx('font-mono font-bold', timeLeft < 300 ? 'text-red-400' : 'text-amber-400')}>
                                        {hms(timeLeft)}
                                    </span>
                                </span>
                                <button
                                    id="regenerate-qr-btn"
                                    onClick={generateToken}
                                    className="text-slate-600 hover:text-amber-400 transition-colors"
                                    title="Regenerate QR code"
                                >
                                    <RefreshCw size={12} />
                                </button>
                            </div>
                        </div>

                        {/* Divider with perforation effect */}
                        <div className="relative mx-4">
                            <div className="border-t border-dashed border-slate-700" />
                            <div className="absolute -left-8 top-1/2 -translate-y-1/2 w-6 h-6 bg-slate-950 rounded-full border border-slate-800" />
                            <div className="absolute -right-8 top-1/2 -translate-y-1/2 w-6 h-6 bg-slate-950 rounded-full border border-slate-800" />
                        </div>

                        {/* Agent details */}
                        <div className="px-6 pt-4 pb-6 space-y-3">
                            <div className="flex items-center gap-3">
                                <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center', TIER_STYLES[agent.tier].badge)}>
                                    <User size={18} />
                                </div>
                                <div>
                                    <p className="text-white font-bold text-base leading-tight">{agent.agentName}</p>
                                    <p className="text-slate-400 text-xs">{agent.branch}</p>
                                </div>
                            </div>

                            <div className="bg-slate-800/60 rounded-xl px-4 py-3 space-y-2">
                                <div className="flex items-start gap-2">
                                    <MapPin size={13} className="text-amber-400 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="text-white text-sm font-semibold leading-tight">{event.eventName}</p>
                                        <p className="text-slate-400 text-xs">{event.venue}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Clock size={13} className="text-amber-400 flex-shrink-0" />
                                    <p className="text-slate-300 text-xs">{formatDate(event.eventDate)}</p>
                                </div>
                            </div>

                            {/* Compliance badges */}
                            <div className="flex gap-2">
                                {[
                                    { label: 'Flight', ok: agent.flightUploaded },
                                    { label: 'Visa', ok: agent.visaUploaded },
                                    { label: 'Manager', ok: agent.managerApproved },
                                ].map(({ label, ok }) => (
                                    <div
                                        key={label}
                                        className={clsx(
                                            'flex-1 rounded-lg py-1.5 text-center text-xs font-bold border',
                                            ok
                                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                                : 'bg-red-500/10 text-red-400 border-red-500/30'
                                        )}
                                    >
                                        {ok ? '✓' : '✗'} {label}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Footer bar */}
                        <div className="bg-slate-800/80 px-6 py-3 flex items-center justify-between border-t border-slate-700/50">
                            <div className="flex items-center gap-1.5">
                                <ShieldCheck size={13} className="text-emerald-400" />
                                <span className="text-xs text-emerald-400 font-bold">HMAC-SHA256 Signed</span>
                            </div>
                            <p className="text-xs text-slate-600 font-mono">
                                {jwt ? `${jwt.slice(-8)}` : '...'}
                            </p>
                        </div>

                    </div>
                )}
            </motion.div>

            <p className="mt-6 text-center text-xs text-slate-600 max-w-sm px-4">
                Show this QR code to the event organizer at the venue check-in desk.
                Lead distribution access activates after physical verification.
            </p>
        </div>
    );
}
