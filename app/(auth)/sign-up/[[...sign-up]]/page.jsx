import Link from "next/link";
import { SignUp } from "@clerk/nextjs";

export const metadata = { title: "Sign up", alternates: { canonical: "/sign-up" }, robots: { index: false, follow: false } };

export default function Page() {
  return (
    <>
      <SignUp fallbackRedirectUrl="/dashboard" />
      <p className="text-center text-xs">
        See how your data is used in the{" "}
        <Link href="/privacy" className="underline underline-offset-2">
          privacy notice
        </Link>
        .
      </p>
    </>
  );
}
