import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, currentUser, generateContent, protect, withRule, arcjetRequest, scanRules } = vi.hoisted(() => {
  const generateContent = vi.fn();
  const auth = vi.fn();
  const currentUser = vi.fn();
  const protect = vi.fn();
  const scanRules = [];
  const withRule = vi.fn((rule) => {
    scanRules.push(rule);
    return { protect };
  });
  const arcjetRequest = vi.fn(async () => ({ headers: {} }));
  return { auth, currentUser, generateContent, protect, withRule, arcjetRequest, scanRules };
});

vi.mock("@clerk/nextjs/server", () => ({ auth, currentUser }));

vi.mock("@/lib/arcjet", () => ({ default: { withRule } }));

vi.mock("@arcjet/next", () => ({
  fixedWindow: (rule) => rule,
  request: arcjetRequest,
}));

vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn(function GoogleGenAI() {
    return { models: { generateContent } };
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

function request(file) {
  const body = new FormData();
  if (file) body.set("file", file);
  return new Request("http://localhost/api/scan-receipt", { method: "POST", body });
}

function image(bytes, type) {
  return new File([bytes], "receipt", { type });
}

function mockReceiptText() {
  generateContent.mockResolvedValue({ text: "```json\n" + JSON.stringify(RECEIPT) + "\n```" });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.GEMINI_API_KEY = "test-key";
  auth.mockResolvedValue({ userId: "clerk_user" });
  currentUser.mockResolvedValue({ emailAddresses: [{ emailAddress: "ada@example.com" }] });
  protect.mockResolvedValue({ isDenied: () => false });
  mockReceiptText();
});

describe("POST /api/scan-receipt", () => {
  it("returns 401 when there is no user", async () => {
    auth.mockResolvedValue({ userId: null });

    const res = await POST(request(image(Buffer.from("tiny"), "image/png")));

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("rejects a mime type outside jpeg, png, and webp", async () => {
    const res = await POST(request(image(Buffer.from("tiny"), "image/gif")));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/JPEG, PNG, and WebP/i);
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("rejects a file over 5 MB", async () => {
    const res = await POST(request(image(Buffer.alloc(5 * 1024 * 1024 + 1), "image/jpeg")));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/5 MB/);
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("returns the parsed receipt JSON for a valid image", async () => {
    const res = await POST(request(image(Buffer.from("tiny"), "image/webp")));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(RECEIPT);
    const call = generateContent.mock.calls[0][0];
    expect(call.model).toBe("gemini-3.8-flash");
    expect(call.config.responseMimeType).toBe("application/json");
    expect(call.config.httpOptions.timeout).toBe(25_000);
    expect(call.config.responseJsonSchema.properties.category.enum).toEqual(
      expect.arrayContaining(["groceries", "food", "transportation"])
    );
    expect(call.contents[1].inlineData.mimeType).toBe("image/webp");
    const prompt = call.contents[0].text;
    expect(prompt).toMatch(/groceries \(Groceries\): supermarkets and grocery stores/);
    expect(prompt).toMatch(/food \(Food\): restaurants, cafes, takeaway and bars/);
    expect(prompt).toMatch(/\d{4}-\d{2}-\d{2}/);
    expect(generateContent).toHaveBeenCalledOnce();
  });

  it("allows a scan after Arcjet and calls Gemini once", async () => {
    const res = await POST(request(image(Buffer.from("tiny"), "image/png")));

    expect(res.status).toBe(200);
    expect(generateContent).toHaveBeenCalledOnce();
    expect(scanRules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ max: 10, characteristics: ["userId"], window: "1h" }),
        expect.objectContaining({ max: 15, characteristics: ["ip.src"], window: "1h" }),
        expect.objectContaining({ max: 6, characteristics: ["demoScan"], window: "1h" }),
      ]),
    );
  });

  it("returns 429 on a user denial and never calls Gemini", async () => {
    protect.mockResolvedValue({ isDenied: () => true, reason: { isRateLimit: () => true, reset: 12 } });
    const req = request(image(Buffer.from("tiny"), "image/png"));
    const formData = vi.spyOn(req, "formData");

    const res = await POST(req);

    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: "SCAN LIMIT REACHED. TRY AGAIN LATER." });
    expect(res.headers.get("Retry-After")).toBe("12");
    expect(formData).not.toHaveBeenCalled();
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("uses the shared demo limit for a demo email", async () => {
    currentUser.mockResolvedValue({ emailAddresses: [{ emailAddress: "maya@example.com" }] });

    const res = await POST(request(image(Buffer.from("tiny"), "image/png")));

    expect(res.status).toBe(200);
    expect(protect).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ demoScan: "shared", userId: "clerk_user" }));
  });

  it("allows a normal user when Arcjet errors and denies the demo user", async () => {
    protect.mockRejectedValue(new Error("arcjet down"));
    const allowed = await POST(request(image(Buffer.from("tiny"), "image/png")));
    expect(allowed.status).toBe(200);
    expect(generateContent).toHaveBeenCalledOnce();

    generateContent.mockClear();
    currentUser.mockResolvedValue({ emailAddresses: [{ emailAddress: "maya@example.com" }] });
    const denied = await POST(request(image(Buffer.from("tiny"), "image/png")));
    expect(denied.status).toBe(429);
    expect(await denied.json()).toEqual({ error: "SCAN LIMIT REACHED. TRY AGAIN LATER." });
    expect(generateContent).not.toHaveBeenCalled();
  });
});
