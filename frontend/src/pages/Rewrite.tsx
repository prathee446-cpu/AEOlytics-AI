import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { Card, Button, Badge } from '../components/ui/Widgets';
import { RootState } from '../store';
import { setCurrentArticle, updateArticleInList, Article } from '../store/slices/articleSlice';
import { setImportResult } from '../store/slices/importSlice';
import api from '../services/api';
import { 
  ArrowLeft, 
  Sparkles, 
  Copy, 
  Check, 
  RefreshCw, 
  AlertTriangle, 
  AlertCircle, 
  Loader2, 
  CheckCircle2, 
  FileText 
} from 'lucide-react';

interface Issue {
  id: string;
  source: 'panel' | 'suggestion';
  title: string;
  description: string;
  recommendation: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  categoryLabel: string;
}

const calculateSimilarity = (str1: string, str2: string): number => {
  const w1 = new Set(str1.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  const w2 = new Set(str2.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  if (w1.size === 0 || w2.size === 0) return 0;
  
  let intersection = 0;
  w1.forEach(w => {
    if (w2.has(w)) intersection++;
  });
  
  return intersection / Math.max(w1.size, w2.size);
};

interface DiffLine {
  text: string;
  type: 'added' | 'modified' | 'none';
}

const getDiffLines = (original: string, rewritten: string): DiffLine[] => {
  const origLines = original.split('\n').map(l => l.trim()).filter(Boolean);
  const newLines = rewritten.split('\n');

  return newLines.map(line => {
    const trimmed = line.trim();
    if (!trimmed) return { text: line, type: 'none' };

    const hasExact = origLines.some(ol => ol === trimmed);
    if (hasExact) {
      return { text: line, type: 'none' };
    }

    let highestSim = 0;
    for (const ol of origLines) {
      const sim = calculateSimilarity(trimmed, ol);
      if (sim > highestSim) {
        highestSim = sim;
      }
    }

    if (highestSim > 0.25) {
      return { text: line, type: 'modified' };
    } else {
      return { text: line, type: 'added' };
    }
  });
};

export const Rewrite: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { currentArticle } = useSelector((state: RootState) => state.articles);

  // Section rewrite states
  const [rewriteStates, setRewriteStates] = useState<Record<string, {
    loading: boolean;
    currentSection: string;
    improvedSection: string;
    copied: boolean;
    error: string | null;
  }>>({});

  // Re-audit states
  const [reAuditing, setReAuditing] = useState(false);
  const [reAuditStep, setReAuditStep] = useState<string>('');

  // Publish modal states
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [publishStep, setPublishStep] = useState<1 | 2>(1);
  const [selectedCMS, setSelectedCMS] = useState<'wordpress' | 'shopify' | 'webflow' | 'custom'>('wordpress');
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishSuccessData, setPublishSuccessData] = useState<{ liveUrl: string } | null>(null);
  const [publishContent, setPublishContent] = useState<string>(currentArticle?.content || '');

  // WP Fields
  const [wpUrl, setWpUrl] = useState('');
  const [wpUsername, setWpUsername] = useState('');
  const [wpAppPassword, setWpAppPassword] = useState('');
  const [wpExistingUrlOrId, setWpExistingUrlOrId] = useState('');
  const [wpStatus, setWpStatus] = useState<'draft' | 'publish'>('draft');

  // Shopify Fields
  const [shopifyStoreUrl, setShopifyStoreUrl] = useState('');
  const [shopifyToken, setShopifyToken] = useState('');
  const [shopifyBlogId, setShopifyBlogId] = useState('');
  const [shopifyArticleId, setShopifyArticleId] = useState('');

  // Webflow Fields
  const [webflowSiteId, setWebflowSiteId] = useState('');
  const [webflowCollectionId, setWebflowCollectionId] = useState('');
  const [webflowToken, setWebflowToken] = useState('');
  const [webflowItemId, setWebflowItemId] = useState('');

  // Custom API Fields
  const [customEndpoint, setCustomEndpoint] = useState('');
  const [customApiKey, setCustomApiKey] = useState('');
  const [customMethod, setCustomMethod] = useState<'POST' | 'PUT' | 'PATCH'>('POST');
  const [customContentField, setCustomContentField] = useState('content');

  useEffect(() => {
    if (currentArticle?.content) {
      setPublishContent(currentArticle.content);
    }
  }, [currentArticle?.content]);

  // Auto-redirect if no article is active
  useEffect(() => {
    if (!currentArticle || !currentArticle.id) {
      const timer = setTimeout(() => {
        navigate('/workspace');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [currentArticle, navigate]);

  if (!currentArticle || !currentArticle.id) {
    return (
      <div className="flex-1 flex flex-col min-w-0 bg-background overflow-y-auto">
        <Navbar title="AEO Content Rewrite Suite" />
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted">
          <AlertCircle className="w-10 h-10 text-red-400 mb-3 animate-pulse" />
          <p className="text-sm font-semibold text-white font-display">No audited document loaded</p>
          <p className="text-xs text-muted mt-1 max-w-xs leading-normal">
            Redirecting you back to the AEO Workspace to import and audit a URL first...
          </p>
          <Button size="sm" onClick={() => navigate('/workspace')} className="mt-4">
            Go to Workspace
          </Button>
        </div>
      </div>
    );
  }

  // Gather and normalize issues
  const issues: Issue[] = [];

  // 1. Gather issues from optimizer panels
  if (currentArticle.optimizerData?.panels) {
    currentArticle.optimizerData.panels.forEach((panel) => {
      panel.issues.forEach((issue, idx) => {
        issues.push({
          id: `${panel.panelId}-${idx}`,
          source: 'panel',
          title: issue.title,
          description: issue.description,
          recommendation: issue.recommendation,
          severity: issue.severity as any,
          categoryLabel: panel.label,
        });
      });
    });
  }

  // 2. Gather from legacy suggestions
  if (currentArticle.suggestions) {
    currentArticle.suggestions.forEach((sug, idx) => {
      if (!issues.some(i => i.title.toLowerCase() === sug.type.toLowerCase())) {
        issues.push({
          id: `suggestion-${idx}`,
          source: 'suggestion',
          title: sug.type,
          description: sug.message,
          recommendation: sug.message,
          severity: sug.severity as any,
          categoryLabel: 'General Suggestion',
        });
      }
    });
  }

  const handleRewriteIssue = async (issue: Issue) => {
    setRewriteStates(prev => ({
      ...prev,
      [issue.id]: {
        loading: true,
        currentSection: '',
        improvedSection: '',
        copied: false,
        error: null,
      }
    }));

    try {
      const res = await api.post('/api/ai/rewrite-section', {
        title: currentArticle.title,
        content: currentArticle.content,
        issueTitle: issue.title,
        issueDescription: `${issue.description} - ${issue.recommendation}`,
      });

      setRewriteStates(prev => ({
        ...prev,
        [issue.id]: {
          loading: false,
          currentSection: res.data.currentSection || `[Standard section not identified. Adding new section]`,
          improvedSection: res.data.improvedSection || '',
          copied: false,
          error: null,
        }
      }));
    } catch (err: any) {
      console.error('[Rewrite error]', err);
      setRewriteStates(prev => ({
        ...prev,
        [issue.id]: {
          loading: false,
          currentSection: '',
          improvedSection: '',
          copied: false,
          error: err.response?.data?.error || err.message || 'Failed to rewrite section.',
        }
      }));
    }
  };

  const handleCopySection = (issueId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setRewriteStates(prev => ({
      ...prev,
      [issueId]: {
        ...prev[issueId],
        copied: true,
      }
    }));
    setTimeout(() => {
      setRewriteStates(prev => ({
        ...prev,
        [issueId]: {
          ...prev[issueId],
          copied: false,
        }
      }));
    }, 2000);
  };

  const handleReAuditWebsite = async () => {
    if (!currentArticle.id) return;
    setReAuditing(true);
    setReAuditStep('Launching Playwright Crawler…');
    
    const steps = [
      'Fetching dyn-crawled HTML body…',
      'Running Grok AI audit metrics…',
      'Recalculating AEO scores…'
    ];

    let currentStepIdx = 0;
    const interval = setInterval(() => {
      if (currentStepIdx < steps.length) {
        setReAuditStep(steps[currentStepIdx]);
        currentStepIdx++;
      }
    }, 2000);

    try {
      const res = await api.post('/api/import/re-audit-url', {
        articleId: currentArticle.id,
      });

      clearInterval(interval);
      setReAuditStep('Saving results to database…');

      const { article, crawlResult, markdown, auditScores, optimizerPanels } = res.data;

      // Populate Redux
      const fullArticle: Article = {
        ...article,
        suggestions: article.suggestions || [],
        gapAnalysis: article.gapAnalysis || { missingKeywords: [], missingTopics: [], missingSections: [] },
        recommendations: article.recommendations || [],
        optimizerData: article.optimizerData || null,
        auditScores: article.auditScores || null,
      };

      dispatch(updateArticleInList(fullArticle));
      dispatch(setCurrentArticle(fullArticle));

      // Sync importState for sidebar
      dispatch(setImportResult({
        crawlMetadata: crawlResult,
        markdown: markdown || '',
        auditScores,
        optimizerPanels,
      }));

      setReAuditStep('Completed! Redirecting to Workspace…');
      setTimeout(() => {
        setReAuditing(false);
        navigate('/workspace');
      }, 1000);

    } catch (err: any) {
      clearInterval(interval);
      console.error('[Re-Audit Error]', err);
      alert(`Re-audit failed: ${err.response?.data?.error || err.message || 'Crawl error'}`);
      setReAuditing(false);
    }
  };

  const handlePublishSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentArticle?.id) return;
    setPublishing(true);
    setPublishError(null);

    let details: any = {};
    if (selectedCMS === 'wordpress') {
      if (!wpUrl || !wpUsername || !wpAppPassword) {
        setPublishError('Website URL, Username, and Application Password are required.');
        setPublishing(false);
        return;
      }
      details = {
        websiteUrl: wpUrl,
        username: wpUsername,
        applicationPassword: wpAppPassword,
        existingUrlOrId: wpExistingUrlOrId,
        status: wpStatus,
      };
    } else if (selectedCMS === 'shopify') {
      if (!shopifyStoreUrl || !shopifyToken || !shopifyBlogId) {
        setPublishError('Store URL, Admin Token, and Blog ID are required.');
        setPublishing(false);
        return;
      }
      details = {
        storeUrl: shopifyStoreUrl,
        adminToken: shopifyToken,
        blogId: shopifyBlogId,
        articleId: shopifyArticleId,
      };
    } else if (selectedCMS === 'webflow') {
      if (!webflowSiteId || !webflowCollectionId || !webflowToken) {
        setPublishError('Site ID, Collection ID, and CMS Token are required.');
        setPublishing(false);
        return;
      }
      details = {
        siteId: webflowSiteId,
        collectionId: webflowCollectionId,
        cmsToken: webflowToken,
        itemId: webflowItemId,
      };
    } else if (selectedCMS === 'custom') {
      if (!customEndpoint || !customContentField) {
        setPublishError('API Endpoint and Content Field Mapping are required.');
        setPublishing(false);
        return;
      }
      details = {
        endpoint: customEndpoint,
        apiKey: customApiKey,
        method: customMethod,
        contentField: customContentField,
      };
    }

    try {
      const res = await api.post('/api/import/publish', {
        articleId: currentArticle.id,
        cms: selectedCMS,
        rewrittenContent: publishContent,
        details,
      });

      setPublishSuccessData({ liveUrl: res.data.liveUrl });
      
      const updatedArticle = {
        ...currentArticle,
        sourceUrl: res.data.liveUrl,
      };
      dispatch(setCurrentArticle(updatedArticle));
      dispatch(updateArticleInList(updatedArticle));

    } catch (err: any) {
      console.error('[Publishing request failed]', err);
      setPublishError(err.response?.data?.error || err.message || 'CMS API Connection Failed.');
    } finally {
      setPublishing(false);
    }
  };

  const getSeverityBadgeVariant = (sev: string) => {
    switch (sev?.toLowerCase()) {
      case 'critical': return 'danger';
      case 'high':     return 'danger';
      case 'medium':   return 'warning';
      case 'low':      return 'neutral';
      default:         return 'neutral';
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-background overflow-y-auto relative select-none">
      <Navbar title={`Rewrite Suite: ${currentArticle.title}`} />

      {/* Main Container */}
      <main className="flex-1 p-8 max-w-[1200px] w-full mx-auto flex flex-col gap-6">
        
        {/* Subheader Navigation */}
        <div className="flex items-center justify-between shrink-0">
          <button
            onClick={() => navigate('/workspace')}
            className="inline-flex items-center gap-2 text-xs font-semibold text-muted hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Workspace</span>
          </button>
          
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <GlobeIcon className="w-3.5 h-3.5 text-accent" />
            <span className="font-mono text-[11px] truncate max-w-xs">{currentArticle.sourceUrl}</span>
          </div>
        </div>

        {/* Intro Banner */}
        <Card className="flex items-start gap-4 p-6 bg-indigo-950/10 border-indigo-500/20">
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl mt-0.5">
            <Sparkles className="w-5 h-5 text-accent animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white font-display mb-1">AEO Content Rewrite Suite</h3>
            <p className="text-xs text-muted leading-relaxed max-w-2xl">
              Select an issue below to generate an optimized version addressing the specific gap. 
              Once you have updated your website content, trigger the live re-audit below to re-verify compliance.
            </p>
          </div>
        </Card>

        {/* Issue Cards Section */}
        <div className="flex flex-col gap-4">
          <h4 className="text-xs font-semibold uppercase text-muted tracking-wider font-display select-none">Audited Issues List ({issues.length})</h4>
          
          {issues.length === 0 ? (
            <div className="glass p-8 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-center flex flex-col items-center gap-2">
              <CheckCircle2 className="w-8 h-8 shrink-0" />
              <p className="text-xs font-semibold">Perfect Score! No issues identified.</p>
              <p className="text-[10px] text-emerald-400/60 leading-normal max-w-xs">
                Your webpage is fully optimized for conversational search engines.
              </p>
            </div>
          ) : (
            issues.map((issue) => {
              const state = rewriteStates[issue.id] || { loading: false, currentSection: '', improvedSection: '', copied: false, error: null };

              return (
                <Card key={issue.id} className="p-5 flex flex-col gap-4 border-border/40 hover:border-border/80 transition bg-neutral-950/20">
                  {/* Issue Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={getSeverityBadgeVariant(issue.severity)}>
                          {issue.severity || 'Issue'}
                        </Badge>
                        <span className="text-[10px] text-muted font-semibold tracking-wider font-display uppercase">
                          {issue.categoryLabel}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white font-display mt-1">{issue.title}</h4>
                      <p className="text-xs text-muted/80 leading-normal mt-0.5">{issue.description}</p>
                    </div>

                    {!state.improvedSection && (
                      <Button
                        size="sm"
                        loading={state.loading}
                        onClick={() => handleRewriteIssue(issue)}
                        className="shrink-0 flex items-center gap-1.5 text-xs font-display font-semibold"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-violet-300" />
                        <span>Rewrite</span>
                      </Button>
                    )}
                  </div>

                  {/* Error Box */}
                  {state.error && (
                    <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3 text-[11px] text-red-400">
                      {state.error}
                    </div>
                  )}

                  {/* Loading skeleton */}
                  {state.loading && !state.improvedSection && (
                    <div className="animate-pulse flex flex-col gap-3 mt-2 bg-neutral-950/40 p-4 rounded-xl border border-border/20">
                      <div className="h-4 bg-neutral-800 w-1/3 rounded" />
                      <div className="h-12 bg-neutral-800 w-full rounded" />
                    </div>
                  )}

                  {/* Comparison Views */}
                  {state.improvedSection && (
                    <div className="flex flex-col gap-4 mt-2 border-t border-border/20 pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Current text box */}
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[9px] uppercase tracking-wider font-bold text-muted font-display">Current Website Section</span>
                          <div className="bg-neutral-950/60 border border-border/40 p-4 rounded-lg text-xs leading-relaxed text-muted max-h-48 overflow-y-auto whitespace-pre-wrap select-text selection:bg-indigo-500/30 selection:text-white">
                            {state.currentSection}
                          </div>
                        </div>

                        {/* Improved text box */}
                        <div className="flex flex-col gap-1.5 font-display select-text">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] uppercase tracking-wider font-bold text-accent">Improved Section (xAI Grok)</span>
                            {/* Legend */}
                            <div className="flex items-center gap-2.5 text-[9px] font-bold select-none tracking-wide">
                              <span className="flex items-center gap-1 text-emerald-500 dark:text-emerald-400">
                                🟢 Added
                              </span>
                              <span className="flex items-center gap-1 text-amber-500 dark:text-amber-400">
                                🟡 Modified
                              </span>
                            </div>
                          </div>
                          <div className="bg-neutral-900/40 border border-indigo-500/20 p-4 rounded-lg text-xs leading-relaxed text-white max-h-48 overflow-y-auto whitespace-pre-wrap flex flex-col gap-0.5 selection:bg-indigo-500/30 selection:text-white select-text">
                            {getDiffLines(state.currentSection, state.improvedSection).map((dLine, dIdx) => {
                              let dClass = "text-white";
                              if (dLine.type === 'added') {
                                dClass = "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-l-2 border-emerald-500 pl-1 rounded-sm";
                              } else if (dLine.type === 'modified') {
                                dClass = "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-l-2 border-amber-500 pl-1 rounded-sm";
                              }
                              return (
                                <div key={dIdx} className={`${dClass} select-text`}>
                                  {dLine.text}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center justify-end gap-3 select-none">
                        <Button
                          size="sm"
                          variant="secondary"
                          loading={state.loading}
                          onClick={() => handleRewriteIssue(issue)}
                          className="text-xs h-8 px-3 flex items-center gap-1.5 font-display"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Regenerate</span>
                        </Button>

                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleCopySection(issue.id, state.improvedSection)}
                          className="text-xs h-8 px-3.5 flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-display"
                        >
                          {state.copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{state.copied ? 'Copied!' : 'Copy Section'}</span>
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>

        {/* Large Re-Audit Footer Card */}
        <div className="mt-8 border-t border-border/40 pt-8 flex justify-center shrink-0">
          <Card className="w-full max-w-md p-6 border-indigo-500/20 bg-neutral-950/40 text-center flex flex-col gap-4 items-center">
            <div className="p-3 rounded-full bg-indigo-500/10 text-indigo-400">
              <RefreshCw className="w-6 h-6 text-accent animate-pulse" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white font-display">Ready to Re-evaluate?</h4>
              <p className="text-xs text-muted leading-relaxed mt-1">
                Trigger a fresh live crawl on the website URL. AEOlytics will parse the latest DOM changes, scoring your edits immediately.
              </p>
            </div>
            <Button
              onClick={handleReAuditWebsite}
              loading={reAuditing}
              className="w-full font-display font-semibold flex items-center justify-center gap-2 py-3 mt-1 shadow-lg shadow-accent/25"
            >
              <span>Re-Audit the Updated Website</span>
            </Button>

            <Button
              onClick={() => {
                setPublishModalOpen(true);
                setPublishStep(1);
                setPublishSuccessData(null);
                setPublishError(null);
              }}
              className="w-full font-display font-semibold flex items-center justify-center gap-2 py-3 shadow-lg shadow-indigo-500/25 bg-emerald-600 hover:bg-emerald-700 !text-zinc-50 select-none"
            >
              <span>🚀 Publish to Website</span>
            </Button>
          </Card>
        </div>
      </main>

      {/* Publish CMS Modal */}
      {publishModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md overflow-y-auto p-4 select-none">
          <div className="w-full max-w-2xl bg-neutral-950/95 border border-border/60 rounded-2xl flex flex-col p-6 max-h-[90vh] overflow-y-auto relative text-left">
            {!publishing && (
              <button 
                onClick={() => setPublishModalOpen(false)}
                className="absolute top-4 right-4 text-muted hover:text-white text-lg font-bold transition"
              >
                ✕
              </button>
            )}

            {publishSuccessData ? (
              <div className="flex flex-col items-center text-center gap-4 py-8">
                <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-full">
                  <CheckCircle2 className="w-12 h-12" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white font-display">✅ Website updated successfully.</h3>
                  <p className="text-xs text-muted mt-2">
                    Published URL:
                  </p>
                  <a 
                    href={publishSuccessData.liveUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-indigo-400 underline font-mono break-all hover:text-indigo-300 mt-1 block"
                  >
                    {publishSuccessData.liveUrl}
                  </a>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm mt-6">
                  <Button
                    onClick={() => window.open(publishSuccessData.liveUrl, '_blank')}
                    className="flex-1 text-xs py-2 bg-neutral-800 hover:bg-neutral-700 !text-zinc-50 font-semibold"
                    variant="secondary"
                  >
                    View Live Website
                  </Button>
                  <Button
                    onClick={() => {
                      setPublishModalOpen(false);
                      handleReAuditWebsite();
                    }}
                    className="flex-1 text-xs py-2 bg-indigo-600 hover:bg-indigo-700 !text-zinc-50 font-semibold"
                    variant="primary"
                  >
                    Re-Audit Live Website
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handlePublishSubmit} className="flex flex-col gap-4">
                <div>
                  <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
                    <span>🚀 Publish to Website</span>
                  </h3>
                  <p className="text-xs text-muted mt-1">
                    Configure your CMS details to publish or update this document.
                  </p>
                </div>

                {publishError && (
                  <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3 text-xs text-red-400">
                    ⚠️ {publishError}
                  </div>
                )}

                {publishStep === 1 ? (
                  <div className="flex flex-col gap-4">
                    <span className="text-xs font-semibold uppercase text-muted tracking-wider font-display">Step 1: Choose CMS Platform</span>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { id: 'wordpress', name: 'WordPress', icon: 'wp' },
                        { id: 'shopify', name: 'Shopify', icon: 'sh' },
                        { id: 'webflow', name: 'Webflow', icon: 'wf' },
                        { id: 'custom', name: 'Custom (API)', icon: 'api' },
                      ].map((plat) => (
                        <button
                          key={plat.id}
                          type="button"
                          onClick={() => {
                            setSelectedCMS(plat.id as any);
                            setPublishStep(2);
                          }}
                          className={`p-6 rounded-xl border flex flex-col items-center gap-3 transition text-center ${
                            selectedCMS === plat.id
                              ? 'border-indigo-500 bg-indigo-500/5 text-white'
                              : 'border-border/40 hover:border-border bg-neutral-900/40 text-muted hover:text-white'
                          }`}
                        >
                          <span className="text-2xl font-bold uppercase tracking-wider font-display">{plat.icon}</span>
                          <span className="text-xs font-bold font-display">{plat.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase text-muted tracking-wider font-display">
                        Step 2: Collect Required Details ({selectedCMS.toUpperCase()})
                      </span>
                      <button
                        type="button"
                        onClick={() => setPublishStep(1)}
                        className="text-xs text-indigo-400 hover:underline"
                      >
                        ← Change Platform
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedCMS === 'wordpress' && (
                        <>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] uppercase font-bold text-muted font-display">Website URL *</label>
                            <input
                              type="url"
                              required
                              placeholder="https://mywordpress.com"
                              value={wpUrl}
                              onChange={(e) => setWpUrl(e.target.value)}
                              className="bg-neutral-900 border border-border/40 rounded-lg p-2.5 text-xs text-white placeholder-muted focus:border-indigo-500 focus:outline-none"
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] uppercase font-bold text-muted font-display">Username *</label>
                            <input
                              type="text"
                              required
                              placeholder="wp-admin"
                              value={wpUsername}
                              onChange={(e) => setWpUsername(e.target.value)}
                              className="bg-neutral-900 border border-border/40 rounded-lg p-2.5 text-xs text-white placeholder-muted focus:border-indigo-500 focus:outline-none"
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] uppercase font-bold text-muted font-display">WP Application Password *</label>
                            <input
                              type="password"
                              required
                              placeholder="xxxx xxxx xxxx xxxx"
                              value={wpAppPassword}
                              onChange={(e) => setWpAppPassword(e.target.value)}
                              className="bg-neutral-900 border border-border/40 rounded-lg p-2.5 text-xs text-white placeholder-muted focus:border-indigo-500 focus:outline-none"
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] uppercase font-bold text-muted font-display">Existing Post/Page URL or ID (optional)</label>
                            <input
                              type="text"
                              placeholder="e.g. 124 or https://mywordpress.com/my-post/"
                              value={wpExistingUrlOrId}
                              onChange={(e) => setWpExistingUrlOrId(e.target.value)}
                              className="bg-neutral-900 border border-border/40 rounded-lg p-2.5 text-xs text-white placeholder-muted focus:border-indigo-500 focus:outline-none"
                            />
                          </div>
                          <div className="flex flex-col gap-1.5 md:col-span-2">
                            <label className="text-[10px] uppercase font-bold text-muted font-display">Publish Status *</label>
                            <select
                              value={wpStatus}
                              onChange={(e) => setWpStatus(e.target.value as any)}
                              className="bg-neutral-900 border border-border/40 rounded-lg p-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                            >
                              <option value="draft" className="bg-neutral-900 text-white dark:bg-zinc-950 dark:text-white">Save as Draft</option>
                              <option value="publish" className="bg-neutral-900 text-white dark:bg-zinc-950 dark:text-white">Publish Immediately</option>
                            </select>
                          </div>
                        </>
                      )}

                      {selectedCMS === 'shopify' && (
                        <>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] uppercase font-bold text-muted font-display">Store URL *</label>
                            <input
                              type="text"
                              required
                              placeholder="my-store.myshopify.com"
                              value={shopifyStoreUrl}
                              onChange={(e) => setShopifyStoreUrl(e.target.value)}
                              className="bg-neutral-900 border border-border/40 rounded-lg p-2.5 text-xs text-white placeholder-muted focus:border-indigo-500 focus:outline-none"
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] uppercase font-bold text-muted font-display">Admin API Access Token *</label>
                            <input
                              type="password"
                              required
                              placeholder="shpat_xxxxxxxxxxxxxxxxxxxxxxxx"
                              value={shopifyToken}
                              onChange={(e) => setShopifyToken(e.target.value)}
                              className="bg-neutral-900 border border-border/40 rounded-lg p-2.5 text-xs text-white placeholder-muted focus:border-indigo-500 focus:outline-none"
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] uppercase font-bold text-muted font-display">Blog ID *</label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. 8394958"
                              value={shopifyBlogId}
                              onChange={(e) => setShopifyBlogId(e.target.value)}
                              className="bg-neutral-900 border border-border/40 rounded-lg p-2.5 text-xs text-white placeholder-muted focus:border-indigo-500 focus:outline-none"
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] uppercase font-bold text-muted font-display">Article ID (optional if updating)</label>
                            <input
                              type="text"
                              placeholder="e.g. 5938495"
                              value={shopifyArticleId}
                              onChange={(e) => setShopifyArticleId(e.target.value)}
                              className="bg-neutral-900 border border-border/40 rounded-lg p-2.5 text-xs text-white placeholder-muted focus:border-indigo-500 focus:outline-none"
                            />
                          </div>
                        </>
                      )}

                      {selectedCMS === 'webflow' && (
                        <>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] uppercase font-bold text-muted font-display">Site ID *</label>
                            <input
                              type="text"
                              required
                              placeholder="Webflow Site ID"
                              value={webflowSiteId}
                              onChange={(e) => setWebflowSiteId(e.target.value)}
                              className="bg-neutral-900 border border-border/40 rounded-lg p-2.5 text-xs text-white placeholder-muted focus:border-indigo-500 focus:outline-none"
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] uppercase font-bold text-muted font-display">Collection ID *</label>
                            <input
                              type="text"
                              required
                              placeholder="CMS Collection ID"
                              value={webflowCollectionId}
                              onChange={(e) => setWebflowCollectionId(e.target.value)}
                              className="bg-neutral-900 border border-border/40 rounded-lg p-2.5 text-xs text-white placeholder-muted focus:border-indigo-500 focus:outline-none"
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] uppercase font-bold text-muted font-display">CMS API Token *</label>
                            <input
                              type="password"
                              required
                              placeholder="Webflow API Token"
                              value={webflowToken}
                              onChange={(e) => setWebflowToken(e.target.value)}
                              className="bg-neutral-900 border border-border/40 rounded-lg p-2.5 text-xs text-white placeholder-muted focus:border-indigo-500 focus:outline-none"
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] uppercase font-bold text-muted font-display">Item ID (optional if updating)</label>
                            <input
                              type="text"
                              placeholder="Webflow CMS Item ID"
                              value={webflowItemId}
                              onChange={(e) => setWebflowItemId(e.target.value)}
                              className="bg-neutral-900 border border-border/40 rounded-lg p-2.5 text-xs text-white placeholder-muted focus:border-indigo-500 focus:outline-none"
                            />
                          </div>
                        </>
                      )}

                      {selectedCMS === 'custom' && (
                        <>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] uppercase font-bold text-muted font-display">API Endpoint *</label>
                            <input
                              type="url"
                              required
                              placeholder="https://api.myweb.com/posts"
                              value={customEndpoint}
                              onChange={(e) => setCustomEndpoint(e.target.value)}
                              className="bg-neutral-900 border border-border/40 rounded-lg p-2.5 text-xs text-white placeholder-muted focus:border-indigo-500 focus:outline-none"
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] uppercase font-bold text-muted font-display">API Key / Token (optional)</label>
                            <input
                              type="password"
                              placeholder="Bearer token or API Key"
                              value={customApiKey}
                              onChange={(e) => setCustomApiKey(e.target.value)}
                              className="bg-neutral-900 border border-border/40 rounded-lg p-2.5 text-xs text-white placeholder-muted focus:border-indigo-500 focus:outline-none"
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] uppercase font-bold text-muted font-display">HTTP Method *</label>
                            <select
                              value={customMethod}
                              onChange={(e) => setCustomMethod(e.target.value as any)}
                              className="bg-neutral-900 border border-border/40 rounded-lg p-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                            >
                              <option value="POST" className="bg-neutral-900 text-white dark:bg-zinc-950 dark:text-white">POST</option>
                              <option value="PUT" className="bg-neutral-900 text-white dark:bg-zinc-950 dark:text-white">PUT</option>
                              <option value="PATCH" className="bg-neutral-900 text-white dark:bg-zinc-950 dark:text-white">PATCH</option>
                            </select>
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] uppercase font-bold text-muted font-display">Content Field Mapping *</label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. content or body"
                              value={customContentField}
                              onChange={(e) => setCustomContentField(e.target.value)}
                              className="bg-neutral-900 border border-border/40 rounded-lg p-2.5 text-xs text-white placeholder-muted focus:border-indigo-500 focus:outline-none"
                            />
                          </div>
                        </>
                      )}
                    </div>

                    {/* Content Preview & Editing Area */}
                    <div className="flex flex-col gap-1.5 border-t border-border/40 pt-4 mt-2">
                      <label className="text-[10px] uppercase font-bold text-muted font-display">Review Article Body to Publish</label>
                      <textarea
                        value={publishContent}
                        onChange={(e) => setPublishContent(e.target.value)}
                        className="bg-neutral-900/60 border border-border/40 rounded-lg p-3 text-xs leading-relaxed text-white h-40 focus:border-indigo-500 focus:outline-none select-text resize-none"
                        placeholder="Article Content markdown..."
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 border-t border-border/40 pt-4 mt-2 select-none">
                      <Button
                        type="button"
                        onClick={() => setPublishModalOpen(false)}
                        className="text-xs h-9 px-4 text-muted bg-neutral-900/60 border border-border/40"
                        variant="secondary"
                        disabled={publishing}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="text-xs h-9 px-6 bg-indigo-600 hover:bg-indigo-700 !text-zinc-50 font-semibold"
                        variant="primary"
                        loading={publishing}
                        disabled={publishing}
                      >
                        <span>{publishing ? 'Publishing...' : '🚀 Publish Content'}</span>
                      </Button>
                    </div>
                  </div>
                )}
              </form>
            )}
          </div>
        </div>
      )}

      {/* Re-Audit Overlay Modal */}
      {reAuditing && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-sm glass border border-border/60 p-8 rounded-2xl flex flex-col items-center gap-4 text-center">
            <Loader2 className="w-10 h-10 text-accent animate-spin" />
            <div>
              <h3 className="text-sm font-bold text-white font-display uppercase tracking-wider select-none">Web Audit Engine Running</h3>
              <p className="text-xs text-muted mt-2 select-none">
                Playwright is crawling the dynamic source URL and updating analysis metrics.
              </p>
            </div>
            <div className="mt-4 px-4 py-2 border border-border/30 bg-neutral-900/60 text-emerald-400 text-xs font-semibold rounded-lg font-mono tracking-wide animate-pulse">
              {reAuditStep}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const GlobeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);
