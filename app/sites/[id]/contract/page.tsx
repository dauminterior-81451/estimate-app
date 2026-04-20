import { notFound } from "next/navigation";
import SiteContractPage from "@/components/SiteContractPage";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: siteId } = await params;

  if (!siteId) {
    notFound();
  }

  return <SiteContractPage siteId={siteId} />;
}
