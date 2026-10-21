import { describe, expect, it } from "vitest";
import {
  DEFAULT_ACCOUNT_PARAMS,
  buildSeries,
  buildTransactionWhere,
  bucketFor,
  clampPage,
  pageCountFor,
  parseAccountParams,
  rangeStart,
  showingRange,
} from "@/lib/data/account-calc";

const now = new Date("2026-10-21T18:30:00.000Z");

describe("account params", () => {
  it("falls back to defaults on garbage input and clamps the page", () => {
    expect(
      parseAccountParams({
        range: "decade",
        q: "  rent  ",
        type: "transfer",
        recurring: "sometimes",
        sort: "name",
        dir: "sideways",
        page: "nope",
      }),
    ).toEqual({ ...DEFAULT_ACCOUNT_PARAMS, q: "rent" });

    expect(parseAccountParams({ page: "0" }).page).toBe(1);
    expect(parseAccountParams({ page: "-4" }).page).toBe(1);
    expect(parseAccountParams({ page: "2.9" }).page).toBe(2);
    expect(parseAccountParams({ page: "1001" }).page).toBe(1000);
    expect(parseAccountParams({ page: ["4", "9"] }).page).toBe(4);
    expect(clampPage(Number.NaN)).toBe(1);
    expect(clampPage(1000)).toBe(1000);
  });
});

describe("account range", () => {
  it("uses inclusive UTC boundaries and clamps month ends", () => {
    expect(rangeStart("7d", now)?.toISOString()).toBe("2026-10-15T00:00:00.000Z");
    expect(rangeStart("1m", now)?.toISOString()).toBe("2026-09-21T00:00:00.000Z");
    expect(rangeStart("3m", now)?.toISOString()).toBe("2026-07-21T00:00:00.000Z");
    expect(rangeStart("6m", now)?.toISOString()).toBe("2026-04-21T00:00:00.000Z");
    expect(rangeStart("all", now)).toBeNull();
    expect(rangeStart("1m", new Date("2026-03-31T12:00:00.000Z"))?.toISOString()).toBe("2026-02-28T00:00:00.000Z");
    expect(bucketFor("7d")).toBe("day");
    expect(bucketFor("1m")).toBe("day");
    expect(bucketFor("3m")).toBe("week");
    expect(bucketFor("6m")).toBe("week");
    expect(bucketFor("all")).toBe("month");
  });

  it("fills empty daily buckets and leaves week buckets as returned", () => {
    const series = buildSeries("7d", now, [
      { at: new Date("2026-10-20T12:00:00.000Z"), type: "EXPENSE", total: 12 },
      { at: new Date("2026-10-20T12:00:00.000Z"), type: "INCOME", total: 4 },
    ]);
    expect(series).toHaveLength(7);
    expect(series.map((point) => point.label)).toEqual(["15", "16", "17", "18", "19", "20", "21"]);
    expect(series[0]).toEqual({ label: "15", income: 0, expense: 0 });
    expect(series[5]).toEqual({ label: "20", income: 4, expense: 12 });

    const weeks = buildSeries("3m", now, [
      { at: new Date("2026-10-19T00:00:00.000Z"), type: "INCOME", total: 80 },
    ]);
    expect(weeks).toEqual([{ label: "Oct 19", income: 80, expense: 0 }]);

    const months = buildSeries("all", now, [
      { at: new Date("2026-10-01T00:00:00.000Z"), type: "EXPENSE", total: 10 },
    ]);
    expect(months).toEqual([{ label: "OCT", income: 0, expense: 10 }]);
  });
});

describe("account query", () => {
  it("pages within 15-row windows", () => {
    expect(pageCountFor(0)).toBe(1);
    expect(pageCountFor(15)).toBe(1);
    expect(pageCountFor(2431)).toBe(163);
    expect(showingRange(1, 2431)).toEqual({ from: 1, to: 15 });
    expect(showingRange(2, 30)).toEqual({ from: 16, to: 30 });
    expect(showingRange(4, 12)).toEqual({ from: 1, to: 12 });
    expect(showingRange(1, 0)).toEqual({ from: 0, to: 0 });
  });

  it("builds a where clause for text, type, and recurring", () => {
    const params = parseAccountParams({
      q: "super",
      type: "expense",
      recurring: "recurring",
      range: "1m",
    });
    expect(buildTransactionWhere("acc-1", params, now)).toEqual({
      accountId: "acc-1",
      status: "COMPLETED",
      date: { gte: new Date("2026-09-21T00:00:00.000Z") },
      OR: [
        { description: { contains: "super", mode: "insensitive" } },
        { category: { contains: "super", mode: "insensitive" } },
      ],
      type: "EXPENSE",
      isRecurring: true,
    });

    expect(buildTransactionWhere("acc-1", parseAccountParams({ recurring: "one-time", range: "all" }), now)).toEqual({
      accountId: "acc-1",
      status: "COMPLETED",
      isRecurring: false,
    });
  });
});
