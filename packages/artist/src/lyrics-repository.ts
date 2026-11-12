import postgres from "postgres";
import type { ReleaseLyricsRow } from "./types";

type Sql = postgres.Sql<{}>;

export class LyricsRepository {
  constructor(private sql: Sql) {}

  async getByReleaseId(releaseId: string): Promise<ReleaseLyricsRow | null> {
    const rows = await this.sql.unsafe<ReleaseLyricsRow[]>(
      "SELECT * FROM release_lyrics WHERE release_id = $1::uuid", [releaseId]
    );
    return rows[0] ?? null;
  }

  async upsert(releaseId: string, data: { lyricsText?: string; lyricsLanguage?: string; translations?: Record<string, unknown>; status?: string }): Promise<ReleaseLyricsRow> {
    const existing = await this.getByReleaseId(releaseId);
    if (existing) {
      const sets: string[] = [];
      const vals: postgres.ParameterOrJSON<never>[] = [];
      if (data.lyricsText !== undefined) { sets.push(`lyrics_text = $${vals.length + 1}`); vals.push(data.lyricsText); }
      if (data.lyricsLanguage !== undefined) { sets.push(`lyrics_language = $${vals.length + 1}`); vals.push(data.lyricsLanguage); }
      if (data.translations !== undefined) { sets.push(`translations = $${vals.length + 1}`); vals.push(data.translations as any); }
      if (data.status !== undefined) { sets.push(`status = $${vals.length + 1}`); vals.push(data.status); }
      if (sets.length === 0) return existing;
      vals.push(existing.id);
      const rows = await this.sql.unsafe<ReleaseLyricsRow[]>(
        `UPDATE release_lyrics SET ${sets.join(", ")} WHERE id = $${vals.length} RETURNING *`,
        vals
      );
      return rows[0]!;
    } else {
      const { randomUUID } = await import("node:crypto");
      const id = randomUUID();
      const rows = await this.sql.unsafe<ReleaseLyricsRow[]>(
        "INSERT INTO release_lyrics (id, release_id, lyrics_text, lyrics_language, translations, status) VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6) RETURNING *",
        [id, releaseId, data.lyricsText ?? null, data.lyricsLanguage ?? null, (data.translations ?? null) as any, data.status ?? "draft"]
      );
      return rows[0]!;
    }
  }
}
