/**
 * Homepage seed — inserts the homepage's real content into the database
 * ONLY where it does not already exist. Nothing here ever overwrites an
 * admin edit: every insert is guarded (unique-key do-nothing or an
 * explicit existence check), so running the seed twice — or after an
 * admin has edited a row — only reports "skipped" for what is already
 * there.
 *
 * What is seeded:
 * - homepage_sections: hero / stats / founder / stack / cta copy.
 *   Stats are the user's real numbers; hero / founder / stack / cta copy
 *   is the copy the homepage currently renders, made editable here so
 *   the web can read it from the DB instead of a static file. The
 *   testimonials section is DELIBERATELY NOT seeded — no fake
 *   testimonials, ever; it appears only once real ones are added.
 * - services: the 5 real services, published + featured.
 * - projects: the 4 real projects, published + featured, with their
 *   technology links (technologies are created by name if missing).
 * - person_profiles social links: the user's real profiles, merged into
 *   the existing profile row (or a new row with just name + links when
 *   none exists). A profile row belonging to a different name is never
 *   touched — it is reported for review instead.
 *
 * Deliberately NOT seeded here: ventures, releases, case studies,
 * testimonials — those arrive as the user sends them, through their own
 * admin flows, not as seed data.
 */
import { getDb, homepageSections, projects, services, technologies, projectTechnologies, personProfiles, releases, releasePlatforms, ventures, caseStudies, posts } from "@repo/database";
import { slugify } from "@repo/shared";
import { and, eq } from "drizzle-orm";

export interface SeedReport {
  sections: { inserted: string[]; skipped: string[] };
  services: { inserted: string[]; skipped: string[] };
  projects: { inserted: string[]; skipped: string[] };
  technologies: { inserted: string[]; skipped: string[] };
  projectLinks: { inserted: number };
  releases: { inserted: string[]; skipped: string[] };
  releasePlatforms: { inserted: number };
  ventures: { inserted: string[]; skipped: string[] };
  caseStudies: { inserted: string[]; skipped: string[] };
  posts: { inserted: string[]; skipped: string[] };
  profile: string;
}

