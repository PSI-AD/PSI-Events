/**
 * src/utils/checklistEngine.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * PSI Interactive Guided Checklist Engine
 *
 * Three responsibilities:
 *   1. Pure math utilities — calculateProgress(), getUrgentTasks()
 *   2. Hydration — hydrateTemplate() converts a ChecklistTemplate into live
 *      ChecklistTask[] for a specific event + user
 *   3. Mock data — AGENT_TEMPLATE and MANAGER_TEMPLATE for development/testing
 *
 * All functions are pure (no side effects) and fully unit-testable.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type {
    ChecklistTask,
    ChecklistTemplate,
    ChecklistTemplateItem,
    ChecklistProgress,
    UrgentTask,
} from '../types/checklist';

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 1 — MATH UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

/** 48-hour urgency window in milliseconds. */
const URGENT_WINDOW_MS = 48 * 60 * 60 * 1000;

/**
 * calculateProgress
 * ─────────────────
 * Computes completion metrics for a given task array.
 *
 * Distinction between `completedCount` and `fullyResolvedCount`:
 *   - `completedCount`      → user has ticked the task (isCompleted === true)
 *   - `fullyResolvedCount`  → task is done AND either doesn't need validation
 *                             OR has been validated by a manager
 *
 * The headline `percentage` is based on `fullyResolvedCount` so that tasks
 * awaiting manager sign-off don't inflate the progress bar prematurely.
 *
 * @param tasks  Array of ChecklistTask (may be empty).
 * @returns      ChecklistProgress object.
 */
export function calculateProgress(tasks: ChecklistTask[]): ChecklistProgress {
    if (tasks.length === 0) {
        return {
            completedCount: 0,
            fullyResolvedCount: 0,
            totalCount: 0,
            percentage: 0,
            overdueCount: 0,
            urgentCount: 0,
        };
    }

    const now = Date.now();

    let completedCount = 0;
    let fullyResolvedCount = 0;
    let overdueCount = 0;
    let urgentCount = 0;

    for (const task of tasks) {
        if (task.isCompleted) {
            completedCount++;
            const isFullyResolved =
                !task.requiresValidation || task.isValidated === true;
            if (isFullyResolved) fullyResolvedCount++;
        } else {
            // Not yet complete — check urgency / overdue
            const msUntilDeadline = task.deadline - now;
            if (msUntilDeadline < 0) {
                overdueCount++;
            } else if (msUntilDeadline <= URGENT_WINDOW_MS) {
                urgentCount++;
            }
        }
    }

    const percentage =
        tasks.length > 0
            ? Math.round((fullyResolvedCount / tasks.length) * 100)
            : 0;

    return {
        completedCount,
        fullyResolvedCount,
        totalCount: tasks.length,
        percentage,
        overdueCount,
        urgentCount,
    };
}

/**
 * getUrgentTasks
 * ──────────────
 * Returns incomplete tasks whose deadline falls within the next 48 hours
 * OR is already past (overdue), sorted by deadline ascending so the most
 * pressing items appear first.
 *
 * Each returned item is enriched with:
 *   - `hoursRemaining` — decimal hours until deadline (negative = overdue)
 *   - `isOverdue`      — true if deadline has already passed
 *
 * @param tasks  Full task list (may be mixed roles).
 * @returns      Sorted array of UrgentTask.
 */
export function getUrgentTasks(tasks: ChecklistTask[]): UrgentTask[] {
    const now = Date.now();

    return tasks
        .filter(task => {
            if (task.isCompleted) return false;
            const msUntilDeadline = task.deadline - now;
            // Include overdue tasks (negative) and tasks within 48-hour window
            return msUntilDeadline <= URGENT_WINDOW_MS;
        })
        .map(task => {
            const msUntilDeadline = task.deadline - Date.now();
            return {
                ...task,
                hoursRemaining: parseFloat((msUntilDeadline / (1000 * 60 * 60)).toFixed(1)),
                isOverdue: msUntilDeadline < 0,
            } satisfies UrgentTask;
        })
        .sort((a, b) => a.deadline - b.deadline);
}

/**
 * filterTasksByRole
 * ─────────────────
 * Convenience filter — returns only tasks assigned to the given role.
 *
 * @param tasks   Full task list.
 * @param role    'agent' | 'manager'
 */
