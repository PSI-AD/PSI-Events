/**
 * FloorplanHeatmap.tsx — Orchestration layer
 * ─────────────────────────────────────────────────────────────────────────────
 * Smart Floorplan Heatmap — post-event analytics
 *
 * Refactored from a 966-line monolith. All tabs and utilities are now
 * inlined in the same file but clearly demarcated. The three tab components
 * (SetupTab, AgentLoggerTab, HeatmapTab) remain in this file because they
 * share a tight, 3-way prop contract with the main component and the added
 * complexity of a separate module outweighs the benefit for this file size.
 *
 * NOTE: For a future refactor pass, each tab could be extracted to:
 *   heatmap/SetupTab.tsx, heatmap/AgentLoggerTab.tsx, heatmap/HeatmapTab.tsx
 */

import React, {
    useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    Upload, MapPin, Flame, Download, Plus, X, Trash2,
    ZoomIn, ZoomOut, RotateCcw, ChevronDown,
    CheckCircle2, Loader2, Info, Award, BarChart3, Layers,
} from 'lucide-react';
import {
    collection, doc, setDoc, addDoc, getDoc,
    serverTimestamp, onSnapshot, Unsubscribe,
} from 'firebase/firestore';
import { db } from '../../services/firebase/firebaseConfig';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FloorZone {
    id: string;
    name: string;     // e.g. "Zone A — Aldar"
    x: number;        // normalised 0-1
    y: number;        // normalised 0-1
    colour: string;   // tailwind bg class for badge
    sponsor?: string;
}

export interface LeadPoint {
    id?: string;
    agentId: string;
    agentName: string;
    x: number;        // normalised 0-1
    y: number;        // normalised 0-1
    zoneName: string;
    timestamp: string;
}

type TabId = 'setup' | 'logger' | 'heatmap';

interface FloorplanHeatmapProps {
    eventId?: string;
    agentId?: string;
    agentName?: string;
    role?: 'organizer' | 'agent' | 'manager';
    useDemoData?: boolean;
}

// ── Demo data ─────────────────────────────────────────────────────────────────

const DEMO_FLOORPLAN = 'data:image/svg+xml;base64,' + btoa(`
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="700" viewBox="0 0 1200 700">
  <rect width="1200" height="700" fill="#0f172a"/>
  <rect x="40" y="40" width="1120" height="620" rx="12" fill="none" stroke="#334155" stroke-width="4"/>
  <rect x="500" y="620" width="200" height="40" fill="#1e293b" stroke="#334155" stroke-width="2"/>
  <text x="600" y="648" font-family="sans-serif" font-size="14" fill="#64748b" text-anchor="middle">ENTRANCE</text>
  <rect x="60" y="60" width="340" height="580" rx="8" fill="#1e3a5f" stroke="#1d4ed8" stroke-width="2"/>
  <text x="230" y="100" font-family="sans-serif" font-size="18" font-weight="bold" fill="#60a5fa" text-anchor="middle">ZONE A</text>
  <text x="230" y="122" font-family="sans-serif" font-size="12" fill="#3b82f6" text-anchor="middle">Aldar Properties</text>
  <rect x="80"  y="140" width="140" height="100" rx="6" fill="#1e40af" stroke="#3b82f6" stroke-width="1.5"/>
  <rect x="240" y="140" width="140" height="100" rx="6" fill="#1e40af" stroke="#3b82f6" stroke-width="1.5"/>
  <rect x="80"  y="260" width="140" height="100" rx="6" fill="#1e40af" stroke="#3b82f6" stroke-width="1.5"/>
  <rect x="240" y="260" width="140" height="100" rx="6" fill="#1e40af" stroke="#3b82f6" stroke-width="1.5"/>
  <rect x="80"  y="380" width="300" height="120" rx="6" fill="#1e3a8a" stroke="#3b82f6" stroke-width="1.5"/>
  <text x="230" y="447" font-family="sans-serif" font-size="11" fill="#93c5fd" text-anchor="middle">Main Stage</text>
  <rect x="430" y="60" width="340" height="580" rx="8" fill="#1a2e1a" stroke="#16a34a" stroke-width="2"/>
  <text x="600" y="100" font-family="sans-serif" font-size="18" font-weight="bold" fill="#4ade80" text-anchor="middle">ZONE B</text>
  <text x="600" y="122" font-family="sans-serif" font-size="12" fill="#22c55e" text-anchor="middle">Emaar Properties</text>
  <rect x="450" y="140" width="140" height="100" rx="6" fill="#14532d" stroke="#22c55e" stroke-width="1.5"/>
  <rect x="610" y="140" width="140" height="100" rx="6" fill="#14532d" stroke="#22c55e" stroke-width="1.5"/>
  <rect x="450" y="260" width="140" height="100" rx="6" fill="#14532d" stroke="#22c55e" stroke-width="1.5"/>
  <rect x="610" y="260" width="140" height="100" rx="6" fill="#14532d" stroke="#22c55e" stroke-width="1.5"/>
  <rect x="450" y="380" width="300" height="120" rx="6" fill="#052e16" stroke="#22c55e" stroke-width="1.5"/>
  <text x="600" y="447" font-family="sans-serif" font-size="11" fill="#86efac" text-anchor="middle">VIP Lounge</text>
  <rect x="800" y="60" width="340" height="580" rx="8" fill="#2d1b1b" stroke="#dc2626" stroke-width="2"/>
  <text x="970" y="100" font-family="sans-serif" font-size="18" font-weight="bold" fill="#f87171" text-anchor="middle">ZONE C</text>
  <text x="970" y="122" font-family="sans-serif" font-size="12" fill="#ef4444" text-anchor="middle">Damac Properties</text>
  <rect x="820" y="140" width="140" height="100" rx="6" fill="#7f1d1d" stroke="#dc2626" stroke-width="1.5"/>
  <rect x="980" y="140" width="140" height="100" rx="6" fill="#7f1d1d" stroke="#dc2626" stroke-width="1.5"/>
  <rect x="820" y="260" width="140" height="100" rx="6" fill="#7f1d1d" stroke="#dc2626" stroke-width="1.5"/>
  <rect x="980" y="260" width="140" height="100" rx="6" fill="#7f1d1d" stroke="#dc2626" stroke-width="1.5"/>
  <rect x="820" y="380" width="300" height="120" rx="6" fill="#450a0a" stroke="#dc2626" stroke-width="1.5"/>
  <text x="970" y="447" font-family="sans-serif" font-size="11" fill="#fca5a5" text-anchor="middle">Registration Desk</text>
</svg>
`);

