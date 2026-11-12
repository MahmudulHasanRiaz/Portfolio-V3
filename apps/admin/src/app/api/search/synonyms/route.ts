import { NextRequest, NextResponse } from "next/server";
import { auth } from "@repo/auth/server";
import { getDb, searchSynonyms } from "@repo/database";
import { eq, asc } from "drizzle-orm";

const db = getDb();

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.role || !["admin", "editor"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const synonyms = await db
      .select()
      .from(searchSynonyms)
      .orderBy(asc(searchSynonyms.term));

    return NextResponse.json({ synonyms });
  } catch (error) {
    console.error("[Search Synonyms API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch synonyms." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.role || !["admin", "editor"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { term, synonyms } = body;

    if (!term || typeof term !== "string" || term.trim().length === 0) {
      return NextResponse.json(
        { error: "Term is required." },
        { status: 400 }
      );
    }

    const synonymList: string[] = Array.isArray(synonyms)
      ? synonyms.filter((s: unknown) => typeof s === "string" && s.trim().length > 0)
      : [];

    const [inserted] = await db
      .insert(searchSynonyms)
      .values({
        term: term.trim(),
        synonyms: synonymList,
      })
      .returning();

    return NextResponse.json({ synonym: inserted }, { status: 201 });
  } catch (error) {
    console.error("[Search Synonyms API] Error:", error);
    return NextResponse.json(
      { error: "Failed to create synonym." },
      { status: 500 }
    );
  }
}
