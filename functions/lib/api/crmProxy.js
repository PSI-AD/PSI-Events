"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.crmProxy = void 0;
const functions = __importStar(require("firebase-functions"));
const https_1 = require("https");
// ── Config ────────────────────────────────────────────────────────────────────
const CRM_HOSTNAME = 'integration.psi-crm.com';
const CRM_PATH_BASE = '/ExternalApis/GetAllProperties';
const ALLOWED_ORIGINS = new Set([
    'https://psievents-pro.web.app',
    'https://psievents-pro.firebaseapp.com',
]);
// ── Helper: raw HTTPS POST ────────────────────────────────────────────────────
function postToCRM(pageIndex, pageSize, apiKey) {
    return new Promise((resolve, reject) => {
        const path = `${CRM_PATH_BASE}?pageIndex=${pageIndex}&pageSize=${pageSize}`;
        const postBody = '{}';
        const options = {
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
        const req = (0, https_1.request)(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk.toString(); });
            res.on('end', () => {
                var _a;
                resolve({ statusCode: (_a = res.statusCode) !== null && _a !== void 0 ? _a : 200, body: data });
            });
        });
        req.on('error', (err) => reject(err));
        req.write(postBody);
        req.end();
    });
}
// ── Cloud Function ────────────────────────────────────────────────────────────
exports.crmProxy = functions
    .runWith({ timeoutSeconds: 60, memory: '256MB' })
    .https.onRequest(async (req, res) => {
    var _a, _b, _c;
    // CORS headers
    const origin = (_a = req.headers['origin']) !== null && _a !== void 0 ? _a : '';
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
    const apiKey = (_b = process.env.PSI_CRM_API_KEY) !== null && _b !== void 0 ? _b : '';
    if (!apiKey) {
        res.status(500).json({ error: 'PSI_CRM_API_KEY not configured.' });
        return;
    }
    const body = ((_c = req.body) !== null && _c !== void 0 ? _c : {});
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
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        functions.logger.error('[crmProxy] Upstream error', { msg });
        res.status(502).json({ error: `CRM upstream error: ${msg}` });
    }
});
//# sourceMappingURL=crmProxy.js.map