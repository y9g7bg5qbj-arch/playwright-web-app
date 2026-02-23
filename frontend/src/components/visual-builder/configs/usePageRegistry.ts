import { useMemo, useSyncExternalStore } from 'react';
import { subscribePageFields, getPageFieldsSnapshot, type PageFieldData } from '@/components/vero/veroLanguage';
import { useBuilderState } from '../VisualBuilderContext';

export interface PageRegistryEntry {
  name: string;
  fields: string[];
  actions: Array<{ name: string; parameters: string[] }>;
}

export interface PageRegistryData {
  pageNames: string[];
  pages: PageRegistryEntry[];
  getFieldsForPage: (pageName: string) => string[];
  getActionsForPage: (pageName: string) => Array<{ name: string; parameters: string[] }>;
}

/**
 * Hook that provides page/field/action data for config dropdowns.
 * Merges pages from:
 * 1. The global page field registry (cross-file pages loaded via API)
 * 2. Pages parsed from the current file's AST (via builder context)
 */
export function usePageRegistry(): PageRegistryData {
  const { state } = useBuilderState();

  // Subscribe to global registry changes so we recompute when API data arrives
  const globalPages = useSyncExternalStore(subscribePageFields, getPageFieldsSnapshot);

  return useMemo(() => {
    const pageMap = new Map<string, PageRegistryEntry>();

    // 1. Global registry pages (from API via usePageFieldRegistry)
    for (const p of globalPages) {
      pageMap.set(p.name, {
        name: p.name,
        fields: p.fields.map(f => f.name),
        actions: p.actions,
      });
    }

    // 2. Pages from current file's AST (stored in builder context)
    if (state.pages) {
      for (const page of state.pages) {
        // AST pages override global ones (current file is more up-to-date)
        pageMap.set(page.name, {
          name: page.name,
          fields: page.fields.map(f => f.name),
          actions: (page.actions ?? []).map(a => ({
            name: a.name,
            parameters: a.parameters ?? [],
          })),
        });
      }
    }

    const pages = Array.from(pageMap.values());
    const pageNames = pages.map(p => p.name);

    const getFieldsForPage = (pageName: string): string[] => {
      return pageMap.get(pageName)?.fields ?? [];
    };

    const getActionsForPage = (pageName: string): Array<{ name: string; parameters: string[] }> => {
      return pageMap.get(pageName)?.actions ?? [];
    };

    return { pageNames, pages, getFieldsForPage, getActionsForPage };
  }, [state.pages, globalPages]);
}
