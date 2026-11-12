import { BaseRepository } from "./base";
import { DatabaseError } from "../errors";
import { trackQuery } from "../utils/query-timing";
import * as schema from "../schema";
import { eq, asc, desc, and, gte, lte } from "drizzle-orm";

export class PagesRepository extends BaseRepository<typeof schema.pages> {
  constructor() {
    super(schema.pages, "page");
  }

  async findBySlug(slug: string) {
    const start = Date.now();
    try {
      const [result] = await this.db
        .select()
        .from(this.table)
        .where(eq((schema.pages as any).slug, slug) as any)
        .limit(1);
      trackQuery(this.entityName, "findBySlug", Date.now() - start);
      return (result as typeof schema.pages.$inferSelect) || null;
    } catch (error) {
      trackQuery(this.entityName, "findBySlug", Date.now() - start);
      throw new DatabaseError("Failed to find page by slug", { entity: this.entityName, operation: "findBySlug", cause: error });
    }
  }
}

export class HomepageSectionsRepository extends BaseRepository<typeof schema.homepageSections> {
  constructor() {
    super(schema.homepageSections, "homepageSection");
  }

  async findByKey(key: string) {
    const start = Date.now();
    try {
      const [result] = await this.db
        .select()
        .from(this.table)
        .where(eq((schema.homepageSections as any).sectionKey, key) as any)
        .limit(1);
      trackQuery(this.entityName, "findByKey", Date.now() - start);
      return (result as typeof schema.homepageSections.$inferSelect) || null;
    } catch (error) {
      trackQuery(this.entityName, "findByKey", Date.now() - start);
      throw new DatabaseError("Failed to find homepage section by key", { entity: this.entityName, operation: "findByKey", cause: error });
    }
  }

  async findAllOrdered() {
    const start = Date.now();
    try {
      const results = await this.db
        .select()
        .from(this.table)
        .orderBy(asc((schema.homepageSections as any).sortOrder));
      trackQuery(this.entityName, "findAllOrdered", Date.now() - start);
      return results as typeof schema.homepageSections.$inferSelect[];
    } catch (error) {
      trackQuery(this.entityName, "findAllOrdered", Date.now() - start);
      throw new DatabaseError("Failed to find all homepage sections ordered", { entity: this.entityName, operation: "findAllOrdered", cause: error });
    }
  }
}

export class ServicesRepository extends BaseRepository<typeof schema.services> {
  constructor() {
    super(schema.services, "service");
  }

  async findBySlug(slug: string) {
    const start = Date.now();
    try {
      const [result] = await this.db
        .select()
        .from(this.table)
        .where(eq((schema.services as any).slug, slug) as any)
        .limit(1);
      trackQuery(this.entityName, "findBySlug", Date.now() - start);
      return (result as typeof schema.services.$inferSelect) || null;
    } catch (error) {
      trackQuery(this.entityName, "findBySlug", Date.now() - start);
      throw new DatabaseError("Failed to find service by slug", { entity: this.entityName, operation: "findBySlug", cause: error });
    }
  }

  async findAllFeatured() {
    const start = Date.now();
    try {
      const results = await this.db
        .select()
        .from(this.table)
        .where(eq((schema.services as any).isFeatured, true) as any)
        .orderBy(asc((schema.services as any).sortOrder));
      trackQuery(this.entityName, "findAllFeatured", Date.now() - start);
      return results as typeof schema.services.$inferSelect[];
    } catch (error) {
      trackQuery(this.entityName, "findAllFeatured", Date.now() - start);
      throw new DatabaseError("Failed to find featured services", { entity: this.entityName, operation: "findAllFeatured", cause: error });
    }
  }
}

export class ServiceFaqsRepository extends BaseRepository<typeof schema.serviceFaqs> {
  constructor() {
    super(schema.serviceFaqs, "serviceFaq");
  }

