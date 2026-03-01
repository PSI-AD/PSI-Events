/**
 * AIPitchSimulator.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * AI Pitch Simulator — mandatory L&D gatekeeper for event participation.
 *
 * UX Flow:
 *   Lobby  → Agent reads the scenario and hits "Start Simulation"
 *   Record → Pulsing mic button; agent records a voice pitch (Web Audio API)
 *   Thinking → AI is "listening & scoring" (animated)
 *   Response → Gemini-as-buyer fires an objection back at the agent
 *   Score  → Scorecard: Confidence / Project Knowledge / Objection Handling
 *   Pass   → If avg ≥ 80 → writes assessment_passed: true to Firestore
 *            and flips UI to a "You're cleared to attend" celebration screen
 *
 * Gemini Integration (mocked):
 *   mockGeminiSession() logs the exact prompt that would be sent.
 *   To go live: swap the function body with a fetch() to your Cloud Function.
 *
 * Firestore write (real, not mocked):
 *   crm_events/{eventId}/approvedAgents/{agentId}
 *     assessment_passed: true
 *     assessment_score:  number   (0-100)
 *     assessment_at:     Timestamp
 *
 * Props:
 *   eventId  — Firestore event document ID
 *   agentId  — Firestore agent document ID
 *   agentName — Display name (for the pass certificate)
 *
 * Production checklist:
 *   □ Replace mockGeminiSession() with real Gemini API / Cloud Function call
 *   □ Move GEMINI_API_KEY to backend; never expose in client bundle
 *   □ Add Firestore Security Rule: only the agent or an organizer can write assessment_passed
 *   □ Validate transcript server-side before writing pass status
 */

