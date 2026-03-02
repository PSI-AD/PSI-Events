/**
 * IntelDrop.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Live Competitor Intel — crowdsourced market intelligence from the expo floor.
 *
 * Exports:
 *   <IntelDropFAB>        — Agent-side Floating Action Button + capture modal.
 *                           Sits fixed bottom-right on any event page.
 *                           Opens camera → snap competitor brochure / pricing
 *                           board → optional voice note → submit to Firestore.
 *
 *   <MarketIntelDashboard> — HQ/Organizer view.
 *                           Real-time masonry grid of all intel drops.
 *                           Filterable by category, sortable by recency.
 *                           Executives see: image, AI-extracted summary,
 *                           agent name, timestamp, category tag.
 *
 * Firestore path:
 *   events/{eventId}/intel_drops/{dropId}
 *     imageUrl:    string  (Firebase Storage download URL)
 *     imageBase64: string  (compressed preview — for instant display)
 *     agentId:     string
 *     agentName:   string
 *     category:    IntelCategory
 *     voiceNote:   string  (transcribed or raw caption)
 *     aiSummary:   string  (Gemini-extracted key competitor data points)
 *     competitorName: string
 *     createdAt:   Timestamp
 *
 * Production checklist:
 *   □ Firebase Storage bucket rules: allow write only to authenticated users
 *   □ Replace mockGeminiAnalyse() with a real Cloud Function call
 *   □ Add moderation step before showing drops in HQ dashboard
 *   □ Move image compression to a web worker for large images
 */

import React, {
    useCallback, useEffect, useRef, useState,
} from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    Camera, Mic, MicOff, X, Send, Loader2,
    Sparkles, Eye, Filter, Clock, TrendingUp,
    BarChart2, Image, FileText, Tag, ChevronDown,
    StopCircle, RotateCcw, AlertCircle, Maximize2,
    Building2, DollarSign, Zap, Search, Grid,
    CheckCircle2,
} from 'lucide-react';
import {
    collection, addDoc, onSnapshot, orderBy,
    query, serverTimestamp, Unsubscribe,
} from 'firebase/firestore';
import {
    ref, uploadBytes, getDownloadURL,
} from 'firebase/storage';
import { db, storage } from '../../services/firebase/firebaseConfig';

// ═════════════════════════════════════════════════════════════════════════════
// Types
// ═════════════════════════════════════════════════════════════════════════════

export type IntelCategory =
    | 'pricing'
    | 'brochure'
    | 'stand_design'
    | 'promotion'
    | 'foot_traffic'
    | 'other';

export interface IntelDrop {
    id: string;
    imageUrl: string;
    imageBase64?: string;
    agentId: string;
    agentName: string;
    category: IntelCategory;
    voiceNote: string;
    aiSummary: string;
    competitorName: string;
    createdAt: string;
}

export interface IntelDropFABProps {
    eventId: string;
    agentId: string;
    agentName: string;
}

export interface MarketIntelDashboardProps {
    eventId: string;
}

// ─────────────────────────────────────────────────────────────────────────────

