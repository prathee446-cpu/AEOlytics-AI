import React, { useState } from 'react';
import { Search, CornerDownLeft, Sparkles } from 'lucide-react';
import { Button } from '../ui/Widgets';

interface AISearchInputProps {
  onSearch: (query: string) => void;
  loading: boolean;
}

export const AISearchInput: React.FC<AISearchInputProps> = ({ onSearch, loading }) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading) return;
    onSearch(query.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form 
      onSubmit={handleSubmit}
      className="w-full max-w-2xl mx-auto glass rounded-2xl border border-border/80 p-3 shadow-2xl focus-within:border-accent/40 focus-within:ring-1 focus-within:ring-accent/20 transition-all duration-300"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 shrink-0 mt-1">
          <Search className="w-4 h-4 text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask your library anything... (e.g., 'What is AEO and how do I improve readability?')"
            rows={2}
            className="w-full bg-transparent text-sm text-white placeholder:text-neutral-600 outline-none resize-none pt-2.5"
          />
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/20 text-xs text-muted">
            <span className="flex items-center gap-1 font-display">
              <Sparkles className="w-3 h-3 text-indigo-400" />
              <span>Embedding Vector Search Enabled</span>
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-neutral-600 hidden sm:inline select-none">Press Enter to Search</span>
              <Button
                type="submit"
                loading={loading}
                disabled={!query.trim()}
                className="h-8 px-3 text-xs"
              >
                <span>Ask AI</span>
                <CornerDownLeft className="w-3 h-3 ml-1.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};