import React, {
    useCallback, useEffect, useRef, useState,
} from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    Mic, MicOff, StopCircle, Play, RotateCcw,
    CheckCircle2, XCircle, Sparkles, Trophy,
    Brain, Target, ShieldCheck, Volume2,
    ChevronRight, Loader2, AlertCircle, Award,
    TrendingUp, MessageSquare, Zap,
} from 'lucide-react';
import {
    doc, updateDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../services/firebase/firebaseConfig';

// ═════════════════════════════════════════════════════════════════════════════
// Types & constants
// ═════════════════════════════════════════════════════════════════════════════

export interface AIPitchSimulatorProps {
    eventId?: string;
    agentId?: string;
    agentName?: string;
}

export interface ScoreBreakdown {
    confidence: number;           // 0-100
    projectKnowledge: number;     // 0-100
    objectionHandling: number;    // 0-100
    overallScore: number;         // averaged
    transcript: string;
    objection: string;            // AI buyer's objection
    feedback: string;             // AI coaching note
    passed: boolean;
}

type SimulatorPhase =
    | 'lobby'
    | 'record'
    | 'thinking'
    | 'objection'
    | 'scoring'
    | 'result_pass'
    | 'result_fail';

const PASS_THRESHOLD = 80;

// ── Scenarios ─────────────────────────────────────────────────────────────────

interface Scenario {
    id: string;
    title: string;
    property: string;
    clientProfile: string;
    brief: string;
    difficulty: 'Beginner' | 'Advanced' | 'Expert';
    tips: string[];
}

const SCENARIOS: Scenario[] = [
    {
        id: 'mamsha_hnwi',
        title: 'Pitch Mamsha Al Saadiyat',
        property: 'Mamsha Al Saadiyat',
        clientProfile: 'Hesitant High-Net-Worth Investor',
        brief: 'The client is a Russian ultra-HNWI considering both Abu Dhabi and the Maldives for their next trophy asset. They are skeptical of off-plan risk and have been burned before. Pitch Mamsha Al Saadiyat and address their concerns about liquidity and developer credibility.',
        difficulty: 'Expert',
        tips: [
            'Lead with Aldar\'s AAA credit rating and government backing',
            'Mention Louvre Abu Dhabi proximity for capital appreciation',
            'Address off-plan risk with phased payment plan details',
            'Use comparable luxury coastal sales to anchor value',
        ],
    },
    {
        id: 'marina_blue_family',
        title: 'Pitch Marina Blue Residences',
        property: 'Marina Blue Residences',
        clientProfile: 'Dubai Family Relocating to Abu Dhabi',
        brief: 'A Dubai family is relocating for a government job offer. They need a 3-bedroom unit ready within 12 months, walkable to amenities, and within a specific budget. Pitch Marina Blue and overcome their concern about commute times.',
        difficulty: 'Advanced',
        tips: [
            'Highlight the Al Reem Island bridge access to downtown',
            'Mention ADNOC HQ and government district proximity',
            'Quote the school catchment area and nearby nurseries',
            'Use the payment plan to bridge any budget gap',
        ],
    },
    {
        id: 'noya_first_timer',
        title: 'Pitch Noya on Yas Island',
        property: 'Noya on Yas Island',
        clientProfile: 'First-Time Investor from Europe',
        brief: 'A French couple visiting Abu Dhabi for the first time are excited by the Formula 1 lifestyle but nervous about buying abroad. They have a EUR 600K budget. Pitch Noya on Yas Island and overcome their concerns about foreign ownership legality.',
        difficulty: 'Beginner',
        tips: [
            'Explain UAE freehold law and no-income-tax advantage',
            'Cite visa-on-investment 10-year Golden Visa eligibility',
            'Show Yas Island capital appreciation data YoY',
            'Offer a post-sale property management package',
        ],
    },
];

// ═════════════════════════════════════════════════════════════════════════════
// Gemini AI Mock
// ═════════════════════════════════════════════════════════════════════════════

const BUYER_OBJECTIONS: Record<string, string[]> = {
    mamsha_hnwi: [
        'The off-plan market worries me. What happens if Aldar delays delivery like other developers have?',
        'I can get a comparable beachfront villa in Montenegro for half the price. Why Abu Dhabi?',
        'How liquid is this market really? I need to exit within 5 years without a loss.',
    ],
    marina_blue_family: [
        'The commute to ministry is 40 minutes. Why shouldn\'t I just rent close to work instead?',
        'We visited last weekend and the construction noise around Al Reem is unbearable.',
        'The price per square foot feels 20% above what we\'re seeing in Dubai for similar quality.',
    ],
    noya_first_timer: [
        'What if the UAE changes its laws on foreign ownership? We\'ve heard this can happen.',
        'The Yas Island location feels isolated. What happens to prices if the F1 contract ends?',
        'We need to see a full management company track record before we commit a cent.',
    ],
};

const AI_FEEDBACK_POOL: Record<string, { coaching: string; strongPoints: string[] }> = {
    mamsha_hnwi: {
        coaching: 'Strong openers reference developer credibility first. Lead with Aldar\'s sovereign backing before pivoting to lifestyle. Always pre-empt the liquidity objection with a secondary market data point.',
        strongPoints: ['Developer credibility framing', 'Luxury lifestyle positioning', 'Scarcity narrative'],
    },
    marina_blue_family: {
        coaching: 'Relocation pitches win on logistics certainty. Map the commute interactively, name the actual schools, and offer a site visit with a test commute. Emotion closes the deal — show family lifestyle, not just square footage.',
        strongPoints: ['Community lifestyle angle', 'Payment plan flexibility', 'Proximity to amenities'],
    },
    noya_first_timer: {
        coaching: 'First-time foreign buyers need legal certainty above all else. Always open with the Golden Visa slide and have the DLD foreign ownership fact sheet ready. Fear of the unknown is the real objection — not price.',
        strongPoints: ['Visa benefit framing', 'Tax advantage clarity', 'Lifestyle ROI narrative'],
    },
};

interface GeminiSessionResult {
    transcript: string;
    objection: string;
    scores: { confidence: number; projectKnowledge: number; objectionHandling: number };
    feedback: string;
}

/**
 * mockGeminiSession
 * ─────────────────────────────────────────────────────────────────────────────
 * Simulates a full Gemini API round-trip:
 *   1. Transcribe the audio blob (Gemini Speech-to-Text)
 *   2. AI buyer evaluates pitch and fires an objection
 *   3. AI coach scores the agent on 3 dimensions
 *
 * Production replacement:
 *   const res = await fetch('/api/simulatePitch', {
 *     method: 'POST',
 *     body: formData,   // { audio: Blob, scenarioId, agentId }
 *   });
 *   return await res.json() as GeminiSessionResult;
 */
async function mockGeminiSession(
    _audioBlob: Blob | null,
    scenario: Scenario,
    roundIndex: number,
): Promise<GeminiSessionResult> {

    const systemPrompt = `
You are playing TWO roles simultaneously in a real estate sales training simulation.

ROLE 1 — AI BUYER (${scenario.clientProfile}):
Scenario: ${scenario.brief}
Property: ${scenario.property}
Your task: Respond to the agent's pitch with a realistic, emotionally charged objection that tests their resolve. Be specific — not generic.

ROLE 2 — AI COACH (PSI L&D Director):
After hearing the pitch transcript, score the agent on:
  - Confidence (0-100): Vocal certainty, absence of filler words, assertive tone
  - Project Knowledge (0-100): Accuracy of facts, USP coverage, price/location precision
  - Objection Handling (0-100): Did they pre-empt objections? Use data? Reframe negatives?

Return strict JSON:
{
  "transcript": "<what the agent said>",
  "objection": "<the buyer's objection>",
  "scores": { "confidence": 0-100, "projectKnowledge": 0-100, "objectionHandling": 0-100 },
  "feedback": "<2-sentence coaching note for the agent>"
}`.trim();

    console.info('[AIPitchSimulator] Gemini prompt:\n', systemPrompt);
    console.info('[AIPitchSimulator] Scenario:', scenario.id, '| Round:', roundIndex + 1);

    // ── Simulated latency (2.2 s) ─────────────────────────────────────────────
    await new Promise(r => setTimeout(r, 2200));

    const objections = BUYER_OBJECTIONS[scenario.id] ?? BUYER_OBJECTIONS.mamsha_hnwi;
    const objection = objections[roundIndex % objections.length];

    const feedbackData = AI_FEEDBACK_POOL[scenario.id] ?? AI_FEEDBACK_POOL.mamsha_hnwi;

    // Vary scores based on round (each round agent builds momentum)
    const base = 55 + roundIndex * 12;
    const variance = () => Math.floor(Math.random() * 14) - 7;
    const clamp = (n: number) => Math.max(20, Math.min(100, n));

    const scores = {
        confidence: clamp(base + 5 + variance()),
        projectKnowledge: clamp(base + 2 + variance()),
        objectionHandling: clamp(base - 4 + variance()),
    };

    const transcript = roundIndex === 0
        ? `"${scenario.property} is one of the most unique addresses in Abu Dhabi. Aldar — the developer — is government-backed and has never missed a delivery. The beachfront location on Saadiyat is irreplaceable, and the Louvre Abu Dhabi being 400 metres away means this asset will only appreciate over time. The payment plan is 50-50 and the unit is already 70% complete."`
        : `"I hear your concern, and I want to address it directly with data. Aldar's last 3 projects all delivered ahead of schedule — I can show you the RERA certificates. On liquidity, the Saadiyat secondary market turned over AED 1.2 billion last year alone, which suggests healthy exit demand. I'd love to take you to the show apartment this week so you can feel the build quality for yourself."`;

    return {
        transcript,
        objection,
        scores,
        feedback: feedbackData.coaching,
    };
}

// ═════════════════════════════════════════════════════════════════════════════
// Audio recording hook
// ═════════════════════════════════════════════════════════════════════════════

function useAudioRecorder() {
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [duration, setDuration] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const mediaRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<BlobPart[]>([]);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const start = useCallback(async () => {
        setError(null);
        setAudioBlob(null);
        setAudioUrl(null);
        setDuration(0);
        chunksRef.current = [];

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mr = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
            mediaRef.current = mr;

            mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
            mr.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                setAudioBlob(blob);
                setAudioUrl(URL.createObjectURL(blob));
                stream.getTracks().forEach(t => t.stop());
            };

            mr.start(200);
            setIsRecording(true);
            timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
        } catch (err) {
            setError('Microphone access denied. Please allow mic access and retry.');
        }
    }, []);

    const stop = useCallback(() => {
        if (mediaRef.current?.state === 'recording') {
            mediaRef.current.stop();
        }
        if (timerRef.current) clearInterval(timerRef.current);
        setIsRecording(false);
    }, []);

    const reset = useCallback(() => {
        stop();
        setAudioBlob(null);
        setAudioUrl(null);
        setDuration(0);
        setError(null);
    }, [stop]);

    useEffect(() => () => { stop(); }, [stop]);

    return { isRecording, audioBlob, audioUrl, duration, error, start, stop, reset };
}