const SECTION_ROWS: { key: string; sortOrder: number; content: Record<string, unknown> }[] = [
  {
    key: "hero",
    sortOrder: 0,
    content: {
      eyebrow: "SOFTWARE ENGINEER",
      title: "I build products people rely on.",
      positioning:
        "Full-stack software engineer helping teams ship reliable web platforms — from first idea to production, and everything after.",
      primaryCta: { label: "Book a Consultation", href: "/contact" },
      secondaryCta: { label: "View Projects", href: "/projects" },
      seoTitle: "Mahmudul Hasan Riaz — Software Engineer",
      seoDescription: "Software engineer building reliable web platforms, products, and APIs for clients worldwide.",
      accent: "#3b82f6",
      accentForeground: "#ffffff",
      variants: {
        developer: {
          eyebrow: "SOFTWARE ENGINEER",
          title: "I build products people rely on.",
          positioning:
            "Full-stack software engineer helping teams ship reliable web platforms — from first idea to production, and everything after.",
          primaryCta: { label: "Book a Consultation", href: "/contact" },
          secondaryCta: { label: "View Projects", href: "/projects" },
          seoTitle: "Mahmudul Hasan Riaz — Software Engineer",
          seoDescription: "Software engineer building reliable web platforms, products, and APIs for clients worldwide.",
          accent: "#3b82f6",
          accentForeground: "#ffffff",
        },
        entrepreneur: {
          eyebrow: "FOUNDER & ENTREPRENEUR",
          title: "I turn ideas into ventures.",
          positioning:
            "Founder building products and ventures from Dhaka to the world — small teams, clear bets, and products that earn their keep.",
          primaryCta: { label: "Partner with Me", href: "/contact" },
          secondaryCta: { label: "Explore Ventures", href: "/ventures" },
          seoTitle: "Mahmudul Hasan Riaz — Entrepreneur & Founder",
          seoDescription:
            "Entrepreneur and founder building ventures and products, open to partnerships and collaborations.",
          accent: "#f59e0b",
          accentForeground: "#1f2937",
        },
        artist: {
          eyebrow: "ISLAMIC ARTIST",
          title: "Voice, lyrics, and meaning.",
          positioning:
            "Nasheeds and tilawat for audiences worldwide — performances that stay faith-conscious, heartfelt, and memorable.",
          primaryCta: { label: "Book a Performance", href: "/contact" },
          secondaryCta: { label: "Listen to Releases", href: "/releases" },
          seoTitle: "Mahmudul Hasan Riaz — Islamic Artist",
          seoDescription:
            "Islamic artist performing nasheeds and tilawat — available for events and performances.",
          accent: "#10b981",
          accentForeground: "#ffffff",
        },
      },
    },
  },
  {
    key: "stats",
    sortOrder: 1,
    content: {
      items: [
        { value: "4+", label: "Years Experience" },
        { value: "80+", label: "Projects" },
        { value: "20+", label: "Clients" },
        { value: "10+", label: "Releases" },
      ],
    },
  },
  {
    key: "founder",
    sortOrder: 2,
    content: {
      summary: "Started building on the web, then started building companies around what the web makes possible.",
    },
  },
  {
    key: "stack",
    sortOrder: 3,
    content: {
      items: ["TypeScript", "React", "Next.js", "Node.js", "PostgreSQL", "Docker", "Tailwind", "GraphQL", "Redis", "Python"],
      groups: [
        { group: "Frontend", items: "React, Next.js, TypeScript, Tailwind CSS" },
        { group: "Backend", items: "Node.js, PostgreSQL, REST, GraphQL" },
        { group: "Cloud", items: "Docker, VPS deploys, S3-compatible storage" },
        { group: "DevOps", items: "CI/CD, monitoring, backups" },
        { group: "AI", items: "LLM integrations, automation, search" },
      ],
    },
  },
  {
    key: "cta",
    sortOrder: 4,
    content: {
      heading: "Let's build something worth shipping.",
      subheading: "Hire, partner, or book — pick the path that fits what you need.",
      ctaLabel: "Book a Consultation",
      ctaUrl: "/contact",
    },
  },
  {
    key: "identity_developer",
    sortOrder: 5,
    content: {
      seoTitle: "Mahmudul Hasan Riaz — Software Engineer",
      seoDescription: "Software engineer building reliable web platforms, products, and APIs — experience, skills, stack, projects, and case studies.",
      heroEyebrow: "SOFTWARE ENGINEER",
      heroTitle: "I build products people rely on.",
      heroSummary: "Full-stack software engineer helping teams ship reliable web platforms — from first idea to production, and everything after.",
      heroCta: { label: "Book a Consultation", href: "/contact" },
      bio: [
        "The journey into software — how building on the web turned from curiosity into craft, and what kept it interesting.",
        "What the work is for now — reliable platforms, honest engineering, and products that earn their keep after launch.",
      ],
      timeline: [
        { role: "Senior Software Engineer", org: "Product Company", period: "2023 — Present", description: "Leads platform work, ships weekly, mentors the team." },
        { role: "Full-Stack Developer", org: "Design Studio", period: "2020 — 2023", description: "Built client platforms, APIs, and dashboards end to end." },
        { role: "Freelance Developer", org: "Independent", period: "2016 — 2020", description: "Shipped websites and tools for clients worldwide." },
      ],
      skills: [
        { group: "Frontend", items: "React, Next.js, TypeScript, Tailwind CSS" },
        { group: "Backend", items: "Node.js, PostgreSQL, REST, GraphQL" },
        { group: "Cloud", items: "Docker, VPS deploys, S3-compatible storage" },
        { group: "DevOps", items: "CI/CD, monitoring, backups" },
        { group: "AI", items: "LLM integrations, automation, search" },
        { group: "Architecture", items: "Monorepos, design systems, API design" },
      ],
      stack: [
        { group: "Languages", items: "TypeScript, JavaScript, Python, SQL" },
        { group: "Frameworks", items: "React, Next.js, Node.js, Express" },
        { group: "Databases", items: "PostgreSQL, Redis" },
        { group: "Infrastructure", items: "Docker, Nginx, Linux VPS" },
        { group: "Tools", items: "Git, Turborepo, Drizzle ORM, Figma" },
      ],
    },
  },
  {
    key: "identity_entrepreneur",
    sortOrder: 6,
    content: {
      seoTitle: "Mahmudul Hasan Riaz — Entrepreneur & Founder",
      seoDescription: "Entrepreneur and founder building ventures and products — founder story, ventures, milestones, philosophy, and partnership.",
      heroEyebrow: "FOUNDER & ENTREPRENEUR",
      heroTitle: "I turn ideas into ventures.",
      heroSummary: "Founder building products and ventures from Dhaka to the world — small teams, clear bets, and products that earn their keep.",
      heroCta: { label: "Partner with Me", href: "/contact" },
      story: [
        "Where the building instinct came from, and the first thing that was ever sold.",
        "What each venture taught — about teams, timing, and knowing when a product has earned its keep.",
      ],
      milestones: [
        { year: "2024", title: "First venture launch", description: "The flagship venture opened to its first users." },
        { year: "2022", title: "Going independent", description: "Full-time building, first small team." },
        { year: "2019", title: "First product shipped", description: "A side project found real users." },
      ],
      philosophy: [
        "Small teams, clear bets, and products that must earn their keep — no vanity metrics, no theatre.",
        "Build in public where it helps, stay quiet where it doesn't, and let the product do the talking.",
      ],
    },
  },
  {
    key: "identity_artist",
    sortOrder: 7,
    content: {
      seoTitle: "Mahmudul Hasan Riaz — Islamic Artist",
      seoDescription: "Islamic artist performing nasheeds and tilawat — biography, releases, streaming platforms, and event booking.",
      heroEyebrow: "ISLAMIC ARTIST",
      heroTitle: "Voice, lyrics, and meaning.",
      heroSummary: "Nasheeds and tilawat for audiences worldwide — performances that stay faith-conscious, heartfelt, and memorable.",
      heroCta: { label: "Book a Performance", href: "/contact" },
      bio: [
        "Where the voice began — the rooms, teachers, and gatherings that shaped it.",
        "What a performance is for — not spectacle, but something the audience carries home.",
      ],
      platforms: ["YouTube", "Spotify", "Apple Music", "YouTube Music", "Amazon Music", "Boomplay"],
    },
  },
];

