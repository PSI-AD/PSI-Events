import { db } from './firebaseConfig';
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  doc, 
  runTransaction 
} from 'firebase/firestore';
import { Expense } from '../../types/expense';

/**
 * expenseService.ts
 * Handles Firestore writes for the Expense Ledger and Audit Logging.
 */

export const addExpense = async (
  eventId: string, 
  expenseData: Omit<Expense, 'id' | 'createdAt'>,
  actorId: string
) => {
  const expensesRef = collection(db, 'events', eventId, 'expenses');
  const auditRef = collection(db, 'system_audit_logs');

  try {
    await runTransaction(db, async (transaction) => {
      // 1. Create the expense document
      const newExpenseDoc = doc(expensesRef);
      transaction.set(newExpenseDoc, {
        ...expenseData,
        createdAt: serverTimestamp(),
      });

      // 2. Log the action for the audit trail (System_Audit_and_Error_Logging.md)
      const newAuditDoc = doc(auditRef);
      transaction.set(newAuditDoc, {
        timestamp: serverTimestamp(),
        actor_id: actorId,
        action_type: 'EXPENSE_ADDED',
        target_id: newExpenseDoc.id,
        new_state: expenseData,
        event_id: eventId
      });
    });

    return { success: true };
  } catch (error) {
    console.error('Error adding expense and audit log:', error);
    throw error;
  }
};
