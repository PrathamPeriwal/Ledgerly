import { getUserAccounts } from "@/actions/dashboard";
import { defaultCategories } from "@/data/categories";
import { AddTransactionForm } from "../_components/transaction-form";
import { getTransaction } from "@/actions/transaction";

export default async function AddTransactionPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const accounts = await getUserAccounts();
  const editId = resolvedSearchParams?.edit;

  let initialData = null;
  if (editId) {
    const transaction = await getTransaction(editId);
    initialData = transaction;
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="text-center mb-8 md:mb-12">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4 animate-slide-up">
          {editId ? 'Edit Transaction' : 'Add Transaction'}
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          {editId ? 'Update your transaction details' : 'Record a new financial transaction'}
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 md:p-8 animate-slide-up" style={{ animationDelay: '0.2s' }}>
        <AddTransactionForm
          accounts={accounts}
          categories={defaultCategories}
          editMode={!!editId}
          initialData={initialData}
        />
      </div>
    </div>
  );
}
