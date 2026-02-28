/**
 * SettlementDashboard.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Post-event Commission Settlement UI — v2 with Multi-Currency FX Engine.
 *
 * New in v2:
 *   • Local Event Currency selector (GBP, EUR, USD, EGP, SAR, QAR, KWD, AED)
 *   • FX Rate field (pre-filled with locked reference rate, organizer-overridable)
 *   • Agent rows now have Travel Cost + Event Cost inputs in local currency
 *   • Live KPI strip shows deductions column
 *   • Settlement Report PDF shows the FX audit banner:
 *     "Conversion Rate Applied: 1 GBP = 4.65 AED · PSI Reference Rate (2026-02-28)"
 *   • Per-agent table shows converted cost, net revenue, then split
 */

import React, { useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    Calculator, Download, Plus, Trash2, TrendingUp,
    Users, Building2, Award, ChevronDown, Printer,
    FileText, Sparkles, Star, ArrowRight,
    DollarSign, Globe, Info, ShieldCheck,
} from 'lucide-react';
import {
    AgentEntry, RiskTier, TIER_CONFIG, DEMO_AGENTS, DEMO_FX,
    SettlementReport, SupportedCurrency, FxSnapshot,
    CURRENCY_CATALOGUE, REFERENCE_FX_RATES,
    calculateSettlement, buildFxSnapshot,
    formatAED, formatLocalCurrency, formatDate, fxLabel,
} from './CommissionEngine';

// ── Tiny helper ───────────────────────────────────────────────────────────────

let _nextId = 100;
const uid = () => String(++_nextId);

function clsx(...classes: (string | false | undefined | null)[]) {
    return classes.filter(Boolean).join(' ');
}

// ── KPI Stat Card ─────────────────────────────────────────────────────────────

function StatCard({
    label, value, sub, accent, icon,
}: {
    label: string;
    value: string;
    sub?: string;
    accent: 'gold' | 'emerald' | 'blue' | 'red' | 'violet';
    icon: React.ReactNode;
}) {
    const accentMap = {
        gold: { ring: 'ring-amber-500/30', text: 'text-amber-400', bg: 'bg-amber-500/10' },
        emerald: { ring: 'ring-emerald-500/30', text: 'text-emerald-400', bg: 'bg-emerald-500/10' },
        blue: { ring: 'ring-blue-500/30', text: 'text-blue-400', bg: 'bg-blue-500/10' },
        red: { ring: 'ring-red-500/30', text: 'text-red-400', bg: 'bg-red-500/10' },
        violet: { ring: 'ring-violet-500/30', text: 'text-violet-400', bg: 'bg-violet-500/10' },
    };
    const c = accentMap[accent];
    return (
        <div className={clsx('bg-slate-800/60 rounded-2xl p-4 md:p-5 ring-1 select-none min-w-0', c.ring)}>
            <div className={clsx('w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center mb-2 md:mb-3 flex-shrink-0', c.bg)}>
                <span className={c.text}>{icon}</span>
            </div>
            <div className="min-w-0">
                <p className="text-[10px] md:text-xs text-slate-400 font-semibold uppercase tracking-widest mb-0.5 truncate">{label}</p>
                <p className={clsx('text-lg md:text-xl lg:text-2xl font-bold tracking-tight truncate', c.text)}>{value}</p>
                {sub && <p className="text-[10px] md:text-xs text-slate-500 mt-0.5 truncate">{sub}</p>}
            </div>
        </div>
    );
}

// ── Tier Badge ────────────────────────────────────────────────────────────────

function TierBadge({ tier }: { tier: RiskTier }) {
    const cfg = TIER_CONFIG[tier];
    return (
        <span className={clsx('text-xs font-bold px-2 py-0.5 rounded-full', cfg.tailwindBadge)}>
            {cfg.label}
        </span>
    );
}

// ── Currency Selector ─────────────────────────────────────────────────────────

