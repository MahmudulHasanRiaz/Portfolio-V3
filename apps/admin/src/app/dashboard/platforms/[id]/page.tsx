"use client";

import { useParams } from "next/navigation";
import { DirectoryEditPage } from "@/components/directory-manage";

export default function EditPlatformPage() {
  const params = useParams<{ id: string }>();
  return <DirectoryEditPage entity="platforms" id={params.id} />;
}
