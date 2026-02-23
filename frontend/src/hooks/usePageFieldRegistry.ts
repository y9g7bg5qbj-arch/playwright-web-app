/**
 * Hook to populate the page field registry for slash builder dropdowns.
 *
 * Fetches page/field/action metadata from the backend API and registers
 * it in veroLanguage.ts so the slash builder can offer page and field
 * name suggestions in dropdown menus.
 *
 * Mirrors the useTestDataRegistry pattern.
 */

import { useEffect, useRef } from 'react';
import { veroApi } from '@/api/vero';
import { registerPageFields } from '@/components/vero/veroLanguage';

export function usePageFieldRegistry(projectId: string | null | undefined): void {
    const lastProjectId = useRef<string | null>(null);

    useEffect(() => {
        if (!projectId) {
            registerPageFields([]);
            lastProjectId.current = null;
            return;
        }

        // Skip if we already loaded for this project
        if (lastProjectId.current === projectId) return;
        lastProjectId.current = projectId;

        let cancelled = false;

        veroApi.getPageFields(projectId).then((data) => {
            if (cancelled) return;
            registerPageFields(
                data.map((p) => ({
                    name: p.name,
                    filePath: p.filePath,
                    fields: p.fields.map((f) => ({
                        name: f.name,
                        selectorType: f.selectorType,
                        selectorValue: f.selectorValue,
                    })),
                    actions: p.actions.map((a) => ({
                        name: a.name,
                        parameters: a.parameters,
                    })),
                }))
            );
        }).catch((err) => {
            console.warn('[usePageFieldRegistry] Failed to load page fields:', err);
            if (!cancelled) registerPageFields([]);
        });

        return () => { cancelled = true; };
    }, [projectId]);
}
