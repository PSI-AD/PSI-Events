/**
 * MediaCompliancePage.tsx
 * Route page wrapper for /compliance
 * Provides demo events array until Firestore live wiring is complete.
 */

import React from 'react';
import MediaCompliance from '../features/approvals/MediaCompliance';
import type { Event } from '../types';

// Demo events covering all compliance states
const DEMO_EVENTS: Event[] = [
    {
        id: 'evt_london_luxury_expo_2026',
        name: 'London Luxury Property Show — Q4 2026',
        type: 'Roadshow',
        country: 'United Kingdom',
        city: 'London',
        start_date: '2026-10-15',
        end_date: '2026-10-17',
        organizer_id: 'usr_amr_elfangary',
        branch_target_leads: 75,
        organizer_commission_share_pct: 20,
        status: 'Completed',
        is_sponsored: true,
        created_at: '2026-09-01T00:00:00Z',
        isJournalEnabled: true,
        assignedMediaOfficerId: 'usr_demo_media_officer',
    },
    {
        id: 'evt_cairo_invest_nov2026',
        name: 'Cairo Investor Summit — November 2026',
        type: 'Conference',
        country: 'Egypt',
        city: 'Cairo',
        start_date: '2026-11-10',
        end_date: '2026-11-11',
        organizer_id: 'usr_amr_elfangary',
        branch_target_leads: 50,
        organizer_commission_share_pct: 20,
        status: 'Active',
        is_sponsored: false,
        created_at: '2026-10-01T00:00:00Z',
        isJournalEnabled: true,
        assignedMediaOfficerId: 'usr_sara_almarzouqi_dxb',
    },
    {
        id: 'evt_dubai_global_jan2027',
        name: 'Dubai Global Property Expo — January 2027',
        type: 'Expo',
        country: 'United Arab Emirates',
        city: 'Dubai',
        start_date: '2027-01-20',
        end_date: '2027-01-23',
        organizer_id: 'usr_khalid_mansouri_auh',
        branch_target_leads: 120,
        organizer_commission_share_pct: 20,
        status: 'Proposal',
        is_sponsored: false,
        created_at: '2026-12-01T00:00:00Z',
        isJournalEnabled: false,
    },
    {
        id: 'evt_riyadh_roadshow_mar2027',
        name: 'Riyadh Luxury Roadshow — March 2027',
        type: 'Roadshow',
        country: 'Saudi Arabia',
        city: 'Riyadh',
        start_date: '2027-03-05',
        end_date: '2027-03-07',
        organizer_id: 'usr_amr_elfangary',
        branch_target_leads: 90,
        organizer_commission_share_pct: 20,
        status: 'Draft',
        is_sponsored: true,
        created_at: '2027-01-15T00:00:00Z',
        isJournalEnabled: true,
        // No officer assigned — triggers 'no_officer' status
    },
];

export default function MediaCompliancePage() {
    return (
        <div className="min-h-screen bg-psi-page px-4 py-8 md:px-8">
            <div className="max-w-2xl mx-auto">
                <header className="mb-8">
                    <h1 className="text-2xl font-extrabold text-psi-primary">
                        Media Compliance Tracker
                    </h1>
                    <p className="text-psi-secondary text-sm mt-1">
                        Journal coverage accountability for all active events.
                    </p>
                </header>
                <MediaCompliance
                    events={DEMO_EVENTS}
                    currentUserRole="Organizer"
                />
            </div>
        </div>
    );
}
