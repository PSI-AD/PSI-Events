/**
 * SettlementDashboard.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Post-event Commission Settlement UI — v2 with Multi-Currency FX Engine.
 *
 * This file is intentionally slim (~200 lines): state, data flows, and event
 * handlers only. All UI sub-components are in dedicated modules:
 *
 *   CommissionEngine.ts       — pure math + Firestore schema + formatters
 *   SettlementWidgets.tsx     — StatCard, TierBadge, CurrencySelector, AgentRow
 *   ReportCard.tsx            — printable PDF-style report document
 */

import React, { useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    Calculator, Plus, Trash2, TrendingUp, Users, Building2, Award,
    Globe, AlertTriangle, RotateCcw, BadgeAlert, ChevronRight,
    Star, Printer, Download, Sparkles, FileText, DollarSign,
} from 'lucide-react';
import {
    AgentEntry, RiskTier, TIER_CONFIG, DEMO_AGENTS, DEMO_FX,
    SettlementReport, SupportedCurrency, FxSnapshot,
    CURRENCY_CATALOGUE, REFERENCE_FX_RATES,
    AgentDebt, DEMO_DEBTS, DEBT_REASON_LABELS,
    calculateSettlement, buildFxSnapshot,
    fetchAgentDebts,
    formatAED, formatLocalCurrency, formatDate, fxLabel,
} from './CommissionEngine';
import { StatCard, TierBadge, CurrencySelector, AgentRow } from './SettlementWidgets';
import { ReportCard } from './ReportCard';

// ── Helpers ───────────────────────────────────────────────────────────────────

let _nextId = 100;
const uid = () => String(++_nextId);

