/**
 * src/pages/ChecklistPage.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Dedicated route for the full ActionChecklist experience.
 * Lives at /checklist — linked from the Dashboard widget and sidebar.
 */

import React, { useMemo } from 'react';
import { CheckSquare, AlertTriangle, Flame, ClipboardCheck, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import ActionChecklist from '../features/checklists/ActionChecklist';
import {
    MOCK_AGENT_TASKS,
    calculateProgress,
    getUrgentTasks,
} from '../utils/checklistEngine';

// ── Tiny cn util ──────────────────────────────────────────────────────────────
function cn(...c: (string | false | undefined | null)[]) {
    return c.filter(Boolean).join(' ');
}

// ── Event context (swap for real Firestore data when wired) ───────────────────
const EVENT_NAME = 'Dubai Marina Roadshow — Q1 2026';
const TASKS = MOCK_AGENT_TASKS;
const ROLE: 'agent' | 'manager' = 'agent';

// ─────────────────────────────────────────────────────────────────────────────

export default function ChecklistPage() {
    const progress = useMemo(() => calculateProgress(TASKS), []);
    const urgent = useMemo(() => getUrgentTasks(TASKS), []);

    const barColor =
        progress.percentage >= 80 ? '#10b981'
            : progress.percentage >= 50 ? '#3b82f6'
                : progress.percentage >= 25 ? '#f59e0b'
                    : '#ef4444';

    return (
        <div className="min-h-screen bg-psi-page">
            {/* ── Hero header ── */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800/60">
                <div className="max-w-4xl mx-auto px-6 md:px-10 py-8 md:py-10">

                    {/* Breadcrumb */}
                    <div className="flex items-center gap-2 text-[11px] font-bold text-psi-muted uppercase tracking-widest mb-4">
                        <span>Dashboard</span>
                        <ChevronRight size={11} />
                        <span className="text-emerald-600 dark:text-emerald-400">Checklist</span>
                    </div>

                    {/* Title row */}
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <ClipboardCheck size={22} className="text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
                                Logistics & Compliance Action Center
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 mt-1.5 text-sm leading-relaxed">
                                All mandatory tasks for{' '}
                                <span className="font-semibold text-slate-700 dark:text-slate-300">
                                    {EVENT_NAME}
                                </span>
                                . Complete every item before event day to unlock your lead distribution slot.
                            </p>
                        </div>
                    </div>

                    {/* Stat pills */}
                    <div className="flex flex-wrap gap-3 mt-6">
                        {/* Progress */}
                        <motion.div
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.35 }}
                            className="flex items-center gap-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 rounded-xl px-4 py-2.5"
                        >
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: barColor }} />
                            <span className="text-sm font-extrabold tabular-nums" style={{ color: barColor }}>
                                {progress.percentage}%
                            </span>
                            <span className="text-xs text-psi-muted font-medium">
                                {progress.completedCount} / {progress.totalCount} complete
                            </span>
                        </motion.div>

                        {/* Overdue */}
                        {progress.overdueCount > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.35, delay: 0.05 }}
                                className="flex items-center gap-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-700/40 rounded-xl px-4 py-2.5"
                            >
                                <AlertTriangle size={13} className="text-rose-600 dark:text-rose-400" />
                                <span className="text-xs font-bold text-rose-700 dark:text-rose-400">
                                    {progress.overdueCount} Overdue
                                </span>
                            </motion.div>
                        )}

                        {/* Urgent */}
                        {urgent.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.35, delay: 0.1 }}
                                className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-700/40 rounded-xl px-4 py-2.5"
                            >
                                <Flame size={13} className="text-amber-600 dark:text-amber-400" />
                                <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
                                    {urgent.length} Urgent
                                </span>
                            </motion.div>
                        )}

                        {/* Role badge */}
                        <motion.div
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.35, delay: 0.15 }}
                            className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-700/40 rounded-xl px-4 py-2.5"
                        >
                            <CheckSquare size={13} className="text-blue-600 dark:text-blue-400" />
                            <span className="text-xs font-bold text-blue-700 dark:text-blue-400 capitalize">
                                {ROLE} Tasks
                            </span>
                        </motion.div>
                    </div>

                    {/* Animated progress bar */}
                    <div className="mt-5 w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress.percentage}%` }}
                            transition={{ duration: 1.1, ease: [0.34, 1.56, 0.64, 1] }}
                            className="h-full rounded-full"
                            style={{
                                background: `linear-gradient(90deg, ${barColor}cc, ${barColor})`,
                                boxShadow: `0 0 10px ${barColor}66`,
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* ── Checklist body ── */}
            <div className="max-w-4xl mx-auto px-6 md:px-10 py-8">
                <ActionChecklist
                    tasks={TASKS}
                    role={ROLE}
                    eventName={EVENT_NAME}
                />
            </div>
        </div>
    );
}
