import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, generateContent, getGenerativeModel } = vi.hoisted(() => {
  const generateContent = vi.fn();
  const getGenerativeModel = vi.fn(() => ({ generateContent }));
  const auth = vi.fn();
  return { auth, generateContent, getGenerativeModel };
});

vi.mock("@clerk/nextjs/server", () => ({ auth }));

vi.mock("@/lib/prisma", () => ({
  db: {
    user: { findUnique: vi.fn() },
    account: { findUnique: vi.fn(), update: vi.fn() },
    transaction: { findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
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
    return { getGenerativeModel };
  }),
}));

import { scanReceipt } from "@/actions/transaction";

const RECEIPT = {
  amount: 12.5,
  date: "2024-01-02",
  description: "Coffee",
  merchantName: "Cafe",
  category: "food",
};

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

describe("scanReceipt", () => {
  it("throws Unauthorized when there is no user", async () => {
    auth.mockResolvedValue({ userId: null });

    await expect(
      scanReceipt({ base64: Buffer.from("tiny").toString("base64"), mimeType: "image/png" })
    ).rejects.toThrow("Unauthorized");
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("rejects a mime type outside jpeg, png, and webp", async () => {
    await expect(
      scanReceipt({ base64: Buffer.from("tiny").toString("base64"), mimeType: "application/pdf" })
    ).rejects.toThrow(/JPEG, PNG, and WebP/i);
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("rejects a file over 5 MB", async () => {
    const base64 = Buffer.alloc(5 * 1024 * 1024 + 1, 1).toString("base64");

    await expect(scanReceipt({ base64, mimeType: "image/jpeg" })).rejects.toThrow(/5 MB/);
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("returns the existing receipt shape for a valid image", async () => {
    const result = await scanReceipt({
      base64: Buffer.from("tiny").toString("base64"),
      mimeType: "image/png",
    });

    expect(result).toEqual({
      amount: 12.5,
      date: new Date("2024-01-02"),
      description: "Coffee",
      category: "food",
      merchantName: "Cafe",
    });
    expect(getGenerativeModel).toHaveBeenCalledWith({ model: "gemini-2.5-flash" });
    expect(generateContent).toHaveBeenCalledOnce();
  });
});
