#!/usr/bin/env node
/**
 * Converts a D1 export of the legacy `patterns` table into ContentOps-style
 * Markdown files (src/content/patterns/<slug>.md), keeping the same slugs.
 *
 * Export first (local or remote, whoever has access):
 *   npx wrangler d1 execute freecrochetbags-db --json --command "SELECT * FROM patterns" > patterns.json
 * Then:
 *   node scripts/d1-to-md.mjs patterns.json [--out src/content/patterns] [--force]
 *
 * Accepts either the raw wrangler output ([{ results: [...] }]) or a plain array of rows.
 * Existing files are skipped unless --force is given.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const input = args.find((a) => !a.startsWith('--'));
const outIdx = args.indexOf('--out');
const outDir = outIdx >= 0 ? args[outIdx + 1] : 'src/content/patterns';
const force = args.includes('--force');

if (!input) {
  console.error('Usage: node scripts/d1-to-md.mjs <export.json> [--out dir] [--force]');
  process.exit(1);
}

const raw = JSON.parse(readFileSync(input, 'utf8'));
const rows = Array.isArray(raw) && raw[0]?.results ? raw.flatMap((r) => r.results) : raw;

// Site category -> ContentOps category (only where ContentOps uses a different name).
const CATEGORY_OUT = { 'baby-items': 'baby-kids' };

const q = (s) => JSON.stringify(String(s)); // JSON strings are valid YAML double-quoted scalars
const list = (items) => (items.length ? '\n' + items.map((i) => `  - ${q(i)}`).join('\n') : ' []');

mkdirSync(outDir, { recursive: true });
let written = 0;
let skipped = 0;

for (const r of rows) {
  const file = join(outDir, `${r.slug}.md`);
  if (existsSync(file) && !force) {
    skipped++;
    continue;
  }
  const materials = String(r.materials ?? '')
    .split('\n')
    .map((m) => m.trim())
    .filter(Boolean);

  const fm = [
    `title: ${q(r.title)}`,
    `excerpt: ${q(r.excerpt)}`,
    `category: ${CATEGORY_OUT[r.category] ?? r.category}`,
    `cover: ${q(r.image || '')}`,
    `publishDate: ${String(r.published_at).slice(0, 10)}`,
    `featured: false`,
    `draft: ${Number(r.published) === 1 ? 'false' : 'true'}`,
    `difficulty: ${String(r.difficulty || 'beginner').toLowerCase()}`,
    `hook: ${q(r.hook_size ?? '')}`,
    `yarnWeight: ${q(r.yarn_weight ?? '')}`,
    ...(r.time_needed ? [`time: ${q(r.time_needed)}`] : []),
    `sizes: []`,
    `stitches: []`,
    `materials:${list(materials)}`,
    `colors: []`,
    `tags: []`,
  ];

  writeFileSync(file, `---\n${fm.join('\n')}\n---\n\n${String(r.content ?? '').trim()}\n`, 'utf8');
  written++;
}

console.log(`Wrote ${written} file(s) to ${outDir}${skipped ? `, skipped ${skipped} existing (use --force)` : ''}.`);
