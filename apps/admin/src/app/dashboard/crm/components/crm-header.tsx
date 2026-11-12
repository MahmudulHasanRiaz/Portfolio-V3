"use client";

import { useState } from "react";
import { Button } from "@repo/ui";
import { Plus } from "lucide-react";
import { LeadCreateDialog } from "./lead-create-dialog";

interface CrmHeaderProps {
  onLeadCreated: () => void;
}

export function CrmHeader({ onLeadCreated }: CrmHeaderProps) {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>CRM</h1>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus size={16} style={{ marginRight: 6 }} />
          Add Lead
        </Button>
      </div>

      <LeadCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={onLeadCreated}
      />
    </>
  );
}
