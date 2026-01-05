import { memo } from 'react';
import { NodeProps, Handle, Position } from '@xyflow/react';
import { cn } from '@/lib/utils';
import { BaseNode, BaseNodeData } from './BaseNode';

// Definition of an input prop for the subflow
export interface SubFlowInput {
    name: string;
    type: 'string' | 'number' | 'boolean';
    required?: boolean;
    val?: string | number | boolean; // Current value assigned
}

export interface SubFlowNodeData extends BaseNodeData {
    flowId?: string; // ID of the referenced flow
    inputs?: SubFlowInput[]; // Dynamic inputs defined by that flow
    [key: string]: unknown;
}

export const SubFlowNode = memo((props: NodeProps) => {
    const data = props.data as SubFlowNodeData;

    return (
        <BaseNode
            {...(props as any)}
            className="min-w-[280px] border-purple-500/50 shadow-purple-500/10"
        >
            {/* Header */}
            <div className="flex items-center gap-3 p-1">
                <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-indigo-600/20 border border-purple-500/30 backdrop-blur-sm">
                    <span className="text-xl">🧩</span>
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-purple-400 uppercase tracking-widest">Sub-Flow</span>
                        <div className="flex-1 h-px bg-purple-500/30" />
                    </div>
                    <div className="text-sm font-bold text-slate-200 truncate leading-tight mt-1">
                        {data.label || "Reusable Flow"}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                        {typeof data.description === 'string' ? data.description : "Reference to another flow"}
                    </div>
                </div>
            </div>

            {/* Dynamic Inputs Area */}
            {data.inputs && data.inputs.length > 0 && (
                <div className="mt-3 space-y-2 bg-slate-950/30 -mx-3 px-3 py-3 border-t border-slate-800">
                    <div className="text-[10px] uppercase font-bold text-slate-500 mb-2 px-1">Parameters</div>
                    {data.inputs.map((input, i) => (
                        <div key={i} className="flex items-center gap-2 group/input relative">
                            {/* Input Handle (Left) - For wiring data in */}
                            <Handle
                                type="target"
                                position={Position.Left}
                                id={`input-${input.name}`}
                                className={cn(
                                    "!w-2 !h-2 !left-[-16px]",
                                    "!bg-purple-500 !border-slate-900 transition-all",
                                    "opacity-0 group-hover/input:opacity-100"
                                )}
                            />

                            <div className="w-1/3 text-xs text-slate-400 truncate text-right font-mono" title={input.name}>
                                {input.name}
                            </div>
                            <div className="flex-1">
                                <div className="h-7 px-2 flex items-center bg-slate-900/50 border border-slate-700/50 rounded text-xs text-purple-200 font-mono shadow-inner">
                                    {input.val !== undefined ? <span>{String(input.val)}</span> : <span className="text-slate-600 italic">empty</span>}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Edit Button overlay */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-purple-400 border border-slate-600 shadow-lg text-[10px]">
                    Open Flow ↗
                </button>
            </div>

        </BaseNode>
    );
});

SubFlowNode.displayName = 'SubFlowNode';
