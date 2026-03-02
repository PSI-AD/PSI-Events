/**
 * journal/Composer.tsx
 * The sticky bottom composer panel for the Live Event Journal:
 *  - useSpeechRecognition hook  — native Web Speech API dictation
 *  - MediaPreviewStrip          — thumbnail row for pending uploads
 *  - Composer                   — full post creation flow (FAB → bottom sheet)
 */

import React, { useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    Camera, Mic, MicOff, Sparkles, Send, X,
    Video, Loader2, AlertCircle, CheckCircle2, Newspaper,
} from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../services/firebase/firebaseConfig';
import {
    uploadJournalMediaBatch,
    isAllowedFileType,
    getAllowedExtensions,
} from '../../../services/firebase/mediaService';
import { polishJournalEntry, buildEventContext } from '../../../services/ai/journalFormatter';
import type { JournalMedia } from '../../../types/journal';

// ── Voice dictation hook ──────────────────────────────────────────────────────

type DictateState = 'idle' | 'listening' | 'error';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRec = any;

export function useSpeechRecognition(onResult: (text: string) => void) {
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

// ── Pending media preview ─────────────────────────────────────────────────────

export function MediaPreviewStrip({
    files, onRemove, uploadProgress,
}: {
    files: File[];
    onRemove: (idx: number) => void;
    uploadProgress: number | null;
}) {
    if (!files.length) return null;
    return (
        <div className="px-4 py-3 border-t border-black/5 dark:border-white/5">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {files.map((f, i) => {
                    const isImg = f.type.startsWith('image/');
                    const url = isImg ? URL.createObjectURL(f) : null;
                    return (
                        <div key={i} className="relative flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-black/10 dark:border-white/10">
                            {url ? (
                                <img src={url} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <Video size={20} className="text-slate-600 dark:text-slate-400" />
                                </div>
                            )}
                            <button
                                onClick={() => onRemove(i)}
                                className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/70 rounded-full flex items-center justify-center"
                            >
                                <X size={10} className="text-slate-900 dark:text-white" />
                            </button>
                        </div>
                    );
                })}
            </div>
            {uploadProgress !== null && (
                <div className="mt-2">
                    <div className="h-1 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-gradient-to-r from-violet-500 to-violet-400 rounded-full"
                            animate={{ width: `${uploadProgress}%` }}
                            transition={{ ease: 'easeOut' }}
                        />
                    </div>
                    <p className="text-[10px] text-slate-900 dark:text-white/30 mt-1">{uploadProgress}% uploaded</p>
                </div>
            )}
        </div>
    );
}

// ── Composer (sticky bottom) ──────────────────────────────────────────────────

export function Composer({
    eventId, eventName, eventCity,
    authorId, authorName, authorRole, onPosted,
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
        setFiles(prev => [...prev, ...picked].slice(0, 9));
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
            let media: JournalMedia[] = [];
            if (files.length) {
                setUploading(true);
                const result = await uploadJournalMediaBatch(eventId, files, pct => setUploadProgress(pct));
                media = result.succeeded;
                if (result.failed.length) {
                    setErrorMsg(`${result.failed.length} file(s) failed to upload and were skipped.`);
                }
                setUploading(false);
                setUploadProgress(null);
            }

            await addDoc(collection(db, 'events', eventId, 'journal'), {
                eventId, authorId, authorName, authorRole,
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
            <AnimatePresence>
                {!open && (
                    <motion.button
                        id="journal-fab"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        onClick={() => { setOpen(true); setTimeout(() => textareaRef.current?.focus(), 80); }}
                        className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-gradient-to-br from-violet-500 to-violet-700 rounded-2xl shadow-2xl shadow-violet-500/30 flex items-center justify-center text-slate-900 dark:text-white hover:scale-105 active:scale-95 transition-transform"
                        aria-label="Create journal post"
                    >
                        <Newspaper size={24} />
                    </motion.button>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {open && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
                            onClick={() => setOpen(false)}
                        />
                        <motion.div
                            initial={{ y: '100%', opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: '100%', opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 260, damping: 32 }}
                            className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 border-t border-black/10 dark:border-white/10 rounded-t-3xl pb-safe"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex justify-center pt-3 pb-1">
                                <div className="w-10 h-1 bg-black/20 dark:bg-white/20 rounded-full" />
                            </div>
                            <div className="px-4 py-3 flex items-center justify-between">
                                <div>
                                    <p className="font-extrabold text-slate-900 dark:text-white text-sm">New Journal Post</p>
                                    <p className="text-[11px] text-slate-900 dark:text-white/30">{eventName}</p>
                                </div>
                                <button onClick={() => setOpen(false)}
                                    className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center text-slate-900 dark:text-white/50 hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                                    <X size={16} />
                                </button>
                            </div>

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
                                    className="w-full bg-slate-100 dark:bg-slate-800/60 border border-white/8 rounded-2xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-900 dark:placeholder:text-white/20 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/40 transition-all leading-relaxed"
                                />
                            </div>

                            <AnimatePresence>
                                {dictState === 'listening' && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="px-4 pb-2 flex items-center gap-2">
                                        <div className="flex gap-0.5 items-end">
                                            {[1, 2, 3, 4, 3, 2].map((h, i) => (
                                                <motion.div key={i} className="w-1 bg-rose-400 rounded-full"
                                                    animate={{ height: [`${h * 4}px`, `${(h + 2) * 4}px`, `${h * 4}px`] }}
                                                    transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.1 }} />
                                            ))}
                                        </div>
                                        <span className="text-rose-400 text-xs font-bold">Listening — tap Mic to stop</span>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <AnimatePresence>
                                {errorMsg && (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                        className="mx-4 mb-2 flex items-center gap-2 px-3 py-2 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                                        <AlertCircle size={13} className="text-rose-400 flex-shrink-0" />
                                        <p className="text-rose-400 text-[12px]">{errorMsg}</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <MediaPreviewStrip files={files} onRemove={removeFile} uploadProgress={uploadProgress} />

                            <div className="px-4 py-3 flex items-center gap-2">
                                <button id="journal-upload-btn" onClick={() => fileInputRef.current?.click()}
                                    className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-white/8 flex items-center justify-center text-slate-900 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:bg-slate-700 transition-all active:scale-95"
                                    aria-label="Attach photo or video">
                                    <Camera size={22} />
                                </button>
                                <input ref={fileInputRef} type="file" multiple accept={getAllowedExtensions()}
                                    onChange={handleFilePick} className="hidden" id="journal-file-input" />

                                <button id="journal-dictate-btn"
                                    onClick={dictState === 'listening' ? stopDict : startDict}
                                    disabled={!dictSupported}
                                    className={`w-12 h-12 rounded-2xl border flex items-center justify-center transition-all active:scale-95
                                        ${dictState === 'listening'
                                            ? 'bg-rose-500 border-rose-500 text-slate-900 dark:text-white shadow-lg shadow-rose-500/30 animate-pulse'
                                            : dictState === 'error'
                                                ? 'bg-slate-100 dark:bg-slate-800 border-rose-500/30 text-rose-400'
                                                : 'bg-slate-100 dark:bg-slate-800 border-white/8 text-slate-900 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:bg-slate-700'
                                        }
                                        ${!dictSupported ? 'opacity-30 cursor-not-allowed' : ''}
                                    `}
                                    aria-label={dictState === 'listening' ? 'Stop dictating' : 'Start dictating'}
                                    title={!dictSupported ? 'Speech recognition not supported in this browser' : undefined}>
                                    {dictState === 'listening' ? <MicOff size={22} /> : <Mic size={22} />}
                                </button>

                                <button id="journal-polish-btn" onClick={handlePolish}
                                    disabled={polishing || !text.trim()}
                                    className={`flex-1 h-12 rounded-2xl border flex items-center justify-center gap-2 text-sm font-bold transition-all active:scale-[0.97]
                                        ${polishing
                                            ? 'bg-violet-900/30 border-violet-500/30 text-violet-400'
                                            : text.trim()
                                                ? 'bg-violet-600 border-violet-500 text-slate-900 dark:text-white hover:bg-violet-500 shadow-lg shadow-violet-500/20'
                                                : 'bg-slate-100 dark:bg-slate-800 border-white/8 text-slate-900 dark:text-white/20 cursor-not-allowed'
                                        }
                                    `}
                                    aria-label="Polish with Gemini AI">
                                    {polishing
                                        ? <><Loader2 size={16} className="animate-spin" /> Polishing…</>
                                        : <><Sparkles size={16} /> Polish with AI</>
                                    }
                                </button>

                                <button id="journal-post-btn" onClick={handlePost} disabled={!canPost}
                                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all active:scale-95
                                        ${canPost
                                            ? 'bg-emerald-500 text-slate-900 dark:text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-400'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white/20 cursor-not-allowed'
                                        }
                                    `}
                                    aria-label="Publish post">
                                    {posting ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                                </button>
                            </div>

                            <div className="h-safe-bottom" />
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {successMsg && (
                    <motion.div
                        initial={{ opacity: 0, y: 48 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 48 }}
                        className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 bg-emerald-500 text-slate-900 dark:text-white rounded-2xl shadow-2xl font-bold text-sm">
                        <CheckCircle2 size={16} />
                        {successMsg}
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
