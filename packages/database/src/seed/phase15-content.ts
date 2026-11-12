import postgres from "postgres";
import { getDatabaseConfig } from "../config";

const config = getDatabaseConfig();
const sql = postgres(config.DATABASE_URL, { max: 1 });

async function main() {
  const now = new Date();

  // 1. Seed person_profiles
  console.log("Seeding person_profiles...");
  const [existingProfile] = await sql`SELECT id FROM person_profiles LIMIT 1`;
  if (!existingProfile) {
    const socialLinks = {
      github: "https://github.com/zacharykalonga",
      linkedin: "https://linkedin.com/in/zacharykalonga",
      twitter: "https://twitter.com/zacharykalonga",
    };
    await sql`
      INSERT INTO person_profiles (full_name, headline, bio_short, bio_long, location, email, website, social_links)
      VALUES (
        'Zachary Kalonga',
        'Full-Stack Developer \u00B7 Entrepreneur \u00B7 Digital Creator',
        'Building digital products and experiences that make a difference. Specializing in web development, entrepreneurship, and creative media.',
        'I am a passionate full-stack developer with extensive experience in building modern web applications. My journey spans multiple domains including software engineering, entrepreneurship, and creative arts. I believe in leveraging technology to solve real-world problems and create meaningful impact.\n\nWith a strong foundation in both frontend and backend technologies, I help businesses and individuals bring their digital visions to life. From e-commerce platforms to content management systems, I deliver robust, scalable solutions that drive results.',
        'Lilongwe, Malawi',
        'hello@zacharykalonga.com',
        'https://zacharykalonga.com',
        ${socialLinks}
      )
    `;
    const [p] = await sql`SELECT full_name, headline FROM person_profiles LIMIT 1`;
    console.log(`  Profile: ${p.full_name} (${p.headline})`);
  } else {
    console.log("  Profile already exists, skipping");
  }

  // 2. Seed homepage_sections
  console.log("Seeding homepage_sections...");
  
  const sections = [
    { key: "hero", sort_order: 0, content: { heading: "Building Digital Excellence", subheading: "Full-stack developer, entrepreneur, and creator crafting modern web solutions that drive impact.", ctaLabel: "View My Work", ctaUrl: "/projects" } },
    { key: "services", sort_order: 1, content: { heading: "What I Do", items: [
      { title: "Web Development", description: "Modern, responsive web applications built with cutting-edge technologies.", href: "/services/web-development" },
      { title: "Digital Consulting", description: "Strategic technology consulting to help your business grow digitally.", href: "/services/digital-consulting" },
      { title: "Music & Media", description: "Creative production including nasheed, tilawat, and spoken word.", href: "/releases" }
    ]}},
    { key: "projects", sort_order: 2, content: { heading: "Featured Projects", items: [
      { title: "E-Commerce Platform", image: "", href: "/projects/ecommerce-platform" },
      { title: "Portfolio Redesign", image: "", href: "/projects/portfolio-redesign" }
    ]}},
    { key: "blog", sort_order: 3, content: { heading: "Latest Thoughts", items: [
      { title: "Building Scalable Web Applications with Next.js", excerpt: "Learn how to build performant, scalable web applications using Next.js and modern best practices.", href: "/blog/building-scalable-web-applications-with-nextjs" }
    ]}},
    { key: "stats", sort_order: 4, content: { items: [
      { value: "5+", label: "Years Experience" },
      { value: "20+", label: "Projects Delivered" },
      { value: "15+", label: "Happy Clients" },
      { value: "3", label: "Active Ventures" }
    ]}},
    { key: "cta", sort_order: 5, content: { heading: "Let\u2019s Work Together", subheading: "Have a project in mind? Let\u2019s discuss how we can bring your vision to life.", ctaLabel: "Get in Touch", ctaUrl: "/contact" }},
    { key: "testimonials", sort_order: 6, content: { heading: "What People Say", items: [
      { quote: "Zachary delivered an exceptional e-commerce platform that transformed our online presence. His attention to detail and technical expertise are outstanding.", author: "Sarah M.", title: "CEO, Urban Threads" },
      { quote: "Working with Zachary was a pleasure. He understood our requirements perfectly and delivered beyond expectations.", author: "James K.", title: "Founder, TechStart" }
    ]}},
  ];

  for (const sec of sections) {
    const [existing] = await sql`SELECT id FROM homepage_sections WHERE section_key = ${sec.key}`;
    if (!existing) {
      await sql`
        INSERT INTO homepage_sections (section_key, is_visible, sort_order, content)
        VALUES (${sec.key}, true, ${sec.sort_order}, ${sec.content})
      `;
    }
  }
  const dbSections = await sql`SELECT section_key, is_visible, sort_order FROM homepage_sections ORDER BY sort_order`;
  for (const s of dbSections) console.log(`  ${s.section_key} (visible=${s.is_visible}, order=${s.sort_order})`);

  // 3. Seed ventures
  console.log("Seeding ventures...");
  const venturesData = [
    { name: "Kalonga Tech", slug: "kalonga-tech", description: "A technology company specializing in web development, digital consulting, and software solutions for businesses of all sizes.", industry: "Technology", location: "Lilongwe, Malawi" },
    { name: "Creative Media Co", slug: "creative-media-co", description: "A creative media venture producing nasheed, tilawat, podcasts, and digital content that inspires and educates.", industry: "Media & Entertainment", location: "Lilongwe, Malawi" },
  ];
  for (const v of venturesData) {
    const [existing] = await sql`SELECT id FROM ventures WHERE slug = ${v.slug}`;
    if (!existing) {
      await sql`
        INSERT INTO ventures (name, slug, description, industry, stage, location, content_status, status, is_featured)
        VALUES (${v.name}, ${v.slug}, ${v.description}, ${v.industry}, 'active', ${v.location}, 'published', 'active', true)
      `;
    }
  }
  const allVentures = await sql`SELECT name, slug FROM ventures WHERE content_status = 'published'`;
  for (const v of allVentures) console.log(`  ${v.name} (${v.slug})`);

  // 4. Seed additional blog posts
  console.log("Seeding blog posts...");
  const [authorRow] = await sql`SELECT id FROM users LIMIT 1`;
  const authorId = authorRow?.id || null;

  const postsData = [
    { title: "The Future of Web Development: Trends to Watch in 2026", slug: "future-of-web-development-2026",
      excerpt: "Explore the key trends shaping web development in 2026, from AI-powered development tools to edge computing and beyond.",
      content: "## AI-Powered Development\nArtificial intelligence is revolutionizing the way we write code.\n\n## Edge Computing\nEdge computing is bringing applications closer to users.\n\n## WebAssembly\nWebAssembly enables high-performance applications in the browser." },
    { title: "Building a Design System with Tailwind CSS", slug: "building-design-system-tailwind",
      excerpt: "Learn how to create a scalable, maintainable design system using Tailwind CSS and modern CSS architecture principles.",
      content: "## Why Tailwind?\nTailwind CSS provides a utility-first approach for consistent designs.\n\n## Architecture\nStart by defining your design tokens: colors, typography, spacing, and shadows." },
  ];
  for (const p of postsData) {
    const [existing] = await sql`SELECT id FROM posts WHERE slug = ${p.slug}`;
    if (!existing) {
      await sql`
        INSERT INTO posts (title, slug, excerpt, content, status, created_by)
        VALUES (${p.title}, ${p.slug}, ${p.excerpt}, ${p.content}, 'published', ${authorId})
      `;
    }
  }
  const allPosts = await sql`SELECT title, slug FROM posts WHERE status = 'published'`;
  for (const p of allPosts) console.log(`  ${p.title} (${p.slug})`);

  // 5. Seed additional releases
  console.log("Seeding releases...");
  const releasesData = [
    { title: "Moments of Clarity", slug: "moments-of-clarity", type: "nasheed", description: "A soulful nasheed album exploring themes of faith, hope, and spiritual reflection.", releaseDate: "2026-01-15" },
    { title: "The Journey Within", slug: "the-journey-within", type: "tilawat", description: "A collection of beautiful tilawat recitations featuring passages from the Quran with heartfelt reflection.", releaseDate: "2025-11-20" },
  ];
  for (const r of releasesData) {
    const [existing] = await sql`SELECT id FROM releases WHERE slug = ${r.slug}`;
    if (!existing) {
      await sql`
        INSERT INTO releases (title, slug, type, description, release_date, status)
        VALUES (${r.title}, ${r.slug}, ${r.type}, ${r.description}, ${r.releaseDate}, 'published')
      `;
    }
  }
  const allReleases = await sql`SELECT title, slug, type FROM releases WHERE status = 'published'`;
  for (const r of allReleases) console.log(`  ${r.title} (${r.slug}, ${r.type})`);

  // 6. Seed FAQs
  console.log("Seeding FAQs...");
  const faqsData = [
    { q: "What services do you offer?", a: "I offer web development, digital consulting, and creative media production services. Web development includes modern web applications, e-commerce platforms, and CMS solutions. Digital consulting covers technology strategy, architecture planning, and digital transformation.", order: 1 },
    { q: "What is your development process?", a: "My process typically involves discovery and requirements gathering, architecture and design, iterative development with regular check-ins, thorough testing, and deployment with ongoing support.", order: 2 },
    { q: "How long does a typical project take?", a: "Project timelines vary depending on scope and complexity. A simple landing page might take 1-2 weeks, while a full e-commerce platform could take 2-3 months. I will provide a detailed timeline during our initial consultation.", order: 3 },
    { q: "Do you offer ongoing maintenance?", a: "Yes, I offer ongoing maintenance and support packages to ensure your website or application remains secure, up-to-date, and performing optimally.", order: 4 },
    { q: "How can I get started?", a: "Simply reach out through the contact form or send me an email. We will schedule an initial consultation to discuss your project, goals, and how I can help bring your vision to life.", order: 5 },
  ];
  for (const f of faqsData) {
    await sql`
      INSERT INTO faqs (question, answer, sort_order, entity_type)
      VALUES (${f.q}, ${f.a}, ${f.order}, 'global')
    `;
  }
  const allFaqs = await sql`SELECT question FROM faqs ORDER BY sort_order`;
  for (const f of allFaqs) console.log(`  ${f.question}`);

  // 7. Seed testimonials
  console.log("Seeding testimonials...");
  const testimonialsData = [
    { name: "Sarah M.", title: "CEO, Urban Threads", content: "Zachary delivered an exceptional e-commerce platform that transformed our online presence. His attention to detail and technical expertise are outstanding.", sourceType: "freelance_client", rating: 5, displayOrder: 1 },
    { name: "James K.", title: "Founder, TechStart", content: "Working with Zachary was a pleasure. He understood our requirements perfectly and delivered beyond expectations.", sourceType: "freelance_client", rating: 5, displayOrder: 2 },
    { name: "Amina W.", title: "Event Organizer", content: "Zachary is a talented performer with a genuine passion for his craft. His tilawat recitations are deeply moving and spiritual.", sourceType: "event_organizer", rating: 5, displayOrder: 3 },
  ];
  for (const t of testimonialsData) {
    await sql`
      INSERT INTO testimonials (author_name, author_title, content, source_type, rating, is_featured, status, display_order)
      VALUES (${t.name}, ${t.title}, ${t.content}, ${t.sourceType}, ${t.rating}, true, 'approved', ${t.displayOrder})
    `;
  }
  const allTestimonials = await sql`SELECT author_name, author_title FROM testimonials WHERE status = 'approved'`;
  for (const t of allTestimonials) console.log(`  ${t.author_name} (${t.author_title})`);

  // 8. Rebuild search_index
  console.log("Rebuilding search_index...");
  await sql`DELETE FROM search_index`;

  const postIndex = await sql`SELECT id, title, excerpt, slug, created_at FROM posts WHERE status = 'published'`;
  for (const p of postIndex) {
    await sql`
      INSERT INTO search_index (entity_type, entity_id, title, content, summary, url, published_at, content_type)
      VALUES ('post', ${p.id}, ${p.title}, ${p.excerpt || p.title}, ${p.title}, ${'/blog/' + p.slug}, ${p.created_at}, 'post')
    `;
  }

  const serviceIndex = await sql`SELECT id, title, slug FROM services WHERE status = 'published'`;
  for (const s of serviceIndex) {
    await sql`
      INSERT INTO search_index (entity_type, entity_id, title, content, summary, url, content_type)
      VALUES ('service', ${s.id}, ${s.title}, ${s.title}, ${s.title}, ${'/services/' + s.slug}, 'service')
    `;
  }

  const projectIndex = await sql`SELECT id, title, slug FROM projects WHERE status = 'published'`;
  for (const p of projectIndex) {
    await sql`
      INSERT INTO search_index (entity_type, entity_id, title, content, summary, url, content_type)
      VALUES ('project', ${p.id}, ${p.title}, ${p.title}, ${p.title}, ${'/projects/' + p.slug}, 'project')
    `;
  }

  const ventureIndex = await sql`SELECT id, name, slug FROM ventures WHERE content_status = 'published'`;
  for (const v of ventureIndex) {
    await sql`
      INSERT INTO search_index (entity_type, entity_id, title, content, summary, url, content_type)
      VALUES ('venture', ${v.id}, ${v.name}, ${v.name}, ${v.name}, ${'/ventures/' + v.slug}, 'venture')
    `;
  }

  const releaseIndex = await sql`SELECT id, title, slug, description FROM releases WHERE status = 'published'`;
  for (const r of releaseIndex) {
    await sql`
      INSERT INTO search_index (entity_type, entity_id, title, content, summary, url, content_type)
      VALUES ('release', ${r.id}, ${r.title}, ${r.description || ''}, ${r.title}, ${'/releases/' + r.slug}, 'release')
    `;
  }

  const caseStudyIndex = await sql`SELECT id, title, slug FROM case_studies WHERE status = 'published'`;
  for (const cs of caseStudyIndex) {
    await sql`
      INSERT INTO search_index (entity_type, entity_id, title, content, summary, url, content_type)
      VALUES ('case_study', ${cs.id}, ${cs.title}, ${cs.title}, ${cs.title}, ${'/case-studies/' + cs.slug}, 'case_study')
    `;
  }

  const [searchCount] = await sql`SELECT COUNT(*)::int as cnt FROM search_index`;
  console.log(`Search index rebuilt: ${searchCount.cnt} entries`);

  console.log("\nSeeding complete!");
  await sql.end();
  process.exit(0);
}

main().catch((error) => {
  console.error("Seeding failed:", error.message);
  console.error(error.stack?.slice(0, 500));
  process.exit(1);
});