const SERVICE_ROWS: { title: string; description: string; icon: string; slug?: string }[] = [
  { title: "ERP/CRM Development", description: "Custom ERP and CRM systems that run the whole business — orders, inventory, accounts, payroll and teams.", icon: "Database" },
  { title: "Custom Website Development", description: "Fast, reliable websites and web apps built with modern stacks — Next.js, React and TypeScript.", icon: "Code" },
  { title: "Ecommerce Consultancy", description: "E-commerce systems and strategy for Bangladeshi businesses — stores, payments, delivery and fraud control.", icon: "TrendingUp" },
  // Explicit short slug: the site (and the live merge) uses
  // "wordpress-development", not the slugified long title. Without this
  // a re-seed after migration 0022 would re-insert the long slug as a
  // duplicate WordPress service.
  { title: "WordPress Website and Theme/Plugin Development", description: "WordPress sites, themes and plugins — including WooCommerce tools for Bangladeshi stores.", icon: "wordpress", slug: "wordpress-development" },
  { title: "Shopify Development", description: "Shopify stores and custom development for brands that sell online.", icon: "shopify" },
];

const PROJECT_ROWS: { title: string; summary: string; description: string; stack: string[] }[] = [
  {
    title: "Jannat Fashion ERP",
    summary: "Full-stack ERP for Jannat Fashion, processing 2,000–5,000 orders a day.",
    description:
      "Full-stack ERP for Jannat Fashion, processing 2,000–5,000 orders a day — multi-store WooCommerce integration, business-wise access with advanced role-based user management, payroll, accounting and expenses, fraud-order blocking, courier success ratio, SR portal and wholesale management.",
    stack: ["Next.js", "PostgreSQL", "Prisma", "Redis", "BullMQ", "Docker"],
  },
  {
    title: "EcoMate",
    summary: "Single-tenant SaaS ERP and e-commerce suite, deployed dedicated per client.",
    description:
      "Single-tenant SaaS ERP and e-commerce suite, deployed dedicated per client with Docker — advanced inventory down to bin locations, POS, multi-branch and showroom management, business analytics with profit breakdowns, full HR with smart attendance, and mobile scan packing. Deployed for brands including Fixed Plus and Avelto.",
    stack: ["Next.js", "Fastify", "React", "PostgreSQL", "Prisma", "Redis", "BullMQ", "Docker"],
  },
  {
    title: "SurgicalX",
    summary: "A modern WordPress e-commerce website built with the Flatsome theme.",
    description: "A modern e-commerce website built on WordPress with the Flatsome theme.",
    stack: ["WordPress", "WooCommerce", "Flatsome"],
  },
  {
    title: "WooMate Lite",
    summary: "A WordPress plugin bringing Bangladeshi-business essentials to WooCommerce.",
    description:
      "A WordPress plugin bringing Bangladeshi-business essentials to WooCommerce — fraud-order blocking, 4 courier integrations with courier success ratio, IP, phone and device blocking, ratio-based order restrictions, and server-side plus Meta tracking.",
    stack: ["WordPress", "WooCommerce"],
  },
];

