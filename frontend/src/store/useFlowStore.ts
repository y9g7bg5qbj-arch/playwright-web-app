import { create } from 'zustand';
import {
    Connection,
    Edge,
    EdgeChange,
    Node,
    NodeChange,
    addEdge,
    OnNodesChange,
    OnEdgesChange,
    OnConnect,
    applyNodeChanges,
    applyEdgeChanges,
} from '@xyflow/react';
import { ActionNodeData } from '@/components/ide/nodes/ActionNode';

type FlowNode = Node<ActionNodeData>;
type NodeStatus = 'idle' | 'running' | 'success' | 'failure' | 'paused';

interface Variable {
    id: string;
    name: string;
    type: 'string' | 'number' | 'boolean' | 'list' | 'object';
    value: any;
    isInput?: boolean; // If true, this is a prop/input for the SubFlow
}

interface FlowState {
    nodes: FlowNode[];
    edges: Edge[];
    variables: Variable[]; // Registry of variables
    onNodesChange: OnNodesChange<FlowNode>;
    onEdgesChange: OnEdgesChange;
    onConnect: OnConnect;
    addNode: (node: FlowNode) => void;
    setNodes: (nodes: FlowNode[]) => void;
    setEdges: (edges: Edge[]) => void;

    // Variable actions
    addVariable: (variable: Variable) => void;
    updateVariable: (id: string, updates: Partial<Variable>) => void;
    removeVariable: (id: string) => void;
    deleteNode: (nodeId: string) => void;
    validateConnectivity: () => void;

    // Execution state
    isRunning: boolean;
    isPaused: boolean;
    pausedAtNodeId: string | null;
    isConnecting: boolean; // Track when user is dragging a connection
    // Execution actions
    setNodeStatus: (nodeId: string, status: NodeStatus, duration?: number, error?: string) => void;
    toggleBreakpoint: (nodeId: string) => void;
    clearExecutionState: () => void;
    setIsRunning: (running: boolean) => void;
    setIsPaused: (paused: boolean, nodeId?: string | null) => void;
    setIsConnecting: (connecting: boolean) => void;
}

export const useFlowStore = create<FlowState>((set, get) => ({
    nodes: [],
    edges: [],
    variables: [],
    isRunning: false,
    isPaused: false,
    pausedAtNodeId: null,
    isConnecting: false,

    onNodesChange: (changes: NodeChange<FlowNode>[]) => {
        set({
            nodes: applyNodeChanges(changes, get().nodes),
        });
    },
    onEdgesChange: (changes: EdgeChange[]) => {
        set({
            edges: applyEdgeChanges(changes, get().edges),
        });
        // Validate on edge removal
        if (changes.some(c => c.type === 'remove')) {
            get().validateConnectivity();
        }
    },
    onConnect: (connection: Connection) => {
        set({
            edges: addEdge(connection, get().edges),
        });
        get().validateConnectivity();
    },
    addNode: (node: FlowNode) => {
        set({
            nodes: [...get().nodes, node],
        });
        get().validateConnectivity();
    },
    setNodes: (nodes: FlowNode[]) => {
        set({ nodes });
        setTimeout(() => get().validateConnectivity(), 0);
    },
    setEdges: (edges: Edge[]) => {
        set({ edges });
        setTimeout(() => get().validateConnectivity(), 0);
    },

    // Variable Actions
    addVariable: (variable: Variable) => {
        set({ variables: [...get().variables, variable] });
    },
    updateVariable: (id: string, updates: Partial<Variable>) => {
        set({
            variables: get().variables.map(v => v.id === id ? { ...v, ...updates } : v)
        });
    },
    removeVariable: (id: string) => {
        set({
            variables: get().variables.filter(v => v.id !== id)
        });
    },

    // Execution control methods
    setNodeStatus: (nodeId: string, status: NodeStatus, duration?: number, error?: string) => {
        set({
            nodes: get().nodes.map(node =>
                node.id === nodeId
                    ? { ...node, data: { ...node.data, status, duration, error } }
                    : node
            ),
        });
    },

    toggleBreakpoint: (nodeId: string) => {
        set({
            nodes: get().nodes.map(node =>
                node.id === nodeId
                    ? { ...node, data: { ...node.data, breakpoint: !node.data.breakpoint } }
                    : node
            ),
        });
    },

    clearExecutionState: () => {
        set({
            nodes: get().nodes.map(node => ({
                ...node,
                data: { ...node.data, status: 'idle' as NodeStatus, duration: undefined, error: undefined }
            })),
            isRunning: false,
            isPaused: false,
            pausedAtNodeId: null,
        });
    },

    setIsRunning: (running: boolean) => {
        set({ isRunning: running });
    },

    setIsPaused: (paused: boolean, nodeId: string | null = null) => {
        set({ isPaused: paused, pausedAtNodeId: nodeId });
    },

    setIsConnecting: (connecting: boolean) => {
        set({ isConnecting: connecting });
    },

    deleteNode: (nodeId: string) => {
        set({
            nodes: get().nodes.filter((n) => n.id !== nodeId),
            edges: get().edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
        });
        get().validateConnectivity();
    },

    validateConnectivity: () => {
        const { nodes, edges } = get();
        const visited = new Set<string>();
        const queue: string[] = [];

        // Find start node
        const startNode = nodes.find(n => n.type === 'start');
        if (startNode) {
            queue.push(startNode.id);
            visited.add(startNode.id);
        }

        // BFS Traversal
        while (queue.length > 0) {
            const currentId = queue.shift()!;
            // Find edges originating from current node
            const outgoingEdges = edges.filter(e => e.source === currentId);
            for (const edge of outgoingEdges) {
                if (!visited.has(edge.target)) {
                    visited.add(edge.target);
                    queue.push(edge.target);
                }
            }
        }

        // Update nodes with isConnected status
        const newNodes = nodes.map(node => ({
            ...node,
            data: {
                ...node.data,
                // Treat Set Variable nodes as always connected (initialization variables)
                isConnected: visited.has(node.id) || node.type === 'start' || node.data.actionType === 'set-variable'
            }
        }));

        // Only update if changes to avoid infinite loop if calling from useEffect
        // JSON.stringify check is expensive, but for <100 nodes it's fine.
        // Better: check if any changed.
        const hasChanged = newNodes.some((n, i) => n.data.isConnected !== nodes[i].data.isConnected);
        if (hasChanged) {
            set({ nodes: newNodes });
        }
    },
}));
