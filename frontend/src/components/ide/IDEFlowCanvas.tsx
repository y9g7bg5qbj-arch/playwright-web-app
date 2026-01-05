import { useCallback, useRef, useState, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useReactFlow,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Search, ChevronDown, ChevronRight } from 'lucide-react';

import { useFlowStore } from '@/store/useFlowStore';
import { ActionNode } from './nodes/ActionNode';
import { StartNode } from './nodes/StartNode';
import { EndNode } from './nodes/EndNode';
import { DecisionNode } from './nodes/DecisionNode';
import { SubFlowNode } from './nodes/SubFlowNode';
import { DataNode } from './nodes/DataNode';
import { blockDefinitions, categoryStyles, BlockCategory } from './blockDefinitions';

const nodeTypes = {
  action: ActionNode,
  start: StartNode,
  end: EndNode,
  decision: DecisionNode,
  subflow: SubFlowNode,
  data: DataNode,
};

function Flow() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, addNode, setIsConnecting } = useFlowStore();
  const { screenToFlowPosition } = useReactFlow();
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; flowX: number; flowY: number } | null>(null);
  const [menuSearch, setMenuSearch] = useState('');

  // Track connection drag state
  const handleConnectStart = useCallback(() => {
    setIsConnecting(true);
  }, [setIsConnecting]);

  const handleConnectEnd = useCallback(() => {
    setIsConnecting(false);
  }, [setIsConnecting]);

  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    'browser': true,
    'navigation': true,
    'action': true,
    'input': true,
    'assertion': true,
    'wait': true,
    'control': true,
    'data': true,
    'network': false,
    'advanced': false,
  });

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }));
  };

  // Group blocks by category for context menu
  const blocksByCategory = useMemo(() => {
    const groups: Partial<Record<BlockCategory, typeof blockDefinitions[string][]>> = {};

    Object.values(blockDefinitions).forEach(block => {
      if (menuSearch && !block.title.toLowerCase().includes(menuSearch.toLowerCase())) {
        return;
      }

      if (!groups[block.category]) {
        groups[block.category] = [];
      }
      groups[block.category]?.push(block);
    });

    return groups;
  }, [menuSearch]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onPaneContextMenu = useCallback((event: MouseEvent | React.MouseEvent) => {
    event.preventDefault();
    const flowPosition = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      flowX: flowPosition.x,
      flowY: flowPosition.y,
    });
    setMenuSearch(''); // Reset search when opening menu
  }, [screenToFlowPosition]);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
    setMenuSearch('');
  }, []);

  const addBlockFromContextMenu = useCallback((blockType: string) => {
    if (!contextMenu) return;

    const definition = blockDefinitions[blockType];
    const defaultConfig = definition?.defaultConfig || {};
    const fieldDefaults: Record<string, any> = {};
    if (definition?.configFields) {
      for (const field of definition.configFields) {
        if (field.defaultValue !== undefined) {
          fieldDefaults[field.name] = field.defaultValue;
        }
      }
    }

    let nodeType = 'action';
    if (blockType === 'start') nodeType = 'start';
    if (blockType === 'end') nodeType = 'end';
    if (blockType === 'decision') nodeType = 'decision';
    if (blockType === 'subflow') nodeType = 'subflow';
    if (blockType === 'data') nodeType = 'data';

    const newNode = {
      id: `${blockType}-${Date.now()}`,
      type: nodeType,
      position: { x: contextMenu.flowX, y: contextMenu.flowY },
      data: {
        label: definition?.title || blockType,
        actionType: blockType,
        ...fieldDefaults,
        ...defaultConfig,
      },
    };

    addNode(newNode);
    closeContextMenu();
  }, [contextMenu, addNode, closeContextMenu]);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');

      // check if the dropped element is valid
      if (typeof type === 'undefined' || !type) {
        return;
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      // Determine node type based on block definition
      let nodeType = 'action';
      if (type === 'start' || type === 'start-flow') nodeType = 'start';
      if (type === 'end' || type === 'end-flow') nodeType = 'end';
      if (type === 'decision') nodeType = 'decision';
      if (type === 'subflow') nodeType = 'subflow';
      if (type === 'data') nodeType = 'data';

      // Get block definition to populate initial data with default config
      const definition = blockDefinitions[type];
      const defaultConfig = definition?.defaultConfig || {};

      // Also get default values from configFields
      const fieldDefaults: Record<string, any> = {};
      if (definition?.configFields) {
        for (const field of definition.configFields) {
          if (field.defaultValue !== undefined) {
            fieldDefaults[field.name] = field.defaultValue;
          }
        }
      }

      const newNode = {
        id: `${type}-${Date.now()}`,
        type: nodeType,
        position,
        data: {
          label: definition?.title || type.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' '),
          actionType: type,
          ...fieldDefaults,
          ...defaultConfig,
        },
      };

      addNode(newNode);
    },
    [screenToFlowPosition, addNode],
  );

  // Calculate menu position to keep it within viewport
  const getMenuPosition = () => {
    if (!contextMenu) return { left: 0, top: 0 };

    const menuWidth = 280;
    const menuHeight = 450;
    const padding = 10;

    let left = contextMenu.x;
    let top = contextMenu.y;

    // Adjust if menu would go off right edge
    if (left + menuWidth > window.innerWidth - padding) {
      left = window.innerWidth - menuWidth - padding;
    }

    // Adjust if menu would go off bottom edge
    if (top + menuHeight > window.innerHeight - padding) {
      top = window.innerHeight - menuHeight - padding;
    }

    return { left, top };
  };

  const categories = Object.keys(categoryStyles) as BlockCategory[];

  return (
    <div className="w-full h-full bg-slate-950" ref={reactFlowWrapper} >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectStart={handleConnectStart}
        onConnectEnd={handleConnectEnd}
        nodeTypes={nodeTypes}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onPaneContextMenu={onPaneContextMenu}
        fitView
        className="bg-slate-950"
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: true,
          style: {
            stroke: '#22c55e', // Green for execution flow (Leapwork style)
            strokeWidth: 2,
          },
          markerEnd: {
            type: 'arrowclosed' as any,
            color: '#22c55e',
          },
        }}
      >
        <Background color="#334155" gap={20} size={1} />
        <Controls className="bg-slate-800 border-slate-700 fill-slate-400" />
        <MiniMap
          className="bg-slate-900 border-slate-800"
          maskColor="rgba(15, 23, 42, 0.6)"
          nodeColor={(n) => {
            if (n.type === 'start') return '#22c55e';
            if (n.type === 'end') return '#64748b';
            return '#3b82f6';
          }}
        />
        <Panel position="top-right" className="bg-slate-900/80 p-2 rounded-lg border border-slate-700 backdrop-blur text-xs text-slate-400">
          Right-click to add blocks
        </Panel>
      </ReactFlow>

      {/* Full Toolbox Context Menu */}
      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={closeContextMenu}
          />
          <div
            className="fixed z-50 bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-xl shadow-2xl overflow-hidden"
            style={{
              ...getMenuPosition(),
              width: 280,
              maxHeight: 'min(450px, calc(100vh - 40px))',
            }}
          >
            {/* Header with Search */}
            <div className="p-3 border-b border-slate-700/50 bg-slate-800/50">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Add Block
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search blocks..."
                  className="w-full bg-slate-950/50 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500/50 transition-colors"
                  value={menuSearch}
                  onChange={(e) => setMenuSearch(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            {/* Scrollable Block List */}
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(450px - 80px)' }}>
              {categories.map(category => {
                const blocks = blocksByCategory[category];
                if (!blocks || blocks.length === 0) return null;

                const style = categoryStyles[category];
                const isExpanded = expandedCategories[category];

                return (
                  <div key={category} className="border-b border-slate-800/50 last:border-0">
                    <button
                      onClick={() => toggleCategory(category)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-[11px] font-semibold transition-colors uppercase tracking-wider hover:bg-slate-800/50 ${style.color}`}
                    >
                      {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                      <span>{style.icon}</span>
                      <span>{style.label}</span>
                      <span className="ml-auto text-[10px] font-normal text-slate-500 lowercase">
                        {blocks.length}
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="pb-1">
                        {blocks.map(block => (
                          <button
                            key={block.type}
                            onClick={() => addBlockFromContextMenu(block.type)}
                            className="w-full flex items-center gap-2.5 px-4 py-1.5 text-xs text-slate-300 hover:bg-blue-600/20 hover:text-blue-300 transition-colors group"
                          >
                            <span className="text-sm opacity-70 group-hover:opacity-100">{block.icon}</span>
                            <div className="flex-1 text-left min-w-0">
                              <div className="truncate">{block.title}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div >
  );
}

export function IDEFlowCanvas() {
  return (
    <ReactFlowProvider>
      <Flow />
    </ReactFlowProvider>
  );
}

