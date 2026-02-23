/**
 * Central editing hook for the Visual Builder.
 * Bridges UI edit intentions to content mutations via AST manipulation + line splicing.
 */
import { useCallback } from 'react';
import type { StatementNode, ExpressionNode } from 'vero-lang';
import { tokenize, parse } from 'vero-lang';
import { useBuilderState } from './VisualBuilderContext';
import { emitStatement, parseFieldValue, emitScenarioBody } from './emitSource';
import { spliceLine, getIndent, deleteLines, insertLines } from './lineSplice';
import type { FlatStep } from './types';

/** Block statement types that produce multi-line output from emitStatement */
const BLOCK_TYPES = new Set(['ForEach', 'TryCatch', 'IfElse', 'Repeat']);

/**
 * Get the primary child statement array for a block statement.
 * Used to determine where to insert new steps inside the block body.
 */
function getBlockBody(stmt: StatementNode): StatementNode[] {
  switch (stmt.type) {
    case 'ForEach': return (stmt as any).statements;
    case 'Repeat': return (stmt as any).statements;
    case 'TryCatch': return (stmt as any).tryStatements;
    case 'IfElse': return (stmt as any).ifStatements;
    default: return [];
  }
}

/**
 * Deep-clone a value (handles AST nodes which are plain objects).
 */
function deepClone<T>(val: T): T {
  return JSON.parse(JSON.stringify(val));
}

/**
 * Navigate a dot-notation path and set a value on an object.
 * Returns true if the path was found and set.
 */
function setNestedField(obj: Record<string, unknown>, path: string, value: unknown): boolean {
  const parts = path.split('.');
  let current: Record<string, unknown> = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const next = current[parts[i]];
    if (next == null || typeof next !== 'object') return false;
    current = next as Record<string, unknown>;
  }
  const lastKey = parts[parts.length - 1];
  if (!(lastKey in current) && parts.length > 1) {
    // Attempting to set a non-existent nested path - check parent exists
    return false;
  }
  current[lastKey] = value;
  return true;
}

/**
 * Navigate a dot-notation path and get the current value.
 */
