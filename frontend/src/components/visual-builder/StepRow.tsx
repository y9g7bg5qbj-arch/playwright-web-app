import React from 'react';
import type { FlatStep } from './types';
import { getStepMeta } from './stepTypeMetadata';

interface StepRowProps {
  step: FlatStep;
  isSelected: boolean;
  onClick: () => void;
  onDelete?: () => void;
}

export const StepRow = React.memo(function StepRow({ step, isSelected, onClick, onDelete }: StepRowProps) {
  const meta = getStepMeta(step.node.type);
  const label = step.blockLabel ?? meta.label;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      className={`
        group flex items-center gap-2 px-3 py-1.5 cursor-pointer transition-colors border-l-[3px]
        ${meta.borderColor} ${meta.bgTint}
        ${isSelected
          ? 'ring-1 ring-brand-primary/60 bg-brand-primary/10'
          : 'hover:bg-white/[0.03]'
        }
      `}
      style={{ paddingLeft: step.depth * 20 + 12 }}
    >
      {/* Step number */}
      <span className="text-3xs text-text-muted font-mono w-8 flex-shrink-0 text-right">
        {step.num}
      </span>

      {/* Icon */}
      <span className="material-symbols-outlined text-sm text-text-secondary flex-shrink-0" style={{ fontSize: 16 }}>
        {meta.icon}
      </span>

      {/* Keyword */}
      <span className="text-3xs font-mono font-semibold text-text-primary flex-shrink-0 uppercase tracking-wide">
        {label}
      </span>

      {/* Summary */}
      <span className="text-3xs text-text-secondary truncate min-w-0">
        {step.summary}
      </span>

      {/* Delete button (hover-visible) */}
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm('Delete this step?')) {
              onDelete();
            }
          }}
          className="
            ml-auto flex-shrink-0 p-0.5 rounded
            opacity-0 group-hover:opacity-100
            text-text-muted hover:text-red-400 hover:bg-red-500/10
            transition-all
          "
          title="Delete step"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>close</span>
        </button>
      )}
    </div>
  );
});
