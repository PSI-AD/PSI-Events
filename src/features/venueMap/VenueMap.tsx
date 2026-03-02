/**
 * VenueMap.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Interactive Event Venue Map
 * Route: /venue-map
 *
 * Features:
 *  • SVG floor plan with colored zones
 *  • Clickable markers with slide-in detail panel
 *  • Smooth pan (drag) + zoom (scroll/pinch/buttons)
 *  • Animated "live" pulse on active session rooms and sponsor stands
 *  • User "You Are Here" position indicator
 *  • Search / category filter bar
 *  • Mini-map legend
 *  • Fit-to-screen reset button
 */

import React, {
    useState, useRef, useCallback, useEffect, useMemo,
} from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    Search, X, ZoomIn, ZoomOut, Maximize2, MapPin,
    Users, Clock, Tag, Phone, Radio, Star, Navigation,
    Wifi, Coffee, LogOut, Briefcase, Grid3X3, ChevronRight,
} from 'lucide-react';
import {
    VENUE_ZONES, VENUE_MARKERS, USER_POSITION,
    ZONE_COLORS, MARKER_COLORS, MARKER_TYPE_LABELS,
    type VenueMarker, type MarkerType,
} from './venueMapData';

// ── Constants ─────────────────────────────────────────────────────────────────

const SVG_W = 1200;
const SVG_H = 780;
const MIN_ZOOM = 0.45;
const MAX_ZOOM = 3.5;
const ZOOM_STEP = 0.25;
const MARKER_R = 14;   // marker circle radius

// ── Utility ───────────────────────────────────────────────────────────────────

function cn(...cs: (string | false | undefined)[]) {
    return cs.filter(Boolean).join(' ');
}

// ── Category filter config ────────────────────────────────────────────────────

const CATEGORIES: { type: MarkerType | 'all'; label: string; icon: React.ElementType; color: string }[] = [
    { type: 'all', label: 'All', icon: Grid3X3, color: 'text-psi-secondary' },
    { type: 'room', label: 'Sessions', icon: Radio, color: 'text-indigo-400' },
    { type: 'booth', label: 'Exhibitors', icon: Briefcase, color: 'text-amber-400' },
    { type: 'sponsor', label: 'Sponsors', icon: Star, color: 'text-emerald-400' },
    { type: 'networking', label: 'Networking', icon: Wifi, color: 'text-violet-400' },
    { type: 'food', label: 'Food', icon: Coffee, color: 'text-teal-400' },
    { type: 'service', label: 'Services', icon: MapPin, color: 'text-psi-secondary' },
    { type: 'exit', label: 'Exits', icon: LogOut, color: 'text-red-400' },
];

// ── Detail panel ──────────────────────────────────────────────────────────────

