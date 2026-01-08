import React, { useState } from 'react';
import { ChevronDown, ChevronRight, FileCode2, ExternalLink } from 'lucide-react';
import { ScenarioRow } from './ScenarioRow';
import type { FeatureWithScenarios, ScenarioMeta } from './types';

interface FeatureScenarioListProps {
  features: FeatureWithScenarios[];
  filteredScenarios: ScenarioMeta[];
  onNavigate: (filePath: string, line: number) => void;
  highlightedTags?: string[];
  filterMode?: 'has' | 'missing';
  searchQuery: string;
}

interface FeatureGroupProps {
  feature: FeatureWithScenarios;
  scenarios: ScenarioMeta[];
  onNavigate: (filePath: string, line: number) => void;
  highlightedTags?: string[];
  filterMode?: 'has' | 'missing';
  defaultExpanded?: boolean;
}

const FeatureGroup: React.FC<FeatureGroupProps> = ({
  feature,
  scenarios,
  onNavigate,
  highlightedTags = [],
  filterMode = 'has',
  defaultExpanded = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const handleOpenFeature = (e: React.MouseEvent) => {
    e.stopPropagation();
    onNavigate(feature.filePath, 1);
  };

  return (
    <div className="border border-slate-700 rounded-lg overflow-hidden bg-slate-800/30">
      {/* Feature Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-800 cursor-pointer transition-colors"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-400" />
          )}
          <FileCode2 className="w-4 h-4 text-purple-400" />
          <span className="text-white font-medium">{feature.name}</span>
          <span className="text-xs text-slate-500">{feature.filePath}</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-400">
            {scenarios.length} scenario{scenarios.length !== 1 ? 's' : ''}
          </span>
          <button
            onClick={handleOpenFeature}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
            title="Open feature file"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Scenarios List */}
      {isExpanded && scenarios.length > 0 && (
        <div className="divide-y divide-slate-700/50">
          {scenarios.map((scenario, idx) => (
            <ScenarioRow
              key={`${scenario.filePath}-${scenario.line}-${idx}`}
              scenario={scenario}
              onNavigate={onNavigate}
              highlightedTags={highlightedTags}
              filterMode={filterMode}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const FeatureScenarioList: React.FC<FeatureScenarioListProps> = ({
  features,
  filteredScenarios,
  onNavigate,
  highlightedTags = [],
  filterMode = 'has',
  searchQuery,
}) => {
  const [allExpanded, setAllExpanded] = useState(true);

  // Group filtered scenarios by feature
  const scenariosByFeature = new Map<string, ScenarioMeta[]>();

  for (const scenario of filteredScenarios) {
    // Apply text search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !scenario.name.toLowerCase().includes(query) &&
        !scenario.featureName.toLowerCase().includes(query)
      ) {
        continue;
      }
    }

    const key = scenario.filePath;
    if (!scenariosByFeature.has(key)) {
      scenariosByFeature.set(key, []);
    }
    scenariosByFeature.get(key)!.push(scenario);
  }

  // Get features that have matching scenarios
  const featuresWithMatches = features.filter((f) =>
    scenariosByFeature.has(f.filePath)
  );

  const totalMatching = Array.from(scenariosByFeature.values()).reduce(
    (sum, arr) => sum + arr.length,
    0
  );

  if (featuresWithMatches.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        <FileCode2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No scenarios match the current filter</p>
        {searchQuery && (
          <p className="text-sm text-slate-500 mt-2">
            Try adjusting your search query
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-400">
          Showing {totalMatching} scenario{totalMatching !== 1 ? 's' : ''} in{' '}
          {featuresWithMatches.length} feature{featuresWithMatches.length !== 1 ? 's' : ''}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setAllExpanded(true)}
            className="text-xs text-slate-400 hover:text-white px-2 py-1 bg-slate-700/50 rounded"
          >
            Expand All
          </button>
          <button
            onClick={() => setAllExpanded(false)}
            className="text-xs text-slate-400 hover:text-white px-2 py-1 bg-slate-700/50 rounded"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Feature Groups */}
      <div className="space-y-3">
        {featuresWithMatches.map((feature) => (
          <FeatureGroup
            key={feature.filePath}
            feature={feature}
            scenarios={scenariosByFeature.get(feature.filePath) || []}
            onNavigate={onNavigate}
            highlightedTags={highlightedTags}
            filterMode={filterMode}
            defaultExpanded={allExpanded}
          />
        ))}
      </div>
    </div>
  );
};
