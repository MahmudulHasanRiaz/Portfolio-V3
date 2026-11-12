import { getDb } from "../connection";
import { SearchIndexRepository } from "../repository/search";
import { eq } from "drizzle-orm";
import type { SearchIndex } from "../types/search";

const db = getDb();
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

import * as schema from "../schema";

export class SearchIndexerService {
  private repo: SearchIndexRepository;

  constructor(repo?: SearchIndexRepository) {
    this.repo = repo ?? new SearchIndexRepository();
  }

  async indexEntity(entityType: string, entityId: string): Promise<boolean> {
    try {
      const searchData = await this.loadEntity(entityType, entityId);
      if (!searchData) return false;
      await this.repo.upsertEntity(searchData);
      return true;
    } catch (error) {
      console.error(`[SearchIndexer] Failed to index ${entityType}/${entityId}:`, error);
      return false;
    }
  }

  async deleteEntity(entityType: string, entityId: string): Promise<void> {
    try {
      await this.repo.deleteEntity(entityType, entityId);
    } catch (error) {
      console.error(`[SearchIndexer] Failed to delete ${entityType}/${entityId}:`, error);
    }
  }

  async rebuildAll(): Promise<{ total: number; errors: number }> {
    await this.repo.rebuildIndex();

    let total = 0;
    let errors = 0;

    const loaders: Array<() => Promise<SearchIndex[]>> = [
      () => this.loadPages(),
      () => this.loadPosts(),
      () => this.loadServices(),
      () => this.loadProjects(),
      () => this.loadCaseStudies(),
      () => this.loadFaqs(),
      () => this.loadTimelineEvents(),
      () => this.loadVentures(),
      () => this.loadProducts(),
      () => this.loadReleases(),
    ];

    for (const loader of loaders) {
      try {
        const entities = await loader();
        for (const entity of entities) {
          try {
            await this.repo.upsertEntity(entity);
            total++;
          } catch (err) {
            console.error(`[SearchIndexer] Failed to upsert ${entity.entityType}/${entity.entityId}:`, err);
            errors++;
          }
        }
      } catch (err) {
        console.error(`[SearchIndexer] Failed to load entity batch:`, err);
        errors++;
      }
    }

    return { total, errors };
  }

  private async loadEntity(entityType: string, entityId: string): Promise<SearchIndex | null> {
    switch (entityType) {
      case "page":
        return (await this.loadPages(entityId))[0] ?? null;
      case "post":
        return (await this.loadPosts(entityId))[0] ?? null;
      case "service":
        return (await this.loadServices(entityId))[0] ?? null;
      case "project":
        return (await this.loadProjects(entityId))[0] ?? null;
      case "case_study":
        return (await this.loadCaseStudies(entityId))[0] ?? null;
      case "faq":
        return (await this.loadFaqs(entityId))[0] ?? null;
      case "timeline_event":
        return (await this.loadTimelineEvents(entityId))[0] ?? null;
      case "venture":
        return (await this.loadVentures(entityId))[0] ?? null;
      case "product":
        return (await this.loadProducts(entityId))[0] ?? null;
      case "release":
        return (await this.loadReleases(entityId))[0] ?? null;
      default:
        console.warn(`[SearchIndexer] Unknown entity type: ${entityType}`);
        return null;
    }
  }

  private async loadPages(singleId?: string): Promise<SearchIndex[]> {
    try {
      const tbl = schema.pages;
      const rows = singleId
        ? await db.select().from(tbl).where(eq(tbl.id, singleId)).limit(1)
        : await db.select().from(tbl).where(eq(tbl.status, "published"));
      return rows.map((r) => ({
        entityType: "page",
        entityId: r.id,
        title: r.title ?? "",
        content: r.content ?? "",
        summary: "",
        url: `${BASE_URL}/${r.slug ?? r.id}`,
        thumbnail: r.ogImage ?? "",
        publishedAt: r.createdAt ?? null,
        contentType: "page",
        locale: r.locale ?? null,
      }));
    } catch {
      return [];
    }
  }

  private async loadPosts(singleId?: string): Promise<SearchIndex[]> {
    try {
      const tbl = schema.posts;
      const rows = singleId
        ? await db.select().from(tbl).where(eq(tbl.id, singleId)).limit(1)
        : await db.select().from(tbl).where(eq(tbl.status, "published"));
      return rows.map((r) => ({
        entityType: "post",
        entityId: r.id,
        title: r.title ?? "",
        content: r.content ?? "",
        summary: r.excerpt ?? "",
        url: `${BASE_URL}/blog/${r.slug ?? r.id}`,
        thumbnail: r.coverImage ?? "",
        publishedAt: r.publishAt ?? null,
        contentType: "post",
        locale: r.locale ?? null,
      }));
    } catch {
      return [];
    }
  }

  private async loadServices(singleId?: string): Promise<SearchIndex[]> {
    try {
      const tbl = schema.services;
      const rows = singleId
        ? await db.select().from(tbl).where(eq(tbl.id, singleId)).limit(1)
        : await db.select().from(tbl).where(eq(tbl.status, "published"));
      return rows.map((r) => ({
        entityType: "service",
        entityId: r.id,
        title: r.title ?? "",
        content: r.description ?? "",
        summary: r.summary ?? "",
        url: `${BASE_URL}/services/${r.slug ?? r.id}`,
        thumbnail: r.ogImage ?? "",
        publishedAt: r.createdAt ?? null,
        contentType: "service",
        locale: r.locale ?? null,
      }));
    } catch {
      return [];
    }
  }

