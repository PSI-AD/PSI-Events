/**
 * journal.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * TypeScript interface definitions for the Live Event Journal & Media Feed.
 *
 * Firestore layout:
 *   events/{eventId}/journal/{postId}           ← JournalPost documents
 *   events/{eventId}/journal/{postId}/reactions  ← optional sub-collection
 *   crm_events/{eventId}                         ← contains EventJournalConfig fields
 *
 * Storage layout (see mediaService.ts):
 *   events/{eventId}/journal/{filename}          ← uploaded media
 */

// ── Media types ───────────────────────────────────────────────────────────────

/** Discriminates between photo and video in the media array. */
export type JournalMediaType = 'photo' | 'video';

/**
 * JournalMedia
 * A single uploaded media item attached to a JournalPost.
 */
export interface JournalMedia {
    /** Firebase Storage download URL */
    url: string;
    /** Discriminator — photo or video */
    type: JournalMediaType;
    /** Original filename for display and audit purposes */
    filename: string;
    /** MIME type (e.g. 'image/jpeg', 'video/mp4') */
    mimeType: string;
    /** Size in bytes */
    sizeBytes: number;
    /** Firebase Storage full path (for deletion) */
    storagePath: string;
}

// ── Post status ───────────────────────────────────────────────────────────────

/**
 * JournalPostStatus
 * Allows a draft → review → published workflow.
 *   draft     — saved locally/in Firestore, not visible on the feed
 *   published — live on the company feed
 *   archived  — soft-deleted, retained for audit
 */
export type JournalPostStatus = 'draft' | 'published' | 'archived';

// ── AI Polish metadata ────────────────────────────────────────────────────────

/**
 * AIPolishRecord
 * Immutable audit trail of every Gemini rewrite applied to a post.
 * Stored as the `aiPolishHistory` array on JournalPost.
 */
export interface AIPolishRecord {
    /** The original raw text before polishing */
    rawInput: string;
    /** The polished output from Gemini */
    polishedOutput: string;
    /** Gemini model used (e.g. 'gemini-2.0-flash') */
    model: string;
    /** ISO timestamp of when the rewrite ran */
    polishedAt: string;
}

// ── Core journal post ─────────────────────────────────────────────────────────

/**
 * JournalPost
 * The primary document stored in events/{eventId}/journal/{postId}.
 *
 * Field notes:
 *   content         — The final, published text (may be AI-polished or raw)
 *   rawContent      — The original dictated/typed text before AI rewrite.
 *                     Always preserved for audit, even if content was polished.
 *   mediaUrls       — Legacy flat array of download URLs (kept for backward compat)
 *   media           — Rich array of JournalMedia objects (preferred)
 *   taggedUserIds   — Array of crm_users / auth UIDs; used to notify tagged agents
 *   aiPolishHistory — Append-only log of every Gemini rewrite attempt
 *   isPinned        — Organizer can pin one post to always appear at the top
 *   viewCount       — Incremented by the feed reader (via Cloud Function for accuracy)
 */
export interface JournalPost {
    /** Firestore document ID */
    id: string;
    /** Parent event's Firestore document ID */
    eventId: string;
    /** UID of the staff member who created the post */
    authorId: string;
    /** Display name of the author (denormalised for feed rendering performance) */
    authorName: string;
    /** Role of the author (e.g. 'Organizer', 'Marketing') */
    authorRole: string;
    /** Final published content (AI-polished or raw) */
    content: string;
    /** Original dictated/typed text — preserved for audit */
    rawContent: string;
    /** Whether the content has been run through the Gemini rewriter */
    isAIPolished: boolean;
    /** Append-only history of every Gemini rewrite */
    aiPolishHistory: AIPolishRecord[];
    /**
     * Legacy flat URL array — kept for backward compatibility with
     * existing Firestore documents. New posts should use `media`.
     */
    mediaUrls: string[];
    /** Rich media objects with type, size, and storage path */
    media: JournalMedia[];
    /** Array of user IDs tagged in this post — triggers in-app notifications */
    taggedUserIds: string[];
    /** Optional user-facing tags / labels (e.g. '#LondonRoadshow', '#DealClosed') */
    hashtags: string[];
    /** Publication workflow status */
    status: JournalPostStatus;
    /** ISO timestamp string (from Firestore Timestamp.toDate().toISOString()) */
    timestamp: string;
    /** Whether this post is pinned to the top of the feed */
    isPinned: boolean;
    /** View count — incremented server-side */
    viewCount: number;
    /** Optional geolocation tag (venue name or GPS label) */
    locationLabel?: string;
    /** True while the post is being processed/uploaded */
    isProcessing?: boolean;
}

/**
 * NewJournalPost
 * The shape passed to the create function — Firestore assigns `id`,
 * and `timestamp` is set server-side.
 */
export type NewJournalPost = Omit<JournalPost, 'id' | 'timestamp' | 'viewCount' | 'isProcessing'>;

// ── Event journal configuration ───────────────────────────────────────────────

/**
 * EventJournalConfig
 * These fields are merged into the existing Event interface (src/types.ts).
 * They live on the crm_events Firestore document itself.
 *
 * IMPORTANT: Both fields are optional on the Event interface (using ?)
 * so that pre-existing Event documents without these fields don't break
 * any component that destructures Event objects.
 */
export interface EventJournalConfig {
    /**
     * Master switch — set to false to hide the Journal tab for this event.
     * Defaults to false. Organizer must explicitly enable it.
     */
    isJournalEnabled: boolean;
    /**
     * The UID of the staff member designated as the Media Officer.
     * Only this person (plus Organizers / Managers) can create journal posts.
     * If empty, any Organizer can post.
     */
    assignedMediaOfficerId: string;
    /**
     * Optional: how many hours after the event ends the journal remains writable.
     * After this window, the journal becomes read-only.
     * Defaults to 24 (hours).
     */
    journalLockAfterHours?: number;
}

// ── Feed pagination ───────────────────────────────────────────────────────────

/**
 * JournalFeedPage
 * Returned by the paginated feed query (used with Firestore startAfter cursors).
 */
export interface JournalFeedPage {
    posts: JournalPost[];
    lastVisible: unknown | null;  // Firestore QueryDocumentSnapshot — typed as unknown to avoid Firestore type leak
    hasMore: boolean;
}

// ── Notification payload ──────────────────────────────────────────────────────

/**
 * JournalTagNotification
 * Written to users/{userId}/notifications by a Cloud Function when
 * an agent is tagged in a JournalPost.
 */
export interface JournalTagNotification {
    type: 'journal_tag';
    postId: string;
    eventId: string;
    eventName: string;
    authorName: string;
    excerpt: string;  // first 100 chars of content
    read: boolean;
    createdAt: string;
}
