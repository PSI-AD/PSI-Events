/**
 * LocalizedPitch.tsx
 * Multi-Lingual AI Pitch Generator for international roadshows.
 *
 * Flow:
 *  1. PitchForm     — Agent picks Property, Target Language, Client Email + optional note
 *  2. generatePitch() — Mocked Gemini Vision API. Translates property bullets + agent bio
 *  3. PitchPreview  — Full localized brochure preview (RTL for Arabic/Farsi)
 *  4. Share actions — "Send via WhatsApp" deep-link & "Send via Email" mailto
 *
 * Production wiring:
 *  Replace mockGeminiTranslate() body with a real fetch() to Cloud Function /translatePitch
 *  passing { propertyId, language, agentBio, bullets } → returns LocalizedContent JSON.
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    Globe, Sparkles, Loader2, ChevronDown, Send,
    MessageCircle, Mail, ArrowLeft, Check,
    Building2, MapPin, Bed, DollarSign, Star,
    User, Copy, RefreshCw, AlertCircle, Eye,
} from 'lucide-react';
import { DEMO_PROJECTS, DEMO_AGENT, fetchCRMProjects, fmtAED } from './brochure/data';
import type { CRMProject } from './brochure/types';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface SupportedLanguage {
    code: string;
    label: string;
    nativeLabel: string;
    flag: string;
    rtl: boolean;
    geminiLocale: string;
}

export const LANGUAGES: SupportedLanguage[] = [
    { code: 'ru', label: 'Russian', nativeLabel: 'Русский', flag: '🇷🇺', rtl: false, geminiLocale: 'ru-RU' },
    { code: 'zh', label: 'Mandarin Chinese', nativeLabel: '普通话', flag: '🇨🇳', rtl: false, geminiLocale: 'zh-CN' },
    { code: 'fr', label: 'French', nativeLabel: 'Français', flag: '🇫🇷', rtl: false, geminiLocale: 'fr-FR' },
    { code: 'ar', label: 'Arabic', nativeLabel: 'العربية', flag: '🇦🇪', rtl: true, geminiLocale: 'ar-AE' },
    { code: 'de', label: 'German', nativeLabel: 'Deutsch', flag: '🇩🇪', rtl: false, geminiLocale: 'de-DE' },
    { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी', flag: '🇮🇳', rtl: false, geminiLocale: 'hi-IN' },
    { code: 'fa', label: 'Farsi', nativeLabel: 'فارسی', flag: '🇮🇷', rtl: true, geminiLocale: 'fa-IR' },
    { code: 'tr', label: 'Turkish', nativeLabel: 'Türkçe', flag: '🇹🇷', rtl: false, geminiLocale: 'tr-TR' },
    { code: 'pt', label: 'Portuguese', nativeLabel: 'Português', flag: '🇧🇷', rtl: false, geminiLocale: 'pt-BR' },
    { code: 'ko', label: 'Korean', nativeLabel: '한국어', flag: '🇰🇷', rtl: false, geminiLocale: 'ko-KR' },
];

export interface LocalizedContent {
    language: SupportedLanguage;
    projectName: string;
    tagline: string;
    description: string;
    highlights: string[];
    callToAction: string;
    agentBio: string;
    priceLabel: string;
    locationLabel: string;
    bedroomsLabel: string;
    ctaButtonText: string;
    closingNote: string;
}

type WizardStep = 'form' | 'generating' | 'preview';

// ═══════════════════════════════════════════════════════════════════════════
// Mock Gemini translation data per language
// ═══════════════════════════════════════════════════════════════════════════

const TRANSLATIONS: Record<string, (project: CRMProject, agent: typeof DEMO_AGENT) => LocalizedContent> = {
    ru: (p) => ({
        language: LANGUAGES[0],
        projectName: p.name,
        tagline: `Ваша идеальная недвижимость в Абу-Даби — ${p.name}`,
        description: `${p.description ?? ''} Это уникальная возможность приобрести элитную недвижимость в одном из самых динамично развивающихся городов мира. Абу-Даби предлагает нулевой налог на доход, стабильную валюту и высокую доходность от аренды.`,
        highlights: (p.highlights ?? []).map(h => `✦ ${h}`).concat(['✦ Нет налога на прибыль', '✦ Высокая доходность от аренды', '✦ Резидентская виза для инвесторов']),
        callToAction: 'Свяжитесь со мной для получения эксклюзивного предложения',
        agentBio: `Я — ${DEMO_AGENT.name}, сертифицированный специалист по недвижимости Абу-Даби с 10-летним опытом. Специализируюсь на обслуживании российских и восточноевропейских клиентов. Я говорю на вашем языке — в прямом и переносном смысле.`,
        priceLabel: 'Ценовой диапазон',
        locationLabel: 'Расположение',
        bedroomsLabel: 'Спальни',
        ctaButtonText: 'Записаться на просмотр',
        closingNote: 'Ограниченное количество юнитов. Свяжитесь сейчас, чтобы зарезервировать единицу по предстартовой цене.',
    }),
    zh: (p) => ({
        language: LANGUAGES[1],
        projectName: p.name,
        tagline: `您在阿布扎比的理想居所 — ${p.name}`,
        description: `${p.description ?? ''} 这是在全球发展最快的城市之一购置豪华房产的绝佳机会。阿布扎比提供零所得税、稳定货币和高租金收益率。`,
        highlights: (p.highlights ?? []).map(h => `◆ ${h}`).concat(['◆ 零所得税', '◆ 高租金回报率', '◆ 投资者居留签证']),
        callToAction: '立即联系我获取专属优惠',
        agentBio: `我是${DEMO_AGENT.name}，专业阿布扎比房产顾问，拥有10年从业经验，专注服务中国投资者。让我用您的语言与您沟通。`,
        priceLabel: '价格区间',
        locationLabel: '地理位置',
        bedroomsLabel: '卧室数量',
        ctaButtonText: '预约看房',
        closingNote: '名额有限，立即联系我们以锁定预售价格。',
    }),
    fr: (p) => ({
        language: LANGUAGES[2],
        projectName: p.name,
        tagline: `Votre résidence de prestige à Abu Dhabi — ${p.name}`,
        description: `${p.description ?? ''} Une opportunité rare d'acquérir un bien d'exception dans l'une des métropoles les plus dynamiques au monde. Abu Dhabi offre une fiscalité zéro, une monnaie stable et des rendements locatifs attractifs.`,
        highlights: (p.highlights ?? []).map(h => `• ${h}`).concat(['• Aucun impôt sur le revenu', '• Rendement locatif élevé', '• Visa investisseur disponible']),
        callToAction: 'Contactez-moi pour une offre exclusive',
        agentBio: `Je suis ${DEMO_AGENT.name}, conseiller immobilier certifie a Abu Dhabi, specialise dans l'accompagnement des clients francophones depuis plus de 10 ans.`,
        priceLabel: 'Fourchette de prix',
        locationLabel: 'Emplacement',
        bedroomsLabel: 'Chambres',
        ctaButtonText: 'Planifier une visite',
        closingNote: "Nombre d'unites limite. Contactez-nous maintenant pour reserver au prix de pre-lancement.",
    }),
    ar: (p) => ({
        language: LANGUAGES[3],
        projectName: p.name,
        tagline: '\u0645\u0633\u0643\u0646\u0643 \u0627\u0644\u0645\u062b\u0627\u0644\u064a \u0641\u064a \u0623\u0628\u0648\u0638\u0628\u064a \u2014 ' + p.name,
        description: (p.description ?? '') + ' \u0641\u0631\u0635\u0629 \u0627\u0633\u062a\u062b\u0646\u0627\u0626\u064a\u0629 \u0644\u0627\u0645\u062a\u0644\u0627\u0643 \u0639\u0642\u0627\u0631 \u0641\u0627\u062e\u0631 \u0641\u064a \u0648\u0627\u062d\u062f\u0629 \u0645\u0646 \u0623\u0633\u0631\u0639 \u0627\u0644\u0645\u062f\u0646 \u0646\u0645\u0648\u064b\u0627.',
        highlights: (p.highlights ?? []).map(h => '\u25c8 ' + h).concat(['\u25c8 \u0644\u0627 \u0636\u0631\u064a\u0628\u0629 \u062f\u062e\u0644', '\u25c8 \u0639\u0627\u0626\u062f \u0625\u064a\u062c\u0627\u0631\u064a \u0645\u0631\u062a\u0641\u0639', '\u25c8 \u062a\u0623\u0634\u064a\u0631\u0629 \u0625\u0642\u0627\u0645\u0629 \u0644\u0644\u0645\u0633\u062a\u062b\u0645\u0631\u064a\u0646']),
        callToAction: '\u062a\u0648\u0627\u0635\u0644 \u0645\u0639\u064a \u0644\u0644\u062d\u0635\u0648\u0644 \u0639\u0644\u0649 \u0639\u0631\u0636 \u062d\u0635\u0631\u064a',
        agentBio: '\u0623\u0646\u0627 ' + DEMO_AGENT.name + '\u060c \u0645\u0633\u062a\u0634\u0627\u0631 \u0639\u0642\u0627\u0631\u064a \u0645\u0639\u062a\u0645\u062f \u0641\u064a \u0623\u0628\u0648\u0638\u0628\u064a \u0645\u0639 \u062e\u0628\u0631\u0629 10 \u0633\u0646\u0648\u0627\u062a.',
        priceLabel: '\u0646\u0637\u0627\u0642 \u0627\u0644\u0623\u0633\u0639\u0627\u0631',
        locationLabel: '\u0627\u0644\u0645\u0648\u0642\u0639',
        bedroomsLabel: '\u063a\u0631\u0641 \u0627\u0644\u0646\u0648\u0645',
        ctaButtonText: '\u0627\u062d\u062c\u0632 \u0645\u0648\u0639\u062f \u0645\u0639\u0627\u064a\u0646\u0629',
        closingNote: '\u0627\u0644\u0648\u062d\u062f\u0627\u062a \u0645\u062d\u062f\u0648\u062f\u0629. \u062a\u0648\u0627\u0635\u0644 \u0645\u0639\u0646\u0627 \u0627\u0644\u0622\u0646 \u0644\u062a\u0623\u0645\u064a\u0646 \u0633\u0639\u0631 \u0645\u0627 \u0642\u0628\u0644 \u0627\u0644\u0625\u0637\u0644\u0627\u0642.',
    }),
    de: (p) => ({
        language: LANGUAGES[4],
        projectName: p.name,
        tagline: `Ihre Traumimmobilie in Abu Dhabi — ${p.name} `,
        description: `${p.description ?? ''} Eine seltene Möglichkeit, eine Luxusimmobilie in einer der dynamischsten Metropolen der Welt zu erwerben.Abu Dhabi bietet null Einkommenssteuer, eine stabile Währung und attraktive Mietrenditen.`,
        highlights: (p.highlights ?? []).map(h => `▸ ${h} `).concat(['▸ Keine Einkommenssteuer', '▸ Hohe Mietrendite', '▸ Investorenvisum verfügbar']),
        callToAction: 'Kontaktieren Sie mich für ein exklusives Angebot',
        agentBio: `Ich bin ${DEMO_AGENT.name}, zertifizierter Immobilienberater in Abu Dhabi mit über 10 Jahren Erfahrung im deutschsprachigen Markt.`,
        priceLabel: 'Preisspanne',
        locationLabel: 'Lage',
        bedroomsLabel: 'Schlafzimmer',
        ctaButtonText: 'Besichtigung vereinbaren',
        closingNote: 'Begrenzte Einheiten verfügbar. Jetzt kontaktieren für Vorverkaufspreise.',
    }),
};

// Generic fallback for languages without a hand-crafted template
function genericTranslation(lang: SupportedLanguage, p: CRMProject): LocalizedContent {
    return {
        language: lang,
        projectName: p.name,
        tagline: `${p.name} — Abu Dhabi Premium Property`,
        description: p.description ?? '',
        highlights: (p.highlights ?? []).map(h => `• ${h} `).concat(['• 0% Income Tax', '• High Rental Yield', '• Investor Visa']),
        callToAction: 'Contact me for an exclusive offer',
        agentBio: `I am ${DEMO_AGENT.name}, certified real estate advisor in Abu Dhabi, dedicated to serving international clients in their preferred language.`,
        priceLabel: 'Price Range', locationLabel: 'Location',
        bedroomsLabel: 'Bedrooms', ctaButtonText: 'Schedule a Viewing',
        closingNote: 'Limited units. Contact us now to secure pre-launch pricing.',
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// Gemini AI Mock
// ═══════════════════════════════════════════════════════════════════════════

const GEMINI_PROMPT_TEMPLATE = (project: CRMProject, lang: SupportedLanguage) => `
You are a luxury real estate copywriter and certified translator.

Translate and culturally adapt the following property pitch into ${lang.label} (${lang.geminiLocale}).

Property: ${project.name}
Developer: ${project.developer_name ?? 'PSI Development'}
Location: ${project.location ?? 'Abu Dhabi'}
Description: ${project.description ?? ''}
Key Highlights: ${(project.highlights ?? []).join(', ')}
Price Range: ${project.priceRange ?? 'On request'}

Rules:
- Preserve luxury tone and emotional appeal
    - Adapt idioms and cultural references for ${lang.label} - speaking investors
        - ${lang.rtl ? 'Output must be in right-to-left script' : ''}
- Return STRICT JSON with keys: tagline, description, highlights(array), callToAction, agentBio, ctaButtonText, closingNote
    - No markdown, no extra text
`.trim();

export async function generateLocalizedPitch(
    project: CRMProject,
    lang: SupportedLanguage,
): Promise<LocalizedContent> {
    // Log the exact prompt would send to Gemini in production
    console.info('[LocalizedPitch] Gemini prompt:\n', GEMINI_PROMPT_TEMPLATE(project, lang));
    console.info('[LocalizedPitch] Target locale:', lang.geminiLocale);

    // ── Production replacement ──────────────────────────────────────────────
    // const res = await fetch('/api/translatePitch', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ projectId: project.id, langCode: lang.code,
    //     prompt: GEMINI_PROMPT_TEMPLATE(project, lang), agentId: DEMO_AGENT.id }),
    // });
    // const json = await res.json();
    // return { language: lang, projectName: project.name, ...json } as LocalizedContent;

    // ── Mock: 1.6 s simulated latency ───────────────────────────────────────
    await new Promise(r => setTimeout(r, 1600));

    const factory = TRANSLATIONS[lang.code];
    return factory ? factory(project, DEMO_AGENT) : genericTranslation(lang, project);
}

// ═══════════════════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════════════════

function clsx(...c: (string | false | null | undefined)[]) {
    return c.filter(Boolean).join(' ');
}

// ── Custom select ─────────────────────────────────────────────────────────

interface SelectProps<T extends string> {
    id: string;
    label: string;
    value: T | '';
    onChange: (v: T) => void;
    options: { value: T; label: string; prefix?: string }[];
    placeholder?: string;
    disabled?: boolean;
    icon?: React.ReactNode;
}

function Select<T extends string>({ id, label, value, onChange, options, placeholder, disabled, icon }: SelectProps<T>) {
    return (
        <div>
            <label htmlFor={id} className="block text-[10px] font-bold uppercase tracking-widest text-psi-muted mb-1.5">
                {label}
            </label>
            <div className="relative">
                {icon && (
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-psi-muted pointer-events-none">
                        {icon}
                    </span>
                )}
                <select
                    id={id}
                    value={value}
                    onChange={e => onChange(e.target.value as T)}
                    disabled={disabled}
                    className={clsx(
                        'psi-input w-full py-3 pr-10 rounded-xl appearance-none text-sm font-medium',
                        'focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 outline-none transition-all',
                        icon ? 'pl-10' : 'pl-4',
                        disabled && 'opacity-50 cursor-not-allowed',
                    )}
                >
                    {placeholder && <option value="">{placeholder}</option>}
                    {options.map(o => (
                        <option key={o.value} value={o.value}>
                            {o.prefix ? `${o.prefix} ` : ''}{o.label}
                        </option>
                    ))}
                </select>
                <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-psi-muted pointer-events-none" />
            </div>
        </div>
    );
}

// ── Generating animation ──────────────────────────────────────────────────

function GeneratingView({ language }: { language: SupportedLanguage }) {
    const steps = [
        'Reading property data from CRM…',
        `Translating to ${language.label}…`,
        'Applying cultural tone adjustments…',
        'Composing agent introduction…',
        'Rendering localized brochure…',
    ];
    const [step, setStep] = useState(0);

    useEffect(() => {
        const t = setInterval(() => setStep(s => Math.min(s + 1, steps.length - 1)), 360);
        return () => clearInterval(t);
    }, []);

    return (
        <div className="flex flex-col items-center justify-center py-20 gap-6">
            {/* Orbiting rings */}
            <div className="relative w-20 h-20 flex items-center justify-center">
                <motion.div
                    className="absolute inset-0 rounded-full border-[3px] border-t-amber-400 border-r-amber-400/40 border-b-transparent border-l-transparent"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
                />
                <motion.div
                    className="absolute inset-2 rounded-full border-2 border-b-violet-400/60 border-l-violet-400/40 border-t-transparent border-r-transparent"
                    animate={{ rotate: -360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                />
                <span className="text-2xl relative z-10">{language.flag}</span>
            </div>

            <div className="text-center">
                <p className="text-psi-primary font-extrabold text-lg mb-1">
                    Gemini is translating…
                </p>
                <AnimatePresence mode="wait">
                    <motion.p
                        key={step}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        className="text-psi-muted text-sm"
                    >
                        {steps[step]}
                    </motion.p>
                </AnimatePresence>
            </div>

            <div className="flex gap-1.5">
                {steps.map((_, i) => (
                    <div
                        key={i}
                        className={clsx(
                            'h-1 rounded-full transition-all duration-300',
                            i <= step ? 'bg-amber-500 w-6' : 'bg-psi-subtle w-3',
                        )}
                    />
                ))}
            </div>
        </div>
    );
}

