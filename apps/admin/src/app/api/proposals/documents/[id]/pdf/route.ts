import { auth } from "@repo/auth/server";
import { NextRequest, NextResponse } from "next/server";
import { createProposalsRepositories, ProposalsError } from "@repo/proposals";
import { generateProposalPdf, storePdf } from "@/lib/pdf";

const dbUrl = process.env.DATABASE_URL!;

function errorResponse(error: unknown, fallback: string) {
  if (error instanceof ProposalsError) {
    const status = error.code.endsWith("_NOT_FOUND") ? 404 : 400;
    return NextResponse.json({ error: error.message }, { status });
  }
  return NextResponse.json(
    { error: error instanceof Error ? error.message : fallback },
    { status: 500 },
  );
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { documents, templates } = createProposalsRepositories(dbUrl);
    const document = await documents.getById(id);
    if (!document) return NextResponse.json({ error: "Proposal document not found" }, { status: 404 });

    const template = document.templateId ? await templates.getById(document.templateId) : null;

    const buffer = await generateProposalPdf(document, template?.name ?? undefined);
    const filename = `proposal-${document.id}-v${document.version}.pdf`;
    const pdfUrl = await storePdf(buffer, filename);

    await documents.update(id, { pdfUrl });

    return NextResponse.json({ pdfUrl });
  } catch (error) {
    return errorResponse(error, "Failed to generate proposal PDF");
  }
}
