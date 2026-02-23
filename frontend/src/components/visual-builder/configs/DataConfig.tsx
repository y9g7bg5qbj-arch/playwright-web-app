import type { StatementNode } from 'vero-lang';
import { ConfigBlock, ConfigRow, ValuePill, EditableField } from './ConfigBlock';
import type { OnEditField } from '../StepConfigPanel';

type DataStatements = Extract<StatementNode,
  | { type: 'Load' }
  | { type: 'DataQuery' }
  | { type: 'Row' }
  | { type: 'Rows' }
  | { type: 'ColumnAccess' }
  | { type: 'Count' }
>;

export function DataConfig({ stmt, onEditField }: { stmt: DataStatements; onEditField: OnEditField }) {
  return (
    <ConfigBlock label="DATA SETUP" bgClass="bg-blue-400/[0.04]">
      <ConfigRow label="Type">
        <ValuePill>{stmt.type.replace(/([A-Z])/g, ' $1').trim().toUpperCase()}</ValuePill>
      </ConfigRow>

      {stmt.type === 'Load' && (
        <>
          <ConfigRow label="Variable">
            <EditableField
              value={stmt.variable}
              onChange={(v) => onEditField('variable', v)}
              placeholder="variable name"
            />
          </ConfigRow>
          <ConfigRow label="Table">
            <EditableField
              value={stmt.tableName}
              onChange={(v) => onEditField('tableName', v)}
              placeholder="table name"
            />
          </ConfigRow>
          {stmt.projectName && (
            <ConfigRow label="Project">
              <EditableField
                value={stmt.projectName}
                onChange={(v) => onEditField('projectName', v)}
                placeholder="project name"
              />
            </ConfigRow>
          )}
        </>
      )}

      {stmt.type === 'DataQuery' && (
        <>
          <ConfigRow label="Result Type">
            <EditableField
              type="select"
              value={stmt.resultType}
              onChange={(v) => onEditField('resultType', v)}
              options={[
                { label: 'DATA', value: 'DATA' },
                { label: 'LIST', value: 'LIST' },
                { label: 'TEXT', value: 'TEXT' },
                { label: 'NUMBER', value: 'NUMBER' },
                { label: 'FLAG', value: 'FLAG' },
              ]}
            />
          </ConfigRow>
          <ConfigRow label="Variable">
            <EditableField
              value={stmt.variableName}
              onChange={(v) => onEditField('variableName', v)}
              placeholder="variable name"
            />
          </ConfigRow>
        </>
      )}

      {stmt.type === 'Row' && (
        <>
          <ConfigRow label="Variable">
            <EditableField
              value={stmt.variableName}
              onChange={(v) => onEditField('variableName', v)}
              placeholder="variable name"
            />
          </ConfigRow>
          <ConfigRow label="Table">
            <EditableField
              value={stmt.tableRef.tableName}
              onChange={(v) => onEditField('tableRef.tableName', v)}
              placeholder="table name"
            />
          </ConfigRow>
          {stmt.modifier && (
            <ConfigRow label="Modifier">
              <EditableField
                type="select"
                value={stmt.modifier}
                onChange={(v) => onEditField('modifier', v)}
                options={[
                  { label: 'FIRST', value: 'FIRST' },
                  { label: 'LAST', value: 'LAST' },
                  { label: 'RANDOM', value: 'RANDOM' },
                ]}
              />
            </ConfigRow>
          )}
        </>
      )}

      {stmt.type === 'Rows' && (
        <>
          <ConfigRow label="Variable">
            <EditableField
              value={stmt.variableName}
              onChange={(v) => onEditField('variableName', v)}
              placeholder="variable name"
            />
          </ConfigRow>
          <ConfigRow label="Table">
            <EditableField
              value={stmt.tableRef.tableName}
              onChange={(v) => onEditField('tableRef.tableName', v)}
              placeholder="table name"
            />
          </ConfigRow>
          {stmt.limit != null && (
            <ConfigRow label="Limit">
              <EditableField
                value={String(stmt.limit)}
                onChange={(v) => onEditField('limit', v)}
                placeholder="limit"
              />
            </ConfigRow>
          )}
        </>
      )}

      {stmt.type === 'ColumnAccess' && (
        <>
          <ConfigRow label="Variable">
            <EditableField
              value={stmt.variableName}
              onChange={(v) => onEditField('variableName', v)}
              placeholder="variable name"
            />
          </ConfigRow>
          <ConfigRow label="Table">
            <EditableField
              value={stmt.tableRef.tableName}
              onChange={(v) => onEditField('tableRef.tableName', v)}
              placeholder="table name"
            />
          </ConfigRow>
          <ConfigRow label="Column">
            <EditableField
              value={stmt.column}
              onChange={(v) => onEditField('column', v)}
              placeholder="column name"
            />
          </ConfigRow>
        </>
      )}

      {stmt.type === 'Count' && (
        <>
          <ConfigRow label="Variable">
            <EditableField
              value={stmt.variableName}
              onChange={(v) => onEditField('variableName', v)}
              placeholder="variable name"
            />
          </ConfigRow>
          <ConfigRow label="Table">
            <EditableField
              value={stmt.tableRef.tableName}
              onChange={(v) => onEditField('tableRef.tableName', v)}
              placeholder="table name"
            />
          </ConfigRow>
        </>
      )}
    </ConfigBlock>
  );
}
