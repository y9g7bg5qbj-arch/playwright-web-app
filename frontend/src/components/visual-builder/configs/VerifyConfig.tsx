import type { StatementNode, ExpressionNode } from 'vero-lang';
import { ConfigBlock, ConfigRow, ValuePill, EditableField } from './ConfigBlock';
import type { OnEditField } from '../StepConfigPanel';

function exprDisplay(e: ExpressionNode): string {
  switch (e.type) {
    case 'StringLiteral': return `"${e.value}"`;
    case 'NumberLiteral': return String(e.value);
    case 'BooleanLiteral': return e.value ? 'TRUE' : 'FALSE';
    case 'VariableReference': return e.page ? `${e.page}.${e.name}` : `{${e.name}}`;
    case 'EnvVarReference': return `{{${e.name}}}`;
    default: return '';
  }
}

type VerifyStatements = Extract<StatementNode,
  | { type: 'Verify' }
  | { type: 'VerifyUrl' }
  | { type: 'VerifyTitle' }
  | { type: 'VerifyHas' }
  | { type: 'VerifyScreenshot' }
  | { type: 'VerifyVariable' }
  | { type: 'VerifyResponse' }
>;

export function VerifyConfig({ stmt, onEditField }: { stmt: VerifyStatements; onEditField: OnEditField }) {
  return (
    <ConfigBlock label="ASSERTION SETUP" bgClass="bg-blue-400/[0.04]">
      <ConfigRow label="Type">
        <ValuePill>{stmt.type.replace(/([A-Z])/g, ' $1').trim().toUpperCase()}</ValuePill>
      </ConfigRow>

      {stmt.type === 'Verify' && (
        <>
          <ConfigRow label="Target">
            {stmt.target.type === 'Target' ? (
              <ValuePill>
                {stmt.target.page ? `${stmt.target.page}.` : ''}{stmt.target.field ?? stmt.target.selector?.value ?? ''}
              </ValuePill>
            ) : (
              <ValuePill>{exprDisplay(stmt.target)}</ValuePill>
            )}
          </ConfigRow>
          <ConfigRow label="Condition">
            <EditableField
              type="select"
              value={stmt.condition.operator}
              onChange={(v) => onEditField('condition.operator', v)}
              options={[
                { label: 'IS', value: 'IS' },
                { label: 'IS NOT', value: 'IS_NOT' },
                { label: 'CONTAINS', value: 'CONTAINS' },
                { label: 'NOT CONTAINS', value: 'NOT_CONTAINS' },
              ]}
            />
          </ConfigRow>
          {stmt.condition.value && (
            <ConfigRow label="Expected">
              {typeof stmt.condition.value === 'string' ? (
                <EditableField
                  type="select"
                  value={stmt.condition.value}
                  onChange={(v) => onEditField('condition.value', v)}
                  options={[
                    { label: 'VISIBLE', value: 'VISIBLE' },
                    { label: 'HIDDEN', value: 'HIDDEN' },
                    { label: 'ENABLED', value: 'ENABLED' },
                    { label: 'DISABLED', value: 'DISABLED' },
                    { label: 'CHECKED', value: 'CHECKED' },
                    { label: 'FOCUSED', value: 'FOCUSED' },
                    { label: 'EMPTY', value: 'EMPTY' },
                  ]}
                />
              ) : (
                <EditableField
                  value={exprDisplay(stmt.condition.value)}
                  onChange={(v) => onEditField('condition.value', v)}
                  placeholder="expected value"
                />
              )}
            </ConfigRow>
          )}
        </>
      )}

      {stmt.type === 'VerifyUrl' && (
        <>
          <ConfigRow label="Condition">
            <EditableField
              type="select"
              value={stmt.condition}
              onChange={(v) => onEditField('condition', v)}
              options={[
                { label: 'CONTAINS', value: 'contains' },
                { label: 'EQUALS', value: 'equals' },
                { label: 'MATCHES', value: 'matches' },
              ]}
            />
          </ConfigRow>
          <ConfigRow label="Value">
            <EditableField
              value={exprDisplay(stmt.value)}
              onChange={(v) => onEditField('value', v)}
              placeholder="URL pattern"
            />
          </ConfigRow>
        </>
      )}

      {stmt.type === 'VerifyTitle' && (
        <>
          <ConfigRow label="Condition">
            <EditableField
              type="select"
              value={stmt.condition}
              onChange={(v) => onEditField('condition', v)}
              options={[
                { label: 'CONTAINS', value: 'contains' },
                { label: 'EQUALS', value: 'equals' },
              ]}
            />
          </ConfigRow>
          <ConfigRow label="Value">
            <EditableField
              value={exprDisplay(stmt.value)}
              onChange={(v) => onEditField('value', v)}
              placeholder="page title"
            />
          </ConfigRow>
        </>
      )}

      {stmt.type === 'VerifyHas' && (
        <>
          <ConfigRow label="Target">
            <ValuePill>
              {stmt.target.page ? `${stmt.target.page}.` : ''}{stmt.target.field ?? ''}
            </ValuePill>
          </ConfigRow>
          <ConfigRow label="Condition">
            <ValuePill>{stmt.hasCondition.type}</ValuePill>
          </ConfigRow>
        </>
      )}

      {stmt.type === 'VerifyScreenshot' && (
        <>
          {stmt.name && (
            <ConfigRow label="Name">
              <EditableField
                value={stmt.name}
                onChange={(v) => onEditField('name', v)}
                placeholder="screenshot name"
              />
            </ConfigRow>
          )}
          {stmt.options?.preset && (
            <ConfigRow label="Preset">
              <EditableField
                type="select"
                value={stmt.options.preset}
                onChange={(v) => onEditField('options.preset', v)}
                options={[
                  { label: 'STRICT', value: 'STRICT' },
                  { label: 'BALANCED', value: 'BALANCED' },
                  { label: 'RELAXED', value: 'RELAXED' },
                ]}
              />
            </ConfigRow>
          )}
        </>
      )}

      {stmt.type === 'VerifyVariable' && (
        <>
          <ConfigRow label="Variable">
            <ValuePill>
              {stmt.variable.page ? `${stmt.variable.page}.` : ''}{stmt.variable.name}
            </ValuePill>
          </ConfigRow>
        </>
      )}

      {stmt.type === 'VerifyResponse' && (
        <>
          <ConfigRow label="Check">
            <ValuePill>{stmt.condition.type}</ValuePill>
          </ConfigRow>
          <ConfigRow label="Operator">
            <ValuePill>{stmt.condition.operator}</ValuePill>
          </ConfigRow>
          <ConfigRow label="Value">
            <EditableField
              value={exprDisplay(stmt.condition.value)}
              onChange={(v) => onEditField('condition.value', v)}
              placeholder="expected value"
            />
          </ConfigRow>
        </>
      )}
    </ConfigBlock>
  );
}
