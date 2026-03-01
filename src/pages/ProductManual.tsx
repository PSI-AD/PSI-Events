/**
 * ProductManual.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Manual page shell — switches between:
 *   1. Visual System Manual  (new, default) — SystemManual.tsx
 *   2. Lifecycle Guide       (original)     — inline component below
 *
 * Mobile: left nav collapses to a horizontal scroll pill strip above content.
 */

import React, { useState, useEffect, useRef } from 'react';
import SystemManual from '../features/help/SystemManual';
import { motion, AnimatePresence } from 'motion/react';
import {
    BookOpen, Calendar, Zap, CheckSquare,
    ChevronRight, Users, FileText,
    QrCode, BarChart3, Award, AlertTriangle,
    Building2, TrendingUp, Shield, Clock,
    DollarSign, Target, Sparkles, MapPin,
    Upload, Bell, Star, ArrowRight,
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────

function cn(...c: (string | false | undefined | null)[]) {
    return c.filter(Boolean).join(' ');
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface BentoBox {
    icon: React.ReactNode;
    title: string;
    accent: 'slate' | 'emerald' | 'amber' | 'blue' | 'violet';
    items: string[];
    note?: string;
}

interface Step {
    id: string;
    number: number;
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    screenshotLabel: string;
    screenshotIcon: React.ReactNode;
    url: string;       // descriptive url — "localhost:5173/path → instruction"
    filename: string;  // save screenshot as this name in public/manual/
    boxes: [BentoBox, BentoBox];
}

interface Phase {
    id: 'before' | 'during' | 'after';
    label: string;
    icon: React.ReactNode;
    tagline: string;
    color: 'amber' | 'emerald' | 'blue';
    steps: Step[];
}

// ── Color maps (theme-aware) ─────────────────────────────────────────────────

const ACCENT = {
    slate: { bg: 'bg-psi-subtle border border-psi', border: 'border-psi', text: 'text-psi-secondary', bullet: 'bg-psi-border-strong' },
    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60', border: 'border-emerald-200 dark:border-emerald-800', text: 'text-emerald-700 dark:text-emerald-200', bullet: 'bg-emerald-500' },
    amber: { bg: 'bg-amber-50   dark:bg-amber-950/40   border border-amber-200   dark:border-amber-800/50', border: 'border-amber-200   dark:border-amber-800', text: 'text-amber-700   dark:text-amber-200', bullet: 'bg-amber-500' },
    blue: { bg: 'bg-blue-50    dark:bg-blue-950/40    border border-blue-200    dark:border-blue-800/50', border: 'border-blue-200    dark:border-blue-800', text: 'text-blue-700    dark:text-blue-200', bullet: 'bg-blue-500' },
    violet: { bg: 'bg-violet-50  dark:bg-violet-950/40  border border-violet-200  dark:border-violet-800/50', border: 'border-violet-200  dark:border-violet-800', text: 'text-violet-700  dark:text-violet-200', bullet: 'bg-violet-500' },
};

const TAB_COLOR = {
    amber: { active: 'bg-amber-500 text-white shadow-amber-500/30', inactive: 'text-slate-400 hover:text-amber-300', dot: 'bg-amber-500', badge: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
    emerald: { active: 'bg-emerald-500 text-white shadow-emerald-500/30', inactive: 'text-slate-400 hover:text-emerald-300', dot: 'bg-emerald-500', badge: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
    blue: { active: 'bg-blue-500 text-white shadow-blue-500/30', inactive: 'text-slate-400 hover:text-blue-300', dot: 'bg-blue-500', badge: 'text-blue-400 border-blue-500/30 bg-blue-500/10' },
};

// ── Content data ──────────────────────────────────────────────────────────────

const PHASES: Phase[] = [
    {
        id: 'before',
        label: 'Before the Event',
        icon: <Calendar size={16} />,
        tagline: 'Plan, budget, and lock in your team',
        color: 'amber',
        steps: [
            {
                id: 'before-1',
                number: 1,
                title: 'Create the Roadshow Event',
                subtitle: 'Set the city, venue, dates, and financial targets before inviting a single agent.',
                icon: <MapPin size={20} />,
                screenshotLabel: 'Events → New Roadshow Form',
                screenshotIcon: <Calendar size={28} className="text-slate-500" />,
                url: 'localhost:5173/events → click "Create New Event" button',
                filename: 'create-event.png',
                boxes: [
                    {
                        icon: <FileText size={16} />,
                        title: 'Screen Used',
                        accent: 'slate',
                        items: [
                            'Navigate to Events → "Create New Event"',
                            'Enter: City, Venue, Start Date, End Date',
                            'Set Budget Type: Branch Funded or Developer Sponsored',
                            'Input: Target Headcount, Document Deadline',
                            'Click "Save Draft" — event enters Upcoming status',
                        ],
                        note: 'Event ID auto-generated for audit trail.',
                    },
                    {
                        icon: <Sparkles size={16} />,
                        title: 'The Why',
                        accent: 'amber',
                        items: [
                            'Every downstream action — agent invites, lead distribution, check-in, settlement — is tied to this Event ID',
                            'The Document Deadline triggers the automated 48-hour nudge system',
                            'Budget Type determines which P&L formula the system uses for final ROI calculation',
                        ],
                        note: 'No event = no compliance enforcement. Always start here.',
                    },
                ],
            },
            {
                id: 'before-2',
                number: 2,
                title: 'Set Risk Tiers (50/30/20)',
                subtitle: 'Assign Gold, Silver, or Bronze risk tier to each agent — this determines their commission split.',
                icon: <Award size={20} />,
                screenshotLabel: 'Events → Risk Tier Assignment Panel',
                screenshotIcon: <Award size={28} className="text-slate-500" />,
                url: 'localhost:5173/settlement → open the Roster Builder and assign tiers',
                filename: 'risk-tiers.png',
                boxes: [
                    {
                        icon: <DollarSign size={16} />,
                        title: 'Tier Structure',
                        accent: 'slate',
                        items: [
                            '🥇 Gold — Agent earns 50% of their closed sales revenue',
                            '🥈 Silver — Agent earns 30% of their closed sales revenue',
                            '🥉 Bronze — Agent earns 20% of their closed sales revenue',
                            'Branch retains the remainder (50%, 70%, or 80%)',
                            'Assign tiers in the Roster Builder before generating settlement',
                        ],
                        note: 'Tiers can be adjusted until the Final Settlement Report is locked.',
                    },
                    {
                        icon: <Shield size={16} />,
                        title: 'The Why',
                        accent: 'emerald',
                        items: [
                            'Top performers in previous roadshows earn Gold — incentivising repeat excellence',
                            'Bronze tier protects Branch margin for new or unproven agents',
                            'The 50/30/20 model eliminates post-event commission disputes — every agent signs off on their tier before travelling',
                            'Settlement formula: Agent Payout = Closed Revenue × Tier Share',
                        ],
                        note: 'This single field drives the entire commission calculation engine.',
                    },
                ],
            },
            {
                id: 'before-3',
                number: 3,
                title: 'Agent Invitation & Manager Approval',
                subtitle: 'Branch Manager reviews nominations and approves the final travelling team.',
                icon: <Users size={20} />,
                screenshotLabel: 'Events → Agent Roster → Approval Queue',
                screenshotIcon: <Users size={28} className="text-slate-500" />,
                url: 'localhost:5173/proposals → open a proposal and view the Approval Queue tab',
                filename: 'agent-approval.png',
                boxes: [
                    {
                        icon: <CheckSquare size={16} />,
                        title: 'Approval Workflow',
                        accent: 'slate',
                        items: [
                            'Event Organiser nominates agents from the Team directory',
                            'Each nomination enters status: pending in Firestore',
                            'Branch Manager reviews and clicks "Approve" or "Reject"',
                            'Approved agents receive their event pass and upload instructions',
                            'Rejected agents are notified — seat can be reassigned',
                        ],
                        note: 'Manager must approve before the agent appears in any roster.',
                    },
                    {
                        icon: <Shield size={16} />,
                        title: 'The Why',
                        accent: 'violet',
                        items: [
                            'Manager approval is the legal consent step — it confirms the agent is authorised to represent PSI at this event',
                            'Only approved agents receive leads from the distribution engine',
                            'Rejection audit trail is stored in system_audit_logs — critical for compliance reviews',
                            'Prevents rogue last-minute additions to the travelling roster',
                        ],
                        note: 'No manager approval = no leads. Gate enforced at the function level.',
                    },
                ],
            },
            {
                id: 'before-4',
                number: 4,
                title: 'Logistics Compliance (48-Hour Nudger)',
                subtitle: 'The system automatically chases agents who have not uploaded flight and visa documents before the deadline.',
                icon: <Bell size={20} />,
                screenshotLabel: 'System → Automated Nudger Cloud Function',
                screenshotIcon: <Upload size={28} className="text-slate-500" />,
                url: 'localhost:5173/settings → scroll to Nudger / Notification settings',
                filename: 'nudger-config.png',
                boxes: [
                    {
                        icon: <Clock size={16} />,
                        title: 'How It Works',
                        accent: 'slate',
                        items: [
                            'Daily CRON job runs every morning at 8:00 AM GST',
                            'Scans all upcoming events for agents with status: approved',
                            'Checks: flightUploaded: false OR visaUploaded: false',
                            'If document deadline is within 48 hours → triggers alert',
                            'Alert sent via: WhatsApp (Twilio) + Email (SendGrid)',
                            'Message: "URGENT: Your flight details for [Event] are missing."',
                        ],
                        note: 'Enable NUDGER_DRY_RUN=true to test without sending real messages.',
                    },
                    {
                        icon: <AlertTriangle size={16} />,
                        title: 'The Why',
                        accent: 'amber',
                        items: [
                            'Manual follow-up on 20+ agents before every roadshow was causing last-minute chaos and missed flights',
                            'Automated nudging eliminates the coordinator\'s most time-consuming recurring task',
                            'Non-compliance is logged in nudge_log — manager can see exactly who was warned and when',
                            'Creates legal defensibility: "The agent was notified twice and failed to upload"',
                        ],
                        note: 'Agents who do not comply within 48 hours can be auto-flagged for spot removal.',
                    },
                ],
            },
            {
                id: 'before-5',
                number: 5,
                title: 'Predictive Sponsorship Recommendation',
                subtitle: 'Before finalising the budget, the AI engine analyses past roadshows in the same city to recommend a minimum developer sponsorship.',
                icon: <BarChart3 size={20} />,
                screenshotLabel: 'Analytics → Predictive Dashboard → City Selector',
                screenshotIcon: <BarChart3 size={28} className="text-slate-500" />,
                url: 'localhost:5173/analytics → select a city in the Predictive Dashboard dropdown',
                filename: 'predictive-dashboard.png',
                boxes: [
                    {
                        icon: <TrendingUp size={16} />,
                        title: 'How To Read It',
                        accent: 'slate',
                        items: [
                            'Select the event city from the dropdown (e.g., "London")',
                            'Engine aggregates all past London roadshow data',
                            'Dual-axis chart: Cost/Revenue bars + Margin % line',
                            'System Recommendation card shows minimum AED sponsorship target',
                            'Formula: gross_needed = avg_cost ÷ (1 − 40%), then rounded to nearest 10,000 AED',
                        ],
                        note: 'Confidence level: High (3+ events), Medium (2), Low (1 event).',
                    },
                    {
                        icon: <Sparkles size={16} />,
                        title: 'The Why',
                        accent: 'emerald',
                        items: [
                            'Removes the guesswork from developer sponsorship negotiations',
                            '"Based on 3 previous London roadshows, the minimum sponsorship to guarantee a 40% margin is AED 180,000"',
                            'Data-backed number transforms the sales conversation from a request into a business case',
                            'Sponsorship shortfall is automatically flagged in the P&L scenario card',
                        ],
                        note: 'This feature alone can recover the entire portal development cost in one negotiation.',
                    },
                ],
            },
        ],
    },
    {
        id: 'during',
        label: 'During the Event',
        icon: <Zap size={16} />,
        tagline: 'Execute on the ground with precision',
        color: 'emerald',
        steps: [
            {
                id: 'during-1',
                number: 1,
                title: 'QR Code Physical Check-In',
                subtitle: 'Every agent shows their digital pass QR code at the door. Organiser scans and locks their status to physically_present.',
                icon: <QrCode size={20} />,
                screenshotLabel: 'Check-In → Agent Pass View + Organiser Scanner',
                screenshotIcon: <QrCode size={28} className="text-slate-500" />,
                url: 'localhost:5173/check-in → show both the "My Pass" tab (agent) and "Scanner" tab (organiser)',
                filename: 'qr-check-in.png',
                boxes: [
                    {
                        icon: <CheckSquare size={16} />,
                        title: 'Step-by-Step',
                        accent: 'slate',
                        items: [
                            'Agent opens Check-In → "My Pass" on their smartphone',
                            'A signed QR code is generated (JWT with Agent ID + Event ID)',
                            'Organiser opens Check-In → "Scanner" on their device',
                            'Organiser scans or pastes the agent\'s token into the manual field',
                            'System verifies signature → updates Firestore: status: physically_present',
                            'Agent card on the Roster tab turns green with a ✓ badge',
                        ],
                        note: 'QR codes expire after 24 hours for security.',
                    },
                    {
                        icon: <Shield size={16} />,
                        title: 'The Why — The Lock-In Gate',
                        accent: 'emerald',
                        items: [
                            'physically_present is the gating status for the Lead Distribution Engine',
                            'If an agent has not checked in, zero leads will be assigned to them — regardless of manager approval',
                            'This prevents a fraudulent scenario: an agent calling in sick but still claiming leads and commission',
                            'The atomic Firestore update is tamper-proof — neither the agent nor the organiser can manually override it',
                        ],
                        note: 'This is the single most important compliance gate in the system.',
                    },
                ],
            },
            {
                id: 'during-2',
                number: 2,
                title: 'Automated Lead Distribution',
                subtitle: 'Leads arriving from the CRM (Odoo/Salesforce) are automatically distributed to checked-in agents using a fair round-robin algorithm.',
                icon: <Target size={20} />,
                screenshotLabel: 'System → Lead Distribution Cloud Function (HTTP Webhook)',
                screenshotIcon: <Users size={28} className="text-slate-500" />,
                url: 'localhost:5173/analytics → Lead Funnel Chart section',
                filename: 'lead-distribution.png',
                boxes: [
                    {
                        icon: <Zap size={16} />,
                        title: 'How It Works',
                        accent: 'slate',
                        items: [
                            'CRM sends a POST webhook to the distributeLeads Cloud Function',
                            'Function validates the payload with CRM_SYNC_TOKEN',
                            'Queries Firestore for agents with status: physically_present',
                            'Round-robin: uses roundRobinIndex to assign to next agent in sequence',
                            'Lead written to crm_leads collection, index incremented atomically',
                            'If zero agents are checked in → lead routed to manager_unassigned_queue',
                        ],
                        note: 'All assignments are logged in system_audit_logs for compliance.',
                    },
                    {
                        icon: <Building2 size={16} />,
                        title: 'The Why',
                        accent: 'blue',
                        items: [
                            'Manual lead distribution at 200+ person events caused agent disputes and missed follow-ups',
                            'Round-robin guarantees fairness — no single agent can be favoured or overlooked',
                            'The unassigned queue is the safety net: no lead ever falls through the cracks',
                            'Atomic Firestore transactions prevent race conditions — two agents cannot be assigned the same lead simultaneously',
                        ],
                        note: 'Average lead assignment latency: < 800ms from CRM webhook to Firestore write.',
                    },
                ],
            },
            {
                id: 'during-3',
                number: 3,
                title: 'Live P&L Monitoring',
                subtitle: 'Branch Manager and executives monitor real-time cost vs. revenue on the Analytics dashboard throughout the event day.',
                icon: <TrendingUp size={20} />,
                screenshotLabel: 'Analytics → P&L Scenario Card + Lead Funnel Chart',
                screenshotIcon: <BarChart3 size={28} className="text-slate-500" />,
                url: 'localhost:5173/analytics → P&L Scenario Card at the top of the page',
                filename: 'pl-monitoring.png',
                boxes: [
                    {
                        icon: <BarChart3 size={16} />,
                        title: 'Key Metrics',
                        accent: 'slate',
                        items: [
                            'Branch Net Profit — after all commissions and expenses',
                            'Gross Profit — before organiser commission deduction',
                            'Organiser Commission (10%) — deducted automatically',
                            'Sponsorship Profit — shown if event is Developer Sponsored',
                            'Lead Funnel Chart: Walk-ins → Qualified → Meetings → Deals',
                        ],
                        note: 'Data refreshes on each API call — no automatic polling yet.',
                    },
                    {
                        icon: <Star size={16} />,
                        title: 'The Why',
                        accent: 'emerald',
                        items: [
                            'Executives can make real-time decisions: is the event under-performing? Deploy more marketing?',
                            'If Gross Profit is tracking below the predictive recommendation, management can intervene before the day ends',
                            'Sponsorship P&L scenario shows instantly whether the developer\'s contribution was sufficient',
                            'Replaces end-of-day Excel spreadsheet with live data — decisions happen in real time, not retrospectively',
                        ],
                        note: 'The Executive Presentation view (ROI Vision) is the boardroom-ready version of this screen.',
                    },
                ],
            },
        ],
    },
    {
        id: 'after',
        label: 'After the Event',
        icon: <CheckSquare size={16} />,
        tagline: 'Settle commissions and learn for next time',
        color: 'blue',
        steps: [
            {
                id: 'after-1',
                number: 1,
                title: 'Post-Event Lead Follow-Up',
                subtitle: 'All assigned leads remain in each agent\'s CRM queue. Managers can see unassigned leads and redistribute as needed.',
                icon: <FileText size={20} />,
                screenshotLabel: 'CRM Leads Collection → Firestore Console or Future Leads UI',
                screenshotIcon: <FileText size={28} className="text-slate-500" />,
                url: 'localhost:5173/vip-concierge → leads queue and status columns',
                filename: 'lead-followup.png',
                boxes: [
                    {
                        icon: <Users size={16} />,
                        title: 'Lead Statuses',
                        accent: 'slate',
                        items: [
                            'assigned — lead has an agent owner, follow-up pending',
                            'qualified — agent has made first contact',
                            'meeting_scheduled — site visit or video call booked',
                            'deal_closed — sale confirmed, feeds into Settlement Revenue',
                            'unassigned — routed to manager_unassigned_queue (action required)',
                        ],
                        note: 'Lead status updates drive the Time-Lapse ROI Tracking chart.',
                    },
                    {
                        icon: <TrendingUp size={16} />,
                        title: 'The Why',
                        accent: 'blue',
                        items: [
                            'Industry data: 60% of property deals close 30–90 days after the initial event touchpoint',
                            'Without status tracking, follow-up depends entirely on individual agent discipline',
                            'The manager_unassigned_queue ensures no lead goes dark — a manager can reassign within minutes',
                            'Closed deal values are what feed the Settlement engine to calculate final commission payouts',
                        ],
                        note: 'Future: Odoo/Salesforce bi-directional sync will auto-update deal status.',
                    },
                ],
            },
            {
                id: 'after-2',
                number: 2,
                title: 'Commission & ROI Settlement',
                subtitle: 'Once deals are closed, generate the locked Final Settlement Report — exact AED payouts per agent, zero disputes.',
                icon: <Award size={20} />,
                screenshotLabel: 'Settlement → Commission Engine → Generate Report',
                screenshotIcon: <Award size={28} className="text-slate-500" />,
                url: 'localhost:5173/settlement → add agents to roster, click "Generate Final Settlement Report"',
                filename: 'settlement-report.png',
                boxes: [
                    {
                        icon: <DollarSign size={16} />,
                        title: 'Settlement Process',
                        accent: 'slate',
                        items: [
                            'Go to Settlement page, verify Event Details (name, date, venue, manager)',
                            'Add each closing agent to the Roster with their Closed Revenue',
                            'Assign or confirm their Risk Tier (Gold/Silver/Bronze)',
                            'Click "Generate Final Settlement Report"',
                            'System calculates: Agent Payout, Branch Gross Profit, Net ROI %',
                            'Print or Save as PDF — locked, tamper-proof',
                        ],
                        note: 'Top Performer callout automatically highlights the highest-earning agent.',
                    },
                    {
                        icon: <Building2 size={16} />,
                        title: 'The Why',
                        accent: 'emerald',
                        items: [
                            'Commission disputes are the #1 source of agent dissatisfaction after roadshows',
                            'The locked PDF report is the single source of truth — Finance, Manager, and Agent all have the same document',
                            'Formula: Agent Payout = Closed Revenue × Tier Share. Branch Profit = Total Revenue − All Payouts',
                            'The Net ROI % gives executives a clean headline number for boardroom reporting',
                        ],
                        note: 'Target: Settlement report generated within 24 hours of final deal closure.',
                    },
                ],
            },
            {
                id: 'after-3',
                number: 3,
                title: 'Predictive Model Update',
                subtitle: 'The completed event\'s financial data feeds back into the Predictive Analytics engine, improving future sponsorship recommendations.',
                icon: <BarChart3 size={20} />,
                screenshotLabel: 'Analytics → Predictive Dashboard (Post-Event City Update)',
                screenshotIcon: <Sparkles size={28} className="text-slate-500" />,
                url: 'localhost:5173/analytics → select city in Predictive dropdown — confirm updated confidence level',
                filename: 'predictive-update.png',
                boxes: [
                    {
                        icon: <TrendingUp size={16} />,
                        title: 'Data Flywheel',
                        accent: 'slate',
                        items: [
                            'Final event costs, revenue, and agent count are added to the historical dataset',
                            'City aggregates (avg cost, avg profit, avg margin) are recalculated',
                            'Next sponsorship recommendation for the same city becomes more accurate',
                            'Confidence level upgrades: Low → Medium → High as event count increases',
                            'Cross-city comparison table on Analytics page updates automatically',
                        ],
                        note: 'Every roadshow you run makes the system smarter for the next one.',
                    },
                    {
                        icon: <Sparkles size={16} />,
                        title: 'The Long-Term Vision',
                        accent: 'violet',
                        items: [
                            'After 10+ events, the system will predict optimal event timing, city sequencing, and team sizing',
                            'Sponsorship negotiations become data-driven: "Our last 5 London events averaged AED 420K gross profit at AED 180K sponsorship — here is the dataset"',
                            'The portal transforms from an operations tool into a competitive intelligence asset',
                            'Future: Connect real Firestore event data to replace mock historical data automatically',
                        ],
                        note: 'The more you use it, the more powerful and irreplaceable it becomes.',
                    },
                ],
            },
        ],
    },
];

// ── Sub-components ─────────────────────────────────────────────────────────────

function ScreenshotPlaceholder({
    label, filename, url,
}: {
    label: string;
    filename: string;
    url: string;
}) {
    const [copied, setCopied] = React.useState(false);

    // Split "localhost:5173/path → instruction" into baseHref + thenInstruction
    const { baseHref, thenInstruction } = (() => {
        const arrowMatch = url.match(/^([^→>]+?)→(.+)$/);
        if (arrowMatch) {
            const raw = arrowMatch[1].trim();
            return {
                baseHref: raw.startsWith('http') ? raw : `http://${raw}`,
                thenInstruction: arrowMatch[2].trim(),
            };
        }
        return { baseHref: `http://${url.trim()}`, thenInstruction: null };
    })();

    function copyFilename(e: React.MouseEvent) {
        e.preventDefault();
        e.stopPropagation();
        navigator.clipboard.writeText(filename).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        });
    }

    return (
        <a
            href={baseHref}
            target="_blank"
            rel="noopener noreferrer"
            className="group block w-full aspect-video bg-slate-900 border-2 border-dashed border-slate-700 hover:border-blue-500/60 hover:bg-slate-800 rounded-2xl flex flex-col items-center justify-center gap-4 my-6 transition-all duration-200 hover:ring-2 hover:ring-blue-500/20 cursor-pointer px-6"
        >
            {/* Decorative chrome */}
            <div className="w-full max-w-xs flex flex-col gap-1.5 opacity-20 group-hover:opacity-35 transition-opacity pointer-events-none select-none">
                <div className="flex gap-1 mb-1">
                    <div className="w-2 h-2 rounded-full bg-red-400" />
                    <div className="w-2 h-2 rounded-full bg-amber-400" />
                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>
                <div className="h-2.5 bg-slate-600 rounded w-3/4" />
                <div className="h-2.5 bg-slate-700 rounded w-1/2" />
                <div className="h-14 bg-slate-700/60 rounded-xl mt-1" />
            </div>

            {/* CTA */}
            <div className="text-center space-y-2.5 w-full max-w-sm">
                {/* Open button */}
                <div className="inline-flex items-center gap-2 bg-blue-600 group-hover:bg-blue-500 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-all duration-150 shadow-lg shadow-blue-900/40 group-hover:scale-105">
                    <span>📸 Click to open this screen</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                </div>

                {/* Then instruction chip */}
                {thenInstruction && (
                    <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2 text-left">
                        <span className="text-amber-400 text-[10px] font-black uppercase tracking-widest mt-0.5 flex-shrink-0">Then:</span>
                        <span className="text-amber-200 text-xs font-semibold leading-snug">{thenInstruction}</span>
                    </div>
                )}

                {/* Click-to-copy filename */}
                <div className="flex items-center justify-center gap-1.5 text-xs font-mono">
                    <span className="text-slate-500">Save as</span>
                    <button
                        type="button"
                        onClick={copyFilename}
                        title="Click to copy filename"
                        className="relative inline-flex items-center gap-1 bg-slate-700/60 hover:bg-slate-600/80 border border-slate-600/60 hover:border-emerald-500/50 text-emerald-400 font-bold px-2 py-0.5 rounded-lg transition-all duration-150 cursor-pointer"
                    >
                        {filename}
                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                        {copied && (
                            <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap shadow-lg">
                                ✓ Copied!
                            </span>
                        )}
                    </button>
                    <span className="text-slate-500">→</span>
                    <span className="text-blue-400">public/manual/</span>
                </div>
            </div>
        </a>
    );
}

function BentoCard({ box }: { box: BentoBox }) {
    const style = ACCENT[box.accent];
    return (
        <div className={cn('rounded-2xl p-5 flex flex-col gap-3', style.bg)}>
            <div className="flex items-center gap-2">
                <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0', style.bg, 'border', style.border)}>
                    <span className={style.text}>{box.icon}</span>
                </div>
                <h4 className={cn('text-sm font-bold', style.text)}>{box.title}</h4>
            </div>
            <ul className="space-y-2">
                {box.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-psi-secondary leading-relaxed">
                        <div className={cn('w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0', style.bullet)} />
                        <span>{item}</span>
                    </li>
                ))}
            </ul>
            {box.note && (
                <p className="text-[11px] text-psi-muted border-t border-psi pt-2 mt-auto leading-relaxed">
                    ⓘ {box.note}
                </p>
            )}
        </div>
    );
}

