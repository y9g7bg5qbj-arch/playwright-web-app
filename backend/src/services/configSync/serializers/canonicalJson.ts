/**
 * Canonical JSON Serialization
 *
 * Produces deterministic JSON output (sorted keys, 2-space indent, trailing newline)
 * so that file diffs are minimal and meaningful.
 */

export function toCanonicalJson(obj: Record<string, unknown>): string {
  return JSON.stringify(obj, Object.keys(obj).sort(), 2) + '\n';
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
