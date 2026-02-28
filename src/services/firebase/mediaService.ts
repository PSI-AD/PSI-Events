/**
 * mediaService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Firebase Storage service for the Live Event Journal & Media Feed.
 *
 * Storage path convention:
 *   events/{eventId}/journal/{uuid}_{sanitisedFilename}
 *
 * Supported media types:
 *   Images: image/jpeg, image/png, image/webp, image/gif, image/heic
 *   Videos: video/mp4, video/quicktime, video/webm
 *
 * Returns JournalMedia objects (not bare URLs) so the UI has everything
 * it needs for rendering, type discrimination, and deletion.
 */

import {
    ref,
    uploadBytesResumable,
    getDownloadURL,
    deleteObject,
    UploadTask,
    StorageReference,
} from 'firebase/storage';
import { storage } from './firebaseConfig';
import type { JournalMedia, JournalMediaType } from '../../types/journal';

// ── Constants ─────────────────────────────────────────────────────────────────

/** Maximum file size: 50 MB */
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

/** Allowed MIME types and their JournalMediaType discriminator */
const ALLOWED_TYPES: Record<string, JournalMediaType> = {
    'image/jpeg': 'photo',
    'image/png': 'photo',
    'image/webp': 'photo',
    'image/gif': 'photo',
    'image/heic': 'photo',
    'image/heif': 'photo',
    'video/mp4': 'video',
    'video/quicktime': 'video',
    'video/webm': 'video',
};

// ── Upload progress callback ──────────────────────────────────────────────────

/** Called periodically during upload with 0–100 progress value. */
export type UploadProgressCallback = (progress: number) => void;

// ── Result types ──────────────────────────────────────────────────────────────

export interface UploadResult {
    media: JournalMedia;
    uploadTask: UploadTask; // exposed for cancellation
}

