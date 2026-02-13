import type { FileNode } from './ExplorerPanel.js';
import type { ScenarioInfo } from './ScenarioBrowser.js';

export interface ApiFile {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: ApiFile[];
}

export function extractScenariosFromContent(content: string, filePath: string): ScenarioInfo[] {
  const scenarios: ScenarioInfo[] = [];
  const lines = content.split('\n');
  let currentFeature: string | undefined;

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];

    const featureMatch = line.match(/^\s*feature\s+["']?([^"'\n]+)["']?/i);
    if (featureMatch) {
      currentFeature = featureMatch[1].trim();
      continue;
    }

    // Support both quoted and unquoted scenario names
    const scenarioMatch = line.match(/^\s*scenario\s+(?:["']([^"']+)["']|(\w+))(?:\s+as\s+\w+)?(\s+@[\w,\s@]+)?(?:\s*\{)?/i);
    if (!scenarioMatch) {
      continue;
    }

    const scenarioName = scenarioMatch[1] || scenarioMatch[2];
    const tagString = scenarioMatch[3] || '';
    const tagMatches = tagString.match(/@(\w+)/g) || [];
    const tags = tagMatches.map(tag => tag.slice(1));

    scenarios.push({
      id: `${filePath}:${index + 1}:${scenarioName}`,
      name: scenarioName,
      tags,
      filePath,
      line: index + 1,
      featureName: currentFeature,
    });
  }

  return scenarios;
}

export function convertApiFilesToFileNodes(apiFiles: ApiFile[]): FileNode[] {
  return apiFiles.map(file => ({
    name: file.name,
    path: file.path,
    type: file.type,
    icon: file.type === 'directory' ? 'folder' : 'description',
    children: file.children ? convertApiFilesToFileNodes(file.children) : undefined,
  }));
}
