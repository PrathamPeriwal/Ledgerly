import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { accountDeltas, balanceEffect, updateDeltas, type EffectRow } from "@/lib/services/balance";

const row = (type: "INCOME" | "EXPENSE", amount: string | number, accountId = "a", status = "COMPLETED"): EffectRow => ({
  type,
  amount,
  accountId,
  status,
});
const get = (deltas: Map<string, Prisma.Decimal>, id: string) => (deltas.get(id) ?? new Prisma.Decimal(0)).toString();

describe("balance helpers", () => {
  it("income adds and expense subtracts", () => {
    expect(balanceEffect(row("INCOME", "12.5")).toString()).toBe("12.5");
    expect(balanceEffect(row("EXPENSE", "12.5")).toString()).toBe("-12.5");
  });

  it("ignores rows that are not COMPLETED", () => {
    expect(balanceEffect(row("EXPENSE", 10, "a", "PENDING")).isZero()).toBe(true);
  });

  it("moving a row between accounts reverses the old and applies the new", () => {
    const d = updateDeltas(row("EXPENSE", 40, "a"), row("EXPENSE", 40, "b"));
    expect(get(d, "a")).toBe("40");
    expect(get(d, "b")).toBe("-40");
  });

  it("flipping the type changes the balance by twice the amount", () => {
    const d = updateDeltas(row("EXPENSE", 25), row("INCOME", 25));
    expect(get(d, "a")).toBe("50");
  });

  it("changing the amount applies only the difference", () => {
    const d = updateDeltas(row("EXPENSE", 25), row("EXPENSE", 30));
    expect(get(d, "a")).toBe("-5");
  });

  it("bulk delete across two accounts reverses each net effect", () => {
    const d = accountDeltas(
      [row("EXPENSE", 10, "a"), row("EXPENSE", 5, "a"), row("INCOME", 100, "b")],
      -1
    );
    expect(get(d, "a")).toBe("15");
    expect(get(d, "b")).toBe("-100");
  });

  it("is exact for decimals such as 0.10 + 0.20", () => {
    const d = accountDeltas([row("INCOME", 0.1), row("INCOME", 0.2)]);
    expect(get(d, "a")).toBe("0.3");
  });
});
