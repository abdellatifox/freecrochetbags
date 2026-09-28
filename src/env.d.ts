/// <reference types="astro/client" />

interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
  ADMIN_TOKEN: string;
}

type Runtime = import('@astrojs/cloudflare').Runtime<Env>;

declare namespace App {
  interface Locals extends Runtime {}
}