function CurrencySelector({
    value,
    onChange,
}: {
    value: SupportedCurrency;
    onChange: (c: SupportedCurrency) => void;
}) {
    const [open, setOpen] = useState(false);
    const selected = CURRENCY_CATALOGUE.find(c => c.code === value)!;

    return (
        <div className="relative">
            <button
                type="button"
                id="currency-selector-btn"
                onClick={() => setOpen(v => !v)}
                className="w-full flex items-center justify-between gap-3 px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-left hover:bg-slate-700/60 transition-all select-none"
            >
                <div className="flex items-center gap-2">
                    <span className="text-xl">{selected.flag}</span>
                    <div>
                        <p className="text-white text-sm font-bold">{selected.code}</p>
                        <p className="text-slate-400 text-[10px]">{selected.name}</p>
                    </div>
                </div>
                <ChevronDown size={14} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="absolute left-0 right-0 mt-1.5 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden"
                    >
                        {CURRENCY_CATALOGUE.map(cur => (
                            <button
                                key={cur.code}
                                type="button"
                                onClick={() => { onChange(cur.code); setOpen(false); }}
                                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-700/60 transition-colors border-b border-slate-700/40 last:border-0 ${cur.code === value ? 'bg-amber-500/10' : ''}`}
                            >
                                <span className="text-xl">{cur.flag}</span>
                                <div>
                                    <p className={`text-sm font-bold ${cur.code === value ? 'text-amber-400' : 'text-white'}`}>{cur.code}</p>
                                    <p className="text-slate-400 text-[10px]">{cur.name}</p>
                                </div>
                                <span className="ml-auto text-xs text-slate-500 font-mono">{REFERENCE_FX_RATES[cur.code].toFixed(4)} AED</span>
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ── Agent Row ─────────────────────────────────────────────────────────────────

function AgentRow({
    agent, onChange, onRemove, localCurrency,
}: {
    agent: AgentEntry;
    onChange: (updated: AgentEntry) => void;
    onRemove: () => void;
    localCurrency: SupportedCurrency;
}) {
    const currMeta = CURRENCY_CATALOGUE.find(c => c.code === localCurrency)!;
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -24 }}
            className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/50"
        >
            {/* Row 1: Name, Branch, Tier */}
            <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_140px_36px] gap-2 md:gap-3 mb-2">
                <input
                    id={`agent-name-${agent.id}`}
                    type="text"
                    value={agent.name}
                    onChange={e => onChange({ ...agent, name: e.target.value })}
                    placeholder="Agent full name"
                    className="bg-slate-700/60 border border-slate-600 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 min-h-[44px]"
                />
                <input
                    id={`agent-branch-${agent.id}`}
                    type="text"
                    value={agent.branch}
                    onChange={e => onChange({ ...agent, branch: e.target.value })}
                    placeholder="Branch / office"
                    className="bg-slate-700/60 border border-slate-600 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 min-h-[44px]"
                />
                <div className="relative">
                    <select
                        id={`agent-tier-${agent.id}`}
                        value={agent.tier}
                        onChange={e => onChange({ ...agent, tier: e.target.value as RiskTier })}
                        className="w-full appearance-none bg-slate-700/60 border border-slate-600 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 pr-8 min-h-[44px]"
                    >
                        <option value="gold">Gold (50%)</option>
                        <option value="silver">Silver (30%)</option>
                        <option value="bronze">Bronze (20%)</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
                <button
                    id={`remove-agent-${agent.id}`}
                    onClick={onRemove}
                    className="flex items-center justify-center w-full md:w-9 h-9 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors min-h-[44px] md:min-h-0"
                >
                    <Trash2 size={15} />
                </button>
            </div>

            {/* Row 2: Revenue + Costs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-3">
                {/* Closed Revenue (AED) */}
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">AED</span>
                    <input
                        id={`agent-revenue-${agent.id}`}
                        type="number" min={0}
                        value={agent.closedRevenue || ''}
                        onChange={e => onChange({ ...agent, closedRevenue: Number(e.target.value) })}
                        placeholder="Gross revenue"
                        className="w-full bg-slate-700/60 border border-slate-600 rounded-xl pl-11 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 min-h-[44px]"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-slate-500 pointer-events-none">Gross Rev.</span>
                </div>
                {/* Travel Cost (local currency) */}
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">{currMeta.symbol}</span>
                    <input
                        id={`agent-travel-${agent.id}`}
                        type="number" min={0}
                        value={agent.travelCostLocal || ''}
                        onChange={e => onChange({ ...agent, travelCostLocal: Number(e.target.value) })}
                        placeholder="Travel cost"
                        className="w-full bg-slate-700/60 border border-violet-700/40 rounded-xl pl-8 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 min-h-[44px]"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-slate-500 pointer-events-none">Travel ({localCurrency})</span>
                </div>
                {/* Event Cost (local currency) */}
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">{currMeta.symbol}</span>
                    <input
                        id={`agent-event-cost-${agent.id}`}
                        type="number" min={0}
                        value={agent.eventCostLocal || ''}
                        onChange={e => onChange({ ...agent, eventCostLocal: Number(e.target.value) })}
                        placeholder="Stand share"
                        className="w-full bg-slate-700/60 border border-violet-700/40 rounded-xl pl-8 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 min-h-[44px]"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-slate-500 pointer-events-none">Stand ({localCurrency})</span>
                </div>
            </div>
        </motion.div>
    );
}

// ── Report Card (printable) ───────────────────────────────────────────────────

function ReportCard({ report }: { report: SettlementReport }) {
    const { summary, agents, fx } = report;
    const isForeign = fx.localCurrency !== 'AED';

    return (
        <div id="settlement-report" className="bg-white rounded-3xl overflow-hidden shadow-2xl">

            {/* ── Header ── */}
            <div className="bg-slate-900 px-8 pt-8 pb-6">
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <p className="text-amber-400 text-xs font-bold tracking-[0.2em] uppercase mb-2">
                            Property Shop Investment LLC
                        </p>
                        <h2 className="text-white text-2xl font-extrabold tracking-tight">
                            Final Settlement Report
                        </h2>
                        <p className="text-slate-400 text-sm mt-1">{report.eventName}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-slate-500 text-xs">Report ID</p>
                        <p className="text-amber-400 font-mono font-bold text-sm">{report.eventId}</p>
                    </div>
                </div>

                {/* Meta row */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                    {[
                        { label: 'Event Date', value: formatDate(report.eventDate) },
                        { label: 'Venue', value: report.venue || '—' },
                        { label: 'Approved By', value: report.branchManager },
                    ].map(({ label, value }) => (
                        <div key={label} className="bg-slate-800/60 rounded-xl px-4 py-3">
                            <p className="text-slate-500 text-xs mb-0.5">{label}</p>
                            <p className="text-white text-sm font-semibold">{value}</p>
                        </div>
                    ))}
                </div>

                {/* ── FX Audit Banner (visible on PDF) ── */}
                <div className={`rounded-xl px-4 py-3 flex items-start gap-3 ${isForeign
                        ? 'bg-amber-500/10 border border-amber-500/30'
                        : 'bg-emerald-500/10 border border-emerald-500/30'
                    }`}>
                    <ShieldCheck size={16} className={`flex-shrink-0 mt-0.5 ${isForeign ? 'text-amber-400' : 'text-emerald-400'}`} />
                    <div>
                        <p className={`text-xs font-bold uppercase tracking-widest mb-0.5 ${isForeign ? 'text-amber-400' : 'text-emerald-400'}`}>
                            FX Conversion Audit Record
                        </p>
                        <p className="text-slate-300 text-sm font-semibold">
                            Conversion Rate Applied: <span className={isForeign ? 'text-amber-300' : 'text-emerald-300'}>{fxLabel(fx)}</span>
                        </p>
                        <p className="text-slate-500 text-[11px] mt-0.5">
                            Source: {fx.source} · Locked at: {new Date(fx.lockedAt).toLocaleString('en-AE')}
                        </p>
                        {isForeign && (
                            <p className="text-slate-500 text-[11px] mt-0.5">
                                All travel and event costs originally denominated in {fx.localCurrency} have been converted to AED at the locked rate above before deduction from agent gross revenue. This rate is immutable for this report.
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Summary KPIs ── */}
            <div className="bg-slate-900/5 border-b border-slate-200 px-8 py-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Gross Closed Revenue', value: formatAED(summary.grossRevenue), sub: `${summary.agentCount} agents`, color: 'text-slate-900', border: 'border-slate-300' },
                        { label: 'Total Deductions (AED)', value: formatAED(summary.totalDeductionsAed), sub: 'Travel + event costs converted', color: 'text-violet-700', border: 'border-violet-300' },
                        { label: 'Net Revenue (AED)', value: formatAED(summary.totalNetRevenue), sub: 'Gross less converted costs', color: 'text-blue-700', border: 'border-blue-300' },
                        { label: 'Total Agent Payouts', value: formatAED(summary.totalAgentCommissions), sub: `${(100 - summary.roiPercent).toFixed(1)}% of net`, color: 'text-amber-600', border: 'border-amber-300' },
                        { label: 'Branch Gross Profit', value: formatAED(summary.branchGrossProfit), sub: `${summary.roiPercent.toFixed(1)}% retention`, color: 'text-emerald-700', border: 'border-emerald-300' },
                        { label: 'Net ROI to Branch', value: `${summary.roiPercent.toFixed(1)}%`, sub: 'post-commission, post-cost', color: 'text-amber-600', border: 'border-amber-300' },
                    ].map(({ label, value, sub, color, border }) => (
                        <div key={label} className={clsx('border rounded-xl px-4 py-3', border)}>
                            <p className="text-slate-500 text-xs mb-1">{label}</p>
                            <p className={clsx('text-xl font-extrabold', color)}>{value}</p>
                            <p className="text-slate-400 text-xs mt-0.5">{sub}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Agent breakdown table ── */}
            <div className="px-8 py-6">
                <h3 className="text-slate-900 font-bold text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Users size={15} />
                    Agent Commission Breakdown
                    {isForeign && (
                        <span className="ml-2 text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold normal-case">
                            Costs converted at {fx.rateToAed.toFixed(4)} AED / {fx.localCurrency}
                        </span>
                    )}
                </h3>
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    {/* Table header */}
                    <div className="grid grid-cols-[2fr_1.2fr_60px_1fr_1fr_1fr_1fr_1fr] bg-slate-900 px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider gap-2 min-w-[750px]">
                        <span>Agent</span>
                        <span>Branch</span>
                        <span>Tier</span>
                        <span className="text-right">Gross Rev.</span>
                        <span className="text-right">Deductions (AED)</span>
                        <span className="text-right">Net Rev.</span>
                        <span className="text-right">Agent Payout</span>
                        <span className="text-right">Branch Profit</span>
                    </div>
                    {agents.map((s, i) => (
                        <div
                            key={s.agent.id}
                            className={clsx(
                                'grid grid-cols-[2fr_1.2fr_60px_1fr_1fr_1fr_1fr_1fr] px-4 py-3 gap-2 items-center text-sm border-t border-slate-100 min-w-[750px]',
                                i % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'
                            )}
                        >
                            <div className="font-semibold text-slate-900">{s.agent.name}</div>
                            <div className="text-slate-500 text-xs">{s.agent.branch}</div>
                            <div>
                                <span className={clsx('text-xs font-bold px-2 py-0.5 rounded-full', TIER_CONFIG[s.agent.tier].tailwindBadge)}>
                                    {s.tier.label}
                                </span>
                            </div>
                            <div className="text-right text-slate-700 font-medium">{formatAED(s.agent.closedRevenue)}</div>
                            <div className="text-right">
                                <span className="font-bold text-violet-700">{formatAED(s.totalDeductionsAed)}</span>
                                {isForeign && (
                                    <p className="text-[9px] text-slate-400 mt-0.5">
                                        {formatLocalCurrency(s.agent.travelCostLocal + s.agent.eventCostLocal, fx.localCurrency)} → AED
                                    </p>
                                )}
                            </div>
                            <div className="text-right font-bold text-slate-800">{formatAED(s.netRevenue)}</div>
                            <div className="text-right font-bold text-blue-700">
                                {formatAED(s.agentCommission)}
                                <span className="text-xs font-normal text-slate-400 ml-1">({(s.tier.agentShare * 100).toFixed(0)}%)</span>
                            </div>
                            <div className="text-right font-bold text-emerald-700">{formatAED(s.branchContribution)}</div>
                        </div>
                    ))}
                    {/* Totals footer */}
                    <div className="grid grid-cols-[2fr_1.2fr_60px_1fr_1fr_1fr_1fr_1fr] px-4 py-3 gap-2 items-center bg-slate-900 text-sm border-t-2 border-slate-200 min-w-[750px]">
                        <div className="font-bold text-white col-span-3">TOTALS</div>
                        <div className="text-right font-bold text-white">{formatAED(summary.grossRevenue)}</div>
                        <div className="text-right font-bold text-violet-400">{formatAED(summary.totalDeductionsAed)}</div>
                        <div className="text-right font-bold text-slate-300">{formatAED(summary.totalNetRevenue)}</div>
                        <div className="text-right font-bold text-amber-400">{formatAED(summary.totalAgentCommissions)}</div>
                        <div className="text-right font-bold text-emerald-400">{formatAED(summary.branchGrossProfit)}</div>
                    </div>
                </div>

                {/* Math transparency footnote */}
                <div className="mt-4 flex items-start gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <Info size={13} className="text-slate-400 flex-shrink-0 mt-0.5" />
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                        <strong className="text-slate-700">Settlement formula:</strong>{' '}
                        Net Revenue = Gross Revenue − (Travel Cost × FX Rate) − (Event Cost × FX Rate).
                        Agent Payout = Net Revenue × Tier Share%. Branch Profit = Net Revenue − Agent Payout.
                        {isForeign && ` FX Rate used: 1 ${fx.localCurrency} = ${fx.rateToAed.toFixed(4)} AED (${fx.source}).`}
                    </p>
                </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-900 px-8 py-4 flex items-center justify-between flex-wrap gap-2">
                <p className="text-slate-500 text-xs">
                    Generated {new Date(report.generatedAt).toLocaleString('en-AE')} · PSI Event Portal
                </p>
                <p className="text-slate-600 text-xs">
                    Confidential — Property Shop Investment LLC
                </p>
            </div>
        </div>
    );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function SettlementDashboard() {
    const [eventName, setEventName] = useState('London Luxury Property Show — Oct 2026');
    const [eventDate, setEventDate] = useState('2026-10-14');
    const [venue, setVenue] = useState('Old Billingsgate, London');
    const [manager, setManager] = useState('Mohammed Al-Qubaisi');
    const [localCurrency, setLocalCurrency] = useState<SupportedCurrency>('GBP');
    const [fxOverride, setFxOverride] = useState('');  // empty = use reference rate
    const [agents, setAgents] = useState<AgentEntry[]>(DEMO_AGENTS);
    const [report, setReport] = useState<SettlementReport | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const reportRef = useRef<HTMLDivElement>(null);

    // Resolve FX rate in use (organizer override else reference)
    const effectiveRate = useMemo(() => {
        const override = parseFloat(fxOverride);
        return !isNaN(override) && override > 0
            ? override
            : REFERENCE_FX_RATES[localCurrency];
    }, [localCurrency, fxOverride]);

    const effectiveFx: FxSnapshot = useMemo(() =>
        buildFxSnapshot(localCurrency, parseFloat(fxOverride) > 0 ? parseFloat(fxOverride) : undefined),
        [localCurrency, fxOverride]
    );

    const addAgent = () =>
        setAgents(prev => [
            ...prev,
            { id: uid(), name: '', branch: '', tier: 'silver', closedRevenue: 0, travelCostLocal: 0, eventCostLocal: 0 },
        ]);

    const updateAgent = (id: string, updated: AgentEntry) =>
        setAgents(prev => prev.map(a => a.id === id ? updated : a));

    const removeAgent = (id: string) =>
        setAgents(prev => prev.filter(a => a.id !== id));

    const generateReport = () => {
        setIsGenerating(true);
        setTimeout(() => {
            const validAgents = agents.filter(a => a.name && a.closedRevenue > 0);
            const fx = buildFxSnapshot(localCurrency, parseFloat(fxOverride) > 0 ? parseFloat(fxOverride) : undefined);
            const r = calculateSettlement(eventName, eventDate, venue, manager, validAgents, fx);
            setReport(r);
            setIsGenerating(false);
            setTimeout(() => reportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
        }, 600);
    };

    const handlePrint = () => window.print();

    // Live preview totals (using effective FX)
    const validAgents = agents.filter(a => a.closedRevenue > 0);
    const liveGross = validAgents.reduce((s, a) => s + a.closedRevenue, 0);
    const liveDeductions = validAgents.reduce((s, a) =>
        s + Math.round((a.travelCostLocal + a.eventCostLocal) * effectiveRate), 0
    );
    const liveNet = Math.max(0, liveGross - liveDeductions);
    const liveCommissions = validAgents.reduce((s, a) => {
        const net = Math.max(0, a.closedRevenue - Math.round((a.travelCostLocal + a.eventCostLocal) * effectiveRate));
        return s + Math.round(net * TIER_CONFIG[a.tier].agentShare);
    }, 0);
    const liveProfit = liveNet - liveCommissions;

    return (
        <>
            {/* Print-only styles */}
            <style>{`
                @media print {
                    .no-print { display: none !important; }
                    body      { background: white !important; }
                    #settlement-report { box-shadow: none !important; }
                }
            `}</style>

            <div className="min-h-screen bg-slate-950 p-4 md:p-6 space-y-4 md:space-y-6 no-print">

                {/* ── Page Header ── */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
                                <Calculator size={18} className="text-white" />
                            </div>
                            <span className="text-amber-400 text-xs font-bold tracking-[0.2em] uppercase">Commission Engine · v2 FX</span>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                            Post-Event Settlement
                        </h1>
                        <p className="text-slate-400 mt-1 text-sm">
                            Multi-currency FX engine · AED payout per agent · Locked audit rate
                        </p>
                    </div>
                    {report && (
                        <div className="flex gap-3">
                            <button
                                id="print-report-btn"
                                onClick={handlePrint}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 transition-colors text-sm font-medium"
                            >
                                <Printer size={15} />
                                Print PDF
                            </button>
                        </div>
                    )}
                </div>

                {/* ── Live KPI Strip ── */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
                    <StatCard label="Gross Revenue (AED)" value={formatAED(liveGross)} sub={`${validAgents.length} agents`} accent="blue" icon={<TrendingUp size={18} />} />
                    <StatCard label="Total Deductions (AED)" value={formatAED(liveDeductions)} sub={`at ${effectiveRate.toFixed(4)} × ${localCurrency}`} accent="violet" icon={<Globe size={18} />} />
                    <StatCard label="Net Revenue (AED)" value={formatAED(liveNet)} sub="gross − converted costs" accent="blue" icon={<ArrowRight size={18} />} />
                    <StatCard label="Agent Payouts (AED)" value={formatAED(liveCommissions)} sub={liveNet > 0 ? `${((liveCommissions / liveNet) * 100).toFixed(1)}% of net` : '0%'} accent="gold" icon={<Award size={18} />} />
                    <StatCard label="Branch Gross Profit" value={formatAED(liveProfit)} sub={liveNet > 0 ? `${((liveProfit / liveNet) * 100).toFixed(1)}% retention` : '0%'} accent="emerald" icon={<Building2 size={18} />} />
                </div>

                {/* ── Event Details + FX Panel ── */}
                <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4 md:p-6">
                    <h2 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                        <FileText size={18} className="text-amber-400" />
                        Event Details
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                        {[
                            { id: 'event-name', label: 'Roadshow / Event Name', value: eventName, setter: setEventName, type: 'text', placeholder: 'e.g. London Luxury Roadshow Q1 2026' },
                            { id: 'event-date', label: 'Event Date', value: eventDate, setter: setEventDate, type: 'date', placeholder: '' },
                            { id: 'event-venue', label: 'Venue', value: venue, setter: setVenue, type: 'text', placeholder: 'e.g. Old Billingsgate, London' },
                            { id: 'branch-manager', label: 'Branch Manager (Approver)', value: manager, setter: setManager, type: 'text', placeholder: 'Full name' },
                        ].map(({ id, label, value, setter, type, placeholder }) => (
                            <div key={id}>
                                <label htmlFor={id} className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-widest">{label}</label>
                                <input
                                    id={id} type={type} value={value}
                                    onChange={e => setter(e.target.value)}
                                    placeholder={placeholder}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                                />
                            </div>
                        ))}
                    </div>

                    {/* FX Section */}
                    <div className="border-t border-slate-800 pt-5">
                        <div className="flex items-center gap-2 mb-4">
                            <Globe size={16} className="text-violet-400" />
                            <h3 className="text-white font-bold text-sm">FX / Multi-Currency Configuration</h3>
                            <span className="ml-1 text-[10px] bg-violet-500/20 text-violet-400 px-2 py-0.5 rounded-full font-bold">NEW</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                            {/* Currency picker */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-widest">
                                    Local Event Currency
                                </label>
                                <CurrencySelector value={localCurrency} onChange={c => { setLocalCurrency(c); setFxOverride(''); }} />
                            </div>

                            {/* Rate override */}
                            <div>
                                <label htmlFor="fx-rate-override" className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-widest">
                                    FX Rate Override (optional)
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">1 {localCurrency} =</span>
                                    <input
                                        id="fx-rate-override"
                                        type="number"
                                        step="0.0001"
                                        min="0"
                                        value={fxOverride}
                                        onChange={e => setFxOverride(e.target.value)}
                                        placeholder={REFERENCE_FX_RATES[localCurrency].toFixed(4)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-20 pr-12 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 font-mono"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">AED</span>
                                </div>
                                <p className="text-[10px] text-slate-500 mt-1">
                                    Leave blank to use PSI reference rate
                                </p>
                            </div>

                            {/* Active rate display */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-widest">
                                    Active Rate (used in settlement)
                                </label>
                                <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border ${fxOverride ? 'bg-amber-500/10 border-amber-500/30' : 'bg-emerald-500/10 border-emerald-500/30'
                                    }`}>
                                    <DollarSign size={16} className={fxOverride ? 'text-amber-400' : 'text-emerald-400'} />
                                    <div>
                                        <p className={`text-sm font-extrabold font-mono ${fxOverride ? 'text-amber-300' : 'text-emerald-300'}`}>
                                            1 {localCurrency} = {effectiveRate.toFixed(4)} AED
                                        </p>
                                        <p className="text-[10px] text-slate-500 mt-0.5">
                                            {fxOverride ? 'Organizer Override' : (localCurrency === 'AED' ? 'No conversion' : 'PSI Reference Rate')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Agent Roster Builder ── */}
                <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4 md:p-6">
                    <div className="flex items-center justify-between mb-4 md:mb-5">
                        <h2 className="text-white font-bold text-lg flex items-center gap-2">
                            <Users size={18} className="text-amber-400" />
                            Agent Roster
                            <span className="ml-2 text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-bold">
                                {agents.length} agents
                            </span>
                        </h2>
                        <button
                            id="add-agent-btn"
                            onClick={addAgent}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-sm font-bold transition-colors"
                        >
                            <Plus size={15} />
                            Add Agent
                        </button>
                    </div>

                    {/* Column headers */}
                    <div className="hidden md:grid grid-cols-[1fr_1fr_140px_36px] gap-3 mb-1 px-1">
                        {['Agent Name', 'Branch / Office', 'Risk Tier', ''].map(h => (
                            <p key={h} className="text-xs text-slate-500 font-bold uppercase tracking-widest">{h}</p>
                        ))}
                    </div>
                    <div className="hidden md:grid grid-cols-3 gap-3 mb-3 px-1">
                        {[
                            'Gross Revenue (AED)',
                            `Travel Cost (${localCurrency})`,
                            `Event/Stand Cost (${localCurrency})`,
                        ].map(h => (
                            <p key={h} className="text-xs text-violet-400 font-bold uppercase tracking-widest">{h}</p>
                        ))}
                    </div>

                    {/* Agent rows */}
                    <div className="space-y-3">
                        <AnimatePresence>
                            {agents.map(agent => (
                                <AgentRow
                                    key={agent.id}
                                    agent={agent}
                                    localCurrency={localCurrency}
                                    onChange={updated => updateAgent(agent.id, updated)}
                                    onRemove={() => removeAgent(agent.id)}
                                />
                            ))}
                        </AnimatePresence>
                        {agents.length === 0 && (
                            <div className="text-center py-10 text-slate-600">
                                <Users size={28} className="mx-auto mb-3 opacity-40" />
                                <p className="text-sm">No agents yet — click "Add Agent" to begin</p>
                            </div>
                        )}
                    </div>

                    {/* Tier reference + FX quick-note */}
                    <div className="mt-6 pt-4 border-t border-slate-800 space-y-3">
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Tier Reference:</p>
                        <div className="flex flex-col md:flex-row md:flex-wrap gap-2 md:gap-3">
                            {(Object.entries(TIER_CONFIG) as [RiskTier, typeof TIER_CONFIG[RiskTier]][]).map(([key, cfg]) => (
                                <div key={key} className={clsx('flex items-center gap-2 px-3 py-2 rounded-xl border text-xs select-none', cfg.tailwindBg, cfg.tailwindBorder)}>
                                    <span className={clsx('font-bold flex-shrink-0', cfg.tailwindText)}>{cfg.label}</span>
                                    <span className="text-slate-400">→ Agent earns <strong className="text-white">{(cfg.agentShare * 100).toFixed(0)}%</strong> of <em>net</em> revenue, Branch keeps <strong className="text-white">{(cfg.branchShare * 100).toFixed(0)}%</strong></span>
                                </div>
                            ))}
                        </div>
                        {localCurrency !== 'AED' && (
                            <div className="flex items-center gap-2 px-3 py-2 bg-violet-500/10 border border-violet-500/20 rounded-xl text-[11px] text-violet-300">
                                <Globe size={12} className="flex-shrink-0 text-violet-400" />
                                Travel + stand costs entered in <strong className="text-white">{localCurrency}</strong> are auto-converted to AED at <strong className="text-white">1 {localCurrency} = {effectiveRate.toFixed(4)} AED</strong> before the tier split is applied.
                            </div>
                        )}
                    </div>

                    {/* Generate button */}
                    <div className="flex justify-center mt-6">
                        <motion.button
                            id="generate-settlement-btn"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={generateReport}
                            disabled={isGenerating || validAgents.length === 0}
                            className="flex items-center gap-3 px-6 md:px-10 py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-base md:text-lg tracking-tight transition-all select-none shadow-lg shadow-amber-500/20"
                        >
                            {isGenerating ? (
                                <>
                                    <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                                    Calculating…
                                </>
                            ) : (
                                <>
                                    <Sparkles size={20} />
                                    Generate Final Settlement Report
                                </>
                            )}
                        </motion.button>
                    </div>
                </div>

                {/* ── Settlement Report (printable) ── */}
                <AnimatePresence>
                    {report && (
                        <motion.div
                            ref={reportRef}
                            initial={{ opacity: 0, y: 32 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-6 pt-0 no-print"
                        >
                            {/* Action bar */}
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <Star className="text-amber-400" size={18} />
                                    <span className="text-white font-bold text-lg">Final Settlement Report</span>
                                    <span className="text-xs text-amber-400 font-mono bg-amber-500/10 px-2 py-0.5 rounded-full">
                                        {report.eventId}
                                    </span>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        id="print-report-btn-2"
                                        onClick={handlePrint}
                                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 transition-colors text-sm font-semibold"
                                    >
                                        <Printer size={15} />
                                        Save as PDF
                                    </button>
                                    <button
                                        id="download-report-btn"
                                        onClick={handlePrint}
                                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-sm font-bold transition-colors"
                                    >
                                        <Download size={15} />
                                        Download Report
                                    </button>
                                </div>
                            </div>

                            <ReportCard report={report} />

                            {/* Highest earner callout */}
                            {report.summary.highestEarner && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.3 }}
                                    className="mt-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl px-6 py-4 flex items-center gap-4"
                                >
                                    <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <Award size={20} className="text-white" />
                                    </div>
                                    <div>
                                        <p className="text-amber-400 text-xs font-bold uppercase tracking-widest mb-0.5">Top Performer This Roadshow</p>
                                        <p className="text-white font-bold">
                                            {report.summary.highestEarner.agent.name}
                                            <span className="text-amber-400 ml-2">
                                                → {formatAED(report.summary.highestEarner.agentCommission)} commission earned
                                            </span>
                                        </p>
                                        <p className="text-slate-400 text-xs">
                                            {report.summary.highestEarner.agent.branch} · {report.summary.highestEarner.tier.label} tier ·{' '}
                                            Net {formatAED(report.summary.highestEarner.netRevenue)} (gross {formatAED(report.summary.highestEarner.agent.closedRevenue)} − {formatAED(report.summary.highestEarner.totalDeductionsAed)} deductions)
                                        </p>
                                    </div>
                                </motion.div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </>
    );
}
