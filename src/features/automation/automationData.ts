/**
 * automationData.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Data engine for the Event Automation System.
 * Production swap: persist rules to Firestore, execute actions via Cloud Functions.
 */

// ── Enums ─────────────────────────────────────────────────────────────────────

export type TriggerType =
    | 'TIME_BEFORE_SESSION'   // X minutes before session start
    | 'SESSION_STARTS'        // Exactly when session begins
    | 'SESSION_ENDS'          // When session concludes
    | 'EVENT_STARTS'          // When the full event opens
    | 'ATTENDEE_REGISTERS'    // New attendee registration
    | 'CAPACITY_THRESHOLD'    // Room capacity reaches X%
    | 'NETWORKING_WINDOW'     // Networking break begins
    | 'FEEDBACK_WINDOW'       // X minutes after session end
    | 'MANUAL';               // Admin manually fires

export type ActionType =
    | 'PUSH_NOTIFICATION'
    | 'EMAIL_BLAST'
    | 'SMS'
    | 'FEEDBACK_REQUEST'
    | 'NETWORKING_REMINDER'
    | 'SLACK_ALERT'
    | 'WAITLIST_NOTIFY'
    | 'CALENDAR_INVITE';

export type RuleStatus = 'active' | 'paused' | 'draft' | 'archived';
export type LogStatus = 'sent' | 'failed' | 'skipped' | 'pending';

// ── Config maps ───────────────────────────────────────────────────────────────

export interface TriggerDef {
    label: string;
    description: string;
    emoji: string;
    color: string;
    hasDelay: boolean;       // shows time-offset field
    delayLabel?: string;
}

export const TRIGGER_DEFS: Record<TriggerType, TriggerDef> = {
    TIME_BEFORE_SESSION: {
        label: 'Time Before Session',
        description: 'Fire X minutes/hours before a session starts',
        emoji: '⏰', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
        hasDelay: true, delayLabel: 'before session',
    },
    SESSION_STARTS: {
        label: 'Session Starts',
        description: 'Fire at the exact moment a session begins',
        emoji: '🎬', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        hasDelay: false,
    },
    SESSION_ENDS: {
        label: 'Session Ends',
        description: 'Fire when a session concludes',
        emoji: '🏁', color: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
        hasDelay: false,
    },
    EVENT_STARTS: {
        label: 'Event Opens',
        description: 'Fire when the event day officially starts',
        emoji: '🚀', color: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
        hasDelay: false,
    },
    ATTENDEE_REGISTERS: {
        label: 'Attendee Registers',
        description: 'Fire whenever a new attendee registers',
        emoji: '👤', color: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
        hasDelay: false,
    },
    CAPACITY_THRESHOLD: {
        label: 'Capacity Threshold',
        description: 'Fire when a room/session reaches a capacity %',
        emoji: '📊', color: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
        hasDelay: true, delayLabel: '% capacity',
    },
    NETWORKING_WINDOW: {
        label: 'Networking Break',
        description: 'Fire when a networking window opens',
        emoji: '🤝', color: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
        hasDelay: false,
    },
    FEEDBACK_WINDOW: {
        label: 'Post-Session Feedback',
        description: 'Fire X minutes after a session ends',
        emoji: '📝', color: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
        hasDelay: true, delayLabel: 'after session ends',
    },
    MANUAL: {
        label: 'Manual Trigger',
        description: 'Admin manually fires this automation',
        emoji: '🖱', color: 'text-slate-300 bg-slate-700/40 border-slate-600/30',
        hasDelay: false,
    },
};

export interface ActionDef {
    label: string;
    description: string;
    emoji: string;
    color: string;
    channels: string[];
}

