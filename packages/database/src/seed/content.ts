import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "../schema";

export async function seedContent(db: PostgresJsDatabase<typeof schema>) {
  const services = await db.insert(schema.services).values([
    {
      title: "Web Development",
      slug: "web-development",
      summary: "Custom web applications built with modern frameworks and best practices",
      description: "Full-stack web development using Next.js, React, Node.js, and TypeScript. From landing pages to complex SaaS platforms, we deliver performant, accessible, and scalable solutions tailored to your business needs.",
      icon: "code",
      priceRange: "$5,000 - $50,000",
      isFeatured: true,
      status: "published",
      sortOrder: 1,
    },
    {
      title: "Digital Consulting",
      slug: "digital-consulting",
      summary: "Strategic technology consulting to help you make informed decisions",
      description: "Technology stack evaluation, architecture review, digital transformation strategy, and technical due diligence. We help businesses navigate technology choices and build roadmaps that align with their goals.",
      icon: "lightbulb",
      priceRange: "$150 - $300 / hour",
      isFeatured: true,
      status: "published",
      sortOrder: 2,
    },
  ]).returning();

  const technologies = await db.insert(schema.technologies).values([
    { name: "Next.js", category: "frontend", sortOrder: 1 },
    { name: "React", category: "frontend", sortOrder: 2 },
    { name: "TypeScript", category: "language", sortOrder: 3 },
    { name: "Node.js", category: "backend", sortOrder: 4 },
    { name: "PostgreSQL", category: "database", sortOrder: 5 },
    { name: "Shopify", category: "ecommerce", sortOrder: 6 },
    { name: "Tailwind CSS", category: "frontend", sortOrder: 7 },
  ]).returning();

  const findTech = (name: string) => technologies.find(t => t.name === name)!;
  const projects = await db.insert(schema.projects).values([
    {
      title: "E-Commerce Platform",
      slug: "ecommerce-platform",
      summary: "A headless Shopify storefront with custom checkout experience",
      description: "Built a high-performance e-commerce platform using Next.js and Shopify's Storefront API. Implemented custom product filtering, real-time inventory management, and a seamless checkout flow that increased conversion rates by 35%.",
      thumbnail: "/images/projects/ecommerce-thumb.jpg",
      coverImage: "/images/projects/ecommerce-cover.jpg",
      industry: "ecommerce",
      clientName: "Urban Threads Apparel",
      projectUrl: "https://urbanthreads.example.com",
      startDate: "2025-03-01",
      endDate: "2025-08-15",
      status: "published",
      isFeatured: true,
    },
    {
      title: "Portfolio Redesign",
      slug: "portfolio-redesign",
      summary: "Complete redesign of a creative professional's portfolio website",
      description: "Designed and developed a modern portfolio website showcasing creative work across multiple disciplines. Implemented a modular CMS, optimized image delivery, and achieved a 98 Lighthouse performance score.",
      thumbnail: "/images/projects/portfolio-thumb.jpg",
      coverImage: "/images/projects/portfolio-cover.jpg",
      industry: "creative",
      clientName: "Aisha Rahman",
      projectUrl: "https://aisharahman.example.com",
      startDate: "2025-06-01",
      endDate: "2025-09-30",
      status: "published",
      isFeatured: true,
    },
  ]).returning();

  await db.insert(schema.projectTechnologies).values([
    { projectId: projects[0]!.id, technologyId: findTech("Next.js").id },
    { projectId: projects[0]!.id, technologyId: findTech("React").id },
    { projectId: projects[0]!.id, technologyId: findTech("TypeScript").id },
    { projectId: projects[0]!.id, technologyId: findTech("Shopify").id },
    { projectId: projects[0]!.id, technologyId: findTech("Tailwind CSS").id },
    { projectId: projects[1]!.id, technologyId: findTech("Next.js").id },
    { projectId: projects[1]!.id, technologyId: findTech("TypeScript").id },
    { projectId: projects[1]!.id, technologyId: findTech("Tailwind CSS").id },
  ]);

  await db.insert(schema.caseStudies).values([
    {
      projectId: projects[0]!.id,
      title: "Scaling Urban Threads: From Local Store to National E-Commerce Brand",
      slug: "scaling-urban-threads-ecommerce",
      challenge: "Urban Threads operated a successful brick-and-mortar store but had no online presence. Their existing Shopify theme was slow, had a 45% cart abandonment rate, and couldn't handle flash sale traffic spikes.",
      research: "Analyzed competitor e-commerce sites, conducted user testing with existing customers, and reviewed analytics showing 70% of their traffic came from mobile devices.",
      strategy: "Adopted a headless commerce architecture with Next.js for the frontend and Shopify as the backend. Implemented incremental static regeneration for product pages, lazy-loaded images, and a streamlined three-step checkout process.",
      results: "Page load time improved from 6.2s to 1.1s. Cart abandonment dropped to 22%. Monthly online revenue reached $120,000 within 90 days of launch. Mobile conversion rate increased by 60%.",
      metrics: { pageLoadSpeed: "1.1s", cartAbandonmentRate: "22%", monthlyRevenue: "$120,000", mobileConversionIncrease: "60%" },
      isFeatured: true,
      status: "published",
    },
  ]);

  const category = await db.insert(schema.categories).values({
    name: "Engineering",
    slug: "engineering",
    description: "Software engineering and web development topics",
    type: "blog",
  }).returning();

  const tags = await db.insert(schema.tags).values([
    { name: "Next.js", slug: "nextjs" },
    { name: "Performance", slug: "performance" },
    { name: "Architecture", slug: "architecture" },
  ]).returning();

  const post = await db.insert(schema.posts).values({
    title: "Building Scalable Web Applications with Next.js",
    slug: "building-scalable-web-applications-with-nextjs",
    excerpt: "Learn how to architect Next.js applications that scale from a single developer to a full engineering team.",
    content: "Next.js has evolved from a simple React framework into a comprehensive platform for building production-grade web applications. In this article, we'll explore architectural patterns that keep your codebase maintainable as your application grows.\n\n## Project Structure\n\nOrganizing your Next.js project for scale means thinking about colocation, module boundaries, and shared utilities. We recommend a feature-based directory structure where each feature owns its components, hooks, and API routes.\n\n## Data Fetching Strategy\n\nOne of the most critical decisions is choosing between server-side rendering, static generation, and incremental static regeneration. For most applications, a hybrid approach works best: static generation for marketing pages, SSR for authenticated routes, and ISR for dynamic content that changes periodically.\n\n## State Management\n\nFor application state, rely on React's built-in useState and useReducer for local state. Use React Context or Zustand for shared state that doesn't need to be persisted. For server state, React Query or SWR provide excellent caching and revalidation.\n\n## Performance Optimization\n\nNext.js provides automatic code splitting and image optimization out of the box. Additional optimizations include: streaming SSR for faster time-to-first-byte, using the Link component for prefetching, and implementing route groups to share layouts without unnecessary re-renders.\n\n## Testing Strategy\n\nA robust testing pyramid for Next.js includes unit tests with Vitest, integration tests with React Testing Library, and end-to-end tests with Playwright. Component tests should focus on user behavior rather than implementation details.",
    coverImage: "/images/blog/nextjs-scalable.jpg",
    isFeatured: true,
    status: "published",
    publishAt: new Date("2025-12-01T10:00:00Z"),
  }).returning();

  await db.insert(schema.postCategories).values({
    postId: post[0]!.id,
    categoryId: category[0]!.id,
  });

  await db.insert(schema.postTags).values([
    { postId: post[0]!.id, tagId: tags.find(t => t.name === "Next.js")!.id },
    { postId: post[0]!.id, tagId: tags.find(t => t.name === "Architecture")!.id },
    { postId: post[0]!.id, tagId: tags.find(t => t.name === "Performance")!.id },
  ]);

  await db.insert(schema.serviceFaqs).values([
    {
      serviceId: services[0]!.id,
      question: "How long does a typical web development project take?",
      answer: "Most projects range from 6 to 16 weeks depending on complexity. A landing page might take 3-4 weeks, while a full SaaS platform can take 3-6 months.",
      sortOrder: 1,
    },
    {
      serviceId: services[0]!.id,
      question: "Do you provide ongoing maintenance after launch?",
      answer: "Yes, we offer maintenance and support packages that include security updates, performance monitoring, content updates, and 24/7 incident response.",
      sortOrder: 2,
    },
    {
      serviceId: services[1]!.id,
      question: "What does a typical consulting engagement look like?",
      answer: "Engagements typically start with a discovery phase where we understand your business goals and technical landscape, followed by a deep-dive assessment and a final presentation with actionable recommendations.",
      sortOrder: 1,
    },
  ]);

  console.log(`Seeded ${services.length} services, ${projects.length} projects, ${post.length} blog post`);
}
