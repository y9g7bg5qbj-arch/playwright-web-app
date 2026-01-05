import { memo } from 'react';
import { NodeProps, Handle, Position } from '@xyflow/react';
import { cn } from '@/lib/utils';
import { BaseNodeData } from './BaseNode';

export interface DecisionNodeData extends BaseNodeData {
    condition?: string;
    description?: string;
    [key: string]: unknown;
}

export const DecisionNode = memo(({ data, selected }: NodeProps) => {
    const nodeData = data as DecisionNodeData;

    return (
        <div className="relative group">
            {/* Main Diamond Shape */}
            <div
                className={cn(
                    "w-24 h-24 rotate-45 flex items-center justify-center transition-all duration-300",
                    "bg-gradient-to-br from-amber-500/20 to-orange-600/20 backdrop-blur-md",
                    "border-2",
                    selected
                        ? "border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.3)]"
                        : "border-amber-500/50 hover:border-amber-400/80",
                    nodeData.status === 'running' && "animate-pulse border-amber-300",
                    nodeData.status === 'success' && "border-green-500 bg-green-500/10",
                    nodeData.status === 'failure' && "border-red-500 bg-red-500/10"
                )}
            >
                {/* Inner Content (Counter-rotated) */}
                <div className="-rotate-45 flex flex-col items-center justify-center text-center p-2">
                    <span className="text-2xl mb-1">◇</span>
                </div>
            </div>

            {/* Label (Floating below/center) */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                <div className="flex flex-col items-center justify-center text-center w-40">
                    <span className="text-xs font-bold text-amber-100 bg-slate-900/80 px-2 py-0.5 rounded border border-amber-500/30 backdrop-blur-sm">
                        {nodeData.label || "Decision"}
                    </span>
                    {nodeData.description && (
                        <span className="text-[10px] text-slate-400 mt-1 bg-slate-900/90 px-1 rounded max-w-[120px] truncate">
                            {nodeData.description}
                        </span>
                    )}
                </div>
            </div>

            {/* Input Handle (Top) */}
            <Handle
                type="target"
                position={Position.Top}
                className="!w-3 !h-3 !bg-slate-400 !border-2 !border-slate-900 hover:!bg-blue-400 transition-colors !-top-1"
            />

            {/* Output Handle: True (Right) */}
            <div className="absolute -right-2 top-1/2 -translate-y-1/2">
                <Handle
                    type="source"
                    position={Position.Right}
                    id="true"
                    className="!w-3 !h-3 !bg-green-500 !border-2 !border-slate-900"
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-green-500 uppercase tracking-wider bg-slate-900/50 px-1 rounded">Yes</span>
            </div>

            {/* Output Handle: False (Left) */}
            <div className="absolute -left-2 top-1/2 -translate-y-1/2">
                <Handle
                    type="source"
                    position={Position.Left}
                    id="false"
                    className="!w-3 !h-3 !bg-red-500 !border-2 !border-slate-900"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-red-500 uppercase tracking-wider bg-slate-900/50 px-1 rounded">No</span>
            </div>

            {/* Status Indicator (Corner) */}
            {nodeData.status && nodeData.status !== 'idle' && (
                <div className={cn(
                    "absolute -right-1 -top-1 w-5 h-5 rounded-full flex items-center justify-center z-10 border border-slate-900",
                    nodeData.status === 'running' && "bg-yellow-400",
                    nodeData.status === 'success' && "bg-green-500",
                    nodeData.status === 'failure' && "bg-red-500"
                )}>
                    {nodeData.status === 'running' && <div className="w-2 h-2 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                    {nodeData.status === 'success' && <span className="text-white text-[10px]">✓</span>}
                    {nodeData.status === 'failure' && <span className="text-white text-[10px]">✕</span>}
                </div>
            )}
        </div>
    );
});

DecisionNode.displayName = 'DecisionNode';
