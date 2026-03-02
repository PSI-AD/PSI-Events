/**
 * settlement/ReportCard.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * The printable PDF-style settlement report card.
 *
 * NOTE: Background is intentionally white (bg-white) — this is a print
 * document and must always appear on white paper regardless of the active UI
 * theme.
 *
 * Renders:
 *  - Header (event name, dates, approver, FX audit banner)
 *  - Summary KPI grid (6 financials)
 *  - Per-agent breakdown table with clawback columns
 *  - Previous Event Clawbacks audit section (finance audit trail)
 *  - Footer
 */

import React from 'react';
import { ShieldCheck, AlertTriangle, Users, Info } from 'lucide-react';
import type { SettlementReport } from './CommissionEngine';
import {
    TIER_CONFIG, DEBT_REASON_LABELS,
    formatAED, formatLocalCurrency, formatDate, fxLabel,
} from './CommissionEngine';

function clsx(...classes: (string | false | undefined | null)[]) {
    return classes.filter(Boolean).join(' ');
}

export function ReportCard({ report }: { report: SettlementReport }) {
    const { summary, agents, fx } = report;
    const isForeign = fx.localCurrency !== 'AED';

    return (
        <div id="settlement-report" className="bg-white rounded-3xl overflow-hidden shadow-2xl">

            {/* ── Header ── */}
            <div className="bg-psi-surface px-8 pt-8 pb-6">
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <p className="text-amber-400 text-xs font-bold tracking-[0.2em] uppercase mb-2">
                            Property Shop Investment LLC
                        </p>
                        <h2 className="text-psi-primary text-2xl font-extrabold tracking-tight">
                            Final Settlement Report
                        </h2>
                        <p className="text-psi-secondary text-sm mt-1">{report.eventName}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-psi-secondary text-xs">Report ID</p>
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
                        <div key={label} className="bg-psi-subtle/60 rounded-xl px-4 py-3">
                            <p className="text-psi-secondary text-xs mb-0.5">{label}</p>
                            <p className="text-psi-primary text-sm font-semibold">{value}</p>
                        </div>
                    ))}
                </div>

                {/* FX Audit Banner */}
                <div className={`rounded-xl px-4 py-3 flex items-start gap-3 ${isForeign
                    ? 'bg-amber-500/10 border border-amber-500/30'
                    : 'bg-emerald-500/10 border border-emerald-500/30'}`}>
                    <ShieldCheck size={16} className={`flex-shrink-0 mt-0.5 ${isForeign ? 'text-amber-400' : 'text-emerald-400'}`} />
                    <div>
                        <p className={`text-xs font-bold uppercase tracking-widest mb-0.5 ${isForeign ? 'text-amber-400' : 'text-emerald-400'}`}>
                            FX Conversion Audit Record
                        </p>
                        <p className="text-psi-secondary text-sm font-semibold">
                            Conversion Rate Applied: <span className={isForeign ? 'text-amber-300' : 'text-emerald-300'}>{fxLabel(fx)}</span>
                        </p>
                        <p className="text-psi-secondary text-[11px] mt-0.5">
                            Source: {fx.source} · Locked at: {new Date(fx.lockedAt).toLocaleString('en-AE')}
                        </p>
                        {isForeign && (
                            <p className="text-psi-secondary text-[11px] mt-0.5">
                                All travel and event costs originally denominated in {fx.localCurrency} have been converted to AED at the locked rate above before deduction from agent gross revenue. This rate is immutable for this report.
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Summary KPIs ── */}
            <div className="bg-psi-surface/5 border-b border-slate-200 px-8 py-6">
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
                            <p className="text-psi-secondary text-xs mb-1">{label}</p>
                            <p className={clsx('text-xl font-extrabold', color)}>{value}</p>
                            <p className="text-psi-secondary text-xs mt-0.5">{sub}</p>
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
                    <div className="grid grid-cols-[2fr_1.2fr_60px_1fr_1fr_1fr_1fr_1fr_1fr] bg-psi-surface px-4 py-3 text-[10px] font-bold text-psi-secondary uppercase tracking-wider gap-2 min-w-[900px]">
                        <span>Agent</span>
                        <span>Branch</span>
                        <span>Tier</span>
                        <span className="text-right">Gross Rev.</span>
                        <span className="text-right">Deductions (AED)</span>
                        <span className="text-right">Net Rev.</span>
                        <span className="text-right">Gross Commission</span>
                        <span className="text-right text-rose-400">Clawbacks</span>
                        <span className="text-right text-emerald-400">Net Payout</span>
                    </div>
                    {agents.map((s, i) => (
                        <div key={s.agent.id}
                            className={clsx('grid grid-cols-[2fr_1.2fr_60px_1fr_1fr_1fr_1fr_1fr_1fr] px-4 py-3 gap-2 items-start text-sm border-t border-slate-100 min-w-[900px]',
                                i % 2 === 0 ? 'bg-white' : 'bg-slate-50/60')}>
                            <div className="font-semibold text-slate-900">{s.agent.name}</div>
                            <div className="text-psi-secondary text-xs">{s.agent.branch}</div>
                            <div>
                                <span className={clsx('text-xs font-bold px-2 py-0.5 rounded-full', TIER_CONFIG[s.agent.tier].tailwindBadge)}>
                                    {s.tier.label}
                                </span>
                            </div>
                            <div className="text-right text-slate-700 font-medium">{formatAED(s.agent.closedRevenue)}</div>
                            <div className="text-right">
                                <span className="font-bold text-violet-700">{formatAED(s.totalDeductionsAed)}</span>
                                {isForeign && (
                                    <p className="text-[9px] text-psi-secondary mt-0.5">
                                        {formatLocalCurrency(s.agent.travelCostLocal + s.agent.eventCostLocal, fx.localCurrency)} → AED
                                    </p>
                                )}
                            </div>
                            <div className="text-right font-bold text-slate-800">{formatAED(s.netRevenue)}</div>
                            <div className="text-right">
                                <span className="font-bold text-blue-700">{formatAED(s.agentCommission)}</span>
                                <span className="text-xs font-normal text-psi-secondary ml-1">({(s.tier.agentShare * 100).toFixed(0)}%)</span>
                            </div>
                            <div className="text-right">
                                {s.clawbacks.length > 0 ? (
                                    <>
                                        <span className="font-bold text-rose-600">-{formatAED(s.totalClawbackAed)}</span>
                                        {s.clawbacks.map(c => (
                                            <p key={c.debtId} className="text-[9px] text-rose-400 mt-0.5 leading-tight">
                                                {c.sourceEventName} · {formatAED(c.appliedAed)}
                                                {c.residualAed > 0 && <span className="text-psi-secondary"> (+{formatAED(c.residualAed)} CF)</span>}
                                            </p>
                                        ))}
                                    </>
                                ) : (
                                    <span className="text-psi-secondary">—</span>
                                )}
                            </div>
                            <div className="text-right font-bold text-emerald-700">
                                {formatAED(s.effectiveCommission)}
                                <p className="text-[9px] text-psi-secondary font-normal">Branch: {formatAED(s.branchContribution)}</p>
                            </div>
                        </div>
                    ))}
                    {/* Totals footer */}
                    <div className="grid grid-cols-[2fr_1.2fr_60px_1fr_1fr_1fr_1fr_1fr_1fr] px-4 py-3 gap-2 items-center bg-psi-surface text-sm border-t-2 border-slate-200 min-w-[900px]">
                        <div className="font-bold text-psi-primary col-span-3">TOTALS</div>
                        <div className="text-right font-bold text-psi-primary">{formatAED(summary.grossRevenue)}</div>
                        <div className="text-right font-bold text-violet-400">{formatAED(summary.totalDeductionsAed)}</div>
                        <div className="text-right font-bold text-psi-secondary">{formatAED(summary.totalNetRevenue)}</div>
                        <div className="text-right font-bold text-blue-400">{formatAED(summary.totalAgentCommissions)}</div>
                        <div className="text-right font-bold text-rose-400">-{formatAED(summary.totalClawbacksAed)}</div>
                        <div className="text-right font-bold text-emerald-400">{formatAED(summary.totalEffectiveCommissions)}</div>
                    </div>
                </div>

                {/* Math transparency footnote */}
                <div className="mt-4 flex items-start gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <Info size={13} className="text-psi-secondary flex-shrink-0 mt-0.5" />
                    <p className="text-[11px] text-psi-secondary leading-relaxed">
                        <strong className="text-slate-700">Settlement formula:</strong>{' '}
                        Net Revenue = Gross Revenue − (Travel Cost × FX Rate) − (Event Cost × FX Rate).
                        Gross Commission = Net Revenue × Tier Share%. Net Payout = Gross Commission − Clawbacks.
                        Branch Profit = Net Revenue − Net Payout.
                        {isForeign && ` FX Rate used: 1 ${fx.localCurrency} = ${fx.rateToAed.toFixed(4)} AED (${fx.source}).`}
                    </p>
                </div>

                {/* Previous Event Clawbacks Audit Section */}
                {report.hasClawbacks && (
                    <div className="mt-6 border-2 border-rose-300 rounded-2xl overflow-hidden">
                        <div className="bg-rose-700 px-6 py-3 flex items-center gap-2">
                            <AlertTriangle size={16} className="text-rose-200" />
                            <h3 className="text-psi-primary font-bold text-sm uppercase tracking-widest">
                                ⚠ Previous Event Clawbacks — Finance Audit Trail
                            </h3>
                        </div>
                        <div className="px-6 py-4 bg-rose-50 space-y-4">
                            <p className="text-[11px] text-rose-700 leading-relaxed">
                                The following deductions have been automatically applied to agent commissions in this settlement
                                based on outstanding debts from prior roadshow events. All amounts are in AED.
                                Residual carry-forward amounts remain outstanding and will be recovered in the next settlement cycle.
                            </p>
                            {agents.filter(s => s.clawbacks.length > 0).map(s => (
                                <div key={s.agent.id} className="border border-rose-200 rounded-xl overflow-hidden">
                                    <div className="bg-rose-100 px-4 py-2 flex items-center justify-between">
                                        <div>
                                            <span className="font-bold text-rose-900 text-sm">{s.agent.name}</span>
                                            <span className="text-rose-600 text-xs ml-2">{s.agent.branch}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xs text-rose-600">Gross commission: </span>
                                            <span className="font-bold text-slate-800">{formatAED(s.agentCommission)}</span>
                                            <span className="text-xs text-rose-600 ml-2">→ Net payout: </span>
                                            <span className="font-extrabold text-emerald-700">{formatAED(s.effectiveCommission)}</span>
                                        </div>
                                    </div>
                                    {s.clawbacks.map((c, ci) => (
                                        <div key={c.debtId} className={`px-4 py-3 text-sm flex flex-col md:flex-row md:items-start gap-2 ${ci > 0 ? 'border-t border-rose-100' : ''}`}>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-slate-800 text-xs">{c.description}</p>
                                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                    <span className="text-[10px] bg-rose-200 text-rose-700 px-2 py-0.5 rounded-full font-bold">
                                                        {DEBT_REASON_LABELS[c.reason]}
                                                    </span>
                                                    <span className="text-[10px] text-psi-secondary">Origin: {c.sourceEventName}</span>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-3 gap-4 text-right flex-shrink-0 text-xs">
                                                <div>
                                                    <p className="text-psi-secondary">Outstanding</p>
                                                    <p className="font-bold text-slate-700">{formatAED(c.originalAmountAed)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-rose-600">Recovered Now</p>
                                                    <p className="font-extrabold text-rose-700">-{formatAED(c.appliedAed)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-psi-secondary">Carry-Forward</p>
                                                    <p className={`font-bold ${c.residualAed > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                                        {c.residualAed > 0 ? formatAED(c.residualAed) : '✓ Cleared'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ))}
                            <div className="flex items-center justify-between bg-rose-700 text-psi-primary px-6 py-4 rounded-xl">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-widest text-rose-200 mb-0.5">Total Clawbacks This Settlement</p>
                                    <p className="text-2xl font-extrabold">-{formatAED(summary.totalClawbacksAed)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-rose-200 mb-0.5">Net Agent Payouts (post-clawback)</p>
                                    <p className="text-2xl font-extrabold text-emerald-300">{formatAED(summary.totalEffectiveCommissions)}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="bg-psi-surface px-8 py-4 flex items-center justify-between flex-wrap gap-2">
                <p className="text-psi-secondary text-xs">
                    Generated {new Date(report.generatedAt).toLocaleString('en-AE')} · PSI Event Portal
                </p>
                <p className="text-slate-600 text-xs">
                    Confidential — Property Shop Investment LLC
                </p>
            </div>
        </div>
    );
}
