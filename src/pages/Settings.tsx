/**
 * Settings.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Application Settings page — macOS / Linear-style split layout.
 * Left column: vertical tab rail. Right column: section content.
 * Fully respects dark: Tailwind variants from ThemeContext.
 *
 * Sections:
 *   Profile     — read-only authenticated user card
 *   Preferences — theme selector (Light / Dark / System) + notification toggles
 *   Security    — change-password placeholder + 2FA placeholder
 */

import React, { useState } from 'react';
import {
    User, Sliders, ShieldCheck,
    Sun, Moon, Monitor,
    Mail, MessageCircle,
    Lock, Smartphone,
    CheckCircle2,
    BadgeCheck, Globe, Palette,
    LayoutDashboard, Sparkles, Layers, Building2, Minus,
    ListChecks,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme, ACCENT_OPTIONS, UI_THEME_OPTIONS } from '../contexts/ThemeContext';
import type { AccentColor, UITheme } from '../contexts/ThemeContext';
import ChecklistBuilder from '../features/settings/ChecklistBuilder';
import { injectSeedData } from '../utils/firebaseSeeder';

// ── Types ─────────────────────────────────────────────────────────────────────

type Section = 'profile' | 'preferences' | 'security' | 'checklist';

// ── Profile data (fallback / hardcoded) ───────────────────────────────────────

const PROFILE = {
    name: 'Amr ElFangary',
    email: 'propertyshopinvest@gmail.com',
    role: 'System Administrator',
    branch: 'Global',
    initials: 'AE',
};

// ── Reusable sub-components ───────────────────────────────────────────────────

/** A toggle switch with a smooth animated knob */
function ToggleSwitch({
    id,
    checked,
    onChange,
}: {
    id: string;
    checked: boolean;
    onChange: (val: boolean) => void;
}) {
    return (
        <button
            id={id}
            role="switch"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            className={`
                relative flex-shrink-0 w-12 h-6 rounded-full
                transition-colors duration-300 select-none focus:outline-none
                focus-visible:ring-2 focus-visible:ring-emerald-500/60
                ${checked ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}
            `}
        >
            <div
                className={`
                    absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md
                    transition-transform duration-300
                    ${checked ? 'translate-x-6' : 'translate-x-0.5'}
                `}
            />
        </button>
    );
}

/** A card wrapper consistent with settings content area */
function SettingsCard({
    title,
    description,
    children,
}: {
    title: string;
    description?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="psi-card overflow-hidden">
            <div className="px-6 py-4 border-b border-psi">
                <h3 className="font-bold text-psi-primary text-sm">{title}</h3>
                {description && (
                    <p className="text-xs text-psi-muted mt-0.5">{description}</p>
                )}
            </div>
            <div className="px-6 py-5">{children}</div>
        </div>
    );
}

/** A row inside a settings card with a label + right-side control */
function SettingsRow({
    icon: Icon,
    label,
    description,
    children,
    iconColor = 'text-slate-400 dark:text-slate-500',
}: {
    icon: React.ElementType;
    label: string;
    description?: string;
    children: React.ReactNode;
    iconColor?: string;
}) {
    return (
        <div className="flex items-center justify-between gap-4 py-3.5 border-b border-slate-100 dark:border-slate-700/40 last:border-0">
            <div className="flex items-start gap-3 min-w-0">
                <Icon size={18} className={`flex-shrink-0 mt-0.5 ${iconColor}`} />
                <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{label}</p>
                    {description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>
                    )}
                </div>
            </div>
            <div className="flex-shrink-0">{children}</div>
        </div>
    );
}

// ── Section: Profile ──────────────────────────────────────────────────────────

