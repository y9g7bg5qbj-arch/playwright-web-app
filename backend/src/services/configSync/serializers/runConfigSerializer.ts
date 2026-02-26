/**
 * Run Configuration Serializer
 *
 * Converts between MongoRunConfiguration and canonical JSON files.
 */

import type { MongoRunConfiguration } from '../../../db/mongodb';
import { toCanonicalJson, fromCanonicalJson } from './canonicalJson';

/** Fields to include in the serialized JSON file (excludes internal Mongo fields) */
const SERIALIZED_FIELDS = [
  'name', 'description', 'isDefault', 'tags', 'tagMode', 'excludeTags',
  'grep', 'tagExpression', 'namePatterns', 'selectionScope',
  'targetProjectId', 'targetEnvironment',
  'target', 'browser', 'browserChannel', 'headless',
  'viewport', 'workers', 'shardCount', 'retries', 'timeout',
  'tracing', 'screenshot', 'video',
  'visualPreset', 'visualThreshold', 'visualMaxDiffPixels',
  'visualMaxDiffPixelRatio', 'visualUpdateSnapshots',
  'envVars', 'parameterSetId', 'authProfileId',
  'githubRepository', 'githubWorkflowPath', 'runtimeConfig',
] as const;

export function serializeRunConfig(config: MongoRunConfiguration): string {
  const obj: Record<string, unknown> = {};
  for (const key of SERIALIZED_FIELDS) {
    const value = (config as any)[key];
    if (value !== undefined && value !== null) {
      // Parse JSON string fields back to objects for the file
      if (
        typeof value === 'string'
        && (key === 'viewport'
          || key === 'envVars'
          || key === 'namePatterns'
          || key === 'targetEnvironment'
          || key === 'runtimeConfig')
      ) {
        try { obj[key] = JSON.parse(value); } catch { obj[key] = value; }
      } else {
        obj[key] = value;
      }
    }
  }
  return toCanonicalJson(obj);
}

export function deserializeRunConfig(
  raw: string,
  meta: { workflowId: string; projectId?: string },
): Partial<MongoRunConfiguration> | null {
  const parsed = fromCanonicalJson(raw);
  if (!parsed) return null;

  const result: Partial<MongoRunConfiguration> = {
    workflowId: meta.workflowId,
    projectId: meta.projectId,
  };

  for (const key of SERIALIZED_FIELDS) {
    if (key in parsed) {
      const value = (parsed as any)[key];
      // Stringify object fields that MongoDB stores as JSON strings
      if (
        typeof value === 'object'
        && value !== null
        && (key === 'viewport'
          || key === 'envVars'
          || key === 'namePatterns'
          || key === 'targetEnvironment'
          || key === 'runtimeConfig')
      ) {
        (result as any)[key] = JSON.stringify(value);
      } else {
        (result as any)[key] = value;
      }
    }
  }

  return result;
}

export function runConfigFileName(config: MongoRunConfiguration): string {
  const safe = (config.name || config.id).replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  return `${safe}.json`;
}
