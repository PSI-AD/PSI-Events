import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { verifyAuthToken } from '../middleware/authMiddleware';

/**
 * syncUsers.ts
 * Endpoint: /api/v1/sync/users
 * Purpose: Upserts staff and hierarchy data from the CRM.
 * Strictly follows API_Postman_Collection.md
 */

export const syncUsers = functions.https.onRequest(async (req, res) => {
  // Apply Auth Middleware
  await verifyAuthToken(req, res, async () => {
    if (req.method !== 'POST') {
      res.status(405).json({ status: 'error', message: 'Method Not Allowed' });
      return;
    }

    const {
      crm_user_id,
      full_name,
      email,
      company_entity,
      branch_name,
      department,
      nationality,
      languages,
      manager_id
    } = req.body;

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
    } catch (error) {
      console.error('Error syncing user:', error);
      res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
  });
});
