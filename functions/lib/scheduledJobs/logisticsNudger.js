"use strict";
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
exports.logisticsNudger = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
// ── Constants ─────────────────────────────────────────────────────────────────
const DEADLINE_WARN_HOURS = 48; // nudge window in hours before documentDeadline
const FUNCTION_NAME = 'logisticsNudger';
// ── Helpers ───────────────────────────────────────────────────────────────────
/**
 * Write a structured entry to system_audit_logs (same pattern across all functions).
 */
async function auditLog(actionType, details, extra) {
    await admin.firestore().collection('system_audit_logs').add(Object.assign({ timestamp: admin.firestore.FieldValue.serverTimestamp(), action_type: actionType, details, source: FUNCTION_NAME }, extra));
}
/**
 * Identify which documents the agent is still missing.
 */
function getMissingDocs(agent) {
    const missing = [];
    if (!agent.flightUploaded)
        missing.push('Flight Details');
    if (!agent.visaUploaded)
        missing.push('Visa Copy');
    return missing;
}
/**
 * Build the EXACT payload structure that Twilio's WhatsApp Messages API expects.
 * Endpoint: POST https://api.twilio.com/2010-04-01/Accounts/{SID}/Messages.json
 * Auth: HTTP Basic — AccountSid:AuthToken
 * Docs: https://www.twilio.com/docs/whatsapp/api
 */
function buildTwilioPayload(nc) {
    var _a;
    const { agent, event, missingDocs, hoursUntilDeadline } = nc;
    const docList = missingDocs.join(' and ');
    const urgencyTag = hoursUntilDeadline <= 24 ? '🔴 CRITICAL' : '🟡 URGENT';
    return {
        From: (_a = process.env.TWILIO_WHATSAPP_FROM) !== null && _a !== void 0 ? _a : 'whatsapp:+14155238886',
        To: `whatsapp:${agent.phone}`,
        Body: [
            `${urgencyTag} — PSI Event Portal`,
            ``,
            `Dear ${agent.agentName},`,
            ``,
            `Your ${docList} for the upcoming roadshow:`,
            `📍 *${event.eventName}*`,
            ``,
            `…is MISSING. You must upload immediately or your spot will be REVOKED.`,
            ``,
            `⏰ Deadline in ${Math.ceil(hoursUntilDeadline)} hours.`,
            ``,
            `▶ Upload now: https://psievents-pro.web.app/events`,
            ``,
            `— PSI Event Management Portal`,
        ].join('\n'),
    };
}
/**
 * Build the EXACT payload structure that SendGrid's v3 Mail Send API expects.
 * Endpoint: POST https://api.sendgrid.com/v3/mail/send
 * Auth: Bearer <SENDGRID_API_KEY>
 * Docs: https://docs.sendgrid.com/api-reference/mail-send/mail-send
 */