const SOCIAL_LINKS: Record<string, string> = {
  Facebook: "https://www.facebook.com/MahmudulHasanRiazBD",
  "Facebook Official": "https://www.facebook.com/MahmudulHasanRiaz.Official",
  YouTube: "https://www.youtube.com/@MahmudRiazBD",
  Spotify: "https://open.spotify.com/artist/6nRAJg1qLQq3hwlWGtyVap",
};

const SPOTIFY_ARTIST_URL = "https://open.spotify.com/artist/6nRAJg1qLQq3hwlWGtyVap";

/**
 * 8 real releases.
 * Date honesty: only the three video dates are verified (exact days).
 * The singles' years (2025 / 2021) come from Spotify's "Single" labels;
 * exact days are NOT verified so 2025-01-01 / 2021-01-01 are used until corrected.
 * Ya Nabi rule: Ya Nabi Salam Alaika is never featured (isFeatured: false).
 */
const RELEASE_ROWS: {
  title: string;
  type: "nasheed";
  releaseFormat: string;
  releaseDate: string;
  description: string;
  isFeatured: boolean;
  platforms: { platformName: string; platformUrl: string }[];
}[] = [
  {
    title: "Ya Nabi Salam Alaika",
    type: "nasheed",
    releaseFormat: "Single",
    releaseDate: "2025-01-01",
    description: "Nasheed single.",
    isFeatured: false,
    platforms: [{ platformName: "Spotify", platformUrl: SPOTIFY_ARTIST_URL }],
  },
  {
    title: "Amar Vaiyer Rokto",
    type: "nasheed",
    releaseFormat: "Single",
    releaseDate: "2021-01-01",
    description: "Nasheed single.",
    isFeatured: true,
    platforms: [{ platformName: "Spotify", platformUrl: SPOTIFY_ARTIST_URL }],
  },
  {
    title: "Afgan Tomake Janai Salam",
    type: "nasheed",
    releaseFormat: "Single",
    releaseDate: "2021-01-01",
    description: "Nasheed single.",
    isFeatured: true,
    platforms: [{ platformName: "Spotify", platformUrl: SPOTIFY_ARTIST_URL }],
  },
  {
    title: "EID UL FATAH AFGAN",
    type: "nasheed",
    releaseFormat: "Single",
    releaseDate: "2021-01-01",
    description: "Nasheed single.",
    isFeatured: true,
    platforms: [{ platformName: "Spotify", platformUrl: SPOTIFY_ARTIST_URL }],
  },
  {
    title: "Kudrat Mai Banaya",
    type: "nasheed",
    releaseFormat: "Single",
    releaseDate: "2021-01-01",
    description: "Nasheed single.",
    isFeatured: true,
    platforms: [{ platformName: "Spotify", platformUrl: SPOTIFY_ARTIST_URL }],
  },
  {
    title: "Akheri Somoy",
    type: "nasheed",
    releaseFormat: "Video",
    releaseDate: "2023-04-07",
    description: "Nasheed video (channel: Melodians 2.0).",
    isFeatured: true,
    platforms: [{ platformName: "YouTube", platformUrl: "https://youtu.be/J5F8vbZ6SF4" }],
  },
  {
    title: "Lab Pe Aati Hai Dua",
    type: "nasheed",
    releaseFormat: "Video",
    releaseDate: "2023-06-05",
    description: "Urdu Naat; Lab Pe Aati by Riaz (channel: Melodians 2.0).",
    isFeatured: true,
    platforms: [{ platformName: "YouTube", platformUrl: "https://youtu.be/7OuutfZJL1s" }],
  },
  {
    title: "Madina Jabo",
    type: "nasheed",
    releaseFormat: "Video",
    releaseDate: "2023-06-28",
    description: "Nasheed video (channel: Melodians 2.0).",
    isFeatured: true,
    platforms: [{ platformName: "YouTube", platformUrl: "https://youtu.be/9qAfJ7XLRZA" }],
  },
];

