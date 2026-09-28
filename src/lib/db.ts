export interface Pattern {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  difficulty: string;
  image: string;
  image_alt: string;
  yarn_weight: string;
  hook_size: string;
  time_needed: string;
  materials: string;
  content: string;
  published: number;
  published_at: string;
  updated_at: string;
}

export type PatternCard = Pick<
  Pattern,
  'slug' | 'title' | 'excerpt' | 'category' | 'difficulty' | 'image' | 'image_alt' | 'published_at'
>;

const CARD_COLUMNS = 'slug, title, excerpt, category, difficulty, image, image_alt, published_at';
const CACHE_PREFIX = 'q:';
const CACHE_TTL = 300; // seconds

/** Read-through KV cache. KV failures never break the page — we just hit D1. */
async function cached<T>(env: Env, key: string, load: () => Promise<T>): Promise<T> {
  const fullKey = CACHE_PREFIX + key;
  try {
    const hit = await env.CACHE.get<T>(fullKey, 'json');
    if (hit !== null) return hit;
  } catch {}
  const value = await load();
  try {
    await env.CACHE.put(fullKey, JSON.stringify(value), { expirationTtl: CACHE_TTL });
  } catch {}
  return value;
}

export async function purgeCache(env: Env) {
  let cursor: string | undefined;
  do {
    const page = await env.CACHE.list({ prefix: CACHE_PREFIX, cursor });
    await Promise.all(page.keys.map((k) => env.CACHE.delete(k.name)));
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
}

export interface ListOptions {
  category?: string;
  q?: string;
  page?: number;
  perPage?: number;
}

export async function listPatterns(env: Env, opts: ListOptions = {}) {
  const page = Math.max(1, opts.page ?? 1);
  const perPage = opts.perPage ?? 12;
  const q = opts.q?.trim().slice(0, 80) ?? '';

  const load = async () => {
    const where = ['published = 1'];
    const binds: unknown[] = [];
    if (opts.category) {
      where.push('category = ?');
      binds.push(opts.category);
    }
    if (q) {
      where.push('(title LIKE ? OR excerpt LIKE ?)');
      binds.push(`%${q}%`, `%${q}%`);
    }
    const whereSql = where.join(' AND ');

    const [rows, count] = await env.DB.batch([
      env.DB.prepare(
        `SELECT ${CARD_COLUMNS} FROM patterns WHERE ${whereSql} ORDER BY published_at DESC LIMIT ? OFFSET ?`,
      ).bind(...binds, perPage, (page - 1) * perPage),
      env.DB.prepare(`SELECT COUNT(*) AS total FROM patterns WHERE ${whereSql}`).bind(...binds),
    ]);

    const total = (count.results[0] as { total: number } | undefined)?.total ?? 0;
    return {
      items: rows.results as PatternCard[],
      total,
      page,
      pages: Math.max(1, Math.ceil(total / perPage)),
    };
  };

  // Searches are too varied to be worth caching.
  if (q) return load();
  return cached(env, `list:${opts.category ?? 'all'}:${page}:${perPage}`, load);
}

export async function getPattern(env: Env, slug: string) {
  return cached(env, `pattern:${slug}`, () =>
    env.DB.prepare('SELECT * FROM patterns WHERE slug = ? AND published = 1').bind(slug).first<Pattern>(),
  );
}

export async function getRelated(env: Env, category: string, excludeSlug: string, limit = 3) {
  return cached(env, `related:${category}:${excludeSlug}`, async () => {
    const { results } = await env.DB.prepare(
      `SELECT ${CARD_COLUMNS} FROM patterns
       WHERE published = 1 AND category = ? AND slug != ?
       ORDER BY published_at DESC LIMIT ?`,
    )
      .bind(category, excludeSlug, limit)
      .all<PatternCard>();
    return results;
  });
}

export async function getCategoryCounts(env: Env) {
  return cached(env, 'category-counts', async () => {
    const { results } = await env.DB.prepare(
      'SELECT category, COUNT(*) AS n FROM patterns WHERE published = 1 GROUP BY category',
    ).all<{ category: string; n: number }>();
    return Object.fromEntries(results.map((r) => [r.category, r.n])) as Record<string, number>;
  });
}

/** Sitemap + admin: every slug, uncached. */
export async function listAllForAdmin(env: Env) {
  const { results } = await env.DB.prepare(
    'SELECT slug, title, category, difficulty, published, published_at, updated_at FROM patterns ORDER BY published_at DESC',
  ).all<Pick<Pattern, 'slug' | 'title' | 'category' | 'difficulty' | 'published' | 'published_at' | 'updated_at'>>();
  return results;
}

export function formatDate(iso: string) {
  const d = new Date(iso.replace(' ', 'T') + (iso.endsWith('Z') ? '' : 'Z'));
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}
