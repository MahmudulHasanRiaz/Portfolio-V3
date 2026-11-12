import { auth } from "@repo/auth/server";
import { NextRequest, NextResponse } from "next/server";
import { createCrmRepositories } from "@repo/crm";

const dbUrl = process.env.DATABASE_URL!;

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { leads } = createCrmRepositories(dbUrl);
    const result = await leads.getFollowUpQueue();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch follow-up queue" },
      { status: 500 },
    );
  }
}
