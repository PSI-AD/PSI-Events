import React, { useState } from 'react';
import { Sparkles, Lock, Mail } from 'lucide-react';

/**
 * Login
 * Standalone public-facing login page.
 * Rendered inside PublicLayout — no sidebar or header chrome.
 */
export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // TODO: wire up Firebase Auth sign-in
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950">
            {/* Subtle ambient glow */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl" />
            </div>

            <div className="relative w-full max-w-md mx-4">
                {/* Card */}
                <div className="bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl p-8">
                    {/* Logo / Branding */}
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                            <Sparkles size={20} className="text-emerald-400" />
                        </div>
                        <div>
                            <h1 className="text-white font-bold text-lg tracking-tight">ROI Portal</h1>
                            <p className="text-slate-400 text-xs uppercase tracking-widest">Real Estate Events</p>
                        </div>
                    </div>

                    <h2 className="text-2xl font-bold text-white mb-1">Welcome back</h2>
                    <p className="text-slate-400 text-sm mb-8">Sign in to access your dashboard.</p>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Email */}
                        <div className="space-y-1.5">
                            <label htmlFor="login-email" className="block text-sm font-medium text-slate-300">
                                Email
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                    <Mail size={16} className="text-slate-500" />
                                </div>
                                <input
                                    id="login-email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@company.com"
                                    className="w-full bg-slate-900/60 border border-slate-600/50 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="space-y-1.5">
                            <label htmlFor="login-password" className="block text-sm font-medium text-slate-300">
                                Password
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                    <Lock size={16} className="text-slate-500" />
                                </div>
                                <input
                                    id="login-password"
                                    type="password"
                                    autoComplete="current-password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full bg-slate-900/60 border border-slate-600/50 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-2.5 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-emerald-500/25 active:scale-[0.98] text-sm"
                        >
                            Sign In
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
