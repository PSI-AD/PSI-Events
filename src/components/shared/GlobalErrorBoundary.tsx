/**
 * GlobalErrorBoundary.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * React class-based Error Boundary.
 *
 * Must be a class component — React's componentDidCatch and
 * getDerivedStateFromError lifecycle methods are not available in function
 * components. This component sits at the very top of the render tree and
 * catches any error that propagates up from its children, replacing the
 * blank white screen of death with a branded, informative fallback UI.
 *
 * Common triggers this catches:
 *   • auth/invalid-api-key — Firebase misconfiguration
 *   • Undefined import.meta.env variables in production
 *   • Firestore permission-denied errors thrown during initialization
 *   • Any unhandled runtime error in a child component tree
 */

import React from 'react';
import { ShieldAlert, RefreshCw, Terminal, ChevronDown, ChevronUp } from 'lucide-react';

// ── State shape ────────────────────────────────────────────────────────────────

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    errorInfo: React.ErrorInfo | null;
    showDetails: boolean;
}

// ── Props shape ────────────────────────────────────────────────────────────────

interface ErrorBoundaryProps {
    children: React.ReactNode;
}

// ── Component ──────────────────────────────────────────────────────────────────

export class GlobalErrorBoundary extends React.Component<
    ErrorBoundaryProps,
    ErrorBoundaryState
> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
            showDetails: false,
        };
    }

    /**
     * Called during render when a descendant throws.
     * Used to update state so the next render shows the fallback UI.
     * This is a static method — it cannot access `this`.
     */
    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
        return { hasError: true, error };
    }

    /**
     * Called after render when a descendant throws.
     * Used for side-effects like logging.
     */
    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
        this.setState({ errorInfo });

        // Structured log — visible in Firebase Hosting / Vercel / browser DevTools
        console.group('[PSI Portal] Unhandled React Error');
        console.error('Error       :', error.message);
        console.error('Stack       :', error.stack);
        console.error('Component   :', errorInfo.componentStack);
        console.groupEnd();

        // Detect Firebase API key error specifically for a more targeted message
        if (error.message?.includes('api-key') || error.message?.includes('API_KEY')) {
            console.error(
                '[PSI Portal] This error is likely caused by a missing or invalid ' +
                'VITE_FIREBASE_API_KEY. Check your .env.local file or CI/CD environment secrets.'
            );
        }
    }

    private handleReload = () => {
        window.location.reload();
    };

    private toggleDetails = () => {
        this.setState(prev => ({ showDetails: !prev.showDetails }));
    };

    render() {
        if (!this.state.hasError) {
            return this.props.children;
        }

        const { error, errorInfo, showDetails } = this.state;
        const isFirebaseKeyError =
            error?.message?.toLowerCase().includes('api-key') ||
            error?.message?.toLowerCase().includes('api key') ||
            error?.message?.toLowerCase().includes('invalid-api-key');

        return (
            <div
                id="global-error-boundary"
                className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center px-4 py-12 font-sans"
                role="alert"
                aria-live="assertive"
            >
                {/* Background ambient glow */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-red-500/5 blur-[120px] rounded-full" />
                </div>

                <div className="relative z-10 max-w-lg w-full space-y-6">

                    {/* ── Icon + brand ───────────────────────────────────────── */}
                    <div className="flex items-center justify-center">
                        <div className="w-20 h-20 bg-red-500/10 border border-red-500/30 rounded-3xl flex items-center justify-center shadow-2xl shadow-red-500/10">
                            <ShieldAlert size={40} className="text-red-400" />
                        </div>
                    </div>

                    {/* ── Title block ────────────────────────────────────────── */}
                    <div className="text-center space-y-2">
                        <p className="text-amber-400 text-[11px] font-bold tracking-[0.25em] uppercase">
                            Property Shop Investment — Event Portal
                        </p>
                        <h1 className="text-slate-900 dark:text-white text-2xl md:text-3xl font-extrabold tracking-tight">
                            System Initialization Error
                        </h1>
                        <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed max-w-md mx-auto">
                            The portal encountered a configuration error and could not start.{' '}
                            {isFirebaseKeyError
                                ? 'A Firebase API key is missing or invalid.'
                                : 'An unexpected error occurred during initialization.'}
                        </p>
                    </div>

                    {/* ── Admin hint card ─────────────────────────────────────── */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3">
                        <div className="flex items-center gap-2">
                            <Terminal size={14} className="text-amber-400 flex-shrink-0" />
                            <p className="text-amber-400 text-xs font-bold uppercase tracking-widest">
                                Administrator Notice
                            </p>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                            If you are an administrator, please verify your environment variables.
                        </p>

                        {isFirebaseKeyError && (
                            <div className="bg-red-950/50 border border-red-800/50 rounded-xl px-4 py-3 mt-2">
                                <p className="text-red-300 text-xs font-mono leading-relaxed">
                                    VITE_FIREBASE_API_KEY is missing or invalid.
                                    <br />
                                    Check <span className="text-red-200 font-bold">.env.local</span> or your CI/CD secrets.
                                </p>
                            </div>
                        )}

                        {/* Required env vars checklist */}
                        <details className="group">
                            <summary className="text-xs text-slate-600 dark:text-slate-400 cursor-pointer hover:text-slate-700 dark:hover:text-slate-300 list-none flex items-center gap-1 transition-colors">
                                <ChevronDown size={12} className="group-open:hidden" />
                                <ChevronUp size={12} className="hidden group-open:block" />
                                Required environment variables
                            </summary>
                            <div className="mt-3 space-y-1 font-mono text-[11px]">
                                {[
                                    'VITE_FIREBASE_API_KEY',
                                    'VITE_FIREBASE_AUTH_DOMAIN',
                                    'VITE_FIREBASE_PROJECT_ID',
                                    'VITE_FIREBASE_STORAGE_BUCKET',
                                    'VITE_FIREBASE_MESSAGING_SENDER_ID',
                                    'VITE_FIREBASE_APP_ID',
                                ].map(key => {
                                    // In-browser check — only works if the variable was bundled
                                    const defined =
                                        typeof (import.meta.env as Record<string, string>)[key] === 'string' &&
                                        (import.meta.env as Record<string, string>)[key].length > 0;
                                    return (
                                        <div key={key} className="flex items-center gap-2">
                                            <span className={defined ? 'text-emerald-400' : 'text-red-400'}>
                                                {defined ? '✓' : '✗'}
                                            </span>
                                            <span className={defined ? 'text-slate-600 dark:text-slate-400' : 'text-red-300'}>{key}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </details>
                    </div>

                    {/* ── Error detail collapse ───────────────────────────────── */}
                    {error && (
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                            <button
                                id="toggle-error-details"
                                onClick={this.toggleDetails}
                                className="w-full flex items-center justify-between px-5 py-3 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors text-left"
                            >
                                <span className="font-bold uppercase tracking-widest">Technical Details</span>
                                {showDetails ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            </button>
                            {showDetails && (
                                <div className="px-5 pb-4 space-y-2">
                                    <p className="text-red-300 text-xs font-mono break-all">
                                        {error.message}
                                    </p>
                                    {errorInfo?.componentStack && (
                                        <pre className="text-slate-600 text-[10px] overflow-x-auto max-h-40 leading-relaxed">
                                            {errorInfo.componentStack.trim()}
                                        </pre>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Actions ─────────────────────────────────────────────── */}
                    <div className="flex gap-3">
                        <button
                            id="error-reload-btn"
                            onClick={this.handleReload}
                            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-900 dark:text-white font-bold text-sm transition-colors shadow-lg shadow-amber-500/20 min-h-[44px]"
                        >
                            <RefreshCw size={16} />
                            Reload Portal
                        </button>
                    </div>

                    <p className="text-center text-slate-700 text-xs">
                        PSI Event Portal · Property Shop Investment LLC
                    </p>
                </div>
            </div>
        );
    }
}

export default GlobalErrorBoundary;
