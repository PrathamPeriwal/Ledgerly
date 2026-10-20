import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function TiltedTag({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-block -rotate-[4deg] border-2 border-[#1A1B1C] bg-white px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#1A1B1C]",
        className,
      )}
    >
      {children}
    </span>
  );
}
