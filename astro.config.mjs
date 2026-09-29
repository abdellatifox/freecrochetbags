// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  site: 'https://freecrochetbags.com',
  // Content pages are prerendered (`export const prerender = true`); only /api/* runs in the Worker.
  output: 'server',
  adapter: cloudflare({
    platformProxy: { enabled: true }, // exposes D1 locally during `astro dev`
    // Images are optimised ahead of time by scripts/build-images.mjs (see README).
    imageService: 'passthrough',
    sessionKVBindingName: 'CACHE',
    workerEntryPoint: { path: 'src/worker.ts' },
  }),
  trailingSlash: 'never',
  // /patterns/foo.html rather than /patterns/foo/index.html, so no URL needs a trailing slash.
  build: { format: 'file' },
  server: { port: Number(process.env.PORT) || 4321 },
  // Build-time only (git dates for lastmod); never bundled into the Worker.
  vite: { ssr: { external: ['node:child_process'] } },
});
