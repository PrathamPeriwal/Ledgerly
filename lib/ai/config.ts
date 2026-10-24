/**
 * Gemini model chain. GEMINI_MODEL (primary) and GEMINI_FALLBACK_MODELS (comma separated)
 * are optional env overrides; see docs/ENV.md and docs/ARCHITECTURE.md ("AI").
 */
export const DEFAULT_PRIMARY_MODEL = "gemini-3.5-flash-lite";
export const DEFAULT_FALLBACK_MODELS = ["gemini-3.6-flash"];

export const RECEIPT_PER_ATTEMPT_MS = 12_000;
export const RECEIPT_TOTAL_MS = 24_000;
export const INSIGHTS_PER_ATTEMPT_MS = 10_000;
export const INSIGHTS_TOTAL_MS = 20_000;

/** Read at call time so env changes (and tests) apply. */
export function geminiModelChain(): string[] {
  const primary = process.env.GEMINI_MODEL?.trim() || DEFAULT_PRIMARY_MODEL;
  const fallbacks = process.env.GEMINI_FALLBACK_MODELS
    ? process.env.GEMINI_FALLBACK_MODELS.split(",").map((m) => m.trim()).filter(Boolean)
    : DEFAULT_FALLBACK_MODELS;
  return [primary, ...fallbacks.filter((m) => m !== primary)];
}
