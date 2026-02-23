import type { StatementNode, ScenarioAnnotation, PageNode, PageActionsNode } from 'vero-lang';

export type StepCategory =
  | 'action'
  | 'loop'
  | 'conditional'
  | 'variable'
  | 'error'
  | 'perform';

export interface FlatStep {
  /** Unique ID for React keys and selection tracking */
  id: string;
  /** Display number (e.g. "1", "3.1", "3.5t1") */
  num: string;
  /** Original AST node */
  node: StatementNode;
  /** Nesting depth (0 = top-level) */
  depth: number;
  /** Source line number from AST */
  line: number;
  /** Computed category for color coding */
  category: StepCategory;
  /** Human-readable summary */
  summary: string;
  /** Block label for TryCatch sub-blocks */
  blockLabel?: 'TRY' | 'CATCH';
  /** Path to locate this statement in the nested AST (e.g. [2, 0] = 3rd stmt, 1st child) */
  statementPath: number[];
  /** Index of the scenario within the feature's scenarios array */
  scenarioIndex: number;
}

export interface ScenarioView {
  scenarioName: string;
  scenarioIndex: number;
  tags: string[];
  annotations: ScenarioAnnotation[];
  steps: FlatStep[];
  /** Line number of the SCENARIO declaration */
  scenarioLine: number;
  /** Line number of the closing brace */
  scenarioEndLine?: number;
}

export interface BuilderState {
  scenarios: ScenarioView[];
  activeScenarioIndex: number;
  selectedStepId: string | null;
  parseErrors: Array<{ message: string; line?: number }>;
  /** Pages parsed from the current file's AST */
  pages: PageNode[];
  /** Page actions parsed from the current file's AST */
  pageActions: PageActionsNode[];
  /** Previous content snapshots for undo */
  undoStack: string[];
  /** Forward content snapshots for redo */
  redoStack: string[];
  /** Current content for undo tracking */
  currentContent: string;
  /** Line number to auto-select after next parse (set by addStep) */
  pendingSelectLine: number | null;
}

export type BuilderAction =
  | { type: 'SET_SCENARIOS'; scenarios: ScenarioView[]; parseErrors: Array<{ message: string; line?: number }>; pages: PageNode[]; pageActions: PageActionsNode[] }
  | { type: 'SELECT_STEP'; stepId: string | null }
  | { type: 'SET_ACTIVE_SCENARIO'; index: number }
  | { type: 'SET_PENDING_SELECT'; line: number }
  | { type: 'INIT_CONTENT'; content: string }
  | { type: 'PUSH_CONTENT'; content: string }
  | { type: 'UNDO' }
  | { type: 'REDO' };
