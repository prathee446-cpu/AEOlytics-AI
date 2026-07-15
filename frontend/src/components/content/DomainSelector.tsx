import React from 'react';
import { Brain } from 'lucide-react';

interface Engine {
  id: string;
  label: string;
  color: string;
  borderColor: string;
  bgColor: string;
  initials: string;
}

const ENGINES: Engine[] = [
  { id: 'chatgpt',    label: 'ChatGPT',         color: 'text-emerald-400',  borderColor: 'border-emerald-500/30', bgColor: 'bg-emerald-500/10',  initials: 'GPT' },
  { id: 'googleAI',  label: 'Google AI',        color: 'text-blue-400',     borderColor: 'border-blue-500/30',    bgColor: 'bg-blue-500/10',     initials: 'G' },
  { id: 'gemini',    label: 'Gemini',           color: 'text-purple-400',   borderColor: 'border-purple-500/30',  bgColor: 'bg-purple-500/10',   initials: 'GEM' },
  { id: 'perplexity',label: 'Perplexity',       color: 'text-cyan-400',     borderColor: 'border-cyan-500/30',    bgColor: 'bg-cyan-500/10',     initials: 'PPX' },
  { id: 'claude',    label: 'Claude',           color: 'text-amber-400',    borderColor: 'border-amber-500/30',   bgColor: 'bg-amber-500/10',    initials: 'CLU' },
  { id: 'copilot',   label: 'MS Copilot',       color: 'text-indigo-400',   borderColor: 'border-indigo-500/30',  bgColor: 'bg-indigo-500/10',   initials: 'COP' },
];

interface DomainSelectorProps {
  selectedDomains: string[];
  onToggle: (id: string) => void;
}

export const DomainSelector: React.FC<DomainSelectorProps> = ({ selectedDomains, onToggle }) => {
  const allSelected = selectedDomains.length === ENGINES.length;

  const handleSelectAll = () => {
    if (allSelected) {
      // Keep at least one selected
      onToggle(ENGINES[0].id);
    } else {
      ENGINES.forEach(e => {
        if (!selectedDomains.includes(e.id)) onToggle(e.id);
      });
    }
  };

  return (
    <div className="shrink-0 bg-neutral-950/20 border border-border/40 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-border/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-3.5 h-3.5 text-accent" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted font-display">
            Audit Domains
          </span>
        </div>
        <button
          type="button"
          onClick={handleSelectAll}
          className="text-[10px] font-semibold text-accent hover:text-white transition font-display uppercase tracking-wider"
        >
          {allSelected ? 'Deselect All' : 'Select All'}
        </button>
      </div>

      {/* Engine Grid */}
      <div className="p-3 grid grid-cols-3 gap-2">
        {ENGINES.map(engine => {
          const isSelected = selectedDomains.includes(engine.id);
          return (
            <button
              key={engine.id}
              type="button"
              onClick={() => onToggle(engine.id)}
              className={`
                relative flex flex-col items-center gap-1.5 p-2.5 rounded-lg border text-center transition-all duration-150
                ${isSelected
                  ? `${engine.bgColor} ${engine.borderColor} ${engine.color}`
                  : 'bg-neutral-900/30 border-border/20 text-neutral-600 hover:border-border/40 hover:text-neutral-400'
                }
              `}
            >
              {/* Checkmark indicator */}
              {isSelected && (
                <span className={`absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full ${engine.color.replace('text-', 'bg-')}`} />
              )}
              {/* Initials badge */}
              <span className={`text-[9px] font-bold font-mono px-1.5 py-0.5 rounded ${isSelected ? engine.bgColor : 'bg-neutral-800'} ${isSelected ? engine.color : 'text-neutral-500'}`}>
                {engine.initials}
              </span>
              <span className="text-[10px] font-semibold font-display leading-tight">{engine.label}</span>
            </button>
          );
        })}
      </div>

      <p className="text-center text-[10px] text-neutral-700 pb-2.5 leading-tight px-3">
        {selectedDomains.length} of {ENGINES.length} engines selected for audit
      </p>
    </div>
  );
};

export { ENGINES };
