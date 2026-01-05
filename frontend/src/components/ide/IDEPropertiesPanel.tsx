import { useState } from 'react';
import { useFlowStore } from '@/store/useFlowStore';
import { X, Trash2, Plus, Variable, Settings2 } from 'lucide-react';
import { blockDefinitions, ConfigField } from './blockDefinitions';

type PanelTab = 'properties' | 'variables';

export function IDEPropertiesPanel() {
    const { nodes, setNodes, variables } = useFlowStore();
    const [activeTab, setActiveTab] = useState<PanelTab>('properties');

    const selectedNode = nodes.find((n) => n.selected);

    // If nothing selected and no variables, don't show panel
    if (!selectedNode && variables.length === 0 && activeTab === 'properties') {
        return null;
    }

    return (
        <div className="absolute top-4 right-4 w-80 bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden">
            {/* Tab Header */}
            <div className="flex border-b border-slate-800">
                <button
                    onClick={() => setActiveTab('properties')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-all ${
                        activeTab === 'properties'
                            ? 'text-white bg-slate-800/50 border-b-2 border-emerald-500'
                            : 'text-slate-400 hover:text-white'
                    }`}
                >
                    <Settings2 className="w-3.5 h-3.5" />
                    Properties
                </button>
                <button
                    onClick={() => setActiveTab('variables')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-all ${
                        activeTab === 'variables'
                            ? 'text-white bg-slate-800/50 border-b-2 border-blue-500'
                            : 'text-slate-400 hover:text-white'
                    }`}
                >
                    <Variable className="w-3.5 h-3.5" />
                    Variables
                    {variables.length > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 bg-slate-700 rounded text-[10px]">
                            {variables.length}
                        </span>
                    )}
                </button>
            </div>

            {/* Content */}
            <div className="max-h-[70vh] overflow-y-auto">
                {activeTab === 'properties' ? (
                    <PropertiesContent selectedNode={selectedNode} setNodes={setNodes} nodes={nodes} />
                ) : (
                    <VariablesContent />
                )}
            </div>
        </div>
    );
}

function PropertiesContent({ selectedNode, setNodes, nodes }: { selectedNode: any; setNodes: any; nodes: any[] }) {
    if (!selectedNode) {
        return (
            <div className="p-6 text-center">
                <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <Settings2 className="w-6 h-6 text-slate-600" />
                </div>
                <p className="text-sm text-slate-400">Select a block to edit its properties</p>
            </div>
        );
    }

    const { actionType } = selectedNode.data;
    const definition = blockDefinitions[actionType as string];

    if (!definition) {
        return (
            <div className="p-4">
                <p className="text-sm text-slate-400">No configuration available</p>
            </div>
        );
    }

    const updateNodeData = (key: string, value: any) => {
        setNodes(nodes.map((n: any) => {
            if (n.id === selectedNode.id) {
                return { ...n, data: { ...n.data, [key]: value } };
            }
            return n;
        }));
    };

    return (
        <div className="p-4 space-y-4">
            {/* Block Header */}
            <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-xl">
                    {definition.icon}
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white text-sm truncate">{definition.title}</h3>
                    <p className="text-xs text-slate-500">{definition.category}</p>
                </div>
                <button
                    onClick={() => setNodes(nodes.map((n: any) => ({ ...n, selected: false })))}
                    className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors"
                >
                    <X className="w-4 h-4 text-slate-500" />
                </button>
            </div>

            {/* Config Fields */}
            <div className="space-y-3">
                {definition.configFields.map((field) => (
                    <FieldRenderer
                        key={field.name}
                        field={field}
                        value={selectedNode.data[field.name] ?? field.defaultValue ?? ''}
                        onChange={(value) => updateNodeData(field.name, value)}
                        nodeData={selectedNode.data}
                    />
                ))}
            </div>

            {/* Description */}
            <div className="pt-3 border-t border-slate-800">
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Notes</label>
                <textarea
                    value={selectedNode.data.description || ''}
                    onChange={(e) => updateNodeData('description', e.target.value)}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-slate-600 resize-none h-16 placeholder:text-slate-600"
                    placeholder="Add notes..."
                />
            </div>

            {/* Delete Button */}
            <button
                onClick={() => useFlowStore.getState().deleteNode(selectedNode.id)}
                className="w-full py-2.5 flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors text-sm font-medium border border-red-500/20"
            >
                <Trash2 className="w-4 h-4" />
                Delete Block
            </button>
        </div>
    );
}

