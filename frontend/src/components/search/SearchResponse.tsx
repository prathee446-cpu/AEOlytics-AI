import React from 'react';
import { Card, Badge } from '../ui/Widgets';
import { FileText, ArrowRight, BookOpen, Quote } from 'lucide-react';
import { SearchResult } from '../../store/slices/aiSlice';

interface SearchResponseProps {
  answer: string | null;
  results: SearchResult[];
  onViewArticle: (id: string) => void;
}

export const SearchResponse: React.FC<SearchResponseProps> = ({
  answer,
  results,
  onViewArticle,
}) => {
  if (!answer) return null;

  // Simple formatter to convert inline citation markers like [Source 1], [Source 2] or [1], [2] to clickable superscripts
  const formatAnswerText = (text: string) => {
    // Regex for [Source X] or [X]
    const regex = /\[Source\s+(\d+)\]|\[(\d+)\]/g;
    
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      const matchIndex = match.index;
      // Add text leading up to match
      if (matchIndex > lastIndex) {
        parts.push(text.substring(lastIndex, matchIndex));
      }

      const sourceNum = match[1] || match[2];
      const sourceIdx = parseInt(sourceNum, 10) - 1;

      if (sourceIdx >= 0 && sourceIdx < results.length) {
        const article = results[sourceIdx];
        parts.push(
          <button
            key={matchIndex}
            onClick={() => onViewArticle(article.id)}
            className="inline-flex items-center justify-center w-4.5 h-4.5 rounded-full bg-accent/10 border border-accent/25 hover:bg-accent hover:text-white transition-all text-[9px] font-bold text-accent mx-0.5"
            title={`View: ${article.title}`}
          >
            {sourceNum}
          </button>
        );
      } else {
        parts.push(match[0]); // fallback to raw string if source doesn't exist
      }
      
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  return (
    <div className="w-full max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 items-start mt-8">
      {/* AI Answer Column */}
      <div className="lg:col-span-2 flex flex-col gap-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-accent tracking-wider uppercase font-display select-none">
          <BookOpen className="w-4 h-4" />
          <span>Synthesis Report</span>
        </div>
        <Card className="p-6 flex flex-col gap-4 leading-relaxed text-sm text-neutral-300">
          <div className="prose prose-invert max-w-none text-[13px] leading-relaxed whitespace-pre-wrap">
            {formatAnswerText(answer)}
          </div>
        </Card>
      </div>

      {/* Sources Column */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted tracking-wider uppercase font-display select-none">
          <Quote className="w-4 h-4" />
          <span>Indexed Sources ({results.length})</span>
        </div>
        <div className="flex flex-col gap-3">
          {results.map((res, index) => (
            <Card
              key={res.id}
              hoverable
              onClick={() => onViewArticle(res.id)}
              className="p-3.5 flex flex-col gap-2 bg-neutral-950/40 relative overflow-hidden group border border-border/40"
            >
              <div className="flex items-center justify-between shrink-0">
                <span className="text-[10px] font-bold text-accent px-1.5 py-0.5 rounded bg-accent/5 border border-accent/15 select-none font-display">
                  [{index + 1}] Source
                </span>
                <span className="text-[9px] text-muted">{res.category}</span>
              </div>
              <h4 className="text-xs font-bold text-white group-hover:text-accent transition truncate font-display">
                {res.title}
              </h4>
              <div className="flex items-center gap-3 shrink-0 mt-1">
                <span className="text-[10px] text-muted flex items-center gap-1 font-display">
                  Readiness: <strong className="text-white">{res.aiScore}%</strong>
                </span>
                <span className="text-[10px] text-muted flex items-center gap-1 font-display">
                  Visibility: <strong className="text-white">{res.visibilityScore}%</strong>
                </span>
              </div>
              <div className="absolute right-3 bottom-3 text-neutral-800 group-hover:text-white transition-colors duration-300">
                <ArrowRight className="w-4 h-4" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
