"use client";

import { useParams } from "next/navigation";
import { DirectoryEditPage } from "@/components/directory-manage";

export default function EditClientPage() {
  const params = useParams<{ id: string }>();
  return <DirectoryEditPage entity="clients" id={params.id} />;
}
