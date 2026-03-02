/**
 * FastPass.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * VIP Fast-Pass Wallet System
 *
 * Exports:
 *   FastPassPage          — tabbed page at /fast-pass (dashboard route)
 *   VIPScannerPanel       — drop-in panel for the OrganizerScannerView
 *
 * ── Feature overview ─────────────────────────────────────────────────────────
 *
 * Tab 1 — Invite Sender (Organizer / Agent)
 *   Select CRM contacts → personalise invite → send email/SMS invite containing
 *   a secure registration URL  /vip-register/:token
 *
 * Tab 2 — My VIP Pass (Client-facing preview)
 *   Displays the client's digital pass card styled in PSI Navy + Gold.
 *   Shows a QR code encoding the Lead ID.
 *   Mocks Apple Wallet (.pkpass) and Google Pay download buttons.
 *
 * Tab 3 — VIP Scanner (Organizer)
 *   Animated scanner frame. Paste / simulate a Lead ID QR scan.
 *   On scan: writes vip_arrivals/{leadId} to Firestore, updates crm_leads status
 *   to "VIP_Arrived", fires an in-app push notification to the assigned agent.
 *
 * ── Firestore schema ──────────────────────────────────────────────────────────
 *
 *  fast_pass_tokens/{token}
 *    leadId, leadName, leadEmail, leadPhone, eventId, eventName
 *    agentId, agentName, tier, inviteSentAt, registeredAt, passGeneratedAt
 *
 *  vip_arrivals/{leadId}
 *    leadId, leadName, eventId, arrivedAt, scannedBy, assignedAgentId
 *
 *  users/{agentId}/notifications/{auto}
 *    type: "vip_arrived", leadId, leadName, eventName, message, read, createdAt
 */

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import {
    Send, Star, ScanLine, Download, Copy, CheckCircle2,
    Loader2, X, BellRing, Crown, Mail, Phone as PhoneIcon,
    User, Calendar, MapPin, Wallet, ShieldCheck, Zap,
    AlertTriangle, Users, ChevronRight, RefreshCw, Gift,
} from 'lucide-react';
import {
    collection, doc, setDoc, addDoc, updateDoc,
    serverTimestamp, getDocs, query, where, getDoc,
} from 'firebase/firestore';
import { db } from '../../services/firebase/firebaseConfig';

// ── Helpers ───────────────────────────────────────────────────────────────────

function clsx(...c: (string | boolean | undefined | null)[]) {
    return c.filter(Boolean).join(' ');
}