  async findByServiceId(serviceId: string) {
    const start = Date.now();
    try {
      const results = await this.db
        .select()
        .from(this.table)
        .where(eq((schema.serviceFaqs as any).serviceId, serviceId) as any)
        .orderBy(asc((schema.serviceFaqs as any).sortOrder));
      trackQuery(this.entityName, "findByServiceId", Date.now() - start);
      return results as typeof schema.serviceFaqs.$inferSelect[];
    } catch (error) {
      trackQuery(this.entityName, "findByServiceId", Date.now() - start);
      throw new DatabaseError("Failed to find faqs by service id", { entity: this.entityName, operation: "findByServiceId", cause: error });
    }
  }
}

export class ProjectsRepository extends BaseRepository<typeof schema.projects> {
  constructor() {
    super(schema.projects, "project");
  }

  async findBySlug(slug: string) {
    const start = Date.now();
    try {
      const [result] = await this.db
        .select()
        .from(this.table)
        .where(eq((schema.projects as any).slug, slug) as any)
        .limit(1);
      trackQuery(this.entityName, "findBySlug", Date.now() - start);
      return (result as typeof schema.projects.$inferSelect) || null;
    } catch (error) {
      trackQuery(this.entityName, "findBySlug", Date.now() - start);
      throw new DatabaseError("Failed to find project by slug", { entity: this.entityName, operation: "findBySlug", cause: error });
    }
  }

  async findAllFeatured() {
    const start = Date.now();
    try {
      const results = await this.db
        .select()
        .from(this.table)
        .where(eq((schema.projects as any).isFeatured, true) as any);
      trackQuery(this.entityName, "findAllFeatured", Date.now() - start);
      return results as typeof schema.projects.$inferSelect[];
    } catch (error) {
      trackQuery(this.entityName, "findAllFeatured", Date.now() - start);
      throw new DatabaseError("Failed to find featured projects", { entity: this.entityName, operation: "findAllFeatured", cause: error });
    }
  }
}

export class TechnologiesRepository extends BaseRepository<typeof schema.technologies> {
  constructor() {
    super(schema.technologies, "technology");
  }

  async findByCategory(category: string) {
    const start = Date.now();
    try {
      const results = await this.db
        .select()
        .from(this.table)
        .where(eq((schema.technologies as any).category, category) as any)
        .orderBy(asc((schema.technologies as any).sortOrder));
      trackQuery(this.entityName, "findByCategory", Date.now() - start);
      return results as typeof schema.technologies.$inferSelect[];
    } catch (error) {
      trackQuery(this.entityName, "findByCategory", Date.now() - start);
      throw new DatabaseError("Failed to find technologies by category", { entity: this.entityName, operation: "findByCategory", cause: error });
    }
  }
}

export class CaseStudiesRepository extends BaseRepository<typeof schema.caseStudies> {
  constructor() {
    super(schema.caseStudies, "caseStudy");
  }

  async findBySlug(slug: string) {
    const start = Date.now();
    try {
      const [result] = await this.db
        .select()
        .from(this.table)
        .where(eq((schema.caseStudies as any).slug, slug) as any)
        .limit(1);
      trackQuery(this.entityName, "findBySlug", Date.now() - start);
      return (result as typeof schema.caseStudies.$inferSelect) || null;
    } catch (error) {
      trackQuery(this.entityName, "findBySlug", Date.now() - start);
      throw new DatabaseError("Failed to find case study by slug", { entity: this.entityName, operation: "findBySlug", cause: error });
    }
  }

  async findAllFeatured() {
    const start = Date.now();
    try {
      const results = await this.db
        .select()
        .from(this.table)
        .where(eq((schema.caseStudies as any).isFeatured, true) as any);
      trackQuery(this.entityName, "findAllFeatured", Date.now() - start);
      return results as typeof schema.caseStudies.$inferSelect[];
    } catch (error) {
      trackQuery(this.entityName, "findAllFeatured", Date.now() - start);
      throw new DatabaseError("Failed to find featured case studies", { entity: this.entityName, operation: "findAllFeatured", cause: error });
    }
  }
}

export class PostsRepository extends BaseRepository<typeof schema.posts> {
  constructor() {
    super(schema.posts, "post");
  }

