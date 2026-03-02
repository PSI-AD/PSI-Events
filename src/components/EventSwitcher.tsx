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
                    "flex items-center w-full bg-psi-surface border border-psi rounded-xl hover:bg-psi-subtle/50 transition-colors",
                    collapsed ? "p-2 justify-center" : "px-3 py-2 gap-3"
                )}
            >
                <div className={ccn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-psi-primary font-bold", `bg-${activeEvent?.theme?.primaryColor || 'slate'}-500`)}>
                    {activeEvent?.name?.substring(0, 1)}
                </div>
                {!collapsed && (
                    <div className="flex-1 text-left min-w-0 pr-1">
                        <p className="text-psi-primary font-semibold text-sm truncate">{activeEvent?.name}</p>
                        <p className="text-psi-secondary text-[10px] uppercase font-black uppercase tracking-wider">{activeEvent?.status} EVENT</p>
                    </div>
                )}
                {!collapsed && <ChevronsUpDown size={14} className="text-psi-secondary flex-shrink-0" />}
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -4, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full left-3 w-64 mt-2 bg-psi-surface border border-psi shadow-xl rounded-xl overflow-hidden z-50 origin-top-left"
                    >
                        <div className="p-2 border-b border-psi-subtle pb-2 mb-1">
                            <p className="px-2 text-[9px] font-black tracking-wider text-psi-secondary uppercase">Switch Event</p>
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
                                        "w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 hover:bg-psi-subtle/50 transition-colors",
                                        activeEvent?.id === evt.id && "bg-slate-50"
                                    )}
                                >
                                    <div className={ccn("w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 text-psi-primary text-xs font-bold", `bg-${evt.theme?.primaryColor || 'slate'}-500`)}>
                                        {evt.name.substring(0, 1)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-psi-primary font-semibold text-xs truncate">{evt.name}</p>
                                        <p className="text-psi-secondary text-[10px] truncate">{evt.location}</p>
                                    </div>
                                    {activeEvent?.id === evt.id && <Crown size={12} className="text-emerald-500 flex-shrink-0" />}
                                </button>
                            ))}
                        </div>
                        <div className="border-t border-psi-subtle p-1 mt-1">
                            <Link to="/admin/events" onClick={() => setOpen(false)} className="w-full px-3 py-2 flex items-center gap-3 text-psi-secondary hover:bg-psi-subtle/50 rounded-lg transition-colors">
                                <Settings size={14} className="text-psi-secondary" />
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
