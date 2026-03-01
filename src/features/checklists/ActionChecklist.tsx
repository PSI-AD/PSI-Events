/**
 * src/features/checklists/ActionChecklist.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Guided Action Checklist Widget
 *
 * Displays a role-aware, event-scoped interactive checklist with:
 *   - Animated progress header (framer-motion fill + count + percentage)
 *   - Urgency detection: deadline pulse-red if < 48 h remaining or overdue
 *   - Priority grouping: Critical → High → Medium → Low
 *   - One-click deep-link CTA per pending task (React Router navigation)
 *   - Completed tasks: strikethrough text, green check, lowered opacity
 *   - Validation-pending badge for tasks awaiting manager sign-off
 *   - Fully theme-aware: uses only psi-* design tokens
 *
 * Props
 * ─────
 *   tasks        ChecklistTask[]  – The hydrated list for this user + event.
 *   role         'agent' | 'manager'
 *   eventName?   string           – Optional event label shown in the header.
 *   className?   string
 *
 * Usage in Dashboard.tsx
 * ──────────────────────
 *   import ActionChecklist from '../features/checklists/ActionChecklist';
 *   import { MOCK_AGENT_TASKS } from '../utils/checklistEngine';
 *
 *   // Inside <PageShell>, BEFORE the KPI cards:
 *   <ActionChecklist
 *     tasks={MOCK_AGENT_TASKS}
 *     role="agent"
 *     eventName="Dubai Marina Roadshow — Q1 2026"
 *     className="mb-8"
 *   />
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useMemo, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
    CheckCircle2,
    Circle,
    ArrowRight,
    Clock,
    AlertTriangle,
    ChevronDown,
    ChevronUp,
    Shield,
    ExternalLink,
    Flame,
    CheckSquare,
    Upload,
    Loader2,
    FileCheck,
    XCircle,
} from 'lucide-react';
import type { ChecklistTask } from '../../types/checklist';
import {
    calculateProgress,
    getUrgentTasks,
    sortByPriority,
} from '../../utils/checklistEngine';
import { storage, db } from '../../services/firebase/firebaseConfig';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

// ── Document upload hook ──────────────────────────────────────────────────────

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

/**
 * Self-contained hook for document-category checklist tasks.
 * Uploads to Firebase Storage under agent_documents/{userId}/{taskId}_{filename}
 * then writes isCompleted + completedAt + documentUrl to Firestore.
 *
 * Note: userId falls back to 'agent_alice_001' (the demo agent ID) when auth
 * is not yet wired. Replace with auth.currentUser?.uid in production.
 */
function useDocumentUpload(task: ChecklistTask) {
    const [status, setStatus] = useState<UploadStatus>('idle');
    const [progress, setProgress] = useState(0);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Click the hidden file input
    const openPicker = () => fileInputRef.current?.click();

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        // Reset input so the same file can be re-selected after an error
        e.target.value = '';

        setStatus('uploading');
        setProgress(0);
        setErrorMsg(null);

        try {
            // ── 1. Determine userId (real auth when wired, demo fallback) ────
            const userId = 'agent_alice_001'; // TODO: replace with auth.currentUser?.uid

            // ── 2. Upload to Firebase Storage ────────────────────────────────
            const storagePath = `agent_documents/${userId}/${task.id}_${file.name}`;
            const storageRef = ref(storage, storagePath);
            const uploadTask = uploadBytesResumable(storageRef, file);

            await new Promise<void>((resolve, reject) => {
                uploadTask.on(
                    'state_changed',
                    snapshot => {
                        const pct = Math.round(
                            (snapshot.bytesTransferred / snapshot.totalBytes) * 100
                        );
                        setProgress(pct);
                    },
                    reject,
                    resolve,
                );
            });

            const url = await getDownloadURL(uploadTask.snapshot.ref);
            setDownloadUrl(url);

            // ── 3. Update Firestore task document ────────────────────────────
            // Firestore path: agent_documents/{taskId}
            // Adjust the collection path to match your production schema.
            const taskDocRef = doc(db, 'agent_documents', task.id);
            await updateDoc(taskDocRef, {
                isCompleted: true,
                completedAt: serverTimestamp(),
                documentUrl: url,
                fileName: file.name,
                fileSize: file.size,
            });

            setStatus('success');
        } catch (err: unknown) {
            console.error('[document upload]', err);
            const msg = err instanceof Error ? err.message : 'Upload failed';
            setErrorMsg(msg);
            setStatus('error');
        }
    };

    return { status, progress, errorMsg, downloadUrl, openPicker, fileInputRef, handleFileChange };
}

