"use client";

import { useAuth, useClerk, useSignIn } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { btnOrange, btnWhite } from "@/components/landing/ui";
import { useRouteProgress } from "@/components/route-progress";

let ticketRequest: Promise<string> | null = null;
let demoSessionId: string | null = null;
let started = false;

function requestTicket() {
  if (ticketRequest) return ticketRequest;
  ticketRequest = (async () => {
    const res = await fetch("/api/demo-session", { method: "POST" });
    const body = (await res.json().catch(() => ({}))) as { ticket?: string; error?: string };
    if (!res.ok || typeof body.ticket !== "string") {
      throw new Error(body.error || `demo ${res.status}`);
    }
    return body.ticket;
  })().finally(() => {
    ticketRequest = null;
  });
  return ticketRequest;
}

export default function DemoPage() {
  const router = useRouter();
  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  const { isLoaded: signInLoaded, signIn, setActive } = useSignIn();
  const { signOut } = useClerk();
  const { start } = useRouteProgress();
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  const phase = useRef<"idle" | "out" | "done">("idle");

  useEffect(() => {
    if (!authLoaded || !signInLoaded || !signIn || !setActive) return;
    if (phase.current === "done") return;

    if (demoSessionId) {
      if (isSignedIn) {
        start();
        router.replace("/dashboard");
      }
      return;
    }

    if (isSignedIn) {
      if (phase.current !== "out") {
        phase.current = "out";
        void signOut({ redirectUrl: "/demo" }).catch(() => {
          phase.current = "idle";
          setFailed(true);
        });
      }
      return;
    }

    if (started) return;
    started = true;

    void (async () => {
      try {
        const ticket = await requestTicket();
        const created = await signIn.create({ strategy: "ticket", ticket });
        if (created.status !== "complete" || !created.createdSessionId) {
          throw new Error(created.status || "incomplete");
        }
        demoSessionId = created.createdSessionId;
        await setActive({ session: created.createdSessionId });
        phase.current = "done";
        start();
        router.replace("/dashboard");
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (demoSessionId || message.includes("already signed in")) {
          phase.current = "done";
          start();
          router.replace("/dashboard");
          return;
        }
        started = false;
        phase.current = "idle";
        console.error(error);
        setFailed(true);
      }
    })();
  }, [attempt, authLoaded, isSignedIn, router, setActive, signIn, signInLoaded, signOut, start]);

  if (failed) {
    return (
      <div className="mx-auto mt-16 w-full max-w-md border-[3px] border-[#1A1B1C] bg-white p-6">
        <p className="display text-3xl">THE DEMO IS UNAVAILABLE RIGHT NOW. SIGN IN OR TRY AGAIN.</p>
        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            className={btnOrange}
            onClick={() => {
              phase.current = "idle";
              started = false;
              setFailed(false);
              setAttempt((value) => value + 1);
            }}
          >
            TRY AGAIN
          </button>
          <Link href="/sign-in" className={btnWhite}>
            SIGN IN
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-16 w-full max-w-md border-[3px] border-[#1A1B1C] bg-[#1A1B1C] p-6 text-white">
      <div className="skeleton mb-6 h-24 w-full" />
      <p className="display text-4xl">OPENING THE DEMO...</p>
    </div>
  );
}
