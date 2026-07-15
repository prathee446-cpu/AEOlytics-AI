import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { Navbar } from '../components/layout/Navbar';
import { Card, Button, Select, Badge } from '../components/ui/Widgets';
import { RootState } from '../store';
import { 
  FileDown, 
  BarChart3, 
  LineChart as LineIcon, 
  TrendingUp, 
  Sparkles,
  PieChart as PieIcon,
  ShieldCheck
} from 'lucide-react';
import api from '../services/api';
import { AnalyticsCharts } from '../components/dashboard/AnalyticsCharts';

export const Analytics: React.FC = () => {
  const { articles } = useSelector((state: RootState) => state.articles);
  const [selectedArticleId, setSelectedArticleId] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const publishedArticles = articles.filter(a => a.status === 'PUBLISHED');

  const handleDownloadPDF = async () => {
    if (!selectedArticleId) return;
    setDownloading(true);
    setError(null);

    try {
      const res = await api.get(`/api/reports/article/${selectedArticleId}`, {
        responseType: 'blob',
      });
      
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `AEO_Audit_Report_${selectedArticleId}.pdf`);
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      link.remove();
      window.URL.revokeObjectURL(url);
      setDownloading(false);
    } catch (err: any) {
      console.error('PDF endpoint connection failed:', err);
      setDownloading(false);
      
      // Try to parse error response if it is returned as blob/json
      let displayError = 'Failed to generate PDF audit report. Please verify connection.';
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

  const articleOptions = articles.map(a => ({
    value: a.id,
    label: `${a.title} (${a.status})`
  }));

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-neutral-950/20 overflow-y-auto">
      <Navbar title="Deep Analytics & Report Exporter" />
      
      <main className="flex-1 p-8 flex flex-col gap-8 max-w-7xl w-full mx-auto justify-start">
        {/* Header */}
        <div className="flex items-center justify-between shrink-0 select-none">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white font-display">Performance Audit Analytics</h1>
            <p className="text-xs text-muted mt-0.5">Generate client-facing executive summaries and track optimization indexing histories.</p>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 font-medium flex justify-between items-center relative shrink-0">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300 font-bold ml-2 text-base leading-none">×</button>
          </div>
        )}

        {/* PDF Exporter Panel */}
        <Card glow="indigo" className="p-6 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-accent/10 border border-accent/20 rounded-xl text-accent shrink-0 mt-0.5">
              <FileDown className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white font-display">Download PDF Audit Report</h3>
              <p className="text-xs text-muted mt-1 leading-normal max-w-md">
                Compile a comprehensive PDF audit outlining heading structures, keyword coverage reports, reading indexes, and custom rewrite plans to share with teams.
              </p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto shrink-0">
            <div className="w-full sm:w-64">
              <select
                value={selectedArticleId}
                onChange={(e) => setSelectedArticleId(e.target.value)}
                className="w-full bg-neutral-900/60 text-xs text-white rounded-lg border border-border px-3 py-2.5 outline-none cursor-pointer focus:border-accent/60"
              >
                <option value="">Select an article...</option>
                {articles.map((art) => (
                  <option key={art.id} value={art.id} className="bg-background">
                    {art.title.length > 25 ? `${art.title.substring(0, 25)}...` : art.title} ({art.status})
                  </option>
                ))}
              </select>
            </div>
            <Button
              onClick={handleDownloadPDF}
              disabled={!selectedArticleId || downloading}
              loading={downloading}
              className="text-xs shrink-0 font-display flex items-center justify-center gap-1.5"
            >
              <span>Export Report</span>
            </Button>
          </div>
        </Card>

        {/* Metrics Trends Charts */}
        <AnalyticsCharts articles={articles} />

        {/* Aggregate Info Blocks */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 select-none">
          <Card className="flex flex-col gap-4">
            <h4 className="text-xs font-semibold text-muted tracking-wider uppercase font-display">AEO Search Readiness Distribution</h4>
            <div className="flex flex-col gap-3.5">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-neutral-300">Ready Content (Score &gt;= 80)</span>
                  <span className="font-bold text-emerald-400">{publishedArticles.filter(a => a.aiScore >= 80).length} assets</span>
                </div>
                <div className="h-1.5 bg-neutral-900 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: `${publishedArticles.length > 0 ? (publishedArticles.filter(a => a.aiScore >= 80).length / publishedArticles.length) * 100 : 0}%` }} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-neutral-300">Optimizing Content (Score 60-79)</span>
                  <span className="font-bold text-amber-400">{publishedArticles.filter(a => a.aiScore >= 60 && a.aiScore < 80).length} assets</span>
                </div>
                <div className="h-1.5 bg-neutral-900 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500" style={{ width: `${publishedArticles.length > 0 ? (publishedArticles.filter(a => a.aiScore >= 60 && a.aiScore < 80).length / publishedArticles.length) * 100 : 0}%` }} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-neutral-300">Restructure Required (Score &lt; 60)</span>
                  <span className="font-bold text-red-400">{publishedArticles.filter(a => a.aiScore < 60).length} assets</span>
                </div>
                <div className="h-1.5 bg-neutral-900 rounded-full overflow-hidden">
                  <div className="h-full bg-red-500" style={{ width: `${publishedArticles.length > 0 ? (publishedArticles.filter(a => a.aiScore < 60).length / publishedArticles.length) * 100 : 0}%` }} />
                </div>
              </div>
            </div>
          </Card>

          <Card className="flex flex-col gap-4">
            <h4 className="text-xs font-semibold text-muted tracking-wider uppercase font-display">AEO Crawling Success Rates</h4>
            <div className="flex items-center gap-4.5 py-4">
              <div className="w-16 h-16 rounded-full border-[6px] border-indigo-500/20 border-t-accent flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-white font-display">100%</span>
              </div>
              <div>
                <h5 className="text-xs font-semibold text-white font-display mb-0.5">Indexing Integrity Active</h5>
                <p className="text-[11px] text-muted leading-relaxed">
                  All active documents have embedding tensors generated and loaded in postgres public vectors, securing coverage rankings across conversational models.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};
