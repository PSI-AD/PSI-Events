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
exports.verifyAuthToken = void 0;
const admin = __importStar(require("firebase-admin"));
/**
 * authMiddleware.ts
 * Intercepts incoming requests to verify the Authorization: Bearer <token> header.
 * Strictly follows API_Postman_Collection.md and System_Audit_and_Error_Logging.md
 */
const verifyAuthToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.warn('Unauthorized access attempt: Missing or invalid Authorization header.');
        // Log the failed attempt (System_Audit_and_Error_Logging.md)
        await admin.firestore().collection('system_audit_logs').add({
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            action_type: 'UNAUTHORIZED_API_ATTEMPT',
            details: 'Missing or invalid Bearer token',
            ip: req.ip,
            path: req.path
        });
        res.status(401).json({
            status: 'error',
            message: 'Unauthorized. Valid JWT Bearer Token required.'
        });
        return;
    }
    const token = authHeader.split('Bearer ')[1];
    // In a production environment, you would verify the JWT using admin.auth().verifyIdToken(token)
    // or check against a strictly mandated CRM_SYNC_TOKEN environment variable.
    const expectedToken = process.env.CRM_SYNC_TOKEN;
    if (expectedToken && token !== expectedToken) {
        console.error('Unauthorized access attempt: Token mismatch.');
        await admin.firestore().collection('system_audit_logs').add({
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            action_type: 'UNAUTHORIZED_API_ATTEMPT',
            details: 'Token mismatch',
            ip: req.ip,
            path: req.path
        });
        res.status(401).json({
            status: 'error',
            message: 'Unauthorized. Invalid token.'
        });
        return;
    }
    next();
};
exports.verifyAuthToken = verifyAuthToken;
//# sourceMappingURL=authMiddleware.js.map