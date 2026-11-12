import postgres from "postgres";
import type { ReleasePlatformRow } from "./types";

type Sql = postgres.Sql<{}>;

export class PlatformRepository {
  constructor(private sql: Sql) {}

  async list(releaseId: string): Promise<ReleasePlatformRow[]> {
    return this.sql.unsafe<ReleasePlatformRow[]>(
      "SELECT * FROM release_platforms WHERE release_id = $1::uuid ORDER BY platform_name", [releaseId]
    );
  }

  async create(releaseId: string, platformName: string, platformUrl: string): Promise<ReleasePlatformRow> {
    const { randomUUID } = await import("node:crypto");
    const id = randomUUID();
    const rows = await this.sql.unsafe<ReleasePlatformRow[]>(
      "INSERT INTO release_platforms (id, release_id, platform_name, platform_url) VALUES ($1::uuid, $2::uuid, $3, $4) RETURNING *",
      [id, releaseId, platformName, platformUrl]
    );
    return rows[0]!;
  }

  async update(id: string, data: { platformName?: string; platformUrl?: string }): Promise<ReleasePlatformRow | null> {
    const sets: string[] = [];
    const vals: postgres.ParameterOrJSON<never>[] = [];
    if (data.platformName !== undefined) {
      sets.push(`platform_name = $${vals.length + 1}`);
      vals.push(data.platformName);
    }
    if (data.platformUrl !== undefined) {
      sets.push(`platform_url = $${vals.length + 1}`);
      vals.push(data.platformUrl);
    }
    if (sets.length === 0) return null;
    vals.push(id);
    const rows = await this.sql.unsafe<ReleasePlatformRow[]>(
      `UPDATE release_platforms SET ${sets.join(", ")} WHERE id = $${vals.length} RETURNING *`,
      vals
    );
    return rows[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.sql.unsafe<{ id: string }[]>(
      "DELETE FROM release_platforms WHERE id = $1::uuid RETURNING id", [id]
    );
    return result.length > 0;
  }
}
