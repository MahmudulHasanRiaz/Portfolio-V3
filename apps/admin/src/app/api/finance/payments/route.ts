import { auth } from "@repo/auth/server";
import { NextRequest, NextResponse } from "next/server";
import { createFinanceRepositories, FinanceError } from "@repo/finance";
import { createFinancePaymentSchema } from "@repo/validation";
import { dispatchTrigger } from "@repo/workflows";

const dbUrl = process.env.DATABASE_URL!;

function errorResponse(error: unknown, fallback: string) {
  if (error instanceof FinanceError) {
    const status = error.code.endsWith("_NOT_FOUND") ? 404 : 400;
    return NextResponse.json({ error: error.message }, { status });
  }
  return NextResponse.json(
    { error: error instanceof Error ? error.message : fallback },
    { status: 500 },
  );
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const sourceType = searchParams.get("sourceType");
    const sourceId = searchParams.get("sourceId");
    const clientId = searchParams.get("clientId");
    const invoiceId = searchParams.get("invoiceId");
    const paymentMethodId = searchParams.get("paymentMethodId");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") ?? "20", 10);
    const filters = {
      sourceType: sourceType ?? undefined,
      sourceId: sourceId ?? undefined,
      clientId: clientId ?? undefined,
      invoiceId: invoiceId ?? undefined,
      paymentMethodId: paymentMethodId ?? undefined,
      dateFrom: dateFrom ?? undefined,
      dateTo: dateTo ?? undefined,
      page,
      pageSize,
    };
    const { payments } = createFinanceRepositories(dbUrl);
    const result = await payments.list(filters);
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error, "Failed to fetch payments");
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = createFinancePaymentSchema.safeParse({ ...body, createdBy: session.user.id });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request body" }, { status: 400 });
    }

    const { payments } = createFinanceRepositories(dbUrl);
    const created = await payments.create(parsed.data as Record<string, unknown>);

    // Workflow dispatch is isolated: a workflow failure must never fail
    // the payment creation itself.
    try {
      await dispatchTrigger(dbUrl, "payment_received", created.id, {
        ...created,
        triggeredBy: session.user.id,
      });
    } catch (err) {
      console.error("[Payments API] Failed to dispatch payment_received:", err);
    }

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return errorResponse(error, "Failed to create");
  }
}
