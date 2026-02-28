/**
 * EventJournal.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * LIVE EVENT JOURNAL & MEDIA FEED
 * Premium corporate social feed — think private LinkedIn meets Instagram.
 *
 * Architecture:
 *   Feed reader  → onSnapshot on events/{eventId}/journal, order by timestamp desc
 *   Post creator → Media Officer / Organizer only (gated by assignedMediaOfficerId)
 *   AI Rewriter  → journalFormatter.polishJournalEntry() → Gemini 2.0 Flash
 *   Storage      → mediaService.uploadJournalMediaBatch()
 *   Voice input  → native webkitSpeechRecognition (zero dependencies)
 *
 * Props:
 *   eventId             — Firestore event document ID
 *   event               — hydrated Event object (for isJournalEnabled + assignedMediaOfficerId)
 *   currentUserId       — logged-in user UID (for gate + author attribution)
 *   currentUserName     — display name for post attribution
 *   currentUserRole     — UserRole (Organizer may also post even if not Media Officer)
 */

import React, {
    useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    Camera, Mic, MicOff, Sparkles, Send, X, Image as ImageIcon,
    Video, Lock, Newspaper, MapPin, Clock, ChevronDown,
    Loader2, AlertCircle, CheckCircle2, Hash, AtSign, Star,
    Play, Pause, Volume2,
} from 'lucide-react';
import {
    collection, onSnapshot, addDoc, serverTimestamp,
    query, orderBy, limit, Unsubscribe,
} from 'firebase/firestore';
import { db } from '../../services/firebase/firebaseConfig';
import {
    uploadJournalMediaBatch,
    isAllowedFileType,
    getAllowedExtensions,
} from '../../services/firebase/mediaService';
import {
    polishJournalEntry,
    buildEventContext,
} from '../../services/ai/journalFormatter';
import type { Event } from '../../types';
import type { JournalPost, JournalMedia } from '../../types/journal';
import type { UserRole } from '../../types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
    return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

function relativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const s = Math.floor(diff / 1000);
    if (s < 60) return 'just now';
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return new Date(iso).toLocaleDateString('en-AE', { day: 'numeric', month: 'short' });
}

