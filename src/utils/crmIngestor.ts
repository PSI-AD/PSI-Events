/**
 * crmIngestor.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * PSI CRM → Firestore ingestion utility.
 *
 * Fetches live property data from the PSI CRM external API and writes it
 * into the `crm_projects` Firestore collection using a writeBatch to
 * guarantee atomicity and avoid partial writes.
 *
 * Each CRM property is stored with its CRM-side ID as the Firestore
 * document ID, so re-running this function is SAFE — it will upsert
 * (overwrite matching docs) rather than duplicate.
 *
 * ── Auth ──────────────────────────────────────────────────────────────────────
 * The API key is read from the environment variable:
 *   VITE_PSI_CRM_API_KEY
 *
 * Add this to your .env.local (never commit the actual value):
 *   VITE_PSI_CRM_API_KEY=<your_key_here>
 *
 * ── Usage ─────────────────────────────────────────────────────────────────────
 *   import { syncCRMProperties } from '../utils/crmIngestor';
 *   const result = await syncCRMProperties();
 */

import {
    collection,
    doc,
    writeBatch,
    serverTimestamp,
    type WriteBatch,
} from 'firebase/firestore';
import { db } from '../services/firebase/firebaseConfig';

// ── Config ────────────────────────────────────────────────────────────────────

// In development: requests to /crm-api are proxied by Vite → integration.psi-crm.com
// (avoids CORS — the proxy runs in Node.js, not the browser).
// In production: deploy a Firebase Cloud Function that does the same server-side forwarding.
const CRM_BASE_URL = '/crm-api/ExternalApis';
const CRM_API_KEY = import.meta.env.VITE_PSI_CRM_API_KEY as string;

// Firestore limits a single batch to 500 operations
const BATCH_LIMIT = 499;

// ── Types ─────────────────────────────────────────────────────────────────────

/** Raw shape returned by the PSI CRM API — field names may vary; adjust as needed */
export interface CRMProperty {
    // Identity
    id?: string | number;
    propertyId?: string | number;
    referenceNumber?: string;

    // Core fields
    propertyName?: string;
    name?: string;
    title?: string;

    developer?: string;
    developerName?: string;

    location?: string;
    community?: string;
    area?: string;
    city?: string;

    price?: number | string;
    priceAED?: number | string;
    startingPrice?: number | string;

    status?: string;
    propertyStatus?: string;
    completionStatus?: string;

    // Optional extras we'll carry through
    bedrooms?: number | string;
    propertyType?: string;
    description?: string;
    completionDate?: string;
    handoverDate?: string;
    imageUrl?: string;

    // Allow any other fields the API sends
    [key: string]: unknown;
}

/** Normalised shape stored in Firestore */
export interface NormalisedProject {
    crmId: string;
    propertyName: string;
    developer: string;
    location: string;
    price: string;
    status: string;
    bedrooms: string;
    propertyType: string;
    description: string;
    completionDate: string;
    imageUrl: string;
    rawData: Record<string, unknown>;
    syncedAt: ReturnType<typeof serverTimestamp>;
    source: 'psi-crm';
}

/** Return value of syncCRMProperties() */
export interface SyncResult {
    success: boolean;
    fetched: number;
    written: number;
    skipped: number;
    errors: string[];
    durationMs: number;
}

// ── Normalise helper ──────────────────────────────────────────────────────────

function resolveId(raw: CRMProperty): string {
    const id =
        raw.id ??
        raw.propertyId ??
        raw.referenceNumber;
    return id !== undefined && id !== null ? String(id) : '';
}

function resolveField<T>(
    raw: CRMProperty,
    keys: (keyof CRMProperty)[],
    fallback: T,
): T {
    for (const k of keys) {
        if (raw[k] !== undefined && raw[k] !== null && raw[k] !== '') {
            return raw[k] as unknown as T;
        }
    }
    return fallback;
}

function normalise(raw: CRMProperty): NormalisedProject {
    const priceRaw = resolveField<number | string>(raw, ['price', 'priceAED', 'startingPrice'], 0);
    const priceNum = typeof priceRaw === 'string' ? parseFloat(priceRaw.replace(/[^0-9.]/g, '')) : priceRaw;
    const priceLabel = isNaN(priceNum) || priceNum === 0
        ? 'Price on request'
        : `AED ${priceNum.toLocaleString()}`;

    return {
        crmId: resolveId(raw),
        propertyName: resolveField<string>(raw, ['propertyName', 'name', 'title'], 'Untitled Property'),
        developer: resolveField<string>(raw, ['developer', 'developerName'], 'Unknown Developer'),
        location: resolveField<string>(raw, ['location', 'community', 'area', 'city'], 'UAE'),
        price: priceLabel,
        status: resolveField<string>(raw, ['status', 'propertyStatus', 'completionStatus'], 'Unknown'),
        bedrooms: String(resolveField<number | string>(raw, ['bedrooms'], '')),
        propertyType: resolveField<string>(raw, ['propertyType'], ''),
        description: resolveField<string>(raw, ['description'], ''),
        completionDate: resolveField<string>(raw, ['completionDate', 'handoverDate'], ''),
        imageUrl: resolveField<string>(raw, ['imageUrl'], ''),
        rawData: raw as Record<string, unknown>,
        syncedAt: serverTimestamp(),
        source: 'psi-crm',
    };
}

