import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  RefreshCw,
  Search,
  Layers,
} from 'lucide-react';
import { SummaryCards } from './SummaryCards';
import { TagFilter } from './TagFilter';
import { FeatureScenarioList } from './FeatureScenarioList';
import type {
  ScenarioIndex,
  ScenarioMeta,
  FilterMode,
  FilterOperator,
} from './types';

const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';

export const ScenarioDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('projectId') || undefined;
  const veroPath = searchParams.get('veroPath') || undefined;

  // Data state
  const [data, setData] = useState<ScenarioIndex | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [filterMode, setFilterMode] = useState<FilterMode>('has');
  const [filterOperator, setFilterOperator] = useState<FilterOperator>('and');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch scenarios
  const fetchScenarios = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (projectId) params.set('projectId', projectId);
      if (veroPath) params.set('veroPath', veroPath);

      const res = await fetch(`${API_BASE}/api/vero/scenarios?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error('Failed to fetch scenarios');
      }

      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        throw new Error(json.error || 'Unknown error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load scenarios');
    } finally {
      setIsLoading(false);
    }
  }, [projectId, veroPath]);

  useEffect(() => {
    fetchScenarios();
  }, [fetchScenarios]);

  // Filter scenarios based on selected tags
  const filteredScenarios = useMemo((): ScenarioMeta[] => {
    if (!data) return [];
    if (selectedTags.length === 0) {
      // Return all scenarios when no filter
      return data.features.flatMap((f) => f.scenarios);
    }

    const allScenarios = data.features.flatMap((f) => f.scenarios);

    return allScenarios.filter((scenario) => {
      if (filterMode === 'has') {
        // HAS mode: scenario must have selected tags
        if (filterOperator === 'and') {
          return selectedTags.every((tag) => scenario.tags.includes(tag));
        } else {
          return selectedTags.some((tag) => scenario.tags.includes(tag));
        }
      } else {
        // MISSING mode: scenario must NOT have selected tags
        if (filterOperator === 'and') {
          return selectedTags.every((tag) => !scenario.tags.includes(tag));
        } else {
          return selectedTags.some((tag) => !scenario.tags.includes(tag));
        }
      }
    });
  }, [data, selectedTags, filterMode, filterOperator]);

  // Navigate to editor
  const handleNavigateToEditor = useCallback(
    (filePath: string, line: number) => {
      // Navigate back to VeroIDE with file and line params
      const params = new URLSearchParams();
      params.set('file', filePath);
      params.set('line', line.toString());
      if (projectId) params.set('projectId', projectId);
      if (veroPath) params.set('veroPath', veroPath);

      navigate(`/?${params}`);
    },
    [navigate, projectId, veroPath]
  );

  // Navigate back to IDE
  const handleBack = () => {
    const params = new URLSearchParams();
    if (projectId) params.set('projectId', projectId);
    if (veroPath) params.set('veroPath', veroPath);
    navigate(`/?${params}`);
  };

  // Keyboard shortcut: Escape to clear filters
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedTags.length > 0) {
        setSelectedTags([]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTags.length]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading scenarios...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={fetchScenarios}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to IDE</span>
            </button>
            <div className="h-5 w-px bg-slate-600" />
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-400" />
              <h1 className="text-lg font-semibold">Test Scenario Dashboard</h1>
            </div>
          </div>

          <button
            onClick={fetchScenarios}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Summary Cards */}
        {data && (
          <SummaryCards
            totalScenarios={data.totalScenarios}
            totalFeatures={data.totalFeatures}
            totalTags={data.tags.length}
            filteredCount={filteredScenarios.length}
            isFiltered={selectedTags.length > 0}
          />
        )}

        {/* Tag Filter */}
        {data && (
          <TagFilter
            tags={data.tags}
            selectedTags={selectedTags}
            onSelectedTagsChange={setSelectedTags}
            filterMode={filterMode}
            onFilterModeChange={setFilterMode}
            filterOperator={filterOperator}
            onFilterOperatorChange={setFilterOperator}
          />
        )}

        {/* Search Box */}
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search scenarios by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Scenario List */}
        {data && (
          <FeatureScenarioList
            features={data.features}
            filteredScenarios={filteredScenarios}
            onNavigate={handleNavigateToEditor}
            highlightedTags={selectedTags}
            filterMode={filterMode}
            searchQuery={searchQuery}
          />
        )}
      </main>
    </div>
  );
};
