/**
 * ThemeContext.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Global light/dark theme management for PSI Event Portal.
 *
 * How it works:
 *   1. On mount, reads the user's saved preference from localStorage.
 *      Falls back to the OS preference (prefers-color-scheme) if no
 *      saved preference exists.
 *   2. Whenever theme changes, adds/removes the `dark` class on
 *      <html> — the standard Tailwind CSS dark mode selector.
 *   3. Persists the choice to localStorage under the key 'psi-theme'.
 *   4. Exposes { theme, toggleTheme } via useTheme() hook.
 *
 * Usage:
 *   // Wrap your app (in main.tsx):
 *   <ThemeProvider><App /></ThemeProvider>
 *
 *   // Anywhere in the component tree:
 *   const { theme, toggleTheme } = useTheme();
 */

import React, { createContext, useContext, useEffect, useState } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

type Theme = 'light' | 'dark';

interface ThemeContextValue {
    theme: Theme;
    toggleTheme: () => void;
    isDark: boolean;
}

// ── Context ───────────────────────────────────────────────────────────────────

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// ── Storage / DOM helpers ─────────────────────────────────────────────────────

const STORAGE_KEY = 'psi-theme';

function getInitialTheme(): Theme {
    // 1. Respect an explicitly saved user preference
    const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (saved === 'light' || saved === 'dark') return saved;

    // 2. Fall back to the OS/browser preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';

    return 'light';
}

function applyTheme(theme: Theme) {
    const root = document.documentElement; // <html>
    if (theme === 'dark') {
        root.classList.add('dark');
    } else {
        root.classList.remove('dark');
    }
    localStorage.setItem(STORAGE_KEY, theme);
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    // Initialise synchronously during first render — this prevents a FOUC
    // (flash of un-themed content) because the class is added before paint.
    const [theme, setTheme] = useState<Theme>(() => {
        const initial = getInitialTheme();
        applyTheme(initial); // apply to <html> immediately
        return initial;
    });

    // Keep <html> class and localStorage in sync whenever theme changes
    useEffect(() => {
        applyTheme(theme);
    }, [theme]);

    const toggleTheme = () => setTheme(prev => (prev === 'light' ? 'dark' : 'light'));

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === 'dark' }}>
            {children}
        </ThemeContext.Provider>
    );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useTheme(): ThemeContextValue {
    const ctx = useContext(ThemeContext);
    if (!ctx) {
        throw new Error('useTheme must be used inside <ThemeProvider>');
    }
    return ctx;
}
