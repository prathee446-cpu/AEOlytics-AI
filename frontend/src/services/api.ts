import axios, { AxiosAdapter } from 'axios';

// Local memory mock article store for Guest Demo Mode
let mockArticles = [
  {
    id: 'art-1',
    title: 'The Future of Answer Engine Optimization (AEO) in 2026',
    content: `# The Future of Answer Engine Optimization (AEO) in 2026

Artificial Intelligence search engines like Perplexity, Gemini, and ChatGPT Search are transforming digital content discovery. To succeed, writers must align with Answer Engine Optimization (AEO).

## Why Structure is Key
Traditional SEO targeted keyword density and backlink profiles. AI-powered engines assess semantic readability, keyword relevance, and clear heading hierarchies.

## Core Directives for AEO:
1. Formulate headers as direct questions (e.g., "What is AEO?").
2. Answer queries instantly in subsequent paragraphs.
3. Incorporate summary bullet points for crawler mapping.

### Frequently Asked Questions
What is AEO?
AEO stands for Answer Engine Optimization. It formats content specifically for conversational language models to parse as source citations.`,
    status: 'PUBLISHED' as const,
    category: 'AEO Insights',
    tags: ['AEO', 'SEO', 'Artificial Intelligence', 'Search Indexing'],
    aiScore: 92,
    visibilityScore: 88,
    confidenceScore: 0.95,
    suggestions: [
      { type: 'Formatting', message: 'Incorporate schema structured JSON-LD implicitly.', severity: 'low' as const }
    ],
    gapAnalysis: {
      missingKeywords: ['structured schema', 'LLM retrieval'],
      missingTopics: ['RAG vector databases'],
      missingSections: ['JSON Schema mapping block']
    },
    recommendations: [
      'Incorporate table elements detailing performance stats.',
      'Explicitly cite academic research links.'
    ],
    userId: 'demo-user-id',
    createdAt: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
  {
    id: 'art-2',
    title: 'Restructuring Legacy Web Layouts for Language Model Audits',
    content: `# Restructuring Legacy Web Layouts for Language Model Audits

Crawlers built by AI providers read pages differently than traditional bots. Let's explore how to design modern web layout flows to optimize index weight.

## Paragraph Length
LLM models index text blocks. Keeping sentence sequences under 15 words and paragraphs under 4 lines aids parsing speeds and scores.`,
    status: 'DRAFT' as const,
    category: 'Marketing',
    tags: ['Web Layouts', 'Auditing', 'Copywriting'],
    aiScore: 68,
    visibilityScore: 40,
    confidenceScore: 0.65,
    suggestions: [
      { type: 'Heading Structure', message: 'Add at least one H2 markdown header.', severity: 'high' as const },
      { type: 'Readability', message: 'Paragraphs are too dense. Shorten sentences to under 18 words.', severity: 'medium' as const }
    ],
    gapAnalysis: {
      missingKeywords: ['AI crawlers', 'index scores'],
      missingTopics: ['Semantic vector embeddings'],
      missingSections: ['Summary Block', 'FAQ Section']
    },
    recommendations: [
      'Break up the second paragraph.',
      'Add a FAQ section covering bot behavior.'
    ],
    userId: 'demo-user-id',
    createdAt: new Date(Date.now() - 3600000 * 24 * 7).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 24 * 7).toISOString(),
  },
  {
    id: 'art-3',
    title: 'A Technical Introduction to Vector Similarity Search',
    content: `# A Technical Introduction to Vector Similarity Search

Vector search is the technology powering conversational retrieval systems (RAG). By converting sentences into float lists (embeddings), we map concepts mathematically.

## Mathematical Cosine Similarity
Calculating the cosine of the angle between two multi-dimensional vectors reveals semantic relevance. This enables search engines to query concepts, not just words.`,
    status: 'PUBLISHED' as const,
    category: 'Tech & Engineering',
    tags: ['Vector Search', 'Mathematics', 'Retrieval', 'RAG'],
    aiScore: 86,
    visibilityScore: 78,
    confidenceScore: 0.88,
    suggestions: [],
    gapAnalysis: {
      missingKeywords: ['pgvector', 'euclidean distance'],
      missingTopics: ['Dimensionality reductions'],
      missingSections: ['Example calculation list']
    },
    recommendations: [
      'Define pgvector extensions explicitly.',
      'Show comparative graphs between cosine and euclidean search.'
    ],
    userId: 'demo-user-id',
    createdAt: new Date(Date.now() - 3600000 * 24 * 1).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  }
];

