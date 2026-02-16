import { useState, useEffect, useCallback, useRef } from 'react';
import type { ScenarioFilterState, ScenarioInfo } from './ScenarioBrowser.js';
import { veroApi, type ScenarioIndex } from '@/api/vero';

const SCENARIO_SEARCH_DEBOUNCE_MS = 250;

const DEFAULT_SCENARIO_FILTERS: ScenarioFilterState = {
  projectId: '',
  folder: '',
  search: '',
  tags: [],
  excludeTags: [],
  tagMode: 'any',
};

export interface UseScenarioBrowserParams {
  currentProjectId: string | undefined;
  nestedProjectsLength: number;
}

export interface UseScenarioBrowserReturn {
  showScenarioBrowser: boolean;
  setShowScenarioBrowser: (show: boolean) => void;
  scenarioFilters: ScenarioFilterState;
  scenarioItems: ScenarioInfo[];
  scenarioTotal: number;
  scenarioFacets: ScenarioIndex['facets'];
  scenarioBrowserLoading: boolean;
  scenarioBrowserError: string | null;
  scenarioBadgeCount: number;
  handleScenarioFiltersChange: (nextFilters: ScenarioFilterState) => void;
  fetchScenarioIndex: (
    filters: ScenarioFilterState,
    options?: { updateBadge?: boolean; suppressLoading?: boolean; force?: boolean }
  ) => Promise<void>;
}

