"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { bulkDeleteTransactions } from "@/actions/account";
import { EmptyState } from "@/components/empty-state";
import { Amount } from "@/components/fx/Privacy";
import { useRouteProgress } from "@/components/route-progress";
import type { ComponentType, ReactNode } from "react";
import { Button as ButtonRoot } from "@/components/ui/button";
import { Checkbox as CheckboxRoot } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu as DropdownMenuRoot,
  DropdownMenuContent as DropdownMenuContentRoot,
  DropdownMenuItem as DropdownMenuItemRoot,
  DropdownMenuTrigger as DropdownMenuTriggerRoot,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip as TooltipRoot,
  TooltipContent as TooltipContentRoot,
  TooltipProvider as TooltipProviderRoot,
  TooltipTrigger as TooltipTriggerRoot,
} from "@/components/ui/tooltip";

const Button = ButtonRoot as ComponentType<{
  type?: "button";
  variant?: "outline" | "default";
  disabled?: boolean;
  onClick?: () => void;
  children: ReactNode;
}>;
const Checkbox = CheckboxRoot as ComponentType<{
  checked: boolean;
  "aria-label": string;
  onCheckedChange: (checked: boolean | "indeterminate") => void;
}>;
const DropdownMenu = DropdownMenuRoot as ComponentType<{ children: ReactNode }>;
const DropdownMenuTrigger = DropdownMenuTriggerRoot as ComponentType<{
  className?: string;
  "aria-label"?: string;
  children: ReactNode;
}>;
const DropdownMenuContent = DropdownMenuContentRoot as ComponentType<{
  align?: "end";
  className?: string;
  children: ReactNode;
}>;
const DropdownMenuItem = DropdownMenuItemRoot as ComponentType<{
  className?: string;
  onSelect?: () => void;
  children: ReactNode;
}>;
const TooltipProvider = TooltipProviderRoot as ComponentType<{ children: ReactNode }>;
const Tooltip = TooltipRoot as ComponentType<{ children: ReactNode }>;
const TooltipTrigger = TooltipTriggerRoot as ComponentType<{ className?: string; children: ReactNode }>;
const TooltipContent = TooltipContentRoot as ComponentType<{ className?: string; children: ReactNode }>;
import { hasActiveFilters, showingRange } from "@/lib/data/account-calc";
import { formatDateShort } from "@/lib/format";
import type { AccountParams, AccountSort, AccountTxPage, AccountTxRow } from "@/lib/types/account";
import { useAccountFilters } from "./filters";

function SortButton({
  label,
  field,
  sort,
  dir,
  onSort,
}: {
  label: string;
  field: AccountSort;
  sort: AccountSort;
  dir: AccountParams["dir"];
  onSort: (field: AccountSort) => void;
}) {
  const active = sort === field;
  return (
    <button type="button" className="label inline-flex h-5 items-center gap-1 leading-none" onClick={() => onSort(field)}>
      {label}
      {active ? dir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" /> : null}
    </button>
  );
}

function Money({ row }: { row: AccountTxRow }) {
  const expense = row.type === "EXPENSE";
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <span className="inline-block h-2.5 w-2.5 shrink-0" style={{ background: expense ? "#FF5F14" : "#1A1B1C" }} />
      <Amount value={expense ? -Math.abs(row.amount) : Math.abs(row.amount)} sign className="text-sm" />
    </span>
  );
}

function Recurring({ row }: { row: AccountTxRow }) {
  if (!row.isRecurring) return <span className="text-xs text-muted-foreground">ONE-TIME</span>;
  const label = row.recurringInterval ?? "RECURRING";
  const next = row.nextRecurringDate ? formatDateShort(row.nextRecurringDate) : "Scheduled";
  return (
    <Tooltip>
      <TooltipTrigger className="label border-[2px] border-[#1A1B1C] px-1.5 py-0.5 text-[10px]">{label}</TooltipTrigger>
      <TooltipContent className="whitespace-nowrap">Next {next}</TooltipContent>
    </Tooltip>
  );
}

