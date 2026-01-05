import { useState, useMemo } from 'react';
import { Search, ChevronDown, ChevronRight } from 'lucide-react';
import { blockDefinitions, categoryStyles, BlockCategory } from './blockDefinitions';

interface ToolboxItemProps {
  type: string;
  label: string;
  icon: string;
  description: string;
  color: string;
}

const ToolboxItem = ({ type, label, icon, description }: ToolboxItemProps) => {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-lg cursor-grab hover:bg-slate-800/50 border border-transparent hover:border-slate-700 transition-all group"
      draggable
      onDragStart={(event) => onDragStart(event, type)}
    >
      <div className={`p-2 rounded-md bg-slate-800 group-hover:bg-slate-700 transition-colors text-lg`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-slate-200">{label}</div>
        <div className="text-xs text-slate-500 truncate">{description}</div>
      </div>
    </div>
  );
};

interface IDEToolboxProps {
  onAddBlock?: (type: string) => void;
}

export function IDEToolbox(_props: IDEToolboxProps) {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
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
    setExpanded(prev => ({ ...prev, [category]: !prev[category] }));
  };

  // Group blocks by category
  const blocksByCategory = useMemo(() => {
    const groups: Partial<Record<BlockCategory, typeof blockDefinitions[string][]>> = {};

    Object.values(blockDefinitions).forEach(block => {
      if (search && !block.title.toLowerCase().includes(search.toLowerCase())) {
        return;
      }

      if (!groups[block.category]) {
        groups[block.category] = [];
      }
      groups[block.category]?.push(block);
    });

    return groups;
  }, [search]);

  const categories = Object.keys(categoryStyles) as BlockCategory[];

  return (
    <div className="h-full flex flex-col bg-slate-900/90 backdrop-blur-xl border-r border-slate-800 w-64">
      <div className="p-4 border-b border-slate-800">
        <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider mb-4">Toolbox</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search blocks..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500/50 transition-colors"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {categories.map(category => {
          const blocks = blocksByCategory[category];
          if (!blocks || blocks.length === 0) return null;

          const style = categoryStyles[category];

          return (
            <div key={category} className="mb-2">
              <button
                onClick={() => toggleCategory(category)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 text-xs font-semibold transition-colors uppercase tracking-wider ${style.color}`}
              >
                {expanded[category] ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                {style.label}
              </button>

              {expanded[category] && (
                <div className="space-y-1 mt-1 pl-2 border-l border-slate-800 ml-2">
                  {blocks.map(block => (
                    <ToolboxItem
                      key={block.type}
                      type={block.type}
                      label={block.title}
                      icon={block.icon}
                      description={block.description}
                      color={block.color}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
