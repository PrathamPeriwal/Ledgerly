"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Amount } from "@/components/fx/Privacy";
import { CreateAccountDrawer } from "@/components/create-account-drawer";
import type { ComponentType, ReactNode } from "react";
import { Button as ButtonRoot } from "@/components/ui/button";

const Button = ButtonRoot as ComponentType<{
  type?: "button" | "submit";
  variant?: "ghost" | "outline" | "default";
  size?: "sm" | "default";
  disabled?: boolean;
  className?: string;
  onClick?: () => void;
  children: ReactNode;
}>;
import useFetch from "@/hooks/use-fetch";
import { updateDefaultAccount } from "@/actions/account";
import type { DashboardAccount } from "@/lib/types/dashboard";

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
  const router = useRouter();
  const fetched = useFetch(updateDefaultAccount);
  const data = fetched.data as { success: boolean; error?: string } | undefined;
  const loading = Boolean(fetched.loading);

  useEffect(() => {
    if (!data) return;
    if (data.success) {
      toast.success("Default account updated successfully");
      router.refresh();
    } else toast.error(data.error || "Failed to update default account");
  }, [data, router]);

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
          <div
            key={account.id}
            data-testid="account-card"
            className="relative flex min-h-40 flex-col border-[3px] border-[#1A1B1C] bg-white p-4"
          >
            <Link
              href={`/account/${account.id}`}
              data-cursor="OPEN"
              className="flex min-h-32 flex-1 flex-col text-[#1A1B1C] no-underline"
            >
              <span className="display max-w-[68%] break-words text-2xl">{account.name}</span>
              {account.isDefault ? (
                <span className="label absolute right-3 top-3 bg-[#FF5F14] px-2 py-1">DEFAULT</span>
              ) : null}
              <span className="label mt-2 text-muted-foreground">{account.type}</span>
              <span className="mt-auto pt-6">
                <Amount value={account.balance} className="text-3xl font-bold leading-none sm:text-4xl" />
              </span>
            </Link>
            {account.isDefault ? null : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={loading}
                className="label absolute right-3 top-3 z-10 bg-white"
                onClick={() => {
                  if (!loading) void fetched.fn(account.id);
                }}
              >
                SET DEFAULT
              </Button>
            )}
          </div>
        ))}
        <AddTile />
      </div>
    </section>
  );
}
