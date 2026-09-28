import type { APIRoute } from 'astro';
import { CATEGORIES } from '../lib/site';

export const GET: APIRoute = async ({ locals, site, url }) => {
  const base = (site ?? url).origin;
  const { results } = await locals.runtime.env.DB.prepare(
    'SELECT slug, updated_at FROM patterns WHERE published = 1 ORDER BY published_at DESC',
  ).all<{ slug: string; updated_at: string }>();

  const urls = [
    { loc: '/' },
    { loc: '/patterns' },
    { loc: '/about' },
    { loc: '/contact' },
    { loc: '/privacy' },
    { loc: '/terms' },
    { loc: '/disclaimer' },
    ...CATEGORIES.map((c) => ({ loc: `/category/${c.slug}` })),
    ...results.map((r) => ({ loc: `/pattern/${r.slug}`, lastmod: r.updated_at.slice(0, 10) })),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${base}${u.loc}</loc>${'lastmod' in u && u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`).join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' },
  });
};
