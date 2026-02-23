import type { ForEachStatement } from 'vero-lang';
import { ConfigBlock, ConfigRow, EditableField } from './ConfigBlock';
import type { OnEditField } from '../StepConfigPanel';

export function ForEachConfig({ stmt, onEditField }: { stmt: ForEachStatement; onEditField: OnEditField }) {
  return (
    <>
      <ConfigBlock label="LOOP SETUP" bgClass="bg-cyan-400/[0.06]">
        <ConfigRow label="Iterator">
          <EditableField
            value={stmt.itemVariable}
            onChange={(v) => onEditField('itemVariable', v)}
            placeholder="item variable"
          />
        </ConfigRow>
        <ConfigRow label="Collection">
          <EditableField
            value={stmt.collectionVariable}
            onChange={(v) => onEditField('collectionVariable', v)}
            placeholder="collection variable"
          />
        </ConfigRow>
      </ConfigBlock>

      <ConfigBlock label="LOOP BODY" bgClass="bg-cyan-400/[0.03]">
        {stmt.statements.length === 0 ? (
          <div className="text-3xs text-text-muted italic">
            No steps yet — select this loop and use Add Step below
          </div>
        ) : (
          <div className="text-3xs text-text-secondary">
            Runs {stmt.statements.length} step{stmt.statements.length !== 1 ? 's' : ''} for
            each <span className="font-mono text-text-primary">{stmt.itemVariable}</span> in <span className="font-mono text-text-primary">{stmt.collectionVariable}</span>
          </div>
        )}
      </ConfigBlock>
    </>
  );
}
