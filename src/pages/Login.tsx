/**
 * Login.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Standalone public-facing login page, rendered inside PublicLayout.
 *
 * Auth flow:
 *   Click "Sign in with Google"
 *     → Google OAuth popup
 *     → Email whitelist check  (propertyshopinvest@gmail.com only)
 *       ├─ DENIED  → signOut() + red "Access Denied" banner
 *       └─ ALLOWED → Firestore profile create/update
 *                  → navigate('/')
 *
 * No global auth guard is applied — the / dashboard remains publicly
 * accessible for executive presentations. Auth is opt-in via /login only.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
    Sparkles,
    ShieldX,
    Loader2,
    Building2,
    CheckCircle2,
    ChevronRight,
} from 'lucide-react';
import { signInWithGoogle, AccessDeniedError } from '../services/auth/googleAuth';
import { injectSeedData, injectPresentationData } from '../utils/firebaseSeeder';

// ── Google "G" SVG icon ───────────────────────────────────────────────────────
// Inlined so we don't need an external image asset.

function GoogleIcon({ size = 20 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
    );
}

// ── Component ─────────────────────────────────────────────────────────────────

type AuthState = 'idle' | 'loading' | 'success' | 'denied' | 'error';

export default function Login() {
    const navigate = useNavigate();
    const [state, setState] = useState<AuthState>('idle');
    const [errorMsg, setErrorMsg] = useState('');

    const handleGoogleSignIn = async () => {
        if (state === 'loading') return;
        setState('loading');
        setErrorMsg('');

        try {
            const profile = await signInWithGoogle();

            // Brief success flash so the user sees confirmation before redirect
            setState('success');
            console.info('[Login] Authenticated as:', profile.name, '/', profile.role);

            setTimeout(() => navigate('/'), 1200);

        } catch (err) {
            if (err instanceof AccessDeniedError) {
                setState('denied');
                setErrorMsg('Access Denied: Unauthorized Email.');
            } else {
                setState('error');
                const msg = err instanceof Error ? err.message : 'Unknown error';
                setErrorMsg(`Sign-in failed: ${msg}`);
                console.error('[Login] Firebase auth error:', err);
            }
        }
    };

    const isLoading = state === 'loading';
    const isDenied = state === 'denied';
    const isSuccess = state === 'success';
    const isError = state === 'error';
    const hasAlert = isDenied || isError;

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 relative overflow-hidden">

            {/* ── Ambient glows ── */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-emerald-500/8 rounded-full blur-[120px]" />
                <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-emerald-600/8 rounded-full blur-[120px]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-amber-500/4 rounded-full blur-[100px]" />
            </div>

            <div className="relative w-full max-w-md mx-4">

                {/* ── Main card ── */}
                <motion.div
                    initial={{ opacity: 0, y: 24, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className="bg-slate-900/80 backdrop-blur-2xl border border-slate-700/60 rounded-3xl shadow-2xl shadow-black/40 overflow-hidden"
                >

                    {/* ── Header band ── */}
                    <div className="px-8 pt-8 pb-6 border-b border-slate-800/60">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500/30 to-emerald-600/10 border border-emerald-500/30 flex items-center justify-center shadow-inner">
                                <Sparkles size={18} className="text-emerald-400" />
                            </div>
                            <div>
                                <h1 className="text-white font-extrabold text-base tracking-tight">PSI Event Portal</h1>
                                <p className="text-slate-500 text-[11px] uppercase tracking-[0.15em]">Property Shop Investment LLC</p>
                            </div>
                        </div>

                        <div>
                            <h2 className="text-white text-2xl font-extrabold tracking-tight mb-1">
                                Welcome back
                            </h2>
                            <p className="text-slate-400 text-sm">
                                Sign in with your authorised Google workspace account.
                            </p>
                        </div>
                    </div>

                    {/* ── Body ── */}
                    <div className="px-8 py-6 space-y-5">

                        {/* ── Error / Denied alert ── */}
                        <AnimatePresence>
                            {hasAlert && (
                                <motion.div
                                    key="alert"
                                    id="login-error-alert"
                                    initial={{ opacity: 0, y: -8, scale: 0.97 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -8, scale: 0.97 }}
                                    transition={{ duration: 0.25 }}
                                    className="flex items-start gap-3 p-4 rounded-2xl bg-red-950/70 border-2 border-red-500/50 shadow-lg shadow-red-500/10"
                                    role="alert"
                                    aria-live="assertive"
                                >
                                    <ShieldX size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
                                    <div className="min-w-0">
                                        <p className="text-red-300 font-bold text-sm leading-tight">
                                            {isDenied ? 'Access Denied: Unauthorized Email.' : 'Sign-In Failed'}
                                        </p>
                                        {isError && (
                                            <p className="text-red-400/70 text-xs mt-1 break-all">{errorMsg}</p>
                                        )}
                                        {isDenied && (
                                            <p className="text-red-400/70 text-xs mt-1">
                                                This portal is restricted to authorised Property Shop Investment accounts only.
                                                Contact your system administrator.
                                            </p>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* ── Success state ── */}
                        <AnimatePresence>
                            {isSuccess && (
                                <motion.div
                                    key="success"
                                    initial={{ opacity: 0, y: -8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-950/70 border border-emerald-500/30"
                                >
                                    <CheckCircle2 size={20} className="text-emerald-400 flex-shrink-0" />
                                    <div>
                                        <p className="text-emerald-300 font-bold text-sm">Authentication Successful</p>
                                        <p className="text-emerald-500/70 text-xs mt-0.5">Redirecting to dashboard…</p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* ── Google Sign-In button ── */}
                        <button
                            id="google-sign-in-btn"
                            onClick={handleGoogleSignIn}
                            disabled={isLoading || isSuccess}
                            className="
                w-full flex items-center justify-center gap-3
                bg-white hover:bg-slate-100 active:bg-slate-200
                disabled:opacity-60 disabled:cursor-not-allowed
                text-slate-800 font-bold text-sm
                py-3.5 px-5 rounded-2xl
                transition-all duration-200
                active:scale-[0.98] select-none
                shadow-md shadow-black/20
                min-h-[52px]
              "
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 size={18} className="animate-spin text-slate-500" />
                                    <span>Signing in…</span>
                                </>
                            ) : isSuccess ? (
                                <>
                                    <CheckCircle2 size={18} className="text-emerald-500" />
                                    <span className="text-emerald-600">Authenticated</span>
                                </>
                            ) : (
                                <>
                                    <GoogleIcon size={20} />
                                    <span>Sign in with Google</span>
                                    <ChevronRight size={15} className="ml-auto text-slate-400" />
                                </>
                            )}
                        </button>

                        {/* ── Retry link shown after denial ── */}
                        <AnimatePresence>
                            {(isDenied || isError) && (
                                <motion.button
                                    key="retry"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={() => { setState('idle'); setErrorMsg(''); }}
                                    className="w-full text-center text-xs text-slate-500 hover:text-slate-300 transition-colors py-1 select-none"
                                >
                                    Try a different account →
                                </motion.button>
                            )}
                        </AnimatePresence>

                    </div>

                    {/* ── Footer ── */}
                    <div className="px-8 pb-6 pt-2">
                        <div className="rounded-2xl bg-slate-800/50 border border-slate-700/40 p-4 flex items-center gap-3">
                            <Building2 size={15} className="text-amber-400 flex-shrink-0" />
                            <p className="text-slate-500 text-[11px] leading-relaxed">
                                <span className="text-amber-400 font-bold">Restricted access.</span>{' '}
                                Authentication is enforced at the account level.
                                Only PSI-authorised Google accounts may sign in.
                            </p>
                        </div>
                    </div>
                </motion.div>

                {/* ── Below-card footnote ── */}
                <p className="text-center text-slate-700 text-[11px] mt-6">
                    PSI Event Portal · © {new Date().getFullYear()} Property Shop Investment LLC
                </p>

                {/* ── DEV: Seeder buttons (low-opacity, out of the way) ─────── */}
                <div className="flex items-center justify-center gap-3 mt-8 opacity-20 hover:opacity-60 transition-opacity duration-300">
                    <button
                        id="dev-seed-full-btn"
                        onClick={async () => {
                            try {
                                const result = await injectSeedData();
                                if (result.success) {
                                    alert(`DEV: Full seed complete (${result.durationMs}ms) — ${Object.values(result.written).reduce((s, n) => s + n, 0)} docs written.`);
                                } else {
                                    alert(`DEV: Seed finished with errors:\n${result.errors.join('\n')}`);
                                }
                            } catch (e) {
                                alert('DEV: Seeder threw — ' + (e instanceof Error ? e.message : String(e)));
                            }
                        }}
                        className="text-[10px] text-slate-600 hover:text-slate-400 border border-slate-800 rounded px-2 py-1 transition-colors select-none"
                    >
                        DEV: Full Seeder
                    </button>

                    <button
                        id="dev-seed-presentation-btn"
                        onClick={async () => {
                            try {
                                await injectPresentationData();
                            } catch (e) {
                                alert('DEV: Presentation seeder threw — ' + (e instanceof Error ? e.message : String(e)));
                            }
                        }}
                        className="text-[10px] text-slate-600 hover:text-slate-400 border border-slate-800 rounded px-2 py-1 transition-colors select-none"
                    >
                        DEV: Run Seeder
                    </button>
                </div>
            </div>
        </div>
    );
}
