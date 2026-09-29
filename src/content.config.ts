import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { CATEGORIES } from './lib/site';

/** Categories ContentOps sends (fixed contract). */
export const CONTENTOPS_CATEGORIES = [
  'accessories',
  'baby-kids',
  'clothing',
  'blankets',
  'footwear',
  'home-decor',
  'seasonal',
] as const;

// Site slugs are accepted too, so hand-written or migrated files can use categories
// ContentOps doesn't know (e.g. bags, scarves, hats-beanies).
const categoryValues = [...new Set([...CONTENTOPS_CATEGORIES, ...CATEGORIES.map((c) => c.slug)])] as [string, ...string[]];

// YAML can turn `yardage: 200` into a number or leave `seoTitle:` as null — accept both
// rather than failing the whole build over one field.
const text = z
  .union([z.string(), z.number()])
  .nullish()
  .transform((v) => (v == null ? '' : String(v).trim()));
const optText = text.transform((v) => v || undefined);
const list = z
  .array(z.union([z.string(), z.number()]))
  .nullish()
  .transform((v) => (v ?? []).map(String).map((s) => s.trim()).filter(Boolean));
const bool = z.boolean().nullish().transform((v) => v ?? false);

/**
 * One Markdown file per pattern: src/content/patterns/<slug>.md, written by ContentOps.
 * The file name is the slug and the URL: /patterns/<slug>.
 */
const patterns = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/patterns' }),
  schema: z.object({
    title: z.string().min(1),
    excerpt: z.string().min(1),
    category: z.enum(categoryValues),
    cover: text,
    publishDate: z.coerce.date(),
    featured: bool,
    draft: bool,
    difficulty: z
      .enum(['beginner', 'easy', 'intermediate', 'advanced'])
      .nullish()
      .transform((v) => v ?? 'beginner'),
    hook: text,
    yarnWeight: text,
    yardage: optText,
    gauge: optText,
    time: optText,
    sizes: list,
    stitches: list,
    materials: list,
    colors: list,
    tags: list,
    seoTitle: optText,
    seoDescription: optText,
  }),
});

export const collections = { patterns };
