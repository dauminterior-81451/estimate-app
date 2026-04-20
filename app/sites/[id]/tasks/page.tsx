import { notFound } from "next/navigation";
import SiteTasksPage from "@/components/SiteTasksPage";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: siteId } = await params;

  if (!siteId) {
    notFound();
  }

  return <SiteTasksPage siteId={siteId} />;
}
