import { getDb, posts } from "@repo/database";
import { eq, and, lte, isNotNull } from "drizzle-orm";
import { ContentService } from "./content-service";

export interface ScheduledContent {
  id: string;
  title: string | null;
  status: string;
  publishAt: Date | null;
  unpublishAt: Date | null;
}

export class SchedulingService {
  static async getScheduledPosts(): Promise<ScheduledContent[]> {
    const db = getDb();
    const now = new Date();

    const pendingPublish = await db
      .select({
        id: posts.id,
        title: posts.title,
        status: posts.status,
        publishAt: posts.publishAt,
        unpublishAt: posts.unpublishAt,
      })
      .from(posts)
      .where(
        and(
          isNotNull(posts.publishAt),
          lte(posts.publishAt, now),
          eq(posts.status, "scheduled"),
        ),
      );

    const pendingUnpublish = await db
      .select({
        id: posts.id,
        title: posts.title,
        status: posts.status,
        publishAt: posts.publishAt,
        unpublishAt: posts.unpublishAt,
      })
      .from(posts)
      .where(
        and(
          isNotNull(posts.unpublishAt),
          lte(posts.unpublishAt, now),
          eq(posts.status, "published"),
        ),
      );

    return [...pendingPublish, ...pendingUnpublish] as unknown as ScheduledContent[];
  }

  static async processScheduledContent(): Promise<{ published: number; unpublished: number }> {
    const db = getDb();
    const now = new Date();
    const postService = new ContentService("posts");

    const toPublish = await db
      .select({ id: posts.id })
      .from(posts)
      .where(
        and(
          isNotNull(posts.publishAt),
          lte(posts.publishAt, now),
          eq(posts.status, "scheduled"),
        ),
      );

    const toUnpublish = await db
      .select({ id: posts.id })
      .from(posts)
      .where(
        and(
          isNotNull(posts.unpublishAt),
          lte(posts.unpublishAt, now),
          eq(posts.status, "published"),
        ),
      );

    for (const post of toPublish) {
      await postService.transition(post.id, "publish");
    }

    for (const post of toUnpublish) {
      await postService.transition(post.id, "unpublish");
    }

    return {
      published: toPublish.length,
      unpublished: toUnpublish.length,
    };
  }

  static async schedule(id: string, publishAt: Date, unpublishAt?: Date): Promise<void> {
    const db = getDb();
    const updateData: Record<string, unknown> = {
      publishAt,
      status: "scheduled",
      updatedAt: new Date(),
    };

    if (unpublishAt) {
      updateData.unpublishAt = unpublishAt;
    }

    await db.update(posts).set(updateData).where(eq(posts.id, id));
  }

  static async cancelSchedule(id: string): Promise<void> {
    const db = getDb();
    await db
      .update(posts)
      .set({
        publishAt: null,
        unpublishAt: null,
        status: "draft",
        updatedAt: new Date(),
      })
      .where(eq(posts.id, id));
  }
}
