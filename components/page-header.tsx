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
    <div className="flex w-full min-w-0 flex-col gap-4 border-b-strong border-border py-6 md:flex-row md:flex-wrap md:items-end md:justify-between">
      <div className="min-w-0">
        <p className="label text-muted-foreground">{label}</p>
        <RevealHeading as="h1" className="display break-words text-4xl md:text-6xl">
          {title}
        </RevealHeading>
      </div>
      {actions ? <div className="flex min-w-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
