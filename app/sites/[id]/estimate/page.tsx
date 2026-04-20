import EstimateEditor from "@/features/estimate/components/EstimateEditor";
import { notFound } from "next/navigation";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: siteId } = await params;

  if (!siteId) {
    notFound();
  }

  return <EstimateEditor siteId={siteId} />;
}