function getNestedField(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/**
 * Determine if a value is an ExpressionNode by checking its type.
 */
function isExpressionNode(val: unknown): val is ExpressionNode {
  if (val == null || typeof val !== 'object') return false;
  const type = (val as Record<string, unknown>).type;
  return type === 'StringLiteral' || type === 'NumberLiteral' ||
    type === 'BooleanLiteral' || type === 'VariableReference' || type === 'EnvVarReference';
}

/**
 * Find the end line of a block statement (the line with the closing brace).
 * Scans forward from the statement's start line looking for the matching '}'.
 */
function findBlockEndLine(content: string, startLine: number): number {
  const lines = content.split('\n');
  let depth = 0;
  for (let i = startLine - 1; i < lines.length; i++) {
    const line = lines[i];
    for (const ch of line) {
      if (ch === '{') depth++;
      if (ch === '}') depth--;
    }
    if (depth === 0 && i >= startLine - 1) {
      return i + 1; // Convert to 1-based
    }
  }
  return startLine; // Fallback: couldn't find closing brace
}

/**
 * Re-parse content to get a fresh AST.
 */
function reparseContent(content: string) {
  const { tokens } = tokenize(content);
  const { ast } = parse(tokens);
  return ast;
}

/**
 * Main editing hook.
 * Returns functions for editing fields, deleting steps, adding steps, and reordering.
 */
export function useBuilderEditing(content: string) {
  const { state, dispatch, onChange } = useBuilderState();

  /**
   * Apply a content mutation: push to undo stack and propagate via onChange.
   */
  const applyEdit = useCallback((newContent: string) => {
    dispatch({ type: 'PUSH_CONTENT', content: newContent });
    onChange?.(newContent);
  }, [dispatch, onChange]);

  /**
   * Edit a field on a step's AST node.
   * @param step - The step to edit
   * @param fieldPath - Dot-notation path (e.g. 'url', 'value', 'target.selector.value')
   * @param rawValue - The raw string from the user input
   */
  const editField = useCallback((step: FlatStep, fieldPath: string, rawValue: string) => {
    // Clone the AST node
    const cloned = deepClone(step.node) as unknown as Record<string, unknown>;

    // Get current value at the field path to determine how to set it
    const currentVal = getNestedField(cloned, fieldPath);

    // Determine the new value
    let newVal: unknown;
    if (isExpressionNode(currentVal)) {
      // Expression field → parse user input into ExpressionNode
      newVal = parseFieldValue(rawValue);
    } else if (typeof currentVal === 'number') {
      newVal = Number(rawValue) || 0;
    } else if (typeof currentVal === 'boolean') {
      newVal = rawValue.toLowerCase() === 'true';
    } else {
      // String or unknown → set as string directly
      newVal = rawValue;
    }

    // Apply the field change
    if (!setNestedField(cloned, fieldPath, newVal)) return;

    // Get the existing indentation
    const indent = getIndent(content, step.line);

    // Emit the updated statement
    const emitted = emitStatement(cloned as unknown as StatementNode, indent);

    // For block statements, only replace the header line
    const newLine = BLOCK_TYPES.has((cloned as unknown as StatementNode).type)
      ? emitted.split('\n')[0]
      : emitted;

    // Splice the new line into the content
    const newContent = spliceLine(content, step.line, newLine);
    applyEdit(newContent);
  }, [content, applyEdit]);

  /**
   * Delete a step from the source.
   */
  const deleteStep = useCallback((step: FlatStep) => {
    const stmtType = step.node.type;
    let startLine = step.line;
    let endLine = step.line;

    // For block statements, find the closing brace
    if (BLOCK_TYPES.has(stmtType)) {
      endLine = findBlockEndLine(content, startLine);
    }

    const newContent = deleteLines(content, startLine, endLine);
    applyEdit(newContent);

    // Clear selection
    dispatch({ type: 'SELECT_STEP', stepId: null });
  }, [content, applyEdit, dispatch]);

  /**
   * Add a new step after the given step (or at the beginning if null).
   * @param afterStep - The step after which to insert, or null for beginning
   * @param newStmt - The new statement AST node to insert
   */
  const addStep = useCallback((afterStep: FlatStep | null, newStmt: StatementNode) => {
    // Determine insertion point and indentation
    let afterLine: number;
    let indent: string;

    if (afterStep) {
      if (BLOCK_TYPES.has(afterStep.node.type)) {
        // Insert INSIDE the block body, not after it
        const bodyStmts = getBlockBody(afterStep.node);
        if (bodyStmts.length > 0) {
          // Has children → insert after the last child statement
          const lastChild = bodyStmts[bodyStmts.length - 1];
          afterLine = BLOCK_TYPES.has(lastChild.type)
            ? findBlockEndLine(content, lastChild.line)
            : lastChild.line;
          indent = getIndent(content, lastChild.line);
        } else {
          // Empty block → insert after header line, with extra indentation
          afterLine = afterStep.line;
          indent = getIndent(content, afterStep.line) + '    ';
        }
      } else {
        afterLine = afterStep.line;
        indent = getIndent(content, afterStep.line);
      }
    } else {
      // Insert at the beginning of the active scenario
      const scenario = state.scenarios[state.activeScenarioIndex];
      if (!scenario) return;
      afterLine = scenario.scenarioLine; // After the SCENARIO line with opening brace
      indent = '        '; // Default 8-space indent
    }

    // Emit the new statement
    const emitted = emitStatement(newStmt, indent);
    const newLines = emitted.split('\n');

    // Insert into content
    const newContent = insertLines(content, afterLine, newLines);
    applyEdit(newContent);

    // Auto-select the newly added step after next parse
    dispatch({ type: 'SET_PENDING_SELECT', line: afterLine + 1 });
  }, [content, applyEdit, dispatch, state.scenarios, state.activeScenarioIndex]);

  /**
   * Move a step from one position to another within the same scenario.
   * This re-emits the entire scenario body.
   */
  const moveStep = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;

    const ast = reparseContent(content);
    if (!ast) return;

    const scenario = state.scenarios[state.activeScenarioIndex];
    if (!scenario) return;

    // Find the matching scenario in the fresh AST
    let astScenario = null;
    for (const feature of ast.features) {
      if (scenario.scenarioIndex < feature.scenarios.length) {
        astScenario = feature.scenarios[scenario.scenarioIndex];
        break;
      }
    }
    if (!astScenario) return;

    // Reorder statements
    const stmts = [...astScenario.statements];
    const [moved] = stmts.splice(fromIndex, 1);
    stmts.splice(toIndex, 0, moved);

    // Find the scenario body range (between opening { and closing })
    const scenarioStartLine = scenario.scenarioLine;
    const scenarioEndLine = findBlockEndLine(content, scenarioStartLine);

    // Determine indent from first statement or default
    const indent = scenario.steps.length > 0
      ? getIndent(content, scenario.steps[0].line)
      : '        ';

    // Emit the new body
    const bodyLines = emitScenarioBody(stmts, indent);

    // Get the lines before the body, body itself, and after
    const allLines = content.split('\n');
    const beforeBody = allLines.slice(0, scenarioStartLine); // includes SCENARIO { line
    const afterBody = allLines.slice(scenarioEndLine - 1); // includes closing }

    const newContent = [
      ...beforeBody,
      ...bodyLines,
      ...afterBody,
    ].join('\n');

    applyEdit(newContent);
  }, [content, applyEdit, state.scenarios, state.activeScenarioIndex]);

  /**
   * Add a new empty scenario to the current feature.
   */
  const addScenario = useCallback((name: string) => {
    const ast = reparseContent(content);
    if (!ast || ast.features.length === 0) return;

    // Find the feature that contains the active scenario
    const feature = ast.features[0]; // Typically one feature per file
    const featureLine = feature.line;

    // Find the feature's closing brace by scanning from the feature start
    const lines = content.split('\n');
    let depth = 0;
    let featureEndLine = lines.length;
    for (let i = featureLine - 1; i < lines.length; i++) {
      for (const ch of lines[i]) {
        if (ch === '{') depth++;
        if (ch === '}') depth--;
      }
      if (depth === 0 && i > featureLine - 1) {
        featureEndLine = i + 1; // 1-based
        break;
      }
    }

    // Insert new scenario before the feature's closing brace
    // Scenario names must be valid identifiers (no spaces, no quotes)
    const safeName = name.replace(/[^a-zA-Z0-9_]/g, '');
    const scenarioLines = [
      '',
      `    SCENARIO ${safeName} {`,
      '    }',
    ];

    const newContent = insertLines(content, featureEndLine - 1, scenarioLines);
    applyEdit(newContent);

    // Switch to the new scenario (it's the last one)
    const newIndex = feature.scenarios.length;
    dispatch({ type: 'SET_ACTIVE_SCENARIO', index: newIndex });
  }, [content, applyEdit, dispatch]);

  return {
    editField,
    deleteStep,
    addStep,
    moveStep,
    addScenario,
  };
}
