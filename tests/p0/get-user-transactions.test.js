import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, findUnique, findMany } = vi.hoisted(() => ({
  auth: vi.fn(),
  findUnique: vi.fn(),
  findMany: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({ auth }));

vi.mock("@/lib/prisma", () => ({
  db: {
    user: { findUnique },
    account: { findUnique: vi.fn(), update: vi.fn() },
    transaction: { findMany, create: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/arcjet", () => ({
  default: { protect: vi.fn() },
}));

vi.mock("@arcjet/next", () => ({
  request: vi.fn(),
}));

vi.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: vi.fn(function GoogleGenerativeAI() {
    return { getGenerativeModel: vi.fn() };
  }),
}));

import { getUserTransactions } from "@/actions/transaction";

beforeEach(() => {
  vi.clearAllMocks();
  auth.mockResolvedValue({ userId: "clerk_user" });
  findUnique.mockResolvedValue({ id: "db_user_1" });
  findMany.mockResolvedValue([]);
});

describe("getUserTransactions", () => {
  it("queries with the authenticated database user and ignores a passed userId", async () => {
    const result = await getUserTransactions({
      userId: "attacker",
      type: "EXPENSE",
    });

    expect(findUnique).toHaveBeenCalledWith({
      where: { clerkUserId: "clerk_user" },
    });
    expect(findMany).toHaveBeenCalledWith({
      where: {
        type: "EXPENSE",
        userId: "db_user_1",
      },
      include: { account: true },
      orderBy: { date: "desc" },
    });
    expect(result).toEqual({ success: true, data: [] });
  });

  it("throws Unauthorized when there is no user", async () => {
    auth.mockResolvedValue({ userId: null });

    await expect(getUserTransactions({ userId: "attacker" })).rejects.toThrow("Unauthorized");
    expect(findUnique).not.toHaveBeenCalled();
    expect(findMany).not.toHaveBeenCalled();
  });
});
