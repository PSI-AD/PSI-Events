"use strict";
/**
 * processReceiptOCR.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Firebase Cloud Function: OCR Receipt Scanner for the PSI Expense Ledger.
 *
 * Trigger:  Callable HTTPS function (client calls via httpsCallable).
 * Input:    { imageUrl: string, eventId: string, uploadedBy: string }
 * Output:   { success: boolean, expenseId: string, extracted: OcrResult }
 *
 * Pipeline:
 *   1. Accept image URL (Firebase Storage download URL or any public URL).
 *   2. Pass the image to Google Cloud Vision API (TEXT_DETECTION).
 *   3. Parse raw OCR text → extract Total_Amount and Vendor_Name heuristics.
 *   4. Write a new document to events/{eventId}/expenses with:
 *        - amount (extracted or 0)
 *        - vendorName (extracted or 'Unknown Vendor')
 *        - category: 'Hospitality' (default per directive)
 *        - subcategory: vendorName
 *        - requiresHumanVerification: true
 *        - ocrRawText: full extracted text (for audit)
 *        - sourceImageUrl: original upload URL
 *   5. Log the action to system_audit_logs.
 *
 * OCR Strategy (with graceful mock fallback):
 *   - PRIMARY:  Google Cloud Vision API (TEXT_DETECTION).
 *               Enabled when GOOGLE_CLOUD_VISION_KEY env var is present
 *               OR when running in a GCP environment with ADC.
 *   - FALLBACK: Deterministic mock that analyses parts of the image URL
 *               to produce plausible demo data for presentations without
 *               billing a Vision API call.
 *
 * ── Deploy command ──────────────────────────────────────────────────────────
 *   cd functions && npm run build
 *   firebase deploy --only functions:processReceiptOCR
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
exports.processReceiptOCR = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const https = __importStar(require("https"));
// ── Firestore shorthand ───────────────────────────────────────────────────────
const db = () => admin.firestore();
// ── Vision API caller ─────────────────────────────────────────────────────────
/**
 * callVisionApi
 * Sends a TEXT_DETECTION request to the Google Cloud Vision REST API.
 * Returns the raw annotation text.
 */
