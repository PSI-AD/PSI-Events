/**
 * DeveloperPitch.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * PUBLIC standalone page — no sidebar, no auth required.
 * Route: /pitch/:token
 *
 * The :token segment is a base64-encoded JSON blob created by PitchGenerator.
 * This component decodes it and renders a stunning, read-only sponsorship
 * pitch deck landing page designed to impress developer C-suite decision makers.
 *
 * Sections:
 *   1. Hero          — event name, developer logo, key stats
 *   2. ROI Funnel    — animated funnel (Target Leads → Meetings → Deals → AED)
 *   3. Roster Power  — "15 top-performing PSI agents back this event"
 *   4. Sponsorship   — the requested amount + projected margin breakdown
 *   5. CTA           — "Approve Sponsorship Budget" mailto link
 */

import React, { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import {
    MapPin, Calendar, Users, TrendingUp, BarChart3,
    DollarSign, Zap, Star, CheckCircle2, ArrowRight,
    Building2, Mail, ShieldCheck, ChevronRight,
    Trophy, Target,
} from 'lucide-react';

// ── Token decoder ─────────────────────────────────────────────────────────────

interface PitchPayload {
    eventId: string;
    eventName: string;
    eventCity: string;
    eventCountry: string;
    eventDateStart: string;
    eventDateEnd: string;
    eventVenue: string;
    eventTier: string;
    targetLeads: number;
    expectedAgents: number;
    qualifiedRate: number;
    meetingRate: number;
    dealRate: number;
    avgDealAed: number;
    developerId: string;
    developerName: string;
    developerLogo: string;
    developerTier: string;
    requestedAmtAed: number;
    generatedBy: string;
    generatedAt: string;
}

function decodeToken(token: string): PitchPayload | null {
    try {
        const json = decodeURIComponent(atob(token));
        return JSON.parse(json) as PitchPayload;
    } catch {
        return null;
    }
}

// ── Formatters ────────────────────────────────────────────────────────────────

function fmtAed(n: number): string {
    if (n >= 1_000_000) return `AED ${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `AED ${(n / 1_000).toFixed(0)}K`;
    return `AED ${n.toLocaleString()}`;
}

function fmtPct(n: number): string { return `${Math.round(n * 100)}%`; }

// ── PSI Agent roster (mock — shown as "15 top agents") ───────────────────────

const TOP_AGENTS = [
    { initials: 'SA', name: 'Sara Al Marzouqi', lang: 'AR · EN', ytd: '14.2M', flag: '🇦🇪' },
    { initials: 'KM', name: 'Khalid Mansouri', lang: 'AR · EN', ytd: '28.5M', flag: '🇦🇪' },
    { initials: 'MQ', name: 'Mohammed Al Qubaisi', lang: 'AR · EN', ytd: '89.0M', flag: '🇦🇪' },
    { initials: 'RH', name: 'Rami Haddad', lang: 'AR · FR', ytd: '6.8M', flag: '🇯🇴' },
    { initials: 'LB', name: 'Layla Barakati', lang: 'AR · EN', ytd: '22.1M', flag: '🇸🇦' },
    { initials: 'OA', name: 'Omar Al Rashidi', lang: 'AR · EN', ytd: '17.4M', flag: '🇦🇪' },
    { initials: 'NS', name: 'Nour Suleiman', lang: 'AR · FR', ytd: '9.3M', flag: '🇱🇧' },
    { initials: 'AF', name: 'Ahmed Farhat', lang: 'AR · EN', ytd: '31.2M', flag: '🇲🇦' },
];

// ── Reusable stat card ────────────────────────────────────────────────────────

function StatCard({
    icon: Icon,
    label,
    value,
    sub,
    color = 'text-emerald-400',
    delay = 0,
}: {
    icon: React.ElementType;
    label: string;
    value: string;
    sub?: string;
    color?: string;
    delay?: number;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.5, ease: 'easeOut' }}
            className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5"
        >
            <div className={`flex items-center gap-2 mb-3 ${color}`}>
                <Icon size={16} />
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">{label}</span>
            </div>
            <p className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">{value}</p>
            {sub && <p className="text-xs text-white/50 mt-1">{sub}</p>}
        </motion.div>
    );
}

// ── Funnel step ───────────────────────────────────────────────────────────────

function FunnelStep({
    label,
    value,
    width,
    color,
    delay,
    isLast = false,
}: {
    label: string;
    value: string;
    width: string;   // Tailwind width class
    color: string;   // bg color class
    delay: number;
    isLast?: boolean;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ delay, duration: 0.6, ease: 'easeOut' }}
            className="flex flex-col items-center gap-2"
        >
            <div className={`${width} h-12 md:h-14 ${color} rounded-xl flex items-center justify-center shadow-lg`}>
                <span className="text-white font-extrabold text-lg">{value}</span>
            </div>
            <span className="text-xs text-white/60 font-bold uppercase tracking-wider text-center">{label}</span>
            {!isLast && (
                <ChevronRight size={16} className="text-white/30 rotate-90 -mt-1" />
            )}
        </motion.div>
    );
}

// ── 404 / invalid token page ──────────────────────────────────────────────────

function InvalidPitch() {
    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-8 text-center">
            <div>
                <Building2 size={48} className="mx-auto text-slate-700 mb-4" />
                <h1 className="text-2xl font-extrabold text-white mb-2">Invalid or Expired Pitch</h1>
                <p className="text-slate-400">This sponsorship link is invalid or has malformed data. Please request a new link from your PSI contact.</p>
            </div>
        </div>
    );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DeveloperPitch() {
    const { token } = useParams<{ token: string }>();
    const [ctaSent, setCtaSent] = useState(false);

    const pitch = useMemo(() => (token ? decodeToken(token) : null), [token]);

    if (!pitch) return <InvalidPitch />;

    // Derived numbers
    const qualified = Math.round(pitch.targetLeads * pitch.qualifiedRate);
    const meetings = Math.round(pitch.targetLeads * pitch.meetingRate);
    const deals = Math.round(pitch.targetLeads * pitch.dealRate);
    const pipeline = deals * pitch.avgDealAed;
    const brokerFee = pipeline * 0.04;
    const projMargin = pitch.requestedAmtAed > 0
        ? Math.max(0, Math.round(((brokerFee - pitch.requestedAmtAed) / brokerFee) * 100))
        : 40;
    const agentCount = pitch.expectedAgents || 15;
    const genDate = new Date(pitch.generatedAt).toLocaleDateString('en-AE', { dateStyle: 'long' });

    // CTA mailto
    const mailtoSubject = encodeURIComponent(`RE: Sponsorship Approval — ${pitch.eventName}`);
    const mailtoBody = encodeURIComponent(
        `Dear PSI Events Team,\n\nWe confirm our intent to sponsor the ${pitch.eventName} with a budget of ${fmtAed(pitch.requestedAmtAed)}.\n\nDeveloper: ${pitch.developerName}\nEvent: ${pitch.eventName}\nDate: ${pitch.eventDateStart} – ${pitch.eventDateEnd}\nVenue: ${pitch.eventVenue}\n\nPlease send us the formal sponsorship agreement.\n\nBest regards,\n[Your Name]\n${pitch.developerName}`
    );
    const mailtoHref = `mailto:propertyshopinvest@gmail.com?subject=${mailtoSubject}&body=${mailtoBody}`;

    return (
        <div className="min-h-screen bg-slate-950 text-white font-sans">

            {/* ── 1. HERO ──────────────────────────────────────────────────── */}
            <section className="relative overflow-hidden">
                {/* Radial glow background */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-amber-500/10 rounded-full blur-[120px]" />
                    <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-500/8 rounded-full blur-[100px]" />
                    {/* Subtle grid */}
                    <div
                        className="absolute inset-0 opacity-[0.03]"
                        style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '60px 60px' }}
                    />
                </div>

                <div className="relative max-w-6xl mx-auto px-6 pt-16 pb-12 md:pt-24 md:pb-16">
                    {/* PSI + developer logos bar */}
                    <motion.div
                        initial={{ opacity: 0, y: -12 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-between mb-10"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                                <Zap size={18} className="text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">Property Shop Investment LLC</p>
                                <p className="text-sm font-extrabold text-white leading-tight">PSI Event Portal</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-3xl">
                            {pitch.developerLogo}
                            <div className="ml-2">
                                <p className="text-sm font-extrabold text-white">{pitch.developerName}</p>
                                <span className="px-2 py-0.5 bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                    {pitch.developerTier} Partner
                                </span>
                            </div>
                        </div>
                    </motion.div>

                    {/* Confidential badge */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-400 text-[11px] font-bold uppercase tracking-widest mb-6"
                    >
                        <ShieldCheck size={12} />
                        Exclusive Sponsorship Opportunity — Confidential
                    </motion.div>

                    {/* Headline */}
                    <motion.h1
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                        className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.08] mb-4"
                    >
                        <span className="text-white">Exclusive Sponsorship</span>
                        <br />
                        <span className="bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
                            {pitch.eventName}
                        </span>
                    </motion.h1>

                    {/* Event metadata */}
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 }}
                        className="flex flex-wrap gap-4 mb-12 text-sm text-white/60"
                    >
                        <span className="flex items-center gap-1.5">
                            <MapPin size={14} className="text-amber-400" />
                            {pitch.eventVenue}
                        </span>
                        <span className="flex items-center gap-1.5">
                            <Calendar size={14} className="text-amber-400" />
                            {pitch.eventDateStart} – {pitch.eventDateEnd}
                        </span>
                        <span className="flex items-center gap-1.5">
                            <Star size={14} className="text-amber-400" />
                            {pitch.eventTier} Tier Event
                        </span>
                    </motion.div>

                    {/* Hero KPI grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard icon={Users} label="Target Audience Leads" value={pitch.targetLeads.toLocaleString()} color="text-blue-400" delay={0.3} />
                        <StatCard icon={TrendingUp} label="Expert Agents Deployed" value={`${agentCount}+`} color="text-violet-400" delay={0.4} sub="PSI top performers" />
                        <StatCard icon={BarChart3} label="Projected Deals" value={deals.toLocaleString()} color="text-amber-400" delay={0.5} sub={`at ${fmtPct(pitch.dealRate)} conv. rate`} />
                        <StatCard icon={DollarSign} label="Developer Pipeline" value={fmtAed(pipeline)} color="text-emerald-400" delay={0.6} />
                    </div>
                </div>
            </section>

            {/* ── 2. ROI FUNNEL ─────────────────────────────────────────────── */}
            <section className="py-16 md:py-20 border-t border-white/5">
                <div className="max-w-6xl mx-auto px-6">
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                        className="mb-10"
                    >
                        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-400 mb-2">Projected ROI Funnel</p>
                        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                            How Your Investment Converts
                        </h2>
                        <p className="text-white/50 mt-2 text-sm max-w-xl">
                            Based on PSI's verified 3-year roadshow performance data across {pitch.eventCity} and comparable Tier 1 markets.
                        </p>
                    </motion.div>

                    {/* Funnel bars */}
                    <div className="flex flex-col items-center gap-1 mb-10">
                        <FunnelStep label="Total Leads" value={pitch.targetLeads.toLocaleString()} width="w-full" color="bg-blue-600" delay={0.1} />
                        <FunnelStep label="Qualified Leads" value={qualified.toLocaleString()} width="w-5/6" color="bg-violet-600" delay={0.2} />
                        <FunnelStep label="Meetings Booked" value={meetings.toLocaleString()} width="w-4/6" color="bg-amber-500" delay={0.3} />
                        <FunnelStep label="Closed Deals" value={deals.toLocaleString()} width="w-2/6" color="bg-emerald-500" delay={0.4} />
                        <FunnelStep label="Brokerage Revenue" value={fmtAed(brokerFee)} width="w-1/4" color="bg-emerald-700" delay={0.5} isLast />
                    </div>

                    {/* Funnel data table */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        {[
                            { stage: 'Total Leads', n: pitch.targetLeads, rate: '100%', color: 'border-blue-500/30' },
                            { stage: 'Qualified', n: qualified, rate: fmtPct(pitch.qualifiedRate), color: 'border-violet-500/30' },
                            { stage: 'Meetings', n: meetings, rate: fmtPct(pitch.meetingRate), color: 'border-amber-500/30' },
                            { stage: 'Deals', n: deals, rate: fmtPct(pitch.dealRate), color: 'border-emerald-500/30' },
                            { stage: 'Brokerage Return', n: brokerFee, rate: 'AED', color: 'border-emerald-700/30', isAed: true },
                        ].map(({ stage, n, rate, color, isAed }) => (
                            <div key={stage} className={`bg-white/5 border rounded-xl p-4 ${color}`}>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">{stage}</p>
                                <p className="text-xl font-extrabold text-white">{isAed ? fmtAed(n) : n.toLocaleString()}</p>
                                <p className="text-[10px] text-white/40 mt-0.5">{isAed ? '4% brokerage' : `${rate} of prev. stage`}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── 3. ROSTER POWER ──────────────────────────────────────────── */}
            <section className="py-16 md:py-20 border-t border-white/5 bg-white/[0.02]">
                <div className="max-w-6xl mx-auto px-6">
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                        className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10"
                    >
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-400 mb-2">Roster Power</p>
                            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                                Backed by {agentCount}+ of PSI's<br />
                                <span className="bg-gradient-to-r from-emerald-400 to-emerald-300 bg-clip-text text-transparent">
                                    Top Performing Agents
                                </span>
                            </h2>
                        </div>
                        <div className="flex gap-4 text-right">
                            <div>
                                <p className="text-3xl font-extrabold text-white">87%</p>
                                <p className="text-xs text-white/40">Attendance track record</p>
                            </div>
                            <div>
                                <p className="text-3xl font-extrabold text-white">4.2%</p>
                                <p className="text-xs text-white/40">Avg. intl. conv. rate</p>
                            </div>
                        </div>
                    </motion.div>

                    {/* Agent cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                        {TOP_AGENTS.map((agent, i) => (
                            <motion.div
                                key={agent.initials}
                                initial={{ opacity: 0, scale: 0.9 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.05, duration: 0.4 }}
                                className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/8 hover:border-emerald-500/20 transition-all"
                            >
                                <div className="flex items-center gap-2.5 mb-3">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-sm font-extrabold text-emerald-400">
                                        {agent.initials}
                                    </div>
                                    <span className="text-xl">{agent.flag}</span>
                                </div>
                                <p className="text-sm font-bold text-white leading-tight">{agent.name}</p>
                                <p className="text-[10px] text-white/40 mt-1">{agent.lang}</p>
                                <div className="mt-3 pt-3 border-t border-white/10">
                                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">YTD Closed</p>
                                    <p className="text-sm font-extrabold text-emerald-400 font-mono">AED {agent.ytd}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* +N more */}
                    <div className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-2xl">
                        <div className="flex -space-x-2">
                            {['RB', 'FS', 'TA', 'WM', 'ZA', 'HE', 'NY'].map(init => (
                                <div key={init} className="w-8 h-8 rounded-full bg-slate-700 border-2 border-slate-950 flex items-center justify-center text-[10px] font-bold text-white">
                                    {init}
                                </div>
                            ))}
                        </div>
                        <p className="text-sm text-white/60">
                            + <span className="font-bold text-white">{Math.max(0, agentCount - TOP_AGENTS.length)}</span> additional agents selected for their multilingual skills and luxury real estate expertise.
                        </p>
                    </div>
                </div>
            </section>

            {/* ── 4. SPONSORSHIP BREAKDOWN ──────────────────────────────────── */}
            <section className="py-16 md:py-20 border-t border-white/5">
                <div className="max-w-6xl mx-auto px-6">
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                        className="mb-10"
                    >
                        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-400 mb-2">Investment Breakdown</p>
                        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">Your Sponsorship Package</h2>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                        {/* Requested amount card */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.1 }}
                            className="md:col-span-1 bg-gradient-to-br from-amber-500/20 to-amber-600/5 border-2 border-amber-500/30 rounded-3xl p-8 flex flex-col justify-between"
                        >
                            <div>
                                <div className="w-12 h-12 bg-amber-500/20 rounded-2xl flex items-center justify-center mb-4">
                                    <Zap size={24} className="text-amber-400" />
                                </div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400/70 mb-2">Requested Sponsorship</p>
                                <p className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">
                                    {fmtAed(pitch.requestedAmtAed)}
                                </p>
                                <p className="text-sm text-white/50 mt-2">One-time event investment</p>
                            </div>
                            <div className="mt-8 pt-6 border-t border-amber-500/20">
                                <p className="text-xs text-white/40">Developer: {pitch.developerName}</p>
                                <p className="text-xs text-white/40 mt-0.5">Generated: {genDate}</p>
                            </div>
                        </motion.div>

                        {/* What's included */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.2 }}
                            className="md:col-span-2 bg-white/5 border border-white/10 rounded-3xl p-8"
                        >
                            <p className="text-sm font-bold text-white/60 uppercase tracking-widest mb-5">What's Included</p>
                            <div className="space-y-4">
                                {[
                                    { icon: Target, text: `Exclusive feature placement across all ${pitch.targetLeads.toLocaleString()} prospect touchpoints`, badge: 'High Impact' },
                                    { icon: Users, text: `${agentCount}+ agents trained specifically on ${pitch.developerName} project portfolio`, badge: 'Dedicated' },
                                    { icon: Star, text: `Premium branding at ${pitch.eventVenue} — signage, digital screens, and printed collateral`, badge: 'Visibility' },
                                    { icon: Trophy, text: 'Lead data report: full CRM export of qualified, interested prospects post-event', badge: 'Data Rights' },
                                    { icon: BarChart3, text: `Real-time deal tracking dashboard — 90-day post-event monitoring`, badge: '90-Day Coverage' },
                                    { icon: CheckCircle2, text: 'Dedicated PSI account manager for the duration of the event cycle', badge: 'White Glove' },
                                ].map(({ icon: Icon, text, badge }, i) => (
                                    <div key={i} className="flex items-start gap-3">
                                        <div className="w-8 h-8 flex-shrink-0 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                                            <Icon size={15} className="text-emerald-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-white/80 leading-relaxed">{text}</p>
                                        </div>
                                        <span className="flex-shrink-0 px-2 py-0.5 bg-white/5 text-white/40 rounded-full text-[10px] font-bold border border-white/10 hidden md:inline">
                                            {badge}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Projected return row */}
                            <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-2 md:grid-cols-3 gap-4">
                                {[
                                    { label: 'Brokerage Exposure', value: fmtAed(brokerFee), color: 'text-emerald-400' },
                                    { label: 'Projected Margin', value: `${projMargin}%`, color: 'text-amber-400' },
                                    { label: 'Expected Deals', value: deals.toLocaleString(), color: 'text-blue-400' },
                                ].map(({ label, value, color }) => (
                                    <div key={label}>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-1">{label}</p>
                                        <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* ── 5. CTA ────────────────────────────────────────────────────── */}
            <section className="py-20 md:py-28 border-t border-white/5 relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-emerald-500/8 rounded-full blur-[100px]" />
                </div>
                <div className="relative max-w-3xl mx-auto px-6 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                    >
                        <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/30 rounded-3xl flex items-center justify-center mx-auto mb-6">
                            <Mail size={28} className="text-emerald-400" />
                        </div>
                        <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
                            Ready to Secure Your<br />
                            <span className="bg-gradient-to-r from-emerald-400 to-emerald-300 bg-clip-text text-transparent">
                                Market Position?
                            </span>
                        </h2>
                        <p className="text-white/50 text-lg mb-10 max-w-xl mx-auto">
                            Click below to approve the sponsorship budget. Your message will be sent directly to the PSI Event Management team who will respond within 4 business hours.
                        </p>

                        {/* CTA button */}
                        {!ctaSent ? (
                            <a
                                id="approve-sponsorship-btn"
                                href={mailtoHref}
                                onClick={() => setCtaSent(true)}
                                className="
                                    inline-flex items-center gap-3 px-10 py-5
                                    bg-gradient-to-r from-emerald-500 to-emerald-600
                                    hover:from-emerald-400 hover:to-emerald-500
                                    text-white font-extrabold text-lg rounded-2xl
                                    shadow-2xl shadow-emerald-500/25
                                    transition-all duration-200 active:scale-[0.98]
                                    select-none
                                "
                            >
                                <CheckCircle2 size={22} />
                                Approve Sponsorship Budget
                                <ArrowRight size={20} />
                            </a>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="inline-flex items-center gap-3 px-10 py-5 bg-emerald-900/30 border border-emerald-500/30 text-emerald-400 font-extrabold text-lg rounded-2xl"
                            >
                                <CheckCircle2 size={22} />
                                Email client opened — thank you!
                            </motion.div>
                        )}

                        <p className="text-xs text-white/25 mt-6">
                            This pitch was generated by PSI Event Portal on {genDate} and is intended exclusively for {pitch.developerName}.
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-white/5 py-8">
                <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-white/20">
                    <p>© 2026 Property Shop Investment LLC. All rights reserved.</p>
                    <p>propertyshopinvest@gmail.com · Abu Dhabi, UAE</p>
                </div>
            </footer>
        </div>
    );
}
