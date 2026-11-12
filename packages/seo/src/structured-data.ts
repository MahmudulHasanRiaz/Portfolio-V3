export interface PersonSchemaData {
  name: string;
  givenName?: string;
  familyName?: string;
  jobTitle?: string;
  description?: string;
  image?: string;
  url?: string;
  sameAs?: string[];
  email?: string;
  telephone?: string;
  address?: string;
  birthDate?: string;
  knowsAbout?: string[];
  worksFor?: { name: string; url?: string };
}

export interface ArticleSchemaData {
  headline: string;
  description?: string;
  image?: string;
  datePublished: string;
  dateModified?: string;
  author: { name: string; url?: string };
  publisher: { name: string; logo?: string };
  url: string;
  isAccessibleForFree?: boolean;
}

export interface FAQSchemaData {
  questions: { question: string; answer: string }[];
}

export interface ServiceSchemaData {
  name: string;
  description?: string;
  provider: { name: string; url?: string };
  areaServed?: string[];
  serviceType?: string;
  offers?: { price: number; priceCurrency: string; description?: string }[];
}

export interface OrganizationSchemaData {
  name: string;
  description?: string;
  url?: string;
  logo?: string;
  sameAs?: string[];
  address?: string;
  contactPoint?: { telephone: string; contactType: string };
  founder?: { name: string; url?: string };
}

export interface BreadcrumbSchemaData {
  items: { name: string; url?: string }[];
}

interface JsonLdObject {
  "@context": "https://schema.org";
  "@type": string;
  [key: string]: unknown;
}

export function generatePersonSchema(data: PersonSchemaData): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: data.name,
    ...(data.givenName && { givenName: data.givenName }),
    ...(data.familyName && { familyName: data.familyName }),
    ...(data.jobTitle && { jobTitle: data.jobTitle }),
    ...(data.description && { description: data.description }),
    ...(data.image && { image: data.image }),
    ...(data.url && { url: data.url }),
    ...(data.sameAs && data.sameAs.length > 0 && { sameAs: data.sameAs }),
    ...(data.email && { email: data.email }),
    ...(data.telephone && { telephone: data.telephone }),
    ...(data.address && { address: data.address }),
    ...(data.birthDate && { birthDate: data.birthDate }),
    ...(data.knowsAbout && data.knowsAbout.length > 0 && { knowsAbout: data.knowsAbout }),
    ...(data.worksFor && {
      worksFor: {
        "@type": "Organization",
        name: data.worksFor.name,
        ...(data.worksFor.url && { url: data.worksFor.url }),
      },
    }),
  };
}

export function generateArticleSchema(data: ArticleSchemaData): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: data.headline,
    ...(data.description && { description: data.description }),
    ...(data.image && { image: data.image }),
    datePublished: data.datePublished,
    ...(data.dateModified && { dateModified: data.dateModified }),
    author: {
      "@type": "Person",
      name: data.author.name,
      ...(data.author.url && { url: data.author.url }),
    },
    publisher: {
      "@type": "Organization",
      name: data.publisher.name,
      ...(data.publisher.logo && { logo: data.publisher.logo }),
    },
    url: data.url,
    ...(data.isAccessibleForFree !== undefined && { isAccessibleForFree: data.isAccessibleForFree }),
  };
}

export function generateFAQSchema(data: FAQSchemaData): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: data.questions.map((q) => ({
      "@type": "Question",
      name: q.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: q.answer,
      },
    })),
  };
}

export function generateServiceSchema(data: ServiceSchemaData): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: data.name,
    ...(data.description && { description: data.description }),
    provider: {
      "@type": "Organization",
      name: data.provider.name,
      ...(data.provider.url && { url: data.provider.url }),
    },
    ...(data.areaServed && data.areaServed.length > 0 && { areaServed: data.areaServed }),
    ...(data.serviceType && { serviceType: data.serviceType }),
    ...(data.offers && data.offers.length > 0 && {
      offers: data.offers.map((offer) => ({
        "@type": "Offer",
        price: offer.price,
        priceCurrency: offer.priceCurrency,
        ...(offer.description && { description: offer.description }),
      })),
    }),
  };
}

