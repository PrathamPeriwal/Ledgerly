import { NextResponse } from "next/server";
import { fixedWindow, request } from "@arcjet/next";
import { auth, currentUser } from "@clerk/nextjs/server";
import { defaultCategories } from "@/data/categories";
import aj from "@/lib/arcjet";
import { RECEIPT_PER_ATTEMPT_MS, RECEIPT_TOTAL_MS } from "@/lib/ai/config";
import { GeminiChainError, generateGeminiResult } from "@/lib/ai/gemini";
import { receiptJsonSchema } from "@/lib/ai/receipt-schema.mjs";
import { isDemoEmail } from "@/lib/send-email";

const scanByUser = aj.withRule(
  fixedWindow({ mode: "LIVE", characteristics: ["userId"], window: "1h", max: 10 }),
);
const scanByIp = aj.withRule(
  fixedWindow({ mode: "LIVE", characteristics: ["ip.src"], window: "1h", max: 15 }),
);
const scanByDemo = aj.withRule(
  fixedWindow({ mode: "LIVE", characteristics: ["demoScan"], window: "1h", max: 6 }),
);

const SCAN_LIMIT = "SCAN LIMIT REACHED. TRY AGAIN LATER.";

function scanLimited(decision) {
  const headers = {};
  const reason = decision?.reason;
  if (typeof reason?.isRateLimit === "function" && reason.isRateLimit() && Number.isFinite(reason.reset)) {
    headers["Retry-After"] = String(reason.reset);
  }
  return NextResponse.json({ error: SCAN_LIMIT }, { status: 429, headers });
}

export const runtime = "nodejs";
// Hobby with Fluid compute allows up to 300 s (Vercel docs); the scan chain needs 24 s at most.
export const maxDuration = 30;

const ALLOWED_RECEIPT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;

const CATEGORY_HINTS = {
  food: "restaurants, cafes, takeaway and bars",
  groceries: "supermarkets and grocery stores",
  transportation: "fuel, taxi, rideshare, transit and parking",
  healthcare: "pharmacy, medical, doctor and clinic",
  housing: "rent, mortgage and home repairs",
  utilities: "electricity, water, internet and phone",
  entertainment: "movies, games and streaming",
  shopping: "clothing, electronics and home goods",
  education: "tuition, books and courses",
  personal: "haircut, gym and beauty",
  travel: "flights, hotels and trips",
  insurance: "life, home and vehicle policies",
  gifts: "gifts and donations",
  bills: "bank fees and service charges",
  salary: "paychecks and wages",
  freelance: "contract and freelance pay",
  investments: "dividends and investment income",
  business: "business income",
  rental: "rent received",
  "other-income": "income that fits nothing else",
  "other-expense": "expenses that fit nothing else",
};

function categoryGuide() {
  return defaultCategories
    .map((category) => {
      const hint = CATEGORY_HINTS[category.id];
      return hint ? `${category.id} (${category.name}): ${hint}` : `${category.id} (${category.name})`;
    })
    .join("\n");
}

function normalizedReceipt(raw) {
  const data = raw && typeof raw === "object" ? raw : {};
  return {
    amount: data.amount ?? data["Total amount"] ?? null,
    date: data.date ?? data.Date ?? null,
    description: data.description ?? data.Description ?? "",
    merchantName: data.merchantName ?? data["Merchant name"] ?? "",
    category: data.category ?? data.Category ?? "",
  };
}

export async function POST(req) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clerkUser = await currentUser();
    const email = clerkUser?.emailAddresses?.[0]?.emailAddress ?? "";
    const demo = isDemoEmail(email);
    try {
      const arcjetRequest = await request();
      const props = { userId, requested: 1 };
      const decisions = await Promise.all([
        scanByUser.protect(arcjetRequest, props),
        scanByIp.protect(arcjetRequest, props),
        ...(demo ? [scanByDemo.protect(arcjetRequest, { ...props, demoScan: "shared" })] : []),
      ]);
      const denied = decisions.find((decision) => decision.isDenied());
      if (denied) return scanLimited(denied);
    } catch (error) {
      console.error("[scan-receipt] arcjet", error instanceof Error ? error.name : "failed");
      if (demo) return NextResponse.json({ error: SCAN_LIMIT }, { status: 429 });
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Expected a file upload" }, { status: 400 });
    }

    const mimeType = file.type || "application/octet-stream";
    if (!ALLOWED_RECEIPT_TYPES.has(mimeType)) {
      return NextResponse.json(
        { error: "Only JPEG, PNG, and WebP images are allowed" },
        { status: 400 }
      );
    }

    if (file.size > MAX_RECEIPT_BYTES) {
      return NextResponse.json(
        { error: "File must be 5 MB or smaller" },
        { status: 400 }
      );
    }

    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "Missing GEMINI_API_KEY" },
        { status: 500 }
      );
    }

    const today = new Date().toISOString().slice(0, 10);
    const jsonSchema = receiptJsonSchema();

    const prompt = `
Today is ${today}.
Read this receipt and return amount, date, description, merchantName, and category.
The amount is the receipt total in Indian rupees.
date is YYYY-MM-DD. Return null for date when the receipt shows none.
category must be one of these ids:
${categoryGuide()}
`;

    let result;
    try {
      result = await generateGeminiResult({
        contents: [{ text: prompt }, { inlineData: { data: base64, mimeType } }],
        perAttemptMs: RECEIPT_PER_ATTEMPT_MS,
        totalMs: RECEIPT_TOTAL_MS,
        jsonSchema,
      });
    } catch (error) {
      if (!(error instanceof GeminiChainError)) throw error;
      console.error("[scan-receipt]", error.attempts.map((a) => `${a.model}:${a.status}:${a.ms}ms`).join(" "));
      return NextResponse.json(
        { error: "SCANNER_BUSY" },
        { status: 503, headers: { "Retry-After": "30" } },
      );
    }
    console.info("[scan-receipt] ok", result.model, result.attempts.length);

    let parsed;
    try {
      const cleaned = result.text.replace(/```(?:json)?|```/g, "").trim();
      parsed = JSON.parse(cleaned || "{}");
    } catch {
      return NextResponse.json({ error: "UNREADABLE" }, { status: 422 });
    }

    return NextResponse.json(normalizedReceipt(parsed));
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Gemini error" },
      { status: 500 }
    );
  }
}
