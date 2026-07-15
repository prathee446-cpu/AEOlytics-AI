import { FastifyInstance } from 'fastify';
import { prisma } from '../db/prisma';
import { verifyJWT } from '../middlewares/auth';
import { AIService } from '../services/ai.service';
import { CrawlerService } from '../services/crawler.service';
import { MarkdownService } from '../services/markdown.service';
import { SSEService } from '../services/sse.service';
import { env } from '../config/env';

const SUPPORTED_ENGINES = ['chatgpt', 'gemini', 'claude', 'perplexity'];

export async function radarRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', verifyJWT);

  // ── POST /api/radar/scan ───────────────────────────────────────────────────
  // Runs a full multi-engine AI radar scan for a website
  fastify.post('/api/radar/scan', async (request, reply) => {
    const user = request.user as any;
    const {
      url,
      queries = [],
      competitors = [],
      engines = SUPPORTED_ENGINES,
    } = request.body as {
      url: string;
      queries?: string[];
      competitors?: string[];
      engines?: string[];
    };

    if (!url) return reply.status(400).send({ error: 'URL is required' });
    if (queries.length === 0) return reply.status(400).send({ error: 'At least one query is required' });

    const cleanUrl = url.trim();
    // LOG STAGE: URL received
    console.log(`[Radar] URL received: ${cleanUrl}`);

    const validEngines = engines.filter(e => SUPPORTED_ENGINES.includes(e));

    try {
      // Step 1: Crawl URL to get domain
      let domain = '';
      try {
        const crawlResult = await CrawlerService.crawlPage(cleanUrl);
        domain = crawlResult.domain;
      } catch {
        // Try extracting domain from URL directly
        try { domain = new URL(cleanUrl).hostname.replace('www.', ''); } catch {}
        if (!domain) return reply.status(422).send({ error: 'Invalid URL — could not resolve domain' });
      }

      // LOG STAGE: Tracking started
      console.log(`[Radar] Tracking started for domain: ${domain}`);

      // Step 2: Run each query against each engine in parallel batches
      const allResultPromises: Promise<any>[] = [];
      const resultMeta: { queryIndex: number; engineIndex: number; query: string; engine: string }[] = [];

      queries.forEach((query, qi) => {
        validEngines.forEach((engine, ei) => {
          allResultPromises.push(
            AIService.analyzeRadarQuery(query, domain, engine, competitors)
          );
          resultMeta.push({ queryIndex: qi, engineIndex: ei, query, engine });
        });
      });

      const settled = await Promise.allSettled(allResultPromises);
      const analysisResults = settled.map((r, i) => ({
        ...resultMeta[i],
        ...(r.status === 'fulfilled' ? r.value : {
          mentioned: false,
          rankPosition: null,
          citationStatus: 'none',
          competitorMentions: [],
          responseExcerpt: '',
          queryScore: 0,
        }),
      }));

      // LOG STAGE: Data collected
      const totalChecks = analysisResults.length;
      const totalMentions = analysisResults.filter(r => r.mentioned).length;
      console.log(`[Radar] Data collected. Checks: ${totalChecks}, Mentions: ${totalMentions}`);

      // Step 3: Calculate aggregate metrics & LOG STAGE: Visibility score calculated
      const overallScore = totalChecks > 0
        ? parseFloat(((totalMentions / totalChecks) * 100).toFixed(1))
        : 0;
      console.log(`[Radar] Visibility score calculated: ${overallScore}%`);

      // Step 4: Generate AI recommendations
      console.log('[Radar] Generating AI recommendations...');
      const recommendations = await AIService.generateRadarRecommendations(domain, analysisResults);

      // Step 5: Persist to database
      const session = await prisma.radarSession.create({
        data: {
          userId: user.id,
          url: cleanUrl,
          domain,
          engines: validEngines,
          trackedQueries: queries,
          competitorDomains: competitors,
          overallScore,
          totalChecks,
          totalMentions,
          results: {
            create: analysisResults.map(r => ({
              query: r.query,
              engine: r.engine,
              mentioned: r.mentioned,
              rankPosition: r.rankPosition,
              citationStatus: r.citationStatus,
              competitorMentions: r.competitorMentions as any,
              responseExcerpt: r.responseExcerpt,
              queryScore: r.queryScore,
            })),
          },
          recommendations: {
            create: recommendations.map(rec => ({
              type: rec.type,
              priority: rec.priority,
              engine: rec.engine ?? null,
              title: rec.title,
              description: rec.description,
            })),
          },
        },
        include: {
          results: true,
          recommendations: true,
        },
      });

      // LOG STAGE: Database updated
      console.log(`[Radar] Database updated. Session ID: ${session.id} for domain: ${domain}`);

      // LOG STAGE: WebSocket / SSE event sent
      console.log(`[Radar] WebSocket/SSE event sent to user: ${user.id} for domain: ${domain}`);
      SSEService.sendToUser(user.id, 'radar_update', {
        session,
        previousScore: overallScore,
        changeType: 'stable',
        scoreDiff: 0,
        domain,
      });

      SSEService.sendToUser(user.id, 'activity', {
        type: 'activity',
        message: `Visibility tracking for ${domain} completed via manual trigger.`,
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        session: {
          id: session.id,
          url: session.url,
          domain: session.domain,
          engines: session.engines,
          overallScore: session.overallScore,
          totalChecks: session.totalChecks,
          totalMentions: session.totalMentions,
          scannedAt: session.scannedAt,
          results: session.results,
          recommendations: session.recommendations,
        },
      };
    } catch (err: any) {
      console.error('[Radar Scan Error]', err);
      return reply.status(500).send({ error: `Radar scan failed: ${err.message}` });
    }
  });

  // ── GET /api/radar/latest ──────────────────────────────────────────────────
  fastify.get('/api/radar/latest', async (request, reply) => {
    const user = request.user as any;
    const session = await prisma.radarSession.findFirst({
      where: { userId: user.id },
      orderBy: { scannedAt: 'desc' },
      include: { results: true, recommendations: true },
    });
    return { session };
  });

  // ── GET /api/radar/history ─────────────────────────────────────────────────
  fastify.get('/api/radar/history', async (request, reply) => {
    const user = request.user as any;
    const sessions = await prisma.radarSession.findMany({
      where: { userId: user.id },
      orderBy: { scannedAt: 'asc' },
      select: {
        id: true,
        domain: true,
        overallScore: true,
        totalChecks: true,
        totalMentions: true,
        engines: true,
        scannedAt: true,
      },
    });
    return { history: sessions };
  });

  // ── GET /api/radar/recommendations ────────────────────────────────────────
  fastify.get('/api/radar/recommendations', async (request, reply) => {
    const user = request.user as any;
    const session = await prisma.radarSession.findFirst({
      where: { userId: user.id },
      orderBy: { scannedAt: 'desc' },
      select: { id: true, domain: true, scannedAt: true },
    });
    if (!session) return { recommendations: [] };

    const recs = await prisma.radarRecommendation.findMany({
      where: { sessionId: session.id },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    });
    return { recommendations: recs, domain: session.domain, scannedAt: session.scannedAt };
  });

  // ── GET /api/ai-radar/domains ─────────────────────────────────────────────
  // Returns all unique domains currently being tracked by the user
  fastify.get('/api/ai-radar/domains', async (request, reply) => {
    const user = request.user as any;
    
    // Find all sessions for this user, ordered by scannedAt desc to get last updated times
    const sessions = await prisma.radarSession.findMany({
      where: { userId: user.id },
      select: { domain: true, url: true, scannedAt: true },
      orderBy: { scannedAt: 'desc' },
    });

    const uniqueDomainsMap = new Map<string, { domain: string; url: string; lastUpdated: string }>();
    for (const s of sessions) {
      if (!uniqueDomainsMap.has(s.domain)) {
        uniqueDomainsMap.set(s.domain, {
          domain: s.domain,
          url: s.url,
          lastUpdated: s.scannedAt.toISOString(),
        });
      }
    }

    return { success: true, domains: Array.from(uniqueDomainsMap.values()) };
  });

  // ── GET /api/ai-radar ─────────────────────────────────────────────────────
  // Returns the latest radar session for the authenticated user, optionally filtered by domain
  fastify.get('/api/ai-radar', async (request, reply) => {
    const user = request.user as any;
    const { domain } = request.query as { domain?: string };
    
    const queryCond: any = { userId: user.id };
    if (domain) {
      queryCond.domain = domain.trim().toLowerCase();
    }

    const session = await prisma.radarSession.findFirst({
      where: queryCond,
      orderBy: { scannedAt: 'desc' },
      include: { results: true, recommendations: true },
    });
    return { success: true, session };
  });

  // ── GET /api/ai-radar/history ─────────────────────────────────────────────
  // Returns all historical visibility sessions for the authenticated user, optionally filtered by domain
  fastify.get('/api/ai-radar/history', async (request, reply) => {
    const user = request.user as any;
    const { domain } = request.query as { domain?: string };

    const queryCond: any = { userId: user.id };
    if (domain) {
      queryCond.domain = domain.trim().toLowerCase();
    }

    const sessions = await prisma.radarSession.findMany({
      where: queryCond,
      orderBy: { scannedAt: 'desc' },
      select: {
        id: true,
        url: true,
        domain: true,
        overallScore: true,
        totalChecks: true,
        totalMentions: true,
        engines: true,
        scannedAt: true,
      },
    });
    return { success: true, history: sessions };
  });

  // ── GET /api/ai-radar/platforms ───────────────────────────────────────────
  // Returns appearance rates, trends, status (online/simulated) and last check times per engine, optionally filtered by domain
  fastify.get('/api/ai-radar/platforms', async (request, reply) => {
    const user = request.user as any;
    const { domain } = request.query as { domain?: string };

    const queryCond: any = { userId: user.id };
    if (domain) {
      queryCond.domain = domain.trim().toLowerCase();
    }

    const sessions = await prisma.radarSession.findMany({
      where: queryCond,
      orderBy: { scannedAt: 'desc' },
      take: 2,
      include: { results: true },
    });

    const latest = sessions[0];
    const previous = sessions[1];

    const platforms = ['chatgpt', 'gemini', 'claude', 'perplexity'].map(platformId => {
      // Calculate latest score
      const latestResults = latest?.results.filter(r => r.engine === platformId) || [];
      const latestTotal = latestResults.length;
      const latestMentions = latestResults.filter(r => r.mentioned).length;
      const score = latestTotal > 0 ? Math.round((latestMentions / latestTotal) * 100) : 0;

      // Calculate previous score
      const prevResults = previous?.results.filter(r => r.engine === platformId) || [];
      const prevTotal = prevResults.length;
      const prevMentions = prevResults.filter(r => r.mentioned).length;
      const prevScore = prevTotal > 0 ? Math.round((prevMentions / prevTotal) * 100) : 0;

      // Calculate trend
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (latest && previous) {
        if (score > prevScore) trend = 'up';
        else if (score < prevScore) trend = 'down';
      }

      // Check status based on configured API keys in environment
      let status = 'simulated';
      if (platformId === 'chatgpt' && env.OPENAI_API_KEY) status = 'online';
      else if (platformId === 'gemini' && env.GEMINI_API_KEY) status = 'online';
      else if (platformId === 'claude' && env.GROQ_API_KEY) status = 'online';

      return {
        id: platformId,
        name: platformId === 'chatgpt' ? 'ChatGPT' : platformId.charAt(0).toUpperCase() + platformId.slice(1),
        score,
        trend,
        lastUpdated: latest ? latest.scannedAt : null,
        status,
      };
    });

    return { success: true, platforms };
  });

  // ── GET /api/ai-radar/alerts ──────────────────────────────────────────────
  // Generates dynamic visibility alerts based on latest scan scores and recommendations, optionally filtered by domain
  fastify.get('/api/ai-radar/alerts', async (request, reply) => {
    const user = request.user as any;
    const { domain } = request.query as { domain?: string };

    const queryCond: any = { userId: user.id };
    if (domain) {
      queryCond.domain = domain.trim().toLowerCase();
    }

    const sessions = await prisma.radarSession.findMany({
      where: queryCond,
      orderBy: { scannedAt: 'desc' },
      take: 2,
      include: { recommendations: true, results: true },
    });

    const latest = sessions[0];
    const previous = sessions[1];

    const alerts: Array<{
      id: string;
      type: 'success' | 'warning' | 'info';
      title: string;
      description: string;
      timestamp: string;
    }> = [];

    if (!latest) {
      return { success: true, alerts };
    }

    const timestamp = latest.scannedAt.toISOString();

    // 1. Overall Visibility alert
    if (latest.overallScore >= 70) {
      alerts.push({
        id: `alert-score-high-${latest.id}`,
        type: 'success',
        title: 'Strong AI Search Visibility',
        description: `Your website has a high visibility score of ${latest.overallScore}% across AI engines. Keep up the good work!`,
        timestamp,
      });
    } else if (latest.overallScore < 35) {
      alerts.push({
        id: `alert-score-low-${latest.id}`,
        type: 'warning',
        title: 'Critical AI Search Gap',
        description: `Your visibility score is critically low (${latest.overallScore}%). Review AI recommendations to improve citation potential.`,
        timestamp,
      });
    }

    // 2. Score drop/rise alert
    if (previous) {
      const diff = latest.overallScore - previous.overallScore;
      if (diff < -2) {
        alerts.push({
          id: `alert-score-drop-${latest.id}`,
          type: 'warning',
          title: 'Visibility Score Decreased',
          description: `Your overall visibility dropped by ${Math.abs(diff).toFixed(1)}% since the last audit. Check queries for details.`,
          timestamp,
        });
      } else if (diff > 2) {
        alerts.push({
          id: `alert-score-rise-${latest.id}`,
          type: 'success',
          title: 'Visibility Score Improved',
          description: `Great! Your visibility score increased by +${diff.toFixed(1)}% since your last audit.`,
          timestamp,
        });
      }
    }

    // 3. Low visibility on specific engines
    const platforms = ['chatgpt', 'gemini', 'claude', 'perplexity'];
    platforms.forEach(platformId => {
      const platformResults = latest.results.filter(r => r.engine === platformId);
      const total = platformResults.length;
      const mentions = platformResults.filter(r => r.mentioned).length;
      const score = total > 0 ? (mentions / total) * 100 : 0;

      if (total > 0 && score < 30) {
        alerts.push({
          id: `alert-platform-low-${platformId}-${latest.id}`,
          type: 'warning',
          title: `Low Presence on ${platformId === 'chatgpt' ? 'ChatGPT' : platformId.charAt(0).toUpperCase() + platformId.slice(1)}`,
          description: `Your site was cited in only ${score.toFixed(0)}% of queries checked on ${platformId}. Optimizations are needed.`,
          timestamp,
        });
      }
    });

    // 4. Recommendation based alert
    const highPriorityRec = latest.recommendations.find(r => r.priority === 'high');
    if (highPriorityRec) {
      alerts.push({
        id: `alert-rec-high-${highPriorityRec.id}`,
        type: 'info',
        title: 'High Priority Action Item',
        description: `${highPriorityRec.title}: ${highPriorityRec.description}`,
        timestamp,
      });
    }

    return { success: true, alerts };
  });

  // ── GET /api/ai-radar/live ────────────────────────────────────────────────
  // Establishes Server-Sent Events stream for real-time visibility events
  fastify.get('/api/ai-radar/live', async (request, reply) => {
    const user = request.user as any;
    
    // Add connection to SSEService
    SSEService.addClient(user.id, reply);
    
    // Signal Fastify to not finish/close request raw socket
    reply.raw.setTimeout(0);
  });

  // ── GET /api/radar/mentions/live ──────────────────────────────────────────
  fastify.get('/api/radar/mentions/live', async (request, reply) => {
    const user = request.user as any;
    const { domain } = request.query as { domain?: string };
    
    const queryCond: any = { userId: user.id };
    if (domain) {
      queryCond.domain = domain.trim().toLowerCase();
    }

    const sessions = await prisma.radarSession.findMany({
      where: queryCond,
      orderBy: { scannedAt: 'desc' },
      take: 10,
      include: { results: true },
    });

    const mentions = sessions.flatMap(session => 
      session.results
        .filter(r => r.mentioned)
        .map(r => ({
          id: r.id,
          engine: r.engine,
          query: r.query,
          citationStatus: r.citationStatus,
          rankPosition: r.rankPosition,
          date: session.scannedAt,
          source: session.domain,
          excerpt: r.responseExcerpt
        }))
    ).slice(0, 50);

    return { success: true, mentions };
  });

  // ── GET /api/radar/competitors ─────────────────────────────────────────────
  fastify.get('/api/radar/competitors', async (request, reply) => {
    const user = request.user as any;
    const { domain } = request.query as { domain?: string };
    
    const queryCond: any = { userId: user.id };
    if (domain) {
      queryCond.domain = domain.trim().toLowerCase();
    }

    const session = await prisma.radarSession.findFirst({
      where: queryCond,
      orderBy: { scannedAt: 'desc' },
      include: { results: true },
    });

    if (!session) return { success: true, competitors: [] };

    const compStats: Record<string, number> = {};
    session.results.forEach(r => {
      if (Array.isArray(r.competitorMentions)) {
        r.competitorMentions.forEach((c: any) => {
          if (c.domain) {
            compStats[c.domain] = (compStats[c.domain] || 0) + (c.count || 1);
          }
        });
      }
    });

    const competitorsList = Object.entries(compStats)
      .map(([domain, mentions]) => ({ domain, mentions }))
      .sort((a, b) => b.mentions - a.mentions)
      .slice(0, 10);

    return { success: true, competitors: competitorsList, ourTotal: session.totalMentions };
  });

  // ── GET /api/radar/keywords/clusters ───────────────────────────────────────
  fastify.get('/api/radar/keywords/clusters', async (request, reply) => {
    const user = request.user as any;
    const { domain } = request.query as { domain?: string };
    
    const queryCond: any = { userId: user.id };
    if (domain) {
      queryCond.domain = domain.trim().toLowerCase();
    }

    const session = await prisma.radarSession.findFirst({
      where: queryCond,
      orderBy: { scannedAt: 'desc' },
      include: { results: true },
    });

    if (!session) return { success: true, nodes: [], links: [] };

    const nodes: any[] = [];
    const links: any[] = [];
    
    // Add central node
    nodes.push({ id: session.domain, group: 1, val: 20 });
    
    const queries = new Set<string>();
    session.results.forEach(r => {
      if (!queries.has(r.query)) {
        queries.add(r.query);
        nodes.push({ id: r.query, group: r.mentioned ? 2 : 3, val: r.mentioned ? 10 : 5 });
        links.push({ source: session.domain, target: r.query, value: r.mentioned ? 2 : 1 });
      }
      
      if (Array.isArray(r.competitorMentions)) {
        r.competitorMentions.forEach((c: any) => {
          if (c.domain && c.domain !== session.domain) {
            if (!nodes.find(n => n.id === c.domain)) {
              nodes.push({ id: c.domain, group: 4, val: 8 });
            }
            links.push({ source: r.query, target: c.domain, value: 1 });
          }
        });
      }
    });

    return { success: true, nodes, links };
  });
}
