import TurndownService from 'turndown';
import { load } from 'cheerio';

const STRIP_SELECTORS = [
  'nav', 'header', 'footer', 'aside',
  '.nav', '.navigation', '.menu', '.header', '.footer', '.sidebar',
  '.widget', '.ad', '.ads', '.advertisement', '.promo',
  '.cookie', '.cookie-banner', '.cookie-notice',
  '.popup', '.modal', '.overlay', '.lightbox',
  '.newsletter', '.subscribe', '.signup-form',
  '.social', '.social-share', '.share-buttons',
  '.comments', '#comments', '.comment-section',
  '.related-posts', '.related-articles',
  '.breadcrumb', '.breadcrumbs',
  '.pagination', '.page-nav',
  '.author-bio', '.author-box',
  '.tags-list', '.tag-cloud',
  'script', 'style', 'noscript', 'iframe', 'svg', 'canvas',
  'form:not([class*="search"])',
  '[aria-hidden="true"]', '[hidden]', '[role="complementary"]',
  '.skip-link', '.screen-reader-text',
];

/**
 * Converts an extracted HTML body to clean, article-only Markdown.
 */
export class MarkdownService {
  private static getTurndown(): TurndownService {
    const td = new TurndownService({
      headingStyle: 'atx',
      hr: '---',
      bulletListMarker: '-',
      codeBlockStyle: 'fenced',
      fence: '```',
      emDelimiter: '_',
      strongDelimiter: '**',
      linkStyle: 'inlined',
    });

    // Remove raw HTML comments
    td.addRule('remove-comments', {
      filter: (node: any) => node.nodeType === 8, // Node.COMMENT_NODE
      replacement: () => '',
    });

    // Preserve tables
    td.addRule('tables', {
      filter: ['table'],
      replacement: (_content: string, node: any) => {
        const $ = load(node.outerHTML || '');
        const rows: string[][] = [];
        $('tr').each((_: number, row: any) => {
          const cells: string[] = [];
          $(row).find('th, td').each((_: number, cell: any) => {
            cells.push($(cell).text().trim().replace(/\|/g, '\\|'));
          });
          rows.push(cells);
        });

        if (rows.length === 0) return '';

        const maxCols = Math.max(...rows.map(r => r.length));
        const normalised = rows.map(r => {
          while (r.length < maxCols) r.push('');
          return r;
        });

        let md = '\n\n';
        md += '| ' + normalised[0].join(' | ') + ' |\n';
        md += '| ' + normalised[0].map(() => '---').join(' | ') + ' |\n';
        normalised.slice(1).forEach(row => {
          md += '| ' + row.join(' | ') + ' |\n';
        });
        return md + '\n';
      },
    });

    // Convert figure/figcaption to markdown image with caption
    td.addRule('figure', {
      filter: ['figure'],
      replacement: (_content: string, node: any) => {
        const $ = load(node.outerHTML || '');
        const img = $('img');
        const caption = $('figcaption').text().trim();
        const src = img.attr('src') || img.attr('data-src') || '';
        const alt = img.attr('alt') || caption || '';
        if (!src) return '';
        const imgMd = `![${alt}](${src})`;
        return caption ? `\n\n${imgMd}\n*${caption}*\n\n` : `\n\n${imgMd}\n\n`;
      },
    });

    // Keep code blocks intact
    td.addRule('pre-code', {
      filter: ['pre'],
      replacement: (_content: string, node: any) => {
        const $ = load(node.outerHTML || '');
        const lang = $('code').attr('class')?.match(/language-(\w+)/)?.[1] || '';
        const code = $('code').text();
        return `\n\n\`\`\`${lang}\n${code}\n\`\`\`\n\n`;
      },
    });

    return td;
  }

  /**
   * Convert raw article HTML to clean Markdown.
   * Strips all navigation, ads, and non-article elements first.
   */
  static generate(bodyHtml: string): string {
    // Load the HTML
    const $ = load(bodyHtml);

    // Strip all noise elements
    STRIP_SELECTORS.forEach(sel => {
      try {
        $(sel).remove();
      } catch {
        // ignore invalid selectors
      }
    });

    // Also strip elements that look like cookie notices or GDPR banners by text content
    $('div, section, p').each((_, el) => {
      const text = $(el).text().toLowerCase();
      if (
        (text.includes('cookie') && text.includes('accept')) ||
        (text.includes('gdpr') && text.includes('consent')) ||
        (text.includes('subscribe') && text.includes('newsletter') && text.length < 200)
      ) {
        $(el).remove();
      }
    });

    // Get cleaned HTML
    const cleanedHtml = $.html() || '';

    // Convert to Markdown
    const td = this.getTurndown();
    let markdown = td.turndown(cleanedHtml);

    // Post-processing: clean up excessive blank lines
    markdown = markdown
      .replace(/\n{4,}/g, '\n\n\n')      // max 3 consecutive newlines
      .replace(/^\s+|\s+$/g, '')          // trim start/end
      .replace(/\t/g, '  ')              // tabs to spaces
      .replace(/[ \t]+$/gm, '');         // trailing whitespace per line

    return markdown;
  }

  /**
   * Generate markdown from structured crawl data (fallback if no bodyHtml).
   */
  static generateFromStructured(data: {
    title: string;
    h1: string[];
    h2: string[];
    h3: string[];
    paragraphs: string[];
    lists: string[][];
  }): string {
    const lines: string[] = [];

    if (data.title) {
      lines.push(`# ${data.title}`, '');
    }

    let h2Idx = 0;
    let h3Idx = 0;
    let paraIdx = 0;

    data.h2.forEach(h2 => {
      lines.push(`## ${h2}`, '');

      // Add paragraphs under this H2
      const parasPerSection = Math.max(1, Math.floor(data.paragraphs.length / Math.max(1, data.h2.length)));
      for (let i = 0; i < parasPerSection && paraIdx < data.paragraphs.length; i++, paraIdx++) {
        lines.push(data.paragraphs[paraIdx], '');
      }

      // Add a H3 if available
      if (h3Idx < data.h3.length) {
        lines.push(`### ${data.h3[h3Idx++]}`, '');
      }
    });

    // Remaining paragraphs
    while (paraIdx < data.paragraphs.length) {
      lines.push(data.paragraphs[paraIdx++], '');
    }

    // Lists
    data.lists.forEach(list => {
      list.forEach(item => lines.push(`- ${item}`));
      lines.push('');
    });

    return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  }
}
