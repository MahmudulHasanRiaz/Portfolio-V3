"use client";

import { useRouter } from "next/navigation";
import { ExperienceForm } from "@/components/experience-form";
import { createExperienceEntry } from "@/actions/experience";

export default function NewExperienceEntryPage() {
  const router = useRouter();
  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", marginBottom: 24 }}>
        New Experience Entry
      </h1>
      <ExperienceForm
        submitLabel="Create Entry"
        onSubmit={async (data) => {
          await createExperienceEntry(data);
        }}
        onSaved={() => router.push("/dashboard/experience")}
      />
    </div>
  );
}
