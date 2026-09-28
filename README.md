# Free Crochet Bags — Crochet pattern site

A crochet pattern site built with **Astro** and hosted on **Cloudflare Workers**, using **D1** (database) and **KV** (cache).
The design is inspired by madewithsally.com, with a calm sage, oat and clay palette and a simple home feed.

## Stack

| Part | Use |
|---|---|
| Astro 5 + `@astrojs/cloudflare` | Server-rendered pages |
| D1 (`DB`) | Patterns, newsletter subscribers, contact messages |
| KV (`CACHE`) | Query cache (5 min) + Astro sessions; cleared automatically when you save from the admin page |
| Secret `ADMIN_TOKEN` | Protects `/admin` and `/api/admin/*` |

Allowed categories are defined in [`src/lib/site.ts`](src/lib/site.ts), and the API rejects any other category.
The site has **no animal-photography or nudity categories**.

---

## Running locally

Requires **Node.js 20+**: https://nodejs.org

```bash
npm install
cp .dev.vars.example .dev.vars          # then change ADMIN_TOKEN (at least 16 characters)
npm run db:migrate:local
npm run db:seed:local
npm run dev                              # http://localhost:4321
```

## First deploy to Cloudflare

```bash
npx wrangler login
npx wrangler d1 create freecrochetbags-db                # copy database_id into wrangler.jsonc
npx wrangler kv namespace create CACHE            # copy id into wrangler.jsonc
npx wrangler secret put ADMIN_TOKEN               # enter a long random token
npm run db:migrate:remote
npm run db:seed:remote                            # optional: sample patterns
npm run deploy
```

Afterwards, change `site` in [`astro.config.mjs`](astro.config.mjs) to your real domain.

## Automatic deploys from GitHub

1. Create a **private** repo and push the project.
2. In **Settings → Secrets and variables → Actions**, add:
   - `CLOUDFLARE_API_TOKEN` (permissions: Workers Scripts Edit, D1 Edit, Workers KV Storage Edit)
   - `CLOUDFLARE_ACCOUNT_ID`
3. Every push to `main` applies migrations and deploys automatically ([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)).

## Adding patterns

Open `/admin`, enter your `ADMIN_TOKEN`, and add or edit patterns. Pattern content is written in Markdown.
Images: put them in `public/images/patterns/`, or use an `https://` URL (for example from Cloudflare R2 or Images).

> The images in `public/images/patterns` are placeholder SVG illustrations. Replace them with real photos of your work.

## Writing guide (beginners + SEO)

The "Insert beginner template" button on the admin page fills in this structure:

1. **Title**: main keyword + a benefit, about 60 characters max, e.g. `Easy Crochet ___ Pattern for Beginners`.
2. **Short description**: 120–160 characters, includes the keyword. This is the meta description Google shows (the admin page counts the characters).
3. **Intro**: the keyword in the first sentence, and who the pattern is for.
4. **H2 sections**: Why You'll Love It, Abbreviations (explained), Size & Gauge, Step-by-Step, Beginner Tips, Common Mistakes, FAQ. These build the table of contents automatically.
5. **Stitch counts** at the end of each row or round, e.g. `**(24 sc)**`, plus a "What's happening?" note that explains the step.
6. **`## FAQ`** with each question as `### Question?` automatically becomes FAQPage structured data.
7. **Internal links** at the end: to the category and to one related pattern.
8. **Image alt text** that describes the image and naturally includes the keyword.

## Project structure

```
src/
  lib/site.ts        site name + allowed categories
  lib/db.ts          D1 queries + KV cache
  styles/global.css  colors & design tokens
  pages/index.astro  home page (hero + categories + simple feed)
  pages/pattern/[slug].astro
  pages/category/[slug].astro
  pages/patterns/index.astro   (search + pagination)
  pages/admin/index.astro
migrations/          D1 schema
seed/seed.sql        12 sample patterns
```
