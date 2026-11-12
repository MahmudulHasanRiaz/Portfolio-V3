import postgres from "postgres";
import type { PortalMessageRow, MessageFilters, MessageListResponse } from "./types";

type Sql = postgres.Sql<{}>;

export class MessageRepository {
  constructor(private sql: Sql) {}

  async listByProject(projectId: string, filters: MessageFilters = {}): Promise<MessageListResponse> {
    const { page = 1, pageSize = 50 } = filters;
    const conditions: string[] = ["m.project_id = $1::uuid"];
    const params: postgres.ParameterOrJSON<never>[] = [projectId];

    const where = `WHERE ${conditions.join(" AND ")}`;
    const offset = (page - 1) * pageSize;

    const countResult = await this.sql.unsafe<{ total: number }[]>(
      `SELECT COUNT(*)::int as total FROM portal_messages m ${where}`,
      params
    );
    const total = Number(countResult[0]?.total ?? 0);

    const rows = await this.sql.unsafe<PortalMessageRow[]>(
      `SELECT m.* FROM portal_messages m ${where} ORDER BY m.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, pageSize, offset]
    );

    return { messages: rows, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async send(projectId: string, senderType: string, senderId: string | null, message: string, attachments: Record<string, unknown> | null = null): Promise<PortalMessageRow> {
    const rows = await this.sql.unsafe<PortalMessageRow[]>(
      "INSERT INTO portal_messages (project_id, sender_type, sender_id, message, attachments, is_read) VALUES ($1::uuid, $2, $3, $4, $5, false) RETURNING *",
      [projectId, senderType, senderId, message, attachments ? JSON.stringify(attachments) : null]
    );
    return rows[0]!;
  }

  async markAsRead(id: string): Promise<void> {
    await this.sql.unsafe(
      "UPDATE portal_messages SET is_read = true WHERE id = $1::uuid",
      [id]
    );
  }

  async getUnreadCount(projectId: string): Promise<number> {
    const rows = await this.sql.unsafe<{ count: number }[]>(
      "SELECT COUNT(*)::int as count FROM portal_messages WHERE project_id = $1::uuid AND is_read = false",
      [projectId]
    );
    return Number(rows[0]?.count ?? 0);
  }
}
