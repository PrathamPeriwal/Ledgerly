import { ensureUser } from "@/lib/ensure-user";
import { CommandMenu } from "@/components/command-menu";
import { DemoBanner } from "@/components/demo-banner";
import { AppClerkProvider } from "@/components/app-clerk-provider";
import { AppNav } from "@/components/app-nav";
import { ReloadOnRestore } from "@/components/reload-on-restore";
import { Toaster } from "@/components/ui/sonner";
import { isDemoEmail } from "@/lib/send-email";

export const metadata = { robots: { index: false, follow: false } };

const MainLayout = async ({ children }) => {
  const user = await ensureUser();

  return (
    <AppClerkProvider>
      <ReloadOnRestore />
      <AppNav />
      <main id="content" className="min-h-screen">
        {isDemoEmail(user?.email) ? <DemoBanner /> : null}
        <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">{children}</div>
      </main>
      <Toaster position="top-right" />
      <CommandMenu />
    </AppClerkProvider>
  );
};

export default MainLayout;
