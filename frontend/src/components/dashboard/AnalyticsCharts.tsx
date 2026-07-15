import React from 'react';
import { Card } from '../ui/Widgets';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { Article } from '../../store/slices/articleSlice';

interface AnalyticsChartsProps {
  articles: Article[];
}

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({ articles }) => {
  // Sort articles by date to show trends
  const sortedArticles = [...articles]
    .filter(a => a.status === 'PUBLISHED')
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .slice(-7); // Show last 7 published

  // Formulate data
  const trendData = sortedArticles.map(art => ({
    name: art.title.length > 12 ? `${art.title.substring(0, 12)}...` : art.title,
    'AI Score': art.aiScore,
    'Visibility Score': art.visibilityScore,
  }));

  // Categories count
  const categoryCounts = articles.reduce((acc: Record<string, number>, art) => {
    acc[art.category] = (acc[art.category] || 0) + 1;
    return acc;
  }, {});

  const barData = Object.entries(categoryCounts).map(([cat, count]) => ({
    name: cat,
    'Assets': count,
  })).slice(0, 5);

  // If no published articles, provide mock trend data so the charts are not empty on the first run
  const defaultTrendData = [
    { name: 'Jan', 'AI Score': 65, 'Visibility Score': 45 },
    { name: 'Feb', 'AI Score': 70, 'Visibility Score': 55 },
    { name: 'Mar', 'AI Score': 68, 'Visibility Score': 50 },
    { name: 'Apr', 'AI Score': 80, 'Visibility Score': 65 },
    { name: 'May', 'AI Score': 85, 'Visibility Score': 72 },
    { name: 'Jun', 'AI Score': 92, 'Visibility Score': 85 },
  ];

  const defaultBarData = [
    { name: 'SaaS Guidance', 'Assets': 4 },
    { name: 'Tech Reviews', 'Assets': 3 },
    { name: 'AEO Insights', 'Assets': 6 },
    { name: 'Case Studies', 'Assets': 2 },
    { name: 'Product Updates', 'Assets': 5 },
  ];

  const finalTrendData = trendData.length > 0 ? trendData : defaultTrendData;
  const finalBarData = barData.length > 0 ? barData : defaultBarData;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-neutral-950/95 border border-border px-3 py-2 rounded-lg text-xs flex flex-col gap-1 shadow-2xl">
          <p className="font-semibold text-white mb-1">{label}</p>
          {payload.map((p: any, i: number) => (
            <p key={i} style={{ color: p.color }} className="flex items-center gap-1.5 font-medium">
              <span>{p.name}:</span>
              <span className="text-white">{p.value}%</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Line Chart */}
      <Card className="lg:col-span-2 flex flex-col gap-4">
        <div>
          <h3 className="text-sm font-semibold text-white font-display">Performance Optimization Trends</h3>
          <p className="text-xs text-muted">AEO scores and search visibility trends for published content</p>
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={finalTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--muted)" fontSize={11} tickLine={false} />
              <YAxis stroke="var(--muted)" fontSize={11} domain={[0, 100]} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', color: 'var(--muted)' }} />
              <Line type="monotone" dataKey="AI Score" stroke="#818cf8" strokeWidth={2} dot={{ fill: '#818cf8', r: 4 }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="Visibility Score" stroke="#8b5cf6" strokeWidth={2} dot={{ fill: '#8b5cf6', r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Bar Chart */}
      <Card className="flex flex-col gap-4">
        <div>
          <h3 className="text-sm font-semibold text-white font-display">Category Distribution</h3>
          <p className="text-xs text-muted">Volume of assets categorized across your workspace</p>
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={finalBarData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--muted)" fontSize={10} tickLine={false} />
              <YAxis stroke="var(--muted)" fontSize={11} tickLine={false} allowDecimals={false} />
              <Tooltip cursor={{ fill: 'var(--card-hover)' }} contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '11px', color: 'var(--text-white)' }} />
              <Bar dataKey="Assets" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};
