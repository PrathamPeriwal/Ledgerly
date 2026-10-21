import { describe, expect, it } from "vitest";
import {
  buildFlow,
  daysLeftInMonth,
  inMonth,
  lastSixMonthKeys,
  monthBoundsUtc,
  pacePct,
  safePerDay,
} from "@/lib/data/dashboard-calc";

describe("dashboard calc", () => {
  it("keeps calendar months on UTC boundaries, including February", () => {
    const october = new Date("2026-10-21T18:30:00.000Z");
    const bounds = monthBoundsUtc(october);
    expect(bounds.start.toISOString()).toBe("2026-10-01T00:00:00.000Z");
    expect(bounds.endExclusive.toISOString()).toBe("2026-11-01T00:00:00.000Z");
    expect(bounds.daysInMonth).toBe(31);
    expect(bounds.dayOfMonth).toBe(21);
    expect(inMonth(new Date("2026-10-01T00:00:00.000Z"), october)).toBe(true);
    expect(inMonth(new Date("2026-10-31T23:59:59.999Z"), october)).toBe(true);
    expect(inMonth(new Date("2026-11-01T00:00:00.000Z"), october)).toBe(false);
    expect(inMonth(new Date("2026-09-30T23:59:59.999Z"), october)).toBe(false);
    expect(pacePct(21, 31)).toBeCloseTo(21 / 31);
    expect(daysLeftInMonth(21, 31)).toBe(11);

    const leap = monthBoundsUtc(new Date("2024-02-29T12:00:00.000Z"));
    expect(leap.daysInMonth).toBe(29);
    expect(daysLeftInMonth(leap.dayOfMonth, leap.daysInMonth)).toBe(1);

    const plain = monthBoundsUtc(new Date("2026-02-28T00:00:00.000Z"));
    expect(plain.daysInMonth).toBe(28);
    expect(plain.endExclusive.toISOString()).toBe("2026-03-01T00:00:00.000Z");
    expect(lastSixMonthKeys(new Date("2026-01-15T00:00:00.000Z"))).toEqual([
      "2025-08",
      "2025-09",
      "2025-10",
      "2025-11",
      "2025-12",
      "2026-01",
    ]);
  });

  it("fills a month that has no transactions with zeros", () => {
    const now = new Date("2026-10-15T00:00:00.000Z");
    const empty = buildFlow(now, []);
    expect(empty.map((point) => point.month)).toEqual([
      "2026-05",
      "2026-06",
      "2026-07",
      "2026-08",
      "2026-09",
      "2026-10",
    ]);
    expect(empty.every((point) => point.income === 0 && point.expense === 0)).toBe(true);

    const partial = buildFlow(now, [{ month: "2026-10", type: "EXPENSE", amount: 25 }]);
    expect(partial.find((point) => point.month === "2026-07")).toEqual({
      month: "2026-07",
      income: 0,
      expense: 0,
    });
    expect(partial.find((point) => point.month === "2026-10")).toEqual({
      month: "2026-10",
      income: 0,
      expense: 25,
    });
  });

  it("returns no safe daily spend once the budget is over 100%", () => {
    expect(safePerDay(100, 150, daysLeftInMonth(21, 31))).toBe(0);
    expect(150 / 100).toBeGreaterThan(1);
    expect(pacePct(21, 31)).toBeCloseTo(21 / 31);
    expect(safePerDay(50, 20, 0)).toBe(30);
    expect(safePerDay(3600, 1800, 11)).toBeCloseTo(1800 / 11);
  });
});
