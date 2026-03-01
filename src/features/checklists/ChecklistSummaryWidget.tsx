/**
 * src/features/checklists/ChecklistSummaryWidget.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Compact dashboard widget — shows a glanceable checklist status card
 * with an animated progress bar and a "View Full Checklist →" CTA.
 *
 * Designed to replace the massive inline ActionChecklist on Dashboard.tsx.
 */

import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
    CheckSquare, AlertTriangle, Flame, ArrowRight, CheckCircle2,
} from 'lucide-react';
import { MOCK_AGENT_TASKS, calculateProgress, getUrgentTasks } from '../../utils/checklistEngine';

// ── Tiny cn util ──────────────────────────────────────────────────────────────
function cn(...c: (string | false | undefined | null)[]) {
    return c.filter(Boolean).join(' ');
}

// ─────────────────────────────────────────────────────────────────────────────

export default function ChecklistSummaryWidget({ className }: { className?: string }) {
    const navigate = useNavigate();

    const tasks = MOCK_AGENT_TASKS;
    const progress = useMemo(() => calculateProgress(tasks), [tasks]);
    const urgent = useMemo(() => getUrgentTasks(tasks), [tasks]);

    const barColor =
        progress.percentage >= 80 ? '#10b981'
            : progress.percentage >= 50 ? '#3b82f6'
                : progress.percentage >= 25 ? '#f59e0b'
                    : '#ef4444';

    const isAllDone = progress.percentage === 100;

    // Pick the top 3 pending tasks as a preview
    const pendingPreview = tasks
        .filter(t => !t.isCompleted)
        .sort((a, b) => {
            const pw: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
            return (pw[a.priority] ?? 3) - (pw[b.priority] ?? 3);
        })
        .slice(0, 3);

    return (
        <div className={cn('psi-card overflow-hidden', className)}>

            {/* ── Header ── */}
            <div className="flex items-center justify-between px-5 pt-5 pb-0">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                        <CheckSquare size={15} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                        <p className="text-xs font-black uppercase tracking-widest text-psi-muted">
                            Action Checklist
                        </p>
                        <p className="text-[11px] text-psi-muted leading-tight mt-0.5 truncate max-w-[160px]">
                            Dubai Marina Q1 2026
                        </p>
                    </div>
                </div>

                {/* Alert pills — compact */}
                <div className="flex items-center gap-1.5">
                    {progress.overdueCount > 0 && (
                        <div className="flex items-center gap-1 bg-rose-500/10 border border-rose-500/25 rounded-full px-2 py-0.5">
                            <AlertTriangle size={9} className="text-rose-500" />
                            <span className="text-[9px] font-black text-rose-600 dark:text-rose-400">
                                {progress.overdueCount}
                            </span>
                        </div>
                    )}
                    {urgent.length > 0 && (
                        <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/25 rounded-full px-2 py-0.5">
                            <Flame size={9} className="text-amber-500" />
                            <span className="text-[9px] font-black text-amber-600 dark:text-amber-400">
                                {urgent.length}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Progress block ── */}
            <div className="px-5 pt-4 pb-4">
                {/* Big percentage + fraction */}
                <div className="flex items-end justify-between mb-2">
                    <motion.span
                        key={progress.percentage}
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-3xl font-black tabular-nums leading-none"
                        style={{ color: barColor }}
                    >
                        {progress.percentage}%
                    </motion.span>
                    <div className="text-right">
                        <p className="text-sm font-bold text-psi-primary tabular-nums">
                            {progress.completedCount}
                            <span className="text-psi-muted font-medium text-xs"> / {progress.totalCount}</span>
                        </p>
                        <p className="text-[10px] text-psi-muted mt-0.5">
                            {isAllDone ? 'All done 🎉' : 'tasks done'}
                        </p>
                    </div>
                </div>

                {/* Animated progress bar */}
                <div className="relative w-full h-2.5 bg-psi-subtle rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress.percentage}%` }}
                        transition={{ duration: 1, ease: [0.34, 1.56, 0.64, 1] }}
                        className="absolute inset-y-0 left-0 rounded-full"
                        style={{
                            background: `linear-gradient(90deg, ${barColor}cc, ${barColor})`,
                            boxShadow: `0 0 10px ${barColor}55`,
                        }}
                    />
                    {/* Shimmer */}
                    {progress.percentage > 0 && progress.percentage < 100 && (
                        <motion.div
                            className="absolute inset-y-0 w-10 rounded-full opacity-40"
                            style={{ background: 'linear-gradient(90deg, transparent, white, transparent)' }}
                            animate={{ left: ['-15%', '120%'] }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'linear', repeatDelay: 1.5 }}
                        />
                    )}
                </div>
            </div>

            {/* ── Pending task preview (top 3) ── */}
            {pendingPreview.length > 0 && (
                <div className="border-t border-psi-subtle px-5 py-3 space-y-2">
                    {pendingPreview.map(task => {
                        const dotColor =
                            task.priority === 'critical' ? 'bg-rose-500'
                                : task.priority === 'high' ? 'bg-amber-400'
                                    : 'bg-blue-400';
                        return (
                            <div key={task.id} className="flex items-center gap-2.5">
                                <div className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', dotColor)} />
                                <p className="text-xs text-psi-secondary leading-tight truncate">
                                    {task.title}
                                </p>
                            </div>
                        );
                    })}
                    {(progress.totalCount - progress.completedCount) > 3 && (
                        <p className="text-[10px] text-psi-muted pl-4">
                            +{(progress.totalCount - progress.completedCount) - 3} more pending…
                        </p>
                    )}
                </div>
            )}

            {/* ── All done state ── */}
            {isAllDone && (
                <div className="border-t border-psi-subtle px-5 py-3 flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-500" />
                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        Outstanding work — event prep complete!
                    </p>
                </div>
            )}

            {/* ── CTA ── */}
            <div className="px-5 pb-5 pt-1">
                <motion.button
                    whileHover={{ x: 3 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => navigate('/checklist')}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3
                               rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600
                               text-white text-sm font-bold shadow-lg shadow-emerald-500/25
                               transition-all duration-150 select-none"
                >
                    <span>View Full Checklist</span>
                    <ArrowRight size={16} />
                </motion.button>
            </div>
        </div>
    );
}
