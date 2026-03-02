import React, { useState } from 'react';
import { useCurrentEvent } from '../../context/EventContext';
import { Settings, Users, CalendarDays, Mic2, Plus, ArrowRight, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// ── Dummy Data for Sub-tabs ───────────────────────────────────────────────────
// In a real app, these would come from subcollections like events/{activeId}/speakers.

const MOCK_SESSIONS = [
    { id: 'sess_1', title: 'Opening Keynote', time: '09:00 AM', track: 'Main' },
    { id: 'sess_2', title: 'Developer Showcase', time: '11:00 AM', track: 'Tech' },
];

const MOCK_SPEAKERS = [
    { id: 'spk_1', name: 'Zahra Al-Fayed', role: 'Head of Sales', company: 'Emaar' },
    { id: 'spk_2', name: 'David Chen', role: 'Lead Architect', company: 'Foster + Partners' },
];

const MOCK_ATTENDEES = [
    { id: 'att_1', name: 'John Doe', type: 'VIP', company: 'Global Invest' },
    { id: 'att_2', name: 'Jane Smith', type: 'Standard', company: 'Acme Corp' },
];

type Tab = 'settings' | 'sessions' | 'speakers' | 'attendees';

export default function AdminEventManagement() {
    const { events, activeEvent, setActiveEvent, addEvent, updateEvent, deleteEvent } = useCurrentEvent();
    const [tab, setTab] = useState<Tab>('settings');
    const [isCreating, setIsCreating] = useState(false);
    const [newEventName, setNewEventName] = useState('');

    const handleCreateEvent = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEventName) return;
        addEvent({ name: newEventName, status: 'Draft' });
        setNewEventName('');
        setIsCreating(false);
    };

    if (!activeEvent && events.length === 0) {
        return (
            <div className="p-10 flex flex-col items-center justify-center h-full text-slate-600 dark:text-slate-400">
                <p>No events found. Create one.</p>
                <button
                    onClick={() => setIsCreating(true)}
                    className="mt-4 px-4 py-2 bg-emerald-500 text-slate-900 dark:text-white rounded-lg flex items-center gap-2"
                >
                    <Plus size={16} /> Create Event
                </button>
            </div>
        );
    }

    // Default to first event if active missing
    const current = activeEvent || events[0];

    const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
        { id: 'settings', label: 'Event Settings', icon: Settings },
        { id: 'sessions', label: 'Sessions', icon: CalendarDays },
        { id: 'speakers', label: 'Speakers', icon: Mic2 },
        { id: 'attendees', label: 'Attendees', icon: Users },
    ];

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 font-sans">
            {/* Header */}
            <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between flex-shrink-0">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <span className="bg-slate-100 dark:bg-slate-800 p-2 rounded-lg">
                            <Settings size={20} className="text-slate-600 dark:text-slate-300" />
                        </span>
                        Multi-Event Management
                    </h1>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        Currently managing: <span className="font-semibold text-slate-700 dark:text-slate-300">{current.name}</span>
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsCreating(true)}
                        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-900 dark:text-white font-medium rounded-lg flex items-center gap-2 transition-colors"
                    >
                        <Plus size={16} /> New Event
                    </button>
                </div>
            </header>

            {/* Tabs */}
            <div className="px-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 flex-shrink-0 flex gap-6">
                {TABS.map(t => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={cn(
                            "flex items-center gap-2 py-4 text-sm font-semibold border-b-2 transition-all block",
                            tab === t.id
                                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                        )}
                    >
                        <t.icon size={16} />
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <main className="flex-1 overflow-y-auto p-6">
                <AnimatePresence mode="wait">
                    {/* Settings Tab */}
                    {tab === 'settings' && (
                        <motion.div key="settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="max-w-3xl space-y-6">
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Core Information</h2>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Event Name</label>
                                        <input
                                            type="text"
                                            value={current.name}
                                            onChange={(e) => updateEvent(current.id, { name: e.target.value })}
                                            className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Start Date</label>
                                            <input
                                                type="date"
                                                value={current.dateStart}
                                                onChange={(e) => updateEvent(current.id, { dateStart: e.target.value })}
                                                className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">End Date</label>
                                            <input
                                                type="date"
                                                value={current.dateEnd}
                                                onChange={(e) => updateEvent(current.id, { dateEnd: e.target.value })}
                                                className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Location</label>
                                        <input
                                            type="text"
                                            value={current.location}
                                            onChange={(e) => updateEvent(current.id, { location: e.target.value })}
                                            className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Branding & Theme</h2>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Primary Color</label>
                                    <div className="flex gap-3">
                                        {['slate', 'blue', 'emerald', 'violet', 'rose', 'amber'].map(color => (
                                            <button
                                                key={color}
                                                onClick={() => updateEvent(current.id, { theme: { ...current.theme, primaryColor: color } })}
                                                className={cn(
                                                    "w-10 h-10 rounded-full flex items-center justify-center ring-offset-2 dark:ring-offset-slate-950 transition-all",
                                                    `bg-${color}-500`,
                                                    current.theme.primaryColor === color ? "ring-2 ring-emerald-500 scale-110" : "hover:scale-105"
                                                )}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl p-6 flex items-center justify-between">
                                <div>
                                    <h2 className="text-red-700 dark:text-red-400 font-bold mb-1">Danger Zone</h2>
                                    <p className="text-red-600/70 dark:text-red-400/70 text-sm">Permanently delete this event and all associated data.</p>
                                </div>
                                <button
                                    onClick={() => {
                                        if (window.confirm(`Are you sure you want to delete ${current.name}?`)) {
                                            deleteEvent(current.id);
                                        }
                                    }}
                                    className="px-4 py-2 bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 font-semibold rounded-lg hover:bg-red-200 dark:hover:bg-red-500/30 transition-colors"
                                >
                                    Delete Event
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* Sessions Tab */}
                    {tab === 'sessions' && (
                        <motion.div key="sessions" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Agenda & Sessions</h2>
                                <button className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
                                    <Plus size={14} /> Add Session
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {MOCK_SESSIONS.map(s => (
                                    <div key={s.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col gap-2">
                                        <div className="flex justify-between items-start">
                                            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded text-[10px] font-bold uppercase">{s.track} Track</span>
                                            <span className="text-slate-600 dark:text-slate-400 text-xs font-mono">{s.time}</span>
                                        </div>
                                        <p className="font-bold text-slate-900 dark:text-white">{s.title}</p>
                                        <button className="mt-2 text-sm text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 hover:gap-2 transition-all">
                                            Manage <ArrowRight size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* Speakers Tab */}
                    {tab === 'speakers' && (
                        <motion.div key="speakers" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Speaker Directory</h2>
                                <button className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
                                    <Plus size={14} /> Add Speaker
                                </button>
                            </div>
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 dark:text-slate-400">
                                        <tr>
                                            <th className="px-4 py-3 font-medium">Name</th>
                                            <th className="px-4 py-3 font-medium">Role</th>
                                            <th className="px-4 py-3 font-medium">Company</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                        {MOCK_SPEAKERS.map(s => (
                                            <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                                <td className="px-4 py-3 font-medium text-slate-900 dark:text-white flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold">
                                                        {s.name.charAt(0)}
                                                    </div>
                                                    {s.name}
                                                </td>
                                                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{s.role}</td>
                                                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{s.company}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    )}

                    {/* Attendees Tab */}
                    {tab === 'attendees' && (
                        <motion.div key="attendees" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Attendee Roster</h2>
                                <div className="flex gap-2">
                                    <button className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
                                        <Upload size={14} /> Import CSV
                                    </button>
                                    <button className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
                                        <Plus size={14} /> Add Attendee
                                    </button>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 dark:text-slate-400">
                                        <tr>
                                            <th className="px-4 py-3 font-medium">Name</th>
                                            <th className="px-4 py-3 font-medium">Type</th>
                                            <th className="px-4 py-3 font-medium">Company</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                        {MOCK_ATTENDEES.map(a => (
                                            <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                                <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{a.name}</td>
                                                <td className="px-4 py-3">
                                                    <span className={cn(
                                                        "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                                                        a.type === 'VIP' ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                                                    )}>
                                                        {a.type}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{a.company}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Create Event Modal */}
            {isCreating && (
                <div className="fixed inset-0 bg-white dark:bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl p-6 w-full max-w-md"
                    >
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Create New Platform Event</h2>
                        <form onSubmit={handleCreateEvent}>
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Event Name</label>
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="e.g. Q3 Global Summit"
                                    value={newEventName}
                                    onChange={(e) => setNewEventName(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                            </div>
                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsCreating(false)}
                                    className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!newEventName}
                                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-900 dark:text-white font-medium rounded-lg transition-colors"
                                >
                                    Create Event
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
