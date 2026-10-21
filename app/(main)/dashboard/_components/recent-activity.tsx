"use client";

import { useState } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { Amount } from "@/components/fx/Privacy";
import { formatDateShort } from "@/lib/format";
import type { DashboardTx } from "@/lib/types/dashboard";

export function RecentActivity({
  recent,
  accounts,
  defaultAccountId,
}: {
  recent: Record<string, DashboardTx[]>;
  accounts: { id: string; name: string }[];
  defaultAccountId: string | null;
}) {
  const [accountId, setAccountId] = useState("all");
  const rows = recent[accountId] ?? [];

  return (
    <section className="min-w-0 border-[3px] border-[#1A1B1C] bg-white p-4 md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="display text-3xl">RECENT ACTIVITY</h2>
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Recent account"
            value={accountId}
            onChange={(event) => setAccountId(event.target.value)}
            className="label h-10 max-w-full border-[3px] border-[#1A1B1C] bg-white px-2"
          >
            <option value="all">ALL ACCOUNTS</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
          {defaultAccountId ? (
            <Link
              href={`/account/${defaultAccountId}`}
              className="label inline-flex h-10 items-center border-[3px] border-[#1A1B1C] bg-white px-3"
            >
              VIEW ALL
            </Link>
          ) : null}
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="py-8">
          <EmptyState title="NO TRANSACTIONS YET" />
        </div>
      ) : (
        <ul data-testid="recent-list" className="mt-4 border-[3px] border-[#1A1B1C]">
          {rows.map((tx) => {
            const expense = tx.type === "EXPENSE";
            return (
              <li
                key={tx.id}
                data-testid="recent-row"
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b-2 border-[#1A1B1C] px-3 py-3 last:border-b-0"
              >
                <span className="whitespace-nowrap font-num text-xs">{formatDateShort(tx.date)}</span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{tx.description}</span>
                  <span className="label text-[10px] text-muted-foreground">{tx.category}</span>
                </span>
                <span className="flex items-center gap-2">
                  <span
                    className="inline-block h-2 w-2 shrink-0"
                    style={{ background: expense ? "#FF5F14" : "#1A1B1C" }}
                  />
                  <Amount value={expense ? -Math.abs(tx.amount) : Math.abs(tx.amount)} sign />
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
