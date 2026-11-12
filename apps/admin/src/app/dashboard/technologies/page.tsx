import { DirectoryList } from "@/components/directory-list";

interface Props {
  searchParams: Promise<{ search?: string }>;
}

export default async function TechnologiesListPage({ searchParams }: Props) {
  const params = await searchParams;
  return <DirectoryList entity="technologies" search={params.search || ""} />;
}
