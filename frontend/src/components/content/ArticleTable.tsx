import React, { useState } from 'react';
import { Badge, Button, Card } from '../ui/Widgets';
import { 
  Edit3, 
  Trash2, 
  Search, 
  Archive, 
  ExternalLink,
  ChevronRight,
  Filter
} from 'lucide-react';
import { Article } from '../../store/slices/articleSlice';

interface ArticleTableProps {
  articles: Article[];
  onEdit: (article: Article) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED') => void;
  selectedIds: string[];
  onSelectToggle: (id: string) => void;
  onSelectAllToggle: (ids: string[]) => void;
}

export const ArticleTable: React.FC<ArticleTableProps> = ({
  articles,
  onEdit,
  onDelete,
  onStatusChange,
  selectedIds,
  onSelectToggle,
  onSelectAllToggle,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Categories list
  const categories = ['ALL', ...new Set(articles.map(a => a.category))];

  // Filtering logic
  const filteredArticles = articles.filter(art => {
    const matchesSearch = 
      art.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      art.content.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesStatus = statusFilter === 'ALL' || art.status === statusFilter;
    const matchesCategory = categoryFilter === 'ALL' || art.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const getStatusBadge = (status: Article['status']) => {
    switch (status) {
      case 'PUBLISHED': return <Badge variant="success">Published</Badge>;
      case 'DRAFT': return <Badge variant="warning">Draft</Badge>;
      case 'ARCHIVED': return <Badge variant="neutral">Archived</Badge>;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400 bg-emerald-500/10';
    if (score >= 60) return 'text-amber-400 bg-amber-500/10';
    return 'text-red-400 bg-red-500/10';
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Filtering Header */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-neutral-950/40 p-4 rounded-xl border border-border/40">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-600" />
          <input
            type="text"
            placeholder="Search articles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-neutral-900/60 text-sm rounded-lg pl-9 pr-4 py-2 border border-border outline-none transition placeholder:text-neutral-600 focus:border-accent/60"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-neutral-900 border border-border rounded-lg p-0.5">
            {(['ALL', 'DRAFT', 'PUBLISHED', 'ARCHIVED'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  statusFilter === status 
                    ? 'bg-neutral-800 text-white font-semibold shadow' 
                    : 'text-muted hover:text-white'
                }`}
              >
                {status.charAt(0) + status.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {/* Category Filter */}
          <div className="relative shrink-0">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-neutral-900 text-xs text-white rounded-lg border border-border pl-3 pr-8 py-2.5 outline-none cursor-pointer focus:border-accent/60"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'ALL' ? 'All Categories' : cat}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto rounded-xl border border-border/60 bg-neutral-950/20 backdrop-blur">
        {filteredArticles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Search className="w-10 h-10 text-neutral-800 mb-3" />
            <p className="text-sm font-semibold text-white">No articles found</p>
            <p className="text-xs text-muted mt-1">Try expanding your filters or write a new document</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/60 text-xs font-semibold text-muted uppercase tracking-wider bg-neutral-950/60 select-none">
                <th className="px-6 py-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={filteredArticles.length > 0 && filteredArticles.every(a => selectedIds.includes(a.id))}
                    onChange={() => {
                      const allFilteredIds = filteredArticles.map(a => a.id);
                      onSelectAllToggle(allFilteredIds);
                    }}
                    className="rounded bg-neutral-900 border-border text-indigo-500 focus:ring-indigo-500/50 w-4 h-4 cursor-pointer"
                  />
                </th>
                <th className="px-6 py-4">Title</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">AEO Score</th>
                <th className="px-6 py-4">Visibility</th>
                <th className="px-6 py-4">Last Updated</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filteredArticles.map((art) => (
                <tr 
                  key={art.id} 
                  className="hover:bg-neutral-900/10 transition-colors group cursor-pointer"
                  onClick={() => onEdit(art)}
                >
                  {/* Row Checkbox Selection */}
                  <td className="px-6 py-4.5 w-12 text-center" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(art.id)}
                      onChange={() => onSelectToggle(art.id)}
                      className="rounded bg-neutral-900 border-border text-indigo-500 focus:ring-indigo-500/50 w-4 h-4 cursor-pointer"
                    />
                  </td>
                  {/* Title & Category */}
                  <td className="px-6 py-4.5">
                    <div className="flex flex-col max-w-sm">
                      <span className="font-semibold text-sm text-white group-hover:text-accent transition-colors duration-200 truncate">{art.title}</span>
                      <span className="text-[10px] text-muted tracking-wide mt-0.5">{art.category}</span>
                    </div>
                  </td>
                  
                  {/* Status Badge */}
                  <td className="px-6 py-4.5">
                    {getStatusBadge(art.status)}
                  </td>
                  
                  {/* AI Score */}
                  <td className="px-6 py-4.5">
                    <div className="flex items-center gap-2.5">
                      <span className={`text-xs font-bold font-display px-2 py-0.5 rounded ${getScoreColor(art.aiScore)}`}>
                        {art.aiScore}%
                      </span>
                      <div className="w-16 h-1 bg-neutral-800 rounded-full overflow-hidden hidden sm:block">
                        <div 
                          className={`h-full ${
                            art.aiScore >= 80 ? 'bg-emerald-500' : art.aiScore >= 60 ? 'bg-amber-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${art.aiScore}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  
                  {/* Visibility Score */}
                  <td className="px-6 py-4.5">
                    <span className="text-xs font-bold text-neutral-300 font-display">
                      {art.status === 'PUBLISHED' ? `${art.visibilityScore}%` : '--'}
                    </span>
                  </td>
                  
                  {/* Updated At */}
                  <td className="px-6 py-4.5 text-xs text-muted">
                    {new Date(art.updatedAt).toLocaleDateString(undefined, { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}
                  </td>

                  {/* Actions Column */}
                  <td className="px-6 py-4.5 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2.5">
                      {/* Action buttons */}
                      <button
                        onClick={() => onEdit(art)}
                        title="Edit Article"
                        className="p-1.5 rounded hover:bg-neutral-800 text-muted hover:text-white transition-colors"
                      >
                        <Edit3 className="w-4.5 h-4.5" />
                      </button>

                      {art.status === 'DRAFT' ? (
                        <button
                          onClick={() => onStatusChange(art.id, 'PUBLISHED')}
                          title="Publish Article"
                          className="p-1.5 rounded hover:bg-emerald-500/5 text-muted hover:text-emerald-400 transition-colors"
                        >
                          <ChevronRight className="w-4.5 h-4.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => onStatusChange(art.id, 'DRAFT')}
                          title="Move to Drafts"
                          className="p-1.5 rounded hover:bg-neutral-800 text-muted hover:text-white transition-colors"
                        >
                          <Archive className="w-4.5 h-4.5" />
                        </button>
                      )}

                      <button
                        onClick={() => onDelete(art.id)}
                        title="Delete Article"
                        className="p-1.5 rounded hover:bg-red-500/5 text-muted hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4.5 h-4.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
