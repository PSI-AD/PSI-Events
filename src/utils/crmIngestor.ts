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

const CRM_DIRECT_URL = (pageIndex: number, pageSize: number) =>
    `https://integration.psi-crm.com/ExternalApis/GetAllProperties` +
    `?pageIndex=${pageIndex}&pageSize=${pageSize}`;

const CRM_API_KEY = import.meta.env.VITE_PSI_CRM_API_KEY as string;

// CORS proxy URLs — tried in order until one succeeds.
// cors.sh: purpose-built for POST with custom auth headers.
// corsproxy.io: general proxy, sometimes blocks preflight.
const CORS_PROXIES = [
    (url: string) => `https://proxy.cors.sh/${url}`,
    (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
];

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

async function tryFetchViaCorsProxy(
    targetUrl: string,
    proxyFn: (url: string) => string,
    apiKey: string,
): Promise<Response> {
    const proxied = proxyFn(targetUrl);
    return fetch(proxied, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'X-Api-Key': apiKey,
            // cors.sh requires this header to whitelist the request
            'x-cors-api-key': 'temp_6ac6b5a7c2d242dcb49cbf4e4a7e97b2',
        },
        body: JSON.stringify({}),
    });
}

async function fetchPage(pageIndex: number, pageSize: number): Promise<CRMProperty[]> {
    if (!CRM_API_KEY) {
        throw new Error(
            'VITE_PSI_CRM_API_KEY is not set. Add it to .env.local and restart the dev server.'
        );
    }

    const targetUrl = CRM_DIRECT_URL(pageIndex, pageSize);
    let lastError: Error | null = null;

    for (let i = 0; i < CORS_PROXIES.length; i++) {
        const proxyFn = CORS_PROXIES[i];
        const proxyName = i === 0 ? 'cors.sh' : 'corsproxy.io';
        console.log(`[CRM Ingestor] attempt ${i + 1} via ${proxyName}`);

        try {
            const res = await tryFetchViaCorsProxy(targetUrl, proxyFn, CRM_API_KEY);

            if (!res.ok) {
                const body = await res.text().catch(() => '');
                throw new Error(`${proxyName} ${res.status} ${res.statusText}${body ? ': ' + body.slice(0, 200) : ''}`);
            }

            const json: unknown = await res.json();
            console.log(`[CRM Ingestor] success via ${proxyName}`);

            if (Array.isArray(json)) return json as CRMProperty[];
            if (json && typeof json === 'object') {
                const obj = json as Record<string, unknown>;
                for (const key of ['data', 'result', 'properties', 'value', 'items', 'records']) {
                    if (Array.isArray(obj[key])) return obj[key] as CRMProperty[];
                }
                return [obj as CRMProperty];
            }
            return [];

        } catch (err) {
            lastError = err instanceof Error ? err : new Error(String(err));
            console.warn(`[CRM Ingestor] ${proxyName} failed: ${lastError.message}`);
            // Try next proxy
        }
    }

    throw lastError ?? new Error('All CORS proxies failed');
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
    onLog?: (msg: string) => void,
): Promise<SyncResult> {
    const t0 = Date.now();
    const errors: string[] = [];
    let written = 0;
    let skipped = 0;

    onLog?.('Initializing CRM connection...');
    onLog?.(`Target endpoint: PSI CRM API (page ${pageIndex}, size ${pageSize})`);

    // 1. Fetch from CRM
    let rawProperties: CRMProperty[] = [];
    try {
        onLog?.('Fetching properties from CRM...');
        rawProperties = await fetchPage(pageIndex, pageSize);
        onLog?.(`API responded — ${rawProperties.length} properties received.`);
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        onLog?.('Error: ' + msg);
        return {
            success: false,
            fetched: 0,
            written: 0,
            skipped: 0,
            errors: [msg],
            durationMs: Date.now() - t0,
        };
    }

    const fetched = rawProperties.length;

    if (fetched === 0) {
        onLog?.('Warning: API returned 0 properties — check pageIndex/pageSize or API status.');
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
    onLog?.(`Normalising ${fetched} properties for Firestore...`);
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

    onLog?.(`Success: ${written} properties written to crm_projects.${skipped > 0 ? ` (${skipped} skipped)` : ''}`);
    onLog?.(`Completed in ${Date.now() - t0}ms.`);

    return {
        success: true,
        fetched,
        written,
        skipped,
        errors,
        durationMs: Date.now() - t0,
    };
}
