import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Globe, 
  Search, 
  ArrowRightLeft, 
  ShieldCheck, 
  Zap, 
  AlertTriangle, 
  CheckCircle2, 
  Download, 
  Sparkles, 
  TrendingUp, 
  ChevronRight, 
  FileText,
  AlertCircle,
  HelpCircle,
  Link2,
  ExternalLink,
  Smartphone,
  Gauge,
  Eye,
  Info
} from 'lucide-react';
import api from '../services/api';

interface MetricDetail {
  label: string;
  you: number;
  competitor: number;
  format: 'score' | 'number' | 'boolean';
}

interface ComparisonResult {
  id: string;
  domain1: string;
  domain2: string;
  url1: string;
  url2: string;
  winnerSummary: {
    overall: string;
    visibility: string;
    aeo: string;
    seo: string;
    content: string;
  };
  metrics: Record<string, MetricDetail>;
  gapAnalysis: {
    issues: string[];
    entities1: {
      brands: string[];
      locations: string[];
      people: string[];
      organizations: string[];
      products: string[];
      services: string[];
    };
    entities2: {
      brands: string[];
      locations: string[];
      people: string[];
      organizations: string[];
      products: string[];
      services: string[];
    };
    missingKeywords: string[];
  };
  recommendations: string[];
  crawledAt: string;
}