const CATEGORIES: { value: IntelCategory; label: string; icon: React.ReactNode; color: string }[] = [
    { value: 'pricing', label: 'Pricing Board', icon: <DollarSign size={13} />, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/25' },
    { value: 'brochure', label: 'Brochure', icon: <FileText size={13} />, color: 'text-blue-500 bg-blue-500/10 border-blue-500/25' },
    { value: 'stand_design', label: 'Stand Design', icon: <Building2 size={13} />, color: 'text-violet-500 bg-violet-500/10 border-violet-500/25' },
    { value: 'promotion', label: 'Promotion', icon: <Tag size={13} />, color: 'text-amber-500 bg-amber-500/10 border-amber-500/25' },
    { value: 'foot_traffic', label: 'Foot Traffic', icon: <TrendingUp size={13} />, color: 'text-rose-500 bg-rose-500/10 border-rose-500/25' },
    { value: 'other', label: 'Other', icon: <Eye size={13} />, color: 'text-slate-600 dark:text-slate-400 bg-slate-500/10 border-slate-500/25' },
];

function getCategoryMeta(cat: IntelCategory) {
    return CATEGORIES.find(c => c.value === cat) ?? CATEGORIES[CATEGORIES.length - 1];
}

function clsx(...c: (string | false | null | undefined)[]) {
    return c.filter(Boolean).join(' ');
}

function timeAgo(iso: string): string {
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return `${Math.floor(diff)}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

// ═════════════════════════════════════════════════════════════════════════════
// Gemini AI Mock — image analysis
// ═════════════════════════════════════════════════════════════════════════════

const MOCK_SUMMARIES: Record<IntelCategory, string[]> = {
    pricing: [
        'Competitor pricing: 1BR from AED 1.1M (15% below market). Payment plan: 30/70 post-handover. ROI claim: 8.2% net yield.',
        'Price list visible: Studio AED 680K, 2BR AED 1.85M. Promotion: 5% discount for event-day reservations.',
        'Off-plan units starting AED 950K. DLD waiver offered. 60-month post-handover plan.',
    ],
    brochure: [
        'Competitor brochure: Tower A, Business Bay. 3 key USPs — rooftop pool, crypto payment accepted, Golden Visa eligible.',
        'Luxury branded brochure. Property: The One by XYZ Dev. Focus on branded residences. Asking AED 4.5M for 2BR.',
        'Digital brochure QR code noted. Property in MBR City. Completion Q4 2026. Key highlight: school within 500m.',
    ],
    stand_design: [
        'Large-scale LED immersive stand. Est. 200sqm. Staff: ~12. VIP lounge visible. High foot traffic engagement.',
        'Minimal white stand, 80sqm. Augmented reality property tour demo. 2 iPads. Attracting tech-savvy buyers.',
        'Premium stand with scale model of tower. Live countdown to launch event. Champagne reception visible.',
    ],
    promotion: [
        'Flash promotion: Free furniture package (AED 120K value) for same-day reservation. Valid until event close.',
        'Referral campaign: AED 50K cash reward for any agent who closes at the expo. 24h window.',
        'Lucky draw: chance to win an Aston Martin for anyone who registers interest on-site.',
    ],
    foot_traffic: [
        'High footfall: 40+ visitors observed in 15-min window. Queue forming at registration desk.',
        'Low engagement: fewer than 10 visitors in 20-min window. Staff outnumber visitors.',
        'Peak traffic: approx. 80 visitors. Mostly families. Conference session break driving walk-ins.',
    ],
    other: [
        'Competitor running live auction for 5 penthouse units — bidding starts at AED 3M.',
        'Celebrity appearance noted at stand. Significant crowd gathering.',
        'Partnership booth with airline — offering complimentary business class seat with purchase.',
    ],
};

const MOCK_COMPETITORS = [
    'Emaar Properties', 'Aldar Properties', 'DAMAC', 'Meraas', 'Sobha Realty',
    'Nakheel', 'Dubai Properties', 'Select Group', 'Ellington Properties', 'Bloom Holding',
];

/**
 * mockGeminiAnalyse
 * In production, send imageBase64 + voiceNote to Gemini Vision via Cloud Function.
 * Gemini prompt:
 *   "Analyse this competitor real estate expo stand image. Extract:
 *    1. Competitor/developer name (if visible)
 *    2. Key pricing data points
 *    3. Unique selling propositions mentioned
 *    4. Any promotions or limited-time offers visible
 *    Return as 2-3 concise bullet points max, starting with the most actionable data."
 */
async function mockGeminiAnalyse(
    _imageBase64: string,
    category: IntelCategory,
    voiceNote: string,
): Promise<{ aiSummary: string; competitorName: string }> {
    const prompt = `
Analyse this competitor real estate expo stand image.
Category: ${category}
Agent voice note: "${voiceNote || 'No voice note provided'}"

Extract and return JSON:
{
  "competitorName": "developer/company name visible in image",
  "aiSummary": "2-3 bullet point summary of key intel: pricing, USPs, promotions"
}`.trim();

    console.info('[IntelDrop] Gemini Vision prompt:\n', prompt);

    // Simulated latency
    await new Promise(r => setTimeout(r, 1400));

    const summaries = MOCK_SUMMARIES[category];
    const aiSummary = summaries[Math.floor(Math.random() * summaries.length)];
    const competitorName = voiceNote.length > 4
        ? (MOCK_COMPETITORS.find(c => voiceNote.toLowerCase().includes(c.toLowerCase().split(' ')[0])) ?? MOCK_COMPETITORS[Math.floor(Math.random() * MOCK_COMPETITORS.length)])
        : MOCK_COMPETITORS[Math.floor(Math.random() * MOCK_COMPETITORS.length)];

    return { aiSummary, competitorName };
}

// ═════════════════════════════════════════════════════════════════════════════
// Image compression helper
// ═════════════════════════════════════════════════════════════════════════════

async function compressImage(file: File, maxWidth = 1200, quality = 0.78): Promise<{ base64: string; blob: Blob }> {
    return new Promise((resolve, reject) => {
        const img = new window.Image();
        img.onload = () => {
            const scale = Math.min(1, maxWidth / img.width);
            const canvas = document.createElement('canvas');
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(blob => {
                if (!blob) { reject(new Error('Compression failed')); return; }
                const reader = new FileReader();
                reader.onloadend = () => resolve({ base64: reader.result as string, blob });
                reader.readAsDataURL(blob);
            }, 'image/jpeg', quality);
        };
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
    });
}

// ═════════════════════════════════════════════════════════════════════════════
// Voice note recorder hook
// ═════════════════════════════════════════════════════════════════════════════

function useVoiceRecorder() {
    const [recording, setRecording] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [duration, setDuration] = useState(0);
    const mr = useRef<MediaRecorder | null>(null);
    const ch = useRef<BlobPart[]>([]);
    const tmr = useRef<ReturnType<typeof setInterval> | null>(null);

    const start = useCallback(async () => {
        ch.current = [];
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const rec = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
        mr.current = rec;
        rec.ondataavailable = e => { if (e.data.size > 0) ch.current.push(e.data); };
        rec.onstop = () => {
            const blob = new Blob(ch.current, { type: 'audio/webm' });
            setAudioUrl(URL.createObjectURL(blob));
            stream.getTracks().forEach(t => t.stop());
        };
        rec.start(200);
        setRecording(true);
        setDuration(0);
        tmr.current = setInterval(() => setDuration(d => d + 1), 1000);
    }, []);

    const stop = useCallback(() => {
        if (mr.current?.state === 'recording') mr.current.stop();
        if (tmr.current) clearInterval(tmr.current);
        setRecording(false);
    }, []);

    const reset = useCallback(() => { stop(); setAudioUrl(null); setDuration(0); }, [stop]);

    useEffect(() => () => { stop(); }, [stop]);

    return { recording, audioUrl, duration, start, stop, reset };
}

// ═════════════════════════════════════════════════════════════════════════════
// IntelDropFAB — Agent Side
// ═════════════════════════════════════════════════════════════════════════════

type FABPhase = 'idle' | 'capture' | 'preview' | 'analysing' | 'done';

export function IntelDropFAB({ eventId, agentId, agentName }: IntelDropFABProps) {
    const [open, setOpen] = useState(false);
    const [phase, setPhase] = useState<FABPhase>('idle');
    const [capturedFile, setCapturedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [category, setCategory] = useState<IntelCategory>('pricing');
    const [voiceNote, setVoiceNote] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const voice = useVoiceRecorder();

    // ── Open camera stream ─────────────────────────────────────────────────────
    const openCamera = useCallback(async () => {
        setError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
            });
            streamRef.current = stream;
            if (cameraRef.current) {
                cameraRef.current.srcObject = stream;
                await cameraRef.current.play();
            }
            setPhase('capture');
        } catch {
            // Fallback to file picker on desktop / when camera unavailable
            fileInputRef.current?.click();
        }
    }, []);

    // ── Stop camera stream ────────────────────────────────────────────────────
    const stopCamera = useCallback(() => {
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
    }, []);

    // ── Take snapshot from camera ─────────────────────────────────────────────
    const takeSnapshot = useCallback(() => {
        if (!cameraRef.current) return;
        const canvas = document.createElement('canvas');
        canvas.width = cameraRef.current.videoWidth;
        canvas.height = cameraRef.current.videoHeight;
        canvas.getContext('2d')!.drawImage(cameraRef.current, 0, 0);
        canvas.toBlob(blob => {
            if (!blob) return;
            const file = new File([blob], `intel_${Date.now()}.jpg`, { type: 'image/jpeg' });
            setCapturedFile(file);
            setPreviewUrl(URL.createObjectURL(blob));
            stopCamera();
            setPhase('preview');
        }, 'image/jpeg', 0.9);
    }, [stopCamera]);

    // ── File picker fallback ──────────────────────────────────────────────────
    const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setCapturedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
        setPhase('preview');
    };

    // ── Submit drop ───────────────────────────────────────────────────────────
    const handleSubmit = async () => {
        if (!capturedFile) return;
        setSubmitting(true);
        setError(null);
        try {
            const { base64, blob } = await compressImage(capturedFile);

            // ── Upload to Firebase Storage ─────────────────────────────────
            const storageRef = ref(storage, `intel_drops/${eventId}/${agentId}_${Date.now()}.jpg`);
            await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
            const imageUrl = await getDownloadURL(storageRef);

            // ── AI analysis ────────────────────────────────────────────────
            setPhase('analysing');
            const { aiSummary, competitorName } = await mockGeminiAnalyse(base64, category, voiceNote);

            // ── Write to Firestore ─────────────────────────────────────────
            await addDoc(collection(db, 'events', eventId, 'intel_drops'), {
                imageUrl,
                imageBase64: base64.slice(0, 2000), // truncated preview
                agentId,
                agentName,
                category,
                voiceNote,
                aiSummary,
                competitorName,
                createdAt: new Date().toISOString(),
                _createdAt: serverTimestamp(),
            });

            setPhase('done');
        } catch (err) {
            console.error('[IntelDrop] Submit failed:', err);
            setError('Upload failed. Please retry.');
            setPhase('preview');
        } finally {
            setSubmitting(false);
        }
    };

    // ── Close / reset ─────────────────────────────────────────────────────────
    const handleClose = () => {
        stopCamera();
        voice.reset();
        setCapturedFile(null);
        setPreviewUrl(null);
        setVoiceNote('');
        setError(null);
        setPhase('idle');
        setOpen(false);
    };

    // ── Open handler ──────────────────────────────────────────────────────────
    const handleOpen = () => { setPhase('idle'); setOpen(true); };

    return (
        <>
            {/* Hidden file input */}
            <input ref={fileInputRef} type="file" accept="image/*" capture="environment"
                className="hidden" onChange={handleFilePick} />

            {/* FAB */}
            <motion.button
                id="intel-drop-fab"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleOpen}
                className="fixed bottom-24 right-5 z-40 w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-600 text-slate-900 dark:text-white shadow-2xl shadow-rose-600/40 flex items-center justify-center hover:from-rose-400 hover:to-rose-500 transition-all"
                title="Drop Competitor Intel"
            >
                <div className="flex flex-col items-center gap-0.5">
                    <Camera size={20} />
                    <span className="text-[8px] font-black leading-none tracking-widest">INTEL</span>
                </div>
                {/* Pulse ring */}
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-rose-400 border-2 border-white animate-pulse" />
            </motion.button>

            {/* Modal */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col"
                    >

                        {/* ── IDLE: choose action ──────────────────────────────────────── */}
                        {phase === 'idle' && (
                            <motion.div
                                initial={{ y: '100%' }}
                                animate={{ y: 0 }}
                                exit={{ y: '100%' }}
                                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                className="mt-auto bg-white dark:bg-slate-900 rounded-t-3xl p-6 space-y-6 border-t border-black/10 dark:border-white/10"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] font-black tracking-[0.2em] uppercase text-rose-400 mb-0.5">Market Intelligence</p>
                                        <h2 className="text-slate-900 dark:text-white text-xl font-extrabold">Drop Competitor Intel</h2>
                                    </div>
                                    <button id="intel-fab-close" onClick={handleClose} className="w-9 h-9 rounded-xl bg-black/10 dark:bg-white/10 flex items-center justify-center text-slate-900 dark:text-white/60 hover:text-slate-900 dark:hover:text-white">
                                        <X size={18} />
                                    </button>
                                </div>

                                {/* Category */}
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-900 dark:text-white/40 mb-3">Category</p>
                                    <div className="grid grid-cols-3 gap-2">
                                        {CATEGORIES.map(c => (
                                            <button key={c.value}
                                                id={`intel-cat-${c.value}`}
                                                onClick={() => setCategory(c.value)}
                                                className={clsx(
                                                    'flex flex-col items-center gap-1.5 p-3 rounded-2xl border text-xs font-bold transition-all',
                                                    category === c.value
                                                        ? `${c.color} border-current`
                                                        : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-slate-900 dark:text-white/50 hover:border-black/20 dark:hover:border-white/20',
                                                )}
                                            >
                                                {c.icon}
                                                <span className="leading-none text-center">{c.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Voice note quick caption */}
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-900 dark:text-white/40 mb-2">Quick Caption (Optional)</p>
                                    <input
                                        type="text"
                                        value={voiceNote}
                                        maxLength={120}
                                        onChange={e => setVoiceNote(e.target.value)}
                                        placeholder="e.g. 'Emaar stand offering 8% guaranteed return'"
                                        className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white text-sm placeholder:text-slate-900 dark:placeholder:text-white/25 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20"
                                    />
                                </div>

                                {/* CTA */}
                                <motion.button
                                    id="intel-open-camera"
                                    whileTap={{ scale: 0.97 }}
                                    onClick={openCamera}
                                    className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-500 text-slate-900 dark:text-white font-extrabold text-base shadow-xl shadow-rose-600/30 hover:shadow-rose-600/50 transition-all"
                                >
                                    <Camera size={20} /> Open Camera
                                </motion.button>
                            </motion.div>
                        )}

                        {/* ── CAPTURE: live camera ────────────────────────────────────── */}
                        {phase === 'capture' && (
                            <div className="flex-1 flex flex-col">
                                <video ref={cameraRef} autoPlay playsInline muted
                                    className="flex-1 w-full object-cover" />

                                {/* Viewfinder overlay */}
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="w-72 h-52 relative">
                                        {/* Corner brackets */}
                                        {[
                                            'top-0 left-0 border-t-2 border-l-2 rounded-tl-xl',
                                            'top-0 right-0 border-t-2 border-r-2 rounded-tr-xl',
                                            'bottom-0 left-0 border-b-2 border-l-2 rounded-bl-xl',
                                            'bottom-0 right-0 border-b-2 border-r-2 rounded-br-xl',
                                        ].map((cls, i) => (
                                            <div key={i} className={`absolute w-8 h-8 border-white ${cls}`} />
                                        ))}
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-slate-900 dark:text-white/50 text-xs font-bold tracking-widest uppercase">Aim at competitor stand</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Category badge */}
                                <div className="absolute top-6 left-1/2 -translate-x-1/2">
                                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold ${getCategoryMeta(category).color}`}>
                                        {getCategoryMeta(category).icon}
                                        {getCategoryMeta(category).label}
                                    </div>
                                </div>

                                {/* Controls */}
                                <div className="absolute bottom-0 left-0 right-0 p-8 flex items-center justify-center gap-8 bg-gradient-to-t from-black/60 to-transparent">
                                    <button onClick={handleClose} className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center text-slate-900 dark:text-white">
                                        <X size={22} />
                                    </button>
                                    <motion.button
                                        id="intel-snap-btn"
                                        whileTap={{ scale: 0.9 }}
                                        onClick={takeSnapshot}
                                        className="w-20 h-20 rounded-full border-4 border-white bg-black/20 dark:bg-white/20 flex items-center justify-center"
                                    >
                                        <div className="w-14 h-14 rounded-full bg-white" />
                                    </motion.button>
                                    <button onClick={() => fileInputRef.current?.click()} className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center text-slate-900 dark:text-white">
                                        <Image size={22} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ── PREVIEW: confirm + add voice note ───────────────────────── */}
                        {phase === 'preview' && previewUrl && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex-1 flex flex-col"
                            >
                                {/* Image preview */}
                                <div className="flex-1 relative overflow-hidden">
                                    <img src={previewUrl} alt="Captured intel" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-slate-900 via-transparent to-transparent" />
                                </div>

                                {/* Bottom panel */}
                                <div className="bg-white dark:bg-slate-900 p-5 space-y-4 border-t border-black/10 dark:border-white/10">
                                    <div className="flex items-center justify-between">
                                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold ${getCategoryMeta(category).color}`}>
                                            {getCategoryMeta(category).icon}
                                            {getCategoryMeta(category).label}
                                        </div>
                                        <button onClick={() => { setPreviewUrl(null); setCapturedFile(null); setPhase('idle'); }}
                                            className="flex items-center gap-1 text-slate-900 dark:text-white/40 hover:text-slate-900 dark:hover:text-white text-xs">
                                            <RotateCcw size={12} /> Retake
                                        </button>
                                    </div>

                                    {/* Caption input */}
                                    <input
                                        type="text"
                                        value={voiceNote}
                                        maxLength={140}
                                        onChange={e => setVoiceNote(e.target.value)}
                                        placeholder="Add context (competitor name, key price point…)"
                                        className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white text-sm placeholder:text-slate-900 dark:placeholder:text-white/25 focus:outline-none focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/20"
                                    />

                                    {error && (
                                        <p className="flex items-center gap-1.5 text-rose-400 text-xs font-semibold">
                                            <AlertCircle size={12} /> {error}
                                        </p>
                                    )}

                                    <div className="grid grid-cols-2 gap-3">
                                        <button onClick={handleClose}
                                            className="py-3.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-slate-900 dark:text-white/60 text-sm font-bold hover:bg-black/10 dark:hover:bg-white/10 transition-all">
                                            Cancel
                                        </button>
                                        <motion.button
                                            id="intel-submit-btn"
                                            whileTap={{ scale: 0.97 }}
                                            onClick={handleSubmit}
                                            disabled={submitting}
                                            className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-500 text-slate-900 dark:text-white font-extrabold text-sm shadow-lg shadow-rose-600/25 disabled:opacity-60 transition-all"
                                        >
                                            {submitting
                                                ? <><Loader2 size={15} className="animate-spin" /> Uploading…</>
                                                : <><Sparkles size={15} /> Analyse & Drop</>
                                            }
                                        </motion.button>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* ── ANALYSING ───────────────────────────────────────────────── */}
                        {phase === 'analysing' && (
                            <div className="flex-1 flex flex-col items-center justify-center gap-6 text-slate-900 dark:text-white">
                                <div className="relative w-20 h-20 flex items-center justify-center">
                                    <motion.div
                                        className="absolute inset-0 rounded-full border-[3px] border-t-rose-500 border-r-rose-500/30 border-b-transparent border-l-transparent"
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                    />
                                    <motion.div
                                        className="absolute inset-3 rounded-full border-2 border-b-amber-400/60 border-l-amber-400/30 border-t-transparent border-r-transparent"
                                        animate={{ rotate: -360 }}
                                        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                                    />
                                    <Sparkles size={22} className="text-rose-400" />
                                </div>
                                <div className="text-center">
                                    <p className="font-extrabold text-lg mb-1">Gemini is analysing…</p>
                                    <p className="text-slate-900 dark:text-white/40 text-sm">Extracting competitor intel from your image</p>
                                </div>
                            </div>
                        )}

                        {/* ── DONE ────────────────────────────────────────────────────── */}
                        {phase === 'done' && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex-1 flex flex-col items-center justify-center gap-6 text-slate-900 dark:text-white px-6"
                            >
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: 'spring', stiffness: 260, delay: 0.1 }}
                                    className="w-20 h-20 rounded-3xl bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center"
                                >
                                    <CheckCircle2 size={36} className="text-emerald-400" />
                                </motion.div>
                                <div className="text-center">
                                    <h2 className="text-2xl font-extrabold mb-2">Intel Dropped! 🎯</h2>
                                    <p className="text-slate-900 dark:text-white/50 text-sm">Your intel is live on the HQ dashboard. Organizers can see it in real-time.</p>
                                </div>
                                <button id="intel-done-btn" onClick={handleClose}
                                    className="px-8 py-3.5 rounded-2xl bg-black/10 dark:bg-white/10 border border-white/15 text-slate-900 dark:text-white font-bold hover:bg-white/15 transition-all">
                                    Back to Floor
                                </button>
                            </motion.div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

// ═════════════════════════════════════════════════════════════════════════════
// MarketIntelDashboard — HQ / Organizer / Executive view
// ═════════════════════════════════════════════════════════════════════════════

function IntelCard({ drop, onClick }: { drop: IntelDrop; onClick: () => void }) {
    const meta = getCategoryMeta(drop.category);
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={onClick}
            className="psi-card rounded-3xl overflow-hidden cursor-pointer group hover:ring-2 hover:ring-rose-500/30 transition-all"
        >
            {/* Image */}
            <div className="relative overflow-hidden bg-slate-100 dark:bg-slate-800" style={{ height: `${Math.floor(180 + Math.random() * 120)}px` }}>
                <img
                    src={drop.imageUrl}
                    alt="Competitor intel"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                {/* Category badge */}
                <div className={`absolute top-3 left-3 inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-black ${meta.color} backdrop-blur-sm`}>
                    {meta.icon}
                    {meta.label}
                </div>

                {/* Expand icon */}
                <button className="absolute top-3 right-3 w-7 h-7 rounded-lg bg-black/40 backdrop-blur-sm border border-white/15 flex items-center justify-center text-slate-900 dark:text-white/70 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Maximize2 size={12} />
                </button>

                {/* Competitor name overlay */}
                <div className="absolute bottom-3 left-3 right-3">
                    <p className="text-slate-900 dark:text-white text-xs font-black truncate">{drop.competitorName}</p>
                </div>
            </div>

            {/* Body */}
            <div className="p-4 space-y-3">
                {/* AI Summary */}
                <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-rose-500">
                        <Sparkles size={9} /> AI Intel
                    </div>
                    <p className="text-psi-primary text-sm leading-relaxed line-clamp-3 font-medium">
                        {drop.aiSummary}
                    </p>
                </div>

                {/* Voice note / caption */}
                {drop.voiceNote && (
                    <div className="flex items-start gap-1.5 bg-psi-subtle border border-psi rounded-xl px-3 py-2">
                        <Mic size={10} className="text-psi-muted flex-shrink-0 mt-0.5" />
                        <p className="text-psi-muted text-xs italic leading-relaxed line-clamp-2">&ldquo;{drop.voiceNote}&rdquo;</p>
                    </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center text-slate-900 dark:text-white font-black text-[9px]">
                            {drop.agentName.charAt(0)}
                        </div>
                        <span className="text-psi-muted text-[10px] font-bold">{drop.agentName.split(' ')[0]}</span>
                    </div>
                    <div className="flex items-center gap-1 text-psi-muted text-[10px]">
                        <Clock size={9} />
                        {timeAgo(drop.createdAt)}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

// ── Lightbox ─────────────────────────────────────────────────────────────────

function IntelLightbox({ drop, onClose }: { drop: IntelDrop; onClose: () => void }) {
    const meta = getCategoryMeta(drop.category);
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex flex-col md:flex-row"
        >
            {/* Image */}
            <div className="flex-1 flex items-center justify-center p-4 min-h-0">
                <img src={drop.imageUrl} alt="Intel"
                    className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl" />
            </div>

            {/* Side panel */}
            <div className="w-full md:w-96 bg-white dark:bg-slate-900 border-t md:border-t-0 md:border-l border-black/10 dark:border-white/10 flex flex-col overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-black/10 dark:border-white/10">
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold ${meta.color}`}>
                        {meta.icon} {meta.label}
                    </div>
                    <button id="intel-lb-close" onClick={onClose}
                        className="w-9 h-9 rounded-xl bg-black/10 dark:bg-white/10 flex items-center justify-center text-slate-900 dark:text-white/60 hover:text-slate-900 dark:hover:text-white">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-5 space-y-5 flex-1">
                    {/* Competitor */}
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white/30 mb-1">Competitor</p>
                        <p className="text-slate-900 dark:text-white text-xl font-extrabold">{drop.competitorName}</p>
                    </div>

                    {/* AI Summary */}
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Sparkles size={12} className="text-rose-400" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-rose-400">Gemini AI Analysis</p>
                        </div>
                        <div className="bg-rose-500/8 border border-rose-500/15 rounded-2xl p-4">
                            <p className="text-slate-900 dark:text-white text-sm leading-relaxed">{drop.aiSummary}</p>
                        </div>
                    </div>

                    {/* Voice / caption */}
                    {drop.voiceNote && (
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <Mic size={12} className="text-slate-900 dark:text-white/30" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white/30">Agent Note</p>
                            </div>
                            <p className="text-slate-900 dark:text-white/60 text-sm italic">&ldquo;{drop.voiceNote}&rdquo;</p>
                        </div>
                    )}

                    {/* Meta */}
                    <div className="flex items-center justify-between pt-2 border-t border-black/10 dark:border-white/10">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center text-slate-900 dark:text-white font-black text-xs">
                                {drop.agentName.charAt(0)}
                            </div>
                            <div>
                                <p className="text-slate-900 dark:text-white text-xs font-bold">{drop.agentName}</p>
                                <p className="text-slate-900 dark:text-white/30 text-[10px]">Field agent</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-slate-900 dark:text-white/30 text-[10px]">{timeAgo(drop.createdAt)}</p>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export function MarketIntelDashboard({ eventId }: MarketIntelDashboardProps) {
    const [drops, setDrops] = useState<IntelDrop[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterCat, setFilterCat] = useState<IntelCategory | 'all'>('all');
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<IntelDrop | null>(null);

    // ── Realtime Firestore feed ────────────────────────────────────────────────
    useEffect(() => {
        const unsub: Unsubscribe = onSnapshot(
            query(collection(db, 'events', eventId, 'intel_drops'), orderBy('_createdAt', 'desc')),
            snap => {
                setDrops(snap.docs.map(d => ({ id: d.id, ...d.data() } as IntelDrop)));
                setLoading(false);
            },
            err => { console.error('[IntelDrop] Firestore read error:', err); setLoading(false); }
        );
        return () => unsub();
    }, [eventId]);

    // ── Demo data for empty state ──────────────────────────────────────────────
    const DEMO_DROPS: IntelDrop[] = [
        {
            id: 'd1', imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&q=80',
            agentId: 'a1', agentName: 'Sara Al-Marzouqi', category: 'pricing',
            voiceNote: 'Emaar offering 8% ROI guarantee, payment plan 30/70',
            aiSummary: 'Emaar pricing board: 1BR from AED 1.1M. ROI guarantee: 8.2% net yield. Event-day discount: 5%. Payment: 30/70 post-handover.',
            competitorName: 'Emaar Properties', createdAt: new Date(Date.now() - 8 * 60000).toISOString(),
        },
        {
            id: 'd2', imageUrl: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&q=80',
            agentId: 'a2', agentName: 'Khalid Al-Mansouri', category: 'stand_design',
            voiceNote: 'DAMAC have massive LED wall and full-scale model',
            aiSummary: 'DAMAC stand: 250sqm premium build. Immersive LED dome. Staff count ~15. VIP lounge section. Branded Lamborghini on display.',
            competitorName: 'DAMAC Properties', createdAt: new Date(Date.now() - 22 * 60000).toISOString(),
        },
        {
            id: 'd3', imageUrl: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=600&q=80',
            agentId: 'a3', agentName: 'Nour Al-Hamdan', category: 'brochure',
            voiceNote: 'Sobha brochure, focused on branded residences',
            aiSummary: 'Sobha Realty brochure: Sobha SeaHaven towers. 2BR from AED 2.9M. Bangalore-quality build proposition. Crypto payments accepted.',
            competitorName: 'Sobha Realty', createdAt: new Date(Date.now() - 41 * 60000).toISOString(),
        },
        {
            id: 'd4', imageUrl: 'https://images.unsplash.com/photo-1560185009-dddec820b368?w=600&q=80',
            agentId: 'a1', agentName: 'Sara Al-Marzouqi', category: 'promotion',
            voiceNote: 'Aldar running lucky draw, Aston Martin as prize',
            aiSummary: 'Aldar promotion: Lucky draw — Aston Martin DB12 for on-floor registration. Free furniture package (AED 150K value) for same-day reservations.',
            competitorName: 'Aldar Properties', createdAt: new Date(Date.now() - 65 * 60000).toISOString(),
        },
        {
            id: 'd5', imageUrl: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=600&q=80',
            agentId: 'a4', agentName: 'Omar Bin Rashid', category: 'foot_traffic',
            voiceNote: 'Meraas getting huge footfall, queue forming',
            aiSummary: 'Meraas stand: 60+ visitors in 15-min window. Queue at registration. Primarily European and East Asian buyers. Celebrity designer present.',
            competitorName: 'Meraas', createdAt: new Date(Date.now() - 90 * 60000).toISOString(),
        },
        {
            id: 'd6', imageUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&q=80',
            agentId: 'a2', agentName: 'Khalid Al-Mansouri', category: 'brochure',
            voiceNote: 'Nakheel launching new island community',
            aiSummary: 'Nakheel new launch: Rixos Residences on Palm. Starting AED 4.5M. Branded hotel services. 50-month payment plan. Rooftop helipad.',
            competitorName: 'Nakheel', createdAt: new Date(Date.now() - 110 * 60000).toISOString(),
        },
    ];

    const displayDrops = drops.length > 0 ? drops : DEMO_DROPS;

    const filtered = displayDrops.filter(d => {
        const matchesCat = filterCat === 'all' || d.category === filterCat;
        const matchSearch = !search || [d.competitorName, d.aiSummary, d.voiceNote, d.agentName]
            .some(t => t.toLowerCase().includes(search.toLowerCase()));
        return matchesCat && matchSearch;
    });

    // KPI counts
    const kpis = {
        total: displayDrops.length,
        competitors: new Set(displayDrops.map(d => d.competitorName)).size,
        agents: new Set(displayDrops.map(d => d.agentId)).size,
        lastDrop: displayDrops[0] ? timeAgo(displayDrops[0].createdAt) : '—',
    };

    return (
        <>
            <div className="space-y-6">

                {/* Header */}
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-7 h-7 bg-rose-500 rounded-lg flex items-center justify-center">
                                <BarChart2 size={15} className="text-slate-900 dark:text-white" />
                            </div>
                            <span className="text-rose-500 text-xs font-extrabold tracking-[0.2em] uppercase">Live Intel Feed</span>
                            <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
                        </div>
                        <h2 className="text-psi-primary text-xl font-extrabold">Market Intelligence</h2>
                        <p className="text-psi-muted text-sm">Real-time competitor intel crowdsourced from the expo floor.</p>
                    </div>
                </div>

                {/* KPI strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { label: 'Intel Drops', value: kpis.total, icon: <Camera size={14} />, color: 'text-rose-500', bg: 'bg-rose-500/10', ring: 'ring-rose-500/20' },
                        { label: 'Competitors', value: kpis.competitors, icon: <Building2 size={14} />, color: 'text-amber-500', bg: 'bg-amber-500/10', ring: 'ring-amber-500/20' },
                        { label: 'Field Agents', value: kpis.agents, icon: <Zap size={14} />, color: 'text-violet-500', bg: 'bg-violet-500/10', ring: 'ring-violet-500/20' },
                        { label: 'Last Drop', value: kpis.lastDrop, icon: <Clock size={14} />, color: 'text-emerald-500', bg: 'bg-emerald-500/10', ring: 'ring-emerald-500/20' },
                    ].map(({ label, value, icon, color, bg, ring }) => (
                        <div key={label} className={`psi-card rounded-2xl p-4 ring-1 ${ring}`}>
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-2 ${bg}`}>
                                <span className={color}>{icon}</span>
                            </div>
                            <p className="text-psi-muted text-[10px] font-extrabold uppercase tracking-widest">{label}</p>
                            <p className={`text-xl font-extrabold ${color}`}>{value}</p>
                        </div>
                    ))}
                </div>

                {/* Search + filter bar */}
                <div className="flex gap-3 flex-wrap items-center">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[200px]">
                        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-psi-muted" />
                        <input
                            id="intel-search"
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search competitor, agent, or intel…"
                            className="psi-input w-full pl-9 pr-4 py-2.5 rounded-xl text-sm"
                        />
                    </div>

                    {/* Category filter */}
                    <div className="flex gap-1.5 flex-wrap">
                        {[{ value: 'all' as const, label: 'All', icon: <Grid size={11} /> }, ...CATEGORIES.map(c => ({ value: c.value, label: c.label, icon: c.icon }))].map(f => (
                            <button
                                key={f.value}
                                id={`intel-filter-${f.value}`}
                                onClick={() => setFilterCat(f.value as IntelCategory | 'all')}
                                className={clsx(
                                    'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all',
                                    filterCat === f.value
                                        ? 'bg-rose-500/15 border-rose-500/40 text-rose-500'
                                        : 'bg-psi-subtle border-psi text-psi-muted hover:text-psi-primary',
                                )}
                            >
                                {f.icon}
                                <span className="hidden sm:inline">{f.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Results count */}
                <div className="flex items-center gap-2 text-psi-muted text-xs">
                    <Filter size={11} />
                    <span>{filtered.length} intel drop{filtered.length !== 1 ? 's' : ''}</span>
                    {drops.length === 0 && (
                        <span className="ml-2 px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-600 dark:text-amber-400 text-[10px] font-bold">
                            Demo data — drops from agents will appear here
                        </span>
                    )}
                </div>

                {/* Masonry grid */}
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 size={24} className="animate-spin text-psi-muted" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-20 psi-card rounded-3xl">
                        <Camera size={36} className="mx-auto text-psi-muted mb-3 opacity-30" />
                        <p className="font-extrabold text-psi-primary">No intel drops yet</p>
                        <p className="text-psi-muted text-sm mt-1">Agents on the floor will use the Intel FAB to capture competitor data.</p>
                    </div>
                ) : (
                    // CSS masonry (column-based)
                    <div
                        className="grid gap-4"
                        style={{
                            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                        }}
                    >
                        <AnimatePresence mode="popLayout">
                            {filtered.map(drop => (
                                <IntelCard
                                    key={drop.id}
                                    drop={drop}
                                    onClick={() => setSelected(drop)}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            {/* Lightbox */}
            <AnimatePresence>
                {selected && (
                    <IntelLightbox drop={selected} onClose={() => setSelected(null)} />
                )}
            </AnimatePresence>
        </>
    );
}

// ═════════════════════════════════════════════════════════════════════════════
// Default export — standalone page wrapper (route: /market-intel)
// ═════════════════════════════════════════════════════════════════════════════

export default function IntelDropPage({
    eventId = 'event_demo',
    agentId = 'agent_demo_001',
    agentName = 'Khalid Al-Mansouri',
    view = 'hq',
}: {
    eventId?: string;
    agentId?: string;
    agentName?: string;
    view?: 'hq' | 'agent';
}) {
    return (
        <div className="min-h-screen bg-psi-page relative">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
                <MarketIntelDashboard eventId={eventId} />
            </div>

            {/* FAB always available in both views */}
            <IntelDropFAB eventId={eventId} agentId={agentId} agentName={agentName} />
        </div>
    );
}