function VariablesContent() {
    const { variables, addVariable, updateVariable, removeVariable } = useFlowStore();

    return (
        <div className="p-4 space-y-3">
            {/* Add Variable Button */}
            <button
                onClick={() => addVariable({
                    id: crypto.randomUUID(),
                    name: 'newVar',
                    type: 'string',
                    value: ''
                })}
                className="w-full py-2.5 flex items-center justify-center gap-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors text-sm font-medium border border-blue-500/20"
            >
                <Plus className="w-4 h-4" />
                Add Variable
            </button>

            {/* Variables List */}
            {variables.length === 0 ? (
                <div className="text-center py-6">
                    <Variable className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-xs text-slate-500">No variables defined yet</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {variables.map((variable) => (
                        <div
                            key={variable.id}
                            className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 space-y-2 group"
                        >
                            <div className="flex items-center gap-2">
                                <input
                                    className="flex-1 bg-transparent text-sm font-mono text-slate-200 border-b border-transparent hover:border-slate-600 focus:border-blue-500 outline-none"
                                    value={variable.name}
                                    onChange={(e) => updateVariable(variable.id, { name: e.target.value })}
                                    placeholder="name"
                                />
                                <select
                                    className="bg-slate-700 border-none text-slate-300 text-xs rounded px-2 py-1 outline-none"
                                    value={variable.type}
                                    onChange={(e) => updateVariable(variable.id, { type: e.target.value as any })}
                                >
                                    <option value="string">String</option>
                                    <option value="number">Number</option>
                                    <option value="boolean">Boolean</option>
                                    <option value="list">List</option>
                                </select>
                                <button
                                    onClick={() => removeVariable(variable.id)}
                                    className="p-1 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                            <input
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 font-mono outline-none focus:border-slate-600"
                                placeholder="Default value"
                                value={variable.value}
                                onChange={(e) => updateVariable(variable.id, { value: e.target.value })}
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function FieldRenderer({
    field,
    value,
    onChange,
    nodeData
}: {
    field: ConfigField;
    value: any;
    onChange: (value: any) => void;
    nodeData: any;
}) {
    // Check visibility conditions
    if (field.showWhen) {
        const dependentValue = nodeData[field.showWhen.field];
        if (!field.showWhen.values.includes(dependentValue)) {
            return null;
        }
    }

    return (
        <div className="space-y-1.5">
            <label className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">
                    {field.label}
                    {field.required && <span className="text-red-400 ml-0.5">*</span>}
                </span>
            </label>

            {field.type === 'select' ? (
                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-slate-600"
                >
                    {field.options?.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            ) : field.type === 'boolean' ? (
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={!!value}
                        onChange={(e) => onChange(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500/50"
                    />
                    <span className="text-sm text-slate-300">{field.description || 'Enable'}</span>
                </label>
            ) : field.type === 'textarea' ? (
                <textarea
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-slate-600 resize-none h-20 font-mono"
                />
            ) : (
                <input
                    type={field.type === 'number' ? 'number' : 'text'}
                    value={value}
                    onChange={(e) => onChange(field.type === 'number' ? Number(e.target.value) : e.target.value)}
                    placeholder={field.placeholder}
                    min={field.min}
                    max={field.max}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-slate-600 font-mono"
                />
            )}

            {field.description && field.type !== 'boolean' && (
                <p className="text-[10px] text-slate-500">{field.description}</p>
            )}
        </div>
    );
}
