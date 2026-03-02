/**
 * src/features/settings/ChecklistBuilder.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Checklist Template Builder — Super Admin Tool
 *
 * Provides a split-screen editor for the Agent (left) and Manager (right)
 * default onboarding checklists. Each template panel supports:
 *
 *   ✦ Add new task step with full field set
 *   ✦ Edit: title, description, deadline offset, action route, priority,
 *            phase, category, requiresValidation
 *   ✦ Reorder steps with Up/Down arrow controls
 *   ✦ Delete individual steps with confirmation
 *   ✦ Live task count + completion overview
 *   ✦ Copy-to-clipboard export as JSON (ready for Firestore seeding)
 *   ✦ Reset panel to defaults from checklistEngine.ts seed data
 *
 * All styling uses psi-* design tokens — fully respects all 5 UI themes
 * and light/dark mode.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useCallback, useId } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    Users,
    Briefcase,
    Plus,
    Trash2,
    ChevronUp,
    ChevronDown,
    Copy,
    Check,
    RotateCcw,
    AlertTriangle,
    GripVertical,
    Clock,
    Route,
    AlignLeft,
    Tag,
    ShieldCheck,
    Pencil,
    X,
    Save,
    Info,
} from 'lucide-react';
import type { ChecklistTemplateItem } from '../../types/checklist';
import { AGENT_TEMPLATE, MANAGER_TEMPLATE } from '../../utils/checklistEngine';

// ── Types ─────────────────────────────────────────────────────────────────────

/** A mutable draft of ChecklistTemplateItem (all fields present, all editable) */
type DraftItem = ChecklistTemplateItem & { _draftId: string };

type TemplateRole = 'agent' | 'manager';

// ── Constants ─────────────────────────────────────────────────────────────────

const PHASE_OPTIONS: { value: ChecklistTemplateItem['phase']; label: string }[] = [
    { value: 'pre_registration', label: 'Pre-Registration' },
    { value: 'registered', label: 'Registered' },
    { value: 'event_day', label: 'Event Day' },
    { value: 'post_event', label: 'Post-Event' },
    { value: 'always', label: 'Always' },
];

const PRIORITY_OPTIONS: { value: ChecklistTemplateItem['priority']; label: string; dot: string }[] = [
    { value: 'critical', label: 'Critical', dot: 'bg-rose-500' },
    { value: 'high', label: 'High', dot: 'bg-amber-400' },
    { value: 'medium', label: 'Medium', dot: 'bg-blue-400' },
    { value: 'low', label: 'Low', dot: 'bg-psi-muted' },
];

const CATEGORY_OPTIONS = [
    'registration', 'documents', 'compliance', 'finance',
    'logistics', 'training', 'sales', 'reporting',
];

