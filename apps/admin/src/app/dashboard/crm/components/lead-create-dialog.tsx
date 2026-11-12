"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, Button, Input, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Textarea } from "@repo/ui";

const LEAD_SOURCES = [
  { value: "contact_form", label: "Contact Form" },
  { value: "consultation_form", label: "Consultation Form" },
  { value: "hiring_form", label: "Hiring Form" },
  { value: "artist_booking_form", label: "Artist Booking Form" },
  { value: "partnership_form", label: "Partnership Form" },
  { value: "newsletter_conversion", label: "Newsletter Conversion" },
  { value: "manual_entry", label: "Manual Entry" },
  { value: "imported_lead", label: "Imported Lead" },
];

interface LeadCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function LeadCreateDialog({ open, onOpenChange, onCreated }: LeadCreateDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    company: "",
    leadSource: "manual_entry",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setError(json?.error ?? `Failed to create lead (HTTP ${res.status})`);
        return;
      }
      setForm({ fullName: "", email: "", phone: "", company: "", leadSource: "manual_entry", message: "" });
      onOpenChange(false);
      onCreated();
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Lead</DialogTitle>
          <DialogDescription>Enter the lead details below.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Input
              placeholder="Full Name"
              value={form.fullName}
              onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
              required
            />
            <Input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
            <Input
              placeholder="Phone"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
            <Input
              placeholder="Company"
              value={form.company}
              onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
            />
            <Select
              value={form.leadSource}
              onValueChange={(v) => setForm((f) => ({ ...f, leadSource: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Lead Source" />
              </SelectTrigger>
              <SelectContent>
                {LEAD_SOURCES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Notes / Message"
              value={form.message}
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              rows={3}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={loading}>{loading ? "Creating..." : "Create Lead"}</Button>
            </div>
            {error && <div style={{ color: "var(--danger, #c0392b)", fontSize: 13, marginTop: 12 }}>{error}</div>}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
