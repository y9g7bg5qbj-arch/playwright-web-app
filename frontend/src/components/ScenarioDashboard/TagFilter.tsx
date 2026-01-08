import React, { useState } from 'react';
import { X, Search } from 'lucide-react';
import type { TagSummary, FilterMode, FilterOperator } from './types';

interface TagFilterProps {
  tags: TagSummary[];
  selectedTags: string[];
  onSelectedTagsChange: (tags: string[]) => void;
  filterMode: FilterMode;
  onFilterModeChange: (mode: FilterMode) => void;
  filterOperator: FilterOperator;
  onFilterOperatorChange: (operator: FilterOperator) => void;
}

export const TagFilter: React.FC<TagFilterProps> = ({
  tags,
  selectedTags,
  onSelectedTagsChange,
  filterMode,
  onFilterModeChange,
  filterOperator,
  onFilterOperatorChange,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTags = tags.filter(
    (tag) =>
      tag.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !selectedTags.includes(tag.name)
  );

  const handleAddTag = (tagName: string) => {
    if (!selectedTags.includes(tagName)) {
      onSelectedTagsChange([...selectedTags, tagName]);
    }
  };

  const handleRemoveTag = (tagName: string) => {
    onSelectedTagsChange(selectedTags.filter((t) => t !== tagName));
  };

  const handleClearAll = () => {
    onSelectedTagsChange([]);
  };

  return (
    <div className="space-y-3 bg-slate-800/50 rounded-lg p-4 border border-slate-700">
      {/* Filter Mode Toggle */}
      <div className="flex items-center gap-4">
        <span className="text-sm text-slate-400">Filter Mode:</span>
        <div className="flex bg-slate-900 rounded-lg p-1">
          <button
            onClick={() => onFilterModeChange('has')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              filterMode === 'has'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            HAS tags
          </button>
          <button
            onClick={() => onFilterModeChange('missing')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              filterMode === 'missing'
                ? 'bg-amber-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            MISSING tags
          </button>
        </div>

        {/* AND/OR Toggle */}
        {selectedTags.length > 1 && (
          <>
            <div className="h-4 w-px bg-slate-600" />
            <div className="flex bg-slate-900 rounded-lg p-1">
              <button
                onClick={() => onFilterOperatorChange('and')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  filterOperator === 'and'
                    ? 'bg-purple-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                AND
              </button>
              <button
                onClick={() => onFilterOperatorChange('or')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  filterOperator === 'or'
                    ? 'bg-purple-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                OR
              </button>
            </div>
          </>
        )}
      </div>

      {/* Selected Tags */}
      {selectedTags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-slate-400">Selected:</span>
          {selectedTags.map((tag) => (
            <span
              key={tag}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-sm ${
                filterMode === 'has'
                  ? 'bg-blue-600/30 text-blue-300 border border-blue-500/50'
                  : 'bg-amber-600/30 text-amber-300 border border-amber-500/50'
              }`}
            >
              @{tag}
              <button
                onClick={() => handleRemoveTag(tag)}
                className="hover:text-white ml-1"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <button
            onClick={handleClearAll}
            className="text-xs text-slate-500 hover:text-slate-300 underline ml-2"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Available Tags */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400">Available Tags:</span>
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm bg-slate-900 border border-slate-700 rounded-md text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {filteredTags.slice(0, 20).map((tag) => (
            <button
              key={tag.name}
              onClick={() => handleAddTag(tag.name)}
              className="inline-flex items-center gap-1 px-2 py-1 bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-md text-sm transition-colors"
            >
              @{tag.name}
              <span className="text-slate-500 text-xs">({tag.count})</span>
            </button>
          ))}
          {filteredTags.length > 20 && (
            <span className="text-xs text-slate-500 self-center">
              +{filteredTags.length - 20} more
            </span>
          )}
          {filteredTags.length === 0 && searchQuery && (
            <span className="text-sm text-slate-500">No matching tags</span>
          )}
        </div>
      </div>
    </div>
  );
};
