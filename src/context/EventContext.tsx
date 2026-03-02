import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface EventTheme {
    primaryColor: string;
    logo?: string;
}

export interface PlatformEvent {
    id: string;
    name: string;
    status: 'Active' | 'Upcoming' | 'Completed' | 'Draft';
    location: string;
    dateStart: string;
    dateEnd: string;
    theme: EventTheme;
    stats: {
        attendees: number;
        sessions: number;
        speakers: number;
    };
}

// ── Dummy Data ───────────────────────────────────────────────────────────────

export const SYSTEM_EVENTS: PlatformEvent[] = [
    {
        id: 'evt_1',
        name: 'Moscow Luxury Property Expo 2026',
        status: 'Active',
        location: 'Moscow, Russia',
        dateStart: '2026-03-15',
        dateEnd: '2026-03-17',
        theme: { primaryColor: 'violet' },
        stats: { attendees: 412, sessions: 6, speakers: 8 },
    },
    {
        id: 'evt_2',
        name: 'London VIP Roadshow',
        status: 'Upcoming',
        location: 'London, UK',
        dateStart: '2026-04-10',
        dateEnd: '2026-04-12',
        theme: { primaryColor: 'blue' },
        stats: { attendees: 156, sessions: 3, speakers: 4 },
    },
    {
        id: 'evt_3',
        name: 'Riyadh Investor Summit',
        status: 'Active',
        location: 'Riyadh, KSA',
        dateStart: '2026-03-05',
        dateEnd: '2026-03-06',
        theme: { primaryColor: 'emerald' },
        stats: { attendees: 284, sessions: 5, speakers: 6 },
    },
];

// ── Context ───────────────────────────────────────────────────────────────────

interface EventContextProps {
    events: PlatformEvent[];
    activeEvent: PlatformEvent | null;
    setActiveEvent: (id: string, partialEvent?: Partial<PlatformEvent>) => void;
    addEvent: (evt: Partial<PlatformEvent>) => void;
    deleteEvent: (id: string) => void;
    updateEvent: (id: string, evt: Partial<PlatformEvent>) => void;
}

const EventContext = createContext<EventContextProps | undefined>(undefined);

export function EventProvider({ children }: { children: ReactNode }) {
    const [events, setEvents] = useState<PlatformEvent[]>(SYSTEM_EVENTS);
    const [activeId, setActiveId] = useState<string>('evt_1');

    const activeEvent = events.find(e => e.id === activeId) || null;

    useEffect(() => {
        // Apply theme color based on active event. For a real app,
        // you would write specific custom properties or Tailwind overrides.
        // Today, we'll just log it. Visual changes can happen at component level.
        console.log(`[EventContext] Switched to event: ${activeEvent?.name}`);
    }, [activeEvent]);

    const setActiveEvent = (id: string, partialEvent?: Partial<PlatformEvent>) => {
        if (!events.some(e => e.id === id) && partialEvent) {
            // Auto-register it into context if provided
            const newEvt: PlatformEvent = {
                id,
                name: partialEvent.name || 'Unknown Event',
                status: partialEvent.status || 'Draft',
                location: partialEvent.location || 'Unknown',
                dateStart: partialEvent.dateStart || '',
                dateEnd: partialEvent.dateEnd || '',
                theme: partialEvent.theme || { primaryColor: 'slate' },
                stats: partialEvent.stats || { attendees: 0, sessions: 0, speakers: 0 },
            };
            setEvents(prev => [...prev, newEvt]);
        }
        setActiveId(id);
    };

    const addEvent = (evt: Partial<PlatformEvent>) => {
        const newEvt: PlatformEvent = {
            id: `evt_${Date.now()}`,
            name: evt.name || 'New Event',
            status: evt.status || 'Draft',
            location: evt.location || 'TBD',
            dateStart: evt.dateStart || new Date().toISOString().slice(0, 10),
            dateEnd: evt.dateEnd || new Date().toISOString().slice(0, 10),
            theme: evt.theme || { primaryColor: 'blue' },
            stats: { attendees: 0, sessions: 0, speakers: 0 },
        };
        setEvents(prev => [...prev, newEvt]);
    };

    const deleteEvent = (id: string) => {
        setEvents(prev => prev.filter(e => e.id !== id));
        if (activeId === id) {
            setActiveId(events[0]?.id || '');
        }
    };

    const updateEvent = (id: string, evt: Partial<PlatformEvent>) => {
        setEvents(prev => prev.map(e => e.id === id ? { ...e, ...evt } : e));
    };

    const value = {
        events,
        activeEvent,
        setActiveEvent,
        addEvent,
        deleteEvent,
        updateEvent,
    };

    return <EventContext.Provider value={value}>{children}</EventContext.Provider>;
}

export function useCurrentEvent() {
    const context = useContext(EventContext);
    if (context === undefined) {
        throw new Error('useCurrentEvent must be used within an EventProvider');
    }
    return context;
}
