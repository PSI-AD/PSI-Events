/**
 * BountySystemPage.tsx
 * Route-level wrapper for /bounties
 * Renders OrganizerBountyManager for Organizers / Managers,
 * AgentBountyView for Agents — using demo props until auth is wired.
 */

import React, { useState } from 'react';
import { OrganizerBountyManager, AgentBountyView } from '../features/events/BountySystem';
import type { UserRole } from '../types';

// Demo configuration — replace with live auth context when wired
const DEMO_EVENT_ID = 'evt_london_luxury_expo_2026';
const DEMO_ORG_NAME = 'Amr ElFangary';
const DEMO_AGENT_ID = 'agt_demo_001';
const DEMO_AGENT_NAME = 'Khalid Al-Mansouri';

const VIEW_TABS: { key: 'organizer' | 'agent'; label: string }[] = [
    { key: 'organizer', label: '🎯 Organizer View' },
    { key: 'agent', label: '📱 Agent View' },
];

export default function BountySystemPage() {
    const [view, setView] = useState<'organizer' | 'agent'>('organizer');

    return (
        <div className="min-h-screen bg-psi-page">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

                {/* View switcher (demo toggle — remove once role-based auth is wired) */}
                <div className="flex gap-1.5 bg-psi-subtle border border-psi p-1 rounded-2xl w-fit mb-8">
                    {VIEW_TABS.map(t => (
                        <button
                            key={t.key}
                            onClick={() => setView(t.key)}
                            className={[
                                'px-5 py-2.5 rounded-xl text-sm font-bold transition-all select-none',
                                view === t.key
                                    ? 'btn-accent shadow-sm'
                                    : 'text-psi-muted hover:text-psi-primary',
                            ].join(' ')}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {view === 'organizer' ? (
                    <OrganizerBountyManager
                        eventId={DEMO_EVENT_ID}
                        organizerName={DEMO_ORG_NAME}
                    />
                ) : (
                    <AgentBountyView
                        eventId={DEMO_EVENT_ID}
                        agentId={DEMO_AGENT_ID}
                        agentName={DEMO_AGENT_NAME}
                    />
                )}
            </div>
        </div>
    );
}
