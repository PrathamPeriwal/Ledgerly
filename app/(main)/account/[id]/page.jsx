import { Suspense } from "react";
import { getAccountWithTransactions } from "@/actions/account";
import { BarLoader } from "react-spinners";
import { TransactionTable } from "../_components/transaction-table";
import { notFound } from "next/navigation";
import { AccountChart } from "../_components/account-chart";

export default async function AccountPage({ params }) {
  const resolvedParams = await params;
  const accountData = await getAccountWithTransactions(resolvedParams.id);

  if (!accountData) {
    notFound();
  }

  const { transactions, ...account } = accountData;

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end justify-between bg-white dark:bg-gray-800 rounded-2xl p-6 md:p-8 shadow-lg border border-gray-200 dark:border-gray-700 card-hover">
        <div className="animate-slide-up">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-gray-900 dark:text-white capitalize mb-2">
            {account.name}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            {account.type.charAt(0) + account.type.slice(1).toLowerCase()}{" "}
            Account
          </p>
        </div>

        <div className="text-left sm:text-right animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">
            ${parseFloat(account.balance).toFixed(2)}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {account._count.transactions} Transactions
          </p>
        </div>
      </div>

      {/* Chart Section */}
      <Suspense
        fallback={<BarLoader className="mt-4" width={"100%"} color="#3b82f6" />}
      >
        <AccountChart transactions={transactions} />
      </Suspense>

      {/* Transactions Table */}
      <Suspense
        fallback={<BarLoader className="mt-4" width={"100%"} color="#3b82f6" />}
      >
        <TransactionTable transactions={transactions} />
      </Suspense>
    </div>
  );
}
