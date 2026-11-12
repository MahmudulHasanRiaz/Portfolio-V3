import { auth } from "@repo/auth/server";
import { NextRequest, NextResponse } from "next/server";
import { createFinanceRepositories, FinanceError } from "@repo/finance";
import { generateInvoicePdf, storePdf } from "@/lib/pdf";

const dbUrl = process.env.DATABASE_URL!;

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { invoices } = createFinanceRepositories(dbUrl);
    const invoice = await invoices.getById(id);
    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    const buffer = await generateInvoicePdf(invoice);
    const filename = `invoice-${invoice.invoiceNumber ?? invoice.id}.pdf`;
    const pdfUrl = await storePdf(buffer, filename);

    const updated = await invoices.update(id, { pdfUrl });
    return NextResponse.json({ pdfUrl: updated?.pdfUrl ?? pdfUrl });
  } catch (error) {
    if (error instanceof FinanceError) {
      const status = error.code.endsWith("_NOT_FOUND") ? 404 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate invoice PDF" },
      { status: 500 },
    );
  }
}
