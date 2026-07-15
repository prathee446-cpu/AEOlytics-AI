import { FastifyInstance } from 'fastify';
import { prisma } from '../db/prisma';
import { verifyJWT } from '../middlewares/auth';
import { AIService } from '../services/ai.service';
import { CrawlerService } from '../services/crawler.service';
import { MarkdownService } from '../services/markdown.service';

export async function visibilityRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', verifyJWT);

  // ── POST /api/visibility/scan ──────────────────────────────────────────────
  // Crawls the URL, generates queries, sends to LLM, calculates visibility score
  fastify.post('/api/visibility/scan', async (request, reply) => {
    const user = request.user as any;
    const { url, competitors = [] } = request.body as {
      url: string;
      competitors?: string[];
    };

    if (!url || typeof url !== 'string') {
      return reply.status(400).send({ error: 'URL is required' });
    }

    const cleanUrl = url.trim();

    try {
      // Step 1: Crawl the target URL for content
      console.log('[Visibility Scan] Crawling URL:', cleanUrl);
      let crawlResult;
      try {
        crawlResult = await CrawlerService.crawlPage(cleanUrl);
      } catch (crawlErr: any) {
        return reply.status(422).send({ error: `Failed to crawl URL: ${crawlErr.message}` });
      }

      // Step 2: Extract content markdown
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

      const title = crawlResult.title || crawlResult.h1[0] || 'Website';
      const domain = crawlResult.domain;
      console.log('[Visibility Scan] Content extracted. Domain:', domain, 'Length:', markdown.length);

      // Step 3: Generate AI search queries
      console.log('[Visibility Scan] Generating AI search queries...');
      const queries = await AIService.generateVisibilityQueries(title, markdown, domain);
      console.log('[Visibility Scan] Generated', queries.length, 'queries');

      // Step 4: Run each query through LLM and analyze responses
      console.log('[Visibility Scan] Analyzing visibility across', queries.length, 'queries...');
      const queryResults = await Promise.allSettled(
        queries.map(q => AIService.analyzeVisibilityResponse(q, domain, competitors))
      );

      // Step 5: Calculate aggregate metrics
      const resolvedResults = queryResults
        .filter(r => r.status === 'fulfilled')
        .map((r: any) => r.value);

      const totalQueries = resolvedResults.length;
      const mentionCount = resolvedResults.filter(r => r.mentioned).length;
      const mentionPercent = totalQueries > 0
        ? parseFloat(((mentionCount / totalQueries) * 100).toFixed(1))
        : 0;
      const visibilityScore = mentionPercent;

      // Aggregate competitor mentions across all queries
      const competitorAggregate: Record<string, number> = {};
      resolvedResults.forEach(r => {
        r.competitorMentions.forEach((c: { domain: string; count: number }) => {
          competitorAggregate[c.domain] = (competitorAggregate[c.domain] || 0) + c.count;
        });
      });
      const topCompetitors = Object.entries(competitorAggregate)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([d, mentions]) => ({ domain: d, mentions }));

      // Avg mention position
      const mentionedResults = resolvedResults.filter(r => r.mentioned && r.mentionPosition !== null);
      const avgPosition = mentionedResults.length > 0
        ? parseFloat((mentionedResults.reduce((s, r) => s + (r.mentionPosition || 0), 0) / mentionedResults.length).toFixed(1))
        : null;

      // Step 6: Persist scan to database
      const scan = await prisma.visibilityScan.create({
        data: {
          userId: user.id,
          url: cleanUrl,
          domain,
          visibilityScore,
          totalQueries,
          mentionCount,
          mentionPercent,
          competitorDomains: competitors,
          topCompetitors: topCompetitors as any,
          avgPosition,
          queries: {
            create: queries.map((q, i) => {
              const result = resolvedResults[i] || {
                llmResponse: '',
                mentioned: false,
                mentionPosition: null,
                competitorMentions: [],
                queryScore: 0,
              };
              return {
                query: q,
                llmResponse: result.llmResponse.substring(0, 5000),
                mentioned: result.mentioned,
                mentionPosition: result.mentionPosition,
                competitorMentions: result.competitorMentions as any,
                queryScore: result.queryScore,
              };
            }),
          },
        },
        include: { queries: true },
      });

      console.log('[Visibility Scan] Complete. Score:', visibilityScore, '% | Mentions:', mentionCount, '/', totalQueries);

      return {
        success: true,
        scan: {
          id: scan.id,
          url: scan.url,
          domain: scan.domain,
          visibilityScore: scan.visibilityScore,
          totalQueries: scan.totalQueries,
          mentionCount: scan.mentionCount,
          mentionPercent: scan.mentionPercent,
          topCompetitors: scan.topCompetitors,
          avgPosition: scan.avgPosition,
          scannedAt: scan.scannedAt,
          queries: scan.queries.map(q => ({
            id: q.id,
            query: q.query,
            mentioned: q.mentioned,
            mentionPosition: q.mentionPosition,
            competitorMentions: q.competitorMentions,
            queryScore: q.queryScore,
            llmResponseExcerpt: q.llmResponse.substring(0, 300),
          })),
        },
      };
    } catch (err: any) {
      console.error('[Visibility Scan Error]', err);
      return reply.status(500).send({ error: `Visibility scan failed: ${err.message}` });
    }
  });

  // ── GET /api/visibility/latest ─────────────────────────────────────────────
  fastify.get('/api/visibility/latest', async (request, reply) => {
    const user = request.user as any;

    const scan = await prisma.visibilityScan.findFirst({
      where: { userId: user.id },
      orderBy: { scannedAt: 'desc' },
      include: {
        queries: {
          select: {
            id: true,
            query: true,
            mentioned: true,
            mentionPosition: true,
            competitorMentions: true,
            queryScore: true,
          },
        },
      },
    });

    if (!scan) return { scan: null };

    return {
      scan: {
        id: scan.id,
        url: scan.url,
        domain: scan.domain,
        visibilityScore: scan.visibilityScore,
        totalQueries: scan.totalQueries,
        mentionCount: scan.mentionCount,
        mentionPercent: scan.mentionPercent,
        topCompetitors: scan.topCompetitors,
        avgPosition: scan.avgPosition,
        scannedAt: scan.scannedAt,
        queries: scan.queries,
      },
    };
  });

  // ── GET /api/visibility/history ────────────────────────────────────────────
  fastify.get('/api/visibility/history', async (request, reply) => {
    const user = request.user as any;

    const scans = await prisma.visibilityScan.findMany({
      where: { userId: user.id },
      orderBy: { scannedAt: 'asc' },
      select: {
        id: true,
        domain: true,
        visibilityScore: true,
        totalQueries: true,
        mentionCount: true,
        mentionPercent: true,
        scannedAt: true,
      },
    });

    return { history: scans };
  });

  // ── GET /api/visibility/scan/:id ───────────────────────────────────────────
  fastify.get('/api/visibility/scan/:id', async (request, reply) => {
    const user = request.user as any;
    const { id } = request.params as { id: string };

    const scan = await prisma.visibilityScan.findFirst({
      where: { id, userId: user.id },
      include: { queries: true },
    });

    if (!scan) return reply.status(404).send({ error: 'Scan not found' });

    return { scan };
  });
}
