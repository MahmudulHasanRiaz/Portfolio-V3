import postgres from "postgres";

type Sql = postgres.Sql<{}>;

export interface TimelineEventRow {
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

  async getByVentureId(ventureId: string): Promise<TimelineEventRow[]> {
    return this.sql.unsafe<TimelineEventRow[]>(
      "SELECT * FROM timeline_events WHERE source_type = 'venture' AND source_id = $1::uuid ORDER BY event_date DESC NULLS LAST, sort_order ASC",
      [ventureId]
    );
  }

  async addEvent(ventureId: string, data: { eventType: string; title: string; description?: string; eventDate?: string; icon?: string; url?: string }): Promise<TimelineEventRow> {
    const { randomUUID } = await import("node:crypto");
    const id = randomUUID();
    const rows = await this.sql.unsafe<TimelineEventRow[]>(
      `INSERT INTO timeline_events (id, source_type, source_id, event_type, title, description, event_date, icon, url)
       VALUES ($1, 'venture', $2::uuid, $3, $4, $5, $6::date, $7, $8) RETURNING *`,
      [id, ventureId, data.eventType, data.title, data.description ?? null, data.eventDate ?? null, data.icon ?? null, data.url ?? null]
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
