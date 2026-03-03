/**
 * PitchGenerator.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Internal tool: Organizer selects an event + developer, sets a
 * requested sponsorship amount, then "Generates" a unique pitch URL.
 *
 * The URL encodes all pitch data as a base64 query param so no extra
 * Firestore collection is required — the public page decodes it on the fly.
 * The token is unguessable because it contains a random nonce.
 *
 * Route: /proposals  (replaces or augments the existing Proposals page)
 * Tab:   "Developer Pitch" is the first tab — this component renders there.
 */

import React, { useState } from 'react';
import {
    Building2, Zap, Copy, CheckCheck, ExternalLink,
    ChevronDown, Sparkles, TrendingUp, Users, DollarSign,
    BarChart3, ArrowRight, RefreshCcw, Save, CheckCircle2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase/firebaseConfig';
import { toast } from 'sonner';

// ── Mock data (mirrors Firestore seed) ───────────────────────────────────────

const EVENTS = [
    {
        id: 'evt_london_luxury_expo_oct2026',
        name: 'London Luxury Property Show',
        city: 'London',
        country: 'UK',
        dateStart: 'Oct 14, 2026',
        dateEnd: 'Oct 16, 2026',
        targetLeads: 300,
        expectedAgents: 15,
        qualifiedRate: 0.30,
        meetingRate: 0.15,
        dealRate: 0.04,
        avgDealAed: 900_000,
        tier: 'Luxury',
        venue: 'Old Billingsgate, London',
    },
    {
        id: 'evt_cairo_invest_nov2026',
        name: 'Cairo Investor Summit',
        city: 'Cairo',
        country: 'Egypt',
        dateStart: 'Nov 8, 2026',
        dateEnd: 'Nov 9, 2026',
        targetLeads: 200,
        expectedAgents: 10,
        qualifiedRate: 0.28,
        meetingRate: 0.12,
        dealRate: 0.035,
        avgDealAed: 450_000,
        tier: 'Medium',
        venue: 'Nile Ritz-Carlton, Cairo',
    },
    {
        id: 'evt_dubai_global_jan2027',
        name: 'Dubai Global Property Expo',
        city: 'Dubai',
        country: 'UAE',
        dateStart: 'Jan 20, 2027',
        dateEnd: 'Jan 22, 2027',
        targetLeads: 500,
        expectedAgents: 22,
        qualifiedRate: 0.35,
        meetingRate: 0.18,
        dealRate: 0.05,
        avgDealAed: 1_200_000,
        tier: 'Luxury',
        venue: 'Dubai World Trade Centre',
    },
];

const DEVELOPERS = [
    { id: 'dev_aldar', name: 'Aldar Properties', logo: '🏛️', hq: 'Abu Dhabi', tier: 'Platinum' },
    { id: 'dev_emaar', name: 'Emaar Properties', logo: '🌆', hq: 'Dubai', tier: 'Platinum' },
    { id: 'dev_damac', name: 'DAMAC Properties', logo: '💎', hq: 'Dubai', tier: 'Gold' },
    { id: 'dev_nakheel', name: 'Nakheel', logo: '🌴', hq: 'Dubai', tier: 'Gold' },
    { id: 'dev_meraas', name: 'Meraas', logo: '🎨', hq: 'Dubai', tier: 'Silver' },
    { id: 'dev_sobha', name: 'Sobha Realty', logo: '🏡', hq: 'Dubai', tier: 'Gold' },
];

// ── Token generator ───────────────────────────────────────────────────────────

function generatePitchToken(payload: object): string {
    const nonce = Math.random().toString(36).slice(2, 10);
    const data = { ...payload, _nonce: nonce, _ts: Date.now() };
    return btoa(encodeURIComponent(JSON.stringify(data)));
}

function buildPitchUrl(token: string): string {
    return `${window.location.origin}/pitch/${token}`;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtAed(n: number): string {
    if (n >= 1_000_000) return `AED ${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `AED ${Math.round(n / 1_000)}K`;
    return `AED ${n.toLocaleString()}`;
}

// ── ROI preview card ──────────────────────────────────────────────────────────

function RoiPreview({
    event,
    sponsorship,
}: {
    event: (typeof EVENTS)[0];
    sponsorship: number;
}) {
    const qualified = Math.round(event.targetLeads * event.qualifiedRate);
    const meetings = Math.round(event.targetLeads * event.meetingRate);
    const deals = Math.round(event.targetLeads * event.dealRate);
    const pipeline = deals * event.avgDealAed;
    const brokerFee = pipeline * 0.04;
    const margin = sponsorship > 0
        ? Math.round(((brokerFee - sponsorship) / brokerFee) * 100)
        : 0;

    return (
        <div className="bg-psi-raised rounded-2xl p-5 space-y-4 border border-psi">
            <p className="text-[10px] font-bold text-psi-muted uppercase tracking-widest">ROI Preview — as developer will see it</p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: 'Target Leads', value: event.targetLeads.toLocaleString(), icon: <Users size={14} />, color: 'text-blue-500 dark:text-blue-400' },
                    { label: 'Meetings', value: meetings.toLocaleString(), icon: <TrendingUp size={14} />, color: 'text-violet-500 dark:text-violet-400' },
                    { label: 'Expected Deals', value: deals.toLocaleString(), icon: <BarChart3 size={14} />, color: 'text-amber-500 dark:text-amber-400' },
                    { label: 'Pipeline Value', value: fmtAed(pipeline), icon: <DollarSign size={14} />, color: 'text-emerald-600 dark:text-emerald-400' },
                ].map(({ label, value, icon, color }) => (
                    <div key={label} className="bg-psi-subtle rounded-xl p-3">
                        <div className={`flex items-center gap-1.5 mb-1 ${color}`}>{icon}<span className="text-[10px] font-bold uppercase tracking-wider">{label}</span></div>
                        <p className="text-psi-primary font-extrabold text-lg">{value}</p>
                    </div>
                ))}
            </div>

            {sponsorship > 0 && (
                <div className="flex items-center gap-3 pt-2 border-t border-psi">
                    <Zap size={14} className="text-amber-500 flex-shrink-0" />
                    <p className="text-sm text-psi-secondary">
                        With a <span className="text-amber-500 font-bold">{fmtAed(sponsorship)}</span> sponsorship, developer brokerage exposure is{' '}
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">{fmtAed(brokerFee)}</span>.
                        {margin >= 0
                            ? <> Projected margin: <span className="text-emerald-600 dark:text-emerald-400 font-bold">{margin}%</span>.</>
                            : <> Sponsorship exceeds projected brokerage return — adjust amount.</>
                        }
                    </p>
                </div>
            )}
        </div>
    );
}

// ── Custom select ─────────────────────────────────────────────────────────────

function SelectDropdown<T extends { id: string; name: string }>({
    label,
    options,
    value,
    onChange,
    renderOption,
    placeholder,
}: {
    label: string;
    options: T[];
    value: T | null;
    onChange: (v: T) => void;
    renderOption: (v: T) => React.ReactNode;
    placeholder: string;
}) {
    const [open, setOpen] = useState(false);
    return (
        <div className="relative">
            <label className="block text-xs font-bold uppercase tracking-widest text-psi-muted mb-2">{label}</label>
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 psi-input rounded-xl text-left hover:bg-psi-subtle transition-all select-none"
            >
                {value ? renderOption(value) : <span className="text-psi-muted text-sm">{placeholder}</span>}
                <ChevronDown size={16} className={`text-psi-muted flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.98 }}
                        transition={{ duration: 0.15 }}
                        className="absolute left-0 right-0 mt-2 psi-card shadow-2xl z-50 overflow-hidden"
                    >
                        {options.map(opt => (
                            <button
                                key={opt.id}
                                type="button"
                                onClick={() => { onChange(opt); setOpen(false); }}
                                className="w-full text-left px-4 py-3 hover:bg-psi-subtle transition-colors border-b border-psi last:border-0"
                            >
                                {renderOption(opt)}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PitchGenerator() {
    const [selectedEvent, setSelectedEvent] = useState<(typeof EVENTS)[0] | null>(null);
    const [selectedDev, setSelectedDev] = useState<(typeof DEVELOPERS)[0] | null>(null);
    const [sponsorAmount, setSponsorAmount] = useState('');
    const [generatedUrl, setGeneratedUrl] = useState('');
    const [copied, setCopied] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [savedId, setSavedId] = useState<string | null>(null);

    const canGenerate = selectedEvent && selectedDev && sponsorAmount && parseFloat(sponsorAmount) > 0;

    async function handleGenerate() {
        if (!canGenerate || !selectedEvent || !selectedDev) return;
        setIsGenerating(true);
        await new Promise(r => setTimeout(r, 800)); // brief visual pause for drama

        const payload = {
            eventId: selectedEvent.id,
            eventName: selectedEvent.name,
            eventCity: selectedEvent.city,
            eventCountry: selectedEvent.country,
            eventDateStart: selectedEvent.dateStart,
            eventDateEnd: selectedEvent.dateEnd,
            eventVenue: selectedEvent.venue,
            eventTier: selectedEvent.tier,
            targetLeads: selectedEvent.targetLeads,
            expectedAgents: selectedEvent.expectedAgents,
            qualifiedRate: selectedEvent.qualifiedRate,
            meetingRate: selectedEvent.meetingRate,
            dealRate: selectedEvent.dealRate,
            avgDealAed: selectedEvent.avgDealAed,
            developerId: selectedDev.id,
            developerName: selectedDev.name,
            developerLogo: selectedDev.logo,
            developerTier: selectedDev.tier,
            requestedAmtAed: parseFloat(sponsorAmount),
            generatedBy: 'usr_said_abu_laila_admin',
            generatedAt: new Date().toISOString(),
        };

        const token = generatePitchToken(payload);
        setGeneratedUrl(buildPitchUrl(token));
        setIsGenerating(false);
    }

    function handleCopy() {
        navigator.clipboard.writeText(generatedUrl).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 3000);
        });
    }

    function handleReset() {
        setSelectedEvent(null);
        setSelectedDev(null);
        setSponsorAmount('');
        setGeneratedUrl('');
        setCopied(false);
        setSavedId(null);
    }

    async function handleSaveToCRM() {
        if (!selectedEvent || !selectedDev || !generatedUrl) return;
        setIsSaving(true);
        try {
            const ref = await addDoc(collection(db, 'proposals'), {
                type: 'developer_pitch',
                eventId: selectedEvent.id,
                eventName: selectedEvent.name,
                developerId: selectedDev.id,
                developerName: selectedDev.name,
                developerLogo: selectedDev.logo,
                developerTier: selectedDev.tier,
                requestedAmtAed: parseFloat(sponsorAmount),
                pitchUrl: generatedUrl,
                stage: 'Sent',
                aiGenerated: true,
                generatedBy: 'usr_said_abu_laila_admin',
                generatedAt: serverTimestamp(),
            });
            setSavedId(ref.id);
            toast.success('Proposal saved to database', {
                description: `${selectedDev.name} · ${selectedEvent.name}`,
            });
        } catch (err) {
            toast.error('Failed to save proposal', {
                description: err instanceof Error ? err.message : 'Unknown error',
            });
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <div className="space-y-8">

            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                    <Sparkles size={20} className="text-psi-primary" />
                </div>
                <div>
                    <h2 className="text-xl font-extrabold text-psi-primary tracking-tight">Pitch Generator</h2>
                    <p className="text-xs text-psi-muted">Create a shareable, read-only sponsorship pitch for any developer.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

                {/* ── Left: Generator form ── */}
                <div className="lg:col-span-2 space-y-5">
                    {/* Event selector */}
                    <SelectDropdown
                        label="Select Event"
                        options={EVENTS}
                        value={selectedEvent}
                        onChange={setSelectedEvent}
                        placeholder="Choose a roadshow event…"
                        renderOption={ev => (
                            <div>
                                <p className="text-sm font-bold text-psi-primary">{ev.name}</p>
                                <p className="text-xs text-psi-muted">{ev.city}, {ev.country} · {ev.dateStart}</p>
                            </div>
                        )}
                    />

                    {/* Developer selector */}
                    <SelectDropdown
                        label="Select Developer"
                        options={DEVELOPERS}
                        value={selectedDev}
                        onChange={setSelectedDev}
                        placeholder="Choose a developer from CRM…"
                        renderOption={dev => (
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">{dev.logo}</span>
                                <div>
                                    <p className="text-sm font-bold text-psi-primary">{dev.name}</p>
                                    <p className="text-xs text-psi-muted">{dev.hq} · {dev.tier}</p>
                                </div>
                            </div>
                        )}
                    />

                    {/* Sponsorship amount */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-psi-muted mb-2">
                            Requested Sponsorship (AED)
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-psi-muted">AED</span>
                            <input
                                type="number"
                                min="0"
                                step="1000"
                                value={sponsorAmount}
                                onChange={e => { setSponsorAmount(e.target.value); setGeneratedUrl(''); }}
                                placeholder="150,000"
                                className="psi-input w-full pl-14 pr-4 py-3 rounded-xl font-mono text-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all"
                            />
                        </div>
                    </div>

                    {/* Quick-fill presets */}
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-psi-muted mb-2">Quick Presets</p>
                        <div className="flex gap-2 flex-wrap">
                            {[100_000, 150_000, 200_000, 300_000].map(amt => (
                                <button
                                    key={amt}
                                    type="button"
                                    onClick={() => { setSponsorAmount(String(amt)); setGeneratedUrl(''); }}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all select-none
                                        ${sponsorAmount === String(amt)
                                            ? 'bg-amber-500 text-white border-amber-500'
                                            : 'psi-card text-psi-secondary hover:border-amber-400'
                                        }`}
                                >
                                    {fmtAed(amt)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Generate button */}
                    <button
                        id="generate-pitch-btn"
                        type="button"
                        disabled={!canGenerate || isGenerating}
                        onClick={handleGenerate}
                        className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:from-slate-300 disabled:to-slate-300 dark:disabled:from-slate-700 dark:disabled:to-slate-700 text-psi-primary disabled:text-slate-600 dark:disabled:text-slate-400 dark:disabled:text-slate-600 rounded-2xl font-extrabold text-sm transition-all shadow-lg shadow-amber-500/20 disabled:shadow-none active:scale-[0.98] select-none"
                    >
                        {isGenerating ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Generating…
                            </>
                        ) : (
                            <>
                                <Sparkles size={16} />
                                Generate Pitch URL
                            </>
                        )}
                    </button>
                </div>

                {/* ── Right: Preview + output ── */}
                <div className="lg:col-span-3 space-y-5">

                    {/* ROI preview (live) */}
                    {selectedEvent && (
                        <RoiPreview
                            event={selectedEvent}
                            sponsorship={parseFloat(sponsorAmount) || 0}
                        />
                    )}

                    {/* Empty state */}
                    {!selectedEvent && (
                        <div className="bg-psi-subtle border-2 border-dashed border-psi rounded-2xl p-12 flex flex-col items-center justify-center text-center">
                            <Building2 size={36} className="text-psi-muted mb-3" />
                            <p className="text-sm font-bold text-psi-muted">Select an event to preview ROI projections</p>
                        </div>
                    )}

                    {/* Generated URL output */}
                    <AnimatePresence>
                        {generatedUrl && (
                            <motion.div
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 16 }}
                                className="psi-card border-2 border-emerald-200 dark:border-emerald-700/50 rounded-2xl overflow-hidden"
                            >
                                <div className="px-5 py-3 bg-psi-success border-b border-psi-accent flex items-center gap-2">
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                    <p className="text-xs font-bold text-psi-success">Pitch URL generated — ready to share</p>
                                </div>
                                <div className="p-5 space-y-3">
                                    <div className="flex items-start gap-3 p-3 bg-psi-subtle rounded-xl font-mono text-xs break-all text-psi-secondary">
                                        <span className="flex-1">{generatedUrl}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            id="copy-pitch-url-btn"
                                            onClick={handleCopy}
                                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all select-none active:scale-[0.97]
                                                ${copied
                                                    ? 'bg-psi-success text-psi-success'
                                                    : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm shadow-emerald-500/20'
                                                }`}
                                        >
                                            {copied ? <><CheckCheck size={16} /> Copied!</> : <><Copy size={16} /> Copy Link</>}
                                        </button>
                                        <a
                                            id="preview-pitch-link"
                                            href={generatedUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-center gap-2 px-4 py-3 psi-card text-psi-primary rounded-xl font-bold text-sm hover:bg-psi-subtle transition-all select-none"
                                        >
                                            <ExternalLink size={16} />
                                            Preview
                                        </a>
                                        <button
                                            onClick={handleReset}
                                            title="Start over"
                                            className="px-3 py-3 psi-card text-psi-muted rounded-xl hover:bg-psi-subtle transition-all select-none"
                                        >
                                            <RefreshCcw size={16} />
                                        </button>
                                        <button
                                            id="save-pitch-crm-btn"
                                            onClick={handleSaveToCRM}
                                            disabled={isSaving || !!savedId}
                                            title={savedId ? 'Saved to proposals' : 'Save pitch to Firestore proposals collection'}
                                            className={`px-3 py-3 rounded-xl font-bold text-sm flex items-center gap-1.5 transition-all select-none
                                                ${savedId
                                                    ? 'bg-psi-success text-psi-success border border-psi-accent'
                                                    : 'bg-violet-600 hover:bg-violet-500 text-white shadow-sm shadow-violet-500/20'
                                                } disabled:opacity-60`}
                                        >
                                            {savedId
                                                ? <><CheckCircle2 size={14} /> Saved</>
                                                : isSaving
                                                    ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</>
                                                    : <><Save size={14} /> Save to CRM</>
                                            }
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-psi-muted text-center flex items-center justify-center gap-1">
                                        <ArrowRight size={10} />
                                        Share this link directly with {selectedDev?.name}. No login required.
                                    </p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
