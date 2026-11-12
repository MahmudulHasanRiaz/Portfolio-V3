import { DirectoryList } from "@/components/directory-list";

interface Props {
  searchParams: Promise<{ search?: string }>;
}

export default async function PlatformsListPage({ searchParams }: Props) {
  const params = await searchParams;
  return <DirectoryList entity="platforms" search={params.search || ""} />;
}