function buildSendGridPayload(nc) {
    var _a;
    const { agent, event, missingDocs, hoursUntilDeadline } = nc;
    const docList = missingDocs.join(' &amp; ');
    const fromEmail = (_a = process.env.SENDGRID_FROM_EMAIL) !== null && _a !== void 0 ? _a : 'noreply@psi-events.ae';
    const urgencyLabel = hoursUntilDeadline <= 24 ? 'CRITICAL' : 'URGENT';
    return {
        personalizations: [
            {
                to: [{ email: agent.email, name: agent.agentName }],
                subject: `[${urgencyLabel}] Missing ${docList} — ${event.eventName}`,
            },
        ],
        from: { email: fromEmail, name: 'PSI Event Portal' },
        reply_to: { email: fromEmail, name: 'PSI Event Management' },
        content: [
            {
                type: 'text/html',
                value: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Urgent: Missing Event Documentation</title>
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0f172a;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0"
               style="background:#1e293b;border-radius:16px;overflow:hidden;max-width:600px;">

          <!-- Header Banner -->
          <tr>
            <td style="background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%);
                       padding:32px;border-bottom:3px solid #f59e0b;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="color:#f59e0b;font-size:11px;font-weight:700;
                               letter-spacing:3px;text-transform:uppercase;margin:0 0 8px;">
                      Property Shop Investment LLC
                    </p>
                    <h1 style="color:#ffffff;font-size:24px;font-weight:800;margin:0;
                                letter-spacing:-0.5px;">
                      ⚠️ Action Required
                    </h1>
                    <p style="color:#94a3b8;font-size:14px;margin:8px 0 0;">
                      Missing documentation for upcoming roadshow
                    </p>
                  </td>
                  <td align="right">
                    <div style="background:${hoursUntilDeadline <= 24 ? '#dc2626' : '#d97706'};
                                color:#fff;padding:8px 16px;border-radius:8px;
                                font-size:12px;font-weight:700;white-space:nowrap;">
                      ${urgencyLabel}<br>
                      ${Math.ceil(hoursUntilDeadline)}h remaining
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="color:#e2e8f0;font-size:15px;line-height:1.6;margin:0 0 20px;">
                Dear <strong style="color:#f59e0b;">${agent.agentName}</strong>,
              </p>
              <p style="color:#e2e8f0;font-size:15px;line-height:1.6;margin:0 0 24px;">
                You have been approved by your manager for the following roadshow event,
                but your submission is <strong style="color:#f87171;">incomplete</strong>:
              </p>

              <!-- Event Card -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="background:#0f172a;border-radius:12px;border-left:4px solid #f59e0b;
                            margin:0 0 24px;">
                <tr>
                  <td style="padding:20px;">
                    <p style="color:#64748b;font-size:11px;font-weight:700;
                               text-transform:uppercase;letter-spacing:2px;margin:0 0 6px;">
                      Event
                    </p>
                    <p style="color:#ffffff;font-size:18px;font-weight:700;margin:0 0 16px;">
                      ${event.eventName}
                    </p>
                    <p style="color:#64748b;font-size:11px;font-weight:700;
                               text-transform:uppercase;letter-spacing:2px;margin:0 0 6px;">
                      Missing Documents
                    </p>
                    <p style="color:#f87171;font-size:15px;font-weight:600;margin:0;">
                      ${docList}
                    </p>
                  </td>
                </tr>
              </table>

              <p style="color:#e2e8f0;font-size:15px;line-height:1.6;margin:0 0 8px;">
                <strong style="color:#f87171;">Your spot will be REVOKED</strong> if
                documents are not uploaded before the deadline.
              </p>
              <p style="color:#94a3b8;font-size:13px;margin:0 0 28px;">
                Deadline: <strong style="color:#f59e0b;">${Math.ceil(hoursUntilDeadline)} hours from now</strong>
              </p>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background:#f59e0b;border-radius:10px;">
                    <a href="https://psievents-pro.web.app/events"
                       style="display:block;padding:14px 32px;color:#0f172a;
                              font-size:15px;font-weight:800;text-decoration:none;
                              letter-spacing:-0.3px;">
                      ▶ Upload Documents Now →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #334155;">
              <p style="color:#475569;font-size:12px;margin:0;text-align:center;">
                This is an automated compliance notification from the PSI Event Portal.
                Do not reply to this email. Contact your branch manager for assistance.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
        `.trim(),
            },
        ],
        tracking_settings: {
            click_tracking: { enable: true },
            open_tracking: { enable: true },
        },
        categories: ['logistics-nudge', 'compliance', event.eventId],
    };
}
/**
 * Send the notification.
 * In DRY_RUN mode (NUDGER_DRY_RUN=true): only logs — never calls external APIs.
 * In LIVE mode: calls Twilio + SendGrid over HTTPS.
 *
 * Returns { whatsappSent, emailSent } booleans for the audit record.
 */
async function sendNudge(nc, dryRun) {
    const twilioPayload = buildTwilioPayload(nc);
    const sendGridPayload = buildSendGridPayload(nc);
    // Always log the structured payload for observability
    functions.logger.info(`[${FUNCTION_NAME}] Nudge payload for ${nc.agent.agentName}:`, {
        dryRun,
        twilioTo: twilioPayload.To,
        emailTo: nc.agent.email,
        eventName: nc.event.eventName,
        missingDocs: nc.missingDocs,
        hoursLeft: Math.ceil(nc.hoursUntilDeadline),
    });
    if (dryRun) {
        functions.logger.warn(`[${FUNCTION_NAME}] DRY RUN — skipping live API calls for agent "${nc.agent.agentName}".`);
        return { whatsappSent: false, emailSent: false };
    }
    // ── Twilio WhatsApp ─────────────────────────────────────────────────────────
    let whatsappSent = false;
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN;
    if (twilioSid && twilioToken) {
        try {
            const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
            const formBody = new URLSearchParams(twilioPayload).toString();
            const credentials = Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64');
            const twilioRes = await fetch(twilioUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${credentials}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formBody,
            });
            if (!twilioRes.ok) {
                const errText = await twilioRes.text();
                functions.logger.error(`[${FUNCTION_NAME}] Twilio error for ${nc.agent.agentName}: ${twilioRes.status} — ${errText}`);
            }
            else {
                whatsappSent = true;
                functions.logger.info(`[${FUNCTION_NAME}] ✓ WhatsApp nudge sent → ${nc.agent.phone}`);
            }
        }
        catch (err) {
            functions.logger.error(`[${FUNCTION_NAME}] Twilio fetch failed:`, err);
        }
    }
    else {
        functions.logger.warn(`[${FUNCTION_NAME}] Twilio credentials not configured — set twilio.account_sid and twilio.auth_token.`);
    }
    // ── SendGrid Email ─────────────────────────────────────────────────────────
    let emailSent = false;
    const sendGridKey = process.env.SENDGRID_API_KEY;
    if (sendGridKey) {
        try {
            const sgRes = await fetch('https://api.sendgrid.com/v3/mail/send', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${sendGridKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(sendGridPayload),
            });
            if (sgRes.status === 202) {
                emailSent = true;
                functions.logger.info(`[${FUNCTION_NAME}] ✓ Email nudge sent → ${nc.agent.email}`);
            }
            else {
                const errText = await sgRes.text();
                functions.logger.error(`[${FUNCTION_NAME}] SendGrid error for ${nc.agent.email}: ${sgRes.status} — ${errText}`);
            }
        }
        catch (err) {
            functions.logger.error(`[${FUNCTION_NAME}] SendGrid fetch failed:`, err);
        }
    }
    else {
        functions.logger.warn(`[${FUNCTION_NAME}] SendGrid API key not configured — set sendgrid.api_key.`);
    }
    return { whatsappSent, emailSent };
}
// ── Scheduled Cloud Function ──────────────────────────────────────────────────
exports.logisticsNudger = functions.pubsub
    .schedule('0 8 * * *') // 08:00 every day
    .timeZone('Asia/Dubai') // GST = UTC+4
    .onRun(async (context) => {
    var _a, _b, _c;
    const runId = context.timestamp; // ISO string — unique per invocation
    const db = admin.firestore();
    const dryRun = ((_a = process.env.NUDGER_DRY_RUN) !== null && _a !== void 0 ? _a : 'true') === 'true'; // safe default
    functions.logger.info(`[${FUNCTION_NAME}] Run started at ${runId} | dry_run=${dryRun}`);
    await auditLog('NUDGER_RUN_STARTED', `Daily logistics nudger triggered. dry_run=${dryRun}`, { runId });
    try {
        const now = Date.now();
        const deadlineWindowMs = DEADLINE_WARN_HOURS * 60 * 60 * 1000; // 48h in ms
        // ── 1. Fetch all upcoming events ──────────────────────────────────────
        const eventsSnap = await db
            .collection('crm_events')
            .where('status', 'in', ['upcoming', 'active', 'confirmed'])
            .get();
        if (eventsSnap.empty) {
            functions.logger.info(`[${FUNCTION_NAME}] No upcoming events found — nothing to do.`);
            await auditLog('NUDGER_RUN_COMPLETE', 'No upcoming events found.', { runId, nudgesSent: 0 });
            return;
        }
        functions.logger.info(`[${FUNCTION_NAME}] ${eventsSnap.docs.length} upcoming event(s) found.`);
        const nonCompliantList = [];
        // ── 2. For each event, check agent compliance ─────────────────────────
        for (const eventDoc of eventsSnap.docs) {
            const eventData = eventDoc.data();
            // Skip events without a documentDeadline
            if (!eventData.documentDeadline) {
                functions.logger.warn(`[${FUNCTION_NAME}] Event "${eventDoc.id}" has no documentDeadline — skipping.`);
                continue;
            }
            const deadlineMs = eventData.documentDeadline.toMillis();
            const msUntilDeadline = deadlineMs - now;
            // Only nudge if the deadline is in the future AND within 48-hour window
            if (msUntilDeadline <= 0 || msUntilDeadline > deadlineWindowMs) {
                functions.logger.info(`[${FUNCTION_NAME}] Event "${eventDoc.id}" outside nudge window — skipping.`);
                continue;
            }
            const hoursUntilDeadline = msUntilDeadline / (1000 * 60 * 60);
            const event = {
                eventId: eventDoc.id,
                eventName: (_b = eventData.eventName) !== null && _b !== void 0 ? _b : 'Unnamed Event',
                documentDeadline: eventData.documentDeadline,
                status: (_c = eventData.status) !== null && _c !== void 0 ? _c : 'upcoming',
            };
            functions.logger.info(`[${FUNCTION_NAME}] Event "${event.eventName}" has ${hoursUntilDeadline.toFixed(1)}h until deadline — scanning agents.`);
            // ── 3. Query the approvedAgents subcollection ─────────────────────
            const agentsSnap = await db
                .collection('crm_events')
                .doc(event.eventId)
                .collection('approvedAgents')
                .where('managerApproved', '==', true) // strictly approved by manager
                .get();
            for (const agentDoc of agentsSnap.docs) {
                const agent = agentDoc.data();
                const missingDocs = getMissingDocs(agent);
                // Agent is compliant — nothing to nudge
                if (missingDocs.length === 0)
                    continue;
                nonCompliantList.push({ agent, event, missingDocs, hoursUntilDeadline });
            }
        }
        // ── 4. Send nudges & record results ────────────────────────────────────
        functions.logger.info(`[${FUNCTION_NAME}] ${nonCompliantList.length} non-compliant agent(s) found.`);
        let totalWhatsApp = 0;
        let totalEmail = 0;
        let totalQueued = 0;
        for (const nc of nonCompliantList) {
            const { whatsappSent, emailSent } = await sendNudge(nc, dryRun);
            if (whatsappSent)
                totalWhatsApp++;
            if (emailSent)
                totalEmail++;
            // Write per-agent nudge log for deduplication & analytics
            const nudgeRef = db.collection('nudge_log').doc(`${nc.event.eventId}_${nc.agent.agentId}_${runId}`);
            await nudgeRef.set({
                runId,
                eventId: nc.event.eventId,
                eventName: nc.event.eventName,
                agentId: nc.agent.agentId,
                agentName: nc.agent.agentName,
                agentEmail: nc.agent.email,
                agentPhone: nc.agent.phone,
                missingDocs: nc.missingDocs,
                hoursUntilDeadline: nc.hoursUntilDeadline,
                whatsappSent,
                emailSent,
                dryRun,
                nudgedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            await auditLog('NUDGE_SENT', `Agent "${nc.agent.agentName}" nudged for event "${nc.event.eventName}". Missing: ${nc.missingDocs.join(', ')}.`, {
                runId,
                eventId: nc.event.eventId,
                agentId: nc.agent.agentId,
                missingDocs: nc.missingDocs,
                whatsappSent,
                emailSent,
                dryRun,
            });
            totalQueued++;
        }
        // ── 5. Final run summary ──────────────────────────────────────────────
        const summary = {
            totalNonCompliant: nonCompliantList.length,
            whatsAppNudgesSent: totalWhatsApp,
            emailNudgesSent: totalEmail,
            dryRunSkipped: dryRun ? totalQueued : 0,
        };
        functions.logger.info(`[${FUNCTION_NAME}] Run complete.`, summary);
        await auditLog('NUDGER_RUN_COMPLETE', `Daily logistics nudger finished. ${totalQueued} agent(s) processed.`, Object.assign({ runId }, summary));
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        functions.logger.error(`[${FUNCTION_NAME}] Fatal error:`, error);
        await auditLog('NUDGER_RUN_ERROR', `Logistics nudger crashed: ${message}`, { runId }).catch(() => { });
    }
});
//# sourceMappingURL=logisticsNudger.js.map