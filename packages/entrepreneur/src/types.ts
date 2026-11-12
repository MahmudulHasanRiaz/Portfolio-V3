export interface VentureRow {
  id: string;
  name: string | null;
  slug: string;
  description: string | null;
  logo: string | null;
  coverImage: string | null;
  website: string | null;
  foundedDate: string | null;
  foundedYear: number | null;
  status: string;
  contentStatus: string;
  isFeatured: boolean | null;
  socialLinks: Record<string, string> | null;
  metrics: Record<string, unknown> | null;
  teamSize: number | null;
  industry: string | null;
  stage: string | null;
  location: string | null;
  // Media system (0010/0017): same shape as projects.
  thumbnailType: string | null;
  thumbnailUrl: string | null;
  thumbnailVideoUrl: string | null;
  thumbnailAutoplay: boolean | null;
  videos: string[] | null;
  galleryImages: string[] | null;
  metaTitle: string | null;
  metaDescription: string | null;
  ogImage: string | null;
  canonicalUrl: string | null;
  keywords: string | null;
  createdBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ProductRow {
  id: string;
  ventureId: string | null;
  name: string | null;
  slug: string;
  description: string | null;
  launchDate: string | null;
  url: string | null;
  status: string;
  contentStatus: string;
  isFeatured: boolean | null;
  media: Record<string, unknown> | null;
  highlights: unknown[] | null;
  createdBy: string | null;
  createdAt: string | null;
}

export interface CategoryRow {
  id: string;
  name: string | null;
  slug: string;
  description: string | null;
  createdAt: string | null;
}

export interface VentureFilters {
  search?: string;
  status?: string;
  contentStatus?: string;
  categoryId?: string;
  industry?: string;
  page?: number;
  pageSize?: number;
}

export interface VentureListResponse {
  ventures: VentureRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
