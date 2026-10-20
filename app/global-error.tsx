"use client";

import "./globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans text-foreground">
        <div className="mx-auto max-w-lg px-6 py-24">
          <div className="border-strong border-border bg-card p-8">
            <h1 className="display text-4xl">Something broke</h1>
            {error.digest ? <p className="mt-4 font-mono text-sm">{error.digest}</p> : null}
            <button
              type="button"
              onClick={() => reset()}
              className="label mt-6 border-strong border-border bg-card px-4 py-2 hover:bg-accent hover:text-accent-foreground"
            >
              Retry
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
