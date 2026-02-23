import type { StatementNode, ScenarioNode, ProgramNode } from 'vero-lang';
import type { FlatStep, ScenarioView, StepCategory } from './types';
import { getStepMeta } from './stepTypeMetadata';
import { summarizeStatement } from './summarizeStatement';

/** Categorize a statement for color coding */
function categorize(type: StatementNode['type']): StepCategory {
  return getStepMeta(type).category;
}

/** Build display number with dot notation for nested steps */
function buildNum(parentNum: string, index: number, prefix?: string): string {
  const suffix = prefix ? `${prefix}${index + 1}` : `${index + 1}`;
  return parentNum ? `${parentNum}.${suffix}` : suffix;
}

/**
 * Recursively flatten statements into a linear array with depth tracking.
 * ForEach and TryCatch headers sit at their parent depth, their children at depth+1.
 */
function flattenStatements(
  statements: StatementNode[],
  depth: number,
  parentNum: string,
  parentPath: number[],
  scenarioIndex: number,
): FlatStep[] {
  const result: FlatStep[] = [];
  let stepCounter = 0;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    stepCounter++;
    const num = buildNum(parentNum, stepCounter);
    const path = [...parentPath, i];

    if (stmt.type === 'ForEach') {
      // ForEach header
      result.push({
        id: `step-${num}`,
        num,
        node: stmt,
        depth,
        line: stmt.line,
        category: categorize(stmt.type),
        summary: summarizeStatement(stmt),
        statementPath: path,
        scenarioIndex,
      });
      // Flatten body at depth+1
      result.push(...flattenStatements(stmt.statements, depth + 1, num, [...path, -1], scenarioIndex));

    } else if (stmt.type === 'TryCatch') {
      // TRY header
      const tryNum = `${num}t`;
      result.push({
        id: `step-${num}-try`,
        num,
        node: stmt,
        depth,
        line: stmt.line,
        category: categorize(stmt.type),
        summary: `TRY (${stmt.tryStatements.length} steps)`,
        blockLabel: 'TRY',
        statementPath: path,
        scenarioIndex,
      });
      // TRY body — use -2 sentinel to distinguish try vs catch children
      result.push(...flattenStatements(stmt.tryStatements, depth + 1, tryNum, [...path, -2], scenarioIndex));

      // CATCH header
      const catchNum = `${num}c`;
      result.push({
        id: `step-${num}-catch`,
        num: `${num}`,
        node: stmt,
        depth,
        line: stmt.line,
        category: categorize(stmt.type),
        summary: `CATCH (${stmt.catchStatements.length} steps)`,
        blockLabel: 'CATCH',
        statementPath: path,
        scenarioIndex,
      });
      // CATCH body — use -3 sentinel
      result.push(...flattenStatements(stmt.catchStatements, depth + 1, catchNum, [...path, -3], scenarioIndex));

    } else if (stmt.type === 'IfElse') {
      // IF header
      result.push({
        id: `step-${num}`,
        num,
        node: stmt,
        depth,
        line: stmt.line,
        category: categorize(stmt.type),
        summary: summarizeStatement(stmt),
        statementPath: path,
        scenarioIndex,
      });
      // THEN body
      result.push(...flattenStatements(stmt.ifStatements, depth + 1, `${num}a`, [...path, -4], scenarioIndex));
      // ELSE body (if present)
      if (stmt.elseStatements.length > 0) {
        result.push(...flattenStatements(stmt.elseStatements, depth + 1, `${num}b`, [...path, -5], scenarioIndex));
      }

    } else if (stmt.type === 'Repeat') {
      // REPEAT header
      result.push({
        id: `step-${num}`,
        num,
        node: stmt,
        depth,
        line: stmt.line,
        category: categorize(stmt.type),
        summary: summarizeStatement(stmt),
        statementPath: path,
        scenarioIndex,
      });
      // REPEAT body
      result.push(...flattenStatements(stmt.statements, depth + 1, num, [...path, -1], scenarioIndex));

    } else {
      result.push({
        id: `step-${num}`,
        num,
        node: stmt,
        depth,
        line: stmt.line,
        category: categorize(stmt.type),
        summary: summarizeStatement(stmt),
        statementPath: path,
        scenarioIndex,
      });
    }
  }

  return result;
}

/** Flatten a single scenario into a ScenarioView */
export function flattenScenario(scenario: ScenarioNode, scenarioIndex: number): ScenarioView {
  return {
    scenarioName: scenario.name,
    scenarioIndex,
    tags: scenario.tags,
    annotations: scenario.annotations,
    steps: flattenStatements(scenario.statements, 0, '', [], scenarioIndex),
    scenarioLine: scenario.line,
  };
}

/** Extract all scenario views from a parsed AST */
export function flattenProgram(ast: ProgramNode): ScenarioView[] {
  const views: ScenarioView[] = [];
  for (const feature of ast.features) {
    for (let i = 0; i < feature.scenarios.length; i++) {
      views.push(flattenScenario(feature.scenarios[i], i));
    }
  }
  return views;
}
