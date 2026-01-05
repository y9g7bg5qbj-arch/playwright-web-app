import { memo, useState, useCallback } from 'react';
import { NodeProps, Handle, Position } from '@xyflow/react';
import { ChevronDown, ChevronUp, Info, Trash2 } from 'lucide-react';
import { BaseNode, BaseNodeData } from './BaseNode';
import { blockDefinitions, ConfigField } from '../blockDefinitions';
import { useFlowStore } from '@/store/useFlowStore';
import { cn } from '@/lib/utils';

export interface ActionNodeData extends BaseNodeData {
    actionType: string;
    description?: string;
    value?: string;
    selector?: string;
    url?: string;
    isExpanded?: boolean;
    [key: string]: unknown;
}

export const ActionNode = memo((props: NodeProps) => {
    const data = props.data as ActionNodeData;
    const definition = blockDefinitions[data.actionType];
    const [isExpanded, setIsExpanded] = useState(data.isExpanded ?? false);
    const { nodes, setNodes } = useFlowStore();

    // Update node data helper
    const updateNodeData = useCallback((key: string, value: any) => {
        setNodes(nodes.map((n) => {
            if (n.id === props.id) {
                return {
                    ...n,
                    data: {
                        ...n.data,
                        [key]: value
                    }
                };
            }
            return n;
        }));
    }, [nodes, setNodes, props.id]);

    // Delete node helper
    const deleteNode = useCallback(() => {
        useFlowStore.getState().deleteNode(props.id);
    }, [props.id]);

    // Fallback if definition missing
    if (!definition) {
        return (
            <BaseNode {...(props as any)}>
                <div className="text-red-400">Unknown Block: {data.actionType}</div>
            </BaseNode>
        );
    }

    const isControl = definition.category === 'control';
    const hasElse = definition.hasElseBranch;
    const hasCatch = definition.hasCatchBranch;
    const isLoop = definition.type?.includes('loop') || false;

    // Has any config to show?
    const hasConfig = data.value || data.selector || data.url;

    // Determine background color based on category
    const getColors = () => {
        switch (definition.category) {
            case 'control': return 'from-amber-500/20 to-orange-500/20 border-amber-500/30';
            case 'assertion': return 'from-teal-500/20 to-emerald-500/20 border-teal-500/30';
            case 'wait': return 'from-orange-500/20 to-red-500/20 border-orange-500/30';
            case 'data': return 'from-purple-500/20 to-pink-500/20 border-purple-500/30';
            case 'network': return 'from-pink-500/20 to-rose-500/20 border-pink-500/30';
            case 'advanced': return 'from-rose-500/20 to-red-500/20 border-rose-500/30';
            default: return 'from-blue-500/20 to-indigo-500/20 border-blue-500/30';
        }
    };

    const getAccentColor = () => {
        switch (definition.category) {
            case 'control': return 'text-amber-400';
            case 'assertion': return 'text-teal-400';
            case 'wait': return 'text-orange-400';
            case 'data': return 'text-purple-400';
            case 'network': return 'text-pink-400';
            case 'advanced': return 'text-rose-400';
            default: return 'text-blue-400';
        }
    };

    // Render a single config field
    const renderField = (field: ConfigField): JSX.Element | null => {
        const value = data[field.name] ?? field.defaultValue ?? '';

        // Check visibility conditions
        if (field.showWhen) {
            const dependentValue = data[field.showWhen.field];
            if (!field.showWhen.values.includes(dependentValue)) {
                return null;
            }
        }

        return (
            <div key={field.name} className="space-y-1">
                <div className="flex items-center justify-between">
                    <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">
                        {field.label} {field.required && <span className="text-red-400">*</span>}
                    </label>
                    {field.description && (
                        <div className="group relative">
                            <Info className="w-2.5 h-2.5 text-slate-600 cursor-help" />
                            <div className="absolute right-0 top-3 w-40 p-1.5 bg-slate-800 border border-slate-700 rounded text-[10px] text-slate-300 z-50 hidden group-hover:block shadow-xl">
                                {field.description}
                            </div>
                        </div>
                    )}
                </div>

                {field.type === 'select' ? (
                    <select
                        value={value}
                        onChange={(e) => {
                            e.stopPropagation();
                            updateNodeData(field.name, e.target.value);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-200 focus:outline-none focus:border-blue-500/50 transition-colors appearance-none"
                    >
                        {field.options?.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                ) : field.type === 'boolean' ? (
                    <div
                        className="flex items-center gap-2"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <input
                            type="checkbox"
                            checked={!!value}
                            onChange={(e) => {
                                e.stopPropagation();
                                updateNodeData(field.name, e.target.checked);
                            }}
                            className="w-3 h-3 rounded border-slate-700 bg-slate-950 text-blue-600"
                        />
                        <span className="text-[10px] text-slate-400">{value ? 'Yes' : 'No'}</span>
                    </div>
                ) : field.type === 'textarea' ? (
                    <textarea
                        value={value}
                        onChange={(e) => {
                            e.stopPropagation();
                            updateNodeData(field.name, e.target.value);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        placeholder={field.placeholder}
                        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-200 focus:outline-none focus:border-blue-500/50 transition-colors font-mono resize-none h-14"
                    />
                ) : (
                    <input
                        type={field.type === 'number' ? 'number' : 'text'}
                        value={value}
                        onChange={(e) => {
                            e.stopPropagation();
                            updateNodeData(field.name, field.type === 'number' ? Number(e.target.value) : e.target.value);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        placeholder={field.placeholder}
                        min={field.min}
                        max={field.max}
                        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-200 focus:outline-none focus:border-blue-500/50 transition-colors font-mono"
                    />
                )}
            </div>
        );
    };

    return (
        <BaseNode
            {...(props as any)}
            showSourceHandle={!hasElse && !hasCatch && !isLoop}
            className={cn(
                "!min-w-[200px] transition-all duration-200",
                isControl && "!min-w-[240px]",
                isExpanded && "!min-w-[280px]",
                !isExpanded && "!py-2"
            )}
        >
            {/* Compact Header - Always Visible */}
            <div className="flex items-center gap-2 select-none">
                {/* Icon */}
                <div className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br border backdrop-blur-sm shrink-0",
                    getColors()
                )}>
                    <span className="text-base">{definition.icon}</span>
                </div>

                {/* Title */}
                <div className="flex-1 min-w-0">
                    <div className={cn("text-sm font-semibold truncate", getAccentColor())}>
                        {definition.title}
                    </div>
                    {/* Compact value preview when collapsed */}
                    {!isExpanded && hasConfig && (
                        <div className="text-[10px] text-slate-500 truncate max-w-[140px]">
                            {data.value || data.selector || data.url}
                        </div>
                    )}
                </div>
            </div>

            {/* Expand Arrow at Bottom - When Collapsed */}
            {!isExpanded && (
                <button
                    className="w-full mt-2 pt-1.5 border-t border-slate-800/30 flex items-center justify-center hover:bg-slate-800/30 rounded-b transition-colors cursor-pointer"
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsExpanded(true);
                    }}
                >
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                </button>
            )}

            {/* Expanded Configuration - Full Form */}
            {isExpanded && (
                <div
                    className="mt-3 pt-3 border-t border-slate-800/50 space-y-3"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Description */}
                    <div className="text-[10px] text-slate-500 italic">
                        {definition.description}
                    </div>

                    {/* All Config Fields */}
                    <div className="space-y-2.5">
                        {definition.configFields.map((field) => {
                            const rendered = renderField(field);
                            return rendered;
                        })}
                    </div>

                    {/* Notes/Description Field */}
                    <div className="space-y-1 pt-2 border-t border-slate-800/30">
                        <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Notes</label>
                        <textarea
                            value={data.description || ''}
                            onChange={(e) => {
                                e.stopPropagation();
                                updateNodeData('description', e.target.value);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-200 focus:outline-none focus:border-blue-500/50 transition-colors resize-none h-12"
                            placeholder="Add notes about this step..."
                        />
                    </div>

                    {/* Delete Button */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            deleteNode();
                        }}
                        className="w-full py-1.5 flex items-center justify-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded transition-colors text-[11px] font-medium border border-red-500/20"
                    >
                        <Trash2 className="w-3 h-3" />
                        Delete Block
                    </button>

                    {/* Collapse Button at Bottom */}
                    <button
                        className="w-full pt-2 mt-2 border-t border-slate-800/30 flex items-center justify-center hover:bg-slate-800/30 rounded-b transition-colors cursor-pointer"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsExpanded(false);
                        }}
                    >
                        <ChevronUp className="w-4 h-4 text-slate-500" />
                    </button>
                </div>
            )}

            {/* Control Flow Handles - If/Else */}
            {hasElse && (
                <div className="absolute -bottom-3 left-0 right-0 flex justify-between px-4">
                    <div className="relative">
                        <Handle
                            type="source"
                            position={Position.Bottom}
                            id="true"
                            className="!w-3 !h-3 !bg-green-500 !border-2 !border-slate-900"
                        />
                        <span className="absolute top-4 left-1/2 -translate-x-1/2 text-[10px] font-bold text-green-500 uppercase tracking-wider">True</span>
                    </div>
                    <div className="relative">
                        <Handle
                            type="source"
                            position={Position.Bottom}
                            id="false"
                            className="!w-3 !h-3 !bg-red-500 !border-2 !border-slate-900"
                        />
                        <span className="absolute top-4 left-1/2 -translate-x-1/2 text-[10px] font-bold text-red-500 uppercase tracking-wider">False</span>
                    </div>
                </div>
            )}

            {/* Try/Catch Handles */}
            {hasCatch && (
                <div className="absolute -bottom-3 left-0 right-0 flex justify-between px-4">
                    <div className="relative">
                        <Handle
                            type="source"
                            position={Position.Bottom}
                            id="try"
                            className="!w-3 !h-3 !bg-blue-500 !border-2 !border-slate-900"
                        />
                        <span className="absolute top-4 left-1/2 -translate-x-1/2 text-[10px] font-bold text-blue-500 uppercase tracking-wider">Try</span>
                    </div>
                    <div className="relative">
                        <Handle
                            type="source"
                            position={Position.Bottom}
                            id="catch"
                            className="!w-3 !h-3 !bg-orange-500 !border-2 !border-slate-900"
                        />
                        <span className="absolute top-4 left-1/2 -translate-x-1/2 text-[10px] font-bold text-orange-500 uppercase tracking-wider">Catch</span>
                    </div>
                </div>
            )}

            {/* Loop Handles: Body (Bottom) and Next (Right) */}
            {isLoop && (
                <>
                    {/* Visual Label for Loop Body */}
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center pb-1 pointer-events-none">
                        <div className="w-1 h-1 bg-amber-500 rounded-full"></div>
                        <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider bg-slate-900/80 px-1 rounded mt-0.5">Loop</span>
                    </div>

                    {/* Loop Body Handle - Bottom */}
                    <Handle
                        type="source"
                        position={Position.Bottom}
                        id="loop-body"
                        className="!w-3 !h-3 !bg-amber-500 !border-2 !border-slate-900"
                    />

                    {/* Next Handle - Right */}
                    <Handle
                        type="source"
                        position={Position.Right}
                        id="next"
                        className="!w-3 !h-3 !bg-green-500 !border-2 !border-slate-900"
                    />
                </>
            )}
        </BaseNode>
    );
});

ActionNode.displayName = 'ActionNode';

