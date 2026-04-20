import EstimatePreviewPage from "@/features/estimate/components/EstimatePreviewPage";
import { notFound } from "next/navigation";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ estimateId?: string }>;
}) {
  const { id: siteId } = await params;
  const { estimateId } = await searchParams;

  if (!siteId) {
    notFound();
  }

  return <EstimatePreviewPage estimateId={estimateId || siteId} />;
}
