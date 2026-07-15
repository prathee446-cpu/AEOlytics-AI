import { FastifyInstance } from 'fastify';
import { prisma } from '../db/prisma';
import { verifyJWT } from '../middlewares/auth';
import { CrawlerService } from '../services/crawler.service';
import { ScoringService } from '../services/scoring.service';
import { AIActivityService } from '../services/ai-activity.service';

/**
 * Heuristics to classify entities
 */
function classifyEntities(entities: string[]) {
  const brands = new Set<string>();
  const locations = new Set<string>();
  const people = new Set<string>();
  const orgs = new Set<string>();
  const products = new Set<string>();
  const services = new Set<string>();

  const locKeywords = ['york', 'london', 'india', 'california', 'tokyo', 'paris', 'germany', 'usa', 'chicago', 'delhi', 'bangalore', 'sydney', 'america'];
  const orgKeywords = ['inc', 'llc', 'corp', 'limited', 'co.', 'association', 'foundation', 'group', 'university', 'agency', 'company', 'amazon', 'google', 'microsoft', 'apple', 'meta', 'twitter', 'facebook'];
  const productKeywords = ['software', 'app', 'platform', 'device', 'phone', 'cloud', 'tool', 'tracker', 'editor', 'hub', 'api', 'console', 'service', 'database'];

  entities.forEach(ent => {
    const lower = ent.toLowerCase();
    if (locKeywords.some(kw => lower.includes(kw))) {
      locations.add(ent);
    } else if (orgKeywords.some(kw => lower.includes(kw))) {
      orgs.add(ent);
    } else if (productKeywords.some(kw => lower.includes(kw))) {
      products.add(ent);
    } else if (lower.split(' ').length === 2 && !lower.includes('the') && !lower.includes('and')) {
      people.add(ent);
    } else {
      brands.add(ent);
    }
  });

  return {
    brands: Array.from(brands).slice(0, 10),
    locations: Array.from(locations).slice(0, 10),
    people: Array.from(people).slice(0, 10),
    organizations: Array.from(orgs).slice(0, 10),
    products: Array.from(products).slice(0, 10),
    services: Array.from(services).slice(0, 10)
  };
}

