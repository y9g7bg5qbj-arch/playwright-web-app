import { useState, useEffect, useMemo } from 'react';

export interface OutlineItem {
  id: string;
  type: 'feature' | 'scenario' | 'page';
  name: string;
  line: number;
  tags?: string[];
  children?: OutlineItem[];
}

export interface OutlinePanelProps {
  fileContent: string | null;
  fileName: string | null;
  onNavigateToLine?: (line: number) => void;
}

// Parse Vero script content to extract features and scenarios
function parseVeroOutline(content: string): OutlineItem[] {
  const items: OutlineItem[] = [];
  const lines = content.split('\n');

  let currentFeature: OutlineItem | null = null;
  let currentPage: OutlineItem | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;

    // Match feature declaration: feature "Name" { or feature Name {
    const featureMatch = line.match(/^\s*feature\s+(?:"([^"]+)"|(\w+))\s*\{?/i);
    if (featureMatch) {
      const name = featureMatch[1] || featureMatch[2];
      currentFeature = {
        id: `feature-${lineNumber}`,
        type: 'feature',
        name,
        line: lineNumber,
        children: [],
      };
      items.push(currentFeature);
      currentPage = null;
      continue;
    }

    // Match page declaration: page "Name" { or page Name {
    const pageMatch = line.match(/^\s*page\s+(?:"([^"]+)"|(\w+))\s*\{?/i);
    if (pageMatch) {
      const name = pageMatch[1] || pageMatch[2];
      currentPage = {
        id: `page-${lineNumber}`,
        type: 'page',
        name,
        line: lineNumber,
        children: [],
      };
      items.push(currentPage);
      currentFeature = null;
      continue;
    }

    // Match scenario declaration: scenario "Name" @tag1 @tag2 { or scenario "Name" {
    const scenarioMatch = line.match(/^\s*scenario\s+"([^"]+)"([^{]*)\{?/i);
    if (scenarioMatch) {
      const name = scenarioMatch[1];
      const tagPart = scenarioMatch[2] || '';
      const tags = tagPart.match(/@[\w-]+/g) || [];

      const scenario: OutlineItem = {
        id: `scenario-${lineNumber}`,
        type: 'scenario',
        name,
        line: lineNumber,
        tags: tags.map(t => t.slice(1)), // Remove @ prefix
      };

      if (currentFeature) {
        currentFeature.children = currentFeature.children || [];
        currentFeature.children.push(scenario);
      } else if (currentPage) {
        currentPage.children = currentPage.children || [];
        currentPage.children.push(scenario);
      } else {
        items.push(scenario);
      }
    }
  }

  return items;
}

export function OutlinePanel({
  fileContent,
  fileName,
  onNavigateToLine,
}: OutlinePanelProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [isExpanded, setIsExpanded] = useState(true);

  // Parse outline when content changes
  const outlineItems = useMemo(() => {
    if (!fileContent) return [];
    return parseVeroOutline(fileContent);
  }, [fileContent]);

  // Auto-expand all features/pages on content change
  useEffect(() => {
    const allIds = outlineItems.map(item => item.id);
    setExpandedItems(new Set(allIds));
  }, [outlineItems]);

  const toggleItem = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleItemClick = (item: OutlineItem) => {
    if (onNavigateToLine) {
      onNavigateToLine(item.line);
    }
  };

  // Get icon based on item type
  const getItemIcon = (type: OutlineItem['type']): { icon: string; color: string } => {
    switch (type) {
      case 'feature':
        return { icon: 'deployed_code', color: 'text-purple-400' };
      case 'scenario':
        return { icon: 'play_circle', color: 'text-blue-400' };
      case 'page':
        return { icon: 'web', color: 'text-orange-400' };
      default:
        return { icon: 'code', color: 'text-[#8b949e]' };
    }
  };

  const renderItem = (item: OutlineItem, depth: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isItemExpanded = expandedItems.has(item.id);
    const { icon, color } = getItemIcon(item.type);
    const paddingLeft = 8 + depth * 16;

    return (
      <div key={item.id}>
        <button
          onClick={() => {
            if (hasChildren) {
              toggleItem(item.id);
            }
            handleItemClick(item);
          }}
          className="w-full flex items-center gap-2 py-1.5 pr-2 hover:bg-[#21262d] transition-colors text-left group"
          style={{ paddingLeft: `${paddingLeft}px` }}
        >
          {/* Expand/Collapse Icon */}
          {hasChildren ? (
            <span
              className={`material-symbols-outlined text-sm text-[#8b949e] transition-transform ${
                isItemExpanded ? 'rotate-90' : ''
              }`}
            >
              chevron_right
            </span>
          ) : (
            <span className="w-[18px]" />
          )}

          {/* Type Icon */}
          <span className={`material-symbols-outlined text-sm ${color} icon-filled`}>
            {icon}
          </span>

          {/* Name */}
          <span className="flex-1 text-sm text-[#c9d1d9] truncate">
            {item.name}
          </span>

          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {item.tags.slice(0, 2).map((tag, idx) => (
                <span
                  key={idx}
                  className="text-[10px] px-1 py-0.5 bg-[#30363d] text-[#8b949e] rounded"
                >
                  @{tag}
                </span>
              ))}
              {item.tags.length > 2 && (
                <span className="text-[10px] text-[#6e7681]">+{item.tags.length - 2}</span>
              )}
            </div>
          )}

          {/* Line number on hover */}
          <span className="text-[10px] text-[#6e7681] opacity-0 group-hover:opacity-100 transition-opacity">
            :{item.line}
          </span>
        </button>

        {/* Children */}
        {hasChildren && isItemExpanded && (
          <div>
            {item.children!.map(child => renderItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // Don't render if no file is open or file is not a .vero file
  if (!fileName || !fileName.endsWith('.vero')) {
    return null;
  }

  return (
    <div className="border-t border-[#30363d] shrink-0 max-h-[40%] flex flex-col">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-2 hover:bg-[#21262d] transition-colors shrink-0"
      >
        <span className="text-xs font-semibold uppercase tracking-wider text-[#8b949e]">
          Outline
        </span>
        <span className={`material-symbols-outlined text-sm text-[#8b949e] transition-transform ${
          isExpanded ? '' : '-rotate-90'
        }`}>
          expand_more
        </span>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="pb-2 overflow-y-auto min-h-0">
          {outlineItems.length > 0 ? (
            outlineItems.map(item => renderItem(item))
          ) : (
            <div className="px-4 py-3 text-xs text-[#6e7681] text-center">
              No features or scenarios found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
