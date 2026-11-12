import postgres from "postgres";

type Sql = postgres.Sql<{}>;

interface TimelineEvent {
  id: string;
  sourceType: string | null;
  sourceId: string | null;
  eventType: string | null;
  title: string | null;
  description: string | null;
  eventDate: string | null;
  icon: string | null;
  url: string | null;
  sortOrder: number | null;
  createdAt: string | null;
}

export class TimelineRepository {
  constructor(private sql: Sql) {}

  async getByReleaseId(releaseId: string): Promise<TimelineEvent[]> {
    return this.sql.unsafe<TimelineEvent[]>(
      "SELECT * FROM timeline_events WHERE source_type = 'release' AND source_id = $1::uuid ORDER BY event_date DESC NULLS LAST, created_at DESC",
      [releaseId]
    );
  }

  async addEvent(releaseId: string, data: { eventType: string; title: string; description?: string; eventDate?: string; icon?: string; url?: string }): Promise<TimelineEvent> {
    const { randomUUID } = await import("node:crypto");
    const id = randomUUID();
    const rows = await this.sql.unsafe<TimelineEvent[]>(
      "INSERT INTO timeline_events (id, source_type, source_id, event_type, title, description, event_date, icon, url) VALUES ($1::uuid, 'release', $2::uuid, $3, $4, $5, $6, $7, $8) RETURNING *",
      [id, releaseId, data.eventType, data.title, data.description ?? null, data.eventDate ?? null, data.icon ?? null, data.url ?? null]
    );
    return rows[0]!;
  }

  async deleteEvent(eventId: string): Promise<boolean> {
    const result = await this.sql.unsafe<{ id: string }[]>(
      "DELETE FROM timeline_events WHERE id = $1::uuid RETURNING id", [eventId]
    );
    return result.length > 0;
  }
}
