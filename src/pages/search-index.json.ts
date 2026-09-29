import type { APIRoute } from 'astro';
import { getPatterns } from '../lib/patterns';
import { coverOrPlaceholder, responsive } from '../lib/images';

export const prerender = true;

/** Small index for the client-side search on /patterns?q= (no pattern bodies). */
export const GET: APIRoute = async () => {
  const items = (await getPatterns()).map((p) => {
    const img = responsive(coverOrPlaceholder(p.cover));
    return {
      u: p.url,
      t: p.title,
      e: p.excerpt,
      c: p.categoryName,
      d: p.difficulty,
      k: [...p.tags, ...p.stitches].join(' '),
      i: img.src,
      s: img.srcset,
      w: img.width,
      h: img.height,
    };
  });
  return new Response(JSON.stringify(items), { headers: { 'content-type': 'application/json; charset=utf-8' } });
};
