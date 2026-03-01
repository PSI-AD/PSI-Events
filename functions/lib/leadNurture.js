"use strict";
/**
 * leadNurture.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Firebase Cloud Function: Zero-Delay Lead Nurture Webhook
 *
 * Trigger: Firestore onDocumentWritten — crm_leads/{leadId}
 *
 * Logic:
 *   1. Fires on every CREATE or UPDATE to a crm_leads document.
 *   2. Checks whether the lead's `status` has just transitioned to "Qualified".
 *      (Only triggers on a real status change, not on irrelevant field updates.)
 *   3. Requires `projectInterest` to be a non-empty string on the document.
 *   4. Looks up the event (from `eventId`) and the assigned agent (from `assignedAgentId`)
 *      in Firestore to compile the complete personalized message payload.
 *   5. Calls `dispatchWhatsAppMessage()` which:
 *        - In LIVE mode  : issues a real HTTP POST to the Twilio WhatsApp API.
 *        - In MOCK mode  : logs the full payload and records it to Firestore
 *          (nurture_message_log collection) for audit and demo visibility.
 *   6. Updates the lead document with delivery metadata.
 *   7. Writes a full audit trail to system_audit_logs.
 *
 * ── Environment Variables ─────────────────────────────────────────────────────
 *
 *  TWILIO_ACCOUNT_SID   — Twilio Account SID  (e.g. AC...)
 *  TWILIO_AUTH_TOKEN    — Twilio Auth Token
 *  TWILIO_WHATSAPP_FROM — Twilio WhatsApp sender  (e.g. whatsapp:+14155238886)
 *
 *  If any of these are absent, the function runs in MOCK mode.
 *  In MOCK mode every payload is logged + written to `nurture_message_log`
 *  so it is visible in the Firebase Console without real Twilio credentials.
 *
 * ── crm_leads document schema ─────────────────────────────────────────────────
 *
 *  crm_leads/{leadId}
 *    firstName          : string
 *    lastName           : string
 *    phone              : string          ← E.164 format, e.g. "+971501234567"
 *    email?             : string
 *    status             : LeadStatus      ← "Qualified" triggers this function
 *    projectInterest    : string          ← project name or Firestore project ID
 *    eventId            : string          ← Firestore document ID in crm_events/
 *    assignedAgentId    : string          ← Firestore document ID in crm_users/
 *    assignedAgentName  : string          ← denormalised for fast access
 *    nurtureMessageSent?: boolean
 *    nurtureMessageSentAt?: Timestamp
 *    nurtureMessageId?  : string          ← Twilio message SID, or "MOCK_..."
 *    nurtureDeliveryMode?: "live" | "mock"
 *
 * ── Message Template ──────────────────────────────────────────────────────────
 *
 *  "Hi [Client Name], it was great meeting you at [Event Name] today!
 *   As promised, here is the exclusive brochure for [Project Name].
 *   Let's connect tomorrow. - [Agent Name], PSI."
 *
 * ── Deploy ────────────────────────────────────────────────────────────────────
 *
 *  cd functions && npm run build
 *  firebase deploy --only functions:onLeadQualified
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
exports.onLeadQualified = exports.compileNurtureMessage = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const https = __importStar(require("https"));
// ── Message template ──────────────────────────────────────────────────────────
/**
 * compileNurtureMessage
 * ─────────────────────
 * Pure function. No side-effects — templating lives here to keep it
 * independently unit-testable.
 */
function compileNurtureMessage(params) {
    const { clientFirstName, eventName, projectName, agentName, brochureUrl } = params;
    const brochureLine = brochureUrl
        ? `\n\n📎 *Exclusive Brochure:* ${brochureUrl}`
        : '';
    return (`Hi ${clientFirstName} 👋, it was great meeting you at *${eventName}* today!\n\n` +
        `As promised, here is the exclusive brochure for *${projectName}*.${brochureLine}\n\n` +
        `Let's connect tomorrow to discuss your investment options in detail.\n\n` +
        `- *${agentName}*, PSI — Property Shop Investment 🏠`);
}
exports.compileNurtureMessage = compileNurtureMessage;
// ── Twilio HTTP helper ────────────────────────────────────────────────────────
/**
 * callTwilioWhatsApp
 * ──────────────────
 * Issues a synchronous POST to the Twilio Messages API using Node's native
 * `https` module (zero extra dependencies).
 *
 * Twilio WhatsApp API endpoint:
 *   POST https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Messages.json
 *
 * Returns the parsed JSON response from Twilio (including the message SID).
 */
