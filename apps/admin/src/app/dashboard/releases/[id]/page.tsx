"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Badge, Tabs, TabsList, TabsTrigger, TabsContent } from "@repo/ui";
import { ArrowLeft, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ReleaseProfile } from "../components/release-profile";
import { ReleasePlatforms } from "../components/release-platforms";
import { ReleaseLyrics } from "../components/release-lyrics";
import { ReleaseVideos } from "../components/release-videos";
import { ReleaseTimeline } from "../components/release-timeline";

interface ReleaseData {
  id: string;
  title: string;
  titleBn: string | null;
  slug: string;
  type: string;
  releaseFormat: string | null;
  description: string | null;
  descriptionBn: string | null;
  coverImage: string | null;
  releaseDate: string | null;
  status: string;
  contentStatus: string;
  isFeatured: boolean | null;
  metaTitle: string | null;
  metaDescription: string | null;
  keywords: string | null;
  ogImage?: string | null;
  canonicalUrl?: string | null;
  credits: Record<string, unknown> | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export default function ReleaseDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [release, setRelease] = useState<ReleaseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchRelease = () => {
    setLoading(true);
    fetch(`/api/releases/${params.id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then(setRelease)
      .catch(() => router.push("/dashboard/releases"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRelease();
  }, [params.id]);

  if (loading) {
    return <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>Loading...</div>;
  }

  if (!release) {
    return <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>Release not found</div>;
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/releases")}>
          <ArrowLeft size={16} />
        </Button>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>
          {release.title || release.slug}
        </h1>
        <Badge>{release.status}</Badge>
        <Badge variant="outline">{release.contentStatus}</Badge>
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
          <TabsTrigger value="platforms">Platforms</TabsTrigger>
          <TabsTrigger value="lyrics">Lyrics</TabsTrigger>
          <TabsTrigger value="videos">Videos</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ReleaseProfile release={release} onUpdate={fetchRelease} />
        </TabsContent>

        <TabsContent value="platforms">
          <ReleasePlatforms releaseId={release.id} />
        </TabsContent>

        <TabsContent value="lyrics">
          <ReleaseLyrics releaseId={release.id} onUpdate={fetchRelease} />
        </TabsContent>

        <TabsContent value="videos">
          <ReleaseVideos releaseId={release.id} />
        </TabsContent>

        <TabsContent value="timeline">
          <ReleaseTimeline releaseId={release.id} />
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Delete release?"
        message={`"${release.title || release.slug}" and its platforms, videos, lyrics and timeline events will be permanently deleted.`}
        confirmLabel="Delete"
        variant="danger"
        busy={deleting}
        busyLabel="Deleting…"
        onConfirm={async () => {
          setDeleting(true);
          const res = await fetch(`/api/releases/${release.id}`, { method: "DELETE" });
          setDeleting(false);
          if (res.ok) router.push("/dashboard/releases");
        }}
      />
    </div>
  );
}
