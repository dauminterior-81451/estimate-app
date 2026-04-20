import { notFound } from "next/navigation";
import SiteNotesPage from "@/components/SiteNotesPage";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: siteId } = await params;

  if (!siteId) {
    notFound();
  }

  return <SiteNotesPage siteId={siteId} />;
}
