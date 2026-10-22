import { describe, expect, it } from "vitest";
import { enterWindow, sectionHeightVh, stackFrame } from "@/lib/fx/stack-timing";

const N = 3;
const samples = Array.from({ length: 201 }, (_, i) => i / 200);

describe("stack timing", () => {
  it("has equal, non-overlapping enter windows that finish by 0.95", () => {
    const w = Array.from({ length: N }, (_, i) => enterWindow(i, N));
    const lengths = w.map((x) => (x.end - x.start).toFixed(6));
    expect(new Set(lengths).size).toBe(1);
    for (let i = 1; i < N; i += 1) expect(w[i].start).toBeGreaterThanOrEqual(w[i - 1].end - 1e-9);
    expect(w[N - 1].end).toBeLessThanOrEqual(0.95);
    expect(w[0].end).toBeCloseTo(1 / (2 * N));
  });

  it("grid offset is strictly increasing over the whole range", () => {
    for (let i = 1; i < samples.length; i += 1) {
      expect(stackFrame(samples[i], N).gridOffset).toBeGreaterThan(stackFrame(samples[i - 1], N).gridOffset);
    }
  });

  it("starts empty and ends complete", () => {
    expect(stackFrame(0, N).cards.every((c) => c.enter === 0)).toBe(true);
    const end = stackFrame(1, N).cards;
    expect(end.every((c) => c.enter === 1)).toBe(true);
    expect(end[N - 1].local).toBe(1);
    expect(end[N - 1].dim).toBe(0);
  });

  it("dims a card while the next one enters", () => {
    expect(stackFrame(0, N).cards[0].dim).toBe(0);
    expect(stackFrame(1, N).cards[0].dim).toBe(1);
  });

  it("sizes a three-card section at 325vh", () => {
    expect(sectionHeightVh(3)).toBe(325);
  });

  it("never has a dead zone", () => {
    for (let i = 1; i < samples.length; i += 1) {
      const a = stackFrame(samples[i - 1], N);
      const b = stackFrame(samples[i], N);
      const moved =
        a.gridOffset !== b.gridOffset ||
        a.cards.some((c, k) => c.enter !== b.cards[k].enter || c.local !== b.cards[k].local);
      expect(moved).toBe(true);
    }
  });
});
