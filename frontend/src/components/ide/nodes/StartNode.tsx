import { memo } from 'react';
import { NodeProps } from '@xyflow/react';
import { BaseNode, BaseNodeData } from './BaseNode';
import { Play } from 'lucide-react';

export const StartNode = memo((props: NodeProps) => {
    const nodeProps = { data: props.data as BaseNodeData, selected: props.selected };
    return (
        <BaseNode
            {...nodeProps}
            showTargetHandle={false}
            className="!border-green-500/50 !bg-green-500/10"
        >
            <div className="flex items-center justify-center gap-2 py-1">
                <div className="p-1.5 rounded-full bg-green-500/20">
                    <Play className="w-4 h-4 text-green-400 fill-green-400" />
                </div>
                <span className="text-sm font-bold text-green-400 uppercase tracking-wider">Start</span>
            </div>
        </BaseNode>
    );
});

StartNode.displayName = 'StartNode';
