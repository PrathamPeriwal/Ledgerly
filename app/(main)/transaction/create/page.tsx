import { Suspense } from "react";
import { getTransaction } from "@/lib/data/transaction";
import { PageHeader } from "@/components/page-header";
import { listTransactionAccounts } from "@/lib/data/account";
import { TransactionForm, type TransactionInitial } from "../_components/transaction-form";
import { TransactionFormSkeleton } from "./skeleton";

export const dynamic = "force-dynamic";

function one(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

async function TransactionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const editId = one(params.edit);
  const requested = one(params.account);
  const accounts = await listTransactionAccounts();
  const transaction = editId ? await getTransaction(editId) : null;
  const defaultAccountId = accounts.some((account) => account.id === requested)
    ? (requested as string)
    : (accounts.find((account) => account.isDefault)?.id ?? accounts[0]?.id ?? "");

  const initial: TransactionInitial | null = transaction
    ? {
        type: transaction.type,
        amount: Number(transaction.amount),
        description: transaction.description ?? "",
        accountId: transaction.accountId,
        category: transaction.category,
        date: new Date(transaction.date).toISOString(),
        isRecurring: transaction.isRecurring,
        recurringInterval: transaction.recurringInterval,
      }
    : null;

  return (
    <div className="min-w-0">
      <PageHeader
        label={editId ? "EDIT ENTRY" : "NEW ENTRY"}
        title={editId ? "EDIT TRANSACTION" : "ADD TRANSACTION"}
      />
      <TransactionForm
        accounts={accounts}
        editId={editId}
        initial={initial}
        defaultAccountId={initial?.accountId ?? defaultAccountId}
      />
    </div>
  );
}

export default function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<TransactionFormSkeleton />}>
      <TransactionPage searchParams={searchParams} />
    </Suspense>
  );
}

