import { useEffect, useRef } from 'react';
import { VisualBuilderProvider, useBuilderState } from './VisualBuilderContext';
import { StepList } from './StepList';
import { StepConfigPanel } from './StepConfigPanel';
import { useVisualBuilder } from './useVisualBuilder';
import { useBuilderEditing } from './useBuilderEditing';

interface VisualBuilderProps {
  content: string;
  filePath: string;
  onChange?: (content: string) => void;
}

function VisualBuilderInner({ content }: { content: string }) {
  const { selectedStep } = useVisualBuilder(content);
  const { deleteStep, addStep, moveStep, addScenario } = useBuilderEditing(content);
  const { undo, redo, canUndo, canRedo } = useBuilderState();
  const containerRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
        e.preventDefault();
        redo();
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('keydown', handler);
      return () => container.removeEventListener('keydown', handler);
    }
  }, [undo, redo]);

  return (
    <div
      ref={containerRef}
      className="flex flex-col flex-1 overflow-hidden bg-dark-canvas"
      tabIndex={-1}
    >
      {/* Undo/Redo toolbar */}
      <div className="flex items-center gap-1 px-3 py-1 border-b border-border-default bg-dark-shell/80">
        <button
          onClick={undo}
          disabled={!canUndo}
          className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-white/5 disabled:opacity-30 disabled:cursor-default transition-colors"
          title="Undo (Ctrl+Z)"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>undo</span>
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-white/5 disabled:opacity-30 disabled:cursor-default transition-colors"
          title="Redo (Ctrl+Shift+Z)"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>redo</span>
        </button>
      </div>

      {/* Main layout: step list + config panel */}
      <div className="flex flex-1 overflow-hidden">
        <StepList
          className="flex-1 min-w-0"
          onDeleteStep={deleteStep}
          onAddStep={addStep}
          onMoveStep={moveStep}
          onAddScenario={addScenario}
        />
        <StepConfigPanel
          selectedStep={selectedStep}
          sourceContent={content}
          className="w-[360px] border-l border-border-default bg-dark-card flex-shrink-0"
        />
      </div>
    </div>
  );
}

export function VisualBuilder({ content, onChange }: VisualBuilderProps) {
  return (
    <VisualBuilderProvider onChange={onChange}>
      <VisualBuilderInner content={content} />
    </VisualBuilderProvider>
  );
}
