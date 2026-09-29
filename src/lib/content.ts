import { Marked, type Tokens } from 'marked';
import { responsive } from './images';

export interface TocItem {
  id: string;
  text: string;
}

export interface Faq {
  question: string;
  answer: string;
}

const FAQ_HEADING = /^(faq|faqs|frequently asked questions)\b/i;

export function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/<[^>]+>/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function escapeAttr(s: string) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

/** Strip markdown formatting so text can go into JSON-LD. */
function plain(text: string) {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_`>#]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Renders pattern markdown and extracts:
 * - a table of contents from the H2 headings (each gets a stable id for #anchors)
 * - FAQ pairs from the "## FAQ" section (### question + answer paragraphs) for FAQPage schema
 */
export function renderPattern(markdown: string) {
  const toc: TocItem[] = [];
  const faqs: Faq[] = [];
  const used = new Map<string, number>();

  const tokens = new Marked().lexer(markdown);
  // The page title is the only h1, so a leading "# Title" in the body becomes an h2.
  for (const t of tokens) if (t.type === 'heading' && t.depth === 1) t.depth = 2;

  // Pull FAQ pairs straight from the token stream.
  let inFaq = false;
  let current: Faq | null = null;
  for (const t of tokens) {
    if (t.type === 'heading' && t.depth === 2) {
      if (current) faqs.push(current);
      current = null;
      inFaq = FAQ_HEADING.test(t.text);
    } else if (inFaq && t.type === 'heading' && t.depth === 3) {
      if (current) faqs.push(current);
      current = { question: plain(t.text), answer: '' };
    } else if (inFaq && current && (t.type === 'paragraph' || t.type === 'list')) {
      current.answer = `${current.answer} ${plain(t.raw)}`.trim();
    }
  }
  if (current) faqs.push(current);

  const marked = new Marked({
    renderer: {
      // In-article images (e.g. ContentOps' <slug>-2.jpg): optimised WebP set, lazy, with dimensions.
      image({ href, title, text }: Tokens.Image) {
        const img = responsive(href);
        const attrs = [
          `src="${escapeAttr(img.src)}"`,
          img.srcset && `srcset="${escapeAttr(img.srcset)}" sizes="(min-width: 760px) 680px, 100vw"`,
          `alt="${escapeAttr(text)}"`,
          img.width && `width="${img.width}" height="${img.height}"`,
          title && `title="${escapeAttr(title)}"`,
          'loading="lazy" decoding="async"',
        ].filter(Boolean);
        return `<img ${attrs.join(' ')}>`;
      },
      heading(this: { parser: { parseInline: (t: Tokens.Generic[]) => string } }, { tokens: inline, depth, text }: Tokens.Heading) {
        const inner = this.parser.parseInline(inline);
        if (depth > 3) return `<h${depth}>${inner}</h${depth}>\n`;
        let id = slugify(text) || 'section';
        const n = used.get(id) ?? 0;
        used.set(id, n + 1);
        if (n) id = `${id}-${n}`;
        if (depth === 2) toc.push({ id, text: plain(text) });
        return `<h${depth} id="${id}">${inner}</h${depth}>\n`;
      },
    },
  });

  const html = marked.parser(tokens);
  return { html, toc, faqs: faqs.filter((f) => f.question && f.answer) };
}