function ProfileSection() {
    return (
        <div className="space-y-5">
            {/* Avatar + identity card */}
            <SettingsCard title="Identity" description="Your authorised PSI Event Portal account.">
                <div className="flex items-center gap-5">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                            <span className="text-white font-extrabold text-2xl tracking-tight">
                                {PROFILE.initials}
                            </span>
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-800 flex items-center justify-center">
                            <CheckCircle2 size={11} className="text-white" />
                        </div>
                    </div>

                    {/* Details */}
                    <div className="min-w-0">
                        <h4 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                            {PROFILE.name}
                        </h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{PROFILE.email}</p>
                        <div className="flex items-center gap-2 mt-2">
                            <span className="px-2.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full text-[10px] font-bold uppercase tracking-widest">
                                {PROFILE.role}
                            </span>
                        </div>
                    </div>
                </div>
            </SettingsCard>

            {/* Read-only profile fields */}
            <SettingsCard title="Account Details" description="Read-only. Contact your administrator to change these values.">
                <div className="space-y-0">
                    <SettingsRow icon={User} label="Full Name" iconColor="text-slate-400">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 select-all">
                            {PROFILE.name}
                        </span>
                    </SettingsRow>
                    <SettingsRow icon={Mail} label="Email Address" iconColor="text-blue-400">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 select-all font-mono">
                            {PROFILE.email}
                        </span>
                    </SettingsRow>
                    <SettingsRow icon={BadgeCheck} label="System Role" iconColor="text-amber-400">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            {PROFILE.role}
                        </span>
                    </SettingsRow>
                    <SettingsRow icon={Globe} label="Branch" iconColor="text-emerald-400">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            {PROFILE.branch}
                        </span>
                    </SettingsRow>
                </div>
            </SettingsCard>
        </div>
    );
}

// ── Section: Preferences ──────────────────────────────────────────────────────

type ThemeChoice = 'light' | 'dark' | 'system';

const THEME_OPTIONS: { id: ThemeChoice; label: string; icon: React.ElementType; description: string }[] = [
    { id: 'light', label: 'Light', icon: Sun, description: 'Clean, bright interface' },
    { id: 'dark', label: 'Dark', icon: Moon, description: 'Easy on the eyes at night' },
    { id: 'system', label: 'System', icon: Monitor, description: 'Follow OS preference' },
];

// ── UI Theme Picker ──────────────────────────────────────────────────────────

const THEME_ICONS: Record<string, React.ElementType> = {
    default: LayoutDashboard,
    modern: Sparkles,
    glass: Layers,
    corporate: Building2,
    minimal: Minus,
};

