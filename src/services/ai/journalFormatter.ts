/**
 * journalFormatter.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * AI Rewriter Service — wraps the Google Gemini API to polish raw, dictated
 * journal notes into professional corporate updates for the PSI internal feed.
 *
 * ── Security note ─────────────────────────────────────────────────────────────
 * This module runs IN THE BROWSER and reads VITE_GEMINI_API_KEY from the
 * Vite environment. Exposing an API key client-side is acceptable for internal
 * tools and MVPs where only authenticated PSI staff have access to the app.
 *
 * For a public-facing production deployment, migrate the Gemini call into a
 * Firebase Cloud Function (functions/src/api/polishJournalEntry.ts) and call
 * it via httpsCallable so the key never leaves the server.
 *
 * ── SDK note ──────────────────────────────────────────────────────────────────
 * Uses @google/genai (v1.x) — already installed in package.json.
 * Model: gemini-2.0-flash  (fast, low cost, good at creative rewriting)
 */

import { GoogleGenAI } from '@google/genai';
import type { AIPolishRecord } from '../../types/journal';

// ── Constants ─────────────────────────────────────────────────────────────────

const MODEL_ID = 'gemini-2.0-flash';

/**
 * PSI_SYSTEM_PROMPT
 * Injected as the system instruction for every Gemini request.
 * Tuned specifically for PSI roadshow and event contexts.
 */
const PSI_SYSTEM_PROMPT = `You are a professional corporate Learning & Development writer for Property Shop Investment (PSI), one of the UAE's leading real estate brokerages.

Your task is to take rough, dictated or hastily typed notes from PSI staff members at international property roadshows and events, and rewrite them into clean, engaging, 3-to-4 paragraph professional updates suitable for the company's internal event feed.

Guidelines:
- Fix all grammar, punctuation, and spelling errors.
- Expand abbreviations naturally (e.g., "mtngs" → "meetings").
- Add professional excitement and energy while keeping the tone corporate and credible.
- Always keep the content strictly factual — do not invent leads, deals, or numbers that weren't mentioned.
- Use active voice wherever possible.
- Start with a strong opening sentence that immediately communicates the key news or achievement.
- Mention specific project names, developer names, or lead counts if they appear in the raw text.
- End with a forward-looking or motivational closing line where appropriate.
- Output plain text only — no markdown, no bullet points, no headers. Just professional paragraphs.
- Target length: 150–250 words.`;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PolishResult {
    /** The polished text returned by Gemini */
    polishedText: string;
    /** Full audit record for appending to JournalPost.aiPolishHistory */
    auditRecord: AIPolishRecord;
    /** Whether the result came from the live API or the offline mock */
    source: 'gemini' | 'mock';
    /** Approximate input token count (estimated from char count) */
    estimatedTokens: number;
}

export interface PolishOptions {
    /**
     * Maximum number of retry attempts on transient failures (429, 503).
     * Default: 2
     */
    maxRetries?: number;
    /**
     * Additional context about the event appended to the user message.
     * e.g. "This is from the London Luxury Property Show, October 2026."
     */
    eventContext?: string;
    /**
     * Override the model. Defaults to gemini-2.0-flash.
     * Pass 'gemini-1.5-pro' for longer, more polished outputs.
     */
    model?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Rough token estimator: ~4 chars per token (English). */
function estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
}

/** Exponential backoff sleep. */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * isMockMode
 * Returns true when no API key is configured so we can provide a
 * graceful fallback in development without crashing.
 */
function isMockMode(): boolean {
    const key = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
    return !key || key.trim() === '' || key === 'your_key_here';
}

/**
 * mockPolish
 * Fallback response when VITE_GEMINI_API_KEY is not set.
 * Clearly labelled as a mock so developers know it's not a real Gemini response.
 */
function mockPolish(rawText: string): PolishResult {
    const mockOutput = `[MOCK — Gemini not connected] ${rawText.trim()}

This is a development placeholder. To activate the AI rewriter, add VITE_GEMINI_API_KEY to your .env.local file and restart the dev server. The key must be a valid Google AI Studio API key with the Gemini API enabled.

Once connected, this text will be transformed into a polished 3-to-4 paragraph professional update reflecting PSI's corporate voice.`;

    const now = new Date().toISOString();
    return {
        polishedText: mockOutput,
        auditRecord: {
            rawInput: rawText,
            polishedOutput: mockOutput,
            model: 'mock',
            polishedAt: now,
        },
        source: 'mock',
        estimatedTokens: 0,
    };
}

// ── Core function ─────────────────────────────────────────────────────────────

/**
 * polishJournalEntry
 *
 * Takes raw dictated / typed notes and returns a polished corporate update
 * via the Gemini API, plus a full audit record for the JournalPost history.
 *
 * @param rawText      The raw text to polish (from voice-to-text or typed input)
 * @param options      Optional config: retries, event context, model override
 *
 * @throws Error       On non-retryable API errors or after exhausting retries
 *
 * @example
 * const result = await polishJournalEntry(
 *   "had gr8 day at london show. met aldar team. 12 hot leads from russians looking emaar. sara closed 1 deal!!",
 *   { eventContext: "London Luxury Property Show, October 2026" }
 * );
 * console.log(result.polishedText);
 * // → "Property Shop Investment's team delivered an exceptional performance at the
 * //    London Luxury Property Show today, securing 12 high-potential leads from
 * //    international investors..."
 */