async function callTwilioWhatsApp(accountSid, authToken, from, to, body) {
    const endpoint = `/2010-04-01/Accounts/${accountSid}/Messages.json`;
    // Twilio expects application/x-www-form-urlencoded
    const postData = new URLSearchParams({ From: from, To: to, Body: body }).toString();
    return new Promise((resolve, reject) => {
        const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
        const options = {
            hostname: 'api.twilio.com',
            port: 443,
            path: endpoint,
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData),
            },
        };
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (res.statusCode && res.statusCode >= 400) {
                        reject(new Error(`Twilio API error ${res.statusCode}: ` +
                            `[${parsed.error_code}] ${parsed.error_message || data}`));
                    }
                    else {
                        resolve(parsed);
                    }
                }
                catch (_a) {
                    reject(new Error(`Failed to parse Twilio API response: ${data}`));
                }
            });
        });
        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}
// ── Dispatch router: live vs. mock ────────────────────────────────────────────
/**
 * dispatchWhatsAppMessage
 * ───────────────────────
 * Routes to Twilio live API or mock mode based on env variable presence.
 *
 * MOCK MODE:
 *   - Logs the full payload via functions.logger (visible in Firebase Console).
 *   - Writes the payload to `nurture_message_log/{auto-id}` in Firestore
 *     so the delivery history is visible in the PSI admin console.
 *   - Returns a deterministic mock SID: "MOCK_{leadId}_{timestamp}".
 *
 * LIVE MODE:
 *   - Calls the real Twilio WhatsApp API.
 *   - Returns the Twilio message SID.
 */
async function dispatchWhatsAppMessage(payload) {
    var _a, _b, _c;
    const accountSid = (_a = process.env.TWILIO_ACCOUNT_SID) !== null && _a !== void 0 ? _a : '';
    const authToken = (_b = process.env.TWILIO_AUTH_TOKEN) !== null && _b !== void 0 ? _b : '';
    const fromNumber = (_c = process.env.TWILIO_WHATSAPP_FROM) !== null && _c !== void 0 ? _c : '';
    const isLiveMode = Boolean(accountSid && authToken && fromNumber);
    // ── MOCK MODE ─────────────────────────────────────────────────────────────
    if (!isLiveMode) {
        const mockSid = `MOCK_${payload.leadId}_${Date.now()}`;
        functions.logger.info('─────────────────────────────────────────────────────────');
        functions.logger.info('[LeadNurture] 🟡 MOCK MODE — Twilio credentials not configured.');
        functions.logger.info('[LeadNurture] Full WhatsApp message payload:', {
            deliveryMode: 'mock',
            messageSid: mockSid,
            to: payload.to,
            from: 'whatsapp:+14155238886 (MOCK — Twilio Sandbox)',
            leadId: payload.leadId,
            clientName: payload.clientName,
            agentName: payload.agentName,
            eventName: payload.eventName,
            projectInterest: payload.projectInterest,
            compiledAt: payload.compiledAt,
            messageBody: payload.body,
        });
        functions.logger.info('─────────────────────────────────────────────────────────');
        // Persist mock record to Firestore for Admin Console visibility
        await admin.firestore().collection('nurture_message_log').add(Object.assign(Object.assign({}, payload), { messageSid: mockSid, deliveryMode: 'mock', loggedAt: admin.firestore.FieldValue.serverTimestamp(), twilioNote: 'Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_FROM env vars to enable live delivery.' }));
        return { messageSid: mockSid, mode: 'mock' };
    }
    // ── LIVE MODE ─────────────────────────────────────────────────────────────
    functions.logger.info('[LeadNurture] 🟢 LIVE MODE — Dispatching to Twilio WhatsApp API', {
        leadId: payload.leadId,
        to: payload.to,
        from: fromNumber,
    });
    const response = await callTwilioWhatsApp(accountSid, authToken, fromNumber, payload.to, payload.body);
    functions.logger.info('[LeadNurture] ✅ Twilio API response', {
        messageSid: response.sid,
        status: response.status,
        leadId: payload.leadId,
    });
    // Persist live record too (for audit completeness)
    await admin.firestore().collection('nurture_message_log').add(Object.assign(Object.assign({}, payload), { messageSid: response.sid, deliveryMode: 'live', twilioStatus: response.status, loggedAt: admin.firestore.FieldValue.serverTimestamp() }));
    return { messageSid: response.sid, mode: 'live' };
}
// ── Audit helper ──────────────────────────────────────────────────────────────
async function writeAuditLog(actionType, details, extra) {
    await admin.firestore().collection('system_audit_logs').add(Object.assign({ timestamp: admin.firestore.FieldValue.serverTimestamp(), action_type: actionType, source: 'leadNurture', details }, extra));
}
// ── Cloud Function: onLeadQualified ──────────────────────────────────────────
/**
 * onLeadQualified
 * ───────────────
 * Firestore trigger: crm_leads/{leadId}
 *
 * Fires on every CREATE and UPDATE to a document in the crm_leads collection.
 *
 * The gate conditions (all must be true before sending a message):
 *   ① The new status value is "Qualified"
 *   ② The status has actually changed (not just another field update)
 *      → Prevents duplicate sends if the document is re-saved without change
 *   ③ `projectInterest` is a non-empty string
 *   ④ `phone` is a non-empty string
 *   ⑤ `nurtureMessageSent` is not already true
 *      → Idempotency guard — prevents re-sending if the trigger fires twice
 */