export const ACTION_DEFS: Record<ActionType, ActionDef> = {
    PUSH_NOTIFICATION: {
        label: 'Push Notification',
        description: 'In-app push to all registered devices',
        emoji: '📲', color: 'text-emerald-400',
        channels: ['iOS', 'Android', 'Web PWA'],
    },
    EMAIL_BLAST: {
        label: 'Email Blast',
        description: 'Batch email to selected attendee segment',
        emoji: '📧', color: 'text-sky-400',
        channels: ['Gmail', 'SendGrid', 'Mailchimp'],
    },
    SMS: {
        label: 'SMS Message',
        description: 'Text message via Twilio to opted-in numbers',
        emoji: '💬', color: 'text-amber-400',
        channels: ['Twilio'],
    },
    FEEDBACK_REQUEST: {
        label: 'Feedback Request',
        description: 'Push a star-rating survey to attendees',
        emoji: '⭐', color: 'text-yellow-400',
        channels: ['In-App', 'Email'],
    },
    NETWORKING_REMINDER: {
        label: 'Networking Reminder',
        description: 'Prompt attendees to connect in the lounge',
        emoji: '🤝', color: 'text-pink-400',
        channels: ['Push', 'In-App'],
    },
    SLACK_ALERT: {
        label: 'Slack Alert',
        description: 'Message the #event-ops Slack channel',
        emoji: '💬', color: 'text-violet-400',
        channels: ['Slack'],
    },
    WAITLIST_NOTIFY: {
        label: 'Waitlist Notification',
        description: 'Notify waitlisted attendees of an opening',
        emoji: '🎟', color: 'text-orange-400',
        channels: ['Email', 'Push'],
    },
    CALENDAR_INVITE: {
        label: 'Calendar Invite',
        description: 'Send a .ics calendar invite to attendees',
        emoji: '📅', color: 'text-blue-400',
        channels: ['Email'],
    },
};

// ── Rule and Log types ────────────────────────────────────────────────────────

export interface AutomationAction {
    type: ActionType;
    title: string;
    body: string;
    targetSegment: 'All Attendees' | 'Session Attendees' | 'VIP Only' | 'Admins Only';
}

export interface AutomationRule {
    id: string;
    name: string;
    description: string;
    trigger: TriggerType;
    triggerOffset?: number;   // minutes (for TIME_BEFORE_SESSION, FEEDBACK_WINDOW) or % (CAPACITY_THRESHOLD)
    sessionFilter?: string;   // 'All Sessions' or specific session name
    actions: AutomationAction[];
    status: RuleStatus;
    runCount: number;
    lastTriggered?: string;   // ISO
    createdAt: string;
    tags: string[];
}

export interface LogEntry {
    id: string;
    ruleId: string;
    ruleName: string;
    triggerType: TriggerType;
    actionType: ActionType;
    actionTitle: string;
    recipients: number;
    status: LogStatus;
    timestamp: string;
    note?: string;
}

// ── Seed rules ────────────────────────────────────────────────────────────────

