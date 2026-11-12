import { z } from "zod";
import {
  pages, posts, services, projects, caseStudies,
  postCategories, postTags,
} from "@repo/database";
import {
  createPageSchema, updatePageSchema,
  createPostSchema, updatePostSchema,
  createServiceSchema, updateServiceSchema,
  createProjectSchema, updateProjectSchema,
  createCaseStudySchema, updateCaseStudySchema,
} from "@repo/validation";

export type ContentTypeName = "pages" | "posts" | "services" | "projects" | "case_studies";

export interface WorkflowDefinition {
  states: readonly string[];
  transitions: Record<string, readonly string[]>;
}

export interface CategoryConfig {
  junctionTable: any;
  entityIdField: string;
  categoryIdField: string;
}

export interface TagConfig {
  junctionTable: any;
  entityIdField: string;
  tagIdField: string;
}

export interface ContentTypeDefinition {
  name: ContentTypeName;
  label: string;
  labelPlural: string;
  table: any;
  searchFields: string[];
  slugField: string;
  statusField: string;
  authorField: string | null;
  workflow: WorkflowDefinition;
  createSchema: z.ZodSchema;
  updateSchema: z.ZodSchema;
  categories?: CategoryConfig;
  tags?: TagConfig;
  hasPublishingSchedule: boolean;
}

export const BASE_WORKFLOW: WorkflowDefinition = {
  states: ["draft", "published", "archived"] as const,
  transitions: {
    draft: ["published"],
    published: ["archived", "draft"],
    archived: ["draft"],
  },
};

export const POST_WORKFLOW: WorkflowDefinition = {
  states: ["draft", "review", "scheduled", "published", "archived"] as const,
  transitions: {
    draft: ["review"],
    review: ["draft", "scheduled", "published"],
    scheduled: ["published", "draft"],
    published: ["archived", "draft"],
    archived: ["draft"],
  },
};

export const contentTypes: Record<ContentTypeName, ContentTypeDefinition> = {
  pages: {
    name: "pages",
    label: "Page",
    labelPlural: "Pages",
    table: pages,
    searchFields: ["title", "content"],
    slugField: "slug",
    statusField: "status",
    authorField: "createdBy",
    workflow: BASE_WORKFLOW,
    createSchema: createPageSchema,
    updateSchema: updatePageSchema,
    hasPublishingSchedule: false,
  },
  posts: {
    name: "posts",
    label: "Post",
    labelPlural: "Posts",
    table: posts,
    searchFields: ["title", "excerpt", "content"],
    slugField: "slug",
    statusField: "status",
    authorField: "createdBy",
    workflow: POST_WORKFLOW,
    createSchema: createPostSchema,
    updateSchema: updatePostSchema,
    categories: {
      junctionTable: postCategories,
      entityIdField: "postId",
      categoryIdField: "categoryId",
    },
    tags: {
      junctionTable: postTags,
      entityIdField: "postId",
      tagIdField: "tagId",
    },
    hasPublishingSchedule: true,
  },
  services: {
    name: "services",
    label: "Service",
    labelPlural: "Services",
    table: services,
    searchFields: ["title", "summary", "description"],
    slugField: "slug",
    statusField: "status",
    authorField: "createdBy",
    workflow: BASE_WORKFLOW,
    createSchema: createServiceSchema,
    updateSchema: updateServiceSchema,
    hasPublishingSchedule: false,
  },
  projects: {
    name: "projects",
    label: "Project",
    labelPlural: "Projects",
    table: projects,
    searchFields: ["title", "summary", "description", "clientName"],
    slugField: "slug",
    statusField: "status",
    authorField: "createdBy",
    workflow: BASE_WORKFLOW,
    createSchema: createProjectSchema,
    updateSchema: updateProjectSchema,
    hasPublishingSchedule: false,
  },
  case_studies: {
    name: "case_studies",
    label: "Case Study",
    labelPlural: "Case Studies",
    table: caseStudies,
    searchFields: ["title", "challenge", "strategy", "results"],
    slugField: "slug",
    statusField: "status",
    authorField: "createdBy",
    workflow: BASE_WORKFLOW,
    createSchema: createCaseStudySchema,
    updateSchema: updateCaseStudySchema,
    hasPublishingSchedule: false,
  },
};

export function getContentType(name: ContentTypeName): ContentTypeDefinition {
  const def = contentTypes[name];
  if (!def) throw new Error(`Unknown content type: ${name}`);
  return def;
}

export const contentTypeNames: ContentTypeName[] = ["pages", "posts", "services", "projects", "case_studies"];

export function getContentTypeByTable(tableName: string): ContentTypeDefinition | undefined {
  return Object.values(contentTypes).find((ct) => ct.table._.name === tableName);
}
