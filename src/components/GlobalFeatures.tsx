/**
 * GlobalFeatures.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Three globally-mounted UI overlays for the PSI Event Portal:
 *
 *  1. <CommandPalette>      ⌘K / Ctrl+K — quick navigation + search
 *  2. <NotificationPanel>   Bell icon with unread badge + slide-in panel
 *  3. <AIChatAssistant>    Floating AI help button + slide-up chat
 *
 * All are self-contained; drop <GlobalFeatures /> into any layout to activate.
 * They share a single useGlobalFeatures() context so triggering one closes others.
 */

import React, {
    createContext, useCallback, useContext, useEffect,
    useRef, useState,
} from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Search, Command, LayoutDashboard, Calendar, FileText,
    BarChart3, Users, Calculator, QrCode, Zap, Crown,
    Flame, Gift, MapIcon as MapIconL, Plane,
    BookOpen, Settings, BrainCircuit,
    X, Bell, BellRing, Sparkles, MessageSquare,
    Send, ChevronRight, ArrowRight, Loader2,
    AlertCircle, CheckCircle2, Clock, Info,
    Radio, Wallet, MessageCircle,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════
// Context
// ═══════════════════════════════════════════════════════════════════

interface GlobalContextValue {
    cmdOpen: boolean;
    setCmdOpen: (v: boolean) => void;
    notifOpen: boolean;
    setNotifOpen: (v: boolean) => void;
    chatOpen: boolean;
    setChatOpen: (v: boolean) => void;
    unreadCount: number;
}

const GlobalContext = createContext<GlobalContextValue>({
    cmdOpen: false, setCmdOpen: () => { },
    notifOpen: false, setNotifOpen: () => { },
    chatOpen: false, setChatOpen: () => { },
    unreadCount: 0,
});

export function useGlobalFeatures() { return useContext(GlobalContext); }

// ═══════════════════════════════════════════════════════════════════
// Notification data (mock — wire to Firestore in production)
// ═══════════════════════════════════════════════════════════════════

type NotifType = 'info' | 'success' | 'warning' | 'alert';

interface AppNotification {
    id: string;
    type: NotifType;
    title: string;
    body: string;
    relativeTime: string;
    read: boolean;
    link?: string;
}

const MOCK_NOTIFS: AppNotification[] = [
    { id: 'n1', type: 'alert', title: 'VIP Alert — Zone B overflow', body: 'Omar Bin Rashid has been redeployed to the VIP Lounge to manage client surge.', relativeTime: '2m ago', read: false, link: '/traffic-controller' },
    { id: 'n2', type: 'success', title: 'Advance Request Approved', body: 'Nour Al-Hamdan\'s AED 29,400 commission advance has been approved by Mohammed Al-Qubaisi.', relativeTime: '18m ago', read: false, link: '/cash-advance' },
    { id: 'n3', type: 'warning', title: 'Document Deadline in 48h', body: '3 agents have not yet uploaded their flight details for the London Luxury Expo.', relativeTime: '1h ago', read: false, link: '/check-in' },
    { id: 'n4', type: 'info', title: 'New VIP — Platinum inbound', body: 'Li Wei (Sunrise Investment HK) has arrived. VIP Concierge alert dispatched to Sara Al-Marzouqi.', relativeTime: '1h ago', read: true, link: '/vip-concierge' },
    { id: 'n5', type: 'success', title: 'Follow-Up Sent', body: 'Khalid Al-Mansouri sent a WhatsApp follow-up to Alexander Rubin (Mamsha Al Saadiyat).', relativeTime: '2h ago', read: true, link: '/follow-up-copilot' },
    { id: 'n6', type: 'info', title: 'Settlement Report Ready', body: 'London Luxury Expo final settlement report has been generated. Top earner: Nour Al-Hamdan.', relativeTime: '3h ago', read: true, link: '/settlement' },
];