export interface BatchUploadResult {
    succeeded: JournalMedia[];
    failed: { file: File; error: Error }[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * sanitiseFilename
 * Removes characters that are unsafe in Storage paths and normalises
 * the name to lowercase. Preserves the file extension.
 */
function sanitiseFilename(originalName: string): string {
    const dotIndex = originalName.lastIndexOf('.');
    const ext = dotIndex !== -1 ? originalName.slice(dotIndex).toLowerCase() : '';
    const base = dotIndex !== -1 ? originalName.slice(0, dotIndex) : originalName;
    const safeBase = base
        .toLowerCase()
        .replace(/[^a-z0-9-_]/g, '_')
        .replace(/_+/g, '_')
        .slice(0, 64); // cap at 64 chars
    return `${safeBase}${ext}`;
}

/**
 * generateUUID
 * Tiny UUID-v4 generator using the Web Crypto API (available in all modern browsers).
 */
function generateUUID(): string {
    return crypto.randomUUID
        ? crypto.randomUUID()
        : Array.from({ length: 16 }, () =>
            Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
        ).join('').replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5');
}

/**
 * buildStoragePath
 * Constructs the canonical Storage path for a journal media file.
 *
 * Format: events/{eventId}/journal/{uuid}_{sanitisedFilename}
 */
function buildStoragePath(eventId: string, file: File): string {
    const uuid = generateUUID().replace(/-/g, '').slice(0, 8); // 8-char prefix
    const safeName = sanitiseFilename(file.name);
    return `events/${eventId}/journal/${uuid}_${safeName}`;
}

/**
 * validateFile
 * Throws a descriptive error if the file is not allowed.
 */
function validateFile(file: File): void {
    if (!ALLOWED_TYPES[file.type]) {
        throw new Error(
            `Unsupported file type: "${file.type}". ` +
            `Allowed: ${Object.keys(ALLOWED_TYPES).join(', ')}.`
        );
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
        throw new Error(
            `File "${file.name}" is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). ` +
            `Maximum allowed size is ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB.`
        );
    }
    if (file.size === 0) {
        throw new Error(`File "${file.name}" is empty and cannot be uploaded.`);
    }
}

// ── Core upload function ──────────────────────────────────────────────────────

/**
 * uploadJournalMedia
 *
 * Uploads a single File to Firebase Storage under the journal path for an event.
 *
 * @param eventId    The Firestore event document ID
 * @param file       The File object from an <input type="file"> or drag-drop
 * @param onProgress Optional callback receiving upload progress (0–100)
 *
 * @returns A UploadResult containing the completed JournalMedia object
 *          and the active UploadTask (so the caller can cancel mid-upload)
 *
 * @throws Error on invalid file type, file too large, or Storage failure
 *
 * @example
 * const { media, uploadTask } = await uploadJournalMedia(
 *   'evt_london_q4_2026',
 *   selectedFile,
 *   (pct) => setUploadProgress(pct)
 * );
 * console.log(media.url); // → "https://firebasestorage.googleapis.com/..."
 */
export async function uploadJournalMedia(
    eventId: string,
    file: File,
    onProgress?: UploadProgressCallback
): Promise<UploadResult> {
    validateFile(file);

    const storagePath = buildStoragePath(eventId, file);
    const storageRef = ref(storage, storagePath);
    const mediaType = ALLOWED_TYPES[file.type];

    const metadata = {
        contentType: file.type,
        customMetadata: {
            eventId,
            originalName: file.name,
            uploadedAt: new Date().toISOString(),
        },
    };

    const uploadTask: UploadTask = uploadBytesResumable(storageRef, file, metadata);

    return new Promise<UploadResult>((resolve, reject) => {
        uploadTask.on(
            'state_changed',
            (snapshot) => {
                if (onProgress) {
                    const pct = Math.round(
                        (snapshot.bytesTransferred / snapshot.totalBytes) * 100
                    );
                    onProgress(pct);
                }
            },
            (error) => {
                console.error(`[mediaService] Upload failed for "${file.name}":`, error);
                reject(new Error(`Upload failed: ${error.message}`));
            },
            async () => {
                try {
                    const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
                    const media: JournalMedia = {
                        url: downloadUrl,
                        type: mediaType,
                        filename: file.name,
                        mimeType: file.type,
                        sizeBytes: file.size,
                        storagePath,
                    };
                    console.info(
                        `[mediaService] Uploaded "${file.name}" → ${storagePath}`,
                        `(${(file.size / 1024).toFixed(0)} KB, ${mediaType})`
                    );
                    resolve({ media, uploadTask });
                } catch (urlError) {
                    reject(new Error(`Failed to get download URL: ${(urlError as Error).message}`));
                }
            }
        );
    });
}

// ── Batch upload ──────────────────────────────────────────────────────────────

/**
 * uploadJournalMediaBatch
 *
 * Uploads multiple files concurrently. Returns separate succeeded/failed arrays
 * so the UI can display partial success without blocking the whole post.
 *
 * Concurrency is capped at 3 simultaneous uploads to avoid overwhelming
 * mobile connections on the event floor.
 *
 * @param eventId    The Firestore event document ID
 * @param files      Array of File objects
 * @param onProgress Called with overall batch progress (0–100)
 */
export async function uploadJournalMediaBatch(
    eventId: string,
    files: File[],
    onProgress?: (overallPercent: number) => void
): Promise<BatchUploadResult> {
    const CONCURRENCY = 3;
    const succeeded: JournalMedia[] = [];
    const failed: { file: File; error: Error }[] = [];

    // Track per-file progress for aggregate reporting
    const fileProgress = new Array(files.length).fill(0);
    const reportProgress = () => {
        if (!onProgress) return;
        const avg = fileProgress.reduce((a, b) => a + b, 0) / files.length;
        onProgress(Math.round(avg));
    };

    // Process in batches of CONCURRENCY
    for (let i = 0; i < files.length; i += CONCURRENCY) {
        const chunk = files.slice(i, i + CONCURRENCY);
        await Promise.allSettled(
            chunk.map((file, chunkIdx) => {
                const globalIdx = i + chunkIdx;
                return uploadJournalMedia(
                    eventId,
                    file,
                    (pct) => {
                        fileProgress[globalIdx] = pct;
                        reportProgress();
                    }
                )
                    .then(({ media }) => succeeded.push(media))
                    .catch((err) => failed.push({ file, error: err instanceof Error ? err : new Error(String(err)) }));
            })
        );
    }

    return { succeeded, failed };
}

// ── Delete ────────────────────────────────────────────────────────────────────

/**
 * deleteJournalMedia
 *
 * Deletes a media file from Firebase Storage using its storagePath.
 * Always use storagePath (not the download URL) for deletion — download URLs
 * include auth tokens that change, but storagePaths are stable.
 *
 * @param storagePath  The JournalMedia.storagePath field
 */
export async function deleteJournalMedia(storagePath: string): Promise<void> {
    if (!storagePath) {
        throw new Error('deleteJournalMedia: storagePath is required.');
    }
    const storageRef: StorageReference = ref(storage, storagePath);
    await deleteObject(storageRef);
    console.info(`[mediaService] Deleted ${storagePath}`);
}

// ── Utility ───────────────────────────────────────────────────────────────────

/**
 * getStoragePathFromUrl
 * Extracts the path segment from a Firebase Storage download URL.
 * Useful when migrating legacy mediaUrls[] (bare strings) to mediaPath.
 *
 * Firebase Storage URLs have the format:
 *   https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{encodedPath}?token=...
 *
 * @example
 * getStoragePathFromUrl(
 *   "https://firebasestorage.googleapis.com/v0/b/psievents-pro.firebasestorage.app/o/events%2Fevt_001%2Fjournal%2Fphoto.jpg?token=..."
 * )
 * // → "events/evt_001/journal/photo.jpg"
 */
export function getStoragePathFromUrl(downloadUrl: string): string | null {
    try {
        const url = new URL(downloadUrl);
        const oIndex = url.pathname.indexOf('/o/');
        if (oIndex === -1) return null;
        const encoded = url.pathname.slice(oIndex + 3);
        return decodeURIComponent(encoded.split('?')[0]);
    } catch {
        return null;
    }
}

/**
 * isAllowedFileType
 * Quick type-check for use in file picker validation before triggering upload.
 */
export function isAllowedFileType(file: File): boolean {
    return file.type in ALLOWED_TYPES;
}

/**
 * getAllowedExtensions
 * Returns a string suitable for an <input accept="..."> attribute.
 * e.g. "image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
 */
export function getAllowedExtensions(): string {
    return Object.keys(ALLOWED_TYPES).join(',');
}