// ═════════════════════════════════════════════════════════════════════════════
// Firestore helpers
// ═════════════════════════════════════════════════════════════════════════════

async function writeAssessmentResult(
    eventId: string,
    agentId: string,
    score: number,
    passed: boolean,
): Promise<void> {
    try {
        const agentRef = doc(db, 'crm_events', eventId, 'approvedAgents', agentId);
        await updateDoc(agentRef, {
            assessment_passed: passed,
            assessment_score: score,
            assessment_at: serverTimestamp(),
        });
    } catch (err) {
        console.error('[AIPitchSimulator] Firestore write failed:', err);
        // Non-fatal — score is shown to user regardless
    }
}

// ═════════════════════════════════════════════════════════════════════════════
// Sub-components
// ═════════════════════════════════════════════════════════════════════════════

// ── Score ring ────────────────────────────────────────────────────────────────

function ScoreRing({ score, label, icon, delay = 0 }: {
    score: number; label: string; icon: React.ReactNode; delay?: number;
}) {
    const [displayed, setDisplayed] = useState(0);
    const radius = 36;
    const circ = 2 * Math.PI * radius;
    const offset = circ - (displayed / 100) * circ;

    const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';

    useEffect(() => {
        const timeout = setTimeout(() => {
            let current = 0;
            const step = setInterval(() => {
                current = Math.min(current + 2, score);
                setDisplayed(current);
                if (current >= score) clearInterval(step);
            }, 16);
            return () => clearInterval(step);
        }, delay);
        return () => clearTimeout(timeout);
    }, [score, delay]);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: delay / 1000 + 0.1, type: 'spring', stiffness: 200 }}
            className="flex flex-col items-center gap-2"
        >
            <div className="relative w-20 h-20">
                <svg className="w-20 h-20 -rotate-90" viewBox="0 0 88 88">
                    <circle cx="44" cy="44" r={radius} stroke="currentColor" strokeWidth="6"
                        className="text-white/10" fill="none" />
                    <circle cx="44" cy="44" r={radius} stroke={color} strokeWidth="6"
                        fill="none" strokeLinecap="round"
                        strokeDasharray={circ} strokeDashoffset={offset}
                        style={{ transition: 'stroke-dashoffset 0.05s linear' }}
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white font-extrabold text-lg tabular-nums">{displayed}</span>
                </div>
            </div>
            <div className="flex items-center gap-1 text-white/60 text-[10px] font-bold uppercase tracking-widest">
                {icon}
                <span>{label}</span>
            </div>
        </motion.div>
    );
}

