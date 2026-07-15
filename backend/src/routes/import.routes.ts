import { FastifyInstance } from 'fastify';
import { prisma } from '../db/prisma';
import { verifyJWT } from '../middlewares/auth';
import { CrawlerService } from '../services/crawler.service';
import { MarkdownService } from '../services/markdown.service';
import { ScoringService } from '../services/scoring.service';
import { AIService } from '../services/ai.service';
import { PublishService } from '../services/publish.service';
import { AIActivityService } from '../services/ai-activity.service';

export async function importRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', verifyJWT);

  // ── POST /api/import/validate ──────────────────────────────────────────────
  // Quick URL validation: format, HTTPS, HTTP status, robots, canonical
  fastify.post('/api/import/validate', async (request, reply) => {
    const { url } = request.body as { url: string };

    if (!url || typeof url !== 'string') {
      return reply.status(400).send({ error: 'URL is required' });
    }

    try {
      const result = await CrawlerService.validateUrl(url.trim());
      return result;
    } catch (err: any) {
      console.error('[Import Validate Error]', err);
      return reply.status(500).send({ error: `Validation failed: ${err.message}` });
    }
  });

  // ── POST /api/import/run ───────────────────────────────────────────────────
  // Full import pipeline: validate → crawl → markdown → audit → save
  fastify.post('/api/import/run', async (request, reply) => {
    const user = request.user as any;
    const { url, domains, category } = request.body as {
      url: string;
      domains?: string[];
      category?: string;
    };

    if (!url || typeof url !== 'string') {
      return reply.status(400).send({ error: 'URL is required' });
    }

    const cleanUrl = url.trim();

    try {
      // Log event
      await AIActivityService.logEvent('AUDIT_STARTED', `AEO Audit initiated for URL: ${cleanUrl}`, { url: cleanUrl });

      // ── Step 1: Validate ───────────────────────────────────────────────────
      const validation = await CrawlerService.validateUrl(cleanUrl);
      if (!validation.valid) {
        return reply.status(422).send({
          step: 'validation',
          error: validation.error || 'URL validation failed',
          details: validation,
        });
      }

      // ── Step 2: Crawl the page ────────────────────────────────────────────
      let crawlResult;
      try {
        await AIActivityService.logEvent('URL_CRAWL_STARTED', `Crawl started for URL: ${cleanUrl}`, { url: cleanUrl });
        crawlResult = await CrawlerService.crawlPage(cleanUrl);
        console.log('[RAG Pipeline LOG] Crawl completed successfully for url:', cleanUrl);
        await AIActivityService.logEvent('URL_CRAWL_COMPLETED', `Successfully crawled URL: ${cleanUrl}`, {
          url: cleanUrl,
          domain: crawlResult.domain,
          wordCount: crawlResult.wordCount,
        });
      } catch (crawlErr: any) {
        console.error('[RAG Pipeline ERROR] Crawl failed for url:', cleanUrl, crawlErr);
        return reply.status(422).send({
          step: 'crawl',
          error: `Failed to crawl page: ${crawlErr.message}`,
        });
      }

      // ── Step 3: Generate Markdown ─────────────────────────────────────────
      let markdown = '';
      if (crawlResult.bodyHtml && crawlResult.bodyHtml.length > 100) {
        markdown = MarkdownService.generate(crawlResult.bodyHtml);
      }
      // Fallback to structured generation if markdown is too short
      if (markdown.length < 100 && crawlResult.paragraphs.length > 0) {
        markdown = MarkdownService.generateFromStructured({
          title: crawlResult.title,
          h1: crawlResult.h1,
          h2: crawlResult.h2,
          h3: crawlResult.h3,
          paragraphs: crawlResult.paragraphs,
          lists: crawlResult.lists,
        });
      }
      console.log('[RAG Pipeline LOG] Content extracted successfully, length:', markdown.length);

      // ── Step 4: Run scoring engine ────────────────────────────────────────
      const audit = ScoringService.audit(crawlResult);
      const { scores, panels } = audit;

      // ── Step 5: Run legacy AI analysis (for suggestions / gapAnalysis compat)
      let aiAnalysis: any = {
        aiScore: scores.overall,
        suggestions: [],
        gapAnalysis: { missingKeywords: [], missingTopics: [], missingSections: [] },
        recommendations: [],
      };

      try {
        const title = crawlResult.title || crawlResult.h1[0] || 'Imported Article';
        const contentForAI = markdown.substring(0, 6000);
        aiAnalysis = await AIService.analyzeContent(title, contentForAI, {
          h1: crawlResult.h1,
          h2: crawlResult.h2,
          h3: crawlResult.h3,
          metaDescription: crawlResult.metaDescription || '',
          entities: crawlResult.entities,
          topics: crawlResult.topics,
        });
      } catch (aiErr) {
        console.warn('[Import] AI analysis fallback used:', aiErr);
      }

      // ── Step 6: Generate embedding ────────────────────────────────────────
      const embedding = await AIService.generateEmbedding(markdown.substring(0, 8000));
      console.log('[RAG Pipeline LOG] Embeddings generated successfully, length:', embedding.length);

      // ── Step 7: Build slug from URL ───────────────────────────────────────
      const urlObj = new URL(cleanUrl);
      const pathSlug = urlObj.pathname.replace(/[^a-zA-Z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

      // ── Step 8: Save to database ──────────────────────────────────────────
      const articleTitle = crawlResult.title || crawlResult.h1[0] || pathSlug || 'Imported Article';
      const articleCategory = category || 'Guides & Tutorials';

      const article = await prisma.article.create({
        data: {
          title: articleTitle,
          content: markdown || crawlResult.paragraphs.join('\n\n'),
          category: articleCategory,
          tags: [...crawlResult.topics.slice(0, 5), ...crawlResult.entities.slice(0, 3)].slice(0, 8),
          status: 'DRAFT',
          userId: user.id,
          embedding,

          // Scores
          aiScore: scores.overall,
          visibilityScore: Math.round((scores.chatgpt + scores.googleAI + scores.gemini) / 3),
          confidenceScore: parseFloat((scores.overall / 100).toFixed(2)),
          suggestions: aiAnalysis.suggestions,
          gapAnalysis: aiAnalysis.gapAnalysis,
          recommendations: aiAnalysis.recommendations,

          // Import metadata
          sourceUrl: cleanUrl,
          sourceDomain: crawlResult.domain,
          importedAt: new Date(),
          author: crawlResult.author,
          publishDate: crawlResult.publishDate,
          language: crawlResult.language || 'en',
          wordCount: crawlResult.wordCount,
          readingTime: crawlResult.readingTime,
          metaDescription: crawlResult.metaDescription,
          canonicalUrl: crawlResult.canonicalUrl,
          ogTags: crawlResult.ogTags as any,
          schemas: crawlResult.jsonLD as any,
          entities: crawlResult.entities as any,

          // Audit data
          auditScores: scores as any,
          optimizerData: {
            panels: panels.map(p => ({
              panelId: p.panelId,
              label: p.label,
              score: p.score,
              summary: p.summary,
              issues: p.issues,
            })),
            selectedDomains: domains || ['chatgpt', 'googleAI', 'gemini', 'perplexity', 'claude', 'copilot'],
            auditedAt: new Date().toISOString(),
          } as any,
        },
      });
      console.log('[RAG Pipeline LOG] Embeddings stored in Supabase PostgreSQL database article:', article.id);

      // Log keyword and schema metadata discovery events
      const topTermsCount = (crawlResult.topics?.length || 0) + (crawlResult.entities?.length || 0);
      if (topTermsCount > 0) {
        await AIActivityService.logEvent('KEYWORDS_FOUND', `Extracted ${topTermsCount} topics and entities for keyword mapping`, {
          articleId: article.id,
          topicsCount: crawlResult.topics?.length || 0,
          entitiesCount: crawlResult.entities?.length || 0,
        });
      }

      if (crawlResult.jsonLD && Array.isArray(crawlResult.jsonLD) && crawlResult.jsonLD.length > 0) {
        await AIActivityService.logEvent('SCHEMA_GENERATED', `Discovered and indexed ${crawlResult.jsonLD.length} JSON-LD structured schemas`, {
          articleId: article.id,
          schemaTypes: crawlResult.jsonLD.map((s: any) => s['@type']).filter(Boolean),
        });
      }

      await AIActivityService.logEvent('AUDIT_COMPLETED', `AEO Audit completed. Score: ${article.aiScore}%. Visibility: ${article.visibilityScore}%`, {
        articleId: article.id,
        aiScore: article.aiScore,
        visibilityScore: article.visibilityScore,
      });

      return {
        success: true,
        article,
        crawlResult: {
          url: crawlResult.url,
          domain: crawlResult.domain,
          title: crawlResult.title,
          metaDescription: crawlResult.metaDescription,
          author: crawlResult.author,
          publishDate: crawlResult.publishDate,
          language: crawlResult.language,
          wordCount: crawlResult.wordCount,
          readingTime: crawlResult.readingTime,
          h1: crawlResult.h1,
          h2: crawlResult.h2,
          h3: crawlResult.h3,
          internalLinks: crawlResult.internalLinks.length,
          externalLinks: crawlResult.externalLinks.length,
          images: crawlResult.images.length,
          entities: crawlResult.entities,
          topics: crawlResult.topics,
          primaryIntent: crawlResult.primaryIntent,
          jsonLDTypes: crawlResult.jsonLD.map(s => s['@type']).filter(Boolean),
        },
        markdown,
        auditScores: scores,
        optimizerPanels: panels,
      };

    } catch (err: any) {
      console.error('[Import Run Error]', err);
      return reply.status(500).send({
        error: `Import failed: ${err.message}`,
        step: 'unknown',
      });
    }
  });

  // ── POST /api/import/reaudit ───────────────────────────────────────────────
  // Re-run audit on existing article content (for real-time optimizer)
  fastify.post('/api/import/reaudit', async (request, reply) => {
    const user = request.user as any;
    const { articleId, content, title } = request.body as {
      articleId?: string;
      content: string;
      title: string;
    };

    if (!content || !title) {
      return reply.status(400).send({ error: 'Content and title are required' });
    }

    try {
      await AIActivityService.logEvent('AUDIT_STARTED', `AEO Audit re-initiated for article: "${title}"`, { articleId, title });
      // Build a minimal crawl result from markdown content for scoring
      const lines = content.split('\n');
      const h1 = lines.filter(l => /^# /.test(l)).map(l => l.replace(/^# /, '').trim());
      const h2 = lines.filter(l => /^## /.test(l)).map(l => l.replace(/^## /, '').trim());
      const h3 = lines.filter(l => /^### /.test(l)).map(l => l.replace(/^### /, '').trim());
      const paragraphs = lines.filter(l => l.trim().length > 30 && !l.startsWith('#') && !l.startsWith('-') && !l.startsWith('|')).map(l => l.trim());
      const lists: string[][] = [];
      let currentList: string[] = [];
      lines.forEach(l => {
        if (/^[-*] /.test(l)) {
          currentList.push(l.replace(/^[-*] /, '').trim());
        } else if (currentList.length > 0) {
          lists.push([...currentList]);
          currentList = [];
        }
      });

      // Build a synthetic CrawlResult from the content
      const wordCount = content.split(/\s+/).filter(Boolean).length;
      const syntheticCrawl: any = {
        url: '',
        finalUrl: '',
        domain: '',
        https: true,
        statusCode: 200,
        redirected: false,
        robotsAllowed: true,
        canonicalUrl: null,
        title,
        metaTitle: title,
        metaDescription: '',
        language: 'en',
        author: null,
        publishDate: null,
        modifiedDate: null,
        h1: h1.length > 0 ? h1 : [title],
        h2,
        h3,
        paragraphs,
        lists,
        tables: [],
        images: [],
        internalLinks: [],
        externalLinks: [],
        ogTags: {},
        twitterTags: {},
        jsonLD: [],
        wordCount,
        readingTime: Math.max(1, Math.round(wordCount / 200)),
        entities: [],
        topics: h2,
        primaryIntent: 'Informational',
        questions: [...h2, ...h3].filter(h => /^(what|how|why|when|where|who)/i.test(h) || h.endsWith('?')),
        bodyHtml: '',
      };

      const audit = ScoringService.audit(syntheticCrawl);

      // Update article in DB if ID provided
      if (articleId) {
        try {
          const existing = await prisma.article.findFirst({ where: { id: articleId, userId: user.id } });
          if (existing) {
            await prisma.article.update({
              where: { id: articleId },
              data: {
                aiScore: audit.scores.overall,
                auditScores: audit.scores as any,
                optimizerData: {
                  panels: audit.panels,
                  auditedAt: new Date().toISOString(),
                } as any,
              },
            });
          }
        } catch (dbErr) {
          console.warn('[Reaudit] DB update skipped:', dbErr);
        }
      }

      await AIActivityService.logEvent('AUDIT_COMPLETED', `AEO Audit completed for article: "${title}". Score: ${audit.scores.overall}%`, {
        articleId,
        title,
        aiScore: audit.scores.overall,
        visibilityScore: Math.round((audit.scores.chatgpt + audit.scores.googleAI + audit.scores.gemini) / 3),
      });

      return {
        auditScores: audit.scores,
        optimizerPanels: audit.panels,
        metrics: audit.metrics,
      };
    } catch (err: any) {
      console.error('[Reaudit Error]', err);
      return reply.status(500).send({ error: `Re-audit failed: ${err.message}` });
    }
  });

  // ── POST /api/import/re-audit-url ──────────────────────────────────────────
  fastify.post('/api/import/re-audit-url', async (request, reply) => {
    const { articleId } = request.body as { articleId: string };

    if (!articleId) {
      return reply.status(400).send({ error: 'Article ID is required' });
    }

    try {
      const existingArticle = await prisma.article.findUnique({
        where: { id: articleId },
      });

      if (!existingArticle || !existingArticle.sourceUrl) {
        return reply.status(404).send({ error: 'Article not found or has no source URL to re-audit' });
      }

      const cleanUrl = existingArticle.sourceUrl.trim();
      await AIActivityService.logEvent('AUDIT_STARTED', `AEO Audit re-initiated for URL: ${cleanUrl}`, { url: cleanUrl, articleId });

      // ── Step 1: Validate ──
      const validation = await CrawlerService.validateUrl(cleanUrl);
      if (!validation.valid) {
        return reply.status(422).send({
          step: 'validation',
          error: validation.error || 'URL validation failed',
          details: validation,
        });
      }

      // ── Step 2: Crawl the page ──
      await AIActivityService.logEvent('URL_CRAWL_STARTED', `Crawl re-started for URL: ${cleanUrl}`, { url: cleanUrl, articleId });
      const crawlResult = await CrawlerService.crawlPage(cleanUrl);
      console.log('[RAG Pipeline LOG] Re-Audit crawl completed successfully for url:', cleanUrl);
      await AIActivityService.logEvent('URL_CRAWL_COMPLETED', `Successfully crawled URL: ${cleanUrl}`, {
        url: cleanUrl,
        domain: crawlResult.domain,
        wordCount: crawlResult.wordCount,
      });

      // ── Step 3: Generate Markdown ──
      let markdown = '';
      if (crawlResult.bodyHtml && crawlResult.bodyHtml.length > 100) {
        markdown = MarkdownService.generate(crawlResult.bodyHtml);
      }
      if (markdown.length < 100 && crawlResult.paragraphs.length > 0) {
        markdown = MarkdownService.generateFromStructured({
          title: crawlResult.title,
          h1: crawlResult.h1,
          h2: crawlResult.h2,
          h3: crawlResult.h3,
          paragraphs: crawlResult.paragraphs,
          lists: crawlResult.lists,
        });
      }
      console.log('[RAG Pipeline LOG] Re-Audit content extracted successfully, length:', markdown.length);

      // ── Step 4: Run scoring engine ──
      const audit = ScoringService.audit(crawlResult);
      const { scores, panels } = audit;

      // ── Step 5: Run legacy AI analysis ──
      let aiAnalysis: any = {
        aiScore: scores.overall,
        suggestions: [],
        gapAnalysis: { missingKeywords: [], missingTopics: [], missingSections: [] },
        recommendations: [],
      };

      try {
        const title = crawlResult.title || crawlResult.h1[0] || existingArticle.title;
        const contentForAI = markdown.substring(0, 6000);
        aiAnalysis = await AIService.analyzeContent(title, contentForAI, {
          h1: crawlResult.h1,
          h2: crawlResult.h2,
          h3: crawlResult.h3,
          metaDescription: crawlResult.metaDescription || '',
          entities: crawlResult.entities,
          topics: crawlResult.topics,
        });
      } catch (aiErr) {
        console.warn('[Re-Audit URL] AI analysis fallback used:', aiErr);
      }

      // ── Step 6: Generate embedding ──
      const embedding = await AIService.generateEmbedding(markdown.substring(0, 8000));
      console.log('[RAG Pipeline LOG] Re-Audit embeddings generated successfully, length:', embedding.length);

      // ── Step 7: Update in database ──
      const articleTitle = crawlResult.title || crawlResult.h1[0] || existingArticle.title;

      const updatedArticle = await prisma.article.update({
        where: { id: articleId },
        data: {
          title: articleTitle,
          content: markdown || crawlResult.paragraphs.join('\n\n'),
          tags: [...crawlResult.topics.slice(0, 5), ...crawlResult.entities.slice(0, 3)].slice(0, 8),
          embedding,
          aiScore: scores.overall,
          visibilityScore: Math.round((scores.chatgpt + scores.googleAI + scores.gemini) / 3),
          confidenceScore: parseFloat((scores.overall / 100).toFixed(2)),
          suggestions: aiAnalysis.suggestions,
          gapAnalysis: aiAnalysis.gapAnalysis,
          recommendations: aiAnalysis.recommendations,
          importedAt: new Date(),
          wordCount: crawlResult.wordCount,
          readingTime: crawlResult.readingTime,
          metaDescription: crawlResult.metaDescription,
          canonicalUrl: crawlResult.canonicalUrl,
          ogTags: crawlResult.ogTags as any,
          schemas: crawlResult.jsonLD as any,
          entities: crawlResult.entities as any,
          auditScores: scores as any,
          optimizerData: {
            panels: panels.map(p => ({
              panelId: p.panelId,
              label: p.label,
              score: p.score,
              summary: p.summary,
              issues: p.issues,
            })),
            selectedDomains: existingArticle.optimizerData && (existingArticle.optimizerData as any).selectedDomains
              ? (existingArticle.optimizerData as any).selectedDomains
              : ['chatgpt', 'googleAI', 'gemini', 'perplexity', 'claude', 'copilot'],
            auditedAt: new Date().toISOString(),
          } as any,
        },
      });
      console.log('[RAG Pipeline LOG] Re-Audit embeddings updated in Supabase database article:', updatedArticle.id);

      // Discovered structures / schemas
      if (crawlResult.jsonLD && Array.isArray(crawlResult.jsonLD) && crawlResult.jsonLD.length > 0) {
        await AIActivityService.logEvent('SCHEMA_GENERATED', `Discovered and indexed ${crawlResult.jsonLD.length} JSON-LD structured schemas`, {
          articleId: updatedArticle.id,
          schemaTypes: crawlResult.jsonLD.map((s: any) => s['@type']).filter(Boolean),
        });
      }

      // Keywords found
      const topTermsCount = (crawlResult.topics?.length || 0) + (crawlResult.entities?.length || 0);
      if (topTermsCount > 0) {
        await AIActivityService.logEvent('KEYWORDS_FOUND', `Extracted ${topTermsCount} topics and entities for keyword mapping`, {
          articleId: updatedArticle.id,
          topicsCount: crawlResult.topics?.length || 0,
          entitiesCount: crawlResult.entities?.length || 0,
        });
      }

      // Audit completed
      await AIActivityService.logEvent('AUDIT_COMPLETED', `AEO Audit completed. Score: ${updatedArticle.aiScore}%. Visibility: ${updatedArticle.visibilityScore}%`, {
        articleId: updatedArticle.id,
        aiScore: updatedArticle.aiScore,
        visibilityScore: updatedArticle.visibilityScore,
      });

      return {
        success: true,
        article: updatedArticle,
        crawlResult: {
          url: crawlResult.url,
          domain: crawlResult.domain,
          title: crawlResult.title,
          metaDescription: crawlResult.metaDescription,
          author: crawlResult.author,
          publishDate: crawlResult.publishDate,
          language: crawlResult.language,
          wordCount: crawlResult.wordCount,
          readingTime: crawlResult.readingTime,
          h1: crawlResult.h1,
          h2: crawlResult.h2,
          h3: crawlResult.h3,
          internalLinks: crawlResult.internalLinks.length,
          externalLinks: crawlResult.externalLinks.length,
          images: crawlResult.images.length,
          entities: crawlResult.entities,
          topics: crawlResult.topics,
          primaryIntent: crawlResult.primaryIntent,
          jsonLDTypes: crawlResult.jsonLD.map((s: any) => s['@type']).filter(Boolean),
        },
        markdown: markdown || '',
        auditScores: scores,
        optimizerPanels: panels,
      };
    } catch (err: any) {
      console.error('[Re-Audit URL Error]', err);
      return reply.status(500).send({ error: `Re-audit failed: ${err.message}` });
    }
  });

  // ── POST /api/import/publish ──────────────────────────────────────────────
  fastify.post('/api/import/publish', async (request, reply) => {
    const { articleId, cms, rewrittenContent, details } = request.body as {
      articleId: string;
      cms: 'wordpress' | 'shopify' | 'webflow' | 'custom';
      rewrittenContent: string;
      details: any;
    };

    if (!articleId || !cms || !rewrittenContent || !details) {
      return reply.status(400).send({ error: 'Missing required parameters: articleId, cms, rewrittenContent, and details' });
    }

    try {
      const article = await prisma.article.findUnique({
        where: { id: articleId },
      });

      if (!article) {
        return reply.status(404).send({ error: 'Article not found' });
      }

      let result: { liveUrl: string };

      switch (cms) {
        case 'wordpress':
          result = await PublishService.publishToWordPress(article.title, rewrittenContent, details);
          break;
        case 'shopify':
          result = await PublishService.publishToShopify(article.title, rewrittenContent, details);
          break;
        case 'webflow':
          result = await PublishService.publishToWebflow(article.title, rewrittenContent, details);
          break;
        case 'custom':
          result = await PublishService.publishToCustom(article.title, rewrittenContent, details);
          break;
        default:
          return reply.status(400).send({ error: `Unsupported CMS: ${cms}` });
      }

      // Update the article's source URL to the newly published URL
      await prisma.article.update({
        where: { id: articleId },
        data: {
          sourceUrl: result.liveUrl,
        },
      });

      return {
        success: true,
        liveUrl: result.liveUrl,
      };

    } catch (err: any) {
      console.error('[Publishing Error]', err);
      return reply.status(500).send({ error: `Publishing failed: ${err.message}` });
    }
  });
}

// ── Helper: Infer article category from content ────────────────────────────

function inferCategory(crawl: { primaryIntent: string; topics: string[]; h2: string[] }): string {
  const text = [...crawl.topics, ...crawl.h2].join(' ').toLowerCase();
  if (/marketing|seo|aeo|content|brand|advertis/.test(text)) return 'Marketing';
  if (/tech|engineer|code|program|develop|software|api|data/.test(text)) return 'Tech & Engineering';
  if (/guide|tutorial|how-to|step|learn|beginner/.test(text)) return 'Guides & Tutorials';
  if (/product|feature|update|release|announce/.test(text)) return 'Productivity';
  if (/insight|analysis|trend|report|research/.test(text)) return 'AEO Insights';
  return 'General';
}
