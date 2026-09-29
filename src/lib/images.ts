/**
 * Lookups into the manifest written by scripts/build-images.mjs.
 * Only imported by prerendered pages, so none of this ends up in the Worker.
 */
import manifest from '../generated/images.json';

interface Variant {
  src: string;
  width: number;
  height: number;
}
interface Entry {
  width: number;
  height: number;
  variants: Variant[];
  og?: Variant;
  png?: Variant;
}

const images = manifest as Record<string, Entry>;
const warned = new Set<string>();

export const PLACEHOLDER = '/images/patterns/placeholder.svg';

export interface ResponsiveImage {
  src: string;
  srcset?: string;
  width?: number;
  height?: number;
}

/** Responsive WebP set for a public/ image path. Falls back to the original file if it wasn't processed. */
export function responsive(path: string): ResponsiveImage {
  const entry = images[path];
  if (!entry || entry.variants.length === 0) {
    if (path && !warned.has(path)) {
      warned.add(path);
      console.warn(`[images] no optimised versions for "${path}" — serving the original`);
    }
    return { src: path };
  }
  const largest = entry.variants[entry.variants.length - 1];
  return {
    src: largest.src,
    srcset: entry.variants.map((v) => `${v.src} ${v.width}w`).join(', '),
    width: largest.width,
    height: largest.height,
  };
}

/** Pick an image path that exists in the manifest, else the placeholder. */
export function coverOrPlaceholder(path: string) {
  return path && images[path] ? path : PLACEHOLDER;
}

/** JPG social image (og:image / Pinterest / JSON-LD) for a public/ path, or the site default. */
export function socialImage(path?: string): Variant {
  return (path && images[path]?.og) || images['/og.svg']?.og || { src: '/og.svg', width: 1200, height: 630 };
}

/** Raster logo for Organization / publisher structured data. */
export function logoImage(): Variant {
  return images['/favicon.svg']?.png ?? { src: '/favicon.svg', width: 40, height: 40 };
}
