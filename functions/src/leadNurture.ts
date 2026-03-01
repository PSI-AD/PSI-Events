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

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as https from 'https';

// ── Types ─────────────────────────────────────────────────────────────────────

export type LeadStatus =
    | 'NEW'
    | 'Contacted'
    | 'Qualified'
    | 'Proposal_Sent'
    | 'Negotiation'
    | 'Won'
    | 'Lost'
    | 'ASSIGNED';

interface CRMLead {
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
    status: LeadStatus;
    projectInterest: string;          // project name or project Firestore ID
    eventId: string;
    assignedAgentId: string;
    assignedAgentName: string;
    nurtureMessageSent?: boolean;
    nurtureMessageSentAt?: admin.firestore.Timestamp;
    nurtureMessageId?: string;
    nurtureDeliveryMode?: 'live' | 'mock';
}

interface TwilioMessagePayload {
    to: string;            // WhatsApp number — e.g. "whatsapp:+971501234567"
    from: string;          // Twilio sandbox or production sender
    body: string;          // The WhatsApp message text
    leadId: string;
    clientName: string;
    agentName: string;
    eventName: string;
    projectInterest: string;
    compiledAt: string;
    deliveryMode: 'live' | 'mock';
}

interface TwilioApiResponse {
    sid: string;
    status: string;
    error_code?: string | null;
    error_message?: string | null;
}

// ── Message template ──────────────────────────────────────────────────────────

/**
 * compileNurtureMessage
 * ─────────────────────
 * Pure function. No side-effects — templating lives here to keep it
 * independently unit-testable.
 */
