import { auth } from "@repo/auth/server";
import { NextRequest, NextResponse } from "next/server";
import { createFinanceRepositories, FinanceError } from "@repo/finance";
import { financeInvoiceSchema } from "@repo/validation";
import { dispatchTrigger } from "@repo/workflows";

const dbUrl = process.env.DATABASE_URL!;

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const parsed = financeInvoiceSchema.shape.status.safeParse(body?.status);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "A valid status is required" },
        { status: 400 },
      );
    }

    const { invoices } = createFinanceRepositories(dbUrl);
    const invoice = await invoices.setStatus(id, parsed.data);
    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    if (parsed.data === "paid") {
      // Workflow dispatch is isolated: a workflow failure must never fail
      // the status change itself.
      try {
        await dispatchTrigger(dbUrl, "invoice_paid", invoice.id, {
          ...invoice,
          triggeredBy: session.user.id,
        });
      } catch (err) {
        console.error("[Invoices API] Failed to dispatch invoice_paid:", err);
      }
    }

    return NextResponse.json(invoice);
  } catch (error) {
    if (error instanceof FinanceError) {
      const status = error.code.endsWith("_NOT_FOUND") ? 404 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update invoice status" },
      { status: 500 },
    );
  }
}
