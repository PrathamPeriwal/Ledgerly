import { GoogleGenAI, type Part, type ThinkingLevel } from "@google/genai";
import { geminiModelChain } from "@/lib/ai/config";

export type Attempt = { model: string; status: number | "timeout" | "error" | "ok"; ms: number };

export type GenerateOptions = { perAttemptMs: number; totalMs: number };

/** Thrown when no model produced a result. `attempts` holds model ids and status codes only. */
export class GeminiChainError extends Error {
  constructor(
    public readonly attempts: Attempt[],
    /** True when a non-retryable status (400, 401, 403) stopped the chain. */
    public readonly fatal: boolean,
  ) {
    super("Gemini unavailable");
    this.name = "GeminiChainError";
  }
}

const RETRYABLE = new Set([429, 500, 503, 504]);
const MIN_ATTEMPT_MS = 1_000;

/** The one place a Gemini client is built. Throws when the API key is missing. */
export function createGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY");
  return new GoogleGenAI({ apiKey });
}

function statusOf(error: unknown): number | "error" {
  const status = (error as { status?: unknown; code?: unknown } | null)?.status ?? (error as { code?: unknown } | null)?.code;
  return typeof status === "number" ? status : "error";
}

/**
 * Tries each model in order. Every attempt gets its own AbortController (aborted at perAttemptMs
 * or when the total budget runs out). Retryable failures (429, 500, 503, 504, timeout) move to the
 * next model; 400, 401 and 403 stop at once. After the chain, one retry of the first model runs
 * only if at least MIN_ATTEMPT_MS of the total budget is left.
 */
export async function generateWithFallback<T>(
  models: string[],
  build: (model: string, signal: AbortSignal) => Promise<T>,
  { perAttemptMs, totalMs }: GenerateOptions,
): Promise<{ value: T; model: string; attempts: Attempt[] }> {
  const started = Date.now();
  const attempts: Attempt[] = [];
  const order = models.length ? [...models, models[0]] : [];

  for (const model of order) {
    const left = totalMs - (Date.now() - started);
    if (left < MIN_ATTEMPT_MS) break;
    const budget = Math.min(perAttemptMs, left);
    const controller = new AbortController();
    const t0 = Date.now();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timedOut = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(Object.assign(new Error("timeout"), { timeout: true }));
      }, budget);
    });
    try {
      const value = await Promise.race([build(model, controller.signal), timedOut]);
      attempts.push({ model, status: "ok", ms: Date.now() - t0 });
      return { value, model, attempts };
    } catch (error) {
      const timeout = (error as { timeout?: boolean } | null)?.timeout === true;
      const status = timeout ? "timeout" : statusOf(error);
      attempts.push({ model, status, ms: Date.now() - t0 });
      const retryable = timeout || status === "error" || (typeof status === "number" && RETRYABLE.has(status));
      if (!retryable) {
        console.error("[gemini] stopped", model, status);
        throw new GeminiChainError(attempts, true);
      }
    } finally {
      clearTimeout(timer);
    }
  }
  throw new GeminiChainError(attempts, false);
}

/** Minimal thinking where the model allows it (docs: thinking_level), otherwise low. */
export function thinkingFor(model: string, modest = false): ThinkingLevel {
  if (modest) return "LOW" as ThinkingLevel;
  return /gemini-3\.(6|5|1)-.*(flash|lite)/.test(model) ? ("MINIMAL" as ThinkingLevel) : ("LOW" as ThinkingLevel);
}

export type GeminiRequest = {
  contents: string | Part[];
  perAttemptMs: number;
  totalMs: number;
  /** JSON schema for structured output; the response is then application/json. */
  jsonSchema?: Record<string, unknown>;
  /** Modest instead of minimal thinking (insights). */
  modestThinking?: boolean;
};

/** generateContent over the model chain. Returns the text and which model answered. */
export async function generateGeminiResult({
  contents,
  perAttemptMs,
  totalMs,
  jsonSchema,
  modestThinking,
}: GeminiRequest): Promise<{ text: string; model: string; attempts: Attempt[] }> {
  const ai = createGeminiClient();
  const { value, model, attempts } = await generateWithFallback(
    geminiModelChain(),
    (model, signal) =>
      ai.models.generateContent({
        model,
        contents,
        config: {
          abortSignal: signal,
          thinkingConfig: { thinkingLevel: thinkingFor(model, modestThinking) },
          ...(jsonSchema ? { responseMimeType: "application/json", responseJsonSchema: jsonSchema } : {}),
        },
      }),
    { perAttemptMs, totalMs },
  );
  return { text: value.text ?? "", model, attempts };
}

export async function generateGeminiText(request: GeminiRequest): Promise<string> {
  return (await generateGeminiResult(request)).text;
}