  async findBySlug(slug: string) {
    const start = Date.now();
    try {
      const [result] = await this.db
        .select()
        .from(this.table)
        .where(eq((schema.posts as any).slug, slug) as any)
        .limit(1);
      trackQuery(this.entityName, "findBySlug", Date.now() - start);
      return (result as typeof schema.posts.$inferSelect) || null;
    } catch (error) {
      trackQuery(this.entityName, "findBySlug", Date.now() - start);
      throw new DatabaseError("Failed to find post by slug", { entity: this.entityName, operation: "findBySlug", cause: error });
    }
  }

  async findScheduled() {
    const start = Date.now();
    try {
      const results = await this.db
        .select()
        .from(this.table)
        .where(and(eq((schema.posts as any).status, "scheduled") as any, lte((schema.posts as any).publishAt, new Date()) as any) as any);
      trackQuery(this.entityName, "findScheduled", Date.now() - start);
      return results as typeof schema.posts.$inferSelect[];
    } catch (error) {
      trackQuery(this.entityName, "findScheduled", Date.now() - start);
      throw new DatabaseError("Failed to find scheduled posts", { entity: this.entityName, operation: "findScheduled", cause: error });
    }
  }

  async findPublished() {
    const start = Date.now();
    try {
      const results = await this.db
        .select()
        .from(this.table)
        .where(eq((schema.posts as any).status, "published") as any);
      trackQuery(this.entityName, "findPublished", Date.now() - start);
      return results as typeof schema.posts.$inferSelect[];
    } catch (error) {
      trackQuery(this.entityName, "findPublished", Date.now() - start);
      throw new DatabaseError("Failed to find published posts", { entity: this.entityName, operation: "findPublished", cause: error });
    }
  }
}

export class CategoriesRepository extends BaseRepository<typeof schema.categories> {
  constructor() {
    super(schema.categories, "category");
  }

  async findBySlug(slug: string) {
    const start = Date.now();
    try {
      const [result] = await this.db
        .select()
        .from(this.table)
        .where(eq((schema.categories as any).slug, slug) as any)
        .limit(1);
      trackQuery(this.entityName, "findBySlug", Date.now() - start);
      return (result as typeof schema.categories.$inferSelect) || null;
    } catch (error) {
      trackQuery(this.entityName, "findBySlug", Date.now() - start);
      throw new DatabaseError("Failed to find category by slug", { entity: this.entityName, operation: "findBySlug", cause: error });
    }
  }

  async findByType(type: string) {
    const start = Date.now();
    try {
      const results = await this.db
        .select()
        .from(this.table)
        .where(eq((schema.categories as any).type, type) as any);
      trackQuery(this.entityName, "findByType", Date.now() - start);
      return results as typeof schema.categories.$inferSelect[];
    } catch (error) {
      trackQuery(this.entityName, "findByType", Date.now() - start);
      throw new DatabaseError("Failed to find categories by type", { entity: this.entityName, operation: "findByType", cause: error });
    }
  }
}

export class TagsRepository extends BaseRepository<typeof schema.tags> {
  constructor() {
    super(schema.tags, "tag");
  }

  async findBySlug(slug: string) {
    const start = Date.now();
    try {
      const [result] = await this.db
        .select()
        .from(this.table)
        .where(eq((schema.tags as any).slug, slug) as any)
        .limit(1);
      trackQuery(this.entityName, "findBySlug", Date.now() - start);
      return (result as typeof schema.tags.$inferSelect) || null;
    } catch (error) {
      trackQuery(this.entityName, "findBySlug", Date.now() - start);
      throw new DatabaseError("Failed to find tag by slug", { entity: this.entityName, operation: "findBySlug", cause: error });
    }
  }
}

export class ResourcesRepository extends BaseRepository<typeof schema.resources> {
  constructor() {
    super(schema.resources, "resource");
  }

  async findBySlug(slug: string) {
    const start = Date.now();
    try {
      const [result] = await this.db
        .select()
        .from(this.table)
        .where(eq((schema.resources as any).slug, slug) as any)
        .limit(1);
      trackQuery(this.entityName, "findBySlug", Date.now() - start);
      return (result as typeof schema.resources.$inferSelect) || null;
    } catch (error) {
      trackQuery(this.entityName, "findBySlug", Date.now() - start);
      throw new DatabaseError("Failed to find resource by slug", { entity: this.entityName, operation: "findBySlug", cause: error });
    }
  }
}

