"use client";

import { useEffect, type ComponentType, type MouseEventHandler } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Amount } from "@/components/fx/Privacy";
import { CreateAccountDrawer } from "@/components/create-account-drawer";
import { Switch } from "@/components/ui/switch";
import useFetch from "@/hooks/use-fetch";
import { updateDefaultAccount } from "@/actions/account";
import type { DashboardAccount } from "@/lib/types/dashboard";

const DefaultSwitch = Switch as ComponentType<{
  checked: boolean;
  disabled?: boolean;
  "aria-label": string;
  onClick: MouseEventHandler<HTMLButtonElement>;
}>;

const addButton =
  "label inline-flex items-center border-[3px] border-[#1A1B1C] bg-[#FF5F14] px-4 py-3 text-[#1A1B1C]";

function AddTile() {
  return (
    <CreateAccountDrawer>
      <button
        type="button"
        className="flex min-h-40 w-full flex-col items-start justify-between border-[3px] border-[#1A1B1C] bg-[#E3E7EB] p-4 text-left"
      >
        <span className="label">NEW</span>
        <span className="display text-3xl">ADD ACCOUNT</span>
      </button>
    </CreateAccountDrawer>
  );
}

export function AccountGrid({ accounts }: { accounts: DashboardAccount[] }) {
  const fetched = useFetch(updateDefaultAccount);
  const data = fetched.data as { success: boolean; error?: string } | undefined;
  const loading = Boolean(fetched.loading);

  useEffect(() => {
    if (!data) return;
    if (data.success) toast.success("Default account updated successfully");
    else toast.error(data.error || "Failed to update default account");
  }, [data]);

  if (accounts.length === 0) {
    return (
      <section id="accounts" className="scroll-mt-24 border-[3px] border-[#1A1B1C] bg-white p-8">
        <p className="display text-4xl md:text-6xl">NO ACCOUNTS YET</p>
        <div className="mt-6">
          <CreateAccountDrawer>
            <button type="button" className={addButton}>
              ADD ACCOUNT
            </button>
          </CreateAccountDrawer>
        </div>
      </section>
    );
  }

  return (
    <section id="accounts" className="scroll-mt-24">
      <h2 className="display mb-4 text-3xl">ACCOUNTS</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {accounts.map((account) => (
          <Link
            key={account.id}
            href={`/account/${account.id}`}
            data-testid="account-card"
            data-cursor="OPEN"
            className="flex min-h-40 flex-col border-[3px] border-[#1A1B1C] bg-white p-4 text-[#1A1B1C] no-underline"
          >
            <span className="flex items-start justify-between gap-3">
              <span className="display min-w-0 break-words text-2xl">{account.name}</span>
              {account.isDefault ? (
                <span className="label shrink-0 bg-[#FF5F14] px-2 py-1">Default</span>
              ) : (
                <DefaultSwitch
                  checked={false}
                  disabled={loading}
                  aria-label={`Set ${account.name} as default`}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    if (!loading) void fetched.fn(account.id);
                  }}
                />
              )}
            </span>
            <span className="label mt-2 text-muted-foreground">{account.type}</span>
            <span className="mt-auto pt-6">
              <Amount value={account.balance} className="text-3xl font-bold leading-none sm:text-4xl" />
            </span>
          </Link>
        ))}
        <AddTile />
      </div>
    </section>
  );
}