const DEMO_ZONES: FloorZone[] = [
    { id: 'zone_a', name: 'Zone A — Aldar', x: 0.19, y: 0.50, colour: 'bg-blue-600', sponsor: 'Aldar Properties' },
    { id: 'zone_b', name: 'Zone B — Emaar', x: 0.50, y: 0.50, colour: 'bg-green-600', sponsor: 'Emaar Properties' },
    { id: 'zone_c', name: 'Zone C — Damac', x: 0.81, y: 0.50, colour: 'bg-red-600', sponsor: 'Damac Properties' },
];

const DEMO_POINTS: LeadPoint[] = (() => {
    const clusters = [
        { cx: 0.19, cy: 0.22, spread: 0.07, count: 42, zone: 'Zone A — Aldar' },
        { cx: 0.19, cy: 0.45, spread: 0.05, count: 28, zone: 'Zone A — Aldar' },
        { cx: 0.50, cy: 0.25, spread: 0.06, count: 31, zone: 'Zone B — Emaar' },
        { cx: 0.50, cy: 0.63, spread: 0.04, count: 19, zone: 'Zone B — Emaar' },
        { cx: 0.81, cy: 0.22, spread: 0.05, count: 17, zone: 'Zone C — Damac' },
        { cx: 0.81, cy: 0.63, spread: 0.06, count: 22, zone: 'Zone C — Damac' },
        { cx: 0.35, cy: 0.80, spread: 0.05, count: 14, zone: 'Zone A — Aldar' },
        { cx: 0.50, cy: 0.92, spread: 0.06, count: 9, zone: 'Zone B — Emaar' },
    ];
    const pts: LeadPoint[] = [];
    let sid = 0;
    for (const c of clusters) {
        for (let i = 0; i < c.count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const r = Math.random() * c.spread;
            pts.push({
                id: `demo_${sid++}`,
                agentId: `agent_${(sid % 8) + 1}`,
                agentName: ['Khalid', 'Sara', 'Omar', 'Nour', 'Rami', 'Fatima', 'Tariq', 'Hana'][(sid % 8)],
                x: Math.min(0.98, Math.max(0.02, c.cx + Math.cos(angle) * r)),
                y: Math.min(0.98, Math.max(0.02, c.cy + Math.sin(angle) * r)),
                zoneName: c.zone,
                timestamp: new Date(Date.now() - Math.random() * 8 * 3600000).toISOString(),
            });
        }
    }
    return pts;
})();

// ── Helpers ───────────────────────────────────────────────────────────────────

function clsx(...c: (string | boolean | undefined | null)[]) {
    return c.filter(Boolean).join(' ');
}

function nearestZone(zones: FloorZone[], x: number, y: number): string {
    if (!zones.length) return 'General';
    let best = zones[0];
    let bestDist = Infinity;
    for (const z of zones) {
        const d = Math.hypot(z.x - x, z.y - y);
        if (d < bestDist) { bestDist = d; best = z; }
    }
    return best.name;
}

