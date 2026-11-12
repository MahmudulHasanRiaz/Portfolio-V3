import { DirectoryList } from "@/components/directory-list";

interface Props {
  searchParams: Promise<{ search?: string }>;
}

export default async function ClientsListPage({ searchParams }: Props) {
  const params = await searchParams;
  return <DirectoryList entity="clients" search={params.search || ""} />;
}