function clsx(...classes: (string | false | undefined | null)[]) {
    return classes.filter(Boolean).join(' ');
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function SettlementDashboard() {
    const [eventName, setEventName] = useState('London Luxury Property Show — Oct 2026');
    const [eventDate, setEventDate] = useState('2026-10-14');
    const [venue, setVenue] = useState('Old Billingsgate, London');
    const [manager, setManager] = useState('Mohammed Al-Qubaisi');
    const [localCurrency, setLocalCurrency] = useState<SupportedCurrency>('GBP');
    const [fxOverride, setFxOverride] = useState('');
    const [agents, setAgents] = useState<AgentEntry[]>(DEMO_AGENTS);
    const [report, setReport] = useState<SettlementReport | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [debtsMap, setDebtsMap] = useState<Record<string, AgentDebt[]>>(DEMO_DEBTS);
    const [showDebtManager, setShowDebtManager] = useState(false);
    const reportRef = useRef<HTMLDivElement>(null);

    // Resolve effective FX rate
    const effectiveRate = useMemo(() => {
        const override = parseFloat(fxOverride);
        return !isNaN(override) && override > 0 ? override : REFERENCE_FX_RATES[localCurrency];
    }, [localCurrency, fxOverride]);

    const effectiveFx: FxSnapshot = useMemo(() =>
        buildFxSnapshot(localCurrency, parseFloat(fxOverride) > 0 ? parseFloat(fxOverride) : undefined),
        [localCurrency, fxOverride]
    );

    // Agent CRUD
    const addAgent = () => setAgents(prev => [...prev, { id: uid(), name: '', branch: '', tier: 'silver', closedRevenue: 0, travelCostLocal: 0, eventCostLocal: 0 }]);
    const updateAgent = (id: string, updated: AgentEntry) => setAgents(prev => prev.map(a => a.id === id ? updated : a));
    const removeAgent = (id: string) => setAgents(prev => prev.filter(a => a.id !== id));

    // Report generation
    const generateReport = async () => {
        setIsGenerating(true);
        try {
            const validAguals = agents.filter(a => a.name && a.closedRevenue > 0);
            const fx = buildFxSnapshot(localCurrency, parseFloat(fxOverride) > 0 ? parseFloat(fxOverride) : undefined);
            let resolvedDebts = debtsMap;
            try {
                const live = await fetchAgentDebts(validAguals.map(a => a.id));
                if (Object.keys(live).length > 0) resolvedDebts = live;
            } catch { /* Firestore unavailable — use demo debts */ }
            const r = calculateSettlement(eventName, eventDate, venue, manager, validAguals, fx, resolvedDebts);
            setReport(r);
            setTimeout(() => reportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
        } finally {
            setIsGenerating(false);
        }
    };

    const handlePrint = () => window.print();

    // Live preview totals
    const validAgents = agents.filter(a => a.closedRevenue > 0);
    const liveGross = validAgents.reduce((s, a) => s + a.closedRevenue, 0);
    const liveDeductions = validAgents.reduce((s, a) => s + Math.round((a.travelCostLocal + a.eventCostLocal) * effectiveRate), 0);
    const liveNet = Math.max(0, liveGross - liveDeductions);
    const liveCommissions = validAgents.reduce((s, a) => {
        const net = Math.max(0, a.closedRevenue - Math.round((a.travelCostLocal + a.eventCostLocal) * effectiveRate));
        return s + Math.round(net * TIER_CONFIG[a.tier].agentShare);
    }, 0);
    const liveProfit = liveNet - liveCommissions;
    const allDebts = (Object.values(debtsMap) as AgentDebt[][]).flat();

    return (
        <>
            <style>{`
                @media print {
                    .no-print { display: none !important; }
                    body      { background: white !important; }
                    #settlement-report { box-shadow: none !important; }
                }
            `}</style>

            <div className="min-h-screen bg-psi-page p-4 md:p-6 space-y-4 md:space-y-6 no-print">

                {/* ── Page Header ── */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
                                <Calculator size={18} className="text-white" />
                            </div>
                            <span className="text-amber-500 dark:text-amber-400 text-xs font-bold tracking-[0.2em] uppercase">Commission Engine · v2 FX</span>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-extrabold text-psi-primary tracking-tight">Post-Event Settlement</h1>
                        <p className="text-psi-secondary mt-1 text-sm">Multi-currency FX engine · AED payout per agent · Locked audit rate</p>
                    </div>
                    {report && (
                        <div className="flex gap-3">
                            <button id="print-report-btn" onClick={handlePrint}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-psi text-psi-secondary hover:text-psi-primary transition-colors text-sm font-medium psi-card">
                                <Printer size={15} /> Print PDF
                            </button>
                        </div>
                    )}
                </div>

                {/* ── Live KPI Strip ── */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    <StatCard label="Gross Revenue (AED)" value={formatAED(liveGross)} sub={`${validAgents.length} agents`} accent="blue" icon={<TrendingUp size={18} />} />
                    <StatCard label="FX Deductions (AED)" value={formatAED(liveDeductions)} sub={`at ${effectiveRate.toFixed(4)} × ${localCurrency}`} accent="violet" icon={<Globe size={18} />} />
                    <StatCard label="Net Revenue (AED)" value={formatAED(liveNet)} sub="gross − converted costs" accent="blue" icon={<Award size={18} />} />
                    <StatCard label="Gross Commissions" value={formatAED(liveCommissions)} sub={liveNet > 0 ? `${((liveCommissions / liveNet) * 100).toFixed(1)}% of net` : '0%'} accent="gold" icon={<Award size={18} />} />
                    <StatCard label="Clawbacks (AED)" value={formatAED(allDebts.reduce((s, d) => s + d.remainingAed, 0))} sub={`${allDebts.length} debt(s) pending`} accent="red" icon={<AlertTriangle size={18} />} />
                    <StatCard label="Branch Gross Profit" value={formatAED(liveProfit)} sub={liveNet > 0 ? `${((liveProfit / liveNet) * 100).toFixed(1)}% retention` : '0%'} accent="emerald" icon={<Building2 size={18} />} />
                </div>

                {/* ── Event Details + FX Panel ── */}
                <div className="psi-card rounded-2xl p-4 md:p-6">
                    <h2 className="text-psi-primary font-bold text-lg mb-4 flex items-center gap-2">
                        <FileText size={18} className="text-amber-500 dark:text-amber-400" />
                        Event Details
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                        {[
                            { id: 'event-name', label: 'Roadshow / Event Name', value: eventName, setter: setEventName, type: 'text', placeholder: 'e.g. London Luxury Roadshow' },
                            { id: 'event-date', label: 'Event Date', value: eventDate, setter: setEventDate, type: 'date', placeholder: '' },
                            { id: 'event-venue', label: 'Venue', value: venue, setter: setVenue, type: 'text', placeholder: 'e.g. Old Billingsgate, London' },
                            { id: 'branch-manager', label: 'Branch Manager (Approver)', value: manager, setter: setManager, type: 'text', placeholder: 'Full name' },
                        ].map(({ id, label, value, setter, type, placeholder }) => (
                            <div key={id}>
                                <label htmlFor={id} className="block text-xs font-semibold text-psi-muted mb-1.5 uppercase tracking-widest">{label}</label>
                                <input id={id} type={type} value={value} onChange={e => setter(e.target.value)}
                                    placeholder={placeholder} className="psi-input w-full px-4 py-2.5 text-sm" />
                            </div>
                        ))}
                    </div>

                    {/* FX Section */}
                    <div className="border-t border-psi pt-5">
                        <div className="flex items-center gap-2 mb-4">
                            <Globe size={16} className="text-violet-500 dark:text-violet-400" />
                            <h3 className="text-psi-primary font-bold text-sm">FX / Multi-Currency Configuration</h3>
                            <span className="ml-1 text-[10px] bg-violet-500/20 text-violet-600 dark:text-violet-400 px-2 py-0.5 rounded-full font-bold">NEW</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-psi-muted mb-1.5 uppercase tracking-widest">Local Event Currency</label>
                                <CurrencySelector value={localCurrency} onChange={c => { setLocalCurrency(c); setFxOverride(''); }} />
                            </div>
                            <div>
                                <label htmlFor="fx-rate-override" className="block text-xs font-semibold text-psi-muted mb-1.5 uppercase tracking-widest">FX Rate Override (optional)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-psi-muted font-bold">1 {localCurrency} =</span>
                                    <input id="fx-rate-override" type="number" step="0.0001" min="0" value={fxOverride}
                                        onChange={e => setFxOverride(e.target.value)}
                                        placeholder={REFERENCE_FX_RATES[localCurrency].toFixed(4)}
                                        className="psi-input w-full pl-20 pr-12 py-2.5 text-sm font-mono" />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-psi-muted font-bold">AED</span>
                                </div>
                                <p className="text-[10px] text-psi-muted mt-1">Leave blank to use PSI reference rate</p>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-psi-muted mb-1.5 uppercase tracking-widest">Active Rate (used in settlement)</label>
                                <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border ${fxOverride ? 'bg-amber-500/10 border-amber-500/30' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
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

                {/* ── Clawback & Carry-Forward Ledger Manager ── */}
                <div className="psi-card rounded-2xl overflow-hidden border-2 border-rose-400/30">
                    <button id="toggle-debt-manager" type="button"
                        onClick={() => setShowDebtManager(v => !v)}
                        className="w-full flex items-center justify-between px-4 md:px-6 py-4 text-left hover:bg-psi-subtle transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-rose-500/10 flex items-center justify-center flex-shrink-0">
                                <RotateCcw size={18} className="text-rose-500" />
                            </div>
                            <div>
                                <p className="font-bold text-psi-primary flex items-center gap-2">
                                    Previous Event Clawbacks
                                    {allDebts.length > 0 && (
                                        <span className="text-xs bg-rose-500 text-white px-2 py-0.5 rounded-full font-bold">{allDebts.length} outstanding</span>
                                    )}
                                </p>
                                <p className="text-xs text-psi-muted mt-0.5">Debts are automatically deducted from agent commissions when the report is generated.</p>
                            </div>
                        </div>
                        <ChevronRight size={18} className={`text-psi-muted transition-transform ${showDebtManager ? 'rotate-90' : ''}`} />
                    </button>
                    <AnimatePresence>
                        {showDebtManager && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                                <div className="px-4 md:px-6 pb-6 pt-2 space-y-3 border-t border-psi">
                                    {allDebts.length === 0 ? (
                                        <p className="text-psi-muted text-sm italic py-4 text-center">No outstanding debts for this roster.</p>
                                    ) : (
                                        (Object.entries(debtsMap) as [string, AgentDebt[]][]).flatMap(([agentId, debts]) =>
                                            debts.map(debt => {
                                                const agentEntry = agents.find(a => a.id === agentId);
                                                return (
                                                    <div key={debt.id} className="bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-800/40 rounded-xl p-4 flex flex-col md:flex-row md:items-start gap-3">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                                <span className="text-xs font-bold bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 px-2 py-0.5 rounded-full">
                                                                    {DEBT_REASON_LABELS[debt.reason]}
                                                                </span>
                                                                <span className="text-xs text-psi-muted">← {debt.sourceEventName}</span>
                                                            </div>
                                                            <p className="font-bold text-psi-primary text-sm">{agentEntry?.name ?? debt.agentName}</p>
                                                            <p className="text-xs text-psi-secondary mt-0.5">{debt.description}</p>
                                                        </div>
                                                        <div className="flex-shrink-0 text-right">
                                                            <p className="font-extrabold text-rose-600 dark:text-rose-400 text-lg font-mono">-{formatAED(debt.remainingAed)}</p>
                                                            <p className="text-[10px] text-psi-muted">will be deducted</p>
                                                        </div>
                                                        <button title="Remove from this run"
                                                            onClick={() => setDebtsMap(prev => {
                                                                const copy = { ...prev };
                                                                copy[agentId] = (copy[agentId] ?? []).filter(d => d.id !== debt.id);
                                                                if (copy[agentId].length === 0) delete copy[agentId];
                                                                return copy;
                                                            })}
                                                            className="flex-shrink-0 w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-900/20 text-rose-500 hover:bg-rose-200 dark:hover:bg-rose-800/40 flex items-center justify-center transition-colors">
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                );
                                            })
                                        )
                                    )}
                                    {allDebts.length > 0 && (
                                        <div className="flex items-center justify-between px-4 py-3 bg-rose-500/10 border border-rose-400/30 rounded-xl">
                                            <span className="text-sm font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                                                <BadgeAlert size={15} /> Total deduction pending:
                                            </span>
                                            <span className="font-extrabold text-rose-600 dark:text-rose-400 font-mono text-lg">
                                                -{formatAED(allDebts.reduce((s, d) => s + d.remainingAed, 0))}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* ── Agent Roster Builder ── */}
                <div className="psi-card rounded-2xl p-4 md:p-6">
                    <div className="flex items-center justify-between mb-4 md:mb-5">
                        <h2 className="text-psi-primary font-bold text-lg flex items-center gap-2">
                            <Users size={18} className="text-amber-500 dark:text-amber-400" />
                            Agent Roster
                            <span className="ml-2 text-xs bg-amber-500/20 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-bold">{agents.length} agents</span>
                        </h2>
                        <button id="add-agent-btn" onClick={addAgent}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-sm font-bold transition-colors">
                            <Plus size={15} /> Add Agent
                        </button>
                    </div>

                    {/* Column headers */}
                    <div className="hidden md:grid grid-cols-[1fr_1fr_140px_36px] gap-3 mb-1 px-1">
                        {['Agent Name', 'Branch / Office', 'Risk Tier', ''].map(h => (
                            <p key={h} className="text-xs text-psi-muted font-bold uppercase tracking-widest">{h}</p>
                        ))}
                    </div>
                    <div className="hidden md:grid grid-cols-3 gap-3 mb-3 px-1">
                        {['Gross Revenue (AED)', `Travel Cost (${localCurrency})`, `Event/Stand Cost (${localCurrency})`].map(h => (
                            <p key={h} className="text-xs text-violet-600 dark:text-violet-400 font-bold uppercase tracking-widest">{h}</p>
                        ))}
                    </div>

                    <div className="space-y-3">
                        <AnimatePresence>
                            {agents.map(agent => (
                                <AgentRow key={agent.id} agent={agent} localCurrency={localCurrency}
                                    onChange={updated => updateAgent(agent.id, updated)}
                                    onRemove={() => removeAgent(agent.id)} />
                            ))}
                        </AnimatePresence>
                        {agents.length === 0 && (
                            <div className="text-center py-10 text-psi-muted">
                                <Users size={28} className="mx-auto mb-3 opacity-40" />
                                <p className="text-sm">No agents yet — click "Add Agent" to begin</p>
                            </div>
                        )}
                    </div>

                    {/* Tier reference + FX note */}
                    <div className="mt-6 pt-4 border-t border-psi space-y-3">
                        <p className="text-xs text-psi-muted font-bold uppercase tracking-widest">Tier Reference:</p>
                        <div className="flex flex-col md:flex-row md:flex-wrap gap-2 md:gap-3">
                            {(Object.entries(TIER_CONFIG) as [RiskTier, typeof TIER_CONFIG[RiskTier]][]).map(([key, cfg]) => (
                                <div key={key} className={clsx('flex items-center gap-2 px-3 py-2 rounded-xl border text-xs select-none', cfg.tailwindBg, cfg.tailwindBorder)}>
                                    <span className={clsx('font-bold flex-shrink-0', cfg.tailwindText)}>{cfg.label}</span>
                                    <span className="text-psi-secondary">→ Agent earns <strong className="text-psi-primary">{(cfg.agentShare * 100).toFixed(0)}%</strong> of <em>net</em> revenue, Branch keeps <strong className="text-psi-primary">{(cfg.branchShare * 100).toFixed(0)}%</strong></span>
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

                    <div className="flex justify-center mt-6">
                        <motion.button id="generate-settlement-btn" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                            onClick={generateReport} disabled={isGenerating || validAgents.length === 0}
                            className="flex items-center gap-3 px-6 md:px-10 py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-base md:text-lg tracking-tight transition-all select-none shadow-lg shadow-amber-500/20">
                            {isGenerating ? (
                                <><div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" /> Calculating…</>
                            ) : (
                                <><Sparkles size={20} /> Generate Final Settlement Report</>
                            )}
                        </motion.button>
                    </div>
                </div>

                {/* ── Settlement Report (printable) ── */}
                <AnimatePresence>
                    {report && (
                        <motion.div ref={reportRef} initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} className="p-6 pt-0 no-print">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <Star className="text-amber-500 dark:text-amber-400" size={18} />
                                    <span className="text-psi-primary font-bold text-lg">Final Settlement Report</span>
                                    <span className="text-xs text-amber-600 dark:text-amber-400 font-mono bg-amber-500/10 px-2 py-0.5 rounded-full">{report.eventId}</span>
                                </div>
                                <div className="flex gap-3">
                                    <button id="print-report-btn-2" onClick={handlePrint}
                                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl psi-card border-psi text-psi-secondary hover:text-psi-primary transition-colors text-sm font-semibold">
                                        <Printer size={15} /> Save as PDF
                                    </button>
                                    <button id="download-report-btn" onClick={handlePrint}
                                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-sm font-bold transition-colors">
                                        <Download size={15} /> Download Report
                                    </button>
                                </div>
                            </div>

                            <ReportCard report={report} />

                            {/* Highest earner callout */}
                            {report.summary.highestEarner && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                                    className="mt-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl px-6 py-4 flex items-center gap-4">
                                    <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <Award size={20} className="text-white" />
                                    </div>
                                    <div>
                                        <p className="text-amber-400 text-xs font-bold uppercase tracking-widest mb-0.5">Top Performer This Roadshow</p>
                                        <p className="text-white font-bold">
                                            {report.summary.highestEarner.agent.name}
                                            <span className="text-amber-400 ml-2">→ {formatAED(report.summary.highestEarner.agentCommission)} commission earned</span>
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
