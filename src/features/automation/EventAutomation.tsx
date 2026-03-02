/**
 * EventAutomation.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Event Automation System
 * Route: /automation
 *
 * Views:
 *   Dashboard  — KPIs, activity sparkline, quick-fire panel
 *   Rules      — all automation rules with enable/disable/edit/delete
 *   Activity   — live scrolling log feed of all triggered automations
 *   Builder    — 4-step wizard to create a new rule
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    Zap, Play, Pause, Plus, Trash2,
    ChevronRight, ChevronLeft, X,
    Bell, Mail, MessageSquare, Star, Users,
    BarChart2, Clock, CheckCircle2, AlertCircle,
    SkipForward, Edit2, Copy, ToggleLeft, ToggleRight,
    List, Settings2, Activity, Send,
} from 'lucide-react';
import { toast } from 'sonner';
import {
    SEED_RULES, SEED_LOG, TRIGGER_DEFS, ACTION_DEFS,
    STATUS_STYLES, LOG_STATUS_STYLES, getRuleStats, getLogStats,
    type AutomationRule, type LogEntry, type TriggerType,
    type ActionType, type RuleStatus, type LogStatus,
    type AutomationAction,
} from './automationData';

// ── Utility ───────────────────────────────────────────────────────────────────

function cn(...cs: (string | false | undefined)[]) {
    return cs.filter(Boolean).join(' ');
}

function relativeTime(iso: string): string {
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return `${Math.floor(diff)}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

const ACTION_ICONS: Partial<Record<ActionType, React.ElementType>> = {
    PUSH_NOTIFICATION: Bell,
    EMAIL_BLAST: Mail,
    SMS: MessageSquare,
    FEEDBACK_REQUEST: Star,
    NETWORKING_REMINDER: Users,
    SLACK_ALERT: MessageSquare,
    WAITLIST_NOTIFY: Bell,
    CALENDAR_INVITE: Clock,
};

// ── KPI card ──────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, icon: Icon, color }: {
    label: string; value: number | string; sub?: string;
    icon: React.ElementType; color: string;
}) {
    return (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center gap-4">
            <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0', color)}>
                <Icon size={20} className="text-white" />
            </div>
            <div>
                <p className="text-white font-black text-2xl leading-none">{typeof value === 'number' ? value.toLocaleString() : value}</p>
                <p className="text-slate-400 text-xs mt-0.5">{label}</p>
                {sub && <p className="text-slate-600 text-[10px] mt-0.5">{sub}</p>}
            </div>
        </div>
    );
}

// ── Rule status badge ─────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: RuleStatus }) {
    const s = STATUS_STYLES[status];
    return (
        <span className={cn('inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border', s.bg, s.text, s.border)}>
            <span className={cn('w-1.5 h-1.5 rounded-full', s.dot)} />
            {status}
        </span>
    );
}

// ── Rule card ─────────────────────────────────────────────────────────────────

function RuleCard({
    rule, onToggle, onEdit, onDuplicate, onDelete, onFire,
}: {
    rule: AutomationRule;
    onToggle: (id: string) => void;
    onEdit: (rule: AutomationRule) => void;
    onDuplicate: (rule: AutomationRule) => void;
    onDelete: (id: string) => void;
    onFire: (rule: AutomationRule) => void;
}) {
    const tDef = TRIGGER_DEFS[rule.trigger];
    const isActive = rule.status === 'active';

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            className={cn(
                'bg-slate-900 border rounded-2xl p-4 transition-colors',
                isActive ? 'border-slate-800 hover:border-slate-700' : 'border-slate-800/50 opacity-70 hover:opacity-90',
            )}
        >
            <div className="flex items-start gap-3">
                {/* Trigger emoji */}
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 border', tDef.color)}>
                    {tDef.emoji}
                </div>

                {/* Main info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <h3 className="text-white font-bold text-sm">{rule.name}</h3>
                        <StatusBadge status={rule.status} />
                    </div>
                    <p className="text-slate-500 text-xs leading-relaxed mb-2">{rule.description}</p>

                    {/* Trigger → Actions chain */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={cn('text-[9px] font-black px-2 py-0.5 rounded-full border', tDef.color)}>
                            {tDef.label}{rule.triggerOffset ? ` (${rule.triggerOffset}${['CAPACITY_THRESHOLD'].includes(rule.trigger) ? '%' : ' min'})` : ''}
                        </span>
                        <ChevronRight size={10} className="text-slate-600" />
                        {rule.actions.map((a, i) => {
                            const Icon = ACTION_ICONS[a.type] ?? Bell;
                            const adef = ACTION_DEFS[a.type];
                            return (
                                <React.Fragment key={i}>
                                    {i > 0 && <span className="text-slate-700 text-[9px]">+</span>}
                                    <span className={cn('inline-flex items-center gap-1 text-[9px] bg-slate-800 border border-slate-700 rounded-full px-2 py-0.5', adef.color)}>
                                        <Icon size={8} /> {adef.label}
                                    </span>
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>

                {/* Toggle */}
                <button onClick={() => onToggle(rule.id)}
                    className={cn('mt-0.5 transition-colors flex-shrink-0', isActive ? 'text-emerald-400 hover:text-emerald-300' : 'text-slate-600 hover:text-slate-500')}>
                    {isActive ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                </button>
            </div>

            {/* Footer row */}
            <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 text-slate-600 text-xs">
                    <span className="flex items-center gap-1"><Play size={9} /> {rule.runCount} runs</span>
                    {rule.lastTriggered && <span className="flex items-center gap-1"><Clock size={9} /> {relativeTime(rule.lastTriggered)}</span>}
                    {rule.sessionFilter && <span className="text-slate-700">{rule.sessionFilter}</span>}
                </div>
                <div className="flex items-center gap-1">
                    {rule.trigger === 'MANUAL' && (
                        <button onClick={() => onFire(rule)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-600/15 border border-violet-500/20 text-violet-400 text-[10px] font-bold hover:bg-violet-600/25 transition-colors">
                            <Send size={9} /> Fire Now
                        </button>
                    )}
                    <button onClick={() => onDuplicate(rule)} title="Duplicate"
                        className="p-1.5 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-slate-800 transition-colors">
                        <Copy size={12} />
                    </button>
                    <button onClick={() => onEdit(rule)} title="Edit"
                        className="p-1.5 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-slate-800 transition-colors">
                        <Edit2 size={12} />
                    </button>
                    <button onClick={() => onDelete(rule.id)} title="Delete"
                        className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                        <Trash2 size={12} />
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

// ── Activity log row ──────────────────────────────────────────────────────────

function LogRow({ entry, isNew }: { entry: LogEntry; isNew?: boolean }) {
    const s = LOG_STATUS_STYLES[entry.status];
    const tDef = TRIGGER_DEFS[entry.triggerType];
    const Icon = ACTION_ICONS[entry.actionType] ?? Bell;

    return (
        <motion.div
            initial={isNew ? { opacity: 0, x: -8, backgroundColor: 'rgba(16,185,129,0.1)' } : { opacity: 1 }}
            animate={{ opacity: 1, x: 0, backgroundColor: 'transparent' }}
            transition={{ duration: 0.4 }}
            className="flex items-start gap-3 py-3 border-b border-slate-800/60 last:border-0"
        >
            {/* Icon */}
            <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 border text-sm', tDef.color.split(' ').slice(1).join(' '))}>
                {tDef.emoji}
            </div>

            {/* Body */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-white text-xs font-semibold">{entry.actionTitle}</p>
                    <span className={cn('text-[9px] font-black px-1.5 py-0.5 rounded-full', s.bg, s.text)}>
                        {entry.status}
                    </span>
                    {isNew && <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">NEW</span>}
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-slate-500 text-[10px]">
                    <span>{entry.ruleName}</span>
                    <span className="flex items-center gap-0.5"><Icon size={8} /> {ACTION_DEFS[entry.actionType].label}</span>
                    <span className="flex items-center gap-0.5"><Users size={8} /> {entry.recipients.toLocaleString()} recipients</span>
                    {entry.note && <span className="text-slate-600 italic">"{entry.note}"</span>}
                </div>
            </div>

            {/* Timestamp */}
            <span className="text-slate-600 text-[10px] flex-shrink-0 font-mono">{relativeTime(entry.timestamp)}</span>
        </motion.div>
    );
}

// ── Rule Builder (4-step wizard) ──────────────────────────────────────────────

type BuilderStep = 0 | 1 | 2 | 3;

const TRIGGER_OPTIONS = Object.entries(TRIGGER_DEFS) as [TriggerType, typeof TRIGGER_DEFS[TriggerType]][];
const ACTION_OPTIONS = Object.entries(ACTION_DEFS) as [ActionType, typeof ACTION_DEFS[ActionType]][];

function RuleBuilder({
    existing,
    onSave,
    onClose,
}: {
    existing?: AutomationRule;
    onSave: (rule: AutomationRule) => void;
    onClose: () => void;
}) {
    const [step, setStep] = useState<BuilderStep>(0);
    const [name, setName] = useState(existing?.name ?? '');
    const [desc, setDesc] = useState(existing?.description ?? '');
    const [trigger, setTrigger] = useState<TriggerType>(existing?.trigger ?? 'TIME_BEFORE_SESSION');
    const [offset, setOffset] = useState<number>(existing?.triggerOffset ?? 60);
    const [sessionFilter, setSessionFilter] = useState(existing?.sessionFilter ?? 'All Sessions');
    const [actions, setActions] = useState<AutomationAction[]>(existing?.actions ?? [{
        type: 'PUSH_NOTIFICATION',
        title: '',
        body: '',
        targetSegment: 'All Attendees',
    }]);

    const tDef = TRIGGER_DEFS[trigger];
    const canAdvance = [
        !!trigger,
        !!name.trim(),
        actions.every(a => a.title.trim()),
        true,
    ][step];

    function addAction() {
        setActions(prev => [...prev, { type: 'PUSH_NOTIFICATION', title: '', body: '', targetSegment: 'All Attendees' }]);
    }
    function removeAction(i: number) { setActions(prev => prev.filter((_, idx) => idx !== i)); }
    function updateAction(i: number, patch: Partial<AutomationAction>) {
        setActions(prev => prev.map((a, idx) => idx === i ? { ...a, ...patch } : a));
    }

    function handleSave() {
        const rule: AutomationRule = {
            id: existing?.id ?? `r${Date.now()}`,
            name, description: desc, trigger,
            triggerOffset: tDef.hasDelay ? offset : undefined,
            sessionFilter, actions, status: 'active',
            runCount: existing?.runCount ?? 0,
            lastTriggered: existing?.lastTriggered,
            createdAt: existing?.createdAt ?? new Date().toISOString(),
            tags: [],
        };
        onSave(rule);
        onClose();
    }

    const steps = ['Trigger', 'Details', 'Actions', 'Review'];

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, y: 24 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95 }}
                onClick={e => e.stopPropagation()}
                className="bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
            >
                {/* Header */}
                <div className="px-6 pt-6 pb-4 border-b border-slate-800 flex-shrink-0">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-white font-black text-lg">{existing ? 'Edit Automation' : 'New Automation Rule'}</h2>
                        <button onClick={onClose} className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors">
                            <X size={16} />
                        </button>
                    </div>
                    {/* Step bar */}
                    <div className="flex gap-1">
                        {steps.map((s, i) => (
                            <div key={s} className="flex-1 flex flex-col items-center gap-1">
                                <div className={cn('w-full h-1 rounded-full transition-all', i <= step ? 'bg-violet-500' : 'bg-slate-800')} />
                                <span className={cn('text-[9px] font-black uppercase tracking-wider', i === step ? 'text-violet-400' : i < step ? 'text-slate-500' : 'text-slate-700')}>{s}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <AnimatePresence mode="wait">

                        {/* STEP 0 — Trigger */}
                        {step === 0 && (
                            <motion.div key="s0" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                                className="space-y-3">
                                <p className="text-slate-500 text-xs mb-4">What event should start this automation?</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {TRIGGER_OPTIONS.map(([key, def]) => (
                                        <button key={key} onClick={() => setTrigger(key)}
                                            className={cn('text-left p-3 rounded-xl border transition-all',
                                                trigger === key ? 'border-violet-500 bg-violet-500/10' : 'border-slate-800 bg-slate-900 hover:border-slate-700')}>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-lg">{def.emoji}</span>
                                                <span className="text-white text-xs font-bold">{def.label}</span>
                                                {trigger === key && <CheckCircle2 size={12} className="text-violet-400 ml-auto" />}
                                            </div>
                                            <p className="text-slate-500 text-[10px] leading-relaxed">{def.description}</p>
                                        </button>
                                    ))}
                                </div>
                                {tDef.hasDelay && (
                                    <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-xl p-4">
                                        <label className="text-slate-400 text-xs whitespace-nowrap">
                                            {trigger === 'CAPACITY_THRESHOLD' ? 'At' : 'Fire'}
                                        </label>
                                        <input type="number" value={offset} onChange={e => setOffset(Number(e.target.value))}
                                            className="w-24 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-sm text-center focus:outline-none focus:border-violet-500" />
                                        <span className="text-slate-400 text-xs">{tDef.delayLabel}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-xl p-4">
                                    <label className="text-slate-400 text-xs whitespace-nowrap">Session filter</label>
                                    <select value={sessionFilter} onChange={e => setSessionFilter(e.target.value)}
                                        className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-violet-500">
                                        {['All Sessions', 'Keynote', 'VIP Sessions', 'Workshop', 'Investment Track', 'ESG Track'].map(o => (
                                            <option key={o}>{o}</option>
                                        ))}
                                    </select>
                                </div>
                            </motion.div>
                        )}

                        {/* STEP 1 — Details */}
                        {step === 1 && (
                            <motion.div key="s1" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                                className="space-y-4">
                                <p className="text-slate-500 text-xs mb-4">Give your automation a clear name for your team.</p>
                                <div>
                                    <label className="text-slate-400 text-xs font-bold mb-1.5 block">Rule Name *</label>
                                    <input value={name} onChange={e => setName(e.target.value)}
                                        placeholder="e.g. Session 1-Hour Reminder"
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 text-sm" />
                                </div>
                                <div>
                                    <label className="text-slate-400 text-xs font-bold mb-1.5 block">Description</label>
                                    <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3}
                                        placeholder="What does this automation do?"
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 text-sm resize-none" />
                                </div>
                                {/* Trigger summary */}
                                <div className={cn('flex items-center gap-3 rounded-xl border p-3', tDef.color.split(' ').slice(1).join(' '))}>
                                    <span className="text-2xl">{tDef.emoji}</span>
                                    <div>
                                        <p className={cn('text-xs font-bold', tDef.color.split(' ')[0])}>{tDef.label}{tDef.hasDelay ? ` · ${offset} ${trigger === 'CAPACITY_THRESHOLD' ? '%' : 'min'}` : ''}</p>
                                        <p className="text-slate-500 text-[10px]">{sessionFilter}</p>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* STEP 2 — Actions */}
                        {step === 2 && (
                            <motion.div key="s2" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                                className="space-y-4">
                                <p className="text-slate-500 text-xs mb-4">Define what happens when this automation fires. You can chain multiple actions.</p>
                                {actions.map((action, i) => (
                                    <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-400 text-[10px] font-black uppercase tracking-wider">Action {i + 1}</span>
                                            {actions.length > 1 && (
                                                <button onClick={() => removeAction(i)} className="p-1 rounded text-slate-600 hover:text-red-400 transition-colors">
                                                    <X size={12} />
                                                </button>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="text-slate-500 text-[10px] font-bold mb-1 block">Action Type</label>
                                                <select value={action.type}
                                                    onChange={e => updateAction(i, { type: e.target.value as ActionType })}
                                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-violet-500">
                                                    {ACTION_OPTIONS.map(([key, def]) => (
                                                        <option key={key} value={key}>{def.emoji} {def.label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-slate-500 text-[10px] font-bold mb-1 block">Target</label>
                                                <select value={action.targetSegment}
                                                    onChange={e => updateAction(i, { targetSegment: e.target.value as AutomationAction['targetSegment'] })}
                                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-violet-500">
                                                    {['All Attendees', 'Session Attendees', 'VIP Only', 'Admins Only'].map(o => <option key={o}>{o}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-slate-500 text-[10px] font-bold mb-1 block">Title / Subject *</label>
                                            <input value={action.title}
                                                onChange={e => updateAction(i, { title: e.target.value })}
                                                placeholder="e.g. ⏰ Session Starting in 1 Hour"
                                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs placeholder-slate-600 focus:outline-none focus:border-violet-500" />
                                        </div>
                                        <div>
                                            <label className="text-slate-500 text-[10px] font-bold mb-1 block">Body <span className="normal-case font-normal text-slate-600">(use {'{{session_name}}'} etc)</span></label>
                                            <textarea value={action.body}
                                                onChange={e => updateAction(i, { body: e.target.value })}
                                                rows={2} placeholder="Message body…"
                                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs placeholder-slate-600 focus:outline-none focus:border-violet-500 resize-none" />
                                        </div>
                                        {/* Token chips */}
                                        <div className="flex flex-wrap gap-1">
                                            {['{{session_name}}', '{{session_time}}', '{{session_room}}', '{{speaker_name}}', '{{attendee_count}}'].map(t => (
                                                <button key={t} onClick={() => updateAction(i, { body: action.body + t })}
                                                    className="text-[9px] bg-slate-800 border border-slate-700 text-slate-400 px-1.5 py-0.5 rounded hover:text-white hover:border-slate-500 transition-colors font-mono">
                                                    {t}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                                {actions.length < 4 && (
                                    <button onClick={addAction}
                                        className="w-full py-2.5 border-2 border-dashed border-slate-700 rounded-xl text-slate-500 text-xs hover:border-violet-500/50 hover:text-violet-400 transition-colors flex items-center justify-center gap-2">
                                        <Plus size={13} /> Add Another Action
                                    </button>
                                )}
                            </motion.div>
                        )}

                        {/* STEP 3 — Review */}
                        {step === 3 && (
                            <motion.div key="s3" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                                className="space-y-4">
                                <p className="text-slate-500 text-xs mb-4">Review your automation before saving. It will be set to <strong className="text-white">Active</strong> immediately.</p>

                                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
                                    <p className="text-white font-bold text-sm">{name}</p>
                                    {desc && <p className="text-slate-500 text-xs">{desc}</p>}
                                </div>

                                <div className={cn('flex items-center gap-3 rounded-xl border p-3', TRIGGER_DEFS[trigger].color.split(' ').slice(1).join(' '))}>
                                    <span className="text-2xl">{TRIGGER_DEFS[trigger].emoji}</span>
                                    <div>
                                        <p className={cn('text-xs font-bold', TRIGGER_DEFS[trigger].color.split(' ')[0])}>
                                            TRIGGER: {TRIGGER_DEFS[trigger].label}
                                            {TRIGGER_DEFS[trigger].hasDelay && ` · ${offset} ${trigger === 'CAPACITY_THRESHOLD' ? '%' : 'min'}`}
                                        </p>
                                        <p className="text-slate-500 text-[10px]">{sessionFilter}</p>
                                    </div>
                                </div>

                                {actions.map((a, i) => {
                                    const def = ACTION_DEFS[a.type];
                                    const Icon = ACTION_ICONS[a.type] ?? Bell;
                                    return (
                                        <div key={i} className="flex items-start gap-3 bg-slate-900 border border-slate-800 rounded-xl p-3">
                                            <div className="flex items-center gap-2 w-8 pt-0.5 flex-shrink-0">
                                                {i === 0 ? <ChevronRight size={12} className="text-slate-600" /> : <span className="text-slate-600 text-xs">+</span>}
                                            </div>
                                            <Icon size={14} className={cn('mt-0.5 flex-shrink-0', def.color)} />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-white text-xs font-semibold">{def.label} → {a.targetSegment}</p>
                                                <p className="text-slate-400 text-xs font-bold mt-0.5">"{a.title}"</p>
                                                {a.body && <p className="text-slate-600 text-[10px] mt-0.5 italic truncate">{a.body}</p>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer nav */}
                <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between flex-shrink-0">
                    <button
                        onClick={() => step === 0 ? onClose() : setStep((step - 1) as BuilderStep)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-sm font-semibold hover:bg-slate-700 transition-colors">
                        {step === 0 ? 'Cancel' : <><ChevronLeft size={14} /> Back</>}
                    </button>
                    <div className="flex gap-2">
                        {step < 3 ? (
                            <button
                                disabled={!canAdvance}
                                onClick={() => setStep((step + 1) as BuilderStep)}
                                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                Next <ChevronRight size={14} />
                            </button>
                        ) : (
                            <button
                                disabled={!name.trim() || actions.some(a => !a.title.trim())}
                                onClick={handleSave}
                                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                <CheckCircle2 size={14} /> Save & Activate
                            </button>
                        )}
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}

// ── Simulate notification floater ─────────────────────────────────────────────

function SimNotification({ msg, onDismiss }: { msg: string; onDismiss: () => void }) {
    useEffect(() => {
        const t = setTimeout(onDismiss, 5000);
        return () => clearTimeout(t);
    }, [onDismiss]);

    return (
        <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.97 }}
            className="fixed top-16 right-4 z-[60] bg-slate-900 border border-emerald-500/30 rounded-2xl px-4 py-3 max-w-xs shadow-2xl shadow-emerald-900/20"
        >
            <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <p className="text-emerald-400 text-[10px] font-black uppercase tracking-wider">Test Notification</p>
            </div>
            <p className="text-white text-sm font-semibold">{msg}</p>
            <p className="text-slate-500 text-xs mt-0.5">This is a simulation — no real notification was sent</p>
        </motion.div>
    );
}

// ── View types ────────────────────────────────────────────────────────────────

type AppView = 'dashboard' | 'rules' | 'activity' | 'builder';

// ── Main component ────────────────────────────────────────────────────────────

export default function EventAutomation() {
    const [view, setView] = useState<AppView>('dashboard');
    const [rules, setRules] = useState<AutomationRule[]>(SEED_RULES);
    const [log, setLog] = useState<LogEntry[]>(SEED_LOG);
    const [newLogIds, setNewLogIds] = useState<Set<string>>(new Set());
    const [editingRule, setEditingRule] = useState<AutomationRule | undefined>();
    const [showBuilder, setShowBuilder] = useState(false);
    const [simMsg, setSimMsg] = useState<string | null>(null);
    const [filterStatus, setFilterStatus] = useState<RuleStatus | 'all'>('all');
    const logEndRef = useRef<HTMLDivElement>(null);

    // Simulate occasional live log entries
    useEffect(() => {
        const t = setInterval(() => {
            const activeRules = rules.filter(r => r.status === 'active' && r.trigger !== 'MANUAL');
            if (!activeRules.length) return;
            const rule = activeRules[Math.floor(Math.random() * activeRules.length)];
            const action = rule.actions[0];
            const id = `l_live_${Date.now()}`;
            const entry: LogEntry = {
                id, ruleId: rule.id, ruleName: rule.name,
                triggerType: rule.trigger, actionType: action.type,
                actionTitle: action.title, recipients: Math.floor(Math.random() * 300 + 50),
                status: Math.random() > 0.08 ? 'sent' : 'failed',
                timestamp: new Date().toISOString(),
            };
            setLog(prev => [entry, ...prev].slice(0, 100));
            setNewLogIds(prev => new Set([...prev, id]));
            setTimeout(() => setNewLogIds(prev => { const n = new Set(prev); n.delete(id); return n; }), 5000);
            setRules(prev => prev.map(r => r.id === rule.id
                ? { ...r, runCount: r.runCount + 1, lastTriggered: new Date().toISOString() }
                : r
            ));
        }, 18000);
        return () => clearInterval(t);
    }, [rules]);

    function toggleRule(id: string) {
        setRules(prev => prev.map(r => {
            if (r.id !== id) return r;
            const next: RuleStatus = r.status === 'active' ? 'paused' : 'active';
            toast.success(`"${r.name}" ${next === 'active' ? 'activated' : 'paused'}`);
            return { ...r, status: next };
        }));
    }

    function deleteRule(id: string) {
        const rule = rules.find(r => r.id === id);
        setRules(prev => prev.filter(r => r.id !== id));
        toast.success(`Deleted: ${rule?.name}`);
    }

    function duplicateRule(rule: AutomationRule) {
        const copy: AutomationRule = { ...rule, id: `r_${Date.now()}`, name: `${rule.name} (Copy)`, runCount: 0, lastTriggered: undefined, status: 'draft' };
        setRules(prev => [copy, ...prev]);
        toast.success('Rule duplicated as Draft');
    }

    function saveRule(rule: AutomationRule) {
        setRules(prev => {
            const existing = prev.find(r => r.id === rule.id);
            if (existing) return prev.map(r => r.id === rule.id ? rule : r);
            return [rule, ...prev];
        });
        toast.success(editingRule ? 'Rule updated' : 'Automation created and activated!');
        setEditingRule(undefined);
    }

    function fireManual(rule: AutomationRule) {
        const action = rule.actions[0];
        const id = `l_manual_${Date.now()}`;
        const entry: LogEntry = {
            id, ruleId: rule.id, ruleName: rule.name,
            triggerType: 'MANUAL', actionType: action.type,
            actionTitle: action.title, recipients: 412,
            status: 'sent', timestamp: new Date().toISOString(),
            note: 'Manually fired by admin',
        };
        setLog(prev => [entry, ...prev]);
        setNewLogIds(prev => new Set([...prev, id]));
        setSimMsg(action.title);
        setRules(prev => prev.map(r => r.id === rule.id
            ? { ...r, runCount: r.runCount + 1, lastTriggered: new Date().toISOString() }
            : r
        ));
        toast.success(`"${rule.name}" fired manually to 412 attendees`);
    }

    const ruleStats = getRuleStats(rules);
    const logStats = getLogStats(log);

    const filteredRules = useMemo(() =>
        filterStatus === 'all' ? rules : rules.filter(r => r.status === filterStatus),
        [rules, filterStatus]);

    return (
        <div className="h-screen bg-slate-950 flex flex-col font-sans overflow-hidden">

            {/* ── Header ───────────────────────────────────────────────── */}
            <div className="bg-slate-900 border-b border-slate-800 px-5 py-3.5 flex-shrink-0">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                        <div className="flex items-center gap-2">
                            <Zap size={18} className="text-violet-400" />
                            <h1 className="text-white font-extrabold text-base">Event Automation</h1>
                        </div>
                        <p className="text-slate-500 text-xs mt-0.5">
                            {ruleStats.active} active rules · {logStats.totalRecipients.toLocaleString()} notifications sent today
                        </p>
                    </div>
                    <button
                        onClick={() => { setEditingRule(undefined); setShowBuilder(true); }}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold transition-colors shadow-lg">
                        <Plus size={14} /> New Automation
                    </button>
                </div>
            </div>

            {/* ── Tab bar ─────────────────────────────────────────────── */}
            <div className="flex border-b border-slate-800 px-5 bg-slate-900/40 flex-shrink-0">
                {([
                    { id: 'dashboard', label: 'Overview', icon: BarChart2 },
                    { id: 'rules', label: `Rules (${ruleStats.total})`, icon: Settings2 },
                    { id: 'activity', label: `Activity (${log.length})`, icon: Activity },
                ] as { id: AppView; label: string; icon: React.ElementType }[]).map(t => (
                    <button key={t.id} onClick={() => setView(t.id)}
                        className={cn('flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 transition-colors',
                            view === t.id ? 'border-violet-500 text-violet-400' : 'border-transparent text-slate-500 hover:text-slate-300')}>
                        <t.icon size={13} /> {t.label}
                    </button>
                ))}
            </div>

            {/* ── Content ──────────────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto">
                <AnimatePresence mode="wait">

                    {/* ── DASHBOARD ──────────────────────────────────────── */}
                    {view === 'dashboard' && (
                        <motion.div key="dash" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="p-5 space-y-6">

                            {/* KPIs */}
                            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                                <KpiCard label="Active Rules" value={ruleStats.active} sub={`${ruleStats.paused} paused · ${ruleStats.draft} draft`} icon={Zap} color="bg-violet-600" />
                                <KpiCard label="Total Runs Today" value={ruleStats.totalRuns} sub="across all rules" icon={Play} color="bg-emerald-600" />
                                <KpiCard label="Notifications Sent" value={logStats.totalRecipients} sub={`${logStats.failed} failed`} icon={Bell} color="bg-sky-600" />
                                <KpiCard label="Success Rate" value={`${Math.round((logStats.sent / Math.max(logStats.total, 1)) * 100)}%`} sub={`${logStats.sent}/${logStats.total} fired`} icon={CheckCircle2} color="bg-teal-600" />
                            </div>

                            {/* Active rule quick-view */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-wider mb-3">Active Automations</p>
                                    <div className="space-y-2">
                                        {rules.filter(r => r.status === 'active').map(rule => {
                                            const tDef = TRIGGER_DEFS[rule.trigger];
                                            return (
                                                <div key={rule.id} className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-xl p-3">
                                                    <span className="text-lg">{tDef.emoji}</span>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-white text-xs font-semibold truncate">{rule.name}</p>
                                                        <p className="text-slate-500 text-[10px]">{rule.runCount} runs · {rule.actions.length} action{rule.actions.length !== 1 ? 's' : ''}</p>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                                        <span className="text-emerald-400 text-[9px] font-black">LIVE</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Recent log */}
                                <div>
                                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-wider mb-3">Recent Activity</p>
                                    <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 divide-y divide-slate-800/60">
                                        {log.slice(0, 6).map(entry => (
                                            <LogRow key={entry.id} entry={entry} isNew={newLogIds.has(entry.id)} />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Trigger type breakdown */}
                            <div>
                                <p className="text-slate-500 text-[10px] font-black uppercase tracking-wider mb-3">Rules by Trigger Type</p>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {Object.entries(TRIGGER_DEFS).map(([key, def]) => {
                                        const count = rules.filter(r => r.trigger === key).length;
                                        if (!count) return null;
                                        return (
                                            <div key={key} className={cn('flex items-center gap-2 p-3 rounded-xl border', def.color.split(' ').slice(1).join(' '))}>
                                                <span className="text-xl">{def.emoji}</span>
                                                <div>
                                                    <p className={cn('text-xs font-bold', def.color.split(' ')[0])}>{count} rule{count !== 1 ? 's' : ''}</p>
                                                    <p className="text-slate-500 text-[9px]">{def.label}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* ── RULES ─────────────────────────────────────────── */}
                    {view === 'rules' && (
                        <motion.div key="rules" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="p-5 space-y-4">

                            {/* Filter bar */}
                            <div className="flex items-center gap-2 flex-wrap">
                                {(['all', 'active', 'paused', 'draft', 'archived'] as const).map(s => (
                                    <button key={s} onClick={() => setFilterStatus(s)}
                                        className={cn('px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all',
                                            filterStatus === s
                                                ? s === 'all' ? 'bg-violet-600 border-violet-500 text-white' : `${STATUS_STYLES[s as RuleStatus]?.bg} ${STATUS_STYLES[s as RuleStatus]?.text} ${STATUS_STYLES[s as RuleStatus]?.border}`
                                                : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700')}>
                                        {s === 'all' ? `All (${rules.length})` : `${s} (${rules.filter(r => r.status === s).length})`}
                                    </button>
                                ))}
                            </div>

                            {/* Cards */}
                            <AnimatePresence>
                                {filteredRules.map(rule => (
                                    <RuleCard key={rule.id} rule={rule}
                                        onToggle={toggleRule}
                                        onEdit={r => { setEditingRule(r); setShowBuilder(true); }}
                                        onDuplicate={duplicateRule}
                                        onDelete={deleteRule}
                                        onFire={fireManual}
                                    />
                                ))}
                            </AnimatePresence>

                            {filteredRules.length === 0 && (
                                <div className="text-center py-16 text-slate-600">
                                    <Zap size={32} className="mx-auto mb-3" />
                                    <p>No {filterStatus === 'all' ? '' : filterStatus + ' '}rules yet</p>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* ── ACTIVITY ──────────────────────────────────────── */}
                    {view === 'activity' && (
                        <motion.div key="activity" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="p-5">
                            {/* Stats strip */}
                            <div className="flex gap-4 mb-5 flex-wrap">
                                {[
                                    { label: 'Total Events', value: log.length, color: 'text-white' },
                                    { label: 'Sent', value: logStats.sent, color: 'text-emerald-400' },
                                    { label: 'Failed', value: logStats.failed, color: 'text-red-400' },
                                    { label: 'Recipients', value: logStats.totalRecipients.toLocaleString(), color: 'text-sky-400' },
                                ].map(s => (
                                    <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5">
                                        <p className={cn('text-lg font-black', s.color)}>{s.value}</p>
                                        <p className="text-slate-500 text-[10px]">{s.label}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Log */}
                            <div className="bg-slate-900 border border-slate-800 rounded-2xl px-5 divide-y divide-slate-800/60">
                                <AnimatePresence initial={false}>
                                    {log.map(entry => (
                                        <LogRow key={entry.id} entry={entry} isNew={newLogIds.has(entry.id)} />
                                    ))}
                                </AnimatePresence>
                            </div>
                            <div ref={logEndRef} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* ── Rule builder modal ────────────────────────────────────── */}
            <AnimatePresence>
                {showBuilder && (
                    <RuleBuilder
                        existing={editingRule}
                        onSave={saveRule}
                        onClose={() => { setShowBuilder(false); setEditingRule(undefined); }}
                    />
                )}
            </AnimatePresence>

            {/* ── Simulated notification toast ──────────────────────────── */}
            <AnimatePresence>
                {simMsg && <SimNotification msg={simMsg} onDismiss={() => setSimMsg(null)} />}
            </AnimatePresence>
        </div>
    );
}
