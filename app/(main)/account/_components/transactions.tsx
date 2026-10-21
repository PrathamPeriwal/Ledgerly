import { getAccountTransactions } from "@/lib/data/account";
import type { AccountParams } from "@/lib/types/account";
import { TransactionTable } from "./transaction-table";

export async function AccountTransactions({ id, filters }: { id: string; filters: AccountParams }) {
  const page = await getAccountTransactions(id, filters);
  return <TransactionTable accountId={id} filters={filters} page={page} />;
}