function DetailPanel({ marker, onClose }: { marker: VenueMarker; onClose: () => void }) {
    const mcolor = MARKER_COLORS[marker.type];
    const typeLabel = MARKER_TYPE_LABELS[marker.type];
    const { detail } = marker;

    return (
        <motion.div
            key={marker.id}
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 340, damping: 32 }}
            className="absolute top-0 right-0 h-full w-80 bg-psi-surface border-l border-psi flex flex-col overflow-hidden z-30 shadow-2xl"
        >
            {/* Colour band */}
            <div className="h-1.5" style={{ background: mcolor.bg }} />

            {/* Header */}
            <div className="p-5 border-b border-psi">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                            style={{ background: `${mcolor.bg}30`, border: `1px solid ${mcolor.bg}60` }}
                        >
                            {detail.logo ?? '📍'}
                        </div>
                        <div>
                            <div className="flex items-center gap-1.5 mb-0.5">
                                <span
                                    className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full"
                                    style={{ background: `${mcolor.bg}25`, color: mcolor.bg, border: `1px solid ${mcolor.bg}50` }}
                                >
                                    {typeLabel}
                                </span>
                                {marker.isLive && (
                                    <span className="flex items-center gap-0.5 text-[9px] font-black uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">
                                        <span className="relative flex h-1.5 w-1.5">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70" />
                                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                                        </span>
                                        LIVE
                                    </span>
                                )}
                            </div>
                            <h2 className="text-psi-primary font-black text-base leading-tight">{detail.title}</h2>
                            {detail.subtitle && <p className="text-psi-secondary text-xs mt-0.5">{detail.subtitle}</p>}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-psi-secondary hover:text-psi-primary hover:bg-psi-subtle transition-colors flex-shrink-0"
                    >
                        <X size={15} />
                    </button>
                </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <p className="text-psi-secondary text-sm leading-relaxed">{detail.description}</p>

                {detail.currentSession && (
                    <div className="bg-psi-subtle/60 border border-psi-strong rounded-xl p-3">
                        <p className="text-psi-secondary text-[10px] font-black uppercase mb-1.5 tracking-wider">Current / Next Session</p>
                        <p className="text-psi-primary font-bold text-sm">{detail.currentSession}</p>
                        {detail.speaker && <p className="text-psi-secondary text-xs mt-0.5">{detail.speaker}</p>}
                        {detail.time && (
                            <div className="flex items-center gap-1 mt-1.5">
                                <Clock size={10} className="text-emerald-400" />
                                <span className="text-emerald-400 text-xs font-semibold">{detail.time}</span>
                            </div>
                        )}
                    </div>
                )}

                {detail.capacity !== undefined && (
                    <div className="flex items-center gap-2 text-psi-secondary text-xs">
                        <Users size={12} />
                        <span>Capacity: <strong className="text-psi-primary">{detail.capacity} seats</strong></span>
                    </div>
                )}

                {detail.contact && (
                    <div className="flex items-center gap-2 text-psi-secondary text-xs">
                        <Phone size={12} />
                        <span className="text-psi-secondary break-all">{detail.contact}</span>
                    </div>
                )}

                {detail.tags.length > 0 && (
                    <div>
                        <p className="text-psi-secondary text-[10px] font-black uppercase tracking-wider mb-2">Topics</p>
                        <div className="flex flex-wrap gap-1.5">
                            {detail.tags.map(t => (
                                <span key={t} className="text-[10px] bg-psi-subtle border border-psi-strong text-psi-secondary px-2 py-0.5 rounded-full font-medium">
                                    {t}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Navigate CTA */}
            <div className="p-4 border-t border-psi">
                <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-psi-subtle border border-psi-strong text-psi-secondary text-sm font-semibold hover:bg-psi-subtle hover:text-psi-primary transition-colors">
                    <Navigation size={13} /> Navigate Here
                    <ChevronRight size={13} />
                </button>
            </div>
        </motion.div>
    );
}

// ── Marker SVG element ────────────────────────────────────────────────────────

function Marker({
    marker, selected, visible,
    onClick,
}: {
    marker: VenueMarker;
    selected: boolean;
    visible: boolean;
    onClick: () => void;
}) {
    const mcolor = MARKER_COLORS[marker.type];
    const short = marker.shortLabel ?? marker.label.slice(0, 3);

    if (!visible) return null;

    return (
        <g
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            style={{ cursor: 'pointer' }}
        >
            {/* Pulse ring for live markers */}
            {(marker.isLive || marker.type === 'sponsor') && (
                <>
                    <circle cx={marker.x} cy={marker.y} r={MARKER_R + 8} fill={mcolor.bg} opacity={0.15}>
                        <animate attributeName="r" values={`${MARKER_R + 4};${MARKER_R + 14};${MARKER_R + 4}`} dur="2s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.15;0.0;0.15" dur="2s" repeatCount="indefinite" />
                    </circle>
                    <circle cx={marker.x} cy={marker.y} r={MARKER_R + 3} fill="none" stroke={mcolor.bg} strokeWidth="1.5" opacity={0.4}>
                        <animate attributeName="opacity" values="0.4;0;0.4" dur="2s" repeatCount="indefinite" />
                    </circle>
                </>
            )}

            {/* Selection ring */}
            {selected && (
                <circle
                    cx={marker.x} cy={marker.y} r={MARKER_R + 5}
                    fill="none" stroke="#fff" strokeWidth={2} opacity={0.9}
                />
            )}

            {/* Main circle */}
            <circle
                cx={marker.x} cy={marker.y} r={MARKER_R}
                fill={mcolor.bg}
                stroke={selected ? '#fff' : mcolor.ring}
                strokeWidth={selected ? 2.5 : 1.5}
            />

            {/* Label text */}
            <text
                x={marker.x} y={marker.y + 4}
                textAnchor="middle"
                fontSize={short.length > 2 ? 7 : 8.5}
                fontWeight="900"
                fontFamily="system-ui, sans-serif"
                fill={mcolor.text}
                style={{ userSelect: 'none', pointerEvents: 'none' }}
            >
                {short.length > 4 ? short.slice(0, 3) : short}
            </text>

            {/* Live dot */}
            {marker.isLive && (
                <circle cx={marker.x + MARKER_R - 3} cy={marker.y - MARKER_R + 3} r={4} fill="#10b981">
                    <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite" />
                </circle>
            )}
        </g>
    );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function VenueMap() {
    // Pan & zoom state
    const [zoom, setZoom] = useState(0.75);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const dragging = useRef(false);
    const lastMouse = useRef({ x: 0, y: 0 });
    const svgRef = useRef<SVGSVGElement>(null);

    // UI state
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [query, setQuery] = useState('');
    const [catFilter, setCatFilter] = useState<MarkerType | 'all'>('all');
    const [showLegend, setShowLegend] = useState(false);

    const selectedMarker = useMemo(
        () => VENUE_MARKERS.find(m => m.id === selectedId) ?? null,
        [selectedId]
    );

    // Filtered markers
    const visibleMarkers = useMemo(() => {
        const q = query.toLowerCase();
        return VENUE_MARKERS.filter(m => {
            const typeOk = catFilter === 'all' || m.type === catFilter;
            const searchOk = !q ||
                m.label.toLowerCase().includes(q) ||
                m.detail.title.toLowerCase().includes(q) ||
                m.detail.tags.some(t => t.toLowerCase().includes(q));
            return typeOk && searchOk;
        });
    }, [query, catFilter]);

    const visibleIds = useMemo(() => new Set(visibleMarkers.map(m => m.id)), [visibleMarkers]);

    // ── Zoom helpers ────────────────────────────────────────────────────────

    const clampZoom = (z: number) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));

    function zoomToward(delta: number, cx = SVG_W / 2, cy = SVG_H / 2) {
        setZoom(prev => {
            const next = clampZoom(prev + delta);
            const scale = next / prev;
            setPan(p => ({
                x: cx - scale * (cx - p.x),
                y: cy - scale * (cy - p.y),
            }));
            return next;
        });
    }

    function fitToScreen() {
        setZoom(0.75);
        setPan({ x: 0, y: 0 });
    }

    // ── Mouse pan ───────────────────────────────────────────────────────────

    function onMouseDown(e: React.MouseEvent) {
        if (e.button !== 0) return;
        dragging.current = true;
        lastMouse.current = { x: e.clientX, y: e.clientY };
    }

    function onMouseMove(e: React.MouseEvent) {
        if (!dragging.current) return;
        const dx = e.clientX - lastMouse.current.x;
        const dy = e.clientY - lastMouse.current.y;
        lastMouse.current = { x: e.clientX, y: e.clientY };
        setPan(p => ({ x: p.x + dx, y: p.y + dy }));
    }

    function onMouseUp() { dragging.current = false; }

    // ── Scroll zoom ─────────────────────────────────────────────────────────

    function onWheel(e: React.WheelEvent) {
        e.preventDefault();
        const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
        const rect = svgRef.current?.getBoundingClientRect();
        if (!rect) return;
        const cx = (e.clientX - rect.left) / (rect.width / SVG_W);
        const cy = (e.clientY - rect.top) / (rect.height / SVG_H);
        zoomToward(delta, cx, cy);
    }

    useEffect(() => {
        const el = svgRef.current;
        if (!el) return;
        const handler = (e: WheelEvent) => { e.preventDefault(); };
        el.addEventListener('wheel', handler, { passive: false });
        return () => el.removeEventListener('wheel', handler);
    }, []);

    // ── Keyboard shortcuts ──────────────────────────────────────────────────

    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (e.key === 'Escape') { setSelectedId(null); }
            if (e.key === '+' || e.key === '=') zoomToward(ZOOM_STEP);
            if (e.key === '-') zoomToward(-ZOOM_STEP);
            if (e.key === '0') fitToScreen();
        }
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    // ── SVG transform ───────────────────────────────────────────────────────

    const transform = `translate(${pan.x}, ${pan.y}) scale(${zoom})`;

    return (
        <div className="h-screen bg-psi-page flex flex-col font-sans overflow-hidden">

            {/* ── Top bar ────────────────────────────────────────────────── */}
            <div className="bg-psi-surface border-b border-psi px-4 py-3 flex-shrink-0 z-10">
                <div className="flex items-center gap-3 flex-wrap">
                    {/* Title */}
                    <div className="flex items-center gap-2 mr-2">
                        <MapPin size={18} className="text-emerald-400" />
                        <span className="text-psi-primary font-extrabold text-base">Venue Map</span>
                        <span className="text-psi-secondary text-xs hidden sm:inline">· PSI Events 2026</span>
                    </div>

                    {/* Search */}
                    <div className="relative flex-1 max-w-64">
                        <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-psi-secondary" />
                        <input
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder="Search rooms, booths, services…"
                            className="w-full bg-psi-subtle border border-psi-strong rounded-xl pl-8 pr-3 py-2 text-xs text-psi-primary placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                        />
                        {query && (
                            <button onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-psi-secondary hover:text-psi-primary">
                                <X size={11} />
                            </button>
                        )}
                    </div>

                    {/* Category filters */}
                    <div className="flex gap-1 overflow-x-auto">
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat.type}
                                onClick={() => setCatFilter(cat.type)}
                                className={cn(
                                    'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border whitespace-nowrap transition-all',
                                    catFilter === cat.type
                                        ? 'bg-emerald-600 border-emerald-500 text-white'
                                        : 'bg-psi-subtle border-psi-strong text-psi-secondary hover:border-psi-strong'
                                )}
                            >
                                <cat.icon size={10} className={catFilter === cat.type ? 'text-psi-primary' : cat.color} />
                                {cat.label}
                            </button>
                        ))}
                    </div>

                    {/* Right controls */}
                    <div className="flex items-center gap-1.5 ml-auto flex-shrink-0">
                        <span className="text-psi-muted text-xs hidden md:inline">
                            {visibleMarkers.length} marker{visibleMarkers.length !== 1 ? 's' : ''}
                        </span>
                        <button onClick={() => zoomToward(ZOOM_STEP)} className="p-2 rounded-lg bg-psi-subtle border border-psi-strong text-psi-secondary hover:text-psi-primary transition-colors" title="Zoom in (+)">
                            <ZoomIn size={14} />
                        </button>
                        <button onClick={() => zoomToward(-ZOOM_STEP)} className="p-2 rounded-lg bg-psi-subtle border border-psi-strong text-psi-secondary hover:text-psi-primary transition-colors" title="Zoom out (-)">
                            <ZoomOut size={14} />
                        </button>
                        <button onClick={fitToScreen} className="p-2 rounded-lg bg-psi-subtle border border-psi-strong text-psi-secondary hover:text-psi-primary transition-colors" title="Fit to screen (0)">
                            <Maximize2 size={14} />
                        </button>
                        <button
                            onClick={() => setShowLegend(l => !l)}
                            className={cn('p-2 rounded-lg border text-psi-secondary hover:text-psi-primary transition-colors',
                                showLegend ? 'bg-emerald-600/20 border-emerald-600/40 text-emerald-400' : 'bg-psi-subtle border-psi-strong'
                            )}
                            title="Toggle legend"
                        >
                            <Tag size={14} />
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Map area ───────────────────────────────────────────────── */}
            <div className="flex-1 relative overflow-hidden">

                {/* SVG Canvas */}
                <svg
                    ref={svgRef}
                    width="100%"
                    height="100%"
                    viewBox={`0 0 ${SVG_W} ${SVG_H}`}
                    className="cursor-grab active:cursor-grabbing select-none"
                    onMouseDown={onMouseDown}
                    onMouseMove={onMouseMove}
                    onMouseUp={onMouseUp}
                    onMouseLeave={onMouseUp}
                    onWheel={onWheel}
                    onClick={() => setSelectedId(null)}
                >
                    {/* Background grid */}
                    <defs>
                        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.5" />
                        </pattern>
                        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                            <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#000" floodOpacity="0.5" />
                        </filter>
                    </defs>

                    <rect width={SVG_W} height={SVG_H} fill="#080d14" />
                    <rect width={SVG_W} height={SVG_H} fill="url(#grid)" />

                    <g transform={transform}>

                        {/* ── FLOOR PLAN ZONES ──────────────────────────── */}
                        {VENUE_ZONES.map(zone => {
                            const colors = ZONE_COLORS[zone.type];
                            if (zone.type === 'corridor') {
                                return (
                                    <rect key={zone.id} x={zone.x} y={zone.y} width={zone.w} height={zone.h}
                                        fill="#0b1120" />
                                );
                            }
                            return (
                                <g key={zone.id}>
                                    <rect
                                        x={zone.x} y={zone.y} width={zone.w} height={zone.h}
                                        rx={6}
                                        fill={colors.fill}
                                        stroke={colors.stroke}
                                        strokeWidth={zone.isLive ? 2 : 1}
                                        opacity={0.95}
                                        filter="url(#shadow)"
                                    />
                                    {/* Live glow */}
                                    {zone.isLive && (
                                        <rect x={zone.x} y={zone.y} width={zone.w} height={zone.h} rx={6}
                                            fill="none" stroke={colors.stroke} strokeWidth={3} opacity={0.2}>
                                            <animate attributeName="opacity" values="0.2;0.5;0.2" dur="2s" repeatCount="indefinite" />
                                        </rect>
                                    )}
                                    {/* Zone label */}
                                    <text
                                        x={zone.x + zone.w / 2}
                                        y={zone.y + zone.h / 2 - (zone.sublabel ? 8 : 0)}
                                        textAnchor="middle"
                                        fontSize={13}
                                        fontWeight="800"
                                        fontFamily="system-ui, sans-serif"
                                        fill={colors.text}
                                        style={{ userSelect: 'none' }}
                                    >
                                        {zone.label}
                                    </text>
                                    {zone.sublabel && (
                                        <text
                                            x={zone.x + zone.w / 2}
                                            y={zone.y + zone.h / 2 + 11}
                                            textAnchor="middle"
                                            fontSize={8.5}
                                            fontFamily="system-ui, sans-serif"
                                            fill={colors.text}
                                            opacity={0.65}
                                            style={{ userSelect: 'none' }}
                                        >
                                            {zone.sublabel}
                                        </text>
                                    )}
                                    {/* LIVE badge on zone */}
                                    {zone.isLive && (
                                        <>
                                            <rect x={zone.x + 6} y={zone.y + 6} width={34} height={14} rx={4} fill="#10b981" opacity={0.2} />
                                            <text x={zone.x + 23} y={zone.y + 17} textAnchor="middle" fontSize={8} fontWeight="900"
                                                fill="#34d399" fontFamily="system-ui, sans-serif" style={{ userSelect: 'none' }}>LIVE</text>
                                        </>
                                    )}
                                </g>
                            );
                        })}

                        {/* ── NORTH COMPASS ─────────────────────────────── */}
                        <g transform="translate(1155, 740)">
                            <circle cx={0} cy={0} r={18} fill="#0f172a" stroke="#334155" strokeWidth={1} />
                            <text x={0} y={-4} textAnchor="middle" fontSize={10} fontWeight="900" fill="#64748b" fontFamily="system-ui">N</text>
                            <path d="M0,-14 L4,-2 L0,2 L-4,-2 Z" fill="#475569" />
                        </g>

                        {/* ── SCALE BAR ─────────────────────────────────── */}
                        <g transform="translate(20, 748)">
                            <line x1={0} y1={6} x2={80} y2={6} stroke="#334155" strokeWidth={1.5} />
                            <line x1={0} y1={2} x2={0} y2={10} stroke="#334155" strokeWidth={1.5} />
                            <line x1={80} y1={2} x2={80} y2={10} stroke="#334155" strokeWidth={1.5} />
                            <text x={40} y={0} textAnchor="middle" fontSize={8} fill="#475569" fontFamily="system-ui">~50 m</text>
                        </g>

                        {/* ── MARKERS ───────────────────────────────────── */}
                        {VENUE_MARKERS.map(marker => (
                            <Marker
                                key={marker.id}
                                marker={marker}
                                selected={selectedId === marker.id}
                                visible={visibleIds.has(marker.id)}
                                onClick={() => setSelectedId(prev => prev === marker.id ? null : marker.id)}
                            />
                        ))}

                        {/* ── USER POSITION ─────────────────────────────── */}
                        <g>
                            <circle cx={USER_POSITION.x} cy={USER_POSITION.y} r={20} fill="#3b82f6" opacity={0.12}>
                                <animate attributeName="r" values="16;28;16" dur="2.5s" repeatCount="indefinite" />
                                <animate attributeName="opacity" values="0.12;0.04;0.12" dur="2.5s" repeatCount="indefinite" />
                            </circle>
                            <circle cx={USER_POSITION.x} cy={USER_POSITION.y} r={8} fill="#3b82f6" stroke="#93c5fd" strokeWidth={2.5} />
                            <circle cx={USER_POSITION.x} cy={USER_POSITION.y} r={3} fill="#fff" />

                            {/* "You are here" label */}
                            <rect x={USER_POSITION.x - 35} y={USER_POSITION.y - 28} width={70} height={16} rx={5}
                                fill="#1e3a5f" stroke="#3b82f6" strokeWidth={1} opacity={0.9} />
                            <text x={USER_POSITION.x} y={USER_POSITION.y - 16} textAnchor="middle"
                                fontSize={8} fontWeight="700" fill="#93c5fd" fontFamily="system-ui"
                                style={{ userSelect: 'none' }}>
                                You are here
                            </text>
                        </g>

                    </g>
                </svg>

                {/* ── Zoom indicator ──────────────────────────────────────── */}
                <div className="absolute bottom-4 left-4 bg-psi-surface backdrop-blur-sm border border-psi rounded-xl px-3 py-1.5 text-psi-secondary text-xs font-mono">
                    {Math.round(zoom * 100)}%
                </div>

                {/* ── Live count ──────────────────────────────────────────── */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-psi-surface backdrop-blur-sm border border-psi rounded-xl px-4 py-2">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                    </span>
                    <span className="text-psi-primary text-xs font-bold">4 sessions live now</span>
                    <span className="text-psi-secondary text-xs">· Scroll to zoom · Drag to pan</span>
                </div>

                {/* ── Legend panel ────────────────────────────────────────── */}
                <AnimatePresence>
                    {showLegend && (
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 8 }}
                            className="absolute bottom-16 left-4 bg-psi-surface border border-psi rounded-2xl p-4 shadow-2xl w-52"
                        >
                            <p className="text-psi-primary font-bold text-xs mb-3 uppercase tracking-widest">Legend</p>
                            <div className="space-y-2">
                                {CATEGORIES.slice(1).map(cat => {
                                    const mcolor = MARKER_COLORS[cat.type as MarkerType];
                                    return (
                                        <div key={cat.type} className="flex items-center gap-2">
                                            <svg width={20} height={20}>
                                                <circle cx={10} cy={10} r={8} fill={mcolor.bg} stroke={mcolor.ring} strokeWidth={1.5} />
                                            </svg>
                                            <span className="text-psi-secondary text-xs">{cat.label}</span>
                                        </div>
                                    );
                                })}
                                <div className="flex items-center gap-2 mt-1 pt-1 border-t border-psi">
                                    <svg width={20} height={20}>
                                        <circle cx={10} cy={10} r={8} fill="#3b82f6" stroke="#93c5fd" strokeWidth={2} />
                                        <circle cx={10} cy={10} r={3} fill="#fff" />
                                    </svg>
                                    <span className="text-psi-secondary text-xs">Your Location</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <svg width={20} height={12}>
                                        <circle cx={10} cy={6} r={5} fill="#10b981" opacity={0.6} />
                                        <circle cx={10} cy={6} r={3} fill="#10b981" />
                                    </svg>
                                    <span className="text-psi-secondary text-xs">Live / Active</span>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── Search results list ─────────────────────────────────── */}
                <AnimatePresence>
                    {query.length > 1 && (
                        <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            className="absolute top-2 left-1/2 -translate-x-1/2 w-80 bg-psi-surface border border-psi-strong rounded-2xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto z-20"
                        >
                            {visibleMarkers.length === 0 ? (
                                <div className="p-4 text-center text-psi-secondary text-sm">No results for "{query}"</div>
                            ) : (
                                visibleMarkers.slice(0, 8).map(m => {
                                    const mcolor = MARKER_COLORS[m.type];
                                    return (
                                        <button
                                            key={m.id}
                                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-psi-subtle transition-colors text-left border-b border-psi last:border-0"
                                            onClick={() => { setSelectedId(m.id); setQuery(''); }}
                                        >
                                            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-sm"
                                                style={{ background: `${mcolor.bg}30`, border: `1px solid ${mcolor.bg}60` }}>
                                                {m.detail.logo}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-psi-primary text-sm font-semibold truncate">{m.label}</p>
                                                <p className="text-psi-secondary text-xs truncate">{MARKER_TYPE_LABELS[m.type]}</p>
                                            </div>
                                            {m.isLive && (
                                                <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-full font-black flex-shrink-0">LIVE</span>
                                            )}
                                        </button>
                                    );
                                })
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── Detail panel ────────────────────────────────────────── */}
                <AnimatePresence>
                    {selectedMarker && (
                        <DetailPanel marker={selectedMarker} onClose={() => setSelectedId(null)} />
                    )}
                </AnimatePresence>

            </div>
        </div>
    );
}
