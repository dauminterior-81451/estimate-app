import CustomerDetailPage from "@/components/CustomerDetailPage";

export default async function Page(props: PageProps<"/customers/[id]">) {
  const { id } = await props.params;

  return <CustomerDetailPage customerId={id} />;
}
