import type { APIRoute } from 'astro';
import { SITE } from '../lib/site';
import { getPatterns } from '../lib/patterns';
import { coverOrPlaceholder, socialImage } from '../lib/images';

export const prerender = true;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Latest patterns (drafts excluded). Pinterest can auto-pin from this feed. */
export const GET: APIRoute = async ({ site }) => {
  const abs = (p: string) => new URL(p, site).href;
  const items = (await getPatterns()).slice(0, 50);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
<channel>
  <title>${esc(SITE.name)}</title>
  <link>${abs('/')}</link>
  <description>${esc(SITE.description)}</description>
  <language>en</language>
  <atom:link href="${abs('/rss.xml')}" rel="self" type="application/rss+xml" />
${items
  .map((p) => {
    const img = socialImage(coverOrPlaceholder(p.cover));
    return `  <item>
    <title>${esc(p.title)}</title>
    <link>${abs(p.url)}</link>
    <guid isPermaLink="true">${abs(p.url)}</guid>
    <pubDate>${p.publishDate.toUTCString()}</pubDate>
    <category>${esc(p.categoryName)}</category>
    <description>${esc(p.excerpt)}</description>
    <enclosure url="${abs(img.src)}" type="image/jpeg" length="0" />
    <media:content url="${abs(img.src)}" medium="image" width="${img.width}" height="${img.height}" />
  </item>`;
  })
  .join('\n')}
</channel>
</rss>
`;
  return new Response(xml, { headers: { 'content-type': 'application/rss+xml; charset=utf-8' } });
};