function StepSection({ step, phase, isLast }: { step: Step; phase: Phase; isLast: boolean }) {
    const c = TAB_COLOR[phase.color];
    return (
        <section id={step.id} className="scroll-mt-32 md:scroll-mt-24 pb-12 md:pb-16">
            {/* Step header */}
            <div className="flex items-start gap-4 mb-4">
                <div className={cn(
                    'w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 border',
                    `bg-${phase.color === 'amber' ? 'amber' : phase.color === 'emerald' ? 'emerald' : 'blue'}-500/10`,
                    `border-${phase.color === 'amber' ? 'amber' : phase.color === 'emerald' ? 'emerald' : 'blue'}-500/30`,
                )}>
                    <span className={cn(phase.color === 'amber' ? 'text-amber-400' : phase.color === 'emerald' ? 'text-emerald-400' : 'text-blue-400')}>
                        {step.icon}
                    </span>
                </div>
                <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className={cn('text-[10px] font-bold uppercase tracking-[0.15em] px-2 py-0.5 rounded-full border', c.badge)}>
                            Step {step.number}
                        </span>
                    </div>
                    <h2 className="text-white text-xl md:text-2xl font-extrabold tracking-tight leading-tight">
                        {step.title}
                    </h2>
                    <p className="text-slate-400 text-sm md:text-base mt-1.5 leading-relaxed">{step.subtitle}</p>
                    {/* URL breadcrumb — shows where to go for screenshot */}
                    {(() => {
                        const raw = step.url.split(/→/)[0].trim();
                        const href = raw.startsWith('http') ? raw : `http://${raw}`;
                        return (
                            <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="mt-2 inline-flex items-center gap-1.5 bg-slate-800/70 border border-slate-700/60 hover:border-blue-500/40 rounded-lg px-2.5 py-1 group transition-all duration-150"
                            >
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">📸 screen</span>
                                <span className="text-[11px] font-mono font-semibold text-blue-400 group-hover:text-blue-300 truncate max-w-[280px]">{step.url}</span>
                            </a>
                        );
                    })()}
                </div>
            </div>

            {/* Screenshot placeholder */}
            <ScreenshotPlaceholder
                label={step.screenshotLabel}
                url={step.url}
                filename={step.filename}
            />

            {/* Bento grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <BentoCard box={step.boxes[0]} />
                <BentoCard box={step.boxes[1]} />
            </div>

            {/* Divider (not on last step) */}
            {!isLast && (
                <div className="flex items-center gap-4 mt-10 md:mt-12">
                    <div className="flex-1 h-px bg-psi-border" />
                    <ArrowRight size={14} className="text-psi-muted" />
                    <div className="flex-1 h-px bg-psi-border" />
                </div>
            )}
        </section>
    );
}

