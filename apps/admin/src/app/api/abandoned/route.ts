import { auth } from "@repo/auth/server";
import { NextRequest, NextResponse } from "next/server";
import { createCrmRepositories } from "@repo/crm";

const dbUrl = process.env.DATABASE_URL!;

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { abandoned } = createCrmRepositories(dbUrl);
    const result = await abandoned.list();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch abandoned leads" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { abandoned } = createCrmRepositories(dbUrl);
    const result = await abandoned.capture(body);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to capture abandoned lead" },
      { status: 500 },
    );
  }
}
