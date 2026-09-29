/**
 * The single source of truth for patterns: Markdown files in src/content/patterns/.
 * Only imported by prerendered pages — pattern text never reaches the Worker bundle.
 */
import { execFileSync } from 'node:child_process';
import { getCollection, type CollectionEntry } from 'astro:content';
import { getCategory, type CategorySlug } from './site';

/** ContentOps category -> site category slug (where the names differ). */
export const CONTENTOPS_CATEGORY_MAP: Record<string, CategorySlug> = {
  'baby-kids': 'baby-items',
};

const DIFFICULTY_LABEL = {
  beginner: 'Beginner',
  easy: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
} as const;

export const PER_PAGE = 12;

type Data = CollectionEntry<'patterns'>['data'];

export interface Pattern extends Omit<Data, 'category' | 'difficulty'> {
  slug: string;
  url: string;
  category: CategorySlug;
  categoryName: string;
  difficulty: (typeof DIFFICULTY_LABEL)[keyof typeof DIFFICULTY_LABEL];
  /** Last change: newest git commit touching the file, never earlier than publishDate. */
  modified: Date;
  body: string;
}

const gitDates = new Map<string, Date | null>();

/** Date of the last commit that touched a file (null if untracked / git unavailable). */
export function gitModified(file: string): Date | null {
  if (!gitDates.has(file)) {
    let date: Date | null = null;
    try {
      const out = execFileSync('git', ['log', '-1', '--format=%cI', '--', file], { encoding: 'utf8' }).trim();
      if (out) date = new Date(out);
    } catch {}
    gitDates.set(file, date);
  }
  return gitDates.get(file) ?? null;
}

function toPattern(entry: CollectionEntry<'patterns'>): Pattern {
  const { data } = entry;
  const category = (CONTENTOPS_CATEGORY_MAP[data.category] ?? data.category) as CategorySlug;
  const committed = entry.filePath ? gitModified(entry.filePath) : null;
  return {
    ...data,
    slug: entry.id,
    url: `/patterns/${entry.id}`,
    category,
    categoryName: getCategory(category)?.name ?? category,
    difficulty: DIFFICULTY_LABEL[data.difficulty],
    modified: committed && committed > data.publishDate ? committed : data.publishDate,
    body: entry.body ?? '',
  };
}

let all: Promise<Pattern[]> | undefined;

/** Every published (non-draft) pattern, newest first. Drafts never leave this function. */
export function getPatterns(): Promise<Pattern[]> {
  all ??= getCollection('patterns', ({ data }) => !data.draft).then((entries) =>
    entries
      .map(toPattern)
      .sort((a, b) => b.publishDate.getTime() - a.publishDate.getTime() || a.title.localeCompare(b.title)),
  );
  return all;
}

export async function getPatternsIn(category: string) {
  return (await getPatterns()).filter((p) => p.category === category);
}

export function pageCount(total: number) {
  return Math.max(1, Math.ceil(total / PER_PAGE));
}

export function pageSlice<T>(items: T[], page: number) {
  return items.slice((page - 1) * PER_PAGE, page * PER_PAGE);
}

/** Newest date among a list (for sitemap lastmod of listing pages). */
export function newest(items: Pattern[]): Date | undefined {
  return items.reduce<Date | undefined>((d, p) => (!d || p.modified > d ? p.modified : d), undefined);
}

export function related(patterns: Pattern[], current: Pattern, limit = 3) {
  return patterns.filter((p) => p.category === current.category && p.slug !== current.slug).slice(0, limit);
}

export function formatDate(d: Date) {
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}
