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
