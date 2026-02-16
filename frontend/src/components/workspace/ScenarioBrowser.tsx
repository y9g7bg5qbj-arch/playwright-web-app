// design-lint-ignore NO_HARDCODED_MODAL — max-w-5xl full-height scenario browser exceeds Modal's max-w-4xl; interior controls use shared primitives
import { useEffect, useMemo, useState } from 'react';
import {
  ChevronRight,
  CircleOff,
  FileCode2,
  Search,
  Tags,
  TestTube2,
  ToggleLeft,
  ToggleRight,
  X,
} from 'lucide-react';
import { Tooltip } from '@/components/ui';

export interface ScenarioInfo {
  id: string;
  name: string;
  tags: string[];
  filePath: string;
  line: number;
  featureName?: string;
  projectId?: string;
  projectName?: string;
}

export type ScenarioTagMode = 'any' | 'all';

export interface ScenarioFilterState {
  projectId: string;
  folder: string;
  search: string;
  tags: string[];
  excludeTags: string[];
  tagMode: ScenarioTagMode;
}

export interface ScenarioProjectOption {
  id: string;
  name: string;
  scenarioCount: number;
}

export interface ScenarioFolderOption {
  path: string;
  name: string;
  scenarioCount: number;
}

export interface ScenarioTagOption {
  name: string;
  count: number;
}

export interface ScenarioBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  scenarios: ScenarioInfo[];
  totalScenarios: number;
  loading: boolean;
  error?: string | null;
  filters: ScenarioFilterState;
  availableProjects: ScenarioProjectOption[];
  availableFolders: ScenarioFolderOption[];
  availableTags: ScenarioTagOption[];
  onFiltersChange: (filters: ScenarioFilterState) => void;
  onNavigateToScenario: (scenario: ScenarioInfo) => void;
}

function normalizeTag(tag: string): string {
  return tag.trim().replace(/^@+/, '').toLowerCase();
}

function withAtPrefix(tag: string): string {
  return tag.startsWith('@') ? tag : `@${tag}`;
}

