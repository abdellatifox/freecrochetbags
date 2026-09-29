# Free Crochet Bags — Crochet pattern site

A crochet pattern site built with **Astro** and hosted on **Cloudflare Workers**.
Patterns are **Markdown files** in `src/content/patterns/`, published by ContentOps; every content page is
**prerendered to static HTML** at build time. The Worker only handles the newsletter/contact forms, 404s and redirects.

## Stack

| Part | Use |
|---|---|
| Astro 5 + `@astrojs/cloudflare` | Static pages (`prerender = true`) + a tiny Worker for `/api/*` |
| `src/content/patterns/*.md` | **The only source of patterns** (content collection, schema in `src/content.config.ts`) |
| D1 (`DB`) | Newsletter subscribers + contact messages (the old `patterns` table is kept but no longer read) |
| `scripts/build-images.mjs` | Pre-build image optimisation (WebP sizes + JPG social image) |
| `src/worker.ts` | 301 redirects: `/pattern/<slug>` → `/patterns/<slug>`, trailing slash → none |

Categories live in [`src/lib/site.ts`](src/lib/site.ts). ContentOps category names are mapped onto them in
[`src/lib/patterns.ts`](src/lib/patterns.ts) (`baby-kids` → `baby-items`).

---

## ContentOps contract

ContentOps commits straight to `main`:

- Article: `src/content/patterns/<slug>.md` → published at `https://freecrochetbags.com/patterns/<slug>`
- Cover: `public/images/patterns/<slug>.jpg|png|webp` (committed first)
- Optional second image: `public/images/patterns/<slug>-2.<ext>`, referenced as a normal Markdown image in the body
- Frontmatter: see [`src/content/patterns/example-contentops-pattern.md`](src/content/patterns/example-contentops-pattern.md)
  (a `draft: true` example). `draft: true` files get no page and never appear in lists, the sitemap, RSS or search.

Every push to `main` rebuilds and deploys the site (GitHub Actions).

## Images

Astro doesn't optimise files in `public/`, so `npm run build` first runs `scripts/build-images.mjs`, which reads
`public/images/**` and writes, without touching the originals or their paths:

- `public/_img/…/<name>-400|800|1200.webp` → `srcset` with `width`/`height` on every `<img>`
- `public/_img/…/<name>-og.jpg` (1000–1200px) → `og:image`, Pinterest, JSON-LD
- `src/generated/images.json` → dimensions manifest used by the pages

Both outputs are git-ignored and cached in CI; unchanged images are skipped.

## Pinterest

- Every pattern page has full Open Graph tags (`og:type=article`, image + dimensions, `article:published_time`) for Rich Pins.
- Domain verification: put the code from Pinterest into `pinterestVerify` in [`src/lib/site.ts`](src/lib/site.ts);
  the `<meta name="p:domain_verify">` tag is then added to every page.
- `/rss.xml` lists the latest patterns (Pinterest can auto-pin from it).

---

## Running locally

Requires **Node.js 20+**.

```bash
npm install
npm run db:migrate:local
npm run dev                              # http://localhost:4321
npm run preview                          # build, then serve the real Worker + assets with wrangler
```

## Automatic deploys from GitHub

In **Settings → Secrets and variables → Actions**, add `CLOUDFLARE_API_TOKEN` (Workers Scripts Edit, D1 Edit) and
`CLOUDFLARE_ACCOUNT_ID`. Every push to `main` applies D1 migrations and deploys
([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)).

## Moving patterns out of D1

`scripts/d1-to-md.mjs` turns a D1 export of the legacy `patterns` table into Markdown files with the same slugs:

```bash
npx wrangler d1 execute freecrochetbags-db --remote --json --command "SELECT * FROM patterns" > patterns.json
npm run patterns:from-d1 -- patterns.json
```

> The 12 sample patterns (and their placeholder SVG images) were migrated this way. Replace them with real photos of your work.

## Writing guide (beginners + SEO)

1. **Title**: main keyword + a benefit, about 60 characters max, e.g. `Easy Crochet ___ Pattern for Beginners`.
2. **Excerpt**: 120–160 characters, includes the keyword. This is the meta description Google shows (unless `seoDescription` is set).
3. **Intro**: the keyword in the first sentence, and who the pattern is for.
4. **H2 sections**: Why You'll Love It, Abbreviations (explained), Size & Gauge, Step-by-Step, Beginner Tips, Common Mistakes, FAQ. These build the table of contents automatically.
5. **Stitch counts** at the end of each row or round, e.g. `**(24 sc)**`, plus a "What's happening?" note that explains the step.
6. **`## FAQ`** with each question as `### Question?` automatically becomes FAQPage structured data.
7. **Internal links** at the end: to the category and to one related pattern.
8. **Image alt text** that describes the image and naturally includes the keyword.

## Project structure

```
src/
  content/patterns/*.md        the patterns (ContentOps writes here)
  content.config.ts            frontmatter schema
  lib/patterns.ts              loading, category/difficulty mapping, drafts, dates
  lib/images.ts                optimised image lookups (manifest from scripts/build-images.mjs)
  lib/content.ts               Markdown rendering (TOC, FAQ schema, responsive images)
  lib/site.ts                  site name, categories, Pinterest verification code
  worker.ts                    Worker entry: 301 redirects, then Astro
  pages/patterns/[slug].astro  pattern page
  pages/patterns/index.astro   all patterns (+ client-side search) · page/[page].astro for page 2+
  pages/category/[slug].astro  category page · [slug]/page/[page].astro for page 2+
  pages/api/                   subscribe + contact (the only server-rendered routes)
scripts/                       build-images.mjs, d1-to-md.mjs
migrations/                    D1 schema
```
