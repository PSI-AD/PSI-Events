import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { verifyAuthToken } from '../middleware/authMiddleware';

/**
 * syncProjects.ts
 * Endpoint: /api/v1/sync/projects
 * Purpose: Syncs property inventory from PSI Maps.
 * Strictly follows API_Postman_Collection.md and System_Audit_and_Error_Logging.md
 */

const VALID_TIERS = ['Luxury', 'Medium', 'Average'];

export const syncProjects = functions.https.onRequest(async (req, res) => {
  // Apply Auth Middleware
  await verifyAuthToken(req, res, async () => {
    if (req.method !== 'POST') {
      res.status(405).json({ status: 'error', message: 'Method Not Allowed' });
      return;
    }

    const {
      project_id,
      developer_name,
      project_name,
      project_tier,
      status
    } = req.body;

    // 1. Strict Payload Validation (System_Audit_and_Error_Logging.md)
    if (!VALID_TIERS.includes(project_tier)) {
      const errorMessage = `Invalid project_tier: ${project_tier}. Must be Luxury, Medium, or Average.`;
      
      // Log Data Validation Error
      await admin.firestore().collection('system_audit_logs').add({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        action_type: 'DATA_VALIDATION_ERROR',
        details: errorMessage,
        payload: req.body,
        endpoint: '/api/v1/sync/projects'
      });

      res.status(400).json({
        status: 'error',
        message: errorMessage
      });
      return;
    }

    // Basic Field Presence Check
    if (!project_id || !developer_name || !project_name || !status) {
      res.status(400).json({ status: 'error', message: 'Missing required fields' });
      return;
    }

    try {
      const projectRef = admin.firestore().collection('crm_projects').doc(project_id);
      
      const projectData = {
        project_id,
        developer_name,
        project_name,
        project_tier,
        status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await projectRef.set(projectData, { merge: true });

      // Log success (System_Audit_and_Error_Logging.md)
      await admin.firestore().collection('system_audit_logs').add({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        action_type: 'CRM_SYNC_SUCCESS',
        details: `Project inventory synced: ${project_id}`,
        endpoint: '/api/v1/sync/projects'
      });

      res.status(200).json({
        status: 'success',
        message: 'Project inventory synced successfully.',
        processed_id: project_id
      });
    } catch (error) {
      console.error('Error syncing project:', error);
      res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
  });
});
