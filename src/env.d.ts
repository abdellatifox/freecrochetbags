/// <reference types="astro/client" />

interface Env {
  /** Newsletter subscribers + contact messages. (The legacy `patterns` table is no longer read.) */
  DB: D1Database;
  ASSETS: Fetcher;
}

type Runtime = import('@astrojs/cloudflare').Runtime<Env>;

declare namespace App {
  interface Locals extends Runtime {}
}
