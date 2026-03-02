/**
 * BusinessCardScanner.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * AI-powered Business Card Scanner for rapid lead capture on the event floor.
 *
 * Flow:
 *   1. ScannerView  — Mobile camera overlay with animated viewfinder + "Capture
 *                     & Analyze" button. Triggers the Gemini AI utility.
 *   2. analyzeBusinessCard() — Mocked Gemini API call. Sends image payload with
 *                     a structured prompt; parses returned JSON into ExtractedLead.
 *   3. LeadFormView — Pre-filled "New Lead" form. Agent adds Project Interest
 *                     tag and hits Save → writes to Firestore crm_leads.
 *
 * Firestore schema (crm_leads/{auto}):
 *   firstName, lastName, email, phone, company, jobTitle
 *   projectInterest, source: 'CardScan', scannedAt, eventId, agentId
 *
 * ── Production wiring ────────────────────────────────────────────────────────
 *   Replace mockGeminiAnalyze() with a real fetch() to your Cloud Function or
 *   the Gemini REST endpoint. The prompt and response shape stay identical.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    Camera, Sparkles, CheckCircle2, X, ChevronRight,
    Loader2, AlertCircle, Phone, Mail, Building2,
    Briefcase, User, Tag, RefreshCw, Save, ScanLine,
    ArrowLeft, Zap,
} from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase/firebaseConfig';

// ── Helpers ───────────────────────────────────────────────────────────────────

function clsx(...c: (string | false | undefined | null)[]) {
    return c.filter(Boolean).join(' ');
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ExtractedLead {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    company: string;
    jobTitle: string;
}

type ScannerPhase = 'idle' | 'capturing' | 'analyzing' | 'done' | 'error';
type FormPhase = 'form' | 'saving' | 'saved';

// ── Project Interest options ───────────────────────────────────────────────────

const PROJECT_OPTIONS = [
    'Mamsha Al Saadiyat',
    'Marina Blue',
    'Noya on Yas Island',
    'Maryah Plaza',
    'The Grove',
    'Reem Hills',
    'Saadiyat Lagoons',
    'Other / TBD',
] as const;

type ProjectOption = (typeof PROJECT_OPTIONS)[number];

// ═════════════════════════════════════════════════════════════════════════════
// ── AI Utility: analyzeBusinessCard ──────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════════

/**
 * MOCK IMPLEMENTATION
 * ─────────────────────────────────────────────────────────────────────────────
 * Simulates sending a base64-encoded image payload to the Gemini Vision API.
 * Replace the body of `callGeminiAPI` with a real fetch() when deploying.
 *
 * Gemini prompt instructs the model to:
 *  - Extract six specific fields from raw business card text / image OCR
 *  - Return strict JSON (no markdown fence, no explanation)
 *  - Fill missing fields with empty string ""
 *
 * @param imageBase64 - Base64-encoded JPEG/PNG data URL captured from camera
 * @returns Parsed ExtractedLead object
 */
export async function analyzeBusinessCard(imageBase64: string): Promise<ExtractedLead> {
    // ── Gemini prompt (identical in production) ───────────────────────────────
    const GEMINI_PROMPT = `
You are a business card data extraction assistant.
Given the image of a business card, extract the following fields with precision.
Respond ONLY with a valid JSON object — no markdown, no explanation, no extra text.

JSON schema:
{
  "firstName":  "<given name>",
  "lastName":   "<family name>",
  "email":      "<email address>",
  "phone":      "<phone number including country code if visible>",
  "company":    "<company or organisation name>",
  "jobTitle":   "<job title or position>"
}

Rules:
- If a field is not present or not legible, use an empty string "".
- Do not invent or guess data that is not visible on the card.
- For phone, include '+' prefix and country code if shown.
- Normalise email to lowercase.
`.trim();

    // ── Production: replace this block with real Gemini API fetch ─────────────
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async function callGeminiAPI(_imageBase64: string, _prompt: string): Promise<ExtractedLead> {
        // Example production call:
        //
        // const response = await fetch(
        //   `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        //   {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({
        //       contents: [{
        //         parts: [
        //           { text: _prompt },
        //           { inlineData: { mimeType: 'image/jpeg', data: _imageBase64.split(',')[1] } },
        //         ],
        //       }],
        //       generationConfig: { responseMimeType: 'application/json' },
        //     }),
        //   }
        // );
        // const json = await response.json();
        // const raw = json.candidates[0].content.parts[0].text;
        // return JSON.parse(raw) as ExtractedLead;

        // ── MOCK: simulates a 1.8 s API round-trip with realistic demo data ───
        await new Promise(r => setTimeout(r, 1800));
        return {
            firstName: 'Alexander',
            lastName: 'Rubin',
            email: 'a.rubin@novacapital.ae',
            phone: '+971 50 892 4411',
            company: 'Nova Capital Group',
            jobTitle: 'Chief Investment Officer',
        };
    }

    // Log the prompt (visible in DevTools — confirms prompt structure is correct)
    console.info('[BusinessCardScanner] Gemini prompt:\n', GEMINI_PROMPT);
    console.info('[BusinessCardScanner] Image payload size:', imageBase64.length, 'chars');

    return callGeminiAPI(imageBase64, GEMINI_PROMPT);
}

