/**
 * Marketplace.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Sponsor & Exhibitor Marketplace
 * Route: /marketplace
 *
 * Views:
 *  DIRECTORY  — searchable/filterable grid of all exhibitors
 *  PROFILE    — individual exhibitor digital booth (tabs: Overview / Products / Documents / Contact)
 *  ADMIN      — visibility controls + engagement analytics
 */

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    Search, Star, Building2, Grid3X3,
    Phone, Mail, Globe, MapPin, Download, Calendar,
    ChevronLeft, Eye, BarChart2, MessageSquare,
    CheckCircle2, ArrowUpRight, Zap, Package, FileText,
    Layers, Award, Clock, Shield,
} from 'lucide-react';
import { toast } from 'sonner';
import {
    EXHIBITORS, TIER_STYLES, CAT_COLORS, TIERS, CATEGORIES, getTotalAnalytics,
    type Exhibitor, type ExhibitorTier, type ExhibitorCategory,
} from './marketplaceData';

// ── Utility ───────────────────────────────────────────────────────────────────

function cn(...cs: (string | false | undefined)[]) {
    return cs.filter(Boolean).join(' ');
}

// ── Tier badge ────────────────────────────────────────────────────────────────

function TierBadge({ tier }: { tier: ExhibitorTier }) {
    const s = TIER_STYLES[tier];
    const icons: Record<ExhibitorTier, string> = {
        Platinum: '💎', Gold: '🥇', Silver: '🥈', Bronze: '🥉', Exhibitor: '🎪',
    };
    return (
        <span className={cn('inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full', s.badge)}>
            {icons[tier]} {tier}
        </span>
    );
}

// ── Stat chip ─────────────────────────────────────────────────────────────────

function StatChip({ icon: Icon, value, label }: { icon: React.ElementType; value: number | string; label: string }) {
    return (
        <div className="flex flex-col items-center p-3 bg-slate-800 rounded-xl">
            <Icon size={14} className="text-emerald-400 mb-1" />
            <p className="text-white font-black text-base">{typeof value === 'number' ? value.toLocaleString() : value}</p>
            <p className="text-slate-500 text-[9px] uppercase tracking-wider">{label}</p>
        </div>
    );
}

// ── Exhibitor card (directory) ────────────────────────────────────────────────

