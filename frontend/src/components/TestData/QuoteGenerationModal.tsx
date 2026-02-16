import { useEffect, useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui';

export type QuoteSourceScope = 'selected' | 'filtered' | 'all';
export type QuoteOutputFormat = 'plainText' | 'csvSnippet' | 'jsonPayload' | 'veroVariables';

export interface QuoteGenerationInput {
  sourceScope: QuoteSourceScope;
  outputFormat: QuoteOutputFormat;
  prefix: string;
  suffix: string;
}

interface QuoteRow {
  id: string;
  scenarioId: string;
  data: Record<string, unknown>;
}

interface QuoteColumn {
  name: string;
}

interface QuoteGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  rows: QuoteRow[];
  columns: QuoteColumn[];
  selectedRowIds: string[];
  filteredRowIds: string[];
  onCopySuccess?: (message: string) => void;
  onCopyError?: (message: string) => void;
}

const FORMAT_LABEL: Record<QuoteOutputFormat, string> = {
  plainText: 'Plain text',
  csvSnippet: 'CSV snippet',
  jsonPayload: 'JSON payload',
  veroVariables: 'Vero variables',
};

const SCOPE_LABEL: Record<QuoteSourceScope, string> = {
  selected: 'Selected rows',
  filtered: 'Filtered rows',
  all: 'All rows',
};

function stringifyValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function escapeCSVCell(value: string): string {
  if (!/[",\n]/.test(value)) {
    return value;
  }
  return `"${value.replace(/"/g, '""')}"`;
}

function sanitizeIdentifier(raw: string): string {
  return raw
    .trim()
    .replace(/[^a-zA-Z0-9_]+/g, '_')
    .replace(/^_+/, '')
    .replace(/_+$/, '')
    .toLowerCase() || 'value';
}

function buildPlainText(rows: QuoteRow[], columns: QuoteColumn[]): string {
  return rows
    .map((row) => {
      const pairs = columns.map((column) => `${column.name}: ${stringifyValue(row.data[column.name])}`);
      return `${row.scenarioId || row.id}\n${pairs.join(', ')}`;
    })
    .join('\n\n');
}

function buildCSV(rows: QuoteRow[], columns: QuoteColumn[]): string {
  const header = ['TestID', ...columns.map((column) => column.name)].join(',');
  const lines = rows.map((row) => {
    const cells = [row.scenarioId || row.id, ...columns.map((column) => stringifyValue(row.data[column.name]))];
    return cells.map((value) => escapeCSVCell(value)).join(',');
  });
  return [header, ...lines].join('\n');
}

function buildJSON(rows: QuoteRow[]): string {
  const payload = rows.map((row) => ({
    scenarioId: row.scenarioId || row.id,
    ...row.data,
  }));
  return JSON.stringify(payload, null, 2);
}

function buildVeroVariables(rows: QuoteRow[], columns: QuoteColumn[]): string {
  const lines: string[] = [];

  rows.forEach((row, rowIndex) => {
    const rowKey = sanitizeIdentifier(row.scenarioId || `row_${rowIndex + 1}`);
    columns.forEach((column) => {
      const value = row.data[column.name];
      if (value === null || value === undefined || value === '') {
        return;
      }
      const columnKey = sanitizeIdentifier(column.name);
      const variableName = `$${rowKey}_${columnKey}`;

      if (typeof value === 'number') {
        lines.push(`number ${variableName} = ${value}`);
        return;
      }
      if (typeof value === 'boolean') {
        lines.push(`bool ${variableName} = ${value ? 'true' : 'false'}`);
        return;
      }

      const textValue = stringifyValue(value).replace(/"/g, '\\"');
      lines.push(`text ${variableName} = "${textValue}"`);
    });
  });

  return lines.join('\n');
}

function buildOutput(rows: QuoteRow[], columns: QuoteColumn[], format: QuoteOutputFormat): string {
  if (rows.length === 0) {
    return '';
  }
  if (format === 'csvSnippet') {
    return buildCSV(rows, columns);
  }
  if (format === 'jsonPayload') {
    return buildJSON(rows);
  }
  if (format === 'veroVariables') {
    return buildVeroVariables(rows, columns);
  }
  return buildPlainText(rows, columns);
}

function withTemplate(content: string, prefix: string, suffix: string): string {
  const blocks = [prefix.trim(), content.trim(), suffix.trim()].filter(Boolean);
  return blocks.join('\n');
}

export function QuoteGenerationModal({
  isOpen,
  onClose,
  rows,
  columns,
  selectedRowIds,
  filteredRowIds,
  onCopySuccess,
  onCopyError,
}: QuoteGenerationModalProps) {
  const [input, setInput] = useState<QuoteGenerationInput>({
    sourceScope: 'all',
    outputFormat: 'plainText',
    prefix: '',
    suffix: '',
  });

  const selectedRowSet = useMemo(() => new Set(selectedRowIds), [selectedRowIds]);
  const filteredRowSet = useMemo(() => new Set(filteredRowIds), [filteredRowIds]);

  const selectedRows = useMemo(
    () => rows.filter((row) => selectedRowSet.has(row.id)),
    [rows, selectedRowSet]
  );

  const filteredRows = useMemo(() => {
    if (filteredRowIds.length === 0) {
      return rows;
    }
    return rows.filter((row) => filteredRowSet.has(row.id));
  }, [filteredRowIds.length, filteredRowSet, rows]);

  const scopedRows = useMemo(() => {
    if (input.sourceScope === 'selected') {
      return selectedRows;
    }
    if (input.sourceScope === 'filtered') {
      return filteredRows;
    }
    return rows;
  }, [filteredRows, input.sourceScope, rows, selectedRows]);

  const rawOutput = useMemo(
    () => buildOutput(scopedRows, columns, input.outputFormat),
    [columns, input.outputFormat, scopedRows]
  );

  const preview = useMemo(
    () => withTemplate(rawOutput, input.prefix, input.suffix),
    [input.prefix, input.suffix, rawOutput]
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const defaultScope: QuoteSourceScope =
      selectedRowIds.length > 0 ? 'selected' : filteredRowIds.length > 0 ? 'filtered' : 'all';

    setInput({
      sourceScope: defaultScope,
      outputFormat: 'plainText',
      prefix: '',
      suffix: '',
    });
  }, [filteredRowIds.length, isOpen, selectedRowIds.length]);

  const scopeCounts: Record<QuoteSourceScope, number> = {
    selected: selectedRows.length,
    filtered: filteredRows.length,
    all: rows.length,
  };

  const handleCopy = async () => {
    if (!preview.trim()) {
      return;
    }
    try {
      await navigator.clipboard.writeText(preview);
      onCopySuccess?.(`Copied ${scopeCounts[input.sourceScope]} row(s) as ${FORMAT_LABEL[input.outputFormat]}.`);
    } catch (error) {
      console.error('Quote generation copy failed:', error);
      onCopyError?.('Failed to copy generated output.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Quote Generation"
      description="Generate reusable snippets from selected, filtered, or all rows."
      size="2xl"
      footer={
        <div className="flex w-full items-center justify-between">
          <p className="text-xs text-text-muted">
            {scopeCounts[input.sourceScope]} row(s) in scope
          </p>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
            <Button variant="action" onClick={() => { void handleCopy(); }} disabled={!preview.trim()}>
              Copy
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-md border border-border-default bg-dark-elevated/45 p-2.5">
            <p className="mb-2 text-xs font-semibold text-text-primary">Source scope</p>
            <div className="space-y-1.5">
              {(['selected', 'filtered', 'all'] as QuoteSourceScope[]).map((scope) => (
                <label key={scope} className="flex cursor-pointer items-center justify-between rounded border border-border-default bg-dark-bg/60 px-2 py-1.5 text-xs text-text-secondary">
                  <span className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="quote-source-scope"
                      value={scope}
                      checked={input.sourceScope === scope}
                      onChange={() => setInput((prev) => ({ ...prev, sourceScope: scope }))}
                    />
                    {SCOPE_LABEL[scope]}
                  </span>
                  <span className="text-text-muted">{scopeCounts[scope]}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-border-default bg-dark-elevated/45 p-2.5">
            <p className="mb-2 text-xs font-semibold text-text-primary">Output format</p>
            <div className="space-y-1.5">
              {(['plainText', 'csvSnippet', 'jsonPayload', 'veroVariables'] as QuoteOutputFormat[]).map((format) => (
                <label key={format} className="flex cursor-pointer items-center rounded border border-border-default bg-dark-bg/60 px-2 py-1.5 text-xs text-text-secondary">
                  <input
                    type="radio"
                    name="quote-output-format"
                    value={format}
                    checked={input.outputFormat === format}
                    onChange={() => setInput((prev) => ({ ...prev, outputFormat: format }))}
                  />
                  <span className="ml-2">{FORMAT_LABEL[format]}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <div>
            <label htmlFor="quote-prefix" className="mb-1 block text-xs text-text-secondary">
              Prefix template (optional)
            </label>
            <textarea
              id="quote-prefix"
              value={input.prefix}
              onChange={(event) => setInput((prev) => ({ ...prev, prefix: event.target.value }))}
              placeholder="Add context before generated output..."
              className="h-20 w-full rounded-md border border-border-default bg-dark-elevated/70 px-2 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:border-border-active focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="quote-suffix" className="mb-1 block text-xs text-text-secondary">
              Suffix template (optional)
            </label>
            <textarea
              id="quote-suffix"
              value={input.suffix}
              onChange={(event) => setInput((prev) => ({ ...prev, suffix: event.target.value }))}
              placeholder="Add context after generated output..."
              className="h-20 w-full rounded-md border border-border-default bg-dark-elevated/70 px-2 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:border-border-active focus:outline-none"
            />
          </div>
        </div>

        <div className="rounded-md border border-border-default bg-dark-bg/75 p-2.5">
          <p className="mb-2 text-xs font-semibold text-text-primary">Preview</p>
          <pre className="max-h-72 overflow-auto rounded border border-border-default bg-dark-canvas/90 px-2 py-2 text-xxs text-accent-teal">
            {preview || 'No output for current scope. Select rows or switch scope.'}
          </pre>
        </div>
      </div>
    </Modal>
  );
}

export default QuoteGenerationModal;

