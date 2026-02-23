import type { PerformStatement, PerformAssignmentStatement, ExpressionNode } from 'vero-lang';
import { ConfigBlock, ConfigRow, EditableField } from './ConfigBlock';
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

export function PerformConfig({ stmt, onEditField }: { stmt: PerformStatement | PerformAssignmentStatement; onEditField: OnEditField }) {
  const action = stmt.action;
  const isAssignment = stmt.type === 'PerformAssignment';
  const { pageNames, getActionsForPage } = usePageRegistry();

  // Build page dropdown options (only pages that have actions)
  const pageOptions = pageNames
    .filter(name => getActionsForPage(name).length > 0)
    .map(name => ({ label: name, value: name }));

  // Build action dropdown options based on selected page
  const actionOptions = action.page
    ? getActionsForPage(action.page).map(a => ({ label: a.name, value: a.name }))
    : [];

  return (
    <ConfigBlock label="ACTION CALL SETUP" bgClass="bg-pink-400/[0.05]">
      {/* Page dropdown */}
      <ConfigRow label="Page">
        {pageOptions.length > 0 ? (
          <EditableField
            type="select"
            value={action.page ?? ''}
            onChange={(v) => onEditField('action.page', v)}
            options={pageOptions}
          />
        ) : (
          <EditableField
            value={action.page ?? ''}
            onChange={(v) => onEditField('action.page', v)}
            placeholder="page name"
          />
        )}
      </ConfigRow>

      {/* Action dropdown */}
      <ConfigRow label="Action">
        {actionOptions.length > 0 ? (
          <EditableField
            type="select"
            value={action.action}
            onChange={(v) => onEditField('action.action', v)}
            options={actionOptions}
          />
        ) : (
          <EditableField
            value={action.action}
            onChange={(v) => onEditField('action.action', v)}
            placeholder="action name"
          />
        )}
      </ConfigRow>

      {action.arguments.length > 0 && (
        <ConfigRow label="Arguments">
          <div className="flex flex-wrap gap-1">
            {action.arguments.map((arg, i) => (
              <EditableField
                key={i}
                value={exprDisplay(arg)}
                onChange={(v) => onEditField(`action.arguments.${i}`, v)}
                placeholder="argument"
              />
            ))}
          </div>
        </ConfigRow>
      )}
      {isAssignment && (
        <>
          <ConfigRow label="Save To">
            <EditableField
              value={(stmt as PerformAssignmentStatement).variableName}
              onChange={(v) => onEditField('variableName', v)}
              placeholder="variable name"
            />
          </ConfigRow>
          <ConfigRow label="Type">
            <EditableField
              type="select"
              value={(stmt as PerformAssignmentStatement).varType}
              onChange={(v) => onEditField('varType', v)}
              options={[
                { label: 'TEXT', value: 'TEXT' },
                { label: 'NUMBER', value: 'NUMBER' },
                { label: 'FLAG', value: 'FLAG' },
                { label: 'LIST', value: 'LIST' },
              ]}
            />
          </ConfigRow>
        </>
      )}
    </ConfigBlock>
  );
}
