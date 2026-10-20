import { notFound } from "next/navigation";

export default function DebugAuthLayout({ children }) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return children;
}