// ── Recording mic ─────────────────────────────────────────────────────────────

function MicButton({ isRecording, onClick, disabled }: {
    isRecording: boolean; onClick: () => void; disabled?: boolean;
}) {
    return (
        <div className="relative flex items-center justify-center">
            {/* Pulsing rings */}
            {isRecording && (
                <>
                    <motion.div
                        className="absolute w-32 h-32 rounded-full bg-rose-500/20"
                        animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
                        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
                    />
                    <motion.div
                        className="absolute w-40 h-40 rounded-full bg-rose-500/10"
                        animate={{ scale: [1, 1.5, 1], opacity: [0.4, 0, 0.4] }}
                        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut', delay: 0.3 }}
                    />
                </>
            )}

            <motion.button
                id="sim-mic-btn"
                whileTap={{ scale: 0.93 }}
                onClick={onClick}
                disabled={disabled}
                className={[
                    'relative z-10 w-24 h-24 rounded-full flex items-center justify-center',
                    'text-white font-bold text-2xl transition-all shadow-2xl',
                    isRecording
                        ? 'bg-rose-600 shadow-rose-600/40 hover:bg-rose-500'
                        : 'bg-gradient-to-br from-amber-500 to-amber-600 shadow-amber-500/30 hover:from-amber-400 hover:to-amber-500',
                    disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
                ].join(' ')}
            >
                {isRecording ? <StopCircle size={36} /> : <Mic size={36} />}
            </motion.button>
        </div>
    );
}

// ── Thinking animation ────────────────────────────────────────────────────────

