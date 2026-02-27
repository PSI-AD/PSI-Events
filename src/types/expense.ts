/**
 * expense.ts
 * Type definitions for the Expense Ledger system.
 */

export type ExpenseCategory = 'Venue' | 'Hospitality' | 'Marketing' | 'Travel';
export type PaidBy = 'Branch' | 'Sponsor' | 'Agent';

export interface Expense {
  id?: string;
  amount: number;
  category: ExpenseCategory;
  subcategory: string;
  paidBy: PaidBy;
  description?: string;
  createdAt: any; // Firestore Timestamp
  createdBy: string; // User ID
}

export interface EventExpenses {
  eventId: string;
  totalCost: number;
  expenses: Expense[];
}