exports.onLeadQualified = functions
    .runWith({
    timeoutSeconds: 60,
    memory: '256MB',
    // Retry policy: do NOT retry automatically — WhatsApp messages must
    // not be sent twice if the function times out after already delivering.
    failurePolicy: false,
})
    .firestore
    .document('crm_leads/{leadId}')
    .onWrite(async (change, context) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
    const leadId = context.params.leadId;
    // ── Detect deletion (no-op) ───────────────────────────────────────────
    if (!change.after.exists) {
        functions.logger.info(`[LeadNurture] Lead "${leadId}" was deleted. Skipping.`);
        return null;
    }
    const after = change.after.data();
    const before = change.before.exists
        ? change.before.data()
        : null;
    const newStatus = after.status;
    const oldStatus = (_a = before === null || before === void 0 ? void 0 : before.status) !== null && _a !== void 0 ? _a : null;
    const phone = (_b = after.phone) !== null && _b !== void 0 ? _b : '';
    const projectName = (_c = after.projectInterest) !== null && _c !== void 0 ? _c : '';
    const alreadySent = after.nurtureMessageSent === true;
    functions.logger.info(`[LeadNurture] Evaluating lead "${leadId}"`, {
        leadId,
        oldStatus,
        newStatus,
        projectInterest: projectName,
        alreadySent,
    });
    // ── Gate ① — Must be Qualified ────────────────────────────────────────
    if (newStatus !== 'Qualified') {
        functions.logger.info(`[LeadNurture] Lead "${leadId}" is not Qualified (status: ${newStatus}). Skipping.`);
        return null;
    }
    // ── Gate ② — Status must have actually changed to Qualified ───────────
    if (oldStatus === 'Qualified') {
        functions.logger.info(`[LeadNurture] Lead "${leadId}" was already Qualified before this write. Skipping.`);
        return null;
    }
    // ── Gate ③ — Must have a projectInterest ─────────────────────────────
    if (!projectName.trim()) {
        functions.logger.warn(`[LeadNurture] Lead "${leadId}" is Qualified but has no projectInterest. Skipping.`);
        await writeAuditLog('NURTURE_SKIPPED_NO_PROJECT', `Lead "${leadId}" qualified but has no projectInterest tag. WhatsApp not sent.`, { leadId });
        return null;
    }
    // ── Gate ④ — Must have a phone number ────────────────────────────────
    if (!phone.trim()) {
        functions.logger.warn(`[LeadNurture] Lead "${leadId}" is Qualified but has no phone number. Skipping.`);
        await writeAuditLog('NURTURE_SKIPPED_NO_PHONE', `Lead "${leadId}" qualified but has no phone number. WhatsApp not sent.`, { leadId });
        return null;
    }
    // ── Gate ⑤ — Idempotency guard ────────────────────────────────────────
    if (alreadySent) {
        functions.logger.info(`[LeadNurture] Idempotency guard: Lead "${leadId}" already had nurture message sent. Skipping.`);
        return null;
    }
    // ─────────────────────────────────────────────────────────────────────
    // ALL GATES PASSED — compile and send the WhatsApp message
    // ─────────────────────────────────────────────────────────────────────
    const clientFirstName = (_d = after.firstName) !== null && _d !== void 0 ? _d : 'Valued Client';
    const clientFullName = `${(_e = after.firstName) !== null && _e !== void 0 ? _e : ''} ${(_f = after.lastName) !== null && _f !== void 0 ? _f : ''}`.trim();
    const agentName = (_g = after.assignedAgentName) !== null && _g !== void 0 ? _g : 'Your PSI Agent';
    const eventId = (_h = after.eventId) !== null && _h !== void 0 ? _h : '';
    // ── Resolve event name from Firestore ─────────────────────────────────
    let eventName = 'our PSI Event';
    let brochureUrl;
    if (eventId) {
        try {
            const eventSnap = await admin.firestore()
                .collection('crm_events')
                .doc(eventId)
                .get();
            if (eventSnap.exists) {
                const eventData = eventSnap.data();
                eventName = (_j = eventData.name) !== null && _j !== void 0 ? _j : eventName;
            }
        }
        catch (err) {
            functions.logger.warn(`[LeadNurture] Could not fetch event "${eventId}":`, err);
            // Non-fatal — use fallback event name
        }
    }
    // ── Optionally resolve brochure link if agent sent one ────────────────
    // Look up the most recent brochure_token sent to this client by this agent.
    // This links the Digital Goodie Bag system to the lead nurture pipeline.
    if (after.assignedAgentId && after.email) {
        try {
            const tokenSnap = await admin.firestore()
                .collection('brochure_tokens')
                .where('agentId', '==', after.assignedAgentId)
                .where('clientEmail', '==', after.email)
                .orderBy('createdAt', 'desc')
                .limit(1)
                .get();
            if (!tokenSnap.empty) {
                const tokenDoc = tokenSnap.docs[0].data();
                if (tokenDoc.token) {
                    // In production use the CLIENT_PORTAL_BASE_URL env variable
                    const baseUrl = (_k = process.env.CLIENT_PORTAL_BASE_URL) !== null && _k !== void 0 ? _k : 'https://psi-events.web.app';
                    brochureUrl = `${baseUrl}/client-portal/${tokenDoc.token}`;
                }
            }
        }
        catch (_m) {
            // Brochure link is a nice-to-have — never block the WhatsApp send
        }
    }
    // ── Compile the personalized message ──────────────────────────────────
    const messageBody = compileNurtureMessage({
        clientFirstName,
        eventName,
        projectName,
        agentName,
        brochureUrl,
    });
    // Format phone to WhatsApp E.164 format
    // Twilio WhatsApp requires: "whatsapp:+XXXXXXXXXXX"
    const rawPhone = phone.startsWith('+') ? phone : `+${phone}`;
    const whatsappTo = rawPhone.startsWith('whatsapp:')
        ? rawPhone
        : `whatsapp:${rawPhone}`;
    const payload = {
        to: whatsappTo,
        from: (_l = process.env.TWILIO_WHATSAPP_FROM) !== null && _l !== void 0 ? _l : 'whatsapp:+14155238886',
        body: messageBody,
        leadId,
        clientName: clientFullName,
        agentName,
        eventName,
        projectInterest: projectName,
        compiledAt: new Date().toISOString(),
        deliveryMode: (process.env.TWILIO_ACCOUNT_SID
            && process.env.TWILIO_AUTH_TOKEN
            && process.env.TWILIO_WHATSAPP_FROM)
            ? 'live'
            : 'mock',
    };
    functions.logger.info('[LeadNurture] Compiled WhatsApp payload', {
        leadId,
        to: payload.to,
        clientName: clientFullName,
        agentName,
        eventName,
        projectInterest: projectName,
        deliveryMode: payload.deliveryMode,
        brochureUrl: brochureUrl !== null && brochureUrl !== void 0 ? brochureUrl : '(none)',
        messageBody,
    });
    // ── Dispatch ──────────────────────────────────────────────────────────
    let messageSid;
    let deliveryMode;
    try {
        const result = await dispatchWhatsAppMessage(payload);
        messageSid = result.messageSid;
        deliveryMode = result.mode;
    }
    catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        functions.logger.error(`[LeadNurture] ❌ Dispatch failed for lead "${leadId}":`, errMsg);
        await writeAuditLog('NURTURE_DISPATCH_FAILED', `WhatsApp dispatch failed for lead "${leadId}" (${clientFullName}): ${errMsg}`, { leadId, clientName: clientFullName, eventName, projectInterest: projectName });
        // Do NOT update nurtureMessageSent — allows retry on next status change
        throw err;
    }
    // ── Update lead document — mark message as sent ───────────────────────
    await change.after.ref.update({
        nurtureMessageSent: true,
        nurtureMessageSentAt: admin.firestore.FieldValue.serverTimestamp(),
        nurtureMessageId: messageSid,
        nurtureDeliveryMode: deliveryMode,
    });
    // ── Final audit log ───────────────────────────────────────────────────
    await writeAuditLog('NURTURE_WHATSAPP_SENT', `WhatsApp nurture message sent to "${clientFullName}" for project "${projectName}" at event "${eventName}".`, {
        leadId,
        messageSid,
        deliveryMode,
        to: whatsappTo,
        agentName,
        eventName,
        projectInterest: projectName,
        brochureUrl: brochureUrl !== null && brochureUrl !== void 0 ? brochureUrl : null,
    });
    functions.logger.info(`[LeadNurture] ✅ Lead "${leadId}" — WhatsApp message queued. ` +
        `SID: ${messageSid} | Mode: ${deliveryMode.toUpperCase()} | ` +
        `To: ${whatsappTo} | Event: ${eventName} | Project: ${projectName}`);
    return null;
});
//# sourceMappingURL=leadNurture.js.map