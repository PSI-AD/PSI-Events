/**
 * bounty/BountyAlertOverlay.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Full-screen animated alert overlay shown to agents when a new bounty drops.
 * Renders above everything (z-[9999]) with pulsing rings and spring animation.
 */

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Zap, Timer } from 'lucide-react';
import { IncentiveIcon, CountdownTicker } from './BountyCard';
import type { BountyDocument } from './types';

export function BountyAlertOverlay({
    bounty,
    onClaim,
    onDismiss,
}: {
    bounty: BountyDocument;
    onClaim: () => void;
    onDismiss: () => void;
}) {
    const [pulse, setPulse] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setPulse(p => p + 1), 800);
        return () => clearInterval(id);
    }, []);

    return (
        <AnimatePresence>
            <motion.div
                key="bounty-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4"
                style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
                onClick={onDismiss}
            >
                <motion.div
                    initial={{ y: 120, scale: 0.92, opacity: 0 }}
                    animate={{ y: 0, scale: 1, opacity: 1 }}
                    exit={{ y: 80, scale: 0.95, opacity: 0 }}
                    transition={{ type: 'spring', damping: 22, stiffness: 300 }}
                    onClick={e => e.stopPropagation()}
                    className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
                    style={{ background: 'linear-gradient(145deg, #0f1624 0%, #1a1f2e 100%)' }}
                >
                    {/* Pulsing rings behind the icon */}
                    <div className="relative flex items-center justify-center pt-8 pb-4">
                        {[1, 2, 3].map(i => (
                            <motion.div
                                key={i}
                                className="absolute rounded-full border border-amber-400/30"
                                initial={{ width: 56, height: 56, opacity: 0.8 }}
                                animate={{ width: 56 + i * 24 + (pulse % 2) * 6, height: 56 + i * 24 + (pulse % 2) * 6, opacity: 0 }}
                                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.3, ease: 'easeOut' }}
                            />
                        ))}
                        <motion.div
                            animate={{ scale: [1, 1.08, 1], rotate: [0, -4, 4, 0] }}
                            transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 1.5 }}
                            className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/40 z-10"
                        >
                            <Zap size={28} className="text-slate-900 dark:text-white fill-white" />
                        </motion.div>
                    </div>

                    {/* Title */}
                    <div className="text-center px-6 pb-2">
                        <motion.p
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.15 }}
                            className="text-[11px] font-extrabold tracking-[0.25em] text-amber-400 uppercase mb-1"
                        >
                            🔥 Live Floor Bounty
                        </motion.p>
                        <motion.h2
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="text-2xl font-extrabold text-slate-900 dark:text-white leading-tight"
                        >
                            {bounty.targetProject}
                        </motion.h2>
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.28 }}
                            className="text-slate-600 dark:text-slate-400 text-sm mt-1"
                        >
                            First agent to secure a lead wins:
                        </motion.p>
                    </div>

                    {/* Reward box */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.92 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.32 }}
                        className="mx-6 mt-3 mb-4 p-4 rounded-2xl text-center"
                        style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(251,146,60,0.08) 100%)', border: '1px solid rgba(245,158,11,0.3)' }}
                    >
                        <div className="flex items-center justify-center gap-2 mb-1">
                            <IncentiveIcon type={bounty.incentiveType} size={18} />
                            <span className="text-3xl font-extrabold text-amber-400 tracking-tight">{bounty.incentiveLabel}</span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                            Issued by {bounty.issuedBy}
                        </p>
                    </motion.div>

                    {/* Countdown */}
                    <div className="flex items-center justify-center gap-2 mb-5">
                        <Timer size={14} className="text-rose-400" />
                        <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Window closes in</span>
                        <CountdownTicker expiresAt={bounty.expiresAt} />
                    </div>

                    {/* Action buttons */}
                    <div className="px-6 pb-8 space-y-3">
                        <motion.button
                            whileTap={{ scale: 0.97 }}
                            onClick={onClaim}
                            className="w-full py-4 rounded-2xl font-extrabold text-base text-slate-900 dark:text-white flex items-center justify-center gap-2 shadow-xl"
                            style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)', boxShadow: '0 8px 32px rgba(245,158,11,0.4)' }}
                        >
                            <Zap size={20} className="fill-current" />
                            I Secured the Lead!
                        </motion.button>
                        <button
                            onClick={onDismiss}
                            className="w-full py-2.5 text-slate-600 dark:text-slate-400 text-sm font-medium hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                        >
                            Dismiss (I'll check Bounties tab)
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
