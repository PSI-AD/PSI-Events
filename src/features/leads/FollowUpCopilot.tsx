/**
 * FollowUpCopilot.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * SMART FOLLOW-UP COPILOT — Post-Event Agent Workflow
 *
 * Three-panel mobile-first interface:
 *   1. Lead Inbox     — All leads captured by the logged-in agent (crm_leads)
 *   2. Draft Editor   — AI-generated personalised message, editable textarea
 *   3. Send Action    — "Send via WhatsApp" deep-link + optional copy/email
 *
 * Firestore (read-only for this component):
 *   crm_leads — filtered by agentId == currentAgentId
 *
 * AI mock (mockGeminiDraft):
 *   Builds a rich Gemini prompt from lead.projectInterest + agentName
 *   + company/jobTitle context. Returns a ready-to-send personalised message.
 *   Replace body with a Cloud Function call for production.
 *
 * WhatsApp deep-link:
 *   https://wa.me/{phone}?text={encodeURIComponent(message)}
 *   Opens the native WhatsApp app with the message pre-filled.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    MessageCircle, Sparkles, Send, Copy, ChevronRight,
    User, Phone, Mail, Building2, Briefcase, Tag,
    Loader2, CheckCircle2, Clock, X, Edit3, RefreshCcw,
    Search, Filter, ArrowLeft, ExternalLink, Zap,
    AlertCircle, Star,
} from 'lucide-react';
import {
    collection, getDocs, onSnapshot, orderBy, query,
    where, Unsubscribe, limit,
} from 'firebase/firestore';
import { db } from '../../services/firebase/firebaseConfig';

// ═══════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════

export interface CRMLead {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    company: string;
    jobTitle: string;
    projectInterest: string;
    source?: string;
    eventId?: string;
    agentId?: string;
    agentName?: string;
    scannedAt?: string;
    followUpSent?: boolean;
    followUpAt?: string;
}

type DraftPhase = 'idle' | 'generating' | 'ready' | 'sent';

// ═══════════════════════════════════════════════════════════════════
// Demo seed data (shown when Firestore is empty / agentId mismatch)
// ═══════════════════════════════════════════════════════════════════

const DEMO_LEADS: CRMLead[] = [
    {
        id: 'd1', firstName: 'Alexander', lastName: 'Rubin',
        email: 'a.rubin@novacapital.ae', phone: '+971508924411',
        company: 'Nova Capital Group', jobTitle: 'Chief Investment Officer',
        projectInterest: 'Mamsha Al Saadiyat', source: 'CardScan', agentId: 'agent_demo_001',
        scannedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    },
    {
        id: 'd2', firstName: 'Li', lastName: 'Wei',
        email: 'li.wei@sunriseinvest.hk', phone: '+85291234567',
        company: 'Sunrise Investment HK', jobTitle: 'Managing Director',
        projectInterest: 'Marina Blue', source: 'CardScan', agentId: 'agent_demo_001',
        scannedAt: new Date(Date.now() - 5 * 3600000).toISOString(),
    },
    {
        id: 'd3', firstName: 'Priya', lastName: 'Sharma',
        email: 'priya.sharma@infosys.com', phone: '+919876543210',
        company: 'Infosys Capital', jobTitle: 'VP Finance',
        projectInterest: 'Noya on Yas Island', source: 'CardScan', agentId: 'agent_demo_001',
        scannedAt: new Date(Date.now() - 7 * 3600000).toISOString(), followUpSent: true,
    },
    {
        id: 'd4', firstName: 'Carlos', lastName: 'Herrera',
        email: 'c.herrera@latamgroup.mx', phone: '+525512345678',
        company: 'LATAM Group', jobTitle: 'Family Office Director',
        projectInterest: 'Saadiyat Lagoons', source: 'VIPIntercept', agentId: 'agent_demo_001',
        scannedAt: new Date(Date.now() - 9 * 3600000).toISOString(),
    },
    {
        id: 'd5', firstName: 'Fatima', lastName: 'Al-Zahrawi',
        email: 'f.alzahrawi@gulfwealth.ae', phone: '+97150987654',
        company: 'Gulf Wealth Management', jobTitle: 'Senior Partner',
        projectInterest: 'Reem Hills', source: 'Manual', agentId: 'agent_demo_001',
        scannedAt: new Date(Date.now() - 11 * 3600000).toISOString(),
    },
    {
        id: 'd6', firstName: 'Dmitri', lastName: 'Volkov',
        email: 'd.volkov@mosrealty.ru', phone: '+79851234567',
        company: 'Moscow Realty Partners', jobTitle: 'CEO',
        projectInterest: 'Mamsha Al Saadiyat', source: 'VIPIntercept', agentId: 'agent_demo_001',
        scannedAt: new Date(Date.now() - 14 * 3600000).toISOString(),
    },
];

// ═══════════════════════════════════════════════════════════════════
// Project property details (used to enrich AI draft)
// ═══════════════════════════════════════════════════════════════════

const PROJECT_DETAILS: Record<string, { usp: string; startingPrice: string; handover: string; highlight: string }> = {
    'Mamsha Al Saadiyat': {
        usp: 'beachfront living on Saadiyat Island, steps from the Louvre Abu Dhabi',
        startingPrice: 'AED 3.2M',
        handover: 'Q4 2027',
        highlight: 'only 18 units remaining in Phase 2',
    },
    'Marina Blue': {
        usp: 'iconic waterfront residences with panoramic marina and sea views',
        startingPrice: 'AED 1.1M',
        handover: 'Q2 2026',
        highlight: '8% net ROI guaranteed for 3 years',
    },
    'Noya on Yas Island': {
        usp: 'eco-friendly community adjacent to three Yas Island theme parks',
        startingPrice: 'AED 950K',
        handover: 'Q3 2026',
        highlight: '10% down payment, 1% monthly post-handover plan',
    },
    'Saadiyat Lagoons': {
        usp: 'nature reserve community with private lagoon access',
        startingPrice: 'AED 2.8M',
        handover: 'Q1 2028',
        highlight: 'no service charge for the first 3 years',
    },
    'Reem Hills': {
        usp: 'lush hillside retreat on Al Reem Island with crystal lagoon',
        startingPrice: 'AED 1.6M',
        handover: 'Q2 2027',
        highlight: 'limited villa plots available',
    },
    'Maryah Plaza': {
        usp: 'mixed-use commercial & residential tower in Abu Dhabi\'s financial district',
        startingPrice: 'AED 1.3M',
        handover: 'Q4 2026',
        highlight: 'prime Grade-A office and retail podium',
    },
    'The Grove': {
        usp: 'green-canopy community with a 2km residents\' park spine',
        startingPrice: 'AED 1.9M',
        handover: 'Q3 2027',
        highlight: 'fully landscaped and car-free promenade',
    },
};

function getProjectDetail(name: string) {
    return PROJECT_DETAILS[name] ?? {
        usp: 'premium UAE real estate',
        startingPrice: 'AED 1.2M',
        handover: '2026–2028',
        highlight: 'exclusive event-day pricing available',
    };
}

// ═══════════════════════════════════════════════════════════════════
// AI mock — Gemini Follow-Up Draft Generator
// ═══════════════════════════════════════════════════════════════════

async function mockGeminiDraft(lead: CRMLead, agentName: string): Promise<string> {
    const proj = getProjectDetail(lead.projectInterest);

    const prompt = `
You are a luxury real estate sales assistant at PSI Properties.
Draft a warm, professional, and highly personalised WhatsApp follow-up message.

LEAD PROFILE:
  Name:           ${lead.firstName} ${lead.lastName}
  Title & Company: ${lead.jobTitle} at ${lead.company}
  Project Interest: ${lead.projectInterest}
  Source:          ${lead.source ?? 'Expo floor capture'}

PROPERTY DETAILS for ${lead.projectInterest}:
  USP:             ${proj.usp}
  Starting Price:  ${proj.startingPrice}
  Handover:        ${proj.handover}
  Hot Bullet:      ${proj.highlight}

AGENT: ${agentName}

INSTRUCTIONS:
- Open with a warm, personalised greeting referencing meeting at the expo today.
- Reference ${lead.firstName}'s role at ${lead.company} naturally — don't be sycophantic.
- Mention 1–2 specific property highlights that fit a ${lead.jobTitle} profile.
- Include one concrete call-to-action: schedule a private viewing or call.
- Sign off with ${agentName}'s name and a PSI Properties credit.
- Keep it under 160 words. Conversational but polished.
- No emojis except a single ✨ or 🏠 if fitting. No bullet points.
`.trim();

    console.info('[FollowUpCopilot] Gemini prompt:\n', prompt);
    await new Promise(r => setTimeout(r, 1800));

    const proj2 = getProjectDetail(lead.projectInterest);
    return `Hi ${lead.firstName},

It was a pleasure meeting you at the expo today. As ${lead.jobTitle} at ${lead.company}, I thought ${lead.projectInterest} would resonate with you — ${proj2.usp}.

Starting from ${proj2.startingPrice} with handover by ${proj2.handover}, and ${proj2.highlight}, this is one of our strongest propositions right now.

I'd love to arrange a private briefing at a time that suits you — either a virtual walkthrough or a dedicated in-person presentation with our project team.

Would you be free for a 20-minute call this week?

Warm regards,
${agentName}
PSI Properties ✨`.trim();
}

// ═══════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════

function timeAgo(iso?: string) {
    if (!iso) return '—';
    const s = (Date.now() - new Date(iso).getTime()) / 1000;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
}

function waLink(phone: string, message: string) {
    const clean = phone.replace(/\D/g, '');
    return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}

function SourceBadge({ source }: { source?: string }) {
    const map: Record<string, { label: string; color: string }> = {
        CardScan: { label: 'Card Scan', color: 'bg-amber-500/15 text-amber-500' },
        VIPIntercept: { label: 'VIP', color: 'bg-violet-500/15 text-violet-400' },
        Manual: { label: 'Manual', color: 'bg-slate-500/15 text-slate-400' },
    };
    const s = map[source ?? ''] ?? { label: source ?? 'Lead', color: 'bg-slate-500/15 text-slate-400' };
    return (
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${s.color}`}>
            {s.label}
        </span>
    );
}

// ═══════════════════════════════════════════════════════════════════
// Lead Row
// ═══════════════════════════════════════════════════════════════════

function LeadRow({ lead, selected, onSelect }: {
    lead: CRMLead;
    selected: boolean;
    onSelect: () => void;
}) {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            onClick={onSelect}
            id={`lead-row-${lead.id}`}
            className={`cursor-pointer rounded-2xl p-3.5 border transition-all ${selected
                    ? 'bg-emerald-500/8 border-emerald-500/30 ring-1 ring-emerald-500/20'
                    : 'bg-white/3 border-white/8 hover:border-white/15 hover:bg-white/5'
                }`}
        >
            <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center text-white font-black text-sm flex-shrink-0">
                    {lead.firstName.charAt(0)}{lead.lastName.charAt(0)}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white font-extrabold text-sm truncate">
                            {lead.firstName} {lead.lastName}
                        </span>
                        {lead.followUpSent && (
                            <CheckCircle2 size={12} className="text-emerald-400 flex-shrink-0" />
                        )}
                    </div>
                    <p className="text-white/40 text-[10px] truncate">{lead.jobTitle} · {lead.company}</p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <Tag size={9} className="text-emerald-500/70" />
                        <span className="text-emerald-400 text-[10px] font-bold truncate">{lead.projectInterest}</span>
                        <span className="text-white/15">·</span>
                        <SourceBadge source={lead.source} />
                        <span className="text-white/15">·</span>
                        <Clock size={9} className="text-white/20" />
                        <span className="text-white/25 text-[9px]">{timeAgo(lead.scannedAt)}</span>
                    </div>
                </div>

                <ChevronRight size={14} className={`flex-shrink-0 transition-colors ${selected ? 'text-emerald-400' : 'text-white/20'}`} />
            </div>
        </motion.div>
    );
}

// ═══════════════════════════════════════════════════════════════════
// Draft Panel
// ═══════════════════════════════════════════════════════════════════

function DraftPanel({ lead, agentName, onBack }: {
    lead: CRMLead;
    agentName: string;
    onBack: () => void;
}) {
    const [phase, setPhase] = useState<DraftPhase>('idle');
    const [draft, setDraft] = useState('');
    const [copied, setCopied] = useState(false);
    const [charCount, setCharCount] = useState(0);

    const handleDraftChange = (v: string) => {
        setDraft(v);
        setCharCount(v.length);
    };

    const generate = useCallback(async () => {
        setPhase('generating');
        try {
            const text = await mockGeminiDraft(lead, agentName);
            setDraft(text);
            setCharCount(text.length);
            setPhase('ready');
        } catch {
            setPhase('idle');
        }
    }, [lead, agentName]);

    // Auto-generate on mount
    useEffect(() => { generate(); }, [generate]);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(draft).catch(() => { });
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const proj = getProjectDetail(lead.projectInterest);

    return (
        <div className="flex flex-col h-full">

            {/* Header */}
            <div className="px-5 py-4 border-b border-white/8 flex items-center gap-3">
                <button id="draft-back-btn" onClick={onBack}
                    className="w-8 h-8 rounded-xl bg-white/6 border border-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all flex-shrink-0 md:hidden">
                    <ArrowLeft size={14} />
                </button>

                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center text-white font-black text-sm flex-shrink-0">
                    {lead.firstName.charAt(0)}{lead.lastName.charAt(0)}
                </div>

                <div className="flex-1 min-w-0">
                    <p className="text-white font-extrabold text-sm leading-none truncate">
                        {lead.firstName} {lead.lastName}
                    </p>
                    <p className="text-white/40 text-[10px] truncate mt-0.5">
                        {lead.jobTitle} · {lead.company}
                    </p>
                </div>

                <button id="draft-regenerate-btn" onClick={generate} disabled={phase === 'generating'}
                    title="Regenerate draft"
                    className="w-8 h-8 rounded-xl bg-white/6 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30">
                    <RefreshCcw size={13} className={phase === 'generating' ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* Context strip */}
            <div className="px-5 py-3 border-b border-white/6 flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5">
                    <Tag size={11} className="text-emerald-400" />
                    <span className="text-emerald-400 text-[10px] font-extrabold">{lead.projectInterest}</span>
                </div>
                <span className="text-white/15 text-xs">·</span>
                <span className="text-white/30 text-[10px]">from {proj.startingPrice}</span>
                <span className="text-white/15 text-xs">·</span>
                <span className="text-amber-400/70 text-[10px] font-bold">{proj.highlight}</span>
            </div>

            {/* Draft area */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">

                {/* AI header */}
                <div className="flex items-center gap-2">
                    <Sparkles size={13} className="text-emerald-400" />
                    <span className="text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                        Gemini AI Draft
                    </span>
                    {phase === 'generating' && (
                        <div className="flex gap-1 ml-1">
                            {[0, 0.15, 0.3].map((d, i) => (
                                <motion.div key={i}
                                    className="w-1 h-1 rounded-full bg-emerald-400"
                                    animate={{ opacity: [0.3, 1, 0.3] }}
                                    transition={{ duration: 0.8, repeat: Infinity, delay: d }}
                                />
                            ))}
                        </div>
                    )}
                </div>

                <AnimatePresence mode="wait">
                    {phase === 'generating' ? (
                        <motion.div key="generating" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="flex flex-col items-center justify-center py-16 gap-4">
                            <div className="relative w-14 h-14">
                                <motion.div className="absolute inset-0 rounded-full border-[2px] border-t-emerald-500 border-r-emerald-500/30 border-b-transparent border-l-transparent"
                                    animate={{ rotate: 360 }} transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }} />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Sparkles size={18} className="text-emerald-400" />
                                </div>
                            </div>
                            <div className="text-center">
                                <p className="text-white font-bold text-sm">Crafting your message…</p>
                                <p className="text-white/30 text-xs mt-1">Personalising for {lead.firstName}'s profile</p>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div key="editor" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                            {/* Editable draft */}
                            <div className="relative">
                                <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
                                    <Edit3 size={11} className="text-white/20" />
                                    <span className="text-white/20 text-[9px]">editable</span>
                                </div>
                                <textarea
                                    id="draft-textarea"
                                    value={draft}
                                    onChange={e => handleDraftChange(e.target.value)}
                                    rows={12}
                                    className="w-full bg-white/4 border border-white/10 rounded-2xl px-4 py-4 text-white/85 text-sm leading-relaxed resize-none focus:outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 font-[inherit] transition-all pr-20"
                                    placeholder="AI draft will appear here…"
                                />
                                <div className="flex items-center justify-between px-1 mt-1">
                                    <span className="text-white/20 text-[10px]">{charCount} chars</span>
                                    {charCount > 900 && (
                                        <span className="text-amber-400 text-[10px] flex items-center gap-1">
                                            <AlertCircle size={9} /> Long for WhatsApp
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Contact meta */}
                            <div className="mt-3 flex flex-wrap gap-2">
                                {[
                                    { icon: <Phone size={10} />, label: lead.phone },
                                    { icon: <Mail size={10} />, label: lead.email },
                                ].map(({ icon, label }) => (
                                    <div key={label} className="flex items-center gap-1.5 text-[10px] text-white/30">
                                        {icon}<span className="font-mono">{label}</span>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Action bar */}
            {phase === 'ready' && draft && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                    className="px-5 py-4 border-t border-white/8 space-y-2">

                    {/* Primary CTA — WhatsApp */}
                    <a
                        id="send-whatsapp-btn"
                        href={waLink(lead.phone, draft)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl bg-[#25D366] hover:bg-[#20c05a] text-white font-extrabold text-base shadow-xl shadow-[#25D366]/20 transition-all active:scale-[0.98]"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                        </svg>
                        Send via WhatsApp
                        <ExternalLink size={13} className="opacity-70" />
                    </a>

                    {/* Secondary actions */}
                    <div className="grid grid-cols-2 gap-2">
                        <button id="copy-draft-btn" onClick={handleCopy}
                            className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white/6 border border-white/10 text-white/70 text-sm font-bold hover:bg-white/10 transition-all">
                            {copied
                                ? <><CheckCircle2 size={14} className="text-emerald-400" /> Copied!</>
                                : <><Copy size={14} /> Copy Text</>
                            }
                        </button>
                        <a href={`mailto:${lead.email}?subject=Following up — ${lead.projectInterest}&body=${encodeURIComponent(draft)}`}
                            id="send-email-btn"
                            className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white/6 border border-white/10 text-white/70 text-sm font-bold hover:bg-white/10 transition-all">
                            <Mail size={14} /> Send Email
                        </a>
                    </div>
                </motion.div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════

export interface FollowUpCopilotProps {
    eventId?: string;
    agentId?: string;
    agentName?: string;
}

export default function FollowUpCopilot({
    eventId = 'event_demo',
    agentId = 'agent_demo_001',
    agentName = 'Khalid Al-Mansouri',
}: FollowUpCopilotProps) {
    const [leads, setLeads] = useState<CRMLead[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedLead, setSelectedLead] = useState<CRMLead | null>(null);
    const [search, setSearch] = useState('');
    const [filterSource, setFilterSource] = useState<string>('all');
    const [showDraftMobile, setShowDraftMobile] = useState(false);

    // ── Firestore real-time feed ────────────────────────────────────
    useEffect(() => {
        const unsub: Unsubscribe = onSnapshot(
            query(
                collection(db, 'crm_leads'),
                where('agentId', '==', agentId),
                orderBy('scannedAt', 'desc'),
                limit(50),
            ),
            snap => {
                if (!snap.empty) {
                    setLeads(snap.docs.map(d => ({ id: d.id, ...d.data() } as CRMLead)));
                } else {
                    setLeads(DEMO_LEADS);
                }
                setLoading(false);
            },
            () => { setLeads(DEMO_LEADS); setLoading(false); }
        );
        return () => unsub();
    }, [agentId]);

    const handleSelect = (lead: CRMLead) => {
        setSelectedLead(lead);
        setShowDraftMobile(true);
    };

    const sources = ['all', ...Array.from(new Set(leads.map(l => l.source ?? 'Manual')))];

    const filtered = leads.filter(l => {
        const matchSearch = !search || [l.firstName, l.lastName, l.company, l.projectInterest, l.email]
            .some(f => f.toLowerCase().includes(search.toLowerCase()));
        const matchSource = filterSource === 'all' || l.source === filterSource;
        return matchSearch && matchSource;
    });

    const pending = filtered.filter(l => !l.followUpSent).length;
    const sent = filtered.filter(l => l.followUpSent).length;

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col">

            {/* ── Top header ───────────────────────────────────── */}
            <header className="border-b border-white/8 px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <div className="flex items-center gap-2 mb-0.5">
                        <div className="w-6 h-6 rounded-lg bg-emerald-600 flex items-center justify-center">
                            <Zap size={13} className="text-white" />
                        </div>
                        <span className="text-emerald-400 text-[10px] font-black uppercase tracking-[0.25em]">Follow-Up Copilot</span>
                    </div>
                    <h1 className="text-white text-xl font-extrabold leading-tight">AI Message Drafts</h1>
                    <p className="text-white/30 text-xs mt-0.5">Logged in as <strong className="text-white/60">{agentName}</strong></p>
                </div>

                {/* KPIs */}
                <div className="flex gap-2">
                    {[
                        { label: 'Pending', value: pending, color: 'text-amber-400', bg: 'bg-amber-500/10', ring: 'ring-amber-500/20' },
                        { label: 'Sent', value: sent, color: 'text-emerald-400', bg: 'bg-emerald-500/10', ring: 'ring-emerald-500/20' },
                        { label: 'Total', value: leads.length, color: 'text-white/80', bg: 'bg-white/5', ring: 'ring-white/10' },
                    ].map(({ label, value, color, bg, ring }) => (
                        <div key={label} className={`px-3 py-2 rounded-xl ring-1 ${bg} ${ring} text-center min-w-[56px]`}>
                            <p className={`text-lg font-extrabold ${color}`}>{value}</p>
                            <p className="text-[9px] font-bold uppercase tracking-widest text-white/25">{label}</p>
                        </div>
                    ))}
                </div>
            </header>

            {/* ── Body ─────────────────────────────────────────── */}
            <div className="flex flex-1 overflow-hidden">

                {/* LEFT — Lead inbox */}
                <div className={`w-full md:w-80 lg:w-96 flex flex-col border-r border-white/8 overflow-hidden flex-shrink-0 ${showDraftMobile && selectedLead ? 'hidden md:flex' : 'flex'}`}>

                    {/* Search + filter */}
                    <div className="px-4 py-3 border-b border-white/6 space-y-2">
                        <div className="relative">
                            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
                            <input
                                id="copilot-search"
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search leads…"
                                className="w-full bg-white/5 border border-white/8 rounded-xl pl-8 pr-4 py-2 text-white text-xs placeholder:text-white/20 focus:outline-none focus:border-white/20"
                            />
                        </div>
                        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                            {sources.map(s => (
                                <button key={s} id={`filter-${s}`}
                                    onClick={() => setFilterSource(s)}
                                    className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${filterSource === s
                                            ? 'bg-emerald-600 text-white'
                                            : 'bg-white/5 text-white/35 hover:text-white/60'
                                        }`}
                                >
                                    {s === 'all' ? `All (${leads.length})` : s}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Lead list */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {loading ? (
                            <div className="flex items-center justify-center py-16">
                                <Loader2 size={22} className="animate-spin text-white/20" />
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="text-center py-16 text-white/15">
                                <User size={28} className="mx-auto mb-2 opacity-30" />
                                <p className="text-sm">No leads found</p>
                            </div>
                        ) : (
                            <AnimatePresence mode="popLayout">
                                {filtered.map(lead => (
                                    <LeadRow
                                        key={lead.id}
                                        lead={lead}
                                        selected={selectedLead?.id === lead.id}
                                        onSelect={() => handleSelect(lead)}
                                    />
                                ))}
                            </AnimatePresence>
                        )}
                    </div>
                </div>

                {/* RIGHT — Draft panel */}
                <div className={`flex-1 overflow-hidden flex flex-col ${!showDraftMobile && !selectedLead ? 'hidden md:flex' : 'flex'}`}>
                    <AnimatePresence mode="wait">
                        {selectedLead ? (
                            <motion.div key={selectedLead.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="flex-1 overflow-hidden flex flex-col">
                                <DraftPanel
                                    lead={selectedLead}
                                    agentName={agentName}
                                    onBack={() => { setShowDraftMobile(false); }}
                                />
                            </motion.div>
                        ) : (
                            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                className="flex-1 flex flex-col items-center justify-center gap-4 text-white/15 px-8 text-center">
                                <div className="w-16 h-16 rounded-3xl bg-white/4 border border-white/8 flex items-center justify-center">
                                    <MessageCircle size={28} className="opacity-30" />
                                </div>
                                <div>
                                    <p className="font-extrabold text-sm text-white/25">Select a lead to draft</p>
                                    <p className="text-xs text-white/15 mt-1">Gemini will craft a personalised WhatsApp message instantly</p>
                                </div>
                                {leads.length > 0 && (
                                    <div className="flex items-center gap-2 text-xs text-white/15">
                                        <Star size={11} />
                                        <span>{pending} follow-up{pending !== 1 ? 's' : ''} pending</span>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
