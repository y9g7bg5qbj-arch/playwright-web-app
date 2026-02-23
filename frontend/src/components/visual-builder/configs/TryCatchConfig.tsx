import type { TryCatchStatement } from 'vero-lang';
import { ConfigBlock, ConfigRow } from './ConfigBlock';

export function TryCatchConfig({ stmt }: { stmt: TryCatchStatement }) {
  return (
    <ConfigBlock label="ERROR HANDLING" bgClass="bg-red-400/[0.05]">
      <ConfigRow label="TRY">
        <span className="text-3xs text-text-secondary">
          {stmt.tryStatements.length} step{stmt.tryStatements.length !== 1 ? 's' : ''}
        </span>
      </ConfigRow>
      <ConfigRow label="CATCH">
        <span className="text-3xs text-text-secondary">
          {stmt.catchStatements.length} step{stmt.catchStatements.length !== 1 ? 's' : ''}
        </span>
      </ConfigRow>
    </ConfigBlock>
  );
}
