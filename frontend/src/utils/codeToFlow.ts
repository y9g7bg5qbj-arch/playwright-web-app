import { Node, Edge } from '@xyflow/react';
import { parsePlaywrightCode, type PlaywrightStep } from './playwrightParser';
import { ActionNodeData } from '@/components/ide/nodes/ActionNode';

type FlowNode = Node<ActionNodeData>;

const NODE_SPACING_Y = 120;

// Detect the appropriate locator strategy based on selector format
function detectLocatorStrategy(selector: string): string {
  if (!selector) return 'css';

  // Role-based selector: role[name="something"] or just "link", "button", etc.
  const roleMatch = selector.match(/^(\w+)\[name="[^"]+"\]$/);
  if (roleMatch) return 'role';

  const roleOnly = selector.match(/^(link|button|heading|checkbox|textbox|listitem|menuitem|option|tab|radio|combobox|dialog|alert|img|list|navigation|main|form|table|row|cell|grid|gridcell|tree|treeitem)$/);
  if (roleOnly) return 'role';

  // Text-based selector
  if (selector.startsWith('text=')) return 'text';

  // Label-based selector
  if (selector.startsWith('label=')) return 'label';

  // Placeholder-based selector
  if (selector.startsWith('placeholder=')) return 'placeholder';

  // Test ID selector
  if (selector.startsWith('data-testid=')) return 'test-id';

  // XPath
  if (selector.startsWith('//') || selector.startsWith('xpath=')) return 'xpath';

  // Default to CSS
  return 'css';
}

// Map PlaywrightStep types to blockDefinition actionTypes
function getActionType(step: PlaywrightStep): string {
  switch (step.type) {
    case 'navigate': return 'navigate';
    case 'click': return 'click';
    case 'fill': return 'fill';
    case 'select': return 'select-option';
    case 'check': return step.action === 'uncheck' ? 'uncheck' : 'check';
    case 'hover': return 'hover';
    case 'wait': return 'wait-for-element';
    case 'expect': return 'assert-visible';
    default: return 'click';
  }
}

// Get a user-friendly label for the step
function getLabel(step: PlaywrightStep): string {
  switch (step.type) {
    case 'navigate': return 'Navigate';
    case 'click': return `Click ${step.selectorName || 'Element'}`;
    case 'fill': return `Fill ${step.selectorName || 'Field'}`;
    case 'select': return `Select ${step.selectorName || 'Option'}`;
    case 'check': return step.action === 'uncheck' ? 'Uncheck' : 'Check';
    case 'hover': return `Hover ${step.selectorName || 'Element'}`;
    case 'wait': return 'Wait';
    case 'expect': return 'Assert';
    default: return step.action || 'Action';
  }
}

export function convertCodeToFlow(code: string): { nodes: FlowNode[]; edges: Edge[] } {
  const steps = parsePlaywrightCode(code);
  const nodes: FlowNode[] = [];
  const edges: Edge[] = [];

  if (steps.length === 0) {
    return { nodes, edges };
  }

  // Start node
  const startNode: FlowNode = {
    id: 'start-recorded',
    type: 'start',
    data: { label: 'Start', actionType: 'start' },
    position: { x: 250, y: 50 },
  };
  nodes.push(startNode);

  let previousNodeId = 'start-recorded';
  let yPosition = 50 + NODE_SPACING_Y;

  steps.forEach((step, index) => {
    const nodeId = `recorded-${Date.now()}-${index}`;
    const actionType = getActionType(step);

    const node: FlowNode = {
      id: nodeId,
      type: 'action',
      position: { x: 250, y: yPosition },
      data: {
        label: getLabel(step),
        actionType: actionType,
        description: step.description,
        // Store selector info based on action type
        ...(step.selector && { selector: step.selector }),
        ...(step.url && { url: step.url }),
        ...(step.value && { value: step.value }),
        // Detect locator strategy from selector format
        locatorStrategy: detectLocatorStrategy(step.selector || ''),
      },
    };

    nodes.push(node);

    // Create edge from previous node
    edges.push({
      id: `edge-${previousNodeId}-${nodeId}`,
      source: previousNodeId,
      target: nodeId,
      type: 'default',
    });

    previousNodeId = nodeId;
    yPosition += NODE_SPACING_Y;
  });

  // End node
  const endNode: FlowNode = {
    id: 'end-recorded',
    type: 'end',
    data: { label: 'End', actionType: 'end' },
    position: { x: 250, y: yPosition },
  };
  nodes.push(endNode);

  // Connect last node to end
  edges.push({
    id: `edge-${previousNodeId}-end-recorded`,
    source: previousNodeId,
    target: 'end-recorded',
    type: 'default',
  });

  return { nodes, edges };
}

// Convert a single step to a node (for real-time additions)
export function stepToNode(step: PlaywrightStep, existingNodesCount: number): FlowNode {
  const actionType = getActionType(step);
  const yPosition = 50 + NODE_SPACING_Y + (existingNodesCount * NODE_SPACING_Y);

  return {
    id: `recorded-${Date.now()}`,
    type: 'action',
    position: { x: 250, y: yPosition },
    data: {
      label: getLabel(step),
      actionType: actionType,
      description: step.description,
      ...(step.selector && { selector: step.selector }),
      ...(step.url && { url: step.url }),
      ...(step.value && { value: step.value }),
      locatorStrategy: detectLocatorStrategy(step.selector || ''),
    },
  };
}
