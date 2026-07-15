import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, Card, Skeleton } from '../ui/Widgets';
import {
  Sparkles,
  Eye,
  Target,
  Zap,
  AlertTriangle,
  CheckCircle2,
  FileText,
  AlertCircle,
  Copy,
  Globe,
  Brain,
  Link,
  ExternalLink,
  Tag,
  Image,
  BarChart3,
  ChevronDown,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { Article } from '../../store/slices/articleSlice';

const ENGINE_META: Record<string, { label: string; color: string; bgColor: string; borderColor: string; initials: string }> = {
  chatgpt:    { label: 'ChatGPT',    color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/25', initials: 'GPT' },
  googleAI:   { label: 'Google AI',  color: 'text-blue-400',    bgColor: 'bg-blue-500/10',    borderColor: 'border-blue-500/25',    initials: 'G'   },
  gemini:     { label: 'Gemini',     color: 'text-purple-400',  bgColor: 'bg-purple-500/10',  borderColor: 'border-purple-500/25',  initials: 'GEM' },
  perplexity: { label: 'Perplexity', color: 'text-cyan-400',    bgColor: 'bg-cyan-500/10',    borderColor: 'border-cyan-500/25',    initials: 'PPX' },
  claude:     { label: 'Claude',     color: 'text-amber-400',   bgColor: 'bg-amber-500/10',   borderColor: 'border-amber-500/25',   initials: 'CLU' },
  copilot:    { label: 'MS Copilot', color: 'text-indigo-400',  bgColor: 'bg-indigo-500/10',  borderColor: 'border-indigo-500/25',  initials: 'COP' },
};

const PANEL_ICONS: Record<string, React.ReactNode> = {
  'content-quality':   <FileText className="w-3.5 h-3.5" />,
  'semantic-coverage': <Brain className="w-3.5 h-3.5" />,
  'question-coverage': <Target className="w-3.5 h-3.5" />,
  'heading-analysis':  <BarChart3 className="w-3.5 h-3.5" />,
  'schema':            <Tag className="w-3.5 h-3.5" />,
  'internal-linking':  <Link className="w-3.5 h-3.5" />,
  'external-authority':<ExternalLink className="w-3.5 h-3.5" />,
  'metadata':          <Globe className="w-3.5 h-3.5" />,
  'images':            <Image className="w-3.5 h-3.5" />,
};

interface AISidebarProps {
  article: Partial<Article> | null;
  onOptimize: (action: 'HEADINGS' | 'READABILITY' | 'INTRO' | 'CONCLUSION' | 'FAQ' | 'STRUCTURE') => Promise<void>;
  onApplyOptimization: (text: string) => void;
  onRunAudit: () => Promise<void>;
  onRunReaudit?: () => Promise<void>;
  isOptimizing: boolean;
  optimizedDraft: string | null;
  isAuditing: boolean;
  isReauditing?: boolean;
}

export const AISidebar: React.FC<AISidebarProps> = ({
  article,
  onOptimize,
  onApplyOptimization,
  onRunAudit,
  onRunReaudit,
  isOptimizing,
  optimizedDraft,
  isAuditing,
  isReauditing = false,
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'scores' | 'auditor' | 'optimizer' | 'rewriter'>('auditor');
  const [expandedPanel, setExpandedPanel] = useState<string | null>(null);
  const [expandedIssue, setExpandedIssue] = useState<string | null>(null);

  if (!article || !article.id) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center text-muted">
        <Sparkles className="w-8 h-8 text-neutral-800 mb-3 animate-pulse" />
        <p className="text-xs font-semibold text-white">No active document</p>
        <p className="text-[10px] text-muted mt-1 leading-relaxed max-w-xs">
          Select or save an article in the library to enable real-time AI performance audits.
        </p>
      </div>
    );
  }

  const hasImportAudit = !!(article.auditScores && article.optimizerData?.panels?.length);
  const hasAuditResults = article.aiScore !== undefined && article.aiScore > 0;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400 border-emerald-500/25 bg-emerald-500/5';
    if (score >= 60) return 'text-amber-400 border-amber-500/25 bg-amber-500/5';
    return 'text-red-400 border-red-500/25 bg-red-500/5';
  };

  const getSeverityStyle = (sev: string) => {
    switch (sev) {
      case 'critical': return { badge: 'bg-red-500/20 text-red-400 border-red-500/30', dot: 'bg-red-500' };
      case 'high':     return { badge: 'bg-orange-500/20 text-orange-400 border-orange-500/30', dot: 'bg-orange-500' };
      case 'medium':   return { badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30', dot: 'bg-amber-500' };
      case 'low':      return { badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30', dot: 'bg-blue-500' };
      default:         return { badge: 'bg-neutral-500/20 text-neutral-400 border-neutral-500/30', dot: 'bg-neutral-500' };
    }
  };

  const getSeverityBadge = (sev: 'low' | 'medium' | 'high') => {
    switch (sev) {
      case 'high':   return <Badge variant="danger">High</Badge>;
      case 'medium': return <Badge variant="warning">Medium</Badge>;
      case 'low':    return <Badge variant="neutral">Low</Badge>;
    }
  };

  const getScoreGaugeColor = (score: number) => {
    if (score >= 80) return '#34d399';
    if (score >= 60) return '#fbbf24';
    return '#f87171';
  };

  // Determine which tabs to show
  const tabs = hasImportAudit
    ? (['scores', 'auditor', 'optimizer', 'rewriter'] as const)
    : (['auditor', 'optimizer', 'rewriter'] as const);

  const TAB_LABELS: Record<string, string> = {
    scores: 'Scores',
    auditor: 'Audit',
    optimizer: 'Issues',
    rewriter: 'Rewrite',
  };

  return (
    <div className="h-full flex flex-col min-h-0 bg-neutral-950/20 border border-border/60 rounded-xl overflow-hidden shadow-inner">
      {/* Header */}
      <div className="p-4 border-b border-border/40 bg-neutral-950/60 flex items-center justify-between shrink-0 select-none">
        <span className="text-xs font-semibold text-white flex items-center gap-2 font-display">
          <Zap className="w-4 h-4 text-accent" />
          <span>AEO Intelligence Hub</span>
        </span>
        <div className="flex items-center gap-2">
          {hasImportAudit && onRunReaudit && (
            <Button
              size="sm"
              variant="ghost"
              loading={isReauditing}
              onClick={onRunReaudit}
              className="text-[10px] tracking-wider uppercase font-semibold h-7 border border-border/60 bg-neutral-900/60 font-display px-2"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Re-Audit
            </Button>
          )}
          {hasAuditResults && !hasImportAudit && (
            <Button
              size="sm"
              variant="ghost"
              loading={isAuditing}
              onClick={onRunAudit}
              className="text-[10px] tracking-wider uppercase font-semibold h-7 border border-border/60 bg-neutral-900/60 font-display px-2"
            >
              Re-Audit
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/40 shrink-0 bg-neutral-950/40 select-none">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`flex-1 text-center py-2.5 text-[10px] font-semibold uppercase tracking-wider transition ${
              activeTab === tab
                ? 'text-white border-b-2 border-accent bg-neutral-900/30'
                : 'text-muted hover:text-white'
            }`}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {/* Loading skeleton */}
        {(isAuditing || isReauditing) && (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}

        {/* No audit yet (non-imported articles) */}
        {!isAuditing && !isReauditing && !hasAuditResults && !hasImportAudit && (
          <div className="flex flex-col items-center justify-center text-center py-16 gap-3">
            <AlertCircle className="w-8 h-8 text-neutral-800" />
            <div>
              <p className="text-xs font-semibold text-white">Content audit required</p>
              <p className="text-[10px] text-muted max-w-[200px] mx-auto mt-1 leading-normal">
                This document hasn't been scanned for AEO readiness scores.
              </p>
            </div>
            <Button size="sm" loading={isAuditing} onClick={onRunAudit} className="mt-2">
              Run Initial Audit
            </Button>
          </div>
        )}

        {/* ── TAB: ENGINE SCORES ────────────────────────────────────────────── */}
        {activeTab === 'scores' && hasImportAudit && !isAuditing && !isReauditing && (
          <div className="flex flex-col gap-4">
            {/* Overall Score */}
            <div className={`p-4 rounded-xl border text-center ${getScoreColor(article.auditScores!.overall)}`}>
              <p className="text-[10px] tracking-widest uppercase font-semibold text-muted font-display mb-1">Overall AEO Readiness</p>
              <p className="text-4xl font-bold font-display tracking-tight text-white mb-2">
                {article.auditScores!.overall}%
              </p>
              <p className="text-xs text-muted leading-relaxed">
                {article.auditScores!.overall >= 80
                  ? 'Excellent. High probability of AI citation across major engines.'
                  : article.auditScores!.overall >= 60
                  ? 'Moderate. Targeted improvements will significantly boost AI visibility.'
                  : 'Needs work. Critical AEO gaps detected requiring immediate attention.'}
              </p>
            </div>

            {/* Per-Engine Score Cards */}
            <div>
              <h4 className="text-xs font-semibold uppercase text-muted tracking-wider font-display mb-2.5">Per-Engine Scores</h4>
              <div className="flex flex-col gap-2">
                {Object.entries(ENGINE_META).map(([engineId, meta]) => {
                  const score = article.auditScores![engineId as keyof typeof article.auditScores] as number;
                  if (score === undefined) return null;
                  const barWidth = `${score}%`;
                  return (
                    <div key={engineId} className={`flex flex-col gap-1 p-3 rounded-lg border ${meta.borderColor} ${meta.bgColor}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-bold font-mono px-1.5 py-0.5 rounded ${meta.bgColor} ${meta.color} border ${meta.borderColor}`}>
                            {meta.initials}
                          </span>
                          <span className={`text-[11px] font-semibold font-display ${meta.color}`}>{meta.label}</span>
                        </div>
                        <span className={`text-sm font-bold font-display ${meta.color}`}>{score}</span>
                      </div>
                      {/* Score bar */}
                      <div className="h-1 bg-neutral-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: barWidth, backgroundColor: getScoreGaugeColor(score) }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Import Metadata */}
            {(article.wordCount || article.readingTime || article.sourceDomain) && (
              <div className="bg-neutral-900/40 border border-border/30 rounded-xl p-3 flex flex-col gap-2">
                <h4 className="text-[10px] uppercase tracking-wider font-semibold text-muted font-display">Page Metrics</h4>
                <div className="grid grid-cols-2 gap-2">
                  {article.wordCount && (
                    <div className="text-center p-2 bg-neutral-900/60 rounded-lg">
                      <p className="text-lg font-bold text-white font-display">{article.wordCount.toLocaleString()}</p>
                      <p className="text-[9px] text-muted uppercase tracking-wider">Words</p>
                    </div>
                  )}
                  {article.readingTime && (
                    <div className="text-center p-2 bg-neutral-900/60 rounded-lg">
                      <p className="text-lg font-bold text-white font-display">{article.readingTime} min</p>
                      <p className="text-[9px] text-muted uppercase tracking-wider">Read Time</p>
                    </div>
                  )}
                </div>
                {article.sourceDomain && (
                  <div className="flex items-center gap-1.5 text-[10px] text-muted">
                    <Globe className="w-3 h-3 text-accent" />
                    <span className="font-mono truncate">{article.sourceDomain}</span>
                  </div>
                )}
                {article.primaryIntent && (
                  <div className="flex items-center gap-1.5 text-[10px] text-muted">
                    <Target className="w-3 h-3 text-accent" />
                    <span>Intent: <span className="text-white font-semibold">{article.primaryIntent}</span></span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── TAB: AUDIT (legacy + summary) ─────────────────────────────────── */}
        {activeTab === 'auditor' && !isAuditing && !isReauditing && (hasAuditResults || hasImportAudit) && (
          <div className="flex flex-col gap-4">
            {/* Score Card */}
            <div className={`p-4 rounded-xl border text-center ${getScoreColor(hasImportAudit ? article.auditScores!.overall : article.aiScore || 0)}`}>
              <p className="text-[10px] tracking-widest uppercase font-semibold text-muted font-display mb-1">AEO Readiness Grade</p>
              <p className="text-4xl font-bold font-display tracking-tight text-white mb-2">
                {hasImportAudit ? article.auditScores!.overall : article.aiScore}%
              </p>
              <p className="text-xs text-muted leading-relaxed">
                {(hasImportAudit ? article.auditScores!.overall : article.aiScore || 0) >= 80
                  ? 'Excellent structure. High probability of search catalog priority.'
                  : (hasImportAudit ? article.auditScores!.overall : article.aiScore || 0) >= 60
                  ? 'Moderate alignment. Minor restructurings can secure index rankings.'
                  : 'Severe semantic gaps detected. Optimization highly recommended.'}
              </p>
            </div>

            {/* Suggestions */}
            <div>
              <h4 className="text-xs font-semibold uppercase text-muted tracking-wider font-display mb-2.5">Analysis Suggestions</h4>
              {article.suggestions && article.suggestions.length > 0 ? (
                <div className="flex flex-col gap-2.5">
                  {article.suggestions.map((sug, idx) => (
                    <div key={idx} className="glass p-3 rounded-lg border border-border/40 flex items-start gap-2.5">
                      <div className="mt-0.5 shrink-0">{getSeverityBadge(sug.severity)}</div>
                      <div>
                        <p className="text-xs font-semibold text-white font-display mb-0.5">{sug.type}</p>
                        <p className="text-[11px] text-muted leading-normal">{sug.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 text-emerald-400 rounded-lg flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span className="text-xs font-medium">No critical errors detected. Perfect structure!</span>
                </div>
              )}
            </div>

            {/* Visibility / Confidence */}
            <div className="glass-card p-4 rounded-xl border border-border/60 flex items-center justify-between">
              <div>
                <p className="text-[10px] tracking-wider uppercase font-semibold text-muted font-display mb-0.5">Visibility Index</p>
                <p className="text-2xl font-bold text-white font-display">{article.visibilityScore}%</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] tracking-wider uppercase font-semibold text-muted font-display mb-0.5">Confidence</p>
                <p className="text-lg font-bold text-accent font-display">
                  {article.confidenceScore ? `${Math.round(article.confidenceScore * 100)}%` : '--'}
                </p>
              </div>
            </div>

            {/* Gap Analysis */}
            {article.gapAnalysis && (
              <div className="flex flex-col gap-3">
                {article.gapAnalysis.missingKeywords !== undefined && (
                  <div>
                    <h4 className="text-[10px] font-semibold uppercase text-muted tracking-wider font-display mb-2 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      Missing Keywords
                    </h4>
                    {article.gapAnalysis.missingKeywords.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {article.gapAnalysis.missingKeywords.map((kw, idx) => (
                          <Badge key={idx} variant="warning">{kw}</Badge>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 p-2 bg-emerald-500/5 border border-emerald-500/20 rounded-lg text-[11px] text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>No important keyword gaps detected — key terms are well-represented in your headings and title.</span>
                      </div>
                    )}
                  </div>
                )}
                {article.gapAnalysis.missingTopics && article.gapAnalysis.missingTopics.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-semibold uppercase text-muted tracking-wider font-display mb-2 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-indigo-400" />
                      Missing Topics
                    </h4>
                    <ul className="flex flex-col gap-1.5">
                      {article.gapAnalysis.missingTopics.map((topic, idx) => (
                        <li key={idx} className="text-[11px] text-muted bg-neutral-900/40 p-2 rounded-lg border border-border/20">{topic}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── TAB: OPTIMIZER PANELS ─────────────────────────────────────────── */}
        {activeTab === 'optimizer' && !isAuditing && !isReauditing && hasImportAudit && (
          <div className="flex flex-col gap-2">
            {article.optimizerData!.panels.map(panel => {
              const isExpanded = expandedPanel === panel.panelId;
              const criticalCount = panel.issues.filter(i => i.severity === 'critical').length;
              const highCount = panel.issues.filter(i => i.severity === 'high').length;
              const totalIssues = panel.issues.length;

              return (
                <div key={panel.panelId} className="bg-neutral-900/40 border border-border/30 rounded-xl overflow-hidden">
                  {/* Panel Header */}
                  <button
                    className="w-full flex items-center gap-3 p-3 hover:bg-neutral-800/30 transition text-left"
                    onClick={() => setExpandedPanel(isExpanded ? null : panel.panelId)}
                  >
                    <span className={`text-accent ${panel.score >= 80 ? '!text-emerald-400' : panel.score >= 60 ? '!text-amber-400' : '!text-red-400'}`}>
                      {PANEL_ICONS[panel.panelId] || <Target className="w-3.5 h-3.5" />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white font-display">{panel.label}</span>
                        <span className={`text-sm font-bold font-display ${panel.score >= 80 ? 'text-emerald-400' : panel.score >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
                          {panel.score}
                        </span>
                      </div>
                      {/* Mini progress bar */}
                      <div className="mt-1 h-1 bg-neutral-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${panel.score}%`, backgroundColor: getScoreGaugeColor(panel.score) }}
                        />
                      </div>
                    </div>
                    {totalIssues > 0 && (
                      <div className="flex items-center gap-1 shrink-0">
                        {criticalCount > 0 && <span className="text-[9px] bg-red-500/20 text-red-400 border border-red-500/30 rounded px-1 py-0.5 font-bold">{criticalCount}</span>}
                        {highCount > 0 && <span className="text-[9px] bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded px-1 py-0.5 font-bold">{highCount}</span>}
                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-muted" /> : <ChevronRight className="w-3.5 h-3.5 text-muted" />}
                      </div>
                    )}
                    {totalIssues === 0 && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    )}
                  </button>

                  {/* Expanded Issues */}
                  {isExpanded && (
                    <div className="border-t border-border/20 p-3 flex flex-col gap-2">
                      {panel.issues.length === 0 ? (
                        <div className="flex items-center gap-2 text-emerald-400 text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{panel.summary}</span>
                        </div>
                      ) : (
                        panel.issues.map((issue, issueIdx) => {
                          const style = getSeverityStyle(issue.severity);
                          const issueKey = `${panel.panelId}-${issueIdx}`;
                          const isIssueExpanded = expandedIssue === issueKey;

                          return (
                            <div key={issueIdx} className="bg-neutral-950/40 border border-border/20 rounded-lg overflow-hidden">
                              <button
                                className="w-full flex items-start gap-2.5 p-2.5 hover:bg-neutral-800/20 transition text-left"
                                onClick={() => setExpandedIssue(isIssueExpanded ? null : issueKey)}
                              >
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${style.badge} shrink-0 mt-0.5 uppercase tracking-wider`}>
                                  {issue.severity}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[11px] font-semibold text-white leading-tight">{issue.title}</p>
                                  <p className="text-[10px] text-muted mt-0.5 leading-normal line-clamp-2">{issue.description}</p>
                                </div>
                                {isIssueExpanded ? <ChevronDown className="w-3 h-3 text-muted shrink-0 mt-1" /> : <ChevronRight className="w-3 h-3 text-muted shrink-0 mt-1" />}
                              </button>

                              {isIssueExpanded && (
                                <div className="border-t border-border/20 p-2.5 flex flex-col gap-2.5 bg-neutral-950/20">
                                  <div>
                                    <p className="text-[9px] uppercase tracking-wider font-semibold text-accent font-display mb-1">Recommendation</p>
                                    <p className="text-[10px] text-muted leading-relaxed">{issue.recommendation}</p>
                                  </div>
                                  <div>
                                    <p className="text-[9px] uppercase tracking-wider font-semibold text-amber-400/80 font-display mb-1">Why It Matters</p>
                                    <p className="text-[10px] text-muted leading-relaxed">{issue.whyItMatters}</p>
                                  </div>
                                  <div className="bg-neutral-900/60 border border-border/20 rounded-lg p-2">
                                    <p className="text-[9px] uppercase tracking-wider font-semibold text-purple-400/80 font-display mb-1">AI Interpretation</p>
                                    <p className="text-[10px] text-muted/80 leading-relaxed italic">{issue.aiInterpretation}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Optimizer tab for non-imported articles */}
        {activeTab === 'optimizer' && !isAuditing && !isReauditing && !hasImportAudit && hasAuditResults && (
          <div className="flex flex-col gap-3">
            {/* Recommendations */}
            <div>
              <h4 className="text-xs font-semibold uppercase text-muted tracking-wider font-display mb-2.5">Recommendations</h4>
              {article.recommendations && article.recommendations.length > 0 ? (
                <ul className="flex flex-col gap-2">
                  {article.recommendations.map((rec, idx) => (
                    <li key={idx} className="flex gap-2.5 items-start text-[11px] leading-relaxed text-muted bg-neutral-900/40 p-2.5 rounded-lg border border-border/20">
                      <span className="text-accent font-bold font-display">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted">No recommendations available. Run an audit first.</p>
              )}
            </div>
          </div>
        )}

        {/* ── TAB: REWRITER ─────────────────────────────────────────────────── */}
        {activeTab === 'rewriter' && !isAuditing && !isReauditing && (
          <div className="flex flex-col gap-4">
            <div>
              <h4 className="text-xs font-semibold uppercase text-muted tracking-wider font-display mb-1 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-indigo-400" />
                <span>One-Click AI Rewrites</span>
              </h4>
              <p className="text-[10px] text-muted mb-3 leading-normal">
                LLM-guided rewrites optimized specifically for AI search engines.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 shrink-0">
              {([
                { action: 'HEADINGS', label: 'Optimize Headings' },
                { action: 'READABILITY', label: 'Improve Readability' },
                { action: 'INTRO', label: 'AEO Introduction' },
                { action: 'CONCLUSION', label: 'AEO Conclusion' },
              ] as const).map(({ action, label }) => (
                <Button
                  key={action}
                  size="sm"
                  variant="secondary"
                  loading={isOptimizing}
                  className="text-[11px] font-display"
                  onClick={() => onOptimize(action)}
                >
                  {label}
                </Button>
              ))}
              <Button
                size="sm"
                variant="secondary"
                loading={isOptimizing}
                className="text-[11px] font-display col-span-2"
                onClick={() => onOptimize('FAQ')}
              >
                Generate FAQ Section
              </Button>
            </div>

            {/* Preview Draft */}
            {isOptimizing ? (
              <div className="flex flex-col gap-2.5 mt-2">
                <Skeleton className="h-32 w-full animate-pulse" />
              </div>
            ) : optimizedDraft ? (
              <div className="mt-2 flex flex-col gap-3">
                <div className="flex items-center justify-between shrink-0">
                  <span className="text-[10px] text-accent uppercase font-bold tracking-wider font-display">Optimized Suggestion</span>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => onApplyOptimization(optimizedDraft)}
                    className="text-xs h-7 px-2 bg-emerald-600 hover:bg-emerald-700"
                  >
                    Apply to Editor
                  </Button>
                </div>
                <div className="bg-neutral-900/80 p-3 rounded-lg border border-border/80 text-[11px] max-h-48 overflow-y-auto font-mono leading-relaxed whitespace-pre-wrap">
                  {optimizedDraft}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
      {/* Rewrite Content Sticky Button */}
      {!isAuditing && !isReauditing && (hasAuditResults || hasImportAudit) && (
        <div className="p-4 border-t border-border/40 bg-neutral-950/60 shrink-0 select-none">
          <Button
            onClick={() => navigate('/rewrite')}
            className="w-full text-xs font-bold py-2.5 font-display shadow-md shadow-indigo-500/10 flex items-center justify-center gap-1.5 !text-neutral-950"
            variant="primary"
          >
            <Sparkles className="w-4 h-4 animate-pulse !text-neutral-950" />
            <span>Rewrite Your Content</span>
          </Button>
        </div>
      )}
    </div>
  );
};
