/**
 * engagementData.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Data engine for the Live Session Engagement system.
 *
 * Includes:
 *  - TypeScript types for Polls, Questions, Reactions, Sessions
 *  - Seed data (3 polls, 8 questions, 5 sessions)
 *  - useEngagement() hook: real-time simulation via setInterval
 *    Production swap: replace ticks with Firestore onSnapshot
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PollOption {
    id: string;
    text: string;
    votes: number;
}

export interface Poll {
    id: string;
    question: string;
    options: PollOption[];
    isLive: boolean;
    isPaused: boolean;
    allowMultiple: boolean;
    createdAt: number;
    totalVotes: number;
}

export type QuestionStatus = 'pending' | 'approved' | 'highlighted' | 'dismissed';

export interface Question {
    id: string;
    text: string;
    author: string;
    upvotes: number;
    status: QuestionStatus;
    timestamp: number;
    hasUpvoted?: boolean;   // client-side flag (attendee view)
}

export type EmojiType = '👏' | '🔥' | '💡' | '❤️' | '🤯' | '👍' | '⭐';
export const EMOJI_OPTIONS: EmojiType[] = ['👏', '🔥', '💡', '❤️', '🤯', '👍', '⭐'];

export interface FloatingReaction {
    id: string;
    emoji: EmojiType;
    x: number;       // 0–100% of container width
    startAt: number; // Date.now()
}

export interface EngagementSession {
    id: string;
    name: string;
    room: string;
    speaker: string;
    isLive: boolean;
    attendeeCount: number;
    engagementScore: number; // 0–100
}

// ── Sessions ──────────────────────────────────────────────────────────────────

export const SESSIONS: EngagementSession[] = [
    { id: 's1', name: 'Luxury Trends 2026', room: 'Ballroom A', speaker: 'Sophie Laurent', isLive: true, attendeeCount: 247, engagementScore: 82 },
    { id: 's2', name: 'GCC Real Estate Outlook', room: 'Ballroom B', speaker: 'Layla Al-Rashid', isLive: true, attendeeCount: 143, engagementScore: 74 },
    { id: 's3', name: 'ESG in Real Estate', room: 'Conference Room 1', speaker: 'Ahmed Bin Khalifa', isLive: true, attendeeCount: 112, engagementScore: 68 },
    { id: 's4', name: 'Asian Investor Briefing', room: 'Boardroom', speaker: 'Zhang Wei', isLive: true, attendeeCount: 55, engagementScore: 91 },
    { id: 's5', name: 'Opening Keynote', room: 'Main Hall', speaker: 'H.E. Mohammed Al-Rashid', isLive: false, attendeeCount: 462, engagementScore: 96 },
];

// ── Seed polls ────────────────────────────────────────────────────────────────

function buildPoll(
    id: string, question: string,
    options: [string, number][],
    isLive: boolean,
    allowMultiple = false,
): Poll {
    const opts: PollOption[] = options.map(([text, votes], i) => ({
        id: `${id}_o${i}`, text, votes,
    }));
    return {
        id, question, options: opts, isLive, isPaused: false,
        allowMultiple,
        createdAt: Date.now() - 300000,
        totalVotes: opts.reduce((s, o) => s + o.votes, 0),
    };
}

export const SEED_POLLS: Poll[] = [
    buildPoll('p1',
        'Which market do YOU believe will see the highest capital appreciation in 2026?',
        [
            ['Dubai — Downtown / Marina', 138],
            ['Abu Dhabi — Saadiyat Island', 94],
            ['Riyadh — NEOM Proximity', 47],
            ['Doha — Lusail City', 31],
        ], true
    ),
    buildPoll('p2',
        'What is your PRIMARY investment motivation today?',
        [
            ['Capital gain (flip in 3–5 years)', 62],
            ['Rental yield income', 88],
            ['Golden Visa residency', 71],
            ['Portfolio diversification', 41],
            ['Personal use (holiday / retirement)', 23],
        ], false
    ),
    buildPoll('p3',
        'Which session format do you find MOST valuable?',
        [
            ['Keynote with Q&A', 55],
            ['Panel discussion', 91],
            ['1-on-1 investor briefings', 67],
            ['Workshop / hands-on lab', 34],
        ], false
    ),
];

// ── Seed questions ────────────────────────────────────────────────────────────

export const SEED_QUESTIONS: Question[] = [
    { id: 'q1', text: 'How does the DLD regulation change announced in Q4 2025 affect off-plan investment timelines?', author: 'Zhang Wei', upvotes: 34, status: 'highlighted', timestamp: Date.now() - 420000 },
    { id: 'q2', text: 'What LTV ratios are banks currently offering for non-resident buyers in Dubai?', author: 'Natalia Sorokina', upvotes: 28, status: 'approved', timestamp: Date.now() - 380000 },
    { id: 'q3', text: 'Can you compare the net rental yield between Downtown Dubai and Saadiyat Island for the 2025 cohort?', author: 'Isabella Ferreira', upvotes: 22, status: 'approved', timestamp: Date.now() - 300000 },
    { id: 'q4', text: 'What\'s the minimum ticket size now qualifying for the UAE Golden Visa under the new property threshold?', author: 'Dmitri Volkov', upvotes: 19, status: 'approved', timestamp: Date.now() - 250000 },
    { id: 'q5', text: 'Are there any restrictions for Chinese institutional buyers acquiring UAE residential units above AED 5M?', author: 'Priya Nair', upvotes: 15, status: 'pending', timestamp: Date.now() - 180000 },
    { id: 'q6', text: 'How should agents structure deals for NRI clients to avoid FEMA complications on remittances?', author: 'Omar Yusuf', upvotes: 12, status: 'pending', timestamp: Date.now() - 120000 },
    { id: 'q7', text: 'Is the ESG premium in luxury real estate currently priced in, or is there still alpha available?', author: 'Sophie Laurent', upvotes: 9, status: 'pending', timestamp: Date.now() - 90000 },
    { id: 'q8', text: 'What is the expected 5-year trajectory for NEOM-adjacent property values in KSA?', author: 'Tariq Hassan', upvotes: 6, status: 'dismissed', timestamp: Date.now() - 60000 },
];

// ── Hook ──────────────────────────────────────────────────────────────────────

import { useState, useCallback, useEffect, useRef } from 'react';

export function useEngagement(tickMs = 2500) {
    const [selectedSession, setSelectedSession] = useState<EngagementSession>(SESSIONS[0]);
    const [polls, setPolls] = useState<Poll[]>(SEED_POLLS);
    const [questions, setQuestions] = useState<Question[]>(SEED_QUESTIONS);
    const [reactions, setReactions] = useState<FloatingReaction[]>([]);
    const [attendeeVotes, setAttendeeVotes] = useState<Record<string, string[]>>({});   // pollId → optionIds
    const [attendeeUpvotes, setAttendeeUpvotes] = useState<Set<string>>(new Set());
    const [reactionCounts, setReactionCounts] = useState<Record<EmojiType, number>>({
        '👏': 92, '🔥': 67, '💡': 43, '❤️': 38, '🤯': 21, '👍': 55, '⭐': 17,
    } as Record<EmojiType, number>);
    const reactionIdCounter = useRef(0);

    // Live tick — drift votes, add random reactions, update attendee count
    useEffect(() => {
        const id = setInterval(() => {
            // Drift live poll votes
            setPolls(prev => prev.map(poll => {
                if (!poll.isLive || poll.isPaused) return poll;
                const newOpts = poll.options.map(o => ({
                    ...o,
                    votes: o.votes + Math.floor(Math.random() * 3),
                }));
                return { ...poll, options: newOpts, totalVotes: newOpts.reduce((s, o) => s + o.votes, 0) };
            }));

            // Drift upvotes on approved questions
            setQuestions(prev => prev.map(q =>
                (q.status === 'approved' || q.status === 'highlighted') && Math.random() > 0.6
                    ? { ...q, upvotes: q.upvotes + 1 }
                    : q
            ));

            // Drift attendee count slightly
            setSelectedSession(prev => ({
                ...prev,
                attendeeCount: Math.min(prev.attendeeCount + Math.floor(Math.random() * 2), 500),
                engagementScore: Math.max(40, Math.min(100, prev.engagementScore + (Math.random() > 0.5 ? 1 : -1))),
            }));

            // Randomly add a floating reaction
            if (Math.random() > 0.4) {
                const emoji = EMOJI_OPTIONS[Math.floor(Math.random() * EMOJI_OPTIONS.length)];
                const rid = `r_${Date.now()}_${reactionIdCounter.current++}`;
                setReactions(prev => [...prev, { id: rid, emoji, x: 10 + Math.random() * 80, startAt: Date.now() }]);
                setReactionCounts(prev => ({ ...prev, [emoji]: (prev[emoji] ?? 0) + 1 }));
                // Prune old reactions
                setTimeout(() => {
                    setReactions(prev => prev.filter(r => r.id !== rid));
                }, 3500);
            }
        }, tickMs);
        return () => clearInterval(id);
    }, [tickMs]);

    // ── Attendee actions ─────────────────────────────────────────────────────

    const castVote = useCallback((pollId: string, optionId: string) => {
        const existing = attendeeVotes[pollId] ?? [];
        const poll = polls.find(p => p.id === pollId);
        if (!poll) return;
        let newVotes: string[];
        if (poll.allowMultiple) {
            newVotes = existing.includes(optionId)
                ? existing.filter(v => v !== optionId)
                : [...existing, optionId];
        } else {
            if (existing.includes(optionId)) return; // already voted
            newVotes = [optionId];
        }
        setAttendeeVotes(prev => ({ ...prev, [pollId]: newVotes }));
        setPolls(prev => prev.map(p =>
            p.id !== pollId ? p :
                {
                    ...p,
                    options: p.options.map(o => ({
                        ...o,
                        votes: o.id === optionId ? o.votes + 1
                            : existing.includes(o.id) && !poll.allowMultiple ? o.votes
                                : o.votes,
                    })),
                    totalVotes: p.totalVotes + 1,
                }
        ));
    }, [polls, attendeeVotes]);

    const upvoteQuestion = useCallback((qId: string) => {
        if (attendeeUpvotes.has(qId)) return;
        setAttendeeUpvotes(prev => new Set([...prev, qId]));
        setQuestions(prev => prev.map(q => q.id !== qId ? q : { ...q, upvotes: q.upvotes + 1 }));
    }, [attendeeUpvotes]);

    const submitQuestion = useCallback((text: string, author: string) => {
        const newQ: Question = {
            id: `q_${Date.now()}`,
            text, author,
            upvotes: 0,
            status: 'pending',
            timestamp: Date.now(),
        };
        setQuestions(prev => [newQ, ...prev]);
    }, []);

    const sendReaction = useCallback((emoji: EmojiType) => {
        const rid = `r_${Date.now()}_${reactionIdCounter.current++}`;
        setReactions(prev => [...prev, { id: rid, emoji, x: 20 + Math.random() * 60, startAt: Date.now() }]);
        setReactionCounts(prev => ({ ...prev, [emoji]: (prev[emoji] ?? 0) + 1 }));
        setTimeout(() => setReactions(prev => prev.filter(r => r.id !== rid)), 3500);
    }, []);

    // ── Host actions ─────────────────────────────────────────────────────────

    const launchPoll = useCallback((pollId: string) => {
        setPolls(prev => prev.map(p => ({ ...p, isLive: p.id === pollId, isPaused: false })));
    }, []);

    const closePoll = useCallback((pollId: string) => {
        setPolls(prev => prev.map(p => p.id !== pollId ? p : { ...p, isLive: false }));
    }, []);

    const togglePausePoll = useCallback((pollId: string) => {
        setPolls(prev => prev.map(p => p.id !== pollId ? p : { ...p, isPaused: !p.isPaused }));
    }, []);

    const moderateQuestion = useCallback((qId: string, status: QuestionStatus) => {
        setQuestions(prev => prev.map(q => q.id !== qId ? q : { ...q, status }));
    }, []);

    const addPoll = useCallback((question: string, optionTexts: string[]) => {
        const newPoll: Poll = {
            id: `p_${Date.now()}`,
            question,
            options: optionTexts.map((text, i) => ({ id: `np_${i}`, text, votes: 0 })),
            isLive: false, isPaused: false, allowMultiple: false,
            createdAt: Date.now(), totalVotes: 0,
        };
        setPolls(prev => [...prev, newPoll]);
    }, []);

    // ── Derived ───────────────────────────────────────────────────────────────

    const livePoll = polls.find(p => p.isLive) ?? null;
    const approvedQuestions = questions
        .filter(q => q.status === 'approved' || q.status === 'highlighted')
        .sort((a, b) => b.upvotes - a.upvotes);
    const pendingQuestions = questions.filter(q => q.status === 'pending').sort((a, b) => b.timestamp - a.timestamp);
    const highlightedQuestion = questions.find(q => q.status === 'highlighted') ?? null;

    return {
        selectedSession, setSelectedSession,
        polls, livePoll,
        questions, approvedQuestions, pendingQuestions, highlightedQuestion,
        reactions, reactionCounts,
        attendeeVotes, attendeeUpvotes,
        castVote, upvoteQuestion, submitQuestion, sendReaction,
        launchPoll, closePoll, togglePausePoll,
        moderateQuestion, addPoll,
    };
}