function zoneLeadCount(points: LeadPoint[], zoneName: string): number {
    return points.filter(p => p.zoneName === zoneName).length;
}

function heatColour(t: number): [number, number, number, number] {
    const stops: Array<[number, [number, number, number]]> = [
        [0.00, [0, 0, 255]],
        [0.20, [0, 180, 255]],
        [0.40, [0, 255, 100]],
        [0.60, [200, 255, 0]],
        [0.75, [255, 180, 0]],
        [0.88, [255, 60, 0]],
        [1.00, [255, 255, 220]],
    ];
    let i = 0;
    while (i < stops.length - 2 && t > stops[i + 1][0]) i++;
    const [t0, c0] = stops[i];
    const [t1, c1] = stops[i + 1];
    const f = (t - t0) / (t1 - t0);
    return [
        Math.round(c0[0] + f * (c1[0] - c0[0])),
        Math.round(c0[1] + f * (c1[1] - c0[1])),
        Math.round(c0[2] + f * (c1[2] - c0[2])),
        220,
    ];
}

function renderHeatmap(
    canvas: HTMLCanvasElement,
    points: LeadPoint[],
    width: number,
    height: number,
    radius = 60,
): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = width; canvas.height = height;
    ctx.clearRect(0, 0, width, height);
    const scratch = document.createElement('canvas');
    scratch.width = width; scratch.height = height;
    const sctx = scratch.getContext('2d')!;
    sctx.globalCompositeOperation = 'lighter';
    for (const pt of points) {
        const px = pt.x * width; const py = pt.y * height;
        const grad = sctx.createRadialGradient(px, py, 0, px, py, radius);
        grad.addColorStop(0, 'rgba(255,255,255,0.35)');
        grad.addColorStop(0.4, 'rgba(255,255,255,0.12)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        sctx.fillStyle = grad;
        sctx.beginPath(); sctx.arc(px, py, radius, 0, Math.PI * 2); sctx.fill();
    }
    const raw = sctx.getImageData(0, 0, width, height);
    const out = ctx.createImageData(width, height);
    for (let i = 0; i < raw.data.length; i += 4) {
        const intensity = raw.data[i] / 255;
        if (intensity < 0.01) continue;
        const [r, g, b, a] = heatColour(Math.min(1, intensity * 2.5));
        out.data[i] = r; out.data[i + 1] = g; out.data[i + 2] = b;
        out.data[i + 3] = Math.round(a * intensity * 1.8);
    }
    ctx.putImageData(out, 0, 0);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function HeatLegend() {
    return (
        <div className="flex items-center gap-2 px-1">
            <span className="text-[10px] text-psi-muted font-bold">Low</span>
            <div className="flex-1 h-3 rounded-full" style={{
                background: 'linear-gradient(to right, #0000ff, #00b4ff, #00ff64, #c8ff00, #ffb400, #ff3c00, #ffffc0)',
            }} />
            <span className="text-[10px] text-psi-muted font-bold">High</span>
        </div>
    );
}

function ZoneBadge({ zone, count, total }: { zone: FloorZone; count: number; total: number }) {
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    return (
        <motion.div
            style={{ left: `${zone.x * 100}%`, top: `${zone.y * 100}%` }}
            className="absolute -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none"
            initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', delay: 0.3 }}>
            <div className={clsx('flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl border border-black/20 dark:border-white/20 shadow-lg backdrop-blur-sm', zone.colour, 'bg-opacity-85')}>
                <span className="text-slate-900 dark:text-white font-black text-lg leading-none">{count}</span>
                <span className="text-slate-900 dark:text-white/80 text-[9px] font-bold leading-none">{pct}%</span>
                <span className="text-slate-900 dark:text-white/60 text-[8px] uppercase tracking-widest leading-none">{zone.name.split('—')[0].trim()}</span>
            </div>
        </motion.div>
    );
}

// ── Tab 1: Setup ──────────────────────────────────────────────────────────────

function SetupTab({ eventId, imageUrl, setImageUrl, zones, setZones }: {
    eventId: string; imageUrl: string; setImageUrl: (u: string) => void;
    zones: FloorZone[]; setZones: (z: FloorZone[]) => void;
}) {
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [addingZone, setAddingZone] = useState(false);
    const [zoneName, setZoneName] = useState('');
    const [pendingPos, setPendingPos] = useState<{ x: number; y: number } | null>(null);
    const mapRef = useRef<HTMLDivElement>(null);
    const ZONE_COLOURS = ['bg-blue-600', 'bg-green-600', 'bg-red-600', 'bg-purple-600', 'bg-amber-500', 'bg-pink-600'];

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => setImageUrl(ev.target?.result as string);
        reader.readAsDataURL(file);
    };

    const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!addingZone) return;
        const rect = mapRef.current!.getBoundingClientRect();
        setPendingPos({ x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height });
    };

    const confirmZone = () => {
        if (!pendingPos || !zoneName.trim()) return;
        const newZone: FloorZone = {
            id: `zone_${Date.now()}`,
            name: zoneName.trim(),
            x: pendingPos.x, y: pendingPos.y,
            colour: ZONE_COLOURS[zones.length % ZONE_COLOURS.length],
        };
        setZones([...zones, newZone]);
        setZoneName(''); setPendingPos(null); setAddingZone(false);
    };

    const removeZone = (id: string) => setZones(zones.filter(z => z.id !== id));

    const handleSave = async () => {
        setSaving(true);
        try {
            await setDoc(doc(db, 'event_floorplans', eventId), { imageUrl, zones, updatedAt: serverTimestamp() }, { merge: true });
            setSaved(true); setTimeout(() => setSaved(false), 3000);
        } catch { setSaved(true); setTimeout(() => setSaved(false), 3000); }
        setSaving(false);
    };

    return (
        <div className="space-y-5">
            <div className="psi-card rounded-2xl p-5">
                <p className="text-psi-primary font-bold text-sm mb-3 flex items-center gap-2">
                    <Upload size={14} className="text-amber-500" /> Floorplan Image
                </p>
                <label htmlFor="floorplan-upload"
                    className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-psi rounded-xl py-6 cursor-pointer hover:border-amber-500/50 transition-colors bg-psi-subtle">
                    <Upload size={22} className="text-psi-muted" />
                    <p className="text-psi-secondary text-sm font-medium">Click to upload floorplan PNG / SVG / JPG</p>
                    <p className="text-psi-muted text-xs">Or drag and drop</p>
                    <input id="floorplan-upload" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </label>
                {imageUrl && <p className="text-xs text-emerald-500 font-bold mt-2 flex items-center gap-1"><CheckCircle2 size={12} /> Floorplan loaded</p>}
            </div>
            {imageUrl && (
                <div className="psi-card rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-psi-primary font-bold text-sm flex items-center gap-2"><MapPin size={14} className="text-amber-500" /> Define Zones</p>
                        <button id="add-zone-btn" onClick={() => { setAddingZone(p => !p); setPendingPos(null); }}
                            className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all',
                                addingZone ? 'bg-amber-500 text-slate-900 dark:text-white' : 'psi-card border border-psi text-psi-secondary hover:text-psi-primary')}>
                            {addingZone ? <><X size={12} /> Cancel</> : <><Plus size={12} /> Add Zone</>}
                        </button>
                    </div>
                    {addingZone && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                            className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 space-y-2">
                            <p className="text-amber-600 dark:text-amber-400 text-xs font-bold flex items-center gap-1.5"><MapPin size={11} /> Tap on the map to place zone centre</p>
                            {pendingPos && (
                                <div className="flex gap-2">
                                    <input id="zone-name-input" type="text" value={zoneName}
                                        onChange={e => setZoneName(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && confirmZone()}
                                        placeholder="Zone name (e.g. Zone A — Aldar)"
                                        className="psi-input flex-1 px-3 py-2 text-sm rounded-lg" />
                                    <button id="confirm-zone-btn" onClick={confirmZone} disabled={!zoneName.trim()}
                                        className="px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-900 dark:text-white text-xs font-bold disabled:opacity-40">
                                        Confirm
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    )}
                    <div ref={mapRef} onClick={handleMapClick}
                        className={clsx('relative rounded-xl overflow-hidden select-none border border-psi', addingZone ? 'cursor-crosshair' : 'cursor-default')}>
                        <img src={imageUrl} alt="Floorplan" className="w-full h-auto block max-h-72 object-contain bg-white dark:bg-slate-900" />
                        {zones.map(z => (
                            <div key={z.id} style={{ left: `${z.x * 100}%`, top: `${z.y * 100}%` }} className="absolute -translate-x-1/2 -translate-y-1/2 group">
                                <div className={clsx('w-5 h-5 rounded-full border-2 border-white shadow-lg flex items-center justify-center', z.colour)}>
                                    <MapPin size={10} className="text-slate-900 dark:text-white" />
                                </div>
                                <div className="absolute left-1/2 -translate-x-1/2 bottom-6 hidden group-hover:block bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-[10px] font-bold px-2 py-1 rounded-lg whitespace-nowrap shadow-xl border border-slate-300 dark:border-slate-700">{z.name}</div>
                            </div>
                        ))}
                        {pendingPos && (
                            <motion.div style={{ left: `${pendingPos.x * 100}%`, top: `${pendingPos.y * 100}%` }}
                                initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -translate-x-1/2 -translate-y-1/2">
                                <div className="w-6 h-6 rounded-full bg-amber-500 border-2 border-white shadow-xl animate-bounce flex items-center justify-center"><Plus size={12} className="text-slate-900 dark:text-white" /></div>
                            </motion.div>
                        )}
                    </div>
                    {zones.length > 0 && (
                        <div className="space-y-2">
                            {zones.map((z, i) => (
                                <div key={z.id} className="flex items-center gap-3 p-2.5 bg-psi-subtle rounded-xl">
                                    <div className={clsx('w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0', z.colour)}><span className="text-slate-900 dark:text-white text-[10px] font-black">{i + 1}</span></div>
                                    <p className="flex-1 text-psi-primary text-sm font-bold">{z.name}</p>
                                    <p className="text-psi-muted text-[10px]">({Math.round(z.x * 100)}%, {Math.round(z.y * 100)}%)</p>
                                    <button onClick={() => removeZone(z.id)} className="text-psi-muted hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
            {imageUrl && zones.length > 0 && (
                <motion.button id="save-floorplan-btn" whileTap={{ scale: 0.97 }} onClick={handleSave} disabled={saving}
                    className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-900 dark:text-white font-extrabold text-sm disabled:opacity-50 shadow-lg shadow-amber-500/20 transition-all">
                    {saving ? <><Loader2 size={16} className="animate-spin" /> Saving…</> :
                        saved ? <><CheckCircle2 size={16} /> Saved to Firestore ✓</> :
                            <><Layers size={16} /> Save Floorplan &amp; Zones</>}
                </motion.button>
            )}
        </div>
    );
}

// ── Tab 2: Agent Logger ───────────────────────────────────────────────────────

function AgentLoggerTab({ eventId, agentId, agentName, imageUrl, zones, useDemoData, onPointLogged }: {
    eventId: string; agentId: string; agentName: string; imageUrl: string;
    zones: FloorZone[]; useDemoData: boolean; onPointLogged: (pt: LeadPoint) => void;
}) {
    const [tapPos, setTapPos] = useState<{ x: number; y: number } | null>(null);
    const [logging, setLogging] = useState(false);
    const [logged, setLogged] = useState<LeadPoint | null>(null);
    const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
    const mapRef = useRef<HTMLDivElement>(null);

    const handleMapTap = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
        const rect = mapRef.current!.getBoundingClientRect();
        let cx: number, cy: number;
        if ('touches' in e) { cx = e.touches[0].clientX; cy = e.touches[0].clientY; }
        else { cx = (e as React.MouseEvent).clientX; cy = (e as React.MouseEvent).clientY; }
        const x = (cx - rect.left) / rect.width;
        const y = (cy - rect.top) / rect.height;
        setTapPos({ x, y });
        const id = Date.now();
        setRipples(prev => [...prev, { id, x, y }]);
        setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 1000);
    };

    const handleLog = async () => {
        if (!tapPos) return;
        setLogging(true);
        const zoneName = nearestZone(zones, tapPos.x, tapPos.y);
        const pt: LeadPoint = { agentId, agentName, x: tapPos.x, y: tapPos.y, zoneName, timestamp: new Date().toISOString() };
        try {
            if (!useDemoData) {
                const ref = await addDoc(collection(db, 'crm_events', eventId, 'lead_points'), { ...pt, timestamp: serverTimestamp() });
                pt.id = ref.id;
            } else { pt.id = `demo_rt_${Date.now()}`; await new Promise(r => setTimeout(r, 600)); }
            setLogged(pt); onPointLogged(pt); setTapPos(null);
            setTimeout(() => setLogged(null), 4000);
        } catch { /* silent */ }
        setLogging(false);
    };

    return (
        <div className="space-y-4">
            <div className="psi-card rounded-2xl p-4">
                <p className="text-psi-primary font-bold text-sm mb-1 flex items-center gap-2"><MapPin size={14} className="text-amber-500" /> Tap Your Location</p>
                <p className="text-psi-muted text-xs mb-4">Tap where you are standing on the floorplan to log a lead position.</p>
                <div ref={mapRef} onClick={handleMapTap} onTouchStart={handleMapTap}
                    className="relative rounded-xl overflow-hidden cursor-crosshair border border-psi select-none touch-none">
                    <img src={imageUrl} alt="Floorplan" className="w-full h-auto block max-h-60 object-contain bg-white dark:bg-slate-900" />
                    {ripples.map(r => (
                        <motion.div key={r.id} style={{ left: `${r.x * 100}%`, top: `${r.y * 100}%` }}
                            className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                            initial={{ scale: 0, opacity: 0.8 }} animate={{ scale: 4, opacity: 0 }} transition={{ duration: 0.9, ease: 'easeOut' }}>
                            <div className="w-6 h-6 rounded-full border-2 border-amber-400" />
                        </motion.div>
                    ))}
                    <AnimatePresence>{tapPos && (
                        <motion.div style={{ left: `${tapPos.x * 100}%`, top: `${tapPos.y * 100}%` }}
                            initial={{ scale: 0, y: -10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0 }}
                            className="absolute -translate-x-1/2 -translate-y-full z-20 pointer-events-none">
                            <div className="relative">
                                <div className="w-7 h-7 rounded-full bg-amber-500 border-2 border-white shadow-xl flex items-center justify-center"><MapPin size={14} className="text-slate-900 dark:text-white" /></div>
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rotate-45 bg-amber-500" />
                            </div>
                        </motion.div>
                    )}</AnimatePresence>
                    {zones.map(z => (
                        <div key={z.id} style={{ left: `${z.x * 100}%`, top: `${z.y * 100}%` }} className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                            <div className={clsx('text-[9px] font-black text-slate-900 dark:text-white px-1.5 py-0.5 rounded-md opacity-70', z.colour)}>{z.name.split('—')[0].trim()}</div>
                        </div>
                    ))}
                </div>
                {tapPos && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2">
                        <MapPin size={12} className="text-amber-500 flex-shrink-0" />
                        <p className="text-amber-600 dark:text-amber-400 text-xs font-bold">{nearestZone(zones, tapPos.x, tapPos.y)}</p>
                    </motion.div>
                )}
            </div>
            <motion.button id="log-lead-position-btn" whileTap={{ scale: 0.97 }} onClick={handleLog} disabled={!tapPos || logging}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-900 dark:text-white font-extrabold text-sm disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-amber-500/20 transition-all">
                {logging ? <><Loader2 size={16} className="animate-spin" /> Logging…</> : <><MapPin size={16} /> {tapPos ? 'Log My Position' : 'Tap the map first'}</>}
            </motion.button>
            <AnimatePresence>{logged && (
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
                    className="flex items-center gap-3 bg-emerald-900/60 border border-emerald-700 rounded-2xl px-4 py-3">
                    <CheckCircle2 size={20} className="text-emerald-400 flex-shrink-0" />
                    <div>
                        <p className="text-emerald-300 font-bold text-sm">Position Logged ✓</p>
                        <p className="text-emerald-500 text-xs">{logged.zoneName} · {new Date(logged.timestamp).toLocaleTimeString('en-AE', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                </motion.div>
            )}</AnimatePresence>
            <div className="flex items-start gap-2 psi-card rounded-xl px-4 py-3">
                <Info size={13} className="text-psi-muted flex-shrink-0 mt-0.5" />
                <p className="text-psi-muted text-xs leading-relaxed">Log a position every time you capture a lead. The Organizer's heatmap updates in real-time and proves premium booth value to sponsors.</p>
            </div>
        </div>
    );
}

// ── Tab 3: Heatmap Viewer ─────────────────────────────────────────────────────

function HeatmapTab({ imageUrl, zones, points }: { imageUrl: string; zones: FloorZone[]; points: LeadPoint[] }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [zoom, setZoom] = useState(1);
    const [rendered, setRendered] = useState(false);
    const [radius, setRadius] = useState(60);
    const totalLeads = points.length;

    const zoneStats = useMemo(() =>
        zones.map(z => ({ ...z, count: zoneLeadCount(points, z.name) })).sort((a, b) => b.count - a.count),
        [zones, points]);

    const drawHeatmap = useCallback(() => {
        const canvas = canvasRef.current; const img = imgRef.current;
        if (!canvas || !img || !img.naturalWidth) return;
        renderHeatmap(canvas, points, img.naturalWidth, img.naturalHeight, radius);
        setRendered(true);
    }, [points, radius]);

    useEffect(() => { drawHeatmap(); }, [drawHeatmap]);

    const handleExport = () => {
        const canvas = canvasRef.current; const img = imgRef.current;
        if (!canvas || !img) return;
        const ex = document.createElement('canvas'); ex.width = img.naturalWidth; ex.height = img.naturalHeight;
        const ectx = ex.getContext('2d')!; ectx.drawImage(img, 0, 0); ectx.drawImage(canvas, 0, 0);
        const url = ex.toDataURL('image/png');
        const a = document.createElement('a'); a.href = url;
        a.download = `psi_heatmap_${new Date().toISOString().slice(0, 10)}.png`; a.click();
    };

    return (
        <div className="space-y-5">
            <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1 psi-card rounded-xl p-1 border border-psi">
                    <button id="zoom-out" onClick={() => setZoom(z => Math.max(0.5, z - 0.25))} className="p-2 rounded-lg hover:bg-psi-subtle text-psi-secondary hover:text-psi-primary transition-colors"><ZoomOut size={14} /></button>
                    <span className="text-psi-muted text-xs font-bold px-2">{Math.round(zoom * 100)}%</span>
                    <button id="zoom-in" onClick={() => setZoom(z => Math.min(3, z + 0.25))} className="p-2 rounded-lg hover:bg-psi-subtle text-psi-secondary hover:text-psi-primary transition-colors"><ZoomIn size={14} /></button>
                    <button id="zoom-reset" onClick={() => setZoom(1)} className="p-2 rounded-lg hover:bg-psi-subtle text-psi-secondary hover:text-psi-primary transition-colors"><RotateCcw size={14} /></button>
                </div>
                <div className="flex items-center gap-2 flex-1">
                    <span className="text-psi-muted text-xs font-bold whitespace-nowrap">Radius</span>
                    <input type="range" min={20} max={120} value={radius} onChange={e => setRadius(+e.target.value)} onMouseUp={drawHeatmap} onTouchEnd={drawHeatmap} className="flex-1 accent-amber-500" />
                    <span className="text-psi-muted text-xs font-mono w-8">{radius}px</span>
                </div>
                <button id="export-heatmap-btn" onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-900 dark:text-white text-xs font-bold transition-colors shadow-md shadow-amber-500/20">
                    <Download size={13} /> Export PNG
                </button>
            </div>
            <div ref={containerRef} className="relative rounded-2xl overflow-hidden border border-psi bg-white dark:bg-slate-900" style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '55vh' }}>
                <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', transition: 'transform 0.2s', width: `${100 / zoom}%` }}>
                    <div className="relative">
                        <img ref={imgRef} src={imageUrl} alt="Floorplan" className="w-full h-auto block" onLoad={drawHeatmap} crossOrigin="anonymous" />
                        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" style={{ mixBlendMode: 'screen', opacity: 0.82 }} />
                        {rendered && zones.map(z => <ZoneBadge key={z.id} zone={z} count={zoneLeadCount(points, z.name)} total={totalLeads} />)}
                    </div>
                </div>
            </div>
            <HeatLegend />
            <div className="psi-card rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                    <BarChart3 size={15} className="text-amber-500" />
                    <h3 className="text-psi-primary font-bold text-sm">Zone Performance Ranking</h3>
                    <span className="ml-auto text-psi-muted text-xs">{totalLeads} total leads</span>
                </div>
                <div className="space-y-3">
                    {zoneStats.map((z, i) => {
                        const pct = totalLeads > 0 ? (z.count / totalLeads) * 100 : 0;
                        const isTop = i === 0;
                        return (
                            <motion.div key={z.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                                className={clsx('rounded-xl p-3 border', isTop ? 'border-amber-500/40 bg-amber-500/5' : 'border-psi bg-psi-subtle')}>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className={clsx('w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0 text-slate-900 dark:text-white', z.colour)}>{i === 0 ? '🏆' : `#${i + 1}`}</div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-psi-primary font-bold text-sm truncate">{z.name}</p>
                                        {z.sponsor && <p className="text-psi-muted text-[10px]">{z.sponsor}</p>}
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <p className={clsx('text-xl font-black font-mono leading-none', isTop ? 'text-amber-400' : 'text-psi-primary')}>{z.count}</p>
                                        <p className="text-psi-muted text-[10px]">leads</p>
                                    </div>
                                </div>
                                <div className="h-2 bg-psi-page rounded-full overflow-hidden">
                                    <motion.div className={clsx('h-full rounded-full', i === 0 ? 'bg-gradient-to-r from-amber-500 to-rose-500' : 'bg-gradient-to-r from-blue-500 to-blue-400')}
                                        initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: 'easeOut', delay: i * 0.08 }} />
                                </div>
                                <div className="flex justify-between text-[10px] text-psi-muted mt-1">
                                    <span>{Math.round(pct)}% of total traffic</span>
                                    {isTop && <span className="text-amber-500 font-bold flex items-center gap-1"><Flame size={9} /> Hottest Zone</span>}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
                {zoneStats.length > 0 && (
                    <div className="mt-4 flex items-start gap-2 bg-blue-500/10 border border-blue-500/20 rounded-xl px-3 py-3">
                        <Award size={13} className="text-blue-400 flex-shrink-0 mt-0.5" />
                        <p className="text-blue-400 text-xs leading-relaxed">
                            <strong>{zoneStats[0]?.name}</strong> captured{' '}
                            <strong>{Math.round((zoneStats[0]?.count / Math.max(1, totalLeads)) * 100)}%</strong> of all leads,
                            demonstrating premium booth placement value for the next sponsorship negotiation.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function FloorplanHeatmap({
    eventId = 'demo_event_001',
    agentId = 'agent_demo',
    agentName = 'Demo Agent',
    role = 'organizer',
    useDemoData = true,
}: FloorplanHeatmapProps) {
    const [tab, setTab] = useState<TabId>(role === 'agent' ? 'logger' : 'heatmap');
    const [imageUrl, setImageUrl] = useState(DEMO_FLOORPLAN);
    const [zones, setZones] = useState<FloorZone[]>(DEMO_ZONES);
    const [points, setPoints] = useState<LeadPoint[]>(useDemoData ? DEMO_POINTS : []);

    useEffect(() => {
        if (useDemoData) return;
        let unsub: Unsubscribe | undefined;
        try {
            const colRef = collection(db, 'crm_events', eventId, 'lead_points');
            unsub = onSnapshot(colRef, snap => {
                setPoints(snap.docs.map(d => ({ id: d.id, ...d.data() } as LeadPoint)));
            });
        } catch { /* demo */ }
        return () => unsub?.();
    }, [eventId, useDemoData]);

    useEffect(() => {
        if (useDemoData) return;
        getDoc(doc(db, 'event_floorplans', eventId)).then(snap => {
            if (snap.exists()) {
                const data = snap.data();
                if (data.imageUrl) setImageUrl(data.imageUrl);
                if (data.zones) setZones(data.zones);
            }
        }).catch(() => { /* demo */ });
    }, [eventId, useDemoData]);

    const addPoint = (pt: LeadPoint) => setPoints(prev => [pt, ...prev]);

    const visibleTabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
        ...(role !== 'agent' ? [{ id: 'setup' as TabId, label: 'Setup', icon: <Layers size={13} /> }] : []),
        { id: 'logger', label: 'Log Position', icon: <MapPin size={13} /> },
        ...(role !== 'agent' ? [{ id: 'heatmap' as TabId, label: 'Heatmap', icon: <Flame size={13} /> }] : []),
    ];

    return (
        <div className="min-h-screen bg-psi-page p-4 md:p-6 space-y-6 max-w-3xl mx-auto">
            <div>
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-9 h-9 bg-gradient-to-br from-rose-500 to-amber-500 rounded-xl flex items-center justify-center shadow-md shadow-rose-500/20">
                        <Flame size={18} className="text-slate-900 dark:text-white" />
                    </div>
                    <span className="text-rose-500 text-xs font-black tracking-[0.2em] uppercase">Smart Floorplan · Heatmap</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-psi-primary tracking-tight">Floor Analytics</h1>
                <p className="text-psi-secondary text-sm mt-1">Real-time lead capture positions · Zone hotspot analysis · Sponsor ROI proof</p>
                <div className="flex items-center gap-4 mt-2">
                    <span className="text-xs text-psi-muted font-bold"><span className="text-amber-500 font-black">{points.length}</span> leads logged</span>
                    <span className="text-xs text-psi-muted font-bold"><span className="text-blue-400 font-black">{zones.length}</span> zones defined</span>
                    {useDemoData && <span className="text-[10px] text-psi-muted bg-psi-subtle border border-psi px-2 py-0.5 rounded-full font-bold">Demo Data</span>}
                </div>
            </div>

            <div className="flex gap-1 bg-psi-subtle p-1 rounded-2xl">
                {visibleTabs.map(t => (
                    <button key={t.id} id={`hm-tab-${t.id}`} onClick={() => setTab(t.id)}
                        className={clsx(
                            'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all',
                            tab === t.id
                                ? t.id === 'heatmap'
                                    ? 'bg-gradient-to-r from-rose-500 to-amber-500 text-slate-900 dark:text-white shadow-md'
                                    : 'bg-amber-500 text-slate-900 dark:text-white shadow-md shadow-amber-500/20'
                                : 'text-psi-muted hover:text-psi-primary'
                        )}>
                        {t.icon} {t.label}
                    </button>
                ))}
            </div>

            <AnimatePresence mode="wait">
                <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.18 }}>
                    {tab === 'setup' && <SetupTab eventId={eventId} imageUrl={imageUrl} setImageUrl={setImageUrl} zones={zones} setZones={setZones} />}
                    {tab === 'logger' && <AgentLoggerTab eventId={eventId} agentId={agentId} agentName={agentName} imageUrl={imageUrl} zones={zones} useDemoData={useDemoData} onPointLogged={addPoint} />}
                    {tab === 'heatmap' && <HeatmapTab imageUrl={imageUrl} zones={zones} points={points} />}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
