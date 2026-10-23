import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

vi.mock("@/lib/prisma", () => ({
  db: {
    transaction: { findMany: vi.fn() },
    $transaction: vi.fn(),
    $queryRaw: vi.fn(),
    user: { findUnique: vi.fn() },
    budget: { updateMany: vi.fn() },
  },
}));

import { db } from "@/lib/prisma";
import { findBudgetAlerts } from "@/lib/services/budget-alerts";
import { fallbackInsights, resolveInsights, type MonthStats } from "@/lib/services/monthly-report";
import {
  addInterval,
  findDueTemplates,
  firstOccurrenceAfter,
  isDueTemplate,
  occurrenceDates,
  processRecurringTemplate,
} from "@/lib/services/recurring";

const prisma = db as unknown as {
  transaction: { findMany: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
  $queryRaw: ReturnType<typeof vi.fn>;
};

const now = new Date("2026-10-24T00:00:00.000Z");

beforeEach(() => {
  prisma.transaction.findMany.mockReset();
  prisma.$transaction.mockReset();
  prisma.$queryRaw.mockReset();
});

describe("recurring jobs", () => {
  it("does not treat a null lastProcessed with a future next date as due", async () => {
    const future = new Date("2026-11-01T00:00:00.000Z");
    expect(
      isDueTemplate(
        {
          isRecurring: true,
          status: "COMPLETED",
          recurringInterval: "MONTHLY",
          nextRecurringDate: future,
          lastProcessed: null,
        },
        now,
      ),
    ).toBe(false);
    expect(
      isDueTemplate(
        {
          isRecurring: true,
          status: "COMPLETED",
          recurringInterval: "MONTHLY",
          nextRecurringDate: new Date("2026-10-01T00:00:00.000Z"),
          lastProcessed: null,
        },
        now,
      ),
    ).toBe(true);

    prisma.transaction.findMany.mockResolvedValue([]);
    await findDueTemplates(now);
    const query = prisma.transaction.findMany.mock.calls[0][0];
    expect(query.select).toEqual({ id: true, userId: true });
    expect(query.where).toEqual({
      isRecurring: true,
      status: "COMPLETED",
      recurringInterval: { not: null },
      nextRecurringDate: { not: null, lte: now },
    });
    expect(JSON.stringify(query.where)).not.toContain("lastProcessed");
  });

  it("catches up missed dates and clamps month ends", () => {
    const start = new Date("2026-01-31T00:00:00.000Z");
    expect(addInterval(start, "MONTHLY", 1).toISOString()).toBe("2026-02-28T00:00:00.000Z");
    expect(addInterval(new Date("2024-01-31T00:00:00.000Z"), "MONTHLY", 1).toISOString()).toBe("2024-02-29T00:00:00.000Z");

    const may = new Date("2026-05-01T00:00:00.000Z");
    expect(occurrenceDates(start, "MONTHLY", may).map((date) => date.toISOString())).toEqual([
      "2026-01-31T00:00:00.000Z",
      "2026-02-28T00:00:00.000Z",
      "2026-03-31T00:00:00.000Z",
      "2026-04-30T00:00:00.000Z",
    ]);
    expect(firstOccurrenceAfter(start, "MONTHLY", may).toISOString()).toBe("2026-05-31T00:00:00.000Z");

    const dailyStart = new Date("2026-01-01T00:00:00.000Z");
    expect(occurrenceDates(dailyStart, "DAILY", new Date("2026-03-01T00:00:00.000Z"))).toHaveLength(31);
  });

  it("skips a second run when the optimistic guard matches nothing", async () => {
    const start = new Date("2026-01-31T00:00:00.000Z");
    const tx = {
      transaction: {
        findFirst: vi.fn().mockResolvedValue({
          id: "t1",
          userId: "u1",
          type: "EXPENSE",
          amount: new Prisma.Decimal("10"),
          description: "Rent",
          category: "housing",
          accountId: "a1",
          isRecurring: true,
          recurringInterval: "MONTHLY",
          nextRecurringDate: start,
          lastProcessed: null,
          status: "COMPLETED",
        }),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        createMany: vi.fn(),
      },
      account: { updateMany: vi.fn() },
    };
    prisma.$transaction.mockImplementation(async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx));

    const result = await processRecurringTemplate("t1", "u1", new Date("2026-03-15T00:00:00.000Z"));
    expect(result).toEqual({ created: 0, skipped: true });
    expect(tx.transaction.updateMany).toHaveBeenCalledTimes(1);
    expect(tx.transaction.createMany).not.toHaveBeenCalled();
    expect(tx.account.updateMany).not.toHaveBeenCalled();
  });
});

describe("budget alerts", () => {
  it("alerts at 80 percent, not 79.99, and only once per UTC month", async () => {
    prisma.$queryRaw.mockResolvedValue([
      { userId: "low", amount: "100", lastAlertSent: null, spent: "79.99" },
      { userId: "exact", amount: "100", lastAlertSent: null, spent: "80" },
      { userId: "same", amount: "100", lastAlertSent: new Date("2026-10-02T00:00:00.000Z"), spent: "90" },
      { userId: "earlier", amount: "100", lastAlertSent: new Date("2026-09-02T00:00:00.000Z"), spent: "90" },
    ]);

    const alerts = await findBudgetAlerts(now);
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(alerts.map((alert) => alert.userId).sort()).toEqual(["earlier", "exact"]);
  });
});

describe("monthly report", () => {
  it("falls back to three sentences from the stats when Gemini rejects", async () => {
    const stats: MonthStats = {
      totalIncome: 1000,
      totalExpenses: 400,
      byCategory: { food: 250, rent: 150 },
      transactionCount: 3,
    };
    const insights = await resolveInsights(stats, "September", async () => {
      throw new Error("rejected");
    });
    expect(insights).toEqual(fallbackInsights(stats));
    expect(insights).toHaveLength(3);
  });
});
