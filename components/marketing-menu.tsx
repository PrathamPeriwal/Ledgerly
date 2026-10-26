"use client";

import { MarketingLinks } from "@/components/marketing-nav";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";

export function MarketingMenu({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="h-full w-full max-w-none gap-0 p-0 sm:max-w-none">
        <SheetTitle className="sr-only">Menu</SheetTitle>
        <SheetDescription className="sr-only">Site links</SheetDescription>
        <div className="flex h-full flex-col pt-14">
          <nav className="flex flex-col border-t-strong border-border">
            <MarketingLinks stacked onNavigate={() => onOpenChange(false)} />
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  );
}
