/**
 * Saved Views Dropdown
 *
 * Dropdown component for managing saved views (filter/sort/column configurations).
 * Allows users to save, load, update, and delete views.
 */

import { useState, useEffect, useRef } from 'react';
import { BookmarkPlus, ChevronDown, Star, Trash2, Save, Check } from 'lucide-react';
import { testDataApi, SavedView, SavedViewCreate } from '@/api/testData';

interface SavedViewsDropdownProps {
  sheetId: string;
  currentFilterState: Record<string, unknown>;
  currentSortState: unknown[];
  currentColumnState: unknown[];
  onViewSelect: (view: SavedView) => void;
  onViewsChange?: () => void;
}

export function SavedViewsDropdown({
  sheetId,
  currentFilterState,
  currentSortState,
  currentColumnState,
  onViewSelect,
  onViewsChange,
}: SavedViewsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [views, setViews] = useState<SavedView[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newViewName, setNewViewName] = useState('');
  const [newViewDescription, setNewViewDescription] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [selectedViewId, setSelectedViewId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch views when component mounts or sheetId changes
  useEffect(() => {
    if (sheetId) {
      fetchViews();
    }
  }, [sheetId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowSaveDialog(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchViews = async () => {
    setLoading(true);
    try {
      const viewList = await testDataApi.listSavedViews(sheetId);
      setViews(viewList);

      // Auto-select default view if exists
      const defaultView = viewList.find(v => v.isDefault);
      if (defaultView && !selectedViewId) {
        setSelectedViewId(defaultView.id);
        onViewSelect(defaultView);
      }
    } catch (error) {
      console.error('Failed to fetch saved views:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveView = async () => {
    if (!newViewName.trim()) return;

    try {
      const viewData: SavedViewCreate = {
        name: newViewName.trim(),
        description: newViewDescription.trim() || undefined,
        isDefault,
        filterState: currentFilterState,
        sortState: currentSortState,
        columnState: currentColumnState,
      };

      const newView = await testDataApi.createSavedView(sheetId, viewData);
      setViews([...views, newView]);
      setShowSaveDialog(false);
      setNewViewName('');
      setNewViewDescription('');
      setIsDefault(false);
      setSelectedViewId(newView.id);
      onViewsChange?.();
    } catch (error) {
      console.error('Failed to save view:', error);
    }
  };

  const handleUpdateView = async (viewId: string) => {
    try {
      const updatedView = await testDataApi.updateSavedView(viewId, {
        filterState: currentFilterState,
        sortState: currentSortState,
        columnState: currentColumnState,
      });

      setViews(views.map(v => v.id === viewId ? updatedView : v));
      onViewsChange?.();
    } catch (error) {
      console.error('Failed to update view:', error);
    }
  };

  const handleDeleteView = async (viewId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!confirm('Are you sure you want to delete this view?')) return;

    try {
      await testDataApi.deleteSavedView(viewId);
      setViews(views.filter(v => v.id !== viewId));
      if (selectedViewId === viewId) {
        setSelectedViewId(null);
      }
      onViewsChange?.();
    } catch (error) {
      console.error('Failed to delete view:', error);
    }
  };

  const handleSetDefault = async (viewId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      const view = views.find(v => v.id === viewId);
      if (!view) return;

      const updatedView = await testDataApi.updateSavedView(viewId, {
        isDefault: !view.isDefault,
      });

      // Update local state - only one can be default
      setViews(views.map(v => ({
        ...v,
        isDefault: v.id === viewId ? updatedView.isDefault : (updatedView.isDefault ? false : v.isDefault),
      })));
      onViewsChange?.();
    } catch (error) {
      console.error('Failed to update default view:', error);
    }
  };

  const handleSelectView = (view: SavedView) => {
    setSelectedViewId(view.id);
    onViewSelect(view);
    setIsOpen(false);
  };

  const selectedView = views.find(v => v.id === selectedViewId);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Main Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs text-slate-200 transition-colors"
      >
        <BookmarkPlus className="w-3.5 h-3.5" />
        <span className="max-w-[100px] truncate">
          {selectedView ? selectedView.name : 'Views'}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-slate-800 rounded-lg shadow-xl border border-slate-700 z-50">
          {/* Views List */}
          <div className="max-h-64 overflow-y-auto">
            {loading ? (
              <div className="px-3 py-4 text-center text-slate-400 text-sm">Loading views...</div>
            ) : views.length === 0 ? (
              <div className="px-3 py-4 text-center text-slate-400 text-sm">
                No saved views yet
              </div>
            ) : (
              views.map(view => (
                <div
                  key={view.id}
                  className={`group px-3 py-2 hover:bg-slate-700/50 cursor-pointer ${
                    selectedViewId === view.id ? 'bg-slate-700' : ''
                  }`}
                  onClick={() => handleSelectView(view)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {view.isDefault && (
                        <Star className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" fill="currentColor" />
                      )}
                      <span className="text-sm text-slate-200 truncate">{view.name}</span>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleSetDefault(view.id, e)}
                        className="p-1 hover:bg-slate-600 rounded"
                        title={view.isDefault ? 'Remove default' : 'Set as default'}
                      >
                        <Star className={`w-3.5 h-3.5 ${view.isDefault ? 'text-amber-400' : 'text-slate-400'}`} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpdateView(view.id);
                        }}
                        className="p-1 hover:bg-slate-600 rounded"
                        title="Update with current settings"
                      >
                        <Save className="w-3.5 h-3.5 text-slate-400" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteView(view.id, e)}
                        className="p-1 hover:bg-red-600/20 rounded"
                        title="Delete view"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>
                  </div>
                  {view.description && (
                    <p className="text-xs text-slate-400 mt-0.5 truncate">{view.description}</p>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-slate-700" />

          {/* Save New View */}
          {!showSaveDialog ? (
            <button
              onClick={() => setShowSaveDialog(true)}
              className="w-full px-3 py-2.5 text-left text-sm text-emerald-400 hover:bg-slate-700/50 flex items-center gap-2"
            >
              <BookmarkPlus className="w-4 h-4" />
              Save current view...
            </button>
          ) : (
            <div className="p-3 space-y-2">
              <input
                type="text"
                value={newViewName}
                onChange={(e) => setNewViewName(e.target.value)}
                placeholder="View name"
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-600 rounded text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                autoFocus
              />
              <input
                type="text"
                value={newViewDescription}
                onChange={(e) => setNewViewDescription(e.target.value)}
                placeholder="Description (optional)"
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-600 rounded text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
              <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="rounded bg-slate-700 border-slate-600"
                />
                Set as default view
              </label>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  onClick={() => {
                    setShowSaveDialog(false);
                    setNewViewName('');
                    setNewViewDescription('');
                    setIsDefault(false);
                  }}
                  className="px-2.5 py-1 text-sm text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveView}
                  disabled={!newViewName.trim()}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-600 disabled:cursor-not-allowed rounded text-sm text-white flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  Save
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
