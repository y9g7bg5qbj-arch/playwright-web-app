/**
 * Debug mode helpers extracted from the Transpiler class.
 * Generates debug instrumentation code for line-by-line debugging.
 */

import type {
    StatementNode, TargetNode, ExpressionNode
} from '../parser/ast.js';
import type { TranspileOptions } from './transpiler.js';
import { escapeString } from './transpilerUtils.js';

/**
 * Generate the debug helper object that enables line-by-line debugging.
 * This helper communicates with the parent process via IPC.
 */
export function generateDebugHelper(): string {
    return `
// Debug helper for line-by-line debugging
    const __debugSignalPath = process.env.VERO_DEBUG_SIGNAL_PATH || process.cwd() + '/debug-signal.json';
const __debugEmitToFileEvents = process.env.VERO_DEBUG_EVENTS === 'stdout';
const __debugPollMs = 50;

const __readDebugSignal = (): any => {
  try {
    const fs = require('fs');
    const raw = fs.readFileSync(__debugSignalPath, 'utf8').trim();
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    fs.unlinkSync(__debugSignalPath);
    return parsed;
  } catch (err: any) {
    if (err?.code !== 'ENOENT') {
      // Ignore malformed or transient file reads while preserving step flow.
    }
    return null;
  }
};

const __debugSendEvent = (message: {
  type: string;
  line?: number;
  action?: string;
  target?: string;
  name?: string;
  value?: unknown;
  valueType?: string;
  success?: boolean;
  duration?: number;
  timestamp?: number;
}) => {
  if (process.send) {
    process.send(message);
  }

  if (__debugEmitToFileEvents) {
    try {
    console.log('__VERO_DEBUG_EVENT__' + JSON.stringify(message));
    } catch {
      // Ignore logging failures to avoid disrupting test execution.
    }
  }
};

const __debugWaitForResume = async function (this: { isPaused: boolean; stepMode: boolean; breakpoints: Set<number> }): Promise<void> {
  return new Promise<void>((resolve) => {
    let resolved = false;
    const complete = () => {
      if (resolved) return;
      resolved = true;
      process.removeListener('message', messageHandler);
      clearInterval(poller);
      resolve();
    };

    const messageHandler = (msg: any) => {
      if (!msg || typeof msg !== 'object' || typeof msg.type !== 'string') {
        return;
      }

      if (msg.type === 'resume') {
        this.isPaused = false;
        this.stepMode = false;
        complete();
      } else if (msg.type === 'step') {
        this.stepMode = true;
        this.isPaused = false;
        complete();
      } else if (msg.type === 'stop') {
        process.exit(0);
      } else if (msg.type === 'set-breakpoints') {
        this.breakpoints = new Set(msg.lines || []);
      }
    };

    process.on('message', messageHandler);

    const poller = setInterval(() => {
      const message = __readDebugSignal();
      if (!message || typeof message.type !== 'string') {
        return;
      }

      if (message.type === 'resume') {
        this.isPaused = false;
        this.stepMode = false;
        complete();
      } else if (message.type === 'step') {
        this.stepMode = true;
        this.isPaused = false;
        complete();
      } else if (message.type === 'stop') {
        process.exit(0);
      } else if (message.type === 'set-breakpoints') {
        this.breakpoints = new Set(message.lines || []);
      }
    }, __debugPollMs);
  });
};

const __debug__ = {
  breakpoints: new Set<number>(process.env.VERO_BREAKPOINTS?.split(',').map(Number).filter(n => !isNaN(n)) || []),
  currentLine: 0,
  isPaused: false,
  stepMode: false,

  async beforeStep(line: number, action: string, target?: string): Promise<void> {
    this.currentLine = line;
    __debugSendEvent({ type: 'step:before', line, action, target, timestamp: Date.now() });

    // Check if we should pause (breakpoint hit or step mode)
    if (this.breakpoints.has(line) || this.stepMode) {
      this.isPaused = true;
      __debugSendEvent({ type: 'execution:paused', line, action, target });
      await __debugWaitForResume.call(this);
    }
  },

  async afterStep(line: number, action: string, success: boolean = true, duration?: number): Promise<void> {
    __debugSendEvent({ type: 'step:after', line, action, success, duration, timestamp: Date.now() });
  },

  logVariable(name: string, value: unknown): void {
    __debugSendEvent({
      type: 'variable',
      name,
      value: JSON.stringify(value),
      valueType: typeof value
    });
  }
};
`;
}

/**
 * Wrap a statement with debug markers for line-by-line debugging.
 * Returns the original statement if debug mode is disabled.
 */
export function wrapWithDebug(
    statement: StatementNode,
    code: string,
    options: TranspileOptions,
    indent: number,
    getStatementTargetFn: (s: StatementNode) => string | undefined
): string {
    if (!options.debugMode) {
        return code;
    }

    const line = statement.line;
    const action = statement.type;
    const target = getStatementTargetFn(statement);
    const targetStr = target ? `, '${escapeString(target)}'` : '';
    const scopeSafeCode = code.replace(/^(\s*)(const|let)\b/gm, '$1var');

    const lines: string[] = [];
    lines.push(`const __start_${line}__ = Date.now();`);
    lines.push(`await __debug__.beforeStep(${line}, '${action}'${targetStr});`);
    lines.push(`try {`);
    lines.push(`  ${scopeSafeCode}`);
    lines.push(`  await __debug__.afterStep(${line}, '${action}', true, Date.now() - __start_${line}__);`);
    lines.push(`} catch (e) {`);
    lines.push(`  await __debug__.afterStep(${line}, '${action}', false, Date.now() - __start_${line}__);`);
    lines.push(`  throw e;`);
    lines.push(`}`);

    return lines.join('\n' + '  '.repeat(indent));
}

/**
 * Extract target information from a statement for debug logging.
 */
export function getStatementTarget(statement: StatementNode): string | undefined {
    switch (statement.type) {
        case 'Click':
        case 'RightClick':
        case 'DoubleClick':
        case 'ForceClick':
        case 'Fill':
        case 'Check':
        case 'Hover':
        case 'Upload':
        case 'VerifyHas':
        case 'VerifyScreenshot':
            if ('target' in statement && statement.target) {
                const t = statement.target as TargetNode;
                return t.text || t.field || (t.selector?.value) || undefined;
            }
            return undefined;
        case 'Drag':
            if ('source' in statement && statement.source) {
                const t = statement.source as TargetNode;
                return t.text || t.field || (t.selector?.value) || undefined;
            }
            return undefined;
        case 'Open':
            if ('url' in statement) {
                const url = statement.url as ExpressionNode;
                return url.type === 'StringLiteral' ? url.value : undefined;
            }
            return undefined;
        case 'Press':
            return (statement as any).key;
        case 'VerifyUrl':
        case 'VerifyTitle':
            if ('value' in statement) {
                const val = (statement as any).value as ExpressionNode;
                return val.type === 'StringLiteral' ? val.value : undefined;
            }
            return undefined;
        default:
            return undefined;
    }
}
