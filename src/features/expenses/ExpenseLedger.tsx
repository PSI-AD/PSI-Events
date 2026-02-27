import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Receipt, Landmark, User, Building2, X } from 'lucide-react';
import { Expense, ExpenseCategory, PaidBy } from '../../types/expense';
import { addExpense } from '../../services/firebase/expenseService';

interface ExpenseLedgerProps {
  eventId: string;
  expenses: Expense[];
  currentUserId: string;
  onRefresh?: () => void;
}

/**
 * ExpenseLedger
 * Categorized ledger system for roadshow expenses.
 * Strictly follows Project_Master.md and System_Audit_and_Error_Logging.md
 */
export const ExpenseLedger: React.FC<ExpenseLedgerProps> = ({
  eventId,
  expenses,
  currentUserId,
  onRefresh
}) => {
  const [activeTab, setActiveTab] = useState<ExpenseCategory>('Venue');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [amount, setAmount] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [paidBy, setPaidBy] = useState<PaidBy>('Branch');
  const [description, setDescription] = useState('');

  const categories: ExpenseCategory[] = ['Venue', 'Hospitality', 'Marketing', 'Travel'];

  const filteredExpenses = useMemo(() => 
    expenses.filter(e => e.category === activeTab),
    [expenses, activeTab]
  );

  const totalEventCost = useMemo(() => 
    expenses.reduce((sum, e) => sum + e.amount, 0),
    [expenses]
  );

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !subcategory) return;

    setIsSubmitting(true);
    try {
      await addExpense(eventId, {
        amount: parseFloat(amount),
        category: activeTab,
        subcategory,
        paidBy,
        description,
        createdBy: currentUserId
      }, currentUserId);

      setIsModalOpen(false);
      setAmount('');
      setSubcategory('');
      setDescription('');
      if (onRefresh) onRefresh();
    } catch (error) {
      alert('Failed to add expense. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Total Event Cost Header */}
      <div className="bg-zinc-900 text-white p-8 rounded-2xl flex justify-between items-center shadow-xl">
        <div>
          <p className="text-zinc-400 text-sm font-medium uppercase tracking-widest mb-1">Total Event Cost</p>
          <h2 className="text-4xl font-bold tracking-tight">
            {totalEventCost.toLocaleString()} <span className="text-xl font-normal text-zinc-500">AED</span>
          </h2>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-emerald-500 hover:bg-emerald-400 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
        >
          <Plus size={20} />
          Add Expense
        </button>
      </div>

      {/* Tabs Navigation */}
      <div className="flex gap-2 p-1 bg-zinc-100 rounded-xl w-fit">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveTab(cat)}
            className={`
              px-6 py-2.5 rounded-lg text-sm font-bold transition-all
              ${activeTab === cat 
                ? 'bg-white text-zinc-900 shadow-sm' 
                : 'text-zinc-500 hover:text-zinc-700'}
            `}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Ledger Table */}
      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-50 border-bottom border-zinc-200">
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500">Subcategory</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500">Paid By</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 text-right">Amount (AED)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            <AnimatePresence mode="popLayout">
              {filteredExpenses.length > 0 ? (
                filteredExpenses.map((expense, idx) => (
                  <motion.tr
                    key={expense.id || idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="hover:bg-zinc-50/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <p className="font-bold text-zinc-900">{expense.subcategory}</p>
                      {expense.description && <p className="text-xs text-zinc-400">{expense.description}</p>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {expense.paidBy === 'Branch' && <Landmark size={14} className="text-blue-500" />}
                        {expense.paidBy === 'Sponsor' && <Building2 size={14} className="text-emerald-500" />}
                        {expense.paidBy === 'Agent' && <User size={14} className="text-amber-500" />}
                        <span className="text-sm font-medium text-zinc-700">{expense.paidBy}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-zinc-900">
                      {expense.amount.toLocaleString()}
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-zinc-400 italic">
                    No expenses logged for {activeTab} yet.
                  </td>
                </tr>
              )}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Add Expense Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-zinc-100 flex justify-between items-center bg-zinc-50">
                <h3 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
                  <Receipt className="text-emerald-500" />
                  Add {activeTab} Expense
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleAddExpense} className="p-8 space-y-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">Amount (AED)</label>
                  <input
                    type="number"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all font-mono text-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">Subcategory</label>
                  <input
                    type="text"
                    required
                    value={subcategory}
                    onChange={(e) => setSubcategory(e.target.value)}
                    placeholder="e.g., Booth Rental, Catering, Flights"
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">Paid By</label>
                  <select
                    value={paidBy}
                    onChange={(e) => setPaidBy(e.target.value as PaidBy)}
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all bg-white"
                  >
                    <option value="Branch">Branch</option>
                    <option value="Sponsor">Sponsor</option>
                    <option value="Agent">Agent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">Description (Optional)</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-400 text-white py-4 rounded-xl font-bold transition-all shadow-lg"
                >
                  {isSubmitting ? 'Processing...' : 'Confirm Expense'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
