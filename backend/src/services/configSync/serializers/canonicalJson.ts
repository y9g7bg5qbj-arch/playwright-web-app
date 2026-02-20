/**
 * Canonical JSON Serialization
 *
 * Produces deterministic JSON output (sorted keys, 2-space indent, trailing newline)
 * so that file diffs are minimal and meaningful.
 */

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value !== null && typeof value === 'object') {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[key] = sortKeysDeep((value as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return value;
}

export function toCanonicalJson(obj: Record<string, unknown>): string {
  return JSON.stringify(sortKeysDeep(obj), null, 2) + '\n';
}

/**
 * Parse canonical JSON from a string, returning null on failure.
 */
export function fromCanonicalJson<T = Record<string, unknown>>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
