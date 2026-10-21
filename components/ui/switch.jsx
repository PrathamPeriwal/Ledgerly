"use client";

import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

const Switch = React.forwardRef(({ className, checked, ...props }, ref) => (
  <span className="inline-flex items-center gap-2">
    <SwitchPrimitives.Root
      checked={checked}
      className={cn(
        "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-none border-bw border-border bg-card transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary",
        className
      )}
      {...props}
      ref={ref}
    >
      <SwitchPrimitives.Thumb
        className={cn(
          "pointer-events-none block h-4 w-4 rounded-none bg-foreground ring-0 transition-transform data-[state=checked]:translate-x-[22px] data-[state=unchecked]:translate-x-0.5"
        )}
      />
    </SwitchPrimitives.Root>
    <span className="label w-8 text-center">{checked ? "ON" : "OFF"}</span>
  </span>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