// ── Constants ─────────────────────────────────────────────────────────────────

const URGENT_MS = 48 * 60 * 60 * 1000; // 48 hours in ms

const PRIORITY_LABEL: Record<ChecklistTask['priority'], string> = {
    critical: 'Critical',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
};

const PRIORITY_DOT: Record<ChecklistTask['priority'], string> = {
    critical: 'bg-rose-500',
    high: 'bg-amber-400',
    medium: 'bg-blue-400',
    low: 'bg-psi-muted',
};

const PHASE_LABEL: Record<ChecklistTask['phase'], string> = {
    pre_registration: 'Pre-Registration',
    registered: 'Registered',
    event_day: 'Event Day',
    post_event: 'Post-Event',
    always: 'General',
};

const CATEGORY_COLORS: Record<string, string> = {
    documents: 'badge-info',
    compliance: 'badge-warning',
    finance: 'badge-success',
    registration: 'badge-neutral',
    training: 'badge-info',
    logistics: 'badge-neutral',
    sales: 'badge-success',
    reporting: 'badge-warning',
};

// ── Utility helpers ───────────────────────────────────────────────────────────

function formatDeadline(deadlineMs: number): string {
    const diff = deadlineMs - Date.now();
    const absDiff = Math.abs(diff);

    const hours = Math.floor(absDiff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    const mins = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));

    if (diff < 0) {
        if (days > 0) return `${days}d overdue`;
        if (hours > 0) return `${hours}h overdue`;
        return `${mins}m overdue`;
    }
    if (days > 1) return `${days} days left`;
    if (hours >= 1) return `${hours}h ${mins}m left`;
    return `${mins}m left`;
}

function isUrgent(deadlineMs: number): boolean {
    const diff = deadlineMs - Date.now();
    return !isNaN(diff) && diff <= URGENT_MS;
}

function isOverdue(deadlineMs: number): boolean {
    return Date.now() > deadlineMs;
}

// ── Sub-components ────────────────────────────────────────────────────────────

// ── Progress Header ───────────────────────────────────────────────────────────

interface ProgressHeaderProps {
    completedCount: number;
    totalCount: number;
    percentage: number;
    overdueCount: number;
    urgentCount: number;
    eventName?: string;
}