// ── API fetch helper ──────────────────────────────────────────────────────────

async function fetchPage(pageIndex: number, pageSize: number): Promise<CRMProperty[]> {
    if (!CRM_API_KEY) {
        throw new Error(
            'VITE_PSI_CRM_API_KEY is not set. Add it to .env.local and restart the dev server.'
        );
    }

    // The server returns 405 on GET — it requires POST.
    // Params sent in the URL query string AND in the JSON body.
    const url =
        `${CRM_BASE_URL}/GetAllProperties` +
        `?pageIndex=${pageIndex}&pageSize=${pageSize}`;

    // Debug: log the method + URL so you can verify in DevTools → Console
    console.log('[CRM Ingestor] POST', url);

    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${CRM_API_KEY}`,
            'X-Api-Key': CRM_API_KEY,
        },
        body: JSON.stringify({ pageIndex, pageSize, apiKey: CRM_API_KEY }),
    });


    if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`CRM API ${res.status} ${res.statusText}${body ? ': ' + body.slice(0, 200) : ''}`);
    }

    const json: unknown = await res.json();

    // Handle different envelope shapes the API might return:
    //   • Array directly         → [{ ... }, ...]
    //   • { data: [...] }        → common REST pattern
    //   • { result: [...] }
    //   • { properties: [...] }
    //   • { value: [...] }      → OData
    if (Array.isArray(json)) return json as CRMProperty[];

    if (json && typeof json === 'object') {
        const obj = json as Record<string, unknown>;
        for (const key of ['data', 'result', 'properties', 'value', 'items', 'records']) {
            if (Array.isArray(obj[key])) return obj[key] as CRMProperty[];
        }
        // Single object response — wrap in array
        return [obj as CRMProperty];
    }

    return [];
}

// ── Batch writer helper ───────────────────────────────────────────────────────

async function flushBatch(batch: WriteBatch, count: number): Promise<void> {
    if (count === 0) return;
    await batch.commit();
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * syncCRMProperties()
 * Fetches up to `pageSize` properties from the PSI CRM API (page 1 by default)
 * and upserts them into the Firestore `crm_projects` collection.
 *
 * @param pageIndex  CRM page to fetch (default: 1)
 * @param pageSize   Records per page (default: 100)
 */
export async function syncCRMProperties(
    pageIndex = 1,
    pageSize = 100,
): Promise<SyncResult> {
    const t0 = Date.now();
    const errors: string[] = [];
    let written = 0;
    let skipped = 0;

    // 1. Fetch from CRM
    let rawProperties: CRMProperty[] = [];
    try {
        rawProperties = await fetchPage(pageIndex, pageSize);
    } catch (err) {
        return {
            success: false,
            fetched: 0,
            written: 0,
            skipped: 0,
            errors: [err instanceof Error ? err.message : String(err)],
            durationMs: Date.now() - t0,
        };
    }

    const fetched = rawProperties.length;

    if (fetched === 0) {
        return {
            success: true,
            fetched: 0,
            written: 0,
            skipped: 0,
            errors: ['API returned 0 properties — check pageIndex/pageSize or API status.'],
            durationMs: Date.now() - t0,
        };
    }

    // 2. Normalise and chunk into Firestore batches (max 499 ops each)
    const colRef = collection(db, 'crm_projects');
    let batch = writeBatch(db);
    let opsInBatch = 0;

    for (const raw of rawProperties) {
        try {
            const normalised = normalise(raw);

            if (!normalised.crmId) {
                // Can't use an empty string as a doc ID — skip and log
                skipped++;
                errors.push(`Skipped property with no id: ${JSON.stringify(raw).slice(0, 120)}`);
                continue;
            }

            const docRef = doc(colRef, normalised.crmId);
            batch.set(docRef, normalised, { merge: true });
            opsInBatch++;
            written++;

            // Flush and start a fresh batch if we hit the limit
            if (opsInBatch >= BATCH_LIMIT) {
                await flushBatch(batch, opsInBatch);
                batch = writeBatch(db);
                opsInBatch = 0;
            }
        } catch (err) {
            skipped++;
            errors.push(`Property error: ${err instanceof Error ? err.message : String(err)}`);
        }
    }

    // 3. Flush the final (partial) batch
    try {
        await flushBatch(batch, opsInBatch);
    } catch (err) {
        errors.push(`Final batch commit failed: ${err instanceof Error ? err.message : String(err)}`);
        return {
            success: false,
            fetched,
            written: written - opsInBatch,   // undo the un-committed count
            skipped,
            errors,
            durationMs: Date.now() - t0,
        };
    }

    return {
        success: true,
        fetched,
        written,
        skipped,
        errors,
        durationMs: Date.now() - t0,
    };
}
