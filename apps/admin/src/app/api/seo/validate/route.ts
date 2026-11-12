import { auth } from "@repo/auth/server";
import { NextRequest, NextResponse } from "next/server";
import { SeoMetaRepository, SlugRedirectsRepository } from "@repo/database/repository/seo";
import { generateValidationReport } from "@repo/seo";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const seoRepo = new SeoMetaRepository();
    const redirectRepo = new SlugRedirectsRepository();

    const allMeta = await seoRepo.findAll();
    const allRedirects = await redirectRepo.findAll();

    const entities = allMeta.data.map((m: any) => ({
      entityType: m.entityType,
      entityId: m.entityId,
      meta: {
        metaTitle: m.metaTitle,
        metaDescription: m.metaDescription,
        ogImage: m.ogImage,
        canonicalUrl: m.canonicalUrl,
        keywords: m.keywords,
      },
    }));

    const redirects = allRedirects.data.map((r: any) => ({
      id: r.id,
      sourceSlug: r.sourceSlug,
      destinationUrl: r.destinationUrl,
      isActive: r.isActive,
    }));

    const report = generateValidationReport(entities, redirects);

    return NextResponse.json(report);
  } catch (error) {
    console.error("[SEO Validation API] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Validation failed." },
      { status: 500 },
    );
  }
}
