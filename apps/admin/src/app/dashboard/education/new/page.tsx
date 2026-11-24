"use client";

import { useRouter } from "next/navigation";
import { EducationForm } from "@/components/education-form";
import { createEducationEntry } from "@/actions/education";

export default function NewEducationEntryPage() {
  const router = useRouter();
  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", marginBottom: 24 }}>
        New Education Entry
      </h1>
      <EducationForm
        submitLabel="Create Entry"
        onSubmit={async (data) => {
          await createEducationEntry(data);
        }}
        onSaved={() => router.push("/dashboard/education")}
      />
    </div>
  );
}
