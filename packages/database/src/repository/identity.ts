import { BaseRepository } from "./base";
import { DatabaseError } from "../errors";
import { trackQuery } from "../utils/query-timing";
import * as schema from "../schema";
import { eq, and, lt, gte } from "drizzle-orm";

export class UsersRepository extends BaseRepository<typeof schema.users> {
  constructor() {
    super(schema.users, "user");
  }

  async findByEmail(email: string) {
    const start = Date.now();
    try {
      const [result] = await this.db
        .select()
        .from(this.table)
        .where(eq((schema.users as any).email, email) as any)
        .limit(1);
      trackQuery(this.entityName, "findByEmail", Date.now() - start);
      return (result as typeof schema.users.$inferSelect) || null;
    } catch (error) {
      trackQuery(this.entityName, "findByEmail", Date.now() - start);
      throw new DatabaseError("Failed to find user by email", { entity: this.entityName, operation: "findByEmail", cause: error });
    }
  }

  async findBySessionToken(token: string) {
    const start = Date.now();
    try {
      const [result] = await this.db
        .select()
        .from(this.table)
        .innerJoin(schema.sessions, eq((schema.sessions as any).userId, (schema.users as any).id))
        .where(eq((schema.sessions as any).token, token) as any)
        .limit(1);
      trackQuery(this.entityName, "findBySessionToken", Date.now() - start);
      return (result as any) || null;
    } catch (error) {
      trackQuery(this.entityName, "findBySessionToken", Date.now() - start);
      throw new DatabaseError("Failed to find user by session token", { entity: this.entityName, operation: "findBySessionToken", cause: error });
    }
  }
}

export class RolesRepository extends BaseRepository<typeof schema.roles> {
  constructor() {
    super(schema.roles, "role");
  }

  async findByName(name: string) {
    const start = Date.now();
    try {
      const [result] = await this.db
        .select()
        .from(this.table)
        .where(eq((schema.roles as any).name, name) as any)
        .limit(1);
      trackQuery(this.entityName, "findByName", Date.now() - start);
      return (result as typeof schema.roles.$inferSelect) || null;
    } catch (error) {
      trackQuery(this.entityName, "findByName", Date.now() - start);
      throw new DatabaseError("Failed to find role by name", { entity: this.entityName, operation: "findByName", cause: error });
    }
  }
}

export class PermissionsRepository extends BaseRepository<typeof schema.permissions> {
  constructor() {
    super(schema.permissions, "permission");
  }

  async findByName(name: string) {
    const start = Date.now();
    try {
      const [result] = await this.db
        .select()
        .from(this.table)
        .where(eq((schema.permissions as any).name, name) as any)
        .limit(1);
      trackQuery(this.entityName, "findByName", Date.now() - start);
      return (result as typeof schema.permissions.$inferSelect) || null;
    } catch (error) {
      trackQuery(this.entityName, "findByName", Date.now() - start);
      throw new DatabaseError("Failed to find permission by name", { entity: this.entityName, operation: "findByName", cause: error });
    }
  }

  async findByGroup(group: string) {
    const start = Date.now();
    try {
      const results = await this.db
        .select()
        .from(this.table)
        .where(eq((schema.permissions as any).group, group) as any);
      trackQuery(this.entityName, "findByGroup", Date.now() - start);
      return results as typeof schema.permissions.$inferSelect[];
    } catch (error) {
      trackQuery(this.entityName, "findByGroup", Date.now() - start);
      throw new DatabaseError("Failed to find permissions by group", { entity: this.entityName, operation: "findByGroup", cause: error });
    }
  }
}

export class SessionsRepository extends BaseRepository<typeof schema.sessions> {
  constructor() {
    super(schema.sessions, "session");
  }

  async findByToken(token: string) {
    const start = Date.now();
    try {
      const [result] = await this.db
        .select()
        .from(this.table)
        .where(eq((schema.sessions as any).token, token) as any)
        .limit(1);
      trackQuery(this.entityName, "findByToken", Date.now() - start);
      return (result as typeof schema.sessions.$inferSelect) || null;
    } catch (error) {
      trackQuery(this.entityName, "findByToken", Date.now() - start);
      throw new DatabaseError("Failed to find session by token", { entity: this.entityName, operation: "findByToken", cause: error });
    }
  }

