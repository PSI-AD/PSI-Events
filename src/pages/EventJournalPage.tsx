/**
 * EventJournalPage.tsx
 * Route page wrapper for /journal
 * Provides demo props until auth context is fully wired.
 */

import React from 'react';
import EventJournal from '../features/events/EventJournal';
import type { Event } from '../types';

// Demo event — replace with live Firestore data once auth is wired
const DEMO_EVENT: Event = {
    id: 'evt_london_luxury_expo_2026',
    name: 'London Luxury Property Show — Q4 2026',
    type: 'Roadshow',
    country: 'United Kingdom',
    city: 'London',
    start_date: '2026-10-15',
    end_date: '2026-10-17',
    website: 'https://londonpropertyshow.co.uk',
    stand_size: '9m²',
    expected_visitors: 3500,
    organizer_id: 'usr_amr_elfangary',
    branch_target_leads: 75,
    organizer_commission_share_pct: 20,
    status: 'Active',
    is_sponsored: true,
    created_at: '2026-09-01T00:00:00Z',
    // Journal config
    isJournalEnabled: true,
    assignedMediaOfficerId: 'usr_demo_media_officer',
    journalLockAfterHours: 24,
};

export default function EventJournalPage() {
    return (
        <EventJournal
            eventId={DEMO_EVENT.id}
            event={DEMO_EVENT}
            currentUserId="usr_demo_media_officer"
            currentUserName="Amr ElFangary"
            currentUserRole="Organizer"
        />
    );
}
