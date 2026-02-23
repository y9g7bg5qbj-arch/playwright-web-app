import { useEffect, useMemo, useRef } from 'react';
import { tokenize, parse, type PageNode, type PageActionsNode } from 'vero-lang';
import { flattenProgram } from './flattenAst';
import { useBuilderState } from './VisualBuilderContext';
import type { FlatStep, ScenarioView } from './types';

/**
 * Parse Vero content and populate builder state.
 * Call this inside a component wrapped by VisualBuilderProvider.
 */
export function useVisualBuilder(content: string) {
  const { state, dispatch } = useBuilderState();
  const initializedRef = useRef(false);

  // Initialize content tracking on first mount
  useEffect(() => {
    if (!initializedRef.current) {
      dispatch({ type: 'INIT_CONTENT', content });
      initializedRef.current = true;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Parse and flatten whenever content changes
  const parsed = useMemo(() => {
    const errors: Array<{ message: string; line?: number }> = [];

    const { tokens, errors: lexerErrors } = tokenize(content);
    if (lexerErrors.length > 0) {
      return { scenarios: [] as ScenarioView[], errors: lexerErrors, pages: [] as PageNode[], pageActions: [] as PageActionsNode[] };
    }

    const { ast, errors: parseErrors } = parse(tokens);
    if (parseErrors.length > 0) {
      return { scenarios: [] as ScenarioView[], errors: parseErrors, pages: [] as PageNode[], pageActions: [] as PageActionsNode[] };
    }

    const scenarios = flattenProgram(ast);
    return { scenarios, errors, pages: ast.pages, pageActions: ast.pageActions };
  }, [content]);

  // Sync parsed data into context
  useEffect(() => {
    dispatch({
      type: 'SET_SCENARIOS',
      scenarios: parsed.scenarios,
      parseErrors: parsed.errors,
      pages: parsed.pages,
      pageActions: parsed.pageActions,
    });
  }, [parsed, dispatch]);

  const activeScenario = state.scenarios[state.activeScenarioIndex] ?? null;
  const selectedStep: FlatStep | null = activeScenario
    ? activeScenario.steps.find(s => s.id === state.selectedStepId) ?? null
    : null;

  return {
    scenarios: state.scenarios,
    activeScenario,
    activeScenarioIndex: state.activeScenarioIndex,
    selectedStep,
    parseErrors: state.parseErrors,
    selectStep: (stepId: string | null) => dispatch({ type: 'SELECT_STEP', stepId }),
    setActiveScenario: (index: number) => dispatch({ type: 'SET_ACTIVE_SCENARIO', index }),
  };
}
