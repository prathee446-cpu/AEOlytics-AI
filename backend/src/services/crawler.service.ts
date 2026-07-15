import { load } from 'cheerio';
import { URL } from 'url';
import { chromium } from 'playwright';

export interface CrawlResult {
  // Validation info
  url: string;
  finalUrl: string;
  domain: string;
  https: boolean;
  statusCode: number;
  redirected: boolean;
  robotsAllowed: boolean;
  canonicalUrl: string | null;

  // Page identity
  title: string;
  metaTitle: string;
  metaDescription: string;
  language: string;
  author: string | null;
  publishDate: string | null;
  modifiedDate: string | null;

  // Content structure
  h1: string[];
  h2: string[];
  h3: string[];
  paragraphs: string[];
  lists: string[][];
  tables: string[][][];

  // Media
  images: Array<{ src: string; alt: string; caption: string }>;

  // Links
  internalLinks: Array<{ href: string; text: string }>;
  externalLinks: Array<{ href: string; text: string }>;

  // SEO / Social
  ogTags: Record<string, string>;
  twitterTags: Record<string, string>;

  // Schema
  jsonLD: any[];

  // Computed metrics
  wordCount: number;
  readingTime: number;

  // AI-extracted intelligence
  entities: string[];
  topics: string[];
  primaryIntent: string;
  questions: string[];

  // Raw HTML of main content area (for markdown generation)
  bodyHtml: string;
}

export interface UrlValidation {
  valid: boolean;
  url: string;
  https: boolean;
  statusCode: number;
  finalUrl: string;
  domain: string;
  redirected: boolean;
  robotsAllowed: boolean;
  canonicalUrl: string | null;
  error?: string;
}

const FETCH_TIMEOUT_MS = 12000;
const USER_AGENT = 'Mozilla/5.0 (compatible; ContentIQ-AEO-Bot/1.0; +https://contentiq.ai/bot)';

