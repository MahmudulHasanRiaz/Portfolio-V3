import { getDb, homepageSections, homepageVersions } from "@repo/database";
import { eq, asc, desc, count } from "drizzle-orm";
import { purgePublicCache, type PaginatedResponse } from "@repo/shared";

export interface HomepageSectionData {
  id: string;
  sectionKey: string;
  isVisible: boolean;
  sortOrder: number | null;
  content: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface HomepageVersionData {
  id: string;
  version: number;
  snapshotJson: Record<string, unknown>;
  createdBy: string | null;
  createdAt: string;
}

export class HomepageService {
  async getSections(): Promise<HomepageSectionData[]> {
    const db = getDb();
    const results = await db
      .select()
      .from(homepageSections)
      .orderBy(asc(homepageSections.sortOrder))
      .where(eq(homepageSections.isVisible, true));
    return results as unknown as HomepageSectionData[];
  }

  async getAllSections(): Promise<HomepageSectionData[]> {
    const db = getDb();
    const results = await db
      .select()
      .from(homepageSections)
      .orderBy(asc(homepageSections.sortOrder));
    return results as unknown as HomepageSectionData[];
  }

  async getSection(id: string): Promise<HomepageSectionData | null> {
    const db = getDb();
    const [result] = await db
      .select()
      .from(homepageSections)
      .where(eq(homepageSections.id, id))
      .limit(1);
    return (result as unknown as HomepageSectionData) || null;
  }

  async getSectionByKey(key: string): Promise<HomepageSectionData | null> {
    const db = getDb();
    const [result] = await db
      .select()
      .from(homepageSections)
      .where(eq(homepageSections.sectionKey, key))
      .limit(1);
    return (result as unknown as HomepageSectionData) || null;
  }

  async updateSection(
    id: string,
    data: {
      sectionKey?: string;
      isVisible?: boolean;
      sortOrder?: number;
      content?: Record<string, unknown>;
    },
  ): Promise<HomepageSectionData> {
    const db = getDb();
    const [result] = await db
      .update(homepageSections)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(homepageSections.id, id))
      .returning();
    if (!result) throw new Error("Section not found");
    // Instant public-site refresh (best-effort, never fails the save).
    void purgePublicCache(["home"]);
    return result as unknown as HomepageSectionData;
  }

  async reorder(orderedIds: string[]): Promise<void> {
    const db = getDb();
    for (let i = 0; i < orderedIds.length; i++) {
      await db
        .update(homepageSections)
        .set({ sortOrder: i, updatedAt: new Date() })
        .where(eq(homepageSections.id, orderedIds[i]!));
    }
    // Instant public-site refresh (best-effort, never fails the save).
    void purgePublicCache(["home"]);
  }

  async toggleVisibility(id: string): Promise<HomepageSectionData> {
    const db = getDb();
    const section = await this.getSection(id);
    if (!section) throw new Error("Section not found");
    const [result] = await db
      .update(homepageSections)
      .set({ isVisible: !section.isVisible, updatedAt: new Date() })
      .where(eq(homepageSections.id, id))
      .returning();
    // Instant public-site refresh (best-effort, never fails the save).
    void purgePublicCache(["home"]);
    return result as unknown as HomepageSectionData;
  }

  async createVersion(userId: string | null): Promise<HomepageVersionData> {
    const db = getDb();
    const sections = await this.getAllSections();

    const [latest] = await db
      .select({ maxVer: count() })
      .from(homepageVersions);

    const versionNumber = (Number(latest?.maxVer) || 0) + 1;

    const [result] = await db
      .insert(homepageVersions)
      .values({
        version: versionNumber,
        snapshotJson: { sections } as unknown as Record<string, unknown>,
        createdBy: userId,
      })
      .returning();

    return result as unknown as HomepageVersionData;
  }

  async restoreVersion(id: string): Promise<{ restored: number }> {
    const db = getDb();
    const [version] = await db
      .select()
      .from(homepageVersions)
      .where(eq(homepageVersions.id, id))
      .limit(1);
    if (!version) throw new Error("Version not found");

    const snapshot = (version.snapshotJson ?? {}) as {
      sections?: HomepageSectionData[];
    };
    const sections = Array.isArray(snapshot.sections) ? snapshot.sections : [];
    let restored = 0;
    for (const snap of sections) {
      const target =
        (snap.id ? await this.getSection(snap.id) : null) ??
        (snap.sectionKey ? await this.getSectionByKey(snap.sectionKey) : null);
      if (!target) continue;
      await db
        .update(homepageSections)
        .set({
          content: (snap.content ?? {}) as Record<string, unknown>,
          isVisible: snap.isVisible ?? true,
          sortOrder: snap.sortOrder ?? target.sortOrder ?? 0,
          updatedAt: new Date(),
        })
        .where(eq(homepageSections.id, target.id));
      restored++;
    }
    // Instant public-site refresh (best-effort, never fails the save).
    if (restored > 0) void purgePublicCache(["home"]);
    return { restored };
  }

  async getVersions(page = 1, pageSize = 20): Promise<PaginatedResponse<HomepageVersionData>> {
    const db = getDb();
    const [countResult] = await db.select({ count: count() }).from(homepageVersions);
    const total = Number(countResult?.count ?? 0);
    const items = await db
      .select()
      .from(homepageVersions)
      .orderBy(desc(homepageVersions.version))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    const totalPages = Math.ceil(total / pageSize);

    return {
      items: items as unknown as HomepageVersionData[],
      pagination: { page, pageSize, total, totalPages, hasNextPage: page < totalPages, hasPreviousPage: page > 1 },
    };
  }
}
