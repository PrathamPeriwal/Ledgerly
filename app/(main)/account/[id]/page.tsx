import { Suspense } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Reveal } from "@/components/fx/Reveal";
import { getAccountForUser, listAccountNames } from "@/lib/data/account";
import { parseAccountParams, serializeAccountParams } from "@/lib/data/account-calc";
import { AccountFilters, AccountSwitcher, AccountToolbar } from "../_components/filters";
import { AccountSummarySkeleton, TransactionsSkeleton } from "../_components/skeletons";
import { AccountSummary } from "../_components/summary";
import { AccountTransactions } from "../_components/transactions";

export const dynamic = "force-dynamic";

const addLink =
  "label inline-flex h-10 w-full items-center justify-center whitespace-nowrap border-[3px] border-[#1A1B1C] bg-[#FF5F14] px-3 text-[#1A1B1C] transition-colors hover:bg-[#1A1B1C] hover:text-white sm:w-auto";

export default async function AccountPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const filters = parseAccountParams(await searchParams);
  const [account, accounts] = await Promise.all([getAccountForUser(id), listAccountNames()]);

  return (
    <AccountFilters filters={filters}>
      <div className="min-w-0">
        <PageHeader
          label={`ACCOUNT / ${account.type}`}
          title={account.name}
          actions={
            <>
              <AccountSwitcher accounts={accounts} currentId={account.id} />
              <Link href={`/transaction/create?account=${account.id}`} className={addLink}>
                ADD TRANSACTION
              </Link>
            </>
          }
        />
        <div className="space-y-6 pt-6">
          <Suspense fallback={<AccountSummarySkeleton />}>
            <AccountSummary id={account.id} balance={account.balance} range={filters.range} />
          </Suspense>
          <section className="min-w-0">
            <Reveal>
              <h2 className="display mb-4 text-3xl">TRANSACTIONS</h2>
            </Reveal>
            <div className="border-[3px] border-[#1A1B1C] bg-white">
              <div className="border-b-[3px] border-[#1A1B1C] p-3">
                <AccountToolbar />
              </div>
              <Suspense key={serializeAccountParams(filters)} fallback={<TransactionsSkeleton />}>
                <AccountTransactions id={account.id} filters={filters} />
              </Suspense>
            </div>
          </section>
        </div>
      </div>
    </AccountFilters>
  );
}
