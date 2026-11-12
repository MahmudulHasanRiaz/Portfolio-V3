# Image Optimization Guide — Portfolio-Public

> **Kono manual optimize step lagbe na.** Admin panel theke image add
> korlei optimization AUTOMATIC hoy — kono resize, kono convert, kono
> rebuild, kono alada upload step na. Ei doc-e lekha niyom-gulo shudhu
> **ki size/format-e upload korle shobcheye valo fol pawa jay** seta
> bojhar jonno; niyom na manleo site slow hobe na, shudhu file-ta
> ojotha boro thakte pare.

## Kivabe kaj kore (3 ta rasta, ektai niyom: kokhono original bodlay na)

| Image kotha theke ashe | Ki hoy | Kothay |
| --- | --- | --- |
| **Local asset** (`public/`, jemon `speaker.jpg`) | Build-time Sharp: AVIF/WebP + srcset, quality 75 | `astro:assets` `<Picture>` |
| **Admin remote image** (`https://files.riaz.com.bd/*`) | On-demand `/api/image` Worker route: prothom request-e Cloudflare Images binding diye transform (AVIF/WebP, quality 75), tarpor edge cache-e thake | `src/pages/api/image.ts` + `src/lib/images.ts` |
| **Unsplash** (`images.unsplash.com`) | URL-er `w=` parameter rewrite (q=75) — Unsplash nijer server-e resize kore | `src/lib/images.ts` (`unsplashSrcset`) |
| **Onno kichu** (YouTube thumb, Simple Icons CDN, onno host) | **Kichui hoy na** — original URL jemon ache temon-i jay | — |

### `/api/image` route-ta ki kore

`GET /api/image?u=<encoded remote URL>&w=<width>`

- **Allowlist (STRICT):** shudhu `https://files.riaz.com.bd/*` fetch/transform
  hoy. Onno origin-er URL kokhono proxy hoy na — valo URL hole 302
  redirect original-e, kharap URL hole 400. Eta na thakle jekeo amader
  transform quota diye jekono image optimize korte parto (open proxy).
- **Width whitelist:** `360, 480, 720, 800, 1024, 1200, 1600, 2048`.
  Onno width chaile nearest whitelist-e clamp hoy. Width kom rakhte
  hoy karon prottek width = alada unique transformation.
- **Format auto:** browser-er `Accept` header dekhe AVIF → WebP → JPEG
  bechhe ney (`Vary: Accept` set kora thake).
- **Quality 75, kokhono upscale na:** transform-e `fit: "scale-down"`
  — chhoto image-ke boro kora hoy na (boro korle ghola hoto), ar
  quality 75-e display size-e original-er sathe visibly kono parthokko
  thake na. Aggressive compression kora hoy NA.
- **Kokhono error page na:** fetch fail, non-image response, SVG,
  binding missing, transform error, ba quota shesh (9422) — shob
  khetrei 302 redirect original URL-e. Visitor shob somoy image-ta
  dekhte pay — kharap hole unoptimized, kintu kokhono vangga na.
- **Cache:** `Cache-Control: public, max-age=86400,
  stale-while-revalidate=86400` — transform kora image edge-e 1 din
  thake; eki transform bar bar count hoy na.
- **Fallback chain:** Images binding (`env.IMAGES`, `wrangler.jsonc`-e
  declare kora) → na thakle fetch-time `cf.image` option → na hole
  original-e redirect. Local `wrangler dev` / `astro dev`-e
  low-fidelity mock dey — **asol transform deploy korei test korte
  hoy**, local-e shudhu URL-ta thik ache kina dekha jay.

### Quota (Cloudflare Images, free tier)

Prothom **5,000 unique transformation/month free**, tarpor Paid plan-e
$0.50 / 1,000. "Unique" mane 1 original + 1 option-set; eki transform
lokkho bar request korleo 1 bar count hoy. Amader scale (koyek dozen
image × 2–3 width = koyeksho/month) limit-er onek niche. Limit par
hole charge hoy na — notun transform 9422 dey, ar route tokhon
original-e redirect kore.

### Kothay kothay automatic (shob cover kora)

- **Hero portrait** (`Hero.astro`) — **INTENTIONALLY STATIC, /api/image
  na, live swap-o na** (LCP exception): build-time Sharp `<Picture>`
  (`public/speaker.jpg` theke, AVIF/WebP, widths 352/576/704/1068).
  PageSpeed 2026-11-10: hero-ke /api/image diye serve korle mobile
  100→98 regression hoyechilo (dynamic route cold hit-e slow, ar
  post-load swap LCP element-ta abar paint koray). Notun portrait
  chaile `public/speaker.jpg` bodle deploy korte hoy.
- **Project / venture / post / case-study / release thumbnail** —
  card (`ThumbImage.astro`), carousel (`ProjectsCarousel.tsx`),
  detail hero (5 twin component + 10 static page) — shob jaygay.
- **Gallery image** (`DetailMedia.astro`) — slider + grid, duitai.
- **Video poster** (`DetailVideoFacade.astro`) — facade `<img>` + tap-er
  por `<video poster>`, duitai.
