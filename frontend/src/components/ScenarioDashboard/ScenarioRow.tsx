import React from 'react';
import { ExternalLink, Tag } from 'lucide-react';
import type { ScenarioMeta } from './types';

interface ScenarioRowProps {
  scenario: ScenarioMeta;
  onNavigate: (filePath: string, line: number) => void;
  highlightedTags?: string[];
  filterMode?: 'has' | 'missing';
}

// Tag color palette for variety
const tagColors = [
  { bg: 'bg-blue-500/20', text: 'text-blue-300', border: 'border-blue-500/40' },
  { bg: 'bg-purple-500/20', text: 'text-purple-300', border: 'border-purple-500/40' },
  { bg: 'bg-emerald-500/20', text: 'text-emerald-300', border: 'border-emerald-500/40' },
  { bg: 'bg-amber-500/20', text: 'text-amber-300', border: 'border-amber-500/40' },
  { bg: 'bg-rose-500/20', text: 'text-rose-300', border: 'border-rose-500/40' },
  { bg: 'bg-cyan-500/20', text: 'text-cyan-300', border: 'border-cyan-500/40' },
  { bg: 'bg-indigo-500/20', text: 'text-indigo-300', border: 'border-indigo-500/40' },
];

const getTagColor = (tagName: string) => {
  // Use hash to get consistent color for same tag
  let hash = 0;
  for (let i = 0; i < tagName.length; i++) {
    hash = tagName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return tagColors[Math.abs(hash) % tagColors.length];
};

export const ScenarioRow: React.FC<ScenarioRowProps> = ({
  scenario,
  onNavigate,
  highlightedTags = [],
  filterMode = 'has',
}) => {
  const handleClick = () => {
    onNavigate(scenario.filePath, scenario.line);
  };

  return (
    <div
      onClick={handleClick}
      className="group flex items-center justify-between py-2 px-3 hover:bg-slate-700/50 rounded-md cursor-pointer transition-colors"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-slate-300 truncate">{scenario.name}</span>
          <span className="text-xs text-slate-500">:{scenario.line}</span>
        </div>

        {/* Tags */}
        {scenario.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {scenario.tags.map((tag) => {
              const isHighlighted = highlightedTags.includes(tag);
              const color = getTagColor(tag);

              return (
                <span
                  key={tag}
                  className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs border ${
                    isHighlighted
                      ? filterMode === 'has'
                        ? 'bg-blue-500/30 text-blue-200 border-blue-500/60'
                        : 'bg-amber-500/30 text-amber-200 border-amber-500/60'
                      : `${color.bg} ${color.text} ${color.border}`
                  }`}
                >
                  <Tag className="w-2.5 h-2.5" />
                  {tag}
                </span>
              );
            })}
          </div>
        )}

        {scenario.tags.length === 0 && (
          <span className="text-xs text-slate-500 italic mt-1 block">No tags</span>
        )}
      </div>

      <ExternalLink className="w-4 h-4 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2" />
    </div>
  );
};
