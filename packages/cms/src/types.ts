export type ContentTypeName = "pages" | "posts" | "services" | "projects" | "case_studies";

export interface CategoryData {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  type: string | null;
}

export interface TagData {
  id: string;
  name: string;
  slug: string | null;
}

export interface FAQData {
  id: string;
  question: string | null;
  answer: string | null;
  sortOrder: number | null;
  entityType: string | null;
  entityId: string | null;
}

export interface TimelineEventData {
  id: string;
  sourceType: string | null;
  sourceId: string | null;
  eventType: string | null;
  title: string | null;
  description: string | null;
  eventDate: string | null;
  icon: string | null;
  url: string | null;
  sortOrder: number | null;
  createdAt: string;
}
