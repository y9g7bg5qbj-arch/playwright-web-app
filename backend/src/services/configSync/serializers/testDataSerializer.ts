/**
 * Test Data Sheet Serializer
 *
 * Converts between MongoTestDataSheet and canonical JSON files.
 */

import type { MongoTestDataSheet } from '../../../db/mongodb';
import { toCanonicalJson, fromCanonicalJson } from './canonicalJson';

export function serializeTestDataSheet(sheet: MongoTestDataSheet): string {
  const obj: Record<string, unknown> = {
    name: sheet.name,
    description: sheet.description,
    pageObject: sheet.pageObject,
    columns: sheet.columns,
  };
  return toCanonicalJson(obj);
}

export function deserializeTestDataSheet(
  raw: string,
  meta: { applicationId: string; projectId?: string },
): Partial<MongoTestDataSheet> | null {
  const parsed = fromCanonicalJson<any>(raw);
  if (!parsed) return null;

  return {
    applicationId: meta.applicationId,
    projectId: meta.projectId,
    name: parsed.name,
    description: parsed.description,
    pageObject: parsed.pageObject,
    columns: parsed.columns || [],
    version: 1,
  };
}

export function testDataFileName(sheet: MongoTestDataSheet): string {
  const safe = (sheet.name || sheet.id).replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  return `${safe}.json`;
}
