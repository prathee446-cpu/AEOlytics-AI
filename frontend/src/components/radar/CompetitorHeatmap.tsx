import React from 'react';
import { motion } from 'framer-motion';

interface HeatmapData {
  domain: string;
  chatgpt: number;
  gemini: number;
  claude: number;
  perplexity: number;
}

interface Props {
  data: HeatmapData[];
}

export const CompetitorHeatmap: React.FC<Props> = ({ data }) => {
  const engines = ['chatgpt', 'gemini', 'claude', 'perplexity'];
  
  const getColor = (value: number) => {
    if (value === 0) return 'bg-slate-800/50';
    if (value < 3) return 'bg-indigo-900/40';
    if (value < 6) return 'bg-indigo-600/60';
    if (value < 10) return 'bg-indigo-500/80';
    return 'bg-indigo-400';
  };

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead>
          <tr>
            <th className="py-3 px-4 font-medium text-slate-400">Competitor</th>
            {engines.map(e => (
              <th key={e} className="py-3 px-4 font-medium text-slate-400 text-center capitalize">{e}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <motion.tr 
              key={row.domain}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="border-b border-slate-700/30"
            >
              <td className="py-3 px-4 font-medium text-slate-200">{row.domain}</td>
              {engines.map(engine => {
                const val = row[engine as keyof HeatmapData] as number || 0;
                return (
                  <td key={engine} className="py-2 px-2 text-center">
                    <div className="flex justify-center">
                      <div 
                        className={`w-12 h-8 rounded flex items-center justify-center font-medium ${getColor(val)}`}
                        title={`${val} mentions on ${engine}`}
                      >
                        {val > 0 ? val : '-'}
                      </div>
                    </div>
                  </td>
                );
              })}
            </motion.tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={5} className="py-8 text-center text-slate-500">
                No competitor data available.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
