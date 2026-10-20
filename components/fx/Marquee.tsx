import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const STYLE = `
@keyframes fx-marquee-x {
  from { transform: translate3d(0, 0, 0); }
  to { transform: translate3d(-50%, 0, 0); }
}
.fx-marquee-track {
  display: flex;
  width: max-content;
  animation: fx-marquee-x var(--fx-marquee-duration, 28s) linear infinite;
}
.fx-marquee:hover .fx-marquee-track {
  animation-play-state: paused;
}
@media (prefers-reduced-motion: reduce) {
  .fx-marquee-track { animation: none; }
}
`;

export function Marquee({
  items,
  speed = 1,
  separator = "  ·  ",
  className,
}: {
  items: readonly ReactNode[];
  speed?: number;
  separator?: ReactNode;
  className?: string;
}) {
  if (items.length === 0) return null;
  const duration = Math.max(12, 36 / Math.max(speed, 0.2));
  const line = (copy: boolean) =>
    items.map((item, index) => (
      <span key={`${copy ? "b" : "a"}-${index}`} className="inline-flex items-center">
        {index > 0 ? <span className="px-3">{separator}</span> : null}
        {item}
      </span>
    ));

  return (
    <div className={cn("fx-marquee overflow-hidden border-y-2 border-[#1A1B1C] bg-white", className)}>
      <style>{STYLE}</style>
      <div
        className="fx-marquee-track label py-3"
        style={{ ["--fx-marquee-duration" as string]: `${duration}s` }}
      >
        <span className="inline-flex px-3">{line(false)}</span>
        <span className="inline-flex px-3" aria-hidden>
          {line(true)}
        </span>
      </div>
    </div>
  );
}
