import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { ArticleTable } from '../components/content/ArticleTable';
import { Button } from '../components/ui/Widgets';
import { RootState } from '../store';
import { 
  setArticles, 
  setCurrentArticle, 
  deleteArticleFromList, 
  updateArticleInList,
  setArticlesLoading,
  addArticle
} from '../store/slices/articleSlice';
import api from '../services/api';
import { FilePlus, RefreshCw, FileDown } from 'lucide-react';
import { mockArticles } from './Dashboard';
import { useState } from 'react';

export const ContentLibrary: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { articles, loading } = useSelector((state: RootState) => state.articles);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectToggle = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllToggle = (filteredIds: string[]) => {
    const allSelected = filteredIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      setSelectedIds(prev => [...new Set([...prev, ...filteredIds])]);
    }
  };

  const handleGenerateReport = async () => {
    if (selectedIds.length === 0) return;
    setGeneratingReport(true);
    setError(null);
    try {
      const response = await api.post('/api/generate-report', { articleIds: selectedIds }, { responseType: 'blob' });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `AEO_Content_Report_${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      setGeneratingReport(false);
      setSelectedIds([]); // Clear selection after report is generated
    } catch (err: any) {
      console.error('Failed to generate AEO report:', err);
      setGeneratingReport(false);
      
      let displayError = 'Failed to generate AEO report. Please try again.';
      if (err.response && err.response.data) {
        try {
          const text = await err.response.data.text();
          const parsed = JSON.parse(text);
          displayError = parsed.error || displayError;
        } catch (_) {}
      } else if (err.message) {
        displayError = err.message;
      }
      setError(displayError);
    }
  };

  const fetchArticles = async () => {
    dispatch(setArticlesLoading(true));
    try {
      const res = await api.get('/api/articles');
      dispatch(setArticles(res.data));
      dispatch(setArticlesLoading(false));
    } catch (err: any) {
      dispatch(setArticlesLoading(false));
      console.warn('API error, keeping local mock state.', err);
      if (articles.length === 0) {
        dispatch(setArticles(mockArticles));
      }
    }
  };

  useEffect(() => {
    fetchArticles();
  }, [dispatch]);

  const handleEdit = (article: any) => {
    dispatch(setCurrentArticle(article));
    navigate('/workspace');
  };

  const handleCreateNew = () => {
    dispatch(setCurrentArticle(null)); // Clear editor
    navigate('/workspace');
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this article?')) return;
    try {
      await api.delete(`/api/articles/${id}`);
      dispatch(deleteArticleFromList(id));
    } catch (err) {
      console.warn('Failed to delete on server. Falling back to local state removal.', err);
      dispatch(deleteArticleFromList(id)); // Local fallback
    }
  };

  const handleStatusChange = async (id: string, status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED') => {
    const article = articles.find(a => a.id === id);
    if (!article) return;

    try {
      const res = await api.put(`/api/articles/${id}`, { ...article, status });
      dispatch(updateArticleInList(res.data));
    } catch (err) {
      console.warn('Failed to update status on server. Applying local fallback changes.', err);
      // Local fallback
      dispatch(updateArticleInList({
        ...article,
        status,
        updatedAt: new Date().toISOString()
      }));
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-neutral-950/20 overflow-y-auto">
      <Navbar title="Content Studio" />
      
      <main className="flex-1 p-8 flex flex-col gap-6 max-w-7xl w-full mx-auto">
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 font-medium flex justify-between items-center relative shrink-0">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300 font-bold ml-2 text-base leading-none">×</button>
          </div>
        )}

        {/* Action Header */}
        <div className="flex items-center justify-between shrink-0 select-none">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white font-display">Document Library</h1>
            <p className="text-xs text-muted mt-0.5">Index, review, and author content optimized for Answer Engine algorithms.</p>
          </div>
          <div className="flex items-center gap-3">
            {selectedIds.length > 0 && (
              <Button
                variant="secondary"
                onClick={handleGenerateReport}
                loading={generatingReport}
                className="text-xs h-9 px-3 border border-indigo-500/30 text-indigo-400 hover:text-white hover:bg-indigo-500/10 font-display transition duration-200"
              >
                <FileDown className="w-4 h-4 mr-1.5" />
                <span>Generate Report ({selectedIds.length})</span>
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={fetchArticles}
              className="text-xs h-9 px-3"
              title="Sync Library"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateNew}
              className="text-xs h-9 px-3 font-display"
            >
              <FilePlus className="w-4 h-4 mr-1.5" />
              <span>New Content</span>
            </Button>
          </div>
        </div>

        {/* Content Table */}
        <ArticleTable
          articles={articles}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onStatusChange={handleStatusChange}
          selectedIds={selectedIds}
          onSelectToggle={handleSelectToggle}
          onSelectAllToggle={handleSelectAllToggle}
        />
      </main>
    </div>
  );
};
