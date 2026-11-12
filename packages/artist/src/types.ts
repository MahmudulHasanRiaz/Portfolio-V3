export interface ReleaseRow {
  id: string;
  title: string | null;
  slug: string;
  type: string | null;
  releaseFormat: string | null;
  coverImage: string | null;
  description: string | null;
  releaseDate: string | null;
  isFeatured: boolean | null;
  status: string;
  metaTitle: string | null;
  metaDescription: string | null;
  ogImage: string | null;
  canonicalUrl: string | null;
  keywords: string | null;
  lyrics: string | null;
  credits: Record<string, unknown> | null;
  createdBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ReleasePlatformRow {
  id: string;
  releaseId: string | null;
  platformName: string | null;
  platformUrl: string | null;
}

export interface ReleaseLyricsRow {
  id: string;
  releaseId: string | null;
  lyricsText: string | null;
  lyricsLanguage: string | null;
  translations: Record<string, unknown> | null;
  status: string | null;
}

export interface VideoRow {
  id: string;
  releaseId: string | null;
  platformName: string | null;
  videoUrl: string | null;
  title: string | null;
  sortOrder: number | null;
  createdAt: string | null;
}

export interface ReleaseFilters {
  search?: string;
  status?: string;
  type?: string;
  format?: string;
  page?: number;
  pageSize?: number;
}

export interface ReleaseListResponse {
  releases: ReleaseRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