export const SEED_RULES: AutomationRule[] = [
    {
        id: 'r1',
        name: 'Session 1-Hour Reminder',
        description: 'Push notification 60 minutes before any session to remind registered attendees.',
        trigger: 'TIME_BEFORE_SESSION',
        triggerOffset: 60,
        sessionFilter: 'All Sessions',
        actions: [{
            type: 'PUSH_NOTIFICATION',
            title: '⏰ Session Starting in 1 Hour',
            body: '{{session_name}} begins at {{session_time}} in {{session_room}}. Get ready!',
            targetSegment: 'All Attendees',
        }],
        status: 'active',
        runCount: 12,
        lastTriggered: '2026-03-02T09:00:00Z',
        createdAt: '2026-01-15T00:00:00Z',
        tags: ['Reminder', 'Sessions'],
    },
    {
        id: 'r2',
        name: 'Session 15-Min Final Alert',
        description: 'Last-call push 15 minutes before keynote sessions to boost attendance.',
        trigger: 'TIME_BEFORE_SESSION',
        triggerOffset: 15,
        sessionFilter: 'Keynote',
        actions: [{
            type: 'PUSH_NOTIFICATION',
            title: '🎬 Starting in 15 Minutes',
            body: '{{session_name}} is about to begin in {{session_room}}. Doors open now.',
            targetSegment: 'All Attendees',
        }, {
            type: 'SLACK_ALERT',
            title: '15-min to Keynote',
            body: 'Keynote {{session_name}} starts in 15 min — room setup check needed.',
            targetSegment: 'Admins Only',
        }],
        status: 'active',
        runCount: 4,
        lastTriggered: '2026-03-02T09:45:00Z',
        createdAt: '2026-01-15T00:00:00Z',
        tags: ['Reminder', 'Keynote', 'Ops'],
    },
    {
        id: 'r3',
        name: 'Post-Session Feedback Request',
        description: 'Send a star-rating survey to session attendees 5 minutes after each session ends.',
        trigger: 'FEEDBACK_WINDOW',
        triggerOffset: 5,
        sessionFilter: 'All Sessions',
        actions: [{
            type: 'FEEDBACK_REQUEST',
            title: '⭐ How was {{session_name}}?',
            body: 'Rate your experience with {{speaker_name}}\'s session. Takes 30 seconds.',
            targetSegment: 'Session Attendees',
        }],
        status: 'active',
        runCount: 18,
        lastTriggered: '2026-03-02T11:05:00Z',
        createdAt: '2026-01-20T00:00:00Z',
        tags: ['Feedback', 'Sessions'],
    },
    {
        id: 'r4',
        name: 'Event Welcome Notification',
        description: 'Welcome all registered attendees when the event officially opens with the full day schedule.',
        trigger: 'EVENT_STARTS',
        sessionFilter: 'All Sessions',
        actions: [{
            type: 'PUSH_NOTIFICATION',
            title: '🚀 PSI Events 2026 is LIVE!',
            body: 'Welcome! The event is now open. Check the agenda and explore the venue map.',
            targetSegment: 'All Attendees',
        }, {
            type: 'EMAIL_BLAST',
            title: 'Welcome to PSI Events 2026',
            body: 'Your full day guide, session schedule, and venue map are ready inside the app.',
            targetSegment: 'All Attendees',
        }],
        status: 'active',
        runCount: 1,
        lastTriggered: '2026-03-02T08:00:00Z',
        createdAt: '2026-01-15T00:00:00Z',
        tags: ['Welcome', 'Event Day'],
    },
    {
        id: 'r5',
        name: 'Networking Break Prompt',
        description: 'Nudge attendees to visit the networking lounge during designated breaks.',
        trigger: 'NETWORKING_WINDOW',
        sessionFilter: 'All Sessions',
        actions: [{
            type: 'NETWORKING_REMINDER',
            title: '🤝 Networking Lounge is Open!',
            body: 'The lounge is now open for 30 minutes. Your top 3 recommended connections are waiting.',
            targetSegment: 'All Attendees',
        }],
        status: 'active',
        runCount: 6,
        lastTriggered: '2026-03-02T10:30:00Z',
        createdAt: '2026-01-22T00:00:00Z',
        tags: ['Networking'],
    },
    {
        id: 'r6',
        name: 'High Capacity Room Alert',
        description: 'Alert the ops team via Slack when a session room hits 90% capacity so they can open overflow.',
        trigger: 'CAPACITY_THRESHOLD',
        triggerOffset: 90,
        sessionFilter: 'All Sessions',
        actions: [{
            type: 'SLACK_ALERT',
            title: '🚨 Room at 90% Capacity',
            body: '{{session_room}} is at 90% capacity for {{session_name}}. Open overflow now.',
            targetSegment: 'Admins Only',
        }, {
            type: 'WAITLIST_NOTIFY',
            title: '🎟 Room Opening Soon',
            body: 'Good news — {{session_name}} may have capacity. Check in at the door.',
            targetSegment: 'All Attendees',
        }],
        status: 'active',
        runCount: 3,
        lastTriggered: '2026-03-02T10:05:00Z',
        createdAt: '2026-02-01T00:00:00Z',
        tags: ['Ops', 'Capacity'],
    },
    {
        id: 'r7',
        name: 'VIP Pre-Session SMS',
        description: 'Send an exclusive SMS to VIP attendees 30 minutes before VIP-targeted sessions.',
        trigger: 'TIME_BEFORE_SESSION',
        triggerOffset: 30,
        sessionFilter: 'VIP Sessions',
        actions: [{
            type: 'SMS',
            title: 'PSI Events VIP Alert',
            body: 'Your VIP session {{session_name}} begins at {{session_time}} in the Boardroom Suite.',
            targetSegment: 'VIP Only',
        }, {
            type: 'CALENDAR_INVITE',
            title: '📅 VIP Session Reminder',
            body: 'Your calendar invite for {{session_name}} is attached.',
            targetSegment: 'VIP Only',
        }],
        status: 'paused',
        runCount: 2,
        lastTriggered: '2026-03-01T14:30:00Z',
        createdAt: '2026-02-05T00:00:00Z',
        tags: ['VIP', 'Reminder', 'SMS'],
    },
    {
        id: 'r8',
        name: 'Day-End Engagement Report',
        description: 'Send ops team a summary of the day\'s automation activity and engagement metrics.',
        trigger: 'MANUAL',
        sessionFilter: 'All Sessions',
        actions: [{
            type: 'EMAIL_BLAST',
            title: '📊 Day-End Engagement Summary',
            body: 'Today\'s event summary: {{attendee_count}} attendees, {{session_count}} sessions, {{feedback_avg}} avg rating.',
            targetSegment: 'Admins Only',
        }, {
            type: 'SLACK_ALERT',
            title: 'Daily Report Ready',
            body: 'Day-end engagement report has been sent to all event admins.',
            targetSegment: 'Admins Only',
        }],
        status: 'draft',
        runCount: 0,
        createdAt: '2026-02-10T00:00:00Z',
        tags: ['Reporting', 'End of Day'],
    },
];