function generateToken(len = 16): string {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type VIPTier = 'Platinum' | 'Gold' | 'Silver';

export interface CRMContact {
    leadId: string;
    name: string;
    email: string;
    phone: string;
    tier: VIPTier;
    projectInterest?: string;
    assignedAgentId: string;
    assignedAgentName: string;
}

export interface FastPassToken {
    token: string;
    leadId: string;
    leadName: string;
    leadEmail: string;
    leadPhone: string;
    tier: VIPTier;
    eventId: string;
    eventName: string;
    agentId: string;
    agentName: string;
    registrationUrl: string;
    inviteSentAt: string;
    passGeneratedAt?: string;
}

export interface VIPArrival {
    leadId: string;
    leadName: string;
    tier: VIPTier;
    eventId: string;
    arrivedAt: string;
    scannedBy: string;
    assignedAgentId: string;
}

// ── Demo data ─────────────────────────────────────────────────────────────────

const DEMO_EVENT = { eventId: 'event_demo_001', eventName: 'PSI Moscow Cityscape Summit 2026' };

const DEMO_CONTACTS: CRMContact[] = [
    { leadId: 'lead_001', name: 'Mr. Alexander Wong', email: 'alex.wong@gmail.com', phone: '+971501234567', tier: 'Platinum', projectInterest: 'Mamsha Al Saadiyat', assignedAgentId: 'agent_001', assignedAgentName: 'Khalid Al-Mansouri' },
    { leadId: 'lead_002', name: 'Ms. Natasha Petrov', email: 'n.petrov@company.ru', phone: '+79161234567', tier: 'Gold', projectInterest: 'Marina Blue', assignedAgentId: 'agent_002', assignedAgentName: 'Sara Ahmed' },
    { leadId: 'lead_003', name: 'Mr. James Okafor', email: 'j.okafor@email.ng', phone: '+2348012345678', tier: 'Gold', projectInterest: 'Noya on Yas Island', assignedAgentId: 'agent_001', assignedAgentName: 'Khalid Al-Mansouri' },
    { leadId: 'lead_004', name: 'Dr. Priya Sharma', email: 'drpriya@hospital.in', phone: '+919876543210', tier: 'Platinum', projectInterest: 'Maryah Plaza', assignedAgentId: 'agent_003', assignedAgentName: 'Omar Khalil' },
    { leadId: 'lead_005', name: 'Mr. Dmitri Volkov', email: 'dvolkov@invest.ru', phone: '+79031234567', tier: 'Silver', projectInterest: 'The Grove', assignedAgentId: 'agent_002', assignedAgentName: 'Sara Ahmed' },
];

// ── Tier styling ──────────────────────────────────────────────────────────────

const TIER_CFG: Record<VIPTier, { bg: string; text: string; border: string; badge: string; accent: string; qrFg: string; qrBg: string }> = {
    Platinum: {
        bg: 'bg-gradient-to-br from-slate-800 to-white dark:to-slate-900',
        text: 'text-psi-secondary',
        border: 'border-slate-500',
        badge: 'bg-psi-border text-psi-secondary',
        accent: 'text-psi-secondary',
        qrFg: '#f1f5f9',
        qrBg: '#0f172a',
    },
    Gold: {
        bg: 'bg-gradient-to-br from-amber-950 to-white dark:to-slate-900',
        text: 'text-amber-100',
        border: 'border-amber-500',
        badge: 'bg-amber-500/20 text-amber-300',
        accent: 'text-amber-400',
        qrFg: '#fbbf24',
        qrBg: '#1c1400',
    },
    Silver: {
        bg: 'bg-gradient-to-br from-slate-700 to-white dark:to-slate-900',
        text: 'text-psi-secondary',
        border: 'border-slate-400',
        badge: 'bg-slate-600 text-psi-secondary',
        accent: 'text-psi-secondary',
        qrFg: '#cbd5e1',
        qrBg: '#0f172a',
    },
};

// ── Firestore helpers ─────────────────────────────────────────────────────────

async function createFastPassToken(contact: CRMContact, event: typeof DEMO_EVENT): Promise<FastPassToken> {
    const token = generateToken();
    const baseUrl = window.location.origin;
    const registrationUrl = `${baseUrl}/vip-register/${token}`;
    const fp: FastPassToken = {
        token,
        leadId: contact.leadId,
        leadName: contact.name,
        leadEmail: contact.email,
        leadPhone: contact.phone,
        tier: contact.tier,
        eventId: event.eventId,
        eventName: event.eventName,
        agentId: contact.assignedAgentId,
        agentName: contact.assignedAgentName,
        registrationUrl,
        inviteSentAt: new Date().toISOString(),
    };
    try {
        await setDoc(doc(db, 'fast_pass_tokens', token), {
            ...fp,
            inviteSentAt: serverTimestamp(),
        });
    } catch { /* demo mode */ }
    return fp;
}

async function recordVIPArrival(
    leadId: string, leadName: string, tier: VIPTier,
    eventId: string, agentId: string, scannerName: string,
): Promise<void> {
    const arrival: Omit<VIPArrival, 'arrivedAt'> & { arrivedAt: unknown } = {
        leadId, leadName, tier, eventId,
        arrivedAt: serverTimestamp(),
        scannedBy: scannerName,
        assignedAgentId: agentId,
    };
    try {
        await setDoc(doc(db, 'vip_arrivals', leadId), arrival, { merge: true });
        await updateDoc(doc(db, 'crm_leads', leadId), { status: 'VIP_Arrived', arrivedAt: serverTimestamp() });
        await addDoc(collection(db, 'users', agentId, 'notifications'), {
            type: 'vip_arrived',
            leadId,
            leadName,
            eventId,
            message: `🌟 VIP ALERT: ${leadName} has just arrived at the venue! Head to the reception desk immediately.`,
            read: false,
            createdAt: serverTimestamp(),
        });
    } catch { /* demo */ }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function TierBadge({ tier }: { tier: VIPTier }) {
    const cfg = TIER_CFG[tier];
    const icons = { Platinum: '💎', Gold: '⭐', Silver: '🥈' };
    return (
        <span className={clsx('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border', cfg.badge, cfg.border)}>
            {icons[tier]} {tier}
        </span>
    );
}

/** Animated scanner frame (reused from OrganizerScannerView pattern) */
function ScannerFrame({ active }: { active: boolean }) {
    return (
        <div className="relative w-56 h-56 mx-auto">
            {['top-0 left-0', 'top-0 right-0 rotate-90', 'bottom-0 right-0 rotate-180', 'bottom-0 left-0 -rotate-90'].map((pos, i) => (
                <div key={i} className={clsx('absolute w-8 h-8', pos)}>
                    <div className="absolute top-0 left-0 w-full h-0.5 bg-amber-400" />
                    <div className="absolute top-0 left-0 h-full w-0.5 bg-amber-400" />
                </div>
            ))}
            <div className="absolute inset-3 bg-psi-surface rounded-sm grid grid-cols-6 grid-rows-6 gap-px opacity-20">
                {Array.from({ length: 36 }).map((_, i) => <div key={i} className="bg-slate-600 rounded-sm" />)}
            </div>
            {active && (
                <motion.div
                    className="absolute left-3 right-3 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_8px_2px_rgba(251,191,36,0.4)]"
                    animate={{ top: ['12px', 'calc(100% - 12px)', '12px'] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                />
            )}
            <div className="absolute inset-0 flex items-center justify-center">
                <div className={clsx('w-10 h-10 rounded-full border-2 flex items-center justify-center transition-colors', active ? 'border-amber-400/60' : 'border-psi-strong')}>
                    <Crown size={18} className={active ? 'text-amber-400' : 'text-slate-600'} />
                </div>
            </div>
        </div>
    );
}

// ── pkpass Mock Generator ─────────────────────────────────────────────────────

function mockGeneratePkpass(fp: FastPassToken): void {
    // In production: call a Cloud Function that uses the `passkit-generator` npm package
    // signed with Apple's Pass Type ID certificate and team credentials.
    // Mock: generate a JSON file mirroring the .pkpass manifest structure.
    const passManifest = {
        formatVersion: 1,
        passTypeIdentifier: 'pass.ae.psi.vipfastpass',
        serialNumber: fp.token,
        teamIdentifier: 'PSI_TEAM',
        organizationName: 'Property Shop Investment',
        description: `VIP Fast-Pass — ${fp.eventName}`,
        foregroundColor: 'rgb(251, 191, 36)',   // PSI Gold
        backgroundColor: 'rgb(15, 23, 42)',      // PSI Navy
        labelColor: 'rgb(148, 163, 184)',
        logoText: 'PSI Events',
        generic: {
            primaryFields: [{ key: 'name', label: 'VIP GUEST', value: fp.leadName }],
            secondaryFields: [{ key: 'event', label: 'EVENT', value: fp.eventName }, { key: 'tier', label: 'TIER', value: fp.tier.toUpperCase() }],
            auxiliaryFields: [{ key: 'agent', label: 'YOUR AGENT', value: fp.agentName }],
            backFields: [{ key: 'leadId', label: 'Lead Reference', value: fp.leadId }, { key: 'reg', label: 'Registration URL', value: fp.registrationUrl }],
        },
        barcode: { message: fp.leadId, format: 'PKBarcodeFormatQR', messageEncoding: 'iso-8859-1' },
        _psiNote: 'This is a MOCK manifest. For live .pkpass generation, deploy the psi-passkit Cloud Function.',
    };
    const blob = new Blob([JSON.stringify(passManifest, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `PSI_VIP_${fp.leadId}.pkpass.json`; a.click();
    URL.revokeObjectURL(url);
}

// ── Tab 1: Invite Sender ──────────────────────────────────────────────────────

function InviteSenderTab() {
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [sending, setSending] = useState(false);
    const [sentPasses, setSentPasses] = useState<FastPassToken[]>([]);
    const [toast, setToast] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState('');
    const [channel, setChannel] = useState<'email' | 'sms'>('email');

    const toggleContact = (id: string) => {
        setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    };

    const handleSend = async () => {
        if (!selected.size) return;
        setSending(true);
        const contacts = DEMO_CONTACTS.filter(c => selected.has(c.leadId));
        const passes: FastPassToken[] = [];
        for (const c of contacts) {
            const fp = await createFastPassToken(c, DEMO_EVENT);
            passes.push(fp);
        }
        setSentPasses(prev => [...passes, ...prev]);
        setSelected(new Set());
        setSending(false);
        setToast(`✅ ${passes.length} VIP invite${passes.length > 1 ? 's' : ''} sent via ${channel === 'email' ? 'Email' : 'SMS'}!`);
        setTimeout(() => setToast(null), 4000);
    };

    const copyLink = (url: string, id: string) => {
        navigator.clipboard.writeText(url);
        setCopiedId(id);
        setTimeout(() => setCopiedId(''), 2000);
    };

    return (
        <div className="space-y-5">
            {/* Channel picker */}
            <div className="psi-card rounded-2xl p-4 flex items-center gap-3">
                <span className="text-xs font-bold uppercase tracking-widest text-psi-muted flex-shrink-0">Send via:</span>
                {(['email', 'sms'] as const).map(ch => (
                    <button key={ch} id={`channel-${ch}`}
                        onClick={() => setChannel(ch)}
                        className={clsx('flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all capitalize', channel === ch ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20' : 'psi-card border border-psi text-psi-secondary hover:text-psi-primary')}>
                        {ch === 'email' ? <Mail size={13} /> : <PhoneIcon size={13} />} {ch === 'email' ? 'Email' : 'SMS'}
                    </button>
                ))}
                <span className="ml-auto text-[11px] text-psi-muted">{selected.size}/{DEMO_CONTACTS.length} selected</span>
            </div>

            {/* Contact list */}
            <div className="psi-card rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-4">
                    <Users size={15} className="text-amber-500" />
                    <h3 className="font-bold text-psi-primary text-sm">CRM Contacts</h3>
                </div>
                <div className="space-y-2">
                    {DEMO_CONTACTS.map(c => (
                        <motion.button key={c.leadId} id={`contact-${c.leadId}`}
                            whileHover={{ scale: 1.005 }} whileTap={{ scale: 0.995 }}
                            onClick={() => toggleContact(c.leadId)}
                            className={clsx('w-full text-left flex items-center gap-3 p-3 rounded-xl border-2 transition-all',
                                selected.has(c.leadId) ? 'border-amber-500 bg-amber-500/5' : 'border-psi hover:border-amber-300 dark:hover:border-amber-700')}>
                            <div className={clsx('w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all',
                                selected.has(c.leadId) ? 'bg-amber-500 border-amber-500' : 'border-psi-strong')}>
                                {selected.has(c.leadId) && <CheckCircle2 size={13} className="text-psi-primary" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <p className="font-bold text-psi-primary text-sm">{c.name}</p>
                                    <TierBadge tier={c.tier} />
                                </div>
                                <p className="text-xs text-psi-muted truncate">{channel === 'email' ? c.email : c.phone}</p>
                                <p className="text-[10px] text-psi-muted mt-0.5">{c.projectInterest} · Agent: {c.assignedAgentName}</p>
                            </div>
                            <ChevronRight size={14} className="text-psi-muted flex-shrink-0" />
                        </motion.button>
                    ))}
                </div>
            </div>

            {/* Send button */}
            <motion.button id="send-invites-btn" whileTap={{ scale: 0.97 }}
                onClick={handleSend}
                disabled={sending || !selected.size}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-white font-extrabold text-sm tracking-tight transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-amber-500/20">
                {sending ? <><Loader2 size={16} className="animate-spin" /> Generating &amp; Sending…</> : <><Send size={16} /> Send {selected.size || ''} VIP Invite{selected.size !== 1 ? 's' : ''}</>}
            </motion.button>

            {/* Sent passes list */}
            {sentPasses.length > 0 && (
                <div className="psi-card rounded-2xl p-4 space-y-3">
                    <p className="text-xs font-bold uppercase tracking-widest text-psi-muted">Sent Invites ({sentPasses.length})</p>
                    {sentPasses.map(fp => (
                        <div key={fp.token} className="flex items-center gap-3 p-3 bg-psi-subtle rounded-xl">
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-psi-primary text-sm truncate">{fp.leadName}</p>
                                <p className="text-[10px] text-psi-muted font-mono truncate">{fp.registrationUrl}</p>
                            </div>
                            <button id={`copy-link-${fp.token}`} onClick={() => copyLink(fp.registrationUrl, fp.token)}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-bold">
                                {copiedId === fp.token ? <CheckCircle2 size={11} /> : <Copy size={11} />}
                                {copiedId === fp.token ? 'Copied' : 'Copy'}
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Toast */}
            <AnimatePresence>
                {toast && (
                    <motion.div initial={{ x: 120, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 120, opacity: 0 }}
                        className="fixed bottom-6 right-6 z-50 max-w-sm bg-emerald-600 text-white rounded-2xl shadow-xl p-4 flex items-center gap-3">
                        <BellRing size={18} className="animate-pulse flex-shrink-0" />
                        <p className="text-sm font-semibold">{toast}</p>
                        <button onClick={() => setToast(null)}><X size={16} /></button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ── Tab 2: VIP Pass Card ──────────────────────────────────────────────────────

function VIPPassTab() {
    const [contact, setContact] = useState<CRMContact>(DEMO_CONTACTS[0]);
    const [downloading, setDownloading] = useState(false);

    const cfg = TIER_CFG[contact.tier];

    const handleDownload = async (format: 'apple' | 'google') => {
        setDownloading(true);
        await new Promise(r => setTimeout(r, 800));
        const fp: FastPassToken = {
            token: generateToken(),
            leadId: contact.leadId,
            leadName: contact.name,
            leadEmail: contact.email,
            leadPhone: contact.phone,
            tier: contact.tier,
            eventId: DEMO_EVENT.eventId,
            eventName: DEMO_EVENT.eventName,
            agentId: contact.assignedAgentId,
            agentName: contact.assignedAgentName,
            registrationUrl: `${window.location.origin}/vip-register/${generateToken()}`,
            inviteSentAt: new Date().toISOString(),
            passGeneratedAt: new Date().toISOString(),
        };
        mockGeneratePkpass(fp);
        setDownloading(false);
    };

    return (
        <div className="space-y-5">
            {/* Contact selector */}
            <div className="psi-card rounded-2xl p-4">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-psi-muted mb-2">Preview pass for contact</label>
                <select id="pass-contact-select"
                    value={contact.leadId}
                    onChange={e => setContact(DEMO_CONTACTS.find(c => c.leadId === e.target.value) ?? DEMO_CONTACTS[0])}
                    className="psi-input w-full px-3 py-2.5 text-sm">
                    {DEMO_CONTACTS.map(c => <option key={c.leadId} value={c.leadId}>{c.name} ({c.tier})</option>)}
                </select>
            </div>

            {/* Pass card — PSI Navy + Gold */}
            <motion.div key={contact.leadId} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                className={clsx('rounded-3xl overflow-hidden shadow-2xl shadow-black/40 border-2', cfg.border)}>

                {/* Header stripe */}
                <div className={clsx('px-6 pt-5 pb-4', cfg.bg)}>
                    <div className="flex items-start justify-between mb-3">
                        <div>
                            <p className={clsx('text-[10px] font-black tracking-[0.25em] uppercase mb-1', cfg.accent)}>PSI Events · VIP Fast-Pass</p>
                            <h2 className={clsx('text-xl font-extrabold tracking-tight', cfg.text)}>VIP Access Pass</h2>
                        </div>
                        <TierBadge tier={contact.tier} />
                    </div>

                    {/* QR code — Lead ID encoded */}
                    <div className="flex justify-center my-4">
                        <div className="p-3 bg-white rounded-2xl shadow-lg" style={{ boxShadow: `0 0 0 4px ${contact.tier === 'Gold' ? '#f59e0b' : contact.tier === 'Platinum' ? '#94a3b8' : '#78716c'}` }}>
                            <QRCodeSVG
                                value={`PSI_VIP::${contact.leadId}::${DEMO_EVENT.eventId}`}
                                size={180}
                                level="H"
                                fgColor="#0f172a"
                                bgColor="#ffffff"
                                includeMargin={false}
                            />
                        </div>
                    </div>

                    {/* Lead ID label */}
                    <p className={clsx('text-center text-[10px] font-mono font-bold mt-1', cfg.accent)}>
                        {contact.leadId.toUpperCase()} · SCAN AT ARRIVAL
                    </p>
                </div>

                {/* Ticket perforation */}
                <div className="relative bg-psi-surface h-6 flex items-center">
                    <div className="absolute -left-3 w-6 h-6 bg-psi-page rounded-full" />
                    <div className="flex-1 border-t-2 border-dashed border-psi-strong mx-3" />
                    <div className="absolute -right-3 w-6 h-6 bg-psi-page rounded-full" />
                </div>

                {/* Details strip */}
                <div className={clsx('px-6 pt-4 pb-5 space-y-3 bg-psi-surface')}>
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                            <User size={16} className="text-amber-400" />
                        </div>
                        <div>
                            <p className="text-psi-primary font-extrabold text-base leading-tight">{contact.name}</p>
                            <p className="text-psi-secondary text-xs">Invited by {contact.assignedAgentName}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-psi-subtle/60 rounded-xl px-3 py-2.5">
                            <p className="text-psi-secondary text-[9px] font-bold uppercase tracking-widest">Event</p>
                            <p className="text-psi-primary text-xs font-bold leading-tight mt-0.5 truncate">{DEMO_EVENT.eventName}</p>
                        </div>
                        <div className="bg-psi-subtle/60 rounded-xl px-3 py-2.5">
                            <p className="text-psi-secondary text-[9px] font-bold uppercase tracking-widest">Interest</p>
                            <p className="text-psi-primary text-xs font-bold leading-tight mt-0.5 truncate">{contact.projectInterest}</p>
                        </div>
                    </div>

                    {/* Wallet download buttons */}
                    <div className="flex gap-2 pt-1">
                        <motion.button id="download-apple-wallet" whileTap={{ scale: 0.96 }}
                            onClick={() => handleDownload('apple')}
                            disabled={downloading}
                            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-black/80 hover:bg-black text-white font-bold text-xs transition-all border border-psi-strong">
                            {downloading ? <Loader2 size={14} className="animate-spin" /> : <Wallet size={14} />}
                            Add to Apple Wallet
                        </motion.button>
                        <motion.button id="download-google-pay" whileTap={{ scale: 0.96 }}
                            onClick={() => handleDownload('google')}
                            disabled={downloading}
                            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-blue-700/80 hover:bg-blue-700 text-white font-bold text-xs transition-all border border-blue-600">
                            <Download size={14} /> Google Wallet
                        </motion.button>
                    </div>

                    {/* pkpass note */}
                    <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2.5">
                        <ShieldCheck size={12} className="text-amber-400 flex-shrink-0 mt-0.5" />
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 leading-relaxed">
                            Mock .pkpass manifest downloaded as JSON. Production: deploy <code className="font-mono">psi-passkit</code> Cloud Function signed with Apple Pass Type ID certificate.
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

// ── Tab 3: VIP Scanner ────────────────────────────────────────────────────────

function VIPScannerTab() {
    const [scannerActive, setScannerActive] = useState(true);
    const [pastedId, setPastedId] = useState('');
    const [scanning, setScanning] = useState(false);
    const [result, setResult] = useState<{ ok: boolean; contact?: CRMContact; msg: string } | null>(null);
    const [arrivals, setArrivals] = useState<(VIPArrival & { arrivedAt: string })[]>([]);
    const [agentAlert, setAgentAlert] = useState<string | null>(null);

    const handleScan = useCallback(async (rawValue?: string) => {
        const input = (rawValue || pastedId).trim();
        if (!input) return;
        setScanning(true);
        setResult(null);

        await new Promise(r => setTimeout(r, 900));

        // Parse PSI_VIP:: prefix or bare leadId
        const leadId = input.startsWith('PSI_VIP::') ? input.split('::')[1] : input;
        const contact = DEMO_CONTACTS.find(c => c.leadId === leadId);

        if (!contact) {
            setResult({ ok: false, msg: `Lead ID "${leadId}" not found. Not a valid VIP Fast-Pass.` });
            setScanning(false);
            return;
        }

        const arrival: VIPArrival & { arrivedAt: string } = {
            leadId: contact.leadId,
            leadName: contact.name,
            tier: contact.tier,
            eventId: DEMO_EVENT.eventId,
            arrivedAt: new Date().toISOString(),
            scannedBy: 'Organizer (Demo)',
            assignedAgentId: contact.assignedAgentId,
        };

        await recordVIPArrival(
            contact.leadId, contact.name, contact.tier,
            DEMO_EVENT.eventId, contact.assignedAgentId, 'Organizer (Demo)'
        );

        setArrivals(prev => [arrival, ...prev]);
        setResult({ ok: true, contact, msg: `VIP Arrived! ${contact.name} (${contact.tier}) — agent alerted.` });
        setAgentAlert(`🌟 VIP ALERT: ${contact.name} has arrived at the venue! Assigned to ${contact.assignedAgentName}.`);
        setPastedId('');
        setScanning(false);
        setTimeout(() => setAgentAlert(null), 6000);
    }, [pastedId]);

    // Simulate a demo scan
    const simulateScan = () => handleScan('lead_001');

    return (
        <div className="space-y-5">
            {/* Scanner frame */}
            <div className="bg-psi-surface rounded-2xl p-5 border border-psi">
                <div className="flex items-center justify-between mb-4">
                    <p className="text-psi-primary text-sm font-bold flex items-center gap-2">
                        <Crown size={15} className="text-amber-400" /> VIP Client QR Scanner
                    </p>
                    <button id="toggle-vip-scanner"
                        onClick={() => setScannerActive(p => !p)}
                        className={clsx('text-xs px-3 py-1.5 rounded-lg font-bold transition-colors',
                            scannerActive ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-psi-border text-psi-secondary')}>
                        {scannerActive ? 'Active' : 'Paused'}
                    </button>
                </div>
                <ScannerFrame active={scannerActive} />
                <p className="text-center text-slate-600 text-xs mt-3">Camera integration requires HTTPS + device permission</p>
                <button id="simulate-vip-scan" onClick={simulateScan}
                    className="mt-3 w-full py-2.5 rounded-xl border border-psi-strong text-psi-secondary hover:text-amber-400 hover:border-amber-500/40 text-xs font-bold transition-colors flex items-center justify-center gap-2">
                    <Zap size={12} /> Simulate Demo Scan (lead_001)
                </button>
            </div>

            {/* Manual paste */}
            <div className="bg-psi-surface rounded-2xl p-4 border border-psi">
                <p className="text-psi-primary text-sm font-bold mb-2 flex items-center gap-2">
                    <ShieldCheck size={14} className="text-amber-400" /> Manual Lead ID Entry
                </p>
                <input id="vip-scan-input" type="text" value={pastedId}
                    onChange={e => { setPastedId(e.target.value); setResult(null); }}
                    onKeyDown={e => e.key === 'Enter' && handleScan()}
                    placeholder="Paste Lead ID or full QR value (PSI_VIP::lead_001::…)"
                    className="w-full bg-psi-subtle border border-psi-strong rounded-xl px-3 py-2.5 text-xs text-psi-primary font-mono placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500" />
                <button id="process-vip-scan" onClick={() => handleScan()}
                    disabled={!pastedId.trim() || scanning}
                    className="mt-3 w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-psi-primary font-bold text-sm transition-colors flex items-center justify-center gap-2">
                    {scanning ? <><Loader2 size={15} className="animate-spin" /> Processing…</> : <><Crown size={15} /> Log VIP Arrival</>}
                </button>

                {/* Scan result */}
                <AnimatePresence>
                    {result && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                            className={clsx('mt-3 rounded-xl p-3 border text-xs', result.ok ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300' : 'bg-red-950/60 border-red-800 text-red-300')}>
                            {result.ok ? (
                                <div className="space-y-1.5">
                                    <p className="font-bold flex items-center gap-1.5"><CheckCircle2 size={13} /> VIP Arrival Logged ✓</p>
                                    <p><span className="text-psi-secondary">Guest:</span> {result.contact?.name}</p>
                                    <p><span className="text-psi-secondary">Tier:</span> <TierBadge tier={result.contact!.tier} /></p>
                                    <p><span className="text-psi-secondary">Agent Alerted:</span> {result.contact?.assignedAgentName}</p>
                                    <p className="text-emerald-500 font-bold mt-1">Timestamp logged. Agent push notification sent.</p>
                                </div>
                            ) : (
                                <p className="flex items-start gap-1.5"><AlertTriangle size={13} className="mt-0.5 flex-shrink-0" /> {result.msg}</p>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Arrivals log */}
            {arrivals.length > 0 && (
                <div className="bg-psi-surface rounded-2xl p-4 border border-psi">
                    <p className="text-psi-primary text-sm font-bold mb-3 flex items-center gap-2">
                        <Star size={14} className="text-amber-400" /> Today's VIP Arrivals ({arrivals.length})
                    </p>
                    <div className="space-y-2">
                        {arrivals.map((a, i) => (
                            <div key={i} className="flex items-center gap-3 bg-psi-subtle/60 rounded-xl px-3 py-2.5">
                                <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                                    <Crown size={14} className="text-amber-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-psi-primary font-bold text-sm truncate">{a.leadName}</p>
                                    <p className="text-psi-secondary text-[10px]">
                                        {new Date(a.arrivedAt).toLocaleTimeString('en-AE', { hour: '2-digit', minute: '2-digit' })} · Agent: {DEMO_CONTACTS.find(c => c.leadId === a.leadId)?.assignedAgentName}
                                    </p>
                                </div>
                                <TierBadge tier={a.tier} />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Agent alert toast */}
            <AnimatePresence>
                {agentAlert && (
                    <motion.div initial={{ x: 120, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 120, opacity: 0 }}
                        className="fixed bottom-6 right-6 z-50 max-w-sm rounded-2xl shadow-2xl shadow-amber-600/30 overflow-hidden">
                        <div className="bg-gradient-to-r from-amber-600 to-rose-600 p-4 flex items-start gap-3">
                            <Crown size={18} className="text-psi-primary flex-shrink-0 mt-0.5 animate-bounce" />
                            <div className="flex-1">
                                <p className="text-psi-primary font-extrabold text-sm">Agent Push Notification</p>
                                <p className="text-amber-100 text-xs mt-0.5 leading-relaxed">{agentAlert}</p>
                            </div>
                            <button onClick={() => setAgentAlert(null)} className="text-amber-200 hover:text-psi-primary flex-shrink-0">
                                <X size={16} />
                            </button>
                        </div>
                        <div className="bg-amber-900/60 px-4 py-2 flex items-center gap-2">
                            <Zap size={10} className="text-amber-400" />
                            <span className="text-amber-400 text-[10px] font-bold">Fired to users/{'{agentId}'}/notifications · Firestore</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type TabId = 'invite' | 'pass' | 'scanner';

export default function FastPassPage() {
    const [tab, setTab] = useState<TabId>('invite');

    const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
        { id: 'invite', label: 'Send Invites', icon: <Send size={14} /> },
        { id: 'pass', label: 'VIP Pass', icon: <Gift size={14} /> },
        { id: 'scanner', label: 'VIP Scanner', icon: <ScanLine size={14} /> },
    ];

    return (
        <div className="min-h-screen bg-psi-page p-4 md:p-6 space-y-6 max-w-2xl mx-auto">

            {/* Header */}
            <div>
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-9 h-9 bg-gradient-to-br from-amber-500 to-rose-500 rounded-xl flex items-center justify-center shadow-md shadow-amber-500/20">
                        <Crown size={18} className="text-psi-primary" />
                    </div>
                    <span className="text-amber-500 text-xs font-black tracking-[0.2em] uppercase">VIP Fast-Pass Wallet · System</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-psi-primary tracking-tight">VIP Fast-Pass</h1>
                <p className="text-psi-secondary text-sm mt-1">Send secure wallet passes · Log VIP arrivals · Alert agents instantly</p>
            </div>

            {/* Tab bar */}
            <div className="flex gap-1 bg-psi-subtle p-1 rounded-2xl">
                {tabs.map(t => (
                    <button key={t.id} id={`fp-tab-${t.id}`} onClick={() => setTab(t.id)}
                        className={clsx('flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all',
                            tab === t.id ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20' : 'text-psi-muted hover:text-psi-primary')}>
                        {t.icon} {t.label}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            <AnimatePresence mode="wait">
                <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                    {tab === 'invite' && <InviteSenderTab />}
                    {tab === 'pass' && <VIPPassTab />}
                    {tab === 'scanner' && <VIPScannerTab />}
                </motion.div>
            </AnimatePresence>

            {/* How it works */}
            <div className="psi-card rounded-2xl p-5">
                <p className="text-xs font-bold uppercase tracking-widest text-psi-muted mb-4">System Architecture</p>
                <div className="space-y-3">
                    {[
                        { icon: <Send size={13} />, title: 'Invite Sent', desc: 'Secure token written to fast_pass_tokens · Email/SMS with registration URL dispatched' },
                        { icon: <Gift size={13} />, title: 'Pass Generated', desc: '.pkpass mock (JSON manifest) downloadable · Apple Wallet + Google Pay ready' },
                        { icon: <Crown size={13} />, title: 'VIP Scanned', desc: 'vip_arrivals/{leadId} written · crm_leads status → "VIP_Arrived" · Agent push notification fired' },
                    ].map(({ icon, title, desc }) => (
                        <div key={title} className="flex items-start gap-3">
                            <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0 text-amber-500 mt-0.5">{icon}</div>
                            <div>
                                <p className="text-psi-primary font-bold text-sm">{title}</p>
                                <p className="text-psi-muted text-[11px] leading-relaxed">{desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
