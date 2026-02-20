/**
 * Custom Actions Manifest Validator
 *
 * Validates the `custom-actions/manifest.json` file that declares
 * externally-authored TypeScript action modules invocable via PERFORM.
 */

import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { join, resolve, dirname } from 'path';
import type { CustomActionsManifest, CustomActionDefinition } from '@playwright-web-app/shared';

const VALID_PARAM_TYPES = new Set(['string', 'number', 'boolean']);
const VALID_RETURN_TYPES = new Set(['FLAG', 'TEXT', 'NUMBER', 'LIST']);
const ACTION_NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]*$/;

export interface ManifestValidationResult {
  valid: boolean;
  manifest?: CustomActionsManifest;
  errors: string[];
}

/**
 * Load and validate a custom-actions manifest from a project root.
 */
export async function loadAndValidateManifest(
  projectRoot: string,
): Promise<ManifestValidationResult> {
  const manifestPath = join(projectRoot, 'custom-actions', 'manifest.json');
  const errors: string[] = [];

  if (!existsSync(manifestPath)) {
    return { valid: true, manifest: { actions: [] }, errors: [] };
  }

  let raw: string;
  try {
    raw = await readFile(manifestPath, 'utf-8');
  } catch (err: any) {
    return { valid: false, errors: [`Cannot read manifest: ${err.message}`] };
  }

  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { valid: false, errors: ['manifest.json is not valid JSON'] };
  }

  if (!parsed || !Array.isArray(parsed.actions)) {
    return { valid: false, errors: ['manifest.json must have an "actions" array'] };
  }

  const seenNames = new Set<string>();
  const actionsDir = join(projectRoot, 'custom-actions', 'actions');
  const manifest: CustomActionsManifest = { actions: [] };

  for (const [idx, action] of (parsed.actions as any[]).entries()) {
    const prefix = `actions[${idx}]`;

    // Required fields
    if (typeof action.name !== 'string' || !action.name.trim()) {
      errors.push(`${prefix}: "name" is required`);
      continue;
    }
    if (!ACTION_NAME_PATTERN.test(action.name)) {
      errors.push(`${prefix}: action name "${action.name}" must match /^[a-zA-Z][a-zA-Z0-9_]*$/`);
    }
    if (seenNames.has(action.name)) {
      errors.push(`${prefix}: duplicate action name "${action.name}"`);
    }
    seenNames.add(action.name);

    if (typeof action.description !== 'string' || !action.description.trim()) {
      errors.push(`${prefix}: "description" is required`);
    }

    if (typeof action.sourceFile !== 'string' || !action.sourceFile.trim()) {
      errors.push(`${prefix}: "sourceFile" is required`);
    } else {
      // Prevent path traversal
      const resolved = resolve(actionsDir, action.sourceFile);
      if (!resolved.startsWith(actionsDir)) {
        errors.push(`${prefix}: sourceFile "${action.sourceFile}" escapes the actions directory`);
      } else if (!existsSync(resolved)) {
        errors.push(`${prefix}: sourceFile "${action.sourceFile}" not found at ${resolved}`);
      }
    }

    // Params
    const params = Array.isArray(action.params) ? action.params : [];
    for (const [pIdx, param] of params.entries()) {
      if (typeof param.name !== 'string') {
        errors.push(`${prefix}.params[${pIdx}]: "name" is required`);
      }
      if (!VALID_PARAM_TYPES.has(param.type)) {
        errors.push(`${prefix}.params[${pIdx}]: invalid type "${param.type}"`);
      }
    }

    // Returns
    if (action.returns !== undefined && !VALID_RETURN_TYPES.has(action.returns)) {
      errors.push(`${prefix}: invalid returns type "${action.returns}"`);
    }

    // Timeout
    if (action.timeoutMs !== undefined && (typeof action.timeoutMs !== 'number' || action.timeoutMs <= 0)) {
      errors.push(`${prefix}: timeoutMs must be a positive number`);
    }

    manifest.actions.push({
      name: action.name,
      description: action.description || '',
      params: params.map((p: any) => ({
        name: p.name,
        type: p.type || 'string',
        required: p.required ?? false,
        description: p.description,
      })),
      returns: action.returns,
      sourceFile: action.sourceFile,
      timeoutMs: action.timeoutMs,
    });
  }

  return { valid: errors.length === 0, manifest, errors };
}