export class MediaMentionsRepository extends BaseRepository<typeof schema.mediaMentions> {
  constructor() {
    super(schema.mediaMentions, "mediaMention");
  }

  async findBySlug(slug: string) {
    const start = Date.now();
    try {
      const [result] = await this.db
        .select()
        .from(this.table)
        .where(eq((schema.mediaMentions as any).slug, slug) as any)
        .limit(1);
      trackQuery(this.entityName, "findBySlug", Date.now() - start);
      return (result as typeof schema.mediaMentions.$inferSelect) || null;
    } catch (error) {
      trackQuery(this.entityName, "findBySlug", Date.now() - start);
      throw new DatabaseError("Failed to find media mention by slug", { entity: this.entityName, operation: "findBySlug", cause: error });
    }
  }
}

export class FaqsRepository extends BaseRepository<typeof schema.faqs> {
  constructor() {
    super(schema.faqs, "faq");
  }

  async findByEntity(entityType: string, entityId: string) {
    const start = Date.now();
    try {
      const results = await this.db
        .select()
        .from(this.table)
        .where(and(eq((schema.faqs as any).entityType, entityType) as any, eq((schema.faqs as any).entityId, entityId) as any) as any)
        .orderBy(asc((schema.faqs as any).sortOrder));
      trackQuery(this.entityName, "findByEntity", Date.now() - start);
      return results as typeof schema.faqs.$inferSelect[];
    } catch (error) {
      trackQuery(this.entityName, "findByEntity", Date.now() - start);
      throw new DatabaseError("Failed to find faqs by entity", { entity: this.entityName, operation: "findByEntity", cause: error });
    }
  }
}

export class TestimonialsRepository extends BaseRepository<typeof schema.testimonials> {
  constructor() {
    super(schema.testimonials, "testimonial");
  }

  async findBySourceType(sourceType: string) {
    const start = Date.now();
    try {
      const results = await this.db
        .select()
        .from(this.table)
        .where(eq((schema.testimonials as any).sourceType, sourceType) as any)
        .orderBy(asc((schema.testimonials as any).displayOrder));
      trackQuery(this.entityName, "findBySourceType", Date.now() - start);
      return results as typeof schema.testimonials.$inferSelect[];
    } catch (error) {
      trackQuery(this.entityName, "findBySourceType", Date.now() - start);
      throw new DatabaseError("Failed to find testimonials by source type", { entity: this.entityName, operation: "findBySourceType", cause: error });
    }
  }

  async findAllFeatured() {
    const start = Date.now();
    try {
      const results = await this.db
        .select()
        .from(this.table)
        .where(eq((schema.testimonials as any).isFeatured, true) as any)
        .orderBy(asc((schema.testimonials as any).displayOrder));
      trackQuery(this.entityName, "findAllFeatured", Date.now() - start);
      return results as typeof schema.testimonials.$inferSelect[];
    } catch (error) {
      trackQuery(this.entityName, "findAllFeatured", Date.now() - start);
      throw new DatabaseError("Failed to find featured testimonials", { entity: this.entityName, operation: "findAllFeatured", cause: error });
    }
  }
}

export class HomepageVersionsRepository extends BaseRepository<typeof schema.homepageVersions> {
  constructor() {
    super(schema.homepageVersions, "homepageVersion");
  }

  async findLatest() {
    const start = Date.now();
    try {
      const [result] = await this.db
        .select()
        .from(this.table)
        .orderBy(desc((schema.homepageVersions as any).version))
        .limit(1);
      trackQuery(this.entityName, "findLatest", Date.now() - start);
      return (result as typeof schema.homepageVersions.$inferSelect) || null;
    } catch (error) {
      trackQuery(this.entityName, "findLatest", Date.now() - start);
      throw new DatabaseError("Failed to find latest homepage version", { entity: this.entityName, operation: "findLatest", cause: error });
    }
  }
}
