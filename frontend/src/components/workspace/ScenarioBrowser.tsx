import { useState, useEffect, useMemo } from 'react';

export interface ScenarioInfo {
  id: string;
  name: string;
  tags: string[];
  filePath: string;
  line: number;
  featureName?: string;
}

export interface ScenarioBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  scenarios: ScenarioInfo[];
  onNavigateToScenario: (scenario: ScenarioInfo) => void;
}

type FilterMode = 'AND' | 'OR';

export function ScenarioBrowser({
  isOpen,
  onClose,
  scenarios,
  onNavigateToScenario,
}: ScenarioBrowserProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [filterMode, setFilterMode] = useState<FilterMode>('OR');
  const [searchQuery, setSearchQuery] = useState('');

  // Extract all unique tags from scenarios
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    scenarios.forEach(scenario => {
      scenario.tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [scenarios]);

  // Filter scenarios based on selected tags and mode
  const filteredScenarios = useMemo(() => {
    let result = scenarios;

    // Filter by search query (scenario name, feature, file, or tags)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      // Check if query looks like a tag (starts with @)
      const isTagSearch = query.startsWith('@');
      const tagQuery = isTagSearch ? query.slice(1) : query; // Remove @ prefix for tag matching

      result = result.filter(s => {
        // Always search in name, feature, and file path
        const matchesText =
          s.name.toLowerCase().includes(query) ||
          s.featureName?.toLowerCase().includes(query) ||
          s.filePath.toLowerCase().includes(query);

        // Also search in tags (with or without @ prefix)
        const matchesTags = s.tags.some(tag =>
          tag.toLowerCase().includes(tagQuery)
        );

        return matchesText || matchesTags;
      });
    }

    // Filter by selected tags
    if (selectedTags.length > 0) {
      if (filterMode === 'AND') {
        // All selected tags must be present
        result = result.filter(scenario =>
          selectedTags.every(tag => scenario.tags.includes(tag))
        );
      } else {
        // Any of the selected tags must be present
        result = result.filter(scenario =>
          selectedTags.some(tag => scenario.tags.includes(tag))
        );
      }
    }

    return result;
  }, [scenarios, selectedTags, filterMode, searchQuery]);

  // Tag counts for display
  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    scenarios.forEach(scenario => {
      scenario.tags.forEach(tag => {
        counts[tag] = (counts[tag] || 0) + 1;
      });
    });
    return counts;
  }, [scenarios]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const clearFilters = () => {
    setSelectedTags([]);
    setSearchQuery('');
  };

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[85vh] bg-[#161b22] border border-[#30363d] rounded-lg shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#30363d]">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[#58a6ff] text-xl">fact_check</span>
            <h2 className="text-lg font-semibold text-white">Scenario Browser</h2>
            <span className="px-2 py-0.5 bg-[#21262d] rounded text-xs text-[#8b949e] font-mono">
              {filteredScenarios.length} / {scenarios.length} scenarios
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#8b949e] hover:text-white hover:bg-[#30363d] rounded transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Search & Filter Controls */}
        <div className="px-5 py-4 border-b border-[#30363d] space-y-4">
          {/* Search Input */}
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#8b949e] text-lg">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or @tag..."
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-10 py-2.5 text-sm text-white placeholder-[#6e7681] focus:outline-none focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff]"
            />
            {(searchQuery || selectedTags.length > 0) && (
              <button
                onClick={clearFilters}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b949e] hover:text-white text-xs"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Filter Mode Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs text-[#8b949e] font-medium uppercase tracking-wider">
                Filter by Tags
              </span>
              <div className="flex items-center bg-[#21262d] rounded-md p-0.5 border border-[#30363d]">
                <button
                  onClick={() => setFilterMode('OR')}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                    filterMode === 'OR'
                      ? 'bg-[#58a6ff] text-white'
                      : 'text-[#8b949e] hover:text-white'
                  }`}
                >
                  OR
                </button>
                <button
                  onClick={() => setFilterMode('AND')}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                    filterMode === 'AND'
                      ? 'bg-[#58a6ff] text-white'
                      : 'text-[#8b949e] hover:text-white'
                  }`}
                >
                  AND
                </button>
              </div>
              <span className="text-xs text-[#6e7681]">
                {filterMode === 'OR'
                  ? 'Match any selected tag'
                  : 'Match all selected tags'}
              </span>
            </div>
          </div>

          {/* Tags Cloud */}
          <div className="flex flex-wrap gap-2">
            {allTags.length > 0 ? (
              allTags.map(tag => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono transition-all ${
                      isSelected
                        ? 'bg-[#58a6ff]/20 border border-[#58a6ff]/50 text-[#58a6ff]'
                        : 'bg-[#21262d] border border-[#30363d] text-[#8b949e] hover:text-white hover:border-[#8b949e]'
                    }`}
                  >
                    @{tag}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      isSelected ? 'bg-[#58a6ff]/30' : 'bg-[#30363d]'
                    }`}>
                      {tagCounts[tag]}
                    </span>
                    {isSelected && (
                      <span className="material-symbols-outlined text-sm ml-0.5">close</span>
                    )}
                  </button>
                );
              })
            ) : (
              <span className="text-sm text-[#6e7681]">No tags found in scenarios</span>
            )}
          </div>
        </div>

        {/* Scenarios List */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {filteredScenarios.length > 0 ? (
            <div className="space-y-2">
              {filteredScenarios.map(scenario => (
                <button
                  key={scenario.id}
                  onClick={() => {
                    onNavigateToScenario(scenario);
                    onClose();
                  }}
                  className="w-full flex items-start gap-3 p-3 bg-[#0d1117] border border-[#30363d] rounded-lg hover:border-[#58a6ff]/50 hover:bg-[#21262d]/50 transition-all text-left group"
                >
                  <span className="material-symbols-outlined text-[#58a6ff] text-lg mt-0.5 icon-filled">
                    play_circle
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white group-hover:text-[#58a6ff] transition-colors">
                        {scenario.name}
                      </span>
                      {scenario.featureName && (
                        <span className="text-xs text-[#6e7681]">
                          in {scenario.featureName}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-[#8b949e] font-mono truncate">
                        {scenario.filePath}:{scenario.line}
                      </span>
                    </div>
                    {scenario.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {scenario.tags.map(tag => (
                          <span
                            key={tag}
                            className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                              selectedTags.includes(tag)
                                ? 'bg-[#58a6ff]/20 text-[#58a6ff]'
                                : 'bg-[#30363d] text-[#8b949e]'
                            }`}
                          >
                            @{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="material-symbols-outlined text-[#6e7681] group-hover:text-[#58a6ff] transition-colors">
                    arrow_forward
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <span className="material-symbols-outlined text-4xl text-[#30363d] mb-3">
                search_off
              </span>
              <p className="text-[#8b949e] text-sm">No scenarios match your filters</p>
              <button
                onClick={clearFilters}
                className="mt-3 text-xs text-[#58a6ff] hover:underline"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#30363d] bg-[#0d1117]/50 flex items-center justify-between">
          <div className="text-xs text-[#6e7681]">
            <kbd className="px-1.5 py-0.5 bg-[#21262d] border border-[#30363d] rounded text-[10px]">Esc</kbd>
            <span className="ml-2">to close</span>
          </div>
          <div className="text-xs text-[#6e7681]">
            Click a scenario to navigate to it
          </div>
        </div>
      </div>
    </div>
  );
}
