import { SignIn } from "@clerk/nextjs";

export const metadata = { title: "Sign in", alternates: { canonical: "/sign-in" }, robots: { index: false, follow: false } };

export default function Page() {
  return <SignIn fallbackRedirectUrl="/dashboard" />;
}
