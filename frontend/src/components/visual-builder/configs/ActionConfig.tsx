import React from 'react';
import type { StatementNode, ExpressionNode, TargetNode } from 'vero-lang';
import { ConfigBlock, ConfigRow, ValuePill, EditableField } from './ConfigBlock';
import type { OnEditField } from '../StepConfigPanel';
import { usePageRegistry } from './usePageRegistry';

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

/** Detect value source from expression type */
function getValueSource(e: ExpressionNode): string {
  switch (e.type) {
    case 'StringLiteral':
    case 'NumberLiteral':
    case 'BooleanLiteral':
      return 'Literal';
    case 'VariableReference':
      return e.page ? 'Data Column' : 'Variable';
    case 'EnvVarReference':
      return 'Env Var';
    default:
      return 'Literal';
  }
}

function targetDisplay(t: TargetNode): React.ReactNode {
  if (t.page && t.field) {
    return (
      <span>
        <span className="text-text-muted">{t.page}</span>
        <span className="text-text-muted">.</span>
        <span className="text-text-primary font-medium">{t.field}</span>
      </span>
    );
  }
  if (t.field) return <span className="text-text-primary">{t.field}</span>;
  if (t.selector) {
    return (
      <span>
        <span className="text-purple-400">{t.selector.selectorType.toUpperCase()}</span>
        {' '}
        <span className="text-amber-400">"{t.selector.value}"</span>
        {t.selector.modifiers?.map((m, i) => (
          <span key={i} className="text-text-muted ml-1">
            {m.type === 'first' ? 'FIRST' :
             m.type === 'last' ? 'LAST' :
             m.type === 'nth' ? `NTH ${m.index}` :
             m.type === 'withText' ? `WITH TEXT "${m.text}"` :
             m.type === 'withoutText' ? `WITHOUT TEXT "${m.text}"` : ''}
          </span>
        ))}
      </span>
    );
  }
  if (t.text) return <span>"{t.text}"</span>;
  return <span className="text-text-muted">(no target)</span>;
}

/** Get current modifier type from target */
function getModifierType(t: TargetNode): string {
  if (!t.selector?.modifiers?.length) return 'None';
  const mod = t.selector.modifiers[0];
  switch (mod.type) {
    case 'first': return 'FIRST';
    case 'last': return 'LAST';
    case 'nth': return 'NTH';
    case 'withText': return 'WITH TEXT';
    case 'withoutText': return 'WITHOUT TEXT';
    default: return 'None';
  }
}

type ActionStatement = Extract<StatementNode,
  | { type: 'Click' }
  | { type: 'RightClick' }
  | { type: 'DoubleClick' }
  | { type: 'ForceClick' }
  | { type: 'Fill' }
  | { type: 'Check' }
  | { type: 'Uncheck' }
  | { type: 'Hover' }
  | { type: 'Press' }
  | { type: 'Scroll' }
  | { type: 'ClearField' }
  | { type: 'Upload' }
  | { type: 'Download' }
  | { type: 'Drag' }
  | { type: 'Open' }
  | { type: 'Refresh' }
  | { type: 'Select' }
>;

