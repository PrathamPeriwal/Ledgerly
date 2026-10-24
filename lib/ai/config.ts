/** Gemini model id. Override with the GEMINI_MODEL env var; see docs/ARCHITECTURE.md ("AI"). */
export const GEMINI_MODEL: string = process.env.GEMINI_MODEL || "gemini-3.8-flash";

export const RECEIPT_TIMEOUT_MS = 25_000;
export const INSIGHTS_TIMEOUT_MS = 20_000;
