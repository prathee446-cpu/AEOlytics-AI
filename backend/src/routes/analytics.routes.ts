import { FastifyInstance } from 'fastify';
import { prisma } from '../db/prisma';
import { verifyJWT } from '../middlewares/auth';

export async function analyticsRoutes(fastify: FastifyInstance) {
  fastify.get('/api/analytics/summary', { preHandler: verifyJWT }, async (request) => {
    const user = request.user as any;
    
    // Get published articles to build historical trends
    const published = await prisma.article.findMany({
      where: { userId: user.id, status: 'PUBLISHED' },
      select: { title: true, aiScore: true, visibilityScore: true, category: true, createdAt: true },
      orderBy: { createdAt: 'asc' }
    });

    // Aggregate document volumes by category groupings
    const categoryDistribution = await prisma.article.groupBy({
      by: ['category'],
      where: { userId: user.id },
      _count: { id: true }
    });

    const totalArticles = await prisma.article.count({ where: { userId: user.id } });
    const draftsCount = await prisma.article.count({ where: { userId: user.id, status: 'DRAFT' } });
    const publishedCount = await prisma.article.count({ where: { userId: user.id, status: 'PUBLISHED' } });

    return {
      trends: published.map(a => ({
        title: a.title,
        aiScore: a.aiScore,
        visibilityScore: a.visibilityScore,
        createdAt: a.createdAt
      })),
      categories: categoryDistribution.map(c => ({
        category: c.category,
        count: c._count.id
      })),
      metrics: {
        total: totalArticles,
        drafts: draftsCount,
        published: publishedCount
      }
    };
  });
}
