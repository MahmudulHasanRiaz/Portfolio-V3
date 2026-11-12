import { BaseRepository } from "./base";
import { DatabaseError } from "../errors";
import { trackQuery } from "../utils/query-timing";
import * as schema from "../schema";
import { eq, and } from "drizzle-orm";

export class FormsRepository extends BaseRepository<typeof schema.forms> {
  constructor() {
    super(schema.forms, "form");
  }

  async findBySlug(slug: string) {
    const start = Date.now();
    try {
      const [result] = await this.db
        .select()
        .from(this.table)
        .where(eq((schema.forms as any).slug, slug) as any)
        .limit(1);
      trackQuery(this.entityName, "findBySlug", Date.now() - start);
      return (result as typeof schema.forms.$inferSelect) || null;
    } catch (error) {
      trackQuery(this.entityName, "findBySlug", Date.now() - start);
      throw new DatabaseError("Failed to find form by slug", { entity: this.entityName, operation: "findBySlug", cause: error });
    }
  }

  async findActive() {
    const start = Date.now();
    try {
      const results = await this.db
        .select()
        .from(this.table)
        .where(eq((schema.forms as any).isActive, true) as any);
      trackQuery(this.entityName, "findActive", Date.now() - start);
      return results as typeof schema.forms.$inferSelect[];
    } catch (error) {
      trackQuery(this.entityName, "findActive", Date.now() - start);
      throw new DatabaseError("Failed to find active forms", { entity: this.entityName, operation: "findActive", cause: error });
    }
  }
}

export class FormFieldsRepository extends BaseRepository<typeof schema.formFields> {
  constructor() {
    super(schema.formFields, "formField");
  }

  async findByFormId(formId: string) {
    const start = Date.now();
    try {
      const results = await this.db
        .select()
        .from(this.table)
        .where(eq((schema.formFields as any).formId, formId) as any);
      trackQuery(this.entityName, "findByFormId", Date.now() - start);
      return results as typeof schema.formFields.$inferSelect[];
    } catch (error) {
      trackQuery(this.entityName, "findByFormId", Date.now() - start);
      throw new DatabaseError("Failed to find form fields by form id", { entity: this.entityName, operation: "findByFormId", cause: error });
    }
  }
}

export class FormSubmissionsRepository extends BaseRepository<typeof schema.formSubmissions> {
  constructor() {
    super(schema.formSubmissions, "formSubmission");
  }

  async findByFormId(formId: string) {
    const start = Date.now();
    try {
      const results = await this.db
        .select()
        .from(this.table)
        .where(eq((schema.formSubmissions as any).formId, formId) as any);
      trackQuery(this.entityName, "findByFormId", Date.now() - start);
      return results as typeof schema.formSubmissions.$inferSelect[];
    } catch (error) {
      trackQuery(this.entityName, "findByFormId", Date.now() - start);
      throw new DatabaseError("Failed to find form submissions by form id", { entity: this.entityName, operation: "findByFormId", cause: error });
    }
  }
}

export class FormAnalyticsRepository extends BaseRepository<typeof schema.formAnalytics> {
  constructor() {
    super(schema.formAnalytics, "formAnalytics");
  }

  async findByFormIdAndDate(formId: string, date: Date) {
    const start = Date.now();
    try {
      const [result] = await this.db
        .select()
        .from(this.table)
        .where(and(eq((schema.formAnalytics as any).formId, formId) as any, eq((schema.formAnalytics as any).date, date) as any) as any)
        .limit(1);
      trackQuery(this.entityName, "findByFormIdAndDate", Date.now() - start);
      return (result as typeof schema.formAnalytics.$inferSelect) || null;
    } catch (error) {
      trackQuery(this.entityName, "findByFormIdAndDate", Date.now() - start);
      throw new DatabaseError("Failed to find form analytics by form id and date", { entity: this.entityName, operation: "findByFormIdAndDate", cause: error });
    }
  }
}
