import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, findUnique, updateMany, update } = vi.hoisted(() => ({
  auth: vi.fn(),
  findUnique: vi.fn(),
  updateMany: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({ auth }));

vi.mock("@/lib/prisma", () => ({
  db: {
    user: { findUnique },
    account: { findUnique: vi.fn(), updateMany, update },
    transaction: { findMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { updateDefaultAccount } from "@/actions/account";

beforeEach(() => {
  vi.clearAllMocks();
  auth.mockResolvedValue({ userId: "clerk_user" });
  findUnique.mockResolvedValue({ id: "db_user_1" });
  updateMany.mockResolvedValue({ count: 1 });
  update.mockResolvedValue({
    id: "acc_1",
    name: "Checking",
    userId: "db_user_1",
    isDefault: true,
    balance: { toNumber: () => 42.5 },
  });
});

describe("updateDefaultAccount", () => {
  it("unsets other defaults and returns a numeric balance", async () => {
    const result = await updateDefaultAccount("acc_1");

    expect(result).toEqual({
      success: true,
      data: {
        id: "acc_1",
        name: "Checking",
        userId: "db_user_1",
        isDefault: true,
        balance: 42.5,
      },
    });
    expect(typeof result.data.balance).toBe("number");

    expect(updateMany).toHaveBeenCalledWith({
      where: { userId: "db_user_1", isDefault: true },
      data: { isDefault: false },
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: "acc_1", userId: "db_user_1" },
      data: { isDefault: true },
    });
    expect(updateMany.mock.invocationCallOrder[0]).toBeLessThan(
      update.mock.invocationCallOrder[0]
    );
  });
});
