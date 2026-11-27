// Portal proposals — list, detail, accept, reject.
//
// The proposal_documents table has no title/description/proposal_type
// columns (the old repo selected them and would have 500'd). The
// display title and type come from the linked proposal template
// (name/type); the body is resolvedContent and the file is pdfUrl.
import { Hono } from "hono";
import { and, desc, eq } from "drizzle-orm";
import { getApiDb } from "../../db";
import {
  projectActivityLogs,
  proposalDocuments,
  proposalTemplates,
} from "@repo/database/schema";
import {
  invalidParam,
  parsePagination,
  uuidParam,
} from "../../lib/validate";
import { dispatchTrigger } from "../admin/workflows/helpers";
import { requirePortalClient } from "./helpers";

const proposals = new Hono();

type ProposalRow = {
  id: string;
  clientId: string | null;
  projectId: string | null;
  status: "draft" | "sent" | "accepted" | "rejected" | null;
  sentAt: Date | null;
  acceptedAt: Date | null;
  rejectedAt: Date | null;
  rejectionReason: string | null;
  resolvedContent: string | null;
  pdfUrl: string | null;
  createdAt: Date | null;
  templateName: string | null;
  templateType: "proposal" | "contract" | null;
};

/** Shape a joined proposal row the way the portal pages read it. */
function toProposal(row: ProposalRow) {
  return {
    id: row.id,
    clientId: row.clientId,
    projectId: row.projectId,
    title: row.templateName,
    proposalType: row.templateType,
    status: row.status,
    sentAt: row.sentAt,
    acceptedAt: row.acceptedAt,
    rejectedAt: row.rejectedAt,
    rejectionReason: row.rejectionReason,
    content: row.resolvedContent,
    fileUrl: row.pdfUrl,
    createdAt: row.createdAt,
  };
}

const PROPOSAL_COLUMNS = {
  id: proposalDocuments.id,
  clientId: proposalDocuments.clientId,
  projectId: proposalDocuments.projectId,
  status: proposalDocuments.status,
  sentAt: proposalDocuments.sentAt,
  acceptedAt: proposalDocuments.acceptedAt,
  rejectedAt: proposalDocuments.rejectedAt,
  rejectionReason: proposalDocuments.rejectionReason,
  resolvedContent: proposalDocuments.resolvedContent,
  pdfUrl: proposalDocuments.pdfUrl,
  createdAt: proposalDocuments.createdAt,
  templateName: proposalTemplates.name,
  templateType: proposalTemplates.type,
} as const;

proposals.get("/", async (c) => {
  try {
    const client = await requirePortalClient(c);
    if (!client) return c.json({ error: "Unauthorized" }, 401);
    const { page, pageSize } = parsePagination(c);
    const db = getApiDb();
    const rows = await db
      .select(PROPOSAL_COLUMNS)
      .from(proposalDocuments)
      .leftJoin(
        proposalTemplates,
        eq(proposalTemplates.id, proposalDocuments.templateId),
      )
      .where(eq(proposalDocuments.clientId, client.clientId))
      .orderBy(desc(proposalDocuments.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    const list = rows.map(toProposal);
    return c.json({ proposals: list, total: list.length, page, pageSize });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch proposals";
    return c.json({ error: message }, 500);
  }
});

proposals.get("/:id", async (c) => {
  try {
    const client = await requirePortalClient(c);
    if (!client) return c.json({ error: "Unauthorized" }, 401);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const db = getApiDb();
    const [row] = await db
      .select(PROPOSAL_COLUMNS)
      .from(proposalDocuments)
      .leftJoin(
        proposalTemplates,
        eq(proposalTemplates.id, proposalDocuments.templateId),
      )
      .where(
        and(
          eq(proposalDocuments.id, id),
          eq(proposalDocuments.clientId, client.clientId),
        ),
      )
      .limit(1);
    if (!row) return c.json({ error: "Proposal not found" }, 404);
    return c.json(toProposal(row));
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch proposal";
    return c.json({ error: message }, 500);
  }
});

proposals.post("/:id/accept", async (c) => {
  try {
    const client = await requirePortalClient(c);
    if (!client) return c.json({ error: "Unauthorized" }, 401);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const db = getApiDb();
    const [proposal] = await db
      .select()
      .from(proposalDocuments)
      .where(
        and(
          eq(proposalDocuments.id, id),
          eq(proposalDocuments.clientId, client.clientId),
        ),
      )
      .limit(1);
    if (!proposal) return c.json({ error: "Proposal not found" }, 404);
    if (proposal.status !== "sent") {
      return c.json({ error: "Proposal cannot be accepted" }, 400);
    }
    const [updated] = await db
      .update(proposalDocuments)
      .set({ status: "accepted", acceptedAt: new Date() })
      .where(eq(proposalDocuments.id, id))
      .returning();
    if (updated?.projectId) {
      await db.insert(projectActivityLogs).values({
        projectId: updated.projectId,
        actorId: null,
        action: "proposal_accepted",
        metadata: { proposalId: id },
      });
    }
    // Fire-and-forget, as before: a workflow failure must not fail the accept.
    dispatchTrigger(db, {
      triggerType: "proposal.accepted",
      entityId: id,
      payload: { proposalId: id, clientId: client.clientId },
    }).catch((err: unknown) => {
      console.error("Proposal accept trigger failed", err);
    });
    return c.json({ success: true, proposal: updated ?? proposal });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to accept proposal";
    return c.json({ error: message }, 500);
  }
});

proposals.post("/:id/reject", async (c) => {
  try {
    const client = await requirePortalClient(c);
    if (!client) return c.json({ error: "Unauthorized" }, 401);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const db = getApiDb();
    const [proposal] = await db
      .select()
      .from(proposalDocuments)
      .where(
        and(
          eq(proposalDocuments.id, id),
          eq(proposalDocuments.clientId, client.clientId),
        ),
      )
      .limit(1);
    if (!proposal) return c.json({ error: "Proposal not found" }, 404);
    if (proposal.status !== "sent") {
      return c.json({ error: "Proposal cannot be rejected" }, 400);
    }
    const [updated] = await db
      .update(proposalDocuments)
      .set({ status: "rejected", rejectedAt: new Date() })
      .where(eq(proposalDocuments.id, id))
      .returning();
    if (updated?.projectId) {
      await db.insert(projectActivityLogs).values({
        projectId: updated.projectId,
        actorId: null,
        action: "proposal_rejected",
        metadata: { proposalId: id },
      });
    }
    return c.json({ success: true, proposal: updated ?? proposal });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to reject proposal";
    return c.json({ error: message }, 500);
  }
});

export { proposals as portalProposalsRouter };
