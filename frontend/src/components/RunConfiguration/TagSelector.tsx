/**
 * TagSelector - Multi-select tag input with autocomplete
 */
import React, { useState, useRef, useEffect } from 'react';
import { X, Tag, Plus } from 'lucide-react';

interface TagSelectorProps {
  value: string[];
  onChange: (tags: string[]) => void;
  availableTags: string[];
  placeholder?: string;
  disabled?: boolean;
  label?: string;
  helperText?: string;
}

export const TagSelector: React.FC<TagSelectorProps> = ({
  value,
  onChange,
  availableTags,
  placeholder = 'Add tag...',
  disabled = false,
  label,
  helperText,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter available tags based on input and exclude already selected
  const filteredTags = availableTags.filter(
    (tag) =>
      !value.includes(tag) &&
      tag.toLowerCase().includes(inputValue.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addTag = (tag: string) => {
    const normalizedTag = tag.trim().toLowerCase();
    if (normalizedTag && !value.includes(normalizedTag)) {
      onChange([...value, normalizedTag]);
    }
    setInputValue('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const removeTag = (tag: string) => {
    onChange(value.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredTags.length > 0 && isOpen) {
        addTag(filteredTags[highlightedIndex]);
      } else if (inputValue.trim()) {
        addTag(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      removeTag(value[value.length - 1]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.min(prev + 1, filteredTags.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-slate-300">{label}</label>
      )}

      <div className="relative" ref={dropdownRef}>
        {/* Tag input container */}
        <div
          className={`
            flex flex-wrap gap-1.5 p-2 bg-slate-800 border rounded-lg min-h-[42px]
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-text'}
            ${isOpen ? 'border-blue-500 ring-1 ring-blue-500/20' : 'border-slate-700'}
          `}
          onClick={() => !disabled && inputRef.current?.focus()}
        >
          {/* Selected tags */}
          {value.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-600/20 text-blue-400 text-sm rounded-md border border-blue-600/30"
            >
              <Tag className="w-3 h-3" />
              {tag}
              {!disabled && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeTag(tag);
                  }}
                  className="hover:text-blue-300 ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}

          {/* Input */}
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setIsOpen(true);
              setHighlightedIndex(0);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={value.length === 0 ? placeholder : ''}
            disabled={disabled}
            className="flex-1 min-w-[100px] bg-transparent border-none outline-none text-sm text-slate-200 placeholder-slate-500"
          />
        </div>

        {/* Dropdown */}
        {isOpen && !disabled && (filteredTags.length > 0 || inputValue.trim()) && (
          <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {filteredTags.map((tag, index) => (
              <button
                key={tag}
                type="button"
                onClick={() => addTag(tag)}
                className={`
                  w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors
                  ${index === highlightedIndex ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-700/50'}
                `}
              >
                <Tag className="w-3.5 h-3.5 text-slate-500" />
                {tag}
              </button>
            ))}

            {/* Create new tag option */}
            {inputValue.trim() && !availableTags.includes(inputValue.toLowerCase()) && (
              <button
                type="button"
                onClick={() => addTag(inputValue)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-green-400 hover:bg-slate-700/50 border-t border-slate-700"
              >
                <Plus className="w-3.5 h-3.5" />
                Create "{inputValue.trim()}"
              </button>
            )}
          </div>
        )}
      </div>

      {helperText && (
        <p className="text-xs text-slate-500">{helperText}</p>
      )}
    </div>
  );
};

export default TagSelector;
