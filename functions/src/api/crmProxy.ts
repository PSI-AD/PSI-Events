/**
 * crmProxy.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Firebase HTTPS Cloud Function — PSI CRM reverse proxy.
 *
 * Forwards POST requests to the PSI CRM API server-side so the browser
 * never hits a CORS preflight error. Returns the CRM response with
 * permissive CORS headers for psievents-pro.web.app.
 *
 * Environment variable (set in functions/.env):
 *   PSI_CRM_API_KEY   — PSI external API bearer token
 *
 * Deploy: firebase deploy --only functions:crmProxy
 */

import * as functions from 'firebase-functions';
import { IncomingMessage, request as httpRequest, RequestOptions } from 'http';
import { request as httpsRequest } from 'https';

// ── Config ────────────────────────────────────────────────────────────────────

const CRM_HOSTNAME = 'integration.psi-crm.com';
const CRM_PATH_BASE = '/ExternalApis/GetAllProperties';

const ALLOWED_ORIGINS = new Set([
    'https://psievents-pro.web.app',
    'https://psievents-pro.firebaseapp.com',
]);

// ── Helper: raw HTTPS POST ────────────────────────────────────────────────────

function postToCRM(
    pageIndex: number,
    pageSize: number,
    apiKey: string
): Promise<{ statusCode: number; body: string }> {
    return new Promise((resolve, reject) => {
        const path = `${CRM_PATH_BASE}?pageIndex=${pageIndex}&pageSize=${pageSize}`;
        const postBody = '{}';

        const options: RequestOptions = {
            hostname: CRM_HOSTNAME,
            port: 443,
            path,
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postBody),
                'Authorization': `Bearer ${apiKey}`,
                'X-Api-Key': apiKey,
            },
        };

        const req = httpsRequest(options, (res: IncomingMessage) => {
            let data = '';
            res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
            res.on('end', () => {
                resolve({ statusCode: res.statusCode ?? 200, body: data });
            });
        });

        req.on('error', (err: Error) => reject(err));
        req.write(postBody);
        req.end();
    });
}

// ── Cloud Function ────────────────────────────────────────────────────────────

export const crmProxy = functions
    .runWith({ timeoutSeconds: 60, memory: '256MB' })
    .https.onRequest(async (req, res) => {

        // CORS headers
        const origin = (req.headers['origin'] as string) ?? '';
        const isAllowed = ALLOWED_ORIGINS.has(origin) ||
            origin.startsWith('http://localhost');

        res.set('Access-Control-Allow-Origin', isAllowed ? origin : 'https://psievents-pro.web.app');
        res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.set('Access-Control-Max-Age', '3600');

        // Handle CORS preflight
        if (req.method === 'OPTIONS') {
            res.status(204).send('');
            return;
        }

        if (req.method !== 'POST') {
            res.status(405).json({ error: 'Method not allowed. Use POST.' });
            return;
        }

        const apiKey: string = process.env.PSI_CRM_API_KEY ?? '';
        if (!apiKey) {
            res.status(500).json({ error: 'PSI_CRM_API_KEY not configured.' });
            return;
        }

        const body = (req.body ?? {}) as Record<string, unknown>;
        const pageIndex = typeof body.pageIndex === 'number' ? body.pageIndex : 1;
        const pageSize = typeof body.pageSize === 'number' ? body.pageSize : 100;

        functions.logger.info('[crmProxy] Forwarding to CRM', { pageIndex, pageSize });

        try {
            const { statusCode, body: crmBody } = await postToCRM(pageIndex, pageSize, apiKey);
            functions.logger.info('[crmProxy] CRM responded', {
                statusCode,
                bodyLength: crmBody.length,
            });
            res.status(statusCode).set('Content-Type', 'application/json').send(crmBody);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            functions.logger.error('[crmProxy] Upstream error', { msg });
            res.status(502).json({ error: `CRM upstream error: ${msg}` });
        }
    });
