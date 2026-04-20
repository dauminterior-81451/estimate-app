import SiteDetail from "@/components/SiteDetail";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SiteDetail id={id} />;
}
