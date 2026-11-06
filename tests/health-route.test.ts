import { beforeEach, describe, expect, it, vi } from "vitest";

const { userCount, accountCount, findFirst, protect } = vi.hoisted(() => ({
  userCount: vi.fn(),
  accountCount: vi.fn(),
  findFirst: vi.fn(),
  protect: vi.fn(),
}));

vi.mock("@/lib/arcjet", () => ({
  default: { withRule: () => ({ protect }) },
}));

vi.mock("@arcjet/next", () => ({
  fixedWindow: (rule: unknown) => rule,
  request: async () => ({ headers: new Headers() }),
}));

vi.mock("@/lib/prisma", () => ({
  db: {
    user: { count: userCount },
    account: { count: accountCount },
    transaction: { findFirst },
  },
}));

import { GET } from "@/app/api/health/route";

beforeEach(() => {
  userCount.mockReset();
  accountCount.mockReset();
  findFirst.mockReset();
  protect.mockReset();
  protect.mockResolvedValue({ isDenied: () => false });
  userCount.mockResolvedValue(1);
  accountCount.mockResolvedValue(1);
  findFirst.mockResolvedValue({ id: "tx" });
});

describe("GET /api/health", () => {
  it("returns ok when the reads succeed", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(userCount).toHaveBeenCalledOnce();
    expect(accountCount).toHaveBeenCalledOnce();
    expect(findFirst).toHaveBeenCalledOnce();
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("x-robots-tag")).toBe("noindex");
  });

  it("returns 503 when a read throws", async () => {
    userCount.mockRejectedValue(new Error("db down"));
    const res = await GET();
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false });
  });
});
