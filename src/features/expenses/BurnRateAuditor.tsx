/**
 * BurnRateAuditor.tsx — Orchestration layer
 * ─────────────────────────────────────────────────────────────────────────────
 * Predictive Burn-Rate Alert system for Branch Managers and Organizers.
 *
 * Refactored from an 887-line monolith. The three sub-components extracted:
 *
 *   burnrate/BurnRateWidgets.tsx — BurnBar, CategoryRow, KPICard
 *
 * This file retains:
 *   - All TypeScript types (exported for downstream consumers)
 *   - SEVERITY_CONFIG and FREEZE_LOCKED_CATEGORIES constants
 *   - computeBurnRate() — pure math engine (exported, testable)
 *   - BurnRateAuditor  — embeddable widget (exported)
 *   - BurnRateAuditorPage — full-page demo route (default export)
 *
 * Core logic:
 *   dailyBudget        = totalBudget / eventDays
 *   burnRate           = spentToDate / elapsedDays
 *   projectedTotal     = burnRate × eventDays
 *   burnRatio          = spentToDate / expectedSpend
 *
 * Alert severity:
 *   < 0.80 of expected   → UNDER_BUDGET  (green)
 *   0.80 – 1.10          → ON_TRACK      (emerald)
 *   1.10 – 1.35          → CAUTION       (amber)
 *   1.35 – 1.60          → WARNING       (orange)
 *   > 1.60               → CRITICAL      (red)
 */

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    TrendingUp, TrendingDown, AlertTriangle, ShieldAlert,
    CheckCircle2, Flame, Lock, Unlock,
    DollarSign, Calendar, BarChart3, Zap,
    ChevronDown, Info, Minus, Plus,
    ShieldCheck, Activity,
} from 'lucide-react';
import { ExpenseCategory } from '../../types/expense';
import { BurnBar, CategoryRow, KPICard } from './burnrate/BurnRateWidgets';

// ── Types ─────────────────────────────────────────────────────────────────────

export type BurnSeverity =
    | 'UNDER_BUDGET'
    | 'ON_TRACK'
    | 'CAUTION'
    | 'WARNING'
    | 'CRITICAL';

export interface CategorySpend {
    category: ExpenseCategory;
    total: number;
}

export interface BurnRateResult {
    dailyBudget: number;
    spentToDate: number;
    expectedSpend: number;
    burnRate: number;           // AED per day (actual)
    projectedTotal: number;
    projectedOverspend: number; // negative = underspend
    burnRatio: number;          // spentToDate / expectedSpend
    remainingBudget: number;
    severity: BurnSeverity;
    isFrozen: boolean;
}

