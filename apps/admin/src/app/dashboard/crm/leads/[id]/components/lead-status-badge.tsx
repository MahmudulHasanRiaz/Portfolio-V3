"use client";

import { Badge } from "@repo/ui";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "success" | "warning" | "destructive" }> = {
  new: { label: "New", variant: "default" },
  contacted: { label: "Contacted", variant: "secondary" },
  qualified: { label: "Qualified", variant: "default" },
  proposal_sent: { label: "Proposal Sent", variant: "warning" },
  negotiation: { label: "Negotiation", variant: "warning" },
  won: { label: "Won", variant: "success" },
  lost: { label: "Lost", variant: "destructive" },
  archived: { label: "Archived", variant: "outline" },
};

interface LeadStatusBadgeProps {
  status: string;
  size?: "sm" | "default";
}

export function LeadStatusBadge({ status, size = "default" }: LeadStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || { label: status, variant: "outline" as const };
  return (
    <Badge variant={config.variant} style={size === "sm" ? { fontSize: 11, padding: "1px 6px" } : undefined}>
      {config.label}
    </Badge>
  );
}
