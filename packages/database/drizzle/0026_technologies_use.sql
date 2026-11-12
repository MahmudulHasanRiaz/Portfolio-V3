-- Technologies: `use` column + the full 44-tech live set (0026).
--
-- The stack globe renders 44 technologies in 7 categories, previously
-- hardcoded in the Astro site's src/data/site.ts STACK array. The
-- technologies table only held the handful of names linked from project
-- stacks (name-only rows, category/icon NULL). This migration:
--   1. adds the `use` text column (only PHP has a use in the live
--      copy: "Plugin development"; every other row stays NULL),
--   2. inserts the full 44-tech set VERBATIM from Portfolio-Public
--      main 0af172bb src/data/site.ts STACK (name + category + icon
--      slug, sort_order = STACK order), and
--   3. fills category/icon/sort_order/use on the existing project-stack
--      rows — but ONLY where the column is still NULL (COALESCE guard,
--      the 0022 guarded-seed pattern: a value an admin already set is
--      never overwritten).
-- Re-runnable: inserts match zero rows once present, COALESCE updates
-- are no-ops once filled.

ALTER TABLE "technologies" ADD COLUMN IF NOT EXISTS "use" text;
--> statement-breakpoint
INSERT INTO "technologies" ("name", "category", "icon", "use", "sort_order")
SELECT 'React', 'Frontend', 'react', NULL, 1
WHERE NOT EXISTS (SELECT 1 FROM "technologies" WHERE "name" = 'React');
--> statement-breakpoint
UPDATE "technologies" SET "category" = COALESCE("category", 'Frontend'), "icon" = COALESCE("icon", 'react'), "sort_order" = COALESCE("sort_order", 1), "use" = COALESCE("use", NULL) WHERE "name" = 'React';
--> statement-breakpoint
INSERT INTO "technologies" ("name", "category", "icon", "use", "sort_order")
SELECT 'TypeScript', 'Frontend', 'typescript', NULL, 2
WHERE NOT EXISTS (SELECT 1 FROM "technologies" WHERE "name" = 'TypeScript');
--> statement-breakpoint
UPDATE "technologies" SET "category" = COALESCE("category", 'Frontend'), "icon" = COALESCE("icon", 'typescript'), "sort_order" = COALESCE("sort_order", 2), "use" = COALESCE("use", NULL) WHERE "name" = 'TypeScript';
--> statement-breakpoint
INSERT INTO "technologies" ("name", "category", "icon", "use", "sort_order")
SELECT 'HTML', 'Frontend', 'html5', NULL, 3
WHERE NOT EXISTS (SELECT 1 FROM "technologies" WHERE "name" = 'HTML');
--> statement-breakpoint
UPDATE "technologies" SET "category" = COALESCE("category", 'Frontend'), "icon" = COALESCE("icon", 'html5'), "sort_order" = COALESCE("sort_order", 3), "use" = COALESCE("use", NULL) WHERE "name" = 'HTML';
--> statement-breakpoint
INSERT INTO "technologies" ("name", "category", "icon", "use", "sort_order")
SELECT 'CSS', 'Frontend', 'css', NULL, 4
WHERE NOT EXISTS (SELECT 1 FROM "technologies" WHERE "name" = 'CSS');
--> statement-breakpoint
UPDATE "technologies" SET "category" = COALESCE("category", 'Frontend'), "icon" = COALESCE("icon", 'css'), "sort_order" = COALESCE("sort_order", 4), "use" = COALESCE("use", NULL) WHERE "name" = 'CSS';
--> statement-breakpoint
INSERT INTO "technologies" ("name", "category", "icon", "use", "sort_order")
SELECT 'Tailwind CSS', 'Frontend', 'tailwindcss', NULL, 5
WHERE NOT EXISTS (SELECT 1 FROM "technologies" WHERE "name" = 'Tailwind CSS');
--> statement-breakpoint
UPDATE "technologies" SET "category" = COALESCE("category", 'Frontend'), "icon" = COALESCE("icon", 'tailwindcss'), "sort_order" = COALESCE("sort_order", 5), "use" = COALESCE("use", NULL) WHERE "name" = 'Tailwind CSS';
--> statement-breakpoint
INSERT INTO "technologies" ("name", "category", "icon", "use", "sort_order")
SELECT 'Astro', 'Frontend', 'astro', NULL, 6
WHERE NOT EXISTS (SELECT 1 FROM "technologies" WHERE "name" = 'Astro');
--> statement-breakpoint
UPDATE "technologies" SET "category" = COALESCE("category", 'Frontend'), "icon" = COALESCE("icon", 'astro'), "sort_order" = COALESCE("sort_order", 6), "use" = COALESCE("use", NULL) WHERE "name" = 'Astro';
--> statement-breakpoint
INSERT INTO "technologies" ("name", "category", "icon", "use", "sort_order")
SELECT 'TanStack Start', 'Frontend', 'tanstack', NULL, 7
WHERE NOT EXISTS (SELECT 1 FROM "technologies" WHERE "name" = 'TanStack Start');
--> statement-breakpoint
UPDATE "technologies" SET "category" = COALESCE("category", 'Frontend'), "icon" = COALESCE("icon", 'tanstack'), "sort_order" = COALESCE("sort_order", 7), "use" = COALESCE("use", NULL) WHERE "name" = 'TanStack Start';
--> statement-breakpoint
INSERT INTO "technologies" ("name", "category", "icon", "use", "sort_order")
SELECT 'Vite', 'Frontend', 'vite', NULL, 8
WHERE NOT EXISTS (SELECT 1 FROM "technologies" WHERE "name" = 'Vite');
--> statement-breakpoint
UPDATE "technologies" SET "category" = COALESCE("category", 'Frontend'), "icon" = COALESCE("icon", 'vite'), "sort_order" = COALESCE("sort_order", 8), "use" = COALESCE("use", NULL) WHERE "name" = 'Vite';
--> statement-breakpoint
INSERT INTO "technologies" ("name", "category", "icon", "use", "sort_order")
SELECT 'TanStack', 'Frontend', 'tanstack', NULL, 9
WHERE NOT EXISTS (SELECT 1 FROM "technologies" WHERE "name" = 'TanStack');
--> statement-breakpoint
UPDATE "technologies" SET "category" = COALESCE("category", 'Frontend'), "icon" = COALESCE("icon", 'tanstack'), "sort_order" = COALESCE("sort_order", 9), "use" = COALESCE("use", NULL) WHERE "name" = 'TanStack';
--> statement-breakpoint
INSERT INTO "technologies" ("name", "category", "icon", "use", "sort_order")
SELECT 'Next.js', 'Backend', 'nextdotjs', NULL, 10
WHERE NOT EXISTS (SELECT 1 FROM "technologies" WHERE "name" = 'Next.js');
--> statement-breakpoint
UPDATE "technologies" SET "category" = COALESCE("category", 'Backend'), "icon" = COALESCE("icon", 'nextdotjs'), "sort_order" = COALESCE("sort_order", 10), "use" = COALESCE("use", NULL) WHERE "name" = 'Next.js';
--> statement-breakpoint
INSERT INTO "technologies" ("name", "category", "icon", "use", "sort_order")
SELECT 'Node.js', 'Backend', 'nodedotjs', NULL, 11
WHERE NOT EXISTS (SELECT 1 FROM "technologies" WHERE "name" = 'Node.js');
--> statement-breakpoint
UPDATE "technologies" SET "category" = COALESCE("category", 'Backend'), "icon" = COALESCE("icon", 'nodedotjs'), "sort_order" = COALESCE("sort_order", 11), "use" = COALESCE("use", NULL) WHERE "name" = 'Node.js';
--> statement-breakpoint
INSERT INTO "technologies" ("name", "category", "icon", "use", "sort_order")
SELECT 'Nest.js', 'Backend', 'nestjs', NULL, 12
WHERE NOT EXISTS (SELECT 1 FROM "technologies" WHERE "name" = 'Nest.js');
--> statement-breakpoint
UPDATE "technologies" SET "category" = COALESCE("category", 'Backend'), "icon" = COALESCE("icon", 'nestjs'), "sort_order" = COALESCE("sort_order", 12), "use" = COALESCE("use", NULL) WHERE "name" = 'Nest.js';
--> statement-breakpoint
INSERT INTO "technologies" ("name", "category", "icon", "use", "sort_order")
SELECT 'Express.js', 'Backend', 'express', NULL, 13
WHERE NOT EXISTS (SELECT 1 FROM "technologies" WHERE "name" = 'Express.js');
--> statement-breakpoint
UPDATE "technologies" SET "category" = COALESCE("category", 'Backend'), "icon" = COALESCE("icon", 'express'), "sort_order" = COALESCE("sort_order", 13), "use" = COALESCE("use", NULL) WHERE "name" = 'Express.js';
--> statement-breakpoint
INSERT INTO "technologies" ("name", "category", "icon", "use", "sort_order")
SELECT 'Fastify', 'Backend', 'fastify', NULL, 14
WHERE NOT EXISTS (SELECT 1 FROM "technologies" WHERE "name" = 'Fastify');
--> statement-breakpoint
UPDATE "technologies" SET "category" = COALESCE("category", 'Backend'), "icon" = COALESCE("icon", 'fastify'), "sort_order" = COALESCE("sort_order", 14), "use" = COALESCE("use", NULL) WHERE "name" = 'Fastify';
--> statement-breakpoint
INSERT INTO "technologies" ("name", "category", "icon", "use", "sort_order")
SELECT 'Laravel', 'Backend', 'laravel', NULL, 15
WHERE NOT EXISTS (SELECT 1 FROM "technologies" WHERE "name" = 'Laravel');
--> statement-breakpoint
UPDATE "technologies" SET "category" = COALESCE("category", 'Backend'), "icon" = COALESCE("icon", 'laravel'), "sort_order" = COALESCE("sort_order", 15), "use" = COALESCE("use", NULL) WHERE "name" = 'Laravel';
--> statement-breakpoint
INSERT INTO "technologies" ("name", "category", "icon", "use", "sort_order")
SELECT 'PHP', 'Backend', 'php', 'Plugin development', 16
WHERE NOT EXISTS (SELECT 1 FROM "technologies" WHERE "name" = 'PHP');
--> statement-breakpoint
UPDATE "technologies" SET "category" = COALESCE("category", 'Backend'), "icon" = COALESCE("icon", 'php'), "sort_order" = COALESCE("sort_order", 16), "use" = COALESCE("use", 'Plugin development') WHERE "name" = 'PHP';
--> statement-breakpoint
INSERT INTO "technologies" ("name", "category", "icon", "use", "sort_order")
SELECT 'Rust', 'Backend', 'rust', NULL, 17
WHERE NOT EXISTS (SELECT 1 FROM "technologies" WHERE "name" = 'Rust');
--> statement-breakpoint
UPDATE "technologies" SET "category" = COALESCE("category", 'Backend'), "icon" = COALESCE("icon", 'rust'), "sort_order" = COALESCE("sort_order", 17), "use" = COALESCE("use", NULL) WHERE "name" = 'Rust';
--> statement-breakpoint
INSERT INTO "technologies" ("name", "category", "icon", "use", "sort_order")
SELECT 'GraphQL', 'Backend', 'graphql', NULL, 18
WHERE NOT EXISTS (SELECT 1 FROM "technologies" WHERE "name" = 'GraphQL');
--> statement-breakpoint
UPDATE "technologies" SET "category" = COALESCE("category", 'Backend'), "icon" = COALESCE("icon", 'graphql'), "sort_order" = COALESCE("sort_order", 18), "use" = COALESCE("use", NULL) WHERE "name" = 'GraphQL';
--> statement-breakpoint
INSERT INTO "technologies" ("name", "category", "icon", "use", "sort_order")
SELECT 'REST APIs', 'Backend', NULL, NULL, 19
WHERE NOT EXISTS (SELECT 1 FROM "technologies" WHERE "name" = 'REST APIs');
--> statement-breakpoint
UPDATE "technologies" SET "category" = COALESCE("category", 'Backend'), "icon" = COALESCE("icon", NULL), "sort_order" = COALESCE("sort_order", 19), "use" = COALESCE("use", NULL) WHERE "name" = 'REST APIs';
--> statement-breakpoint
INSERT INTO "technologies" ("name", "category", "icon", "use", "sort_order")
SELECT 'PostgreSQL', 'Database', 'postgresql', NULL, 20
WHERE NOT EXISTS (SELECT 1 FROM "technologies" WHERE "name" = 'PostgreSQL');
--> statement-breakpoint
UPDATE "technologies" SET "category" = COALESCE("category", 'Database'), "icon" = COALESCE("icon", 'postgresql'), "sort_order" = COALESCE("sort_order", 20), "use" = COALESCE("use", NULL) WHERE "name" = 'PostgreSQL';
--> statement-breakpoint
INSERT INTO "technologies" ("name", "category", "icon", "use", "sort_order")
SELECT 'MySQL', 'Database', 'mysql', NULL, 21
WHERE NOT EXISTS (SELECT 1 FROM "technologies" WHERE "name" = 'MySQL');
--> statement-breakpoint
UPDATE "technologies" SET "category" = COALESCE("category", 'Database'), "icon" = COALESCE("icon", 'mysql'), "sort_order" = COALESCE("sort_order", 21), "use" = COALESCE("use", NULL) WHERE "name" = 'MySQL';
--> statement-breakpoint
INSERT INTO "technologies" ("name", "category", "icon", "use", "sort_order")
SELECT 'Prisma', 'Database', 'prisma', NULL, 22
WHERE NOT EXISTS (SELECT 1 FROM "technologies" WHERE "name" = 'Prisma');
--> statement-breakpoint
UPDATE "technologies" SET "category" = COALESCE("category", 'Database'), "icon" = COALESCE("icon", 'prisma'), "sort_order" = COALESCE("sort_order", 22), "use" = COALESCE("use", NULL) WHERE "name" = 'Prisma';
--> statement-breakpoint
INSERT INTO "technologies" ("name", "category", "icon", "use", "sort_order")
SELECT 'Drizzle ORM', 'Database', 'drizzle', NULL, 23
WHERE NOT EXISTS (SELECT 1 FROM "technologies" WHERE "name" = 'Drizzle ORM');
--> statement-breakpoint
UPDATE "technologies" SET "category" = COALESCE("category", 'Database'), "icon" = COALESCE("icon", 'drizzle'), "sort_order" = COALESCE("sort_order", 23), "use" = COALESCE("use", NULL) WHERE "name" = 'Drizzle ORM';
--> statement-breakpoint
INSERT INTO "technologies" ("name", "category", "icon", "use", "sort_order")
SELECT 'Redis', 'Database', 'redis', NULL, 24
WHERE NOT EXISTS (SELECT 1 FROM "technologies" WHERE "name" = 'Redis');
--> statement-breakpoint
UPDATE "technologies" SET "category" = COALESCE("category", 'Database'), "icon" = COALESCE("icon", 'redis'), "sort_order" = COALESCE("sort_order", 24), "use" = COALESCE("use", NULL) WHERE "name" = 'Redis';
--> statement-breakpoint
INSERT INTO "technologies" ("name", "category", "icon", "use", "sort_order")
SELECT 'Docker', 'Cloud & Tools', 'docker', NULL, 25
WHERE NOT EXISTS (SELECT 1 FROM "technologies" WHERE "name" = 'Docker');
--> statement-breakpoint
UPDATE "technologies" SET "category" = COALESCE("category", 'Cloud & Tools'), "icon" = COALESCE("icon", 'docker'), "sort_order" = COALESCE("sort_order", 25), "use" = COALESCE("use", NULL) WHERE "name" = 'Docker';
--> statement-breakpoint
INSERT INTO "technologies" ("name", "category", "icon", "use", "sort_order")
SELECT 'DigitalOcean', 'Cloud & Tools', 'digitalocean', NULL, 26
WHERE NOT EXISTS (SELECT 1 FROM "technologies" WHERE "name" = 'DigitalOcean');
--> statement-breakpoint
UPDATE "technologies" SET "category" = COALESCE("category", 'Cloud & Tools'), "icon" = COALESCE("icon", 'digitalocean'), "sort_order" = COALESCE("sort_order", 26), "use" = COALESCE("use", NULL) WHERE "name" = 'DigitalOcean';
--> statement-breakpoint
INSERT INTO "technologies" ("name", "category", "icon", "use", "sort_order")
SELECT 'Amazon EC2', 'Cloud & Tools', NULL, NULL, 27
WHERE NOT EXISTS (SELECT 1 FROM "technologies" WHERE "name" = 'Amazon EC2');
--> statement-breakpoint
UPDATE "technologies" SET "category" = COALESCE("category", 'Cloud & Tools'), "icon" = COALESCE("icon", NULL), "sort_order" = COALESCE("sort_order", 27), "use" = COALESCE("use", NULL) WHERE "name" = 'Amazon EC2';
--> statement-breakpoint
INSERT INTO "technologies" ("name", "category", "icon", "use", "sort_order")
SELECT 'VPS Management', 'Cloud & Tools', NULL, NULL, 28
WHERE NOT EXISTS (SELECT 1 FROM "technologies" WHERE "name" = 'VPS Management');
--> statement-breakpoint
UPDATE "technologies" SET "category" = COALESCE("category", 'Cloud & Tools'), "icon" = COALESCE("icon", NULL), "sort_order" = COALESCE("sort_order", 28), "use" = COALESCE("use", NULL) WHERE "name" = 'VPS Management';
--> statement-breakpoint
INSERT INTO "technologies" ("name", "category", "icon", "use", "sort_order")
SELECT 'BullMQ', 'Cloud & Tools', NULL, NULL, 29
WHERE NOT EXISTS (SELECT 1 FROM "technologies" WHERE "name" = 'BullMQ');
--> statement-breakpoint
UPDATE "technologies" SET "category" = COALESCE("category", 'Cloud & Tools'), "icon" = COALESCE("icon", NULL), "sort_order" = COALESCE("sort_order", 29), "use" = COALESCE("use", NULL) WHERE "name" = 'BullMQ';
--> statement-breakpoint
INSERT INTO "technologies" ("name", "category", "icon", "use", "sort_order")
SELECT 'S3/R2', 'Cloud & Tools', NULL, NULL, 30
WHERE NOT EXISTS (SELECT 1 FROM "technologies" WHERE "name" = 'S3/R2');
--> statement-breakpoint
UPDATE "technologies" SET "category" = COALESCE("category", 'Cloud & Tools'), "icon" = COALESCE("icon", NULL), "sort_order" = COALESCE("sort_order", 30), "use" = COALESCE("use", NULL) WHERE "name" = 'S3/R2';
--> statement-breakpoint
INSERT INTO "technologies" ("name", "category", "icon", "use", "sort_order")
SELECT 'Vercel', 'Cloud & Tools', 'vercel', NULL, 31
WHERE NOT EXISTS (SELECT 1 FROM "technologies" WHERE "name" = 'Vercel');
--> statement-breakpoint
UPDATE "technologies" SET "category" = COALESCE("category", 'Cloud & Tools'), "icon" = COALESCE("icon", 'vercel'), "sort_order" = COALESCE("sort_order", 31), "use" = COALESCE("use", NULL) WHERE "name" = 'Vercel';
--> statement-breakpoint
INSERT INTO "technologies" ("name", "category", "icon", "use", "sort_order")
SELECT 'Cloudflare', 'Cloud & Tools', 'cloudflare', NULL, 32
WHERE NOT EXISTS (SELECT 1 FROM "technologies" WHERE "name" = 'Cloudflare');
--> statement-breakpoint
UPDATE "technologies" SET "category" = COALESCE("category", 'Cloud & Tools'), "icon" = COALESCE("icon", 'cloudflare'), "sort_order" = COALESCE("sort_order", 32), "use" = COALESCE("use", NULL) WHERE "name" = 'Cloudflare';
--> statement-breakpoint
INSERT INTO "technologies" ("name", "category", "icon", "use", "sort_order")
SELECT 'WordPress', 'CMS & E-commerce', 'wordpress', NULL, 33
WHERE NOT EXISTS (SELECT 1 FROM "technologies" WHERE "name" = 'WordPress');
--> statement-breakpoint
UPDATE "technologies" SET "category" = COALESCE("category", 'CMS & E-commerce'), "icon" = COALESCE("icon", 'wordpress'), "sort_order" = COALESCE("sort_order", 33), "use" = COALESCE("use", NULL) WHERE "name" = 'WordPress';
--> statement-breakpoint
INSERT INTO "technologies" ("name", "category", "icon", "use", "sort_order")
SELECT 'WooCommerce', 'CMS & E-commerce', 'woocommerce-w', NULL, 34
WHERE NOT EXISTS (SELECT 1 FROM "technologies" WHERE "name" = 'WooCommerce');
--> statement-breakpoint
UPDATE "technologies" SET "category" = COALESCE("category", 'CMS & E-commerce'), "icon" = COALESCE("icon", 'woocommerce-w'), "sort_order" = COALESCE("sort_order", 34), "use" = COALESCE("use", NULL) WHERE "name" = 'WooCommerce';
--> statement-breakpoint
INSERT INTO "technologies" ("name", "category", "icon", "use", "sort_order")
SELECT 'Shopify', 'CMS & E-commerce', 'shopify', NULL, 35
WHERE NOT EXISTS (SELECT 1 FROM "technologies" WHERE "name" = 'Shopify');
--> statement-breakpoint
UPDATE "technologies" SET "category" = COALESCE("category", 'CMS & E-commerce'), "icon" = COALESCE("icon", 'shopify'), "sort_order" = COALESCE("sort_order", 35), "use" = COALESCE("use", NULL) WHERE "name" = 'Shopify';
--> statement-breakpoint
INSERT INTO "technologies" ("name", "category", "icon", "use", "sort_order")
SELECT 'System Design', 'Concepts', NULL, NULL, 36
WHERE NOT EXISTS (SELECT 1 FROM "technologies" WHERE "name" = 'System Design');
--> statement-breakpoint
UPDATE "technologies" SET "category" = COALESCE("category", 'Concepts'), "icon" = COALESCE("icon", NULL), "sort_order" = COALESCE("sort_order", 36), "use" = COALESCE("use", NULL) WHERE "name" = 'System Design';
--> statement-breakpoint
INSERT INTO "technologies" ("name", "category", "icon", "use", "sort_order")
SELECT 'Better Auth', 'Auth', 'betterauth', NULL, 37
WHERE NOT EXISTS (SELECT 1 FROM "technologies" WHERE "name" = 'Better Auth');
--> statement-breakpoint
UPDATE "technologies" SET "category" = COALESCE("category", 'Auth'), "icon" = COALESCE("icon", 'betterauth'), "sort_order" = COALESCE("sort_order", 37), "use" = COALESCE("use", NULL) WHERE "name" = 'Better Auth';
--> statement-breakpoint
INSERT INTO "technologies" ("name", "category", "icon", "use", "sort_order")
SELECT 'Clerk', 'Auth', 'clerk', NULL, 38
WHERE NOT EXISTS (SELECT 1 FROM "technologies" WHERE "name" = 'Clerk');
--> statement-breakpoint
UPDATE "technologies" SET "category" = COALESCE("category", 'Auth'), "icon" = COALESCE("icon", 'clerk'), "sort_order" = COALESCE("sort_order", 38), "use" = COALESCE("use", NULL) WHERE "name" = 'Clerk';
--> statement-breakpoint
INSERT INTO "technologies" ("name", "category", "icon", "use", "sort_order")
SELECT 'Firebase', 'Auth', 'firebase', NULL, 39
WHERE NOT EXISTS (SELECT 1 FROM "technologies" WHERE "name" = 'Firebase');
--> statement-breakpoint
UPDATE "technologies" SET "category" = COALESCE("category", 'Auth'), "icon" = COALESCE("icon", 'firebase'), "sort_order" = COALESCE("sort_order", 39), "use" = COALESCE("use", NULL) WHERE "name" = 'Firebase';
--> statement-breakpoint
INSERT INTO "technologies" ("name", "category", "icon", "use", "sort_order")
SELECT 'Supabase', 'Auth', 'supabase', NULL, 40
WHERE NOT EXISTS (SELECT 1 FROM "technologies" WHERE "name" = 'Supabase');
--> statement-breakpoint
UPDATE "technologies" SET "category" = COALESCE("category", 'Auth'), "icon" = COALESCE("icon", 'supabase'), "sort_order" = COALESCE("sort_order", 40), "use" = COALESCE("use", NULL) WHERE "name" = 'Supabase';
--> statement-breakpoint
INSERT INTO "technologies" ("name", "category", "icon", "use", "sort_order")
SELECT 'OAuth', 'Auth', NULL, NULL, 41
WHERE NOT EXISTS (SELECT 1 FROM "technologies" WHERE "name" = 'OAuth');
--> statement-breakpoint
UPDATE "technologies" SET "category" = COALESCE("category", 'Auth'), "icon" = COALESCE("icon", NULL), "sort_order" = COALESCE("sort_order", 41), "use" = COALESCE("use", NULL) WHERE "name" = 'OAuth';
--> statement-breakpoint
INSERT INTO "technologies" ("name", "category", "icon", "use", "sort_order")
SELECT 'Auth0', 'Auth', 'auth0', NULL, 42
WHERE NOT EXISTS (SELECT 1 FROM "technologies" WHERE "name" = 'Auth0');
--> statement-breakpoint
UPDATE "technologies" SET "category" = COALESCE("category", 'Auth'), "icon" = COALESCE("icon", 'auth0'), "sort_order" = COALESCE("sort_order", 42), "use" = COALESCE("use", NULL) WHERE "name" = 'Auth0';
--> statement-breakpoint
INSERT INTO "technologies" ("name", "category", "icon", "use", "sort_order")
SELECT 'Auth.js', 'Auth', NULL, NULL, 43
WHERE NOT EXISTS (SELECT 1 FROM "technologies" WHERE "name" = 'Auth.js');
--> statement-breakpoint
UPDATE "technologies" SET "category" = COALESCE("category", 'Auth'), "icon" = COALESCE("icon", NULL), "sort_order" = COALESCE("sort_order", 43), "use" = COALESCE("use", NULL) WHERE "name" = 'Auth.js';
--> statement-breakpoint
INSERT INTO "technologies" ("name", "category", "icon", "use", "sort_order")
SELECT 'Passport', 'Auth', 'passport', NULL, 44
WHERE NOT EXISTS (SELECT 1 FROM "technologies" WHERE "name" = 'Passport');
--> statement-breakpoint
UPDATE "technologies" SET "category" = COALESCE("category", 'Auth'), "icon" = COALESCE("icon", 'passport'), "sort_order" = COALESCE("sort_order", 44), "use" = COALESCE("use", NULL) WHERE "name" = 'Passport';