const ROUTE_SUGGESTIONS = [
    '/events/{eventId}/registration',
    '/events/{eventId}/documents',
    '/events/{eventId}/payment',
    '/events/{eventId}/training',
    '/events/{eventId}/floor-plan',
    '/events/{eventId}/roster',
    '/events/{eventId}/budget',
    '/events/{eventId}/attendance',
    '/events/{eventId}/report',
    '/events/{eventId}/feedback',
    '/events/{eventId}/debrief',
    '/settlement',
    '/analytics',
    '/check-in',
    '/travel-desk',
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid(): string {
    return Math.random().toString(36).slice(2, 10);
}

function itemToDraft(item: ChecklistTemplateItem): DraftItem {
    return { ...item, _draftId: uid() };
}

function draftToItem(draft: DraftItem): ChecklistTemplateItem {
    const { _draftId, ...rest } = draft;
    void _draftId;
    return rest;
}

function seedDrafts(role: TemplateRole): DraftItem[] {
    const template = role === 'agent' ? AGENT_TEMPLATE : MANAGER_TEMPLATE;
    return template.tasks.map(itemToDraft);
}

function blankDraft(role: TemplateRole): DraftItem {
    return {
        _draftId: uid(),
        templateId: `task_${uid()}`,
        roleTarget: role,
        title: '',
        description: '',
        actionRoute: '/events/{eventId}/',
        actionLabel: 'Take Action',
        deadlineOffsetHours: -72,
        requiresValidation: false,
        phase: 'pre_registration',
        priority: 'medium',
        category: 'registration',
    };
}

/** Format deadlineOffsetHours → human-readable string for display */
function formatOffset(hours: number): string {
    const abs = Math.abs(hours);
    const dir = hours < 0 ? 'before' : 'after';
    if (abs % 24 === 0) {
        const days = abs / 24;
        return `${days} day${days !== 1 ? 's' : ''} ${dir} event`;
    }
    return `${abs} hour${abs !== 1 ? 's' : ''} ${dir} event`;
}

/** Parse "7 days before event" → -168 */
function parseOffset(raw: string): number | null {
    const match = raw
        .toLowerCase()
        .match(/^(\d+(?:\.\d+)?)\s*(hour|hr|h|day|d)s?\s*(before|after|post|pre)/);
    if (!match) return null;
    const val = parseFloat(match[1]);
    const unit = match[2].startsWith('d') ? 24 : 1;
    const sign = match[3] === 'before' || match[3] === 'pre' ? -1 : 1;
    return Math.round(val * unit * sign);
}

// ── Sub-components ────────────────────────────────────────────────────────────

// ── Field wrapper ─────────────────────────────────────────────────────────────
function Field({
    label,
    icon: Icon,
    children,
    hint,
}: {
    label: string;
    icon?: React.ElementType;
    children: React.ReactNode;
    hint?: string;
}) {
    return (
        <div>
            <label className="flex items-center gap-1.5 text-[11px] font-bold text-psi-muted
        uppercase tracking-widest mb-1.5">
                {Icon && <Icon size={10} />}
                {label}
            </label>
            {children}
            {hint && <p className="text-[10px] text-psi-muted mt-1 leading-snug">{hint}</p>}
        </div>
    );
}

// ── Task Row (collapsed view) ─────────────────────────────────────────────────
interface TaskRowProps {
    draft: DraftItem;
    index: number;
    total: number;
    isEditing: boolean;
    onEdit: () => void;
    onDelete: () => void;
    onMoveUp: () => void;
    onMoveDown: () => void;
}

function TaskRow({ draft, index, total, isEditing, onEdit, onDelete, onMoveUp, onMoveDown }: TaskRowProps) {
    const [confirmDelete, setConfirmDelete] = useState(false);

    const priorityDot = PRIORITY_OPTIONS.find(p => p.value === draft.priority)?.dot ?? 'bg-psi-muted';

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20, height: 0 }}
            transition={{ duration: 0.2 }}
            className={`
        group flex items-start gap-2 p-3 rounded-xl border transition-all duration-150
        ${isEditing
                    ? 'border-psi-action bg-psi-action-subtle shadow-md'
                    : 'border-psi bg-psi-surface hover:border-psi-strong hover:bg-psi-raised'
                }
      `}
        >
            {/* Drag handle (decorative) */}
            <div className="flex-shrink-0 mt-1 text-psi-muted opacity-40 cursor-grab">
                <GripVertical size={14} />
            </div>

            {/* Step number */}
            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-psi-subtle border border-psi
        flex items-center justify-center mt-0.5">
                <span className="text-[10px] font-bold text-psi-muted">{index + 1}</span>
            </div>

            {/* Main content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${priorityDot}`} />
                    <p className="text-sm font-semibold text-psi-primary leading-snug truncate max-w-[200px]">
                        {draft.title || <span className="italic text-psi-muted">Untitled task</span>}
                    </p>
                    {draft.category && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase
              tracking-widest badge-neutral">
                            {draft.category}
                        </span>
                    )}
                    {draft.requiresValidation && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase
              tracking-widest badge-warning flex items-center gap-0.5">
                            <ShieldCheck size={8} /> Validated
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="text-[10px] text-psi-muted flex items-center gap-1">
                        <Clock size={9} />
                        {formatOffset(draft.deadlineOffsetHours)}
                    </span>
                    <span className="text-[10px] text-psi-muted font-mono truncate max-w-[160px]">
                        {draft.actionRoute}
                    </span>
                </div>
            </div>

            {/* Controls */}
            <div className="flex-shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100
        transition-opacity">
                {/* Up/Down */}
                <button
                    onClick={onMoveUp}
                    disabled={index === 0}
                    title="Move up"
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-psi-muted
            hover:bg-psi-subtle hover:text-psi-primary transition-colors
            disabled:opacity-20 disabled:cursor-not-allowed"
                >
                    <ChevronUp size={13} />
                </button>
                <button
                    onClick={onMoveDown}
                    disabled={index === total - 1}
                    title="Move down"
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-psi-muted
            hover:bg-psi-subtle hover:text-psi-primary transition-colors
            disabled:opacity-20 disabled:cursor-not-allowed"
                >
                    <ChevronDown size={13} />
                </button>

                {/* Edit */}
                <button
                    onClick={onEdit}
                    title="Edit task"
                    className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors
            ${isEditing
                            ? 'bg-psi-action text-slate-900 dark:text-white'
                            : 'text-psi-muted hover:bg-psi-subtle hover:text-psi-primary'
                        }`}
                >
                    <Pencil size={12} />
                </button>

                {/* Delete */}
                {confirmDelete ? (
                    <div className="flex items-center gap-1">
                        <button
                            onClick={onDelete}
                            className="px-2 py-1 rounded-lg bg-rose-500 text-slate-900 dark:text-white text-[10px] font-bold"
                        >
                            Yes
                        </button>
                        <button
                            onClick={() => setConfirmDelete(false)}
                            className="px-2 py-1 rounded-lg bg-psi-subtle text-psi-muted text-[10px] font-bold"
                        >
                            No
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => setConfirmDelete(true)}
                        title="Delete task"
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-psi-muted
              hover:bg-rose-500/10 hover:text-rose-600 transition-colors"
                    >
                        <Trash2 size={12} />
                    </button>
                )}
            </div>
        </motion.div>
    );
}

// ── Task Editor Form ──────────────────────────────────────────────────────────
interface TaskEditorProps {
    key?: React.Key;
    draft: DraftItem;
    onChange: (updated: DraftItem) => void;
    onClose: () => void;
}

function TaskEditor({ draft, onChange, onClose }: TaskEditorProps) {
    const baseId = useId();

    // Local offset display — shows friendly string, parses on blur
    const [offsetText, setOffsetText] = useState(formatOffset(draft.deadlineOffsetHours));
    const [offsetError, setOffsetError] = useState(false);
    const [showRouteSuggestions, setShowRouteSuggestions] = useState(false);

    function set<K extends keyof DraftItem>(key: K, value: DraftItem[K]) {
        onChange({ ...draft, [key]: value });
    }

    function handleOffsetBlur() {
        const parsed = parseOffset(offsetText);
        if (parsed === null) {
            setOffsetError(true);
        } else {
            setOffsetError(false);
            set('deadlineOffsetHours', parsed);
            setOffsetText(formatOffset(parsed));
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className="overflow-hidden"
        >
            <div className="mt-2 p-4 rounded-xl border border-psi-action/30 bg-psi-action-subtle
        space-y-4">
                {/* Row 1 — Title + Template ID */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Task Title" icon={Pencil}>
                        <input
                            id={`${baseId}-title`}
                            type="text"
                            value={draft.title}
                            onChange={e => set('title', e.target.value)}
                            placeholder="e.g. Upload Passport Copy"
                            className="psi-input w-full px-3 py-2 text-sm"
                        />
                    </Field>
                    <Field
                        label="Action Button Label"
                        hint="Text shown on the CTA button"
                    >
                        <input
                            id={`${baseId}-label`}
                            type="text"
                            value={draft.actionLabel ?? ''}
                            onChange={e => set('actionLabel', e.target.value)}
                            placeholder="e.g. Upload Document"
                            className="psi-input w-full px-3 py-2 text-sm"
                        />
                    </Field>
                </div>

                {/* Row 2 — Description */}
                <Field label="Description" icon={AlignLeft}>
                    <textarea
                        id={`${baseId}-desc`}
                        value={draft.description}
                        onChange={e => set('description', e.target.value)}
                        rows={3}
                        placeholder="Explain what the user must do and why it matters..."
                        className="psi-input w-full px-3 py-2 text-sm resize-y min-h-[72px]"
                    />
                </Field>

                {/* Row 3 — Deadline offset + Route */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field
                        label="Deadline Offset"
                        icon={Clock}
                        hint={offsetError
                            ? '⚠ Use format: "3 days before event" or "48 hours after event"'
                            : 'Relative to event start date'
                        }
                    >
                        <input
                            id={`${baseId}-offset`}
                            type="text"
                            value={offsetText}
                            onChange={e => { setOffsetText(e.target.value); setOffsetError(false); }}
                            onBlur={handleOffsetBlur}
                            placeholder="e.g. 7 days before event"
                            className={`psi-input w-full px-3 py-2 text-sm font-mono
                ${offsetError ? 'border-rose-500 ring-1 ring-rose-500/30' : ''}`}
                        />
                    </Field>

                    <Field label="App Route" icon={Route} hint="Use {eventId} as placeholder">
                        <div className="relative">
                            <input
                                id={`${baseId}-route`}
                                type="text"
                                value={draft.actionRoute}
                                onChange={e => set('actionRoute', e.target.value)}
                                onFocus={() => setShowRouteSuggestions(true)}
                                onBlur={() => setTimeout(() => setShowRouteSuggestions(false), 150)}
                                placeholder="/events/{eventId}/documents"
                                className="psi-input w-full px-3 py-2 text-sm font-mono"
                            />
                            <AnimatePresence>
                                {showRouteSuggestions && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -4 }}
                                        className="absolute z-50 top-full mt-1 w-full rounded-xl border border-psi
                      bg-psi-raised shadow-xl overflow-hidden max-h-44 overflow-y-auto"
                                    >
                                        {ROUTE_SUGGESTIONS.map(r => (
                                            <button
                                                key={r}
                                                type="button"
                                                onMouseDown={() => set('actionRoute', r)}
                                                className="w-full text-left px-3 py-2 text-xs font-mono
                          text-psi-secondary hover:bg-psi-subtle hover:text-psi-primary
                          transition-colors border-b border-psi last:border-0"
                                            >
                                                {r}
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </Field>
                </div>

                {/* Row 4 — Phase + Priority + Category */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Field label="Phase">
                        <select
                            id={`${baseId}-phase`}
                            value={draft.phase}
                            onChange={e => set('phase', e.target.value as DraftItem['phase'])}
                            className="psi-input w-full px-3 py-2 text-sm"
                        >
                            {PHASE_OPTIONS.map(o => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                    </Field>
                    <Field label="Priority">
                        <select
                            id={`${baseId}-priority`}
                            value={draft.priority}
                            onChange={e => set('priority', e.target.value as DraftItem['priority'])}
                            className="psi-input w-full px-3 py-2 text-sm"
                        >
                            {PRIORITY_OPTIONS.map(o => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                    </Field>
                    <Field label="Category" icon={Tag}>
                        <select
                            id={`${baseId}-cat`}
                            value={draft.category ?? ''}
                            onChange={e => set('category', e.target.value || undefined)}
                            className="psi-input w-full px-3 py-2 text-sm"
                        >
                            <option value="">— none —</option>
                            {CATEGORY_OPTIONS.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </Field>
                </div>

                {/* Row 5 — Template ID + Validation toggle */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                    <Field
                        label="Template ID"
                        hint="Stable snake_case key — used in Firestore doc IDs"
                    >
                        <input
                            id={`${baseId}-tid`}
                            type="text"
                            value={draft.templateId}
                            onChange={e => set('templateId', e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                            placeholder="upload_passport"
                            className="psi-input w-full px-3 py-2 text-sm font-mono"
                        />
                    </Field>

                    {/* Validation toggle */}
                    <div className="flex items-center gap-3 py-2">
                        <button
                            type="button"
                            id={`${baseId}-validation`}
                            role="switch"
                            aria-checked={draft.requiresValidation}
                            onClick={() => set('requiresValidation', !draft.requiresValidation)}
                            className={`
                relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-300
                focus:outline-none focus-visible:ring-2 focus-visible:ring-psi-action/60
                ${draft.requiresValidation ? 'bg-amber-500' : 'bg-psi-subtle border border-psi'}
              `}
                        >
                            <div className={`
                absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm
                transition-transform duration-300
                ${draft.requiresValidation ? 'translate-x-5' : 'translate-x-0.5'}
              `} />
                        </button>
                        <div>
                            <p className="text-sm font-semibold text-psi-primary flex items-center gap-1.5">
                                <ShieldCheck size={13} className={draft.requiresValidation ? 'text-amber-500' : 'text-psi-muted'} />
                                Requires Manager Validation
                            </p>
                            <p className="text-[10px] text-psi-muted">
                                Completed status won't count until a manager approves
                            </p>
                        </div>
                    </div>
                </div>

                {/* Done button */}
                <div className="flex justify-end">
                    <button
                        onClick={onClose}
                        className="btn-accent flex items-center gap-2 px-4 py-2 rounded-xl
              text-sm font-semibold"
                    >
                        <Save size={13} />
                        Save & Close
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

// ── Template Panel ────────────────────────────────────────────────────────────
interface TemplatePanelProps {
    role: TemplateRole;
    items: DraftItem[];
    onUpdate: (items: DraftItem[]) => void;
}

function TemplatePanel({ role, items, onUpdate }: TemplatePanelProps) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [showReset, setShowReset] = useState(false);

    const label = role === 'agent' ? 'Agent Template' : 'Manager Template';
    const Icon = role === 'agent' ? Users : Briefcase;
    const accentClass = role === 'agent' ? 'text-blue-500' : 'text-violet-500';

    // ── Mutations ───────────────────────────────────────────────────────────

    function addTask() {
        const draft = blankDraft(role);
        onUpdate([...items, draft]);
        setEditingId(draft._draftId);
    }

    function deleteTask(draftId: string) {
        onUpdate(items.filter(i => i._draftId !== draftId));
        if (editingId === draftId) setEditingId(null);
    }

    function updateTask(updated: DraftItem) {
        onUpdate(items.map(i => i._draftId === updated._draftId ? updated : i));
    }

    function moveUp(idx: number) {
        if (idx === 0) return;
        const next = [...items];
        [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
        onUpdate(next);
    }

    function moveDown(idx: number) {
        if (idx === items.length - 1) return;
        const next = [...items];
        [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
        onUpdate(next);
    }

    function handleReset() {
        onUpdate(seedDrafts(role));
        setEditingId(null);
        setShowReset(false);
    }

    function handleCopy() {
        const exportData = items.map(draftToItem);
        navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    return (
        <div className="flex flex-col h-full min-h-0">
            {/* Panel header */}
            <div className="flex items-center justify-between gap-3 mb-4 flex-shrink-0">
                <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-xl bg-psi-subtle flex items-center justify-center`}>
                        <Icon size={16} className={accentClass} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-psi-primary">{label}</h3>
                        <p className="text-[10px] text-psi-muted">
                            {items.length} task{items.length !== 1 ? 's' : ''} configured
                        </p>
                    </div>
                </div>

                {/* Panel actions */}
                <div className="flex items-center gap-1.5">
                    {/* Copy JSON */}
                    <button
                        onClick={handleCopy}
                        title="Copy as JSON"
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-psi
              text-psi-muted hover:text-psi-primary hover:bg-psi-subtle
              transition-colors text-xs font-medium"
                    >
                        {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                        {copied ? 'Copied!' : 'Export'}
                    </button>

                    {/* Reset */}
                    {showReset ? (
                        <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-rose-600 font-medium">Reset to defaults?</span>
                            <button
                                onClick={handleReset}
                                className="px-2 py-1 rounded-lg bg-rose-500 text-slate-900 dark:text-white text-[10px] font-bold"
                            >Yes</button>
                            <button
                                onClick={() => setShowReset(false)}
                                className="px-2 py-1 rounded-lg bg-psi-subtle text-psi-muted text-[10px] font-bold"
                            >No</button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowReset(true)}
                            title="Reset to seed defaults"
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-psi
                text-psi-muted hover:text-rose-600 hover:border-rose-500/40
                hover:bg-rose-500/5 transition-colors"
                        >
                            <RotateCcw size={13} />
                        </button>
                    )}
                </div>
            </div>

            {/* Task list */}
            <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0 pr-0.5">
                <AnimatePresence initial={false}>
                    {items.map((draft, idx) => (
                        <React.Fragment key={draft._draftId}>
                            <TaskRow
                                draft={draft}
                                index={idx}
                                total={items.length}
                                isEditing={editingId === draft._draftId}
                                onEdit={() => setEditingId(editingId === draft._draftId ? null : draft._draftId)}
                                onDelete={() => deleteTask(draft._draftId)}
                                onMoveUp={() => moveUp(idx)}
                                onMoveDown={() => moveDown(idx)}
                            />
                            <AnimatePresence>
                                {editingId === draft._draftId && (
                                    <TaskEditor
                                        key="editor"
                                        draft={draft}
                                        onChange={updateTask}
                                        onClose={() => setEditingId(null)}
                                    />
                                )}
                            </AnimatePresence>
                        </React.Fragment>
                    ))}
                </AnimatePresence>

                {/* Empty state */}
                {items.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="w-12 h-12 rounded-2xl bg-psi-subtle flex items-center
              justify-center mb-3">
                            <Icon size={22} className="text-psi-muted" />
                        </div>
                        <p className="text-sm font-semibold text-psi-primary">No tasks yet</p>
                        <p className="text-xs text-psi-muted mt-1">
                            Click "Add Task Step" below to build the default checklist.
                        </p>
                    </div>
                )}
            </div>

            {/* Add task CTA */}
            <motion.button
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.98 }}
                onClick={addTask}
                className="mt-4 flex-shrink-0 w-full flex items-center justify-center gap-2
          py-2.5 rounded-xl border-2 border-dashed border-psi-action/40
          text-psi-action hover:border-psi-action hover:bg-psi-action-subtle
          transition-all duration-200 text-sm font-semibold"
            >
                <Plus size={15} />
                Add Task Step
            </motion.button>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN EXPORT — ChecklistBuilder
