import { FastifyInstance } from 'fastify';
import { prisma } from '../db/prisma';
import { verifyJWT } from '../middlewares/auth';
import { AIService } from '../services/ai.service';
import { ScoringService } from '../services/scoring.service';
import { AIActivityService } from '../services/ai-activity.service';

export async function aiRoutes(fastify: FastifyInstance) {
  // Apply JWT validation check to all routes
  fastify.addHook('preHandler', verifyJWT);

  // Content Analysis Auditor
  fastify.post('/api/ai/analyze', async (request, reply) => {
    const { title, content } = request.body as any;

    if (!title || !content) {
      return reply.status(400).send({ error: 'Title and content are required for analysis' });
    }

    try {
      // Extract structural metadata from markdown content for dynamic keyword analysis
      const lines = content.split('\n');
      const h1Meta = lines.filter((l: string) => /^# /.test(l)).map((l: string) => l.replace(/^# /, '').trim());
      const h2Meta = lines.filter((l: string) => /^## /.test(l)).map((l: string) => l.replace(/^## /, '').trim());
      const h3Meta = lines.filter((l: string) => /^### /.test(l)).map((l: string) => l.replace(/^### /, '').trim());

      const analysis = await AIService.analyzeContent(title, content, {
        h1: h1Meta.length > 0 ? h1Meta : [title],
        h2: h2Meta,
        h3: h3Meta,
        metaDescription: '',
        entities: [],
        topics: h2Meta,
      });

      // Create a synthetic CrawlResult from markdown content to run genuine scoring
      const h1 = h1Meta;
      const h2 = h2Meta;
      const h3 = h3Meta;
      const paragraphs = lines.filter((l: string) => l.trim().length > 30 && !l.startsWith('#') && !l.startsWith('-') && !l.startsWith('|')).map((l: string) => l.trim());
      const lists: string[][] = [];
      let currentList: string[] = [];
      lines.forEach((l: string) => {
        if (/^[-*] /.test(l)) {
          currentList.push(l.replace(/^[-*] /, '').trim());
        } else if (currentList.length > 0) {
          lists.push([...currentList]);
          currentList = [];
        }
      });

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
        questions: [...h2, ...h3].filter((h: string) => /^(what|how|why|when|where|who)/i.test(h) || h.endsWith('?')),
        bodyHtml: '',
      };

      const audit = ScoringService.audit(syntheticCrawl);

      return {
        ...analysis,
        aiScore: audit.scores.overall,
        visibilityScore: Math.round((audit.scores.chatgpt + audit.scores.googleAI + audit.scores.gemini) / 3),
        confidenceScore: parseFloat((audit.scores.overall / 100).toFixed(2)),
        auditScores: audit.scores,
        optimizerPanels: audit.panels,
      };
    } catch (err) {
      console.error(err);
      return reply.status(500).send({ error: 'AI Auditor failed to complete analysis' });
    }
  });

  // Predict Visibility index
  fastify.post('/api/ai/predict', async (request, reply) => {
    const { title, content } = request.body as any;
    if (!title || !content) {
      return reply.status(400).send({ error: 'Title and content are required' });
    }
    try {
      const prediction = await AIService.predictVisibility(title, content);
      return prediction;
    } catch (err) {
      console.error(err);
      return reply.status(500).send({ error: 'AEO visibility prediction failed' });
    }
  });

  // One-Click Optimizer
  fastify.post('/api/ai/optimize', async (request, reply) => {
    const { title, content, action } = request.body as any;

    if (!title || !content || !action) {
       return reply.status(400).send({ error: 'Title, content, and action are required' });
    }

    try {
      await AIActivityService.logEvent('REWRITE_STARTED', `Content optimization started for: "${title}" using strategy ${action}`, { title, action });
      const optimizedContent = await AIService.optimizeContent(title, content, action);

      // Try to find the article by title to log history
      const article = await prisma.article.findFirst({
        where: { title, content }
      });

      if (article) {
        await prisma.optimizationHistory.create({
          data: {
            articleId: article.id,
            action,
            previousContent: content,
            optimizedContent
          }
        });

        await AIActivityService.logEvent('REWRITE_COMPLETED', `Optimized content for article: "${article.title}"`, {
          articleId: article.id,
          action,
        });
      } else {
        await AIActivityService.logEvent('REWRITE_COMPLETED', `Draft optimized using strategy: ${action}`, {
          title,
          action,
        });
      }

      if (action === 'FAQ') {
        await AIActivityService.logEvent('FAQ_GENERATED', `Generated FAQ section for: "${title}"`, { title, action });
      }

      await AIActivityService.logEvent('OPTIMIZATION_FINISHED', `Content optimization completed for: "${title}"`, { title, action });

      return { optimizedContent };
    } catch (err) {
      console.error(err);
      return reply.status(500).send({ error: 'AI Optimization rewrite failed' });
    }
  });


  // RAG Conversational Chat with Article Scope
  fastify.post('/api/ai/chat', async (request, reply) => {
    const { articleId, query, history } = request.body as any;

    if (!articleId || !query) {
      return reply.status(400).send({ error: 'Scope article ID and chat prompt query are required' });
    }

    try {
      const article = await prisma.article.findUnique({ where: { id: articleId } });
      if (!article) {
        return reply.status(404).send({ error: 'No website has been crawled yet.' });
      }

      if (!article.content || article.content.trim().length < 15) {
        return reply.status(400).send({ error: 'No indexed content found.' });
      }

      // Execute Chat with RAG context
      const response = await AIService.chatWithContent(
        article.title,
        article.content,
        history || [],
        query
      );

      // Attempt to save conversation message log
      const userPayload = request.user as any;
      let session = await prisma.chatSession.findFirst({
        where: { userId: userPayload.id, articleId }
      });

      if (!session) {
        session = await prisma.chatSession.create({
          data: {
            title: `Chat regarding: ${article.title}`,
            userId: userPayload.id,
            articleId
          }
        });
      }

      await prisma.chatMessage.createMany({
        data: [
          { sessionId: session.id, role: 'user', content: query },
          { sessionId: session.id, role: 'assistant', content: response }
        ]
      });

      console.log('[RAG Pipeline LOG] Chat response dispatched and returned to frontend successfully.');
      return { response };
    } catch (err: any) {
      console.error('[RAG Pipeline ERROR] Conversational RAG pipeline failed! Stack trace:', err);
      
      let statusCode = 500;
      let errorMessage = 'Internal server error';

      if (err.message && err.message.includes('No AI provider configured')) {
        statusCode = 400;
        errorMessage = 'No AI provider configured. Please check your backend .env file.';
      } else if (err.status === 401 || err.statusCode === 401 || (err.message && err.message.includes('Incorrect API key') || err.message && err.message.includes('authentication'))) {
        statusCode = 401;
        errorMessage = 'Grok API authentication failed. Please verify your API key.';
      } else if (err.status === 403 || err.statusCode === 403 || (err.message && err.message.includes('credits') || err.message && err.message.includes('PermissionDeniedError') || err.message && err.message.includes('403'))) {
        statusCode = 403;
        errorMessage = 'Grok API request failed: Access denied (insufficient credits or permission error).';
      } else if (err.message && (err.message.includes('timeout') || err.message.includes('ETIMEDOUT') || err.message.includes('timeout exceeded'))) {
        statusCode = 408;
        errorMessage = 'Grok API request timed out. Please try again.';
      } else if (err.message) {
        errorMessage = err.message;
      }

      return reply.status(statusCode).send({ error: errorMessage });
    }
  });

  // Section rewrite endpoint
  fastify.post('/api/ai/rewrite-section', async (request, reply) => {
    const { title, content, issueTitle, issueDescription } = request.body as any;

    if (!content || !issueTitle) {
      return reply.status(400).send({ error: 'Content and issue title are required' });
    }

    try {
      await AIActivityService.logEvent('REWRITE_STARTED', `Content rewrite started for issue: "${issueTitle}"`, { title, issueTitle });
      const result = await AIService.rewriteSectionForIssue(
        title || 'Document',
        content,
        issueTitle,
        issueDescription || ''
      );

      await AIActivityService.logEvent('REWRITE_COMPLETED', `Rewrote section to fix: ${issueTitle}`, {
        title: title || 'Document',
        issueTitle,
      });

      await AIActivityService.logEvent('OPTIMIZATION_FINISHED', `Content rewrite completed for issue: "${issueTitle}"`, { title, issueTitle });

      return result;
    } catch (err) {
      console.error(err);
      return reply.status(500).send({ error: 'Section rewrite failed' });
    }
  });
}
