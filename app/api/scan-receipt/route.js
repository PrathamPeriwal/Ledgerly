import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { auth } from "@clerk/nextjs/server";
import { defaultCategories } from "@/data/categories";

export const runtime = "nodejs";

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

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const categoryIds = defaultCategories.map((category) => category.id);
    const today = new Date().toISOString().slice(0, 10);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            amount: { type: "number" },
            date: { type: "string", nullable: true, description: "YYYY-MM-DD, or null when the receipt shows no date" },
            description: { type: "string" },
            merchantName: { type: "string" },
            category: { type: "string", enum: categoryIds },
          },
          required: ["amount", "date", "description", "merchantName", "category"],
        },
      },
    });

    const prompt = `
Today is ${today}.
Read this receipt and return amount, date, description, merchantName, and category.
date is YYYY-MM-DD. Return null for date when the receipt shows none.
category must be one of these ids:
${categoryGuide()}
`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64,
          mimeType,
        },
      },
    ]);

    const text = result.response.text();
    const cleaned = text.replace(/```(?:json)?|```/g, "").trim();

    return NextResponse.json(normalizedReceipt(JSON.parse(cleaned || "{}")));
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Gemini error" },
      { status: 500 }
    );
  }
}