function UIThemePicker() {
    const { uiTheme, setUITheme } = useTheme();

    return (
        <SettingsCard
            title="UI Style"
            description="Choose the overall look and feel of the portal. Changes take effect immediately."
        >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {UI_THEME_OPTIONS.map(opt => {
                    const isSelected = uiTheme === opt.id;
                    const ThemeIcon = THEME_ICONS[opt.id] ?? Sparkles;
                    const darkSidebar = opt.id === 'default' || opt.id === 'glass' || opt.id === 'corporate';
                    return (
                        <button
                            key={opt.id}
                            id={`ui-theme-btn-${opt.id}`}
                            onClick={() => setUITheme(opt.id as UITheme)}
                            className={`
                                relative group flex flex-col gap-3 p-4 rounded-2xl border-2
                                transition-all duration-200 text-left select-none active:scale-[0.98]
                                ${isSelected
                                    ? 'border-psi-action bg-psi-action-subtle shadow-md'
                                    : 'border-psi hover:border-psi-strong bg-psi-subtle'
                                }
                            `}
                        >
                            {/* Selected ring + check */}
                            {isSelected && (
                                <motion.div
                                    layoutId="ui-theme-selected"
                                    className="absolute top-3 right-3 w-5 h-5 bg-psi-action rounded-full flex items-center justify-center shadow-sm"
                                >
                                    <CheckCircle2 size={12} className="text-white" />
                                </motion.div>
                            )}

                            {/* Mini preview mockup */}
                            <div
                                className="w-full aspect-[16/7] rounded-xl overflow-hidden shadow-sm relative flex"
                                style={{ backgroundColor: opt.preview.bg, border: `1px solid ${opt.preview.border}` }}
                            >
                                {/* Sidebar strip */}
                                <div
                                    className="w-10 h-full flex flex-col items-center pt-2 gap-1.5"
                                    style={
                                        darkSidebar && opt.id !== 'glass'
                                            ? { backgroundColor: opt.preview.text === '#1a2332' ? '#1a2332' : '#0f172a', borderRight: `1px solid ${opt.preview.border}` }
                                            : { backgroundColor: opt.preview.bg, borderRight: `1px solid ${opt.preview.border}` }
                                    }
                                >
                                    <div className="w-5 h-1.5 rounded-full" style={{ backgroundColor: opt.preview.accent, opacity: 0.9 }} />
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="w-6 h-1 rounded-full"
                                            style={{ backgroundColor: (darkSidebar && opt.id !== 'glass') ? 'rgba(255,255,255,.2)' : opt.preview.border }} />
                                    ))}
                                </div>
                                {/* Content area */}
                                <div className="flex-1 p-2 flex flex-col gap-1.5">
                                    {/* Header bar */}
                                    <div className="w-full h-3 rounded flex items-center justify-between px-1.5"
                                        style={{ backgroundColor: opt.preview.surface, border: `1px solid ${opt.preview.border}` }}>
                                        <div className="w-6 h-1 rounded-full" style={{ backgroundColor: opt.preview.text, opacity: 0.35 }} />
                                        <div className="w-3 h-1.5 rounded-full" style={{ backgroundColor: opt.preview.accent }} />
                                    </div>
                                    {/* Cards row */}
                                    <div className="flex gap-1.5 flex-1">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="flex-1 rounded"
                                                style={{ backgroundColor: opt.preview.surface, border: `1px solid ${opt.preview.border}` }}>
                                                <div className="w-full h-1.5 rounded-t" style={{ backgroundColor: opt.preview.accent, opacity: i === 1 ? 0.9 : 0.25 }} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Label */}
                            <div>
                                <p className={`text-sm font-bold ${isSelected ? 'text-psi-action' : 'text-psi-primary'}`}>
                                    <span className="flex items-center gap-1.5">
                                        <ThemeIcon size={13} />
                                        {opt.label}
                                    </span>
                                </p>
                                <p className="text-[11px] text-psi-muted mt-0.5 leading-snug">{opt.description}</p>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Live indicator */}
            <div className="mt-4 px-3 py-2 rounded-xl bg-psi-subtle border border-psi flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
                <p className="text-xs text-psi-secondary">
                    Currently using: <span className="font-bold text-psi-primary">{UI_THEME_OPTIONS.find(o => o.id === uiTheme)?.label}</span> · Changes apply instantly.
                </p>
            </div>
        </SettingsCard>
    );
}

// ── Section: Preferences ──────────────────────────────────────────────────────

