import { auth } from "@repo/auth/server";
import { NextRequest, NextResponse } from "next/server";
import { createFinanceRepositories, FinanceError } from "@repo/finance";
import { updateExpenseCategorySchema } from "@repo/validation";

const dbUrl = process.env.DATABASE_URL!;

function errorResponse(error: unknown, fallback: string) {
  if (error instanceof FinanceError) {
    const status = error.code.endsWith("_NOT_FOUND") ? 404 : 400;
    return NextResponse.json({ error: error.message }, { status });
  }
  // `slug` is unique: surface a readable message instead of the raw
  // Postgres "duplicate key value violates unique constraint" text.
  if (error instanceof Error && /duplicate key value/i.test(error.message)) {
    return NextResponse.json(
      { error: "A category with this slug already exists. Choose a different slug." },
      { status: 409 },
    );
  }
  return NextResponse.json(
    { error: error instanceof Error ? error.message : fallback },
    { status: 500 },
  );
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { expenseCategories } = createFinanceRepositories(dbUrl);
    const item = await expenseCategories.getById(id);
    if (!item) return NextResponse.json({ error: "Expense category not found" }, { status: 404 });
    return NextResponse.json(item);
  } catch (error) {
    return errorResponse(error, "Failed to fetch");
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const parsed = updateExpenseCategorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request body" }, { status: 400 });
    }

    const { expenseCategories } = createFinanceRepositories(dbUrl);
    const updated = await expenseCategories.update(id, parsed.data as Record<string, unknown>);
    if (!updated) return NextResponse.json({ error: "Expense category not found" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (error) {
    return errorResponse(error, "Failed to update");
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { expenseCategories } = createFinanceRepositories(dbUrl);
    const deleted = await expenseCategories.delete(id);
    if (!deleted) return NextResponse.json({ error: "Expense category not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error, "Failed to delete");
  }
}
