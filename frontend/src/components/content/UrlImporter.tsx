import React, { useState, useEffect, useRef } from 'react';
import { Link2, CheckCircle2, XCircle, Loader2, Globe, AlertTriangle, ArrowRight } from 'lucide-react';
import { Button, Input } from '../ui/Widgets';

interface UrlImporterProps {
  onImport: (url: string) => void;
  isImporting: boolean;
  importStatus: string;
  importProgress: string;
  importError: string | null;
}

const PROGRESS_STEPS = [
  { id: 'validating',  label: 'Validating URL…',          icon: '🔍' },
  { id: 'crawling',    label: 'Fetching HTML…',            icon: '🌐' },
  { id: 'extracting', label: 'Extracting Metadata…',      icon: '📊' },
  { id: 'generating', label: 'Generating Markdown…',      icon: '📝' },
  { id: 'auditing',   label: 'Running AI Audit…',         icon: '🤖' },
  { id: 'saving',     label: 'Saving to Library…',        icon: '💾' },
  { id: 'done',       label: 'Import Completed ✓',        icon: '✅' },
];

export const UrlImporter: React.FC<UrlImporterProps> = ({
  onImport,
  isImporting,
  importStatus,
  importProgress,
  importError,
}) => {
  const [url, setUrl] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [animStep, setAnimStep] = useState(0);
  const [showProgress, setShowProgress] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Animate progress steps while importing
  useEffect(() => {
    if (isImporting) {
      setShowProgress(true);
      setAnimStep(0);
      intervalRef.current = setInterval(() => {
        setAnimStep(prev => {
          const next = prev + 1;
          if (next >= PROGRESS_STEPS.length - 1) {
            if (intervalRef.current) clearInterval(intervalRef.current);
          }
          return Math.min(next, PROGRESS_STEPS.length - 2);
        });
      }, 1800);
    } else {
      if (importStatus === 'done') {
        setAnimStep(PROGRESS_STEPS.length - 1);
        setTimeout(() => setShowProgress(false), 2000);
      } else if (importStatus === 'error') {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setShowProgress(false);
      } else if (importStatus === 'idle') {
        setShowProgress(false);
        setAnimStep(0);
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isImporting, importStatus]);

  const validateUrlFormat = (value: string): boolean => {
    try {
      const u = new URL(value.trim());
      if (!['http:', 'https:'].includes(u.protocol)) {
        setUrlError('URL must start with http:// or https://');
        return false;
      }
      setUrlError(null);
      return true;
    } catch {
      setUrlError('Invalid URL. Example: https://example.com/article');
      return false;
    }
  };

  const handleImport = () => {
    if (!url.trim()) {
      setUrlError('Please enter a URL to import');
      return;
    }
    if (!validateUrlFormat(url)) return;
    onImport(url.trim());
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setUrl(val);
    if (urlError && val.trim()) {
      try { new URL(val.trim()); setUrlError(null); } catch {}
    }
  };

  const currentStep = importStatus === 'done' ? PROGRESS_STEPS.length - 1
    : importStatus === 'error' ? -1
    : animStep;

  return (
    <div className="shrink-0 bg-neutral-950/30 border border-border/50 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/30 bg-neutral-950/50 flex items-center gap-2">
        <Link2 className="w-3.5 h-3.5 text-accent" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted font-display">
          Import Existing URL
        </span>
      </div>

      <div className="p-4 flex flex-col gap-3">
        {/* URL Input */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="url"
              value={url}
              onChange={handleUrlChange}
              onKeyDown={(e) => { if (e.key === 'Enter' && !isImporting) { e.preventDefault(); handleImport(); } }}
              placeholder="Paste any live webpage URL…"
              disabled={isImporting}
              className={`w-full bg-neutral-900/60 border rounded-lg px-3 py-2 text-sm text-white placeholder:text-neutral-600 outline-none transition focus:border-accent/60 disabled:opacity-50 disabled:cursor-not-allowed ${urlError ? 'border-red-500/60' : 'border-border/50'}`}
            />
            {url && !urlError && !isImporting && (
              <Globe className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-emerald-500" />
            )}
          </div>
          <Button
            type="button"
            size="sm"
            variant="primary"
            disabled={isImporting || !url.trim()}
            loading={isImporting}
            onClick={handleImport}
            className="shrink-0 text-xs px-4 font-display font-semibold flex items-center gap-1.5"
          >
            {!isImporting && <ArrowRight className="w-3.5 h-3.5" />}
            Import & Audit
          </Button>
        </div>

        {/* URL Error */}
        {urlError && (
          <div className="flex items-center gap-1.5 text-red-400 text-[11px]">
            <XCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{urlError}</span>
          </div>
        )}

        {/* Import Error */}
        {importError && !isImporting && importStatus === 'error' && (
          <div className="bg-red-500/8 border border-red-500/20 rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] font-semibold text-red-400">Import Failed</p>
              <p className="text-[11px] text-red-400/70 mt-0.5 leading-relaxed">{importError}</p>
            </div>
          </div>
        )}

        {/* Progress Steps */}
        {showProgress && (
          <div className="bg-neutral-900/60 border border-border/30 rounded-lg p-3 flex flex-col gap-1.5">
            {PROGRESS_STEPS.map((step, idx) => {
              const isDone = idx < currentStep;
              const isCurrent = idx === currentStep;
              const isPending = idx > currentStep;

              return (
                <div
                  key={step.id}
                  className={`flex items-center gap-2.5 py-1 transition-all duration-300 ${
                    isCurrent ? 'opacity-100' : isDone ? 'opacity-60' : 'opacity-25'
                  }`}
                >
                  <div className="w-5 h-5 shrink-0 flex items-center justify-center">
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : isCurrent ? (
                      importStatus === 'done' && idx === PROGRESS_STEPS.length - 1 ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Loader2 className="w-4 h-4 text-accent animate-spin" />
                      )
                    ) : (
                      <div className="w-3 h-3 rounded-full border border-neutral-600" />
                    )}
                  </div>
                  <span className={`text-[11px] font-medium font-display ${
                    isCurrent ? 'text-white' : isDone ? 'text-emerald-400' : 'text-muted'
                  }`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Hint text */}
        {!showProgress && !importError && (
          <p className="text-[10px] text-neutral-600 leading-relaxed">
            Paste any public webpage URL. The crawler will extract content, generate markdown, and run a full AEO audit automatically.
          </p>
        )}
      </div>
    </div>
  );
};
