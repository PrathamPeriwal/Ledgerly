import type { ReactNode } from "react";
import { RevealHeading } from "@/components/fx/RevealHeading";

export function PageHeader({
  label,
  title,
  actions,
}: {
  label: string;
  title: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-6 border-b-strong border-border py-6">
      <div className="min-w-0">
        <p className="label text-muted-foreground">{label}</p>
        <RevealHeading as="h1" className="display text-4xl md:text-6xl">
          {title}
        </RevealHeading>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}
