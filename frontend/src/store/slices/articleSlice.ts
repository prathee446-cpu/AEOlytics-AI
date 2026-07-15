import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Article {
  id: string;
  title: string;
  content: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  category: string;
  tags: string[];
  aiScore: number;
  visibilityScore: number;
  confidenceScore: number;
  suggestions: Array<{ type: string; message: string; severity: 'low' | 'medium' | 'high' }>;
  gapAnalysis: { missingKeywords: string[]; missingTopics: string[]; missingSections: string[] };
  recommendations: string[];
  userId: string;
  createdAt: string;
  updatedAt: string;

  // URL Import & AEO Audit fields (optional)
  sourceUrl?: string | null;
  sourceDomain?: string | null;
  importedAt?: string | null;
  author?: string | null;
  publishDate?: string | null;
  language?: string | null;
  wordCount?: number | null;
  readingTime?: number | null;
  metaDescription?: string | null;
  canonicalUrl?: string | null;
  primaryIntent?: string | null;
  ogTags?: Record<string, string>;
  schemas?: any[];
  entities?: string[];
  auditScores?: {
    chatgpt: number;
    googleAI: number;
    gemini: number;
    perplexity: number;
    claude: number;
    copilot: number;
    overall: number;
  } | null;
  optimizerData?: {
    panels: Array<{
      panelId: string;
      label: string;
      score: number;
      summary: string;
      issues: Array<{
        severity: 'critical' | 'high' | 'medium' | 'low';
        title: string;
        description: string;
        recommendation: string;
        whyItMatters: string;
        aiInterpretation: string;
      }>;
    }>;
    selectedDomains?: string[];
    auditedAt?: string;
  } | null;
}

interface ArticleState {
  articles: Article[];
  currentArticle: Article | null;
  loading: boolean;
  error: string | null;
  isSaving: boolean;
}

const initialState: ArticleState = {
  articles: [],
  currentArticle: null,
  loading: false,
  error: null,
  isSaving: false,
};

export const articleSlice = createSlice({
  name: 'articles',
  initialState,
  reducers: {
    setArticles: (state, action: PayloadAction<Article[]>) => {
      state.articles = action.payload;
    },
    setCurrentArticle: (state, action: PayloadAction<Article | null>) => {
      state.currentArticle = action.payload;
    },
    addArticle: (state, action: PayloadAction<Article>) => {
      state.articles.unshift(action.payload);
    },
    updateArticleInList: (state, action: PayloadAction<Article>) => {
      const idx = state.articles.findIndex(a => a.id === action.payload.id);
      if (idx !== -1) {
        state.articles[idx] = action.payload;
      }
      if (state.currentArticle && state.currentArticle.id === action.payload.id) {
        state.currentArticle = action.payload;
      }
    },
    deleteArticleFromList: (state, action: PayloadAction<string>) => {
      state.articles = state.articles.filter(a => a.id !== action.payload);
      if (state.currentArticle && state.currentArticle.id === action.payload) {
        state.currentArticle = null;
      }
    },
    setArticlesLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setArticlesError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setSaving: (state, action: PayloadAction<boolean>) => {
      state.isSaving = action.payload;
    },
  },
});

export const {
  setArticles,
  setCurrentArticle,
  addArticle,
  updateArticleInList,
  deleteArticleFromList,
  setArticlesLoading,
  setArticlesError,
  setSaving,
} = articleSlice.actions;

export default articleSlice.reducer;
