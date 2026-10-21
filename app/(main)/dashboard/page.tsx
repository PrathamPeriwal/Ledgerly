import { Suspense } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { PrivacyToggle } from "@/components/fx/Privacy";
import { DashboardBody } from "./_components/dashboard-body";
import { DashboardSkeleton } from "./_components/dashboard-skeleton";

export const dynamic = "force-dynamic";

const addLink =
  "label inline-flex h-10 items-center justify-center whitespace-nowrap border-[3px] border-[#1A1B1C] bg-[#FF5F14] px-3 text-[#1A1B1C] transition-colors hover:bg-[#1A1B1C] hover:text-white";

export default function DashboardPage() {
  return (
    <div className="min-w-0">
      <PageHeader
        label="OVERVIEW"
        title="DASHBOARD"
        actions={
          <>
            <Link href="/transaction/create" className={addLink}>
              ADD TRANSACTION
            </Link>
            <PrivacyToggle />
          </>
        }
      />
      <div className="pt-6">
        <Suspense fallback={<DashboardSkeleton />}>
          <DashboardBody />
        </Suspense>
      </div>
    </div>
  );
}
