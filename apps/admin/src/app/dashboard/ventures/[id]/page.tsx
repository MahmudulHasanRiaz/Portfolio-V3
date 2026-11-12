"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Badge, Tabs, TabsList, TabsTrigger, TabsContent } from "@repo/ui";
import { ArrowLeft, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { VentureProfile } from "../components/venture-profile";
import { VentureProducts } from "../components/venture-products";
import { VentureTimeline } from "../components/venture-timeline";
import { VentureMedia } from "../components/venture-media";
import { VentureCategories } from "../components/venture-categories";

interface VentureData {
  id: string;
  name: string | null;
  nameBn: string | null;
  slug: string;
  description: string | null;
  descriptionBn: string | null;
  logo: string | null;
  website: string | null;
  foundedDate: string | null;
  /** Optional — present only once migration 0035 (founded_year)
   * has landed. */
  foundedYear?: number | null;
  contentStatus: string;
  coverImage: string | null;
  socialLinks: Record<string, string> | null;
  metrics: Record<string, unknown> | null;
  teamSize: number | null;
  industry: string | null;
  stage: string | null;
  location: string | null;
  status: string;
  isFeatured: boolean | null;
  // Media system (0010/0017): same shape as projects.
  thumbnailType: string | null;
  thumbnailUrl: string | null;
  thumbnailVideoUrl: string | null;
  thumbnailAutoplay: boolean | null;
  videos: string[] | null;
  galleryImages: string[] | null;
  metaTitle: string | null;
  metaDescription: string | null;
  keywords: string | null;
  /** Optional — present only once migration 0029 has landed. */
  shortDescription?: string | null;
  shortDescriptionBn?: string | null;
  sortOrder?: number | null;
  ogImage?: string | null;
  canonicalUrl?: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export default function VentureDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [venture, setVenture] = useState<VentureData | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchVenture = () => {
    setLoading(true);
    fetch(`/api/ventures/${params.id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then(setVenture)
      .catch(() => router.push("/dashboard/ventures"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchVenture();
  }, [params.id]);

  if (loading) {
    return <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>Loading...</div>;
  }

  if (!venture) {
    return <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>Venture not found</div>;
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/ventures")}>
          <ArrowLeft size={16} />
        </Button>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>
          {venture.name || venture.slug}
        </h1>
        <Badge>{venture.status}</Badge>
        <Badge variant="outline">{venture.contentStatus}</Badge>
        <span style={{ flex: 1 }} />
        <Button
          variant="outline"
          size="sm"
          onClick={() => setConfirmDeleteOpen(true)}
          style={{ color: "var(--accent-danger)" }}
        >
          <Trash2 size={14} style={{ marginRight: 4 }} />Delete
        </Button>
      </div>

      <Tabs defaultValue="profile">
        <TabsList style={{ marginBottom: 24 }}>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="media">Media</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <VentureProfile venture={venture} onUpdate={fetchVenture} />
        </TabsContent>

        <TabsContent value="products">
          <VentureProducts ventureId={venture.id} />
        </TabsContent>

        <TabsContent value="timeline">
          <VentureTimeline ventureId={venture.id} />
        </TabsContent>

        <TabsContent value="media">
          <VentureMedia ventureId={venture.id} />
        </TabsContent>

        <TabsContent value="categories">
          <VentureCategories ventureId={venture.id} />
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Delete venture?"
        message={`"${venture.name || venture.slug}" and its products and timeline events will be permanently deleted. Media mentions linked to it are kept but unlinked.`}
        confirmLabel="Delete"
        variant="danger"
        busy={deleting}
        busyLabel="Deleting…"
        onConfirm={async () => {
          setDeleting(true);
          const res = await fetch(`/api/ventures/${venture.id}`, { method: "DELETE" });
          setDeleting(false);
          if (res.ok) router.push("/dashboard/ventures");
        }}
      />
    </div>
  );
}