// ── Localized Brochure Preview ────────────────────────────────────────────

function PitchPreview({
    content,
    project,
    clientEmail,
    onBack,
    onRegenerate,
}: {
    content: LocalizedContent;
    project: CRMProject;
    clientEmail: string;
    onBack: () => void;
    onRegenerate: () => void;
}) {
    const isRTL = content.language.rtl;
    const [copied, setCopied] = useState(false);
    const previewRef = useRef<HTMLDivElement>(null);

    const shareText = [
        content.tagline,
        '',
        content.description,
        '',
        content.highlights.join('\n'),
        '',
        content.agentBio,
        '',
        `📍 ${project.location} `,
        `💰 ${project.priceRange} `,
        '',
        content.closingNote,
        '',
        `📞 ${DEMO_AGENT.phone} `,
        `✉️ ${DEMO_AGENT.email} `,
    ].join('\n');

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

    const mailtoUrl = `mailto:${clientEmail}?subject=${encodeURIComponent(content.tagline)}&body=${encodeURIComponent(shareText)}`;

    const handleCopy = async () => {
        await navigator.clipboard.writeText(shareText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const TIER_ACCENT = {
        Luxury: 'from-amber-500/20 to-amber-600/5 border-amber-500/30 text-amber-500',
        Medium: 'from-blue-500/20  to-blue-600/5  border-blue-500/30  text-blue-500',
        Average: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/30 text-emerald-500',
    }[project.tier];

    return (
        <div className="space-y-4">
            {/* Action bar */}
            <div className="flex items-center gap-3 flex-wrap">
                <button
                    id="pitch-back-btn"
                    onClick={onBack}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-psi-subtle border border-psi text-psi-secondary text-sm font-bold hover:text-psi-primary transition-all"
                >
                    <ArrowLeft size={14} /> Edit
                </button>
                <button
                    id="pitch-regenerate-btn"
                    onClick={onRegenerate}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-psi-subtle border border-psi text-psi-secondary text-sm font-bold hover:text-psi-primary transition-all"
                >
                    <RefreshCw size={14} /> Regenerate
                </button>

                <div className="ml-auto flex items-center gap-2.5">
                    <button
                        id="pitch-copy-btn"
                        onClick={handleCopy}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-psi-subtle border border-psi text-psi-secondary text-sm font-bold hover:text-psi-primary transition-all"
                    >
                        {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                        {copied ? 'Copied!' : 'Copy'}
                    </button>
                    <a
                        id="pitch-email-btn"
                        href={mailtoUrl}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-slate-900 dark:text-white text-sm font-bold transition-all shadow-lg shadow-blue-600/20"
                    >
                        <Mail size={14} /> Email
                    </a>
                    <a
                        id="pitch-whatsapp-btn"
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-900 dark:text-white text-sm font-bold transition-all shadow-lg shadow-emerald-600/20"
                    >
                        <MessageCircle size={14} /> WhatsApp
                    </a>
                </div>
            </div>

            {/* Brochure preview card */}
            <motion.div
                ref={previewRef}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                dir={isRTL ? 'rtl' : 'ltr'}
                className={clsx(
                    'rounded-3xl border overflow-hidden',
                    'bg-gradient-to-br from-white dark:from-slate-900 via-white dark:via-slate-900 to-slate-50 dark:to-slate-950',
                    'border-black/10 dark:border-white/10 text-slate-900 dark:text-white shadow-2xl',
                )}
            >
                {/* Hero image */}
                {project.imageUrl && (
                    <div className="relative h-52 overflow-hidden">
                        <img
                            src={project.imageUrl}
                            alt={project.name}
                            className="w-full h-full object-cover"
                            style={{ filter: 'brightness(0.65)' }}
                        />
                        {/* Gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-slate-900 via-white dark:via-slate-900/30 to-transparent" />

                        {/* Language badge */}
                        <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/40 backdrop-blur-sm border border-black/20 dark:border-white/20 rounded-xl px-3 py-1.5">
                            <span className="text-lg">{content.language.flag}</span>
                            <span className="text-slate-900 dark:text-white text-xs font-bold">{content.language.nativeLabel}</span>
                            {isRTL && (
                                <span className="text-slate-900 dark:text-white/50 text-[9px] font-bold uppercase tracking-widest border border-black/20 dark:border-white/20 rounded px-1">RTL</span>
                            )}
                        </div>

                        {/* Tier badge */}
                        <div className={`absolute top-4 right-4 px-3 py-1.5 rounded-xl text-xs font-bold border bg-gradient-to-r ${TIER_ACCENT}`}>
                            {project.tier}
                        </div>

                        {/* Property name overlay */}
                        <div className="absolute bottom-4 left-5 right-5">
                            <p className="text-slate-900 dark:text-white/60 text-[10px] font-bold uppercase tracking-widest mb-0.5">
                                {project.developer_name}
                            </p>
                            <h2 className="text-slate-900 dark:text-white text-2xl font-extrabold leading-tight">{content.projectName}</h2>
                        </div>
                    </div>
                )}

                {/* Body */}
                <div className="p-6 space-y-6">

                    {/* Tagline */}
                    <p className={clsx(
                        'text-lg font-extrabold leading-snug',
                        'bg-gradient-to-r from-amber-400 to-yellow-400 bg-clip-text text-transparent',
                        isRTL && 'text-right',
                    )}>
                        {content.tagline}
                    </p>

                    {/* Quick specs */}
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { icon: <MapPin size={13} />, label: content.locationLabel, value: project.location ?? '—' },
                            { icon: <DollarSign size={13} />, label: content.priceLabel, value: project.priceRange ?? fmtAED(project.expected_avg_deal) },
                            { icon: <Bed size={13} />, label: content.bedroomsLabel, value: project.bedrooms ?? '—' },
                        ].map(({ icon, label, value }) => (
                            <div key={label} className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-2xl p-3 text-center">
                                <div className="flex items-center justify-center text-amber-400 mb-1">{icon}</div>
                                <p className="text-[9px] text-slate-900 dark:text-white/40 font-bold uppercase tracking-widest mb-0.5">{label}</p>
                                <p className="text-slate-900 dark:text-white text-xs font-extrabold leading-tight">{value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Description */}
                    <div className={clsx('text-slate-900 dark:text-white/70 text-sm leading-relaxed', isRTL && 'text-right')}>
                        {content.description}
                    </div>

                    {/* Highlights */}
                    <div className="space-y-2">
                        {content.highlights.map((h, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: isRTL ? 10 : -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.05 * i }}
                                className={clsx(
                                    'flex items-start gap-2.5 py-2 px-3 rounded-xl bg-white/[0.04] border border-white/[0.06]',
                                    isRTL && 'flex-row-reverse text-right',
                                )}
                            >
                                <span className="text-amber-400 flex-shrink-0 mt-0.5">
                                    <Star size={11} fill="currentColor" />
                                </span>
                                <span className="text-slate-900 dark:text-white/80 text-sm">{h.replace(/^[◆✦•◈▸] /, '')}</span>
                            </motion.div>
                        ))}
                    </div>

                    {/* Divider */}
                    <div className="border-t border-black/10 dark:border-white/10" />

                    {/* Agent bio */}
                    <div className={clsx('flex items-start gap-4', isRTL && 'flex-row-reverse')}>
                        <img
                            src={DEMO_AGENT.avatar}
                            alt={DEMO_AGENT.name}
                            className="w-14 h-14 rounded-2xl object-cover border border-black/20 dark:border-white/20 flex-shrink-0 bg-slate-200 dark:bg-slate-700"
                        />
                        <div className={clsx('flex-1 min-w-0', isRTL && 'text-right')}>
                            <p className="text-slate-900 dark:text-white font-extrabold text-sm">{DEMO_AGENT.name}</p>
                            <p className="text-amber-400 text-[10px] font-bold uppercase tracking-widest mb-2">{DEMO_AGENT.branch}</p>
                            <p className="text-slate-900 dark:text-white/60 text-xs leading-relaxed">{content.agentBio}</p>
                        </div>
                    </div>

                    {/* Closing / CTA */}
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-center space-y-3">
                        <p className={clsx('text-slate-900 dark:text-white/70 text-xs leading-relaxed', isRTL && 'text-right')}>
                            {content.closingNote}
                        </p>
                        <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 dark:text-white font-extrabold text-sm shadow-lg shadow-amber-500/25">
                            <Send size={13} />
                            {content.ctaButtonText}
                        </div>
                        <div className="flex items-center justify-center gap-4 text-xs text-slate-900 dark:text-white/40 flex-wrap">
                            <span>📞 {DEMO_AGENT.phone}</span>
                            <span>✉️ {DEMO_AGENT.email}</span>
                        </div>
                    </div>

                    {/* AI badge footer */}
                    <div className="flex items-center justify-center gap-2 text-slate-900 dark:text-white/20 text-[10px]">
                        <Sparkles size={10} />
                        <span>Translated by Gemini AI · PSI Event Portal</span>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// Pitch Form
// ═══════════════════════════════════════════════════════════════════════════

interface PitchFormProps {
    projects: CRMProject[];
    onGenerate: (project: CRMProject, lang: SupportedLanguage, email: string) => void;
}

function PitchForm({ projects, onGenerate }: PitchFormProps) {
    const [projectId, setProjectId] = useState<string>('');
    const [langCode, setLangCode] = useState<string>('');
    const [clientEmail, setEmail] = useState('');
    const [error, setError] = useState('');

    const selectedProject = projects.find(p => p.id === projectId) ?? null;
    const selectedLang = LANGUAGES.find(l => l.code === langCode) ?? null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProject) { setError('Please select a property.'); return; }
        if (!selectedLang) { setError('Please select a target language.'); return; }
        if (!clientEmail.trim() || !clientEmail.includes('@')) { setError('Please enter a valid client email.'); return; }
        setError('');
        onGenerate(selectedProject, selectedLang, clientEmail.trim());
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-5">

            {/* Property selector */}
            <Select
                id="pitch-property"
                label="Property"
                value={projectId}
                onChange={setProjectId}
                placeholder="— Select a property —"
                icon={<Building2 size={14} />}
                options={projects.map(p => ({
                    value: p.id,
                    label: `${p.name} · ${p.developer_name ?? ''}`,
                    prefix: p.tier === 'Luxury' ? '👑' : p.tier === 'Medium' ? '⭐' : '🏠',
                }))}
            />

            {/* Selected property preview */}
            <AnimatePresence>
                {selectedProject && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="flex gap-3 p-3.5 rounded-2xl bg-amber-500/8 border border-amber-500/20 items-center">
                            {selectedProject.imageUrl && (
                                <img src={selectedProject.imageUrl} alt="" className="w-14 h-12 rounded-xl object-cover flex-shrink-0" />
                            )}
                            <div className="min-w-0">
                                <p className="text-psi-primary font-bold text-sm truncate">{selectedProject.name}</p>
                                <p className="text-psi-muted text-xs">{selectedProject.location} · {selectedProject.priceRange}</p>
                            </div>
                            <div className="ml-auto text-right flex-shrink-0">
                                <p className="text-amber-600 dark:text-amber-400 text-xs font-black">{fmtAED(selectedProject.expected_avg_deal)}</p>
                                <p className="text-psi-muted text-[10px]">avg deal</p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Language selector */}
            <Select
                id="pitch-language"
                label="Target Language"
                value={langCode}
                onChange={setLangCode}
                placeholder="— Select language —"
                icon={<Globe size={14} />}
                options={LANGUAGES.map(l => ({
                    value: l.code,
                    label: `${l.label} — ${l.nativeLabel}`,
                    prefix: l.flag,
                }))}
            />

            {/* Language RTL notice */}
            <AnimatePresence>
                {selectedLang?.rtl && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="flex items-center gap-2 px-3 py-2 bg-violet-500/10 border border-violet-500/20 rounded-xl">
                            <Globe size={12} className="text-violet-500" />
                            <p className="text-violet-600 dark:text-violet-400 text-xs font-semibold">
                                Right-to-left layout will be applied for {selectedLang.label} brochure
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Client email */}
            <div>
                <label htmlFor="pitch-client-email" className="block text-[10px] font-bold uppercase tracking-widest text-psi-muted mb-1.5">
                    Client Email
                </label>
                <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-psi-muted">
                        <Mail size={14} />
                    </span>
                    <input
                        id="pitch-client-email"
                        type="email"
                        value={clientEmail}
                        onChange={e => { setEmail(e.target.value); setError(''); }}
                        placeholder="client@email.com"
                        className="psi-input w-full py-3 pl-10 pr-4 rounded-xl text-sm focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 outline-none transition-all"
                    />
                </div>
            </div>

            {/* AI info strip */}
            <div className="flex items-start gap-2.5 bg-psi-subtle border border-psi rounded-2xl px-4 py-3">
                <Sparkles size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-psi-secondary text-xs leading-relaxed">
                    Gemini AI will translate the property description, key highlights, and your agent bio into the selected language — culturally adapted for your target market.
                </p>
            </div>

            {/* Error */}
            {error && (
                <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-1.5 text-xs text-rose-500 font-semibold"
                >
                    <AlertCircle size={12} /> {error}
                </motion.p>
            )}

            {/* Submit */}
            <motion.button
                id="generate-pitch-btn"
                type="submit"
                whileTap={{ scale: 0.97 }}
                className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-orange-400 text-slate-900 dark:text-white font-extrabold text-base shadow-xl shadow-amber-500/25 hover:shadow-amber-500/40 transition-all"
            >
                <Sparkles size={18} />
                Generate Localized Pitch
            </motion.button>
        </form>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// Root export: LocalizedPitch
// ═══════════════════════════════════════════════════════════════════════════

export default function LocalizedPitch() {
    const [projects, setProjects] = useState<CRMProject[]>(DEMO_PROJECTS);
    const [step, setStep] = useState<WizardStep>('form');
    const [selectedProject, setProject] = useState<CRMProject | null>(null);
    const [selectedLang, setLang] = useState<SupportedLanguage | null>(null);
    const [clientEmail, setEmail] = useState('');
    const [content, setContent] = useState<LocalizedContent | null>(null);
    const [genError, setGenError] = useState('');

    useEffect(() => { fetchCRMProjects().then(setProjects); }, []);

    const handleGenerate = async (project: CRMProject, lang: SupportedLanguage, email: string) => {
        setProject(project);
        setLang(lang);
        setEmail(email);
        setGenError('');
        setStep('generating');
        try {
            const result = await generateLocalizedPitch(project, lang);
            setContent(result);
            setStep('preview');
        } catch (err) {
            console.error('[LocalizedPitch] generation failed:', err);
            setGenError('Translation failed. Please retry.');
            setStep('form');
        }
    };

    const handleRegenerate = () => {
        if (selectedProject && selectedLang) {
            handleGenerate(selectedProject, selectedLang, clientEmail);
        }
    };

    return (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">

            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center flex-shrink-0">
                        <Globe size={18} className="text-amber-500" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black tracking-[0.2em] uppercase text-amber-500">
                            Powered by Gemini AI
                        </p>
                        <h1 className="text-xl font-extrabold text-psi-primary leading-tight">
                            Multi-Lingual Pitch Generator
                        </h1>
                    </div>
                    {step === 'preview' && selectedLang && (
                        <div className="ml-auto flex items-center gap-2 bg-psi-subtle border border-psi rounded-xl px-3 py-1.5">
                            <Eye size={12} className="text-psi-muted" />
                            <span className="text-psi-secondary text-xs font-bold">Preview</span>
                            <span className="text-base">{selectedLang.flag}</span>
                        </div>
                    )}
                </div>
                <p className="text-psi-muted text-sm leading-relaxed">
                    Select a property, choose the client's language, and let Gemini generate a culturally-adapted, localized pitch ready to share via WhatsApp or Email.
                </p>

                {/* Language flag strip */}
                {step === 'form' && (
                    <div className="flex gap-1.5 mt-4 flex-wrap">
                        {LANGUAGES.map(l => (
                            <span key={l.code} title={l.label} className="text-xl cursor-default select-none opacity-70 hover:opacity-100 transition-opacity">
                                {l.flag}
                            </span>
                        ))}
                    </div>
                )}
            </motion.div>

            {/* Step indicator */}
            {step !== 'preview' && (
                <div className="flex items-center gap-2 mb-6">
                    {(['form', 'generating', 'preview'] as WizardStep[]).map((s, i) => (
                        <React.Fragment key={s}>
                            <div className={clsx(
                                'flex items-center gap-1.5 text-xs font-bold transition-all',
                                step === s ? 'text-amber-500' : i < ['form', 'generating', 'preview'].indexOf(step) ? 'text-emerald-500' : 'text-psi-muted',
                            )}>
                                <div className={clsx(
                                    'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black border',
                                    step === s ? 'bg-amber-500 border-amber-500 text-slate-900 dark:text-white' :
                                        i < ['form', 'generating', 'preview'].indexOf(step) ? 'bg-emerald-500 border-emerald-500 text-slate-900 dark:text-white' :
                                            'border-psi text-psi-muted',
                                )}>
                                    {i < ['form', 'generating', 'preview'].indexOf(step) ? <Check size={10} /> : i + 1}
                                </div>
                                <span className="hidden sm:block capitalize">{s === 'generating' ? 'Generating' : s === 'form' ? 'Configure' : 'Preview'}</span>
                            </div>
                            {i < 2 && <div className="flex-1 h-px bg-psi-subtle" />}
                        </React.Fragment>
                    ))}
                </div>
            )}

            {/* Content area */}
            <div className="psi-card rounded-3xl p-6">
                <AnimatePresence mode="wait">
                    {step === 'form' && (
                        <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            {genError && (
                                <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                                    <AlertCircle size={13} className="text-rose-500" />
                                    <p className="text-rose-600 dark:text-rose-400 text-xs font-semibold">{genError}</p>
                                </div>
                            )}
                            <PitchForm projects={projects} onGenerate={handleGenerate} />
                        </motion.div>
                    )}
                    {step === 'generating' && selectedLang && (
                        <motion.div key="generating" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <GeneratingView language={selectedLang} />
                        </motion.div>
                    )}
                    {step === 'preview' && content && selectedProject && (
                        <motion.div key="preview" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
                            <PitchPreview
                                content={content}
                                project={selectedProject}
                                clientEmail={clientEmail}
                                onBack={() => setStep('form')}
                                onRegenerate={handleRegenerate}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
