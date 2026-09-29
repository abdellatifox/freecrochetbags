import type { APIRoute } from 'astro';
import { CATEGORIES } from '../lib/site';
import { getPatterns, gitModified, newest, pageCount, pageSlice, type Pattern } from '../lib/patterns';

export const prerender = true;

const TEXT_PAGES = ['about', 'contact', 'privacy', 'terms', 'disclaimer'];

const later = (...dates: (Date | null | undefined)[]) =>
  dates.reduce<Date | undefined>((a, d) => (d && (!a || d > a) ? d : a), undefined);

/** Every indexable URL, with a real lastmod. Drafts and redirecting URLs never appear here. */
export const GET: APIRoute = async ({ site }) => {
  const base = new URL('/', site).origin;
  const patterns = await getPatterns();
  const urls: { loc: string; lastmod?: Date }[] = [];

  // Listing pages change when a pattern on them changes (or when the template does).
  const listing = (path: string, items: Pattern[], template: string) => {
    const tpl = gitModified(template);
    for (let page = 1; page <= pageCount(items.length); page++) {
      const onPage = pageSlice(items, page);
      urls.push({ loc: page === 1 ? path : `${path}/page/${page}`, lastmod: later(newest(onPage), tpl) });
    }
  };

  urls.push({ loc: '/', lastmod: later(newest(patterns.slice(0, 9)), gitModified('src/pages/index.astro')) });
  listing('/patterns', patterns, 'src/components/PatternListing.astro');
  for (const c of CATEGORIES) {
    listing(`/category/${c.slug}`, patterns.filter((p) => p.category === c.slug), 'src/components/PatternListing.astro');
  }
  for (const p of patterns) urls.push({ loc: p.url, lastmod: p.modified });
  for (const page of TEXT_PAGES) urls.push({ loc: `/${page}`, lastmod: gitModified(`src/pages/${page}.astro`) ?? undefined });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map((u) => `  <url><loc>${base}${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod.toISOString()}</lastmod>` : ''}</url>`)
  .join('\n')}
</urlset>
`;
  return new Response(xml, { headers: { 'content-type': 'application/xml; charset=utf-8' } });
};
