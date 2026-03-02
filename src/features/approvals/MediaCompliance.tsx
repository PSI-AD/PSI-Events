/**
 * MediaCompliance.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * MEDIA OFFICER ACCOUNTABILITY TRACKER
 * Organizer/Manager widget that shows how many journal posts the assigned
 * Media Officer created for a given event, and fires a red-alert banner
 * when the event is over and the count is 0.
 *
 * Firestore reads:
 *   events/{eventId}/journal  — count filtered to authorId === assignedMediaOfficerId
 *   crm_users collection (optional) — to resolve the officer's display name
 *
 * Props:
 *   events        — array of Event objects (rendered as a scrollable card list)
 *   currentUserRole — only renders content for Organizer / Manager
 *
 * Usage in ApprovalQueue or any dashboard page:
 *   <MediaCompliance events={myEvents} currentUserRole="Organizer" />
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    AlertTriangle, CheckCircle2, Camera, User,
    MailWarning, Loader2, ChevronDown, ChevronUp,
    Newspaper, Clock, Shield,
} from 'lucide-react';
import {
    collection, getDocs, query, where,
} from 'firebase/firestore';
import { db } from '../../services/firebase/firebaseConfig';
import type { Event } from '../../types';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ComplianceRecord {
    event: Event;
    postCount: number;
    officerName: string | null;    // resolved from crm_users if available
    isEventOver: boolean;
    isLoading: boolean;
    complianceStatus: 'ok' | 'at_risk' | 'failure' | 'no_officer' | 'disabled';
}

type ComplianceStatus = ComplianceRecord['complianceStatus'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function isEventOver(event: Event): boolean {
    if (!event.end_date) return false;
    return new Date(event.end_date) < new Date();
}

function getComplianceStatus(record: Omit<ComplianceRecord, 'complianceStatus'>): ComplianceStatus {
    if (!record.event.isJournalEnabled) return 'disabled';
    if (!record.event.assignedMediaOfficerId) return 'no_officer';
    if (!record.isEventOver) {
        return record.postCount >= 1 ? 'ok' : 'at_risk';
    }
    // Event is over
    return record.postCount === 0 ? 'failure' : 'ok';
}

function getInitials(name: string): string {
    return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<ComplianceStatus, {
    label: string;
    icon: React.ReactNode;
    cardBg: string;
    cardBorder: string;
    textColor: string;
    badgeBg: string;
}> = {
    ok: {
        label: 'Compliant',
        icon: <CheckCircle2 size={16} />,
        cardBg: 'bg-emerald-500/5',
        cardBorder: 'border-emerald-500/20',
        textColor: 'text-emerald-400',
        badgeBg: 'bg-emerald-500/10',
    },
    at_risk: {
        label: 'No Posts Yet',
        icon: <Clock size={16} />,
        cardBg: 'bg-amber-500/5',
        cardBorder: 'border-amber-500/20',
        textColor: 'text-amber-400',
        badgeBg: 'bg-amber-500/10',
    },
    failure: {
        label: 'Compliance Failure',
        icon: <AlertTriangle size={16} />,
        cardBg: 'bg-rose-500/8',
        cardBorder: 'border-rose-500/30',
        textColor: 'text-rose-400',
        badgeBg: 'bg-rose-500/10',
    },
    no_officer: {
        label: 'No Officer Assigned',
        icon: <User size={16} />,
        cardBg: 'bg-slate-500/5',
        cardBorder: 'border-slate-500/20',
        textColor: 'text-slate-600 dark:text-slate-400',
        badgeBg: 'bg-slate-500/10',
    },
    disabled: {
        label: 'Journal Disabled',
        icon: <Shield size={16} />,
        cardBg: 'bg-slate-500/5',
        cardBorder: 'border-slate-500/15',
        textColor: 'text-slate-600 dark:text-slate-400',
        badgeBg: 'bg-slate-500/8',
    },
};

// ── "Request Explanation" modal ───────────────────────────────────────────────

function ExplanationModal({
    event,
    officerName,
    onClose,
}: {
    event: Event;
    officerName: string | null;
    onClose: () => void;
}) {
    const [sent, setSent] = useState(false);

    function handleSend() {
        // In production: call a Cloud Function to send an in-app notification or email
        // to the officer. Here we simulate with a 1s delay.
        setTimeout(() => { setSent(true); setTimeout(onClose, 2000); }, 1000);
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.92, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                className="bg-white dark:bg-slate-900 border border-rose-500/30 rounded-3xl p-6 max-w-sm w-full shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center">
                        <MailWarning size={20} className="text-rose-400" />
                    </div>
                    <div>
                        <p className="font-extrabold text-slate-900 dark:text-white text-sm">Request Explanation</p>
                        <p className="text-[11px] text-slate-900 dark:text-white/30">{event.name}</p>
                    </div>
                </div>

                {!sent ? (
                    <>
                        <p className="text-sm text-slate-900 dark:text-white/70 leading-relaxed mb-4">
                            This will send an in-app notification to{' '}
                            <span className="text-slate-900 dark:text-white font-bold">{officerName ?? 'the assigned Media Officer'}</span>{' '}
                            requesting an explanation for zero journal coverage during this event.
                            <br /><br />
                            The request will be logged in the system audit trail.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white/60 text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                id="send-explanation-request-btn"
                                onClick={handleSend}
                                className="flex-1 py-2.5 rounded-xl bg-rose-500 text-slate-900 dark:text-white text-sm font-bold hover:bg-rose-400 transition-colors flex items-center justify-center gap-1.5"
                            >
                                <MailWarning size={14} />
                                Send Request
                            </button>
                        </div>
                    </>
                ) : (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center gap-3 py-4"
                    >
                        <CheckCircle2 size={32} className="text-emerald-400" />
                        <p className="font-bold text-slate-900 dark:text-white text-sm">Request Sent</p>
                        <p className="text-xs text-slate-900 dark:text-white/40 text-center">
                            {officerName ?? 'The Media Officer'} has been notified and logged.
                        </p>
                    </motion.div>
                )}
            </motion.div>
        </motion.div>
    );
}

// ── Individual event compliance card ─────────────────────────────────────────

function ComplianceCard({ record }: { record: ComplianceRecord }) {
    const [expanded, setExpanded] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const cfg = STATUS_CONFIG[record.complianceStatus];
    const isFailure = record.complianceStatus === 'failure';
    const isAtRisk = record.complianceStatus === 'at_risk';

    return (
        <>
            <motion.div
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-2xl border ${cfg.cardBg} ${cfg.cardBorder} overflow-hidden`}
            >
                {/* Failure top banner */}
                {isFailure && (
                    <div className="bg-rose-500/15 border-b border-rose-500/20 px-4 py-2.5 flex items-center gap-2">
                        <AlertTriangle size={14} className="text-rose-400 flex-shrink-0 animate-pulse" />
                        <p className="text-rose-400 text-xs font-extrabold">
                            Compliance Failure: Assigned Media Officer did not capture event data.
                        </p>
                    </div>
                )}

                <div className="px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                        {/* Event info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                <p className="font-extrabold text-slate-900 dark:text-white text-sm truncate">{record.event.name}</p>
                                <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.badgeBg} ${cfg.textColor}`}>
                                    {cfg.icon}
                                    {cfg.label}
                                </span>
                            </div>
                            <p className="text-[11px] text-slate-900 dark:text-white/30">
                                {record.event.city}, {record.event.country}
                                {' · '}
                                {record.isEventOver
                                    ? <span className="text-slate-900 dark:text-white/20">Event ended {new Date(record.event.end_date).toLocaleDateString('en-AE', { day: 'numeric', month: 'short' })}</span>
                                    : <span className="text-emerald-400">In progress</span>
                                }
                            </p>
                        </div>

                        {/* Post count badge */}
                        <div className="flex-shrink-0 text-right">
                            {record.isLoading ? (
                                <Loader2 size={16} className="text-slate-600 animate-spin" />
                            ) : (
                                <>
                                    <p className={`text-2xl font-extrabold font-mono ${cfg.textColor}`}>
                                        {record.postCount}
                                    </p>
                                    <p className="text-[10px] text-slate-900 dark:text-white/25 font-bold">posts</p>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Officer strip */}
                    {record.event.assignedMediaOfficerId && (
                        <div className="mt-3 flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                                <Camera size={11} className="text-slate-600 dark:text-slate-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[11px] text-slate-900 dark:text-white/50 truncate">
                                    Media Officer:&nbsp;
                                    <span className="text-slate-900 dark:text-white/80 font-bold">
                                        {record.officerName ?? record.event.assignedMediaOfficerId}
                                    </span>
                                </p>
                            </div>

                            {/* Expand toggle */}
                            <button
                                onClick={() => setExpanded(v => !v)}
                                className="flex-shrink-0 text-slate-900 dark:text-white/30 hover:text-slate-900 dark:hover:text-white/60 transition-colors"
                            >
                                {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                        </div>
                    )}

                    {/* Expanded detail */}
                    <AnimatePresence>
                        {expanded && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.18 }}
                                className="overflow-hidden"
                            >
                                <div className="mt-3 pt-3 border-t border-black/5 dark:border-white/5 space-y-1.5">
                                    <InfoRow label="Event dates" value={`${record.event.start_date} → ${record.event.end_date}`} />
                                    <InfoRow label="Officer ID" value={record.event.assignedMediaOfficerId ?? '—'} mono />
                                    <InfoRow label="Journal" value={record.event.isJournalEnabled ? 'Enabled' : 'Disabled'} />
                                    <InfoRow label="Posts count" value={String(record.postCount)} />
                                    {record.isEventOver && record.postCount === 0 && (
                                        <InfoRow
                                            label="Expected min."
                                            value="≥1 post per event day"
                                            warning
                                        />
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Action buttons */}
                    {(isFailure || isAtRisk) && record.event.assignedMediaOfficerId && (
                        <div className="mt-3 pt-3 border-t border-black/5 dark:border-white/5">
                            {isFailure ? (
                                <button
                                    id={`request-explanation-${record.event.id}`}
                                    onClick={() => setModalOpen(true)}
                                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm font-bold hover:bg-rose-500/15 transition-colors active:scale-[0.98]"
                                >
                                    <MailWarning size={15} />
                                    Request Explanation
                                </button>
                            ) : (
                                <p className="text-[11px] text-amber-400/70 text-center">
                                    Event is ongoing — reminder will trigger if 0 posts when event ends.
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </motion.div>

            {/* Modal */}
            <AnimatePresence>
                {modalOpen && (
                    <ExplanationModal
                        event={record.event}
                        officerName={record.officerName}
                        onClose={() => setModalOpen(false)}
                    />
                )}
            </AnimatePresence>
        </>
    );
}

function InfoRow({
    label, value, mono = false, warning = false,
}: {
    label: string;
    value: string;
    mono?: boolean;
    warning?: boolean;
}) {
    return (
        <div className="flex items-start justify-between gap-3">
            <span className="text-[10px] font-bold text-slate-900 dark:text-white/25 uppercase tracking-wider flex-shrink-0 pt-px">{label}</span>
            <span className={`text-[11px] text-right break-all
                ${mono ? 'font-mono text-slate-900 dark:text-white/50' : 'text-slate-900 dark:text-white/60'}
                ${warning ? 'text-amber-400 font-bold' : ''}
            `}>
                {value}
            </span>
        </div>
    );
}

// ── Main widget ───────────────────────────────────────────────────────────────

interface MediaComplianceProps {
    events: Event[];
    currentUserRole: string;
}

export default function MediaCompliance({ events, currentUserRole }: MediaComplianceProps) {
    const [records, setRecords] = useState<ComplianceRecord[]>([]);
    const [filterStatus, setFilterStatus] = useState<'all' | ComplianceStatus>('all');

    const canView = currentUserRole === 'Organizer' || currentUserRole === 'Manager';

    // Build skeleton records immediately, fill post counts asynchronously
    useEffect(() => {
        const journalEnabled = events.filter(ev => ev.isJournalEnabled && ev.assignedMediaOfficerId);

        // Init loading skeletons
        setRecords(journalEnabled.map(ev => ({
            event: ev,
            postCount: 0,
            officerName: null,
            isEventOver: isEventOver(ev),
            isLoading: true,
            complianceStatus: 'at_risk',
        })));

        // Fire parallel Firestore queries for each event
        journalEnabled.forEach(async (ev) => {
            try {
                const postsSnap = await getDocs(
                    query(
                        collection(db, 'events', ev.id, 'journal'),
                        where('authorId', '==', ev.assignedMediaOfficerId!),
                        where('status', '==', 'published')
                    )
                );
                const count = postsSnap.size;

                // Attempt to resolve officer display name
                let officerName: string | null = null;
                try {
                    const userSnap = await getDocs(
                        query(collection(db, 'crm_users'), where('__name__', '==', ev.assignedMediaOfficerId!))
                    );
                    if (!userSnap.empty) {
                        officerName = userSnap.docs[0].data().name ?? null;
                    }
                } catch { /* non-critical — id is shown as fallback */ }

                setRecords(prev => prev.map(r => {
                    if (r.event.id !== ev.id) return r;
                    const updated: Omit<ComplianceRecord, 'complianceStatus'> = {
                        event: ev,
                        postCount: count,
                        officerName,
                        isEventOver: isEventOver(ev),
                        isLoading: false,
                    };
                    return { ...updated, complianceStatus: getComplianceStatus(updated) };
                }));
            } catch {
                setRecords(prev => prev.map(r =>
                    r.event.id === ev.id ? { ...r, isLoading: false } : r
                ));
            }
        });

        // Also include events where journal is disabled or no officer assigned (for visibility)
        const nonJournalEvents = events.filter(ev => !ev.isJournalEnabled || !ev.assignedMediaOfficerId);
        const nonJournalRecords: ComplianceRecord[] = nonJournalEvents.map(ev => {
            const base = {
                event: ev,
                postCount: 0,
                officerName: null,
                isEventOver: isEventOver(ev),
                isLoading: false,
            };
            return { ...base, complianceStatus: getComplianceStatus(base) };
        });
        setRecords(prev => [...prev, ...nonJournalRecords]);
    }, [events]);

    // Filter
    const filteredRecords = filterStatus === 'all'
        ? records
        : records.filter(r => r.complianceStatus === filterStatus);

    // Summary counts
    const failureCount = records.filter(r => r.complianceStatus === 'failure').length;
    const atRiskCount = records.filter(r => r.complianceStatus === 'at_risk').length;
    const okCount = records.filter(r => r.complianceStatus === 'ok').length;

    if (!canView) {
        return (
            <div className="p-6 text-center text-slate-600 dark:text-slate-400 text-sm">
                Media compliance data is restricted to Organizers and Managers.
            </div>
        );
    }

    return (
        <div className="space-y-4">

            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500/20 to-rose-600/10 border border-rose-500/20 flex items-center justify-center">
                    <Camera size={16} className="text-rose-400" />
                </div>
                <div>
                    <h2 className="font-extrabold text-slate-900 dark:text-white text-base">Media Officer Compliance</h2>
                    <p className="text-[11px] text-slate-900 dark:text-white/30">Journal coverage tracker per event</p>
                </div>
            </div>

            {/* Summary KPIs */}
            <div className="grid grid-cols-3 gap-3">
                {[
                    { label: 'Failures', count: failureCount, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', filter: 'failure' as const },
                    { label: 'At Risk', count: atRiskCount, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', filter: 'at_risk' as const },
                    { label: 'Compliant', count: okCount, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', filter: 'ok' as const },
                ].map(({ label, count, color, bg, border, filter }) => (
                    <button
                        key={label}
                        onClick={() => setFilterStatus(prev => prev === filter ? 'all' : filter)}
                        className={`rounded-2xl border p-3 text-center transition-all active:scale-[0.97]
                            ${filterStatus === filter ? `${bg} ${border}` : 'bg-white/3 border-white/8 hover:bg-black/5 dark:hover:bg-white/5'}
                        `}
                    >
                        <p className={`text-2xl font-extrabold font-mono ${color}`}>{count}</p>
                        <p className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 ${filterStatus === filter ? color : 'text-slate-900 dark:text-white/30'}`}>
                            {label}
                        </p>
                    </button>
                ))}
            </div>

            {/* Filter label */}
            {filterStatus !== 'all' && (
                <div className="flex items-center justify-between">
                    <p className="text-[11px] text-slate-900 dark:text-white/30 font-bold">
                        Showing {filteredRecords.length} {filterStatus.replace('_', ' ')} events
                    </p>
                    <button
                        onClick={() => setFilterStatus('all')}
                        className="text-[11px] text-blue-400 font-bold hover:text-blue-300"
                    >
                        Clear filter
                    </button>
                </div>
            )}

            {/* Cards */}
            <div className="space-y-3">
                {filteredRecords.length === 0 ? (
                    <div className="text-center py-10 text-slate-600">
                        <Newspaper size={28} className="mx-auto mb-3 opacity-30" />
                        <p className="text-sm font-bold">No events match this filter</p>
                    </div>
                ) : (
                    <AnimatePresence mode="popLayout">
                        {filteredRecords.map(record => (
                            <ComplianceCard key={record.event.id} record={record} />
                        ))}
                    </AnimatePresence>
                )}
            </div>

            {/* Empty state */}
            {records.length === 0 && (
                <div className="text-center py-10 text-slate-600">
                    <Camera size={28} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-bold text-slate-600 dark:text-slate-400">No events loaded</p>
                    <p className="text-xs mt-1">Pass the events array to this component to track compliance.</p>
                </div>
            )}
        </div>
    );
}
