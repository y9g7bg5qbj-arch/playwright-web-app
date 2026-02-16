/**
 * Hook to populate the test data registry for editor autocomplete.
 *
 * Fetches the lightweight schema (table names + column names/types) from the API
 * and registers it in veroLanguage.ts so VDQL completion providers can offer
 * real table and column name suggestions.
 */

import { useEffect, useRef } from 'react';
import { testDataApi } from '@/api/testData';
import { registerTestDataSheets } from '@/components/vero/veroLanguage';

export function useTestDataRegistry(projectId: string | null | undefined): void {
    const lastProjectId = useRef<string | null>(null);

    useEffect(() => {
        if (!projectId) {
            // Clear registry when no project is selected
            registerTestDataSheets([]);
            lastProjectId.current = null;
            return;
        }

        // Skip if we already loaded for this project
        if (lastProjectId.current === projectId) return;
        lastProjectId.current = projectId;

        let cancelled = false;

        testDataApi.getSchema(projectId).then((schema) => {
            if (cancelled) return;
            registerTestDataSheets(
                schema.map((s) => ({
                    name: s.name,
                    columns: s.columns.map((c) => ({ name: c.name, type: c.type })),
                }))
            );
        }).catch((err) => {
            console.warn('[useTestDataRegistry] Failed to load schema:', err);
            if (!cancelled) registerTestDataSheets([]);
        });

        return () => { cancelled = true; };
    }, [projectId]);
}
