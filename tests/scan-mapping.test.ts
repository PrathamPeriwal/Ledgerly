import { describe, expect, it } from "vitest";
import { mapScanReceipt } from "@/lib/scan-mapping";

const now = new Date(2026, 9, 21, 12, 0, 0, 0);

describe("mapScanReceipt", () => {
  it("maps a valid receipt", () => {
    const mapped = mapScanReceipt(
      {
        amount: 42.186,
        date: "2026-01-02",
        description: "Milk and bread",
        merchantName: "Corner Market",
        category: "groceries",
      },
      now,
    );
    expect(mapped.amount).toBe("42.19");
    expect(mapped.type).toBe("EXPENSE");
    expect(mapped.category).toBe("groceries");
    expect(mapped.description).toBe("Corner Market");
    expect(mapped.date.getFullYear()).toBe(2026);
    expect(mapped.date.getMonth()).toBe(0);
    expect(mapped.date.getDate()).toBe(2);
  });

  it("uses today when the date is invalid", () => {
    const mapped = mapScanReceipt({ amount: 10, date: "yesterday", category: "food" }, now);
    expect(mapped.date.getFullYear()).toBe(now.getFullYear());
    expect(mapped.date.getMonth()).toBe(now.getMonth());
    expect(mapped.date.getDate()).toBe(now.getDate());
  });

  it("falls back to other expense for an unknown category", () => {
    const mapped = mapScanReceipt({ amount: 8, date: "2026-04-01", category: "spaceship" }, now);
    expect(mapped.type).toBe("EXPENSE");
    expect(mapped.category).toBe("other-expense");
  });

  it("treats an income category as income", () => {
    const mapped = mapScanReceipt(
      { amount: 1200, date: "2026-04-01", category: "salary", description: "Pay" },
      now,
    );
    expect(mapped.type).toBe("INCOME");
    expect(mapped.category).toBe("salary");
    expect(mapped.description).toBe("Pay");
  });

  it("reads the title-case keys the scanner returns", () => {
    const mapped = mapScanReceipt(
      {
        "Total amount": 9.75,
        Date: null,
        Description: "Milk, Bread, Coffee",
        "Merchant name": "Corner Market",
        Category: "Grocery",
      },
      now,
    );
    expect(mapped.amount).toBe("9.75");
    expect(mapped.description).toBe("Corner Market");
    expect(mapped.category).toBe("groceries");
    expect(mapped.date.getDate()).toBe(now.getDate());
  });

  it("resolves loose category names", () => {
    expect(mapScanReceipt({ category: "Grocery" }, now).category).toBe("groceries");
    expect(mapScanReceipt({ category: "Restaurant" }, now).category).toBe("food");
    expect(mapScanReceipt({ category: "Food & Drink" }, now).category).toBe("food");
    expect(mapScanReceipt({ category: "Gas" }, now).category).toBe("transportation");
    expect(mapScanReceipt({ category: "Pharmacy" }, now).category).toBe("healthcare");
    expect(mapScanReceipt({ category: "spaceship" }, now).category).toBe("other-expense");
  });

  it("turns a junk amount into 0.00", () => {
    const mapped = mapScanReceipt({ amount: "twelve", date: "2026-04-01", category: "food" }, now);
    expect(mapped.amount).toBe("0.00");
  });
});
