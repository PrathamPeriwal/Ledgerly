"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "ledgerly-privacy";

type PrivacyContextValue = {
  hidden: boolean;
  toggle: () => void;
};

const PrivacyContext = createContext<PrivacyContextValue | null>(null);

function persist(hidden: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, hidden ? "1" : "0");
  } catch {
    /* storage blocked */
  }
}

function isTyping(target: EventTarget | null) {
  const el = target instanceof HTMLElement ? target : null;
  const active = el ?? (typeof document !== "undefined" ? document.activeElement : null);
  if (!(active instanceof HTMLElement)) return false;
  const tag = active.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || active.isContentEditable;
}

export function PrivacyProvider({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState(false);

  const toggle = useCallback(() => {
    setHidden((current) => {
      const next = !current;
      persist(next);
      return next;
    });
  }, []);

  useEffect(() => {
    try {
      setHidden(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      /* storage blocked */
    }

    const onKey = (event: KeyboardEvent) => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key.toLowerCase() !== "h") return;
      if (isTyping(event.target)) return;
      toggle();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  return <PrivacyContext.Provider value={{ hidden, toggle }}>{children}</PrivacyContext.Provider>;
}

export function usePrivacy() {
  const value = useContext(PrivacyContext);
  if (!value) throw new Error("usePrivacy must be used within PrivacyProvider");
  return value;
}

export function Amount({
  value,
  sign,
  className,
}: {
  value: number;
  sign?: boolean;
  className?: string;
}) {
  const { hidden } = usePrivacy();
  const text = formatCurrency(value, sign ? { sign: true } : undefined);
  if (!hidden) return <span className={cn("font-num", className)}>{text}</span>;

  const digits = text.replace(/[^0-9]/g, "").length || 1;
  return (
    <span
      tabIndex={0}
      className={cn(
        "group relative inline-block font-num outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A1B1C]",
        className,
      )}
    >
      <span className="opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus:opacity-100">
        {text}
      </span>
      <span
        aria-hidden
        className="pointer-events-none absolute left-0 top-1/2 h-[1em] -translate-y-1/2 bg-[#1A1B1C] transition-opacity duration-150 group-hover:opacity-0 group-focus:opacity-0"
        style={{ width: `${digits}ch` }}
      />
    </span>
  );
}

export function PrivacyToggle({ className }: { className?: string }) {
  const { hidden, toggle } = usePrivacy();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={hidden}
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-none border-2 border-[#1A1B1C] bg-white px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#1A1B1C]",
        className,
      )}
    >
      {hidden ? "SHOW" : "HIDE"}
    </button>
  );
}
