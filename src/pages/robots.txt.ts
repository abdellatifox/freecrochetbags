import type { APIRoute } from 'astro';

export const prerender = true;

export const GET: APIRoute = ({ site }) => {
  const base = new URL('/', site).origin;
  return new Response(`User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${base}/sitemap.xml\n`, {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
};
