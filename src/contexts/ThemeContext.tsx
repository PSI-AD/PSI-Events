/**
 * ThemeContext.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Global light/dark theme management + accent colour system for PSI Event Portal.
 *
 * Accent colours are stored as a CSS custom property --psi-action on <html>,
 * allowing .btn-accent and .ring-accent utilities (defined in index.css) to
 * automatically inherit the chosen brand colour everywhere.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

type Theme = 'light' | 'dark';
export type AccentColor = 'blue' | 'green' | 'purple' | 'rose';

export interface AccentOption {
    id: AccentColor;
    label: string;
    /** hex used as CSS variable value  */
    hex: string;
    /** Tailwind ring/border sample class for the picker swatch */
    ring: string;
    /** bg-* for active swatch */
    bg: string;
}

export const ACCENT_OPTIONS: AccentOption[] = [
    { id: 'blue', label: 'Blue', hex: '#3b82f6', ring: 'ring-blue-500', bg: 'bg-blue-500' },
    { id: 'green', label: 'Green', hex: '#10b981', ring: 'ring-emerald-500', bg: 'bg-emerald-500' },
    { id: 'purple', label: 'Purple', hex: '#8b5cf6', ring: 'ring-violet-500', bg: 'bg-violet-500' },
    { id: 'rose', label: 'Rose', hex: '#f43f5e', ring: 'ring-rose-500', bg: 'bg-rose-500' },
];

interface ThemeContextValue {
    theme: Theme;
    toggleTheme: () => void;
    isDark: boolean;
    accent: AccentColor;
    setAccent: (a: AccentColor) => void;
    accentHex: string;
}

// ── Context ───────────────────────────────────────────────────────────────────

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// ── Storage / DOM helpers ─────────────────────────────────────────────────────

const THEME_KEY = 'psi-theme';
const ACCENT_KEY = 'psi-accent';

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

function applyTheme(theme: Theme) {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem(THEME_KEY, theme);
}

function applyAccent(accent: AccentColor) {
    const opt = ACCENT_OPTIONS.find(a => a.id === accent)!;
    document.documentElement.style.setProperty('--psi-action', opt.hex);
    // also store a subtle (10 % opacity) version for soft backgrounds
    document.documentElement.style.setProperty('--psi-action-subtle', opt.hex + '1a');
    localStorage.setItem(ACCENT_KEY, accent);
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

    useEffect(() => { applyTheme(theme); }, [theme]);

    const toggleTheme = () => setTheme(prev => (prev === 'light' ? 'dark' : 'light'));

    const setAccent = (a: AccentColor) => {
        applyAccent(a);
        setAccentState(a);
    };

    const accentHex = ACCENT_OPTIONS.find(a => a.id === accent)!.hex;

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === 'dark', accent, setAccent, accentHex }}>
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