export function useScenarioBrowser({
  currentProjectId,
  nestedProjectsLength,
}: UseScenarioBrowserParams): UseScenarioBrowserReturn {
  const [showScenarioBrowser, setShowScenarioBrowser] = useState(false);
  const [scenarioFilters, setScenarioFilters] = useState<ScenarioFilterState>(DEFAULT_SCENARIO_FILTERS);
  const [scenarioItems, setScenarioItems] = useState<ScenarioInfo[]>([]);
  const [scenarioTotal, setScenarioTotal] = useState(0);
  const [scenarioFacets, setScenarioFacets] = useState<ScenarioIndex['facets']>({
    tags: [],
    projects: [],
    folders: [],
  });
  const [scenarioBrowserLoading, setScenarioBrowserLoading] = useState(false);
  const [scenarioBrowserError, setScenarioBrowserError] = useState<string | null>(null);
  const [scenarioBadgeCount, setScenarioBadgeCount] = useState(0);
  const scenarioQueryCacheRef = useRef<Map<string, ScenarioIndex>>(new Map());
  const scenarioFetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mapScenarioIndexToItems = useCallback((index: ScenarioIndex): ScenarioInfo[] => {
    const items: ScenarioInfo[] = [];

    for (const feature of index.features) {
      for (const scenario of feature.scenarios) {
        const normalizedTags = Array.from(
          new Set(
            (scenario.tags || [])
              .map((tag) => tag.trim().replace(/^@+/, '').toLowerCase())
              .filter(Boolean)
          )
        );

        const projectId = scenario.projectId || feature.projectId;
        const projectName = scenario.projectName || feature.projectName;

        items.push({
          id: scenario.id || `${projectId || 'project'}:${scenario.filePath}:${scenario.line}:${scenario.name}`,
          name: scenario.name,
          tags: normalizedTags,
          filePath: scenario.filePath,
          line: scenario.line,
          featureName: scenario.featureName || feature.name,
          projectId,
          projectName,
        });
      }
    }

    items.sort((a, b) => {
      const projectCompare = (a.projectName || '').localeCompare(b.projectName || '');
      if (projectCompare !== 0) return projectCompare;
      const fileCompare = a.filePath.localeCompare(b.filePath);
      if (fileCompare !== 0) return fileCompare;
      return a.line - b.line;
    });

    return items;
  }, []);

  const isDefaultScenarioFilters = useCallback((filters: ScenarioFilterState): boolean => {
    return (
      !filters.projectId &&
      !filters.folder &&
      !filters.search.trim() &&
      filters.tags.length === 0 &&
      filters.excludeTags.length === 0 &&
      filters.tagMode === 'any'
    );
  }, []);

  const fetchScenarioIndex = useCallback(
    async (
      filters: ScenarioFilterState,
      options: { updateBadge?: boolean; suppressLoading?: boolean; force?: boolean } = {}
    ): Promise<void> => {
      if (!currentProjectId) {
        setScenarioItems([]);
        setScenarioTotal(0);
        setScenarioFacets({ tags: [], projects: [], folders: [] });
        setScenarioBrowserError(null);
        return;
      }

      const normalizedTags = Array.from(
        new Set(filters.tags.map((tag) => tag.trim().replace(/^@+/, '').toLowerCase()).filter(Boolean))
      );
      const normalizedExcludedTags = Array.from(
        new Set(filters.excludeTags.map((tag) => tag.trim().replace(/^@+/, '').toLowerCase()).filter(Boolean))
      );

      const query = {
        applicationId: currentProjectId,
        projectId: filters.projectId || undefined,
        folder: filters.projectId ? filters.folder || undefined : undefined,
        search: filters.search.trim() || undefined,
        tags: normalizedTags.length > 0 ? normalizedTags : undefined,
        excludeTags: normalizedExcludedTags.length > 0 ? normalizedExcludedTags : undefined,
        tagMode: filters.tagMode,
      } as const;

      const cacheKey = JSON.stringify(query);
      const cached = scenarioQueryCacheRef.current.get(cacheKey);

      if (!options.force && cached) {
        setScenarioItems(mapScenarioIndexToItems(cached));
        setScenarioTotal(cached.totalScenarios);
        setScenarioFacets(cached.facets || { tags: cached.tags || [], projects: [], folders: [] });
        setScenarioBrowserLoading(false);
        setScenarioBrowserError(null);
        if (options.updateBadge || isDefaultScenarioFilters(filters)) {
          setScenarioBadgeCount(cached.totalScenarios);
        }
        return;
      }

      if (!options.suppressLoading) {
        setScenarioBrowserLoading(true);
      }
      setScenarioBrowserError(null);

      try {
        const index = await veroApi.getScenarios(query);
        scenarioQueryCacheRef.current.set(cacheKey, index);

        setScenarioItems(mapScenarioIndexToItems(index));
        setScenarioTotal(index.totalScenarios);
        setScenarioFacets(index.facets || { tags: index.tags || [], projects: [], folders: [] });

        if (filters.projectId && filters.folder && !(index.facets?.folders || []).some((folder) => folder.path === filters.folder)) {
          setScenarioFilters((previous) =>
            previous.folder === filters.folder ? { ...previous, folder: '' } : previous
          );
        }

        if (options.updateBadge || isDefaultScenarioFilters(filters)) {
          setScenarioBadgeCount(index.totalScenarios);
        }
      } catch (error) {
        setScenarioBrowserError(error instanceof Error ? error.message : 'Failed to load scenarios');
      } finally {
        if (!options.suppressLoading) {
          setScenarioBrowserLoading(false);
        }
      }
    },
    [currentProjectId, isDefaultScenarioFilters, mapScenarioIndexToItems]
  );

  // Reset scenario state when application changes
  useEffect(() => {
    scenarioQueryCacheRef.current.clear();
    setScenarioFilters(DEFAULT_SCENARIO_FILTERS);
    setScenarioItems([]);
    setScenarioTotal(0);
    setScenarioFacets({ tags: [], projects: [], folders: [] });
    setScenarioBrowserError(null);
    setScenarioBrowserLoading(false);
    setScenarioBadgeCount(0);

    if (!currentProjectId) {
      return;
    }

    void fetchScenarioIndex(DEFAULT_SCENARIO_FILTERS, {
      updateBadge: true,
      suppressLoading: true,
      force: true,
    });
  }, [currentProjectId, fetchScenarioIndex]);

  // Refresh scenarios when nested projects change
  useEffect(() => {
    if (!currentProjectId) {
      return;
    }

    void fetchScenarioIndex(DEFAULT_SCENARIO_FILTERS, {
      updateBadge: true,
      suppressLoading: true,
      force: true,
    });
  }, [currentProjectId, nestedProjectsLength, fetchScenarioIndex]);

  // Debounced fetch when filters change while browser is open
  useEffect(() => {
    if (!showScenarioBrowser || !currentProjectId) {
      return;
    }

    if (scenarioFetchTimerRef.current) {
      clearTimeout(scenarioFetchTimerRef.current);
    }

    scenarioFetchTimerRef.current = setTimeout(() => {
      void fetchScenarioIndex(scenarioFilters);
    }, SCENARIO_SEARCH_DEBOUNCE_MS);

    return () => {
      if (scenarioFetchTimerRef.current) {
        clearTimeout(scenarioFetchTimerRef.current);
      }
      scenarioFetchTimerRef.current = null;
    };
  }, [currentProjectId, fetchScenarioIndex, scenarioFilters, showScenarioBrowser]);

  const handleScenarioFiltersChange = useCallback((nextFilters: ScenarioFilterState): void => {
    setScenarioFilters({
      projectId: nextFilters.projectId,
      folder: nextFilters.projectId ? nextFilters.folder : '',
      search: nextFilters.search,
      tags: Array.from(
        new Set(nextFilters.tags.map((tag) => tag.trim().replace(/^@+/, '').toLowerCase()).filter(Boolean))
      ),
      excludeTags: Array.from(
        new Set(nextFilters.excludeTags.map((tag) => tag.trim().replace(/^@+/, '').toLowerCase()).filter(Boolean))
      ),
      tagMode: nextFilters.tagMode === 'all' ? 'all' : 'any',
    });
  }, []);

  return {
    showScenarioBrowser,
    setShowScenarioBrowser,
    scenarioFilters,
    scenarioItems,
    scenarioTotal,
    scenarioFacets,
    scenarioBrowserLoading,
    scenarioBrowserError,
    scenarioBadgeCount,
    handleScenarioFiltersChange,
    fetchScenarioIndex,
  };
}