export function generateOrganizationSchema(data: OrganizationSchemaData): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: data.name,
    ...(data.description && { description: data.description }),
    ...(data.url && { url: data.url }),
    ...(data.logo && { logo: data.logo }),
    ...(data.sameAs && data.sameAs.length > 0 && { sameAs: data.sameAs }),
    ...(data.address && { address: data.address }),
    ...(data.contactPoint && {
      contactPoint: {
        "@type": "ContactPoint",
        telephone: data.contactPoint.telephone,
        contactType: data.contactPoint.contactType,
      },
    }),
    ...(data.founder && {
      founder: {
        "@type": "Person",
        name: data.founder.name,
        ...(data.founder.url && { url: data.founder.url }),
      },
    }),
  };
}

export function generateBreadcrumbSchema(data: BreadcrumbSchemaData): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: data.items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      ...(item.url && { item: item.url }),
    })),
  };
}

export interface WebsiteSchemaData {
  name: string;
  url: string;
  description?: string;
  image?: string;
  sameAs?: string[];
  inLanguage?: string;
  potentialAction?: {
    target: string;
    queryInput: string;
  };
}

export function generateWebsiteSchema(data: WebsiteSchemaData): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: data.name,
    url: data.url,
    ...(data.description && { description: data.description }),
    ...(data.image && { image: data.image }),
    ...(data.sameAs && data.sameAs.length > 0 && { sameAs: data.sameAs }),
    ...(data.inLanguage && { inLanguage: data.inLanguage }),
    ...(data.potentialAction && {
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: data.potentialAction.target,
        },
        "query-input": data.potentialAction.queryInput,
      },
    }),
  };
}

export interface WebPageSchemaData {
  name: string;
  description?: string;
  url: string;
  image?: string;
  datePublished?: string;
  dateModified?: string;
  author?: { name: string; url?: string };
  publisher?: { name: string; logo?: string };
  breadcrumb?: BreadcrumbSchemaData;
  mainEntity?: JsonLdObject;
}

export function generateWebPageSchema(data: WebPageSchemaData): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: data.name,
    ...(data.description && { description: data.description }),
    url: data.url,
    ...(data.image && { image: data.image }),
    ...(data.datePublished && { datePublished: data.datePublished }),
    ...(data.dateModified && { dateModified: data.dateModified }),
    ...(data.author && {
      author: { "@type": "Person", name: data.author.name, ...(data.author.url && { url: data.author.url }) },
    }),
    ...(data.publisher && {
      publisher: { "@type": "Organization", name: data.publisher.name, ...(data.publisher.logo && { logo: data.publisher.logo }) },
    }),
    ...(data.breadcrumb && { breadcrumb: generateBreadcrumbSchema(data.breadcrumb) }),
    ...(data.mainEntity && { mainEntity: data.mainEntity }),
  };
}

export interface CreativeWorkSchemaData {
  name: string;
  description?: string;
  url?: string;
  image?: string;
  author?: { name: string; url?: string };
  datePublished?: string;
  dateModified?: string;
  publisher?: { name: string; logo?: string };
  genre?: string[];
  keywords?: string[];
}

export function generateCreativeWorkSchema(data: CreativeWorkSchemaData): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: data.name,
    ...(data.description && { description: data.description }),
    ...(data.url && { url: data.url }),
    ...(data.image && { image: data.image }),
    ...(data.author && {
      author: { "@type": "Person", name: data.author.name, ...(data.author.url && { url: data.author.url }) },
    }),
    ...(data.datePublished && { datePublished: data.datePublished }),
    ...(data.dateModified && { dateModified: data.dateModified }),
    ...(data.publisher && {
      publisher: { "@type": "Organization", name: data.publisher.name, ...(data.publisher.logo && { logo: data.publisher.logo }) },
    }),
    ...(data.genre && data.genre.length > 0 && { genre: data.genre }),
    ...(data.keywords && data.keywords.length > 0 && { keywords: data.keywords }),
  };
}

export function generateJsonLd(schema: JsonLdObject): string {
  return `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;
}

export function generateJsonLdScript(schema: JsonLdObject): {
  __html: string;
} {
  return {
    __html: JSON.stringify(schema),
  };
}
