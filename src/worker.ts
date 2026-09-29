/**
 * Worker entry (wired up via `workerEntryPoint` in astro.config.mjs).
 *
 * Almost every page is a static file served by Cloudflare's asset layer without touching
 * this Worker. It only runs for /api/*, unknown paths (→ 404 page), and the URLs that
 * wrangler.jsonc's `assets.run_worker_first` routes here so we can send permanent (301)
 * redirects — the asset layer's own trailing-slash redirects are 307s:
 *
 *   /pattern/<slug>[/]   → /patterns/<slug>   (old URL scheme)
 *   /anything/           → /anything          (trailingSlash: 'never')
 *
 * Each rule produces the final URL in one hop (no redirect chains). Query strings are kept.
 */
import type { SSRManifest } from 'astro';
import { App } from 'astro/app';
import { handle } from '@astrojs/cloudflare/handler';

export function canonicalRedirect(url: URL): string | null {
  let path = url.pathname;
  if (path.length > 1 && path.endsWith('/')) path = path.replace(/\/+$/, '') || '/';
  path = path.replace(/^\/pattern\/(?=[^/])/, '/patterns/');
  if (path === url.pathname) return null;
  return path + url.search;
}

export function createExports(manifest: SSRManifest) {
  const app = new App(manifest);
  return {
    default: {
      async fetch(request: Request, env: Env, ctx: ExecutionContext) {
        const url = new URL(request.url);
        if (request.method === 'GET' || request.method === 'HEAD') {
          const target = canonicalRedirect(url);
          if (target) {
            return new Response(null, { status: 301, headers: { Location: target, 'Cache-Control': 'public, max-age=86400' } });
          }
        }
        // @ts-expect-error — the adapter's handler is typed loosely
        return handle(manifest, app, request, env, ctx);
      },
    },
  };
}