// Local memory mock comparisons store for Guest Demo Mode
let mockComparisons: any[] = [];

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT Token and hijack requests in Guest Demo Mode
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('contentiq_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Hijack network queries if running in Guest Demo Mode (except PDF report generation)
    if (token === 'mock-jwt-token-contentiq-ai' && 
        !config.url?.includes('/api/reports/article') && 
        !config.url?.includes('/api/generate-report')
    ) {
      config.adapter = (async (cfg) => {
        const url = cfg.url || '';
        const method = (cfg.method || 'get').toLowerCase();
        let body: any = {};
        try {
          body = typeof cfg.data === 'string' ? JSON.parse(cfg.data) : cfg.data || {};
        } catch (_) {}

        console.log(`[MOCK API] ${method.toUpperCase()} ${url}`, body);

        let data: any = null;
        let status = 200;

        // Route Matching
        if (url.includes('/api/compare/history')) {
          data = { history: mockComparisons };
        } else if (url.includes('/api/compare/run') && method === 'post') {
          let domain1 = 'yourwebsite.com';
          let domain2 = 'competitor.com';
          try { domain1 = new URL(body.url1).hostname.replace('www.', ''); } catch (_) {}
          try { domain2 = new URL(body.url2).hostname.replace('www.', ''); } catch (_) {}
          const mockResult = {
            id: `mock-comp-${Date.now()}`,
            url1: body.url1,
            url2: body.url2,
            domain1,
            domain2,
            winnerSummary: {
              overall: 'Your Website',
              visibility: 'Your Website',
              aeo: 'Competitor',
              seo: 'Your Website',
              content: 'Your Website',
            },
            metrics: {
              aiVisibility: { label: 'Overall AI Visibility Score', you: 85, competitor: 78, format: 'score' },
              aeoScore: { label: 'AEO Score', you: 82, competitor: 88, format: 'score' },
              seoScore: { label: 'SEO Score', you: 88, competitor: 82, format: 'score' },
              wordCount: { label: 'Word Count', you: 1250, competitor: 1400, format: 'number' },
              readability: { label: 'Readability', you: 72, competitor: 65, format: 'score' },
              contentDepth: { label: 'Content Depth', you: 80, competitor: 75, format: 'score' },
              freshness: { label: 'Content Freshness', you: 90, competitor: 40, format: 'score' },
              helpfulContent: { label: 'Helpful Content', you: 85, competitor: 80, format: 'score' },
              h1Count: { label: 'H1 Headings', you: 1, competitor: 1, format: 'number' },
              h2Count: { label: 'H2 Headings', you: 6, competitor: 8, format: 'number' },
              h3Count: { label: 'H3 Headings', you: 4, competitor: 12, format: 'number' },
              metaTitleLength: { label: 'Meta Title Length', you: 58, competitor: 62, format: 'number' },
              metaDescriptionLength: { label: 'Meta Description Length', you: 145, competitor: 152, format: 'number' },
              hasCanonical: { label: 'Canonical URL Configured', you: 100, competitor: 100, format: 'boolean' },
              hasOgTags: { label: 'Open Graph Configured', you: 100, competitor: 100, format: 'boolean' },
              hasTwitterTags: { label: 'Twitter Cards Configured', you: 100, competitor: 0, format: 'boolean' },
              schemaCount: { label: 'Structured Schema Types', you: 3, competitor: 4, format: 'number' },
              faqCount: { label: 'FAQ Q&A Count', you: 4, competitor: 10, format: 'number' },
              entityCount: { label: 'Extracted Entity Count', you: 28, competitor: 42, format: 'number' },
              keywordCount: { label: 'Keyword Topic Count', you: 18, competitor: 25, format: 'number' },
              internalLinkCount: { label: 'Internal Links', you: 12, competitor: 22, format: 'number' },
              externalLinkCount: { label: 'External Authority Citations', you: 4, competitor: 6, format: 'number' },
              pageSpeed: { label: 'Page Speed Index', you: 92, competitor: 85, format: 'score' },
              isHttps: { label: 'HTTPS Protocol Secure', you: 100, competitor: 100, format: 'boolean' },
              robotsAllowed: { label: 'Crawlable (robots.txt Allowed)', you: 100, competitor: 100, format: 'boolean' },
              aiReadiness: { label: 'AI Readability', you: 86, competitor: 82, format: 'score' },
              citationReadiness: { label: 'Citation Readiness', you: 80, competitor: 85, format: 'score' },
              semanticCoverage: { label: 'Semantic Coverage', you: 78, competitor: 82, format: 'score' },
            },
            gapAnalysis: {
              issues: [
                '❌ Competitor covers 42 entities. Your website has only 28.',
                '❌ Competitor uses FAQ Schema while your website is missing it.',
                '❌ Competitor has 10 FAQs. Your website has only 4.',
                '❌ Your content is 150 words shorter than competitor.',
                '❌ Competitor has stronger internal linking (22 links vs 12).'
              ],
              entities1: {
                brands: ['AEOlytics', 'Vite', 'React'],
                locations: ['USA', 'California'],
                people: ['Prathika'],
                organizations: ['Google', 'Meta'],
                products: ['Content Optimizer', 'Radar'],
                services: ['AEO Tracking']
              },
              entities2: {
                brands: ['CompetitorCorp', 'Webpack'],
                locations: ['London', 'UK'],
                people: ['John Doe'],
                organizations: ['Amazon', 'Microsoft'],
                products: ['SEO Tool Suite'],
                services: ['SEO Auditing']
              },
              missingKeywords: ['schema mapping', 'vector density', 'information retrieval']
            },
            recommendations: [
              'Add FAQPage structured data to pages containing questions.',
              'Increase your entity density by referencing more related products, brands, and organizations.',
              'Add 3-5 more questions to your FAQ section to bridge the gap.',
              'Improve internal linking to build topical depth clusters.',
              'Write 200 additional words to increase content density.'
            ],
            crawledAt: new Date().toISOString(),
          };
          
          mockComparisons.unshift(mockResult);
          data = mockResult;
        } else if (url.includes('/api/articles')) {
          if (method === 'get') {
            const match = url.match(/\/api\/articles\/([a-zA-Z0-9-]+)/);
            if (match) {
              const article = mockArticles.find(a => a.id === match[1]);
              data = article || null;
              status = article ? 200 : 404;
            } else {
              data = mockArticles;
            }
          } else if (method === 'post') {
            const newArt = {
              id: `art-${Date.now()}`,
              title: body.title,
              content: body.content,
              status: body.status || 'DRAFT',
              category: body.category || 'General',
              tags: body.tags || [],
              aiScore: 0,
              visibilityScore: 0,
              confidenceScore: 0,
              suggestions: [],
              gapAnalysis: { missingKeywords: [], missingTopics: [], missingSections: [] },
              recommendations: [],
              userId: 'demo-user-id',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            mockArticles.push(newArt);
            data = newArt;
            status = 200;
          } else if (method === 'patch') {
            if (url.includes('/api/articles/draft')) {
              const { id, title, content, category, tags } = body;
              let article;
              if (id) {
                const idx = mockArticles.findIndex(a => a.id === id);
                if (idx !== -1) {
                  mockArticles[idx] = {
                    ...mockArticles[idx],
                    title: title !== undefined ? title : mockArticles[idx].title,
                    content: content !== undefined ? content : mockArticles[idx].content,
                    category: category !== undefined ? category : mockArticles[idx].category,
                    tags: tags !== undefined ? tags : mockArticles[idx].tags,
                    updatedAt: new Date().toISOString(),
                  };
                  article = mockArticles[idx];
                } else {
                  status = 404;
                }
              } else {
                article = {
                  id: `art-autosave-${Date.now()}`,
                  title: title || 'Untitled Draft',
                  content: content || '',
                  category: category || 'Marketing',
                  tags: tags || [],
                  status: 'DRAFT',
                  aiScore: 0,
                  visibilityScore: 0,
                  confidenceScore: 0,
                  suggestions: [],
                  gapAnalysis: { missingKeywords: [], missingTopics: [], missingSections: [] },
                  recommendations: [],
                  userId: 'demo-user-id',
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                };
                mockArticles.push(article as any);
              }
              data = { article };
              status = status === 404 ? 404 : 200;
            }
          } else if (method === 'put') {
            const match = url.match(/\/api\/articles\/([a-zA-Z0-9-]+)/);
            if (match) {
              const idx = mockArticles.findIndex(a => a.id === match[1]);
              if (idx !== -1) {
                mockArticles[idx] = {
                  ...mockArticles[idx],
                  ...body,
                  updatedAt: new Date().toISOString()
                };
                data = mockArticles[idx];
                status = 200;
              } else {
                status = 404;
              }
            }
          } else if (method === 'delete') {
            const match = url.match(/\/api\/articles\/([a-zA-Z0-9-]+)/);
            if (match) {
              mockArticles = mockArticles.filter(a => a.id !== match[1]);
              data = { success: true };
              status = 200;
            }
          }
        } else if (url.includes('/api/ai/analyze')) {
          const wordCount = body.content ? body.content.split(/\s+/).length : 0;
          const hasFAQ = body.content ? body.content.toLowerCase().includes('faq') : false;
          const hasHeaders = body.content ? body.content.includes('#') : false;
          
          let score = 60;
          if (wordCount > 400) score += 15;
          if (hasHeaders) score += 15;
          if (hasFAQ) score += 8;
          score = Math.min(96, score);

          data = {
            aiScore: score,
            visibilityScore: Math.max(30, score - 8),
            confidenceScore: 0.88,
            suggestions: hasHeaders ? [] : [{ type: 'Heading Structure', message: 'No subheaders found.', severity: 'high' }],
            gapAnalysis: {
              missingKeywords: ['structured metadata', 'index placement'],
              missingTopics: ['RAG vector databases'],
              missingSections: ['FAQ block']
            },
            recommendations: ['Incorporate bullet points', 'Format headings as questions']
          };
        } else if (url.includes('/api/ai/optimize')) {
          const act = body.action || '';
          let optimized = body.content || '';
          if (act === 'INTRO') {
            optimized = `## Introduction: Optimized AEO Executive Summary\n\nTo align web discoverability with AI Search Crawlers, copy must remain direct, structured, and question-focused. This report reviews performance metrics.\n\n` + optimized;
          } else if (act === 'FAQ') {
            optimized = optimized + `\n\n## Frequently Asked Questions\n\n### What is AEOlytics?\nAEOlytics is an AI content optimization engine that grades documents for search engine catalog visibility.`;
          } else {
            optimized = `*Simulated Optimization [${act}]*\n\n` + optimized;
          }
          data = { optimizedContent: optimized };
        } else if (url.includes('/api/ai/chat')) {
          const art = mockArticles.find(a => a.id === body.articleId);
          data = {
            response: `This is a simulated RAG response based on "${art?.title || 'Scope Document'}". It includes details about headings indices and keywords. Let me know if you would like me to rewrite or summarize sections.`
          };
        } else if (url.includes('/api/analytics/summary')) {
          data = {
            trends: mockArticles.filter(a => a.status === 'PUBLISHED').map(a => ({
              title: a.title,
              aiScore: a.aiScore,
              visibilityScore: a.visibilityScore,
              createdAt: a.createdAt
            })),
            categories: [
              { category: 'AEO Insights', count: 1 },
              { category: 'Marketing', count: 1 },
              { category: 'Tech & Engineering', count: 1 }
            ],
            metrics: {
              total: mockArticles.length,
              drafts: mockArticles.filter(a => a.status === 'DRAFT').length,
              published: mockArticles.filter(a => a.status === 'PUBLISHED').length
            }
          };

        // ── VISIBILITY MOCK ROUTES ─────────────────────────────────────────
        } else if (url.includes('/api/visibility/scan') && method === 'post') {
          const inputUrl = body.url || '';
          let mockDomain = 'example.com';
          try { mockDomain = new URL(inputUrl).hostname.replace('www.', ''); } catch {}
          const brandName = mockDomain.split('.')[0];
          const competitors: string[] = body.competitors || [];

          // Generate deterministic mock queries and results
          const mockQueries = [
            `Best AEO tools for content optimization`,
            `How to improve content visibility in AI search`,
            `What is the best platform for SEO automation?`,
            `AI content optimization tools comparison`,
            `How to optimize content for ChatGPT search results`,
            `Best answer engine optimization strategies`,
            `How does Perplexity AI rank content sources?`,
            `Top AI/ML software for small businesses`,
            `AI content visibility improvement techniques`,
            `What tools does Google use for AI search indexing?`,
            `How to get cited by AI search engines like Gemini`,
            `Content optimization best practices 2025`,
            `Free vs paid SEO/AEO tools review`,
            `How to measure AI search visibility`,
            `SEO automation platforms compared`,
          ];

          // Simulate mention pattern (seed-based for consistency)
          const mockScanQueries = mockQueries.map((q, i) => {
            const mentioned = (i % 3 === 0) || (i % 5 === 0); // ~40% mention rate
            const compMentions = competitors.slice(0, 2).map(c => ({ domain: c.replace('www.', ''), count: 1 }));
            return {
              id: `mock-q-${i}`,
              query: q,
              mentioned,
              mentionPosition: mentioned ? (i % 2 === 0 ? 1 : 3) : null,
              competitorMentions: mentioned ? [] : compMentions,
              queryScore: mentioned ? (i % 2 === 0 ? 90 : 70) : 0,
              llmResponseExcerpt: mentioned
                ? `When looking for tools in this space, ${brandName} stands out as a comprehensive solution. It offers advanced analytics, AI optimization, and seamless workflow integration...`
                : `Several excellent tools exist for this purpose. Popular options include ${competitors.slice(0, 2).map(c => c.split('.')[0]).join(', ')} and similar platforms...`,
            };
          });

          const totalQ = mockScanQueries.length;
          const mentionC = mockScanQueries.filter(q => q.mentioned).length;
          const mentionPct = parseFloat(((mentionC / totalQ) * 100).toFixed(1));

          data = {
            success: true,
            scan: {
              id: `mock-scan-${Date.now()}`,
              url: inputUrl,
              domain: mockDomain,
              visibilityScore: mentionPct,
              totalQueries: totalQ,
              mentionCount: mentionC,
              mentionPercent: mentionPct,
              topCompetitors: competitors.slice(0, 3).map(c => ({ domain: c.replace('www.', ''), mentions: 3 })),
              avgPosition: 2.1,
              scannedAt: new Date().toISOString(),
              queries: mockScanQueries,
            },
          };

        } else if (url.includes('/api/visibility/latest')) {
          data = { scan: null }; // No previous scan in demo mode

        } else if (url.includes('/api/visibility/history')) {
          data = { history: [] }; // Empty history in demo mode

        // ── RADAR MOCK ROUTES ──────────────────────────────────────────────
        } else if (url.includes('/api/radar/scan') && method === 'post') {
          const inputUrl = body.url || '';
          const queries: string[] = body.queries || [];
          const competitors: string[] = body.competitors || [];
          const engines: string[] = body.engines || ['chatgpt', 'gemini', 'claude', 'perplexity'];
          let mockDomain = 'example.com';
          try { mockDomain = new URL(inputUrl).hostname.replace('www.', ''); } catch {}
          const brandName = mockDomain.split('.')[0];

          const enginePersonaText: Record<string, string> = {
            chatgpt: `Based on my knowledge, several excellent tools exist for this purpose including ${competitors[0]?.split('.')[0] || 'various platforms'}. ${brandName} is worth considering for its comprehensive feature set.`,
            gemini: `According to available information, ${competitors[0]?.split('.')[0] || 'multiple solutions'} are popular in this space. Some users also recommend ${brandName} for advanced use cases.`,
            claude: `From what I understand, there are several strong options including ${competitors[0]?.split('.')[0] || 'industry leaders'}. The choice depends on your specific requirements and budget.`,
            perplexity: `Here's what I found: Top tools include ${competitors[0]?.split('.')[0] || 'leading platforms'} and others. ${brandName} appears in several recommendations for professional workflows.`,
          };

          const results: any[] = [];
          queries.forEach((query, qi) => {
            engines.forEach((engine, ei) => {
              const seed = (query.length * 7 + engine.length * 13 + qi * 3 + ei * 5) % 10;
              const mentioned = seed < 4;
              const hasPrimary = seed < 2;
              const compMentions = competitors
                .slice(0, 2)
                .map(c => ({ domain: c.replace('www.', ''), count: mentioned ? 0 : 1 }))
                .filter(c => !mentioned);

              results.push({
                id: `mock-rr-${qi}-${ei}`,
                sessionId: 'mock-session',
                query,
                engine,
                mentioned,
                rankPosition: mentioned ? (hasPrimary ? 1 : 3) : null,
                citationStatus: mentioned ? (hasPrimary ? 'primary' : 'secondary') : 'none',
                competitorMentions: compMentions,
                responseExcerpt: mentioned
                  ? enginePersonaText[engine] || `${brandName} is a strong choice for this query.`
                  : `${competitors[0]?.split('.')[0] || 'Alternative tools'} are commonly cited for this use case. Several options exist depending on your workflow.`,
                queryScore: mentioned ? (hasPrimary ? 90 : 70) : 0,
              });
            });
          });

          const totalChecks = results.length;
          const totalMentions = results.filter(r => r.mentioned).length;
          const overallScore = parseFloat(((totalMentions / totalChecks) * 100).toFixed(1));

          data = {
            success: true,
            session: {
              id: `mock-session-${Date.now()}`,
              url: inputUrl,
              domain: mockDomain,
              engines,
              overallScore,
              totalChecks,
              totalMentions,
              scannedAt: new Date().toISOString(),
              results,
              recommendations: [
                { id: 'rec-1', type: 'schema', priority: 'high', engine: 'gemini', title: 'Add FAQ Schema for Gemini Visibility', description: 'Your website appears less frequently in Gemini responses because your content lacks structured FAQ schema markup. Add JSON-LD FAQPage schema to key landing pages.' },
                { id: 'rec-2', type: 'content', priority: 'high', engine: null, title: 'Create Dedicated "Best Of" Comparison Pages', description: `AI engines frequently cite comparison and listicle pages. Create a "Best [Category] Tools" page positioning ${mockDomain} clearly against alternatives.` },
                { id: 'rec-3', type: 'keyword', priority: 'medium', engine: 'gemini', title: 'Expand Long-Tail Conversational Query Coverage', description: 'Add a blog section or FAQ hub targeting "how to", "what is", and "vs" queries relevant to your domain.' },
                { id: 'rec-4', type: 'content', priority: 'medium', engine: null, title: competitors[0] ? `Close the Gap vs ${competitors[0]}` : 'Strengthen Competitive Positioning', description: competitors[0] ? `${competitors[0]} is frequently cited where ${mockDomain} is not. Create superior content on the same topics.` : 'Identify top competitors that AI engines cite most frequently and create content targeting the same queries.' },
                { id: 'rec-5', type: 'article', priority: 'low', engine: 'perplexity', title: 'Publish Original Research or Data Reports', description: 'Perplexity AI heavily cites websites that publish original data. Creating an annual industry report dramatically increases AI citation frequency.' },
                { id: 'rec-6', type: 'schema', priority: 'low', engine: null, title: 'Implement HowTo and Article Schema Markup', description: 'Add HowTo schema to tutorial pages. This is especially effective for ChatGPT and Claude which parse structured content more efficiently.' },
              ],
            },
          };

        } else if (url.includes('/api/ai-radar/domains')) {
          data = {
            success: true,
            domains: [
              { domain: 'example.com', url: 'https://example.com', lastUpdated: new Date().toISOString() },
              { domain: 'another-domain.com', url: 'https://another-domain.com', lastUpdated: new Date(Date.now() - 3600000).toISOString() }
            ]
          };
        } else if (url.includes('/api/ai-radar/history') || url.includes('/api/radar/history')) {
          const isAnother = url.includes('another-domain.com');
          data = {
            success: true,
            history: isAnother ? [
              { id: 'mock-s-a1', url: 'https://another-domain.com', domain: 'another-domain.com', overallScore: 65.0, totalChecks: 20, totalMentions: 13, engines: ['chatgpt', 'gemini', 'claude', 'perplexity'], scannedAt: new Date(Date.now() - 3600000 * 24).toISOString() },
              { id: 'mock-s-a2', url: 'https://another-domain.com', domain: 'another-domain.com', overallScore: 68.4, totalChecks: 20, totalMentions: 14, engines: ['chatgpt', 'gemini', 'claude', 'perplexity'], scannedAt: new Date(Date.now() - 3600000 * 12).toISOString() },
              { id: 'mock-s-a3', url: 'https://another-domain.com', domain: 'another-domain.com', overallScore: 72.0, totalChecks: 20, totalMentions: 14, engines: ['chatgpt', 'gemini', 'claude', 'perplexity'], scannedAt: new Date().toISOString() }
            ] : [
              { id: 'mock-s1', url: 'https://example.com', domain: 'example.com', overallScore: 78.5, totalChecks: 20, totalMentions: 14, engines: ['chatgpt', 'gemini', 'claude', 'perplexity'], scannedAt: new Date(Date.now() - 3600000 * 24).toISOString() },
              { id: 'mock-s2', url: 'https://example.com', domain: 'example.com', overallScore: 81.2, totalChecks: 20, totalMentions: 16, engines: ['chatgpt', 'gemini', 'claude', 'perplexity'], scannedAt: new Date(Date.now() - 3600000 * 12).toISOString() },
              { id: 'mock-s3', url: 'https://example.com', domain: 'example.com', overallScore: 85.0, totalChecks: 20, totalMentions: 17, engines: ['chatgpt', 'gemini', 'claude', 'perplexity'], scannedAt: new Date().toISOString() }
            ]
          };
        } else if (url.includes('/api/ai-radar/platforms')) {
          const isAnother = url.includes('another-domain.com');
          data = {
            success: true,
            platforms: isAnother ? [
              { id: 'chatgpt', name: 'ChatGPT', score: 75, trend: 'up', lastUpdated: new Date().toISOString(), status: 'online' },
              { id: 'gemini', name: 'Gemini', score: 70, trend: 'stable', lastUpdated: new Date().toISOString(), status: 'online' },
              { id: 'claude', name: 'Claude', score: 72, trend: 'down', lastUpdated: new Date().toISOString(), status: 'simulated' },
              { id: 'perplexity', name: 'Perplexity', score: 73, trend: 'up', lastUpdated: new Date().toISOString(), status: 'simulated' }
            ] : [
              { id: 'chatgpt', name: 'ChatGPT', score: 90, trend: 'up', lastUpdated: new Date().toISOString(), status: 'online' },
              { id: 'gemini', name: 'Gemini', score: 85, trend: 'stable', lastUpdated: new Date().toISOString(), status: 'online' },
              { id: 'claude', name: 'Claude', score: 80, trend: 'down', lastUpdated: new Date().toISOString(), status: 'simulated' },
              { id: 'perplexity', name: 'Perplexity', score: 85, trend: 'up', lastUpdated: new Date().toISOString(), status: 'simulated' }
            ]
          };
        } else if (url.includes('/api/ai-radar/alerts')) {
          const isAnother = url.includes('another-domain.com');
          data = {
            success: true,
            alerts: isAnother ? [
              { id: 'mock-a-a1', type: 'warning', title: 'Low Visibility on Gemini', description: 'Your website has less than 75% appearance rating on Gemini. Audit structural schema keywords.', timestamp: new Date().toISOString() },
              { id: 'mock-a-a2', type: 'info', title: 'Action Item', description: 'Create comparisons against alternatives to increase organic mentions.', timestamp: new Date().toISOString() }
            ] : [
              { id: 'mock-a1', type: 'success', title: 'Strong AI Search Visibility', description: 'Your website has a high visibility score of 85% across AI engines. Keep up the good work!', timestamp: new Date().toISOString() },
              { id: 'mock-a2', type: 'info', title: 'High Priority Action Item', description: 'Add FAQ Schema for Gemini Visibility: Your website appears less frequently in Gemini responses. Add JSON-LD FAQPage schema.', timestamp: new Date().toISOString() }
            ]
          };
        } else if (url.includes('/api/ai-radar/live')) {
          data = { success: true };
        } else if (url.includes('/api/ai-radar') || url.includes('/api/radar/latest')) {
          const isAnother = url.includes('another-domain.com');
          const mockDomain = isAnother ? 'another-domain.com' : 'example.com';
          const mockResults: any[] = [];
          const engines = ['chatgpt', 'gemini', 'claude', 'perplexity'];
          const queries = [
            `Best AEO tools for content optimization`,
            `How to improve content visibility in AI search`,
            `What is the best platform for SEO automation?`,
            `AI content optimization tools comparison`,
            `How to optimize content for ChatGPT search results`
          ];
          queries.forEach((q, qi) => {
            engines.forEach((e, ei) => {
              const mentioned = isAnother ? ((qi + ei) % 3 === 0) : ((qi + ei) % 2 === 0);
              mockResults.push({
                id: `mock-rr-${qi}-${ei}`,
                query: q,
                engine: e,
                mentioned,
                rankPosition: mentioned ? 2 : null,
                citationStatus: mentioned ? 'primary' : 'none',
                competitorMentions: mentioned ? [] : [{ domain: 'competitor.com', count: 1 }],
                responseExcerpt: mentioned ? `${mockDomain} is one of the leading platforms recommended for AI optimization.` : 'Alternative options include competitor.com.',
                queryScore: mentioned ? 80 : 0
              });
            });
          });
          data = {
            success: true,
            session: {
              id: isAnother ? 'mock-session-latest-another' : 'mock-session-latest',
              url: `https://${mockDomain}`,
              domain: mockDomain,
              engines,
              overallScore: isAnother ? 72 : 85,
              totalChecks: mockResults.length,
              totalMentions: mockResults.filter(r => r.mentioned).length,
              scannedAt: new Date().toISOString(),
              results: mockResults,
              recommendations: isAnother ? [
                { id: 'rec-a1', type: 'content', priority: 'high', engine: null, title: 'Incorporate missing topics', description: 'Address vector indexing gaps for search crawlers.' }
              ] : [
                { id: 'rec-1', type: 'schema', priority: 'high', engine: 'gemini', title: 'Add FAQ Schema for Gemini Visibility', description: 'Your website appears less frequently in Gemini responses because your content lacks structured FAQ schema markup. Add JSON-LD FAQPage schema to key landing pages.' },
                { id: 'rec-2', type: 'content', priority: 'high', engine: null, title: 'Create Dedicated "Best Of" Comparison Pages', description: 'AI engines frequently cite comparison and listicle pages. Create a "Best [Category] Tools" page positioning example.com clearly against alternatives.' }
              ]
            }
          };
        } else if (url.includes('/api/radar/recommendations')) {
          data = { recommendations: [] };

        // ── IMPORT MOCK ROUTES ──────────────────────────────────────────────
        } else if (url.includes('/api/import/validate')) {
          const inputUrl = body.url || '';
          let mockDomain = '';
          try { mockDomain = new URL(inputUrl).hostname; } catch {}
          data = {
            valid: !!inputUrl && inputUrl.startsWith('http'),
            url: inputUrl,
            https: inputUrl.startsWith('https'),
            statusCode: 200,
            finalUrl: inputUrl,
            domain: mockDomain,
            redirected: false,
            robotsAllowed: true,
            canonicalUrl: inputUrl || null,
            error: !inputUrl ? 'URL is required' : (!inputUrl.startsWith('http') ? 'Invalid URL format. Please include https://' : undefined),
          };
          status = data.valid ? 200 : 422;

        } else if (url.includes('/api/import/run')) {
          const inputUrl = body.url || '';
          let domain = '';
          try { domain = new URL(inputUrl).hostname; } catch {}
          let urlHash = 0;
          for (let i = 0; i < inputUrl.length; i++) {
            urlHash += inputUrl.charCodeAt(i);
          }
          const seed = urlHash % 30;
          const baseScore = 55 + seed;
          const mockId = `art-import-${Date.now()}`;
          const mockTitle = `Imported: ${domain || 'Article'} — AEO Analysis`;
          const mockArticle = {
            id: mockId,
            title: mockTitle,
            content: `# ${mockTitle}\n\n## What is This Content?\nThis article was imported from ${inputUrl}. In demo mode, the actual page content is not fetched — connect the real backend to enable live crawling.\n\n## Key Topics\nThis content covers AEO optimization, search engine visibility, and AI citation strategies.\n\n## Frequently Asked Questions\n\n### How does AEO work?\nAEO optimizes content for AI search engines by improving structure, entity density, and question coverage.\n\n### What engines are supported?\nChatGPT, Google AI Overview, Gemini, Perplexity, Claude, and Microsoft Copilot.\n\n### How are scores calculated?\nScores are computed from 20 real content metrics including readability, entity density, heading structure, schema coverage, and citation quality.`,
            status: 'DRAFT' as const,
            category: body.category || 'Guides & Tutorials',
            tags: ['AEO', 'Import', domain].filter(Boolean),
            aiScore: baseScore,
            visibilityScore: baseScore - 5,
            confidenceScore: parseFloat(((baseScore) / 100).toFixed(2)),
            suggestions: [],
            gapAnalysis: { missingKeywords: ['structured schema', 'FAQ coverage'], missingTopics: ['Entity relationships'], missingSections: ['JSON-LD Schema block'] },
            recommendations: ['Add FAQPage JSON-LD schema', 'Include 5+ external citations', 'Restructure headings as questions'],
            userId: 'demo-user-id',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            sourceUrl: inputUrl,
            sourceDomain: domain,
            importedAt: new Date().toISOString(),
            wordCount: 850 + seed * 10,
            readingTime: 4,
            metaDescription: `AEO analysis of content from ${domain}`,
            language: 'en',
            auditScores: {
              chatgpt: baseScore + 3,
              googleAI: baseScore - 2,
              gemini: baseScore + 5,
              perplexity: baseScore - 8,
              claude: baseScore + 1,
              copilot: baseScore - 3,
              overall: baseScore,
            },
            optimizerData: {
              panels: [
                { panelId: 'content-quality', label: 'Content Quality', score: baseScore + 2, summary: 'Content depth is adequate but could benefit from expansion.', issues: baseScore < 65 ? [{ severity: 'high', title: 'Below Optimal Word Count', description: 'Content has fewer than 600 words.', recommendation: 'Expand to 800+ words with examples and case studies.', whyItMatters: 'AI engines prefer comprehensive content.', aiInterpretation: 'Short content receives lower citation priority.' }] : [] },
                { panelId: 'semantic-coverage', label: 'Semantic Coverage', score: baseScore - 5, summary: 'Moderate entity coverage detected.', issues: [{ severity: 'medium', title: 'Limited Named Entities', description: 'Fewer than 10 named entities detected.', recommendation: 'Include specific products, organizations, and technologies.', whyItMatters: 'Entities are the backbone of AI knowledge graphs.', aiInterpretation: 'Low entity density reduces topical authority signals.' }] },
                { panelId: 'question-coverage', label: 'Question Coverage', score: baseScore + 8, summary: 'Good question coverage with FAQ section.', issues: [] },
                { panelId: 'heading-analysis', label: 'Heading Analysis', score: baseScore + 5, summary: 'Heading structure is acceptable.', issues: baseScore < 70 ? [{ severity: 'medium', title: 'Too Few H2 Subheadings', description: 'Only 2 H2 headings detected.', recommendation: 'Add one H2 per 250 words.', whyItMatters: 'H2 headings define AI chunk boundaries.', aiInterpretation: 'Few sections reduce answer extraction precision.' }] : [] },
                { panelId: 'schema', label: 'Schema', score: 0, summary: 'No JSON-LD schema detected.', issues: [{ severity: 'critical', title: 'No JSON-LD Schema', description: 'Page has no structured data markup.', recommendation: 'Add Article and FAQPage JSON-LD schemas.', whyItMatters: 'Schema markup is critical for AI knowledge graph integration.', aiInterpretation: 'Pages without schema are treated as unstructured text.' }] },
                { panelId: 'internal-linking', label: 'Internal Linking', score: 30, summary: 'Weak internal linking detected.', issues: [{ severity: 'high', title: 'No Internal Links', description: 'Content contains no internal links.', recommendation: 'Add 3-5 contextual internal links.', whyItMatters: 'Internal links signal topical depth to AI engines.', aiInterpretation: 'Isolated pages score lower in topic cluster analysis.' }] },
                { panelId: 'external-authority', label: 'External Authority', score: 40, summary: 'Insufficient external citations.', issues: [{ severity: 'high', title: 'No External Citations', description: 'No links to external sources found.', recommendation: 'Add 3-5 citations to authoritative sources.', whyItMatters: 'Citations signal factual grounding to AI search engines.', aiInterpretation: 'Uncited content appears opinion-based, reducing citation probability.' }] },
                { panelId: 'metadata', label: 'Metadata', score: baseScore - 10, summary: 'Meta tags need improvement.', issues: [{ severity: 'medium', title: 'Missing OG Tags', description: 'Open Graph tags are incomplete.', recommendation: 'Add og:title, og:description, og:image, og:type.', whyItMatters: 'OG tags provide structured metadata to AI systems.', aiInterpretation: 'Incomplete OG metadata reduces discoverability in AI social search.' }] },
                { panelId: 'images', label: 'Images', score: 50, summary: 'Images missing ALT text.', issues: [{ severity: 'high', title: 'Images Missing ALT Text', description: 'Images found without descriptive ALT text.', recommendation: 'Add descriptive ALT text to all images.', whyItMatters: 'ALT text is how AI engines understand image content.', aiInterpretation: 'Images without ALT text are invisible to AI indexers.' }] },
              ],
              selectedDomains: body.domains || ['chatgpt', 'googleAI', 'gemini', 'perplexity', 'claude', 'copilot'],
              auditedAt: new Date().toISOString(),
            }
          };
          mockArticles.push(mockArticle as any);
          data = {
            success: true,
            article: mockArticle,
            crawlResult: { url: inputUrl, domain, title: mockTitle, metaDescription: '', author: null, publishDate: null, language: 'en', wordCount: mockArticle.wordCount, readingTime: mockArticle.readingTime, h1: [mockTitle], h2: ['What is This Content?', 'Key Topics', 'Frequently Asked Questions'], h3: [], internalLinks: 0, externalLinks: 0, images: 0, entities: ['AEO', 'ChatGPT', 'Perplexity', 'Google AI', 'Gemini'], topics: ['AEO', 'Search Engine Optimization', 'AI Search'], primaryIntent: 'Informational', jsonLDTypes: [] },
            markdown: mockArticle.content,
            auditScores: mockArticle.auditScores,
            optimizerPanels: mockArticle.optimizerData.panels,
          };

        } else if (url.includes('/api/import/reaudit')) {
          const content = body.content || '';
          const wc = content.split(/\s+/).filter(Boolean).length;
          const hasFAQ = content.toLowerCase().includes('faq');
          const hasHeaders = (content.match(/^## /gm) || []).length;
          let reScore = 55;
          if (wc > 500) reScore += 15;
          if (hasHeaders >= 3) reScore += 15;
          if (hasFAQ) reScore += 10;
          reScore = Math.min(95, reScore);
          data = {
            auditScores: { chatgpt: reScore + 3, googleAI: reScore - 2, gemini: reScore + 5, perplexity: reScore - 8, claude: reScore + 1, copilot: reScore - 3, overall: reScore },
            optimizerPanels: [
              { panelId: 'content-quality', label: 'Content Quality', score: reScore + 2, summary: `${wc} words analyzed.`, issues: wc < 300 ? [{ severity: 'critical', title: 'Thin Content', description: `Only ${wc} words.`, recommendation: 'Expand to 800+ words.', whyItMatters: 'AI engines require substantial content.', aiInterpretation: 'Below citation threshold.' }] : [] },
            ],
            metrics: {},
          };
        }


        return {
          data,
          status,
          statusText: status === 200 ? 'OK' : 'Not Found',
          headers: {},
          config: cfg,
        };
      }) as AxiosAdapter;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Catch auth errors and redirect
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('contentiq_token');
      localStorage.removeItem('contentiq_user');
      
      const currentPath = window.location.pathname;
      if (currentPath !== '/login' && currentPath !== '/register') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
