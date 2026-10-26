import type { ReactNode } from "react";
import { ClerkProvider } from "@clerk/nextjs";

/** Clerk is mounted only by the route groups that use it (never on the landing page). */
export function AppClerkProvider({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#FF5F14",
          colorPrimaryForeground: "#1A1B1C",
          colorText: "#1A1B1C",
          colorForeground: "#1A1B1C",
          colorTextSecondary: "#1A1B1C",
          colorMutedForeground: "#1A1B1C",
          colorBackground: "#FFFFFF",
          colorInputBackground: "#FFFFFF",
          colorInput: "#FFFFFF",
          colorInputText: "#1A1B1C",
          colorInputForeground: "#1A1B1C",
          colorRing: "#FF5F14",
          colorShadow: "transparent",
          borderRadius: "0px",
          fontFamily: "var(--font-sans), sans-serif",
        },
        elements: {
          card: "shadow-none rounded-none border-[3px] border-solid border-[#1A1B1C]",
          formButtonPrimary:
            "bg-[#FF5F14] text-[#1A1B1C] border-2 border-solid border-[#1A1B1C] uppercase shadow-none rounded-none hover:bg-[#1A1B1C] hover:text-white",
          formFieldInput:
            "border-2 border-solid border-[#1A1B1C] rounded-none shadow-none focus:ring-2 focus:ring-[#FF5F14]",
          footerActionLink: "text-[#1A1B1C] underline",
          formFieldAction: "text-[#1A1B1C] underline",
          formResendCodeLink: "text-[#1A1B1C] underline",
          socialButtonsBlockButton:
            "bg-white text-[#1A1B1C] border-2 border-solid border-[#1A1B1C] rounded-none shadow-none",
          headerTitle: "text-[#1A1B1C]",
          headerSubtitle: "text-[#1A1B1C]",
        },
      }}
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/dashboard"
      signInForceRedirectUrl="/dashboard"
      signUpForceRedirectUrl="/dashboard"
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
    >
      {children}
    </ClerkProvider>
  );
}
