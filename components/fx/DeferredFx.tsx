"use client";

import { useEffect, useState, type ComponentType } from "react";

/** Non-critical effects (custom cursor, grid drift) mount after hydration, when the browser is idle. */
export function DeferredFx() {
  const [parts, setParts] = useState<ComponentType[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      void Promise.all([import("./CustomCursor"), import("./GridBackground")]).then(([cursor, grid]) => {
        if (!cancelled) setParts([cursor.CustomCursor, grid.BgGridDrift]);
      });
    };
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(load, { timeout: 3000 });
      return () => {
        cancelled = true;
        w.cancelIdleCallback?.(id);
      };
    }
    const id = window.setTimeout(load, 1500);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, []);

  return (
    <>
      {parts.map((Part, i) => (
        <Part key={i} />
      ))}
    </>
  );
}
