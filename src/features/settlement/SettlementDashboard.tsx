import React, { useRef, useState } from 'react';

import { motion, AnimatePresence } from 'motion/react';
import {
    Calculator,
    Download,
    Plus,
    Trash2,
    TrendingUp,
    Users,
    Building2,
    Award,
    ChevronDown,
    Printer,
    FileText,
    Sparkles,
    Star,
} from 'lucide-react';
import {
    AgentEntry,
    RiskTier,
    TIER_CONFIG,
    DEMO_AGENTS,
    SettlementReport,
    calculateSettlement,
    formatAED,
    formatDate,
} from './CommissionEngine';

// ── Helpers ─────────────────────────────────────────────────────────────────

let _nextId = 100;
const uid = () => String(++_nextId);

function clsx(...classes: (string | false | undefined | null)[]) {
    return classes.filter(Boolean).join(' ');
}

// ── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
    label,
    value,
    sub,
    accent,
    icon,
}: {
    label: string;
    value: string;
    sub?: string;
    accent: 'gold' | 'emerald' | 'blue' | 'red';
    icon: React.ReactNode;
}) {
    const accentMap = {
        gold: { ring: 'ring-amber-500/30', text: 'text-amber-400', bg: 'bg-amber-500/10' },
        emerald: { ring: 'ring-emerald-500/30', text: 'text-emerald-400', bg: 'bg-emerald-500/10' },
        blue: { ring: 'ring-blue-500/30', text: 'text-blue-400', bg: 'bg-blue-500/10' },
        red: { ring: 'ring-red-500/30', text: 'text-red-400', bg: 'bg-red-500/10' },
    };
    const c = accentMap[accent];
    return (
        <div className={clsx('bg-slate-800/60 rounded-2xl p-5 ring-1', c.ring)}>
            <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center mb-3', c.bg)}>
                <span className={c.text}>{icon}</span>
            </div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest mb-1">{label}</p>
            <p className={clsx('text-2xl font-bold', c.text)}>{value}</p>
            {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
        </div>
    );
}

function TierBadge({ tier }: { tier: RiskTier }) {
    const cfg = TIER_CONFIG[tier];
    return (
        <span className={clsx('text-xs font-bold px-2 py-0.5 rounded-full', cfg.tailwindBadge)}>
            {cfg.label}
        </span>
    );
}

// ── Agent Row (in the builder) ───────────────────────────────────────────────

function AgentRow({
    agent,
    onChange,
    onRemove,
}: {
    agent: AgentEntry;
    onChange: (updated: AgentEntry) => void;
    onRemove: () => void;
}) {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -24 }}
            className="grid grid-cols-[1fr_1fr_140px_160px_36px] gap-3 items-center"
        >
            {/* Agent Name */}
            <input
                id={`agent-name-${agent.id}`}
                type="text"
                value={agent.name}
                onChange={(e) => onChange({ ...agent, name: e.target.value })}
                placeholder="Agent full name"
                className="bg-slate-700/60 border border-slate-600 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
            />
            {/* Branch */}
            <input
                id={`agent-branch-${agent.id}`}
                type="text"
                value={agent.branch}
                onChange={(e) => onChange({ ...agent, branch: e.target.value })}
                placeholder="Branch / office"
                className="bg-slate-700/60 border border-slate-600 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
            />
            {/* Tier selector */}
            <div className="relative">
                <select
                    id={`agent-tier-${agent.id}`}
                    value={agent.tier}
                    onChange={(e) => onChange({ ...agent, tier: e.target.value as RiskTier })}
                    className="w-full appearance-none bg-slate-700/60 border border-slate-600 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 pr-8"
                >
                    <option value="gold">Gold (50%)</option>
                    <option value="silver">Silver (30%)</option>
                    <option value="bronze">Bronze (20%)</option>
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-3 text-slate-400 pointer-events-none" />
            </div>
            {/* Closed Revenue */}
            <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">AED</span>
                <input
                    id={`agent-revenue-${agent.id}`}
                    type="number"
                    min={0}
                    value={agent.closedRevenue || ''}
                    onChange={(e) => onChange({ ...agent, closedRevenue: Number(e.target.value) })}
                    placeholder="0"
                    className="w-full bg-slate-700/60 border border-slate-600 rounded-xl pl-11 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                />
            </div>
            {/* Remove */}
            <button
                id={`remove-agent-${agent.id}`}
                onClick={onRemove}
                className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
                <Trash2 size={15} />
            </button>
        </motion.div>
    );
}

