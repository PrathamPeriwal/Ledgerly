"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Amount } from "@/components/fx/Privacy";
import useFetch from "@/hooks/use-fetch";
import { updateBudget } from "@/actions/budget";
import type { DashboardBudget } from "@/lib/types/dashboard";

const field =
  "h-10 w-32 border-[3px] border-[#1A1B1C] bg-white px-2 font-num text-[#1A1B1C] outline-none";
const save =
  "label h-10 border-[3px] border-[#1A1B1C] bg-[#FF5F14] px-3 text-[#1A1B1C] disabled:opacity-50";

export function BudgetPanel({ budget }: { budget: DashboardBudget | null }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(budget ? String(budget.amount) : "");
  const fetched = useFetch(updateBudget);
  const data = fetched.data as
    | { success: boolean; error?: string; data?: { amount: number } }
    | undefined;
  const error = fetched.error as { message?: string } | null;
  const loading = Boolean(fetched.loading);

  useEffect(() => {
    if (!data) return;
    if (data.success) {
      setEditing(false);
      if (data.data?.amount != null) setDraft(String(data.data.amount));
      toast.success("Budget updated successfully");
      return;
    }
    toast.error(data.error || "Failed to update budget");
  }, [data]);

  useEffect(() => {
    if (error) toast.error(error.message || "Failed to update budget");
  }, [error]);

  async function saveBudget() {
    const amount = Number.parseFloat(draft);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    await fetched.fn(amount);
  }

  const showForm = budget == null || editing;
  const used = budget && budget.amount > 0 ? (budget.spent / budget.amount) * 100 : 0;

  return (
    <section data-testid="budget-panel" className="border-[3px] border-[#1A1B1C] bg-white p-4 md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="label">{budget ? "MONTHLY BUDGET" : "SET A MONTHLY BUDGET"}</h2>
          {budget ? (
            <p className="mt-2 text-lg">
              <Amount value={budget.spent} />
              <span className="px-1">/</span>
              <Amount value={budget.amount} />
            </p>
          ) : null}
        </div>
        {showForm ? (
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={draft}
              aria-label="Monthly budget amount"
              disabled={loading}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void saveBudget();
              }}
              className={field}
            />
            <button type="button" className={save} disabled={loading} onClick={() => void saveBudget()}>
              SAVE
            </button>
            {budget && editing ? (
              <button
                type="button"
                className="label h-10 border-[3px] border-[#1A1B1C] bg-white px-3"
                disabled={loading}
                onClick={() => {
                  setDraft(String(budget.amount));
                  setEditing(false);
                }}
              >
                CANCEL
              </button>
            ) : null}
          </div>
        ) : (
          <button type="button" className="label h-10 border-[3px] border-[#1A1B1C] bg-white px-3" onClick={() => setEditing(true)}>
            EDIT
          </button>
        )}
      </div>
      {budget ? (
        <div
          className="relative mt-4 h-6 bg-[#1A1B1C]"
          role="meter"
          aria-label="Monthly budget"
          aria-valuemin={0}
          aria-valuemax={budget.amount}
          aria-valuenow={budget.spent}
        >
          <div className="h-full bg-[#FF5F14]" style={{ width: `${Math.min(100, used)}%` }} />
          {used > 100 ? <div className="progress-over pointer-events-none absolute inset-0" /> : null}
          <div
            className="absolute -bottom-1 -top-1 w-[2px] bg-white outline outline-1 outline-[#1A1B1C]"
            style={{ left: `calc(${Math.min(100, Math.max(0, budget.pacePct * 100))}% - 1px)` }}
          />
        </div>
      ) : null}
    </section>
  );
}
