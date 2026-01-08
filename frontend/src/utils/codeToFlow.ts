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

// ============= VERO DSL CONVERSION =============

// Convert a PlaywrightStep to Vero DSL syntax
function stepToVero(step: PlaywrightStep): string {
  switch (step.type) {
    case 'navigate':
      return `navigate to "${step.url}"`;

    case 'click':
      if (step.selectorName) {
        return `click "${step.selectorName}"`;
      }
      // Extract text from selector if possible
      const clickText = extractTextFromSelector(step.selector);
      if (clickText) {
        return `click "${clickText}"`;
      }
      return `click ${formatSelector(step.selector)}`;

    case 'fill':
      const fieldName = step.selectorName || extractTextFromSelector(step.selector) || 'field';
      const value = step.value || '';
      return `fill "${fieldName}" with "${value}"`;

    case 'select':
      const selectField = step.selectorName || extractTextFromSelector(step.selector) || 'dropdown';
      return `select "${selectField}" option "${step.value || ''}"`;

    case 'check':
      const checkField = step.selectorName || extractTextFromSelector(step.selector) || 'checkbox';
      return step.action === 'uncheck' ? `uncheck "${checkField}"` : `check "${checkField}"`;

    case 'hover':
      const hoverTarget = step.selectorName || extractTextFromSelector(step.selector) || 'element';
      return `hover over "${hoverTarget}"`;

    case 'wait':
      if (step.selector) {
        const waitTarget = step.selectorName || extractTextFromSelector(step.selector) || 'element';
        return `wait for "${waitTarget}" to be visible`;
      }
      return 'wait 1 second';

    case 'expect':
      const expectTarget = step.selectorName || extractTextFromSelector(step.selector) || 'element';
      return `assert "${expectTarget}" is visible`;

    default:
      return `# Unknown action: ${step.action || step.type}`;
  }
}

// Extract human-readable text from selector
function extractTextFromSelector(selector?: string): string | null {
  if (!selector) return null;

  // role[name="..."]
  const roleMatch = selector.match(/^\w+\[name="([^"]+)"\]$/);
  if (roleMatch) return roleMatch[1];

  // text=...
  if (selector.startsWith('text=')) {
    return selector.slice(5).replace(/^["']|["']$/g, '');
  }

  // label=...
  if (selector.startsWith('label=')) {
    return selector.slice(6).replace(/^["']|["']$/g, '');
  }

  // placeholder=...
  if (selector.startsWith('placeholder=')) {
    return selector.slice(12).replace(/^["']|["']$/g, '');
  }

  // data-testid=...
  if (selector.startsWith('data-testid=')) {
    return selector.slice(12).replace(/[-_]/g, ' ');
  }

  return null;
}

// Format selector for Vero DSL
function formatSelector(selector?: string): string {
  if (!selector) return 'css ""';

  const strategy = detectLocatorStrategy(selector);

  switch (strategy) {
    case 'role':
      return `role "${selector}"`;
    case 'text':
      return `text "${selector.replace('text=', '')}"`;
    case 'label':
      return `label "${selector.replace('label=', '')}"`;
    case 'test-id':
      return `testId "${selector.replace('data-testid=', '')}"`;
    case 'xpath':
      return `xpath "${selector.replace('xpath=', '')}"`;
    default:
      return `css "${selector}"`;
  }
}

/**
 * Convert Playwright recording code to Vero DSL
 */
export function convertPlaywrightToVero(
  code: string,
  options?: {
    featureName?: string;
    scenarioName?: string;
    includeComments?: boolean;
  }
): string {
  const steps = parsePlaywrightCode(code);
  const featureName = options?.featureName || 'RecordedFeature';
  const scenarioName = options?.scenarioName || 'Recorded Test Scenario';
  const includeComments = options?.includeComments ?? true;

  if (steps.length === 0) {
    return `# No steps recorded
feature ${featureName}

scenario "${scenarioName}"
    # Add your test steps here
end
`;
  }

  const lines: string[] = [];

  // Header
  if (includeComments) {
    lines.push(`# Auto-generated from Playwright recording`);
    lines.push(`# Generated at: ${new Date().toISOString()}`);
    lines.push('');
  }

  lines.push(`feature ${featureName}`);
  lines.push('');
  lines.push(`scenario "${scenarioName}"`);

  // Convert each step
  for (const step of steps) {
    const veroLine = stepToVero(step);
    lines.push(`    ${veroLine}`);
  }

  lines.push('end');
  lines.push('');

  return lines.join('\n');
}

/**
 * Convert flow nodes to Vero DSL
 */
export function convertFlowToVero(
  nodes: FlowNode[],
  edges: Edge[],
  options?: {
    featureName?: string;
    scenarioName?: string;
  }
): string {
  const featureName = options?.featureName || 'ExportedFeature';
  const scenarioName = options?.scenarioName || 'Exported Scenario';

  // Get execution order
  const startNode = nodes.find(n => n.type === 'start');
  if (!startNode) {
    return `# No start node found
feature ${featureName}

scenario "${scenarioName}"
    # No steps to export
end
`;
  }

  const orderedNodes: FlowNode[] = [];
  const visited = new Set<string>();

  const traverse = (nodeId: string) => {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    if (node.type === 'action') {
      orderedNodes.push(node);
    }

    // Find next nodes
    const outgoingEdges = edges.filter(e => e.source === nodeId);
    for (const edge of outgoingEdges) {
      traverse(edge.target);
    }
  };

  traverse(startNode.id);

  const lines: string[] = [];
  lines.push(`# Exported from visual flow editor`);
  lines.push('');
  lines.push(`feature ${featureName}`);
  lines.push('');
  lines.push(`scenario "${scenarioName}"`);

  for (const node of orderedNodes) {
    const data = node.data;
    let veroLine = '';

    switch (data.actionType) {
      case 'navigate':
        veroLine = `navigate to "${data.url || ''}"`;
        break;
      case 'click':
        veroLine = `click "${data.selector || data.label || 'element'}"`;
        break;
      case 'fill':
        veroLine = `fill "${data.selector || data.label || 'field'}" with "${data.value || ''}"`;
        break;
      case 'select-option':
        veroLine = `select "${data.selector || data.label || 'dropdown'}" option "${data.value || ''}"`;
        break;
      case 'check':
        veroLine = `check "${data.selector || data.label || 'checkbox'}"`;
        break;
      case 'uncheck':
        veroLine = `uncheck "${data.selector || data.label || 'checkbox'}"`;
        break;
      case 'hover':
        veroLine = `hover over "${data.selector || data.label || 'element'}"`;
        break;
      case 'wait-for-element':
        veroLine = `wait for "${data.selector || data.label || 'element'}" to be visible`;
        break;
      case 'assert-visible':
        veroLine = `assert "${data.selector || data.label || 'element'}" is visible`;
        break;
      default:
        // Handle raw Vero if available
        if (data.rawVero && typeof data.rawVero === 'string') {
          veroLine = data.rawVero;
        } else {
          veroLine = `# ${data.actionType}: ${data.label || 'action'}`;
        }
    }

    lines.push(`    ${veroLine}`);
  }

  lines.push('end');
  lines.push('');

  return lines.join('\n');
}