function ThinkingView({ label }: { label: string }) {
    const dots = ['Transcribing voice…', 'Analysing pitch…', 'Buyer forming objection…', 'Scoring performance…'];
    const [idx, setIdx] = useState(0);

    useEffect(() => {
        const t = setInterval(() => setIdx(i => (i + 1) % dots.length), 700);
        return () => clearInterval(t);
    }, []);

    return (
        <div className="flex flex-col items-center gap-6 py-8">
            <div className="relative w-20 h-20 flex items-center justify-center">
                <motion.div
                    className="absolute inset-0 rounded-full border-[3px] border-t-violet-500 border-r-violet-500/30 border-b-transparent border-l-transparent"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
                <motion.div
                    className="absolute inset-3 rounded-full border-2 border-b-amber-400/60 border-l-amber-400/30 border-t-transparent border-r-transparent"
                    animate={{ rotate: -360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                />
                <Brain size={24} className="text-violet-400" />
            </div>

            <div className="text-center">
                <p className="text-white font-extrabold text-lg mb-2">{label}</p>
                <AnimatePresence mode="wait">
                    <motion.p
                        key={idx}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="text-white/50 text-sm"
                    >
                        {dots[idx]}
                    </motion.p>
                </AnimatePresence>
            </div>
        </div>
    );
}

// ── Timer display ─────────────────────────────────────────────────────────────

function Timer({ seconds }: { seconds: number }) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return (
        <span className="font-mono text-rose-400 font-extrabold text-xl tabular-nums">
            {m}:{s}
        </span>
    );
}

// ═════════════════════════════════════════════════════════════════════════════
// Main Component
// ═════════════════════════════════════════════════════════════════════════════

export default function AIPitchSimulator({
    eventId = 'event_demo',
    agentId = 'agent_demo_001',
    agentName = 'Khalid Al-Mansouri',
}: AIPitchSimulatorProps) {

    const [phase, setPhase] = useState<SimulatorPhase>('lobby');
    const [scenario, setScenario] = useState<Scenario>(SCENARIOS[0]);
    const [round, setRound] = useState(0);                // 0-indexed; max 2 rounds
    const [scoreData, setScoreData] = useState<ScoreBreakdown | null>(null);
    const [aiError, setAiError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [objectionText, setObjection] = useState('');
    const [bestScore, setBestScore] = useState(0);

    const recorder = useAudioRecorder();

    // Max 2 rounds per session (3 rounds total but we show the best)
    const MAX_ROUNDS = 2;

    // ── Start simulation ───────────────────────────────────────────────────────
    const handleStart = () => {
        setRound(0);
        setScoreData(null);
        setAiError(null);
        recorder.reset();
        setPhase('record');
    };

    // ── Stop recording → send to Gemini ───────────────────────────────────────
    const handleStopAndAnalyse = async () => {
        if (recorder.isRecording) recorder.stop();
        setPhase('thinking');

        try {
            const result = await mockGeminiSession(recorder.audioBlob, scenario, round);
            const avg = Math.round(
                (result.scores.confidence + result.scores.projectKnowledge + result.scores.objectionHandling) / 3
            );
            const passed = avg >= PASS_THRESHOLD;

            const score: ScoreBreakdown = {
                ...result.scores,
                overallScore: avg,
                transcript: result.transcript,
                objection: result.objection,
                feedback: result.feedback,
                passed,
            };

            setScoreData(score);
            setObjection(result.objection);
            setBestScore(prev => Math.max(prev, avg));

            // Show the buyer objection first
            setPhase('objection');
        } catch (err) {
            setAiError('AI session failed. Please retry.');
            setPhase('record');
        }
    };

    // ── After viewing objection → see scorecard ────────────────────────────────
    const handleViewScore = async () => {
        setPhase('scoring');
        if (!scoreData) return;

        if (scoreData.passed) {
            // Write to Firestore then celebrate
            setSaving(true);
            await writeAssessmentResult(eventId, agentId, scoreData.overallScore, true);
            setSaving(false);
            setPhase('result_pass');
        } else if (round >= MAX_ROUNDS - 1) {
            // Exhausted attempts
            setPhase('result_fail');
        }
        // else: short pause then show scoring phase naturally
    };

    // Show scoring after a brief delay if not pass
    useEffect(() => {
        if (phase !== 'scoring') return;
        if (!scoreData) return;
        if (scoreData.passed) return; // handled in handleViewScore
        const t = setTimeout(() => {
            setPhase(round >= MAX_ROUNDS - 1 ? 'result_fail' : 'scoring');
        }, 200);
        return () => clearTimeout(t);
    }, [phase, scoreData, round]);

    // ── Retry ──────────────────────────────────────────────────────────────────
    const handleRetry = () => {
        recorder.reset();
        const nextRound = round + 1;
        setRound(nextRound);
        setScoreData(null);
        setAiError(null);
        setPhase('record');
    };

    // ── Restart with new scenario ──────────────────────────────────────────────
    const handleRestart = () => {
        recorder.reset();
        setRound(0);
        setScoreData(null);
        setAiError(null);
        setBestScore(0);
        setPhase('lobby');
    };

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER: LOBBY
    // ─────────────────────────────────────────────────────────────────────────
    if (phase === 'lobby') return (
        <div className="min-h-[calc(100vh-4rem)] bg-psi-page flex flex-col items-center justify-center px-4 py-8">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-lg space-y-6"
            >
                {/* Header */}
                <div className="text-center">
                    <div className="w-16 h-16 rounded-3xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center mx-auto mb-4">
                        <Brain size={28} className="text-violet-500" />
                    </div>
                    <p className="text-[10px] font-black tracking-[0.2em] uppercase text-violet-500 mb-1">
                        L&D Gatekeeper · Powered by Gemini AI
                    </p>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-psi-primary">AI Pitch Simulator</h1>
                    <p className="text-psi-muted text-sm mt-2 leading-relaxed max-w-sm mx-auto">
                        Score above <span className="text-amber-500 font-black">{PASS_THRESHOLD}%</span> to unlock your event attendance and earn your certification.
                    </p>
                </div>

                {/* Scenario selector */}
                <div className="psi-card rounded-3xl p-5 space-y-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-psi-muted">Choose your scenario</p>
                    {SCENARIOS.map(s => {
                        const diffColor = s.difficulty === 'Expert'
                            ? 'text-rose-500 bg-rose-500/10 border-rose-500/20'
                            : s.difficulty === 'Advanced'
                                ? 'text-amber-500 bg-amber-500/10 border-amber-500/20'
                                : 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
                        return (
                            <button
                                key={s.id}
                                id={`scenario-${s.id}`}
                                onClick={() => setScenario(s)}
                                className={[
                                    'w-full text-left p-4 rounded-2xl border-2 transition-all',
                                    scenario.id === s.id
                                        ? 'border-violet-500 bg-violet-500/10'
                                        : 'border-psi hover:border-violet-500/40 bg-psi-subtle',
                                ].join(' ')}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-psi-primary font-bold text-sm">{s.title}</p>
                                        <p className="text-psi-muted text-xs mt-0.5">Client: {s.clientProfile}</p>
                                    </div>
                                    <span className={`flex-shrink-0 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border ${diffColor}`}>
                                        {s.difficulty}
                                    </span>
                                </div>
                                {scenario.id === s.id && (
                                    <p className="text-psi-secondary text-xs mt-2 leading-relaxed">
                                        {s.brief.slice(0, 120)}…
                                    </p>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Tips */}
                <div className="psi-card rounded-2xl p-4 space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-psi-muted flex items-center gap-1.5">
                        <Zap size={11} className="text-amber-500" /> Coaching Tips
                    </p>
                    {scenario.tips.map((tip, i) => (
                        <div key={i} className="flex items-start gap-2">
                            <span className="text-amber-500 flex-shrink-0 mt-0.5"><ChevronRight size={12} /></span>
                            <p className="text-psi-secondary text-xs leading-relaxed">{tip}</p>
                        </div>
                    ))}
                </div>

                {/* Start button */}
                <motion.button
                    id="sim-start-btn"
                    whileTap={{ scale: 0.97 }}
                    onClick={handleStart}
                    className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-violet-500 text-white font-extrabold text-base shadow-xl shadow-violet-600/25 hover:shadow-violet-600/40 transition-all"
                >
                    <Mic size={20} />
                    Start Simulation
                    <ChevronRight size={18} />
                </motion.button>
            </motion.div>
        </div>
    );

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER: RECORD
    // ─────────────────────────────────────────────────────────────────────────
    if (phase === 'record') return (
        <div className="min-h-[calc(100vh-4rem)] bg-slate-950 flex flex-col items-center justify-center px-4 py-8 text-white">

            {/* Background glow */}
            <div className="fixed inset-0 pointer-events-none">
                <div className={`absolute top-1/3 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full blur-[80px] transition-colors duration-700 ${recorder.isRecording ? 'bg-rose-600/20' : 'bg-violet-600/15'}`} />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative z-10 w-full max-w-sm flex flex-col items-center gap-8"
            >
                {/* Round indicator */}
                <div className="flex items-center gap-2">
                    {Array.from({ length: MAX_ROUNDS }).map((_, i) => (
                        <div key={i} className={`w-2 h-2 rounded-full transition-all ${i === round ? 'bg-violet-400 w-6' : i < round ? 'bg-violet-600' : 'bg-white/10'}`} />
                    ))}
                    <span className="text-white/30 text-xs ml-1 font-mono">
                        Attempt {round + 1}/{MAX_ROUNDS}
                    </span>
                </div>

                {/* Scenario card */}
                <div className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 text-center">
                    <div className="inline-flex items-center gap-2 bg-violet-500/15 border border-violet-500/25 rounded-xl px-3 py-1.5 mb-4">
                        <Target size={12} className="text-violet-400" />
                        <span className="text-violet-400 text-[10px] font-black uppercase tracking-widest">Scenario</span>
                    </div>
                    <h2 className="text-white text-xl font-extrabold leading-tight mb-3">
                        {scenario.title}
                    </h2>
                    <p className="text-white/50 text-sm leading-relaxed">
                        🎭 <span className="text-white/70 font-semibold">Playing as:</span> {scenario.clientProfile}
                    </p>
                    <p className="text-white/50 text-xs leading-relaxed mt-2">
                        {scenario.brief.slice(0, 140)}…
                    </p>
                </div>

                {/* Mic */}
                <div className="flex flex-col items-center gap-5">
                    {recorder.error && (
                        <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-2 px-4 py-2 bg-rose-500/15 border border-rose-500/25 rounded-xl text-rose-400 text-xs font-semibold"
                        >
                            <AlertCircle size={13} />
                            {recorder.error}
                        </motion.div>
                    )}

                    <MicButton
                        isRecording={recorder.isRecording}
                        onClick={recorder.isRecording ? () => { } : recorder.start}
                        disabled={!!recorder.error}
                    />

                    {recorder.isRecording && <Timer seconds={recorder.duration} />}

                    <p className="text-white/40 text-sm text-center">
                        {recorder.isRecording
                            ? 'Recording your pitch… tap Stop when done'
                            : 'Tap the microphone to begin your pitch'}
                    </p>
                </div>

                {/* Playback + submit (shown after recording) */}
                <AnimatePresence>
                    {recorder.audioUrl && !recorder.isRecording && (
                        <motion.div
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="w-full space-y-3"
                        >
                            <audio src={recorder.audioUrl} controls className="w-full rounded-xl" />

                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    id="sim-redo-btn"
                                    onClick={recorder.reset}
                                    className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/70 text-sm font-bold hover:bg-white/10 transition-all"
                                >
                                    <RotateCcw size={14} /> Re-record
                                </button>
                                <motion.button
                                    id="sim-submit-btn"
                                    whileTap={{ scale: 0.97 }}
                                    onClick={handleStopAndAnalyse}
                                    className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-violet-500 text-white font-extrabold text-sm shadow-lg shadow-violet-600/25 hover:shadow-violet-600/40 transition-all"
                                >
                                    <Sparkles size={14} /> Analyse
                                </motion.button>
                            </div>
                        </motion.div>
                    )}

                    {recorder.isRecording && (
                        <motion.button
                            id="sim-stop-btn"
                            key="stop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={handleStopAndAnalyse}
                            className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-sm shadow-lg shadow-rose-600/30 transition-all"
                        >
                            <StopCircle size={16} /> Stop & Analyse
                        </motion.button>
                    )}
                </AnimatePresence>

                {aiError && (
                    <p className="text-rose-400 text-xs font-semibold text-center flex items-center gap-1.5">
                        <AlertCircle size={12} /> {aiError}
                    </p>
                )}

                <button
                    id="sim-back-lobby-btn"
                    onClick={handleRestart}
                    className="text-white/20 hover:text-white/50 text-xs transition-colors"
                >
                    ← Back to scenarios
                </button>
            </motion.div>
        </div>
    );

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER: THINKING
    // ─────────────────────────────────────────────────────────────────────────
    if (phase === 'thinking') return (
        <div className="min-h-[calc(100vh-4rem)] bg-slate-950 flex items-center justify-center px-4">
            <ThinkingView label="Gemini is listening…" />
        </div>
    );

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER: OBJECTION (AI buyer fires back)
    // ─────────────────────────────────────────────────────────────────────────
    if (phase === 'objection') return (
        <div className="min-h-[calc(100vh-4rem)] bg-slate-950 flex flex-col items-center justify-center px-4 py-8 text-white">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-sm space-y-6"
            >
                {/* AI Client avatar */}
                <div className="text-center">
                    <div className="w-16 h-16 rounded-3xl bg-slate-800 border-2 border-white/15 flex items-center justify-center mx-auto mb-3 text-3xl">
                        🧑‍💼
                    </div>
                    <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">AI Buyer — {scenario.clientProfile}</p>
                </div>

                {/* Objection bubble */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white/5 border border-white/10 rounded-3xl rounded-tl-lg p-6"
                >
                    <div className="flex gap-2 mb-3">
                        <MessageSquare size={14} className="text-rose-400 flex-shrink-0 mt-0.5" />
                        <span className="text-rose-400 text-[10px] font-black uppercase tracking-widest">Objection</span>
                    </div>
                    <p className="text-white text-lg font-bold leading-relaxed italic">
                        "{objectionText}"
                    </p>
                </motion.div>

                {/* Agent transcript */}
                {scoreData?.transcript && (
                    <div className="bg-violet-500/5 border border-violet-500/15 rounded-2xl p-4">
                        <p className="text-violet-400 text-[10px] font-bold uppercase tracking-widest mb-2">Your Pitch (Transcribed)</p>
                        <p className="text-white/60 text-xs leading-relaxed italic">{scoreData.transcript}</p>
                    </div>
                )}

                <motion.button
                    id="sim-view-score-btn"
                    whileTap={{ scale: 0.97 }}
                    onClick={handleViewScore}
                    disabled={saving}
                    className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-extrabold text-base shadow-xl shadow-amber-500/25 disabled:opacity-60 transition-all"
                >
                    {saving
                        ? <><Loader2 size={18} className="animate-spin" /> Saving…</>
                        : <><TrendingUp size={18} /> View My Score</>
                    }
                </motion.button>
            </motion.div>
        </div>
    );

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER: SCORING (brief pause state; handles transition)
    // ─────────────────────────────────────────────────────────────────────────
    if (phase === 'scoring') return (
        <div className="min-h-[calc(100vh-4rem)] bg-slate-950 flex items-center justify-center px-4">
            <ThinkingView label="Calculating your score…" />
        </div>
    );

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER: RESULT — PASS
    // ─────────────────────────────────────────────────────────────────────────
    if (phase === 'result_pass' && scoreData) return (
        <div className="min-h-[calc(100vh-4rem)] bg-slate-950 flex flex-col items-center justify-center px-4 py-8 text-white overflow-hidden">

            {/* Confetti-like background */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                {Array.from({ length: 20 }).map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute w-2 h-2 rounded-full"
                        style={{
                            backgroundColor: ['#f59e0b', '#10b981', '#8b5cf6', '#3b82f6'][i % 4],
                            left: `${Math.random() * 100}%`,
                        }}
                        initial={{ y: -20, opacity: 1 }}
                        animate={{ y: '110vh', opacity: 0, rotate: Math.random() * 720 }}
                        transition={{ duration: 2 + Math.random() * 2, delay: Math.random() * 1.5 }}
                    />
                ))}
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative z-10 w-full max-w-sm space-y-6"
            >
                {/* Trophy */}
                <div className="text-center">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 260, delay: 0.2 }}
                        className="w-20 h-20 rounded-3xl bg-amber-500/20 border-2 border-amber-500/40 flex items-center justify-center mx-auto mb-4"
                    >
                        <Trophy size={36} className="text-amber-400" />
                    </motion.div>
                    <h2 className="text-3xl font-extrabold text-white mb-1">Assessment Passed!</h2>
                    <p className="text-white/50 text-sm">
                        {agentName} · <span className="text-amber-400 font-bold">{scoreData.overallScore}%</span> overall
                    </p>
                </div>

                {/* Score rings */}
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 text-center mb-5">Score Breakdown</p>
                    <div className="grid grid-cols-3 gap-4">
                        <ScoreRing score={scoreData.confidence} label="Confidence" icon={<Mic size={9} />} delay={0} />
                        <ScoreRing score={scoreData.projectKnowledge} label="Knowledge" icon={<Brain size={9} />} delay={200} />
                        <ScoreRing score={scoreData.objectionHandling} label="Objections" icon={<Target size={9} />} delay={400} />
                    </div>
                </div>

                {/* AI Coaching note */}
                <div className="bg-violet-500/10 border border-violet-500/20 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Sparkles size={12} className="text-violet-400" />
                        <span className="text-violet-400 text-[10px] font-black uppercase tracking-widest">AI Coach Feedback</span>
                    </div>
                    <p className="text-white/70 text-xs leading-relaxed">{scoreData.feedback}</p>
                </div>

                {/* Clearance badge */}
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="bg-emerald-500/10 border border-emerald-500/25 rounded-2xl p-4 flex items-center gap-3"
                >
                    <ShieldCheck size={20} className="text-emerald-400 flex-shrink-0" />
                    <div>
                        <p className="text-emerald-400 text-xs font-black uppercase tracking-widest">Event Clearance Granted</p>
                        <p className="text-white/50 text-xs mt-0.5">`assessment_passed: true` written to your event record.</p>
                    </div>
                </motion.div>

                <button
                    id="sim-done-btn"
                    onClick={handleRestart}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white/60 text-sm font-bold hover:bg-white/10 transition-all"
                >
                    <RotateCcw size={14} /> Retry a harder scenario
                </button>
            </motion.div>
        </div>
    );

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER: RESULT — FAIL
    // ─────────────────────────────────────────────────────────────────────────
    if (phase === 'result_fail' && scoreData) return (
        <div className="min-h-[calc(100vh-4rem)] bg-slate-950 flex flex-col items-center justify-center px-4 py-8 text-white">
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-sm space-y-6"
            >
                <div className="text-center">
                    <div className="w-16 h-16 rounded-3xl bg-rose-500/15 border border-rose-500/25 flex items-center justify-center mx-auto mb-4">
                        <Award size={28} className="text-rose-400" />
                    </div>
                    <h2 className="text-2xl font-extrabold text-white mb-1">Not Quite There Yet</h2>
                    <p className="text-white/40 text-sm">Best score: <span className="text-amber-400 font-black">{bestScore}%</span> · Threshold: {PASS_THRESHOLD}%</p>
                </div>

                {/* Score rings */}
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 text-center mb-5">Latest Attempt</p>
                    <div className="grid grid-cols-3 gap-4">
                        <ScoreRing score={scoreData.confidence} label="Confidence" icon={<Mic size={9} />} delay={0} />
                        <ScoreRing score={scoreData.projectKnowledge} label="Knowledge" icon={<Brain size={9} />} delay={200} />
                        <ScoreRing score={scoreData.objectionHandling} label="Objections" icon={<Target size={9} />} delay={400} />
                    </div>
                </div>

                {/* Coaching note */}
                <div className="bg-amber-500/8 border border-amber-500/15 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Brain size={12} className="text-amber-400" />
                        <span className="text-amber-400 text-[10px] font-black uppercase tracking-widest">Coach Advice</span>
                    </div>
                    <p className="text-white/60 text-xs leading-relaxed">{scoreData.feedback}</p>
                </div>

                {/* Tips from scenario */}
                <div className="space-y-2">
                    {scenario.tips.slice(0, 2).map((tip, i) => (
                        <div key={i} className="flex items-start gap-2 px-3 py-2 bg-white/[0.03] rounded-xl border border-white/[0.06]">
                            <Zap size={11} className="text-violet-400 flex-shrink-0 mt-0.5" />
                            <p className="text-white/50 text-xs">{tip}</p>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <button
                        id="sim-new-scenario-btn"
                        onClick={handleRestart}
                        className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white/60 text-sm font-bold hover:bg-white/10 transition-all"
                    >
                        <RotateCcw size={14} /> New Scenario
                    </button>
                    <motion.button
                        id="sim-retry-btn"
                        whileTap={{ scale: 0.97 }}
                        onClick={handleRestart}
                        className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 to-violet-500 text-white font-extrabold text-sm shadow-lg shadow-violet-600/20 transition-all"
                    >
                        <Mic size={14} /> Try Again
                    </motion.button>
                </div>
            </motion.div>
        </div>
    );

    return null;
}
