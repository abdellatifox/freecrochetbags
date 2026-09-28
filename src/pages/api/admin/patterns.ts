import type { APIRoute } from 'astro';
import { isCategory, DIFFICULTIES } from '../../../lib/site';
import { listAllForAdmin, purgeCache } from '../../../lib/db';

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

/** Constant-time comparison of the bearer token against the ADMIN_TOKEN secret. */
async function authorized(request: Request, env: Env) {
  const expected = env.ADMIN_TOKEN;
  const given = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  if (!expected || expected.length < 16 || !given) return false;
  const enc = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(given)),
    crypto.subtle.digest('SHA-256', enc.encode(expected)),
  ]);
  const x = new Uint8Array(a);
  const y = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export const GET: APIRoute = async ({ request, locals, url }) => {
  const { env } = locals.runtime;
  if (!(await authorized(request, env))) return json({ error: 'Unauthorized' }, 401);

  const slug = url.searchParams.get('slug');
  if (slug) {
    const row = await env.DB.prepare('SELECT * FROM patterns WHERE slug = ?').bind(slug).first();
    return row ? json(row) : json({ error: 'Not found' }, 404);
  }
  return json(await listAllForAdmin(env));
};

export const POST: APIRoute = async ({ request, locals }) => {
  const { env } = locals.runtime;
  if (!(await authorized(request, env))) return json({ error: 'Unauthorized' }, 401);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const p = {
    slug: str(body.slug, 120).toLowerCase(),
    title: str(body.title, 200),
    excerpt: str(body.excerpt, 400),
    category: str(body.category, 40),
    difficulty: str(body.difficulty, 20) || 'Beginner',
    image: str(body.image, 500),
    image_alt: str(body.image_alt, 200),
    yarn_weight: str(body.yarn_weight, 60),
    hook_size: str(body.hook_size, 60),
    time_needed: str(body.time_needed, 60),
    materials: str(body.materials, 3000),
    content: str(body.content, 100_000),
    published: body.published === false || body.published === 0 ? 0 : 1,
  };

  const errors: string[] = [];
  if (!SLUG_RE.test(p.slug)) errors.push('Slug must be lowercase words separated by dashes.');
  if (!p.title) errors.push('Title is required.');
  // Only the whitelisted categories are accepted (no animal-photo / nudity categories).
  if (!isCategory(p.category)) errors.push('Unknown category.');
  if (!(DIFFICULTIES as readonly string[]).includes(p.difficulty)) errors.push('Unknown difficulty.');
  if (p.image && !/^(\/|https:\/\/)/.test(p.image)) errors.push('Image must be a /path or https:// URL.');
  if (errors.length) return json({ error: errors.join(' ') }, 400);

  await env.DB.prepare(
    `INSERT INTO patterns (slug, title, excerpt, category, difficulty, image, image_alt, yarn_weight, hook_size, time_needed, materials, content, published)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)
     ON CONFLICT(slug) DO UPDATE SET
       title = excluded.title, excerpt = excluded.excerpt, category = excluded.category,
       difficulty = excluded.difficulty, image = excluded.image, image_alt = excluded.image_alt,
       yarn_weight = excluded.yarn_weight, hook_size = excluded.hook_size, time_needed = excluded.time_needed,
       materials = excluded.materials, content = excluded.content, published = excluded.published,
       updated_at = datetime('now')`,
  )
    .bind(
      p.slug, p.title, p.excerpt, p.category, p.difficulty, p.image, p.image_alt,
      p.yarn_weight, p.hook_size, p.time_needed, p.materials, p.content, p.published,
    )
    .run();

  await purgeCache(env);
  return json({ ok: true, slug: p.slug });
};

export const DELETE: APIRoute = async ({ request, locals, url }) => {
  const { env } = locals.runtime;
  if (!(await authorized(request, env))) return json({ error: 'Unauthorized' }, 401);

  const slug = url.searchParams.get('slug') ?? '';
  const res = await env.DB.prepare('DELETE FROM patterns WHERE slug = ?').bind(slug).run();
  await purgeCache(env);
  return json({ ok: true, deleted: res.meta.changes ?? 0 });
};