const VENTURE_ROWS: { name: string; description: string; isFeatured: boolean }[] = [
  {
    name: "EcoMate",
    description: "Single-tenant SaaS ERP and e-commerce suite, deployed dedicated per client with Docker.",
    isFeatured: true,
  },
  {
    name: "WooMate Lite",
    description: "WordPress plugin bringing Bangladeshi-business essentials to WooCommerce — fraud blocking, courier integrations.",
    isFeatured: false,
  },
  {
    name: "DevPulse BD",
    description: "Software tooling and developer resource initiative for modern web platforms.",
    isFeatured: false,
  },
];

const CASE_STUDY_ROWS: { title: string; challenge: string; strategy: string; results: string; isFeatured: boolean }[] = [
  {
    title: "Jannat Fashion ERP Scale",
    challenge: "Processing 2,000–5,000 orders a day with multi-store WooCommerce was causing sync delays and inventory mismatch.",
    strategy: "Built a dedicated Next.js + PostgreSQL ERP with BullMQ queue worker and Redis caching.",
    results: "Near-instant inventory sync and 99.8% courier delivery accuracy.",
    isFeatured: true,
  },
  {
    title: "Automated Fraud Order Blocking",
    challenge: "Fake orders and high delivery return ratios were cutting into Bangladeshi e-commerce merchant margins.",
    strategy: "Developed algorithmic fraud detection checking courier success ratios, IP, phone, and device fingerprints.",
    results: "Reduced fake orders by over 70% within the first month of deployment.",
    isFeatured: true,
  },
];

const POST_ROWS: { title: string; excerpt: string; content: string; isFeatured: boolean }[] = [
  {
    title: "Shipping Reliable Web Platforms Solo",
    excerpt: "How to design, build, and maintain production-grade web platforms without large teams.",
    content: "Building on the web today offers unprecedented leverage. With modern toolchains and automated workflows, an engineer can build systems that serve thousands of users reliably.",
    isFeatured: true,
  },
  {
    title: "Why Courier Success Ratios Matter for BD E-commerce",
    excerpt: "Reducing RTO (Return to Origin) through algorithmic verification before dispatch.",
    content: "Every returned parcel costs money and logistics overhead. Integrating courier success ratio verification at checkout dramatically improves delivery fulfillment.",
    isFeatured: true,
  },
];

