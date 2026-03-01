/**
 * src/types/checklist.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Type schema for the PSI Interactive Guided Checklist engine.
 *
 * The engine assigns role-specific, event-scoped tasks to users and tracks
 * completion with optional manager validation. Templates are defined by admins;
 * instances are hydrated per event/user at runtime.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── Primitives ────────────────────────────────────────────────────────────────

/** Who this task is targeted at. */
export type RoleTarget = 'agent' | 'manager';

/**
 * The lifecycle phase this task belongs to.
 * Maps to the PSI event lifecycle stages used across the dashboard.
 */
export type EventPhase =
    | 'pre_registration'   // Before registration deadline
    | 'registered'         // Agent registered, event not yet live
    | 'event_day'          // Event is live / on-site
    | 'post_event'         // Debrief, follow-up, settlement
    | 'always';            // Phase-independent (e.g. profile completeness)

/** Priority level affects sort order and visual treatment. */
export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';

/** Where the task navigates to when the user clicks "Take Action". */
export type ActionRoute = string; // e.g. '/events/123/logistics', '/check-in'

// ── Core Interfaces ───────────────────────────────────────────────────────────

/**
 * ChecklistTask — a single actionable item assigned to a user for an event.
 *
 * Instances are created by hydrating a `ChecklistTemplate` with a real
 * event ID, user ID, and computed deadline.
 */
export interface ChecklistTask {
    /** Stable unique identifier. Format: `{templateId}_{eventId}_{userId}` */
    id: string;

    /** Which role this task is assigned to. */
    roleTarget: RoleTarget;

    /** Short imperative title shown in the checklist UI. */
    title: string;

    /**
     * Rich description explaining WHY the task matters and exactly what
     * the user needs to do. May include markdown-lite formatting.
     */
    description: string;

    /**
     * Deep-link route the CTA button navigates to.
     * Should be a fully-resolved path including the event ID where applicable.
     * Example: '/events/evt_dubai_q1/logistics'
     */
    actionRoute: ActionRoute;

    /** CTA button label. Defaults to "Complete Task" if omitted. */
    actionLabel?: string;

    /** Unix timestamp (ms) of the task deadline. */
    deadline: number;

    /** Whether the task has been marked complete by the assigned user. */
    isCompleted: boolean;

    /**
     * If true, a manager must explicitly validate this task before it counts
     * as done (e.g. document uploads, compliance tasks).
     */
    requiresValidation: boolean;

    /**
     * Present only when `requiresValidation` is true.
     * Tracks whether the manager has approved the submission.
     */
    isValidated?: boolean;

    /** ISO timestamp of when the task was completed (set by engine). */
    completedAt?: string;

    /** ISO timestamp of when manager validated (set by engine). */
    validatedAt?: string;

    /** ID of the manager who validated (set by engine). */
    validatedBy?: string;

    /** Event lifecycle phase this task belongs to. */
    phase: EventPhase;

    /** Visual priority — affects sort order and badge color. */
    priority: TaskPriority;

    /**
     * Optional tag group for category filtering.
     * Examples: 'documents', 'finance', 'compliance', 'logistics', 'training'
     */
    category?: string;

    /** Optional external URL for reference material (opens in new tab). */
    referenceUrl?: string;
}

// ── Template (Admin-Defined Defaults) ─────────────────────────────────────────

/**
 * ChecklistTemplateItem — the blueprint for a single task.
 * Excludes runtime fields (id, isCompleted, completedAt, etc.).
 * Admins define these; the engine hydrates them into real `ChecklistTask`s.
 */
export interface ChecklistTemplateItem {
    /** Stable template-scoped ID used to build the task ID. e.g. 'upload_passport' */
    templateId: string;

    roleTarget: RoleTarget;
    title: string;
    description: string;

    /**
     * Route template — may include a `{eventId}` placeholder that the engine
     * replaces at hydration time.
     * Example: '/events/{eventId}/documents'
     */
    actionRoute: ActionRoute;
    actionLabel?: string;

    /**
     * Deadline expressed as hours relative to the event start date.
     * Negative = before event start (e.g. -72 = 3 days before).
     * Positive = after event start (e.g. 48 = 2 days after).
     */
    deadlineOffsetHours: number;

    requiresValidation: boolean;
    phase: EventPhase;
    priority: TaskPriority;
    category?: string;
    referenceUrl?: string;
}

/**
 * ChecklistTemplate — a named collection of template items that defines
 * the default checklist for a given event type.
 */
export interface ChecklistTemplate {
    /** Unique template ID. Example: 'roadshow_standard_2025' */
    id: string;

    /** Human-readable name shown in the admin panel. */
    name: string;

    /** Optional description of the event type this template targets. */
    description?: string;

    /** ISO timestamp of when this template was last modified. */
    updatedAt: string;

    /** The set of tasks that will be issued to users. */
    tasks: ChecklistTemplateItem[];
}

// ── Engine Return Types ────────────────────────────────────────────────────────

/**
 * Result of `calculateProgress()`.
 * All counts refer to tasks within the supplied task array.
 */
export interface ChecklistProgress {
    /** Number of tasks where `isCompleted === true`. */
    completedCount: number;

    /**
     * Number of tasks where both `isCompleted === true` AND
     * (requiresValidation === false OR isValidated === true).
     * This is the "clean" count shown as the headline figure.
     */
    fullyResolvedCount: number;

    /** Total number of tasks in the array. */
    totalCount: number;

    /**
     * Percentage based on `fullyResolvedCount / totalCount`.
     * Rounded to the nearest integer. Returns 0 if totalCount is 0.
     */
    percentage: number;

    /** Number of tasks that are overdue (deadline passed && !isCompleted). */
    overdueCount: number;

    /** Number of tasks due within the next 48 hours and not yet completed. */
    urgentCount: number;
}

/**
 * A hydrated task enriched with derived urgency metadata,
 * used in sorted/filtered display contexts.
 */
export interface UrgentTask extends ChecklistTask {
    /** Hours remaining until deadline (may be negative if overdue). */
    hoursRemaining: number;

    /** True if the deadline has already passed. */
    isOverdue: boolean;
}
