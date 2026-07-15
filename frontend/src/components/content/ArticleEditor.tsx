import React, { useEffect, useState, useRef } from 'react';
import { Button, Input, Select, Badge } from '../ui/Widgets';
import { Save, Globe, Eye, ArrowLeft, Loader2 } from 'lucide-react';
import { Article } from '../../store/slices/articleSlice';
import { UrlImporter } from './UrlImporter';
import { DomainSelector } from './DomainSelector';

interface ArticleEditorProps {
  article: Partial<Article> | null;
  onSave: (data: { title: string; content: string; category: string; tags: string[]; status: Article['status'] }) => Promise<void>;
  onBack: () => void;
  isSaving: boolean;
  autosaveStatus: 'idle' | 'saving' | 'saved' | 'failed';
  onAutosave: (data: { title: string; content: string; category: string; tags: string[] }) => void;
  onChange?: (title: string, content: string, category: string, tags: string[]) => void;
  // Import props
  onImportUrl?: (url: string, domains: string[]) => Promise<void>;
  importStatus?: string;
  importProgress?: string;
  importError?: string | null;
  selectedDomains?: string[];
  onToggleDomain?: (id: string) => void;
}

export const ArticleEditor: React.FC<ArticleEditorProps> = ({
  article,
  onSave,
  onBack,
  isSaving,
  autosaveStatus,
  onAutosave,
  onChange,
  onImportUrl,
  importStatus = 'idle',
  importProgress = '',
  importError = null,
  selectedDomains = ['chatgpt', 'googleAI', 'gemini', 'perplexity', 'claude', 'copilot'],
  onToggleDomain,
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('Marketing');
  const [tagsString, setTagsString] = useState('');
  const [status, setStatus] = useState<Article['status']>('DRAFT');
  const [hasModified, setHasModified] = useState(false);

  const prevArticleIdRef = useRef<string | undefined>(undefined);
  const lastSentTitleRef = useRef(article?.title || '');
  const lastSentContentRef = useRef(article?.content || '');
  const lastSentCategoryRef = useRef(article?.category || 'Marketing');
  const lastSentTagsRef = useRef<string[]>(article?.tags || []);

  useEffect(() => {
    if (!article) {
      setTitle('');
      setContent('');
      setCategory('Marketing');
      setTagsString('');
      setStatus('DRAFT');
      setHasModified(false);
      lastSentTitleRef.current = '';
      lastSentContentRef.current = '';
      lastSentCategoryRef.current = 'Marketing';
      lastSentTagsRef.current = [];
      prevArticleIdRef.current = undefined;
      return;
    }

    // 1. If switching to a completely different article, reset everything
    const isDifferentArticle = article.id !== prevArticleIdRef.current;
    if (isDifferentArticle) {
      setTitle(article.title || '');
      setContent(article.content || '');
      setCategory(article.category || 'Marketing');
      setTagsString(article.tags ? article.tags.join(', ') : '');
      setStatus(article.status || 'DRAFT');
      setHasModified(false);
      prevArticleIdRef.current = article.id;
      lastSentTitleRef.current = article.title || '';
      lastSentContentRef.current = article.content || '';
      lastSentCategoryRef.current = article.category || 'Marketing';
      lastSentTagsRef.current = article.tags || [];
      return;
    }

    // 2. Same article: check for external updates (e.g. optimizer apply, database import updates)
    if (article.title !== lastSentTitleRef.current && article.title !== title) {
      setTitle(article.title || '');
      lastSentTitleRef.current = article.title || '';
    }
    if (article.content !== lastSentContentRef.current && article.content !== content) {
      setContent(article.content || '');
      lastSentContentRef.current = article.content || '';
    }
    if (article.category !== lastSentCategoryRef.current && article.category !== category) {
      setCategory(article.category || 'Marketing');
      lastSentCategoryRef.current = article.category || 'Marketing';
    }
    const tagsJoined = article.tags ? article.tags.join(', ') : '';
    const lastTagsJoined = lastSentTagsRef.current.join(', ');
    if (tagsJoined !== lastTagsJoined && tagsJoined !== tagsString) {
      setTagsString(tagsJoined);
      lastSentTagsRef.current = article.tags || [];
    }
    if (article.status !== status) {
      setStatus(article.status || 'DRAFT');
    }
  }, [article]);

  // Debounced draft autosave
  useEffect(() => {
    if (!hasModified || !title.trim()) return;
    const delayDebounceFn = setTimeout(() => {
      const parsedTags = tagsString.split(',').map(t => t.trim()).filter(t => t.length > 0);
      
      // Update refs to match what we are about to save so the backend response doesn't trigger resets
      lastSentTitleRef.current = title;
      lastSentContentRef.current = content;
      lastSentCategoryRef.current = category;
      lastSentTagsRef.current = parsedTags;

      onAutosave({ title, content, category, tags: parsedTags });
      setHasModified(false);
    }, 1200); // 1200ms debounce
    return () => clearTimeout(delayDebounceFn);
  }, [title, content, category, tagsString, hasModified]);

  // Synchronize changes with the parent refs in real-time
  useEffect(() => {
    if (onChange) {
      const parsedTags = tagsString.split(',').map(t => t.trim()).filter(t => t.length > 0);
      onChange(title, content, category, parsedTags);
    }
  }, [title, content, category, tagsString, onChange]);

  const handleSaveClick = async (e: React.FormEvent, finalStatus?: Article['status']) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    const parsedTags = tagsString.split(',').map(t => t.trim()).filter(t => t.length > 0);

    // Update refs to match what we are saving
    lastSentTitleRef.current = title;
    lastSentContentRef.current = content;
    lastSentCategoryRef.current = category;
    lastSentTagsRef.current = parsedTags;
    setHasModified(false);

    await onSave({ title, content, category, tags: parsedTags, status: finalStatus || status });
  };

  const handleImportComplete = (result: any) => {
    // The parent (Workspace) handles the actual API call via onImportUrl
    // When called from UrlImporter, we just trigger the import
    if (onImportUrl) {
      // Extract URL from state — UrlImporter has its own URL state
      // The onImportUrl call is triggered by Workspace through a URL state reference
    }
  };

  const categories = [
    { value: 'Marketing',         label: 'Marketing' },
    { value: 'Productivity',      label: 'Productivity' },
    { value: 'Tech & Engineering',label: 'Tech & Engineering' },
    { value: 'Guides & Tutorials',label: 'Guides & Tutorials' },
    { value: 'AEO Insights',      label: 'AEO Insights' },
  ];

  const isImporting = ['validating', 'crawling', 'extracting', 'generating', 'auditing', 'saving'].includes(importStatus);

  return (
    <form onSubmit={e => handleSaveClick(e)} className="flex flex-col gap-5 h-full flex-1">
      {/* Editor Sub-Header */}
      <div className="flex items-center justify-between border-b border-border/40 pb-4 shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-muted hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Library</span>
        </button>

        <div className="flex items-center gap-3">
          {autosaveStatus === 'saving' || isSaving ? (
            <span className="text-xs text-muted flex items-center gap-1.5 font-display select-none">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" />
              <span>Saving draft...</span>
            </span>
          ) : autosaveStatus === 'saved' ? (
            <span className="text-xs text-emerald-400 flex items-center gap-1 font-semibold font-display select-none">
              <span>Saved ✓</span>
            </span>
          ) : autosaveStatus === 'failed' ? (
            <span className="text-xs text-red-400 flex items-center gap-1 font-semibold font-display select-none">
              <span>Save failed ✗</span>
            </span>
          ) : (
            <span className="text-[10px] text-muted tracking-wider uppercase font-semibold font-display select-none">Idle</span>
          )}

          <Button
            type="submit"
            variant="secondary"
            loading={isSaving && status === 'DRAFT'}
            size="sm"
            onClick={e => { setStatus('DRAFT'); handleSaveClick(e, 'DRAFT'); }}
            className="text-xs"
          >
            <Save className="w-3.5 h-3.5 mr-1.5" />
            <span>Save Draft</span>
          </Button>

          <Button
            type="button"
            variant="primary"
            loading={isSaving && status === 'PUBLISHED'}
            size="sm"
            onClick={e => { setStatus('PUBLISHED'); handleSaveClick(e, 'PUBLISHED'); }}
            className="text-xs"
          >
            <Globe className="w-3.5 h-3.5 mr-1.5" />
            <span>Publish Index</span>
          </Button>
        </div>
      </div>

      {/* Title + Category grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 shrink-0 bg-neutral-950/20 p-4 rounded-xl border border-border/40">
        <div className="md:col-span-2">
          <Input
            placeholder="Document Title"
            label="Title"
            value={title}
            onChange={e => { setTitle(e.target.value); setHasModified(true); }}
            required
            className="font-display font-semibold"
          />
        </div>
        <div className="flex gap-4">
          <div className="flex-1">
            <Select
              label="Category"
              value={category}
              onChange={e => { setCategory(e.target.value); setHasModified(true); }}
              options={categories}
            />
          </div>
        </div>
      </div>

      {/* ── URL IMPORTER SECTION (below Category dropdown) ── */}
      {onImportUrl && (
        <div className="shrink-0 flex flex-col gap-3">
          <UrlImporter
            onImport={(url) => onImportUrl(url, selectedDomains)}
            isImporting={isImporting}
            importStatus={importStatus}
            importProgress={importProgress}
            importError={importError}
          />

          {/* Domain Selector — shown after URL is entered but before import */}
          {importStatus === 'idle' && onToggleDomain && (
            <DomainSelector
              selectedDomains={selectedDomains}
              onToggle={onToggleDomain}
            />
          )}
        </div>
      )}

      {/* Tag Keywords Row */}
      <div className="shrink-0 bg-neutral-950/20 px-4 py-3.5 rounded-xl border border-border/40 flex flex-col gap-2">
        <Input
          label="Tag Keywords (Comma separated)"
          placeholder="AEO, Search Engine, Optimization..."
          value={tagsString}
          onChange={e => { setTagsString(e.target.value); setHasModified(true); }}
          className="text-xs"
        />
        {tagsString.trim() && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {tagsString.split(',').map((t, idx) => {
              const term = t.trim();
              if (!term) return null;
              return <Badge key={idx} variant="info">{term}</Badge>;
            })}
          </div>
        )}
      </div>

      {/* Markdown textarea */}
      <div className="flex-1 flex flex-col min-h-0 bg-neutral-950/10 border border-border/60 rounded-xl overflow-hidden shadow-inner focus-within:border-accent/40 transition">
        <div className="px-4 py-2 border-b border-border/40 bg-neutral-950/60 flex items-center justify-between text-xs text-muted shrink-0 select-none">
          <span className="font-display font-medium uppercase tracking-wider text-[10px]">Markdown Content Pane</span>
          <span>{content.split(/\s+/).filter(Boolean).length} words</span>
        </div>
        <textarea
          placeholder="Start typing your rich content draft in markdown style, or import a URL above to auto-populate..."
          value={content}
          onChange={e => { setContent(e.target.value); setHasModified(true); }}
          className="flex-1 w-full bg-transparent p-5 text-sm leading-relaxed text-white outline-none resize-none overflow-y-auto"
          required
        />
      </div>
    </form>
  );
};