// ── Main Component ─────────────────────────────────────────────────────────────

/** Internal: the original Lifecycle Guide (Before / During / After) */
function LifecycleGuide() {
    const [activePhase, setActivePhase] = useState<'before' | 'during' | 'after'>('before');
    const [activeStep, setActiveStep] = useState<string>('');
    const contentRef = useRef<HTMLDivElement>(null);

    const phase = PHASES.find(p => p.id === activePhase)!;

    // Set initial active step when phase changes
    useEffect(() => {
        setActiveStep(phase.steps[0].id);
    }, [activePhase, phase.steps]);

    // IntersectionObserver to update active nav step on scroll
    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                const visible = entries.filter(e => e.isIntersecting);
                if (visible.length > 0) {
                    // Pick the one closest to the top
                    const top = visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
                    setActiveStep(top.target.id);
                }
            },
            { rootMargin: '-25% 0px -60% 0px', threshold: 0 }
        );

        phase.steps.forEach(s => {
            const el = document.getElementById(s.id);
            if (el) observer.observe(el);
        });

        return () => observer.disconnect();
    }, [activePhase, phase.steps]);

    const scrollToStep = (stepId: string) => {
        const el = document.getElementById(stepId);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setActiveStep(stepId);
    };

    const switchPhase = (id: 'before' | 'during' | 'after') => {
        setActivePhase(id);
        // Scroll content to top
        if (contentRef.current) contentRef.current.scrollTo({ top: 0 });
    };

    return (
        <div className="min-h-screen bg-psi-page font-sans">

            {/* ── Sticky top header ── */}
            <div className="sticky top-0 z-30 bg-psi-raised/95 backdrop-blur-sm border-b border-psi">
                <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">

                    {/* Title row */}
                    <div className="flex items-center gap-3 py-3 md:py-4 border-b border-psi">
                        <div className="w-8 h-8 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                            <BookOpen size={16} className="text-amber-500 dark:text-amber-400" />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-psi-primary text-sm md:text-base font-extrabold tracking-tight truncate">PSI Event Portal — System Manual</h1>
                            <p className="text-psi-muted text-[10px] md:text-xs">Property Shop Investment LLC · Interactive Lifecycle Guide</p>
                        </div>
                    </div>

                    {/* Phase tabs */}
                    <div className="flex items-center gap-1 md:gap-2 py-2 overflow-x-auto scrollbar-none">
                        {PHASES.map(p => {
                            const isActive = p.id === activePhase;
                            const c = TAB_COLOR[p.color];
                            return (
                                <button
                                    key={p.id}
                                    id={`tab-${p.id}`}
                                    onClick={() => switchPhase(p.id)}
                                    className={cn(
                                        'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all select-none min-h-[40px]',
                                        isActive ? cn(c.active, 'shadow-lg') : c.inactive
                                    )}
                                >
                                    {p.icon}
                                    <span>{p.label}</span>
                                    <span className={cn(
                                        'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                                        isActive ? 'bg-white/20' : 'bg-psi-subtle text-psi-muted'
                                    )}>
                                        {p.steps.length}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ── Body — split layout ── */}
            <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-8">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activePhase}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                        className="flex gap-8 lg:gap-12 items-start"
                    >

                        {/* ── LEFT — Sticky timeline nav ── */}
                        <aside className="hidden md:flex flex-col w-52 lg:w-60 flex-shrink-0 sticky top-[120px] self-start">

                            {/* Phase label */}
                            <div className="mb-4">
                                <p className={cn(
                                    'text-[10px] font-bold uppercase tracking-[0.2em] mb-0.5',
                                    phase.color === 'amber' ? 'text-amber-400' :
                                        phase.color === 'emerald' ? 'text-emerald-400' : 'text-blue-400'
                                )}>
                                    {phase.label}
                                </p>
                                <p className="text-psi-muted text-xs leading-relaxed">{phase.tagline}</p>
                            </div>

                            {/* Step list */}
                            <nav className="space-y-1 relative">
                                {/* Vertical line */}
                                <div className="absolute left-3.5 top-0 bottom-0 w-px bg-psi-border" />

                                {phase.steps.map(step => {
                                    const isActive = step.id === activeStep;
                                    const c = TAB_COLOR[phase.color];
                                    return (
                                        <button
                                            key={step.id}
                                            id={`nav-${step.id}`}
                                            onClick={() => scrollToStep(step.id)}
                                            className={cn(
                                                'relative w-full flex items-center gap-3 pl-3 pr-3 py-2.5 rounded-xl text-left transition-all group select-none',
                                                isActive
                                                    ? 'bg-psi-subtle text-psi-primary'
                                                    : 'text-psi-muted hover:text-psi-secondary hover:bg-psi-subtle/60'
                                            )}
                                        >
                                            {/* Timeline dot */}
                                            <div className={cn(
                                                'w-2 h-2 rounded-full flex-shrink-0 relative z-10 transition-all ring-2',
                                                isActive
                                                    ? cn(c.dot, 'ring-psi-page', 'scale-125')
                                                    : 'bg-psi-border-strong ring-psi-page'
                                            )} />

                                            <div className="min-w-0">
                                                <p className={cn(
                                                    'text-[10px] font-bold uppercase tracking-widest',
                                                    isActive
                                                        ? phase.color === 'amber' ? 'text-amber-400' : phase.color === 'emerald' ? 'text-emerald-400' : 'text-blue-400'
                                                        : 'text-psi-muted'
                                                )}>
                                                    Step {step.number}
                                                </p>
                                                <p className={cn(
                                                    'text-xs font-semibold leading-tight',
                                                    isActive ? 'text-psi-primary' : 'text-psi-secondary group-hover:text-psi-primary'
                                                )}>
                                                    {step.title}
                                                </p>
                                            </div>

                                            {isActive && (
                                                <ChevronRight size={12} className="ml-auto flex-shrink-0 text-psi-muted" />
                                            )}
                                        </button>
                                    );
                                })}
                            </nav>

                            {/* Progress footer */}
                            <div className="mt-6 pt-4 border-t border-psi">
                                <p className="text-[10px] text-psi-muted uppercase tracking-widest font-bold mb-2">Progress</p>
                                <div className="flex gap-1">
                                    {phase.steps.map(step => (
                                        <div
                                            key={step.id}
                                            className={cn(
                                                'h-1 rounded-full flex-1 transition-all',
                                                step.id === activeStep || phase.steps.indexOf(step) < phase.steps.findIndex(s => s.id === activeStep)
                                                    ? phase.color === 'amber' ? 'bg-amber-500' : phase.color === 'emerald' ? 'bg-emerald-500' : 'bg-blue-500'
                                                    : 'bg-psi-subtle'
                                            )}
                                        />
                                    ))}
                                </div>
                            </div>
                        </aside>

                        {/* ── MOBILE — Horizontal step strip (replaces left nav) ── */}
                        <div className="md:hidden w-full mb-6 -mx-4 px-4 overflow-x-auto scrollbar-none"
                            style={{ scrollbarWidth: 'none' }}
                        >
                            <div className="flex gap-2 pb-1" style={{ width: 'max-content' }}>
                                {phase.steps.map(step => {
                                    const isActive = step.id === activeStep;
                                    const c = TAB_COLOR[phase.color];
                                    return (
                                        <button
                                            key={step.id}
                                            onClick={() => scrollToStep(step.id)}
                                            className={cn(
                                                'flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all select-none',
                                                isActive
                                                    ? cn('bg-psi-raised text-psi-primary border border-psi')
                                                    : 'bg-psi-subtle text-psi-muted border border-psi'
                                            )}
                                        >
                                            <div className={cn(
                                                'w-1.5 h-1.5 rounded-full flex-shrink-0',
                                                isActive ? c.dot : 'bg-psi-border'
                                            )} />
                                            Step {step.number}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* ── RIGHT — Scrollable content ── */}
                        <main
                            ref={contentRef}
                            className="flex-1 min-w-0"
                        >
                            {/* Phase hero banner */}
                            <div className={cn(
                                'rounded-2xl border p-5 mb-8 flex items-center gap-4',
                                phase.color === 'amber' ? 'bg-amber-500/5 border-amber-500/15' :
                                    phase.color === 'emerald' ? 'bg-emerald-500/5 border-emerald-500/15' :
                                        'bg-blue-500/5 border-blue-500/15'
                            )}>
                                <div className={cn(
                                    'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                                    phase.color === 'amber' ? 'bg-amber-500/20 text-amber-400' :
                                        phase.color === 'emerald' ? 'bg-emerald-500/20 text-emerald-400' :
                                            'bg-blue-500/20 text-blue-400'
                                )}>
                                    {phase.icon}
                                </div>
                                <div>
                                    <h2 className={cn(
                                        'text-base font-extrabold',
                                        phase.color === 'amber' ? 'text-amber-300' :
                                            phase.color === 'emerald' ? 'text-emerald-300' : 'text-blue-300'
                                    )}>
                                        {phase.label}
                                    </h2>
                                    <p className="text-slate-400 text-sm">{phase.tagline} · {phase.steps.length} steps</p>
                                </div>
                            </div>

                            {/* Steps */}
                            {phase.steps.map((step, i) => (
                                <React.Fragment key={step.id}>
                                    <StepSection
                                        step={step}
                                        phase={phase}
                                        isLast={i === phase.steps.length - 1}
                                    />
                                </React.Fragment>
                            ))}

                            {/* Phase complete footer */}
                            <div className="mt-8 psi-card rounded-2xl p-6 text-center">
                                <div className="w-10 h-10 bg-psi-subtle rounded-xl flex items-center justify-center mx-auto mb-3">
                                    <CheckSquare size={18} className="text-emerald-500" />
                                </div>
                                <p className="text-psi-primary font-bold mb-1">Phase Complete</p>
                                <p className="text-psi-secondary text-sm">
                                    {phase.id === 'before'
                                        ? 'Your event is fully planned. Move to "During the Event" when roadshow day arrives.'
                                        : phase.id === 'during'
                                            ? 'Event executed. Head to "After the Event" to settle commissions and close the loop.'
                                            : 'Lifecycle complete. All data from this event now improves future recommendations.'}
                                </p>
                                {phase.id !== 'after' && (
                                    <button
                                        onClick={() => switchPhase(phase.id === 'before' ? 'during' : 'after')}
                                        className={cn(
                                            'mt-4 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all mx-auto select-none active:scale-[0.98]',
                                            phase.color === 'amber'
                                                ? 'bg-amber-500 hover:bg-amber-400 text-white'
                                                : 'bg-emerald-500 hover:bg-emerald-400 text-white'
                                        )}
                                    >
                                        Next Phase
                                        <ArrowRight size={15} />
                                    </button>
                                )}
                            </div>
                        </main>
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}

// ── Shell: ProductManual — tab switcher between Visual Manual & Lifecycle Guide ─

type ManualTab = 'visual' | 'lifecycle';

export default function ProductManual() {
    const [tab, setTab] = useState<ManualTab>('visual');

    return (
        <div className="min-h-screen bg-psi-page font-sans flex flex-col">
            {/* ── Top tab switcher ── */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800/60 px-4 py-2 flex items-center gap-1 flex-shrink-0 z-20">
                {([
                    { id: 'visual' as ManualTab, label: '📘 Visual System Manual', active: 'bg-emerald-500 text-white shadow-emerald-500/20', inactive: 'text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400' },
                    { id: 'lifecycle' as ManualTab, label: '📋 Lifecycle Guide', active: 'bg-blue-500 text-white shadow-blue-500/20', inactive: 'text-slate-500 hover:text-blue-600 dark:hover:text-blue-400' },
                ] as { id: ManualTab; label: string; active: string; inactive: string }[]).map((t) => (
                    <button
                        key={t.id}
                        id={`manual-tab-${t.id}`}
                        onClick={() => setTab(t.id)}
                        className={cn(
                            'px-4 py-2 rounded-xl text-xs font-bold transition-all select-none min-h-[36px]',
                            tab === t.id ? cn(t.active, 'shadow-md') : t.inactive
                        )}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ── Content ── */}
            <AnimatePresence mode="wait">
                {tab === 'visual' ? (
                    <motion.div
                        key="visual"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex-1"
                    >
                        <SystemManual />
                    </motion.div>
                ) : (
                    <motion.div
                        key="lifecycle"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex-1"
                    >
                        <LifecycleGuide />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
