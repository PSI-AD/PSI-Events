import React, { useState, useRef, useEffect } from 'react';
import { useCurrentEvent } from '../context/EventContext';
import { ChevronsUpDown, Calendar, CirclePlus, Crown, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function ccn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function EventSwitcher({ collapsed }: { collapsed?: boolean }) {
    const { events, activeEvent, setActiveEvent } = useCurrentEvent();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [ref]);

    return (
        <div className="relative px-3 mb-4" ref={ref}>
            <button
                onClick={() => setOpen(!open)}
                className={ccn(
                    "flex items-center w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors",
                    collapsed ? "p-2 justify-center" : "px-3 py-2 gap-3"
                )}
            >
                <div className={ccn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-white font-bold", `bg-${activeEvent?.theme?.primaryColor || 'slate'}-500`)}>
                    {activeEvent?.name?.substring(0, 1)}
                </div>
                {!collapsed && (
                    <div className="flex-1 text-left min-w-0 pr-1">
                        <p className="text-slate-800 dark:text-white font-semibold text-sm truncate">{activeEvent?.name}</p>
                        <p className="text-slate-500 text-[10px] uppercase font-black uppercase tracking-wider">{activeEvent?.status} EVENT</p>
                    </div>
                )}
                {!collapsed && <ChevronsUpDown size={14} className="text-slate-400 flex-shrink-0" />}
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -4, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full left-3 w-64 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-xl overflow-hidden z-50 origin-top-left"
                    >
                        <div className="p-2 border-b border-slate-100 dark:border-slate-800/60 pb-2 mb-1">
                            <p className="px-2 text-[9px] font-black tracking-wider text-slate-400 uppercase">Switch Event</p>
                        </div>
                        <div className="max-h-60 overflow-y-auto p-1 space-y-1">
                            {events.map((evt) => (
                                <button
                                    key={evt.id}
                                    onClick={() => {
                                        setActiveEvent(evt.id);
                                        setOpen(false);
                                    }}
                                    className={ccn(
                                        "w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors",
                                        activeEvent?.id === evt.id && "bg-slate-50 dark:bg-slate-800"
                                    )}
                                >
                                    <div className={ccn("w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 text-white text-xs font-bold", `bg-${evt.theme?.primaryColor || 'slate'}-500`)}>
                                        {evt.name.substring(0, 1)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-slate-800 dark:text-white font-semibold text-xs truncate">{evt.name}</p>
                                        <p className="text-slate-500 text-[10px] truncate">{evt.location}</p>
                                    </div>
                                    {activeEvent?.id === evt.id && <Crown size={12} className="text-emerald-500 flex-shrink-0" />}
                                </button>
                            ))}
                        </div>
                        <div className="border-t border-slate-100 dark:border-slate-800/60 p-1 mt-1">
                            <Link to="/admin/events" onClick={() => setOpen(false)} className="w-full px-3 py-2 flex items-center gap-3 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors">
                                <Settings size={14} className="text-slate-400" />
                                <span className="text-xs font-semibold">Event Management</span>
                            </Link>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default EventSwitcher;