// ═══════════════════════════════════════════════════════════════════════════

export default function ChecklistBuilder() {
    const [agentItems, setAgentItems] = useState<DraftItem[]>(() => seedDrafts('agent'));
    const [managerItems, setManagerItems] = useState<DraftItem[]>(() => seedDrafts('manager'));
    const [saved, setSaved] = useState(false);

    /** Total pending changes indicator */
    const totalTasks = agentItems.length + managerItems.length;

    function handleSave() {
        // In production: write to Firestore `checklist_templates/{role}` collections.
        // For now, log the export-ready payload to console for review.
        const payload = {
            agent: agentItems.map(draftToItem),
            manager: managerItems.map(draftToItem),
        };
        console.info('[ChecklistBuilder] Template payload ready for Firestore:', payload);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
    }

    return (
        <div className="flex flex-col h-full">
            {/* ── Page header ── */}
            <div className="flex-shrink-0 flex flex-col sm:flex-row sm:items-start
        sm:justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-xl font-extrabold text-psi-primary tracking-tight">
                        Checklist Template Builder
                    </h2>
                    <p className="text-sm text-psi-secondary mt-1">
                        Define the default onboarding task sequence for Agents and Managers. Changes
                        apply to all new event registrations.
                    </p>
                </div>

                {/* Save all */}
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleSave}
                    className="btn-accent self-start flex-shrink-0 flex items-center gap-2
            px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm"
                >
                    {saved ? <Check size={15} /> : <Save size={15} />}
                    {saved ? 'Templates Saved!' : 'Save Templates'}
                </motion.button>
            </div>

            {/* ── Info banner ── */}
            <div className="flex-shrink-0 mb-5 flex items-start gap-3 px-4 py-3 rounded-xl
        border border-blue-400/25 bg-blue-500/5">
                <Info size={15} className="text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-psi-secondary leading-relaxed">
                    Changes here define the <span className="font-bold text-psi-primary">
                        default templates</span> stored in Firestore. Individual event checklists
                    are hydrated from these templates when an agent registers.
                    The <span className="font-mono text-psi-primary">{'{'}eventId{'}'}</span> placeholder
                    in routes is replaced automatically at hydration time.
                    Reorder steps using the ↑↓ arrows — order determines the render sequence.
                </p>
            </div>

            {/* ── Summary bar ── */}
            <div className="flex-shrink-0 flex items-center gap-6 mb-5 px-1">
                <div className="flex items-center gap-1.5">
                    <Users size={13} className="text-blue-500" />
                    <span className="text-xs font-bold text-psi-primary">
                        {agentItems.length}
                    </span>
                    <span className="text-xs text-psi-muted">Agent tasks</span>
                </div>
                <div className="w-px h-3 bg-psi" />
                <div className="flex items-center gap-1.5">
                    <Briefcase size={13} className="text-violet-500" />
                    <span className="text-xs font-bold text-psi-primary">
                        {managerItems.length}
                    </span>
                    <span className="text-xs text-psi-muted">Manager tasks</span>
                </div>
                <div className="w-px h-3 bg-psi" />
                <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-psi-primary">{totalTasks}</span>
                    <span className="text-xs text-psi-muted">total across both templates</span>
                </div>
            </div>

            {/* ── Split panels ── */}
            <div className="flex-1 grid grid-cols-1 xl:grid-cols-2 gap-5 min-h-0">
                {/* Agent panel */}
                <div className="psi-card p-5 flex flex-col min-h-0 max-h-[calc(100vh-340px)]
          xl:max-h-none overflow-hidden">
                    <TemplatePanel
                        role="agent"
                        items={agentItems}
                        onUpdate={setAgentItems}
                    />
                </div>

                {/* Manager panel */}
                <div className="psi-card p-5 flex flex-col min-h-0 max-h-[calc(100vh-340px)]
          xl:max-h-none overflow-hidden">
                    <TemplatePanel
                        role="manager"
                        items={managerItems}
                        onUpdate={setManagerItems}
                    />
                </div>
            </div>
        </div>
    );
}
