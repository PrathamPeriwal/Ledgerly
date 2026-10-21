"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { ComponentType, ReactNode } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DEFAULT_ACCOUNT_PARAMS,
  hasActiveFilters,
  toAccountSearch,
} from "@/lib/data/account-calc";
import type { AccountOption, AccountParams } from "@/lib/types/account";
import {
  Select as SelectRoot,
  SelectContent as SelectContentRoot,
  SelectItem as SelectItemRoot,
  SelectTrigger as SelectTriggerRoot,
} from "@/components/ui/select";

const Select = SelectRoot as ComponentType<{ value: string; onValueChange: (value: string) => void; children: ReactNode }>;
const SelectTrigger = SelectTriggerRoot as ComponentType<{ "aria-label"?: string; className?: string; children: ReactNode }>;
const SelectContent = SelectContentRoot as ComponentType<{ children: ReactNode }>;
const SelectItem = SelectItemRoot as ComponentType<{ value: string; children: ReactNode }>;

type FilterApi = {
  filters: AccountParams;
  pending: boolean;
  patch: (partial: Partial<AccountParams>, resetPage?: boolean) => void;
  clear: () => void;
};

const FilterContext = createContext<FilterApi | null>(null);

export function useAccountFilters() {
  const value = useContext(FilterContext);
  if (!value) throw new Error("Account filters are missing");
  return value;
}

export function AccountFilters({ filters, children }: { filters: AccountParams; children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState(filters);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  useEffect(() => {
    setDraft(filters);
  }, [filters]);

  const commit = useCallback(
    (next: AccountParams) => {
      draftRef.current = next;
      const qs = toAccountSearch(next);
      const href = qs ? `${pathname}?${qs}` : pathname;
      void router.replace(href, { scroll: false });
      startTransition(() => {
        setDraft(next);
      });
    },
    [pathname, router, startTransition],
  );

  const patch = useCallback(
    (partial: Partial<AccountParams>, resetPage = false) => {
      const current = draftRef.current;
      commit({ ...current, ...partial, page: resetPage ? 1 : (partial.page ?? current.page) });
    },
    [commit],
  );

  const clear = useCallback(() => commit(DEFAULT_ACCOUNT_PARAMS), [commit]);
  const api = useMemo<FilterApi>(() => ({ filters: draft, pending, patch, clear }), [draft, pending, patch, clear]);

  return <FilterContext.Provider value={api}>{children}</FilterContext.Provider>;
}

const ranges = [
  { value: "7d", label: "7D" },
  { value: "1m", label: "1M" },
  { value: "3m", label: "3M" },
  { value: "6m", label: "6M" },
  { value: "all", label: "ALL" },
];

function Segmented({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <Tabs value={value} onValueChange={onChange}>
      <TabsList aria-label={label} className="w-max border-[3px] border-[#1A1B1C] bg-white">
        {options.map((option) => (
          <TabsTrigger
            key={option.value}
            value={option.value}
            className="data-[state=active]:bg-[#1A1B1C] data-[state=active]:text-white"
          >
            {option.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

export function RangeTabs() {
  const { filters, patch } = useAccountFilters();
  return (
    <div className="max-w-full overflow-x-auto">
      <Segmented
        label="Range"
        value={filters.range}
        options={ranges}
        onChange={(range) => patch({ range: range as AccountParams["range"] }, true)}
      />
    </div>
  );
}

export function AccountSwitcher({ accounts, currentId }: { accounts: AccountOption[]; currentId: string }) {
  const router = useRouter();
  const current = accounts.find((account) => account.id === currentId);
  return (
    <Select value={currentId} onValueChange={(id) => router.push(`/account/${id}`)}>
      <SelectTrigger aria-label="Account" className="label h-10 w-full border-[3px] border-[#1A1B1C] bg-white sm:w-52">
        <span className="truncate">{current?.name ?? "ACCOUNT"}</span>
      </SelectTrigger>
      <SelectContent>
        {accounts.map((account) => (
          <SelectItem key={account.id} value={account.id}>
            {account.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function AccountToolbar() {
  const { filters, patch, clear } = useAccountFilters();
  const [q, setQ] = useState(filters.q);

  useEffect(() => {
    setQ(filters.q);
  }, [filters.q]);

  useEffect(() => {
    const handle = setTimeout(() => {
      if (q.trim() === filters.q) return;
      patch({ q: q.trim() }, true);
    }, 300);
    return () => clearTimeout(handle);
  }, [q, filters.q, patch]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        aria-label="Search transactions"
        value={q}
        onChange={(event) => setQ(event.target.value)}
        placeholder="SEARCH"
        className="label h-10 w-full min-w-0 border-[3px] border-[#1A1B1C] bg-white px-3 sm:w-56"
      />
      <div className="max-w-full overflow-x-auto">
        <Segmented
          label="Type"
          value={filters.type}
          options={[
            { value: "all", label: "ALL" },
            { value: "income", label: "INCOME" },
            { value: "expense", label: "EXPENSE" },
          ]}
          onChange={(type) => patch({ type: type as AccountParams["type"] }, true)}
        />
      </div>
      <div className="max-w-full overflow-x-auto">
        <Segmented
          label="Recurring"
          value={filters.recurring}
          options={[
            { value: "all", label: "ALL" },
            { value: "recurring", label: "RECURRING" },
            { value: "one-time", label: "ONE-TIME" },
          ]}
          onChange={(recurring) => patch({ recurring: recurring as AccountParams["recurring"] }, true)}
        />
      </div>
      {hasActiveFilters(filters) ? (
        <button type="button" className="label h-10 border-[3px] border-[#1A1B1C] bg-white px-3" onClick={clear}>
          CLEAR FILTERS
        </button>
      ) : null}
    </div>
  );
}
