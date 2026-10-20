import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, generateContent, getGenerativeModel } = vi.hoisted(() => {
  const generateContent = vi.fn();
  const getGenerativeModel = vi.fn(() => ({ generateContent }));
  const auth = vi.fn();
  return { auth, generateContent, getGenerativeModel };
});

vi.mock("@clerk/nextjs/server", () => ({ auth }));

vi.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: vi.fn(function GoogleGenerativeAI() {
    return { getGenerativeModel };
  }),
}));

import { POST } from "@/app/api/scan-receipt/route";

const RECEIPT = {
  amount: 12.5,
  date: "2024-01-02",
  description: "Coffee",
  merchantName: "Cafe",
  category: "food",
};

function request(body) {
  return new Request("http://localhost/api/scan-receipt", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function mockReceiptText() {
  generateContent.mockResolvedValue({
    response: {
      text: () => "```json\n" + JSON.stringify(RECEIPT) + "\n```",
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.GEMINI_API_KEY = "test-key";
  auth.mockResolvedValue({ userId: "clerk_user" });
  getGenerativeModel.mockReturnValue({ generateContent });
  mockReceiptText();
});

describe("POST /api/scan-receipt", () => {
  it("returns 401 when there is no user", async () => {
    auth.mockResolvedValue({ userId: null });

    const res = await POST(
      request({ base64: Buffer.from("tiny").toString("base64"), mimeType: "image/png" })
    );

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("rejects a mime type outside jpeg, png, and webp", async () => {
    const res = await POST(
      request({ base64: Buffer.from("tiny").toString("base64"), mimeType: "image/gif" })
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/JPEG, PNG, and WebP/i);
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("rejects a file over 5 MB", async () => {
    const base64 = Buffer.alloc(5 * 1024 * 1024 + 1, 1).toString("base64");

    const res = await POST(request({ base64, mimeType: "image/jpeg" }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/5 MB/);
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("returns the parsed receipt JSON for a valid image", async () => {
    const res = await POST(
      request({ base64: Buffer.from("tiny").toString("base64"), mimeType: "image/webp" })
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(RECEIPT);
    expect(getGenerativeModel).toHaveBeenCalledWith({ model: "gemini-2.5-flash" });
    expect(generateContent).toHaveBeenCalledOnce();
  });
});
