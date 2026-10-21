import { beforeEach, describe, expect, it, vi } from "vitest";

const { protect, getUserList, createSignInToken } = vi.hoisted(() => ({
  protect: vi.fn(),
  getUserList: vi.fn(),
  createSignInToken: vi.fn(),
}));

vi.mock("@arcjet/next", () => ({
  default: () => ({ protect }),
  request: async () => ({ headers: new Headers() }),
  fixedWindow: () => ({}),
  detectBot: () => ({}),
  shield: () => ({}),
}));

vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: async () => ({
    users: { getUserList },
    signInTokens: { createSignInToken },
  }),
}));

import { POST } from "@/app/api/demo-session/route";

function allow() {
  return { isDenied: () => false, reason: { isRateLimit: () => false } };
}

function call(url = "http://localhost/api/demo-session") {
  return POST(
    new Request(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "evil@example.org", userId: "user_evil" }),
    }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.DEMO_USER_EMAIL;
  protect.mockResolvedValue(allow());
  getUserList.mockResolvedValue({ data: [{ id: "user_maya" }] });
  createSignInToken.mockResolvedValue({ token: "ticket_maya" });
});

describe("POST /api/demo-session", () => {
  it("returns a ticket for the demo email", async () => {
    const res = await call();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ticket: "ticket_maya" });
    expect(getUserList).toHaveBeenCalledWith({ emailAddress: ["maya@example.com"], limit: 1 });
    expect(createSignInToken).toHaveBeenCalledWith({ userId: "user_maya", expiresInSeconds: 60 });
  });

  it("returns 403 when DEMO_USER_EMAIL is not a demo address", async () => {
    process.env.DEMO_USER_EMAIL = "person@example.org";
    const res = await call();
    expect(res.status).toBe(403);
    expect(getUserList).not.toHaveBeenCalled();
    expect(createSignInToken).not.toHaveBeenCalled();
  });

  it("ignores any email or id in the request body or query", async () => {
    process.env.DEMO_USER_EMAIL = "Maya@example.com";
    const res = await call("http://localhost/api/demo-session?email=evil@example.org&userId=user_evil");
    expect(res.status).toBe(200);
    expect(getUserList).toHaveBeenCalledWith({ emailAddress: ["maya@example.com"], limit: 1 });
    expect(createSignInToken).toHaveBeenCalledWith({ userId: "user_maya", expiresInSeconds: 60 });
  });

  it("returns 429 when the request is rate limited", async () => {
    protect.mockResolvedValue({ isDenied: () => true, reason: { isRateLimit: () => true } });
    const res = await call();
    expect(res.status).toBe(429);
    expect(getUserList).not.toHaveBeenCalled();
  });

  it("still allows the request when Arcjet errors", async () => {
    protect.mockRejectedValue(new Error("arcjet down"));
    const res = await call();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ticket: "ticket_maya" });
  });
});
