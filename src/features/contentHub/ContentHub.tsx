/**
 * ContentHub.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Post-Event Content Hub
 * Route: /content-hub
 *
 * Four browsable content types:
 *   Sessions  — video recordings with an in-app player + key takeaways
 *   Speakers  — bio cards + linked sessions
 *   Documents — searchable download library
 *   Bookmarks — user's saved items (persisted in localStorage)
 *
 * Player: fully interactive progress, play/pause/seek simulation
 *          (swap src for a real video URL or YouTube embed in production)
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    Play, Pause, Volume2, VolumeX,
    Download, Bookmark, BookmarkCheck,
    Search, ChevronRight, ChevronLeft,
    Clock, Eye, FileText, Users, Video,
    X, ExternalLink, Star, SkipForward, SkipBack,
    Maximize2, LayoutGrid, List,
} from 'lucide-react';
import { toast } from 'sonner';
import {
    CONTENT_HUB, SPEAKERS, TRACK_COLORS,
    getAllSessions, getAllDocuments, getSpeakerById,
    type HubEvent, type HubSession, type Speaker,
} from './contentHubData';

// ── Utility ───────────────────────────────────────────────────────────────────

function cn(...cs: (string | false | undefined)[]) {
    return cs.filter(Boolean).join(' ');
}

function formatTime(sec: number): string {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

// ── Bookmarks (localStorage) ──────────────────────────────────────────────────

const BM_KEY = 'psi_hub_bookmarks';

function loadBookmarks(): Set<string> {
    try {
        const raw = localStorage.getItem(BM_KEY);
        return raw ? new Set(JSON.parse(raw) as string[]) : new Set<string>();
    } catch { return new Set<string>(); }
}

function saveBookmarks(bm: Set<string>) {
    localStorage.setItem(BM_KEY, JSON.stringify([...bm]));
}

// ── Video Player ──────────────────────────────────────────────────────────────

function VideoPlayer({
    session,
    onClose,
    onBookmark,
    isBookmarked,
}: {
    session: HubSession;
    onClose: () => void;
    onBookmark: (id: string) => void;
    isBookmarked: boolean;
}) {
    const [playing, setPlaying] = useState(false);
    const [progress, setProgress] = useState(0);     // 0–1
    const [muted, setMuted] = useState(false);
    const [currentSec, setCurrentSec] = useState(0);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Simulate playback with setInterval
    const startInterval = useCallback(() => {
        if (intervalRef.current) return;
        intervalRef.current = setInterval(() => {
            setCurrentSec(prev => {
                const next = prev + 1;
                if (next >= session.durationSec) {
                    clearInterval(intervalRef.current!);
                    intervalRef.current = null;
                    setPlaying(false);
                    setProgress(1);
                    return session.durationSec;
                }
                setProgress(next / session.durationSec);
                return next;
            });
        }, 1000);
    }, [session.durationSec]);

    const stopInterval = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, []);

    useEffect(() => {
        if (playing) startInterval(); else stopInterval();
        return stopInterval;
    }, [playing, startInterval, stopInterval]);

    // Cleanup on unmount
    useEffect(() => () => stopInterval(), [stopInterval]);

    function handleSeek(e: React.MouseEvent<HTMLDivElement>) {
        const rect = e.currentTarget.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const newSec = Math.floor(ratio * session.durationSec);
        setCurrentSec(newSec);
        setProgress(ratio);
    }

    function skip(secs: number) {
        const newSec = Math.max(0, Math.min(session.durationSec, currentSec + secs));
        setCurrentSec(newSec);
        setProgress(newSec / session.durationSec);
    }

    const speakers = session.speakerIds.map(id => getSpeakerById(id)).filter(Boolean) as Speaker[];

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-50 flex flex-col overflow-hidden"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.97, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.97 }}
                onClick={e => e.stopPropagation()}
                className="flex flex-col w-full h-full max-w-5xl mx-auto"
            >
                {/* Top bar */}
                <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <span className={cn('text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border', TRACK_COLORS[session.track])}>
                            {session.track}
                        </span>
                        <p className="text-white font-semibold text-sm truncate max-w-md">{session.title}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => onBookmark(session.id)}
                            className={cn('p-2 rounded-lg transition-colors', isBookmarked ? 'text-amber-400' : 'text-slate-500 hover:text-slate-300')}>
                            {isBookmarked ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                        </button>
                        <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* Video area */}
                <div className="flex-1 flex items-center justify-center px-4 overflow-hidden">
                    <div className={cn('w-full aspect-video max-h-[55vh] bg-gradient-to-br rounded-2xl flex items-center justify-center relative overflow-hidden', session.thumbnailColor)}>
                        {/* Simulated video slide */}
                        <div className="text-center">
                            <div className="text-8xl mb-4">{session.thumbnail}</div>
                            <p className="text-white/60 text-sm font-medium">Session Recording</p>
                            <p className="text-white/40 text-xs mt-1">{session.title}</p>
                        </div>

                        {/* Play overlay when paused */}
                        {!playing && (
                            <button
                                onClick={() => setPlaying(true)}
                                className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/10 transition-colors"
                            >
                                <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur border border-white/30 flex items-center justify-center hover:scale-105 transition-transform">
                                    <Play size={32} className="text-white ml-1" />
                                </div>
                            </button>
                        )}

                        {/* Speaker watermark */}
                        {speakers.length > 0 && (
                            <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-black/40 backdrop-blur px-3 py-1.5 rounded-lg">
                                <span className="text-lg">{speakers[0].avatar}</span>
                                <div>
                                    <p className="text-white text-xs font-semibold">{speakers[0].name}</p>
                                    <p className="text-white/60 text-[10px]">{speakers[0].company}</p>
                                </div>
                            </div>
                        )}

                        {/* Duration badge */}
                        <div className="absolute top-3 right-3 bg-black/50 backdrop-blur px-2 py-0.5 rounded text-white text-xs font-mono">
                            {session.duration}
                        </div>
                    </div>
                </div>

                {/* Controls */}
                <div className="px-4 pb-4 flex-shrink-0">
                    {/* Progress bar */}
                    <div className="mb-3 flex items-center gap-3">
                        <span className="text-slate-500 text-xs font-mono w-10 text-right">{formatTime(currentSec)}</span>
                        <div
                            className="flex-1 h-2 bg-slate-700 rounded-full cursor-pointer relative group"
                            onClick={handleSeek}
                        >
                            <div className="absolute inset-y-0 left-0 bg-emerald-500 rounded-full" style={{ width: `${progress * 100}%` }} />
                            <div
                                className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                style={{ left: `calc(${progress * 100}% - 7px)` }}
                            />
                        </div>
                        <span className="text-slate-500 text-xs font-mono w-10">{session.duration}</span>
                    </div>

                    {/* Buttons row */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button onClick={() => skip(-15)} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
                                <SkipBack size={16} />
                            </button>
                            <button
                                onClick={() => setPlaying(p => !p)}
                                className="w-12 h-12 rounded-full bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center text-white shadow-lg transition-colors"
                            >
                                {playing ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
                            </button>
                            <button onClick={() => skip(15)} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
                                <SkipForward size={16} />
                            </button>
                            <button onClick={() => setMuted(m => !m)} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
                                {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                            </button>
                        </div>
                        <div className="flex items-center gap-1 text-slate-500 text-xs">
                            <Eye size={11} /> {session.views.toLocaleString()} views
                        </div>
                    </div>
                </div>

                {/* Key takeaways + docs strip */}
                <div className="border-t border-white/10 flex-shrink-0 max-h-[28vh] overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-white/10">
                        {/* Takeaways */}
                        <div className="px-5 py-4">
                            <p className="text-white/50 text-[10px] font-black uppercase tracking-wider mb-2">Key Takeaways</p>
                            <ul className="space-y-1.5">
                                {session.keyTakeaways.map((t, i) => (
                                    <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                                        <span className="text-emerald-400 font-bold mt-0.5 flex-shrink-0">✓</span>
                                        {t}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        {/* Documents */}
                        <div className="px-5 py-4">
                            <p className="text-white/50 text-[10px] font-black uppercase tracking-wider mb-2">Session Documents</p>
                            <div className="space-y-2">
                                {session.documents.map(d => (
                                    <button key={d.id}
                                        onClick={() => toast.success(`Downloading: ${d.name}`)}
                                        className="w-full flex items-center gap-2 hover:bg-white/5 rounded-lg px-2 py-1.5 transition-colors text-left">
                                        <span className="text-base">{d.emoji}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white text-xs truncate">{d.name}</p>
                                            <p className="text-slate-500 text-[10px]">{d.type} · {d.sizeLabel}</p>
                                        </div>
                                        <Download size={11} className="text-slate-500 flex-shrink-0" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}

// ── Session card ──────────────────────────────────────────────────────────────

function SessionCard({
    session, isBookmarked, onPlay, onBookmark, compact,
}: {
    session: HubSession;
    isBookmarked: boolean;
    onPlay: () => void;
    onBookmark: (id: string) => void;
    compact?: boolean;
}) {
    const speakers = session.speakerIds.map(id => getSpeakerById(id)).filter(Boolean) as Speaker[];

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="group bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl overflow-hidden transition-colors"
        >
            {/* Thumbnail */}
            <div
                className={cn('relative bg-gradient-to-br aspect-video flex items-center justify-center cursor-pointer', session.thumbnailColor)}
                onClick={onPlay}
            >
                <span className="text-5xl">{session.thumbnail}</span>
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur border border-white/30 flex items-center justify-center">
                        <Play size={20} className="text-white ml-0.5" />
                    </div>
                </div>
                <div className="absolute top-2 right-2 bg-black/60 px-1.5 py-0.5 rounded text-white text-[10px] font-mono">{session.duration}</div>
                <div className="absolute bottom-2 left-2">
                    <span className={cn('text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border', TRACK_COLORS[session.track])}>
                        {session.track}
                    </span>
                </div>
                {isBookmarked && (
                    <div className="absolute top-2 left-2">
                        <BookmarkCheck size={14} className="text-amber-400" />
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-4">
                <h3 className="text-white font-bold text-sm leading-snug mb-2 line-clamp-2 group-hover:text-emerald-300 transition-colors cursor-pointer"
                    onClick={onPlay}>
                    {session.title}
                </h3>

                {!compact && (
                    <p className="text-slate-500 text-xs leading-relaxed mb-3 line-clamp-2">{session.description}</p>
                )}

                {/* Speakers */}
                {speakers.length > 0 && (
                    <div className="flex items-center gap-1.5 mb-3">
                        {speakers.map(sp => (
                            <div key={sp.id} className="flex items-center gap-1.5">
                                <span className="text-base">{sp.avatar}</span>
                                <span className="text-slate-400 text-xs">{sp.name}</span>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-slate-600 text-xs">
                        <span className="flex items-center gap-0.5"><Eye size={10} /> {session.views.toLocaleString()}</span>
                        <span className="flex items-center gap-0.5"><FileText size={10} /> {session.documents.length} docs</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <button onClick={() => onBookmark(session.id)}
                            className={cn('p-1.5 rounded-lg transition-colors', isBookmarked ? 'text-amber-400' : 'text-slate-600 hover:text-slate-300')}>
                            {isBookmarked ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
                        </button>
                        <button onClick={onPlay}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600/15 border border-emerald-600/20 text-emerald-400 text-[10px] font-bold hover:bg-emerald-600/25 transition-colors">
                            <Play size={9} /> Watch
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

// ── Speaker card ──────────────────────────────────────────────────────────────

function SpeakerCard({
    speaker, onOpen, isBookmarked, onBookmark,
}: {
    speaker: Speaker;
    onOpen: () => void;
    isBookmarked: boolean;
    onBookmark: (id: string) => void;
}) {
    const sessions = getAllSessions().filter(s => s.speakerIds.includes(speaker.id));
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 transition-colors group"
        >
            <div className="flex items-start gap-4 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-3xl flex-shrink-0">{speaker.avatar}</div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-white font-bold text-sm">{speaker.name}</h3>
                    <p className="text-slate-400 text-xs mt-0.5">{speaker.title}</p>
                    <p className="text-slate-500 text-xs">{speaker.company} · {speaker.country}</p>
                </div>
                <button onClick={() => onBookmark(speaker.id)}
                    className={cn('p-1.5 rounded-lg transition-colors flex-shrink-0', isBookmarked ? 'text-amber-400' : 'text-slate-600 hover:text-slate-300')}>
                    {isBookmarked ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
                </button>
            </div>

            <p className="text-slate-500 text-xs leading-relaxed mb-3 line-clamp-3">{speaker.bio}</p>

            <div className="flex flex-wrap gap-1 mb-4">
                {speaker.topics.map(t => (
                    <span key={t} className="text-[9px] bg-slate-800 border border-slate-700 text-slate-400 px-2 py-0.5 rounded-full">{t}</span>
                ))}
            </div>

            <div className="flex items-center justify-between">
                <span className="text-slate-600 text-xs">{sessions.length} session{sessions.length !== 1 ? 's' : ''}</span>
                <button onClick={onOpen}
                    className="flex items-center gap-1 text-emerald-400 text-xs font-semibold hover:gap-2 transition-all">
                    View profile <ChevronRight size={11} />
                </button>
            </div>
        </motion.div>
    );
}

// ── Speaker profile slide ─────────────────────────────────────────────────────

function SpeakerProfile({
    speaker, onClose, bookmarks, onBookmark, onPlaySession,
}: {
    speaker: Speaker;
    onClose: () => void;
    bookmarks: Set<string>;
    onBookmark: (id: string) => void;
    onPlaySession: (s: HubSession) => void;
}) {
    const sessions = getAllSessions().filter(s => s.speakerIds.includes(speaker.id));
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-40 flex justify-end"
            onClick={onClose}
        >
            <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 240 }}
                onClick={e => e.stopPropagation()}
                className="w-full max-w-md bg-slate-950 border-l border-slate-800 overflow-y-auto flex flex-col"
            >
                <div className="p-6 border-b border-slate-800 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-4xl">{speaker.avatar}</div>
                        <div>
                            <h2 className="text-white font-black text-lg">{speaker.name}</h2>
                            <p className="text-slate-400 text-sm">{speaker.title}</p>
                            <p className="text-slate-500 text-xs">{speaker.company}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors flex-shrink-0">
                        <X size={16} />
                    </button>
                </div>

                <div className="p-6 space-y-6 flex-1">
                    <div>
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-wider mb-2">About</p>
                        <p className="text-slate-300 text-sm leading-relaxed">{speaker.bio}</p>
                    </div>
                    <div>
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-wider mb-2">Topics</p>
                        <div className="flex flex-wrap gap-1.5">
                            {speaker.topics.map(t => (
                                <span key={t} className="text-xs bg-slate-800 border border-slate-700 text-slate-300 px-2.5 py-1 rounded-full">{t}</span>
                            ))}
                        </div>
                    </div>
                    {sessions.length > 0 && (
                        <div>
                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-wider mb-3">Sessions ({sessions.length})</p>
                            <div className="space-y-2">
                                {sessions.map(s => (
                                    <button key={s.id} onClick={() => onPlaySession(s)}
                                        className="w-full text-left flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-xl p-3 hover:border-slate-700 transition-colors">
                                        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 bg-gradient-to-br', s.thumbnailColor)}>{s.thumbnail}</div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white text-xs font-semibold truncate">{s.title}</p>
                                            <p className="text-slate-500 text-[10px]">{s.duration} · {s.views.toLocaleString()} views</p>
                                        </div>
                                        <Play size={12} className="text-emerald-400 flex-shrink-0" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}

// ── Document row ──────────────────────────────────────────────────────────────

function DocumentRow({ doc }: { doc: ReturnType<typeof getAllDocuments>[0] }) {
    return (
        <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-xl p-3 hover:border-slate-700 transition-colors">
            <span className="text-2xl">{doc.emoji}</span>
            <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-semibold truncate">{doc.name}</p>
                <p className="text-slate-500 text-xs">{doc.type} · {doc.sizeLabel} · {doc.downloads.toLocaleString()} downloads</p>
            </div>
            <button onClick={() => toast.success(`Downloading: ${doc.name}`)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold hover:bg-emerald-600 hover:border-emerald-600 hover:text-white transition-all flex-shrink-0">
                <Download size={11} /> Download
            </button>
        </div>
    );
}

// ── Main component ────────────────────────────────────────────────────────────

type ViewTab = 'sessions' | 'speakers' | 'documents' | 'bookmarks';

export default function ContentHub() {
    const [activeEvent, setActiveEvent] = useState<HubEvent>(CONTENT_HUB[0]);
    const [viewTab, setViewTab] = useState<ViewTab>('sessions');
    const [query, setQuery] = useState('');
    const [bookmarks, setBookmarks] = useState<Set<string>>(loadBookmarks);
    const [playingSession, setPlayingSession] = useState<HubSession | null>(null);
    const [openSpeaker, setOpenSpeaker] = useState<Speaker | null>(null);
    const [gridMode, setGridMode] = useState(true);

    function toggleBookmark(id: string) {
        setBookmarks(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
                toast.success('Bookmark removed');
            } else {
                next.add(id);
                toast.success('Bookmarked!');
            }
            saveBookmarks(next);
            return next;
        });
    }

    const allSessions = useMemo(() => activeEvent.sessions, [activeEvent]);
    const allDocs = useMemo(() => activeEvent.sessions.flatMap(s => s.documents), [activeEvent]);

    const filteredSessions = useMemo(() => {
        if (!query) return allSessions;
        const q = query.toLowerCase();
        return allSessions.filter(s =>
            s.title.toLowerCase().includes(q) ||
            s.description.toLowerCase().includes(q) ||
            s.tags.some(t => t.toLowerCase().includes(q))
        );
    }, [allSessions, query]);

    const filteredSpeakers = useMemo(() => {
        if (!query) return SPEAKERS;
        const q = query.toLowerCase();
        return SPEAKERS.filter(s =>
            s.name.toLowerCase().includes(q) ||
            s.company.toLowerCase().includes(q) ||
            s.topics.some(t => t.toLowerCase().includes(q))
        );
    }, [query]);

    const filteredDocs = useMemo(() => {
        if (!query) return allDocs;
        const q = query.toLowerCase();
        return allDocs.filter(d => d.name.toLowerCase().includes(q) || d.type.toLowerCase().includes(q));
    }, [allDocs, query]);

    const bookmarkedSessions = useMemo(() => allSessions.filter(s => bookmarks.has(s.id)), [allSessions, bookmarks]);
    const bookmarkedSpeakers = useMemo(() => SPEAKERS.filter(s => bookmarks.has(s.id)), [bookmarks]);

    return (
        <div className="h-screen bg-slate-950 flex flex-col font-sans overflow-hidden">

            {/* ── Header ────────────────────────────────────────────────── */}
            <div className="bg-slate-900 border-b border-slate-800 px-5 py-3.5 flex-shrink-0">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                        <div className="flex items-center gap-2">
                            <Video size={18} className="text-violet-400" />
                            <h1 className="text-white font-extrabold text-base">Post-Event Content Hub</h1>
                        </div>
                        <p className="text-slate-500 text-xs mt-0.5">
                            {allSessions.length} sessions · {allDocs.length} documents · {SPEAKERS.length} speakers
                        </p>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                        {/* Event selector */}
                        <div className="flex gap-1">
                            {CONTENT_HUB.map(ev => (
                                <button key={ev.id} onClick={() => { setActiveEvent(ev); setQuery(''); }}
                                    className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all',
                                        activeEvent.id === ev.id
                                            ? 'bg-violet-600 border-violet-500 text-white'
                                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200')}>
                                    <span>{ev.coverEmoji}</span>
                                    <span className="hidden sm:inline">{ev.location}</span>
                                    <span className={cn('text-[8px] px-1 py-0.5 rounded-full font-black',
                                        ev.status === 'Published' ? 'bg-emerald-500/20 text-emerald-400' :
                                            ev.status === 'Processing' ? 'bg-amber-500/20 text-amber-400' :
                                                'bg-slate-700 text-slate-500')}>
                                        {ev.status}
                                    </span>
                                </button>
                            ))}
                        </div>

                        {/* Search */}
                        <div className="relative">
                            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input value={query} onChange={e => setQuery(e.target.value)}
                                placeholder="Search content…"
                                className="bg-slate-800 border border-slate-700 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 w-44 transition-colors" />
                        </div>

                        {/* Grid/List toggle */}
                        <div className="flex bg-slate-800 border border-slate-700 rounded-xl p-0.5 gap-0.5">
                            <button onClick={() => setGridMode(true)}
                                className={cn('p-1.5 rounded-lg transition-colors', gridMode ? 'bg-slate-600 text-white' : 'text-slate-500')}>
                                <LayoutGrid size={13} />
                            </button>
                            <button onClick={() => setGridMode(false)}
                                className={cn('p-1.5 rounded-lg transition-colors', !gridMode ? 'bg-slate-600 text-white' : 'text-slate-500')}>
                                <List size={13} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Tab bar ────────────────────────────────────────────────── */}
            <div className="flex border-b border-slate-800 px-5 bg-slate-900/40 flex-shrink-0">
                {([
                    { id: 'sessions', label: 'Sessions', icon: Video, count: allSessions.length },
                    { id: 'speakers', label: 'Speakers', icon: Users, count: SPEAKERS.length },
                    { id: 'documents', label: 'Documents', icon: FileText, count: allDocs.length },
                    { id: 'bookmarks', label: 'Saved', icon: Bookmark, count: bookmarks.size },
                ] as { id: ViewTab; label: string; icon: React.ElementType; count: number }[]).map(t => (
                    <button key={t.id} onClick={() => setViewTab(t.id)}
                        className={cn('flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 transition-colors',
                            viewTab === t.id ? 'border-violet-500 text-violet-400' : 'border-transparent text-slate-500 hover:text-slate-300')}>
                        <t.icon size={13} /> {t.label}
                        <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full font-black', viewTab === t.id ? 'bg-violet-500/20 text-violet-400' : 'bg-slate-700 text-slate-500')}>
                            {t.count}
                        </span>
                    </button>
                ))}
            </div>

            {/* ── Processing state ───────────────────────────────────────── */}
            {activeEvent.status !== 'Published' ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <span className="text-6xl mb-4 block">{activeEvent.coverEmoji}</span>
                        <h2 className="text-white font-black text-xl mb-2">{activeEvent.name}</h2>
                        <p className="text-slate-500 text-sm max-w-sm">{activeEvent.description}</p>
                        <div className="mt-4 flex items-center justify-center gap-2 text-amber-400 text-sm font-semibold">
                            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                            Content processing — check back soon
                        </div>
                    </div>
                </div>
            ) : (
                /* ── Content ──────────────────────────────────────────────── */
                <div className="flex-1 overflow-y-auto p-5">
                    <AnimatePresence mode="wait">

                        {/* Sessions */}
                        {viewTab === 'sessions' && (
                            <motion.div key="sessions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                {filteredSessions.length === 0 ? (
                                    <div className="text-center py-20 text-slate-600">
                                        <Video size={36} className="mx-auto mb-3" />
                                        <p>No sessions match your search</p>
                                    </div>
                                ) : (
                                    <div className={cn(
                                        gridMode
                                            ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5'
                                            : 'space-y-3'
                                    )}>
                                        {filteredSessions.map(s => (
                                            <SessionCard
                                                key={s.id}
                                                session={s}
                                                isBookmarked={bookmarks.has(s.id)}
                                                onPlay={() => setPlayingSession(s)}
                                                onBookmark={toggleBookmark}
                                                compact={!gridMode}
                                            />
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* Speakers */}
                        {viewTab === 'speakers' && (
                            <motion.div key="speakers" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                                    {filteredSpeakers.map(sp => (
                                        <SpeakerCard
                                            key={sp.id}
                                            speaker={sp}
                                            isBookmarked={bookmarks.has(sp.id)}
                                            onOpen={() => setOpenSpeaker(sp)}
                                            onBookmark={toggleBookmark}
                                        />
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {/* Documents */}
                        {viewTab === 'documents' && (
                            <motion.div key="documents" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                <div className="space-y-2">
                                    {filteredDocs.length === 0 ? (
                                        <div className="text-center py-20 text-slate-600">
                                            <FileText size={36} className="mx-auto mb-3" />
                                            <p>No documents match your search</p>
                                        </div>
                                    ) : filteredDocs.map(d => <DocumentRow key={d.id} doc={d} />)}
                                </div>
                            </motion.div>
                        )}

                        {/* Bookmarks */}
                        {viewTab === 'bookmarks' && (
                            <motion.div key="bookmarks" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                {bookmarks.size === 0 ? (
                                    <div className="text-center py-20 text-slate-600">
                                        <Bookmark size={36} className="mx-auto mb-3" />
                                        <p className="font-semibold">No bookmarks yet</p>
                                        <p className="text-sm mt-1">Tap the bookmark icon on any session or speaker to save it here</p>
                                    </div>
                                ) : (
                                    <div className="space-y-8">
                                        {bookmarkedSessions.length > 0 && (
                                            <div>
                                                <p className="text-slate-500 text-[10px] font-black uppercase tracking-wider mb-3">Saved Sessions ({bookmarkedSessions.length})</p>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                                                    {bookmarkedSessions.map(s => (
                                                        <SessionCard
                                                            key={s.id}
                                                            session={s}
                                                            isBookmarked
                                                            onPlay={() => setPlayingSession(s)}
                                                            onBookmark={toggleBookmark}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {bookmarkedSpeakers.length > 0 && (
                                            <div>
                                                <p className="text-slate-500 text-[10px] font-black uppercase tracking-wider mb-3">Saved Speakers ({bookmarkedSpeakers.length})</p>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                                                    {bookmarkedSpeakers.map(sp => (
                                                        <SpeakerCard
                                                            key={sp.id}
                                                            speaker={sp}
                                                            isBookmarked
                                                            onOpen={() => setOpenSpeaker(sp)}
                                                            onBookmark={toggleBookmark}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}

            {/* ── Video Player modal ─────────────────────────────────────── */}
            <AnimatePresence>
                {playingSession && (
                    <VideoPlayer
                        session={playingSession}
                        isBookmarked={bookmarks.has(playingSession.id)}
                        onBookmark={toggleBookmark}
                        onClose={() => setPlayingSession(null)}
                    />
                )}
            </AnimatePresence>

            {/* ── Speaker profile slide-over ─────────────────────────────── */}
            <AnimatePresence>
                {openSpeaker && (
                    <SpeakerProfile
                        speaker={openSpeaker}
                        bookmarks={bookmarks}
                        onBookmark={toggleBookmark}
                        onClose={() => setOpenSpeaker(null)}
                        onPlaySession={s => { setOpenSpeaker(null); setTimeout(() => setPlayingSession(s), 100); }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
