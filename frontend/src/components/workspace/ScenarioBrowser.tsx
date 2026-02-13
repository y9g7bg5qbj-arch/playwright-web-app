import { useState, useEffect, useMemo } from 'react';
import {
  X,
  Tags,
  ToggleLeft,
  ToggleRight,
  FileCode2,
  ChevronRight,
  TestTube2,
  CircleOff,
} from 'lucide-react';

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

function normalizeTag(tag: string): string {
  return tag.startsWith('@') ? tag : `@${tag}`;
}

export function ScenarioBrowser({
  isOpen,
  onClose,
  scenarios,
  onNavigateToScenario,
}: ScenarioBrowserProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [filterMode, setFilterMode] = useState<FilterMode>('OR');

  const allTags = useMemo(() => {
    const set = new Set<string>();
    scenarios.forEach((scenario) => {
      scenario.tags.forEach((tag) => set.add(tag));
    });
    return Array.from(set).sort();
  }, [scenarios]);

  const filteredScenarios = useMemo(() => {
    let result = scenarios;

    if (selectedTags.length > 0) {
      if (filterMode === 'AND') {
        result = result.filter((scenario) =>
          selectedTags.every((selectedTag) => scenario.tags.includes(selectedTag))
        );
      } else {
        result = result.filter((scenario) =>
          selectedTags.some((selectedTag) => scenario.tags.includes(selectedTag))
        );
      }
    }

    return result;
  }, [scenarios, selectedTags, filterMode]);

  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    scenarios.forEach((scenario) => {
      scenario.tags.forEach((tag) => {
        counts[tag] = (counts[tag] || 0) + 1;
      });
    });
    return counts;
  }, [scenarios]);

  const toggleTag = (tag: string) => {
    setSelectedTags((previous) =>
      previous.includes(tag) ? previous.filter((item) => item !== tag) : [...previous, tag]
    );
  };

  const clearFilters = () => {
    setSelectedTags([]);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', onKeyDown);
      return () => document.removeEventListener('keydown', onKeyDown);
    }

    return undefined;
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative flex h-[min(86vh,820px)] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-border-default bg-dark-card shadow-2xl">
        <header className="flex h-12 items-center justify-between border-b border-border-default bg-dark-bg px-4">
          <div className="flex items-center gap-2">
            <TestTube2 className="h-4 w-4 text-brand-secondary" />
            <h2 className="text-sm font-semibold text-text-primary">Scenario Browser</h2>
            <span className="rounded-full border border-border-default bg-dark-elevated px-2 py-0.5 text-[10px] text-text-secondary">
              {filteredScenarios.length} / {scenarios.length}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-7 w-7 items-center justify-center rounded text-text-secondary transition-colors hover:bg-white/[0.06] hover:text-text-primary"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="border-b border-border-default bg-dark-bg/60 px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 text-xs text-text-secondary">
              <Tags className="h-3.5 w-3.5" />
              Tag Mode
            </div>

            <button
              type="button"
              onClick={() => setFilterMode((current) => (current === 'OR' ? 'AND' : 'OR'))}
              className="inline-flex items-center gap-1 rounded-md border border-border-default bg-dark-elevated/50 px-2.5 py-1 text-xs text-text-secondary transition-colors hover:border-border-emphasis hover:text-text-primary"
            >
              {filterMode === 'OR' ? <ToggleLeft className="h-4 w-4" /> : <ToggleRight className="h-4 w-4" />}
              {filterMode === 'OR' ? 'Any selected tag' : 'All selected tags'}
            </button>

            {selectedTags.length > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1 rounded-md border border-border-default bg-dark-elevated/50 px-2.5 py-1 text-xs text-text-secondary transition-colors hover:border-border-emphasis hover:text-text-primary"
              >
                Clear filters
              </button>
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {allTags.length > 0 ? (
              allTags.map((tag) => {
                const selected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-mono transition-colors ${
                      selected
                        ? 'border-brand-primary/40 bg-brand-primary/20 text-text-primary'
                        : 'border-border-default bg-dark-elevated/40 text-text-secondary hover:border-border-emphasis hover:text-text-primary'
                    }`}
                  >
                    {normalizeTag(tag)}
                    <span className="rounded-full bg-black/20 px-1.5 py-0.5 text-[10px]">{tagCounts[tag]}</span>
                  </button>
                );
              })
            ) : (
              <span className="text-xs text-text-muted">No tags found.</span>
            )}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-dark-canvas/40 px-4 py-3">
          {filteredScenarios.length > 0 ? (
            <div className="space-y-2">
              {filteredScenarios.map((scenario) => (
                <button
                  key={scenario.id}
                  type="button"
                  onClick={() => {
                    onNavigateToScenario(scenario);
                    onClose();
                  }}
                  className="group w-full rounded-lg border border-border-default bg-dark-card px-3 py-2.5 text-left transition-colors hover:border-border-active hover:bg-dark-elevated/45"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-md border border-border-default bg-dark-elevated/50 p-1.5 text-brand-secondary">
                      <FileCode2 className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium text-text-primary group-hover:text-brand-secondary">
                          {scenario.name}
                        </span>
                        {scenario.featureName && (
                          <span className="truncate text-xs text-text-muted">in {scenario.featureName}</span>
                        )}
                      </div>

                      <div className="mt-1 text-xs text-text-secondary">
                        {scenario.filePath}:{scenario.line}
                      </div>

                      {scenario.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {scenario.tags.map((tag) => {
                            const highlighted = selectedTags.includes(tag);
                            return (
                              <span
                                key={`${scenario.id}-${tag}`}
                                className={`rounded-full px-2 py-0.5 text-[10px] font-mono ${
                                  highlighted
                                    ? 'bg-brand-primary/20 text-brand-secondary'
                                    : 'bg-dark-elevated text-text-secondary'
                                }`}
                              >
                                {normalizeTag(tag)}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-text-muted transition-colors group-hover:text-brand-secondary" />
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <CircleOff className="h-9 w-9 text-text-muted" />
              <p className="mt-3 text-sm text-text-secondary">No scenarios match selected tags.</p>
              <button
                type="button"
                onClick={clearFilters}
                className="mt-2 text-xs text-brand-secondary hover:underline"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>

        <footer className="flex h-10 items-center justify-between border-t border-border-default bg-dark-bg px-4 text-xs text-text-muted">
          <div>
            <kbd className="rounded border border-border-default bg-dark-elevated px-1.5 py-0.5 text-[10px]">Esc</kbd>
            <span className="ml-2">to close</span>
          </div>
          <div>Click a scenario to jump to source.</div>
        </footer>
      </div>
    </div>
  );
}