async function callVisionApi(imageUrl, apiKey) {
    const requestBody = JSON.stringify({
        requests: [{
                image: { source: { imageUri: imageUrl } },
                features: [{ type: 'TEXT_DETECTION', maxResults: 1 }],
            }],
    });
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'vision.googleapis.com',
            path: `/v1/images:annotate?key=${apiKey}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(requestBody),
            },
        };
        const req = https.request(options, res => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                var _a, _b, _c, _d;
                try {
                    const parsed = JSON.parse(data);
                    const text = (_d = (_c = (_b = (_a = parsed.responses) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.fullTextAnnotation) === null || _c === void 0 ? void 0 : _c.text) !== null && _d !== void 0 ? _d : '';
                    resolve(text);
                }
                catch (e) {
                    reject(new Error('Failed to parse Vision API response'));
                }
            });
        });
        req.on('error', reject);
        req.write(requestBody);
        req.end();
    });
}
// ── Text parser ───────────────────────────────────────────────────────────────
/**
 * parseReceiptText
 * Applies heuristic regexes to raw OCR text to extract:
 *   - totalAmount: looks for TOTAL / AMOUNT DUE / GRAND TOTAL patterns
 *   - vendorName:  takes the first non-empty line (usually the store name)
 */
function parseReceiptText(rawText) {
    var _a;
    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
    // ── Vendor name: first substantive line ───────────────────────────────
    const vendorName = (_a = lines[0]) !== null && _a !== void 0 ? _a : 'Unknown Vendor';
    // ── Total amount: try several common receipt patterns ─────────────────
    // Priority order: TOTAL → AMOUNT DUE → GRAND TOTAL → largest currency value
    const totalPatterns = [
        /(?:total|amount\s+due|grand\s+total|balance\s+due)[^\d]*(\d[\d,]*\.?\d{0,2})/i,
        /(?:aed|usd|gbp|eur|egp)[\s:]*(\d[\d,]*\.?\d{0,2})/i,
        /(\d[\d,]*\.\d{2})\s*(?:aed|usd|gbp|eur)?/i,
    ];
    for (let i = 0; i < totalPatterns.length; i++) {
        const fullText = rawText.replace(/\n/g, ' ');
        const match = fullText.match(totalPatterns[i]);
        if (match) {
            const amount = parseFloat(match[1].replace(/,/g, ''));
            const confidence = i === 0 ? 'high' : i === 1 ? 'medium' : 'low';
            return { vendorName, totalAmount: amount, confidence };
        }
    }
    return { vendorName, totalAmount: 0, confidence: 'low' };
}
// ── Mock OCR (demo fallback) ──────────────────────────────────────────────────
/**
 * mockOcr
 * Returns deterministic demo data without calling any external API.
 * Used when running in emulator or when Vision API key is absent.
 * The mock picks plausible values from a small lookup table keyed by a
 * hash of the image URL so repeated calls to the same URL return the same result.
 */
const MOCK_RECEIPTS = [
    { vendorName: 'Four Seasons Hotel London', totalAmount: 18500 },
    { vendorName: 'Emirates Business Lounge', totalAmount: 3200 },
    { vendorName: 'Andaz Hotel London', totalAmount: 9800 },
    { vendorName: 'Canapé & Co. Catering', totalAmount: 6450 },
    { vendorName: 'Heathrow Airport Parking', totalAmount: 1100 },
];
function mockOcr(imageUrl) {
    const idx = imageUrl.length % MOCK_RECEIPTS.length;
    const sample = MOCK_RECEIPTS[idx];
    return {
        vendorName: sample.vendorName,
        totalAmount: sample.totalAmount,
        rawText: `[MOCK OCR]\n${sample.vendorName}\nDate: ${new Date().toLocaleDateString()}\nTotal: AED ${sample.totalAmount.toLocaleString()}`,
        confidence: 'mock',
    };
}
// ── Cloud Function ────────────────────────────────────────────────────────────
exports.processReceiptOCR = functions
    .runWith({ timeoutSeconds: 60, memory: '256MB' })
    .https.onCall(async (data, context) => {
    var _a;
    // ── Basic validation ────────────────────────────────────────────────
    if (!data.imageUrl || !data.eventId || !data.uploadedBy) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required fields: imageUrl, eventId, uploadedBy');
    }
    functions.logger.info('[OCR] Processing receipt', {
        eventId: data.eventId,
        uploadedBy: data.uploadedBy,
        imageUrl: data.imageUrl.substring(0, 80),
    });
    // ── OCR extraction ──────────────────────────────────────────────────
    let ocrResult;
    const visionApiKey = (_a = process.env.GOOGLE_CLOUD_VISION_KEY) !== null && _a !== void 0 ? _a : '';
    if (visionApiKey) {
        // Live Vision API path
        try {
            const rawText = await callVisionApi(data.imageUrl, visionApiKey);
            const parsed = parseReceiptText(rawText);
            ocrResult = {
                vendorName: parsed.vendorName,
                totalAmount: parsed.totalAmount,
                rawText,
                confidence: parsed.confidence,
            };
            functions.logger.info('[OCR] Vision API extraction succeeded', {
                vendor: ocrResult.vendorName,
                amount: ocrResult.totalAmount,
                confidence: ocrResult.confidence,
            });
        }
        catch (err) {
            functions.logger.warn('[OCR] Vision API failed, falling back to mock', { err });
            ocrResult = mockOcr(data.imageUrl);
        }
    }
    else {
        // Demo / emulator fallback — no external call
        functions.logger.info('[OCR] GOOGLE_CLOUD_VISION_KEY not set — using mock OCR for demo');
        ocrResult = mockOcr(data.imageUrl);
    }
    // ── Write to Firestore ──────────────────────────────────────────────
    const expensesRef = db().collection('events').doc(data.eventId).collection('expenses');
    const auditRef = db().collection('system_audit_logs');
    const now = admin.firestore.FieldValue.serverTimestamp();
    const batch = db().batch();
    // New expense document
    const expenseDoc = expensesRef.doc();
    batch.set(expenseDoc, {
        amount: ocrResult.totalAmount,
        category: 'Hospitality',
        subcategory: ocrResult.vendorName,
        vendorName: ocrResult.vendorName,
        paidBy: 'Branch',
        description: `Auto-extracted via OCR Receipt Scanner. Confidence: ${ocrResult.confidence}.`,
        requiresHumanVerification: true,
        sourceImageUrl: data.imageUrl,
        ocrRawText: ocrResult.rawText,
        ocrConfidence: ocrResult.confidence,
        createdAt: now,
        createdBy: data.uploadedBy,
        source: 'OCR_SCANNER',
    });
    // Audit log entry
    const auditDoc = auditRef.doc();
    batch.set(auditDoc, {
        timestamp: now,
        actor_id: data.uploadedBy,
        action_type: 'EXPENSE_OCR_CREATED',
        target_id: expenseDoc.id,
        event_id: data.eventId,
        new_state: {
            amount: ocrResult.totalAmount,
            vendorName: ocrResult.vendorName,
            category: 'Hospitality',
            confidence: ocrResult.confidence,
        },
    });
    await batch.commit();
    functions.logger.info('[OCR] Expense document created', {
        expenseId: expenseDoc.id,
        amount: ocrResult.totalAmount,
        vendorName: ocrResult.vendorName,
    });
    // ── Return to client ────────────────────────────────────────────────
    return {
        success: true,
        expenseId: expenseDoc.id,
        extracted: ocrResult,
    };
});
//# sourceMappingURL=processReceiptOCR.js.map