import { describe, expect, it } from "vitest";
import { cardWindow, sectionHeightVh } from "@/lib/fx/stack-timing";

describe("stack timing", () => {
  it("splits enter windows into equal non-overlapping slots", () => {
    const count = 3;
    const windows = Array.from({ length: count }, (_, index) => cardWindow(index, count));
    const lengths = windows.map((window) => window.enterEnd - window.enterStart);
    expect(new Set(lengths.map((length) => length.toFixed(6))).size).toBe(1);
    for (let index = 1; index < windows.length; index += 1) {
      expect(windows[index].enterStart).toBeGreaterThanOrEqual(windows[index - 1].enterEnd - 1e-9);
    }
    expect(windows[count - 1].enterEnd).toBeLessThanOrEqual(0.95);
  });

  it("sizes a three-card section at 325vh", () => {
    expect(sectionHeightVh(3)).toBe(325);
  });
});