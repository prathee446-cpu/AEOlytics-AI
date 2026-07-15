import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type ImportStatus =
  | 'idle'
  | 'validating'
  | 'crawling'
  | 'extracting'
  | 'generating'
  | 'auditing'
  | 'saving'
  | 'done'
  | 'error';

export interface AuditScores {
  chatgpt: number;
  googleAI: number;
  gemini: number;
  perplexity: number;
  claude: number;
  copilot: number;
  overall: number;
}

export interface OptimizerIssue {
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  recommendation: string;
  whyItMatters: string;
  aiInterpretation: string;
}

export interface OptimizerPanel {
  panelId: string;
  label: string;
  score: number;
  issues: OptimizerIssue[];
  summary: string;
}

export interface CrawlMetadata {
  url: string;
  domain: string;
  title: string;
  metaDescription: string;
  author: string | null;
  publishDate: string | null;
  language: string;
  wordCount: number;
  readingTime: number;
  h1: string[];
  h2: string[];
  h3: string[];
  internalLinks: number;
  externalLinks: number;
  images: number;
  entities: string[];
  topics: string[];
  primaryIntent: string;
  jsonLDTypes: string[];
}

interface ImportState {
  status: ImportStatus;
  progress: string;
  error: string | null;

  // URL validation
  validatedUrl: string | null;
  validationDetails: {
    https: boolean;
    statusCode: number;
    redirected: boolean;
    robotsAllowed: boolean;
    canonicalUrl: string | null;
    domain: string;
  } | null;

  // Selected engines
  selectedDomains: string[];

  // Crawl result metadata
  crawlMetadata: CrawlMetadata | null;

  // Generated content
  markdown: string | null;

  // Audit results
  auditScores: AuditScores | null;
  optimizerPanels: OptimizerPanel[];
}

const initialState: ImportState = {
  status: 'idle',
  progress: '',
  error: null,
  validatedUrl: null,
  validationDetails: null,
  selectedDomains: ['chatgpt', 'googleAI', 'gemini', 'perplexity', 'claude', 'copilot'],
  crawlMetadata: null,
  markdown: null,
  auditScores: null,
  optimizerPanels: [],
};

export const importSlice = createSlice({
  name: 'import',
  initialState,
  reducers: {
    setImportStatus: (state, action: PayloadAction<ImportStatus>) => {
      state.status = action.payload;
    },
    setImportProgress: (state, action: PayloadAction<string>) => {
      state.progress = action.payload;
    },
    setImportError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.status = 'error';
    },
    setValidatedUrl: (state, action: PayloadAction<{
      url: string;
      details: NonNullable<ImportState['validationDetails']>;
    }>) => {
      state.validatedUrl = action.payload.url;
      state.validationDetails = action.payload.details;
      state.error = null;
    },
    setSelectedDomains: (state, action: PayloadAction<string[]>) => {
      state.selectedDomains = action.payload;
    },
    toggleDomain: (state, action: PayloadAction<string>) => {
      const domain = action.payload;
      if (state.selectedDomains.includes(domain)) {
        state.selectedDomains = state.selectedDomains.filter(d => d !== domain);
      } else {
        state.selectedDomains.push(domain);
      }
    },
    setImportResult: (state, action: PayloadAction<{
      crawlMetadata: CrawlMetadata;
      markdown: string;
      auditScores: AuditScores;
      optimizerPanels: OptimizerPanel[];
    }>) => {
      state.crawlMetadata = action.payload.crawlMetadata;
      state.markdown = action.payload.markdown;
      state.auditScores = action.payload.auditScores;
      state.optimizerPanels = action.payload.optimizerPanels;
      state.status = 'done';
    },
    setReauditResult: (state, action: PayloadAction<{
      auditScores: AuditScores;
      optimizerPanels: OptimizerPanel[];
    }>) => {
      state.auditScores = action.payload.auditScores;
      state.optimizerPanels = action.payload.optimizerPanels;
    },
    resetImport: (state) => {
      state.status = 'idle';
      state.progress = '';
      state.error = null;
      state.validatedUrl = null;
      state.validationDetails = null;
      state.crawlMetadata = null;
      state.markdown = null;
      state.auditScores = null;
      state.optimizerPanels = [];
    },
  },
});

export const {
  setImportStatus,
  setImportProgress,
  setImportError,
  setValidatedUrl,
  setSelectedDomains,
  toggleDomain,
  setImportResult,
  setReauditResult,
  resetImport,
} = importSlice.actions;

export default importSlice.reducer;
