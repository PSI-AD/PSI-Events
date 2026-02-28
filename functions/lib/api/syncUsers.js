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
exports.syncUsers = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const authMiddleware_1 = require("../middleware/authMiddleware");
/**
 * syncUsers.ts
 * Endpoint: /api/v1/sync/users
 * Purpose: Upserts staff and hierarchy data from the CRM.
 * Strictly follows API_Postman_Collection.md
 */
exports.syncUsers = functions.https.onRequest(async (req, res) => {
    // Apply Auth Middleware
    await (0, authMiddleware_1.verifyAuthToken)(req, res, async () => {
        if (req.method !== 'POST') {
            res.status(405).json({ status: 'error', message: 'Method Not Allowed' });
            return;
        }
        const { crm_user_id, full_name, email, company_entity, branch_name, department, nationality, languages, manager_id } = req.body;
        // Basic Validation
        if (!crm_user_id || !full_name || !email || !manager_id) {
            res.status(400).json({ status: 'error', message: 'Missing required fields' });
            return;
        }
        try {
            const userRef = admin.firestore().collection('crm_users').doc(crm_user_id);
            const userData = {
                crm_user_id,
                full_name,
                email,
                company_entity,
                branch_name,
                department,
                nationality: nationality || null,
                languages: languages || [],
                manager_id,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            };
            await userRef.set(userData, { merge: true });
            // Log success (System_Audit_and_Error_Logging.md)
            await admin.firestore().collection('system_audit_logs').add({
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                action_type: 'CRM_SYNC_SUCCESS',
                details: `User profile upserted: ${crm_user_id}`,
                endpoint: '/api/v1/sync/users'
            });
            res.status(200).json({
                status: 'success',
                message: 'User profile upserted successfully.',
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            console.error('Error syncing user:', error);
            res.status(500).json({ status: 'error', message: 'Internal Server Error' });
        }
    });
});
//# sourceMappingURL=syncUsers.js.map