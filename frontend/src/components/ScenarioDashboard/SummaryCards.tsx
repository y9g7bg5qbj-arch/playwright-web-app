import React from 'react';
import { FileCode2, Tag, Layers } from 'lucide-react';

interface SummaryCardsProps {
  totalScenarios: number;
  totalFeatures: number;
  totalTags: number;
  filteredCount?: number;
  isFiltered?: boolean;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({
  totalScenarios,
  totalFeatures,
  totalTags,
  filteredCount,
  isFiltered = false,
}) => {
  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Scenarios Card */}
      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Layers className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">
              {isFiltered ? filteredCount : totalScenarios}
            </div>
            <div className="text-sm text-slate-400">
              {isFiltered ? 'Matching Scenarios' : 'Total Scenarios'}
            </div>
            {isFiltered && filteredCount !== totalScenarios && (
              <div className="text-xs text-slate-500">
                of {totalScenarios} total
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Features Card */}
      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <FileCode2 className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{totalFeatures}</div>
            <div className="text-sm text-slate-400">Feature Files</div>
          </div>
        </div>
      </div>

      {/* Tags Card */}
      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/20 rounded-lg">
            <Tag className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{totalTags}</div>
            <div className="text-sm text-slate-400">Unique Tags</div>
          </div>
        </div>
      </div>
    </div>
  );
};
