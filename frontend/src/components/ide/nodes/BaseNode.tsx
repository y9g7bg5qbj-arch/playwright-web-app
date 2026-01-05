import { memo, ReactNode } from 'react';
import { Handle, Position } from '@xyflow/react';
import { cn } from '@/lib/utils';
import { useFlowStore } from '@/store/useFlowStore';

export interface BaseNodeData extends Record<string, unknown> {
  label?: string;
  icon?: ReactNode;
  status?: 'idle' | 'running' | 'success' | 'failure' | 'paused';
  selected?: boolean;
  breakpoint?: boolean;
  duration?: number;
  error?: string;
  isConnected?: boolean;
}

interface BaseNodeProps {
  data: BaseNodeData;
  selected?: boolean;
  children?: ReactNode;
  className?: string;
  showTargetHandle?: boolean;
  showSourceHandle?: boolean;
  /** Show data input handle (blue, top) for receiving variable data */
  showDataInputHandle?: boolean;
  /** Show data output handle (blue, bottom) for passing variable data */
  showDataOutputHandle?: boolean;
  /** Labels for data handles */
  dataInputLabel?: string;
  dataOutputLabel?: string;
}

export const BaseNode = memo(({
  data,
  children,
  className,
  selected,
  showTargetHandle = true,
  showSourceHandle = true,
  showDataInputHandle = false,
  showDataOutputHandle = false,
  dataInputLabel,
  dataOutputLabel,
}: BaseNodeProps) => {
  // Check connection status (default to true if undefined to avoid flashing on load)
  const isConnected = data.isConnected !== false;

  // Check if user is actively dragging a connection
  const isConnecting = useFlowStore((state) => state.isConnecting);

  return (
    <div
      className={cn(
        "relative min-w-[200px] rounded-xl border-2 transition-all duration-300",
        "bg-slate-900/80 backdrop-blur-md shadow-xl group",
        selected ? "border-blue-500 shadow-blue-500/20" : "border-slate-700 hover:border-slate-600",
        !isConnected && "opacity-50 border-slate-700 border-dashed grayscale-[0.5]", // Disconnected style
        data.status === 'running' && "border-yellow-400 shadow-yellow-400/20 animate-pulse",
        data.status === 'success' && "border-green-500 shadow-green-500/20",
        data.status === 'failure' && "border-red-500 shadow-red-500/20",
        data.status === 'paused' && "border-orange-500 shadow-orange-500/30",
        className
      )}
    >
      {/* Breakpoint indicator */}
      <div
        className={cn(
          "absolute -left-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full cursor-pointer transition-all z-10",
          data.breakpoint
            ? "bg-red-500 shadow-lg shadow-red-500/50"
            : "bg-slate-700/50 opacity-0 group-hover:opacity-100 hover:bg-red-500/50"
        )}
        title={data.breakpoint ? "Remove breakpoint" : "Add breakpoint"}
      />

      {/* Disconnected Warning Badge */}
      {!isConnected && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500/20 text-amber-500 border border-amber-500/50 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider whitespace-nowrap z-20">
          Disconnected
        </div>
      )}

      {/* Execution status indicator */}
      {data.status && data.status !== 'idle' && (
        <div className={cn(
          "absolute -right-2 -top-2 w-5 h-5 rounded-full flex items-center justify-center z-10",
          data.status === 'running' && "bg-yellow-400",
          data.status === 'success' && "bg-green-500",
          data.status === 'failure' && "bg-red-500",
          data.status === 'paused' && "bg-orange-500 animate-pulse"
        )}>
          {data.status === 'running' && (
            <div className="w-2 h-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
          )}
          {data.status === 'success' && (
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
          {data.status === 'failure' && (
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          {data.status === 'paused' && (
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          )}
        </div>
      )}

      {/* Duration badge */}
      {data.duration && data.status === 'success' && (
        <div className="absolute -right-2 -bottom-2 px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] text-slate-400 font-mono z-10">
          {data.duration < 1000 ? `${data.duration}ms` : `${(data.duration / 1000).toFixed(1)}s`}
        </div>
      )}
      {showTargetHandle && (
        /* Single input handle that accepts multiple connections (Leapwork-style) */
        <Handle
          type="target"
          position={Position.Left}
          id="flow-in"
          isConnectable={true}
          className="!w-3 !h-3 !bg-green-500 !border-2 !border-slate-900 hover:!bg-green-400 transition-colors"
        />
      )}

      <div className="p-3">
        {children}
      </div>

      {showSourceHandle && (
        <Handle
          type="source"
          position={Position.Right}
          id="flow-out"
          className="!w-3 !h-3 !bg-green-500 !border-2 !border-slate-900 hover:!bg-green-400 transition-colors"
        />
      )}

      {/* Data Input Handle (Blue, Top) */}
      {showDataInputHandle && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex flex-col items-center">
          <Handle
            type="target"
            position={Position.Top}
            id="data-in"
            className="!w-3 !h-3 !bg-blue-500 !border-2 !border-slate-900 hover:!bg-blue-400 transition-colors"
          />
          {dataInputLabel && (
            <span className="text-[9px] text-blue-400 font-medium mt-1 bg-slate-900/80 px-1 rounded">
              {dataInputLabel}
            </span>
          )}
        </div>
      )}

      {/* Data Output Handle (Blue, Bottom) */}
      {showDataOutputHandle && (
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex flex-col items-center">
          {dataOutputLabel && (
            <span className="text-[9px] text-blue-400 font-medium mb-1 bg-slate-900/80 px-1 rounded">
              {dataOutputLabel}
            </span>
          )}
          <Handle
            type="source"
            position={Position.Bottom}
            id="data-out"
            className="!w-3 !h-3 !bg-blue-500 !border-2 !border-slate-900 hover:!bg-blue-400 transition-colors"
          />
        </div>
      )}
    </div>
  );
});

BaseNode.displayName = 'BaseNode';
