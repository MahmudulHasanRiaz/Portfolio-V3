import { z } from "zod";

// Media system fields (0010): thumbnailType / thumbnailUrl / thumbnailVideoUrl /
// thumbnailAutoplay / videos / galleryImages on projects, case studies and posts,
// plus isPreview on projects, case studies, posts and testimonials. The admin
// forms send these through ContentService; Zod strips unknown keys, so they must
// be declared here or saves would silently drop them.
//
// Bangla fields (0018) follow the same rule: titleBn / excerptBn / contentBn
// (posts), titleBn / summaryBn / descriptionBn (projects, services),
// titleBn / challengeBn / researchBn / strategyBn / resultsBn (case studies).
// All optional — empty Bangla falls back to English on the public site.

import { uuidSchema, timestampSchema, slugSchema, entityStatusSchema } from "./common";

// ─── Pages ───────────────────────────────────────────────────────────────────

export const pageSchema = z.object({
  id: uuidSchema,
  title: z.string().nullable().optional(),
  slug: slugSchema.optional(),
  content: z.string().nullable().optional(),
  template: z.string().max(100).nullable().optional(),
  status: entityStatusSchema.optional(),
  locale: z.string().max(10).nullable().optional(),
  translationGroup: uuidSchema.optional(),
  metaTitle: z.string().nullable().optional(),
  metaDescription: z.string().nullable().optional(),
  ogImage: z.string().nullable().optional(),
  createdBy: uuidSchema.optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const createPageSchema = z.object({
  title: z.string().nullable().optional(),
  slug: slugSchema.optional(),
  content: z.string().nullable().optional(),
  template: z.string().max(100).nullable().optional(),
  status: entityStatusSchema.optional(),
  locale: z.string().max(10).nullable().optional(),
  translationGroup: uuidSchema.optional(),
  metaTitle: z.string().nullable().optional(),
  metaDescription: z.string().nullable().optional(),
  ogImage: z.string().nullable().optional(),
  createdBy: uuidSchema.optional(),
});

export const updatePageSchema = pageSchema.partial();

// ─── Homepage Sections ───────────────────────────────────────────────────────

export const homepageSectionSchema = z.object({
  id: uuidSchema,
  sectionKey: z.string().max(100),
  isVisible: z.boolean().default(true),
  sortOrder: z.coerce.number().int().optional(),
  content: z.record(z.string(), z.unknown()).optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const createHomepageSectionSchema = z.object({
  sectionKey: z.string().max(100),
  sortOrder: z.coerce.number().int().optional(),
  content: z.record(z.string(), z.unknown()).optional(),
});

export const updateHomepageSectionSchema = homepageSectionSchema.partial();

// ─── Services ────────────────────────────────────────────────────────────────

export const serviceSchema = z.object({
  id: uuidSchema,
  title: z.string().nullable().optional(),
  titleBn: z.string().nullable().optional(),
  slug: slugSchema.optional(),
  summary: z.string().nullable().optional(),
  summaryBn: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  descriptionBn: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  priceRange: z.string().nullable().optional(),
  thumbnailType: z.enum(["image", "video"]).optional(),
  thumbnailUrl: z.string().nullable().optional(),
  thumbnailVideoUrl: z.string().nullable().optional(),
  thumbnailAutoplay: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  status: entityStatusSchema.optional(),
  sortOrder: z.coerce.number().int().optional(),
  locale: z.string().max(10).nullable().optional(),
  translationGroup: uuidSchema.optional(),
  metaTitle: z.string().nullable().optional(),
  metaDescription: z.string().nullable().optional(),
  ogImage: z.string().nullable().optional(),
  canonicalUrl: z.string().nullable().optional(),
  keywords: z.string().nullable().optional(),
  indexable: z.boolean().optional(),
  followLinks: z.boolean().optional(),
  archiveAllowed: z.boolean().optional(),
  canonicalOverride: z.string().nullable().optional(),
  createdBy: uuidSchema.optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const createServiceSchema = z.object({
  title: z.string().nullable().optional(),
  titleBn: z.string().nullable().optional(),
  slug: slugSchema.optional(),
  summary: z.string().nullable().optional(),
  summaryBn: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  descriptionBn: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  priceRange: z.string().nullable().optional(),
  thumbnailType: z.enum(["image", "video"]).optional(),
  thumbnailUrl: z.string().nullable().optional(),
  thumbnailVideoUrl: z.string().nullable().optional(),
  thumbnailAutoplay: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  status: entityStatusSchema.optional(),
  sortOrder: z.coerce.number().int().optional(),
  locale: z.string().max(10).nullable().optional(),
  translationGroup: uuidSchema.optional(),
  metaTitle: z.string().nullable().optional(),
  metaDescription: z.string().nullable().optional(),
  ogImage: z.string().nullable().optional(),
  canonicalUrl: z.string().nullable().optional(),
  keywords: z.string().nullable().optional(),
  indexable: z.boolean().optional(),
  followLinks: z.boolean().optional(),
  archiveAllowed: z.boolean().optional(),
  canonicalOverride: z.string().nullable().optional(),
  createdBy: uuidSchema.optional(),
});

export const updateServiceSchema = serviceSchema.partial();

// ─── Service FAQs ────────────────────────────────────────────────────────────

export const serviceFaqSchema = z.object({
  id: uuidSchema,
  serviceId: uuidSchema,
  question: z.string().nullable().optional(),
  answer: z.string().nullable().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

export const createServiceFaqSchema = z.object({
  serviceId: uuidSchema,
  question: z.string().nullable().optional(),
  answer: z.string().nullable().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

export const updateServiceFaqSchema = serviceFaqSchema.partial();

// ─── Projects ────────────────────────────────────────────────────────────────

export const projectSchema = z.object({
  id: uuidSchema,
  title: z.string().nullable().optional(),
  titleBn: z.string().nullable().optional(),
  slug: slugSchema.optional(),
  summary: z.string().nullable().optional(),
  summaryBn: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  descriptionBn: z.string().nullable().optional(),
  thumbnail: z.string().nullable().optional(),
  coverImage: z.string().nullable().optional(),
  thumbnailType: z.enum(["image", "video"]).optional(),
  thumbnailUrl: z.string().nullable().optional(),
  thumbnailVideoUrl: z.string().nullable().optional(),
  thumbnailAutoplay: z.boolean().optional(),
  videos: z.array(z.string()).optional(),
  galleryImages: z.array(z.string()).optional(),
  isPreview: z.boolean().optional(),
  industry: z.string().max(100).nullable().optional(),
  clientName: z.string().nullable().optional(),
  projectUrl: z.string().nullable().optional(),
  // Nullable so the admin form can clear a date (empty input sends
  // null); an empty string would be a Postgres date error. The public
  // API derives the project `year` from startDate.
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  status: entityStatusSchema.optional(),
  isFeatured: z.boolean().optional(),
  locale: z.string().max(10).nullable().optional(),
  translationGroup: uuidSchema.optional(),
  metaTitle: z.string().nullable().optional(),
  metaDescription: z.string().nullable().optional(),
  ogImage: z.string().nullable().optional(),
  canonicalUrl: z.string().nullable().optional(),
  keywords: z.string().nullable().optional(),
  indexable: z.boolean().optional(),
  followLinks: z.boolean().optional(),
  archiveAllowed: z.boolean().optional(),
  canonicalOverride: z.string().nullable().optional(),
  createdBy: uuidSchema.optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const createProjectSchema = z.object({
  title: z.string().nullable().optional(),
  titleBn: z.string().nullable().optional(),
  slug: slugSchema.optional(),
  summary: z.string().nullable().optional(),
  summaryBn: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  descriptionBn: z.string().nullable().optional(),
  thumbnail: z.string().nullable().optional(),
  coverImage: z.string().nullable().optional(),
  thumbnailType: z.enum(["image", "video"]).optional(),
  thumbnailUrl: z.string().nullable().optional(),
  thumbnailVideoUrl: z.string().nullable().optional(),
  thumbnailAutoplay: z.boolean().optional(),
  videos: z.array(z.string()).optional(),
  galleryImages: z.array(z.string()).optional(),
  isPreview: z.boolean().optional(),
  industry: z.string().max(100).nullable().optional(),
  clientName: z.string().nullable().optional(),
  projectUrl: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  status: entityStatusSchema.optional(),
  isFeatured: z.boolean().optional(),
  locale: z.string().max(10).nullable().optional(),
  translationGroup: uuidSchema.optional(),
  metaTitle: z.string().nullable().optional(),
  metaDescription: z.string().nullable().optional(),
  ogImage: z.string().nullable().optional(),
  canonicalUrl: z.string().nullable().optional(),
  keywords: z.string().nullable().optional(),
  indexable: z.boolean().optional(),
  followLinks: z.boolean().optional(),
  archiveAllowed: z.boolean().optional(),
  canonicalOverride: z.string().nullable().optional(),
  createdBy: uuidSchema.optional(),
});

export const updateProjectSchema = projectSchema.partial();

// ─── Technologies ────────────────────────────────────────────────────────────

export const technologySchema = z.object({
  id: uuidSchema,
  name: z.string().max(100),
  // Nullable: the admin sends null (not undefined) for every empty
  // optional field (its asText/asSortOrder) — same 400 as clients
  // (2026-11-14) if the schema rejects null.
  nameBn: z.string().nullable().optional(),
  category: z.string().max(50).nullable().optional(),
  use: z.string().nullable().optional(),
  useBn: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  sortOrder: z.coerce.number().int().nullable().optional(),
});

export const createTechnologySchema = z.object({
  name: z.string().max(100),
  nameBn: z.string().nullable().optional(),
  category: z.string().max(50).nullable().optional(),
  use: z.string().nullable().optional(),
  useBn: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  sortOrder: z.coerce.number().int().nullable().optional(),
});

export const updateTechnologySchema = technologySchema.partial();

// ─── Project Technologies (junction) ─────────────────────────────────────────

export const projectTechnologySchema = z.object({
  projectId: uuidSchema,
  technologyId: uuidSchema,
});

export const createProjectTechnologySchema = projectTechnologySchema;
export const updateProjectTechnologySchema = projectTechnologySchema.partial();

// ─── Case Studies ────────────────────────────────────────────────────────────

export const caseStudySchema = z.object({
  id: uuidSchema,
  projectId: uuidSchema.optional(),
  title: z.string().nullable().optional(),
  titleBn: z.string().nullable().optional(),
  slug: slugSchema.optional(),
  challenge: z.string().nullable().optional(),
  challengeBn: z.string().nullable().optional(),
  research: z.string().nullable().optional(),
  researchBn: z.string().nullable().optional(),
  strategy: z.string().nullable().optional(),
  strategyBn: z.string().nullable().optional(),
  results: z.string().nullable().optional(),
  resultsBn: z.string().nullable().optional(),
  metrics: z.record(z.string(), z.unknown()).optional(),
  thumbnailType: z.enum(["image", "video"]).optional(),
  thumbnailUrl: z.string().nullable().optional(),
  thumbnailVideoUrl: z.string().nullable().optional(),
  thumbnailAutoplay: z.boolean().optional(),
  videos: z.array(z.string()).optional(),
  galleryImages: z.array(z.string()).optional(),
  isPreview: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  status: entityStatusSchema.optional(),
  metaTitle: z.string().nullable().optional(),
  metaDescription: z.string().nullable().optional(),
  ogImage: z.string().nullable().optional(),
  canonicalUrl: z.string().nullable().optional(),
  keywords: z.string().nullable().optional(),
  createdBy: uuidSchema.optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const createCaseStudySchema = z.object({
  projectId: uuidSchema.optional(),
  title: z.string().nullable().optional(),
  titleBn: z.string().nullable().optional(),
  slug: slugSchema.optional(),
  challenge: z.string().nullable().optional(),
  challengeBn: z.string().nullable().optional(),
  research: z.string().nullable().optional(),
  researchBn: z.string().nullable().optional(),
  strategy: z.string().nullable().optional(),
  strategyBn: z.string().nullable().optional(),
  results: z.string().nullable().optional(),
  resultsBn: z.string().nullable().optional(),
  metrics: z.record(z.string(), z.unknown()).optional(),
  thumbnailType: z.enum(["image", "video"]).optional(),
  thumbnailUrl: z.string().nullable().optional(),
  thumbnailVideoUrl: z.string().nullable().optional(),
  thumbnailAutoplay: z.boolean().optional(),
  videos: z.array(z.string()).optional(),
  galleryImages: z.array(z.string()).optional(),
  isPreview: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  status: entityStatusSchema.optional(),
  metaTitle: z.string().nullable().optional(),
  metaDescription: z.string().nullable().optional(),
  ogImage: z.string().nullable().optional(),
  canonicalUrl: z.string().nullable().optional(),
  keywords: z.string().nullable().optional(),
  createdBy: uuidSchema.optional(),
});

export const updateCaseStudySchema = caseStudySchema.partial();

// ─── Posts ───────────────────────────────────────────────────────────────────

export const postSchema = z.object({
  id: uuidSchema,
  title: z.string().nullable().optional(),
  titleBn: z.string().nullable().optional(),
  slug: slugSchema.optional(),
  excerpt: z.string().nullable().optional(),
  excerptBn: z.string().nullable().optional(),
  content: z.string().nullable().optional(),
  contentBn: z.string().nullable().optional(),
  coverImage: z.string().nullable().optional(),
  thumbnailType: z.enum(["image", "video"]).optional(),
  thumbnailUrl: z.string().nullable().optional(),
  thumbnailVideoUrl: z.string().nullable().optional(),
  thumbnailAutoplay: z.boolean().optional(),
  videos: z.array(z.string()).optional(),
  galleryImages: z.array(z.string()).optional(),
  isPreview: z.boolean().optional(),
  authorId: uuidSchema.optional(),
  isFeatured: z.boolean().optional(),
  status: z.enum(["draft", "review", "scheduled", "published", "archived"]).optional(),
  publishAt: timestampSchema.optional(),
  unpublishAt: timestampSchema.optional(),
  locale: z.string().max(10).nullable().optional(),
  translationGroup: uuidSchema.optional(),
  metaTitle: z.string().nullable().optional(),
  metaDescription: z.string().nullable().optional(),
  ogImage: z.string().nullable().optional(),
  canonicalUrl: z.string().nullable().optional(),
  keywords: z.string().nullable().optional(),
  indexable: z.boolean().optional(),
  followLinks: z.boolean().optional(),
  archiveAllowed: z.boolean().optional(),
  canonicalOverride: z.string().nullable().optional(),
  createdBy: uuidSchema.optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const createPostSchema = z.object({
  title: z.string().nullable().optional(),
  titleBn: z.string().nullable().optional(),
  slug: slugSchema.optional(),
  excerpt: z.string().nullable().optional(),
  excerptBn: z.string().nullable().optional(),
  content: z.string().nullable().optional(),
  contentBn: z.string().nullable().optional(),
  coverImage: z.string().nullable().optional(),
  thumbnailType: z.enum(["image", "video"]).optional(),
  thumbnailUrl: z.string().nullable().optional(),
  thumbnailVideoUrl: z.string().nullable().optional(),
  thumbnailAutoplay: z.boolean().optional(),
  videos: z.array(z.string()).optional(),
  galleryImages: z.array(z.string()).optional(),
  isPreview: z.boolean().optional(),
  authorId: uuidSchema.optional(),
  isFeatured: z.boolean().optional(),
  status: z.enum(["draft", "review", "scheduled", "published", "archived"]).optional(),
  publishAt: timestampSchema.optional(),
  unpublishAt: timestampSchema.optional(),
  locale: z.string().max(10).nullable().optional(),
  translationGroup: uuidSchema.optional(),
  metaTitle: z.string().nullable().optional(),
  metaDescription: z.string().nullable().optional(),
  ogImage: z.string().nullable().optional(),
  canonicalUrl: z.string().nullable().optional(),
  keywords: z.string().nullable().optional(),
  indexable: z.boolean().optional(),
  followLinks: z.boolean().optional(),
  archiveAllowed: z.boolean().optional(),
  canonicalOverride: z.string().nullable().optional(),
  createdBy: uuidSchema.optional(),
});

export const updatePostSchema = postSchema.partial();

// ─── Categories ──────────────────────────────────────────────────────────────

export const categorySchema = z.object({
  id: uuidSchema,
  name: z.string().max(100),
  slug: slugSchema.optional(),
  description: z.string().nullable().optional(),
  type: z.string().max(50).nullable().optional(),
});

export const createCategorySchema = z.object({
  name: z.string().max(100),
  slug: slugSchema.optional(),
  description: z.string().nullable().optional(),
  type: z.string().max(50).nullable().optional(),
});

export const updateCategorySchema = categorySchema.partial();

// ─── Tags ────────────────────────────────────────────────────────────────────

export const tagSchema = z.object({
  id: uuidSchema,
  name: z.string().max(100),
  slug: slugSchema.optional(),
});

export const createTagSchema = z.object({
  name: z.string().max(100),
  slug: slugSchema.optional(),
});

export const updateTagSchema = tagSchema.partial();

// ─── Post Categories (junction) ──────────────────────────────────────────────

export const postCategorySchema = z.object({
  postId: uuidSchema,
  categoryId: uuidSchema,
});

export const createPostCategorySchema = postCategorySchema;
export const updatePostCategorySchema = postCategorySchema.partial();

// ─── Post Tags (junction) ────────────────────────────────────────────────────

export const postTagSchema = z.object({
  postId: uuidSchema,
  tagId: uuidSchema,
});

export const createPostTagSchema = postTagSchema;
export const updatePostTagSchema = postTagSchema.partial();

// ─── Resources ───────────────────────────────────────────────────────────────

export const resourceSchema = z.object({
  id: uuidSchema,
  title: z.string().nullable().optional(),
  slug: slugSchema.optional(),
  type: z.enum(["guide", "checklist", "template", "download"]).optional(),
  description: z.string().nullable().optional(),
  content: z.string().nullable().optional(),
  fileUrl: z.string().nullable().optional(),
  isFeatured: z.boolean().optional(),
  status: entityStatusSchema.optional(),
  metaTitle: z.string().nullable().optional(),
  metaDescription: z.string().nullable().optional(),
  ogImage: z.string().nullable().optional(),
  canonicalUrl: z.string().nullable().optional(),
  keywords: z.string().nullable().optional(),
  createdBy: uuidSchema.optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const createResourceSchema = z.object({
  title: z.string().nullable().optional(),
  slug: slugSchema.optional(),
  type: z.enum(["guide", "checklist", "template", "download"]).optional(),
  description: z.string().nullable().optional(),
  content: z.string().nullable().optional(),
  fileUrl: z.string().nullable().optional(),
  isFeatured: z.boolean().optional(),
  status: entityStatusSchema.optional(),
  metaTitle: z.string().nullable().optional(),
  metaDescription: z.string().nullable().optional(),
  ogImage: z.string().nullable().optional(),
  canonicalUrl: z.string().nullable().optional(),
  keywords: z.string().nullable().optional(),
  createdBy: uuidSchema.optional(),
});

export const updateResourceSchema = resourceSchema.partial();

// ─── Media Mentions ──────────────────────────────────────────────────────────

export const mediaMentionSchema = z.object({
  id: uuidSchema,
  title: z.string().nullable().optional(),
  slug: slugSchema.optional(),
  sourceName: z.string().nullable().optional(),
  sourceUrl: z.string().nullable().optional(),
  publishedDate: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  isFeatured: z.boolean().optional(),
  status: entityStatusSchema.optional(),
  metaTitle: z.string().nullable().optional(),
  metaDescription: z.string().nullable().optional(),
  ogImage: z.string().nullable().optional(),
  canonicalUrl: z.string().nullable().optional(),
  keywords: z.string().nullable().optional(),
  createdBy: uuidSchema.optional(),
  createdAt: timestampSchema,
});

export const createMediaMentionSchema = z.object({
  title: z.string().nullable().optional(),
  slug: slugSchema.optional(),
  sourceName: z.string().nullable().optional(),
  sourceUrl: z.string().nullable().optional(),
  publishedDate: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  isFeatured: z.boolean().optional(),
  status: entityStatusSchema.optional(),
  metaTitle: z.string().nullable().optional(),
  metaDescription: z.string().nullable().optional(),
  ogImage: z.string().nullable().optional(),
  canonicalUrl: z.string().nullable().optional(),
  keywords: z.string().nullable().optional(),
  createdBy: uuidSchema.optional(),
});

export const updateMediaMentionSchema = mediaMentionSchema.partial();

// ─── FAQs ────────────────────────────────────────────────────────────────────

export const faqSchema = z.object({
  id: uuidSchema,
  question: z.string().nullable().optional(),
  answer: z.string().nullable().optional(),
  sortOrder: z.coerce.number().int().optional(),
  entityType: z.string().max(50).nullable().optional(),
  entityId: uuidSchema.optional(),
});

export const createFaqSchema = z.object({
  question: z.string().nullable().optional(),
  answer: z.string().nullable().optional(),
  sortOrder: z.coerce.number().int().optional(),
  entityType: z.string().max(50).nullable().optional(),
  entityId: uuidSchema.optional(),
});

export const updateFaqSchema = faqSchema.partial();

// ─── Testimonials ────────────────────────────────────────────────────────────

export const testimonialSchema = z.object({
  id: uuidSchema,
  authorName: z.string().nullable().optional(),
  authorTitle: z.string().nullable().optional(),
  authorAvatar: z.string().nullable().optional(),
  content: z.string().nullable().optional(),
  sourceType: z.enum(["freelance_client", "event_organizer", "collaborator", "general"]).optional(),
  projectId: uuidSchema.optional(),
  eventId: uuidSchema.optional(),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  isFeatured: z.boolean().optional(),
  isPreview: z.boolean().optional(),
  status: z.enum(["pending_review", "approved", "rejected"]).optional(),
  displayOrder: z.coerce.number().int().optional(),
  createdAt: timestampSchema,
});

export const createTestimonialSchema = z.object({
  authorName: z.string().nullable().optional(),
  authorTitle: z.string().nullable().optional(),
  authorAvatar: z.string().nullable().optional(),
  content: z.string().nullable().optional(),
  sourceType: z.enum(["freelance_client", "event_organizer", "collaborator", "general"]).optional(),
  projectId: uuidSchema.optional(),
  eventId: uuidSchema.optional(),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  isFeatured: z.boolean().optional(),
  isPreview: z.boolean().optional(),
  status: z.enum(["pending_review", "approved", "rejected"]).optional(),
  displayOrder: z.coerce.number().int().optional(),
});

export const updateTestimonialSchema = testimonialSchema.partial();