// ── Printable Settlement Report ───────────────────────────────────────────────

function ReportCard({ report }: { report: SettlementReport }) {
    const { summary, agents } = report;

    return (
        <div id="settlement-report" className="bg-white rounded-3xl overflow-hidden shadow-2xl">
            {/* Header — Navy + Gold */}
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
                <div className="grid grid-cols-3 gap-4">
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
            </div>

            {/* Summary KPIs */}
            <div className="bg-slate-900/5 border-b border-slate-200 px-8 py-6">
                <div className="grid grid-cols-4 gap-4">
                    {[
                        {
                            label: 'Gross Closed Revenue',
                            value: formatAED(summary.grossRevenue),
                            sub: `${summary.agentCount} agents`,
                            color: 'text-slate-900',
                            border: 'border-slate-300',
                        },
                        {
                            label: 'Total Agent Payouts',
                            value: formatAED(summary.totalAgentCommissions),
                            sub: `${(100 - summary.roiPercent).toFixed(1)}% of gross`,
                            color: 'text-blue-700',
                            border: 'border-blue-300',
                        },
                        {
                            label: 'Branch Gross Profit',
                            value: formatAED(summary.branchGrossProfit),
                            sub: `${summary.roiPercent.toFixed(1)}% retention`,
                            color: 'text-emerald-700',
                            border: 'border-emerald-300',
                        },
                        {
                            label: 'Net ROI to Branch',
                            value: `${summary.roiPercent.toFixed(1)}%`,
                            sub: 'post-commission',
                            color: 'text-amber-600',
                            border: 'border-amber-300',
                        },
                    ].map(({ label, value, sub, color, border }) => (
                        <div key={label} className={clsx('border rounded-xl px-4 py-3', border)}>
                            <p className="text-slate-500 text-xs mb-1">{label}</p>
                            <p className={clsx('text-xl font-extrabold', color)}>{value}</p>
                            <p className="text-slate-400 text-xs mt-0.5">{sub}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Agent breakdown table */}
            <div className="px-8 py-6">
                <h3 className="text-slate-900 font-bold text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Users size={15} />
                    Agent Commission Breakdown
                </h3>
                <div className="overflow-hidden rounded-2xl border border-slate-200">
                    {/* Table header */}
                    <div className="grid grid-cols-[2fr_1.2fr_80px_1.2fr_1.2fr_1.2fr] bg-slate-900 px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider gap-2">
                        <span>Agent</span>
                        <span>Branch</span>
                        <span>Tier</span>
                        <span className="text-right">Closed Revenue</span>
                        <span className="text-right">Agent Payout</span>
                        <span className="text-right">Branch Profit</span>
                    </div>
                    {/* Rows */}
                    {agents.map((s, i) => (
                        <div
                            key={s.agent.id}
                            className={clsx(
                                'grid grid-cols-[2fr_1.2fr_80px_1.2fr_1.2fr_1.2fr] px-4 py-3 gap-2 items-center text-sm border-t border-slate-100',
                                i % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'
                            )}
                        >
                            <div className="font-semibold text-slate-900">{s.agent.name}</div>
                            <div className="text-slate-500 text-xs">{s.agent.branch}</div>
                            <div>
                                <span
                                    className={clsx(
                                        'text-xs font-bold px-2 py-0.5 rounded-full',
                                        TIER_CONFIG[s.agent.tier].tailwindBadge
                                    )}
                                >
                                    {s.tier.label}
                                </span>
                            </div>
                            <div className="text-right text-slate-700 font-medium">
                                {formatAED(s.agent.closedRevenue)}
                            </div>
                            <div className="text-right font-bold text-blue-700">
                                {formatAED(s.agentCommission)}
                                <span className="text-xs font-normal text-slate-400 ml-1">
                                    ({(s.tier.agentShare * 100).toFixed(0)}%)
                                </span>
                            </div>
                            <div className="text-right font-bold text-emerald-700">
                                {formatAED(s.branchContribution)}
                            </div>
                        </div>
                    ))}
                    {/* Totals footer */}
                    <div className="grid grid-cols-[2fr_1.2fr_80px_1.2fr_1.2fr_1.2fr] px-4 py-3 gap-2 items-center bg-slate-900 text-sm border-t-2 border-slate-200">
                        <div className="font-bold text-white col-span-3">TOTALS</div>
                        <div className="text-right font-bold text-white">{formatAED(summary.grossRevenue)}</div>
                        <div className="text-right font-bold text-amber-400">{formatAED(summary.totalAgentCommissions)}</div>
                        <div className="text-right font-bold text-emerald-400">{formatAED(summary.branchGrossProfit)}</div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-900 px-8 py-4 flex items-center justify-between">
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
    const [eventName, setEventName] = useState('Abu Dhabi Luxury Roadshow Q1 2026');
    const [eventDate, setEventDate] = useState('2026-02-27');
    const [venue, setVenue] = useState('Four Seasons Hotel, Abu Dhabi');
    const [manager, setManager] = useState('Mohammed Al-Qubaisi');
    const [agents, setAgents] = useState<AgentEntry[]>(DEMO_AGENTS);
    const [report, setReport] = useState<SettlementReport | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const reportRef = useRef<HTMLDivElement>(null);

    const addAgent = () =>
        setAgents((prev) => [
            ...prev,
            { id: uid(), name: '', branch: '', tier: 'silver', closedRevenue: 0 },
        ]);

    const updateAgent = (id: string, updated: AgentEntry) =>
        setAgents((prev) => prev.map((a) => (a.id === id ? updated : a)));

    const removeAgent = (id: string) =>
        setAgents((prev) => prev.filter((a) => a.id !== id));

    const generateReport = () => {
        setIsGenerating(true);
        setTimeout(() => {
            const r = calculateSettlement(eventName, eventDate, venue, manager, agents.filter(a => a.name && a.closedRevenue > 0));
            setReport(r);
            setIsGenerating(false);
            setTimeout(() => reportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
        }, 600);
    };

    const handlePrint = () => window.print();

    // Live preview totals
    const validAgents = agents.filter((a) => a.closedRevenue > 0);
    const liveGross = validAgents.reduce((s, a) => s + a.closedRevenue, 0);
    const liveCommissions = validAgents.reduce(
        (s, a) => s + Math.round(a.closedRevenue * TIER_CONFIG[a.tier].agentShare),
        0
    );
    const liveProfit = liveGross - liveCommissions;

    return (
        <>
            {/* Print-only styles */}
            <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          #settlement-report { box-shadow: none !important; }
        }
      `}</style>

            <div className="min-h-screen bg-slate-950 p-6 space-y-6 no-print">

                {/* ── Page Header ── */}
                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
                                <Calculator size={18} className="text-white" />
                            </div>
                            <span className="text-amber-400 text-xs font-bold tracking-[0.2em] uppercase">Commission Engine</span>
                        </div>
                        <h1 className="text-3xl font-extrabold text-white tracking-tight">
                            Post-Event Settlement
                        </h1>
                        <p className="text-slate-400 mt-1 text-sm">
                            Calculate exact AED payouts per agent · Eliminate commission disputes · Generate locked reports
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
                <div className="grid grid-cols-4 gap-4">
                    <StatCard label="Gross Revenue" value={formatAED(liveGross)} sub={`${validAgents.length} agents`} accent="blue" icon={<TrendingUp size={18} />} />
                    <StatCard label="Agent Payouts" value={formatAED(liveCommissions)} sub={liveGross > 0 ? `${((liveCommissions / liveGross) * 100).toFixed(1)}% of gross` : '0%'} accent="gold" icon={<Award size={18} />} />
                    <StatCard label="Branch Gross Profit" value={formatAED(liveProfit)} sub={liveGross > 0 ? `${((liveProfit / liveGross) * 100).toFixed(1)}% retention` : '0%'} accent="emerald" icon={<Building2 size={18} />} />
                    <StatCard label="Active Agents" value={String(validAgents.length)} sub={`${agents.length} total in roster`} accent="blue" icon={<Users size={18} />} />
                </div>

                {/* ── Event Details Panel ── */}
                <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
                    <h2 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                        <FileText size={18} className="text-amber-400" />
                        Event Details
                    </h2>
                    <div className="grid grid-cols-2 gap-4">
                        {[
                            { id: 'event-name', label: 'Roadshow / Event Name', value: eventName, setter: setEventName, type: 'text', placeholder: 'e.g. Abu Dhabi Luxury Roadshow Q1 2026' },
                            { id: 'event-date', label: 'Event Date', value: eventDate, setter: setEventDate, type: 'date', placeholder: '' },
                            { id: 'event-venue', label: 'Venue', value: venue, setter: setVenue, type: 'text', placeholder: 'e.g. Four Seasons Hotel' },
                            { id: 'branch-manager', label: 'Branch Manager (Approver)', value: manager, setter: setManager, type: 'text', placeholder: 'Full name of approving manager' },
                        ].map(({ id, label, value, setter, type, placeholder }) => (
                            <div key={id}>
                                <label htmlFor={id} className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-widest">
                                    {label}
                                </label>
                                <input
                                    id={id}
                                    type={type}
                                    value={value}
                                    onChange={(e) => setter(e.target.value)}
                                    placeholder={placeholder}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Agent Roster Builder ── */}
                <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
                    <div className="flex items-center justify-between mb-5">
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
                    <div className="grid grid-cols-[1fr_1fr_140px_160px_36px] gap-3 mb-3 px-1">
                        {['Agent Name', 'Branch / Office', 'Risk Tier', 'Closed Revenue (AED)', ''].map((h) => (
                            <p key={h} className="text-xs text-slate-500 font-bold uppercase tracking-widest">{h}</p>
                        ))}
                    </div>

                    {/* Agent rows */}
                    <div className="space-y-3">
                        <AnimatePresence>
                            {agents.map((agent) => (
                                <AgentRow
                                    key={agent.id}
                                    agent={agent}
                                    onChange={(updated) => updateAgent(agent.id, updated)}
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

                    {/* Tier reference */}
                    <div className="mt-6 pt-4 border-t border-slate-800 flex gap-4">
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mr-4 self-center">Tier Reference:</p>
                        {(Object.entries(TIER_CONFIG) as [RiskTier, typeof TIER_CONFIG[RiskTier]][]).map(([key, cfg]) => (
                            <div key={key} className={clsx('flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs', cfg.tailwindBg, cfg.tailwindBorder)}>
                                <span className={clsx('font-bold', cfg.tailwindText)}>{cfg.label}</span>
                                <span className="text-slate-400">→ Agent earns <strong className="text-white">{(cfg.agentShare * 100).toFixed(0)}%</strong>, Branch keeps <strong className="text-white">{(cfg.branchShare * 100).toFixed(0)}%</strong></span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Generate Button ── */}
                <div className="flex justify-center">
                    <motion.button
                        id="generate-settlement-btn"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={generateReport}
                        disabled={isGenerating || validAgents.length === 0}
                        className="flex items-center gap-3 px-10 py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-lg tracking-tight transition-colors shadow-lg shadow-amber-500/20"
                    >
                        {isGenerating ? (
                            <>
                                <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                                Calculating...
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
                                        {report.summary.highestEarner.agent.branch} · {report.summary.highestEarner.tier.label} tier · {formatAED(report.summary.highestEarner.agent.closedRevenue)} closed
                                    </p>
                                </div>
                            </motion.div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