// ═════════════════════════════════════════════════════════════════════════════
// ── Sub-components ────────────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════════

// ── Animated corner brackets for the viewfinder ───────────────────────────────

function ViewfinderBracket({ corner }: { corner: 'tl' | 'tr' | 'bl' | 'br' }) {
    const rotations = { tl: '', tr: 'rotate-90', bl: '-rotate-90', br: 'rotate-180' };
    return (
        <div className={clsx('absolute w-9 h-9', rotations[corner],
            corner === 'tl' && 'top-0 left-0',
            corner === 'tr' && 'top-0 right-0',
            corner === 'bl' && 'bottom-0 left-0',
            corner === 'br' && 'bottom-0 right-0',
        )}>
            <div className="absolute top-0 left-0 w-full h-[3px] bg-amber-400 rounded-full shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
            <div className="absolute top-0 left-0 h-full w-[3px] bg-amber-400 rounded-full shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
        </div>
    );
}

// ── Scan-line sweep animation ─────────────────────────────────────────────────

function ScanLine_() {
    return (
        <motion.div
            className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent"
            style={{ boxShadow: '0 0 12px 3px rgba(251,191,36,0.5)' }}
            animate={{ top: ['8%', '92%', '8%'] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
        />
    );
}

// ── Viewfinder frame ─────────────────────────────────────────────────────────

function Viewfinder({ scanning }: { scanning: boolean }) {
    return (
        <div className="relative w-72 h-44 mx-auto">
            {/* Dim overlay cut-out effect */}
            <div className="absolute inset-0 rounded-2xl overflow-hidden">
                <div className="absolute inset-0 border-[3px] border-transparent rounded-2xl" />
                {/* Inner glow */}
                <motion.div
                    className="absolute inset-0 rounded-xl border border-amber-400/20"
                    animate={{ opacity: scanning ? [0.3, 0.7, 0.3] : 0.2 }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                />
            </div>

            {/* Corner brackets */}
            <ViewfinderBracket corner="tl" />
            <ViewfinderBracket corner="tr" />
            <ViewfinderBracket corner="bl" />
            <ViewfinderBracket corner="br" />

            {/* Scan line */}
            {scanning && <ScanLine_ />}

            {/* Grid overlay */}
            <div className="absolute inset-2 rounded-xl grid grid-cols-4 grid-rows-3 gap-px opacity-5">
                {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="bg-amber-400 rounded-sm" />
                ))}
            </div>

            {/* Centre icon */}
            <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                    animate={scanning ? { scale: [1, 1.08, 1], opacity: [0.4, 0.9, 0.4] } : { opacity: 0.3 }}
                    transition={{ duration: 1.8, repeat: Infinity }}
                    className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center"
                >
                    <ScanLine size={18} className="text-amber-400" />
                </motion.div>
            </div>
        </div>
    );
}

// ── Field input row used in the Lead Form ─────────────────────────────────────

interface FieldRowProps {
    id: string;
    label: string;
    value: string;
    onChange: (v: string) => void;
    icon: React.ReactNode;
    type?: string;
    placeholder?: string;
}

function FieldRow({ id, label, value, onChange, icon, type = 'text', placeholder }: FieldRowProps) {
    return (
        <div>
            <label htmlFor={id} className="block text-[10px] font-bold uppercase tracking-widest text-psi-muted mb-1.5">
                {label}
            </label>
            <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-psi-muted">
                    {icon}
                </span>
                <input
                    id={id}
                    type={type}
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    placeholder={placeholder}
                    className="psi-input w-full pl-10 pr-4 py-3 text-sm rounded-xl focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 outline-none transition-all"
                />
            </div>
        </div>
    );
}

// ═════════════════════════════════════════════════════════════════════════════
// ── PHASE 1: Scanner View ─────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════════

interface ScannerViewProps {
    onLeadExtracted: (lead: ExtractedLead) => void;
    onClose?: () => void;
}

function ScannerView({ onLeadExtracted, onClose }: ScannerViewProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const [phase, setPhase] = useState<ScannerPhase>('idle');
    const [cameraReady, setCameraReady] = useState(false);
    const [cameraError, setCameraError] = useState('');
    const [capturedImage, setCapturedImage] = useState<string | null>(null);

    // ── Camera init ────────────────────────────────────────────────────────────
    useEffect(() => {
        let alive = true;

        async function startCamera() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: { ideal: 'environment' }, // rear camera preferred
                        width: { ideal: 1920 },
                        height: { ideal: 1080 },
                    },
                    audio: false,
                });
                if (!alive) { stream.getTracks().forEach(t => t.stop()); return; }
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play();
                    setCameraReady(true);
                }
            } catch (err) {
                if (!alive) return;
                const msg = err instanceof Error ? err.message : 'Camera unavailable';
                setCameraError(msg);
                // Auto-enable demo-mode after camera failure
                setCameraReady(true);
            }
        }

        startCamera();

        return () => {
            alive = false;
            streamRef.current?.getTracks().forEach(t => t.stop());
        };
    }, []);

    // ── Capture frame → base64 ────────────────────────────────────────────────
    const captureFrame = useCallback((): string => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || !video.videoWidth) {
            // Demo fallback: return a placeholder base64 stub
            return 'data:image/jpeg;base64,DEMO_CAPTURE_PLACEHOLDER';
        }
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(video, 0, 0);
        return canvas.toDataURL('image/jpeg', 0.92);
    }, []);

    // ── Capture & Analyze handler ──────────────────────────────────────────────
    const handleCapture = useCallback(async () => {
        setPhase('capturing');
        const imageBase64 = captureFrame();
        setCapturedImage(imageBase64);

        // Brief pause to show captured frame
        await new Promise(r => setTimeout(r, 300));
        setPhase('analyzing');

        try {
            const lead = await analyzeBusinessCard(imageBase64);
            setPhase('done');
            await new Promise(r => setTimeout(r, 500)); // show success flash
            onLeadExtracted(lead);
        } catch (err) {
            console.error('[BusinessCardScanner] Analysis failed:', err);
            setPhase('error');
        }
    }, [captureFrame, onLeadExtracted]);

    const handleRetry = () => {
        setPhase('idle');
        setCapturedImage(null);
    };

    return (
        <div className="relative w-full h-full flex flex-col bg-psi-page overflow-hidden">

            {/* ── Live camera feed ──────────────────────────────────────────── */}
            <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover"
                playsInline
                muted
                autoPlay
            />

            {/* ── Hidden canvas for frame capture ──────────────────────────── */}
            <canvas ref={canvasRef} className="hidden" />

            {/* ── Captured-frame flash overlay ─────────────────────────────── */}
            <AnimatePresence>
                {capturedImage && phase !== 'idle' && (
                    <motion.div
                        className="absolute inset-0 z-20"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <img
                            src={capturedImage}
                            alt="Captured card"
                            className="w-full h-full object-cover"
                            style={{ filter: 'brightness(0.55) saturate(0.4)' }}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Dark vignette overlay ─────────────────────────────────────── */}
            <div
                className="absolute inset-0 z-10"
                style={{
                    background:
                        'radial-gradient(ellipse 80% 60% at 50% 40%, transparent 40%, rgba(0,0,0,0.75) 100%)',
                }}
            />

            {/* ── Top bar ──────────────────────────────────────────────────── */}
            <div className="relative z-30 flex items-center justify-between px-5 pt-safe-top pt-5 pb-3">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                        <Sparkles size={15} className="text-amber-400" />
                    </div>
                    <div>
                        <p className="text-psi-primary font-extrabold text-sm leading-none">AI Card Scanner</p>
                        <p className="text-amber-400/70 text-[10px] font-bold uppercase tracking-widest leading-none mt-0.5">
                            Powered by Gemini
                        </p>
                    </div>
                </div>
                {onClose && (
                    <button
                        id="scanner-close-btn"
                        onClick={onClose}
                        className="w-9 h-9 rounded-xl bg-psi-border-subtle hover:bg-psi-subtle border border-psi flex items-center justify-center text-psi-primary transition-all"
                    >
                        <X size={16} />
                    </button>
                )}
            </div>

            {/* ── Camera error notice ───────────────────────────────────────── */}
            {cameraError && (
                <div className="relative z-30 mx-5 mt-1 mb-0">
                    <div className="flex items-center gap-2 bg-amber-500/15 border border-amber-500/30 rounded-xl px-3 py-2">
                        <AlertCircle size={13} className="text-amber-400 flex-shrink-0" />
                        <p className="text-amber-300 text-[11px] font-semibold">
                            Camera access unavailable — Demo mode active
                        </p>
                    </div>
                </div>
            )}

            {/* ── Viewfinder + instructions (idle / capturing) ─────────────── */}
            <div className="relative z-30 flex-1 flex flex-col items-center justify-center px-6">

                {phase === 'idle' && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center gap-6 w-full text-center"
                    >
                        <div className="space-y-1">
                            <p className="text-psi-secondary text-xs font-semibold uppercase tracking-widest">
                                Position the card inside the frame
                            </p>
                        </div>
                        <Viewfinder scanning={cameraReady} />
                        <p className="text-psi-muted text-[11px]">
                            Ensure the card is well-lit and flat
                        </p>
                    </motion.div>
                )}

                {phase === 'analyzing' && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center gap-5 text-center"
                    >
                        {/* Orbiting ring */}
                        <div className="relative w-24 h-24 flex items-center justify-center">
                            <motion.div
                                className="absolute inset-0 rounded-full border-[3px] border-t-amber-400 border-r-amber-400/50 border-b-transparent border-l-transparent"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
                            />
                            <motion.div
                                className="absolute inset-2 rounded-full border-[2px] border-t-transparent border-r-transparent border-b-amber-400/40 border-l-amber-400/40"
                                animate={{ rotate: -360 }}
                                transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
                            />
                            <Sparkles size={28} className="text-amber-400 relative z-10" />
                        </div>
                        <div>
                            <p className="text-psi-primary font-extrabold text-lg">Analyzing…</p>
                            <p className="text-psi-secondary text-xs mt-1">Gemini is extracting contact details</p>
                        </div>
                        <div className="flex gap-1.5">
                            {[0, 0.2, 0.4].map((d, i) => (
                                <motion.div
                                    key={i}
                                    className="w-1.5 h-1.5 rounded-full bg-amber-400"
                                    animate={{ scale: [1, 1.6, 1], opacity: [0.4, 1, 0.4] }}
                                    transition={{ duration: 0.8, repeat: Infinity, delay: d }}
                                />
                            ))}
                        </div>
                    </motion.div>
                )}

                {phase === 'error' && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center gap-4 text-center"
                    >
                        <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center">
                            <AlertCircle size={28} className="text-rose-400" />
                        </div>
                        <div>
                            <p className="text-psi-primary font-bold text-base">Analysis Failed</p>
                            <p className="text-psi-secondary text-xs mt-1">Check your network and try again</p>
                        </div>
                        <button
                            id="scanner-retry-btn"
                            onClick={handleRetry}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-psi-border-subtle hover:bg-psi-subtle text-psi-primary text-sm font-bold border border-psi transition-all"
                        >
                            <RefreshCw size={14} /> Try Again
                        </button>
                    </motion.div>
                )}

                {phase === 'done' && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center gap-3 text-center"
                    >
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                            className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/20"
                        >
                            <CheckCircle2 size={30} className="text-emerald-400" />
                        </motion.div>
                        <p className="text-psi-primary font-extrabold text-lg">Contact Extracted!</p>
                    </motion.div>
                )}
            </div>

            {/* ── Bottom CTA area ───────────────────────────────────────────── */}
            <div className="relative z-30 px-5 pb-safe-bottom pb-8 space-y-3">

                {/* Instruction strip */}
                {phase === 'idle' && (
                    <div className="flex items-center justify-center gap-2 text-psi-muted text-xs">
                        <Camera size={12} />
                        <span>Point at the business card — front side up</span>
                    </div>
                )}

                {/* ── THE MASSIVE CAPTURE BUTTON ── */}
                <AnimatePresence mode="wait">
                    {(phase === 'idle') && (
                        <motion.button
                            key="capture-btn"
                            id="capture-analyze-btn"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            whileTap={{ scale: 0.96 }}
                            onClick={handleCapture}
                            disabled={!cameraReady}
                            className={clsx(
                                'w-full py-5 rounded-3xl font-extrabold text-lg tracking-tight',
                                'flex items-center justify-center gap-3 transition-all',
                                'shadow-2xl active:scale-[0.98]',
                                cameraReady
                                    ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-orange-400 text-psi-primary shadow-amber-500/30 hover:shadow-amber-500/50'
                                    : 'bg-psi-border text-psi-secondary cursor-not-allowed',
                            )}
                        >
                            {cameraReady ? (
                                <>
                                    <Zap size={22} className="drop-shadow" />
                                    Capture &amp; Analyze
                                </>
                            ) : (
                                <>
                                    <Loader2 size={20} className="animate-spin" />
                                    Starting Camera…
                                </>
                            )}
                        </motion.button>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

// ═════════════════════════════════════════════════════════════════════════════
// ── PHASE 2: Pre-filled Lead Form ─────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════════

interface LeadFormViewProps {
    lead: ExtractedLead;
    onBack: () => void;
    onSaved: () => void;
    eventId?: string;
    agentId?: string;
}

function LeadFormView({ lead, onBack, onSaved, eventId = 'event_demo', agentId = 'agent_demo' }: LeadFormViewProps) {
    const [firstName, setFirstName] = useState(lead.firstName);
    const [lastName, setLastName] = useState(lead.lastName);
    const [email, setEmail] = useState(lead.email);
    const [phone, setPhone] = useState(lead.phone);
    const [company, setCompany] = useState(lead.company);
    const [jobTitle, setJobTitle] = useState(lead.jobTitle);
    const [projectInterest, setProjectInterest] = useState<ProjectOption | ''>('');
    const [phase, setPhase] = useState<FormPhase>('form');
    const [saveError, setSaveError] = useState('');

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!projectInterest) { setSaveError('Please select a project interest.'); return; }
        setSaveError('');
        setPhase('saving');

        try {
            await addDoc(collection(db, 'crm_leads'), {
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                email: email.trim().toLowerCase(),
                phone: phone.trim(),
                company: company.trim(),
                jobTitle: jobTitle.trim(),
                projectInterest,
                source: 'CardScan',
                eventId,
                agentId,
                scannedAt: serverTimestamp(),
            });
            setPhase('saved');
            setTimeout(onSaved, 1600);
        } catch (err) {
            console.error('[BusinessCardScanner] Firestore save failed:', err);
            setSaveError('Save failed — please try again.');
            setPhase('form');
        }
    };

    return (
        <div className="w-full min-h-full flex flex-col bg-psi-page">

            {/* ── Header ────────────────────────────────────────────────────── */}
            <div className="bg-psi-raised border-b border-psi px-4 pt-6 pb-4">
                <div className="flex items-center gap-3">
                    <button
                        id="lead-form-back-btn"
                        onClick={onBack}
                        className="w-9 h-9 rounded-xl bg-psi-subtle border border-psi flex items-center justify-center text-psi-muted hover:text-psi-primary transition-all flex-shrink-0"
                    >
                        <ArrowLeft size={16} />
                    </button>
                    <div>
                        <p className="text-[10px] font-black tracking-[0.2em] uppercase text-amber-500">
                            AI Extracted · Review &amp; Save
                        </p>
                        <h1 className="text-lg font-extrabold text-psi-primary leading-tight">New Lead</h1>
                    </div>
                    <div className="ml-auto flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-2.5 py-1.5">
                        <CheckCircle2 size={12} className="text-emerald-500" />
                        <span className="text-emerald-600 dark:text-emerald-400 text-[11px] font-bold">Card Scanned</span>
                    </div>
                </div>
            </div>

            {/* ── AI confidence banner ──────────────────────────────────────── */}
            <div className="mx-4 mt-4">
                <div className="flex items-center gap-2.5 bg-amber-500/8 border border-amber-500/20 rounded-2xl px-4 py-3">
                    <Sparkles size={15} className="text-amber-500 flex-shrink-0" />
                    <p className="text-amber-700 dark:text-amber-400 text-xs font-semibold leading-relaxed">
                        Fields pre-filled by Gemini Vision AI. Review and correct before saving — accuracy depends on card clarity.
                    </p>
                </div>
            </div>

            {/* ── Form ──────────────────────────────────────────────────────── */}
            <form id="new-lead-form" onSubmit={handleSave} className="flex-1 overflow-y-auto px-4 py-4 space-y-5 pb-32">

                {/* Name row */}
                <div className="psi-card p-4 space-y-4 rounded-2xl">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-psi-muted">Contact Name</p>
                    <div className="grid grid-cols-2 gap-3">
                        <FieldRow
                            id="lead-first-name"
                            label="First Name"
                            value={firstName}
                            onChange={setFirstName}
                            icon={<User size={14} />}
                            placeholder="First"
                        />
                        <FieldRow
                            id="lead-last-name"
                            label="Last Name"
                            value={lastName}
                            onChange={setLastName}
                            icon={<User size={14} />}
                            placeholder="Last"
                        />
                    </div>
                </div>

                {/* Contact details */}
                <div className="psi-card p-4 space-y-4 rounded-2xl">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-psi-muted">Contact Details</p>
                    <FieldRow
                        id="lead-email"
                        label="Email"
                        value={email}
                        onChange={setEmail}
                        icon={<Mail size={14} />}
                        type="email"
                        placeholder="email@example.com"
                    />
                    <FieldRow
                        id="lead-phone"
                        label="Phone"
                        value={phone}
                        onChange={setPhone}
                        icon={<Phone size={14} />}
                        type="tel"
                        placeholder="+971 50 000 0000"
                    />
                </div>

                {/* Company */}
                <div className="psi-card p-4 space-y-4 rounded-2xl">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-psi-muted">Professional Info</p>
                    <FieldRow
                        id="lead-company"
                        label="Company"
                        value={company}
                        onChange={setCompany}
                        icon={<Building2 size={14} />}
                        placeholder="Company name"
                    />
                    <FieldRow
                        id="lead-job-title"
                        label="Job Title"
                        value={jobTitle}
                        onChange={setJobTitle}
                        icon={<Briefcase size={14} />}
                        placeholder="e.g. CEO, Investor"
                    />
                </div>

                {/* Project Interest — the key tag the agent adds */}
                <div className="psi-card p-4 rounded-2xl">
                    <div className="flex items-center gap-2 mb-3">
                        <Tag size={13} className="text-amber-500" />
                        <p className="text-[10px] font-bold uppercase tracking-widest text-psi-muted">
                            Project Interest <span className="text-rose-400">*</span>
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        {PROJECT_OPTIONS.map(opt => (
                            <motion.button
                                key={opt}
                                type="button"
                                id={`project-tag-${opt.replace(/\s+/g, '-').toLowerCase()}`}
                                whileTap={{ scale: 0.96 }}
                                onClick={() => { setProjectInterest(opt); setSaveError(''); }}
                                className={clsx(
                                    'text-left px-3 py-2.5 rounded-xl border-2 text-xs font-bold transition-all',
                                    projectInterest === opt
                                        ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                        : 'border-psi bg-psi-subtle text-psi-secondary hover:border-amber-400/60',
                                )}
                            >
                                {projectInterest === opt && (
                                    <span className="inline-block w-2 h-2 rounded-full bg-amber-500 mr-1.5 align-middle" />
                                )}
                                {opt}
                            </motion.button>
                        ))}
                    </div>
                    {saveError && (
                        <p className="mt-2 text-xs text-rose-500 font-semibold flex items-center gap-1.5">
                            <AlertCircle size={12} /> {saveError}
                        </p>
                    )}
                </div>

                {/* Source badge (read-only) */}
                <div className="flex items-center gap-2 px-4 py-2.5 bg-psi-subtle rounded-xl border border-psi">
                    <ScanLine size={12} className="text-psi-muted" />
                    <span className="text-psi-muted text-xs font-semibold">Source:</span>
                    <span className="text-psi-secondary text-xs font-bold">Business Card Scan (AI)</span>
                    <span className="ml-auto text-psi-muted text-[10px] font-mono">
                        {new Date().toLocaleDateString('en-AE', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                </div>
            </form>

            {/* ── Sticky save button ────────────────────────────────────────── */}
            <div className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-safe-bottom pb-6 pt-3 bg-gradient-to-t from-psi-page via-psi-page to-transparent">
                <AnimatePresence mode="wait">
                    {phase === 'form' && (
                        <motion.button
                            key="save-btn"
                            type="submit"
                            form="new-lead-form"
                            id="save-lead-btn"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            whileTap={{ scale: 0.97 }}
                            className="w-full flex items-center justify-center gap-3 py-4 rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-psi-primary font-extrabold text-base shadow-2xl shadow-emerald-600/25 transition-all"
                        >
                            <Save size={18} />
                            Save Lead
                            <ChevronRight size={18} className="opacity-60" />
                        </motion.button>
                    )}
                    {phase === 'saving' && (
                        <motion.div
                            key="saving-btn"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="w-full flex items-center justify-center gap-3 py-4 rounded-3xl bg-emerald-600/60 text-psi-primary font-extrabold text-base"
                        >
                            <Loader2 size={18} className="animate-spin" />
                            Saving to CRM…
                        </motion.div>
                    )}
                    {phase === 'saved' && (
                        <motion.div
                            key="saved-btn"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="w-full flex items-center justify-center gap-3 py-4 rounded-3xl bg-emerald-600 text-white font-extrabold text-base shadow-lg shadow-emerald-600/30"
                        >
                            <CheckCircle2 size={18} />
                            Lead Saved!
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

// ═════════════════════════════════════════════════════════════════════════════
// ── Root Export: BusinessCardScanner ─────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════════

export interface BusinessCardScannerProps {
    /** Firestore event ID to attach scanned leads to */
    eventId?: string;
    /** Current agent's UID */
    agentId?: string;
    /** Called when the scanner should be dismissed (e.g. backdrop close) */
    onClose?: () => void;
    /** Called after a lead has been successfully saved */
    onLeadSaved?: () => void;
}

/**
 * BusinessCardScanner
 * ─────────────────────────────────────────────────────────────────────────────
 * Full-screen overlay modal. Renders as a two-phase wizard:
 *   Phase 1 → ScannerView  (camera + AI analysis)
 *   Phase 2 → LeadFormView (pre-filled form + save)
 *
 * Usage:
 *   <BusinessCardScanner eventId="event_xxx" agentId="uid_yyy" onClose={...} />
 */
export default function BusinessCardScanner({
    eventId,
    agentId,
    onClose,
    onLeadSaved,
}: BusinessCardScannerProps) {
    const [extractedLead, setExtractedLead] = useState<ExtractedLead | null>(null);

    return (
        <motion.div
            className="fixed inset-0 z-[9998] flex flex-col bg-psi-page"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        >
            <AnimatePresence mode="wait">
                {!extractedLead ? (
                    <motion.div
                        key="scanner"
                        className="flex-1 flex flex-col"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, x: -40 }}
                        transition={{ duration: 0.22 }}
                    >
                        <ScannerView
                            onLeadExtracted={setExtractedLead}
                            onClose={onClose}
                        />
                    </motion.div>
                ) : (
                    <motion.div
                        key="form"
                        className="flex-1 flex flex-col overflow-auto"
                        initial={{ opacity: 0, x: 40 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -40 }}
                        transition={{ duration: 0.22 }}
                    >
                        <LeadFormView
                            lead={extractedLead}
                            eventId={eventId}
                            agentId={agentId}
                            onBack={() => setExtractedLead(null)}
                            onSaved={() => {
                                onLeadSaved?.();
                                onClose?.();
                            }}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