export interface BurnRateAuditorProps {
    totalBudget: number;
    eventDays: number;
    elapsedDays: number;
    categorySpend: CategorySpend[];
    isFrozen: boolean;
    role: 'branch_manager' | 'organizer' | 'viewer';
    onFreezeToggle?: (frozen: boolean) => void;
    onCategoryAction?: (category: ExpenseCategory) => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const FREEZE_LOCKED_CATEGORIES: ExpenseCategory[] = ['Marketing', 'Hospitality'];

// ── Formatter ─────────────────────────────────────────────────────────────────

function fmtAED(n: number): string {
    return new Intl.NumberFormat('en-AE', {
        style: 'currency', currency: 'AED',
        minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(Math.abs(n));
}

// ── Severity config ───────────────────────────────────────────────────────────

interface SeverityConfig {
    label: string;
    icon: React.ReactNode;
    bg: string;
    border: string;
    text: string;
    accent: string;
    badge: string;
    bar: string;
    glow: string;
    headline: (overspend: number, projectedTotal: number, budget: number) => string;
    subline: (ratio: number, dailyBudget: number, burnRate: number) => string;
}

const SEVERITY_CONFIG: Record<BurnSeverity, SeverityConfig> = {
    UNDER_BUDGET: {
        label: 'Under Budget',
        icon: <TrendingDown size={20} />,
        bg: 'bg-emerald-50 dark:bg-emerald-950/20',
        border: 'border-emerald-300 dark:border-emerald-700/50',
        text: 'text-emerald-700 dark:text-emerald-400',
        accent: 'text-emerald-600 dark:text-emerald-300',
        badge: 'bg-emerald-500 text-psi-primary',
        bar: 'bg-emerald-500',
        glow: 'shadow-emerald-500/10',
        headline: (_, proj, budget) =>
            `On Track: Projected spend ${fmtAED(proj)} — ${fmtAED(budget - proj)} under budget.`,
        subline: (ratio) =>
            `You are spending at ${(ratio * 100).toFixed(0)}% of the expected pace — excellent budget discipline.`,
    },
    ON_TRACK: {
        label: 'On Track',
        icon: <CheckCircle2 size={20} />,
        bg: 'bg-emerald-50 dark:bg-emerald-950/20',
        border: 'border-emerald-400 dark:border-emerald-600/50',
        text: 'text-emerald-700 dark:text-emerald-400',
        accent: 'text-emerald-600 dark:text-emerald-300',
        badge: 'bg-emerald-600 text-white',
        bar: 'bg-emerald-500',
        glow: 'shadow-emerald-500/10',
        headline: (_, proj, budget) =>
            `On Track: Projected total ${fmtAED(proj)} — within budget of ${fmtAED(budget)}.`,
        subline: (ratio, daily, burn) =>
            `Daily burn rate ${fmtAED(burn)} vs. daily budget ${fmtAED(daily)}. Pace is healthy.`,
    },
    CAUTION: {
        label: 'Caution',
        icon: <Info size={20} />,
        bg: 'bg-amber-50 dark:bg-amber-950/20',
        border: 'border-amber-400 dark:border-amber-600/50',
        text: 'text-amber-700 dark:text-amber-400',
        accent: 'text-amber-600 dark:text-amber-300',
        badge: 'bg-amber-500 text-white',
        bar: 'bg-amber-400',
        glow: 'shadow-amber-500/10',
        headline: (over, proj) =>
            `Caution: Budget pace elevated. Projected ${fmtAED(proj)} — ${over > 0 ? `overspend of ${fmtAED(over)}` : 'approaching limit'}.`,
        subline: (ratio, daily, burn) =>
            `Burn rate ${fmtAED(burn)}/day vs. ${fmtAED(daily)}/day budget (${(ratio * 100).toFixed(0)}% of ideal pace). Monitor closely.`,
    },
    WARNING: {
        label: 'Warning',
        icon: <AlertTriangle size={20} />,
        bg: 'bg-orange-50 dark:bg-orange-950/20',
        border: 'border-orange-500 dark:border-orange-600/50',
        text: 'text-orange-700 dark:text-orange-400',
        accent: 'text-orange-600 dark:text-orange-300',
        badge: 'bg-orange-500 text-psi-primary',
        bar: 'bg-orange-500',
        glow: 'shadow-orange-500/20',
        headline: (over) =>
            `Warning: Budget Burn Rate is High. Projected overspend: ${fmtAED(over)}.`,
        subline: (ratio, daily, burn) =>
            `Daily burn ${fmtAED(burn)} is ${(ratio * 100).toFixed(0)}% of daily budget ${fmtAED(daily)}. Immediate review recommended.`,
    },
    CRITICAL: {
        label: 'Critical',
        icon: <ShieldAlert size={20} />,
        bg: 'bg-rose-50 dark:bg-rose-950/20',
        border: 'border-rose-500 dark:border-rose-600/50',
        text: 'text-rose-700 dark:text-rose-400',
        accent: 'text-rose-600 dark:text-rose-300',
        badge: 'bg-rose-600 text-psi-primary',
        bar: 'bg-rose-500',
        glow: 'shadow-rose-500/30',
        headline: (over) =>
            `Critical: Budget Burn Rate exceeds safe threshold. Projected overspend: ${fmtAED(over)}.`,
        subline: (ratio, daily, burn) =>
            `Daily burn ${fmtAED(burn)} is ${(ratio * 100).toFixed(0)}% of daily budget ${fmtAED(daily)}. Freeze non-essential expenses immediately.`,
    },
};

// ── Core math engine ──────────────────────────────────────────────────────────

/**
 * computeBurnRate — Pure function. No side-effects. Fully unit-testable.
 */
export function computeBurnRate(
    totalBudget: number,
    eventDays: number,
    elapsedDays: number,
    categorySpend: CategorySpend[],
    isFrozen: boolean
): BurnRateResult {
    const days = Math.max(1, eventDays);
    const elapsed = Math.max(1, Math.min(elapsedDays, days));

    const spentToDate = categorySpend.reduce((s, c) => s + c.total, 0);
    const dailyBudget = totalBudget / days;
    const expectedSpend = dailyBudget * elapsed;
    const burnRate = spentToDate / elapsed;
    const projectedTotal = burnRate * days;
    const projectedOverspend = projectedTotal - totalBudget;
    const remainingBudget = totalBudget - spentToDate;
    const burnRatio = expectedSpend > 0 ? spentToDate / expectedSpend : 0;

    let severity: BurnSeverity;
    if (burnRatio < 0.80) severity = 'UNDER_BUDGET';
    else if (burnRatio <= 1.10) severity = 'ON_TRACK';
    else if (burnRatio <= 1.35) severity = 'CAUTION';
    else if (burnRatio <= 1.60) severity = 'WARNING';
    else severity = 'CRITICAL';

    return {
        dailyBudget, spentToDate, expectedSpend, burnRate,
        projectedTotal, projectedOverspend, burnRatio,
        remainingBudget, severity, isFrozen,
    };
}

// ── Main embeddable widget ────────────────────────────────────────────────────

export function BurnRateAuditor({
    totalBudget,
    eventDays,
    elapsedDays,
    categorySpend,
    isFrozen,
    role,
    onFreezeToggle,
}: BurnRateAuditorProps) {
    const result = useMemo(
        () => computeBurnRate(totalBudget, eventDays, elapsedDays, categorySpend, isFrozen),
        [totalBudget, eventDays, elapsedDays, categorySpend, isFrozen]
    );

    const cfg = SEVERITY_CONFIG[result.severity];
    const isCritical = result.severity === 'CRITICAL';
    const isWarning = result.severity === 'WARNING' || isCritical;
    const canToggleFreeze = role === 'branch_manager';
    const [showDetails, setShowDetails] = useState(true);

    return (
        <div className={`rounded-3xl border-2 shadow-lg overflow-hidden ${cfg.border} ${cfg.bg} ${cfg.glow}`}>

            {/* Alert header */}
            <div className="px-5 py-4">
                <div className="flex items-start gap-4">
                    <motion.div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${cfg.badge}`}
                        animate={isCritical ? { scale: [1, 1.06, 1] } : {}}
                        transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
                    >
                        {cfg.icon}
                    </motion.div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className={`text-[10px] font-black uppercase tracking-[0.25em] px-2.5 py-0.5 rounded-full ${cfg.badge}`}>
                                {cfg.label}
                            </span>
                            {isFrozen && (
                                <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <Lock size={9} /> Expense Freeze Active
                                </span>
                            )}
                        </div>
                        <p className={`font-extrabold text-base leading-tight ${cfg.text}`}>
                            {cfg.headline(result.projectedOverspend, result.projectedTotal, totalBudget)}
                        </p>
                        <p className="text-psi-secondary text-xs mt-1 leading-relaxed">
                            {cfg.subline(result.burnRatio, result.dailyBudget, result.burnRate)}
                        </p>
                    </div>

                    <button
                        onClick={() => setShowDetails(v => !v)}
                        className="flex-shrink-0 w-8 h-8 rounded-xl bg-psi-subtle flex items-center justify-center text-psi-muted hover:text-psi-primary transition-colors mt-1"
                    >
                        <ChevronDown size={16} className={`transition-transform ${showDetails ? 'rotate-180' : ''}`} />
                    </button>
                </div>

                {/* Burn rate progress bar */}
                <div className="mt-4">
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold text-psi-muted uppercase tracking-widest">
                            Budget Consumption
                        </span>
                        <span className={`text-xs font-extrabold font-mono ${cfg.text}`}>
                            {(result.burnRatio * 100).toFixed(0)}% of expected pace
                        </span>
                    </div>
                    <BurnBar ratio={result.burnRatio} barClass={cfg.bar} />
                    <div className="flex items-center justify-between mt-1">
                        <span className="text-[9px] text-psi-muted">{fmtAED(result.spentToDate)} spent</span>
                        <span className="text-[9px] text-psi-muted">{fmtAED(totalBudget)} budget</span>
                    </div>
                </div>
            </div>

            {/* Collapsible details */}
            <AnimatePresence>
                {showDetails && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                    >
                        <div className="border-t border-psi px-5 py-4 space-y-5">

                            {/* KPI cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <KPICard label="Daily Budget" value={fmtAED(result.dailyBudget)} sub={`÷ ${eventDays} days`} colorClass="text-blue-600 dark:text-blue-400" icon={<Calendar size={16} />} />
                                <KPICard label="Actual Burn/Day" value={fmtAED(result.burnRate)} sub={`Day ${elapsedDays} of ${eventDays}`} colorClass={result.burnRate > result.dailyBudget ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'} icon={<Flame size={16} />} />
                                <KPICard label="Projected Total" value={fmtAED(result.projectedTotal)} sub={result.projectedOverspend > 0 ? `+${fmtAED(result.projectedOverspend)} over` : `${fmtAED(-result.projectedOverspend)} under`} colorClass={result.projectedOverspend > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'} icon={<TrendingUp size={16} />} />
                                <KPICard label="Remaining Budget" value={fmtAED(result.remainingBudget)} sub={result.remainingBudget < 0 ? 'OVER BUDGET' : `${eventDays - elapsedDays} days left`} colorClass={result.remainingBudget < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'} icon={<DollarSign size={16} />} />
                            </div>

                            {/* Category breakdown */}
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <BarChart3 size={14} className="text-psi-muted" />
                                    <p className="text-xs font-bold uppercase tracking-widest text-psi-muted">Spend by Category</p>
                                </div>
                                <div className="divide-y divide-psi">
                                    {(['Venue', 'Hospitality', 'Marketing', 'Travel'] as ExpenseCategory[]).map(cat => {
                                        const catData = categorySpend.find(c => c.category === cat);
                                        const isLocked = isFrozen && FREEZE_LOCKED_CATEGORIES.includes(cat);
                                        return (
                                            <CategoryRow
                                                key={cat}
                                                category={cat}
                                                amount={catData?.total ?? 0}
                                                total={result.spentToDate}
                                                isFrozenCategory={isLocked}
                                            />
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Freeze toggle */}
                            <div className={`rounded-2xl border p-4 ${isFrozen ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-700/50' : 'bg-psi-subtle border-psi'}`}>
                                <div className="flex items-center justify-between gap-4 flex-wrap">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isFrozen ? 'bg-rose-500 text-psi-primary' : 'bg-psi-card text-psi-muted'}`}>
                                            {isFrozen ? <Lock size={18} /> : <Unlock size={18} />}
                                        </div>
                                        <div>
                                            <p className="font-bold text-psi-primary text-sm">
                                                {isFrozen ? 'Non-Essential Expenses Frozen' : 'Freeze Non-Essential Expenses'}
                                            </p>
                                            <p className="text-xs text-psi-muted mt-0.5">
                                                {isFrozen
                                                    ? 'Marketing & Hospitality are locked for Organizers. Only Branch Manager can lift this.'
                                                    : 'Locks Marketing & Hospitality categories for Organizers. Travel & Venue unaffected.'}
                                            </p>
                                        </div>
                                    </div>
                                    {canToggleFreeze ? (
                                        <motion.button
                                            id="freeze-toggle-btn"
                                            whileTap={{ scale: 0.96 }}
                                            onClick={() => onFreezeToggle?.(!isFrozen)}
                                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all select-none ${isFrozen ? 'bg-emerald-500 hover:bg-emerald-400 text-psi-primary shadow shadow-emerald-500/20' : 'bg-rose-500 hover:bg-rose-400 text-psi-primary shadow shadow-rose-500/20'}`}
                                        >
                                            {isFrozen ? <><Unlock size={15} /> Lift Freeze</> : <><Lock size={15} /> Freeze Now</>}
                                        </motion.button>
                                    ) : isFrozen ? (
                                        <span className="text-xs text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1.5 bg-rose-100 dark:bg-rose-900/30 px-3 py-1.5 rounded-xl">
                                            <Lock size={12} /> Branch Manager approval required to lift
                                        </span>
                                    ) : (
                                        <span className="text-xs text-psi-muted italic">Only Branch Manager can toggle this</span>
                                    )}
                                </div>

                                {isFrozen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mt-3 pt-3 border-t border-rose-200 dark:border-rose-800/40 grid grid-cols-2 gap-2"
                                    >
                                        {FREEZE_LOCKED_CATEGORIES.map(cat => (
                                            <div key={cat} className="flex items-center gap-2 bg-rose-100 dark:bg-rose-900/20 rounded-xl px-3 py-2">
                                                <Lock size={12} className="text-rose-500 flex-shrink-0" />
                                                <span className="text-xs font-bold text-rose-700 dark:text-rose-400">{cat} — Locked</span>
                                            </div>
                                        ))}
                                        {(['Venue', 'Travel'] as ExpenseCategory[]).map(cat => (
                                            <div key={cat} className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl px-3 py-2">
                                                <CheckCircle2 size={12} className="text-emerald-500 flex-shrink-0" />
                                                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">{cat} — Active</span>
                                            </div>
                                        ))}
                                    </motion.div>
                                )}
                            </div>

