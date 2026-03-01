/**
 * journal/JournalPost.tsx
 * Feed components for the Live Event Journal:
 *  - RichContent       — renders @mentions and #hashtags inline
 *  - MediaGrid         — photo/video grid with lightbox
 *  - PostCard          — a single journal post card
 *  - EmptyFeed         — placeholder when no posts exist
 *  - JournalHeader     — sticky top header bar
 *  - JournalLockedView — shown when journal is disabled
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    Play, X, Clock, MapPin, Sparkles, Star,
    ChevronDown, AtSign, Lock, Newspaper, Loader2,
} from 'lucide-react';
import type { JournalPost, JournalMedia } from '../../../types/journal';
import type { Event } from '../../../types';

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getInitials(name: string): string {
    return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

export function relativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const s = Math.floor(diff / 1000);
    if (s < 60) return 'just now';
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return new Date(iso).toLocaleDateString('en-AE', { day: 'numeric', month: 'short' });
}

export function RichContent({ text }: { text: string }) {
    const parts = text.split(/(@\w[\w\s]*\w|\#\w+)/g);
    return (
        <>
            {parts.map((part, i) => {
                if (part.startsWith('@')) {
                    return <span key={i} className="text-emerald-400 font-bold">{part}</span>;
                }
                if (part.startsWith('#')) {
                    return <span key={i} className="text-blue-400 font-medium">{part}</span>;
                }
                return <span key={i}>{part}</span>;
            })}
        </>
    );
}

// ── Media grid ────────────────────────────────────────────────────────────────

export function MediaGrid({ media }: { media: JournalMedia[] }) {
    const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
    if (!media.length) return null;

    const gridClass =
        media.length === 1 ? 'grid-cols-1' :
            media.length === 2 ? 'grid-cols-2' :
                media.length === 3 ? 'grid-cols-3' :
                    'grid-cols-2';

    return (
        <>
            <div className={`grid ${gridClass} gap-1.5 rounded-xl overflow-hidden mt-3`}>
                {media.slice(0, 4).map((m, i) => (
                    <div
                        key={i}
                        className="relative aspect-square bg-slate-800 overflow-hidden cursor-pointer group"
                        onClick={() => setLightboxIdx(i)}
                    >
                        {m.type === 'photo' ? (
                            <img src={m.url} alt={m.filename}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                loading="lazy" />
                        ) : (
                            <div className="relative w-full h-full flex items-center justify-center bg-slate-900">
                                <video src={m.url} className="w-full h-full object-cover opacity-70" muted playsInline preload="metadata" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                                        <Play size={18} className="text-white ml-0.5" />
                                    </div>
                                </div>
                            </div>
                        )}
                        {i === 3 && media.length > 4 && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                <span className="text-white text-xl font-extrabold">+{media.length - 4}</span>
                            </div>
                        )}
                        <div className="absolute inset-0 ring-1 ring-inset ring-white/5 group-hover:ring-white/10 transition-all" />
                    </div>
                ))}
            </div>

            <AnimatePresence>
                {lightboxIdx !== null && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4"
                        onClick={() => setLightboxIdx(null)}
                    >
                        <button className="absolute top-4 right-4 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                            onClick={() => setLightboxIdx(null)}>
                            <X size={20} />
                        </button>
                        <motion.div
                            initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                            className="max-w-4xl max-h-[85vh] relative"
                            onClick={e => e.stopPropagation()}>
                            {media[lightboxIdx].type === 'photo' ? (
                                <img src={media[lightboxIdx].url} alt="" className="max-w-full max-h-[85vh] rounded-2xl object-contain" />
                            ) : (
                                <video src={media[lightboxIdx].url} controls autoPlay className="max-w-full max-h-[85vh] rounded-2xl" />
                            )}
                        </motion.div>
                        {lightboxIdx > 0 && (
                            <button className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 bg-white/10 rounded-full flex items-center justify-center text-white"
                                onClick={e => { e.stopPropagation(); setLightboxIdx(lightboxIdx - 1); }}>
                                <ChevronDown className="rotate-90" size={20} />
                            </button>
                        )}
                        {lightboxIdx < media.length - 1 && (
                            <button className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 bg-white/10 rounded-full flex items-center justify-center text-white"
                                onClick={e => { e.stopPropagation(); setLightboxIdx(lightboxIdx + 1); }}>
                                <ChevronDown className="-rotate-90" size={20} />
                            </button>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

// ── Individual post card ──────────────────────────────────────────────────────

export function PostCard({ post, index }: { post: JournalPost; index: number }) {
    const [expanded, setExpanded] = useState(true);
    const isLong = post.content.length > 320;

    const avatarColors = [
        'from-violet-500 to-violet-700', 'from-emerald-500 to-emerald-700',
        'from-blue-500 to-blue-700', 'from-amber-500 to-amber-700', 'from-rose-500 to-rose-700',
    ];
    const colorIdx = post.authorName.charCodeAt(0) % avatarColors.length;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(index * 0.06, 0.4), type: 'spring', stiffness: 200, damping: 26 }}
            className="bg-slate-900 border border-white/8 rounded-3xl overflow-hidden hover:border-white/12 transition-colors"
        >
            <div className="px-5 pt-5 flex items-start gap-3">
                <div className={`w-11 h-11 flex-shrink-0 rounded-2xl bg-gradient-to-br ${avatarColors[colorIdx]} flex items-center justify-center text-white font-extrabold text-sm`}>
                    {getInitials(post.authorName)}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-white text-sm">{post.authorName}</span>
                        <span className="text-[10px] text-white/30 bg-white/5 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                            {post.authorRole}
                        </span>
                        {post.isAIPolished && (
                            <span className="flex items-center gap-1 text-[10px] text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-full font-bold">
                                <Sparkles size={9} /> AI Polished
                            </span>
                        )}
                        {post.isPinned && (
                            <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full font-bold">
                                <Star size={9} /> Pinned
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                        <Clock size={10} className="text-white/30" />
                        <span className="text-[11px] text-white/30">{relativeTime(post.timestamp)}</span>
                        {post.locationLabel && (
                            <>
                                <span className="text-white/20">·</span>
                                <MapPin size={10} className="text-white/30" />
                                <span className="text-[11px] text-white/30">{post.locationLabel}</span>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {post.media.length > 0 && (
                <div className="px-5 mt-1">
                    <MediaGrid media={post.media} />
                </div>
            )}

            <div className="px-5 py-4">
                <p className={`text-sm text-white/80 leading-relaxed ${!expanded && isLong ? 'line-clamp-3' : ''}`}>
                    <RichContent text={post.content} />
                </p>
                {isLong && (
                    <button onClick={() => setExpanded(v => !v)}
                        className="mt-1.5 text-[12px] font-bold text-blue-400 hover:text-blue-300 transition-colors">
                        {expanded ? 'Show less' : 'Read more'}
                    </button>
                )}
            </div>

            {post.hashtags.length > 0 && (
                <div className="px-5 pb-3 flex flex-wrap gap-1.5">
                    {post.hashtags.map(tag => (
                        <span key={tag} className="text-[11px] text-blue-400 font-bold">#{tag}</span>
                    ))}
                </div>
            )}

            <div className="px-5 pb-4 flex items-center justify-between border-t border-white/5 pt-3">
                <span className="text-[10px] text-white/20 font-bold uppercase tracking-widest">{post.viewCount} views</span>
                {post.taggedUserIds.length > 0 && (
                    <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                        <AtSign size={10} /> {post.taggedUserIds.length} tagged
                    </span>
                )}
            </div>
        </motion.div>
    );
}

// ── Empty feed ────────────────────────────────────────────────────────────────

export function EmptyFeed() {
    return (
        <div className="py-20 text-center text-slate-600">
            <Newspaper size={36} className="mx-auto mb-4 opacity-30" />
            <p className="font-bold text-slate-400">No posts yet</p>
            <p className="text-sm text-slate-600 mt-1">
                The Media Officer will post live updates here during the event.
            </p>
        </div>
    );
}

// ── Locked screen ─────────────────────────────────────────────────────────────

export function JournalLockedView() {
    return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center py-16">
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                className="w-20 h-20 bg-slate-800 border border-slate-700 rounded-3xl flex items-center justify-center mb-6"
            >
                <Lock size={32} className="text-slate-500" />
            </motion.div>
            <h3 className="text-xl font-extrabold text-white mb-2">Social Feed Disabled</h3>
            <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
                The Event Journal has not been enabled for this event. An Organizer can activate it in the event settings.
            </p>
        </div>
    );
}

// ── Journal Header ────────────────────────────────────────────────────────────

export function JournalHeader({ event, postCount }: { event: Event; postCount: number }) {
    return (
        <div className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-white/5 px-4 py-4">
            <div className="max-w-xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center">
                        <Newspaper size={17} className="text-white" />
                    </div>
                    <div>
                        <p className="font-extrabold text-white text-sm leading-tight">Event Journal</p>
                        <p className="text-white/35 text-[11px] truncate max-w-[160px]">{event.name}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {event.isJournalEnabled && (
                        <div className="flex items-center gap-1.5">
                            <div className="relative w-2 h-2">
                                <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-75" />
                                <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                            </div>
                            <span className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest">Live</span>
                        </div>
                    )}
                    <span className="text-[11px] text-white/30 font-bold">{postCount} posts</span>
                </div>
            </div>
        </div>
    );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

export function JournalLoadingSpinner() {
    return (
        <div className="py-20 flex justify-center">
            <Loader2 size={28} className="text-slate-600 animate-spin" />
        </div>
    );
}
