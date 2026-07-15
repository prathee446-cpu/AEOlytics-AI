import { FastifyInstance } from 'fastify';
import { prisma } from '../db/prisma';
import { verifyJWT } from '../middlewares/auth';
import { AIService } from '../services/ai.service';
import { AIActivityService } from '../services/ai-activity.service';

export async function articleRoutes(fastify: FastifyInstance) {
  // Apply JWT hook to all article endpoints
  fastify.addHook('preHandler', verifyJWT);

  // List all articles
  fastify.get('/api/articles', async (request) => {
    const user = request.user as any;
    const list = await prisma.article.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
    });
    return list;
  });

  // Get Single Article Details
  fastify.get('/api/articles/:id', async (request, reply) => {
    const user = request.user as any;
    const { id } = request.params as any;

    const article = await prisma.article.findFirst({
      where: { id, userId: user.id },
    });

    if (!article) {
      return reply.status(404).send({ error: 'Article not found' });
    }

    return article;
  });

  // Create Article
  fastify.post('/api/articles', async (request, reply) => {
    const user = request.user as any;
    const { title, content, category, tags, status } = request.body as any;

    if (!title || !content) {
      return reply.status(400).send({ error: 'Title and content are required' });
    }

    try {
      // Automatically generate vector embedding representing the text
      const embedding = await AIService.generateEmbedding(content);

      const article = await prisma.article.create({
        data: {
          title,
          content,
          category: category || 'General',
          tags: tags || [],
          status: status || 'DRAFT',
          embedding,
          userId: user.id,
        },
      });

      await AIActivityService.logEvent(status === 'PUBLISHED' ? 'ARTICLE_PUBLISHED' : 'DRAFT_SAVED', `New article created: "${title}" (${status || 'DRAFT'})`, {
        articleId: article.id,
        status: article.status,
        isNew: true,
      });

      return reply.status(201).send(article);
    } catch (err) {
      console.error(err);
      return reply.status(500).send({ error: 'Failed to create article' });
    }
  });

  // Save Draft (Autosave endpoint)
  fastify.patch('/api/articles/draft', async (request, reply) => {
    const user = request.user as any;
    const { id, title, content, category, tags } = request.body as any;

    try {
      let article;

      if (id) {
        // Update existing article draft
        const existing = await prisma.article.findFirst({
          where: { id, userId: user.id },
        });

        if (!existing) {
          return reply.status(404).send({ error: 'Article not found' });
        }

        // Only generate embedding if content actually changed
        let embedding = existing.embedding;
        if (content && content !== existing.content) {
          embedding = await AIService.generateEmbedding(content);
        }

        article = await prisma.article.update({
          where: { id },
          data: {
            title: title !== undefined ? title : existing.title,
            content: content !== undefined ? content : existing.content,
            category: category !== undefined ? category : existing.category,
            tags: tags !== undefined ? tags : existing.tags,
            embedding,
          },
        });

        await AIActivityService.logEvent('DRAFT_SAVED', `Archived article: "${article.title}"`, {
          articleId: article.id,
          status: 'DRAFT',
        });
      } else {
        // Create new article draft
        const embedding = await AIService.generateEmbedding(content || '');
        article = await prisma.article.create({
          data: {
            title: title || 'Untitled Draft',
            content: content || '',
            category: category || 'Marketing',
            tags: tags || [],
            status: 'DRAFT',
            embedding,
            userId: user.id,
          },
        });

        await AIActivityService.logEvent('DRAFT_SAVED', `Created new untitled draft: "${article.title}"`, {
          articleId: article.id,
          status: 'DRAFT',
          isNew: true,
        });
      }

      return { article };
    } catch (err) {
      console.error('[Autosave Route Error]', err);
      return reply.status(500).send({ error: 'Failed to autosave draft' });
    }
  });

  // Update Article
  fastify.put('/api/articles/:id', async (request, reply) => {
    const user = request.user as any;
    const { id } = request.params as any;
    const { title, content, category, tags, status, aiScore, visibilityScore, confidenceScore, suggestions, gapAnalysis, recommendations } = request.body as any;

    try {
      const article = await prisma.article.findFirst({
        where: { id, userId: user.id },
      });

      if (!article) {
        return reply.status(404).send({ error: 'Article not found' });
      }

      // Check if text changed to re-generate embedding vector
      let embedding = article.embedding;
      if (content && content !== article.content) {
        embedding = await AIService.generateEmbedding(content);
      }

      const updated = await prisma.article.update({
        where: { id },
        data: {
          title: title !== undefined ? title : article.title,
          content: content !== undefined ? content : article.content,
          category: category !== undefined ? category : article.category,
          tags: tags !== undefined ? tags : article.tags,
          status: status !== undefined ? status : article.status,
          aiScore: aiScore !== undefined ? aiScore : article.aiScore,
          visibilityScore: visibilityScore !== undefined ? visibilityScore : article.visibilityScore,
          confidenceScore: confidenceScore !== undefined ? confidenceScore : article.confidenceScore,
          suggestions: suggestions !== undefined ? suggestions : article.suggestions,
          gapAnalysis: gapAnalysis !== undefined ? gapAnalysis : article.gapAnalysis,
          recommendations: recommendations !== undefined ? recommendations : article.recommendations,
          embedding,
        },
      });

      const wasPublished = status === 'PUBLISHED' && article.status !== 'PUBLISHED';
      const eventType = wasPublished ? 'ARTICLE_PUBLISHED' : 'DRAFT_SAVED';
      const eventMsg = wasPublished 
        ? `Article successfully published: "${updated.title}"` 
        : `Article updated: "${updated.title}" (${updated.status})`;

      await AIActivityService.logEvent(eventType, eventMsg, {
        articleId: updated.id,
        status: updated.status,
        aiScore: updated.aiScore,
        visibilityScore: updated.visibilityScore,
        isNew: false,
      });

      return updated;
    } catch (err) {
      console.error(err);
      return reply.status(500).send({ error: 'Failed to update article' });
    }
  });

  // Delete Article
  fastify.delete('/api/articles/:id', async (request, reply) => {
    const user = request.user as any;
    const { id } = request.params as any;

    try {
      const article = await prisma.article.findFirst({
        where: { id, userId: user.id },
      });

      if (!article) {
        return reply.status(404).send({ error: 'Article not found' });
      }

      await prisma.article.delete({ where: { id } });
      return { success: true, message: 'Article deleted successfully' };
    } catch (err) {
      console.error(err);
      return reply.status(500).send({ error: 'Failed to delete article' });
    }
  });
}