/** Render @username references in emerald */
function RichContent({ text }: { text: string }) {
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

// roleCanPost — Organizer or the designated Media Officer
function roleCanPost(
    currentUserId: string,
    currentUserRole: UserRole,
    assignedMediaOfficerId?: string
): boolean {
    if (currentUserRole === 'Organizer' || currentUserRole === 'Manager') return true;
    if (assignedMediaOfficerId && currentUserId === assignedMediaOfficerId) return true;
    return false;
}

// ── Media grid ────────────────────────────────────────────────────────────────

function MediaGrid({ media }: { media: JournalMedia[] }) {
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
                            <img
                                src={m.url}
                                alt={m.filename}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                loading="lazy"
                            />
                        ) : (
                            <div className="relative w-full h-full flex items-center justify-center bg-slate-900">
                                <video
                                    src={m.url}
                                    className="w-full h-full object-cover opacity-70"
                                    muted playsInline preload="metadata"
                                />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                                        <Play size={18} className="text-white ml-0.5" />
                                    </div>
                                </div>
                            </div>
                        )}
                        {/* +N overlay on 4th slot */}
                        {i === 3 && media.length > 4 && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                <span className="text-white text-xl font-extrabold">+{media.length - 4}</span>
                            </div>
                        )}
                        <div className="absolute inset-0 ring-1 ring-inset ring-white/5 group-hover:ring-white/10 transition-all" />
                    </div>
                ))}
            </div>

            {/* Lightbox */}
            <AnimatePresence>
                {lightboxIdx !== null && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4"
                        onClick={() => setLightboxIdx(null)}
                    >
                        <button
                            className="absolute top-4 right-4 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                            onClick={() => setLightboxIdx(null)}
                        >
                            <X size={20} />
                        </button>
                        <motion.div
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.9 }}
                            className="max-w-4xl max-h-[85vh] relative"
                            onClick={e => e.stopPropagation()}
                        >
                            {media[lightboxIdx].type === 'photo' ? (
                                <img
                                    src={media[lightboxIdx].url}
                                    alt=""
                                    className="max-w-full max-h-[85vh] rounded-2xl object-contain"
                                />
                            ) : (
                                <video
                                    src={media[lightboxIdx].url}
                                    controls autoPlay
                                    className="max-w-full max-h-[85vh] rounded-2xl"
                                />
                            )}
                        </motion.div>
                        {/* Prev / Next */}
                        {lightboxIdx > 0 && (
                            <button
                                className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 bg-white/10 rounded-full flex items-center justify-center text-white"
                                onClick={e => { e.stopPropagation(); setLightboxIdx(lightboxIdx - 1); }}
                            >
                                <ChevronDown className="rotate-90" size={20} />
                            </button>
                        )}
                        {lightboxIdx < media.length - 1 && (
                            <button
                                className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 bg-white/10 rounded-full flex items-center justify-center text-white"
                                onClick={e => { e.stopPropagation(); setLightboxIdx(lightboxIdx + 1); }}
                            >
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

function PostCard({ post, index }: { post: JournalPost; index: number }) {
    const [expanded, setExpanded] = useState(true);
    const isLong = post.content.length > 320;

    // Avatar gradient by author initial
    const avatarColors = [
        'from-violet-500 to-violet-700',
        'from-emerald-500 to-emerald-700',
        'from-blue-500 to-blue-700',
        'from-amber-500 to-amber-700',
        'from-rose-500 to-rose-700',
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
            {/* Card header */}
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
                                <Sparkles size={9} />
                                AI Polished
                            </span>
                        )}
                        {post.isPinned && (
                            <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full font-bold">
                                <Star size={9} />
                                Pinned
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                        <Clock size={10} className="text-white/30" />
                        <span className="text-[11px] text-white/30">
                            {relativeTime(post.timestamp)}
                        </span>
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

            {/* Media */}
            {post.media.length > 0 && (
                <div className="px-5 mt-1">
                    <MediaGrid media={post.media} />
                </div>
            )}

            {/* Content */}
            <div className="px-5 py-4">
                <p className={`text-sm text-white/80 leading-relaxed ${!expanded && isLong ? 'line-clamp-3' : ''}`}>
                    <RichContent text={post.content} />
                </p>
                {isLong && (
                    <button
                        onClick={() => setExpanded(v => !v)}
                        className="mt-1.5 text-[12px] font-bold text-blue-400 hover:text-blue-300 transition-colors"
                    >
                        {expanded ? 'Show less' : 'Read more'}
                    </button>
                )}
            </div>

            {/* Hashtags */}
            {post.hashtags.length > 0 && (
                <div className="px-5 pb-3 flex flex-wrap gap-1.5">
                    {post.hashtags.map(tag => (
                        <span key={tag} className="text-[11px] text-blue-400 font-bold">#{tag}</span>
                    ))}
                </div>
            )}

            {/* Footer */}
            <div className="px-5 pb-4 flex items-center justify-between border-t border-white/5 pt-3">
                <span className="text-[10px] text-white/20 font-bold uppercase tracking-widest">
                    {post.viewCount} views
                </span>
                {post.taggedUserIds.length > 0 && (
                    <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                        <AtSign size={10} />
                        {post.taggedUserIds.length} tagged
                    </span>
                )}
            </div>
        </motion.div>
    );
}

// ── Pending media preview ─────────────────────────────────────────────────────

function MediaPreviewStrip({
    files,
    onRemove,
    uploadProgress,
}: {
    files: File[];
    onRemove: (idx: number) => void;
    uploadProgress: number | null;
}) {
    if (!files.length) return null;
    return (
        <div className="px-4 py-3 border-t border-white/5">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {files.map((f, i) => {
                    const isImg = f.type.startsWith('image/');
                    const url = isImg ? URL.createObjectURL(f) : null;
                    return (
                        <div key={i} className="relative flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-slate-800 border border-white/10">
                            {url ? (
                                <img src={url} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <Video size={20} className="text-slate-500" />
                                </div>
                            )}
                            <button
                                onClick={() => onRemove(i)}
                                className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/70 rounded-full flex items-center justify-center"
                            >
                                <X size={10} className="text-white" />
                            </button>
                        </div>
                    );
                })}
            </div>
            {uploadProgress !== null && (
                <div className="mt-2">
                    <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-gradient-to-r from-violet-500 to-violet-400 rounded-full"
                            animate={{ width: `${uploadProgress}%` }}
                            transition={{ ease: 'easeOut' }}
                        />
                    </div>
                    <p className="text-[10px] text-white/30 mt-1">{uploadProgress}% uploaded</p>
                </div>
            )}
        </div>
    );
}

// ── Voice dictation hook ──────────────────────────────────────────────────────
// Uses unknown casts to avoid depending on the Web Speech API lib types
// (which require "lib": ["dom"] with experimental flags in some TS configs).

type DictateState = 'idle' | 'listening' | 'error';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRec = any;

function useSpeechRecognition(onResult: (text: string) => void) {
    const [state, setState] = useState<DictateState>('idle');
    const recRef = useRef<AnyRec>(null);

    const isSupported = typeof window !== 'undefined' &&
        ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

    const start = useCallback(() => {
        if (!isSupported) { setState('error'); return; }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const w = window as any;
        const SR = w['SpeechRecognition'] ?? w['webkitSpeechRecognition'];
        if (!SR) { setState('error'); return; }

        const rec: AnyRec = new SR();
        recRef.current = rec;
        rec.continuous = true;
        rec.interimResults = false;
        rec.lang = 'en-US';

        rec.onstart = () => setState('listening');
        rec.onerror = () => setState('error');
        rec.onend = () => setState('idle');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rec.onresult = (e: any) => {
            let text = '';
            for (let i = (e.resultIndex as number); i < e.results.length; i++) {
                if (e.results[i].isFinal) text += (e.results[i][0].transcript as string) + ' ';
            }
            if (text.trim()) onResult(text.trim());
        };
        rec.start();
    }, [isSupported, onResult]);

    const stop = useCallback(() => {
        recRef.current?.stop();
        setState('idle');
    }, []);

    return { state, start, stop, isSupported };
}

// ── Composer (sticky bottom) ──────────────────────────────────────────────────

function Composer({
    eventId,
    eventName,
    eventCity,
    authorId,
    authorName,
    authorRole,
    onPosted,
}: {
    eventId: string;
    eventName: string;
    eventCity?: string;
    authorId: string;
    authorName: string;
    authorRole: string;
    onPosted: () => void;
}) {
    const [open, setOpen] = useState(false);
    const [text, setText] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const [polishing, setPolishing] = useState(false);
    const [posting, setPosting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const appendVoice = useCallback((transcript: string) => {
        setText(prev => prev ? `${prev} ${transcript}` : transcript);
        textareaRef.current?.focus();
    }, []);

    const { state: dictState, start: startDict, stop: stopDict, isSupported: dictSupported } =
        useSpeechRecognition(appendVoice);

    function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
        const picked = Array.from(e.target.files ?? []).filter(isAllowedFileType);
        setFiles(prev => [...prev, ...picked].slice(0, 9)); // cap at 9
        if (e.target) e.target.value = '';
    }

    function removeFile(idx: number) {
        setFiles(prev => prev.filter((_, i) => i !== idx));
    }

    async function handlePolish() {
        if (!text.trim()) { setErrorMsg('Type or dictate some notes first.'); return; }
        setPolishing(true);
        setErrorMsg(null);
        try {
            const ctx = buildEventContext(eventName, eventCity ?? '');
            const result = await polishJournalEntry(text, { eventContext: ctx });
            setText(result.polishedText);
        } catch (e: unknown) {
            setErrorMsg((e as Error).message ?? 'AI rewrite failed.');
        } finally {
            setPolishing(false);
        }
    }

    async function handlePost() {
        if (!text.trim() && !files.length) {
            setErrorMsg('Write something or attach a photo before posting.');
            return;
        }
        setPosting(true);
        setErrorMsg(null);

        try {
            // 1. Upload media
            let media: JournalMedia[] = [];
            if (files.length) {
                setUploading(true);
                const result = await uploadJournalMediaBatch(
                    eventId, files,
                    pct => setUploadProgress(pct)
                );
                media = result.succeeded;
                if (result.failed.length) {
                    setErrorMsg(`${result.failed.length} file(s) failed to upload and were skipped.`);
                }
                setUploading(false);
                setUploadProgress(null);
            }

            // 2. Write Firestore document
            await addDoc(collection(db, 'events', eventId, 'journal'), {
                eventId,
                authorId,
                authorName,
                authorRole,
                content: text.trim(),
                rawContent: text.trim(),
                isAIPolished: false,
                aiPolishHistory: [],
                mediaUrls: media.map(m => m.url),
                media,
                taggedUserIds: [],
                hashtags: [],
                status: 'published',
                timestamp: serverTimestamp(),
                isPinned: false,
                viewCount: 0,
            });

            // Reset
            setText('');
            setFiles([]);
            setOpen(false);
            setSuccessMsg('Post published! 🎉');
            setTimeout(() => setSuccessMsg(null), 3000);
            onPosted();
        } catch (e: unknown) {
            setErrorMsg((e as Error).message ?? 'Failed to post. Try again.');
        } finally {
            setPosting(false);
        }
    }

    const canPost = !posting && !polishing && !uploading && (!!text.trim() || !!files.length);

    return (
        <>
            {/* FAB (when composer is closed) */}
            <AnimatePresence>
                {!open && (
                    <motion.button
                        id="journal-fab"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        onClick={() => { setOpen(true); setTimeout(() => textareaRef.current?.focus(), 80); }}
                        className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-gradient-to-br from-violet-500 to-violet-700 rounded-2xl shadow-2xl shadow-violet-500/30 flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-transform"
                        aria-label="Create journal post"
                    >
                        <Newspaper size={24} />
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Composer panel */}
            <AnimatePresence>
                {open && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
                            onClick={() => setOpen(false)}
                        />

                        <motion.div
                            initial={{ y: '100%', opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: '100%', opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 260, damping: 32 }}
                            className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900 border-t border-white/10 rounded-t-3xl pb-safe"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Drag handle */}
                            <div className="flex justify-center pt-3 pb-1">
                                <div className="w-10 h-1 bg-white/20 rounded-full" />
                            </div>

                            {/* Header */}
                            <div className="px-4 py-3 flex items-center justify-between">
                                <div>
                                    <p className="font-extrabold text-white text-sm">New Journal Post</p>
                                    <p className="text-[11px] text-white/30">{eventName}</p>
                                </div>
                                <button
                                    onClick={() => setOpen(false)}
                                    className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:bg-white/10 transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            {/* Text area */}
                            <div className="px-4 pb-2">
                                <textarea
                                    ref={textareaRef}
                                    id="journal-composer-textarea"
                                    value={text}
                                    onChange={e => setText(e.target.value)}
                                    placeholder={
                                        dictState === 'listening'
                                            ? '🎤 Listening… speak your notes…'
                                            : "What happened at the event? Describe leads, vibes, highlights…"
                                    }
                                    rows={5}
                                    className="w-full bg-slate-800/60 border border-white/8 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-white/20 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/40 transition-all leading-relaxed"
                                />
                            </div>

                            {/* Voice indicator */}
                            <AnimatePresence>
                                {dictState === 'listening' && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="px-4 pb-2 flex items-center gap-2"
                                    >
                                        <div className="flex gap-0.5 items-end">
                                            {[1, 2, 3, 4, 3, 2].map((h, i) => (
                                                <motion.div
                                                    key={i}
                                                    className="w-1 bg-rose-400 rounded-full"
                                                    animate={{ height: [`${h * 4}px`, `${(h + 2) * 4}px`, `${h * 4}px`] }}
                                                    transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.1 }}
                                                />
                                            ))}
                                        </div>
                                        <span className="text-rose-400 text-xs font-bold">Listening — tap Mic to stop</span>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Error / success */}
                            <AnimatePresence>
                                {errorMsg && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="mx-4 mb-2 flex items-center gap-2 px-3 py-2 bg-rose-500/10 border border-rose-500/20 rounded-xl"
                                    >
                                        <AlertCircle size={13} className="text-rose-400 flex-shrink-0" />
                                        <p className="text-rose-400 text-[12px]">{errorMsg}</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Media preview */}
                            <MediaPreviewStrip
                                files={files}
                                onRemove={removeFile}
                                uploadProgress={uploadProgress}
                            />

                            {/* Action bar */}
                            <div className="px-4 py-3 flex items-center gap-2">

                                {/* 📷 Upload */}
                                <button
                                    id="journal-upload-btn"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-12 h-12 rounded-2xl bg-slate-800 border border-white/8 flex items-center justify-center text-white/60 hover:text-white hover:bg-slate-700 transition-all active:scale-95"
                                    aria-label="Attach photo or video"
                                >
                                    <Camera size={22} />
                                </button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    multiple
                                    accept={getAllowedExtensions()}
                                    onChange={handleFilePick}
                                    className="hidden"
                                    id="journal-file-input"
                                />

                                {/* 🎤 Dictate */}
                                <button
                                    id="journal-dictate-btn"
                                    onClick={dictState === 'listening' ? stopDict : startDict}
                                    disabled={!dictSupported}
                                    className={`w-12 h-12 rounded-2xl border flex items-center justify-center transition-all active:scale-95
                                        ${dictState === 'listening'
                                            ? 'bg-rose-500 border-rose-500 text-white shadow-lg shadow-rose-500/30 animate-pulse'
                                            : dictState === 'error'
                                                ? 'bg-slate-800 border-rose-500/30 text-rose-400'
                                                : 'bg-slate-800 border-white/8 text-white/60 hover:text-white hover:bg-slate-700'
                                        }
                                        ${!dictSupported ? 'opacity-30 cursor-not-allowed' : ''}
                                    `}
                                    aria-label={dictState === 'listening' ? 'Stop dictating' : 'Start dictating'}
                                    title={!dictSupported ? 'Speech recognition not supported in this browser' : undefined}
                                >
                                    {dictState === 'listening' ? <MicOff size={22} /> : <Mic size={22} />}
                                </button>

                                {/* ✨ Polish with AI */}
                                <button
                                    id="journal-polish-btn"
                                    onClick={handlePolish}
                                    disabled={polishing || !text.trim()}
                                    className={`flex-1 h-12 rounded-2xl border flex items-center justify-center gap-2 text-sm font-bold transition-all active:scale-[0.97]
                                        ${polishing
                                            ? 'bg-violet-900/30 border-violet-500/30 text-violet-400'
                                            : text.trim()
                                                ? 'bg-violet-600 border-violet-500 text-white hover:bg-violet-500 shadow-lg shadow-violet-500/20'
                                                : 'bg-slate-800 border-white/8 text-white/20 cursor-not-allowed'
                                        }
                                    `}
                                    aria-label="Polish with Gemini AI"
                                >
                                    {polishing
                                        ? <><Loader2 size={16} className="animate-spin" /> Polishing…</>
                                        : <><Sparkles size={16} /> Polish with AI</>
                                    }
                                </button>

                                {/* → Post */}
                                <button
                                    id="journal-post-btn"
                                    onClick={handlePost}
                                    disabled={!canPost}
                                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all active:scale-95
                                        ${canPost
                                            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-400'
                                            : 'bg-slate-800 text-white/20 cursor-not-allowed'
                                        }
                                    `}
                                    aria-label="Publish post"
                                >
                                    {posting
                                        ? <Loader2 size={20} className="animate-spin" />
                                        : <Send size={20} />
                                    }
                                </button>
                            </div>

                            {/* Bottom safe area padding */}
                            <div className="h-safe-bottom" />
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Success toast */}
            <AnimatePresence>
                {successMsg && (
                    <motion.div
                        initial={{ opacity: 0, y: 48 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 48 }}
                        className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 bg-emerald-500 text-white rounded-2xl shadow-2xl font-bold text-sm"
                    >
                        <CheckCircle2 size={16} />
                        {successMsg}
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

// ── Locked screen ─────────────────────────────────────────────────────────────

function JournalLockedView() {
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

// ── Empty feed ────────────────────────────────────────────────────────────────

function EmptyFeed() {
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

// ── Main component ────────────────────────────────────────────────────────────

interface EventJournalProps {
    eventId: string;
    event: Event;
    currentUserId: string;
    currentUserName: string;
    currentUserRole: UserRole;
}

export default function EventJournal({
    eventId,
    event,
    currentUserId,
    currentUserName,
    currentUserRole,
}: EventJournalProps) {
    const [posts, setPosts] = useState<JournalPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [tick, setTick] = useState(0); // force time re-render

    const canCompose = roleCanPost(currentUserId, currentUserRole, event.assignedMediaOfficerId ?? '');

    // ── Realtime feed ──────────────────────────────────────────────────────────
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

    // ── Locked gate ────────────────────────────────────────────────────────────
    if (!event.isJournalEnabled) {
        return (
            <div className="min-h-screen bg-slate-950">
                <JournalHeader event={event} postCount={0} />
                <JournalLockedView />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 pb-32">

            <JournalHeader event={event} postCount={posts.length} />

            {/* Feed */}
            <div className="max-w-xl mx-auto px-4 py-4 space-y-4">
                {loading ? (
                    <div className="py-20 flex justify-center">
                        <Loader2 size={28} className="text-slate-600 animate-spin" />
                    </div>
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
                    onPosted={() => {/* feed updates via onSnapshot */ }}
                />
            )}
        </div>
    );
}

// ── Header sub-component ──────────────────────────────────────────────────────

function JournalHeader({ event, postCount }: { event: Event; postCount: number }) {
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
