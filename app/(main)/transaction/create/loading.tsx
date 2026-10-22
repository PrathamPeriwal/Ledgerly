import { TransactionFormSkeleton } from "./skeleton";
import { LoadingTag } from "@/components/loading-tag";

export default function Loading() {
  return (
    <>
      <TransactionFormSkeleton />
      <LoadingTag />
    </>
  );
}
