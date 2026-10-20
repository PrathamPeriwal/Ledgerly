import { notFound } from "next/navigation";
import { KitGallery } from "./kit-gallery";

export default function DevKitPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <KitGallery />;
}