export function filterTasksByRole(
    tasks: ChecklistTask[],
    role: 'agent' | 'manager',
): ChecklistTask[] {
    return tasks.filter(t => t.roleTarget === role);
}

/**
 * filterTasksByPhase
 * ──────────────────
 * Returns tasks that belong to a given event lifecycle phase.
 */
export function filterTasksByPhase(
    tasks: ChecklistTask[],
    phase: ChecklistTask['phase'],
): ChecklistTask[] {
    return tasks.filter(t => t.phase === phase || t.phase === 'always');
}

/**
 * sortByPriority
 * ──────────────
 * Returns a new sorted array: critical → high → medium → low.
 * Within the same priority, earlier deadlines appear first.
 */
const PRIORITY_WEIGHT: Record<ChecklistTask['priority'], number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
};

export function sortByPriority(tasks: ChecklistTask[]): ChecklistTask[] {
    return [...tasks].sort((a, b) => {
        const pw = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
        if (pw !== 0) return pw;
        return a.deadline - b.deadline;
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 2 — HYDRATION
// Converts a ChecklistTemplate into live ChecklistTask[]
// ═══════════════════════════════════════════════════════════════════════════

export interface HydrateOptions {
    /** Firestore document ID of the event. */
    eventId: string;
    /** Firestore UID of the user receiving the tasks. */
    userId: string;
    /** Unix timestamp (ms) of the event start date. */
    eventStartMs: number;
}

/**
 * hydrateTemplate
 * ───────────────
 * Takes a template and a set of runtime identifiers and returns a fully-formed
 * ChecklistTask[] ready for storage in Firestore or local state.
 *
 * - Resolves `{eventId}` placeholders in `actionRoute`.
 * - Computes absolute deadline from `deadlineOffsetHours + eventStartMs`.
 * - Sets `isCompleted: false` for all new tasks.
 *
 * @param template   Admin-defined ChecklistTemplate.
 * @param options    HydrateOptions (eventId, userId, eventStartMs).
 * @returns          Array of ChecklistTask ready for persistence.
 */
export function hydrateTemplate(
    template: ChecklistTemplate,
    options: HydrateOptions,
): ChecklistTask[] {
    const { eventId, userId, eventStartMs } = options;

    return template.tasks.map(
        (item: ChecklistTemplateItem): ChecklistTask => ({
            id: `${item.templateId}_${eventId}_${userId}`,
            roleTarget: item.roleTarget,
            title: item.title,
            description: item.description,
            actionRoute: item.actionRoute.replace('{eventId}', eventId),
            actionLabel: item.actionLabel,
            deadline: eventStartMs + item.deadlineOffsetHours * 60 * 60 * 1000,
            isCompleted: false,
            requiresValidation: item.requiresValidation,
            isValidated: item.requiresValidation ? false : undefined,
            phase: item.phase,
            priority: item.priority,
            category: item.category,
            referenceUrl: item.referenceUrl,
        }),
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 3 — MOCK TEMPLATES
// Robust default checklists used during development and seeding
// ═══════════════════════════════════════════════════════════════════════════

/**
 * The "now" anchor used by mock templates to produce realistic deadlines
 * relative to today rather than a fixed past date.
 *
 * IMPORTANT: Mock data is for development only. Real templates are stored
 * in Firestore and fetched via the admin panel.
 */
const NOW_MS = Date.now();

// Shorthand helpers
const hoursFromNow = (h: number) => NOW_MS + h * 60 * 60 * 1000;
const daysFromNow = (d: number) => hoursFromNow(d * 24);

// ── Agent Template ────────────────────────────────────────────────────────────

/**
 * AGENT_TEMPLATE
 * Full lifecycle checklist for a PSI Roadshow participant (Agent tier).
 * Tasks span pre-registration through post-event settlement.
 */
export const AGENT_TEMPLATE: ChecklistTemplate = {
    id: 'roadshow_agent_standard_v1',
    name: 'Agent Roadshow Checklist (Standard)',
    description:
        'Default task set for all Agents attending a PSI real estate roadshow event. ' +
        'Covers registration, compliance documents, L&D, and post-event reporting.',
    updatedAt: '2026-03-01T00:00:00.000Z',
    tasks: [
        // ── PRE-REGISTRATION ──────────────────────────────────────────────────
        {
            templateId: 'select_package_tier',
            roleTarget: 'agent',
            title: 'Select Your Participation Tier',
            description:
                'Choose between Gold, Silver, or Bronze. Your tier determines your ' +
                'commission split, cost structure, and seating priority at the event. ' +
                'This cannot be changed after the registration deadline.',
            actionRoute: '/events/{eventId}/registration',
            actionLabel: 'Choose Tier',
            deadlineOffsetHours: -168, // 7 days before event
            requiresValidation: false,
            phase: 'pre_registration',
            priority: 'critical',
            category: 'registration',
        },
        {
            templateId: 'upload_passport',
            roleTarget: 'agent',
            title: 'Upload Passport Copy',
            description:
                'A valid, colour copy of your passport (all data pages) must be submitted ' +
                'for visa processing and compliance. Accepted formats: PDF, JPG, PNG. ' +
                'Document must be valid for at least 6 months from the event date.',
            actionRoute: '/events/{eventId}/documents',
            actionLabel: 'Upload Document',
            deadlineOffsetHours: -120, // 5 days before event
            requiresValidation: true,
            phase: 'pre_registration',
            priority: 'critical',
            category: 'documents',
            referenceUrl: 'https://portal.psi.ae/docs/document-requirements',
        },
        {
            templateId: 'upload_visa',
            roleTarget: 'agent',
            title: 'Upload UAE Visa / Residency',
            description:
                'If you are not a UAE national, please upload a copy of your current UAE ' +
                'residency visa. If you are attending from abroad, upload the relevant ' +
                'travel authorisation. Overseas agents: your visa invitation letter will ' +
                'be issued only after this document is validated.',
            actionRoute: '/events/{eventId}/documents',
            actionLabel: 'Upload Document',
            deadlineOffsetHours: -120, // 5 days before event
            requiresValidation: true,
            phase: 'pre_registration',
            priority: 'critical',
            category: 'documents',
        },
        {
            templateId: 'upload_rera_certificate',
            roleTarget: 'agent',
            title: 'Upload RERA Certificate',
            description:
                'Your current RERA (Real Estate Regulatory Agency) certification must be ' +
                'on file. Expired certificates will not be accepted. Check your expiry date ' +
                'in your CRM profile before uploading.',
            actionRoute: '/events/{eventId}/documents',
            actionLabel: 'Upload Certificate',
            deadlineOffsetHours: -96, // 4 days before event
            requiresValidation: true,
            phase: 'pre_registration',
            priority: 'high',
            category: 'compliance',
        },
        {
            templateId: 'complete_payment',
            roleTarget: 'agent',
            title: 'Confirm Registration Payment',
            description:
                'Gold and Silver tier agents must pay their registration fee via the portal ' +
                'to secure their spot. Bronze tier agents are funded by the branch — your ' +
                'manager will confirm. Revenue is only tracked for agents whose payment is ' +
                'confirmed before the deadline.',
            actionRoute: '/events/{eventId}/payment',
            actionLabel: 'Pay Now',
            deadlineOffsetHours: -96,
            requiresValidation: false,
            phase: 'pre_registration',
            priority: 'high',
            category: 'finance',
        },
        {
            templateId: 'complete_ld_quiz',
            roleTarget: 'agent',
            title: 'Complete L&D Product Quiz',
            description:
                'Mandatory product knowledge assessment for all registered agents. ' +
                'This 15-question quiz covers the featured developer portfolios at the event. ' +
                'A score of 80% or higher is required to pass. Unlimited attempts. ' +
                'Agents who do not pass cannot check in on event day.',
            actionRoute: '/events/{eventId}/training',
            actionLabel: 'Start Quiz',
            deadlineOffsetHours: -48, // 2 days before event
            requiresValidation: false,
            phase: 'registered',
            priority: 'high',
            category: 'training',
            referenceUrl: 'https://portal.psi.ae/training/library',
        },
        {
            templateId: 'review_floor_plan',
            roleTarget: 'agent',
            title: 'Review Event Floor Plan & Booth Assignments',
            description:
                'Familiarise yourself with the event layout: booth locations, developer ' +
                'presentation zones, VIP lounge, and registration desk. Your assigned booth ' +
                'number will be visible here 48 hours before the event.',
            actionRoute: '/events/{eventId}/floor-plan',
            actionLabel: 'View Floor Plan',
            deadlineOffsetHours: -24,
            requiresValidation: false,
            phase: 'registered',
            priority: 'medium',
            category: 'logistics',
        },
        {
            templateId: 'confirm_travel_details',
            roleTarget: 'agent',
            title: 'Confirm Travel & Accommodation',
            description:
                'If PSI is arranging travel or hotel for your attendance, please confirm ' +
                'your flight details and check-in date. Overseas agents: do not purchase ' +
                'travel until you have received the visa invitation letter.',
            actionRoute: '/travel-desk',
            actionLabel: 'Manage Travel',
            deadlineOffsetHours: -72,
            requiresValidation: false,
            phase: 'pre_registration',
            priority: 'medium',
            category: 'logistics',
        },

        // ── EVENT DAY ─────────────────────────────────────────────────────────
        {
            templateId: 'qr_check_in',
            roleTarget: 'agent',
            title: 'Check In via QR Code',
            description:
                'Present your unique QR code at the registration desk on arrival. ' +
                'Your check-in time is recorded and activates your lead collection ' +
                'permissions for the day. Do not share your QR code with others.',
            actionRoute: '/check-in',
            actionLabel: 'Show QR Code',
            deadlineOffsetHours: 2, // 2 hours after event start
            requiresValidation: false,
            phase: 'event_day',
            priority: 'critical',
            category: 'logistics',
        },
        {
            templateId: 'log_first_lead',
            roleTarget: 'agent',
            title: 'Log Your First Lead',
            description:
                'Submit at least one qualified lead via the PSI portal before end of day. ' +
                'A "qualified lead" is a prospect who has viewed at least one developer ' +
                'presentation and expressed interest in a specific unit type. ' +
                'Leads are attributed to you only if logged on the day.',
            actionRoute: '/events/{eventId}/leads',
            actionLabel: 'Log Lead',
            deadlineOffsetHours: 10, // end of event day
            requiresValidation: false,
            phase: 'event_day',
            priority: 'high',
            category: 'sales',
        },

        // ── POST EVENT ────────────────────────────────────────────────────────
        {
            templateId: 'submit_lead_report',
            roleTarget: 'agent',
            title: 'Submit Final Lead & Deal Report',
            description:
                'Complete your end-of-event report within 48 hours. Include: total qualified ' +
                'leads, lead source breakdown, any verbal commitments or signed EOIs, and ' +
                'estimated deal closure timeline. This data feeds the branch P&L analytics.',
            actionRoute: '/events/{eventId}/report',
            actionLabel: 'Submit Report',
            deadlineOffsetHours: 48,
            requiresValidation: true,
            phase: 'post_event',
            priority: 'high',
            category: 'reporting',
        },
        {
            templateId: 'complete_feedback_survey',
            roleTarget: 'agent',
            title: 'Complete Event Feedback Survey',
            description:
                'Your feedback directly shapes future events. The 5-minute survey covers ' +
                'event organisation, developer quality, venue, and your overall experience. ' +
                'Completion is mandatory for your post-event commission statement to be released.',
            actionRoute: '/events/{eventId}/feedback',
            actionLabel: 'Start Survey',
            deadlineOffsetHours: 72,
            requiresValidation: false,
            phase: 'post_event',
            priority: 'medium',
            category: 'reporting',
        },
        {
            templateId: 'review_settlement_statement',
            roleTarget: 'agent',
            title: 'Review & Acknowledge Commission Statement',
            description:
                'Your itemised commission and settlement statement is available for review. ' +
                'Check gross revenue, deductions, and your final net payout. ' +
                'You must acknowledge the statement before the finance team can process payment. ' +
                'Raise any disputes via the portal within 7 days.',
            actionRoute: '/settlement',
            actionLabel: 'View Statement',
            deadlineOffsetHours: 168, // 7 days after event
            requiresValidation: false,
            phase: 'post_event',
            priority: 'high',
            category: 'finance',
        },
    ],
};

// ── Branch Manager Template ───────────────────────────────────────────────────

/**
 * MANAGER_TEMPLATE
 * Full lifecycle checklist for a Branch Manager overseeing their team at a
 * PSI Roadshow event.
 */
export const MANAGER_TEMPLATE: ChecklistTemplate = {
    id: 'roadshow_manager_standard_v1',
    name: 'Branch Manager Roadshow Checklist (Standard)',
    description:
        'Default task set for Branch Managers responsible for leading their agent ' +
        'roster at a PSI roadshow. Covers team approval, budget, compliance oversight, ' +
        'and post-event financial reporting.',
    updatedAt: '2026-03-01T00:00:00.000Z',
    tasks: [
        // ── PRE-REGISTRATION ──────────────────────────────────────────────────
        {
            templateId: 'set_branch_budget',
            roleTarget: 'manager',
            title: 'Set Branch Event Budget',
            description:
                'Define the total budget your branch is allocating to this event. This ' +
                'includes Bronze agent costs, logistics, and any additional overheads. ' +
                'The budget locks the maximum number of Bronze-tier agents you can register. ' +
                'Submit for finance approval — changes after the deadline require Head Office sign-off.',
            actionRoute: '/events/{eventId}/budget',
            actionLabel: 'Set Budget',
            deadlineOffsetHours: -192, // 8 days before event
            requiresValidation: true,
            phase: 'pre_registration',
            priority: 'critical',
            category: 'finance',
        },
        {
            templateId: 'approve_agent_roster',
            roleTarget: 'manager',
            title: 'Approve Agent Roster',
            description:
                'Review and approve the list of agents from your branch who have applied ' +
                'to attend. Confirm their tier selections and document submission status. ' +
                'Agents remain in "pending" status until you approve. Agents not approved ' +
                'by the deadline are automatically declined and forfeit their spot.',
            actionRoute: '/events/{eventId}/roster',
            actionLabel: 'Review Roster',
            deadlineOffsetHours: -144, // 6 days before event
            requiresValidation: false,
            phase: 'pre_registration',
            priority: 'critical',
            category: 'registration',
        },
        {
            templateId: 'validate_agent_documents',
            roleTarget: 'manager',
            title: 'Validate Team Document Submissions',
            description:
                'Review uploaded passports, visas, and RERA certificates for all approved ' +
                'agents in your roster. Flag any expired or unclear documents. Agents with ' +
                'unvalidated documents cannot check in on event day. Use bulk-approve for ' +
                'agents whose documents are clearly in order.',
            actionRoute: '/events/{eventId}/documents/review',
            actionLabel: 'Review Documents',
            deadlineOffsetHours: -96, // 4 days before event
            requiresValidation: false,
            phase: 'pre_registration',
            priority: 'critical',
            category: 'compliance',
        },
        {
            templateId: 'confirm_bronze_payments',
            roleTarget: 'manager',
            title: 'Confirm Branch-Funded (Bronze) Agent Payments',
            description:
                'Authorise the registration fee payments for Bronze-tier agents whose costs ' +
                'are covered by branch budget. A payment request will be generated for each ' +
                'Bronze agent on your approved roster. Finance will process batch payment ' +
                'only after your authorisation.',
            actionRoute: '/events/{eventId}/payments/bronze',
            actionLabel: 'Authorise Payments',
            deadlineOffsetHours: -96,
            requiresValidation: true,
            phase: 'pre_registration',
            priority: 'high',
            category: 'finance',
        },
        {
            templateId: 'assign_booths',
            roleTarget: 'manager',
            title: 'Assign Booth Positions to Agents',
            description:
                'Allocate booth slots to agents based on tier priority (Gold first, then ' +
                'Silver, then Bronze). Booths are first-come-first-served within each tier. ' +
                'Agents will be notified automatically once assigned.',
            actionRoute: '/events/{eventId}/floor-plan/assign',
            actionLabel: 'Assign Booths',
            deadlineOffsetHours: -48,
            requiresValidation: false,
            phase: 'registered',
            priority: 'high',
            category: 'logistics',
        },
        {
            templateId: 'verify_ld_completions',
            roleTarget: 'manager',
            title: 'Verify Team L&D Quiz Completions',
            description:
                'Confirm that all approved agents in your roster have completed and passed ' +
                'the mandatory product knowledge quiz. Agents who have not passed 24 hours ' +
                'before the event must be either granted an extension (with Head Office ' +
                'approval) or removed from the roster.',
            actionRoute: '/events/{eventId}/training/progress',
            actionLabel: 'View Training Status',
            deadlineOffsetHours: -24,
            requiresValidation: false,
            phase: 'registered',
            priority: 'high',
            category: 'training',
        },
        {
            templateId: 'brief_team',
            roleTarget: 'manager',
            title: 'Conduct Pre-Event Team Briefing',
            description:
                'Deliver the mandatory pre-event briefing to all attending agents at least ' +
                '24 hours before the event. The briefing must cover: featured developer ' +
                'portfolios, commission structure review, lead logging procedure, and on-site ' +
                'conduct guidelines. Record attendance and upload the sign-off sheet.',
            actionRoute: '/events/{eventId}/briefing',
            actionLabel: 'Record Briefing',
            deadlineOffsetHours: -24,
            requiresValidation: true,
            phase: 'registered',
            priority: 'high',
            category: 'logistics',
        },

        // ── EVENT DAY ─────────────────────────────────────────────────────────
        {
            templateId: 'confirm_attendance',
            roleTarget: 'manager',
            title: 'Confirm Final Attendance Count',
            description:
                'At event start, confirm the number of agents physically present from your ' +
                'roster. Any no-shows must be flagged here — this triggers the no-show ' +
                'policy (Bronze agents lose branch budget allocation; Gold/Silver agents ' +
                'may forfeit their registration deposit depending on the event terms).',
            actionRoute: '/events/{eventId}/attendance',
            actionLabel: 'Confirm Attendance',
            deadlineOffsetHours: 1,
            requiresValidation: false,
            phase: 'event_day',
            priority: 'critical',
            category: 'logistics',
        },
        {
            templateId: 'monitor_lead_pipeline',
            roleTarget: 'manager',
            title: 'Monitor Live Lead Pipeline',
            description:
                'Review your branch\'s live lead submissions throughout the event day. ' +
                'Identify agents who have not logged any leads by midday and follow up. ' +
                'The branch target is visible on the branch dashboard — track progress ' +
                'against the dynamic per-agent target.',
            actionRoute: '/analytics',
            actionLabel: 'View Pipeline',
            deadlineOffsetHours: 8,
            requiresValidation: false,
            phase: 'event_day',
            priority: 'high',
            category: 'sales',
        },

        // ── POST EVENT ────────────────────────────────────────────────────────
        {
            templateId: 'review_agent_reports',
            roleTarget: 'manager',
            title: 'Review & Validate Agent Lead Reports',
            description:
                'All agents must submit a lead report within 48 hours of the event. ' +
                'Your task is to review and validate each report for accuracy. ' +
                'Flag any inflated or duplicate leads before the analytics engine finalises ' +
                'the branch dashboard. Validated reports unlock agent commission statements.',
            actionRoute: '/events/{eventId}/reports/review',
            actionLabel: 'Review Reports',
            deadlineOffsetHours: 72,
            requiresValidation: false,
            phase: 'post_event',
            priority: 'critical',
            category: 'reporting',
        },
        {
            templateId: 'submit_branch_pl',
            roleTarget: 'manager',
            title: 'Submit Branch P&L Statement',
            description:
                'Complete and submit the branch-level profit and loss statement for this ' +
                'event. The system auto-populates agent commissions and known costs. ' +
                'You must enter actual spend for catering, transport, and any ' +
                'branch-specific overheads. Finance requires submission within 5 business days.',
            actionRoute: '/events/{eventId}/pl-statement',
            actionLabel: 'Complete P&L',
            deadlineOffsetHours: 120, // 5 days after
            requiresValidation: true,
            phase: 'post_event',
            priority: 'critical',
            category: 'finance',
        },
        {
            templateId: 'approve_commission_statements',
            roleTarget: 'manager',
            title: 'Approve Agent Commission Statements',
            description:
                'Final review and approval of individual commission statements for all ' +
                'agents in your roster. Once approved, agents are notified and can ' +
                'acknowledge their statements. Payment processing begins only after all ' +
                'statements in your branch are approved.',
            actionRoute: '/settlement',
            actionLabel: 'Approve Statements',
            deadlineOffsetHours: 144, // 6 days after
            requiresValidation: false,
            phase: 'post_event',
            priority: 'high',
            category: 'finance',
        },
        {
            templateId: 'submit_event_debrief',
            roleTarget: 'manager',
            title: 'Submit Branch Event Debrief',
            description:
                'Write the branch debrief report covering: what worked, what failed, ' +
                'agent performance highlights, developer feedback, venue issues, and ' +
                'recommendations for the next event. This feeds the Executive Debrief ' +
                'and influences future event allotments for your branch.',
            actionRoute: '/events/{eventId}/debrief',
            actionLabel: 'Write Debrief',
            deadlineOffsetHours: 168, // 7 days after
            requiresValidation: true,
            phase: 'post_event',
            priority: 'medium',
            category: 'reporting',
        },
    ],
};

// ── Combined export for all templates ─────────────────────────────────────────

export const ALL_TEMPLATES: Record<string, ChecklistTemplate> = {
    [AGENT_TEMPLATE.id]: AGENT_TEMPLATE,
    [MANAGER_TEMPLATE.id]: MANAGER_TEMPLATE,
};

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 4 — MOCK HYDRATED TASKS (Development / Storybook)
// Realistic ChecklistTask[] with time-relative deadlines
// ═══════════════════════════════════════════════════════════════════════════

/** Simulate an event starting in 5 days from now. */
const MOCK_EVENT_START_MS = daysFromNow(5);
const MOCK_EVENT_ID = 'evt_dubai_q1_2026';
const MOCK_AGENT_ID = 'agent_alice_001';
const MOCK_MANAGER_ID = 'manager_bob_001';

// ── Demo seed: IDs of tasks that are already completed ────────────────────────
// 11 of 13 tasks complete → 85% progress bar for presentation.
// Pending: upload_visa (URGENT — 12h deadline) + qr_check_in (event day gate).
const _DEMO_COMPLETED = new Set([
    `select_package_tier_${MOCK_EVENT_ID}_${MOCK_AGENT_ID}`,
    `upload_passport_${MOCK_EVENT_ID}_${MOCK_AGENT_ID}`,
    `upload_rera_certificate_${MOCK_EVENT_ID}_${MOCK_AGENT_ID}`,
    `complete_payment_${MOCK_EVENT_ID}_${MOCK_AGENT_ID}`,
    `complete_ld_quiz_${MOCK_EVENT_ID}_${MOCK_AGENT_ID}`,
    `review_floor_plan_${MOCK_EVENT_ID}_${MOCK_AGENT_ID}`,
    `confirm_travel_details_${MOCK_EVENT_ID}_${MOCK_AGENT_ID}`,
    `log_first_lead_${MOCK_EVENT_ID}_${MOCK_AGENT_ID}`,
    `submit_lead_report_${MOCK_EVENT_ID}_${MOCK_AGENT_ID}`,
    `complete_feedback_survey_${MOCK_EVENT_ID}_${MOCK_AGENT_ID}`,
    `review_settlement_statement_${MOCK_EVENT_ID}_${MOCK_AGENT_ID}`,
]);

/**
 * MOCK_AGENT_TASKS — Demo-seeded (presentation-ready)
 * 11 / 13 tasks completed = 85% progress.
 * - upload_visa: pending, deadline = NOW + 12 h → shows URGENT orange badge.
 * - qr_check_in: pending, normal deadline → shows as the next action to take.
 */
export const MOCK_AGENT_TASKS: ChecklistTask[] = hydrateTemplate(AGENT_TEMPLATE, {
    eventId: MOCK_EVENT_ID,
    userId: MOCK_AGENT_ID,
    eventStartMs: MOCK_EVENT_START_MS,
}).map(task => {
    // ① upload_visa → pending but URGENT (12 h window)
    if (task.id === `upload_visa_${MOCK_EVENT_ID}_${MOCK_AGENT_ID}`) {
        return { ...task, isCompleted: false, deadline: hoursFromNow(12) };
    }
    // ② qr_check_in → pending (event hasn't started yet)
    if (task.id === `qr_check_in_${MOCK_EVENT_ID}_${MOCK_AGENT_ID}`) {
        return { ...task, isCompleted: false };
    }
    // ③ All other tasks → completed (+ validated where required)
    if (_DEMO_COMPLETED.has(task.id)) {
        return {
            ...task,
            isCompleted: true,
            isValidated: task.requiresValidation ? true : task.isValidated,
        };
    }
    return task;
});

/**
 * MOCK_MANAGER_TASKS
 * Pre-hydrated tasks for the default Manager template.
 */
export const MOCK_MANAGER_TASKS: ChecklistTask[] = hydrateTemplate(MANAGER_TEMPLATE, {
    eventId: MOCK_EVENT_ID,
    userId: MOCK_MANAGER_ID,
    eventStartMs: MOCK_EVENT_START_MS,
});

/**
 * MOCK_MIXED_TASKS
 * All tasks combined (agent + manager) on one event.
 * Useful for testing admin views that show the full event checklist.
 */
export const MOCK_MIXED_TASKS: ChecklistTask[] = [
    ...MOCK_AGENT_TASKS,
    ...MOCK_MANAGER_TASKS,
];
