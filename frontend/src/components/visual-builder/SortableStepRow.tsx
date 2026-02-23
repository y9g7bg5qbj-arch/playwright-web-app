import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { StepRow } from './StepRow';
import type { FlatStep } from './types';

interface SortableStepRowProps {
  step: FlatStep;
  isSelected: boolean;
  onClick: () => void;
  onDelete?: () => void;
}

export function SortableStepRow({ step, isSelected, onClick, onDelete }: SortableStepRowProps) {
  const isDraggable = step.depth === 0 && !step.blockLabel;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: step.id,
    disabled: !isDraggable,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative' as const,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div className="flex items-center">
        {/* Drag handle - only for top-level non-block steps */}
        {isDraggable ? (
          <button
            {...attributes}
            {...listeners}
            className="
              flex-shrink-0 px-0.5 py-1 cursor-grab active:cursor-grabbing
              text-text-muted/40 hover:text-text-muted transition-colors
            "
            tabIndex={-1}
            aria-label="Drag to reorder"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>drag_indicator</span>
          </button>
        ) : (
          <div className="w-5 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <StepRow
            step={step}
            isSelected={isSelected}
            onClick={onClick}
            onDelete={onDelete}
          />
        </div>
      </div>
    </div>
  );
}
