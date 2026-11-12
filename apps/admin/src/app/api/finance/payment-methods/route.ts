import { auth } from "@repo/auth/server";
import { NextRequest, NextResponse } from "next/server";
import { createFinanceRepositories, FinanceError } from "@repo/finance";
import { createPaymentMethodSchema } from "@repo/validation";

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
    const onlyActive = searchParams.get("onlyActive") === "true";
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") ?? "20", 10);
    const filters = { onlyActive, page, pageSize };
    const { paymentMethods } = createFinanceRepositories(dbUrl);
    const result = await paymentMethods.list(filters);
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error, "Failed to fetch payment methods");
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = createPaymentMethodSchema.safeParse({ ...body });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request body" }, { status: 400 });
    }

    const { paymentMethods } = createFinanceRepositories(dbUrl);
    const created = await paymentMethods.create(parsed.data as Record<string, unknown>);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return errorResponse(error, "Failed to create");
  }
}
