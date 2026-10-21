import { ensureUser } from "@/lib/ensure-user";
import { CommandMenu } from "@/components/command-menu";
import { DemoBanner } from "@/components/demo-banner";
import { isDemoEmail } from "@/lib/send-email";

const MainLayout = async ({ children }) => {
  const user = await ensureUser();

  return (
    <>
      {isDemoEmail(user?.email) ? <DemoBanner /> : null}
      <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">{children}</div>
      <CommandMenu />
    </>
  );
};

export default MainLayout;
