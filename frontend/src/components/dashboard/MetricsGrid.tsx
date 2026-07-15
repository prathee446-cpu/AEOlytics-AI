import React from 'react';
import { Card } from '../ui/Widgets';
import { 
  Sparkles, 
  Eye, 
  FileText, 
  CheckCircle,
  TrendingUp
} from 'lucide-react';
import { Article } from '../../store/slices/articleSlice';

interface MetricsGridProps {
  articles: Article[];
  loading: boolean;
}

export const MetricsGrid: React.FC<MetricsGridProps> = ({ articles, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse flex flex-col gap-3">
            <div className="h-4 bg-neutral-800 w-1/3 rounded" />
            <div className="h-8 bg-neutral-800 w-1/2 rounded" />
            <div className="h-3 bg-neutral-800 w-2/3 rounded" />
          </Card>
        ))}
      </div>
    );
  }

  const total = articles.length;
  const published = articles.filter(a => a.status === 'PUBLISHED').length;
  const drafts = articles.filter(a => a.status === 'DRAFT').length;

  const publishedArticles = articles.filter(a => a.status === 'PUBLISHED');
  const avgAiScore = publishedArticles.length > 0 
    ? Math.round(publishedArticles.reduce((acc, a) => acc + a.aiScore, 0) / publishedArticles.length)
    : 0;

  const cards = [
    {
      title: 'AEO Readiness Score',
      value: `${avgAiScore}%`,
      subtitle: `${published} articles analyzed`,
      icon: Sparkles,
      color: 'text-violet-400',
      bgColor: 'bg-violet-500/10',
      glow: 'violet' as const,
      desc: 'Overall content formatting score'
    },
    {
      title: 'Total Articles',
      value: total,
      subtitle: `${drafts} drafts, ${published} published`,
      icon: FileText,
      color: 'text-sky-400',
      bgColor: 'bg-sky-500/10',
      glow: 'none' as const,
      desc: 'Content asset repository size'
    },
    {
      title: 'Publish Success Ratio',
      value: total > 0 ? `${Math.round((published / total) * 100)}%` : '0%',
      subtitle: `${published} of ${total} assets active`,
      icon: CheckCircle,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      glow: 'success' as const,
      desc: 'Ratio of live indexing assets'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <Card key={idx} glow={card.glow} hoverable className="flex flex-col gap-4 relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted tracking-wider uppercase font-display">{card.title}</span>
              <div className={`p-2 rounded-lg ${card.bgColor} ${card.color}`}>
                <Icon className="w-4.5 h-4.5" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-bold tracking-tight text-white font-display mb-1 flex items-baseline gap-1.5">
                {card.value}
                {card.title.includes('Score') || card.title.includes('Index') ? (
                  <TrendingUp className="w-4 h-4 text-emerald-400 inline" />
                ) : null}
              </div>
              <p className="text-xs text-muted flex items-center gap-1">
                <span>{card.subtitle}</span>
              </p>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-border/50 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
          </Card>
        );
      })}
    </div>
  );
};
