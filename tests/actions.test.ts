import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => {
  const db = {
    account: { findFirst: vi.fn(), updateMany: vi.fn(), update: vi.fn(), count: vi.fn(), create: vi.fn() },
    transaction: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
    budget: { upsert: vi.fn() },
    $transaction: vi.fn(),
  };
  return { db, ensureUser: vi.fn() };
});

vi.mock("@/lib/prisma", () => ({ db: m.db }));
vi.mock("@/lib/ensure-user", () => ({ ensureUser: m.ensureUser }));
vi.mock("@/lib/auth/rate-limit", () => ({ enforceRateLimit: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { Prisma } from "@prisma/client";
import { bulkDeleteTransactions, createAccount, updateDefaultAccount } from "@/actions/account";
import { updateBudget } from "@/actions/budget";
import { createTransaction, updateTransaction } from "@/actions/transaction";

const input = {
  type: "EXPENSE",
  amount: 10,
  description: "Lunch",
  date: new Date("2025-01-02"),
  accountId: "acc_1",
  category: "food",
  isRecurring: false,
};
const noWrites = () => {
  expect(m.db.transaction.create).not.toHaveBeenCalled();
  expect(m.db.transaction.update).not.toHaveBeenCalled();
  expect(m.db.transaction.deleteMany).not.toHaveBeenCalled();
  expect(m.db.account.updateMany).not.toHaveBeenCalled();
  expect(m.db.account.update).not.toHaveBeenCalled();
  expect(m.db.account.create).not.toHaveBeenCalled();
  expect(m.db.budget.upsert).not.toHaveBeenCalled();
};

beforeEach(() => {
  vi.clearAllMocks();
  m.ensureUser.mockResolvedValue({ id: "db_user_1", clerkUserId: "clerk_1" });
  m.db.$transaction.mockImplementation((fn: (tx: typeof m.db) => unknown) => fn(m.db));
  m.db.account.findFirst.mockResolvedValue(null);
  m.db.transaction.findFirst.mockResolvedValue(null);
  m.db.transaction.findMany.mockResolvedValue([]);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("ownership", () => {
  it("createTransaction on another user's account is Not found", async () => {
    expect(await createTransaction(input)).toEqual({ success: false, error: "Not found" });
    expect(m.db.account.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "acc_1", userId: "db_user_1" } }));
    noWrites();
  });

  it("updateTransaction on another user's row is Not found", async () => {
    expect(await updateTransaction("tx_9", input)).toEqual({ success: false, error: "Not found" });
    expect(m.db.transaction.findFirst).toHaveBeenCalledWith({ where: { id: "tx_9", userId: "db_user_1" } });
    noWrites();
  });

  it("updateDefaultAccount on another user's account is Not found", async () => {
    expect(await updateDefaultAccount("acc_9")).toEqual({ success: false, error: "Not found" });
    noWrites();
  });

  it("bulk delete only loads the caller's rows and writes nothing for foreign ids", async () => {
    expect(await bulkDeleteTransactions(["tx_9"])).toEqual({ success: true });
    expect(m.db.transaction.findMany).toHaveBeenCalledWith({ where: { id: { in: ["tx_9"] }, userId: "db_user_1" } });
    noWrites();
  });

  it("updateDefaultAccount returns a numeric balance for an owned account", async () => {
    m.db.account.findFirst.mockResolvedValue({ id: "acc_1" });
    m.db.account.updateMany.mockResolvedValue({ count: 1 });
    m.db.account.update.mockResolvedValue({ id: "acc_1", isDefault: true, balance: new Prisma.Decimal("42.5") });
    expect(await updateDefaultAccount("acc_1")).toEqual({
      success: true,
      data: { id: "acc_1", isDefault: true, balance: 42.5 },
    });
    expect(m.db.account.update).toHaveBeenCalledWith({ where: { id: "acc_1", userId: "db_user_1" }, data: { isDefault: true } });
  });
});

describe("validation", () => {
  it("returns the first issue and writes nothing", async () => {
    expect(await createTransaction({ ...input, amount: -5 })).toEqual({
      success: false,
      error: "Amount must be greater than zero",
    });
    expect(await updateTransaction("tx_1", { ...input, category: "salary" })).toEqual({
      success: false,
      error: "Category is not valid for this type",
    });
    expect((await createAccount({ name: "", type: "CURRENT", balance: "1" })).success).toBe(false);
    expect((await updateBudget(-1)).success).toBe(false);
    expect(m.db.$transaction).not.toHaveBeenCalled();
    noWrites();
  });
});

describe("auth", () => {
  it("returns Unauthorized when there is no user", async () => {
    m.ensureUser.mockResolvedValue(null);
    const unauthorized = { success: false, error: "Unauthorized" };
    expect(await createTransaction(input)).toEqual(unauthorized);
    expect(await updateTransaction("tx_1", input)).toEqual(unauthorized);
    expect(await bulkDeleteTransactions(["tx_1"])).toEqual(unauthorized);
    expect(await updateDefaultAccount("acc_1")).toEqual(unauthorized);
    expect(await createAccount({ name: "A", type: "CURRENT", balance: "1" })).toEqual(unauthorized);
    expect(await updateBudget(10)).toEqual(unauthorized);
    noWrites();
  });
});

describe("error handling", () => {
  it("hides unexpected errors", async () => {
    m.db.$transaction.mockRejectedValue(new Error("connection string leaked"));
    expect(await createTransaction(input)).toEqual({
      success: false,
      error: "Something went wrong. Please try again.",
    });
  });
});
