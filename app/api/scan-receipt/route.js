import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";

const ALLOWED_RECEIPT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;

function base64DecodedBytes(value) {
  if (typeof value !== "string") return 0;
  const cleaned = value.replace(/\s/g, "");
  if (!cleaned) return 0;
  const padding = cleaned.endsWith("==") ? 2 : cleaned.endsWith("=") ? 1 : 0;
  return Math.floor((cleaned.length * 3) / 4) - padding;
}

export async function POST(req) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { base64, mimeType = "image/jpeg" } = body;

    if (!ALLOWED_RECEIPT_TYPES.has(mimeType)) {
      return NextResponse.json(
        { error: "Only JPEG, PNG, and WebP images are allowed" },
        { status: 400 }
      );
    }

    if (base64DecodedBytes(base64) > MAX_RECEIPT_BYTES) {
      return NextResponse.json(
        { error: "File must be 5 MB or smaller" },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "Missing GEMINI_API_KEY" },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    const prompt = `
Analyze this receipt image and extract the following information in JSON format:
- Total amount
- Date (ISO format)
- Description
- Merchant name
- Category

Respond ONLY with valid JSON.
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

    return NextResponse.json(JSON.parse(cleaned || "{}"));
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Gemini error" },
      { status: 500 }
    );
  }
}