function ProgressHeader({
    completedCount,
    totalCount,
    percentage,
    overdueCount,
    urgentCount,
    eventName,
}: ProgressHeaderProps) {
    const isAllDone = percentage === 100;

    // Gradient colour shifts as progress increases
    const barColor =
        percentage >= 80 ? '#10b981'  // emerald
            : percentage >= 50 ? '#3b82f6' // blue
                : percentage >= 25 ? '#f59e0b' // amber
                    : '#ef4444';                   // rose (early stage)

    return (
        <div className="psi-card p-5 md:p-6 mb-2">
            {/* Top row */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
                <div>
                    <div className="flex items-center gap-2 mb-0.5">
                        <CheckSquare size={17} className="text-psi-accent flex-shrink-0" />
                        <h3 className="text-sm font-bold text-psi-primary uppercase tracking-widest">
                            Guided Checklist
                        </h3>
                    </div>
                    {eventName && (
                        <p className="text-xs text-psi-muted ml-6 leading-snug">{eventName}</p>
                    )}
                </div>

                {/* Alert pills */}
                <div className="flex items-center gap-2 flex-wrap">
                    {overdueCount > 0 && (
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full
                         bg-rose-500/10 border border-rose-500/30 text-rose-600
                         dark:text-rose-400 text-xs font-bold select-none"
                        >
                            <AlertTriangle size={11} />
                            {overdueCount} Overdue
                        </motion.div>
                    )}
                    {urgentCount > 0 && (
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full
                         bg-amber-500/10 border border-amber-500/30 text-amber-600
                         dark:text-amber-400 text-xs font-bold select-none"
                        >
                            <Flame size={11} />
                            {urgentCount} Urgent
                        </motion.div>
                    )}
                </div>
            </div>

            {/* Giant percentage + count */}
            <div className="flex items-end justify-between gap-4 mb-3">
                <div>
                    <motion.span
                        key={percentage}
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-5xl md:text-6xl font-black tabular-nums leading-none"
                        style={{ color: barColor }}
                    >
                        {percentage}%
                    </motion.span>
                </div>
                <div className="text-right pb-1.5">
                    <p className="text-xl font-bold text-psi-primary tabular-nums leading-tight">
                        {completedCount}
                        <span className="text-psi-muted font-medium text-base"> / {totalCount}</span>
                    </p>
                    <p className="text-xs text-psi-muted mt-0.5">
                        {isAllDone ? 'All tasks complete 🎉' : 'tasks completed'}
                    </p>
                </div>
            </div>

            {/* Animated bar */}
            <div className="relative w-full h-3 bg-psi-subtle rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 1, ease: [0.34, 1.56, 0.64, 1] }} // spring overshoot
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{
                        background: `linear-gradient(90deg, ${barColor}cc, ${barColor})`,
                        boxShadow: `0 0 12px ${barColor}66`,
                    }}
                />
                {/* Shimmer overlay */}
                {percentage > 0 && percentage < 100 && (
                    <motion.div
                        className="absolute inset-y-0 w-12 rounded-full opacity-40"
                        style={{ background: 'linear-gradient(90deg, transparent, white, transparent)' }}
                        animate={{ left: ['-10%', '110%'] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear', repeatDelay: 1 }}
                    />
                )}
            </div>

            {/* Phase legend */}
            <div className="flex items-center gap-4 mt-3 flex-wrap">
                {(['critical', 'high', 'medium', 'low'] as const).map(p => (
                    <div key={p} className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${PRIORITY_DOT[p]}`} />
                        <span className="text-[10px] text-psi-muted font-medium">{PRIORITY_LABEL[p]}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Task Card ─────────────────────────────────────────────────────────────────

/** Categories that require a document file upload instead of a page route. */
const DOCUMENT_CATEGORIES = new Set(['documents', 'compliance']);

interface TaskCardProps {
    key?: React.Key;
    task: ChecklistTask;
    index: number;
    onNavigate: (route: string) => void;
}

function TaskCard({ task, index, onNavigate }: TaskCardProps) {
    const [expanded, setExpanded] = useState(false);
    const isDocTask = DOCUMENT_CATEGORIES.has(task.category ?? '');
    const upload = useDocumentUpload(task);

    const deadlineUrgent = !task.isCompleted && isUrgent(task.deadline);
    const deadlineOverdue = !task.isCompleted && isOverdue(task.deadline);
    const pendingValidation = task.isCompleted && task.requiresValidation && !task.isValidated;

    const deadlineLabel = formatDeadline(task.deadline);

    // Card border colour based on state
    const borderClass = task.isCompleted
        ? 'border-emerald-500/20 dark:border-emerald-500/25'
        : deadlineOverdue
            ? 'border-rose-500/40 dark:border-rose-500/40'
            : deadlineUrgent
                ? 'border-amber-400/40 dark:border-amber-400/30'
                : 'border-psi';

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04, duration: 0.3 }}
            className={`
        psi-card border transition-all duration-200 overflow-hidden
        ${borderClass}
        ${task.isCompleted ? 'opacity-55 hover:opacity-70' : 'hover:shadow-md'}
      `}
        >
            {/* Main row */}
            <div
                className="flex items-start gap-3.5 p-4 cursor-pointer select-none"
                onClick={() => setExpanded(e => !e)}
                role="button"
                aria-expanded={expanded}
            >
                {/* Check / circle icon */}
                <div className="flex-shrink-0 mt-0.5">
                    {task.isCompleted || upload.status === 'success' ? (
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                        >
                            <CheckCircle2 size={20} className="text-emerald-500" />
                        </motion.div>
                    ) : (
                        <Circle
                            size={20}
                            className={
                                deadlineOverdue
                                    ? 'text-rose-500'
                                    : deadlineUrgent
                                        ? 'text-amber-400'
                                        : 'text-psi-muted'
                            }
                        />
                    )}
                </div>

                {/* Title block */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        {/* Title + badges */}
                        <div className="min-w-0">
                            <p
                                className={`text-sm font-semibold leading-snug ${task.isCompleted || upload.status === 'success'
                                    ? 'line-through text-psi-muted'
                                    : 'text-psi-primary'
                                    }`}
                            >
                                {task.title}
                            </p>

                            {/* Inline tags row */}
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                {/* Priority dot */}
                                <div className="flex items-center gap-1">
                                    <div className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[task.priority]}`} />
                                    <span className="text-[10px] text-psi-muted font-medium">
                                        {PRIORITY_LABEL[task.priority]}
                                    </span>
                                </div>

                                {/* Phase */}
                                <span className="text-[10px] text-psi-muted">
                                    {PHASE_LABEL[task.phase]}
                                </span>

                                {/* Category badge */}
                                {task.category && (
                                    <span className={`
                    inline-flex items-center px-2 py-0.5 rounded-full
                    text-[10px] font-bold uppercase tracking-widest
                    ${CATEGORY_COLORS[task.category] ?? 'badge-neutral'}
                  `}>
                                        {task.category}
                                    </span>
                                )}

                                {/* Validation-pending badge */}
                                {pendingValidation && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5
                    rounded-full text-[10px] font-bold uppercase tracking-widest badge-warning">
                                        <Shield size={9} />
                                        Awaiting Approval
                                    </span>
                                )}

                                {/* Upload success badge */}
                                {upload.status === 'success' && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5
                    rounded-full text-[10px] font-bold uppercase tracking-widest
                    bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400">
                                        <FileCheck size={9} />
                                        Uploaded
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Deadline + chevron */}
                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                            {!task.isCompleted && upload.status !== 'success' && (
                                <div
                                    className={`
                    flex items-center gap-1 text-[11px] font-bold rounded-full
                    px-2.5 py-1 whitespace-nowrap
                    ${deadlineOverdue
                                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                            : deadlineUrgent
                                                ? 'bg-amber-400/10 text-amber-600 dark:text-amber-400'
                                                : 'bg-psi-subtle text-psi-muted'
                                        }
                    ${(deadlineOverdue || deadlineUrgent) ? 'animate-pulse' : ''}
                  `}
                                >
                                    <Clock size={10} />
                                    {deadlineLabel}
                                </div>
                            )}

                            {(task.isCompleted || upload.status === 'success') && (
                                <div className="flex items-center gap-1 text-[11px] font-bold
                  text-emerald-600 dark:text-emerald-400 select-none">
                                    <CheckCircle2 size={11} />
                                    Done
                                </div>
                            )}

                            {/* Expand chevron */}
                            <div className="text-psi-muted mt-0.5">
                                {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Expanded body — description + CTA */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        key="body"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 pb-4 pt-1 border-t border-psi-subtle">
                            {/* Description */}
                            <p className="text-sm text-psi-secondary leading-relaxed mb-4">
                                {task.description}
                            </p>

                            {/* Action row */}
                            <div className="flex items-center gap-3 flex-wrap">

                                {/* ── DOCUMENT UPLOAD CTA ─────────────────── */}
                                {!task.isCompleted && isDocTask && (
                                    <>
                                        {/* Hidden file input */}
                                        <input
                                            ref={upload.fileInputRef}
                                            type="file"
                                            accept=".pdf,.jpg,.jpeg,.png"
                                            className="hidden"
                                            onChange={upload.handleFileChange}
                                        />

                                        {/* Upload button — idle */}
                                        {upload.status === 'idle' && (
                                            <motion.button
                                                whileHover={{ x: 3 }}
                                                whileTap={{ scale: 0.97 }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    upload.openPicker();
                                                }}
                                                className="flex items-center gap-2 px-4 py-2.5
                                                    rounded-xl text-sm font-semibold shadow-sm
                                                    btn-accent active:scale-[0.97] transition-all select-none"
                                            >
                                                <Upload size={14} />
                                                {task.actionLabel ?? 'Upload Document'}
                                            </motion.button>
                                        )}

                                        {/* Upload button — uploading */}
                                        {upload.status === 'uploading' && (
                                            <div className="flex items-center gap-2.5 px-4 py-2.5
                                                rounded-xl text-sm font-semibold
                                                bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-400">
                                                <Loader2 size={14} className="animate-spin" />
                                                Uploading… {upload.progress}%
                                                {/* Mini progress bar */}
                                                <div className="w-16 h-1 bg-blue-500/20 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-blue-500 rounded-full transition-all duration-300"
                                                        style={{ width: `${upload.progress}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* Upload button — success */}
                                        {upload.status === 'success' && (
                                            <motion.div
                                                initial={{ scale: 0.8, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                className="flex items-center gap-2 px-4 py-2.5
                                                    rounded-xl text-sm font-bold
                                                    bg-emerald-500/10 border border-emerald-500/30
                                                    text-emerald-600 dark:text-emerald-400"
                                            >
                                                <FileCheck size={14} />
                                                Saved to Firebase ✓
                                            </motion.div>
                                        )}

                                        {/* Upload button — error */}
                                        {upload.status === 'error' && (
                                            <div className="flex flex-col gap-1.5">
                                                <div className="flex items-center gap-2 px-4 py-2.5
                                                    rounded-xl text-sm font-semibold
                                                    bg-rose-500/10 border border-rose-500/30
                                                    text-rose-600 dark:text-rose-400">
                                                    <XCircle size={14} />
                                                    {upload.errorMsg ?? 'Upload failed'}
                                                </div>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); upload.openPicker(); }}
                                                    className="text-xs text-psi-muted hover:text-psi-primary underline underline-offset-2 transition-colors"
                                                >
                                                    Try again
                                                </button>
                                            </div>
                                        )}

                                        {/* Accepted file types hint */}
                                        {upload.status === 'idle' && (
                                            <span className="text-[11px] text-psi-muted">
                                                PDF, JPG or PNG · max 10 MB
                                            </span>
                                        )}
                                    </>
                                )}

                                {/* ── NAVIGATE CTA (non-document tasks) ──── */}
                                {!task.isCompleted && !isDocTask && (
                                    <motion.button
                                        whileHover={{ x: 3 }}
                                        whileTap={{ scale: 0.97 }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onNavigate(task.actionRoute);
                                        }}
                                        className="btn-accent flex items-center gap-2 px-4 py-2.5
                      rounded-xl text-sm font-semibold shadow-sm
                      active:scale-[0.97] transition-all select-none"
                                    >
                                        {task.actionLabel ?? 'Take Action'}
                                        <ArrowRight size={14} />
                                    </motion.button>
                                )}

                                {/* Validation-pending note */}
                                {pendingValidation && (
                                    <span className="text-xs text-amber-600 dark:text-amber-400 font-medium
                    flex items-center gap-1.5">
                                        <Shield size={12} />
                                        Submitted — awaiting manager validation
                                    </span>
                                )}

                                {/* Reference link */}
                                {task.referenceUrl && (
                                    <a
                                        href={task.referenceUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={e => e.stopPropagation()}
                                        className="flex items-center gap-1.5 text-xs text-psi-muted
                      hover:text-psi-primary transition-colors"
                                    >
                                        <ExternalLink size={11} />
                                        Reference
                                    </a>
                                )}

                                {/* Uploaded file link */}
                                {upload.downloadUrl && (
                                    <a
                                        href={upload.downloadUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={e => e.stopPropagation()}
                                        className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400
                      hover:text-blue-500 transition-colors"
                                    >
                                        <ExternalLink size={11} />
                                        View uploaded file
                                    </a>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// ── Priority Group ────────────────────────────────────────────────────────────

interface PriorityGroupProps {
    key?: React.Key;
    priority: ChecklistTask['priority'];
    tasks: ChecklistTask[];
    onNavigate: (route: string) => void;
    startIndex: number;
}

function PriorityGroup({ priority, tasks, onNavigate, startIndex }: PriorityGroupProps) {
    const [collapsed, setCollapsed] = useState(false);
    if (tasks.length === 0) return null;

    const doneCount = tasks.filter(t => t.isCompleted).length;
    const allDone = doneCount === tasks.length;

    return (
        <div>
            {/* Group header */}
            <button
                onClick={() => setCollapsed(c => !c)}
                className="w-full flex items-center justify-between gap-3 py-2 px-1
          text-left group select-none"
                aria-expanded={!collapsed}
            >
                <div className="flex items-center gap-2.5">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${PRIORITY_DOT[priority]}`} />
                    <span className="text-xs font-bold text-psi-muted uppercase tracking-widest">
                        {PRIORITY_LABEL[priority]}
                    </span>
                    <span className="text-[10px] tabular-nums px-1.5 py-0.5 rounded-full
            bg-psi-subtle text-psi-muted font-bold">
                        {doneCount}/{tasks.length}
                    </span>
                    {allDone && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                            ✓ all done
                        </span>
                    )}
                </div>
                <div className="text-psi-muted group-hover:text-psi-primary transition-colors">
                    {collapsed ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
                </div>
            </button>

            <AnimatePresence>
                {!collapsed && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-2 overflow-hidden"
                    >
                        {tasks.map((task, i) => (
                            <TaskCard
                                key={task.id}
                                task={task}
                                index={startIndex + i}
                                onNavigate={onNavigate}
                            />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN EXPORT — ActionChecklist
// ═══════════════════════════════════════════════════════════════════════════

export interface ActionChecklistProps {
    /** Hydrated task list for this user + event (from checklistEngine). */
    tasks: ChecklistTask[];
    /** Determines which role label and icon to use. */
    role: 'agent' | 'manager';
    /** Optional display name of the event shown in the header. */
    eventName?: string;
    /** Extra classes on the outermost div. */
    className?: string;
}

export default function ActionChecklist({
    tasks,
    role,
    eventName,
    className = '',
}: ActionChecklistProps) {
    const navigate = useNavigate();

    // ── Derived data ────────────────────────────────────────────────────────

    const progress = useMemo(() => calculateProgress(tasks), [tasks]);
    const urgentTasks = useMemo(() => getUrgentTasks(tasks), [tasks]);

    /** Tasks split by priority group, sorted within group by deadline. */
    const grouped = useMemo(() => {
        const sorted = sortByPriority(tasks);
        return {
            critical: sorted.filter(t => t.priority === 'critical'),
            high: sorted.filter(t => t.priority === 'high'),
            medium: sorted.filter(t => t.priority === 'medium'),
            low: sorted.filter(t => t.priority === 'low'),
        };
    }, [tasks]);

    /** Cumulative offset for staggered animations across groups. */
    const groupOffsets = useMemo(() => {
        const { critical, high, medium } = grouped;
        return {
            critical: 0,
            high: critical.length,
            medium: critical.length + high.length,
            low: critical.length + high.length + medium.length,
        };
    }, [grouped]);

    const onNavigate = useCallback((route: string) => {
        navigate(route);
    }, [navigate]);

    // ── Filter toggle state ─────────────────────────────────────────────────
    const [showOnlyPending, setShowOnlyPending] = useState(false);

    const displayTasks = useMemo(() => {
        if (!showOnlyPending) return tasks;
        return tasks.filter(t => !t.isCompleted);
    }, [tasks, showOnlyPending]);

    const displayGrouped = useMemo(() => {
        const sorted = sortByPriority(displayTasks);
        return {
            critical: sorted.filter(t => t.priority === 'critical'),
            high: sorted.filter(t => t.priority === 'high'),
            medium: sorted.filter(t => t.priority === 'medium'),
            low: sorted.filter(t => t.priority === 'low'),
        };
    }, [displayTasks]);

    const displayOffsets = useMemo(() => {
        const { critical, high, medium } = displayGrouped;
        return {
            critical: 0,
            high: critical.length,
            medium: critical.length + high.length,
            low: critical.length + high.length + medium.length,
        };
    }, [displayGrouped]);

    // ── Empty state ─────────────────────────────────────────────────────────
    if (tasks.length === 0) {
        return (
            <div className={`psi-card p-8 text-center ${className}`}>
                <CheckCircle2 size={36} className="mx-auto text-psi-muted mb-3" />
                <p className="font-bold text-psi-primary">No tasks assigned yet</p>
                <p className="text-sm text-psi-secondary mt-1">
                    Checklist tasks will appear here once an event is assigned to you.
                </p>
            </div>
        );
    }

    return (
        <div className={className}>
            {/* ── Progress header ── */}
            <ProgressHeader
                completedCount={progress.completedCount}
                totalCount={progress.totalCount}
                percentage={progress.percentage}
                overdueCount={progress.overdueCount}
                urgentCount={progress.urgentCount}
                eventName={eventName}
            />

            {/* ── Urgent banner (only when applicable) ── */}
            <AnimatePresence>
                {urgentTasks.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-4 overflow-hidden"
                    >
                        <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 px-4 py-3
              flex items-start gap-3">
                            <Flame size={16} className="text-rose-500 flex-shrink-0 mt-0.5" />
                            <div className="min-w-0">
                                <p className="text-sm font-bold text-rose-600 dark:text-rose-400">
                                    {urgentTasks.length} task{urgentTasks.length > 1 ? 's' : ''} need
                                    {urgentTasks.length === 1 ? 's' : ''} immediate attention
                                </p>
                                <p className="text-xs text-psi-secondary mt-0.5 truncate">
                                    {urgentTasks.slice(0, 2).map(t => t.title).join(', ')}
                                    {urgentTasks.length > 2 && ` +${urgentTasks.length - 2} more`}
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Toolbar ── */}
            <div className="flex items-center justify-between gap-3 mb-4 px-0.5">
                <p className="text-xs font-bold text-psi-muted uppercase tracking-widest">
                    {role === 'manager' ? 'Manager Tasks' : 'My Tasks'}
                </p>
                <button
                    onClick={() => setShowOnlyPending(s => !s)}
                    className={`
            text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all select-none
            ${showOnlyPending
                            ? 'btn-accent border-transparent'
                            : 'border-psi text-psi-muted hover:text-psi-primary hover:bg-psi-subtle'
                        }
          `}
                >
                    {showOnlyPending ? 'Show All' : 'Pending Only'}
                </button>
            </div>

            {/* ── Priority groups ── */}
            <div className="space-y-4">
                {(['critical', 'high', 'medium', 'low'] as const).map(priority => (
                    <PriorityGroup
                        key={priority}
                        priority={priority}
                        tasks={displayGrouped[priority]}
                        onNavigate={onNavigate}
                        startIndex={displayOffsets[priority]}
                    />
                ))}
            </div>

            {/* ── All-done celebration ── */}
            <AnimatePresence>
                {progress.percentage === 100 && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                        className="mt-6 p-5 rounded-2xl border border-emerald-500/30
              bg-emerald-500/5 text-center"
                    >
                        <p className="text-2xl mb-1">🎉</p>
                        <p className="font-bold text-emerald-600 dark:text-emerald-400">
                            All tasks complete!
                        </p>
                        <p className="text-sm text-psi-secondary mt-1">
                            Outstanding work — your event preparation is locked in.
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