  private async loadProjects(singleId?: string): Promise<SearchIndex[]> {
    try {
      const tbl = schema.projects;
      const rows = singleId
        ? await db.select().from(tbl).where(eq(tbl.id, singleId)).limit(1)
        : await db.select().from(tbl).where(eq(tbl.status, "published"));
      return rows.map((r) => ({
        entityType: "project",
        entityId: r.id,
        title: r.title ?? "",
        content: r.description ?? "",
        summary: r.summary ?? "",
        url: `${BASE_URL}/projects/${r.slug ?? r.id}`,
        thumbnail: r.thumbnail ?? "",
        publishedAt: r.createdAt ?? null,
        contentType: "project",
        locale: r.locale ?? null,
      }));
    } catch {
      return [];
    }
  }

  private async loadCaseStudies(singleId?: string): Promise<SearchIndex[]> {
    try {
      const tbl = schema.caseStudies;
      const rows = singleId
        ? await db.select().from(tbl).where(eq(tbl.id, singleId)).limit(1)
        : await db.select().from(tbl).where(eq(tbl.status, "published"));
      return rows.map((r) => {
        const parts = [r.challenge, r.research, r.strategy, r.results].filter(Boolean);
        return {
          entityType: "case_study",
          entityId: r.id,
          title: r.title ?? "",
          content: parts.join("\n\n"),
          summary: "",
          url: `${BASE_URL}/case-studies/${r.slug ?? r.id}`,
          thumbnail: r.ogImage ?? "",
          publishedAt: r.createdAt ?? null,
          contentType: "case_study",
          locale: null,
        };
      });
    } catch {
      return [];
    }
  }

  private async loadFaqs(singleId?: string): Promise<SearchIndex[]> {
    try {
      const tbl = schema.faqs;
      const rows = singleId
        ? await db.select().from(tbl).where(eq(tbl.id, singleId)).limit(1)
        : await db.select().from(tbl);
      return rows.map((r) => ({
        entityType: "faq",
        entityId: r.id,
        title: r.question ?? "",
        content: r.answer ?? "",
        summary: "",
        url: `${BASE_URL}/faq#${r.id}`,
        thumbnail: "",
        publishedAt: null,
        contentType: "faq",
        locale: null,
      }));
    } catch {
      return [];
    }
  }

  private async loadTimelineEvents(singleId?: string): Promise<SearchIndex[]> {
    try {
      const tbl = schema.timelineEvents;
      const rows = singleId
        ? await db.select().from(tbl).where(eq(tbl.id, singleId)).limit(1)
        : await db.select().from(tbl);
      return rows.map((r) => ({
        entityType: "timeline_event",
        entityId: r.id,
        title: r.title ?? "",
        content: r.description ?? "",
        summary: "",
        url: r.url ?? `${BASE_URL}/timeline#${r.id}`,
        thumbnail: r.icon ?? "",
        publishedAt: r.eventDate ? new Date(r.eventDate) : null,
        contentType: "timeline_event",
        locale: null,
      }));
    } catch {
      return [];
    }
  }

  private async loadVentures(singleId?: string): Promise<SearchIndex[]> {
    try {
      const tbl = schema.ventures;
      const rows = singleId
        ? await db.select().from(tbl).where(eq(tbl.id, singleId)).limit(1)
        : await db.select().from(tbl).where(eq(tbl.contentStatus, "published"));
      return rows.map((r) => ({
        entityType: "venture",
        entityId: r.id,
        title: r.name ?? "",
        content: r.description ?? "",
        summary: r.metaDescription ?? "",
        url: `${BASE_URL}/ventures/${r.slug ?? r.id}`,
        thumbnail: r.logo ?? "",
        publishedAt: r.createdAt ?? null,
        contentType: "venture",
        locale: null,
      }));
    } catch {
      return [];
    }
  }

  private async loadProducts(singleId?: string): Promise<SearchIndex[]> {
    try {
      const tbl = schema.products;
      const rows = singleId
        ? await db.select().from(tbl).where(eq(tbl.id, singleId)).limit(1)
        : await db.select().from(tbl).where(eq(tbl.contentStatus, "published"));
      return rows.map((r) => {
        let thumbnail = "";
        if (r.media && Array.isArray(r.media) && r.media.length > 0) {
          thumbnail = String(r.media[0]);
        }
        return {
          entityType: "product",
          entityId: r.id,
          title: r.name ?? "",
          content: r.description ?? "",
          summary: "",
          url: `${BASE_URL}/shop/${r.slug ?? r.id}`,
          thumbnail,
          publishedAt: r.launchDate ? new Date(r.launchDate) : null,
          contentType: "product",
          locale: null,
        };
      });
    } catch {
      return [];
    }
  }

  private async loadReleases(singleId?: string): Promise<SearchIndex[]> {
    try {
      const tbl = schema.releases;
      const rows = singleId
        ? await db.select().from(tbl).where(eq(tbl.id, singleId)).limit(1)
        : await db.select().from(tbl).where(eq(tbl.status, "published"));
      return rows.map((r) => ({
        entityType: "release",
        entityId: r.id,
        title: r.title ?? "",
        content: r.description ?? "",
        summary: "",
        url: `${BASE_URL}/releases/${r.slug ?? r.id}`,
        thumbnail: r.coverImage ?? "",
        publishedAt: r.releaseDate ? new Date(r.releaseDate) : null,
        contentType: "release",
        locale: null,
      }));
    } catch {
      return [];
    }
  }
}
