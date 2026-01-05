import { memo } from 'react';
import { NodeProps, Handle, Position } from '@xyflow/react';
import { BaseNode, BaseNodeData } from './BaseNode';

export interface DataNodeData extends BaseNodeData {
    sourceType?: 'csv' | 'json' | 'variable' | 'database';
    sourcePath?: string;
    itemCount?: number;
    [key: string]: unknown;
}

export const DataNode = memo((props: NodeProps) => {
    const data = props.data as DataNodeData;

    return (
        <BaseNode
            {...(props as any)}
            className="min-w-[200px] border-emerald-500/50 shadow-emerald-500/10"
            showSourceHandle={false} // Custom source handle
        >
            {/* Header */}
            <div className="flex items-center gap-3 p-1">
                <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-600/20 border border-emerald-500/30 backdrop-blur-sm">
                    <span className="text-xl">📊</span>
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Data Source</span>
                    </div>
                    <div className="text-sm font-bold text-slate-200 truncate leading-tight mt-1">
                        {data.label || "Dataset"}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate font-mono">
                        {data.sourceType?.toUpperCase()} {data.sourcePath ? `• ${data.sourcePath}` : ''}
                    </div>
                </div>
            </div>

            {/* Preview / Stats */}
            <div className="mt-3 bg-slate-950/30 -mx-3 px-3 py-2 border-t border-slate-800 flex justify-between items-center">
                <div className="text-[10px] text-slate-500 uppercase font-bold">Records</div>
                <div className="text-xs font-mono text-emerald-200 bg-emerald-900/30 px-2 rounded border border-emerald-500/20">
                    {data.itemCount !== undefined ? data.itemCount : '-'}
                </div>
            </div>

            {/* Output Handles */}
            <div className="absolute -bottom-3 left-0 right-0 flex justify-between px-4">
                {/* List Handle */}
                <div className="relative group/handle">
                    <Handle
                        type="source"
                        position={Position.Bottom}
                        id="list"
                        className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-slate-900"
                    />
                    <span className="absolute top-4 left-1/2 -translate-x-1/2 text-[10px] font-bold text-emerald-500 uppercase tracking-wider">List</span>
                </div>

                {/* Next Handle */}
                <div className="relative group/handle">
                    <Handle
                        type="source"
                        position={Position.Bottom}
                        id="next"
                        className="!w-3 !h-3 !bg-slate-400 !border-2 !border-slate-900"
                    />
                    <span className="absolute top-4 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Next</span>
                </div>
            </div>
        </BaseNode>
    );
});

DataNode.displayName = 'DataNode';
