/**
 * Line-level text operations for editing Vero source files.
 * All line numbers are 1-indexed (matching AST node `line` property).
 */

/** Replace a single line by its 1-based line number */
export function spliceLine(content: string, lineNumber: number, newLine: string): string {
  const lines = content.split('\n');
  const idx = lineNumber - 1;
  if (idx < 0 || idx >= lines.length) return content;
  lines[idx] = newLine;
  return lines.join('\n');
}

/** Delete a range of lines (inclusive, 1-based) */
export function deleteLines(content: string, startLine: number, endLine: number): string {
  const lines = content.split('\n');
  const start = startLine - 1;
  const end = endLine - 1;
  if (start < 0 || start >= lines.length) return content;
  const clampedEnd = Math.min(end, lines.length - 1);
  lines.splice(start, clampedEnd - start + 1);
  return lines.join('\n');
}

/** Insert new lines after a 1-based line number. Use afterLine=0 to insert at the very beginning. */
export function insertLines(content: string, afterLine: number, newLines: string[]): string {
  const lines = content.split('\n');
  const idx = Math.max(0, Math.min(afterLine, lines.length));
  lines.splice(idx, 0, ...newLines);
  return lines.join('\n');
}

/** Replace a range of lines (inclusive, 1-based) with new lines */
export function replaceLines(
  content: string,
  startLine: number,
  endLine: number,
  newLines: string[],
): string {
  const lines = content.split('\n');
  const start = startLine - 1;
  const end = endLine - 1;
  if (start < 0 || start >= lines.length) return content;
  const clampedEnd = Math.min(end, lines.length - 1);
  lines.splice(start, clampedEnd - start + 1, ...newLines);
  return lines.join('\n');
}

/** Get a single line by 1-based line number */
export function getLine(content: string, lineNumber: number): string {
  const lines = content.split('\n');
  const idx = lineNumber - 1;
  if (idx < 0 || idx >= lines.length) return '';
  return lines[idx];
}

/** Get the leading whitespace of a line (preserves existing indentation) */
export function getIndent(content: string, lineNumber: number): string {
  const line = getLine(content, lineNumber);
  const match = line.match(/^(\s*)/);
  return match ? match[1] : '';
}

/** Count total lines in content */
export function lineCount(content: string): number {
  return content.split('\n').length;
}