export function compileNurtureMessage(params: {
    clientFirstName: string;
    eventName: string;
    projectName: string;
    agentName: string;
    brochureUrl?: string;
}): string {
    const { clientFirstName, eventName, projectName, agentName, brochureUrl } = params;

    const brochureLine = brochureUrl
        ? `\n\n📎 *Exclusive Brochure:* ${brochureUrl}`
        : '';

    return (
        `Hi ${clientFirstName} 👋, it was great meeting you at *${eventName}* today!\n\n` +
        `As promised, here is the exclusive brochure for *${projectName}*.${brochureLine}\n\n` +
        `Let's connect tomorrow to discuss your investment options in detail.\n\n` +
        `- *${agentName}*, PSI — Property Shop Investment 🏠`
    );
}

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
async function callTwilioWhatsApp(
    accountSid: string,
    authToken: string,
    from: string,
    to: string,
    body: string
): Promise<TwilioApiResponse> {
    const endpoint = `/2010-04-01/Accounts/${accountSid}/Messages.json`;

    // Twilio expects application/x-www-form-urlencoded
    const postData = new URLSearchParams({ From: from, To: to, Body: body }).toString();

    return new Promise((resolve, reject) => {
        const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

        const options: https.RequestOptions = {
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
                    const parsed: TwilioApiResponse = JSON.parse(data);
                    if (res.statusCode && res.statusCode >= 400) {
                        reject(new Error(
                            `Twilio API error ${res.statusCode}: ` +
                            `[${parsed.error_code}] ${parsed.error_message || data}`
                        ));
                    } else {
                        resolve(parsed);
                    }
                } catch {
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
async function dispatchWhatsAppMessage(
    payload: TwilioMessagePayload
): Promise<{ messageSid: string; mode: 'live' | 'mock' }> {

    const accountSid = process.env.TWILIO_ACCOUNT_SID ?? '';
    const authToken = process.env.TWILIO_AUTH_TOKEN ?? '';
    const fromNumber = process.env.TWILIO_WHATSAPP_FROM ?? '';

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
        await admin.firestore().collection('nurture_message_log').add({
            ...payload,
            messageSid: mockSid,
            deliveryMode: 'mock',
            loggedAt: admin.firestore.FieldValue.serverTimestamp(),
            twilioNote: 'Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_FROM env vars to enable live delivery.',
        });

        return { messageSid: mockSid, mode: 'mock' };
    }

    // ── LIVE MODE ─────────────────────────────────────────────────────────────
    functions.logger.info('[LeadNurture] 🟢 LIVE MODE — Dispatching to Twilio WhatsApp API', {
        leadId: payload.leadId,
        to: payload.to,
        from: fromNumber,
    });

    const response = await callTwilioWhatsApp(
        accountSid,
        authToken,
        fromNumber,
        payload.to,
        payload.body
    );

    functions.logger.info('[LeadNurture] ✅ Twilio API response', {
        messageSid: response.sid,
        status: response.status,
        leadId: payload.leadId,
    });

    // Persist live record too (for audit completeness)
    await admin.firestore().collection('nurture_message_log').add({
        ...payload,
        messageSid: response.sid,
        deliveryMode: 'live',
        twilioStatus: response.status,
        loggedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { messageSid: response.sid, mode: 'live' };
}

// ── Audit helper ──────────────────────────────────────────────────────────────

async function writeAuditLog(
    actionType: string,
    details: string,
    extra?: Record<string, unknown>
): Promise<void> {
    await admin.firestore().collection('system_audit_logs').add({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        action_type: actionType,
        source: 'leadNurture',
        details,
        ...extra,
    });
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
export const onLeadQualified = functions
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

        const leadId = context.params.leadId;

        // ── Detect deletion (no-op) ───────────────────────────────────────────
        if (!change.after.exists) {
            functions.logger.info(`[LeadNurture] Lead "${leadId}" was deleted. Skipping.`);
            return null;
        }

        const after = change.after.data() as Partial<CRMLead>;
        const before = change.before.exists
            ? (change.before.data() as Partial<CRMLead>)
            : null;

        const newStatus = after.status;
        const oldStatus = before?.status ?? null;
        const phone = after.phone ?? '';
        const projectName = after.projectInterest ?? '';
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
            functions.logger.info(
                `[LeadNurture] Lead "${leadId}" is not Qualified (status: ${newStatus}). Skipping.`
            );
            return null;
        }

        // ── Gate ② — Status must have actually changed to Qualified ───────────
        if (oldStatus === 'Qualified') {
            functions.logger.info(
                `[LeadNurture] Lead "${leadId}" was already Qualified before this write. Skipping.`
            );
            return null;
        }

        // ── Gate ③ — Must have a projectInterest ─────────────────────────────
        if (!projectName.trim()) {
            functions.logger.warn(
                `[LeadNurture] Lead "${leadId}" is Qualified but has no projectInterest. Skipping.`
            );
            await writeAuditLog(
                'NURTURE_SKIPPED_NO_PROJECT',
                `Lead "${leadId}" qualified but has no projectInterest tag. WhatsApp not sent.`,
                { leadId }
            );
            return null;
        }

        // ── Gate ④ — Must have a phone number ────────────────────────────────
        if (!phone.trim()) {
            functions.logger.warn(
                `[LeadNurture] Lead "${leadId}" is Qualified but has no phone number. Skipping.`
            );
            await writeAuditLog(
                'NURTURE_SKIPPED_NO_PHONE',
                `Lead "${leadId}" qualified but has no phone number. WhatsApp not sent.`,
                { leadId }
            );
            return null;
        }

        // ── Gate ⑤ — Idempotency guard ────────────────────────────────────────
        if (alreadySent) {
            functions.logger.info(
                `[LeadNurture] Idempotency guard: Lead "${leadId}" already had nurture message sent. Skipping.`
            );
            return null;
        }

        // ─────────────────────────────────────────────────────────────────────
        // ALL GATES PASSED — compile and send the WhatsApp message
        // ─────────────────────────────────────────────────────────────────────

        const clientFirstName = after.firstName ?? 'Valued Client';
        const clientFullName = `${after.firstName ?? ''} ${after.lastName ?? ''}`.trim();
        const agentName = after.assignedAgentName ?? 'Your PSI Agent';
        const eventId = after.eventId ?? '';

        // ── Resolve event name from Firestore ─────────────────────────────────
        let eventName = 'our PSI Event';
        let brochureUrl: string | undefined;

        if (eventId) {
            try {
                const eventSnap = await admin.firestore()
                    .collection('crm_events')
                    .doc(eventId)
                    .get();

                if (eventSnap.exists) {
                    const eventData = eventSnap.data() as { name?: string;[key: string]: unknown };
                    eventName = eventData.name ?? eventName;
                }
            } catch (err) {
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
                    const tokenDoc = tokenSnap.docs[0].data() as { token?: string };
                    if (tokenDoc.token) {
                        // In production use the CLIENT_PORTAL_BASE_URL env variable
                        const baseUrl = process.env.CLIENT_PORTAL_BASE_URL
                            ?? 'https://psi-events.web.app';
                        brochureUrl = `${baseUrl}/client-portal/${tokenDoc.token}`;
                    }
                }
            } catch {
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

        const payload: TwilioMessagePayload = {
            to: whatsappTo,
            from: process.env.TWILIO_WHATSAPP_FROM ?? 'whatsapp:+14155238886',
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
            brochureUrl: brochureUrl ?? '(none)',
            messageBody,
        });

        // ── Dispatch ──────────────────────────────────────────────────────────
        let messageSid: string;
        let deliveryMode: 'live' | 'mock';

        try {
            const result = await dispatchWhatsAppMessage(payload);
            messageSid = result.messageSid;
            deliveryMode = result.mode;
        } catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err);
            functions.logger.error(`[LeadNurture] ❌ Dispatch failed for lead "${leadId}":`, errMsg);

            await writeAuditLog(
                'NURTURE_DISPATCH_FAILED',
                `WhatsApp dispatch failed for lead "${leadId}" (${clientFullName}): ${errMsg}`,
                { leadId, clientName: clientFullName, eventName, projectInterest: projectName }
            );

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
        await writeAuditLog(
            'NURTURE_WHATSAPP_SENT',
            `WhatsApp nurture message sent to "${clientFullName}" for project "${projectName}" at event "${eventName}".`,
            {
                leadId,
                messageSid,
                deliveryMode,
                to: whatsappTo,
                agentName,
                eventName,
                projectInterest: projectName,
                brochureUrl: brochureUrl ?? null,
            }
        );

        functions.logger.info(
            `[LeadNurture] ✅ Lead "${leadId}" — WhatsApp message queued. ` +
            `SID: ${messageSid} | Mode: ${deliveryMode.toUpperCase()} | ` +
            `To: ${whatsappTo} | Event: ${eventName} | Project: ${projectName}`
        );

        return null;
    });
