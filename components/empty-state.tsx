import type { ReactNode } from "react";
import { HatchFill } from "@/components/fx/LineArt";

export function EmptyState({
  title,
  text,
  action,
}: {
  title: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-4">
      <HatchFill size={72} />
      <p className="display text-3xl">{title}</p>
      {text ? <p className="max-w-md">{text}</p> : null}
      {action}
    </div>
  );
}
