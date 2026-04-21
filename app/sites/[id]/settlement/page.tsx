import { notFound } from "next/navigation";
import SiteSettlementPage from "@/features/settlement/SiteSettlementPage";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: siteId } = await params;

  if (!siteId) {
    notFound();
  }

  return <SiteSettlementPage siteId={siteId} />;
}
