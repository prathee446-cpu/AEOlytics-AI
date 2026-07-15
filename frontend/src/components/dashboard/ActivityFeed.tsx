import React from 'react';
import { Card } from '../ui/Widgets';
import { Sparkles, FileText, CheckCircle, Calendar } from 'lucide-react';
import { Article } from '../../store/slices/articleSlice';

interface ActivityFeedProps {
  articles: Article[];
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ articles }) => {
  // Extract activities
  const activities = articles.flatMap((art) => {
    const list = [];
    
    // Created event
    list.push({
      id: `${art.id}-created`,
      title: 'Content Asset Draft Created',
      desc: `"${art.title}" was created in category ${art.category}.`,
      date: new Date(art.createdAt),
      icon: FileText,
      color: 'text-sky-400 bg-sky-500/10',
    });

    // Published event
    if (art.status === 'PUBLISHED') {
      list.push({
        id: `${art.id}-published`,
        title: 'Content Search-Indexed',
        desc: `"${art.title}" was published. AI readiness index: ${art.aiScore}%.`,
        date: new Date(art.updatedAt),
        icon: CheckCircle,
        color: 'text-emerald-400 bg-emerald-500/10',
      });
    }

    // AI Audited event
    if (art.aiScore > 0) {
      list.push({
        id: `${art.id}-audited`,
        title: 'AI Readiness Audited',
        desc: `AI crawlers evaluated "${art.title}" visibility probability: ${art.visibilityScore}%.`,
        date: new Date(art.updatedAt),
        icon: Sparkles,
        color: 'text-violet-400 bg-violet-500/10',
      });
    }

    return list;
  });

  // Sort by date descending
  const sortedActivities = activities
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 5); // Take top 5

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <Card className="flex flex-col gap-5">
      <div>
        <h3 className="text-sm font-semibold text-white font-display">Recent Activity Log</h3>
        <p className="text-xs text-muted">Audit and indexing triggers across the application</p>
      </div>

      {sortedActivities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Calendar className="w-8 h-8 text-neutral-800 mb-2" />
          <p className="text-xs text-neutral-600 font-medium">No recent actions recorded</p>
          <p className="text-[10px] text-neutral-700">Activities sync as you author documents</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 relative pl-3 border-l border-border/80">
          {sortedActivities.map((act) => {
            const Icon = act.icon;
            return (
              <div key={act.id} className="relative flex gap-4 items-start group">
                {/* Dot Anchor */}
                <div className="absolute -left-[19.5px] top-1.5 w-[13px] h-[13px] rounded-full border-[2.5px] border-background bg-neutral-800 group-hover:bg-accent transition-colors duration-300" />
                
                {/* Activity Icon Box */}
                <div className={`p-2 rounded-lg shrink-0 ${act.color}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2 mb-0.5">
                    <h4 className="text-xs font-semibold text-white truncate font-display">{act.title}</h4>
                    <span className="text-[10px] text-muted shrink-0">{formatRelativeTime(act.date)}</span>
                  </div>
                  <p className="text-[11px] text-muted leading-relaxed line-clamp-2">{act.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};
