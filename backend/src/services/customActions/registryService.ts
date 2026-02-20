/**
 * Custom Actions Registry Service
 *
 * Loads, caches, and resolves custom action manifests from project roots.
 */

import { join, resolve } from 'path';
import { loadAndValidateManifest } from './manifestValidator';
import { logger } from '../../utils/logger';
import type { CustomActionDefinition, CustomActionsManifest } from '@playwright-web-app/shared';

// In-memory cache keyed by projectRoot — refreshed on explicit reload
const cache = new Map<string, { manifest: CustomActionsManifest; loadedAt: number }>();
const CACHE_TTL_MS = 60_000; // 1 minute

function isCacheFresh(loadedAt: number): boolean {
  return Date.now() - loadedAt < CACHE_TTL_MS;
}

/**
 * Load the manifest for a project root, using cache when fresh.
 */
export async function getActions(projectRoot: string): Promise<CustomActionDefinition[]> {
  const cached = cache.get(projectRoot);
  if (cached && isCacheFresh(cached.loadedAt)) {
    return cached.manifest.actions;
  }

  const result = await loadAndValidateManifest(projectRoot);
  if (!result.valid) {
    logger.warn('[CustomActions] Manifest validation errors', { projectRoot, errors: result.errors });
  }

  const manifest = result.manifest || { actions: [] };
  cache.set(projectRoot, { manifest, loadedAt: Date.now() });
  return manifest.actions;
}

/**
 * Resolve an action name to its absolute source file path.
 * Returns null if the action is not found.
 */
export async function resolveActionPath(
  actionName: string,
  projectRoot: string,
): Promise<string | null> {
  const actions = await getActions(projectRoot);
  const action = actions.find((a) => a.name === actionName);
  if (!action) return null;
  return resolve(join(projectRoot, 'custom-actions', 'actions'), action.sourceFile);
}

/**
 * Find an action definition by name.
 */
export async function findAction(
  actionName: string,
  projectRoot: string,
): Promise<CustomActionDefinition | undefined> {
  const actions = await getActions(projectRoot);
  return actions.find((a) => a.name === actionName);
}

/**
 * Force-reload the manifest cache for a project root.
 */
export function invalidateCache(projectRoot: string): void {
  cache.delete(projectRoot);
}