export function ScenarioBrowser({
  isOpen,
  onClose,
  scenarios,
  totalScenarios,
  loading,
  error,
  filters,
  availableProjects,
  availableFolders,
  availableTags,
  onFiltersChange,
  onNavigateToScenario,
}: ScenarioBrowserProps): JSX.Element | null {
  const [tagSearch, setTagSearch] = useState('');

  const hasActiveFilters = Boolean(
    filters.projectId ||
    filters.folder ||
    filters.search.trim() ||
    filters.tags.length > 0 ||
    filters.excludeTags.length > 0 ||
    filters.tagMode === 'all'
  );

  const matchingTags = useMemo(() => {
    const rawQuery = tagSearch.trim().toLowerCase();
    const query = rawQuery.replace(/^[-!@]+/, '');
    return availableTags
      .filter((tag) => !filters.tags.includes(tag.name) && !filters.excludeTags.includes(tag.name))
      .filter((tag) => (query ? tag.name.toLowerCase().includes(query) : true))
      .slice(0, 50);
  }, [availableTags, filters.excludeTags, filters.tags, tagSearch]);

  const setFilters = (patch: Partial<ScenarioFilterState>): void => {
    onFiltersChange({
      ...filters,
      ...patch,
    });
  };

  const addIncludeTag = (tag: string): void => {
    const normalized = normalizeTag(tag);
    if (!normalized || filters.tags.includes(normalized)) {
      return;
    }
    setFilters({
      tags: [...filters.tags, normalized],
      excludeTags: filters.excludeTags.filter((item) => item !== normalized),
    });
    setTagSearch('');
  };

  const addExcludeTag = (tag: string): void => {
    const normalized = normalizeTag(tag);
    if (!normalized || filters.excludeTags.includes(normalized)) {
      return;
    }
    setFilters({
      tags: filters.tags.filter((item) => item !== normalized),
      excludeTags: [...filters.excludeTags, normalized],
    });
    setTagSearch('');
  };

  const removeIncludeTag = (tag: string): void => {
    setFilters({ tags: filters.tags.filter((item) => item !== tag) });
  };

  const removeExcludeTag = (tag: string): void => {
    setFilters({ excludeTags: filters.excludeTags.filter((item) => item !== tag) });
  };

  const clearFilters = (): void => {
    onFiltersChange({
      projectId: '',
      folder: '',
      search: '',
      tags: [],
      excludeTags: [],
      tagMode: 'any',
    });
    setTagSearch('');
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
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

      <div className="relative flex h-[min(86vh,860px)] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-border-default bg-dark-card shadow-2xl">
        <header className="flex h-12 items-center justify-between border-b border-border-default bg-dark-bg px-4">
          <div className="flex items-center gap-2">
            <TestTube2 className="h-4 w-4 text-brand-secondary" />
            <h2 className="text-sm font-semibold text-text-primary">Scenario Browser</h2>
            <span className="rounded-full border border-border-default bg-dark-elevated px-2 py-0.5 text-3xs text-text-secondary">
              {scenarios.length} / {totalScenarios}
            </span>
          </div>
          <Tooltip content="Close" showDelayMs={0} hideDelayMs={0}>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-7 w-7 items-center justify-center rounded text-text-secondary transition-colors hover:bg-white/[0.06] hover:text-text-primary"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </Tooltip>
        </header>

        <div className="border-b border-border-default bg-dark-bg/60 px-4 py-3">
          <div className="grid gap-2 md:grid-cols-3">
            <label className="flex items-center gap-2 rounded-md border border-border-default bg-dark-elevated/45 px-2.5 py-1.5 text-xs text-text-secondary">
              <Search className="h-3.5 w-3.5 text-text-muted" />
              <input
                type="text"
                value={filters.search}
                onChange={(event) => setFilters({ search: event.target.value })}
                placeholder="Search scenario or file..."
                className="w-full bg-transparent text-xs text-text-primary outline-none placeholder:text-text-muted"
              />
            </label>

            <select
              value={filters.projectId}
              onChange={(event) => {
                setFilters({
                  projectId: event.target.value,
                  folder: '',
                });
              }}
              className="h-8 rounded-md border border-border-default bg-dark-elevated/45 px-2.5 text-xs text-text-primary outline-none"
            >
              <option value="">All Projects</option>
              {availableProjects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name} ({project.scenarioCount})
                </option>
              ))}
            </select>

            <select
              value={filters.folder}
              onChange={(event) => setFilters({ folder: event.target.value })}
              disabled={!filters.projectId}
              className="h-8 rounded-md border border-border-default bg-dark-elevated/45 px-2.5 text-xs text-text-primary outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">All Folders</option>
              {availableFolders.map((folder) => (
                <option key={folder.path || '__root'} value={folder.path}>
                  {folder.path || 'Root'} ({folder.scenarioCount})
                </option>
              ))}
            </select>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1 text-xs text-text-secondary">
              <Tags className="h-3.5 w-3.5" />
              Tag Mode
            </div>

            <button
              type="button"
              onClick={() => setFilters({ tagMode: filters.tagMode === 'any' ? 'all' : 'any' })}
              className="inline-flex items-center gap-1 rounded-md border border-border-default bg-dark-elevated/50 px-2.5 py-1 text-xs text-text-secondary transition-colors hover:border-border-emphasis hover:text-text-primary"
            >
              {filters.tagMode === 'any' ? <ToggleLeft className="h-4 w-4" /> : <ToggleRight className="h-4 w-4" />}
              {filters.tagMode === 'any' ? 'Any selected tag' : 'All selected tags'}
            </button>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1 rounded-md border border-border-default bg-dark-elevated/50 px-2.5 py-1 text-xs text-text-secondary transition-colors hover:border-border-emphasis hover:text-text-primary"
              >
                Clear filters
              </button>
            )}
          </div>

          <div className="mt-2">
            <label className="flex items-center gap-2 rounded-md border border-border-default bg-dark-elevated/45 px-2.5 py-1.5 text-xs text-text-secondary">
              <Tags className="h-3.5 w-3.5 text-text-muted" />
              <input
                type="text"
                value={tagSearch}
                onChange={(event) => setTagSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter') {
                    return;
                  }
                  event.preventDefault();
                  const query = tagSearch.trim();
                  if (!query) {
                    return;
                  }
                  const isExcludeQuery = query.startsWith('-') || query.startsWith('!');
                  const rawTag = isExcludeQuery ? query.slice(1) : query;
                  const exactTag = availableTags.find((tag) => tag.name.toLowerCase() === rawTag.toLowerCase());
                  if (isExcludeQuery) {
                    addExcludeTag(exactTag?.name || rawTag);
                    return;
                  }
                  addIncludeTag(exactTag?.name || rawTag);
                }}
                placeholder="Add tags (use -tag to exclude), press Enter..."
                className="w-full bg-transparent text-xs text-text-primary outline-none placeholder:text-text-muted"
              />
            </label>
          </div>

          {filters.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {filters.tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => removeIncludeTag(tag)}
                  className="inline-flex items-center gap-1 rounded-full border border-brand-primary/40 bg-brand-primary/20 px-2 py-0.5 text-3xs font-mono text-text-primary transition-colors hover:border-border-emphasis"
                  title={`Remove ${withAtPrefix(tag)}`}
                >
                  {withAtPrefix(tag)}
                  <X className="h-3 w-3" />
                </button>
              ))}
            </div>
          )}

          {filters.excludeTags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {filters.excludeTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => removeExcludeTag(tag)}
                  className="inline-flex items-center gap-1 rounded-full border border-status-danger/40 bg-status-danger/15 px-2 py-0.5 text-3xs font-mono text-status-danger transition-colors hover:border-status-danger/70"
                  title={`Remove excluded ${withAtPrefix(tag)}`}
                >
                  -{withAtPrefix(tag)}
                  <X className="h-3 w-3" />
                </button>
              ))}
            </div>
          )}

          <div className="mt-2 flex max-h-16 flex-wrap gap-1 overflow-y-auto">
            {matchingTags.length > 0 ? (
              matchingTags.map((tag) => (
                <button
                  key={tag.name}
                  type="button"
                  onClick={() => addIncludeTag(tag.name)}
                  className="inline-flex items-center gap-1 rounded-full border border-border-default bg-dark-elevated/40 px-2 py-0.5 text-3xs font-mono text-text-secondary transition-colors hover:border-border-emphasis hover:text-text-primary"
                >
                  {withAtPrefix(tag.name)}
                  <span className="rounded-full bg-black/20 px-1.5 py-0.5 text-4xs">{tag.count}</span>
                </button>
              ))
            ) : (
              <span className="text-xs text-text-muted">No matching tags in current scope.</span>
            )}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-dark-canvas/40 px-4 py-3">
          {loading ? (
            <div className="flex h-full items-center justify-center text-sm text-text-secondary">Loading scenarios...</div>
          ) : error ? (
            <div className="flex h-full items-center justify-center text-center">
              <p className="text-sm text-status-danger">{error}</p>
            </div>
          ) : scenarios.length > 0 ? (
            <div className="space-y-2">
              {scenarios.map((scenario) => (
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
                        {scenario.projectName ? `${scenario.projectName} / ` : ''}
                        {scenario.filePath}:{scenario.line}
                      </div>

                      {scenario.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {scenario.tags.map((tag) => {
                            const selected = filters.tags.includes(tag);
                            const excluded = filters.excludeTags.includes(tag);
                            return (
                              <span
                                key={`${scenario.id}-${tag}`}
                                className={`rounded-full px-2 py-0.5 text-3xs font-mono ${
                                  excluded
                                    ? 'bg-status-danger/20 text-status-danger'
                                    : selected
                                    ? 'bg-brand-primary/20 text-brand-secondary'
                                    : 'bg-dark-elevated text-text-secondary'
                                }`}
                              >
                                {withAtPrefix(tag)}
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
              <p className="mt-3 text-sm text-text-secondary">
                {hasActiveFilters ? 'No scenarios match current filters.' : 'No scenarios found in this scope.'}
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-2 text-xs text-brand-secondary hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>

        <footer className="flex h-10 items-center justify-between border-t border-border-default bg-dark-bg px-4 text-xs text-text-muted">
          <div>
            <kbd className="rounded border border-border-default bg-dark-elevated px-1.5 py-0.5 text-3xs">Esc</kbd>
            <span className="ml-2">to close</span>
          </div>
          <div>Click a scenario to jump to source.</div>
        </footer>
      </div>
    </div>
  );
}
