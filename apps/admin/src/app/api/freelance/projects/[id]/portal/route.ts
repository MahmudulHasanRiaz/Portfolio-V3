import { auth } from "@repo/auth/server";
import { NextRequest, NextResponse } from "next/server";
import { logProjectActivity } from "@/lib/project-activity";

const dbUrl = process.env.DATABASE_URL!;

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: projectId } = await params;
    const { default: postgres } = await import("postgres");
    const sql = postgres(dbUrl, { max: 1 });

    try {
      const projects = await sql.unsafe("SELECT * FROM projects_freelance WHERE id = $1::uuid", [projectId]);
      if (!projects[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });

      const project = projects[0] as Record<string, unknown>;
      const currentlyEnabled = project.portal_access_enabled === true;

      if (currentlyEnabled) {
        await sql.unsafe(
          "UPDATE projects_freelance SET portal_access_enabled = false, updated_at = NOW() WHERE id = $1::uuid",
          [projectId]
        );
        await logProjectActivity(sql, {
          projectId,
          actorId: session.user.id,
          action: "portal_disabled",
          metadata: {},
        });
        return NextResponse.json({ portalAccessEnabled: false });
      } else {
        const { randomBytes } = await import("node:crypto");
        const token = randomBytes(32).toString("hex");

        const { createPortalRepositories } = await import("@repo/portal-pkg");
        const repo = createPortalRepositories(dbUrl);

        try {
          // The portal session's client email comes from the project's
          // linked client (lead) when one is set.
          let clientEmail: string | null = null;
          const clientId = project.client_id as string | null | undefined;
          if (clientId) {
            const leads = await sql.unsafe("SELECT email FROM leads WHERE id = $1::uuid", [clientId]);
            clientEmail = (leads[0] as { email?: string } | undefined)?.email ?? null;
          }

          const existing = await repo.auth.getSessionByProjectId(projectId);
          if (existing) {
            await sql.unsafe(
              "UPDATE portal_sessions SET portal_token = $1 WHERE project_id = $2::uuid",
              [token, projectId]
            );
            if (!existing.clientEmail && clientEmail) {
              await repo.auth.bindClientEmail(projectId, clientEmail);
            }
          } else {
            // First enable: create the portal session row. Without it the
            // portal setup page can never validate the token (it looks the
            // token up in portal_sessions, not on the project row).
            await repo.auth.createSession(projectId, token, clientEmail);
          }

          await sql.unsafe(
            "UPDATE projects_freelance SET portal_access_enabled = true, portal_token = $1, updated_at = NOW() WHERE id = $2::uuid",
            [token, projectId]
          );

          await logProjectActivity(sql, {
            projectId,
            actorId: session.user.id,
            action: "portal_enabled",
            metadata: {},
          });

          return NextResponse.json({ portalAccessEnabled: true, portalToken: token });
        } finally {
          await repo.close();
        }
      }
    } finally {
      await sql.end();
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to toggle portal access" },
      { status: 500 }
    );
  }
}