function ExhibitorCard({ exhibitor, onClick }: { exhibitor: Exhibitor; onClick: () => void }) {
    const tier = TIER_STYLES[exhibitor.tier];
    return (
        <motion.button
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={onClick}
            className={cn(
                'text-left w-full rounded-2xl border p-5 transition-all group hover:scale-[1.01] active:scale-100',
                tier.bg, tier.border, `hover:shadow-xl hover:${tier.glow}`
            )}
        >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-4">
                <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0', 'bg-slate-800 border border-slate-700')}>
                    {exhibitor.logo}
                </div>
                <div className="flex flex-col items-end gap-1.5">
                    <TierBadge tier={exhibitor.tier} />
                    {exhibitor.isFeatured && (
                        <span className="text-[9px] bg-amber-500/20 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded-full font-black flex items-center gap-0.5">
                            <Star size={8} /> Featured
                        </span>
                    )}
                    {exhibitor.isLive && (
                        <span className="flex items-center gap-1 text-[9px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-full font-black">
                            <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute h-full w-full rounded-full bg-emerald-400 opacity-70" />
                                <span className="relative rounded-full h-1.5 w-1.5 bg-emerald-400" />
                            </span>
                            At Stand
                        </span>
                    )}
                </div>
            </div>

            <div className="mb-3">
                <h3 className="text-white font-black text-sm leading-tight mb-0.5">{exhibitor.name}</h3>
                <p className={cn('text-xs', tier.text)}>{exhibitor.tagline}</p>
            </div>

            {/* Category + Stand */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border', CAT_COLORS[exhibitor.category])}>
                    {exhibitor.category}
                </span>
                <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                    <MapPin size={9} /> Stand {exhibitor.standNumber}
                </span>
                <span className="text-[10px] text-slate-500">{exhibitor.country}</span>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1 mb-4">
                {exhibitor.tags.slice(0, 3).map(t => (
                    <span key={t} className="text-[9px] bg-slate-800 border border-slate-700 text-slate-400 px-1.5 py-0.5 rounded-full">{t}</span>
                ))}
            </div>

            {/* Footer stats */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                <div className="flex gap-3 text-slate-500 text-xs">
                    <span className="flex items-center gap-0.5"><Package size={9} /> {exhibitor.products.length} products</span>
                    <span className="flex items-center gap-0.5"><FileText size={9} /> {exhibitor.documents.length} docs</span>
                </div>
                <span className="flex items-center gap-1 text-emerald-400 text-xs font-semibold group-hover:gap-2 transition-all">
                    View Booth <ArrowUpRight size={11} />
                </span>
            </div>
        </motion.button>
    );
}

// ── Profile view ──────────────────────────────────────────────────────────────

type ProfileTab = 'overview' | 'products' | 'documents' | 'contact';

function MeetingModal({ exhibitor, onClose }: { exhibitor: Exhibitor; onClose: () => void }) {
    const [selectedSlot, setSelectedSlot] = useState('');
    const [name, setName] = useState('');
    const [company, setCompany] = useState('');
    const [type, setType] = useState<'Meeting' | 'Demo'>('Meeting');

    function handleBook() {
        if (!selectedSlot || !name.trim() || !company.trim()) {
            toast.error('Please fill all fields and select a time slot');
            return;
        }
        toast.success(`${type} booked with ${exhibitor.name} at ${selectedSlot}! Confirmation sent.`);
        onClose();
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95 }}
                onClick={e => e.stopPropagation()}
                className="bg-slate-900 border border-slate-700 rounded-3xl p-6 w-full max-w-md shadow-2xl"
            >
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-xl">{exhibitor.logo}</div>
                    <div>
                        <h3 className="text-white font-bold">{exhibitor.name}</h3>
                        <p className="text-slate-400 text-xs">Stand {exhibitor.standNumber}</p>
                    </div>
                </div>

                {/* Type toggle */}
                <div className="flex bg-slate-800 rounded-xl p-1 mb-4">
                    {(['Meeting', 'Demo'] as const).map(t => (
                        <button key={t} onClick={() => setType(t)}
                            className={cn('flex-1 py-2 rounded-lg text-xs font-bold transition-all', type === t ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200')}>
                            {t === 'Meeting' ? '📅 Book Meeting' : '🖥 Request Demo'}
                        </button>
                    ))}
                </div>

                <div className="space-y-3 mb-4">
                    <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500" />
                    <input value={company} onChange={e => setCompany(e.target.value)} placeholder="Company / Organization"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500" />
                </div>

                <p className="text-slate-500 text-xs font-black uppercase tracking-wider mb-2">Select Time Slot</p>
                <div className="grid grid-cols-4 gap-1.5 mb-5">
                    {exhibitor.availableSlots.map(slot => (
                        <button key={slot} onClick={() => setSelectedSlot(slot)}
                            className={cn('py-2 rounded-lg text-xs font-bold border transition-all', selectedSlot === slot ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600')}>
                            {slot}
                        </button>
                    ))}
                </div>

                <div className="flex gap-2">
                    <button onClick={handleBook} className="flex-1 py-3 rounded-2xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-500 transition-colors">
                        Confirm {type}
                    </button>
                    <button onClick={onClose} className="px-5 py-3 rounded-2xl bg-slate-800 border border-slate-700 text-slate-400 text-sm hover:text-white transition-colors">
                        Cancel
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

function ExhibitorProfile({ exhibitor, onBack }: { exhibitor: Exhibitor; onBack: () => void }) {
    const [tab, setTab] = useState<ProfileTab>('overview');
    const [showModal, setShowModal] = useState(false);
    const [modalProduct, setModalProduct] = useState<string | null>(null);
    const tier = TIER_STYLES[exhibitor.tier];

    function handleDownload(docName: string) {
        toast.success(`Downloading: ${docName}`);
    }

    return (
        <>
            <div className="flex-1 overflow-y-auto">
                {/* Hero banner */}
                <div className={cn('bg-gradient-to-r p-6 pb-0 relative', exhibitor.color)}>
                    <button onClick={onBack} className="flex items-center gap-1.5 text-slate-400 hover:text-white text-xs font-semibold mb-4 transition-colors">
                        <ChevronLeft size={14} /> Back to Directory
                    </button>
                    <div className="flex items-start gap-5 mb-5 flex-wrap">
                        <div className="w-20 h-20 rounded-3xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-4xl flex-shrink-0 shadow-2xl">
                            {exhibitor.logo}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                <TierBadge tier={exhibitor.tier} />
                                <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border', CAT_COLORS[exhibitor.category])}>
                                    {exhibitor.category}
                                </span>
                                {exhibitor.isLive && (
                                    <span className="flex items-center gap-1 text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded-full font-black">
                                        <span className="relative flex h-1.5 w-1.5">
                                            <span className="animate-ping absolute h-full w-full rounded-full bg-emerald-400 opacity-70" />
                                            <span className="relative rounded-full h-1.5 w-1.5 bg-emerald-400" />
                                        </span>
                                        Team at Stand {exhibitor.standNumber}
                                    </span>
                                )}
                            </div>
                            <h1 className="text-white font-black text-2xl leading-tight">{exhibitor.name}</h1>
                            <p className={cn('text-sm mt-1', tier.text)}>{exhibitor.tagline}</p>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                            <button onClick={() => setShowModal(true)}
                                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition-colors shadow-lg">
                                <Calendar size={13} /> Book Meeting
                            </button>
                            <button onClick={() => { setModalProduct(null); setShowModal(true); }}
                                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-bold transition-colors border border-white/20 backdrop-blur">
                                <MessageSquare size={13} /> Contact
                            </button>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-0.5 bg-black/20 p-1 rounded-t-xl w-fit backdrop-blur-sm">
                        {([
                            { id: 'overview', label: 'Overview', icon: Building2 },
                            { id: 'products', label: `Products (${exhibitor.products.length})`, icon: Package },
                            { id: 'documents', label: `Documents (${exhibitor.documents.length})`, icon: FileText },
                            { id: 'contact', label: 'Contact', icon: Phone },
                        ] as { id: ProfileTab; label: string; icon: React.ElementType }[]).map(t => (
                            <button key={t.id} onClick={() => setTab(t.id)}
                                className={cn('flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all',
                                    tab === t.id ? 'bg-white/20 text-white backdrop-blur' : 'text-white/60 hover:text-white/90')}>
                                <t.icon size={11} /> {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tab content */}
                <div className="p-6 space-y-6">
                    <AnimatePresence mode="wait">

                        {/* ── OVERVIEW ──────────────────────────────────── */}
                        {tab === 'overview' && (
                            <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                className="space-y-6">
                                {/* About */}
                                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-wider mb-2">About</p>
                                    <p className="text-slate-300 text-sm leading-relaxed">{exhibitor.description}</p>
                                </div>

                                {/* Key stats */}
                                <div>
                                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-wider mb-3">Engagement Stats</p>
                                    <div className="grid grid-cols-5 gap-2">
                                        <StatChip icon={Eye} value={exhibitor.analytics.profileViews} label="Views" />
                                        <StatChip icon={MessageSquare} value={exhibitor.analytics.contactRequests} label="Contacts" />
                                        <StatChip icon={Zap} value={exhibitor.analytics.demoBookings} label="Demos" />
                                        <StatChip icon={Download} value={exhibitor.analytics.documentDownloads} label="Downloads" />
                                        <StatChip icon={Calendar} value={exhibitor.analytics.meetingsScheduled} label="Meetings" />
                                    </div>
                                </div>

                                {/* Key contact card */}
                                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-3xl flex-shrink-0">
                                        {exhibitor.keyContact.avatar}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-white font-bold">{exhibitor.keyContact.name}</p>
                                        <p className="text-slate-400 text-sm">{exhibitor.keyContact.title}</p>
                                        <p className="text-slate-500 text-xs mt-0.5">{exhibitor.name}</p>
                                    </div>
                                    <button onClick={() => setShowModal(true)}
                                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-colors">
                                        <Calendar size={12} /> Schedule
                                    </button>
                                </div>

                                {/* Sessions */}
                                {exhibitor.sessions.length > 0 && (
                                    <div>
                                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-wider mb-3">Sessions & Presentations</p>
                                        {exhibitor.sessions.map((s, i) => (
                                            <div key={i} className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-xl p-3 mb-2">
                                                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
                                                    <Layers size={14} className="text-indigo-400" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-white text-sm font-semibold truncate">{s.sessionName}</p>
                                                    <p className="text-slate-400 text-xs">{s.room} · {s.time}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Tags */}
                                <div className="flex flex-wrap gap-1.5">
                                    {exhibitor.tags.map(t => (
                                        <span key={t} className="text-xs bg-slate-800 border border-slate-700 text-slate-300 px-2.5 py-1 rounded-full">{t}</span>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {/* ── PRODUCTS ──────────────────────────────────── */}
                        {tab === 'products' && (
                            <motion.div key="products" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {exhibitor.products.map(prod => (
                                    <div key={prod.id} className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 transition-colors">
                                        <div className="flex items-start gap-3 mb-3">
                                            <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-2xl flex-shrink-0">{prod.imageEmoji}</div>
                                            <div className="flex-1 min-w-0">
                                                <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">{prod.type}</span>
                                                <h3 className="text-white font-bold text-sm leading-tight">{prod.name}</h3>
                                                {prod.priceNote && <p className="text-emerald-400 text-xs font-bold mt-0.5">{prod.priceNote}</p>}
                                            </div>
                                        </div>
                                        <p className="text-slate-400 text-sm leading-relaxed mb-3">{prod.description}</p>
                                        <div className="flex flex-wrap gap-1 mb-4">
                                            {prod.highlights.map(h => (
                                                <span key={h} className="flex items-center gap-0.5 text-[10px] text-slate-300 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-full">
                                                    <CheckCircle2 size={8} className="text-emerald-400" /> {h}
                                                </span>
                                            ))}
                                        </div>
                                        <div className="flex gap-2">
                                            {prod.demoAvailable && (
                                                <button onClick={() => { setModalProduct(prod.id); setShowModal(true); }}
                                                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-600/20 border border-emerald-600/30 text-emerald-400 text-xs font-bold hover:bg-emerald-600/30 transition-colors">
                                                    <Zap size={11} /> Request Demo
                                                </button>
                                            )}
                                            <button onClick={() => setShowModal(true)}
                                                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-colors">
                                                <Calendar size={11} /> Book Meeting
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </motion.div>
                        )}

                        {/* ── DOCUMENTS ─────────────────────────────────── */}
                        {tab === 'documents' && (
                            <motion.div key="documents" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                className="space-y-3">
                                {exhibitor.documents.length === 0 ? (
                                    <div className="text-center py-16 text-slate-600">
                                        <FileText size={36} className="mx-auto mb-3" />
                                        <p>No documents available</p>
                                    </div>
                                ) : exhibitor.documents.map(doc => (
                                    <div key={doc.id} className="flex items-center gap-4 bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors">
                                        <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-2xl flex-shrink-0">{doc.emoji}</div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white font-semibold text-sm truncate">{doc.name}</p>
                                            <div className="flex items-center gap-3 mt-0.5">
                                                <span className="text-slate-500 text-xs">{doc.type}</span>
                                                <span className="text-slate-600 text-xs">{doc.sizeLabel}</span>
                                                <span className="text-slate-600 text-xs flex items-center gap-0.5"><Download size={9} /> {doc.downloads.toLocaleString()} downloads</span>
                                            </div>
                                        </div>
                                        <button onClick={() => handleDownload(doc.name)}
                                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold hover:bg-emerald-600 hover:border-emerald-600 hover:text-white transition-all flex-shrink-0">
                                            <Download size={12} /> Download
                                        </button>
                                    </div>
                                ))}
                            </motion.div>
                        )}

                        {/* ── CONTACT ───────────────────────────────────── */}
                        {tab === 'contact' && (
                            <motion.div key="contact" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Contact details */}
                                <div className="space-y-4">
                                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-wider">Contact Details</p>
                                        {[
                                            { icon: Mail, label: exhibitor.email },
                                            { icon: Phone, label: exhibitor.phone },
                                            { icon: Globe, label: exhibitor.website },
                                            { icon: MapPin, label: `Stand ${exhibitor.standNumber} · ${exhibitor.country}` },
                                        ].map(({ icon: Icon, label }) => (
                                            <div key={label} className="flex items-center gap-3 text-sm">
                                                <Icon size={14} className="text-slate-500 flex-shrink-0" />
                                                <span className="text-slate-300">{label}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-wider mb-3">Key Contact</p>
                                        <div className="flex items-center gap-3">
                                            <span className="text-3xl">{exhibitor.keyContact.avatar}</span>
                                            <div>
                                                <p className="text-white font-bold text-sm">{exhibitor.keyContact.name}</p>
                                                <p className="text-slate-400 text-xs">{exhibitor.keyContact.title}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Book meeting CTA */}
                                <div className="space-y-3">
                                    <button onClick={() => setShowModal(true)}
                                        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-base transition-colors shadow-lg shadow-emerald-900/30">
                                        <Calendar size={18} /> Schedule Meeting
                                    </button>
                                    <button onClick={() => { setShowModal(true); }}
                                        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-slate-900 border border-slate-700 text-slate-300 font-semibold text-sm transition-colors hover:bg-slate-800">
                                        <Zap size={14} /> Request Product Demo
                                    </button>
                                    <button onClick={() => toast.success('Contact request sent!')}
                                        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-slate-900 border border-slate-700 text-slate-400 pointer text-sm transition-colors hover:bg-slate-800">
                                        <MessageSquare size={14} /> Send Message
                                    </button>
                                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
                                        <Clock size={16} className="text-slate-600 mx-auto mb-1" />
                                        <p className="text-slate-500 text-xs">
                                            {exhibitor.availableSlots.length} time slots available today
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Meeting / Demo modal */}
            <AnimatePresence>
                {showModal && <MeetingModal exhibitor={exhibitor} onClose={() => { setShowModal(false); setModalProduct(null); }} />}
            </AnimatePresence>
        </>
    );
}

// ── Admin panel ───────────────────────────────────────────────────────────────

function AdminPanel() {
    const [exhibitors, setExhibitors] = useState(EXHIBITORS);
    const totals = getTotalAnalytics();

    function toggleVisibility(id: string) {
        setExhibitors(prev => prev.map(e => e.id !== id ? e : { ...e, isVisible: !e.isVisible }));
        toast.success('Visibility updated');
    }
    function toggleFeatured(id: string) {
        setExhibitors(prev => prev.map(e => e.id !== id ? e : { ...e, isFeatured: !e.isFeatured }));
        toast.success('Featured status updated');
    }

    const sorted = [...exhibitors].sort((a, b) => b.analytics.profileViews - a.analytics.profileViews);

    return (
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {/* Global KPIs */}
            <div>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-wider mb-3">Platform-Wide Engagement</p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {[
                        { icon: Eye, value: totals.views, label: 'Profile Views', color: 'text-sky-400' },
                        { icon: MessageSquare, value: totals.contacts, label: 'Contact Requests', color: 'text-violet-400' },
                        { icon: Zap, value: totals.demos, label: 'Demo Bookings', color: 'text-amber-400' },
                        { icon: Download, value: totals.downloads, label: 'Downloads', color: 'text-emerald-400' },
                        { icon: Calendar, value: totals.meetings, label: 'Meetings', color: 'text-pink-400' },
                    ].map(s => (
                        <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
                            <s.icon size={18} className={cn('mx-auto mb-2', s.color)} />
                            <p className="text-white font-black text-2xl">{s.value.toLocaleString()}</p>
                            <p className="text-slate-500 text-[9px] uppercase tracking-wider">{s.label}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Leaderboard */}
            <div>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-wider mb-3">Exhibitor Leaderboard — By Profile Views</p>
                <div className="space-y-2">
                    {sorted.map((e, i) => {
                        const maxViews = sorted[0].analytics.profileViews;
                        const pct = Math.round((e.analytics.profileViews / maxViews) * 100);
                        return (
                            <div key={e.id} className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-xl p-3">
                                <span className={cn('font-black text-sm w-5 text-center', i === 0 ? 'text-amber-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-orange-600' : 'text-slate-600')}>{i + 1}</span>
                                <span className="text-xl w-7">{e.logo}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-white text-xs font-semibold truncate">{e.name}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <div className="flex-1 bg-slate-800 rounded-full h-1.5">
                                            <motion.div animate={{ width: `${pct}%` }} className="h-1.5 rounded-full bg-emerald-500" />
                                        </div>
                                        <span className="text-slate-400 text-[10px] font-bold">{e.analytics.profileViews.toLocaleString()} views</span>
                                    </div>
                                </div>
                                <TierBadge tier={e.tier} />
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Management table */}
            <div>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-wider mb-3">Exhibitor Management</p>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-800">
                                {['Exhibitor', 'Tier', 'Stand', 'Contacts', 'Demos', 'Visible', 'Featured'].map(h => (
                                    <th key={h} className="text-left text-slate-500 text-[10px] font-black uppercase tracking-wider px-4 py-3">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {exhibitors.map(e => (
                                <tr key={e.id} className={cn('border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors', !e.isVisible && 'opacity-40')}>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg">{e.logo}</span>
                                            <span className="text-white text-xs font-semibold truncate max-w-36">{e.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3"><TierBadge tier={e.tier} /></td>
                                    <td className="px-4 py-3 text-slate-400 text-xs">{e.standNumber}</td>
                                    <td className="px-4 py-3 text-slate-300 text-xs font-bold">{e.analytics.contactRequests}</td>
                                    <td className="px-4 py-3 text-slate-300 text-xs font-bold">{e.analytics.demoBookings}</td>
                                    <td className="px-4 py-3">
                                        <button onClick={() => toggleVisibility(e.id)}
                                            className={cn('flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all',
                                                e.isVisible ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20')}>
                                            {e.isVisible ? <><Eye size={9} /> Visible</> : <><Shield size={9} /> Hidden</>}
                                        </button>
                                    </td>
                                    <td className="px-4 py-3">
                                        <button onClick={() => toggleFeatured(e.id)}
                                            className={cn('flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all',
                                                e.isFeatured ? 'bg-amber-500/15 text-amber-400 border-amber-500/20' : 'bg-slate-700 text-slate-500 border-slate-600')}>
                                            <Star size={9} /> {e.isFeatured ? 'Featured' : 'Normal'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// ── Main component ────────────────────────────────────────────────────────────

type AppView = 'directory' | 'profile' | 'admin';

export default function Marketplace() {
    const [view, setView] = useState<AppView>('directory');
    const [selectedExhibitor, setSelectedExhibitor] = useState<Exhibitor | null>(null);
    const [query, setQuery] = useState('');
    const [tierFilter, setTierFilter] = useState<ExhibitorTier | 'All'>('All');
    const [catFilter, setCatFilter] = useState<ExhibitorCategory | 'All'>('All');

    const filtered = useMemo(() => {
        const q = query.toLowerCase();
        return EXHIBITORS.filter(e => {
            if (!e.isVisible) return false;
            if (tierFilter !== 'All' && e.tier !== tierFilter) return false;
            if (catFilter !== 'All' && e.category !== catFilter) return false;
            if (q && !e.name.toLowerCase().includes(q) && !e.tagline.toLowerCase().includes(q) && !e.tags.some(t => t.toLowerCase().includes(q))) return false;
            return true;
        });
    }, [query, tierFilter, catFilter]);

    // Sort: Platinum first → featured → live
    const sorted = useMemo(() => {
        const order: ExhibitorTier[] = ['Platinum', 'Gold', 'Silver', 'Bronze', 'Exhibitor'];
        return [...filtered].sort((a, b) => {
            const td = order.indexOf(a.tier) - order.indexOf(b.tier);
            if (td !== 0) return td;
            if (a.isFeatured && !b.isFeatured) return -1;
            if (!a.isFeatured && b.isFeatured) return 1;
            return 0;
        });
    }, [filtered]);

    function openProfile(e: Exhibitor) {
        setSelectedExhibitor(e);
        setView('profile');
    }

    return (
        <div className="h-screen bg-slate-950 flex flex-col font-sans overflow-hidden">

            {/* ── Header ────────────────────────────────────────────────── */}
            <div className="bg-slate-900 border-b border-slate-800 px-5 py-3.5 flex-shrink-0">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                        <div className="flex items-center gap-2">
                            <Building2 size={18} className="text-amber-400" />
                            <h1 className="text-white font-extrabold text-base">Sponsor & Exhibitor Marketplace</h1>
                        </div>
                        <p className="text-slate-500 text-xs mt-0.5">
                            {EXHIBITORS.length} exhibitors · PSI Events 2026
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {(['directory', 'admin'] as const).map(v => (
                            <button key={v} onClick={() => { setView(v); setSelectedExhibitor(null); }}
                                className={cn('flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all',
                                    view === v ? (v === 'admin' ? 'bg-violet-600 border-violet-500 text-white' : 'bg-amber-600 border-amber-500 text-white') : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200')}>
                                {v === 'directory' ? <><Grid3X3 size={12} /> Directory</> : <><BarChart2 size={12} /> Admin</>}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Directory filters ──────────────────────────────────────── */}
            {view === 'directory' && (
                <div className="border-b border-slate-800 px-5 py-3 bg-slate-900/40 flex-shrink-0">
                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="relative">
                            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input value={query} onChange={e => setQuery(e.target.value)}
                                placeholder="Search exhibitors…"
                                className="bg-slate-800 border border-slate-700 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 w-52 transition-colors" />
                        </div>
                        <div className="flex gap-1">
                            {(['All', ...TIERS] as const).map(t => (
                                <button key={t} onClick={() => setTierFilter(t)}
                                    className={cn('px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all',
                                        tierFilter === t ? 'bg-amber-600 border-amber-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600')}>
                                    {t}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-1 flex-wrap">
                            {(['All', ...CATEGORIES] as const).map(c => (
                                <button key={c} onClick={() => setCatFilter(c)}
                                    className={cn('px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all',
                                        catFilter === c ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600')}>
                                    {c}
                                </button>
                            ))}
                        </div>
                        <span className="text-slate-600 text-xs ml-auto hidden md:inline">{sorted.length} exhibitors</span>
                    </div>
                </div>
            )}

            {/* ── Content ────────────────────────────────────────────────── */}
            <div className="flex-1 overflow-hidden flex flex-col">
                <AnimatePresence mode="wait">

                    {/* Directory */}
                    {view === 'directory' && (
                        <motion.div key="dir" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="flex-1 overflow-y-auto p-5">
                            {/* Featured row */}
                            {sorted.filter(e => e.isFeatured).length > 0 && (
                                <div className="mb-6">
                                    <p className="flex items-center gap-1.5 text-amber-400 text-[10px] font-black uppercase tracking-wider mb-3">
                                        <Star size={10} /> Featured Sponsors
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                                        {sorted.filter(e => e.isFeatured).map(e => (
                                            <ExhibitorCard key={e.id} exhibitor={e} onClick={() => openProfile(e)} />
                                        ))}
                                    </div>
                                </div>
                            )}
                            {/* All exhibitors */}
                            <div>
                                <p className="text-slate-500 text-[10px] font-black uppercase tracking-wider mb-3">All Exhibitors</p>
                                {sorted.length === 0 ? (
                                    <div className="text-center py-20 text-slate-600">
                                        <Building2 size={40} className="mx-auto mb-3" />
                                        <p className="font-bold">No exhibitors match your filter</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                                        {sorted.filter(e => !e.isFeatured).map(e => (
                                            <ExhibitorCard key={e.id} exhibitor={e} onClick={() => openProfile(e)} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* Profile */}
                    {view === 'profile' && selectedExhibitor && (
                        <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="flex-1 flex flex-col overflow-hidden">
                            <ExhibitorProfile exhibitor={selectedExhibitor} onBack={() => setView('directory')} />
                        </motion.div>
                    )}

                    {/* Admin */}
                    {view === 'admin' && (
                        <motion.div key="admin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="flex-1 flex flex-col overflow-hidden">
                            <AdminPanel />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