// ── Seed activity log ─────────────────────────────────────────────────────────

export const SEED_LOG: LogEntry[] = [
    { id: 'l1', ruleId: 'r4', ruleName: 'Event Welcome Notification', triggerType: 'EVENT_STARTS', actionType: 'PUSH_NOTIFICATION', actionTitle: '🚀 PSI Events 2026 is LIVE!', recipients: 412, status: 'sent', timestamp: '2026-03-02T08:00:14Z' },
    { id: 'l2', ruleId: 'r4', ruleName: 'Event Welcome Notification', triggerType: 'EVENT_STARTS', actionType: 'EMAIL_BLAST', actionTitle: 'Welcome to PSI Events 2026', recipients: 412, status: 'sent', timestamp: '2026-03-02T08:00:31Z' },
    { id: 'l3', ruleId: 'r1', ruleName: 'Session 1-Hour Reminder', triggerType: 'TIME_BEFORE_SESSION', actionType: 'PUSH_NOTIFICATION', actionTitle: '⏰ Session Starting in 1 Hour', recipients: 387, status: 'sent', timestamp: '2026-03-02T09:00:02Z', note: 'Opening Keynote' },
    { id: 'l4', ruleId: 'r2', ruleName: 'Session 15-Min Final Alert', triggerType: 'TIME_BEFORE_SESSION', actionType: 'PUSH_NOTIFICATION', actionTitle: '🎬 Starting in 15 Minutes', recipients: 387, status: 'sent', timestamp: '2026-03-02T09:45:08Z', note: 'Opening Keynote' },
    { id: 'l5', ruleId: 'r2', ruleName: 'Session 15-Min Final Alert', triggerType: 'TIME_BEFORE_SESSION', actionType: 'SLACK_ALERT', actionTitle: '15-min to Keynote', recipients: 4, status: 'sent', timestamp: '2026-03-02T09:45:09Z' },
    { id: 'l6', ruleId: 'r6', ruleName: 'High Capacity Room Alert', triggerType: 'CAPACITY_THRESHOLD', actionType: 'SLACK_ALERT', actionTitle: '🚨 Room at 90% Capacity', recipients: 4, status: 'sent', timestamp: '2026-03-02T10:05:22Z', note: 'Grand Ballroom / Opening Keynote' },
    { id: 'l7', ruleId: 'r6', ruleName: 'High Capacity Room Alert', triggerType: 'CAPACITY_THRESHOLD', actionType: 'WAITLIST_NOTIFY', actionTitle: '🎟 Room Opening Soon', recipients: 23, status: 'sent', timestamp: '2026-03-02T10:05:23Z' },
    { id: 'l8', ruleId: 'r5', ruleName: 'Networking Break Prompt', triggerType: 'NETWORKING_WINDOW', actionType: 'NETWORKING_REMINDER', actionTitle: '🤝 Networking Lounge is Open!', recipients: 412, status: 'sent', timestamp: '2026-03-02T10:30:01Z' },
    { id: 'l9', ruleId: 'r3', ruleName: 'Post-Session Feedback Request', triggerType: 'FEEDBACK_WINDOW', actionType: 'FEEDBACK_REQUEST', actionTitle: '⭐ How was the Opening Keynote?', recipients: 374, status: 'sent', timestamp: '2026-03-02T11:05:14Z' },
    { id: 'l10', ruleId: 'r1', ruleName: 'Session 1-Hour Reminder', triggerType: 'TIME_BEFORE_SESSION', actionType: 'PUSH_NOTIFICATION', actionTitle: '⏰ Session Starting in 1 Hour', recipients: 203, status: 'sent', timestamp: '2026-03-02T11:00:01Z', note: 'Price Forecasting' },
    { id: 'l11', ruleId: 'r3', ruleName: 'Post-Session Feedback Request', triggerType: 'FEEDBACK_WINDOW', actionType: 'FEEDBACK_REQUEST', actionTitle: '⭐ How was Price Forecasting?', recipients: 187, status: 'failed', timestamp: '2026-03-02T12:41:06Z', note: 'SendGrid rate limit hit — retried' },
    { id: 'l12', ruleId: 'r5', ruleName: 'Networking Break Prompt', triggerType: 'NETWORKING_WINDOW', actionType: 'NETWORKING_REMINDER', actionTitle: '🤝 Networking Lounge is Open!', recipients: 412, status: 'sent', timestamp: '2026-03-02T12:30:00Z' },
];

