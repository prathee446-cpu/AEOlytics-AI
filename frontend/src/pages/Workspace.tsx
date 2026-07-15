import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { ArticleEditor } from '../components/content/ArticleEditor';
import { AISidebar } from '../components/content/AISidebar';
import { RootState } from '../store';
import {
  updateArticleInList,
  addArticle,
  setCurrentArticle,
  setSaving,
  Article
} from '../store/slices/articleSlice';
import {
  setOptimizing,
  setOptimizedDraft,
  setOptimizationError
} from '../store/slices/aiSlice';
import {
  setImportStatus,
  setImportProgress,
  setImportError,
  setImportResult,
  setReauditResult,
  resetImport,
  toggleDomain,
} from '../store/slices/importSlice';
import api from '../services/api';

export const Workspace: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { currentArticle, isSaving } = useSelector((state: RootState) => state.articles);
  const { optimizing, optimizedDraft } = useSelector((state: RootState) => state.ai);
  const importState = useSelector((state: RootState) => state.import);

  const [isAuditing, setIsAuditing] = useState(false);
  const [isReauditing, setIsReauditing] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle');

  // Refs for persistent form state tracking
  const editorTitleRef = useRef(currentArticle?.title || '');
  const editorContentRef = useRef(currentArticle?.content || '');
  const editorCategoryRef = useRef(currentArticle?.category || 'Marketing');
  const editorTagsRef = useRef<string[]>(currentArticle?.tags || []);
  const importUrlRef = useRef<string>('');

  const handleEditorChange = useCallback((title: string, content: string, category: string, tags: string[]) => {
    editorTitleRef.current = title;
    editorContentRef.current = content;
    editorCategoryRef.current = category;
    editorTagsRef.current = tags;
  }, []);

  // URL import handler — called by UrlImporter via Workspace
  const handleImportUrl = useCallback(async (url: string, domains: string[]) => {
    importUrlRef.current = url;

    dispatch(setImportStatus('validating'));
    dispatch(setImportProgress('Validating URL…'));

    try {
      const res = await api.post('/api/import/run', {
        url,
        domains,
        category: editorCategoryRef.current || 'Guides & Tutorials',
      });

      const { article, crawlResult, markdown, auditScores, optimizerPanels } = res.data;

      // Populate Redux with the full article (returned from backend, saved to DB)
      if (article && article.id) {
        const fullArticle: Article = {
          ...article,
          suggestions: article.suggestions || [],
          gapAnalysis: article.gapAnalysis || { missingKeywords: [], missingTopics: [], missingSections: [] },
          recommendations: article.recommendations || [],
          optimizerData: article.optimizerData || null,
          auditScores: article.auditScores || null,
        };
        
        // Sync our local refs to match the newly imported article
        editorTitleRef.current = fullArticle.title;
        editorContentRef.current = fullArticle.content;
        editorCategoryRef.current = fullArticle.category;
        editorTagsRef.current = fullArticle.tags;

        dispatch(addArticle(fullArticle));
        dispatch(setCurrentArticle(fullArticle));
      }

      // Save import result to Redux
      dispatch(setImportResult({
        crawlMetadata: crawlResult,
        markdown: markdown || '',
        auditScores,
        optimizerPanels,
      }));

    } catch (err: any) {
      const errorMsg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Import failed. Please try again.';
      dispatch(setImportError(errorMsg));
    }
  }, [dispatch]);

  // Handle optimized draft clearing
  useEffect(() => {
    dispatch(setOptimizedDraft(null));
  }, [currentArticle, dispatch]);

  // Autosave handler
  const handleAutosave = async (data: {
    title: string;
    content: string;
    category: string;
    tags: string[];
  }) => {
    setAutosaveStatus('saving');
    const isNew = !currentArticle || !currentArticle.id;
    try {
      const payload = {
        id: isNew ? undefined : currentArticle?.id,
        title: data.title,
        content: data.content,
        category: data.category,
        tags: data.tags,
      };

      const res = await api.patch('/api/articles/draft', payload);
      const saved = res.data.article;

      if (isNew) {
        dispatch(addArticle(saved));
      } else {
        dispatch(updateArticleInList(saved));
      }
      dispatch(setCurrentArticle(saved));
      setAutosaveStatus('saved');
      setTimeout(() => setAutosaveStatus('idle'), 3000);

      // Trigger real-time re-audit on content change (if article has import data)
      if (saved.id && saved.auditScores) {
        triggerReaudit(saved.id, data.title, data.content);
      }
    } catch (err) {
      console.warn('Autosave failed:', err);
      setAutosaveStatus('failed');
    }
  };

  // Real-time re-audit (debounced via autosave)
  const triggerReaudit = useCallback(async (articleId: string, title: string, content: string) => {
    if (!content || !title || isReauditing) return;
    setIsReauditing(true);
    try {
      const res = await api.post('/api/import/reaudit', { articleId, title, content });
      dispatch(setReauditResult({
        auditScores: res.data.auditScores,
        optimizerPanels: res.data.optimizerPanels,
      }));

      // Also update article in list with new scores
      if (currentArticle) {
        const updated: Article = {
          ...currentArticle,
          aiScore: res.data.auditScores.overall,
          auditScores: res.data.auditScores,
          optimizerData: currentArticle.optimizerData ? {
            ...currentArticle.optimizerData,
            panels: res.data.optimizerPanels,
            auditedAt: new Date().toISOString(),
          } : null,
        };
        dispatch(updateArticleInList(updated));
        dispatch(setCurrentArticle(updated));
      }
    } catch (err) {
      console.warn('Re-audit failed:', err);
    } finally {
      setIsReauditing(false);
    }
  }, [dispatch, currentArticle, isReauditing]);

  // Manual save handler
  const handleSave = async (formData: {
    title: string;
    content: string;
    category: string;
    tags: string[];
    status: Article['status']
  }) => {
    dispatch(setSaving(true));
    const isNew = !currentArticle || !currentArticle.id;

    try {
      let savedArticle: Article;

      if (isNew) {
        const res = await api.post('/api/articles', formData);
        savedArticle = res.data;
        dispatch(addArticle(savedArticle));
      } else {
        const res = await api.put(`/api/articles/${currentArticle.id}`, formData);
        savedArticle = res.data;
        dispatch(updateArticleInList(savedArticle));
      }

      dispatch(setCurrentArticle(savedArticle));
      dispatch(setSaving(false));
      await runAuditOnArticle(savedArticle);

    } catch (err: any) {
      console.warn('API error saving. Falling back to local state mock save.', err);
      const mockSaved: Article = {
        id: isNew ? `art-${Date.now()}` : currentArticle!.id,
        title: formData.title,
        content: formData.content,
        category: formData.category,
        tags: formData.tags,
        status: formData.status,
        aiScore: currentArticle?.aiScore || 0,
        visibilityScore: currentArticle?.visibilityScore || 0,
        confidenceScore: currentArticle?.confidenceScore || 0,
        suggestions: currentArticle?.suggestions || [],
        gapAnalysis: currentArticle?.gapAnalysis || { missingKeywords: [], missingTopics: [], missingSections: [] },
        recommendations: currentArticle?.recommendations || [],
        userId: 'demo-user-id',
        createdAt: currentArticle?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (isNew) dispatch(addArticle(mockSaved));
      else dispatch(updateArticleInList(mockSaved));
      dispatch(setCurrentArticle(mockSaved));
      dispatch(setSaving(false));
      await runAuditOnArticle(mockSaved);
    }
  };

  const runAuditOnArticle = async (article: Article) => {
    setIsAuditing(true);
    try {
      const res = await api.post('/api/ai/analyze', {
        title: article.title,
        content: article.content
      });

      const updated: Article = {
        ...article,
        aiScore: res.data.aiScore,
        suggestions: res.data.suggestions,
        gapAnalysis: res.data.gapAnalysis,
        recommendations: res.data.recommendations,
        visibilityScore: res.data.visibilityScore || article.visibilityScore,
        confidenceScore: res.data.confidenceScore || article.confidenceScore,
        auditScores: res.data.auditScores || article.auditScores,
        optimizerData: res.data.optimizerPanels ? {
          panels: res.data.optimizerPanels,
          selectedDomains: article.optimizerData?.selectedDomains || ['chatgpt', 'googleAI', 'gemini', 'perplexity', 'claude', 'copilot'],
          auditedAt: new Date().toISOString()
        } : article.optimizerData,
        updatedAt: new Date().toISOString()
      };

      if (article.status === 'PUBLISHED') {
        const visRes = await api.post('/api/ai/predict', {
          title: article.title,
          content: article.content
        });
        updated.visibilityScore = visRes.data.visibilityScore;
        updated.confidenceScore = visRes.data.confidenceScore;
        updated.recommendations = visRes.data.recommendations;
      }

      await api.put(`/api/articles/${article.id}`, updated);
      dispatch(updateArticleInList(updated));
      setIsAuditing(false);
    } catch (err) {
      console.warn('API audit failed. Running simulation.', err);
      setTimeout(() => {
        const wordCount = article.content.split(/\s+/).length;
        const hasHeadings = article.content.includes('#');
        const hasFAQ = article.content.toLowerCase().includes('faq');

        let score = 55;
        if (wordCount > 500) score += 15;
        if (hasHeadings) score += 15;
        if (hasFAQ) score += 10;
        score = Math.min(95, score);

        const updated: Article = {
          ...article,
          aiScore: score,
          visibilityScore: article.status === 'PUBLISHED' ? Math.min(100, score - 5) : 0,
          confidenceScore: article.status === 'PUBLISHED' ? 0.85 : 0,
          suggestions: hasHeadings ? [] : [{ type: 'Structure', message: 'No headings detected. Add H2 subheaders.', severity: 'high' }],
          gapAnalysis: {
            missingKeywords: ['AEO tactics', 'metadata structure'],
            missingTopics: ['Retrieval vectors'],
            missingSections: ['Conclusion summary block']
          },
          recommendations: ['Integrate bullet lists', 'Write H2 question headings'],
          updatedAt: new Date().toISOString()
        };

        dispatch(updateArticleInList(updated));
        setIsAuditing(false);
      }, 800);
    }
  };

  const handleRunAudit = async () => {
    if (!currentArticle || !currentArticle.id) return;
    await runAuditOnArticle(currentArticle);
  };

  const handleRunReaudit = async () => {
    if (!currentArticle || !currentArticle.id) return;
    await triggerReaudit(currentArticle.id, editorTitleRef.current || currentArticle.title, editorContentRef.current || currentArticle.content);
  };

  const handleOptimize = async (
    action: 'HEADINGS' | 'READABILITY' | 'INTRO' | 'CONCLUSION' | 'FAQ' | 'STRUCTURE'
  ) => {
    if (!currentArticle) return;
    dispatch(setOptimizing(true));

    try {
      const res = await api.post('/api/ai/optimize', {
        title: editorTitleRef.current || currentArticle.title,
        content: editorContentRef.current || currentArticle.content,
        action
      });
      dispatch(setOptimizedDraft(res.data.optimizedContent));
    } catch (err) {
      console.warn('AI Optimization endpoint failed. Activating mock rewrite.', err);
      setTimeout(() => {
        let content = editorContentRef.current || currentArticle.content;
        let mockRewrite = '';
        if (action === 'INTRO') {
          mockRewrite = `## Introduction: Optimized for AI Crawlers\n\nThis optimized summary addresses core questions regarding this topic. By structuring definitions directly, we maximize machine citation indexing.\n\n` + content;
        } else if (action === 'FAQ') {
          mockRewrite = content + `\n\n## Frequently Asked Questions\n\n### What is the primary takeaway here?\nThis text outlines key features, methodologies, and outcomes to simplify index retrieval.`;
        } else {
          mockRewrite = `*AI REWRITE: [${action} Mode]*\n\n` + content.replace(/\n/g, '\n\n');
        }
        dispatch(setOptimizedDraft(mockRewrite));
      }, 700);
    }
  };

  const handleApplyOptimization = (text: string) => {
    if (!currentArticle) return;
    editorContentRef.current = text;
    const updated = { ...currentArticle, content: text };
    dispatch(updateArticleInList(updated));
    dispatch(setOptimizedDraft(null));
  };

  const handleBack = () => {
    dispatch(setCurrentArticle(null));
    dispatch(resetImport());
    navigate('/library');
  };

  // Listen for UrlImporter trigger
  const handleImportTrigger = useCallback((result: any) => {
    if (result._url) {
      handleImportUrl(result._url, importState.selectedDomains);
    }
  }, [handleImportUrl, importState.selectedDomains]);

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-neutral-950/20 overflow-hidden">
      <Navbar title={currentArticle && currentArticle.id ? `Editing: ${currentArticle.title}` : 'Author New Article'} />

      <main className="flex-1 p-8 flex flex-col md:flex-row gap-6 items-stretch min-h-0 max-w-[1600px] w-full mx-auto overflow-hidden">
        {/* Left: Editor + URL Importer */}
        <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
          <ArticleEditor
            article={currentArticle}
            onSave={handleSave}
            onBack={handleBack}
            isSaving={isSaving}
            autosaveStatus={autosaveStatus}
            onAutosave={handleAutosave}
            onChange={handleEditorChange}
            onImportUrl={handleImportUrl}
            importStatus={importState.status}
            importProgress={importState.progress}
            importError={importState.error}
            selectedDomains={importState.selectedDomains}
            onToggleDomain={(id) => dispatch(toggleDomain(id))}
          />
        </div>

        {/* Right: AI Sidebar */}
        <div className="w-96 shrink-0 h-full overflow-hidden">
          <AISidebar
            article={currentArticle}
            onOptimize={handleOptimize}
            onApplyOptimization={handleApplyOptimization}
            onRunAudit={handleRunAudit}
            onRunReaudit={handleRunReaudit}
            isOptimizing={optimizing}
            optimizedDraft={optimizedDraft}
            isAuditing={isAuditing}
            isReauditing={isReauditing}
          />
        </div>
      </main>
    </div>
  );
};
