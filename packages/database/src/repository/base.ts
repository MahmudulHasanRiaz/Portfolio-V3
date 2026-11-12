import { getDb } from "../connection";
import { DatabaseError, NotFoundError } from "../errors";
import { trackQuery } from "../utils/query-timing";
import type { PgTable } from "drizzle-orm/pg-core";
import { eq, sql } from "drizzle-orm";

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export abstract class BaseRepository<TTable extends PgTable> {
  protected table: TTable;
  protected entityName: string;

  constructor(table: TTable, entityName: string) {
    this.table = table;
    this.entityName = entityName;
  }

  protected get db() {
    return getDb();
  }

  async findById(id: string) {
    const start = Date.now();
    try {
      const [result] = await this.db
        .select()
        .from(this.table as any)
        .where(eq((this.table as any).id, id))
        .limit(1);

      trackQuery(this.entityName, "findById", Date.now() - start);
      return result || null;
    } catch (error) {
      trackQuery(this.entityName, "findById", Date.now() - start);
      throw new DatabaseError(`Failed to find ${this.entityName}`, {
        entity: this.entityName,
        operation: "findById",
        cause: error,
      });
    }
  }

  async findByIdOrThrow(id: string) {
    const result = await this.findById(id);
    if (!result) {
      throw new NotFoundError(this.entityName, id);
    }
    return result;
  }

  async findAll(params: PaginationParams = {}) {
    const start = Date.now();
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 50;
    const offset = (page - 1) * pageSize;

    try {
      const data = await this.db
        .select()
        .from(this.table as any)
        .limit(pageSize)
        .offset(offset);

      const countResult = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(this.table as any);

      const total = Number(countResult[0]?.count ?? 0);
      trackQuery(this.entityName, "findAll", Date.now() - start);

      return {
        data,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    } catch (error) {
      trackQuery(this.entityName, "findAll", Date.now() - start);
      throw new DatabaseError(`Failed to list ${this.entityName}`, {
        entity: this.entityName,
        operation: "findAll",
        cause: error,
      });
    }
  }

  async create(data: Record<string, unknown>) {
    const start = Date.now();
    try {
      const [result] = await this.db
        .insert(this.table as any)
        .values(data)
        .returning();

      trackQuery(this.entityName, "create", Date.now() - start);
      return result;
    } catch (error) {
      trackQuery(this.entityName, "create", Date.now() - start);
      throw new DatabaseError(`Failed to create ${this.entityName}`, {
        entity: this.entityName,
        operation: "create",
        cause: error,
      });
    }
  }

  async update(id: string, data: Record<string, unknown>) {
    const start = Date.now();
    try {
      const [result] = await this.db
        .update(this.table as any)
        .set(data)
        .where(eq((this.table as any).id, id))
        .returning();

      trackQuery(this.entityName, "update", Date.now() - start);
      return result;
    } catch (error) {
      trackQuery(this.entityName, "update", Date.now() - start);
      throw new DatabaseError(`Failed to update ${this.entityName}`, {
        entity: this.entityName,
        operation: "update",
        cause: error,
      });
    }
  }

  async delete(id: string): Promise<void> {
    const start = Date.now();
    try {
      await this.db
        .delete(this.table as any)
        .where(eq((this.table as any).id, id));

      trackQuery(this.entityName, "delete", Date.now() - start);
    } catch (error) {
      trackQuery(this.entityName, "delete", Date.now() - start);
      throw new DatabaseError(`Failed to delete ${this.entityName}`, {
        entity: this.entityName,
        operation: "delete",
        cause: error,
      });
    }
  }

  async count(): Promise<number> {
    const start = Date.now();
    try {
      const [result] = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(this.table as any);

      trackQuery(this.entityName, "count", Date.now() - start);
      return Number(result?.count ?? 0);
    } catch (error) {
      trackQuery(this.entityName, "count", Date.now() - start);
      throw new DatabaseError(`Failed to count ${this.entityName}`, {
        entity: this.entityName,
        operation: "count",
        cause: error,
      });
    }
  }

  async exists(id: string): Promise<boolean> {
    const start = Date.now();
    try {
      const [result] = await this.db
        .select({ id: (this.table as any).id })
        .from(this.table as any)
        .where(eq((this.table as any).id, id))
        .limit(1);

      trackQuery(this.entityName, "exists", Date.now() - start);
      return !!result;
    } catch (error) {
      trackQuery(this.entityName, "exists", Date.now() - start);
      throw new DatabaseError(
        `Failed to check ${this.entityName} existence`,
        {
          entity: this.entityName,
          operation: "exists",
          cause: error,
        },
      );
    }
  }
}
