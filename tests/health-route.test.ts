import { beforeEach, describe, expect, it, vi } from "vitest";

const { count, protect } = vi.hoisted(() => ({
  count: vi.fn(),
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
  db: { budget: { count } },
}));

import { GET } from "@/app/api/health/route";

beforeEach(() => {
  count.mockReset();
  protect.mockReset();
  protect.mockResolvedValue({ isDenied: () => false });
});

describe("GET /api/health", () => {
  it("returns ok when the count succeeds", async () => {
    count.mockResolvedValue(1);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("x-robots-tag")).toBe("noindex");
  });

  it("returns 503 when the count throws", async () => {
    count.mockRejectedValue(new Error("db down"));
    const res = await GET();
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false });
  });
});
