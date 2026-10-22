"use client";

import { useEffect, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { useRouteProgress } from "@/components/route-progress";
import { usePrivacy } from "@/components/fx/Privacy";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

export const COMMAND_MENU_EVENT = "ledgerly:command-menu";

export function openCommandMenu() {
  window.dispatchEvent(new Event(COMMAND_MENU_EVENT));
}

function isTyping(target: EventTarget | null) {
  const el = target instanceof HTMLElement ? target : document.activeElement;
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { start } = useRouteProgress();
  const { signOut } = useClerk();
  const { toggle } = usePrivacy();

  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (typeof event.key !== "string") return;
      if (event.repeat) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
        return;
      }
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key.toLowerCase() !== "n") return;
      if (isTyping(event.target)) return;
      event.preventDefault();
      start();
      router.push("/transaction/create");
    };

    const onOpen = () => setOpen(true);
    document.documentElement.dataset.commandMenu = "ready";
    window.addEventListener("keydown", onKey, true);
    window.addEventListener(COMMAND_MENU_EVENT, onOpen);
    return () => {
      delete document.documentElement.dataset.commandMenu;
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener(COMMAND_MENU_EVENT, onOpen);
    };
  }, [router, start]);

  const go = (href: string) => {
    setOpen(false);
    start();
    router.push(href);
  };

  const runSelected = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (typeof event.key !== "string" || event.key !== "Enter") return;
    const selected = event.currentTarget.querySelector<HTMLElement>("[cmdk-item][data-selected='true']");
    const label = selected?.textContent?.trim().toLowerCase() ?? "";
    if (!label) return;
    event.preventDefault();
    if (label.includes("dashboard")) go("/dashboard");
    else if (label.includes("add transaction")) go("/transaction/create");
    else if (label.includes("privacy")) {
      toggle();
      setOpen(false);
    } else if (label.includes("sign out")) {
      setOpen(false);
      start();
      void signOut({ redirectUrl: "/" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-md">
        <DialogTitle className="sr-only">Command menu</DialogTitle>
        <DialogDescription className="sr-only">Search pages and actions.</DialogDescription>
        <Command onKeyDown={runSelected}>
          <CommandInput autoFocus placeholder="Type a command" className="pr-8" />
          <CommandList>
            <CommandEmpty>No matches.</CommandEmpty>
            <CommandGroup heading="Navigate">
              <CommandItem className="label" value="Dashboard" onSelect={() => go("/dashboard")}>
                Dashboard
              </CommandItem>
              <CommandItem
                className="label"
                value="Add transaction"
                onSelect={() => go("/transaction/create")}
              >
                Add transaction
              </CommandItem>
            </CommandGroup>
            <CommandGroup heading="Actions">
              <CommandItem
                className="label"
                value="Toggle privacy mode"
                onSelect={() => {
                  toggle();
                  setOpen(false);
                }}
              >
                Toggle privacy mode
              </CommandItem>
              <CommandItem
                className="label"
                value="Sign out"
                onSelect={() => {
                  setOpen(false);
                  start();
                  void signOut({ redirectUrl: "/" });
                }}
              >
                Sign out
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
