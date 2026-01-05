import { memo } from 'react';
import { NodeProps } from '@xyflow/react';
import { BaseNode, BaseNodeData } from './BaseNode';
import { Flag } from 'lucide-react';

export const EndNode = memo((props: NodeProps) => {
    const nodeProps = { data: props.data as BaseNodeData, selected: props.selected };
    return (
        <BaseNode
            {...nodeProps}
            showSourceHandle={false}
            className="!border-slate-500/50 !bg-slate-500/10"
        >
            <div className="flex items-center justify-center gap-2 py-1">
                <div className="p-1.5 rounded-full bg-slate-500/20">
                    <Flag className="w-4 h-4 text-slate-400" />
                </div>
                <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">End</span>
            </div>
        </BaseNode>
    );
});

EndNode.displayName = 'EndNode';