export async function polishJournalEntry(
    rawText: string,
    options?: PolishOptions
): Promise<PolishResult> {
    // ── Input validation ──────────────────────────────────────────────────────
    const trimmed = rawText.trim();
    if (!trimmed) {
        throw new Error('polishJournalEntry: rawText cannot be empty.');
    }
    if (trimmed.length < 10) {
        throw new Error('polishJournalEntry: rawText is too short to polish (minimum 10 characters).');
    }

    // ── Mock mode fallback ────────────────────────────────────────────────────
    if (isMockMode()) {
        console.warn('[journalFormatter] VITE_GEMINI_API_KEY not set — returning mock response.');
        return mockPolish(trimmed);
    }

    const {
        maxRetries = 2,
        eventContext = '',
        model = MODEL_ID,
    } = options ?? {};

    // ── Build the prompt ──────────────────────────────────────────────────────
    const contextLine = eventContext
        ? `\n\nEvent context: ${eventContext}`
        : '';

    const userMessage = `Here are the raw notes to polish:

---
${trimmed}${contextLine}
---

Rewrite the above into a professional PSI company feed update. Output plain paragraphs only — no markdown.`;

    // ── SDK initialisation ────────────────────────────────────────────────────
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string;
    const ai = new GoogleGenAI({ apiKey });

    // ── Request with retry loop ───────────────────────────────────────────────
    let lastError: Error | null = null;
    const startTime = Date.now();

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const response = await ai.models.generateContent({
                model,
                contents: userMessage,
                config: {
                    systemInstruction: PSI_SYSTEM_PROMPT,
                    temperature: 0.72,  // creative but not hallucinating
                    maxOutputTokens: 512,   // ~250 words comfortably
                    topP: 0.9,
                },
            });

            const polishedText = response.text?.trim() ?? '';

            if (!polishedText) {
                throw new Error('Gemini returned an empty response.');
            }

            const now = new Date().toISOString();
            console.info(
                `[journalFormatter] Polished ${trimmed.length} chars in ${Date.now() - startTime}ms`,
                `(attempt ${attempt + 1}, model: ${model})`
            );

            return {
                polishedText,
                auditRecord: {
                    rawInput: trimmed,
                    polishedOutput: polishedText,
                    model: model,
                    polishedAt: now,
                },
                source: 'gemini',
                estimatedTokens: estimateTokens(trimmed) + estimateTokens(polishedText),
            };

        } catch (err: unknown) {
            lastError = err instanceof Error ? err : new Error(String(err));
            const isTransient = lastError.message.includes('429') ||
                lastError.message.includes('503') ||
                lastError.message.includes('RESOURCE_EXHAUSTED') ||
                lastError.message.includes('UNAVAILABLE');

            if (!isTransient || attempt === maxRetries) break;

            const backoffMs = Math.pow(2, attempt + 1) * 500; // 1s, 2s, 4s
            console.warn(
                `[journalFormatter] Transient error on attempt ${attempt + 1}, retrying in ${backoffMs}ms:`,
                lastError.message
            );
            await sleep(backoffMs);
        }
    }

    // All retries exhausted
    throw new Error(
        `polishJournalEntry failed after ${maxRetries + 1} attempts: ${lastError?.message ?? 'Unknown error'}`
    );
}

// ── Convenience utilities ─────────────────────────────────────────────────────

/**
 * buildEventContext
 * Constructs the eventContext string from event metadata for cleaner call sites.
 *
 * @example
 * const ctx = buildEventContext('London Luxury Property Show', 'London', 'October 2026');
 * // → "London Luxury Property Show in London, October 2026"
 */
export function buildEventContext(
    eventName: string,
    city?: string,
    period?: string
): string {
    const parts = [eventName, city, period].filter(Boolean);
    return parts.join(', ');
}

/**
 * estimatePolishCost
 * Returns a rough USD cost estimate for polishing a given text with Gemini Flash.
 * Pricing: ~$0.075 per 1M input tokens + $0.30 per 1M output tokens (as of 2026).
 * For an internal tool this is negligible but useful for budget tracking.
 */
export function estimatePolishCost(rawText: string): {
    inputTokens: number;
    outputTokens: number; // estimated output
    estimatedUSD: number;
} {
    const inputTokens = estimateTokens(PSI_SYSTEM_PROMPT) + estimateTokens(rawText);
    const outputTokens = 200; // ~200 tokens for a 150-250 word output
    const estimatedUSD = (inputTokens / 1_000_000) * 0.075 + (outputTokens / 1_000_000) * 0.30;
    return { inputTokens, outputTokens, estimatedUSD };
}
