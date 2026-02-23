import React, { useMemo } from 'react';
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableStepRow } from './SortableStepRow';
import { AddStepMenu } from './AddStepMenu';
import { useBuilderState } from './VisualBuilderContext';
import { Badge } from '@/components/ui';
import type { FlatStep } from './types';
import type { StatementNode } from 'vero-lang';

interface StepListProps {
  className?: string;
  onDeleteStep?: (step: FlatStep) => void;
  onAddStep?: (afterStep: FlatStep | null, stmt: StatementNode) => void;
  onMoveStep?: (fromIndex: number, toIndex: number) => void;
  onAddScenario?: (name: string) => void;
}

export const StepList = React.memo(function StepList({
  className,
  onDeleteStep,
  onAddStep,
  onMoveStep,
  onAddScenario,
}: StepListProps) {
  const { state, dispatch } = useBuilderState();

  const scenarios = state.scenarios;
  const activeScenarioIndex = state.activeScenarioIndex;
  const activeScenario = scenarios[activeScenarioIndex] ?? null;
  const parseErrors = state.parseErrors;
  const selectedStep: FlatStep | null = activeScenario
    ? activeScenario.steps.find(s => s.id === state.selectedStepId) ?? null
    : null;
  const selectStep = (stepId: string | null) => dispatch({ type: 'SELECT_STEP', stepId });
  const setActiveScenario = (index: number) => dispatch({ type: 'SET_ACTIVE_SCENARIO', index });

  // All step IDs for SortableContext
  const sortableIds = useMemo(() =>
    activeScenario?.steps.map(s => s.id) ?? [],
    [activeScenario?.steps],
  );

  // Handle drag end — map step IDs to statement indices
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !onMoveStep || !activeScenario) return;

    // Only allow reordering top-level non-block steps
    const topLevelSteps = activeScenario.steps.filter(s => s.depth === 0 && !s.blockLabel);
    const fromStep = topLevelSteps.find(s => s.id === active.id);
    const toStep = topLevelSteps.find(s => s.id === over.id);

    if (!fromStep || !toStep) return;

    const fromIdx = fromStep.statementPath[0];
    const toIdx = toStep.statementPath[0];

    if (fromIdx !== undefined && toIdx !== undefined && fromIdx !== toIdx) {
      onMoveStep(fromIdx, toIdx);
    }
  };

  return (
    <div className={`flex flex-col overflow-hidden ${className ?? ''}`}>
      {/* Parse error banner */}
      {parseErrors.length > 0 && (
        <div className="px-3 py-2 bg-red-500/10 border-b border-red-500/30 text-red-400 text-3xs">
          <span className="material-symbols-outlined text-sm align-middle mr-1">error</span>
          {parseErrors.length} parse error{parseErrors.length !== 1 ? 's' : ''} — switch to Code view to fix
        </div>
      )}

      {/* Scenario tabs */}
      {(scenarios.length > 1 || onAddScenario) && (
        <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border-default bg-dark-shell overflow-x-auto no-scrollbar">
          {scenarios.map((s, i) => (
            <button
              key={i}
              onClick={() => setActiveScenario(i)}
              className={`px-2 py-0.5 text-3xs rounded-md border transition-colors whitespace-nowrap ${
                i === activeScenarioIndex
                  ? 'border-brand-primary/60 bg-brand-primary/15 text-text-primary'
                  : 'border-transparent text-text-muted hover:text-text-primary hover:bg-dark-elevated/45'
              }`}
            >
              {s.scenarioName}
            </button>
          ))}
          {onAddScenario && (
            <button
              onClick={() => onAddScenario('New Scenario')}
              className="px-1.5 py-0.5 text-3xs rounded-md border border-dashed border-border-default text-text-muted hover:text-brand-primary hover:border-brand-primary/40 transition-colors"
              title="Add Scenario"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>add</span>
            </button>
          )}
        </div>
      )}

      {/* Scenario header */}
      {activeScenario && (
        <div className="sticky top-0 z-10 px-3 py-2.5 border-b border-border-default bg-dark-shell/95 backdrop-blur-sm">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="material-symbols-outlined text-sm text-brand-primary">science</span>
            <span className="text-xs font-medium text-text-primary">{activeScenario.scenarioName}</span>
            {activeScenario.tags.map(tag => (
              <Badge key={tag} className="text-4xs">{tag}</Badge>
            ))}
            {activeScenario.annotations.map(a => (
              <span key={a} className="text-4xs px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 font-mono">
                @{a}
              </span>
            ))}
          </div>
          <div className="text-4xs text-text-muted mt-0.5">
            {activeScenario.steps.length} step{activeScenario.steps.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {/* Step rows with DnD */}
      <div className="flex-1 overflow-y-auto">
        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
            {activeScenario?.steps.map(step => (
              <SortableStepRow
                key={step.id}
                step={step}
                isSelected={step.id === selectedStep?.id}
                onClick={() => selectStep(step.id)}
                onDelete={onDeleteStep ? () => onDeleteStep(step) : undefined}
              />
            ))}
          </SortableContext>
        </DndContext>

        {/* Empty state */}
        {activeScenario && activeScenario.steps.length === 0 && parseErrors.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-text-muted">
            <span className="material-symbols-outlined text-3xl mb-2">list</span>
            <p className="text-xs">No steps in this scenario</p>
          </div>
        )}

        {/* No scenarios */}
        {scenarios.length === 0 && parseErrors.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-text-muted">
            <span className="material-symbols-outlined text-3xl mb-2">code_off</span>
            <p className="text-xs">No scenarios found</p>
            <p className="text-4xs mt-1">This file may not contain FEATURE/SCENARIO blocks</p>
          </div>
        )}
      </div>

      {/* Add step button */}
      {activeScenario && onAddStep && (
        <AddStepMenu
          onAddStep={(stmt) => onAddStep(selectedStep, stmt)}
        />
      )}
    </div>
  );
});