const NOTIF_CONFIG: Record<NotifType, { icon: React.ReactNode; color: string; bg: string }> = {
    info: { icon: <Info size={14} />, color: 'text-blue-400', bg: 'bg-blue-500/15' },
    success: { icon: <CheckCircle2 size={14} />, color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
    warning: { icon: <AlertCircle size={14} />, color: 'text-amber-400', bg: 'bg-amber-500/15' },
    alert: { icon: <BellRing size={14} />, color: 'text-rose-400', bg: 'bg-rose-500/15' },
};

// ═══════════════════════════════════════════════════════════════════
// Command palette routes
// ═══════════════════════════════════════════════════════════════════

interface CmdItem {
    id: string;
    label: string;
    description?: string;
    path: string;
    icon: React.ReactNode;
    group: string;
    keywords: string[];
}

const CMD_ITEMS: CmdItem[] = [
    { id: 'dashboard', label: 'Dashboard', description: 'Performance overview & KPIs', path: '/', icon: <LayoutDashboard size={16} />, group: 'Main', keywords: ['home', 'overview', 'kpi'] },
    { id: 'events', label: 'Events', description: 'Manage roadshows & events', path: '/events', icon: <Calendar size={16} />, group: 'Main', keywords: ['roadshow', 'calendar'] },
    { id: 'analytics', label: 'Analytics', description: 'ROI, P&L & predictive reports', path: '/analytics', icon: <BarChart3 size={16} />, group: 'Main', keywords: ['roi', 'report', 'profit'] },
    { id: 'settlement', label: 'Commission Settlement', description: 'Generate payout reports', path: '/settlement', icon: <Calculator size={16} />, group: 'Finance', keywords: ['commission', 'payout', 'money'] },
    { id: 'cash-advance', label: 'Commission Advance', description: 'Request or approve early draws', path: '/cash-advance', icon: <Wallet size={16} />, group: 'Finance', keywords: ['advance', 'draw', 'cash'] },
    { id: 'check-in', label: 'Check-In', description: 'QR code agent check-in system', path: '/check-in', icon: <QrCode size={16} />, group: 'Operations', keywords: ['qr', 'scan', 'gate'] },
    { id: 'vip-intercept', label: 'VIP Intercept', description: 'Front desk VIP assignment', path: '/vip-intercept', icon: <Crown size={16} />, group: 'Operations', keywords: ['vip', 'client', 'luxury'] },
    { id: 'vip-concierge', label: 'VIP Concierge', description: 'WhatsApp message dispatch centre', path: '/vip-concierge', icon: <MessageCircle size={16} />, group: 'Operations', keywords: ['whatsapp', 'concierge', 'dispatch'] },
    { id: 'traffic', label: 'Traffic Controller', description: 'Floor plan agent zone manager', path: '/traffic-controller', icon: <Radio size={16} />, group: 'Operations', keywords: ['floor', 'zone', 'map', 'drag'] },
    { id: 'follow-up', label: 'Follow-Up Copilot', description: 'AI WhatsApp follow-up drafts', path: '/follow-up-copilot', icon: <Sparkles size={16} />, group: 'AI Tools', keywords: ['ai', 'message', 'lead', 'gemini'] },
    { id: 'approvals', label: 'AI Approvals', description: 'AI-powered expense approvals', path: '/approvals', icon: <BrainCircuit size={16} />, group: 'AI Tools', keywords: ['ai', 'approve', 'expense'] },
    { id: 'bounties', label: 'Bounties', description: 'Performance bounty system', path: '/bounties', icon: <Zap size={16} />, group: 'Gamification', keywords: ['reward', 'incentive'] },
    { id: 'burn-rate', label: 'Burn Rate', description: 'Live event expense tracker', path: '/burn-rate', icon: <Flame size={16} />, group: 'Finance', keywords: ['expense', 'budget', 'cost'] },
    { id: 'proposals', label: 'Proposals', description: 'Client proposal management', path: '/proposals', icon: <FileText size={16} />, group: 'Main', keywords: ['proposal', 'client', 'document'] },
    { id: 'projects', label: 'Projects', description: 'Real estate project directory', path: '/projects', icon: <Gift size={16} />, group: 'Main', keywords: ['property', 'project', 'listing'] },
    { id: 'team', label: 'Team', description: 'Agent & staff directory', path: '/team', icon: <Users size={16} />, group: 'Main', keywords: ['agent', 'staff', 'people'] },
    { id: 'travel-desk', label: 'Travel Desk', description: 'Flights, hotels & logistics', path: '/travel-desk', icon: <Plane size={16} />, group: 'Logistics', keywords: ['flight', 'hotel', 'travel', 'booking'] },
    { id: 'heatmap', label: 'Floor Heatmap', description: 'Visitor density map', path: '/floorplan-heatmap', icon: <MapIconL size={16} />, group: 'Logistics', keywords: ['heat', 'map', 'floor', 'density'] },
    { id: 'manual', label: 'System Manual', description: 'Lifecycle guide & documentation', path: '/manual', icon: <BookOpen size={16} />, group: 'Help', keywords: ['guide', 'help', 'doc', 'manual'] },
    { id: 'settings', label: 'Settings', description: 'App preferences & configuration', path: '/settings', icon: <Settings size={16} />, group: 'Help', keywords: ['config', 'preference', 'setup'] },
];

// ═══════════════════════════════════════════════════════════════════
// AI Knowledge base
// ═══════════════════════════════════════════════════════════════════

interface ChatMsg {
    role: 'user' | 'ai';
    content: string;
    links?: { label: string; path: string }[];
}

async function mockAIResponse(question: string): Promise<{ content: string; links?: { label: string; path: string }[] }> {
    await new Promise(r => setTimeout(r, 900));
    const q = question.toLowerCase();

    if (q.includes('check') && (q.includes('in') || q.includes('qr'))) return {
        content: 'To check in agents, go to **Check-In** and use the QR Scanner. Each agent shows their digital pass QR code (valid 24h). Scanning sets their status to `physically_present`, which unlocks lead distribution.',
        links: [{ label: 'Open Check-In', path: '/check-in' }],
    };
    if (q.includes('commission') && q.includes('advance')) return {
        content: 'Agents can request up to **50% of their locked commission** early via the Commission Advance page. A standard 2% fee applies. Branch Managers review and approve requests in real-time.',
        links: [{ label: 'Commission Advance', path: '/cash-advance' }],
    };
    if (q.includes('settle') || q.includes('payout')) return {
        content: 'Go to **Commission Settlement** → add agents to the roster with their closed revenue → assign a Gold/Silver/Bronze tier → click "Generate Final Settlement Report". The report is locked and printable.',
        links: [{ label: 'Settlement Engine', path: '/settlement' }],
    };
    if (q.includes('vip') || q.includes('luxury') || q.includes('client')) return {
        content: 'For VIP clients on the floor, use **VIP Intercept** for front-desk assignments, or the **VIP Concierge** for WhatsApp message dispatch. Drag agent badges in the **Traffic Controller** to redeploy to the VIP Lounge instantly.',
        links: [
            { label: 'VIP Intercept', path: '/vip-intercept' },
            { label: 'VIP Concierge', path: '/vip-concierge' },
            { label: 'Traffic Controller', path: '/traffic-controller' },
        ],
    };
    if (q.includes('follow') || q.includes('whatsapp') || q.includes('message') || q.includes('lead')) return {
        content: 'After the event, go to **Follow-Up Copilot**. Select a lead from your inbox → Gemini AI drafts a personalised WhatsApp message based on their project interest and your profile → tap "Send via WhatsApp" to open the pre-filled chat.',
        links: [{ label: 'Follow-Up Copilot', path: '/follow-up-copilot' }],
    };
    if (q.includes('traffic') || q.includes('zone') || q.includes('floor')) return {
        content: 'The **Traffic Controller** shows a live floor map of all zones (Zone A, Zone B, VIP Lounge, Reception, Overflow). **Drag and drop** agent badges between zones — this instantly sends a push notification to the agent\'s device.',
        links: [{ label: 'Traffic Controller', path: '/traffic-controller' }],
    };
    if (q.includes('analytics') || q.includes('roi') || q.includes('report') || q.includes('p&l')) return {
        content: 'The **Analytics** page shows real-time P&L, lead funnel, and ROI breakdown. You can also generate an **AI Executive Debrief** for completed events — a boardroom-ready post-mortem document.',
        links: [
            { label: 'Analytics Dashboard', path: '/analytics' },
            { label: 'Executive Debrief', path: '/executive-debrief' },
        ],
    };
    if (q.includes('travel') || q.includes('flight') || q.includes('hotel')) return {
        content: 'The **Travel Desk** manages all agent logistics — flights, hotels, and visa documents. Non-compliant agents are automatically chased by the 48-hour nudger system.',
        links: [{ label: 'Travel Desk', path: '/travel-desk' }],
    };
    if (q.includes('manual') || q.includes('guide') || q.includes('how')) return {
        content: 'The **System Manual** is a step-by-step lifecycle guide for Before, During, and After the event. It covers every module with screenshots, workflows, and the "why" behind each step.',
        links: [{ label: 'System Manual', path: '/manual' }],
    };
    return {
        content: `I understand you're asking about "${question}". The PSI Event Portal covers the full roadshow lifecycle: **pre-event planning → on-floor operations → post-event settlement**.\n\nUse ⌘K to search for any feature, or ask me about: check-in, VIP clients, commission advance, follow-up messages, traffic control, analytics, or settlement.`,
        links: [{ label: 'System Manual', path: '/manual' }],
    };
}

// ═══════════════════════════════════════════════════════════════════
// 1. Command Palette
// ═══════════════════════════════════════════════════════════════════

function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
    const [query, setQuery] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    useEffect(() => { if (open) { setQuery(''); setTimeout(() => inputRef.current?.focus(), 60); } }, [open]);

    const results = query.trim()
        ? CMD_ITEMS.filter(item => {
            const q = query.toLowerCase();
            return item.label.toLowerCase().includes(q)
                || item.description?.toLowerCase().includes(q)
                || item.keywords.some(k => k.includes(q));
        })
        : CMD_ITEMS;

    const groups = Array.from(new Set(results.map(r => r.group)));

    const handleSelect = (path: string) => { navigate(path); onClose(); };

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (open && e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [open, onClose]);

    return (
        <AnimatePresence>
            {open && (
                <>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96, y: -16 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: -16 }}
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        className="fixed top-[12vh] left-1/2 -translate-x-1/2 w-full max-w-xl z-[81] px-4"
                    >
                        <div className="bg-psi-surface border border-psi rounded-2xl shadow-2xl shadow-black/10 overflow-hidden">
                            {/* Search bar */}
                            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/8">
                                <Search size={16} className="text-psi-muted flex-shrink-0" />
                                <input
                                    ref={inputRef}
                                    id="cmd-palette-input"
                                    value={query}
                                    onChange={e => setQuery(e.target.value)}
                                    placeholder="Search pages, features, actions…"
                                    className="flex-1 bg-transparent text-psi-primary placeholder:text-psi-muted text-sm outline-none"
                                />
                                <kbd className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 bg-white/8 border border-psi rounded text-[10px] text-psi-muted font-mono">
                                    ESC
                                </kbd>
                            </div>

                            {/* Results */}
                            <div className="max-h-[56vh] overflow-y-auto p-2">
                                {groups.length === 0 ? (
                                    <p className="text-psi-muted text-sm text-center py-8">No results for "{query}"</p>
                                ) : groups.map(group => (
                                    <div key={group} className="mb-2">
                                        <p className="px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-psi-muted">{group}</p>
                                        {results.filter(r => r.group === group).map(item => (
                                            <button
                                                key={item.id}
                                                id={`cmd-${item.id}`}
                                                onClick={() => handleSelect(item.path)}
                                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/6 text-left transition-all group"
                                            >
                                                <span className="w-7 h-7 rounded-lg bg-white/6 flex items-center justify-center text-psi-secondary flex-shrink-0 group-hover:text-psi-primary transition-colors">
                                                    {item.icon}
                                                </span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-psi-primary text-sm font-semibold truncate">{item.label}</p>
                                                    {item.description && <p className="text-psi-muted text-[11px] truncate">{item.description}</p>}
                                                </div>
                                                <ChevronRight size={12} className="text-psi-primary/15 flex-shrink-0 group-hover:text-psi-primary/40 transition-colors" />
                                            </button>
                                        ))}
                                    </div>
                                ))}
                            </div>

                            {/* Footer */}
                            <div className="border-t border-white/8 px-4 py-2 flex items-center gap-4 text-[10px] text-psi-muted">
                                <span className="flex items-center gap-1"><kbd className="px-1 bg-white/8 rounded text-[9px] font-mono">↑↓</kbd> navigate</span>
                                <span className="flex items-center gap-1"><kbd className="px-1 bg-white/8 rounded text-[9px] font-mono">↵</kbd> open</span>
                                <span className="flex items-center gap-1"><kbd className="px-1 bg-white/8 rounded text-[9px] font-mono">ESC</kbd> close</span>
                                <span className="ml-auto">{results.length} result{results.length !== 1 ? 's' : ''}</span>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

// ═══════════════════════════════════════════════════════════════════
// 2. Notification Panel
// ═══════════════════════════════════════════════════════════════════

function NotificationPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
    const [notifs, setNotifs] = useState<AppNotification[]>(MOCK_NOTIFS);
    const navigate = useNavigate();

    const markAllRead = () => setNotifs(prev => prev.map(n => ({ ...n, read: true })));
    const unread = notifs.filter(n => !n.read).length;

    return (
        <AnimatePresence>
            {open && (
                <>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[70]" onClick={onClose}
                    />
                    <motion.div
                        initial={{ opacity: 0, x: 20, scale: 0.97 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 20, scale: 0.97 }}
                        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                        className="fixed top-14 right-3 sm:right-4 w-[calc(100vw-1.5rem)] sm:w-96 z-[71] max-h-[80vh] flex flex-col bg-psi-surface border border-psi rounded-2xl shadow-2xl shadow-black/10 overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
                            <div className="flex items-center gap-2">
                                <Bell size={15} className="text-psi-secondary" />
                                <span className="text-psi-primary font-extrabold text-sm">Notifications</span>
                                {unread > 0 && (
                                    <span className="bg-rose-500 text-psi-primary text-[9px] font-black px-1.5 py-0.5 rounded-full">{unread}</span>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                {unread > 0 && (
                                    <button onClick={markAllRead} className="text-psi-muted hover:text-psi-primary text-[10px] font-bold transition-colors">
                                        Mark all read
                                    </button>
                                )}
                                <button onClick={onClose} className="w-7 h-7 rounded-lg bg-white/6 border border-psi flex items-center justify-center text-psi-muted hover:text-psi-primary transition-all">
                                    <X size={12} />
                                </button>
                            </div>
                        </div>

                        {/* Feed */}
                        <div className="flex-1 overflow-y-auto">
                            {notifs.map(n => {
                                const cfg = NOTIF_CONFIG[n.type];
                                return (
                                    <div
                                        key={n.id}
                                        onClick={() => { if (n.link) { navigate(n.link); onClose(); } setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x)); }}
                                        className={`flex items-start gap-3 px-4 py-3 border-b border-psi-subtle cursor-pointer transition-all hover:bg-white/4 ${!n.read ? 'bg-white/3' : ''}`}
                                    >
                                        <div className={`w-7 h-7 rounded-xl ${cfg.bg} ${cfg.color} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                                            {cfg.icon}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-bold leading-tight ${n.read ? 'text-psi-secondary' : 'text-psi-primary'}`}>{n.title}</p>
                                            <p className="text-psi-primary/35 text-[11px] leading-relaxed mt-0.5 line-clamp-2">{n.body}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Clock size={9} className="text-psi-muted" />
                                                <span className="text-psi-muted text-[9px]">{n.relativeTime}</span>
                                                {n.link && <span className="text-psi-muted text-[9px] flex items-center gap-0.5"><ArrowRight size={8} /> view</span>}
                                            </div>
                                        </div>
                                        {!n.read && <span className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0 mt-1" />}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Footer */}
                        <div className="border-t border-white/8 px-4 py-3 text-center">
                            <p className="text-psi-muted text-[10px]">Notifications sync live · powered by Firestore</p>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

// ═══════════════════════════════════════════════════════════════════
// 3. AI Chat Assistant
// ═══════════════════════════════════════════════════════════════════

function AIChatAssistant({ open, onClose }: { open: boolean; onClose: () => void }) {
    const [messages, setMessages] = useState<ChatMsg[]>([{
        role: 'ai',
        content: 'Hi! I\'m your PSI Event Portal assistant. I can help you navigate the system, explain any feature, or guide you through workflows.\n\nTry asking "How do I check in agents?" or "What is the VIP Concierge?"',
    }]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const endRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 100); }, [open]);
    useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const handleSend = async () => {
        const q = input.trim();
        if (!q || loading) return;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: q }]);
        setLoading(true);
        try {
            const res = await mockAIResponse(q);
            setMessages(prev => [...prev, { role: 'ai', content: res.content, links: res.links }]);
        } finally {
            setLoading(false);
        }
    };

    const QUICK = [
        'How do I check in agents?',
        'Request commission advance',
        'VIP client workflow',
        'Generate settlement report',
    ];

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0, y: 24, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 24, scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    className="fixed bottom-[5.5rem] md:bottom-6 right-3 sm:right-4 w-[calc(100vw-1.5rem)] sm:w-96 z-[72] flex flex-col bg-psi-surface border border-psi rounded-2xl shadow-2xl shadow-black/10 overflow-hidden"
                    style={{ maxHeight: '70vh' }}
                >
                    {/* Header */}
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-white/8 bg-gradient-to-r from-indigo-600/20 to-violet-600/20">
                        <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0">
                            <Sparkles size={14} className="text-psi-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-psi-primary font-extrabold text-sm">PSI AI Assistant</p>
                            <p className="text-indigo-300/60 text-[9px]">Powered by Gemini · Always available</p>
                        </div>
                        <button onClick={onClose} className="w-7 h-7 rounded-lg bg-white/6 border border-psi flex items-center justify-center text-psi-muted hover:text-psi-primary transition-all">
                            <X size={12} />
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
                        {messages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] rounded-2xl px-3 py-2.5 ${msg.role === 'user'
                                        ? 'bg-indigo-600 text-psi-primary text-sm'
                                        : 'bg-white/6 border border-white/8 text-psi-primary/85 text-sm'
                                    }`}>
                                    {/* Render **bold** markdown */}
                                    <p className="leading-relaxed whitespace-pre-wrap text-[13px]"
                                        dangerouslySetInnerHTML={{ __html: msg.content.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`(.+?)`/g, '<code class="bg-psi-border-subtle px-1 rounded text-xs font-mono">$1</code>') }}
                                    />
                                    {msg.links && msg.links.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                            {msg.links.map(l => (
                                                <Link key={l.path} to={l.path} onClick={onClose}
                                                    className="flex items-center gap-1 px-2 py-1 bg-indigo-500/20 border border-indigo-500/30 rounded-lg text-indigo-300 text-[10px] font-bold hover:bg-indigo-500/30 transition-colors">
                                                    <ArrowRight size={9} /> {l.label}
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex items-center gap-2 text-psi-muted text-xs">
                                <Loader2 size={12} className="animate-spin" /> Thinking…
                            </div>
                        )}
                        <div ref={endRef} />
                    </div>

                    {/* Quick prompts */}
                    {messages.length === 1 && (
                        <div className="px-4 pb-2 flex gap-1.5 overflow-x-auto scrollbar-none">
                            {QUICK.map(q => (
                                <button key={q} onClick={() => { setInput(q); setTimeout(handleSend, 50); }}
                                    className="flex-shrink-0 px-2.5 py-1.5 bg-psi-subtle border border-psi rounded-xl text-psi-secondary text-[10px] font-semibold hover:bg-psi-subtle hover:text-psi-primary transition-all whitespace-nowrap">
                                    {q}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Input */}
                    <div className="border-t border-white/8 p-3 flex items-center gap-2">
                        <input
                            ref={inputRef}
                            id="ai-chat-input"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSend()}
                            placeholder="Ask anything about the portal…"
                            className="flex-1 bg-white/6 border border-psi rounded-xl px-3 py-2 text-psi-primary text-xs placeholder:text-psi-muted outline-none focus:border-indigo-500/50 transition-colors"
                        />
                        <button
                            id="ai-chat-send"
                            onClick={handleSend}
                            disabled={!input.trim() || loading}
                            className="w-8 h-8 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-psi-primary flex items-center justify-center transition-all"
                        >
                            <Send size={13} />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// ═══════════════════════════════════════════════════════════════════
// Provider + main GlobalFeatures component
// ═══════════════════════════════════════════════════════════════════

export function GlobalFeaturesProvider({ children }: { children: React.ReactNode }) {
    const [cmdOpen, setCmdOpenRaw] = useState(false);
    const [notifOpen, setNotifOpenRaw] = useState(false);
    const [chatOpen, setChatOpenRaw] = useState(false);
    const [notifs] = useState(MOCK_NOTIFS);
    const unreadCount = notifs.filter(n => !n.read).length;

    const setCmdOpen = useCallback((v: boolean) => { setCmdOpenRaw(v); if (v) { setNotifOpenRaw(false); setChatOpenRaw(false); } }, []);
    const setNotifOpen = useCallback((v: boolean) => { setNotifOpenRaw(v); if (v) { setCmdOpenRaw(false); setChatOpenRaw(false); } }, []);
    const setChatOpen = useCallback((v: boolean) => { setChatOpenRaw(v); if (v) { setCmdOpenRaw(false); setNotifOpenRaw(false); } }, []);

    // Global keyboard shortcut: ⌘K / Ctrl+K
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setCmdOpen(true);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [setCmdOpen]);

    return (
        <GlobalContext.Provider value={{ cmdOpen, setCmdOpen, notifOpen, setNotifOpen, chatOpen, setChatOpen, unreadCount }}>
            {children}
            <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
            <NotificationPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
            <AIChatAssistant open={chatOpen} onClose={() => setChatOpen(false)} />
        </GlobalContext.Provider>
    );
}

// ═══════════════════════════════════════════════════════════════════
// Header action buttons (used in DashboardLayout)
// ═══════════════════════════════════════════════════════════════════

export function GlobalActionButtons({ className = '' }: { className?: string }) {
    const { setCmdOpen, setNotifOpen, setChatOpen, notifOpen, chatOpen, unreadCount } = useGlobalFeatures();

    return (
        <div className={`flex items-center gap-1.5 ${className}`}>
            {/* Search / Command Palette */}
            <button id="cmd-palette-btn" onClick={() => setCmdOpen(true)}
                aria-label="Open command palette (⌘K)"
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white/6 hover:bg-psi-subtle border border-psi rounded-xl text-psi-secondary hover:text-psi-primary text-xs font-medium transition-all">
                <Search size={13} />
                <span className="hidden md:inline">Search…</span>
                <kbd className="hidden md:flex items-center gap-0.5 text-[9px] font-mono bg-psi-border-subtle px-1 rounded">
                    <Command size={8} />K
                </kbd>
            </button>
            <button id="cmd-palette-btn-mobile" onClick={() => setCmdOpen(true)}
                aria-label="Search"
                className="sm:hidden p-2 rounded-xl text-psi-secondary hover:bg-slate-800 hover:text-psi-primary transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">
                <Search size={18} />
            </button>

            {/* Notifications */}
            <button id="notifications-btn" onClick={() => setNotifOpen(!notifOpen)}
                aria-label="Notifications"
                className="relative p-2 rounded-xl text-psi-secondary hover:bg-slate-800 hover:text-psi-primary transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">
                <Bell size={18} className={notifOpen ? 'text-psi-primary' : ''} />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-psi-primary text-[8px] font-black rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* AI Chat */}
            <button id="ai-chat-btn" onClick={() => setChatOpen(!chatOpen)}
                aria-label="AI Assistant"
                className={`p-2 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center ${chatOpen ? 'bg-indigo-600 text-psi-primary' : 'text-psi-secondary hover:bg-slate-800 hover:text-psi-primary'}`}>
                <MessageSquare size={18} />
            </button>
        </div>
    );
}
