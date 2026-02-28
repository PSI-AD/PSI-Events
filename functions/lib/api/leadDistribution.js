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
exports.distributeLeads = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const authMiddleware_1 = require("../middleware/authMiddleware");
// ── Constants ────────────────────────────────────────────────────────────────
const ENDPOINT = '/api/v1/leads/distribute';
// ── Helper: write a structured audit log ─────────────────────────────────────
async function auditLog(actionType, details, extra) {
    await admin.firestore().collection('system_audit_logs').add(Object.assign({ timestamp: admin.firestore.FieldValue.serverTimestamp(), action_type: actionType, details, endpoint: ENDPOINT }, extra));
}
// ── Helper: validate a single lead payload ────────────────────────────────────
function validateLead(lead) {
    var _a;
    const required = ['leadId', 'firstName', 'lastName', 'email', 'phone', 'source'];
    for (const field of required) {
        if (!lead[field] || String(lead[field]).trim() === '') {
            return `Missing required lead field: "${field}"`;
        }
    }
    // Basic e-mail sanity check
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test((_a = lead.email) !== null && _a !== void 0 ? _a : '')) {
        return `Invalid email format for lead "${lead.leadId}": ${lead.email}`;
    }
    return null; // valid
}
// ── Helper: route ONE lead to ONE agent (or queue) using Firestore transaction
// Returns the distribution result for that lead.
async function distributeSingleLead(db, eventRef, lead, verifiedAgents) {
    const leadRef = db.collection('crm_leads').doc(lead.leadId);
    // ── Failsafe: no verified agents available ───────────────────────────────
    if (verifiedAgents.length === 0) {
        const queueRef = db.collection('manager_unassigned_queue').doc(lead.leadId);
        await queueRef.set(Object.assign(Object.assign({}, lead), { status: 'UNASSIGNED_NO_AGENTS', queuedAt: admin.firestore.FieldValue.serverTimestamp(), reason: 'No approved and verified agents found for this event.' }));
        functions.logger.warn(`[LeadDistribution] FAILSAFE — lead "${lead.leadId}" routed to manager_unassigned_queue. No verified agents for event.`);
        await auditLog('LEAD_QUEUED_NO_AGENTS', `Lead "${lead.leadId}" (${lead.firstName} ${lead.lastName}) could not be assigned — no verified agents.`, { leadId: lead.leadId, source: lead.source });
        return {
            leadId: lead.leadId,
            assignedAgentId: 'UNASSIGNED',
            assignedAgentName: 'Manager Queue',
            status: 'queued',
        };
    }
    // ── Round-robin assignment inside a Firestore transaction ────────────────
    // Using a transaction guarantees that concurrent webhook calls never assign
    // the same cursor value, preventing duplicate assignments under load.
    const assignedAgent = await db.runTransaction(async (txn) => {
        var _a, _b;
        const eventSnap = await txn.get(eventRef);
        const currentIndex = eventSnap.exists
            ? ((_b = (_a = eventSnap.data()) === null || _a === void 0 ? void 0 : _a.roundRobinIndex) !== null && _b !== void 0 ? _b : 0)
            : 0;
        // Wrap around when we exceed the roster length
        const nextIndex = (currentIndex + 1) % verifiedAgents.length;
        const agent = verifiedAgents[currentIndex % verifiedAgents.length];
        // Advance the cursor for the next lead
        txn.set(eventRef, { roundRobinIndex: nextIndex, lastLeadAssignedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
        // Write the assigned lead document
        txn.set(leadRef, Object.assign(Object.assign({}, lead), { assignedAgentId: agent.agentId, assignedAgentName: agent.name, assignedAgentEmail: agent.email, assignedAt: admin.firestore.FieldValue.serverTimestamp(), status: 'ASSIGNED', distributionMethod: 'ROUND_ROBIN' }));
        return agent;
    });
    functions.logger.info(`[LeadDistribution] Lead "${lead.leadId}" → Agent "${assignedAgent.name}" (${assignedAgent.agentId})`);
    await auditLog('LEAD_ASSIGNED', `Lead "${lead.leadId}" (${lead.firstName} ${lead.lastName}) assigned to ${assignedAgent.name} via round-robin.`, {
        leadId: lead.leadId,
        assignedAgentId: assignedAgent.agentId,
        source: lead.source,
    });
    return {
        leadId: lead.leadId,
        assignedAgentId: assignedAgent.agentId,
        assignedAgentName: assignedAgent.name,
        status: 'assigned',
    };
}
// ── Cloud Function ────────────────────────────────────────────────────────────
exports.distributeLeads = functions.https.onRequest(async (req, res) => {
    await (0, authMiddleware_1.verifyAuthToken)(req, res, async () => {
        var _a;
        // ── 1. Method guard ──────────────────────────────────────────────────────
        if (req.method !== 'POST') {
            res.status(405).json({ status: 'error', message: 'Method Not Allowed. Use POST.' });
            return;
        }
        const { eventId, leads } = req.body;
        // ── 2. Top-level payload validation ─────────────────────────────────────
        if (!eventId || typeof eventId !== 'string' || eventId.trim() === '') {
            res.status(400).json({ status: 'error', message: 'Missing or invalid field: "eventId"' });
            return;
        }
        if (!Array.isArray(leads) || leads.length === 0) {
            res.status(400).json({ status: 'error', message: '"leads" must be a non-empty array.' });
            return;
        }
        // Validate every lead before touching Firestore — fail fast, fail clean
        const validationErrors = [];
        for (const lead of leads) {
            const err = validateLead(lead);
            if (err)
                validationErrors.push({ leadId: lead.leadId, error: err });
        }
        if (validationErrors.length > 0) {
            await auditLog('LEAD_VALIDATION_ERROR', `${validationErrors.length} lead(s) failed validation in batch for event "${eventId}"`, { eventId, validationErrors });
            res.status(400).json({
                status: 'error',
                message: 'One or more leads failed validation.',
                validationErrors,
            });
            return;
        }
        const db = admin.firestore();
        const eventRef = db.collection('crm_events').doc(eventId);
        try {
            // ── 3. Fetch event & agent roster ──────────────────────────────────────
            const eventSnap = await eventRef.get();
            if (!eventSnap.exists) {
                await auditLog('LEAD_DISTRIBUTION_ERROR', `Event "${eventId}" not found in Firestore.`, { eventId });
                res.status(404).json({
                    status: 'error',
                    message: `Event "${eventId}" not found. Ensure it exists in crm_events.`,
                });
                return;
            }
            const eventData = eventSnap.data();
            const allAgents = (_a = eventData.agents) !== null && _a !== void 0 ? _a : [];
            // ── 4. Filter to strictly approved AND verified agents only ───────────
            const verifiedAgents = allAgents.filter((a) => a.status === 'approved' && a.verified === true);
            functions.logger.info(`[LeadDistribution] Event "${eventId}" — ${allAgents.length} total agents, ` +
                `${verifiedAgents.length} verified. Processing ${leads.length} lead(s).`);
            // ── 5. Distribute each lead ────────────────────────────────────────────
            const results = [];
            for (const lead of leads) {
                const result = await distributeSingleLead(db, eventRef, lead, verifiedAgents);
                results.push(result);
            }
            // ── 6. Build summary ───────────────────────────────────────────────────
            const assigned = results.filter((r) => r.status === 'assigned').length;
            const queued = results.filter((r) => r.status === 'queued').length;
            await auditLog('LEAD_DISTRIBUTION_COMPLETE', `Batch complete for event "${eventId}": ${assigned} assigned, ${queued} queued.`, { eventId, assigned, queued, totalLeads: leads.length });
            res.status(200).json({
                status: 'success',
                message: `Lead distribution complete. ${assigned} assigned, ${queued} routed to manager queue.`,
                eventId,
                summary: { totalLeads: leads.length, assigned, queued },
                results,
            });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            functions.logger.error(`[LeadDistribution] Unhandled error for event "${eventId}":`, error);
            await auditLog('LEAD_DISTRIBUTION_INTERNAL_ERROR', `Unhandled exception during distribution for event "${eventId}": ${message}`, { eventId }).catch(() => { });
            res.status(500).json({
                status: 'error',
                message: 'Internal server error during lead distribution.',
            });
        }
    });
});
//# sourceMappingURL=leadDistribution.js.map