import { useMemo } from 'react';
import type { FlatStep } from '../types';

export interface AvailableVariable {
  name: string;
  type: string; // TEXT, NUMBER, FLAG, LIST, DATA, etc.
}

/**
 * Scans the flat step list up to the given step index to find declared variables.
 * Looks at UtilityAssignment (SET), Load, Row, Rows, ColumnAccess, Count,
 * and PerformAssignment statements that create named variables.
 */
export function useAvailableVariables(
  steps: FlatStep[],
  currentStepId: string | null,
): AvailableVariable[] {
  return useMemo(() => {
    if (!currentStepId || steps.length === 0) return [];

    const vars: AvailableVariable[] = [];
    const seen = new Set<string>();

    for (const step of steps) {
      // Stop at the current step
      if (step.id === currentStepId) break;

      const { node } = step;

      if (node.type === 'UtilityAssignment') {
        if (!seen.has(node.variableName)) {
          seen.add(node.variableName);
          vars.push({ name: node.variableName, type: node.varType });
        }
      } else if (node.type === 'Load') {
        if (!seen.has(node.variable)) {
          seen.add(node.variable);
          vars.push({ name: node.variable, type: 'DATA' });
        }
      } else if (node.type === 'Row') {
        if (!seen.has(node.variableName)) {
          seen.add(node.variableName);
          vars.push({ name: node.variableName, type: 'DATA' });
        }
      } else if (node.type === 'Rows') {
        if (!seen.has(node.variableName)) {
          seen.add(node.variableName);
          vars.push({ name: node.variableName, type: 'LIST' });
        }
      } else if (node.type === 'ColumnAccess') {
        if (!seen.has(node.variableName)) {
          seen.add(node.variableName);
          vars.push({ name: node.variableName, type: 'LIST' });
        }
      } else if (node.type === 'Count') {
        if (!seen.has(node.variableName)) {
          seen.add(node.variableName);
          vars.push({ name: node.variableName, type: 'NUMBER' });
        }
      } else if (node.type === 'PerformAssignment') {
        if (!seen.has(node.variableName)) {
          seen.add(node.variableName);
          vars.push({ name: node.variableName, type: node.varType });
        }
      } else if (node.type === 'DataQuery') {
        if (!seen.has(node.variableName)) {
          seen.add(node.variableName);
          vars.push({ name: node.variableName, type: node.resultType });
        }
      }
    }

    return vars;
  }, [steps, currentStepId]);
}