export async function compareRoutes(fastify: FastifyInstance) {
  // Apply JWT verification hook to all routes in this file
  fastify.addHook('preHandler', verifyJWT);

  // Retrieve user's comparison history
  fastify.get('/api/compare/history', async (request, reply) => {
    try {
      const user = request.user as any;
      const history = await prisma.visibilityCompare.findMany({
        where: { userId: user.id },
        orderBy: { crawledAt: 'desc' },
        take: 20
      });
      return { history };
    } catch (err: any) {
      console.error('[Compare History] Error:', err);
      return reply.status(500).send({ error: 'Failed to fetch comparison history' });
    }
  });

  // Run live comparison
  fastify.post('/api/compare/run', async (request, reply) => {
    const user = request.user as any;
    const { url1, url2 } = request.body as any;

    if (!url1 || !url2) {
      return reply.status(400).send({ error: 'Both website URLs are required' });
    }

    try {
      // 1. Validate both URLs
      const val1 = await CrawlerService.validateUrl(url1.trim());
      if (!val1.valid) {
        return reply.status(422).send({ error: `Your website validation failed: ${val1.error}` });
      }
      const val2 = await CrawlerService.validateUrl(url2.trim());
      if (!val2.valid) {
        return reply.status(422).send({ error: `Competitor website validation failed: ${val2.error}` });
      }

      const cleanUrl1 = val1.url;
      const cleanUrl2 = val2.url;

      // Broadcast event log
      await AIActivityService.logEvent('AUDIT_STARTED', `Initiated Visibility Comparison between ${val1.domain} and ${val2.domain}`, {
        url1: cleanUrl1,
        url2: cleanUrl2,
      });

      // 2. Perform live crawls in parallel
      const [crawl1, crawl2] = await Promise.all([
        CrawlerService.crawlPage(cleanUrl1),
        CrawlerService.crawlPage(cleanUrl2),
      ]);

      // 3. Score content structures using standard ScoringService
      const audit1 = ScoringService.audit(crawl1);
      const audit2 = ScoringService.audit(crawl2);

      // Compute AEO score
      const getAeoScore = (m: any) => Math.round((
        m.semanticCoverage +
        m.questionAnswerability +
        m.entityDensity +
        m.topicalAuthority +
        m.aiSearchFriendliness +
        m.faqCoverage +
        m.knowledgeGraphSignals +
        m.queryCoverage
      ) / 8 * 100);

      // Compute SEO score
      const getSeoScore = (m: any) => Math.round((
        m.headingStructure +
        m.readability +
        m.internalLinks +
        m.externalReferences +
        m.schemaCoverage
      ) / 5 * 100);

      const aeo1 = getAeoScore(audit1.metrics);
      const aeo2 = getAeoScore(audit2.metrics);

      const seo1 = getSeoScore(audit1.metrics);
      const seo2 = getSeoScore(audit2.metrics);

      const vis1 = audit1.scores.overall;
      const vis2 = audit2.scores.overall;

      const content1 = Math.round((audit1.metrics.chunkQuality + audit1.metrics.readability + audit1.metrics.answerCompleteness) / 3 * 100);
      const content2 = Math.round((audit2.metrics.chunkQuality + audit2.metrics.readability + audit2.metrics.answerCompleteness) / 3 * 100);

      const overall1 = Math.round((vis1 + aeo1 + seo1 + content1) / 4);
      const overall2 = Math.round((vis2 + aeo2 + seo2 + content2) / 4);

      // Category Winners
      const winnerSummary = {
        overall: overall1 > overall2 ? 'Your Website' : overall2 > overall1 ? 'Competitor' : 'Tie',
        visibility: vis1 > vis2 ? 'Your Website' : vis2 > vis1 ? 'Competitor' : 'Tie',
        aeo: aeo1 > aeo2 ? 'Your Website' : aeo2 > aeo1 ? 'Competitor' : 'Tie',
        seo: seo1 > seo2 ? 'Your Website' : seo2 > seo1 ? 'Competitor' : 'Tie',
        content: content1 > content2 ? 'Your Website' : content2 > content1 ? 'Competitor' : 'Tie',
      };

      // Extract schemas
      const getSchemasList = (jsonLD: any[]) => {
        const found = new Set<string>();
        jsonLD.forEach(item => {
          const type = item['@type'];
          if (typeof type === 'string') {
            found.add(type);
          } else if (Array.isArray(type)) {
            type.forEach(t => typeof t === 'string' && found.add(t));
          }
        });
        return Array.from(found);
      };

      const schemas1 = getSchemasList(crawl1.jsonLD);
      const schemas2 = getSchemasList(crawl2.jsonLD);

      // Classify Entities
      const entitiesClassified1 = classifyEntities(crawl1.entities);
      const entitiesClassified2 = classifyEntities(crawl2.entities);

      // Proxy Technical Scores based on page metrics
      const speed1 = Math.round(100 - Math.min(40, crawl1.images.length * 2 + Math.round(crawl1.bodyHtml.length / 8000)));
      const speed2 = Math.round(100 - Math.min(40, crawl2.images.length * 2 + Math.round(crawl2.bodyHtml.length / 8000)));

      // 4. Comparison metrics mapping
      const comparisonMetrics = {
        aiVisibility: { label: 'Overall AI Visibility Score', you: vis1, competitor: vis2, format: 'score' },
        aeoScore: { label: 'AEO Score', you: aeo1, competitor: aeo2, format: 'score' },
        seoScore: { label: 'SEO Score', you: seo1, competitor: seo2, format: 'score' },
        
        // Content Quality
        wordCount: { label: 'Word Count', you: crawl1.wordCount, competitor: crawl2.wordCount, format: 'number' },
        readability: { label: 'Readability', you: Math.round(audit1.metrics.readability * 100), competitor: Math.round(audit2.metrics.readability * 100), format: 'score' },
        contentDepth: { label: 'Content Depth', you: Math.round(audit1.metrics.topicalAuthority * 100), competitor: Math.round(audit2.metrics.topicalAuthority * 100), format: 'score' },
        freshness: { label: 'Content Freshness', you: Math.round(audit1.metrics.contentFreshness * 100), competitor: Math.round(audit2.metrics.contentFreshness * 100), format: 'score' },
        helpfulContent: { label: 'Helpful Content', you: Math.round(audit1.metrics.answerCompleteness * 100), competitor: Math.round(audit2.metrics.answerCompleteness * 100), format: 'score' },

        // Heading Structure
        h1Count: { label: 'H1 Headings', you: crawl1.h1.length, competitor: crawl2.h1.length, format: 'number' },
        h2Count: { label: 'H2 Headings', you: crawl1.h2.length, competitor: crawl2.h2.length, format: 'number' },
        h3Count: { label: 'H3 Headings', you: crawl1.h3.length, competitor: crawl2.h3.length, format: 'number' },

        // Metadata
        metaTitleLength: { label: 'Meta Title Length', you: crawl1.metaTitle.length, competitor: crawl2.metaTitle.length, format: 'number' },
        metaDescriptionLength: { label: 'Meta Description Length', you: crawl1.metaDescription.length, competitor: crawl2.metaDescription.length, format: 'number' },
        hasCanonical: { label: 'Canonical URL Configured', you: crawl1.canonicalUrl ? 100 : 0, competitor: crawl2.canonicalUrl ? 100 : 0, format: 'boolean' },
        hasOgTags: { label: 'Open Graph Configured', you: Object.keys(crawl1.ogTags).length > 0 ? 100 : 0, competitor: Object.keys(crawl2.ogTags).length > 0 ? 100 : 0, format: 'boolean' },
        hasTwitterTags: { label: 'Twitter Cards Configured', you: Object.keys(crawl1.twitterTags).length > 0 ? 100 : 0, competitor: Object.keys(crawl2.twitterTags).length > 0 ? 100 : 0, format: 'boolean' },

        // Structured Data & FAQs
        schemaCount: { label: 'Structured Schema Types', you: schemas1.length, competitor: schemas2.length, format: 'number' },
        faqCount: { label: 'FAQ Q&A Count', you: crawl1.questions.length, competitor: crawl2.questions.length, format: 'number' },

        // Entities & Keywords
        entityCount: { label: 'Extracted Entity Count', you: crawl1.entities.length, competitor: crawl2.entities.length, format: 'number' },
        keywordCount: { label: 'Keyword Topic Count', you: crawl1.topics.length, competitor: crawl2.topics.length, format: 'number' },

        // Links
        internalLinkCount: { label: 'Internal Links', you: crawl1.internalLinks.length, competitor: crawl2.internalLinks.length, format: 'number' },
        externalLinkCount: { label: 'External Authority Citations', you: crawl1.externalLinks.length, competitor: crawl2.externalLinks.length, format: 'number' },

        // Technical Analysis
        pageSpeed: { label: 'Page Speed Index', you: speed1, competitor: speed2, format: 'score' },
        isHttps: { label: 'HTTPS Protocol Secure', you: crawl1.https ? 100 : 0, competitor: crawl2.https ? 100 : 0, format: 'boolean' },
        robotsAllowed: { label: 'Crawlable (robots.txt Allowed)', you: crawl1.robotsAllowed ? 100 : 0, competitor: crawl2.robotsAllowed ? 100 : 0, format: 'boolean' },

        // AI Readiness
        aiReadiness: { label: 'AI Readability', you: Math.round(audit1.metrics.aiSearchFriendliness * 100), competitor: Math.round(audit2.metrics.aiSearchFriendliness * 100), format: 'score' },
        citationReadiness: { label: 'Citation Readiness', you: Math.round(audit1.metrics.citationQuality * 100), competitor: Math.round(audit2.metrics.citationQuality * 100), format: 'score' },
        semanticCoverage: { label: 'Semantic Coverage', you: Math.round(audit1.metrics.semanticCoverage * 100), competitor: Math.round(audit2.metrics.semanticCoverage * 100), format: 'score' },
      };

      // 5. Generate AI Gap Analysis & Recommendations
      const gapAnalysis: string[] = [];
      const recommendations: string[] = [];

      // FAQ Schema gap
      const hasFaqSchema = (schemas: string[]) => schemas.some(s => s.toLowerCase().includes('faqpage'));
      if (hasFaqSchema(schemas2) && !hasFaqSchema(schemas1)) {
        gapAnalysis.push('❌ Competitor uses FAQ Schema while your website is missing it.');
        recommendations.push('Add FAQPage Schema structured data to pages containing questions.');
      } else if (!hasFaqSchema(schemas1)) {
        gapAnalysis.push('❌ Your website is missing FAQ Schema.');
        recommendations.push('Optimize your FAQ sections by adding FAQ schema to improve AI readability.');
      }

      // FAQ count gap
      if (crawl2.questions.length > crawl1.questions.length) {
        gapAnalysis.push(`❌ Competitor has ${crawl2.questions.length} FAQs. Your website has only ${crawl1.questions.length}.`);
        recommendations.push('Create an FAQ section answering secondary customer questions in Q&A format.');
      }

      // Organization Schema gap
      const hasOrgSchema = (schemas: string[]) => schemas.some(s => s.toLowerCase().includes('organization'));
      if (hasOrgSchema(schemas2) && !hasOrgSchema(schemas1)) {
        gapAnalysis.push('❌ Competitor uses Organization Schema.');
        recommendations.push('Add Organization schema structured data to establish brand entity mapping.');
      }

      // Entity Count gap
      if (crawl2.entities.length > crawl1.entities.length) {
        gapAnalysis.push(`❌ Competitor covers ${crawl2.entities.length} entities. Your website has only ${crawl1.entities.length}.`);
        recommendations.push('Increase your entity density by referencing more related products, brands, and organizations.');
      }

      // Word count gap
      if (crawl2.wordCount > crawl1.wordCount) {
        gapAnalysis.push(`❌ Your content is ${crawl2.wordCount - crawl1.wordCount} words shorter (Competitor: ${crawl2.wordCount}, You: ${crawl1.wordCount}).`);
        recommendations.push(`Increase content depth to bridge the ${crawl2.wordCount - crawl1.wordCount} word gap.`);
      }

      // Internal links gap
      if (crawl2.internalLinks.length > crawl1.internalLinks.length) {
        gapAnalysis.push(`❌ Competitor has stronger internal linking (${crawl2.internalLinks.length} links vs ${crawl1.internalLinks.length}).`);
        recommendations.push('Improve your internal linking structure and use relevant anchor text.');
      }

      // Missing keywords
      const competitorKeywords = crawl2.topics;
      const yourKeywords = crawl1.topics;
      const missingKeywords = competitorKeywords.filter(k => !yourKeywords.some(yk => yk.toLowerCase() === k.toLowerCase()));
      if (missingKeywords.length > 0) {
        gapAnalysis.push(`❌ Missing semantic keywords: ${missingKeywords.slice(0, 4).join(', ')}.`);
        recommendations.push(`Target missing semantic keywords inside headings: ${missingKeywords.slice(0, 6).join(', ')}.`);
      }

      // Missing citations
      if (crawl2.externalLinks.length > crawl1.externalLinks.length) {
        gapAnalysis.push('❌ Missing authority reference citations and outbound links.');
        recommendations.push('Add expert external citation references to back up factual claims.');
      }

      // Meta structure gaps
      if (crawl1.metaDescription.length === 0 && crawl2.metaDescription.length > 0) {
        gapAnalysis.push('❌ Your website is missing a meta description.');
        recommendations.push('Write a compelling meta description between 120-160 characters.');
      }

      // Default fallback gaps if lists are thin
      if (gapAnalysis.length === 0) {
        gapAnalysis.push('❌ Your content depth could be strengthened relative to semantic search crawlers.');
        recommendations.push('Add more structured subsections with detailed H3 headers.');
      }

      // 6. Persist VisibilityCompare record
      const result = await prisma.visibilityCompare.create({
        data: {
          userId: user.id,
          url1: cleanUrl1,
          url2: cleanUrl2,
          domain1: val1.domain,
          domain2: val2.domain,
          winnerSummary,
          metrics: comparisonMetrics,
          gapAnalysis: {
            issues: gapAnalysis,
            entities1: entitiesClassified1,
            entities2: entitiesClassified2,
            missingKeywords,
          },
          recommendations,
        }
      });

      await AIActivityService.logEvent('AUDIT_COMPLETED', `Completed Visibility Comparison between ${val1.domain} and ${val2.domain}`, {
        comparisonId: result.id,
        winner: winnerSummary.overall,
      });

      return reply.send({
        id: result.id,
        domain1: val1.domain,
        domain2: val2.domain,
        url1: cleanUrl1,
        url2: cleanUrl2,
        winnerSummary,
        metrics: comparisonMetrics,
        gapAnalysis: {
          issues: gapAnalysis,
          entities1: entitiesClassified1,
          entities2: entitiesClassified2,
          missingKeywords,
        },
        recommendations,
        crawledAt: result.crawledAt,
      });

    } catch (err: any) {
      console.error('[Competitor Compare] Comparison execution failed:', err);
      return reply.status(500).send({ error: `Comparison analysis failed: ${err.message}` });
    }
  });
}
