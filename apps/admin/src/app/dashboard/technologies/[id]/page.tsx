"use client";

import { useParams } from "next/navigation";
import { DirectoryEditPage } from "@/components/directory-manage";

export default function EditTechnologyPage() {
  const params = useParams<{ id: string }>();
  return <DirectoryEditPage entity="technologies" id={params.id} />;
}