export class CrawlerService {
  /**
   * Quickly validate a URL without full crawling.
   */
  static async validateUrl(inputUrl: string): Promise<UrlValidation> {
    // 1. Basic format check
    let parsed: URL;
    try {
      parsed = new URL(inputUrl);
    } catch {
      return { valid: false, url: inputUrl, https: false, statusCode: 0, finalUrl: '', domain: '', redirected: false, robotsAllowed: false, canonicalUrl: null, error: 'Invalid URL format. Please include the full URL with https://' };
    }

    const isHttps = parsed.protocol === 'https:';
    const domain = parsed.hostname;

    // 2. Perform HEAD request to check accessibility + redirects
    let statusCode = 0;
    let finalUrl = inputUrl;
    let redirected = false;
    let canonicalUrl: string | null = null;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      const response = await fetch(inputUrl, {
        method: 'GET',
        signal: controller.signal,
        headers: { 'User-Agent': USER_AGENT, 'Accept': 'text/html' },
        redirect: 'follow',
      });
      clearTimeout(timer);

      statusCode = response.status;
      finalUrl = response.url;
      redirected = response.url !== inputUrl;

      if (!response.ok) {
        if ([403, 401, 405, 503].includes(statusCode)) {
          console.warn(`[Crawler Validate] URL validation returned HTTP ${statusCode}. Proceeding to let Playwright attempt crawl.`);
          return {
            valid: true,
            url: inputUrl,
            https: isHttps,
            statusCode,
            finalUrl,
            domain,
            redirected,
            robotsAllowed: true,
            canonicalUrl: null,
          };
        }
        return { valid: false, url: inputUrl, https: isHttps, statusCode, finalUrl, domain, redirected, robotsAllowed: false, canonicalUrl: null, error: `Server returned HTTP ${statusCode}. The page may be unavailable or access-restricted.` };
      }

      // Parse canonical from HTML
      const html = await response.text();
      const $ = load(html);
      canonicalUrl = $('link[rel="canonical"]').attr('href') || null;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { valid: false, url: inputUrl, https: isHttps, statusCode: 408, finalUrl, domain, redirected, robotsAllowed: false, canonicalUrl: null, error: 'Request timed out after 12 seconds. The server may be slow or blocking crawlers.' };
      }
      return { valid: false, url: inputUrl, https: isHttps, statusCode: 0, finalUrl, domain, redirected, robotsAllowed: false, canonicalUrl: null, error: `Connection error: ${err.message}` };
    }

    // 3. Check robots.txt
    const robotsAllowed = await this.checkRobots(parsed.origin, parsed.pathname);

    return {
      valid: true,
      url: inputUrl,
      https: isHttps,
      statusCode,
      finalUrl,
      domain,
      redirected,
      robotsAllowed,
      canonicalUrl,
    };
  }

  /**
   * Full page crawl: fetch HTML, extract all content signals, compute metrics.
   */
  static async crawlPage(inputUrl: string): Promise<CrawlResult> {
    const parsed = new URL(inputUrl);
    const domain = parsed.hostname;
    const origin = parsed.origin;

    let html = '';
    let statusCode = 200;
    let finalUrl = inputUrl;
    let redirected = false;
    let browser: any = null;

    try {
      console.log(`[Playwright Crawler] Launching headless browser for: ${inputUrl}`);
      browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const context = await browser.newContext({
        userAgent: USER_AGENT,
        viewport: { width: 1280, height: 800 }
      });

      const page = await context.newPage();
      page.setDefaultTimeout(FETCH_TIMEOUT_MS);

      console.log(`[Playwright Crawler] Navigating page...`);
      const response = await page.goto(inputUrl, {
        waitUntil: 'load',
        timeout: FETCH_TIMEOUT_MS
      });

      if (response) {
        statusCode = response.status();
        finalUrl = page.url();
        redirected = finalUrl !== inputUrl;
      }

      if (statusCode === 404) {
        throw new Error(`Page not found (404)`);
      } else if (statusCode === 403) {
        throw new Error(`Access denied (403)`);
      } else if (statusCode >= 400) {
        throw new Error(`Server returned HTTP status ${statusCode}`);
      }

      // Wait a short time for JavaScript rendering to settle
      await page.waitForTimeout(1500);

      // Extract complete HTML
      html = await page.content();
      console.log(`[Playwright Crawler] Page loaded successfully. Content size: ${html.length} bytes.`);

    } catch (err: any) {
      console.error(`[Playwright Crawler] Crawl failed for ${inputUrl}:`, err.message);
      throw new Error(`Crawl failed: ${err.message}`);
    } finally {
      if (browser) {
        console.log(`[Playwright Crawler] Closing browser instance...`);
        await browser.close().catch((closeErr: any) => {
          console.error(`[Playwright Crawler] Error closing browser:`, closeErr.message);
        });
        console.log(`[Playwright Crawler] Browser instance closed.`);
      }
    }

    const $ = load(html);

    // ── Remove noisy elements ─────────────────────────────────────────────────
    $('script, style, noscript, iframe, svg, canvas, template').remove();
    $('nav, header, footer, aside, .nav, .menu, .header, .footer, .sidebar, .widget, .ad, .ads, .advertisement, .cookie, .popup, .modal, .overlay, .newsletter, .social-share, .comments, #comments, .breadcrumb, .pagination').remove();
    $('[aria-hidden="true"], [hidden]').remove();

    // ── Basic page identity ───────────────────────────────────────────────────
    const title = $('title').text().trim() || '';
    const metaTitle = $('meta[name="title"]').attr('content') || title;
    const metaDescription = $('meta[name="description"]').attr('content') || '';
    const language = $('html').attr('lang') || $('meta[http-equiv="content-language"]').attr('content') || 'en';
    const canonicalUrl = $('link[rel="canonical"]').attr('href') || null;

    // ── Author & dates ────────────────────────────────────────────────────────
    const author = this.extractAuthor($);
    const publishDate = this.extractDate($, ['datePublished', 'date', 'publishedTime', 'article:published_time']);
    const modifiedDate = this.extractDate($, ['dateModified', 'modifiedTime', 'article:modified_time']);

    // ── OG & Twitter tags ─────────────────────────────────────────────────────
    const ogTags: Record<string, string> = {};
    $('meta[property^="og:"]').each((_: number, el: any) => {
      const prop = $(el).attr('property')?.replace('og:', '') || '';
      const content = $(el).attr('content') || '';
      if (prop) ogTags[prop] = content;
    });

    const twitterTags: Record<string, string> = {};
    $('meta[name^="twitter:"]').each((_: number, el: any) => {
      const name = $(el).attr('name')?.replace('twitter:', '') || '';
      const content = $(el).attr('content') || '';
      if (name) twitterTags[name] = content;
    });

    // ── JSON-LD schema extraction ─────────────────────────────────────────────
    const jsonLD: any[] = [];
    $('script[type="application/ld+json"]').each((_: number, el: any) => {
      try {
        const raw = $(el).html() || '';
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          jsonLD.push(...parsed);
        } else {
          jsonLD.push(parsed);
        }
      } catch {
        // ignore malformed JSON-LD
      }
    });

    // ── Main content area ─────────────────────────────────────────────────────
    // Prefer semantic content containers
    const mainSelector = ['article', 'main', '[role="main"]', '.post-content', '.article-content', '.entry-content', '.content', '#content', '.post', '#main'];
    let $content: any = $('body');
    for (const sel of mainSelector) {
      if ($(sel).length) {
        $content = $(sel).first();
        break;
      }
    }

    const bodyHtml = $content.html() || '';

    // ── Headings ──────────────────────────────────────────────────────────────
    const h1: string[] = [];
    const h2: string[] = [];
    const h3: string[] = [];
    $content.find('h1').each((_: number, el: any) => { const t = $(el).text().trim(); if (t) h1.push(t); });
    $content.find('h2').each((_: number, el: any) => { const t = $(el).text().trim(); if (t) h2.push(t); });
    $content.find('h3').each((_: number, el: any) => { const t = $(el).text().trim(); if (t) h3.push(t); });

    // ── Paragraphs ────────────────────────────────────────────────────────────
    const paragraphs: string[] = [];
    $content.find('p').each((_: number, el: any) => {
      const t = $(el).text().trim();
      if (t.length > 20) paragraphs.push(t);
    });

    // ── Lists ─────────────────────────────────────────────────────────────────
    const lists: string[][] = [];
    $content.find('ul, ol').each((_: number, listEl: any) => {
      const items: string[] = [];
      $(listEl).find('li').each((_: number, li: any) => {
        const t = $(li).clone().children('ul, ol').remove().end().text().trim();
        if (t) items.push(t);
      });
      if (items.length) lists.push(items);
    });

    // ── Tables ────────────────────────────────────────────────────────────────
    const tables: string[][][] = [];
    $content.find('table').each((_: number, tableEl: any) => {
      const rows: string[][] = [];
      $(tableEl).find('tr').each((_: number, row: any) => {
        const cells: string[] = [];
        $(row).find('th, td').each((_: number, cell: any) => { cells.push($(cell).text().trim()); });
        if (cells.length) rows.push(cells);
      });
      if (rows.length) tables.push(rows);
    });

    // ── Images ───────────────────────────────────────────────────────────────
    const images: Array<{ src: string; alt: string; caption: string }> = [];
    $content.find('img').each((_: number, el: any) => {
      const src = $(el).attr('src') || $(el).attr('data-src') || '';
      const alt = $(el).attr('alt') || '';
      const caption = $(el).closest('figure').find('figcaption').text().trim() || '';
      if (src) images.push({ src, alt, caption });
    });

    // ── Links ─────────────────────────────────────────────────────────────────
    const internalLinks: Array<{ href: string; text: string }> = [];
    const externalLinks: Array<{ href: string; text: string }> = [];
    $content.find('a[href]').each((_: number, el: any) => {
      const href = $(el).attr('href') || '';
      const text = $(el).text().trim();
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
      try {
        const linkUrl = new URL(href, origin);
        if (linkUrl.hostname === domain) {
          internalLinks.push({ href: linkUrl.href, text });
        } else {
          externalLinks.push({ href: linkUrl.href, text });
        }
      } catch {
        // relative link
        internalLinks.push({ href: href, text });
      }
    });

    // ── Full text for metrics ─────────────────────────────────────────────────
    const fullText = paragraphs.join(' ') + ' ' + h1.join(' ') + ' ' + h2.join(' ') + ' ' + h3.join(' ');
    const wordCount = fullText.trim().split(/\s+/).filter(Boolean).length;
    const readingTime = Math.max(1, Math.round(wordCount / 200)); // avg 200 wpm

    // ── Intelligence extraction ───────────────────────────────────────────────
    const entities = this.extractEntities(fullText);
    const topics = this.extractTopics(h1, h2, h3);
    const primaryIntent = this.detectIntent(title, h1, paragraphs);
    const questions = this.extractQuestions([...h1, ...h2, ...h3], paragraphs);

    return {
      url: inputUrl,
      finalUrl,
      domain,
      https: parsed.protocol === 'https:',
      statusCode,
      redirected,
      robotsAllowed: true,
      canonicalUrl,
      title,
      metaTitle,
      metaDescription,
      language: language.split('-')[0].toLowerCase(),
      author,
      publishDate,
      modifiedDate,
      h1,
      h2,
      h3,
      paragraphs,
      lists,
      tables,
      images,
      internalLinks,
      externalLinks,
      ogTags,
      twitterTags,
      jsonLD,
      wordCount,
      readingTime,
      entities,
      topics,
      primaryIntent,
      questions,
      bodyHtml,
    };
  }

  /**
   * Check robots.txt for crawl permission.
   */
  private static async checkRobots(origin: string, path: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`${origin}/robots.txt`, {
        signal: controller.signal,
        headers: { 'User-Agent': USER_AGENT },
      });
      clearTimeout(timer);

      if (!res.ok) return true; // No robots.txt = allowed

      const text = await res.text();
      const lines = text.split('\n').map(l => l.trim());
      let inRelevantBlock = false;
      let disallowedPaths: string[] = [];

      for (const line of lines) {
        if (line.startsWith('User-agent:')) {
          const agent = line.split(':')[1].trim();
          inRelevantBlock = agent === '*' || agent.toLowerCase().includes('contentiq');
          disallowedPaths = [];
        } else if (inRelevantBlock && line.startsWith('Disallow:')) {
          const disallowed = line.split(':')[1].trim();
          if (disallowed) disallowedPaths.push(disallowed);
        }
      }

      const isDisallowed = disallowedPaths.some(d => {
        if (d === '/') return true;
        return path.startsWith(d);
      });

      return !isDisallowed;
    } catch {
      return true; // On error, assume allowed
    }
  }

  /**
   * Extract named entities (capitalized noun phrases) from text.
   */
  private static extractEntities(text: string): string[] {
    const words = text.split(/\s+/);
    const entities = new Set<string>();

    // Simple heuristic: sequences of capitalized words (excluding sentence starts)
    for (let i = 1; i < words.length; i++) {
      const word = words[i].replace(/[^a-zA-Z']/g, '');
      if (word.length > 2 && /^[A-Z]/.test(word) && !/^(The|This|These|That|Those|A|An|In|On|At|For|With|Is|Are|Was|Were|Has|Have|Had|Will|Would|Can|Could|Should|May|Might|Does|Do|Did|But|And|Or|If|When|Where|How|What|Why|Who|Which)$/.test(word)) {
        entities.add(word);
      }
    }

    // Also capture common tech/product patterns: "Google AI", "OpenAI", etc.
    const phrasePattern = /\b([A-Z][a-z]+ [A-Z][a-z]+)\b/g;
    let match: RegExpExecArray | null;
    while ((match = phrasePattern.exec(text)) !== null) {
      entities.add(match[1]);
    }

    return Array.from(entities).slice(0, 30);
  }

  /**
   * Extract main topics from headings.
   */
  private static extractTopics(h1: string[], h2: string[], h3: string[]): string[] {
    const all = [...h1, ...h2, ...h3];
    return all
      .map(h => h.replace(/[^a-zA-Z0-9\s]/g, '').trim())
      .filter(h => h.length > 3)
      .slice(0, 10);
  }

  /**
   * Detect primary search intent from content signals.
   */
  private static detectIntent(title: string, h1s: string[], paragraphs: string[]): string {
    const lower = (title + ' ' + h1s.join(' ')).toLowerCase();
    if (/^how (to|do|can|does)|guide|tutorial|step-by-step|walkthrough/.test(lower)) return 'How-To';
    if (/^what is|^why |^when |definition|meaning|explained|overview/.test(lower)) return 'Informational';
    if (/best |top \d+|vs\.?|compare|comparison|review/.test(lower)) return 'Comparative';
    if (/buy|price|cost|cheap|deal|discount|purchase|shop/.test(lower)) return 'Transactional';
    if (/news|latest|update|released|announced/.test(lower)) return 'News';
    if (paragraphs.length > 0 && paragraphs[0].split(/\s+/).length < 30 && /^[A-Z]/.test(paragraphs[0])) return 'Definitional';
    return 'Informational';
  }

  /**
   * Extract questions from headings and paragraphs.
   */
  private static extractQuestions(headings: string[], paragraphs: string[]): string[] {
    const questionWords = /^(what|how|why|when|where|who|which|is|are|can|does|do|will|should|would|could|has|have)\b/i;
    const questions: string[] = [];

    headings.forEach(h => {
      if (questionWords.test(h.trim()) || h.trim().endsWith('?')) {
        questions.push(h.trim().endsWith('?') ? h.trim() : h.trim() + '?');
      }
    });

    paragraphs.forEach(p => {
      const sentences = p.split(/[.!]/);
      sentences.forEach(s => {
        if (s.trim().endsWith('?') || questionWords.test(s.trim())) {
          questions.push(s.trim().endsWith('?') ? s.trim() : s.trim() + '?');
        }
      });
    });

    return [...new Set(questions)].slice(0, 20);
  }

  /**
   * Extract author from meta tags, JSON-LD, or byline elements.
   */
  private static extractAuthor($: ReturnType<typeof load>): string | null {
    // Try meta tags first
    const metaAuthor = $('meta[name="author"]').attr('content')
      || $('meta[property="article:author"]').attr('content');
    if (metaAuthor) return metaAuthor.trim();

    // Try JSON-LD
    let jsonLDAuthor: string | null = null;
    $('script[type="application/ld+json"]').each((_: number, el: any) => {
      try {
        const data = JSON.parse($(el).html() || '');
        const schemas = Array.isArray(data) ? data : [data];
        schemas.forEach(schema => {
          if (schema?.author?.name && !jsonLDAuthor) {
            jsonLDAuthor = schema.author.name;
          }
        });
      } catch {}
    });
    if (jsonLDAuthor) return jsonLDAuthor;

    // Try common HTML patterns
    const bylineSelectors = ['.author', '.byline', '[rel="author"]', '[itemprop="author"]', '.post-author', '.article-author'];
    for (const sel of bylineSelectors) {
      const text = $(sel).first().text().trim();
      if (text && text.length < 80) return text;
    }

    return null;
  }

  /**
   * Extract dates from meta tags and JSON-LD.
   */
  private static extractDate($: ReturnType<typeof load>, keys: string[]): string | null {
    for (const key of keys) {
      const val = $(`meta[name="${key}"]`).attr('content')
        || $(`meta[property="${key}"]`).attr('content')
        || $(`meta[property="article:${key}"]`).attr('content')
        || $(`time[itemprop="${key}"]`).attr('datetime');
      if (val) return val;
    }
    return null;
  }
}
