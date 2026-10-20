"use client";

import Link from "next/link";

export default function MainError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="border-strong border-border bg-card p-8">
      <h1 className="display text-4xl">Something broke</h1>
      {error.digest ? <p className="mt-4 font-mono text-sm">{error.digest}</p> : null}
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="label border-strong border-border bg-card px-4 py-2 hover:bg-accent hover:text-accent-foreground"
        >
          Retry
        </button>
        <Link
          href="/dashboard"
          className="label border-strong border-border px-4 py-2 hover:bg-accent hover:text-accent-foreground"
        >
          Dashboard
        </Link>
      </div>
    </div>
  );
}
