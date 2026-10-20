import { Resend } from "resend";

// keep in sync with DEMO_EMAIL_DOMAIN in scripts/seed-demo.mjs
const DEMO_EMAIL_DOMAIN = "ledgerly-demo.test";

// Clerk rejects @ledgerly-demo.test, so the seeded personas use these addresses.
const DEMO_FALLBACK_EMAILS = new Set([
  "maya@example.com",
  "daniel@example.com",
  "priya@example.com",
  "lucas@example.com",
  "omar@example.com",
  "hana@example.com",
]);

export function isDemoEmail(email) {
  if (typeof email !== "string") return false;
  const value = email.trim().toLowerCase();
  const at = value.lastIndexOf("@");
  if (at === -1) return false;
  if (value.slice(at + 1) === DEMO_EMAIL_DOMAIN) return true;
  return DEMO_FALLBACK_EMAILS.has(value);
}

export async function sendEmail({ to, subject, react }) {
  if (isDemoEmail(to)) {
    return { success: true, skipped: true };
  }

  const resend = new Resend(process.env.RESEND_API_KEY || "");

  try {
    const data = await resend.emails.send({
      from: "Finance App <onboarding@resend.dev>",
      to,
      subject,
      react,
    });

    return { success: true, data };
  } catch (error) {
    console.error("Failed to send email:", error);
    return { success: false, error };
  }
}
