import postgres from "postgres";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { AuthError, NotFoundError } from "./errors";
import type { PortalSessionRow, PortalAuthResult } from "./types";

type Sql = postgres.Sql<{}>;

// Aliased columns: raw SELECT * returns snake_case, consumers read camelCase
// (session.clientEmail / passwordHash / projectId were all undefined).
const SESSION_COLUMNS = 'id, project_id AS "projectId", portal_token AS "portalToken", client_email AS "clientEmail", password_hash AS "passwordHash", last_accessed_at AS "lastAccessedAt", expires_at AS "expiresAt", created_at AS "createdAt"';

const JWT_SECRET = process.env.PORTAL_JWT_SECRET || "portal-dev-secret-change-in-production";
const JWT_EXPIRES_IN = "7d";

export class PortalAuthRepository {
  constructor(private sql: Sql) {}

  async getSessionByToken(portalToken: string): Promise<PortalSessionRow | null> {
    const rows = await this.sql.unsafe<PortalSessionRow[]>(
      `SELECT ${SESSION_COLUMNS} FROM portal_sessions WHERE portal_token = $1`,
      [portalToken]
    );
    return rows[0] ?? null;
  }

  async getSessionByProjectId(projectId: string): Promise<PortalSessionRow | null> {
    const rows = await this.sql.unsafe<PortalSessionRow[]>(
      `SELECT ${SESSION_COLUMNS} FROM portal_sessions WHERE project_id = $1::uuid`,
      [projectId]
    );
    return rows[0] ?? null;
  }

  async createSession(projectId: string, portalToken: string, clientEmail: string | null): Promise<PortalSessionRow> {
    const rows = await this.sql.unsafe<PortalSessionRow[]>(
      `INSERT INTO portal_sessions (project_id, portal_token, client_email)
       VALUES ($1::uuid, $2, $3) RETURNING ${SESSION_COLUMNS}`,
      [projectId, portalToken, clientEmail]
    );
    return rows[0]!;
  }

  async bindClientEmail(projectId: string, email: string): Promise<void> {
    await this.sql.unsafe(
      "UPDATE portal_sessions SET client_email = $1 WHERE project_id = $2::uuid AND client_email IS NULL",
      [email, projectId]
    );
  }

  async setPassword(projectId: string, password: string): Promise<void> {
    const hash = await bcrypt.hash(password, 12);
    await this.sql.unsafe(
      "UPDATE portal_sessions SET password_hash = $1 WHERE project_id = $2::uuid",
      [hash, projectId]
    );
  }

  async verifyPassword(projectId: string, password: string): Promise<boolean> {
    const rows = await this.sql.unsafe<PortalSessionRow[]>(
      `SELECT ${SESSION_COLUMNS} FROM portal_sessions WHERE project_id = $1::uuid`,
      [projectId]
    );
    if (!rows[0] || !rows[0].passwordHash) return false;
    return bcrypt.compare(password, rows[0].passwordHash!);
  }

  async verifyEmail(projectId: string, email: string): Promise<boolean> {
    const rows = await this.sql.unsafe<PortalSessionRow[]>(
      `SELECT ${SESSION_COLUMNS} FROM portal_sessions WHERE project_id = $1::uuid`,
      [projectId]
    );
    if (!rows[0]) return false;
    return rows[0].clientEmail?.toLowerCase() === email.toLowerCase();
  }

  async updateLastAccessed(sessionId: string): Promise<void> {
    await this.sql.unsafe(
      "UPDATE portal_sessions SET last_accessed_at = NOW() WHERE id = $1::uuid",
      [sessionId]
    );
  }

  async findOrCreateSession(projectId: string, portalToken: string, clientEmail: string | null): Promise<PortalSessionRow> {
    const existing = await this.getSessionByProjectId(projectId);
    if (existing) return existing;
    return this.createSession(projectId, portalToken, clientEmail);
  }

  generateJwt(sessionId: string, projectId: string, email: string): string {
    return jwt.sign({ sessionId, projectId, email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  verifyJwt(token: string): { sessionId: string; projectId: string; email: string } {
    try {
      return jwt.verify(token, JWT_SECRET) as { sessionId: string; projectId: string; email: string };
    } catch {
      throw new AuthError("Invalid or expired session token");
    }
  }

  async authenticate(projectId: string, email: string, password: string): Promise<PortalAuthResult> {
    const session = await this.getSessionByProjectId(projectId);
    if (!session) throw new NotFoundError("Portal session", projectId);
    if (!await this.verifyEmail(projectId, email)) throw new AuthError("Invalid email");
    if (!await this.verifyPassword(projectId, password)) throw new AuthError("Invalid password");
    await this.updateLastAccessed(session.id);
    const token = this.generateJwt(session.id, projectId, email);
    return { sessionId: session.id, projectId, clientEmail: email, token };
  }
}
