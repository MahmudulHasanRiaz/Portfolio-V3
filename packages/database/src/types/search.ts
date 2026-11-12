export interface SearchIndex {
  entityType: string;
  entityId: string;
  title: string;
  content: string;
  summary: string;
  url: string;
  thumbnail: string;
  publishedAt: Date | null;
  contentType: string | null;
  locale: string | null;
}

export interface SearchResult extends SearchIndex {
  id: string;
  rank: number;
  headline: string;
}
