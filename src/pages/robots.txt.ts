import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site, url }) => {
  const base = (site ?? url).origin;
  return new Response(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\n\nSitemap: ${base}/sitemap.xml\n`, {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
};