function PreferencesSection() {
    const { theme, toggleTheme, accent, setAccent } = useTheme();

    // Map the 3-way choice to the 2-way toggle
    // 'system' falls back to the current applied theme
    const [themeChoice, setThemeChoice] = useState<ThemeChoice>(
        (localStorage.getItem('psi-theme') as ThemeChoice | null) === 'light'
            ? 'light'
            : (localStorage.getItem('psi-theme') as ThemeChoice | null) === 'dark'
                ? 'dark'
                : 'system'
    );

    const [notifications, setNotifications] = useState({
        emailAlerts: true,
        whatsappNudges: false,
    });

    function handleThemeSelect(choice: ThemeChoice) {
        setThemeChoice(choice);
        if (choice === 'light') {
            // Force light
            if (theme === 'dark') toggleTheme();
            else localStorage.setItem('psi-theme', 'light');
        } else if (choice === 'dark') {
            // Force dark
            if (theme === 'light') toggleTheme();
            else localStorage.setItem('psi-theme', 'dark');
        } else {
            // System — read OS preference and apply
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            const shouldBeDark = prefersDark;
            if ((theme === 'dark') !== shouldBeDark) toggleTheme();
            localStorage.removeItem('psi-theme');
        }
    }

    return (
        <div className="space-y-5">

            {/* UI Theme switcher — shown before appearance */}
            <UIThemePicker />

            {/* Theme selector */}
            <SettingsCard
                title="Appearance"
                description="Choose how the PSI Event Portal looks on your device."
            >
                <div className="grid grid-cols-3 gap-3">
                    {THEME_OPTIONS.map(({ id, label, icon: Icon, description }) => {
                        const isSelected = themeChoice === id;
                        return (
                            <button
                                key={id}
                                id={`theme-btn-${id}`}
                                onClick={() => handleThemeSelect(id)}
                                className={`
                                    relative flex flex-col items-center gap-2.5 p-4 rounded-2xl
                                    border-2 transition-all duration-200 cursor-pointer select-none
                                    active:scale-[0.97]
                                    ${isSelected
                                        ? 'border-psi-action bg-psi-action-subtle shadow-sm'
                                        : 'border-psi hover:border-psi-strong bg-psi-subtle'
                                    }
                                `}
                            >
                                {/* Selected indicator */}
                                {isSelected && (
                                    <div className="absolute top-2.5 right-2.5 w-4 h-4 bg-psi-action rounded-full flex items-center justify-center">
                                        <div className="w-1.5 h-1.5 bg-white rounded-full" />
                                    </div>
                                )}

                                {/* Icon */}
                                <div className={`
                                    w-10 h-10 rounded-xl flex items-center justify-center
                                    ${isSelected ? 'bg-psi-action-subtle' : 'bg-psi-subtle'}
                                `}>
                                    <Icon
                                        size={20}
                                        className={isSelected ? 'text-psi-action' : 'text-psi-muted'}
                                    />
                                </div>

                                {/* Label */}
                                <div className="text-center">
                                    <p className={`text-sm font-bold ${isSelected ? 'text-psi-action' : 'text-psi-primary'}`}>
                                        {label}
                                    </p>
                                    <p className="text-[10px] text-psi-muted mt-0.5 leading-tight hidden sm:block">
                                        {description}
                                    </p>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </SettingsCard>

            {/* Accent colour picker */}
            <SettingsCard
                title="Accent Colour"
                description="Choose your brand accent colour — applied to buttons, tabs, and highlights across the entire portal."
            >
                <div className="flex items-center gap-3 flex-wrap">
                    {ACCENT_OPTIONS.map(opt => {
                        const isSelected = accent === opt.id;
                        return (
                            <button
                                key={opt.id}
                                id={`accent-btn-${opt.id}`}
                                onClick={() => setAccent(opt.id as AccentColor)}
                                title={opt.label}
                                className={`
                                    relative w-10 h-10 rounded-full transition-all duration-200
                                    active:scale-95 select-none
                                    ${opt.bg}
                                    ${isSelected
                                        ? `ring-2 ${opt.ring} ring-offset-2 ring-offset-white dark:ring-offset-slate-800 scale-110`
                                        : 'opacity-60 hover:opacity-90'
                                    }
                                `}
                            >
                                {isSelected && (
                                    <span className="absolute inset-0 flex items-center justify-center">
                                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                            <path d="M2 7L5.5 10.5L12 4" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </span>
                                )}
                            </button>
                        );
                    })}
                    <span className="text-xs text-psi-muted ml-1">
                        {ACCENT_OPTIONS.find(o => o.id === accent)?.label}
                    </span>
                </div>
            </SettingsCard>

            {/* Notifications */}
            <SettingsCard
                title="Notifications"
                description="Control when and how the system alerts you about agent activity."
            >
                <div className="space-y-0">
                    <SettingsRow
                        icon={Mail}
                        label="Email Alerts"
                        description="Receive email reminders for upcoming document deadlines and manager approvals."
                        iconColor="text-blue-400"
                    >
                        <ToggleSwitch
                            id="toggle-email-alerts"
                            checked={notifications.emailAlerts}
                            onChange={v => setNotifications(n => ({ ...n, emailAlerts: v }))}
                        />
                    </SettingsRow>
                    <SettingsRow
                        icon={MessageCircle}
                        label="WhatsApp Nudges"
                        description="Send automated WhatsApp messages via Twilio to non-compliant agents."
                        iconColor="text-emerald-400"
                    >
                        <ToggleSwitch
                            id="toggle-whatsapp-nudges"
                            checked={notifications.whatsappNudges}
                            onChange={v => setNotifications(n => ({ ...n, whatsappNudges: v }))}
                        />
                    </SettingsRow>
                </div>

                {/* Status summary pill */}
                <div className="mt-4 p-3 rounded-xl bg-psi-subtle border border-psi">
                    <p className="text-xs text-psi-secondary">
                        <span className="font-bold text-psi-primary">Active channels: </span>
                        {[
                            notifications.emailAlerts && 'Email',
                            notifications.whatsappNudges && 'WhatsApp',
                        ].filter(Boolean).join(', ') || 'None — all notifications disabled'}
                    </p>
                </div>
            </SettingsCard>
        </div>
    );
}

// ── Section: Security ─────────────────────────────────────────────────────────

function ComingSoonBadge() {
    return (
        <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full text-[10px] font-bold uppercase tracking-wider">
            Coming Soon
        </span>
    );
}

function SecuritySection() {
    return (
        <div className="space-y-5">
            {/* Password */}
            <SettingsCard title="Password" description="Manage your portal login credentials.">
                <div className="space-y-0">
                    <SettingsRow
                        icon={Lock}
                        label="Change Password"
                        description="Update the password linked to your Google account via Firebase Auth."
                        iconColor="text-rose-400"
                    >
                        <ComingSoonBadge />
                    </SettingsRow>
                    <SettingsRow
                        icon={ShieldCheck}
                        label="Password Strength"
                        description="Managed by Google — PSI does not store passwords directly."
                        iconColor="text-emerald-400"
                    >
                        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                            <CheckCircle2 size={14} />
                            <span>Google-managed</span>
                        </div>
                    </SettingsRow>
                </div>
            </SettingsCard>

            {/* 2FA */}
            <SettingsCard
                title="Two-Factor Authentication"
                description="Add a second layer of security to your account."
            >
                <div className="space-y-0">
                    <SettingsRow
                        icon={Smartphone}
                        label="Authenticator App"
                        description="Use Google Authenticator, Authy, or a compatible TOTP app."
                        iconColor="text-violet-400"
                    >
                        <ComingSoonBadge />
                    </SettingsRow>
                    <SettingsRow
                        icon={MessageCircle}
                        label="SMS One-Time Code"
                        description="Receive a 6-digit code via SMS for every login attempt."
                        iconColor="text-blue-400"
                    >
                        <ComingSoonBadge />
                    </SettingsRow>
                </div>

                {/* Info box */}
                <div className="mt-4 p-4 rounded-xl bg-violet-50 dark:bg-violet-900/10 border border-violet-200 dark:border-violet-800/40">
                    <div className="flex items-start gap-2.5">
                        <ShieldCheck size={16} className="text-violet-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-violet-700 dark:text-violet-400 leading-relaxed">
                            Two-Factor Authentication will be enforced for all{' '}
                            <span className="font-bold">God-Mode Organizer</span> accounts in the next
                            portal update. You will receive an email notification before it becomes mandatory.
                        </p>
                    </div>
                </div>
            </SettingsCard>

            {/* Active sessions */}
            <SettingsCard title="Active Sessions" description="Devices currently signed into the portal.">
                <div className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-psi-subtle flex items-center justify-center">
                            <Monitor size={16} className="text-psi-muted" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-psi-primary">This device</p>
                            <p className="text-xs text-psi-muted">macOS · Chrome · Abu Dhabi</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                        <span>Current</span>
                    </div>
                </div>
            </SettingsCard>
        </div>
    );
}

// ── Nav rail items ────────────────────────────────────────────────────────────

const NAV_ITEMS: { id: Section; label: string; icon: React.ElementType; description: string }[] = [
    { id: 'profile', label: 'Profile', icon: User, description: 'Account & identity' },
    { id: 'preferences', label: 'Preferences', icon: Sliders, description: 'Theme & notifications' },
    { id: 'security', label: 'Security', icon: ShieldCheck, description: 'Password & 2FA' },
    { id: 'checklist', label: 'Checklist Builder', icon: ListChecks, description: 'Onboarding templates' },
];

// ── Main component ────────────────────────────────────────────────────────────

export default function Settings() {
    const [activeSection, setActiveSection] = useState<Section>('profile');
    const [seeding, setSeeding] = useState(false);

    async function handleSeedData() {
        if (!window.confirm('⚠️  This will write seed data to Firestore.\n\nOnly run this ONCE on a fresh database.\n\nProceed?')) return;
        setSeeding(true);
        try {
            const result = await injectSeedData();
            if (result.success) {
                alert(
                    `✅ Data Injection Successful!\n\n` +
                    Object.entries(result.written)
                        .map(([col, n]) => `  • ${col}: ${n} docs`)
                        .join('\n') +
                    `\n\nTotal: ${Object.values(result.written).reduce((s, n) => s + n, 0)} documents\nTime: ${result.durationMs}ms`
                );
            } else {
                alert(`❌ Seeder completed with errors:\n\n${result.errors.join('\n')}`);
            }
        } catch (err) {
            alert(`❌ Seeder crashed:\n\n${err instanceof Error ? err.message : String(err)}`);
        } finally {
            setSeeding(false);
        }
    }

    return (
        <div className="min-h-screen bg-psi-page p-4 md:p-8">

            {/* Page header */}
            <header className="max-w-5xl mx-auto mb-8">
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-psi-primary">
                    Settings
                </h1>
                <p className="text-psi-muted mt-1 text-sm">
                    Manage your account, preferences, and security.
                </p>
            </header>

            <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-6">

                {/* ── Left nav rail ── */}
                <nav
                    aria-label="Settings sections"
                    className="
                        md:w-56 flex-shrink-0
                        flex md:flex-col
                        gap-1
                        overflow-x-auto md:overflow-visible
                    bg-psi-card
                        md:bg-transparent
                        rounded-2xl md:rounded-none
                        border md:border-0
                        border-slate-200 dark:border-slate-700/50
                        p-2 md:p-0
                        scrollbar-none
                    "
                >
                    {NAV_ITEMS.map(({ id, label, icon: Icon, description }) => {
                        const isActive = activeSection === id;
                        return (
                            <button
                                key={id}
                                id={`settings-tab-${id}`}
                                onClick={() => setActiveSection(id)}
                                className={`
                                    relative flex items-center gap-3 px-3 py-3 rounded-xl
                                    transition-all duration-200 select-none text-left
                                    flex-shrink-0 md:flex-shrink min-w-max md:min-w-0 md:w-full
                                    ${isActive
                                        ? 'bg-psi-action-subtle border border-psi-action text-psi-action shadow-sm'
                                        : 'text-psi-secondary hover:bg-psi-subtle hover:text-psi-primary'
                                    }
                                `}
                            >
                                <span className={`flex-shrink-0 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`}>
                                    <Icon size={18} className={isActive ? 'text-psi-action' : ''} />
                                </span>
                                <span className="hidden md:block">
                                    <span className="block text-sm font-bold leading-tight">{label}</span>
                                    <span className={`text-[10px] leading-tight ${isActive ? 'text-psi-secondary' : 'text-psi-muted'}`}>
                                        {description}
                                    </span>
                                </span>
                                {/* Mobile: just label */}
                                <span className="md:hidden text-sm font-bold">{label}</span>

                                {isActive && (
                                    <motion.div
                                        layoutId="settings-active-indicator"
                                        className="hidden md:block absolute right-3 w-1.5 h-1.5 rounded-full bg-psi-action"
                                    />
                                )}
                            </button>
                        );
                    })}
                </nav>

                {/* ── Right content panel ── */}
                <div className="flex-1 min-w-0">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeSection}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.18, ease: 'easeOut' }}
                        >
                            {activeSection === 'profile' && <ProfileSection />}
                            {activeSection === 'preferences' && <PreferencesSection />}
                            {activeSection === 'security' && <SecuritySection />}
                            {activeSection === 'checklist' && <ChecklistBuilder />}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            {/* ── DEV: Seed Trigger — fixed bottom-right, low opacity, hidden in plain sight ── */}
            <button
                id="dev-seed-trigger"
                onClick={handleSeedData}
                disabled={seeding}
                title="DEV: Inject Firestore seed data"
                className="fixed bottom-4 right-4 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                           bg-slate-800 text-slate-400 border border-slate-700
                           text-[10px] font-mono font-bold tracking-wider
                           opacity-30 hover:opacity-90 transition-opacity duration-300
                           disabled:cursor-not-allowed select-none shadow-lg"
            >
                {seeding ? (
                    <>
                        <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                        Seeding…
                    </>
                ) : (
                    <>⚡ DEV: Run Seeder</>
                )}
            </button>
        </div>
    );
}
