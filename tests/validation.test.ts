import { describe, expect, it } from "vitest";
import { accountInputSchema, accountSchema } from "@/lib/validation/account";
import { budgetInputSchema } from "@/lib/validation/budget";
import { transactionInputSchema, transactionSchema } from "@/lib/validation/transaction";

const valid = {
  type: "EXPENSE",
  amount: 12.5,
  description: "  Lunch ",
  date: new Date("2025-01-02"),
  accountId: "acc",
  category: "food",
  isRecurring: false,
};
const message = (input: unknown) => {
  const result = transactionInputSchema.safeParse(input);
  return result.success ? null : result.error.issues[0].message;
};

describe("transactionInputSchema", () => {
  it("accepts a valid row and trims the description", () => {
    const result = transactionInputSchema.safeParse({ ...valid, extra: "ignored" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBe("Lunch");
      expect("extra" in result.data).toBe(false);
    }
  });
  it("accepts a recurring row with an interval and a string date", () => {
    expect(
      transactionInputSchema.safeParse({ ...valid, date: "2025-01-02", isRecurring: true, recurringInterval: "MONTHLY" }).success
    ).toBe(true);
  });
  it("rejects non-positive and too-precise amounts", () => {
    expect(message({ ...valid, amount: -1 })).toBe("Amount must be greater than zero");
    expect(message({ ...valid, amount: 0 })).toBe("Amount must be greater than zero");
    expect(message({ ...valid, amount: 1.005 })).toBe("Amount can have at most 2 decimals");
    expect(message({ ...valid, amount: 1_000_000_000 })).toBe("Amount must be less than 1,000,000,000");
  });
  it("rejects a category that does not belong to the type", () => {
    expect(message({ ...valid, category: "salary" })).toBe("Category is not valid for this type");
    expect(message({ ...valid, type: "INCOME", category: "salary" })).toBeNull();
  });
  it("requires an interval for recurring rows", () => {
    expect(message({ ...valid, isRecurring: true })).toBe("Recurring interval is required for recurring transactions");
  });
  it("rejects long descriptions, bad dates and bad types", () => {
    expect(message({ ...valid, description: "x".repeat(101) })).toBe("Description must be 100 characters or fewer");
    expect(message({ ...valid, date: "nope" })).toBe("Invalid date");
    expect(message({ ...valid, type: "OTHER" })).toBe("Type must be INCOME or EXPENSE");
  });
});

describe("accountInputSchema and budgetInputSchema", () => {
  it("accepts string or number balances", () => {
    expect(accountInputSchema.parse({ name: " Main ", type: "CURRENT", balance: "10.5" })).toMatchObject({
      name: "Main",
      balance: 10.5,
      isDefault: false,
    });
    expect(accountInputSchema.safeParse({ name: "A", type: "SAVINGS", balance: -5 }).success).toBe(true);
  });
  it("rejects bad names, types and balances", () => {
    expect(accountInputSchema.safeParse({ name: "", type: "CURRENT", balance: 1 }).success).toBe(false);
    expect(accountInputSchema.safeParse({ name: "x".repeat(51), type: "CURRENT", balance: 1 }).success).toBe(false);
    expect(accountInputSchema.safeParse({ name: "A", type: "OTHER", balance: 1 }).success).toBe(false);
    expect(accountInputSchema.safeParse({ name: "A", type: "CURRENT", balance: "abc" }).success).toBe(false);
  });
  it("validates budget amounts", () => {
    expect(budgetInputSchema.safeParse({ amount: 500 }).success).toBe(true);
    expect(budgetInputSchema.safeParse({ amount: 0 }).success).toBe(false);
    expect(budgetInputSchema.safeParse({ amount: 2_000_000_000 }).success).toBe(false);
  });
});

describe("form schemas keep their messages", () => {
  it("transactionSchema and accountSchema", () => {
    const t = transactionSchema.safeParse({ ...valid, amount: "", accountId: "" });
    expect(t.success).toBe(false);
    expect(accountSchema.safeParse({ name: "", type: "CURRENT", balance: "" }).success).toBe(false);
  });
});
