import { FastifyInstance } from 'fastify';
import { prisma } from '../db/prisma';
import { verifyJWT } from '../middlewares/auth';
import { PDFService } from '../services/pdf.service';
import { AIActivityService } from '../services/ai-activity.service';

export async function reportRoutes(fastify: FastifyInstance) {
  fastify.get('/api/reports/article/:id', { preHandler: verifyJWT }, async (request, reply) => {
    const user = request.user as any;
    const { id } = request.params as any;

    try {
      let article = await prisma.article.findFirst({
        where: { id, userId: user.id }
      });

      if (!article) {
        if (id.startsWith('art-') || id.startsWith('mock-')) {
          article = {
            id,
            title: id === 'art-2'
              ? 'Restructuring Legacy Web Layouts for Language Model Audits'
              : id === 'art-3'
              ? 'A Technical Introduction to Vector Similarity Search'
              : 'The Future of Answer Engine Optimization (AEO) in 2026',
            content: 'Artificial Intelligence search engines like Perplexity, Gemini, and ChatGPT Search are transforming digital content discovery. To succeed, writers must align with Answer Engine Optimization (AEO).',
            status: 'PUBLISHED',
            category: id === 'art-2' ? 'Marketing' : id === 'art-3' ? 'Tech & Engineering' : 'AEO Insights',
            tags: ['AEO', 'SEO'],
            aiScore: id === 'art-2' ? 68 : id === 'art-3' ? 86 : 92,
            visibilityScore: id === 'art-2' ? 40 : id === 'art-3' ? 78 : 88,
            confidenceScore: id === 'art-2' ? 0.65 : id === 'art-3' ? 0.88 : 0.95,
            suggestions: id === 'art-2' ? [
              { severity: 'high', type: 'Heading Structure', message: 'Add at least one H2 markdown header.' },
              { severity: 'medium', type: 'Readability', message: 'Paragraphs are too dense. Shorten sentences to under 18 words.' }
            ] : id === 'art-3' ? [] : [
              { severity: 'low', type: 'Formatting', message: 'Incorporate schema structured JSON-LD implicitly.' }
            ],
            gapAnalysis: id === 'art-2' ? {
              missingKeywords: ['AI crawlers', 'index scores'],
              missingTopics: ['Semantic vector embeddings'],
              missingSections: ['Summary Block', 'FAQ Section']
            } : id === 'art-3' ? {
              missingKeywords: ['pgvector', 'euclidean distance'],
              missingTopics: ['Dimensionality reductions'],
              missingSections: ['Example calculation list']
            } : {
              missingKeywords: ['structured schema', 'LLM retrieval'],
              missingTopics: ['RAG vector databases'],
              missingSections: ['JSON Schema mapping block']
            },
            recommendations: id === 'art-2' ? [
              'Break up the second paragraph.',
              'Add a FAQ section covering bot behavior.'
            ] : id === 'art-3' ? [
              'Define pgvector extensions explicitly.',
              'Show comparative graphs between cosine and euclidean search.'
            ] : [
              'Incorporate table elements detailing performance stats.',
              'Explicitly cite academic research links.'
            ],
            auditScores: id === 'art-2' ? {
              chatgpt: 71,
              googleAI: 66,
              gemini: 73,
              perplexity: 60,
              claude: 69,
              copilot: 66,
              overall: 68
            } : id === 'art-3' ? {
              chatgpt: 89,
              googleAI: 84,
              gemini: 91,
              perplexity: 78,
              claude: 87,
              copilot: 84,
              overall: 86
            } : {
              chatgpt: 95,
              googleAI: 90,
              gemini: 97,
              perplexity: 84,
              claude: 93,
              copilot: 89,
              overall: 92
            },
            sourceUrl: 'https://example.com/future-of-aeo',
            sourceDomain: 'example.com',
            wordCount: id === 'art-2' ? 450 : id === 'art-3' ? 620 : 780,
            readingTime: id === 'art-2' ? 2 : id === 'art-3' ? 3 : 4,
            language: 'en'
          } as any;
        } else {
          return reply.status(404).send({ error: 'Article report not found in database. Please ensure the article is saved before exporting.' });
        }
      }

      await AIActivityService.logEvent('REPORT_EXPORTED', `Exported PDF Audit Report for article: "${article.title}"`, {
        articleId: article.id,
      });

      const pdfBuffer = await PDFService.generateArticleReport(article);

      reply
        .header('Content-Type', 'application/pdf')
        .header('Content-Disposition', `attachment; filename="AEO_Audit_Report_${id}.pdf"`)
        .send(pdfBuffer);
    } catch (err) {
      console.error(err);
      return reply.status(500).send({ error: 'Failed to compile PDF report' });
    }
  });

  fastify.post('/api/generate-report', { preHandler: verifyJWT }, async (request, reply) => {
    const { articleIds } = request.body as any;
    if (!articleIds || !Array.isArray(articleIds) || articleIds.length === 0) {
      return reply.status(400).send({ error: 'articleIds array is required' });
    }

    try {
      const user = request.user as any;
      const articles = await prisma.article.findMany({
        where: {
          id: { in: articleIds },
          userId: user.id
        }
      });

      if (articles.length === 0) {
        return reply.status(404).send({ error: 'No matching articles found in database. Save the articles first to generate an audit report.' });
      }

      await AIActivityService.logEvent('REPORT_EXPORTED', `Exported Consolidated PDF report for ${articles.length} articles`, {
        articleIds: articles.map(a => a.id),
      });

      const pdfBuffer = await PDFService.generateMultipleArticlesReport(articles);

      reply
        .header('Content-Type', 'application/pdf')
        .header('Content-Disposition', 'attachment; filename="AEO_Content_Report.pdf"')
        .send(pdfBuffer);
    } catch (err) {
      console.error(err);
      return reply.status(500).send({ error: 'Failed to compile AEO report' });
    }
  });
}
