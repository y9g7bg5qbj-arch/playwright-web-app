/**
 * Zustand store for Run Parameters (definitions + sets)
 *
 * Manages parameter definitions (schema) and parameter sets (presets)
 * for per-execution variables.
 */

import { create } from 'zustand';
import { runParametersApi } from '@/api/runParameters';
import type {
  RunParameterDefinition,
  RunParameterDefinitionCreate,
  RunParameterDefinitionUpdate,
  RunParameterSet,
  RunParameterSetCreate,
  RunParameterSetUpdate,
} from '@playwright-web-app/shared';

interface RunParameterState {
  // Data
  definitions: RunParameterDefinition[];
  sets: RunParameterSet[];

  // UI State
  isLoading: boolean;
  error: string | null;
  applicationId: string | null;

  // Actions — definitions
  fetchDefinitions: (applicationId: string) => Promise<void>;
  createDefinition: (data: RunParameterDefinitionCreate) => Promise<RunParameterDefinition>;
  updateDefinition: (id: string, data: RunParameterDefinitionUpdate) => Promise<void>;
  deleteDefinition: (id: string) => Promise<void>;
  reorderDefinitions: (orderedIds: string[]) => Promise<void>;

  // Actions — sets
  fetchSets: (applicationId: string) => Promise<void>;
  createSet: (data: RunParameterSetCreate) => Promise<RunParameterSet>;
  updateSet: (id: string, data: RunParameterSetUpdate) => Promise<void>;
  deleteSet: (id: string) => Promise<void>;
  cloneSet: (id: string) => Promise<RunParameterSet>;

  // Combined fetch
  fetchAll: (applicationId: string) => Promise<void>;

  // Helpers
  getDefaultsMap: () => Record<string, string>;
  getSetValuesMap: (setId: string | undefined) => Record<string, string>;
  getSetValuesWithDefaultFallback: (setId: string | undefined) => Record<string, string>;
}

export const useRunParameterStore = create<RunParameterState>((set, get) => ({
  definitions: [],
  sets: [],
  isLoading: false,
  error: null,
  applicationId: null,

  fetchDefinitions: async (applicationId: string) => {
    try {
      const definitions = await runParametersApi.getDefinitions(applicationId);
      set({ definitions, applicationId });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch definitions' });
    }
  },

  createDefinition: async (data: RunParameterDefinitionCreate) => {
    const { applicationId } = get();
    if (!applicationId) throw new Error('No application selected');

    const definition = await runParametersApi.createDefinition(applicationId, data);
    set((state) => ({ definitions: [...state.definitions, definition] }));
    return definition;
  },

  updateDefinition: async (id: string, data: RunParameterDefinitionUpdate) => {
    const { applicationId } = get();
    if (!applicationId) return;

    const updated = await runParametersApi.updateDefinition(applicationId, id, data);
    set((state) => ({
      definitions: state.definitions.map((d) => (d.id === id ? updated : d)),
    }));
  },

  deleteDefinition: async (id: string) => {
    const { applicationId } = get();
    if (!applicationId) return;

    await runParametersApi.deleteDefinition(applicationId, id);
    set((state) => ({
      definitions: state.definitions.filter((d) => d.id !== id),
    }));
  },

  reorderDefinitions: async (orderedIds: string[]) => {
    const { applicationId } = get();
    if (!applicationId) return;

    const reordered = await runParametersApi.reorderDefinitions(applicationId, orderedIds);
    set({ definitions: reordered });
  },

  fetchSets: async (applicationId: string) => {
    try {
      const sets = await runParametersApi.getSets(applicationId);
      set({ sets, applicationId });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch sets' });
    }
  },

  createSet: async (data: RunParameterSetCreate) => {
    const { applicationId } = get();
    if (!applicationId) throw new Error('No application selected');

    const paramSet = await runParametersApi.createSet(applicationId, data);
    set((state) => ({
      sets: data.isDefault
        ? [...state.sets.map((s) => ({ ...s, isDefault: false })), paramSet]
        : [...state.sets, paramSet],
    }));
    return paramSet;
  },

  updateSet: async (id: string, data: RunParameterSetUpdate) => {
    const { applicationId } = get();
    if (!applicationId) return;

    const updated = await runParametersApi.updateSet(applicationId, id, data);
    set((state) => ({
      sets: data.isDefault
        ? state.sets.map((s) => (s.id === id ? updated : { ...s, isDefault: false }))
        : state.sets.map((s) => (s.id === id ? updated : s)),
    }));
  },

  deleteSet: async (id: string) => {
    const { applicationId } = get();
    if (!applicationId) return;

    await runParametersApi.deleteSet(applicationId, id);
    set((state) => ({ sets: state.sets.filter((s) => s.id !== id) }));
  },

  cloneSet: async (id: string) => {
    const { applicationId } = get();
    if (!applicationId) throw new Error('No application selected');

    const cloned = await runParametersApi.cloneSet(applicationId, id);
    set((state) => ({ sets: [...state.sets, cloned] }));
    return cloned;
  },

  fetchAll: async (applicationId: string) => {
    set({ isLoading: true, error: null, applicationId });
    try {
      const [definitions, sets] = await Promise.all([
        runParametersApi.getDefinitions(applicationId),
        runParametersApi.getSets(applicationId),
      ]);
      set({ definitions, sets, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch run parameters',
        isLoading: false,
      });
    }
  },

  getDefaultsMap: () => {
    const { definitions } = get();
    const map: Record<string, string> = {};
    for (const def of definitions) {
      if (def.defaultValue !== undefined && def.defaultValue !== null) {
        map[def.name] = String(def.defaultValue);
      }
    }
    return map;
  },

  getSetValuesMap: (setId: string | undefined) => {
    if (!setId) return {};
    const { sets } = get();
    const paramSet = sets.find((s) => s.id === setId);
    if (!paramSet) return {};

    const map: Record<string, string> = {};
    for (const [key, value] of Object.entries(paramSet.values)) {
      map[key] = String(value);
    }
    return map;
  },

  getSetValuesWithDefaultFallback: (setId: string | undefined) => {
    const { sets } = get();
    const selectedSet = setId ? sets.find((s) => s.id === setId) : undefined;
    const resolvedSet = selectedSet || sets.find((s) => s.isDefault);
    if (!resolvedSet) return {};

    const map: Record<string, string> = {};
    for (const [key, value] of Object.entries(resolvedSet.values)) {
      map[key] = String(value);
    }
    return map;
  },
}));
