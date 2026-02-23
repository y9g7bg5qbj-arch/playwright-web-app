import type { IfElseStatement } from 'vero-lang';
import { ConfigBlock, ConfigRow, ValuePill } from './ConfigBlock';

export function IfElseConfig({ stmt }: { stmt: IfElseStatement }) {
  const { condition } = stmt;

  return (
    <>
      <ConfigBlock label="CONDITION SETUP" bgClass="bg-purple-400/[0.06]">
        <ConfigRow label="Type">
          <ValuePill>
            {condition.type === 'ElementState' ? 'Element State' : 'Variable Check'}
          </ValuePill>
        </ConfigRow>

        {condition.type === 'ElementState' && (
          <>
            {condition.target.page && (
              <ConfigRow label="Page">
                <ValuePill>{condition.target.page}</ValuePill>
              </ConfigRow>
            )}
            {condition.target.field && (
              <ConfigRow label="Element">
                <ValuePill>{condition.target.field}</ValuePill>
              </ConfigRow>
            )}
            <ConfigRow label="State">
              <ValuePill>
                {condition.negated ? 'IS NOT ' : 'IS '}{condition.state}
              </ValuePill>
            </ConfigRow>
          </>
        )}

        {condition.type === 'VariableTruthy' && (
          <ConfigRow label="Variable">
            <ValuePill>{`{${condition.variableName}}`}</ValuePill>
          </ConfigRow>
        )}
      </ConfigBlock>

      <ConfigBlock label="THEN BRANCH" bgClass="bg-emerald-400/[0.04]">
        <div className="text-3xs text-text-secondary">
          {stmt.ifStatements.length} step{stmt.ifStatements.length !== 1 ? 's' : ''} when condition is true
        </div>
      </ConfigBlock>

      {stmt.elseStatements.length > 0 ? (
        <ConfigBlock label="ELSE BRANCH" bgClass="bg-red-400/[0.04]">
          <div className="text-3xs text-text-secondary">
            {stmt.elseStatements.length} step{stmt.elseStatements.length !== 1 ? 's' : ''} when condition is false
          </div>
        </ConfigBlock>
      ) : (
        <ConfigBlock label="ELSE BRANCH" bgClass="bg-red-400/[0.04]">
          <div className="text-3xs text-text-muted italic">No else branch</div>
        </ConfigBlock>
      )}
    </>
  );
}
