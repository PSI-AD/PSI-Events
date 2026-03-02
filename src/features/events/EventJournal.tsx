/**
 * EventJournal.tsx — Orchestration layer
 * ─────────────────────────────────────────────────────────────────────────────
 * LIVE EVENT JOURNAL & MEDIA FEED
 *
 * Refactored from a 966-line monolith. Sub-concerns now live in:
 *
 *  journal/JournalPost.tsx  — RichContent, MediaGrid, PostCard, EmptyFeed,
 *                             JournalLockedView, JournalHeader, JournalLoadingSpinner
 *  journal/Composer.tsx     — useSpeechRecognition hook, MediaPreviewStrip, Composer
 *
 * This file:
 *  • Owns the realtime Firestore feed subscription
 *  • Owns the role-gate check (roleCanPost)
 *  • Orchestrates JournalHeader + PostCard feed + Composer
 */

import React, { useEffect, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import {
    collection, onSnapshot, query, orderBy, limit, Unsubscribe,
} from 'firebase/firestore';
import { db } from '../../services/firebase/firebaseConfig';
import type { Event } from '../../types';
import type { JournalPost } from '../../types/journal';
import type { UserRole } from '../../types';

import {
    PostCard, EmptyFeed, JournalHeader,
    JournalLockedView, JournalLoadingSpinner,
} from './journal/JournalPost';
import { Composer } from './journal/Composer';

// ── Role gate ─────────────────────────────────────────────────────────────────

function roleCanPost(
    currentUserId: string,
    currentUserRole: UserRole,
    assignedMediaOfficerId?: string
): boolean {
    if (currentUserRole === 'Organizer' || currentUserRole === 'Manager') return true;
    if (assignedMediaOfficerId && currentUserId === assignedMediaOfficerId) return true;
    return false;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface EventJournalProps {
    eventId: string;
    event: Event;
    currentUserId: string;
    currentUserName: string;
    currentUserRole: UserRole;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function EventJournal({
    eventId,
    event,
    currentUserId,
    currentUserName,
    currentUserRole,
}: EventJournalProps) {
    const [posts, setPosts] = useState<JournalPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [tick, setTick] = useState(0); // force relative-time re-render every 60s

    const canCompose = roleCanPost(currentUserId, currentUserRole, event.assignedMediaOfficerId ?? '');

    // ── Realtime feed ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (!event.isJournalEnabled) { setLoading(false); return; }

        const q = query(
            collection(db, 'events', eventId, 'journal'),
            orderBy('timestamp', 'desc'),
            limit(50)
        );
        const unsub: Unsubscribe = onSnapshot(q, snap => {
            const loaded: JournalPost[] = snap.docs.map(d => {
                const data = d.data();
                return {
                    id: d.id,
                    eventId: data.eventId ?? eventId,
                    authorId: data.authorId ?? '',
                    authorName: data.authorName ?? 'Staff',
                    authorRole: data.authorRole ?? 'Organizer',
                    content: data.content ?? '',
                    rawContent: data.rawContent ?? '',
                    isAIPolished: data.isAIPolished ?? false,
                    aiPolishHistory: data.aiPolishHistory ?? [],
                    mediaUrls: data.mediaUrls ?? [],
                    media: data.media ?? [],
                    taggedUserIds: data.taggedUserIds ?? [],
                    hashtags: data.hashtags ?? [],
                    status: data.status ?? 'published',
                    timestamp: data.timestamp?.toDate?.()?.toISOString() ?? new Date().toISOString(),
                    isPinned: data.isPinned ?? false,
                    viewCount: data.viewCount ?? 0,
                    locationLabel: data.locationLabel ?? undefined,
                } as JournalPost;
            });
            // Pinned posts always surface first
            loaded.sort((a, b) => {
                if (a.isPinned && !b.isPinned) return -1;
                if (!a.isPinned && b.isPinned) return 1;
                return 0;
            });
            setPosts(loaded);
            setLoading(false);
        }, () => setLoading(false));

        // Refresh relative timestamps every 60s
        const timer = setInterval(() => setTick(t => t + 1), 60_000);
        return () => { unsub(); clearInterval(timer); };
    }, [eventId, event.isJournalEnabled, tick]);

    // ── Locked gate ───────────────────────────────────────────────────────────
    if (!event.isJournalEnabled) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
                <JournalHeader event={event} postCount={0} />
                <JournalLockedView />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-32">
            <JournalHeader event={event} postCount={posts.length} />

            {/* Feed */}
            <div className="max-w-xl mx-auto px-4 py-4 space-y-4">
                {loading ? (
                    <JournalLoadingSpinner />
                ) : posts.length === 0 ? (
                    <EmptyFeed />
                ) : (
                    <AnimatePresence initial={false}>
                        {posts.map((post, i) => (
                            <PostCard key={post.id} post={post} index={i} />
                        ))}
                    </AnimatePresence>
                )}
            </div>

            {/* Composer — only for authorised staff */}
            {canCompose && (
                <Composer
                    eventId={eventId}
                    eventName={event.name}
                    eventCity={event.city}
                    authorId={currentUserId}
                    authorName={currentUserName}
                    authorRole={currentUserRole}
                    onPosted={() => { /* feed updates via onSnapshot */ }}
                />
            )}
        </div>
    );
}