export function TransactionTable({
  accountId,
  filters,
  page,
}: {
  accountId: string;
  filters: AccountParams;
  page: AccountTxPage;
}) {
  const router = useRouter();
  const { patch, clear, pending } = useAccountFilters();
  const [selected, setSelected] = useState<string[]>([]);
  const [confirm, setConfirm] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const shown = showingRange(page.page, page.total);
  const filtered = hasActiveFilters(filters);

  function toggleSort(field: AccountSort) {
    if (filters.sort === field) patch({ dir: filters.dir === "asc" ? "desc" : "asc" }, true);
    else patch({ sort: field, dir: "desc" }, true);
  }

  function toggleRow(id: string, on: boolean) {
    setSelected((current) => (on ? [...current, id] : current.filter((item) => item !== id)));
  }

  async function remove(ids: string[]) {
    setBusy(true);
    try {
      const result = await bulkDeleteTransactions(ids);
      if (!result.success) {
        toast.error(result.error || "Delete failed");
        return;
      }
      toast.success(ids.length === 1 ? "Transaction deleted" : "Transactions deleted");
      setSelected([]);
      setConfirm(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const sortButtons = (
    <span className="flex gap-3">
      <SortButton label="DATE" field="date" sort={filters.sort} dir={filters.dir} onSort={toggleSort} />
      <SortButton label="AMOUNT" field="amount" sort={filters.sort} dir={filters.dir} onSort={toggleSort} />
    </span>
  );

  return (
    <TooltipProvider>
      <div className={selected.length > 0 ? "pb-24" : undefined}>
        {page.total === 0 ? (
          <div className="p-6">
            <EmptyState
              title={filtered ? "NO TRANSACTIONS MATCH" : "NO TRANSACTIONS YET"}
              action={
                filtered ? (
                  <button type="button" className="label h-10 border-[3px] border-[#1A1B1C] bg-white px-3" onClick={clear}>
                    CLEAR FILTERS
                  </button>
                ) : (
                  <a
                    href={`/transaction/create?account=${accountId}`}
                    className="label inline-flex h-10 items-center border-[3px] border-[#1A1B1C] bg-[#FF5F14] px-3 text-[#1A1B1C]"
                  >
                    ADD TRANSACTION
                  </a>
                )
              }
            />
          </div>
        ) : (
          <>
            <div className="relative mb-3 px-3 pt-3 md:hidden">{sortButtons}</div>
            <div className="relative">
              <div className={pending ? "opacity-60" : undefined}>
            <div className="hidden max-w-full overflow-x-auto px-3 md:block">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b-[3px] border-[#1A1B1C]">
                    <th className="w-10 py-2 align-middle" />
                    <th className="py-2 pr-3 align-middle">
                      <SortButton label="DATE" field="date" sort={filters.sort} dir={filters.dir} onSort={toggleSort} />
                    </th>
                    <th className="py-2 pr-3 align-middle">
                      <span className="label inline-flex h-5 items-center leading-none">DESCRIPTION</span>
                    </th>
                    <th className="py-2 pr-3 align-middle">
                      <span className="label inline-flex h-5 items-center leading-none">CATEGORY</span>
                    </th>
                    <th className="py-2 pr-3 align-middle">
                      <SortButton label="AMOUNT" field="amount" sort={filters.sort} dir={filters.dir} onSort={toggleSort} />
                    </th>
                    <th className="py-2 pr-3 align-middle">
                      <span className="label inline-flex h-5 items-center leading-none">RECURRING</span>
                    </th>
                    <th className="w-12 py-2 align-middle" />
                  </tr>
                </thead>
                <tbody>
                  {page.rows.map((row) => (
                    <tr key={row.id} data-testid="tx-row" data-type={row.type} className="border-b-2 border-[#1A1B1C]">
                      <td className="py-3 align-middle">
                        <Checkbox
                          checked={selected.includes(row.id)}
                          aria-label={`Select ${row.description}`}
                          onCheckedChange={(checked) => toggleRow(row.id, checked === true)}
                        />
                      </td>
                      <td className="whitespace-nowrap py-3 pr-3 align-middle font-num text-xs">{formatDateShort(row.date)}</td>
                      <td className="max-w-[16rem] truncate py-3 pr-3 align-middle font-semibold">{row.description}</td>
                      <td className="py-3 pr-3 align-middle">
                        <span className="label inline-block border-[2px] border-[#1A1B1C] px-1.5 py-0.5 text-[10px]">
                          {row.category}
                        </span>
                      </td>
                      <td className="py-3 pr-3 align-middle">
                        <Money row={row} />
                      </td>
                      <td className="py-3 pr-3 align-middle">
                        <Recurring row={row} />
                      </td>
                      <td className="py-3 text-right align-middle">
                        <RowMenu row={row} onDelete={() => setConfirm([row.id])} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="space-y-2 p-3 md:hidden">
              {page.rows.map((row) => (
                <li key={row.id} data-testid="tx-row" data-type={row.type} className="border-[3px] border-[#1A1B1C] bg-white p-3">
                  <span className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <Checkbox
                        checked={selected.includes(row.id)}
                        aria-label={`Select ${row.description}`}
                        onCheckedChange={(checked) => toggleRow(row.id, checked === true)}
                      />
                      <span className="whitespace-nowrap font-num text-xs">{formatDateShort(row.date)}</span>
                    </span>
                    <Money row={row} />
                  </span>
                  <span className="mt-2 block break-words font-semibold">{row.description}</span>
                  <span className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="label inline-block border-[2px] border-[#1A1B1C] px-1.5 py-0.5 text-[10px]">
                      {row.category}
                    </span>
                    <Recurring row={row} />
                    <RowMenu row={row} onDelete={() => setConfirm([row.id])} />
                  </span>
                </li>
              ))}
            </ul>
              </div>
              {pending ? <div aria-hidden className="skeleton pointer-events-none absolute inset-0" /> : null}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t-[3px] border-[#1A1B1C] p-3">
              <p data-testid="tx-footer" className="font-num text-sm">
                SHOWING {shown.from.toLocaleString("en-US")}-{shown.to.toLocaleString("en-US")} OF{" "}
                {page.total.toLocaleString("en-US")}
              </p>
              <span className="flex gap-2">
                <button
                  type="button"
                  className="label h-10 border-[3px] border-[#1A1B1C] bg-white px-3 disabled:opacity-40"
                  disabled={pending || page.page <= 1}
                  onClick={() => patch({ page: page.page - 1 })}
                >
                  {pending ? "..." : "PREV"}
                </button>
                <button
                  type="button"
                  className="label h-10 border-[3px] border-[#1A1B1C] bg-white px-3 disabled:opacity-40"
                  disabled={pending || page.page >= page.pageCount}
                  onClick={() => patch({ page: page.page + 1 })}
                >
                  {pending ? "..." : "NEXT"}
                </button>
              </span>
            </div>
          </>
        )}
        {selected.length > 0 ? (
          <div className="fixed inset-x-0 bottom-0 z-50 flex flex-wrap items-center justify-between gap-3 border-[3px] border-[#1A1B1C] bg-[#1A1B1C] px-4 py-3 text-white">
            <span className="label">{selected.length} SELECTED</span>
            <span className="flex gap-2">
              <button type="button" className="label border-[3px] border-white px-3 py-2" onClick={() => setConfirm(selected)}>
                DELETE
              </button>
              <button type="button" className="label border-[3px] border-white px-3 py-2" onClick={() => setSelected([])}>
                CLEAR
              </button>
            </span>
          </div>
        ) : null}
      </div>
      <Dialog open={confirm !== null} onOpenChange={(open) => { if (!open) setConfirm(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="display text-3xl">DELETE {confirm?.length ?? 0}?</DialogTitle>
            <DialogDescription>This cannot be undone.</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setConfirm(null)}>
              CANCEL
            </Button>
            <Button type="button" disabled={busy} onClick={() => confirm && void remove(confirm)}>
              DELETE
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}

function RowMenu({ row, onDelete }: { row: AccountTxRow; onDelete: () => void }) {
  const router = useRouter();
  const { start } = useRouteProgress();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Row actions"
        className="inline-flex h-8 w-8 items-center justify-center border-[2px] border-[#1A1B1C] bg-white font-num text-lg leading-none text-[#1A1B1C]"
      >
        ...
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="border-[3px] border-[#1A1B1C]">
        <DropdownMenuItem
          className="label"
          onSelect={() => {
            start();
            router.push(`/transaction/create?edit=${row.id}`);
          }}
        >
          EDIT
        </DropdownMenuItem>
        <DropdownMenuItem className="label" onSelect={onDelete}>
          DELETE
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