- **Post-er vitore inline image** — duita rasta:
  - *Live entry* (admin theke asa `content` string — notun post je
    pothe ashe): `parseBodyBlocks` (`src/lib/detail.ts`)-e
    standalone `![alt](url)` line `img` block hoy, `MarkdownBody.astro`
    optimized `<img>` render kore. Paragraph-er vitore image syntax
    (age/pore text thakle) literal text-i thake — shudhu alada line-er
    image-i render hoy. (Age live body-te image syntax literal text
    hishebe dekha jeto — ekhon theke sheta ashol image hoye render
    hobe.)
  - *Build-time markdown* (`src/content/*.md` → `<Content />`):
    **cover kora hoy NA** — Astro 7-er default Sätteri processor-e
    rehype/remark plugin-er kono hook nai; plugin lagate hole puro
    site-er markdown processor bodle legacy `@astrojs/markdown-remark`
    (`unified`) korte hoto, jeta shob markdown rendering bodle dito.
    Ajke kono build-time entry-te inline image nai (verify kora),
    tai ekhane kichui unoptimized na. Future-e build-time markdown-e
    image lagle: hoy entry-ta live content hishebe anbe (tokhon
    uporer live path-ei optimize hobe), na hoy alada ekta PR-e
    `unified` processor + rehype plugin-er switch ta review kore
    korte hobe.
- **Client logo** (`ClientsWall.astro`) — width 144 (route-er minimum
  360-e clamp hoy; 36px display-er jonno etai jothesto).
- **Release cover / og:image / JSON-LD image** — detail page-er
  `coverImage` theke `og:image` + JSON-LD `image`/`thumbnailUrl`
  (width 1200), ar `Layout.astro`-te portrait fallback og:image.
  Crawler-ra optimized URL fetch kore; fail hole 302-e original pay.
- **Touch kora hoy NA:** local `<Picture>` (Sharp), Unsplash `w=`
  srcset, YouTube `hqdefault` thumb, Simple Icons / sprite icon,
  video file (`<video src>`), author photo (`/speaker.jpg`, local).

## Content add korar somoy ki mante hobe (proti type)

Original file **kokhono overwrite/delete koro na** — route + helper
soralei site ager plain URL-e fire jay (reversible). Upload-er somoy
shudhu ei recommended size/format gulo mathay rakho:

| Type | Display size | Recommended upload | Route ki dey |
| --- | --- | --- | --- |
| **Hero portrait** | 352px mobile / 412px desktop | JPEG/WebP, **1280px proshosto** porjonto, portrait 4:5, ≤ 500KB — file-ta `public/speaker.jpg` (repo) bodle deploy koro; admin portraitUrl hero-te use hoy na (og:image-te hoy) | build-time Sharp srcset 352 / 576 / 704 / 1068, AVIF/WebP, q75 — **/api/image na** |
| **Thumbnail** (project / venture / post / case-study / release) | 360px card / 1088px detail hero | JPEG/WebP, **1600px proshosto** porjonto, 16:10 ba 4:3, ≤ 500KB | card srcset 360 / 720 / 1024; hero srcset 800 / 1200 |
| **Gallery image** | ~720px | JPEG/WebP, **1600px proshosto** porjonto, ≤ 500KB | src 800, srcset 360 / 720 / 1024 |
| **Post-er vitore inline image** | ~720px column | JPEG/WebP, **1600px proshosto** porjonto, ≤ 500KB; markdown-e **alada line-e** `![alt text](url)` likho | src 1024, srcset 360 / 720 / 1024, lazy |
| **Client logo** | 36px | PNG (transparent) ba SVG, **512px proshosto** porjonto, ≤ 100KB | width 360 (minimum) |
| **Release cover** | 480×360 card / 1088px detail | JPEG/WebP, **1600px proshosto** porjonto, ≤ 500KB | hero srcset 800 / 1200; og:image 1200 |
| **og:image** (detail cover thekei ase) | 1200px | Alada kore kichu korte hoy na — cover image-i use hoy | width 1200 |

**Format:** JPEG ba WebP upload koro. PNG shudhu logo/transparency
lagle (photo PNG hole file boro hoy). **SVG resize hoy na** — SVG
upload korle route original-i serve kore (redirect), kono khoti nai.
**AVIF input** hishebe upload koro na (Cloudflare AVIF input
Enterprise-only; AVIF *output* automatic). **Max file size:** remote
source-er limit 100MB, kintu bastobe 500KB-er upore upload koro na —
boro original mane prothom transform slow + storage noshto; display
size-er kachakachi width-e upload korai valo.

**Admin UI hint-er sathe birodh nai:** admin-e image field-e jekono
valid image URL dilei hobe — optimization site-er dik theke automatic;
admin-e kono alada "optimize" button ba step nai, ar lagbeo na.

## Reversibility (rollback)

Ekta revert-ei ager obosthay fera jay: `src/pages/api/image.ts` +
`src/lib/images.ts`-er helper + wiring sorale plain original URL-e
fera jay. Original file RustFS-e untouched thake — route kokhono
original-e lekhe na. `wrangler.jsonc`-er `images` binding ar
`astro.config.mjs`-er rehype plugin soraleo kichu vange na.
