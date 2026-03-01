/**
 * ThemeContext.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Global theme management for PSI Event Portal.
 *
 * Controls three independent axes:
 *   1. light / dark           — Tailwind dark class on <html>
 *   2. accent colour          — --psi-action CSS variable on <html>
 *   3. UI theme variant       — 'default' (PSI dark-slate) | 'modern' (Google/Material)
 *                               Applied as class "theme-modern" on <html>
 *
 * All three axes are persisted to localStorage and restored on boot.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

type Theme = 'light' | 'dark';
export type AccentColor = 'blue' | 'green' | 'purple' | 'rose';
export type UITheme = 'default' | 'modern' | 'glass' | 'corporate' | 'minimal';

export interface AccentOption {
    id: AccentColor;
    label: string;
    /** Hex used as CSS variable value */
    hex: string;
    /** Tailwind ring/border sample class for the picker swatch */
    ring: string;
    /** bg-* for active swatch */
    bg: string;
}

export interface UIThemeOption {
    id: UITheme;
    label: string;
    description: string;
    preview: {
        bg: string;
        surface: string;
        accent: string;
        text: string;
        border: string;
    };
}

export const ACCENT_OPTIONS: AccentOption[] = [
    { id: 'blue', label: 'Blue', hex: '#3b82f6', ring: 'ring-blue-500', bg: 'bg-blue-500' },
    { id: 'green', label: 'Green', hex: '#10b981', ring: 'ring-emerald-500', bg: 'bg-emerald-500' },
    { id: 'purple', label: 'Purple', hex: '#8b5cf6', ring: 'ring-violet-500', bg: 'bg-violet-500' },
    { id: 'rose', label: 'Rose', hex: '#f43f5e', ring: 'ring-rose-500', bg: 'bg-rose-500' },
];

export const UI_THEME_OPTIONS: UIThemeOption[] = [
    {
        id: 'default',
        label: 'PSI Default',
        description: 'Dark slate sidebar, high-contrast cards, emerald brand',
        preview: {
            bg: '#f8fafc',
            surface: '#ffffff',
            accent: '#10b981',
            text: '#0f172a',
            border: '#e2e8f0',
        },
    },
    {
        id: 'modern',
        label: 'Modern (Google-style)',
        description: 'Clean white surfaces, Google Blue accent, Material Design language',
        preview: {
            bg: '#f8f9fa',
            surface: '#ffffff',
            accent: '#1a73e8',
            text: '#202124',
            border: '#dadce0',
        },
    },
    {
        id: 'glass',
        label: 'Glass',
        description: 'Frosted-glass surfaces, vivid gradients, depth through blur and translucency',
        preview: {
            bg: '#0f0c29',
            surface: 'rgba(255,255,255,0.12)',
            accent: '#a78bfa',
            text: '#f8fafc',
            border: 'rgba(255,255,255,0.18)',
        },
    },
    {
        id: 'corporate',
        label: 'Corporate',
        description: 'Navy-and-gold enterprise palette, structured grid, high-contrast readability',
        preview: {
            bg: '#f0f4f8',
            surface: '#ffffff',
            accent: '#b8860b',
            text: '#1a2332',
            border: '#c8d4e0',
        },
    },
    {
        id: 'minimal',
        label: 'Minimal',
        description: 'Pure white canvas, hairline borders, understated typography, maximum focus',
        preview: {
            bg: '#ffffff',
            surface: '#fafafa',
            accent: '#111827',
            text: '#111827',
            border: '#e5e7eb',
        },
    },
];

interface ThemeContextValue {
    theme: Theme;
    toggleTheme: () => void;
    isDark: boolean;
    accent: AccentColor;
    setAccent: (a: AccentColor) => void;
    accentHex: string;
    uiTheme: UITheme;
    setUITheme: (t: UITheme) => void;
}

// ── Context ───────────────────────────────────────────────────────────────────

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// ── Storage keys ──────────────────────────────────────────────────────────────

const THEME_KEY = 'psi-theme';
const ACCENT_KEY = 'psi-accent';
const UI_THEME_KEY = 'psi-ui-theme';

// ── DOM helpers ───────────────────────────────────────────────────────────────

function getInitialTheme(): Theme {
    const saved = localStorage.getItem(THEME_KEY) as Theme | null;
    if (saved === 'light' || saved === 'dark') return saved;
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    return 'light';
}

function getInitialAccent(): AccentColor {
    const saved = localStorage.getItem(ACCENT_KEY) as AccentColor | null;
    if (saved && ACCENT_OPTIONS.find(a => a.id === saved)) return saved;
    return 'blue';
}

const VALID_UI_THEMES: UITheme[] = ['default', 'modern', 'glass', 'corporate', 'minimal'];

function getInitialUITheme(): UITheme {
    const saved = localStorage.getItem(UI_THEME_KEY) as UITheme | null;
    if (saved && VALID_UI_THEMES.includes(saved)) return saved;
    return 'default';
}

function applyTheme(theme: Theme) {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem(THEME_KEY, theme);
}

function applyAccent(accent: AccentColor) {
    const opt = ACCENT_OPTIONS.find(a => a.id === accent)!;
    document.documentElement.style.setProperty('--psi-action', opt.hex);
    document.documentElement.style.setProperty('--psi-action-subtle', opt.hex + '1a');
    localStorage.setItem(ACCENT_KEY, accent);
}

const UI_THEME_CLASSES: Record<UITheme, string> = {
    default: '',
    modern: 'theme-modern',
    glass: 'theme-glass',
    corporate: 'theme-corporate',
    minimal: 'theme-minimal',
};

function applyUITheme(uiTheme: UITheme) {
    const root = document.documentElement;
    // Remove all theme classes first
    Object.values(UI_THEME_CLASSES).forEach(cls => {
        if (cls) root.classList.remove(cls);
    });
    // Apply the new one (if any)
    const cls = UI_THEME_CLASSES[uiTheme];
    if (cls) root.classList.add(cls);
    localStorage.setItem(UI_THEME_KEY, uiTheme);
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<Theme>(() => {
        const initial = getInitialTheme();
        applyTheme(initial);
        return initial;
    });

    const [accent, setAccentState] = useState<AccentColor>(() => {
        const initial = getInitialAccent();
        applyAccent(initial);
        return initial;
    });

    const [uiTheme, setUIThemeState] = useState<UITheme>(() => {
        const initial = getInitialUITheme();
        applyUITheme(initial);
        return initial;
    });

    useEffect(() => { applyTheme(theme); }, [theme]);

    const toggleTheme = () => setTheme(prev => (prev === 'light' ? 'dark' : 'light'));

    const setAccent = (a: AccentColor) => {
        applyAccent(a);
        setAccentState(a);
    };

    const setUITheme = (t: UITheme) => {
        applyUITheme(t);
        setUIThemeState(t);
    };

    const accentHex = ACCENT_OPTIONS.find(a => a.id === accent)!.hex;

    return (
        <ThemeContext.Provider value={{
            theme, toggleTheme, isDark: theme === 'dark',
            accent, setAccent, accentHex,
            uiTheme, setUITheme,
        }}>
            {children}
        </ThemeContext.Provider>
    );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useTheme(): ThemeContextValue {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
    return ctx;
}
