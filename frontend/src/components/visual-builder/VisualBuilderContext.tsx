import React, { createContext, useContext, useReducer, type Dispatch } from 'react';
import type { BuilderState, BuilderAction } from './types';

const initialState: BuilderState = {
  scenarios: [],
  activeScenarioIndex: 0,
  selectedStepId: null,
  parseErrors: [],
  pages: [],
  pageActions: [],
  undoStack: [],
  redoStack: [],
  currentContent: '',
  pendingSelectLine: null,
};

function builderReducer(state: BuilderState, action: BuilderAction): BuilderState {
  switch (action.type) {
    case 'SET_SCENARIOS': {
      const activeIdx = Math.min(state.activeScenarioIndex, Math.max(0, action.scenarios.length - 1));

      // If there's a pending line select (from addStep), find that step and select it
      if (state.pendingSelectLine != null) {
        const scenario = action.scenarios[activeIdx];
        const match = scenario?.steps.find(s => s.line === state.pendingSelectLine);
        return {
          ...state,
          scenarios: action.scenarios,
          parseErrors: action.parseErrors,
          pages: action.pages,
          pageActions: action.pageActions,
          selectedStepId: match?.id ?? null,
          activeScenarioIndex: activeIdx,
          pendingSelectLine: null,
        };
      }

      // Only reset selection when scenarios actually change
      const scenariosChanged = state.scenarios !== action.scenarios;
      return {
        ...state,
        scenarios: action.scenarios,
        parseErrors: action.parseErrors,
        pages: action.pages,
        pageActions: action.pageActions,
        selectedStepId: scenariosChanged ? null : state.selectedStepId,
        activeScenarioIndex: activeIdx,
      };
    }
    case 'SELECT_STEP':
      return { ...state, selectedStepId: action.stepId };
    case 'SET_PENDING_SELECT':
      return { ...state, pendingSelectLine: action.line };
    case 'SET_ACTIVE_SCENARIO':
      return { ...state, activeScenarioIndex: action.index, selectedStepId: null };
    case 'INIT_CONTENT':
      return { ...state, currentContent: action.content };
    case 'PUSH_CONTENT': {
      const undoStack = [...state.undoStack, state.currentContent].slice(-50);
      return {
        ...state,
        currentContent: action.content,
        undoStack,
        redoStack: [],
      };
    }
    case 'UNDO': {
      if (state.undoStack.length === 0) return state;
      const prev = state.undoStack[state.undoStack.length - 1];
      return {
        ...state,
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [...state.redoStack, state.currentContent],
        currentContent: prev,
      };
    }
    case 'REDO': {
      if (state.redoStack.length === 0) return state;
      const next = state.redoStack[state.redoStack.length - 1];
      return {
        ...state,
        redoStack: state.redoStack.slice(0, -1),
        undoStack: [...state.undoStack, state.currentContent],
        currentContent: next,
      };
    }
    default:
      return state;
  }
}

interface VisualBuilderContextValue {
  state: BuilderState;
  dispatch: Dispatch<BuilderAction>;
  onChange?: (content: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const VisualBuilderCtx = createContext<VisualBuilderContextValue | null>(null);

interface VisualBuilderProviderProps {
  onChange?: (content: string) => void;
  children: React.ReactNode;
}

export function VisualBuilderProvider({ onChange, children }: VisualBuilderProviderProps) {
  const [state, dispatch] = useReducer(builderReducer, initialState);

  const undo = React.useCallback(() => {
    if (state.undoStack.length === 0) return;
    dispatch({ type: 'UNDO' });
    // The new currentContent after undo needs to be propagated
    const prev = state.undoStack[state.undoStack.length - 1];
    onChange?.(prev);
  }, [state.undoStack, onChange]);

  const redo = React.useCallback(() => {
    if (state.redoStack.length === 0) return;
    dispatch({ type: 'REDO' });
    const next = state.redoStack[state.redoStack.length - 1];
    onChange?.(next);
  }, [state.redoStack, onChange]);

  const value = React.useMemo(() => ({
    state,
    dispatch,
    onChange,
    undo,
    redo,
    canUndo: state.undoStack.length > 0,
    canRedo: state.redoStack.length > 0,
  }), [state, dispatch, onChange, undo, redo]);

  return (
    <VisualBuilderCtx.Provider value={value}>
      {children}
    </VisualBuilderCtx.Provider>
  );
}

export function useBuilderState(): VisualBuilderContextValue {
  const ctx = useContext(VisualBuilderCtx);
  if (!ctx) throw new Error('useBuilderState must be used within VisualBuilderProvider');
  return ctx;
}
