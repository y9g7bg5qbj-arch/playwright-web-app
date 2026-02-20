/**
 * Auth Profile Metadata Serializer
 *
 * Serializes auth profile metadata (NOT the storage state file) to JSON.
 */

import type { MongoAuthProfile } from '../../../db/mongodb';
import { toCanonicalJson, fromCanonicalJson } from './canonicalJson';

export function serializeAuthProfile(profile: MongoAuthProfile): string {
  const obj: Record<string, unknown> = {
    name: profile.name,
    description: profile.description,
    loginScriptPath: profile.loginScriptPath,
    status: profile.status,
  };
  return toCanonicalJson(obj);
}

export function deserializeAuthProfile(
  raw: string,
  meta: { applicationId: string; projectId: string; createdBy: string },
): Partial<MongoAuthProfile> | null {
  const parsed = fromCanonicalJson<any>(raw);
  if (!parsed) return null;

  return {
    applicationId: meta.applicationId,
    projectId: meta.projectId,
    name: parsed.name,
    description: parsed.description,
    loginScriptPath: parsed.loginScriptPath,
    status: parsed.status || 'expired',
    createdBy: meta.createdBy,
  };
}

export function authProfileFileName(profile: MongoAuthProfile): string {
  const safe = (profile.name || profile.id).replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  return `${safe}.json`;
}
