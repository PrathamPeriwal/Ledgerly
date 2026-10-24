import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GeminiChainError, generateWithFallback } from "@/lib/ai/gemini";

const opts = { perAttemptMs: 12_000, totalMs: 24_000 };
const http = (status: number) => Object.assign(new Error(`http ${status}`), { status });

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("generateWithFallback", () => {
  it("falls back after a 503 and records ordered attempts", async () => {
    const build = vi.fn().mockRejectedValueOnce(http(503)).mockResolvedValueOnce("ok");
    const r = await generateWithFallback(["a", "b"], build, opts);
    expect(r.value).toBe("ok");
    expect(r.model).toBe("b");
    expect(r.attempts.map((x) => [x.model, x.status])).toEqual([["a", 503], ["b", "ok"]]);
    expect(build.mock.calls.map((c) => c[0])).toEqual(["a", "b"]);
  });

  it("aborts a hanging attempt at perAttemptMs then uses the next model", async () => {
    const signals: AbortSignal[] = [];
    const build = vi.fn((model: string, signal: AbortSignal) => {
      signals.push(signal);
      return model === "a" ? new Promise<string>(() => {}) : Promise.resolve("ok");
    });
    const p = generateWithFallback(["a", "b"], build, opts);
    await vi.advanceTimersByTimeAsync(12_000);
    const r = await p;
    expect(signals[0].aborted).toBe(true);
    expect(r.model).toBe("b");
    expect(r.attempts[0].status).toBe("timeout");
  });

  it("throws with all attempts when every model fails", async () => {
    const build = vi.fn().mockRejectedValue(http(503));
    const error = await generateWithFallback(["a", "b"], build, opts).catch((e) => e);
    expect(error).toBeInstanceOf(GeminiChainError);
    expect(error.fatal).toBe(false);
    expect(error.attempts.map((x: { model: string }) => x.model)).toEqual(["a", "b", "a"]);
  });

  it("stops at once on 400, 401 and 403", async () => {
    for (const status of [400, 401, 403]) {
      const build = vi.fn().mockRejectedValue(http(status));
      const error = await generateWithFallback(["a", "b"], build, opts).catch((e) => e);
      expect(error.fatal).toBe(true);
      expect(build).toHaveBeenCalledTimes(1);
    }
  });

  it("never calls fallbacks after a first-model success", async () => {
    const build = vi.fn().mockResolvedValue("ok");
    await generateWithFallback(["a", "b"], build, opts);
    expect(build).toHaveBeenCalledTimes(1);
  });

  it("never exceeds the total budget when every attempt hangs", async () => {
    const build = vi.fn(() => new Promise<string>(() => {}));
    const start = Date.now();
    const p = generateWithFallback(["a", "b", "c"], build, opts).catch((e) => e);
    await vi.advanceTimersByTimeAsync(60_000);
    const error = await p;
    expect(error).toBeInstanceOf(GeminiChainError);
    expect(build).toHaveBeenCalledTimes(2);
    expect(error.attempts.reduce((n: number, x: { ms: number }) => n + x.ms, 0)).toBeLessThanOrEqual(24_000);
    expect(Date.now() - start).toBe(60_000);
  });
});
