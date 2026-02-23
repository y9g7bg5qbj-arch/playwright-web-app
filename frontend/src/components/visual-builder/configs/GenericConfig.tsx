import type { StatementNode, ExpressionNode } from 'vero-lang';
import { ConfigBlock, ConfigRow, ValuePill, EditableField } from './ConfigBlock';
import { getStepMeta } from '../stepTypeMetadata';
import type { OnEditField } from '../StepConfigPanel';

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'object' && 'type' in val) {
    const expr = val as ExpressionNode;
    switch (expr.type) {
      case 'StringLiteral': return `"${expr.value}"`;
      case 'NumberLiteral': return String(expr.value);
      case 'BooleanLiteral': return expr.value ? 'TRUE' : 'FALSE';
      case 'VariableReference': return expr.page ? `${expr.page}.${expr.name}` : `{${expr.name}}`;
      case 'EnvVarReference': return `{{${expr.name}}}`;
    }
  }
  return JSON.stringify(val);
}

/** Keys that should not be editable */
const READ_ONLY_KEYS = new Set(['type', 'line']);

/** Check if a value is a simple editable type */
function isEditableValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (Array.isArray(value)) return false;
  if (typeof value === 'object' && value !== null) {
    if ('type' in value) {
      const t = (value as Record<string, unknown>).type;
      return t === 'StringLiteral' || t === 'NumberLiteral' ||
        t === 'BooleanLiteral' || t === 'VariableReference' || t === 'EnvVarReference';
    }
    return false;
  }
  return true;
}

/** Fallback config that shows all node properties with editable fields where possible */
export function GenericConfig({ stmt, onEditField }: { stmt: StatementNode; onEditField: OnEditField }) {
  const meta = getStepMeta(stmt.type);
  const entries = Object.entries(stmt).filter(([key]) => !READ_ONLY_KEYS.has(key));

  return (
    <ConfigBlock label="STEP DETAILS" bgClass={meta.bgTint}>
      {entries.map(([key, value]) => (
        <ConfigRow key={key} label={key}>
          {isEditableValue(value) ? (
            <EditableField
              value={formatValue(value)}
              onChange={(v) => onEditField(key, v)}
              placeholder={key}
            />
          ) : Array.isArray(value) ? (
            <span className="text-text-secondary">{value.length} items</span>
          ) : (
            <ValuePill>{formatValue(value)}</ValuePill>
          )}
        </ConfigRow>
      ))}
      {entries.length === 0 && (
        <div className="text-3xs text-text-muted">No additional configuration</div>
      )}
    </ConfigBlock>
  );
}
