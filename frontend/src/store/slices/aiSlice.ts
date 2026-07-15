import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
}

export interface SearchResult {
  id: string;
  title: string;
  content: string;
  aiScore: number;
  visibilityScore: number;
  category: string;
}

interface AIState {
  searchQuery: string;
  searchAnswer: string | null;
  searchResults: SearchResult[];
  searchLoading: boolean;
  searchError: string | null;

  chatHistory: ChatMessage[];
  chatSessions: Array<{ id: string; title: string; articleId?: string | null }>;
  activeSessionId: string | null;
  chatLoading: boolean;
  chatError: string | null;

  optimizing: boolean;
  optimizedDraft: string | null;
  optimizationError: string | null;
}

const initialState: AIState = {
  searchQuery: '',
  searchAnswer: null,
  searchResults: [],
  searchLoading: false,
  searchError: null,

  chatHistory: [],
  chatSessions: [],
  activeSessionId: null,
  chatLoading: false,
  chatError: null,

  optimizing: false,
  optimizedDraft: null,
  optimizationError: null,
};

export const aiSlice = createSlice({
  name: 'ai',
  initialState,
  reducers: {
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    setSearchResults: (state, action: PayloadAction<{ answer: string; results: SearchResult[] }>) => {
      state.searchAnswer = action.payload.answer;
      state.searchResults = action.payload.results;
      state.searchLoading = false;
      state.searchError = null;
    },
    setSearchLoading: (state, action: PayloadAction<boolean>) => {
      state.searchLoading = action.payload;
    },
    setSearchError: (state, action: PayloadAction<string | null>) => {
      state.searchError = action.payload;
      state.searchLoading = false;
    },
    clearSearch: (state) => {
      state.searchQuery = '';
      state.searchAnswer = null;
      state.searchResults = [];
    },

    setChatSessions: (state, action: PayloadAction<Array<{ id: string; title: string; articleId?: string | null }>>) => {
      state.chatSessions = action.payload;
    },
    setChatHistory: (state, action: PayloadAction<ChatMessage[]>) => {
      state.chatHistory = action.payload;
      state.chatLoading = false;
    },
    addChatMessage: (state, action: PayloadAction<ChatMessage>) => {
      state.chatHistory.push(action.payload);
    },
    setActiveSessionId: (state, action: PayloadAction<string | null>) => {
      state.activeSessionId = action.payload;
      if (action.payload === null) {
        state.chatHistory = [];
      }
    },
    setChatLoading: (state, action: PayloadAction<boolean>) => {
      state.chatLoading = action.payload;
    },
    setChatError: (state, action: PayloadAction<string | null>) => {
      state.chatError = action.payload;
      state.chatLoading = false;
    },

    setOptimizing: (state, action: PayloadAction<boolean>) => {
      state.optimizing = action.payload;
    },
    setOptimizedDraft: (state, action: PayloadAction<string | null>) => {
      state.optimizedDraft = action.payload;
      state.optimizing = false;
      state.optimizationError = null;
    },
    setOptimizationError: (state, action: PayloadAction<string | null>) => {
      state.optimizationError = action.payload;
      state.optimizing = false;
    },
  },
});

export const {
  setSearchQuery,
  setSearchResults,
  setSearchLoading,
  setSearchError,
  clearSearch,
  setChatSessions,
  setChatHistory,
  addChatMessage,
  setActiveSessionId,
  setChatLoading,
  setChatError,
  setOptimizing,
  setOptimizedDraft,
  setOptimizationError,
} = aiSlice.actions;

export default aiSlice.reducer;
