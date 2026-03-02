/**
 * SessionEngagement.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Live Session Engagement System
 * Route: /engagement
 *
 * Two modes (toggle in header):
 *  ATTENDEE — Vote · Submit Questions · Upvote · Send Reactions
 *  HOST     — Launch Polls · Moderate Q&A · Highlight Questions · View Stats
 *
 * Host view is a split-pane: Controls (left) | Live Preview (right)
 */

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    Zap, Users, MessageSquare, BarChart2, Radio,
    ChevronUp, CheckCircle2, XCircle, Star, Trash2,
    Plus, Send, RefreshCw, Eye, Lock, Unlock, Pause,
    Play, Award, AlertCircle, ArrowUp, Mic, Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import {
    useEngagement, SESSIONS, EMOJI_OPTIONS,
    type Poll, type Question, type QuestionStatus, type EmojiType,
} from './engagementData';

// ── Utility ───────────────────────────────────────────────────────────────────

function cn(...cs: (string | false | undefined)[]) {
    return cs.filter(Boolean).join(' ');
}

function relTime(ts: number) {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    return `${Math.floor(s / 3600)}h ago`;
}

// ── Pulse dot ────────────────────────────────────────────────────────────────

function PulseDot({ color = 'bg-emerald-400' }: { color?: string }) {
    return (
        <span className="relative flex h-2 w-2 flex-shrink-0">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-70 ${color}`} />
            <span className={`relative inline-flex rounded-full h-2 w-2 ${color}`} />
        </span>
    );
}

// ── Floating reactions ────────────────────────────────────────────────────────

function FloatingReactions({ reactions }: { reactions: { id: string; emoji: EmojiType; x: number; startAt: number }[] }) {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <AnimatePresence>
                {reactions.map(r => (
                    <motion.div
                        key={r.id}
                        initial={{ y: 0, opacity: 1, scale: 0.8 }}
                        animate={{ y: -280, opacity: 0, scale: 1.3 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 3.2, ease: 'easeOut' }}
                        style={{ position: 'absolute', bottom: 16, left: `${r.x}%` }}
                        className="text-3xl select-none"
                    >
                        {r.emoji}
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}

// ── Poll bar result ───────────────────────────────────────────────────────────

function PollBar({
    option, total, isVoted, onClick, disabled,
}: {
    option: Poll['options'][0];
    total: number;
    isVoted: boolean;
    onClick?: () => void;
    disabled?: boolean;
}) {
    const pct = total === 0 ? 0 : Math.round((option.votes / total) * 100);
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={cn(
                'relative w-full text-left rounded-xl overflow-hidden border transition-all',
                isVoted
                    ? 'border-emerald-500/60 bg-emerald-900/20 cursor-default'
                    : disabled
                        ? 'border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/50 cursor-default'
                        : 'border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 hover:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer'
            )}
        >
            {/* Fill bar */}
            <motion.div
                animate={{ width: `${pct}%` }}
                initial={{ width: 0 }}
                transition={{ duration: 0.5 }}
                className={cn(
                    'absolute inset-y-0 left-0 rounded-xl',
                    isVoted ? 'bg-emerald-600/25' : 'bg-slate-200 dark:bg-slate-700/40'
                )}
            />
            {/* Content */}
            <div className="relative flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                    {isVoted && <CheckCircle2 size={13} className="text-emerald-400 flex-shrink-0" />}
                    <span className="text-slate-900 dark:text-white text-sm font-medium">{option.text}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <span className="text-emerald-400 font-black text-sm">{pct}%</span>
                    <span className="text-slate-600 dark:text-slate-400 text-xs">({option.votes})</span>
                </div>
            </div>
        </button>
    );
}

// ── Question card ─────────────────────────────────────────────────────────────

function QuestionCard({
    question, isHost, hasUpvoted,
    onUpvote, onModerate,
}: {
    question: Question;
    isHost: boolean;
    hasUpvoted?: boolean;
    onUpvote?: (id: string) => void;
    onModerate?: (id: string, status: QuestionStatus) => void;
}) {
    const isHighlighted = question.status === 'highlighted';
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={cn(
                'rounded-xl border p-4 transition-colors',
                isHighlighted
                    ? 'bg-amber-900/20 border-amber-600/50'
                    : question.status === 'pending'
                        ? 'bg-slate-100 dark:bg-slate-800/40 border-slate-300 dark:border-slate-700/60'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
            )}
        >
            {isHighlighted && (
                <div className="flex items-center gap-1.5 mb-2">
                    <Star size={11} className="text-amber-400" />
                    <span className="text-amber-400 text-[10px] font-black uppercase tracking-wider">Highlighted by Host</span>
                </div>
            )}
            <p className="text-slate-900 dark:text-white text-sm leading-relaxed mb-2">{question.text}</p>
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                    <span className="text-slate-600 dark:text-slate-400 text-[11px]">{question.author}</span>
                    <span className="text-slate-600 text-[10px]">{relTime(question.timestamp)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    {/* Attendee upvote */}
                    {!isHost && onUpvote && (
                        <button
                            onClick={() => onUpvote(question.id)}
                            disabled={hasUpvoted}
                            className={cn(
                                'flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all',
                                hasUpvoted
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default'
                                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-600 hover:bg-slate-600 hover:text-slate-900 dark:hover:text-white'
                            )}
                        >
                            <ChevronUp size={11} /> {question.upvotes}
                        </button>
                    )}
                    {/* Host controls */}
                    {isHost && onModerate && (
                        <>
                            <span className="text-slate-600 dark:text-slate-400 text-xs flex items-center gap-1 mr-1">
                                <ArrowUp size={10} /> {question.upvotes}
                            </span>
                            {question.status === 'pending' && (
                                <button
                                    onClick={() => onModerate(question.id, 'approved')}
                                    title="Approve"
                                    className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                                >
                                    <CheckCircle2 size={12} />
                                </button>
                            )}
                            {question.status !== 'highlighted' && question.status !== 'dismissed' && (
                                <button
                                    onClick={() => onModerate(question.id, question.status === 'highlighted' ? 'approved' : 'highlighted')}
                                    title="Highlight"
                                    className="p-1.5 rounded-lg bg-amber-500/15 text-amber-400 hover:bg-amber-500/30 transition-colors"
                                >
                                    <Star size={12} />
                                </button>
                            )}
                            {question.status === 'highlighted' && (
                                <button
                                    onClick={() => onModerate(question.id, 'approved')}
                                    title="Remove highlight"
                                    className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                                >
                                    <Star size={12} />
                                </button>
                            )}
                            {question.status !== 'dismissed' && (
                                <button
                                    onClick={() => onModerate(question.id, 'dismissed')}
                                    title="Dismiss"
                                    className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                                >
                                    <XCircle size={12} />
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

// ── Attendee View ─────────────────────────────────────────────────────────────

type AttendeeTab = 'poll' | 'qa' | 'reactions';

function AttendeeView({
    livePoll, approvedQuestions, highlightedQuestion,
    reactions, reactionCounts,
    attendeeVotes, attendeeUpvotes,
    castVote, upvoteQuestion, submitQuestion, sendReaction,
}: ReturnType<typeof useEngagement>) {
    const [tab, setTab] = useState<AttendeeTab>('poll');
    const [qText, setQText] = useState('');
    const [qAuthor, setQAuthor] = useState('');
    const [submitted, setSubmitted] = useState(false);

    function handleSubmitQ() {
        if (!qText.trim() || !qAuthor.trim()) return;
        submitQuestion(qText.trim(), qAuthor.trim());
        setQText(''); setSubmitted(true);
        toast.success('Question submitted! The host will review it.');
        setTimeout(() => setSubmitted(false), 4000);
    }

    const votedOptions = livePoll ? (attendeeVotes[livePoll.id] ?? []) : [];
    const hasVoted = votedOptions.length > 0;

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            {/* Tab bar */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 px-4 bg-white dark:bg-slate-900/60">
                {([
                    { id: 'poll', label: 'Live Poll', icon: BarChart2 },
                    { id: 'qa', label: 'Q&A', icon: MessageSquare },
                    { id: 'reactions', label: 'Reactions', icon: Zap },
                ] as { id: AttendeeTab; label: string; icon: React.ElementType }[]).map(t => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={cn(
                            'flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 transition-colors',
                            tab === t.id
                                ? 'border-emerald-500 text-emerald-400'
                                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                        )}
                    >
                        <t.icon size={13} /> {t.label}
                        {t.id === 'poll' && livePoll && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        )}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">

                {/* ── POLL TAB ──────────────────────────────────────────── */}
                {tab === 'poll' && (
                    <>
                        {livePoll ? (
                            <div>
                                <div className="flex items-center gap-2 mb-4">
                                    <PulseDot />
                                    <span className="text-emerald-400 text-xs font-bold uppercase tracking-wider">Live Poll</span>
                                    {livePoll.isPaused && <span className="text-amber-400 text-xs font-bold">(Paused)</span>}
                                </div>
                                <h3 className="text-slate-900 dark:text-white font-bold text-base mb-4 leading-snug">{livePoll.question}</h3>
                                <div className="space-y-2.5">
                                    {livePoll.options.map(opt => (
                                        <PollBar
                                            key={opt.id}
                                            option={opt}
                                            total={livePoll.totalVotes}
                                            isVoted={votedOptions.includes(opt.id)}
                                            onClick={() => !hasVoted ? castVote(livePoll.id, opt.id) : undefined}
                                            disabled={hasVoted && !votedOptions.includes(opt.id)}
                                        />
                                    ))}
                                </div>
                                <div className="flex items-center justify-between mt-3">
                                    <p className="text-slate-600 dark:text-slate-400 text-xs">{livePoll.totalVotes} votes · Live updating</p>
                                    {hasVoted && <p className="text-emerald-400 text-xs font-semibold">✓ Your vote recorded</p>}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-16">
                                <BarChart2 size={40} className="text-slate-700 mx-auto mb-3" />
                                <p className="text-slate-900 dark:text-white font-bold mb-1">No active poll</p>
                                <p className="text-slate-600 dark:text-slate-400 text-sm">The host will launch a poll soon</p>
                            </div>
                        )}
                    </>
                )}

                {/* ── Q&A TAB ───────────────────────────────────────────── */}
                {tab === 'qa' && (
                    <>
                        {/* Highlighted question */}
                        {highlightedQuestion && (
                            <div className="bg-amber-900/20 border border-amber-600/40 rounded-2xl p-4 mb-2">
                                <div className="flex items-center gap-1.5 mb-2">
                                    <Star size={12} className="text-amber-400" />
                                    <span className="text-amber-400 text-[10px] font-black uppercase tracking-wider">Now Answering</span>
                                </div>
                                <p className="text-slate-900 dark:text-white font-semibold text-sm leading-snug">{highlightedQuestion.text}</p>
                            </div>
                        )}

                        {/* Submit question */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                            <p className="text-slate-900 dark:text-white font-semibold text-sm mb-3">Submit a Question</p>
                            {submitted ? (
                                <div className="flex items-center gap-2 text-emerald-400 py-3">
                                    <CheckCircle2 size={16} /> <span className="text-sm font-semibold">Question submitted for review</span>
                                </div>
                            ) : (
                                <>
                                    <textarea
                                        value={qText}
                                        onChange={e => setQText(e.target.value)}
                                        placeholder="Type your question…"
                                        rows={3}
                                        maxLength={280}
                                        className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none transition-colors mb-2"
                                    />
                                    <div className="flex items-center gap-2">
                                        <input
                                            value={qAuthor}
                                            onChange={e => setQAuthor(e.target.value)}
                                            placeholder="Your name"
                                            className="flex-1 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                                        />
                                        <button
                                            onClick={handleSubmitQ}
                                            disabled={!qText.trim() || !qAuthor.trim()}
                                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-slate-900 dark:text-white text-sm font-bold hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <Send size={13} /> Submit
                                        </button>
                                    </div>
                                    <p className="text-slate-600 text-[10px] mt-1.5">{qText.length}/280</p>
                                </>
                            )}
                        </div>

                        {/* Approved questions list */}
                        <div>
                            <p className="text-slate-600 dark:text-slate-400 text-[10px] font-black uppercase tracking-wider mb-2">{approvedQuestions.length} Approved Questions</p>
                            <AnimatePresence>
                                {approvedQuestions.map(q => (
                                    <div key={q.id} className="mb-2">
                                        <QuestionCard
                                            question={q} isHost={false}
                                            hasUpvoted={attendeeUpvotes.has(q.id)}
                                            onUpvote={upvoteQuestion}
                                        />
                                    </div>
                                ))}
                            </AnimatePresence>
                            {approvedQuestions.length === 0 && (
                                <p className="text-slate-600 text-sm text-center py-6">No approved questions yet</p>
                            )}
                        </div>
                    </>
                )}

                {/* ── REACTIONS TAB ─────────────────────────────────────── */}
                {tab === 'reactions' && (
                    <div>
                        <p className="text-slate-900 dark:text-white font-bold text-sm mb-4">Tap to send a reaction</p>
                        <div className="grid grid-cols-4 gap-3 mb-6">
                            {EMOJI_OPTIONS.map(emoji => (
                                <button
                                    key={emoji}
                                    onClick={() => { sendReaction(emoji); toast.success('Reaction sent!', { duration: 1000 }); }}
                                    className="flex flex-col items-center gap-1.5 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 hover:scale-105 active:scale-95 transition-all"
                                >
                                    <span className="text-3xl">{emoji}</span>
                                    <span className="text-slate-600 dark:text-slate-400 text-[10px] font-bold">{(reactionCounts[emoji] ?? 0).toLocaleString()}</span>
                                </button>
                            ))}
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 text-xs text-center">Reactions are visible to everyone in the room</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Host View ─────────────────────────────────────────────────────────────────

type HostTab = 'polls' | 'qa' | 'stats';

function HostView(props: ReturnType<typeof useEngagement>) {
    const {
        polls, livePoll, questions, pendingQuestions, approvedQuestions,
        reactionCounts, reactions,
        selectedSession,
        launchPoll, closePoll, togglePausePoll, moderateQuestion, addPoll,
    } = props;

    const [tab, setTab] = useState<HostTab>('polls');
    const [showNewPoll, setShowNewPoll] = useState(false);
    const [newQ, setNewQ] = useState('');
    const [newOpts, setNewOpts] = useState(['', '', '', '']);

    function handleCreatePoll() {
        const opts = newOpts.filter(o => o.trim());
        if (!newQ.trim() || opts.length < 2) {
            toast.error('Need a question and at least 2 options');
            return;
        }
        addPoll(newQ.trim(), opts);
        setNewQ(''); setNewOpts(['', '', '', '']); setShowNewPoll(false);
        toast.success('Poll created!');
    }

    return (
        <div className="flex-1 flex overflow-hidden">

            {/* ── Left: Controls ──────────────────────────────────────── */}
            <div className="w-96 border-r border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden flex-shrink-0">
                {/* Tab bar */}
                <div className="flex border-b border-slate-200 dark:border-slate-800 px-2 pt-1 bg-white dark:bg-slate-900/60">
                    {([
                        { id: 'polls', label: 'Polls', icon: BarChart2, badge: polls.length },
                        { id: 'qa', label: 'Q&A', icon: MessageSquare, badge: pendingQuestions.length },
                        { id: 'stats', label: 'Stats', icon: Layers },
                    ] as { id: HostTab; label: string; icon: React.ElementType; badge?: number }[]).map(t => (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id)}
                            className={cn(
                                'flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 transition-colors relative',
                                tab === t.id
                                    ? 'border-emerald-500 text-emerald-400'
                                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                            )}
                        >
                            <t.icon size={13} /> {t.label}
                            {t.badge ? (
                                <span className="ml-0.5 w-4 h-4 rounded-full bg-amber-500 text-slate-900 dark:text-white text-[9px] font-black flex items-center justify-center">
                                    {t.badge > 9 ? '9+' : t.badge}
                                </span>
                            ) : null}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">

                    {/* ── POLLS TAB ──────────────────────────────────── */}
                    {tab === 'polls' && (
                        <>
                            <button
                                onClick={() => setShowNewPoll(s => !s)}
                                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 text-slate-900 dark:text-white text-sm font-bold hover:bg-emerald-500 transition-colors"
                            >
                                <Plus size={14} /> New Poll
                            </button>

                            {/* New poll form */}
                            <AnimatePresence>
                                {showNewPoll && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl p-4 space-y-2 overflow-hidden"
                                    >
                                        <p className="text-slate-900 dark:text-white font-bold text-xs mb-2">Create Poll</p>
                                        <input value={newQ} onChange={e => setNewQ(e.target.value)} placeholder="Poll question…"
                                            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500" />
                                        {newOpts.map((opt, i) => (
                                            <input key={i} value={opt} onChange={e => setNewOpts(prev => prev.map((o, j) => j === i ? e.target.value : o))}
                                                placeholder={`Option ${i + 1}`}
                                                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500" />
                                        ))}
                                        <div className="flex gap-2 pt-1">
                                            <button onClick={handleCreatePoll} className="flex-1 py-2 rounded-xl bg-emerald-600 text-slate-900 dark:text-white text-xs font-bold hover:bg-emerald-500 transition-colors">Create</button>
                                            <button onClick={() => setShowNewPoll(false)} className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs hover:bg-slate-600 transition-colors">Cancel</button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {polls.map(poll => (
                                <div key={poll.id} className={cn(
                                    'bg-white dark:bg-slate-900 border rounded-xl p-4',
                                    poll.isLive ? 'border-emerald-600/50' : 'border-slate-200 dark:border-slate-800'
                                )}>
                                    <div className="flex items-start gap-2 mb-2">
                                        <div className="flex-1 min-w-0">
                                            {poll.isLive && (
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <PulseDot />
                                                    <span className="text-emerald-400 text-[9px] font-black uppercase">Live · {poll.totalVotes} votes</span>
                                                    {poll.isPaused && <span className="text-amber-400 text-[9px] font-black">(Paused)</span>}
                                                </div>
                                            )}
                                            <p className="text-slate-900 dark:text-white text-xs font-semibold leading-snug line-clamp-2">{poll.question}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-1.5 flex-wrap">
                                        {!poll.isLive ? (
                                            <button onClick={() => { launchPoll(poll.id); toast.success('Poll launched!'); }}
                                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600/20 border border-emerald-600/30 text-emerald-400 text-[11px] font-bold hover:bg-emerald-600/30 transition-colors">
                                                <Play size={10} /> Launch
                                            </button>
                                        ) : (
                                            <>
                                                <button onClick={() => { togglePausePoll(poll.id); }}
                                                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-600/15 border border-amber-600/25 text-amber-400 text-[11px] font-bold hover:bg-amber-600/25 transition-colors">
                                                    {poll.isPaused ? <><Play size={10} /> Resume</> : <><Pause size={10} /> Pause</>}
                                                </button>
                                                <button onClick={() => { closePoll(poll.id); toast.success('Poll closed'); }}
                                                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600/10 border border-red-600/20 text-red-400 text-[11px] font-bold hover:bg-red-600/20 transition-colors">
                                                    <Lock size={10} /> Close
                                                </button>
                                            </>
                                        )}
                                    </div>
                                    {poll.isLive && (
                                        <div className="mt-3 space-y-1.5">
                                            {poll.options.map(opt => {
                                                const pct = poll.totalVotes === 0 ? 0 : Math.round((opt.votes / poll.totalVotes) * 100);
                                                return (
                                                    <div key={opt.id}>
                                                        <div className="flex justify-between text-[10px] mb-0.5">
                                                            <span className="text-slate-700 dark:text-slate-300 truncate">{opt.text}</span>
                                                            <span className="text-emerald-400 font-bold ml-2">{pct}%</span>
                                                        </div>
                                                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded h-1.5">
                                                            <motion.div animate={{ width: `${pct}%` }} className="h-1.5 rounded bg-emerald-500" />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </>
                    )}

                    {/* ── Q&A TAB ────────────────────────────────────── */}
                    {tab === 'qa' && (
                        <>
                            {pendingQuestions.length > 0 && (
                                <div>
                                    <p className="text-amber-400 text-[10px] font-black uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        <AlertCircle size={10} /> {pendingQuestions.length} Pending Review
                                    </p>
                                    <AnimatePresence>
                                        {pendingQuestions.map(q => (
                                            <div key={q.id} className="mb-2">
                                                <QuestionCard question={q} isHost onModerate={moderateQuestion} />
                                            </div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                            )}
                            <div>
                                <p className="text-slate-600 dark:text-slate-400 text-[10px] font-black uppercase tracking-wider mb-2">Approved ({approvedQuestions.length})</p>
                                <AnimatePresence>
                                    {approvedQuestions.map(q => (
                                        <div key={q.id} className="mb-2">
                                            <QuestionCard question={q} isHost onModerate={moderateQuestion} />
                                        </div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        </>
                    )}

                    {/* ── STATS TAB ──────────────────────────────────── */}
                    {tab === 'stats' && (
                        <div className="space-y-4">
                            {/* Engagement score ring */}
                            <div className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl p-4 flex items-center gap-4">
                                <div className="relative w-16 h-16 flex-shrink-0">
                                    <svg className="w-16 h-16 -rotate-90" viewBox="0 0 56 56">
                                        <circle cx="28" cy="28" r="22" fill="none" strokeWidth="5" className="stroke-slate-700" />
                                        <motion.circle cx="28" cy="28" r="22" fill="none" strokeWidth="5"
                                            strokeDasharray={2 * Math.PI * 22}
                                            animate={{ strokeDashoffset: 2 * Math.PI * 22 * (1 - selectedSession.engagementScore / 100) }}
                                            strokeLinecap="round" stroke="#10b981" />
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-slate-900 dark:text-white font-black text-sm">{selectedSession.engagementScore}%</span>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-slate-900 dark:text-white font-bold">Engagement Score</p>
                                    <p className="text-slate-600 dark:text-slate-400 text-xs mt-0.5"><Users size={10} className="inline mr-1" />{selectedSession.attendeeCount} in session</p>
                                </div>
                            </div>

                            {/* Reaction breakdown */}
                            <div className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl p-4">
                                <p className="text-slate-900 dark:text-white font-bold text-xs mb-3">Reaction Totals</p>
                                {EMOJI_OPTIONS.map(emoji => {
                                    const count = reactionCounts[emoji] ?? 0;
                                    const max = Math.max(...EMOJI_OPTIONS.map(e => reactionCounts[e] ?? 0));
                                    return (
                                        <div key={emoji} className="flex items-center gap-2 mb-2">
                                            <span className="text-lg w-6">{emoji}</span>
                                            <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                                                <motion.div
                                                    animate={{ width: `${max === 0 ? 0 : (count / max) * 100}%` }}
                                                    className="h-1.5 rounded-full bg-emerald-500"
                                                />
                                            </div>
                                            <span className="text-slate-700 dark:text-slate-300 text-xs font-bold w-8 text-right">{count}</span>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Q&A summary */}
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { label: 'Total Questions', value: questions.length },
                                    { label: 'Pending', value: pendingQuestions.length },
                                    { label: 'Approved', value: approvedQuestions.length },
                                    { label: 'Dismissed', value: questions.filter(q => q.status === 'dismissed').length },
                                ].map(s => (
                                    <div key={s.label} className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-center">
                                        <p className="text-slate-900 dark:text-white font-black text-xl">{s.value}</p>
                                        <p className="text-slate-600 dark:text-slate-400 text-[10px] uppercase tracking-wide">{s.label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Right: Live Preview ──────────────────────────────────── */}
            <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 relative overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex-shrink-0">
                    <p className="text-slate-600 dark:text-slate-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                        <Eye size={12} /> Audience View Preview
                    </p>
                    <span className="text-slate-600 text-xs">What attendees see on screen</span>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Highlighted Q */}
                    {props.highlightedQuestion && (
                        <div className="bg-amber-900/25 border-2 border-amber-600/50 rounded-2xl p-6 text-center">
                            <div className="flex items-center justify-center gap-2 mb-3">
                                <Award size={16} className="text-amber-400" />
                                <span className="text-amber-400 font-black text-sm uppercase">Now Answering</span>
                            </div>
                            <p className="text-slate-900 dark:text-white font-bold text-lg leading-snug">{props.highlightedQuestion.text}</p>
                            <p className="text-slate-600 dark:text-slate-400 text-sm mt-2">— {props.highlightedQuestion.author}</p>
                        </div>
                    )}

                    {/* Live poll preview */}
                    {livePoll && (
                        <div className="bg-white dark:bg-slate-900 border border-emerald-800/40 rounded-2xl p-6">
                            <div className="flex items-center gap-2 mb-3">
                                <PulseDot />
                                <span className="text-emerald-400 font-black text-xs uppercase">Live Poll · {livePoll.totalVotes} votes</span>
                            </div>
                            <h3 className="text-slate-900 dark:text-white font-bold text-base mb-4">{livePoll.question}</h3>
                            <div className="space-y-3">
                                {livePoll.options.map(opt => {
                                    const pct = livePoll.totalVotes === 0 ? 0 : Math.round((opt.votes / livePoll.totalVotes) * 100);
                                    const isWinning = opt.votes === Math.max(...livePoll.options.map(o => o.votes));
                                    return (
                                        <div key={opt.id}>
                                            <div className="flex justify-between mb-1">
                                                <span className={cn('text-sm', isWinning ? 'text-slate-900 dark:text-white font-bold' : 'text-slate-700 dark:text-slate-300')}>{opt.text}</span>
                                                <span className={cn('font-black text-sm', isWinning ? 'text-emerald-400' : 'text-slate-600 dark:text-slate-400')}>{pct}%</span>
                                            </div>
                                            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3">
                                                <motion.div
                                                    animate={{ width: `${pct}%` }}
                                                    transition={{ duration: 0.4 }}
                                                    className={cn('h-3 rounded-full', isWinning ? 'bg-emerald-500' : 'bg-slate-600')}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Top questions preview */}
                    <div>
                        <p className="text-slate-600 dark:text-slate-400 text-xs font-black uppercase tracking-wider mb-3">Top Questions</p>
                        {approvedQuestions.slice(0, 3).map((q, i) => (
                            <div key={q.id} className={cn(
                                'mb-2 bg-white dark:bg-slate-900 border rounded-xl p-3',
                                i === 0 ? 'border-violet-600/40' : 'border-slate-200 dark:border-slate-800'
                            )}>
                                <div className="flex items-start gap-2">
                                    <span className="text-slate-600 font-black text-sm w-5 flex-shrink-0">{i + 1}.</span>
                                    <p className="text-slate-900 dark:text-white text-sm flex-1">{q.text}</p>
                                    <span className="text-slate-600 dark:text-slate-400 text-xs flex items-center gap-0.5 flex-shrink-0">
                                        <ArrowUp size={10} />{q.upvotes}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Reaction stream in preview */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                        <p className="text-slate-600 dark:text-slate-400 text-xs font-black uppercase tracking-wider mb-3">Live Reactions</p>
                        <div className="flex flex-wrap gap-4">
                            {EMOJI_OPTIONS.map(e => (
                                <div key={e} className="text-center">
                                    <div className="text-2xl mb-1">{e}</div>
                                    <div className="text-emerald-400 text-xs font-bold">{reactionCounts[e] ?? 0}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Floating reactions overlay */}
                <FloatingReactions reactions={reactions} />
            </div>
        </div>
    );
}

// ── Main component ────────────────────────────────────────────────────────────

type Mode = 'attendee' | 'host';

export default function SessionEngagement() {
    const [mode, setMode] = useState<Mode>('attendee');
    const engagement = useEngagement(2500);
    const { selectedSession, setSelectedSession, reactions } = engagement;

    return (
        <div className="h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans overflow-hidden">

            {/* ── Header ────────────────────────────────────────────────── */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-5 py-3.5 flex-shrink-0">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                        <div className="flex items-center gap-2">
                            <Mic size={18} className="text-emerald-400" />
                            <h1 className="text-slate-900 dark:text-white font-extrabold text-base">Live Engagement</h1>
                            <PulseDot />
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 text-xs mt-0.5">
                            {selectedSession.name} · {selectedSession.room} · {selectedSession.attendeeCount} attendees
                        </p>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                        {/* Session selector */}
                        <select
                            value={selectedSession.id}
                            onChange={e => {
                                const s = SESSIONS.find(s => s.id === e.target.value);
                                if (s) setSelectedSession(s);
                            }}
                            className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500 transition-colors"
                        >
                            {SESSIONS.map(s => (
                                <option key={s.id} value={s.id}>{s.name} {s.isLive ? '🟢' : '⚫'}</option>
                            ))}
                        </select>

                        {/* Mode toggle */}
                        <div className="flex bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-0.5 gap-0.5">
                            <button
                                onClick={() => setMode('attendee')}
                                className={cn(
                                    'flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all',
                                    mode === 'attendee' ? 'bg-emerald-600 text-slate-900 dark:text-white shadow' : 'text-slate-600 dark:text-slate-400 hover:text-slate-200'
                                )}
                            >
                                <Users size={12} /> Attendee
                            </button>
                            <button
                                onClick={() => setMode('host')}
                                className={cn(
                                    'flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all',
                                    mode === 'host' ? 'bg-violet-600 text-slate-900 dark:text-white shadow' : 'text-slate-600 dark:text-slate-400 hover:text-slate-200'
                                )}
                            >
                                <Mic size={12} /> Host
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Mode badge ─────────────────────────────────────────────── */}
            <div className={cn(
                'flex items-center justify-center gap-2 py-1.5 text-[10px] font-black uppercase tracking-widest flex-shrink-0',
                mode === 'host' ? 'bg-violet-900/40 border-b border-violet-800/40 text-violet-400' : 'bg-emerald-900/20 border-b border-emerald-900/30 text-emerald-500'
            )}>
                {mode === 'host' ? <><Mic size={10} /> Host Control Mode — Changes are visible to all attendees</> : <><Users size={10} /> Attendee View</>}
            </div>

            {/* ── Content ────────────────────────────────────────────────── */}
            <div className="flex-1 flex overflow-hidden relative">
                <AnimatePresence mode="wait">
                    {mode === 'attendee' ? (
                        <motion.div key="attendee" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col overflow-hidden max-w-lg mx-auto w-full">
                            <AttendeeView {...engagement} />
                        </motion.div>
                    ) : (
                        <motion.div key="host" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex overflow-hidden w-full">
                            <HostView {...engagement} />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Floating reactions always visible in attendee mode */}
                {mode === 'attendee' && <FloatingReactions reactions={reactions} />}
            </div>
        </div>
    );
}
