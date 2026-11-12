"use client";

import { useEffect, useState } from "react";
import { Button } from "@repo/ui";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DirectoryForm } from "@/components/directory-form";
import type { DirectoryEntity } from "@/components/directory-list";
import {
  createPlatform,
  updatePlatform,
  deletePlatform,
  getPlatformById,
  createTechnology,
  updateTechnology,
  deleteTechnology,
  getTechnologyById,
  createClient,
  updateClient,
  deleteClient,
  getClientById,
  type PlatformInput,
  type TechnologyInput,
  type ClientInput,
} from "@/actions/directory";

// Thin client wrappers around DirectoryForm for the create / edit pages.
// Each entity page (platforms / technologies / clients, new + [id]) is a
// few lines rendering one of these two components.

const TITLES: Record<DirectoryEntity, { singular: string; plural: string }> = {
  platforms: { singular: "Platform", plural: "Platforms" },
  technologies: { singular: "Technology", plural: "Technologies" },
  clients: { singular: "Client", plural: "Clients" },
};

async function createEntity(
  entity: DirectoryEntity,
  data: Record<string, unknown>,
): Promise<void> {
  if (entity === "platforms") {
    await createPlatform(data as unknown as PlatformInput);
    return;
  }
  if (entity === "technologies") {
    await createTechnology(data as unknown as TechnologyInput);
    return;
  }
  await createClient(data as unknown as ClientInput);
}

async function updateEntity(
  entity: DirectoryEntity,
  id: string,
  data: Record<string, unknown>,
): Promise<void> {
  if (entity === "platforms") {
    await updatePlatform(id, data as unknown as PlatformInput);
    return;
  }
  if (entity === "technologies") {
    await updateTechnology(id, data as unknown as TechnologyInput);
    return;
  }
  await updateClient(id, data as unknown as ClientInput);
}

async function deleteEntity(entity: DirectoryEntity, id: string): Promise<void> {
  if (entity === "platforms") return deletePlatform(id);
  if (entity === "technologies") return deleteTechnology(id);
  return deleteClient(id);
}

export function DirectoryNewPage({ entity }: { entity: DirectoryEntity }) {
  const router = useRouter();

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", marginBottom: 24 }}>
        New {TITLES[entity].singular}
      </h1>
      <DirectoryForm
        entity={entity}
        submitLabel="Create"
        onSubmit={(data) => createEntity(entity, data)}
        onSaved={() => router.push(`/dashboard/${entity}`)}
      />
    </div>
  );
}

export function DirectoryEditPage({
  entity,
  id,
}: {
  entity: DirectoryEntity;
  id: string;
}) {
  const router = useRouter();
  const [initial, setInitial] = useState<Record<string, unknown> | null>(null);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (entity === "platforms") {
          const row = await getPlatformById(id);
          if (!cancelled) setInitial(row as unknown as Record<string, unknown>);
        } else if (entity === "technologies") {
          const row = await getTechnologyById(id);
          if (!cancelled) {
            setInitial(row as unknown as Record<string, unknown>);
          }
        } else {
          const row = await getClientById(id);
          if (!cancelled) setInitial(row as unknown as Record<string, unknown>);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Not found");
        }
      } finally {
        if (!cancelled) setFetching(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [entity, id]);

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteEntity(entity, id);
      router.push(`/dashboard/${entity}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
      setDeleting(false);
    }
  }

  if (fetching) return <div style={{ color: "var(--text-muted)" }}>Loading...</div>;
  if (error && !initial) {
    return (
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", marginBottom: 24 }}>
          Edit {TITLES[entity].singular}
        </h1>
        <div style={{ padding: 12, borderRadius: 6, backgroundColor: "var(--accent-danger)", color: "#fff" }}>{error}</div>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", marginBottom: 24 }}>
        Edit {TITLES[entity].singular}
      </h1>
      {error && <div style={{ padding: 12, marginBottom: 16, borderRadius: 6, backgroundColor: "var(--accent-danger)", color: "#fff" }}>{error}</div>}
      {initial && (
        <>
          <DirectoryForm
            entity={entity}
            initial={initial}
            submitLabel="Save Changes"
            onSubmit={(data) => updateEntity(entity, id, data)}
            onSaved={() => router.push(`/dashboard/${entity}`)}
          />
          <div style={{ maxWidth: 800, marginTop: 32, paddingTop: 24, borderTop: "1px solid var(--border)" }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 12 }}>Danger Zone</h2>
            <Button variant="outline" onClick={() => setConfirmDelete(true)} disabled={deleting}>Delete {TITLES[entity].singular}</Button>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 8 }}>
              Delete permanently removes this {TITLES[entity].singular.toLowerCase()} — there is no archive or restore for directory rows.
            </div>
          </div>
          <ConfirmDialog
            open={confirmDelete}
            onOpenChange={(open) => { if (!open) setConfirmDelete(false); }}
            title={`Delete ${TITLES[entity].singular.toLowerCase()}`}
            message={`Delete "${(initial.name as string) || "this entry"}"? It will be permanently removed.`}
            onConfirm={handleDelete}
            busy={deleting}
            busyLabel="Deleting…"
          />
        </>
      )}
    </div>
  );
}