export const VisibilityCompare: React.FC = () => {
  const [url1, setUrl1] = useState('');
  const [url2, setUrl2] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [history, setHistory] = useState<ComparisonResult[]>([]);
  const [activeTab, setActiveTab] = useState<'metrics' | 'gaps' | 'entities' | 'recs'>('metrics');

  const loadingSteps = [
    'Validating target URLs and protocols...',
    'Launching Playwright headless crawler...',
    'Crawling your website pages in real-time...',
    'Crawling competitor page structures...',
    'Parsing schema JSON-LD, metatags, and structure...',
    'Auditing semantic entity densities and topical coverage...',
    'Generating comparative visibility readiness scores...',
    'Assembling recommendations and gap insights...'
  ];

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    let interval: number;
    if (loading) {
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep(prev => (prev < loadingSteps.length - 1 ? prev + 1 : prev));
      }, 3000) as any;
    }
    return () => clearInterval(interval);
  }, [loading]);

  const fetchHistory = async () => {
    try {
      const res = await api.get('/api/compare/history');
      setHistory(res?.data?.history || []);
    } catch (e) {
      console.error('Failed to fetch history', e);
    }
  };

  const handleCompare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url1.trim() || !url2.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await api.post('/api/compare/run', {
        url1: url1.trim(),
        url2: url2.trim()
      });
      if (res?.data) {
        setResult(res.data);
        fetchHistory();
      } else {
        setError('No data returned from comparison analysis.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Comparison failed. Check URLs and try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadFromHistory = (item: ComparisonResult) => {
    setResult(item);
    setUrl1(item.url1);
    setUrl2(item.url2);
    setError(null);
  };

  const handleExportCSV = () => {
    if (!result) return;
    let csv = '\uFEFF'; // Excel UTF-8 BOM
    csv += 'Visibility Compare Report\n';
    csv += `Generated At,${new Date(result.crawledAt).toLocaleString()}\n`;
    csv += `Your Website URL,${result.url1}\n`;
    csv += `Competitor Website URL,${result.url2}\n\n`;

    csv += 'CATEGORY WINNERS\n';
    csv += `Overall Winner,${result.winnerSummary.overall}\n`;
    csv += `AI Visibility Winner,${result.winnerSummary.visibility}\n`;
    csv += `AEO Winner,${result.winnerSummary.aeo}\n`;
    csv += `SEO Winner,${result.winnerSummary.seo}\n`;
    csv += `Content Winner,${result.winnerSummary.content}\n\n`;

    csv += 'COMPARISON METRICS\n';
    csv += 'Metric,Your Website,Competitor Website\n';
    Object.values(result.metrics).forEach((m: any) => {
      let youVal = m.you;
      let compVal = m.competitor;
      if (m.format === 'score') {
        youVal = `${m.you}%`;
        compVal = `${m.competitor}%`;
      } else if (m.format === 'boolean') {
        youVal = m.you > 0 ? 'Yes' : 'No';
        compVal = m.competitor > 0 ? 'Yes' : 'No';
      }
      csv += `"${m.label}","${youVal}","${compVal}"\n`;
    });

    csv += '\nAI GAP ANALYSIS\n';
    result.gapAnalysis.issues.forEach(issue => {
      csv += `"${issue.replace(/"/g, '""')}"\n`;
    });

    csv += '\nAI RECOMMENDATIONS (FOR YOUR WEBSITE)\n';
    result.recommendations.forEach((rec, idx) => {
      csv += `"${idx + 1}. ${rec.replace(/"/g, '""')}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Visibility_Compare_${result.domain1}_vs_${result.domain2}.csv`);
    link.click();
  };

  const handleExportPDF = () => {
    if (!result) return;
    const doc = new jsPDF({ format: 'a4', unit: 'pt' });
    let currentY = 50;
    const margin = 50;
    const pageWidth = doc.internal.pageSize.getWidth();
    const contentWidth = pageWidth - margin * 2;

    const checkPageBreak = (heightNeeded: number) => {
      if (currentY + heightNeeded > 750) {
        doc.addPage();
        currentY = 50;
        return true;
      }
      return false;
    };

    // --- Page 1: Cover Page ---
    doc.setFillColor(30, 27, 75); // #1e1b4b
    doc.circle(pageWidth, 0, 200, 'F');
    doc.setFillColor(79, 70, 229); // #4f46e5
    doc.circle(100, 240, 15, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('A', 95, 245);
    
    doc.setTextColor(30, 27, 75);
    doc.setFontSize(22);
    doc.text('AEOlytics', 125, 246);
    
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('ENTERPRISE AI SEARCH INTELLIGENCE', 125, 258);

    doc.setTextColor(30, 27, 75);
    doc.setFontSize(32);
    doc.setFont('helvetica', 'bold');
    doc.text('AI Visibility Report', 100, 340);
    
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Real-Time Competitor Analysis & Search Catalog Audit', 100, 370);

    doc.setDrawColor(129, 140, 248);
    doc.setLineWidth(1.5);
    doc.line(100, 400, contentWidth + 50, 400);

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(1);
    doc.roundedRect(100, 500, contentWidth - 50, 120, 10, 10, 'FD');

    doc.setTextColor(30, 27, 75);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('COMPARISON DETAILS', 120, 520);
    
    doc.setTextColor(51, 65, 85);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Your Website:', 120, 545);
    doc.setTextColor(30, 27, 75);
    doc.setFont('helvetica', 'bold');
    const u1 = result.url1 || '';
    doc.text(u1.length > 50 ? u1.substring(0, 50) + '...' : u1, 220, 545);

    doc.setTextColor(51, 65, 85);
    doc.setFont('helvetica', 'normal');
    doc.text('Competitor:', 120, 565);
    doc.setTextColor(30, 27, 75);
    doc.setFont('helvetica', 'bold');
    const u2 = result.url2 || '';
    doc.text(u2.length > 50 ? u2.substring(0, 50) + '...' : u2, 220, 565);

    doc.setTextColor(51, 65, 85);
    doc.setFont('helvetica', 'normal');
    doc.text('Generated Date:', 120, 585);
    doc.setTextColor(30, 27, 75);
    doc.setFont('helvetica', 'bold');
    doc.text(new Date(result.crawledAt).toLocaleString(), 220, 585);

    // --- Page 2: Executive Summary ---
    doc.addPage();
    currentY = 50;
    
    doc.setTextColor(30, 27, 75);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Executive Summary', margin, currentY);
    currentY += 15;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(1);
    doc.line(margin, currentY, margin + contentWidth, currentY);
    currentY += 25;

    // Draw Winner Cards
    const winners = [
      { label: 'Overall Winner', val: result.winnerSummary.overall },
      { label: 'Visibility Winner', val: result.winnerSummary.visibility },
      { label: 'AEO Winner', val: result.winnerSummary.aeo },
      { label: 'SEO Winner', val: result.winnerSummary.seo }
    ];

    winners.forEach((w, idx) => {
      if (idx % 2 === 0 && idx > 0) currentY += 75;
      const x = margin + (idx % 2) * ((contentWidth / 2) + 10);
      const wWidth = (contentWidth / 2) - 10;
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(x, currentY, wWidth, 60, 6, 6, 'FD');
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(w.label.toUpperCase(), x + 15, currentY + 20);
      doc.setTextColor(30, 27, 75);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(w.val.substring(0, 30) + (w.val.length > 30 ? '...' : ''), x + 15, currentY + 40);
    });
    currentY += 90;

    // --- Metrics Grid ---
    doc.setTextColor(30, 27, 75);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Comparison Metrics', margin, currentY);
    currentY += 20;

    const metrics = Object.values(result.metrics);
    metrics.forEach((m: any) => {
      checkPageBreak(50);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(margin, currentY, contentWidth, 40, 4, 4, 'FD');
      
      doc.setTextColor(30, 27, 75);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(m.label, margin + 15, currentY + 22);

      let yVal = m.you;
      let cVal = m.competitor;
      if (m.format === 'score') { yVal += '%'; cVal += '%'; }
      if (m.format === 'boolean') { yVal = m.you > 0 ? 'Yes' : 'No'; cVal = m.competitor > 0 ? 'Yes' : 'No'; }

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('You:', margin + 250, currentY + 22);
      doc.setTextColor(16, 185, 129); // emerald
      doc.setFont('helvetica', 'bold');
      doc.text(String(yVal), margin + 275, currentY + 22);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Competitor:', margin + 350, currentY + 22);
      doc.setTextColor(239, 68, 68); // red
      doc.setFont('helvetica', 'bold');
      doc.text(String(cVal), margin + 410, currentY + 22);

      currentY += 50;
    });

    currentY += 20;
    checkPageBreak(50);
    
    // --- Page 3+: AI Gap Analysis ---
    doc.setTextColor(30, 27, 75);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('AI Gap Analysis', margin, currentY);
    currentY += 20;

    result.gapAnalysis.issues.forEach((issue) => {
      checkPageBreak(40);
      doc.setFillColor(254, 242, 242);
      doc.setDrawColor(254, 226, 226);
      doc.roundedRect(margin, currentY, contentWidth, 30, 4, 4, 'FD');
      doc.setTextColor(239, 68, 68);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('[GAP]', margin + 10, currentY + 18);
      doc.setTextColor(30, 27, 75);
      doc.setFont('helvetica', 'normal');
      doc.text(issue.substring(0, 95) + (issue.length > 95 ? '...' : ''), margin + 45, currentY + 18);
      currentY += 40;
    });

    currentY += 20;
    checkPageBreak(50);

    // --- Actionable Recommendations ---
    doc.setTextColor(30, 27, 75);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Strategic Recommendations', margin, currentY);
    currentY += 20;

    result.recommendations.forEach((rec, idx) => {
      checkPageBreak(40);
      doc.setTextColor(79, 70, 229);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`${idx + 1}.`, margin, currentY + 18);
      
      doc.setTextColor(51, 65, 85);
      doc.setFont('helvetica', 'normal');
      doc.text(rec.substring(0, 95) + (rec.length > 95 ? '...' : ''), margin + 20, currentY + 18);
      currentY += 30;
    });

    // --- Draw Footers ---
    const totalPages = doc.getNumberOfPages();
    for (let i = 2; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(1);
      doc.line(margin, 780, margin + contentWidth, 780);
      
      doc.setTextColor(148, 163, 184);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('AEOlytics', margin, 795);
      doc.text('AI Visibility Compare', margin + 180, 795);
      doc.text(`Page ${i - 1} of ${totalPages - 1}`, margin + contentWidth - 40, 795);
    }

    doc.save(`Visibility_Compare_${result.domain1}_vs_${result.domain2}.pdf`);
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6 print:bg-white print:text-neutral-900 print:p-0">
      
      {/* Printable Header - hidden screen */}
      <div className="hidden print:block mb-8 border-b border-neutral-300 pb-4">
        <h1 className="text-2xl font-bold text-neutral-800">AEOlytics - Visibility Compare Report</h1>
        <p className="text-xs text-neutral-500 mt-1">Generated: {result ? new Date(result.crawledAt).toLocaleString() : ''}</p>
        <p className="text-sm mt-2"><span className="font-semibold">Your Website:</span> {result?.url1}</p>
        <p className="text-sm"><span className="font-semibold">Competitor Website:</span> {result?.url2}</p>
      </div>

      {/* Main Header - hidden on print */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5 shrink-0 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-accent animate-pulse" />
            <h2 className="text-xl font-bold text-white font-display">AI Visibility Compare</h2>
          </div>
          <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
            Premium real-time analysis matching your content indicators against key competitor metrics.
          </p>
        </div>
        {result && (
          <div className="flex gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/15 bg-white/5 text-xs text-white hover:bg-white/10 transition-colors font-medium"
            >
              <Download className="w-3.5 h-3.5" /> Export Excel
            </button>
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/15 bg-white/5 text-xs text-white hover:bg-white/10 transition-colors font-medium"
            >
              <FileText className="w-3.5 h-3.5" /> Save PDF
            </button>
          </div>
        )}
      </div>

      {/* Inputs Form Container - hidden on print */}
      <div className="grid grid-cols-12 gap-6 print:hidden">
        <div className="col-span-12 lg:col-span-8">
          <div className="bg-white/5 border border-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-accent/5 rounded-full blur-[60px] -mr-16 -mt-16" />
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-5 flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-accent" /> Competitor Comparison Parameters
            </h3>
            
            <form onSubmit={handleCompare} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-neutral-400 font-semibold block">Your Website URL</label>
                  <div className="relative">
                    <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                    <input
                      type="url"
                      required
                      placeholder="https://yourwebsite.com"
                      value={url1}
                      onChange={(e) => setUrl1(e.target.value)}
                      disabled={loading}
                      className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-accent transition-all duration-200"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-neutral-400 font-semibold block">Competitor Website URL</label>
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                    <input
                      type="url"
                      required
                      placeholder="https://competitor.com"
                      value={url2}
                      onChange={(e) => setUrl2(e.target.value)}
                      disabled={loading}
                      className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-accent transition-all duration-200"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-between items-center">
                <span className="text-[10px] text-neutral-500 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-accent" /> Live, non-simulated Playwright crawl.
                </span>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl bg-accent text-neutral-950 text-sm font-semibold hover:bg-accent/90 transition-all duration-200 shadow-md shadow-accent/10 disabled:opacity-50"
                >
                  {loading ? 'Analyzing...' : 'Compare Now'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* History Sidebar - hidden on print */}
        <div className="col-span-12 lg:col-span-4">
          <div className="bg-white/5 border border-white/10 backdrop-blur-lg rounded-2xl p-5 shadow-2xl h-full flex flex-col max-h-[220px] overflow-hidden">
            <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3 flex items-center gap-1.5 shrink-0">
              <TrendingUp className="w-3.5 h-3.5 text-neutral-500" /> Recent Comparisons
            </h3>
            <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
              {history.length === 0 ? (
                <div className="text-neutral-500 text-xs text-center py-8">
                  No comparison history found.
                </div>
              ) : (
                history.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => loadFromHistory(item)}
                    className="w-full text-left p-2.5 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors flex items-center justify-between text-xs"
                  >
                    <div className="truncate pr-2">
                      <span className="text-white font-medium">{item.domain1}</span>
                      <span className="text-neutral-500 mx-1.5 font-mono">vs</span>
                      <span className="text-neutral-400">{item.domain2}</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Loading Steps Overlay - hidden on print */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-neutral-950/80 backdrop-blur-md rounded-2xl p-12 border border-white/10 text-center flex flex-col items-center justify-center min-h-[300px] print:hidden shadow-2xl"
          >
            <div className="relative w-16 h-16 mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-accent/20" />
              <div className="absolute inset-0 rounded-full border-4 border-accent border-t-transparent animate-spin" />
              <div className="absolute inset-2 bg-neutral-950 rounded-full flex items-center justify-center">
                <Globe className="w-5 h-5 text-accent animate-pulse" />
              </div>
            </div>
            
            <h4 className="text-base font-bold text-white mb-2">Analyzing Visibility Gaps</h4>
            <p className="text-sm text-neutral-400 max-w-sm mb-6 h-8">
              {loadingSteps[loadingStep]}
            </p>

            <div className="w-64 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-accent"
                initial={{ width: '0%' }}
                animate={{ width: `${((loadingStep + 1) / loadingSteps.length) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Card - hidden on print */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-start gap-3 print:hidden">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <h5 className="font-semibold text-sm">Analysis Interrupted</h5>
            <p className="text-xs text-red-400/80 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Comparison Results Dashboard */}
      {result && (
        <div className="space-y-6">
          
          {/* Winner Summary Section */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Overall Winner', key: 'overall', icon: Sparkles, color: 'text-yellow-400', bg: 'from-yellow-400/10 to-transparent' },
              { label: 'AI Visibility Winner', key: 'visibility', icon: Eye, color: 'text-indigo-400', bg: 'from-indigo-400/10 to-transparent' },
              { label: 'AEO Winner', key: 'aeo', icon: Zap, color: 'text-purple-400', bg: 'from-purple-400/10 to-transparent' },
              { label: 'SEO Winner', key: 'seo', icon: ShieldCheck, color: 'text-emerald-400', bg: 'from-emerald-400/10 to-transparent' },
              { label: 'Content Winner', key: 'content', icon: FileText, color: 'text-cyan-400', bg: 'from-cyan-400/10 to-transparent' },
            ].map((win, idx) => {
              const WinnerIcon = win.icon;
              const isYou = result.winnerSummary[win.key as keyof typeof result.winnerSummary] === 'Your Website';
              const isTie = result.winnerSummary[win.key as keyof typeof result.winnerSummary] === 'Tie';
              return (
                <div 
                  key={idx} 
                  className={`bg-gradient-to-b ${win.bg} bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col justify-between min-h-[110px] print:bg-white print:border-neutral-300 print:shadow-none shadow-xl`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400">{win.label}</span>
                    <WinnerIcon className={`w-4.5 h-4.5 ${win.color}`} />
                  </div>
                  <div className="mt-4">
                    <p className={`text-sm font-bold truncate ${isTie ? 'text-neutral-400' : isYou ? 'text-emerald-400' : 'text-red-400'}`}>
                      {result.winnerSummary[win.key as keyof typeof result.winnerSummary]}
                    </p>
                    <span className="text-[9px] text-neutral-500 font-medium">
                      {isTie ? 'Identical indicators' : isYou ? 'Your site outperforms' : 'Competitor outperforms'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Gaps / Recs / Metrics switcher - hidden on print */}
          <div className="flex border-b border-white/15 print:hidden">
            {[
              { id: 'metrics', label: 'Metric Analysis' },
              { id: 'gaps', label: 'AI Gap Analysis' },
              { id: 'entities', label: 'Entity Profile' },
              { id: 'recs', label: 'Personalized Recommendations' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-5 py-3 text-xs font-semibold uppercase tracking-wider transition-colors ${
                  activeTab === tab.id 
                    ? 'text-white border-b-2 border-accent bg-white/5' 
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab 1: Detailed Comparison Table */}
          {(activeTab === 'metrics' || true) && (
            <div className={`${activeTab !== 'metrics' ? 'hidden print:block' : 'block'} bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl print:bg-white print:border-neutral-300 print:shadow-none print:p-0`}>
              <div className="flex items-center justify-between mb-5 border-b border-white/10 pb-3 print:border-neutral-300">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider font-display print:text-neutral-800">
                  Compared Performance Matrix
                </h4>
                <div className="flex items-center gap-6 text-xs font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
                    <span className="text-neutral-400 truncate print:text-neutral-600 max-w-[120px]">{result.domain1}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-red-400 rounded-full" />
                    <span className="text-neutral-400 truncate print:text-neutral-600 max-w-[120px]">{result.domain2}</span>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-neutral-400 print:border-neutral-300 print:text-neutral-600">
                      <th className="py-3 font-semibold">Technical Optimization Dimension</th>
                      <th className="py-3 text-center w-36 font-semibold">Your Website</th>
                      <th className="py-3 text-center w-36 font-semibold">Competitor</th>
                      <th className="py-3 text-center w-32 font-semibold">Delta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 print:divide-neutral-200">
                    {Object.entries(result.metrics).map(([key, metric]) => {
                      const diff = metric.you - metric.competitor;
                      const isWinning = diff > 0;
                      const isLosing = diff < 0;
                      
                      let youVal = metric.you.toLocaleString();
                      let compVal = metric.competitor.toLocaleString();
                      let diffVal = diff > 0 ? `+${diff}` : `${diff}`;

                      if (metric.format === 'score') {
                        youVal = `${metric.you}%`;
                        compVal = `${metric.competitor}%`;
                        diffVal = diff > 0 ? `+${diff}%` : `${diff}%`;
                      } else if (metric.format === 'boolean') {
                        youVal = metric.you > 0 ? 'Yes' : 'No';
                        compVal = metric.competitor > 0 ? 'Yes' : 'No';
                        diffVal = diff === 0 ? 'Tie' : isWinning ? 'Winner' : 'Lacking';
                      }

                      return (
                        <tr key={key} className="hover:bg-white/2.5 transition-colors print:hover:bg-transparent">
                          <td className="py-3 font-medium text-white print:text-neutral-800">{metric.label}</td>
                          <td className="py-3 text-center font-mono">
                            <span className={metric.format === 'score' ? (metric.you >= 70 ? 'text-emerald-400' : metric.you >= 40 ? 'text-amber-400' : 'text-red-400') : 'text-neutral-300 print:text-neutral-700'}>
                              {youVal}
                            </span>
                          </td>
                          <td className="py-3 text-center font-mono">
                            <span className={metric.format === 'score' ? (metric.competitor >= 70 ? 'text-emerald-400' : metric.competitor >= 40 ? 'text-amber-400' : 'text-red-400') : 'text-neutral-300 print:text-neutral-700'}>
                              {compVal}
                            </span>
                          </td>
                          <td className="py-3 text-center font-mono">
                            <span className={`font-semibold ${diff === 0 ? 'text-neutral-500' : isWinning ? 'text-emerald-400' : 'text-red-400'}`}>
                              {diff === 0 ? '=' : diffVal}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 2: Gap Analysis */}
          {(activeTab === 'gaps' || true) && (
            <div className={`${activeTab !== 'gaps' ? 'hidden print:block' : 'block'} bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl print:bg-white print:border-neutral-300 print:shadow-none print:p-0 print:mt-8`}>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-5 font-display flex items-center gap-2 print:text-neutral-800 print:border-b print:pb-2 print:border-neutral-300">
                <AlertTriangle className="w-4.5 h-4.5 text-amber-500 print:hidden" /> AI Search Gap Analysis
              </h4>
              <div className="space-y-3">
                {result.gapAnalysis.issues.map((issue, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3.5 rounded-xl bg-white/5 border border-white/5 print:bg-transparent print:border-none print:p-1">
                    <span className="shrink-0 mt-0.5 text-red-400">❌</span>
                    <p className="text-xs text-neutral-300 leading-relaxed print:text-neutral-700">{issue}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 3: Entity Profiling */}
          {(activeTab === 'entities' || true) && (
            <div className={`${activeTab !== 'entities' ? 'hidden print:block' : 'block'} bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl print:bg-white print:border-neutral-300 print:shadow-none print:p-0 print:mt-8`}>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-5 font-display flex items-center gap-2 print:text-neutral-800 print:border-b print:pb-2 print:border-neutral-300">
                <Globe className="w-4.5 h-4.5 text-cyan-400 print:hidden" /> Extracted Entity Analysis
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Your site entities */}
                <div className="bg-black/30 border border-white/5 rounded-xl p-4 print:bg-transparent print:border-neutral-300">
                  <h5 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-3 font-display">
                    Your Web Entities ({result.domain1})
                  </h5>
                  <div className="space-y-4">
                    {[
                      { label: 'Brands', data: result.gapAnalysis.entities1.brands },
                      { label: 'Products', data: result.gapAnalysis.entities1.products },
                      { label: 'Locations', data: result.gapAnalysis.entities1.locations },
                      { label: 'Organizations', data: result.gapAnalysis.entities1.organizations },
                      { label: 'People', data: result.gapAnalysis.entities1.people }
                    ].map((grp, idx) => (
                      <div key={idx} className="space-y-1">
                        <span className="text-[10px] text-neutral-500 font-semibold">{grp.label}</span>
                        <div className="flex flex-wrap gap-1.5">
                          {grp.data.length === 0 ? (
                            <span className="text-[10px] text-neutral-600 italic">None detected</span>
                          ) : (
                            grp.data.map((item, i) => (
                              <span key={i} className="px-2 py-0.5 rounded bg-white/5 border border-white/5 text-[10px] text-neutral-300 font-mono print:border-neutral-200">
                                {item}
                              </span>
                            ))
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Competitor entities */}
                <div className="bg-black/30 border border-white/5 rounded-xl p-4 print:bg-transparent print:border-neutral-300">
                  <h5 className="text-xs font-bold text-red-400 uppercase tracking-wider mb-3 font-display">
                    Competitor Web Entities ({result.domain2})
                  </h5>
                  <div className="space-y-4">
                    {[
                      { label: 'Brands', data: result.gapAnalysis.entities2.brands },
                      { label: 'Products', data: result.gapAnalysis.entities2.products },
                      { label: 'Locations', data: result.gapAnalysis.entities2.locations },
                      { label: 'Organizations', data: result.gapAnalysis.entities2.organizations },
                      { label: 'People', data: result.gapAnalysis.entities2.people }
                    ].map((grp, idx) => (
                      <div key={idx} className="space-y-1">
                        <span className="text-[10px] text-neutral-500 font-semibold">{grp.label}</span>
                        <div className="flex flex-wrap gap-1.5">
                          {grp.data.length === 0 ? (
                            <span className="text-[10px] text-neutral-600 italic">None detected</span>
                          ) : (
                            grp.data.map((item, i) => (
                              <span key={i} className="px-2 py-0.5 rounded bg-white/5 border border-white/5 text-[10px] text-neutral-300 font-mono print:border-neutral-200">
                                {item}
                              </span>
                            ))
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* Tab 4: Recommendations */}
          {(activeTab === 'recs' || true) && (
            <div className={`${activeTab !== 'recs' ? 'hidden print:block' : 'block'} bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl print:bg-white print:border-neutral-300 print:shadow-none print:p-0 print:mt-8`}>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-5 font-display flex items-center gap-2 print:text-neutral-800 print:border-b print:pb-2 print:border-neutral-300">
                <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400 print:hidden" /> Actionable Recommendations
              </h4>
              <div className="space-y-3">
                {result.recommendations.map((rec, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3.5 rounded-xl bg-white/5 border border-white/5 print:bg-transparent print:border-none print:p-1">
                    <span className="shrink-0 text-emerald-400">✓</span>
                    <p className="text-xs text-neutral-300 leading-relaxed print:text-neutral-700">{rec}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
};