// ── Stats helpers ─────────────────────────────────────────────────────────────

export function getRuleStats(rules: AutomationRule[]) {
    return {
        total: rules.length,
        active: rules.filter(r => r.status === 'active').length,
        paused: rules.filter(r => r.status === 'paused').length,
        draft: rules.filter(r => r.status === 'draft').length,
        totalRuns: rules.reduce((s, r) => s + r.runCount, 0),
    };
}

export function getLogStats(log: LogEntry[]) {
    const sent = log.filter(l => l.status === 'sent');
    return {
        total: log.length,
        sent: sent.length,
        failed: log.filter(l => l.status === 'failed').length,
        totalRecipients: sent.reduce((s, l) => s + l.recipients, 0),
    };
}

export const STATUS_STYLES: Record<RuleStatus, { bg: string; text: string; border: string; dot: string }> = {
    active: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', dot: 'bg-emerald-400' },
    paused: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', dot: 'bg-amber-400' },
    draft: { bg: 'bg-slate-700/40', text: 'text-slate-400', border: 'border-slate-600/30', dot: 'bg-slate-400' },
    archived: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20', dot: 'bg-red-400' },
};

export const LOG_STATUS_STYLES: Record<LogStatus, { text: string; bg: string }> = {
    sent: { text: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    failed: { text: 'text-red-400', bg: 'bg-red-500/10' },
    skipped: { text: 'text-slate-400', bg: 'bg-slate-700/40' },
    pending: { text: 'text-amber-400', bg: 'bg-amber-500/10' },
};
