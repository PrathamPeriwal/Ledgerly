import { notFound } from "next/navigation";
import { AppClerkProvider } from "@/components/app-clerk-provider";

export default function DebugAuthLayout({ children }) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <AppClerkProvider>
      <main id="content" className="min-h-screen">
        {children}
      </main>
    </AppClerkProvider>
  );
}
