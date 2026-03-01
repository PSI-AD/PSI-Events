/**
 * brochure/BrochureComponents.tsx
 * Shared presentational components for the Digital Brochure feature:
 *  - ProjectPickerCard   — property card in the agent composer grid
 *  - SentBrochureRow     — a row in the sent brochures panel
 *  - NotificationToast   — push notification toast overlay
 */

import React from 'react';
import { motion } from 'motion/react';
import {
    CheckCircle2, ExternalLink, Copy, Eye,
    Building2, BellRing, X, ImageOff,
} from 'lucide-react';
import type { CRMProject, BrochureToken } from './types';
import { TIER_COLORS, } from './types';
import { fmtAED } from './data';

// ── Property Selection Card ───────────────────────────────────────────────────

export function ProjectPickerCard({
    project, selected, onToggle,
}: {
    project: CRMProject;
    selected: boolean;
    onToggle: () => void;
}) {
    return (
        <motion.button
            id={`project-card-${project.id}`}
            type="button"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={onToggle}
            className={`relative w-full text-left rounded-2xl border-2 overflow-hidden transition-all ${selected
                ? 'border-amber-500 shadow-md shadow-amber-500/10'
                : 'border-psi hover:border-amber-300 dark:hover:border-amber-700'
                }`}
        >
            {/* Hero image */}
            <div className="relative h-32 overflow-hidden">
                {project.imageUrl ? (
                    <img src={project.imageUrl} alt={project.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                    <div className="w-full h-full bg-psi-subtle flex items-center justify-center">
                        <ImageOff size={24} className="text-psi-muted" />
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute top-2 left-2">
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${TIER_COLORS[project.tier]}`}>
                        {project.tier}
                    </span>
                </div>
                <div className={`absolute top-2 right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${selected
                    ? 'bg-amber-500 border-amber-500'
                    : 'bg-black/30 border-white/60'
                    }`}>
                    {selected && <CheckCircle2 size={14} className="text-white" />}
                </div>
                <div className="absolute bottom-2 left-2 right-2">
                    <p className="text-white font-bold text-sm leading-tight drop-shadow">{project.name}</p>
                    <p className="text-white/80 text-[10px] mt-0.5 drop-shadow">{project.developer_name}</p>
                </div>
            </div>
            {/* Bottom strip */}
            <div className="px-3 py-2.5 flex items-center justify-between bg-psi-card">
                <div className="flex items-center gap-1 text-psi-muted text-[10px]">
                    <Building2 size={10} />
                    <span>{project.location ?? 'Abu Dhabi'}</span>
                </div>
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 font-mono">
                    {project.priceRange ?? fmtAED(project.expected_avg_deal)}
                </span>
            </div>
        </motion.button>
    );
}

// ── Sent brochure row ─────────────────────────────────────────────────────────

export function SentBrochureRow({ brochure, onCopy }: { brochure: BrochureToken; onCopy: (url: string) => void }) {
    const url = `${window.location.origin}/client-portal/${brochure.token}`;
    const statusColors = {
        sent: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
        viewed: 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
        callback_requested: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
    };
    const statusLabels = {
        sent: '📨 Sent',
        viewed: '👁 Viewed',
        callback_requested: '📞 Callback!',
    };

    return (
        <div className="psi-card rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-bold text-psi-primary text-sm">{brochure.clientName}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColors[brochure.status]}`}>
                        {statusLabels[brochure.status]}
                    </span>
                    {brochure.viewCount > 0 && (
                        <span className="flex items-center gap-1 text-[10px] text-psi-muted">
                            <Eye size={9} /> {brochure.viewCount}×
                        </span>
                    )}
                </div>
                <p className="text-xs text-psi-secondary truncate">{brochure.clientEmail}</p>
                <p className="text-[10px] text-psi-muted mt-0.5">
                    {brochure.projectSnapshots.map(p => p.name).join(', ')}
                </p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
                <button
                    onClick={() => onCopy(url)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl psi-card border border-psi text-psi-muted hover:text-psi-primary text-xs font-medium transition-colors"
                >
                    <Copy size={12} /> Copy Link
                </button>
                <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-xs font-bold transition-colors"
                >
                    <ExternalLink size={12} /> Open
                </a>
            </div>
        </div>
    );
}

// ── Success Notification Toast ────────────────────────────────────────────────

export function NotificationToast({
    message, onDismiss,
}: { message: string; onDismiss: () => void }) {
    return (
        <motion.div
            initial={{ x: 120, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 120, opacity: 0 }}
            className="fixed bottom-6 right-6 z-50 max-w-sm bg-emerald-600 text-white rounded-2xl shadow-xl shadow-emerald-600/30 p-4 flex items-start gap-3"
        >
            <BellRing size={18} className="flex-shrink-0 mt-0.5 animate-pulse" />
            <div className="flex-1 min-w-0">
                <p className="font-bold text-sm">Push Notification</p>
                <p className="text-xs text-emerald-100 mt-0.5 leading-relaxed">{message}</p>
            </div>
            <button onClick={onDismiss} className="flex-shrink-0 text-emerald-200 hover:text-white">
                <X size={16} />
            </button>
        </motion.div>
    );
}