export function ActionConfig({ stmt, onEditField }: { stmt: ActionStatement; onEditField: OnEditField }) {
  const { pageNames, getFieldsForPage } = usePageRegistry();

  // Build page dropdown options
  const pageOptions = pageNames.map(name => ({ label: name, value: name }));

  // Build element dropdown options based on selected page
  const currentPage = 'target' in stmt && stmt.target?.page ? stmt.target.page : null;
  const elementOptions = currentPage
    ? getFieldsForPage(currentPage).map(name => ({ label: name, value: name }))
    : [];

  return (
    <ConfigBlock label="ACTION SETUP" bgClass="bg-blue-400/[0.04]">
      <ConfigRow label="Action">
        <ValuePill>{stmt.type.replace(/([A-Z])/g, ' $1').trim().toUpperCase()}</ValuePill>
      </ConfigRow>

      {'target' in stmt && stmt.target && (
        <>
          {/* Page dropdown — editable select when pages available */}
          {stmt.target.page != null && (
            <ConfigRow label="Page">
              {pageOptions.length > 0 ? (
                <EditableField
                  type="select"
                  value={stmt.target.page}
                  onChange={(v) => onEditField('target.page', v)}
                  options={pageOptions}
                />
              ) : (
                <ValuePill>{stmt.target.page}</ValuePill>
              )}
            </ConfigRow>
          )}

          {/* Element dropdown — editable select when fields available */}
          {stmt.target.field != null && (
            <ConfigRow label="Element">
              {elementOptions.length > 0 ? (
                <EditableField
                  type="select"
                  value={stmt.target.field}
                  onChange={(v) => onEditField('target.field', v)}
                  options={elementOptions}
                />
              ) : (
                <EditableField
                  value={stmt.target.field}
                  onChange={(v) => onEditField('target.field', v)}
                  placeholder="element name"
                />
              )}
            </ConfigRow>
          )}

          {/* Direct selector when no page.field */}
          {!stmt.target.page && !stmt.target.field && stmt.target.selector && (
            <ConfigRow label="Selector">
              <EditableField
                value={stmt.target.selector.value}
                onChange={(v) => onEditField('target.selector.value', v)}
                placeholder="selector value"
              />
            </ConfigRow>
          )}

          {/* Target summary for page.field targets */}
          {stmt.target.page && stmt.target.field && (
            <ConfigRow label="Target">
              {targetDisplay(stmt.target)}
            </ConfigRow>
          )}

          {stmt.target.text && (
            <ConfigRow label="Text">
              <EditableField
                value={stmt.target.text}
                onChange={(v) => onEditField('target.text', v)}
                placeholder="target text"
              />
            </ConfigRow>
          )}

          {/* Modifier dropdown for click-like actions */}
          {stmt.target.selector?.modifiers && (
            <ConfigRow label="Modifier">
              <ValuePill>{getModifierType(stmt.target)}</ValuePill>
            </ConfigRow>
          )}
        </>
      )}

      {stmt.type === 'Fill' && (
        <>
          <ConfigRow label="Value Source">
            <ValuePill>{getValueSource(stmt.value)}</ValuePill>
          </ConfigRow>
          <ConfigRow label="Value">
            <EditableField
              value={exprDisplay(stmt.value)}
              onChange={(v) => onEditField('value', v)}
              placeholder="fill value"
            />
          </ConfigRow>
        </>
      )}

      {stmt.type === 'Open' && (
        <ConfigRow label="URL">
          <EditableField
            value={exprDisplay(stmt.url)}
            onChange={(v) => onEditField('url', v)}
            placeholder="https://..."
          />
        </ConfigRow>
      )}

      {stmt.type === 'Press' && (
        <ConfigRow label="Key">
          <EditableField
            value={stmt.key}
            onChange={(v) => onEditField('key', v)}
            placeholder="Enter, Tab, etc."
          />
        </ConfigRow>
      )}

      {stmt.type === 'Scroll' && (
        <>
          {stmt.direction && (
            <ConfigRow label="Direction">
              <EditableField
                type="select"
                value={stmt.direction}
                onChange={(v) => onEditField('direction', v)}
                options={[
                  { label: 'DOWN', value: 'down' },
                  { label: 'UP', value: 'up' },
                ]}
              />
            </ConfigRow>
          )}
        </>
      )}

      {stmt.type === 'Select' && (
        <ConfigRow label="Option">
          <EditableField
            value={exprDisplay(stmt.option)}
            onChange={(v) => onEditField('option', v)}
            placeholder="option value"
          />
        </ConfigRow>
      )}

      {stmt.type === 'Upload' && (
        <ConfigRow label="Files">
          {stmt.files.map((f, i) => (
            <EditableField
              key={i}
              value={exprDisplay(f)}
              onChange={(v) => onEditField(`files.${i}`, v)}
              placeholder="file path"
            />
          ))}
        </ConfigRow>
      )}

      {stmt.type === 'Download' && stmt.saveAs && (
        <ConfigRow label="Save As">
          <EditableField
            value={exprDisplay(stmt.saveAs)}
            onChange={(v) => onEditField('saveAs', v)}
            placeholder="filename"
          />
        </ConfigRow>
      )}

      {stmt.type === 'Drag' && (
        <ConfigRow label="Destination">
          {stmt.destination.type === 'Coordinate'
            ? <ValuePill>({stmt.destination.x}, {stmt.destination.y})</ValuePill>
            : targetDisplay(stmt.destination)
          }
        </ConfigRow>
      )}
    </ConfigBlock>
  );
}