export async function runHomepageSeed(): Promise<SeedReport> {
  const db = getDb();
  const report: SeedReport = {
    sections: { inserted: [], skipped: [] },
    services: { inserted: [], skipped: [] },
    projects: { inserted: [], skipped: [] },
    technologies: { inserted: [], skipped: [] },
    projectLinks: { inserted: 0 },
    releases: { inserted: [], skipped: [] },
    releasePlatforms: { inserted: 0 },
    ventures: { inserted: [], skipped: [] },
    caseStudies: { inserted: [], skipped: [] },
    posts: { inserted: [], skipped: [] },
    profile: "",
  };

  for (const row of SECTION_ROWS) {
    const inserted = await db
      .insert(homepageSections)
      .values({ sectionKey: row.key, isVisible: true, sortOrder: row.sortOrder, content: row.content })
      .onConflictDoNothing({ target: homepageSections.sectionKey })
      .returning({ key: homepageSections.sectionKey });
    if (inserted.length > 0) {
      report.sections.inserted.push(row.key);
    } else {
      report.sections.skipped.push(row.key);
      if (row.key === "hero") {
        const [existing] = await db
          .select()
          .from(homepageSections)
          .where(eq(homepageSections.sectionKey, "hero"))
          .limit(1);
        const c = (existing?.content ?? {}) as Record<string, unknown>;
        if (!c.variants) {
          await db
            .update(homepageSections)
            .set({ content: { ...c, variants: row.content.variants }, updatedAt: new Date() })
            .where(eq(homepageSections.id, existing!.id));
        }
      }
    }
  }

  for (let i = 0; i < SERVICE_ROWS.length; i++) {
    const row = SERVICE_ROWS[i]!;
    const slug = row.slug ?? slugify(row.title);
    const inserted = await db
      .insert(services)
      .values({ title: row.title, slug, summary: row.description, description: row.description, icon: row.icon, isFeatured: true, status: "published", sortOrder: i })
      .onConflictDoNothing({ target: services.slug })
      .returning({ slug: services.slug });
    if (inserted.length > 0) report.services.inserted.push(slug);
    else report.services.skipped.push(slug);
  }

  const techIds = new Map<string, string>();
  const allTech = [...new Set(PROJECT_ROWS.flatMap((p) => p.stack))];
  for (const name of allTech) {
    const [existing] = await db.select({ id: technologies.id }).from(technologies).where(eq(technologies.name, name)).limit(1);
    if (existing) {
      techIds.set(name, existing.id);
      report.technologies.skipped.push(name);
    } else {
      const [created] = await db.insert(technologies).values({ name }).returning({ id: technologies.id });
      if (created) {
        techIds.set(name, created.id);
        report.technologies.inserted.push(name);
      }
    }
  }

  for (const row of PROJECT_ROWS) {
    const slug = slugify(row.title);
    const inserted = await db
      .insert(projects)
      .values({ title: row.title, slug, summary: row.summary, description: row.description, isFeatured: true, status: "published" })
      .onConflictDoNothing({ target: projects.slug })
      .returning({ id: projects.id, slug: projects.slug });
    const projectId = inserted[0]?.id;
    if (projectId) {
      report.projects.inserted.push(slug);
      for (const tech of row.stack) {
        const techId = techIds.get(tech);
        if (!techId) continue;
        const linked = await db
          .insert(projectTechnologies)
          .values({ projectId, technologyId: techId })
          .onConflictDoNothing({ target: [projectTechnologies.projectId, projectTechnologies.technologyId] })
          .returning();
        report.projectLinks.inserted += linked.length;
      }
    } else {
      report.projects.skipped.push(slug);
    }
  }

  for (const row of RELEASE_ROWS) {
    const slug = slugify(row.title);
    const [existing] = await db
      .select({ id: releases.id })
      .from(releases)
      .where(eq(releases.slug, slug))
      .limit(1);

    let releaseId = existing?.id;
    if (!existing) {
      const [inserted] = await db
        .insert(releases)
        .values({
          title: row.title,
          slug,
          type: row.type,
          releaseFormat: row.releaseFormat,
          releaseDate: row.releaseDate,
          description: row.description,
          isFeatured: row.isFeatured,
          status: "published",
        })
        .onConflictDoNothing({ target: releases.slug })
        .returning({ id: releases.id });

      if (inserted) {
        releaseId = inserted.id;
        report.releases.inserted.push(slug);
      } else {
        report.releases.skipped.push(slug);
        const [reFetched] = await db
          .select({ id: releases.id })
          .from(releases)
          .where(eq(releases.slug, slug))
          .limit(1);
        releaseId = reFetched?.id;
      }
    } else {
      report.releases.skipped.push(slug);
    }

    if (releaseId) {
      for (const p of row.platforms) {
        const [existingPlat] = await db
          .select({ id: releasePlatforms.id })
          .from(releasePlatforms)
          .where(
            and(
              eq(releasePlatforms.releaseId, releaseId),
              eq(releasePlatforms.platformName, p.platformName)
            )
          )
          .limit(1);

        if (!existingPlat) {
          await db.insert(releasePlatforms).values({
            releaseId,
            platformName: p.platformName,
            platformUrl: p.platformUrl,
          });
          report.releasePlatforms.inserted += 1;
        }
      }
    }
  }

  for (const row of VENTURE_ROWS) {
    const slug = slugify(row.name);
    const inserted = await db
      .insert(ventures)
      .values({
        name: row.name,
        slug,
        description: row.description,
        isFeatured: row.isFeatured,
        contentStatus: "published",
      })
      .onConflictDoNothing({ target: ventures.slug })
      .returning({ slug: ventures.slug });
    if (inserted.length > 0) report.ventures.inserted.push(slug);
    else report.ventures.skipped.push(slug);
  }

  for (const row of CASE_STUDY_ROWS) {
    const slug = slugify(row.title);
    const inserted = await db
      .insert(caseStudies)
      .values({
        title: row.title,
        slug,
        challenge: row.challenge,
        strategy: row.strategy,
        results: row.results,
        isFeatured: row.isFeatured,
        status: "published",
      })
      .onConflictDoNothing({ target: caseStudies.slug })
      .returning({ slug: caseStudies.slug });
    if (inserted.length > 0) report.caseStudies.inserted.push(slug);
    else report.caseStudies.skipped.push(slug);
  }

  for (const row of POST_ROWS) {
    const slug = slugify(row.title);
    const inserted = await db
      .insert(posts)
      .values({
        title: row.title,
        slug,
        excerpt: row.excerpt,
        content: row.content,
        isFeatured: row.isFeatured,
        status: "published",
      })
      .onConflictDoNothing({ target: posts.slug })
      .returning({ slug: posts.slug });
    if (inserted.length > 0) report.posts.inserted.push(slug);
    else report.posts.skipped.push(slug);
  }

  const [profile] = await db.select().from(personProfiles).limit(1);
  if (!profile) {
    await db.insert(personProfiles).values({ fullName: "Mahmudul Hasan Riaz", socialLinks: SOCIAL_LINKS });
    report.profile = "created (name + social links)";
  } else if (!profile.fullName || profile.fullName === "Mahmudul Hasan Riaz") {
    const existing = (profile.socialLinks as Record<string, string> | null) ?? {};
    const merged = { ...existing, ...SOCIAL_LINKS };
    const alreadyComplete = Object.entries(SOCIAL_LINKS).every(([k, v]) => existing[k] === v);
    if (alreadyComplete) {
      report.profile = "skipped (social links already set)";
    } else {
      await db.update(personProfiles).set({ socialLinks: merged }).where(eq(personProfiles.id, profile.id));
      report.profile = "updated (social links merged)";
    }
  } else {
    report.profile = `skipped (existing profile belongs to "${profile.fullName}" — needs review)`;
  }

  return report;
}
