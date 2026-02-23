import type { UtilityAssignmentStatement } from 'vero-lang';
import { ConfigBlock, ConfigRow, ValuePill, EditableField } from './ConfigBlock';
import type { OnEditField } from '../StepConfigPanel';

function describeExpression(expr: UtilityAssignmentStatement['expression']): string {
  switch (expr.type) {
    case 'Trim': return 'Trim';
    case 'Convert': return 'Convert';
    case 'Extract': return 'Extract';
    case 'Replace': return 'Replace';
    case 'Split': return 'Split';
    case 'Join': return 'Join';
    case 'Length': return 'Length';
    case 'Pad': return 'Pad';
    case 'Today': return 'Today';
    case 'Now': return 'Now';
    case 'AddDate': return 'Add Date';
    case 'SubtractDate': return 'Subtract Date';
    case 'Format': return 'Format';
    case 'DatePart': return 'Date Part';
    case 'Round': return 'Round';
    case 'Absolute': return 'Absolute';
    case 'Generate': return 'Generate UUID';
    case 'RandomNumber': return 'Random Number';
    case 'Chained': return 'Chained';
    default: return (expr as { type: string }).type;
  }
}

function getSourceType(expr: UtilityAssignmentStatement['expression']): string {
  // Simple utility expressions with no inputs are "Compute"
  // Expressions that reference a variable/page are "Extract from UI"
  if ('source' in expr) return 'Extract from UI';
  return 'Compute';
}

export function SetVariableConfig({ stmt, onEditField }: { stmt: UtilityAssignmentStatement; onEditField: OnEditField }) {
  const sourceType = getSourceType(stmt.expression);

  return (
    <>
      <ConfigBlock label="VARIABLE SETUP" bgClass="bg-amber-400/[0.06]">
        <ConfigRow label="Type">
          <EditableField
            type="select"
            value={stmt.varType}
            onChange={(v) => onEditField('varType', v)}
            options={[
              { label: 'TEXT', value: 'TEXT' },
              { label: 'NUMBER', value: 'NUMBER' },
              { label: 'FLAG', value: 'FLAG' },
              { label: 'LIST', value: 'LIST' },
            ]}
          />
        </ConfigRow>
        <ConfigRow label="Name">
          <EditableField
            value={stmt.variableName}
            onChange={(v) => onEditField('variableName', v)}
            placeholder="variable name"
          />
        </ConfigRow>
        <ConfigRow label="Source">
          <ValuePill>{sourceType}</ValuePill>
        </ConfigRow>
      </ConfigBlock>

      <ConfigBlock label="VALUE" bgClass="bg-amber-400/[0.03]">
        <ConfigRow label="Function">
          <ValuePill>{describeExpression(stmt.expression)}</ValuePill>
        </ConfigRow>
        {'source' in stmt.expression && (stmt.expression as any).source && (
          <ConfigRow label="Input">
            <ValuePill>
              {typeof (stmt.expression as any).source === 'object' && 'name' in (stmt.expression as any).source
                ? `{${(stmt.expression as any).source.name}}`
                : String((stmt.expression as any).source)
              }
            </ValuePill>
          </ConfigRow>
        )}
      </ConfigBlock>
    </>
  );
}
