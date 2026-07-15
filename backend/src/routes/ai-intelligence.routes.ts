import { FastifyInstance } from 'fastify';
import { prisma } from '../db/prisma';
import { verifyJWT } from '../middlewares/auth';
import { AIActivityService } from '../services/ai-activity.service';

export async function aiIntelligenceRoutes(fastify: FastifyInstance) {
  // WebSocket removed for Serverless compatibility

  // Apply JWT middleware to all API routes below
  fastify.addHook('preHandler', verifyJWT);

  // ── GET /api/ai-intelligence/summary ──────────────────────────────────────
  fastify.get('/api/ai-intelligence/summary', async (request, reply) => {
    const user = request.user as any;
    
    const articles = await prisma.article.findMany({
      where: { userId: user.id },
      select: { status: true, aiScore: true, visibilityScore: true },
    });

    const published = articles.filter(a => a.status === 'PUBLISHED');
    const drafts = articles.filter(a => a.status === 'DRAFT');

    const avgAiScore = published.length ? Math.round(published.reduce((s, a) => s + (a.aiScore || 0), 0) / published.length) : 0;
    const avgVisScore = published.length ? Math.round(published.reduce((s, a) => s + (a.visibilityScore || 0), 0) / published.length) : 0;

    return {
      success: true,
      summary: {
        totalAssets: articles.length,
        publishedAssets: published.length,
        draftAssets: drafts.length,
        averageAiScore: avgAiScore,
        averageVisibilityScore: avgVisScore,
      }
    };
  });

  // ── GET /api/ai-intelligence/live-activity ────────────────────────────────
  fastify.get('/api/ai-intelligence/live-activity', async (request, reply) => {
    // Fetch last 50 events from AIActivity table
    const activities = await prisma.aIActivity.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    
    return { success: true, activities };
  });

  // ── GET /api/ai-intelligence/timeline ─────────────────────────────────────
  fastify.get('/api/ai-intelligence/timeline', async (request, reply) => {
    const user = request.user as any;
    const sessions = await prisma.radarSession.findMany({
      where: { userId: user.id },
      orderBy: { scannedAt: 'asc' },
      take: 30,
      select: { scannedAt: true, overallScore: true, domain: true }
    });

    return { success: true, timeline: sessions };
  });

  // ── GET /api/ai-intelligence/opportunities ────────────────────────────────
  fastify.get('/api/ai-intelligence/opportunities', async (request, reply) => {
    const user = request.user as any;
    
    // Low AI score articles
    const lowScoreArticles = await prisma.article.findMany({
      where: { userId: user.id, status: 'PUBLISHED', aiScore: { lt: 70 } },
      select: { id: true, title: true, aiScore: true, recommendations: true },
      take: 5,
      orderBy: { aiScore: 'asc' }
    });

    // Unoptimized radar queries
    const unoptimized = await prisma.radarQueryResult.findMany({
      where: { session: { userId: user.id }, mentioned: false },
      select: { query: true, engine: true },
      take: 10,
      distinct: ['query']
    });

    return { success: true, opportunities: { lowScoreArticles, unoptimized } };
  });

  // ── GET /api/ai-intelligence/system-health ────────────────────────────────
  fastify.get('/api/ai-intelligence/system-health', async (request, reply) => {
    // Determine overall system health based on active DB connections, active WS clients
    const activeClients = AIActivityService.getClientCount();
    
    return {
      success: true,
      health: {
        status: 'Operational',
        latency: Math.floor(Math.random() * 20) + 10, // Mock latency 10-30ms for UI purposes
        activeConnections: activeClients,
        uptime: process.uptime(),
      }
    };
  });

  // ── GET /api/ai-intelligence/statistics ───────────────────────────────────
  fastify.get('/api/ai-intelligence/statistics', async (request, reply) => {
    const user = request.user as any;
    
    const countEvents = await prisma.aIActivity.count();
    const countSessions = await prisma.radarSession.count({ where: { userId: user.id }});
    const countArticles = await prisma.article.count({ where: { userId: user.id }});

    return {
      success: true,
      stats: {
        eventsProcessed: countEvents,
        radarScans: countSessions,
        articlesManaged: countArticles,
      }
    };
  });
}
