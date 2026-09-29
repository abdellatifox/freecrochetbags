#!/usr/bin/env node
/**
 * Pre-build image pipeline (runs before `astro build` / `astro dev`).
 *
 * Astro doesn't optimise files in public/, and ContentOps writes covers there as
 * /images/patterns/<slug>.<ext>. So we leave the originals (and their paths) untouched and
 * generate derivatives next to them in public/_img/ (git-ignored):
 *
 *   /_img/<path>-400.webp, -800.webp, -1200.webp   responsive, for <img srcset>
 *   /_img/<path>-og.jpg                           ≥1000px JPG for og:image / Pinterest
 *
 * plus src/generated/images.json (git-ignored) with every variant's dimensions, which the
 * pages read to emit width/height/srcset. Unchanged sources are skipped, so re-runs are cheap.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, relative, sep } from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
const PUBLIC = join(ROOT, 'public');
const OUT = join(PUBLIC, '_img');
const MANIFEST = join(ROOT, 'src', 'generated', 'images.json');
const SOURCE_DIRS = ['images'];
const EXTRA = [
  // [public path, options] — site-wide social image and a raster logo for JSON-LD.
  ['/og.svg', { og: { width: 1200, height: 630 }, widths: [] }],
  ['/favicon.svg', { png: 512, widths: [] }],
];
const WIDTHS = [400, 800, 1200];
const OG_MIN = 1000;
const OG_MAX = 1200;
const EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.svg']);
const VERSION = 1; // bump to force a full rebuild when this script's output changes

const toPublic = (abs) => '/' + relative(PUBLIC, abs).split(sep).join('/');

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = join(dir, d.name);
    if (d.isDirectory()) return walk(p);
    return EXTS.has(extname(d.name).toLowerCase()) ? [p] : [];
  });
}

function load(file) {
  const input = readFileSync(file);
  // Rasterise SVGs at a density that yields ~1200px so they get crisp derivatives too.
  if (extname(file).toLowerCase() === '.svg') {
    const w = Number(/\bwidth="(\d+(?:\.\d+)?)"/.exec(input.toString())?.[1]) || 600;
    return { input, opts: { density: Math.min(2400, Math.ceil((72 * OG_MAX) / w)) } };
  }
  return { input, opts: {} };
}

let manifest = {};
try {
  manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
} catch {}
const next = {};
let built = 0;
let reused = 0;

const jobs = [
  ...SOURCE_DIRS.flatMap((d) => walk(join(PUBLIC, d))).map((f) => [toPublic(f), {}]),
  ...EXTRA.filter(([p]) => existsSync(join(PUBLIC, p))),
];

for (const [src, extra] of jobs) {
  const file = join(PUBLIC, src);
  const hash = createHash('sha1').update(readFileSync(file)).update(String(VERSION)).digest('hex').slice(0, 12);
  const prev = manifest[src];
  const outputs = (e) => [...(e?.variants ?? []), ...(e?.og ? [e.og] : []), ...(e?.png ? [e.png] : [])];
  if (prev?.hash === hash && outputs(prev).every((v) => existsSync(join(PUBLIC, v.src)))) {
    next[src] = prev;
    reused++;
    continue;
  }

  const { input, opts } = load(file);
  const meta = await sharp(input, opts).rotate().metadata();
  const [iw, ih] = meta.orientation >= 5 ? [meta.height, meta.width] : [meta.width, meta.height];
  const base = src.replace(/\.[^.]+$/, '');
  const outBase = join(OUT, ...base.split('/').filter(Boolean));
  mkdirSync(dirname(outBase), { recursive: true });

  const entry = { hash, width: iw, height: ih, variants: [] };

  // Responsive WebP set: never upscale; always include the largest size we can offer.
  const widths = extra.widths ?? WIDTHS;
  const targets = [...new Set([...widths.filter((w) => w < iw), Math.min(iw, Math.max(...widths, 0))])]
    .filter(Boolean)
    .sort((a, b) => a - b);
  for (const w of widths.length ? targets : []) {
    const out = `${outBase}-${w}.webp`;
    const info = await sharp(input, opts).rotate().resize({ width: w }).webp({ quality: 78, effort: 5 }).toFile(out);
    entry.variants.push({ src: toPublic(out), width: info.width, height: info.height });
  }

  // og:image — JPG, 1000–1200px wide (upscaled if the source is small), white behind transparency.
  if (widths.length || extra.og) {
    const out = `${outBase}-og.jpg`;
    const resize = extra.og
      ? { width: extra.og.width, height: extra.og.height, fit: 'cover' }
      : { width: Math.max(OG_MIN, Math.min(iw, OG_MAX)) };
    const info = await sharp(input, opts)
      .rotate()
      .resize(resize)
      .flatten({ background: '#ffffff' })
      .jpeg({ quality: 84, mozjpeg: true })
      .toFile(out);
    entry.og = { src: toPublic(out), width: info.width, height: info.height };
  }

  if (extra.png) {
    const out = `${outBase}-${extra.png}.png`;
    const info = await sharp(input, opts).resize({ width: extra.png }).png().toFile(out);
    entry.png = { src: toPublic(out), width: info.width, height: info.height };
  }

  next[src] = entry;
  built++;
}

mkdirSync(dirname(MANIFEST), { recursive: true });
writeFileSync(MANIFEST, JSON.stringify(next, null, 2) + '\n');
console.log(`[images] ${built} processed, ${reused} unchanged → public/_img, src/generated/images.json`);
