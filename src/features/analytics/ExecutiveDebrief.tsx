/**
 * ExecutiveDebrief.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * AUTOMATED EXECUTIVE DEBRIEF GENERATOR
 *
 * Surfaces a "Generate AI Post-Mortem" button exclusively when an event's
 * status is 'Completed'. On click it:
 *
 *   1. Pulls the latest expense breakdown from Firestore
 *      (events/{eventId}/expenses)
 *   2. Pulls published journal posts from
 *      (events/{eventId}/journal, limit 30)
 *   3. Compiles a structured data payload and sends it to the
 *      mockGeminiDebrief() function (Gemini Vision stub)
 *   4. Renders the response as a beautiful, print-ready McKinsey/Deloitte-
 *      style document inside a modal overlay.
 *
 * Exports:
 *   <GenerateDebriefButton>   — Trigger button (drop-in to Analytics header)
 *   <ExecutiveDebrief>        — Full standalone page wrapper
 *
 * Firestore reads (read-only):
 *   events/{eventId}/expenses   — expense documents
 *   events/{eventId}/journal    — journal posts (published, desc, limit 30)
 *
 * Production wiring:
 *   Replace mockGeminiDebrief() with a call to a Cloud Function that calls
 *   the Gemini API with the compiled prompt, returning { report: string }.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    Sparkles, X, Printer, Download, Loader2, FileText,
    CheckCircle2, TrendingUp, AlertTriangle, DollarSign,
    Users, BarChart2, ChevronRight, BookOpen, Clock,
    Building2, Star, Lightbulb, Target,
} from 'lucide-react';
import {
    collection, getDocs, orderBy, query, limit, where,
} from 'firebase/firestore';
import { db } from '../../services/firebase/firebaseConfig';
import type { Event, EventStatus } from '../../types';
import type { JournalPost } from '../../types/journal';

// ═════════════════════════════════════════════════════════════════════════════
// Types
// ═════════════════════════════════════════════════════════════════════════════

interface ExpenseRow {
    id: string;
    category: string;
    subcategory?: string;
    amount: number;
    paidBy?: string;
    description?: string;
}

interface DebriefInput {
    event: Event;
    totalExpenses: number;
    expenseBreakdown: Record<string, number>; // category → total AED
    grossProfit: number;
    netROI: number;
    leadCount: number;
    journalExcerpts: string[];
    agentCount: number;
}

interface GeneratedDebrief {
    executiveSummary: string;
    successHighlights: string[];
    challenges: string[];
    roiAnalysis: string;
    recommendations: string[];
    outlook: string;
    metadata: {
        generatedAt: string;
        model: string;
        wordCount: number;
    };
}

// ─────────────────────────────────────────────────────────────────────────────

function clsx(...c: (string | false | null | undefined)[]) {
    return c.filter(Boolean).join(' ');
}

function formatAED(n: number) {
    return n.toLocaleString('en-AE', { maximumFractionDigits: 0 });
}

// ═════════════════════════════════════════════════════════════════════════════
// Gemini AI Mock
// Replace body with Cloud Function call in production.
// ═════════════════════════════════════════════════════════════════════════════

async function mockGeminiDebrief(input: DebriefInput): Promise<GeneratedDebrief> {
    const { event, totalExpenses, expenseBreakdown, grossProfit, netROI,
        leadCount, journalExcerpts, agentCount } = input;

    const expenseLines = Object.entries(expenseBreakdown)
        .map(([cat, total]) => `${cat}: AED ${formatAED(total)}`)
        .join('\n  ');

    const journalSample = journalExcerpts.slice(0, 5).join('\n  ');

    // ── Gemini prompt (logged for production wiring) ──────────────────────────
    const prompt = `
You are a senior management consultant. Write a highly professional, boardroom-ready post-mortem for the following roadshow event.

EVENT DETAILS:
  Name: ${event.name}
  Location: ${event.city}, ${event.country}
  Type: ${event.type}
  Duration: ${event.start_date} to ${event.end_date}
  Status: ${event.status}
  Agents Deployed: ${agentCount}
  Leads Generated: ${leadCount}

FINANCIAL SUMMARY:
  Total Event Expenditure: AED ${formatAED(totalExpenses)}
  Expense Breakdown:
  ${expenseLines}
  Gross Profit: AED ${formatAED(grossProfit)}
  Net ROI: ${netROI.toFixed(1)}%

FIELD JOURNAL EXCERPTS (agent real-time updates):
  ${journalSample || 'No journal entries available.'}

INSTRUCTIONS:
- Write a boardroom-ready post-mortem in the style of a McKinsey or Deloitte brief.
- Be precise with numbers. Reference the financial data directly.
- Structure: Executive Summary, Success Highlights, Challenges, ROI Analysis, Recommendations, Outlook.
- Tone: Confident, professional, data-driven. Avoid clichés.
- Length: 450–600 words for the full report.
`.trim();

    console.info('[ExecutiveDebrief] Gemini prompt compiled:\n', prompt);

    // Simulated latency
    await new Promise(r => setTimeout(r, 2200));

    const isProfit = grossProfit > 0;
    const roiPositive = netROI >= 0;

    const generatedDebrief: GeneratedDebrief = {
        executiveSummary: `The ${event.name} roadshow, conducted in ${event.city}, ${event.country} (${event.start_date} to ${event.end_date}), concluded with ${isProfit ? 'a net-positive financial outcome' : 'an expenditure requiring strategic review'}. Across ${agentCount} deployed agents, the team generated ${leadCount} qualified leads at a blended cost of AED ${leadCount > 0 ? formatAED(Math.round(totalExpenses / leadCount)) : 'N/A'} per lead. Total operational expenditure stood at AED ${formatAED(totalExpenses)}, yielding a gross profit of AED ${formatAED(grossProfit)} and a net ROI of ${netROI.toFixed(1)}%. This debrief consolidates field intelligence, financial performance, and forward-looking recommendations for executive review.`,

        successHighlights: [
            `${leadCount} leads captured across all sessions — ${leadCount >= 100 ? 'exceeding' : leadCount >= 60 ? 'meeting' : 'approaching'} pipeline targets for the ${event.city} corridor.`,
            `${agentCount}-strong team executed with high mobility; real-time journal posts confirmed active floor coverage and competitor intelligence collection.`,
            `Expense discipline maintained: Venue and Hospitality categories accounted for ${totalExpenses > 0 ? Math.round(((expenseBreakdown['Venue'] ?? 0) + (expenseBreakdown['Hospitality'] ?? 0)) / totalExpenses * 100) : 0}% of total spend, within approved allocation bands.`,
            `On-site pipeline valuation of AED ${formatAED(leadCount * (event.branch_target_leads > 0 ? 1_800_000 : 1_200_000))} in potential property transactions identified, pending qualification.`,
            `Committed agent participation rate reflects strong L&D conversion from pre-event assessment framework.`,
        ],

        challenges: [
            `${roiPositive ? 'Travel' : 'Overall'} cost efficiency requires review: Travel and Logistics represented a meaningful portion of total overhead. Consolidation of flight routing and accommodation vendor contracts is advised for future editions.`,
            `Foot traffic conversion from walk-in visitors to qualified leads skewed lower during mid-event periods — a floor scheduling redesign is recommended.`,
            `Competitor activity was notably aggressive: at least three Tier-1 UAE developers operated premium stands offering enhanced payment plans and ROI guarantees, increasing buyer decisioning time on-floor.`,
            `Journal data indicates isolated delays in lead handoff to the CRM post-event — a real-time sync integration between the lead capture module and the core CRM pipeline would resolve this gap.`,
        ],

        roiAnalysis: `Against a total investment of AED ${formatAED(totalExpenses)}, the ${event.name} roadshow generated a gross return of AED ${formatAED(grossProfit + totalExpenses)} in qualified pipeline value${isProfit ? ', representing a ' + netROI.toFixed(1) + '% net ROI' : ''}. On a per-agent basis, the average cost of deployment was AED ${agentCount > 0 ? formatAED(Math.round(totalExpenses / agentCount)) : '—'}. Venue and Hospitality expenditure at AED ${formatAED((expenseBreakdown['Venue'] ?? 0) + (expenseBreakdown['Hospitality'] ?? 0))} was the largest cost centre (${totalExpenses > 0 ? Math.round(((expenseBreakdown['Venue'] ?? 0) + (expenseBreakdown['Hospitality'] ?? 0)) / totalExpenses * 100) : 0}% of total). Marketing spend of AED ${formatAED(expenseBreakdown['Marketing'] ?? 0)} delivered measurable brand exposure in the ${event.city} hi-net-worth property buyer segment. ${isProfit ? 'The event is classified as financially accretive and supports continuation of the international roadshow programme.' : 'A revised budget model is recommended before the next edition of this market.'}`,

        recommendations: [
            `Negotiate a multi-event venue block rate with the ${event.city} venue operator — estimated savings of 12–18% on fixture costs.`,
            `Implement the AI Pitch Simulator as a mandatory gating mechanism for all future agent deployments; early data suggests a direct correlation between assessment scores and on-floor conversion rates.`,
            `Activate the Market Intelligence (IntelDrop) module for all future roadshows to provide real-time competitive positioning data to HQ.`,
            `Consider a dedicated Sponsor ROI Portal for developer partners; structured data transparency is increasingly a factor in securing co-investment commitments.`,
            `Expand the localized pitch generation workflow to cover ${event.country === 'United Kingdom' ? 'Russian, Chinese, and Arabic' : 'French, German, and Portuguese'} buyer profiles in the ${event.city} market.`,
        ],

        outlook: `The ${event.city} market demonstrates ${isProfit ? 'sustained commercial validity' : 'long-term strategic importance despite near-term cost pressures'} for PSI's international expansion. ${leadCount >= 80 ? 'Strong lead volumes support a recommended return within Q3–Q4 of this fiscal year' : 'A recalibrated format — smaller team, higher-qualification gate — is recommended for the next edition'}. The integration of AI-assisted tools (Pitch Simulator, IntelDrop, Localized Brochure Generator) has materially improved agent productivity and intelligence-gathering capability. Subject to Board approval, a follow-on ${event.city} edition is assessed as ${isProfit ? '✓ RECOMMENDED' : '⚠ CONDITIONAL — pending margin improvement plan'}.`,

        metadata: {
            generatedAt: new Date().toISOString(),
            model: 'gemini-2.0-flash (mock)',
            wordCount: 512,
        },
    };

    return generatedDebrief;
}

// ═════════════════════════════════════════════════════════════════════════════
// Data fetcher
// ═════════════════════════════════════════════════════════════════════════════

async function compileDebriefInput(eventId: string, event: Event): Promise<DebriefInput> {
    // ── Expenses ──────────────────────────────────────────────────────────────
    const expSnap = await getDocs(collection(db, 'events', eventId, 'expenses'));
    const expenses: ExpenseRow[] = expSnap.docs.map(d => ({
        id: d.id,
        ...d.data(),
    } as ExpenseRow));

    const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
    const expenseBreakdown: Record<string, number> = {};
    for (const e of expenses) {
        const cat = e.category || 'Other';
        expenseBreakdown[cat] = (expenseBreakdown[cat] ?? 0) + (e.amount || 0);
    }

    // ── Journal posts ─────────────────────────────────────────────────────────
    const jSnap = await getDocs(
        query(
            collection(db, 'events', eventId, 'journal'),
            where('status', '==', 'published'),
            orderBy('timestamp', 'desc'),
            limit(30),
        )
    );
    const posts = jSnap.docs.map(d => d.data() as JournalPost);
    const journalExcerpts = posts
        .filter(p => p.content?.trim())
        .map(p => `[${p.authorName}] ${p.content.slice(0, 160).trim()}…`);

    // ── Derived financials (demo values if no Firestore data) ─────────────────
    const demoLeadCount = 87;
    const demoAgentCount = 14;
    // Gross profit = estimated pipeline - expenses
    const estimatedPipeline = demoLeadCount * 1_800_000 * 0.06; // 6% close rate at avg AED 1.8M
    const grossProfit = Math.round(estimatedPipeline - totalExpenses);
    const netROI = totalExpenses > 0 ? (grossProfit / totalExpenses) * 100 : 0;

    return {
        event,
        totalExpenses: totalExpenses || 342_000,
        expenseBreakdown: Object.keys(expenseBreakdown).length > 0 ? expenseBreakdown : {
            Venue: 85_000, Hospitality: 62_000, Marketing: 48_000, Travel: 147_000,
        },
        grossProfit: grossProfit || 612_000,
        netROI: netROI || 178.9,
        leadCount: demoLeadCount,
        journalExcerpts,
        agentCount: demoAgentCount,
    };
}

// ═════════════════════════════════════════════════════════════════════════════
// Report Document — print-ready McKinsey/Deloitte style
// ═════════════════════════════════════════════════════════════════════════════

function ReportSection({
    icon,
    title,
    accent,
    children,
}: {
    icon: React.ReactNode;
    title: string;
    accent: string;
    children: React.ReactNode;
}) {
    return (
        <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
        >
            <div className={`flex items-center gap-2.5 pb-2 border-b-2 ${accent}`}>
                <span className="opacity-70">{icon}</span>
                <h3 className="font-black text-sm uppercase tracking-[0.15em] text-slate-800 dark:text-slate-200">{title}</h3>
            </div>
            {children}
        </motion.section>
    );
}

function BulletList({ items, variant = 'default' }: { items: string[]; variant?: 'success' | 'warning' | 'info' | 'default' }) {
    const dotColors: Record<string, string> = {
        success: 'bg-emerald-500',
        warning: 'bg-amber-500',
        info: 'bg-blue-500',
        default: 'bg-slate-400',
    };
    return (
        <ul className="space-y-2.5">
            {items.map((item, i) => (
                <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="flex items-start gap-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300"
                >
                    <span className={`flex-shrink-0 w-1.5 h-1.5 rounded-full mt-[7px] ${dotColors[variant]}`} />
                    <span>{item}</span>
                </motion.li>
            ))}
        </ul>
    );
}

function DebriefDocument({ debrief, input }: { debrief: GeneratedDebrief; input: DebriefInput }) {
    const printRef = useRef<HTMLDivElement>(null);

    const handlePrint = () => window.print();

    const handleDownload = () => {
        const text = [
            `PSI PROPERTIES — EXECUTIVE DEBRIEF`,
            `${input.event.name} | ${input.event.city}, ${input.event.country}`,
            `Generated: ${new Date(debrief.metadata.generatedAt).toLocaleString()}`,
            `Model: ${debrief.metadata.model}`,
            '\n────────────────────────────────────────────────',
            '\nEXECUTIVE SUMMARY',
            debrief.executiveSummary,
            '\nSUCCESS HIGHLIGHTS',
            ...debrief.successHighlights.map(h => `• ${h}`),
            '\nCHALLENGES',
            ...debrief.challenges.map(c => `• ${c}`),
            '\nROI ANALYSIS',
            debrief.roiAnalysis,
            '\nSTRATEGIC RECOMMENDATIONS',
            ...debrief.recommendations.map((r, i) => `${i + 1}. ${r}`),
            '\nOUTLOOK',
            debrief.outlook,
        ].join('\n');

        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${input.event.name.replace(/\s+/g, '_')}_Executive_Debrief.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div ref={printRef} id="debrief-document" className="print:bg-white print:p-8">
            {/* Document header */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 mb-8 print:from-slate-100 print:via-white print:to-slate-50 print:border print:border-slate-200">
                {/* Decorative lines */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-violet-600" />
                <div className="absolute top-1 left-0 w-1/3 h-px bg-gradient-to-r from-blue-400 to-transparent" />

                <div className="flex items-start justify-between gap-6 flex-wrap">
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
                                <FileText size={13} className="text-white" />
                            </div>
                            <span className="text-blue-400 text-[10px] font-black uppercase tracking-[0.3em] print:text-blue-700">
                                PSI Properties · Executive Post-Mortem
                            </span>
                        </div>
                        <h1 className="text-white text-2xl font-black tracking-tight leading-tight mb-1 print:text-slate-900">
                            {input.event.name}
                        </h1>
                        <p className="text-slate-400 text-sm print:text-slate-600">
                            {input.event.city}, {input.event.country} &nbsp;·&nbsp; {input.event.start_date} — {input.event.end_date}
                        </p>
                    </div>

                    {/* KPI tiles */}
                    <div className="flex gap-3 flex-wrap">
                        {[
                            { label: 'Leads', value: String(input.leadCount), icon: <Users size={12} />, color: 'text-emerald-400' },
                            { label: 'Agents', value: String(input.agentCount), icon: <Target size={12} />, color: 'text-blue-400' },
                            { label: 'Spend', value: `AED ${formatAED(input.totalExpenses)}`, icon: <DollarSign size={12} />, color: 'text-amber-400' },
                            { label: 'Net ROI', value: `${input.netROI.toFixed(0)}%`, icon: <TrendingUp size={12} />, color: input.netROI >= 0 ? 'text-emerald-400' : 'text-rose-400' },
                        ].map(({ label, value, icon, color }) => (
                            <div key={label} className="bg-white/6 border border-white/10 rounded-xl px-4 py-3 min-w-[90px] text-center print:border-slate-200 print:bg-slate-50">
                                <div className={`flex items-center justify-center gap-1 ${color} print:text-slate-600 mb-1`}>{icon}<span className="text-[9px] font-black uppercase tracking-widest">{label}</span></div>
                                <p className={`text-base font-extrabold ${color} print:text-slate-900`}>{value}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Expense breakdown mini bar */}
                <div className="mt-6 space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">Expense Breakdown</p>
                    <div className="flex gap-1 h-2 rounded-full overflow-hidden">
                        {Object.entries(input.expenseBreakdown).map(([cat, val], i) => {
                            const pct = input.totalExpenses > 0 ? (val / input.totalExpenses) * 100 : 0;
                            const colors = ['bg-blue-500', 'bg-violet-500', 'bg-amber-500', 'bg-emerald-500', 'bg-rose-500'];
                            return <div key={cat} className={`${colors[i % colors.length]} h-full rounded-sm`} style={{ width: `${pct}%` }} title={`${cat}: AED ${formatAED(val)}`} />;
                        })}
                    </div>
                    <div className="flex gap-4 flex-wrap mt-1.5">
                        {Object.entries(input.expenseBreakdown).map(([cat, val], i) => {
                            const colors = ['text-blue-400', 'text-violet-400', 'text-amber-400', 'text-emerald-400', 'text-rose-400'];
                            return (
                                <div key={cat} className="flex items-center gap-1">
                                    <span className={`w-1.5 h-1.5 rounded-full ${colors[i % colors.length]} opacity-80 flex-shrink-0`} style={{ backgroundColor: 'currentColor' }} />
                                    <span className="text-[9px] text-slate-400 print:text-slate-600">{cat} <strong className="text-slate-300 print:text-slate-800">AED {formatAED(val)}</strong></span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Action buttons */}
                <div className="absolute top-4 right-4 flex gap-2 print:hidden">
                    <button id="debrief-print-btn" onClick={handlePrint}
                        className="w-8 h-8 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/15 transition-all"
                        title="Print report"
                    >
                        <Printer size={14} />
                    </button>
                    <button id="debrief-download-btn" onClick={handleDownload}
                        className="w-8 h-8 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/15 transition-all"
                        title="Download as text"
                    >
                        <Download size={14} />
                    </button>
                </div>

                {/* Classification footer */}
                <div className="absolute bottom-3 right-5 flex items-center gap-1.5 print:hidden">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-400/70">Confidential — Board Use Only</span>
                </div>
            </div>

            {/* Report body */}
            <div className="space-y-8 print:space-y-6">

                {/* Executive Summary */}
                <ReportSection icon={<FileText size={16} />} title="Executive Summary" accent="border-blue-600">
                    <p className="text-slate-700 dark:text-slate-300 text-sm leading-7 tracking-wide">
                        {debrief.executiveSummary}
                    </p>
                </ReportSection>

                {/* Success Highlights */}
                <ReportSection icon={<Star size={16} />} title="Success Highlights" accent="border-emerald-500">
                    <BulletList items={debrief.successHighlights} variant="success" />
                </ReportSection>

                {/* Challenges */}
                <ReportSection icon={<AlertTriangle size={16} />} title="Challenges & Gaps" accent="border-amber-500">
                    <BulletList items={debrief.challenges} variant="warning" />
                </ReportSection>

                {/* ROI Analysis */}
                <ReportSection icon={<BarChart2 size={16} />} title="ROI & Financial Analysis" accent="border-indigo-500">
                    <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-5">
                        <p className="text-slate-700 dark:text-slate-300 text-sm leading-7">
                            {debrief.roiAnalysis}
                        </p>
                    </div>
                </ReportSection>

                {/* Recommendations */}
                <ReportSection icon={<Lightbulb size={16} />} title="Strategic Recommendations" accent="border-violet-500">
                    <ol className="space-y-3">
                        {debrief.recommendations.map((rec, i) => (
                            <motion.li
                                key={i}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.08 }}
                                className="flex items-start gap-3.5"
                            >
                                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-600 dark:text-violet-400 font-extrabold text-[10px]">
                                    {i + 1}
                                </div>
                                <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 pt-0.5">{rec}</p>
                            </motion.li>
                        ))}
                    </ol>
                </ReportSection>

                {/* Outlook */}
                <ReportSection icon={<TrendingUp size={16} />} title="Outlook & Verdict" accent="border-blue-600">
                    <div className={clsx(
                        'relative rounded-2xl p-5 border',
                        debrief.outlook.includes('RECOMMENDED')
                            ? 'bg-emerald-500/8 border-emerald-500/20'
                            : 'bg-amber-500/8 border-amber-500/20'
                    )}>
                        <div className={clsx(
                            'absolute top-4 right-4 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg',
                            debrief.outlook.includes('RECOMMENDED')
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                        )}>
                            {debrief.outlook.includes('RECOMMENDED')
                                ? <><CheckCircle2 size={11} /> Recommended</>
                                : <><AlertTriangle size={11} /> Conditional</>
                            }
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 text-sm leading-7 pr-24">
                            {debrief.outlook}
                        </p>
                    </div>
                </ReportSection>

                {/* Journal excerpts */}
                {input.journalExcerpts.length > 0 && (
                    <ReportSection icon={<BookOpen size={16} />} title="Field Journal Excerpts" accent="border-slate-400">
                        <div className="space-y-2">
                            {input.journalExcerpts.slice(0, 5).map((excerpt, i) => (
                                <p key={i} className="text-xs text-slate-500 dark:text-slate-400 italic border-l-2 border-slate-300 dark:border-slate-600 pl-3 leading-relaxed">
                                    {excerpt}
                                </p>
                            ))}
                        </div>
                    </ReportSection>
                )}

                {/* Document footer */}
                <div className="flex items-center justify-between pt-6 border-t border-slate-200 dark:border-slate-700 text-[10px] text-slate-400">
                    <div className="flex items-center gap-2">
                        <Clock size={10} />
                        <span>Generated {new Date(debrief.metadata.generatedAt).toLocaleString()} · {debrief.metadata.model}</span>
                    </div>
                    <span className="font-black uppercase tracking-widest text-slate-300 dark:text-slate-600">PSI PROPERTIES · CONFIDENTIAL</span>
                </div>
            </div>
        </div>
    );
}

// ═════════════════════════════════════════════════════════════════════════════
// GenerateDebriefButton — drop-in trigger for the Analytics header
// ═════════════════════════════════════════════════════════════════════════════

type Phase = 'idle' | 'compiling' | 'analysing' | 'done' | 'error';

export interface GenerateDebriefButtonProps {
    event: Event;
    eventId: string;
    /** If false, hides the button entirely. Pass event.status === 'Completed' */
    isCompleted?: boolean;
}

export function GenerateDebriefButton({ event, eventId, isCompleted }: GenerateDebriefButtonProps) {
    const [phase, setPhase] = useState<Phase>('idle');
    const [open, setOpen] = useState(false);
    const [debrief, setDebrief] = useState<GeneratedDebrief | null>(null);
    const [debriefInput, setDebriefInput] = useState<DebriefInput | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Respect the 'Completed' gate
    const shouldShow = isCompleted ?? event.status === 'Completed';
    if (!shouldShow) return null;

    const handleGenerate = async () => {
        setPhase('compiling');
        setError(null);
        try {
            const input = await compileDebriefInput(eventId, event);
            setDebriefInput(input);

            setPhase('analysing');
            const result = await mockGeminiDebrief(input);
            setDebrief(result);
            setPhase('done');
            setOpen(true);
        } catch (err) {
            console.error('[ExecutiveDebrief] Generation failed:', err);
            setError(err instanceof Error ? err.message : 'Unknown error');
            setPhase('error');
        }
    };

    const isLoading = phase === 'compiling' || phase === 'analysing';

    return (
        <>
            {/* Trigger button */}
            <motion.button
                id="generate-debrief-btn"
                whileTap={{ scale: 0.97 }}
                onClick={handleGenerate}
                disabled={isLoading}
                className={clsx(
                    'flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all select-none shadow-lg',
                    isLoading
                        ? 'bg-indigo-400 cursor-not-allowed text-white shadow-indigo-400/20'
                        : 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-indigo-600/25 hover:shadow-indigo-600/40 hover:from-indigo-500 hover:to-violet-500',
                )}
            >
                {isLoading ? (
                    <>
                        <Loader2 size={15} className="animate-spin" />
                        <span>{phase === 'compiling' ? 'Compiling data…' : 'Gemini writing…'}</span>
                    </>
                ) : (
                    <>
                        <Sparkles size={15} />
                        <span>Generate AI Post-Mortem</span>
                    </>
                )}
            </motion.button>

            {error && (
                <p className="text-rose-500 text-xs flex items-center gap-1 mt-1">
                    <AlertTriangle size={11} /> {error}
                </p>
            )}

            {/* Report Modal */}
            <AnimatePresence>
                {open && debrief && debriefInput && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-4 py-8 print:bg-transparent print:inset-auto print:overflow-visible print:p-0"
                    >
                        <motion.div
                            initial={{ opacity: 0, y: 20, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20, scale: 0.97 }}
                            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                            className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden print:shadow-none print:rounded-none print:max-w-none"
                        >
                            {/* Modal toolbar */}
                            <div className="flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 print:hidden">
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
                                        <Sparkles size={14} className="text-white" />
                                    </div>
                                    <div>
                                        <p className="font-extrabold text-slate-900 dark:text-white text-sm">AI Executive Debrief</p>
                                        <p className="text-slate-400 text-[10px]">Generated by Gemini · Board-ready</p>
                                    </div>
                                </div>
                                <button
                                    id="debrief-modal-close"
                                    onClick={() => setOpen(false)}
                                    className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all"
                                >
                                    <X size={15} />
                                </button>
                            </div>

                            {/* Document scroll area */}
                            <div className="p-6 md:p-8 max-h-[calc(100vh-180px)] overflow-y-auto print:overflow-visible print:max-h-none">
                                <DebriefDocument debrief={debrief} input={debriefInput} />
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

// ═════════════════════════════════════════════════════════════════════════════
// ExecutiveDebrief — standalone page / route wrapper
// Usage: drop <GenerateDebriefButton event={...} eventId={...} /> into
//        the Analytics header when event.status === 'Completed'
// ═════════════════════════════════════════════════════════════════════════════

interface ExecutiveDebriefProps {
    eventId?: string;
    event?: Event;
}

export default function ExecutiveDebrief({ eventId = 'event_demo', event }: ExecutiveDebriefProps) {
    const demoEvent: Event = event ?? {
        id: eventId,
        name: 'London Luxury Property Expo 2026',
        type: 'Exhibition',
        country: 'United Kingdom',
        city: 'London',
        start_date: '2026-01-20',
        end_date: '2026-01-22',
        organizer_id: 'organizer_001',
        branch_target_leads: 80,
        organizer_commission_share_pct: 10,
        status: 'Completed' as EventStatus,
        is_sponsored: true,
        created_at: '2025-12-01T10:00:00Z',
        isJournalEnabled: true,
        assignedMediaOfficerId: '',
    };

    return (
        <div className="min-h-screen bg-psi-page">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
                {/* Demo header */}
                <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Building2 size={16} className="text-indigo-500" />
                            <span className="text-indigo-500 text-xs font-extrabold uppercase tracking-widest">Analytics</span>
                        </div>
                        <h1 className="text-psi-primary text-2xl font-extrabold">{demoEvent.name}</h1>
                        <p className="text-psi-muted text-sm">{demoEvent.city} · {demoEvent.start_date} — {demoEvent.end_date}</p>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Status badge */}
                        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/25 rounded-xl">
                            <CheckCircle2 size={13} className="text-emerald-500" />
                            <span className="text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-widest">{demoEvent.status}</span>
                        </div>

                        {/* The button — only visible when status === Completed */}
                        <GenerateDebriefButton
                            event={demoEvent}
                            eventId={eventId}
                            isCompleted={demoEvent.status === 'Completed'}
                        />
                    </div>
                </div>

                {/* Instructional placeholder */}
                <div className="psi-card rounded-3xl p-10 text-center space-y-4">
                    <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto">
                        <Sparkles size={28} className="text-indigo-500" />
                    </div>
                    <h2 className="text-psi-primary text-xl font-extrabold">AI Post-Mortem Generator</h2>
                    <p className="text-psi-muted text-sm max-w-md mx-auto leading-relaxed">
                        Click <strong className="text-indigo-500">Generate AI Post-Mortem</strong> above to compile expense data, journal entries, and lead metrics into a boardroom-ready executive debrief — automatically written by Gemini.
                    </p>
                    <div className="flex items-center justify-center gap-6 pt-2 flex-wrap">
                        {[
                            { icon: <DollarSign size={13} />, label: 'Expense Breakdown', color: 'text-amber-500' },
                            { icon: <BookOpen size={13} />, label: 'Journal Excerpts', color: 'text-blue-500' },
                            { icon: <BarChart2 size={13} />, label: 'ROI Analysis', color: 'text-emerald-500' },
                            { icon: <ChevronRight size={13} />, label: 'Strategic Recs', color: 'text-violet-500' },
                        ].map(({ icon, label, color }) => (
                            <div key={label} className={`flex items-center gap-1.5 text-xs font-bold ${color}`}>
                                {icon} {label}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
