const code = `import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://example.com/');
  await page.getByRole('link', { name: 'Learn more' }).click();
});`;

function parsePlaywrightCode(code) {
  if (!code || !code.trim()) return [];
  const steps = [];
  const lines = code.split('\n');

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();

    if (!trimmedLine ||
        trimmedLine.startsWith('import ') ||
        trimmedLine.startsWith('test(') ||
        trimmedLine.startsWith('test.') ||
        trimmedLine.startsWith('//') ||
        trimmedLine.match(/^(async )?(function|const|let|var)/)) {
      return;
    }

    let step = null;

    // Navigate
    if (trimmedLine.includes('.goto(')) {
      const urlMatch = trimmedLine.match(/goto\(['"](.+?)['"]\)/);
      step = {
        id: 'step-' + index,
        type: 'navigate',
        action: 'goto',
        url: urlMatch ? urlMatch[1] : '',
        description: 'Navigate to ' + (urlMatch ? urlMatch[1] : ''),
        lineNumber: index + 1
      };
    }
    // Click
    else if (trimmedLine.includes('.click(')) {
      let selector = '';
      let selectorName = '';

      if (trimmedLine.includes('getByRole')) {
        const roleMatch = trimmedLine.match(/getByRole\(['"](\w+)['"](?:,\s*\{\s*name:\s*['"]([^'"]+)['"]\s*\})?/);
        if (roleMatch) {
          selector = roleMatch[2] ? roleMatch[1] + '[name="' + roleMatch[2] + '"]' : roleMatch[1];
          selectorName = roleMatch[2] || roleMatch[1];
        }
      }

      step = {
        id: 'step-' + index,
        type: 'click',
        action: 'click',
        selector: selector,
        selectorName: selectorName,
        description: 'Click ' + (selectorName || selector || 'element'),
        lineNumber: index + 1
      };
    }

    if (step) {
      step.stepNumber = steps.length + 1;
      steps.push(step);
    }
  });

  return steps;
}

const NODE_SPACING_Y = 120;

function getActionType(step) {
  switch (step.type) {
    case 'navigate': return 'navigate';
    case 'click': return 'click';
    default: return 'click';
  }
}

function getLabel(step) {
  switch (step.type) {
    case 'navigate': return 'Navigate';
    case 'click': return 'Click ' + (step.selectorName || 'Element');
    default: return step.action || 'Action';
  }
}

function convertCodeToFlow(code) {
  const steps = parsePlaywrightCode(code);
  const nodes = [];
  const edges = [];

  console.log('Steps parsed:', steps.length);

  if (steps.length === 0) {
    return { nodes, edges };
  }

  // Start node
  const startNode = {
    id: 'start-recorded',
    type: 'start',
    data: { label: 'Start', actionType: 'start' },
    position: { x: 250, y: 50 },
  };
  nodes.push(startNode);

  let previousNodeId = 'start-recorded';
  let yPosition = 50 + NODE_SPACING_Y;

  steps.forEach((step, index) => {
    const nodeId = 'recorded-' + Date.now() + '-' + index;
    const actionType = getActionType(step);

    const node = {
      id: nodeId,
      type: 'action',
      position: { x: 250, y: yPosition },
      data: {
        label: getLabel(step),
        actionType: actionType,
        description: step.description,
        ...(step.selector && { selector: step.selector }),
        ...(step.url && { url: step.url }),
        locatorStrategy: 'css',
      },
    };

    nodes.push(node);

    edges.push({
      id: 'edge-' + previousNodeId + '-' + nodeId,
      source: previousNodeId,
      target: nodeId,
      type: 'default',
    });

    previousNodeId = nodeId;
    yPosition += NODE_SPACING_Y;
  });

  // End node
  const endNode = {
    id: 'end-recorded',
    type: 'end',
    data: { label: 'End', actionType: 'end' },
    position: { x: 250, y: yPosition },
  };
  nodes.push(endNode);

  edges.push({
    id: 'edge-' + previousNodeId + '-end-recorded',
    source: previousNodeId,
    target: 'end-recorded',
    type: 'default',
  });

  return { nodes, edges };
}

const result = convertCodeToFlow(code);
console.log('Nodes:', result.nodes.length);
console.log('Edges:', result.edges.length);
console.log('\nNodes:');
result.nodes.forEach(n => console.log(' -', n.id, n.type, n.data?.actionType, n.data?.url || n.data?.selector || ''));
console.log('\nEdges:');
result.edges.forEach(e => console.log(' -', e.source, '->', e.target));