                            {/* Critical escalation banner */}
                            {isCritical && !isFrozen && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex items-start gap-3 p-4 bg-rose-500 rounded-2xl text-psi-primary"
                                >
                                    <Zap size={18} className="flex-shrink-0 mt-0.5 animate-pulse" />
                                    <div>
                                        <p className="font-extrabold text-sm mb-0.5">Immediate Action Required</p>
                                        <p className="text-xs text-rose-100 leading-relaxed">
                                            Budget burn rate is critically high. Branch Manager should activate the Expense Freeze immediately. Finance team has been flagged.
                                        </p>
                                    </div>
                                </motion.div>
                            )}

                            {isWarning && isFrozen && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl"
                                >
                                    <ShieldCheck size={16} className="text-emerald-500 flex-shrink-0" />
                                    <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                                        Freeze is active — Marketing and Hospitality are locked. Only essential spend (Venue, Travel) is permitted.
                                    </p>
                                </motion.div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ── Demo Page ─────────────────────────────────────────────────────────────────

const DEMO_SCENARIOS: {
    label: string; budget: number; days: number; elapsed: number;
    spend: CategorySpend[]; desc: string;
}[] = [
        {
            label: '✅ On Track',
            budget: 100_000, days: 4, elapsed: 1,
            spend: [{ category: 'Venue', total: 18_000 }, { category: 'Hospitality', total: 4_000 }, { category: 'Marketing', total: 2_000 }, { category: 'Travel', total: 1_500 }],
            desc: 'Day 1 of 4. AED 25,500 spent of AED 25,000 daily budget.',
        },
        {
            label: '⚠️ Critical',
            budget: 100_000, days: 4, elapsed: 1,
            spend: [{ category: 'Venue', total: 55_000 }, { category: 'Hospitality', total: 25_000 }, { category: 'Marketing', total: 10_000 }, { category: 'Travel', total: 5_000 }],
            desc: 'Day 1 of 4. AED 95,000 spent — 380% of daily budget. Severe overspend projected.',
        },
        {
            label: '🟠 Warning',
            budget: 200_000, days: 5, elapsed: 2,
            spend: [{ category: 'Venue', total: 62_000 }, { category: 'Hospitality', total: 28_000 }, { category: 'Marketing', total: 18_000 }, { category: 'Travel', total: 12_000 }],
            desc: 'Day 2 of 5. AED 120,000 spent vs. AED 80,000 expected.',
        },
        {
            label: '💛 Caution',
            budget: 150_000, days: 3, elapsed: 1,
            spend: [{ category: 'Venue', total: 42_000 }, { category: 'Hospitality', total: 10_000 }, { category: 'Marketing', total: 5_000 }, { category: 'Travel', total: 3_000 }],
            desc: 'Day 1 of 3. AED 60,000 vs AED 50,000 expected — 20% above pace.',
        },
        {
            label: '🟢 Under Budget',
            budget: 300_000, days: 7, elapsed: 3,
            spend: [{ category: 'Venue', total: 55_000 }, { category: 'Hospitality', total: 18_000 }, { category: 'Marketing', total: 12_000 }, { category: 'Travel', total: 10_000 }],
            desc: 'Day 3 of 7. AED 95,000 vs AED 128,571 expected — well under budget.',
        },
    ];

export default function BurnRateAuditorPage() {
    const [scenarioIdx, setScenarioIdx] = useState(0);
    const [role, setRole] = useState<BurnRateAuditorProps['role']>('branch_manager');
    const [isFrozen, setIsFrozen] = useState(false);
    const [budget, setBudget] = useState(DEMO_SCENARIOS[0].budget);
    const [days, setDays] = useState(DEMO_SCENARIOS[0].days);
    const [elapsed, setElapsed] = useState(DEMO_SCENARIOS[0].elapsed);
    const [spend, setSpend] = useState<CategorySpend[]>(DEMO_SCENARIOS[0].spend);

    const loadScenario = useCallback((idx: number) => {
        const s = DEMO_SCENARIOS[idx];
        setScenarioIdx(idx);
        setBudget(s.budget); setDays(s.days); setElapsed(s.elapsed);
        setSpend(s.spend); setIsFrozen(false);
    }, []);

    useEffect(() => { if (elapsed > days) setElapsed(days); }, [days, elapsed]);

    const updateCategorySpend = (cat: ExpenseCategory, val: number) => {
        setSpend(prev => prev.map(c => c.category === cat ? { ...c, total: Math.max(0, val) } : c));
    };

    const catInputDisabled = (cat: ExpenseCategory) =>
        role === 'organizer' && isFrozen && FREEZE_LOCKED_CATEGORIES.includes(cat);

    return (
        <div className="min-h-screen bg-psi-page p-4 md:p-6 space-y-6">

            <div>
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-9 h-9 bg-gradient-to-br from-rose-500 to-orange-500 rounded-xl flex items-center justify-center shadow-md shadow-rose-500/20">
                        <Activity size={18} className="text-psi-primary" />
                    </div>
                    <span className="text-rose-500 text-xs font-black tracking-[0.2em] uppercase">Burn Rate Engine · v1</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-psi-primary tracking-tight">Predictive Burn-Rate Auditor</h1>
                <p className="text-psi-secondary text-sm mt-1">Real-time budget pacing · Severity alerts · Branch Manager expense freeze</p>
            </div>

            {/* Controls panel */}
            <div className="psi-card rounded-2xl p-4 md:p-5 space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <label className="block text-xs font-bold uppercase tracking-widest text-psi-muted mb-2">Quick Scenario</label>
                        <div className="flex flex-wrap gap-2">
                            {DEMO_SCENARIOS.map((s, i) => (
                                <button key={i} id={`scenario-${i}`} onClick={() => loadScenario(i)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${scenarioIdx === i ? 'btn-accent shadow-sm' : 'psi-card border border-psi text-psi-secondary hover:text-psi-primary'}`}>
                                    {s.label}
                                </button>
                            ))}
                        </div>
                        <p className="text-[11px] text-psi-muted mt-2 italic">{DEMO_SCENARIOS[scenarioIdx].desc}</p>
                    </div>
                    <div className="md:w-64 flex-shrink-0">
                        <label className="block text-xs font-bold uppercase tracking-widest text-psi-muted mb-2">Viewing As</label>
                        <div className="flex gap-1 bg-psi-subtle p-1 rounded-xl">
                            {(['branch_manager', 'organizer'] as const).map(r => (
                                <button key={r} id={`role-${r}`} onClick={() => setRole(r)}
                                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all capitalize ${role === r ? 'btn-accent shadow' : 'text-psi-muted hover:text-psi-primary'}`}>
                                    {r === 'branch_manager' ? '🏢 Branch Mgr' : '📋 Organizer'}
                                </button>
                            ))}
                        </div>
                        {role === 'organizer' && isFrozen && (
                            <p className="text-[11px] text-rose-500 mt-1.5 font-medium flex items-center gap-1">
                                <Lock size={10} /> Marketing & Hospitality inputs locked below
                            </p>
                        )}
                    </div>
                </div>

                <div className="border-t border-psi pt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div className="col-span-2 md:col-span-1">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-psi-muted mb-1">Total Budget (AED)</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-psi-muted font-bold">AED</span>
                            <input id="budget-input" type="number" min={1000} step={5000} value={budget}
                                onChange={e => setBudget(Number(e.target.value))}
                                className="psi-input w-full pl-10 pr-3 py-2.5 text-sm font-mono" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-psi-muted mb-1">Event Days</label>
                        <div className="flex items-center gap-1">
                            <button onClick={() => setDays(d => Math.max(1, d - 1))} className="w-9 h-9 rounded-lg psi-card border border-psi text-psi-muted hover:text-psi-primary flex items-center justify-center"><Minus size={14} /></button>
                            <input type="number" min={1} max={30} value={days} onChange={e => setDays(Number(e.target.value))} className="psi-input flex-1 py-2.5 text-center text-sm font-bold w-0" />
                            <button onClick={() => setDays(d => Math.min(30, d + 1))} className="w-9 h-9 rounded-lg psi-card border border-psi text-psi-muted hover:text-psi-primary flex items-center justify-center"><Plus size={14} /></button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-psi-muted mb-1">Elapsed Days</label>
                        <div className="flex items-center gap-1">
                            <button onClick={() => setElapsed(d => Math.max(1, d - 1))} className="w-9 h-9 rounded-lg psi-card border border-psi text-psi-muted hover:text-psi-primary flex items-center justify-center"><Minus size={14} /></button>
                            <input type="number" min={1} max={days} value={elapsed} onChange={e => setElapsed(Math.min(days, Number(e.target.value)))} className="psi-input flex-1 py-2.5 text-center text-sm font-bold w-0" />
                            <button onClick={() => setElapsed(d => Math.min(days, d + 1))} className="w-9 h-9 rounded-lg psi-card border border-psi text-psi-muted hover:text-psi-primary flex items-center justify-center"><Plus size={14} /></button>
                        </div>
                    </div>

                    {(['Venue', 'Hospitality', 'Marketing', 'Travel'] as ExpenseCategory[]).map(cat => {
                        const val = spend.find(c => c.category === cat)?.total ?? 0;
                        const disabled = catInputDisabled(cat);
                        return (
                            <div key={cat}>
                                <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1 flex items-center gap-1 ${disabled ? 'text-rose-500' : 'text-psi-muted'}`}>
                                    {disabled && <Lock size={9} />}{cat} (AED)
                                </label>
                                <div className="relative">
                                    <input id={`spend-${cat.toLowerCase()}`} type="number" min={0} step={1000} value={val} disabled={disabled}
                                        onChange={e => updateCategorySpend(cat, Number(e.target.value))}
                                        className={`psi-input w-full px-3 py-2.5 text-sm font-mono transition-all ${disabled ? 'opacity-40 cursor-not-allowed bg-rose-50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-700/40' : ''}`} />
                                    {disabled && <Lock size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-rose-400 pointer-events-none" />}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* The widget */}
            <BurnRateAuditor
                totalBudget={budget} eventDays={days} elapsedDays={elapsed}
                categorySpend={spend} isFrozen={isFrozen} role={role}
                onFreezeToggle={setIsFrozen}
            />

            {/* Formula reference card */}
            <div className="psi-card rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                    <Info size={15} className="text-psi-muted" />
                    <p className="text-xs font-bold uppercase tracking-widest text-psi-muted">Burn Rate Formula Reference</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {[
                        ['Daily Budget', 'Total Budget ÷ Event Days'],
                        ['Expected Spend', 'Daily Budget × Elapsed Days'],
                        ['Burn Rate (actual)', 'Spent to Date ÷ Elapsed Days'],
                        ['Projected Total', 'Burn Rate × Event Days'],
                        ['Projected Overspend', 'Projected Total − Total Budget'],
                        ['Burn Ratio', 'Spent to Date ÷ Expected Spend'],
                    ].map(([label, formula]) => (
                        <div key={label} className="flex items-start gap-2 text-xs">
                            <span className="font-bold text-psi-secondary w-36 flex-shrink-0">{label}:</span>
                            <span className="text-psi-muted font-mono">{formula}</span>
                        </div>
                    ))}
                </div>
                <div className="mt-3 pt-3 border-t border-psi grid grid-cols-2 md:grid-cols-5 gap-2 text-[10px]">
                    {[
                        ['< 80%', 'UNDER BUDGET', 'text-emerald-600'],
                        ['80–110%', 'ON TRACK', 'text-emerald-600'],
                        ['110–135%', 'CAUTION', 'text-amber-600'],
                        ['135–160%', 'WARNING', 'text-orange-600'],
                        ['> 160%', 'CRITICAL', 'text-rose-600'],
                    ].map(([range, label, cls]) => (
                        <div key={range} className="flex flex-col items-center text-center psi-card rounded-xl p-2">
                            <span className="text-psi-muted">{range} of pace</span>
                            <span className={`font-extrabold mt-0.5 ${cls}`}>{label}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
