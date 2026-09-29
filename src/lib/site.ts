export const SITE = {
  name: 'Free Crochet Bags',
  tagline: 'Free, calm crochet patterns for every season',
  description:
    'A quiet little library of free, beginner-friendly crochet patterns — blankets, beanies, bags and cozy home pieces, written and tested with care.',
  author: 'Sara',
  /** Pinterest domain verification code (the `content` of p:domain_verify). Empty = tag not rendered. */
  pinterestVerify: '',
};

/**
 * The site's categories (URL slugs). ContentOps category names are mapped onto
 * these in src/lib/patterns.ts — see CONTENTOPS_CATEGORY_MAP.
 */
export const CATEGORIES = [
  { slug: 'blankets', name: 'Blankets', tagline: 'Cozy layers' },
  { slug: 'hats-beanies', name: 'Hats & Beanies', tagline: 'Warm toppers' },
  { slug: 'scarves', name: 'Scarves & Cowls', tagline: 'Soft & wrappy' },
  { slug: 'bags', name: 'Bags & Totes', tagline: 'Everyday carry' },
  { slug: 'home-decor', name: 'Home Decor', tagline: 'Calm spaces' },
  { slug: 'baby-items', name: 'Baby & Kids', tagline: 'Sweet & gentle' },
  { slug: 'clothing', name: 'Clothing', tagline: 'Wearable makes' },
  { slug: 'accessories', name: 'Accessories', tagline: 'Little details' },
  { slug: 'footwear', name: 'Footwear', tagline: 'Cozy steps' },
  { slug: 'seasonal', name: 'Seasonal', tagline: 'Holidays & seasons' },
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]['slug'];

export const DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced'] as const;

export function getCategory(slug: string) {
  return CATEGORIES.find((c) => c.slug === slug);
}

export function isCategory(slug: string): slug is CategorySlug {
  return CATEGORIES.some((c) => c.slug === slug);
}
