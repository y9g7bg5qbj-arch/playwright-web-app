import { useState, useCallback } from 'react';
import {
    BaseEdge,
    EdgeProps,
    getBezierPath,
    getSmoothStepPath,
    useReactFlow,
    Position,
} from '@xyflow/react';
import { Plus, Unlink } from 'lucide-react';

interface DataEdgeProps extends EdgeProps {
    data?: {
        edgeType?: 'flow' | 'data';
        sourceVariable?: string;
        targetVariable?: string;
        label?: string;
    };
}

/**
 * DataConnectorEdge
 * 
 * A custom edge component that supports two types of connections:
 * 
 * 1. FLOW EDGES (Green, solid) - Define execution order
 *    - "What happens next"
 *    - Used between action blocks
 * 
 * 2. DATA EDGES (Blue, dashed) - Define data flow
 *    - "Pass this value to that block"
 *    - Connect variable outputs to inputs
 */
export function DataConnectorEdge({
    id,
    source,
    target,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition = Position.Bottom,
    targetPosition = Position.Top,
    style = {},
    markerEnd,
    data,
}: DataEdgeProps) {
    const { setEdges, getNodes } = useReactFlow();
    const [showControls, setShowControls] = useState(false);
    const [showInsert, setShowInsert] = useState(false);

    const edgeType = data?.edgeType || 'flow';
    const isDataEdge = edgeType === 'data';

    // Calculate the path based on edge type
    const [edgePath, labelX, labelY] = isDataEdge
        ? getBezierPath({
            sourceX,
            sourceY,
            targetX,
            targetY,
            sourcePosition,
            targetPosition,
            curvature: 0.25,
        })
        : getSmoothStepPath({
            sourceX,
            sourceY,
            targetX,
            targetY,
            sourcePosition,
            targetPosition,
            borderRadius: 8,
        });

    // Edge styling based on type
    const edgeStyles = {
        flow: {
            stroke: '#22c55e', // Tailwind green-500
            strokeWidth: 2,
            strokeDasharray: 'none',
        },
        data: {
            stroke: '#3b82f6', // Tailwind blue-500
            strokeWidth: 2,
            strokeDasharray: '6,4',
        },
    };

    const currentStyle = { ...edgeStyles[edgeType], ...style };

    // Handle insert block
    const handleInsertBlock = useCallback(() => {
        // Emit event to open block picker at this position
        window.dispatchEvent(
            new CustomEvent('openBlockPicker', {
                detail: {
                    insertOnEdge: id,
                    position: { x: labelX, y: labelY },
                },
            })
        );
    }, [id, labelX, labelY]);

    // Handle delete edge
    const handleDeleteEdge = useCallback(() => {
        setEdges((edges) => edges.filter((e) => e.id !== id));
    }, [id, setEdges]);

    return (
        <g
            className="react-flow__edge"
            onMouseEnter={() => setShowControls(true)}
            onMouseLeave={() => {
                setShowControls(false);
                setShowInsert(false);
            }}
        >
            {/* Invisible wider path for easier hover detection */}
            <path
                d={edgePath}
                fill="none"
                stroke="transparent"
                strokeWidth={20}
                className="cursor-pointer"
            />

            {/* The visible edge */}
            <BaseEdge
                id={id}
                path={edgePath}
                style={currentStyle}
                markerEnd={markerEnd}
            />

            {/* Data edge label showing variable mapping */}
            {isDataEdge && data?.label && (
                <foreignObject
                    x={labelX - 40}
                    y={labelY - 12}
                    width={80}
                    height={24}
                    className="pointer-events-none"
                >
                    <div className="bg-blue-900/90 text-blue-200 text-xs px-2 py-0.5 rounded-full text-center truncate border border-blue-700">
                        {data.label}
                    </div>
                </foreignObject>
            )}

            {/* Insert button (appears on hover for flow edges) */}
            {showControls && !isDataEdge && (
                <foreignObject
                    x={labelX - 12}
                    y={labelY - 12}
                    width={24}
                    height={24}
                    className="overflow-visible"
                >
                    <button
                        onClick={handleInsertBlock}
                        className="w-6 h-6 rounded-full bg-green-500 hover:bg-green-400 
                       flex items-center justify-center shadow-lg 
                       transition-all duration-150 hover:scale-110
                       border-2 border-white"
                        title="Insert block here"
                    >
                        <Plus className="w-4 h-4 text-white" />
                    </button>
                </foreignObject>
            )}

            {/* Delete button (appears on hover for data edges) */}
            {showControls && isDataEdge && (
                <foreignObject
                    x={labelX - 12}
                    y={labelY - 12}
                    width={24}
                    height={24}
                    className="overflow-visible"
                >
                    <button
                        onClick={handleDeleteEdge}
                        className="w-6 h-6 rounded-full bg-red-500 hover:bg-red-400 
                       flex items-center justify-center shadow-lg 
                       transition-all duration-150 hover:scale-110
                       border-2 border-white"
                        title="Remove data connection"
                    >
                        <Unlink className="w-3 h-3 text-white" />
                    </button>
                </foreignObject>
            )}
        </g>
    );
}

/**
 * Edge type definitions for React Flow
 */
export const customEdgeTypes = {
    flow: DataConnectorEdge,
    data: DataConnectorEdge,
    default: DataConnectorEdge,
};

/**
 * Helper to create a data edge between nodes
 */
export function createDataEdge(
    sourceNodeId: string,
    sourceVariable: string,
    targetNodeId: string,
    targetVariable: string
) {
    return {
        id: `data-${sourceNodeId}-${sourceVariable}-${targetNodeId}-${targetVariable}`,
        source: sourceNodeId,
        target: targetNodeId,
        sourceHandle: `data-out-${sourceVariable}`,
        targetHandle: `data-in-${targetVariable}`,
        type: 'data',
        data: {
            edgeType: 'data' as const,
            sourceVariable,
            targetVariable,
            label: `${sourceVariable} → ${targetVariable}`,
        },
    };
}

/**
 * Helper to create a flow edge between nodes
 */
export function createFlowEdge(sourceNodeId: string, targetNodeId: string) {
    return {
        id: `flow-${sourceNodeId}-${targetNodeId}`,
        source: sourceNodeId,
        target: targetNodeId,
        sourceHandle: 'flow-out',
        targetHandle: 'flow-in',
        type: 'flow',
        data: {
            edgeType: 'flow' as const,
        },
    };
}
