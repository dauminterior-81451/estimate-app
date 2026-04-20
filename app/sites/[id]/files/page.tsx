import { notFound } from "next/navigation";
import SiteFilesPage from "@/features/files/components/SiteFilesPage";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: siteId } = await params;

  if (!siteId) {
    notFound();
  }

  return <SiteFilesPage siteId={siteId} />;
}