  async findActiveByUserId(userId: string) {
    const start = Date.now();
    try {
      const results = await this.db
        .select()
        .from(this.table)
        .where(and(eq((schema.sessions as any).userId, userId) as any, gte((schema.sessions as any).expiresAt, new Date()) as any) as any);
      trackQuery(this.entityName, "findActiveByUserId", Date.now() - start);
      return results as typeof schema.sessions.$inferSelect[];
    } catch (error) {
      trackQuery(this.entityName, "findActiveByUserId", Date.now() - start);
      throw new DatabaseError("Failed to find active sessions by user id", { entity: this.entityName, operation: "findActiveByUserId", cause: error });
    }
  }

  async deleteExpired() {
    const start = Date.now();
    try {
      await this.db
        .delete(this.table)
        .where(lt((schema.sessions as any).expiresAt, new Date()) as any);
      trackQuery(this.entityName, "deleteExpired", Date.now() - start);
    } catch (error) {
      trackQuery(this.entityName, "deleteExpired", Date.now() - start);
      throw new DatabaseError("Failed to delete expired sessions", { entity: this.entityName, operation: "deleteExpired", cause: error });
    }
  }
}

export class AccountsRepository extends BaseRepository<typeof schema.accounts> {
  constructor() {
    super(schema.accounts, "account");
  }

  async findByProvider(provider: string, providerAccountId: string) {
    const start = Date.now();
    try {
      const [result] = await this.db
        .select()
        .from(this.table)
        .where(and(eq((schema.accounts as any).provider, provider) as any, eq((schema.accounts as any).providerAccountId, providerAccountId) as any) as any)
        .limit(1);
      trackQuery(this.entityName, "findByProvider", Date.now() - start);
      return (result as typeof schema.accounts.$inferSelect) || null;
    } catch (error) {
      trackQuery(this.entityName, "findByProvider", Date.now() - start);
      throw new DatabaseError("Failed to find account by provider", { entity: this.entityName, operation: "findByProvider", cause: error });
    }
  }
}

export class VerificationTokensRepository extends BaseRepository<typeof schema.verificationTokens> {
  constructor() {
    super(schema.verificationTokens, "verificationToken");
  }

  async findByToken(token: string) {
    const start = Date.now();
    try {
      const [result] = await this.db
        .select()
        .from(this.table)
        .where(eq((schema.verificationTokens as any).token, token) as any)
        .limit(1);
      trackQuery(this.entityName, "findByToken", Date.now() - start);
      return (result as typeof schema.verificationTokens.$inferSelect) || null;
    } catch (error) {
      trackQuery(this.entityName, "findByToken", Date.now() - start);
      throw new DatabaseError("Failed to find verification token", { entity: this.entityName, operation: "findByToken", cause: error });
    }
  }

  async deleteExpired() {
    const start = Date.now();
    try {
      await this.db
        .delete(this.table)
        .where(lt((schema.verificationTokens as any).expiresAt, new Date()) as any);
      trackQuery(this.entityName, "deleteExpired", Date.now() - start);
    } catch (error) {
      trackQuery(this.entityName, "deleteExpired", Date.now() - start);
      throw new DatabaseError("Failed to delete expired verification tokens", { entity: this.entityName, operation: "deleteExpired", cause: error });
    }
  }
}

export class PersonProfilesRepository extends BaseRepository<typeof schema.personProfiles> {
  constructor() {
    super(schema.personProfiles, "personProfile");
  }
}

export class DeveloperProfilesRepository extends BaseRepository<typeof schema.developerProfiles> {
  constructor() {
    super(schema.developerProfiles, "developerProfile");
  }
}

export class EntrepreneurProfilesRepository extends BaseRepository<typeof schema.entrepreneurProfiles> {
  constructor() {
    super(schema.entrepreneurProfiles, "entrepreneurProfile");
  }
}

export class ArtistProfilesRepository extends BaseRepository<typeof schema.artistProfiles> {
  constructor() {
    super(schema.artistProfiles, "artistProfile");
  }
}
