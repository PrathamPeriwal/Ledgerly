"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { btnOrange } from "@/components/landing/ui";

export function DemoCell() {
  const { isSignedIn } = useAuth();
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const onSubmit = () => setSubmitted(true);
    document.addEventListener("submit", onSubmit, true);
    return () => document.removeEventListener("submit", onSubmit, true);
  }, []);

  // clear if the attempt fails and the form stays on screen
  useEffect(() => {
    if (!submitted || isSignedIn) return;
    const t = setTimeout(() => setSubmitted(false), 8000);
    return () => clearTimeout(t);
  }, [submitted, isSignedIn]);

  if (submitted || isSignedIn) {
    return (
      <div className="border-[3px] border-[#1A1B1C] bg-white p-4" role="status">
        <p className="label inline-flex items-center gap-2">
          <span aria-hidden className="loading-blink inline-block h-2.5 w-2.5 bg-[#1A1B1C]" />
          LOADING
        </p>
      </div>
    );
  }

  return (
    <div className="border-[3px] border-[#1A1B1C] bg-white p-4">
      <p className="label">JUST LOOKING?</p>
      <Link href="/demo" className={`${btnOrange} mt-4 min-h-10 w-full`}>
        TRY THE DEMO
      </Link>
    </div>
  );
}
