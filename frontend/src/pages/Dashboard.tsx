import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Navbar } from '../components/layout/Navbar';
import { MetricsGrid } from '../components/dashboard/MetricsGrid';
import { AnalyticsCharts } from '../components/dashboard/AnalyticsCharts';
import { ActivityFeed } from '../components/dashboard/ActivityFeed';
import { RootState } from '../store';
import { setArticles, setArticlesLoading, setArticlesError, Article } from '../store/slices/articleSlice';
import api from '../services/api';

// Realistic Mock Articles for Demo Mode
export const mockArticles: Article[] = [
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
    status: 'PUBLISHED',
    category: 'AEO Insights',
    tags: ['AEO', 'SEO', 'Artificial Intelligence', 'Search Indexing'],
    aiScore: 92,
    visibilityScore: 88,
    confidenceScore: 0.95,
    suggestions: [
      { type: 'Formatting', message: 'Incorporate schema structured JSON-LD implicitly.', severity: 'low' }
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
    createdAt: new Date(Date.now() - 3600000 * 24 * 3).toISOString(), // 3 days ago
    updatedAt: new Date(Date.now() - 3600000 * 12).toISOString(),     // 12 hours ago
  },
  {
    id: 'art-2',
    title: 'Restructuring Legacy Web Layouts for Language Model Audits',
    content: `# Restructuring Legacy Web Layouts for Language Model Audits

Crawlers built by AI providers read pages differently than traditional bots. Let's explore how to design modern web layout flows to optimize index weight.

## Paragraph Length
LLM models index text blocks. Keeping sentence sequences under 15 words and paragraphs under 4 lines aids parsing speeds and scores.`,
    status: 'DRAFT',
    category: 'Marketing',
    tags: ['Web Layouts', 'Auditing', 'Copywriting'],
    aiScore: 68,
    visibilityScore: 40,
    confidenceScore: 0.65,
    suggestions: [
      { type: 'Heading Structure', message: 'Add at least one H2 markdown header.', severity: 'high' },
      { type: 'Readability', message: 'Paragraphs are too dense. Shorten sentences to under 18 words.', severity: 'medium' }
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
    createdAt: new Date(Date.now() - 3600000 * 24 * 7).toISOString(), // 7 days ago
    updatedAt: new Date(Date.now() - 3600000 * 24 * 7).toISOString(),
  },
  {
    id: 'art-3',
    title: 'A Technical Introduction to Vector Similarity Search',
    content: `# A Technical Introduction to Vector Similarity Search

Vector search is the technology powering conversational retrieval systems (RAG). By converting sentences into float lists (embeddings), we map concepts mathematically.

## Mathematical Cosine Similarity
Calculating the cosine of the angle between two multi-dimensional vectors reveals semantic relevance. This enables search engines to query concepts, not just words.`,
    status: 'PUBLISHED',
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
    createdAt: new Date(Date.now() - 3600000 * 24 * 1).toISOString(), // 1 day ago
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),      // 2 hours ago
  }
];

export const Dashboard: React.FC = () => {
  const dispatch = useDispatch();
  const { articles, loading } = useSelector((state: RootState) => state.articles);
  const { user } = useSelector((state: RootState) => state.auth);
  useEffect(() => {
    const fetchArticles = async () => {
      dispatch(setArticlesLoading(true));
      try {
        const res = await api.get('/api/articles');
        dispatch(setArticles(res.data));
        dispatch(setArticlesLoading(false));
      } catch (err: any) {
        dispatch(setArticlesLoading(false));
        // Fall back to Mock Articles if database or network fails (ensures Demo Mode works immediately)
        console.warn('Backend API connection failed, loading simulated dashboard data.', err);
        if (articles.length === 0) {
          dispatch(setArticles(mockArticles));
        }
      }
    };

    fetchArticles();
  }, [dispatch]);

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-neutral-950/20 overflow-y-auto">
      <Navbar title="Dashboard Console" />
      
      <main className="flex-1 p-8 flex flex-col gap-8 max-w-7xl w-full mx-auto">
        {/* Welcome Section */}
        <div className="flex items-center justify-between shrink-0 select-none">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white font-display">
              Welcome back, {user?.name || 'User'}
            </h1>
            <p className="text-xs text-muted mt-1">Here is the performance audit log of your library assets.</p>
          </div>
        </div>

        {/* Metrics Overview Grid */}
        <MetricsGrid articles={articles} loading={loading} />

        {/* Analytics Graphs */}
        <AnalyticsCharts articles={articles} />

        {/* Activity timelines */}
        <div className="grid grid-cols-1 gap-6">
          <ActivityFeed articles={articles} />
        </div>
      </main>
    </div>
  );
};
