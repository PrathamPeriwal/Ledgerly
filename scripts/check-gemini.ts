// Sends ONE tiny receipt request per candidate model (15 s abort) and prints id, status, latency.
// Usage: npm run check:gemini. Never prints the API key.
import { existsSync, readFileSync } from "node:fs";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { receiptJsonSchema } from "../lib/ai/receipt-schema.mjs";
import { renderReceipts } from "./receipt-images.mjs";

if (existsSync(".env")) {
  for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

const primary = process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash-lite";
const fallbacks = process.env.GEMINI_FALLBACK_MODELS
  ? process.env.GEMINI_FALLBACK_MODELS.split(",").map((m) => m.trim()).filter(Boolean)
  : ["gemini-3.6-flash"];
const models = [primary, ...fallbacks.filter((m) => m !== primary)];

const { supermarket } = await renderReceipts(600);
const data = supermarket.toString("base64");
const ai = new GoogleGenAI({ apiKey });

console.log("model | status | latency_ms | category");
for (const model of models) {
  const t0 = Date.now();
  let status = "200";
  let category = "";
  try {
    const response = await ai.models.generateContent({
      model,
      contents: [
        { text: "Read this receipt (amounts in rupees). Return amount, date, description, merchantName, category." },
        { inlineData: { data, mimeType: "image/png" } },
      ],
      config: {
        abortSignal: AbortSignal.timeout(15_000),
        thinkingConfig: {
          thinkingLevel: /gemini-3\.(6|5|1)-/.test(model) ? ThinkingLevel.MINIMAL : ThinkingLevel.LOW,
        },
        responseMimeType: "application/json",
        responseJsonSchema: receiptJsonSchema(),
      },
    });
    category = String(JSON.parse(response.text ?? "{}").category ?? "");
  } catch (error) {
    const e = error as { status?: number; name?: string };
    status = typeof e.status === "number" ? String(e.status) : e.name === "TimeoutError" || e.name === "AbortError" ? "timeout" : (e.name ?? "error");
  }
  console.log(`${model} | ${status} | ${Date.now() - t0} | ${category}`);
}
