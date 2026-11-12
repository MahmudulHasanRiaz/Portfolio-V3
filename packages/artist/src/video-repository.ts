import postgres from "postgres";
import type { VideoRow } from "./types";

type Sql = postgres.Sql<{}>;

export class VideoRepository {
  constructor(private sql: Sql) {}

  async list(releaseId: string): Promise<VideoRow[]> {
    return this.sql.unsafe<VideoRow[]>(
      "SELECT * FROM release_videos WHERE release_id = $1::uuid ORDER BY sort_order ASC NULLS LAST, created_at DESC",
      [releaseId]
    );
  }

  async create(releaseId: string, data: { platformName: string; videoUrl: string; title?: string; sortOrder?: number }): Promise<VideoRow> {
    const { randomUUID } = await import("node:crypto");
    const id = randomUUID();
    const rows = await this.sql.unsafe<VideoRow[]>(
      "INSERT INTO release_videos (id, release_id, platform_name, video_url, title, sort_order) VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6) RETURNING *",
      [id, releaseId, data.platformName, data.videoUrl, data.title ?? null, data.sortOrder ?? null]
    );
    return rows[0]!;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.sql.unsafe<{ id: string }[]>(
      "DELETE FROM release_videos WHERE id = $1::uuid RETURNING id", [id]
    );
    return result.length > 0;
  }
}
