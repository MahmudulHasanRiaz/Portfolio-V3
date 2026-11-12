import { relations } from "drizzle-orm";
import * as schema from "../schema";

export const servicesRelations = relations(schema.services, ({ many }) => ({
  serviceFaqs: many(schema.serviceFaqs),
}));

export const serviceFaqsRelations = relations(schema.serviceFaqs, ({ one }) => ({
  service: one(schema.services, {
    fields: [schema.serviceFaqs.serviceId],
    references: [schema.services.id],
  }),
}));

export const projectsRelations = relations(schema.projects, ({ many }) => ({
  projectTechnologies: many(schema.projectTechnologies),
  caseStudies: many(schema.caseStudies),
}));

export const projectTechnologiesRelations = relations(schema.projectTechnologies, ({ one }) => ({
  project: one(schema.projects, {
    fields: [schema.projectTechnologies.projectId],
    references: [schema.projects.id],
  }),
  technology: one(schema.technologies, {
    fields: [schema.projectTechnologies.technologyId],
    references: [schema.technologies.id],
  }),
}));

export const technologiesRelations = relations(schema.technologies, ({ many }) => ({
  projectTechnologies: many(schema.projectTechnologies),
}));

export const caseStudiesRelations = relations(schema.caseStudies, ({ one }) => ({
  project: one(schema.projects, {
    fields: [schema.caseStudies.projectId],
    references: [schema.projects.id],
  }),
}));

export const postsRelations = relations(schema.posts, ({ many }) => ({
  postCategories: many(schema.postCategories),
  postTags: many(schema.postTags),
}));

export const postCategoriesRelations = relations(schema.postCategories, ({ one }) => ({
  post: one(schema.posts, {
    fields: [schema.postCategories.postId],
    references: [schema.posts.id],
  }),
  category: one(schema.categories, {
    fields: [schema.postCategories.categoryId],
    references: [schema.categories.id],
  }),
}));

export const categoriesRelations = relations(schema.categories, ({ many }) => ({
  postCategories: many(schema.postCategories),
}));

export const postTagsRelations = relations(schema.postTags, ({ one }) => ({
  post: one(schema.posts, {
    fields: [schema.postTags.postId],
    references: [schema.posts.id],
  }),
  tag: one(schema.tags, {
    fields: [schema.postTags.tagId],
    references: [schema.tags.id],
  }),
}));

export const tagsRelations = relations(schema.tags, ({ many }) => ({
  postTags: many(schema.postTags),
}));

export const venturesRelations = relations(schema.ventures, ({ many }) => ({
  products: many(schema.products),
  ventureProducts: many(schema.ventureProducts),
}));

export const productsRelations = relations(schema.products, ({ one, many }) => ({
  venture: one(schema.ventures, {
    fields: [schema.products.ventureId],
    references: [schema.ventures.id],
  }),
  ventureProducts: many(schema.ventureProducts),
}));

export const ventureProductsRelations = relations(schema.ventureProducts, ({ one }) => ({
  venture: one(schema.ventures, {
    fields: [schema.ventureProducts.ventureId],
    references: [schema.ventures.id],
  }),
  product: one(schema.products, {
    fields: [schema.ventureProducts.productId],
    references: [schema.products.id],
  }),
}));

export const releasesRelations = relations(schema.releases, ({ many, one }) => ({
  releasePlatforms: many(schema.releasePlatforms),
  releaseLyrics: one(schema.releaseLyrics),
}));

export const releasePlatformsRelations = relations(schema.releasePlatforms, ({ one }) => ({
  release: one(schema.releases, {
    fields: [schema.releasePlatforms.releaseId],
    references: [schema.releases.id],
  }),
}));

export const releaseLyricsRelations = relations(schema.releaseLyrics, ({ one }) => ({
  release: one(schema.releases, {
    fields: [schema.releaseLyrics.releaseId],
    references: [schema.releases.id],
  }),
}));

export const mediaFoldersRelations = relations(schema.mediaFolders, ({ one, many }) => ({
  parentFolder: one(schema.mediaFolders, {
    fields: [schema.mediaFolders.parentId],
    references: [schema.mediaFolders.id],
  }),
  childFolders: many(schema.mediaFolders),
  assets: many(schema.mediaAssets),
}));

export const mediaAssetsRelations = relations(schema.mediaAssets, ({ one }) => ({
  folder: one(schema.mediaFolders, {
    fields: [schema.mediaAssets.folderId],
    references: [schema.mediaFolders.id],
  }),
}));
