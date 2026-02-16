import { useEffect, useMemo, useRef, useState } from 'react';
import { EllipsisVertical, Search, Table2, Trash2, Pencil, RefreshCw } from 'lucide-react';
import type { CanvasTableItem } from './types';
import { Tooltip } from '@/components/ui';

interface TablesSidebarProps {
  tables: CanvasTableItem[];
  loading: boolean;
  selectedId: string | null;
  openIds: string[];
  onSelect: (tableId: string) => void;
  onEditTable?: (tableId: string) => void;
  onDeleteTable?: (tableId: string) => void;
}

export function TablesSidebar({
  tables,
  loading,
  selectedId,
  openIds,
  onSelect,
  onEditTable,
  onDeleteTable,
}: TablesSidebarProps) {
  const [query, setQuery] = useState('');
  const [openMenuTableId, setOpenMenuTableId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const firstMenuItemRef = useRef<HTMLButtonElement | null>(null);

  const filteredTables = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return tables;
    }
    return tables.filter((table) => table.name.toLowerCase().includes(normalized));
  }, [query, tables]);

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      if (!menuRef.current) {
        return;
      }
      if (!menuRef.current.contains(event.target as Node)) {
        setOpenMenuTableId(null);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenMenuTableId(null);
      }
    };

    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  useEffect(() => {
    if (!openMenuTableId) {
      return;
    }
    window.requestAnimationFrame(() => {
      firstMenuItemRef.current?.focus();
    });
  }, [openMenuTableId]);

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-border-default bg-dark-bg/90">
      <div className="border-b border-border-default px-3 py-2">
        <div className="mb-1.5 flex items-center justify-between">
          <h2 className="text-xs font-semibold text-text-primary">Tables</h2>
          <div className="flex items-center gap-1">
            {loading && <RefreshCw className="h-3 w-3 animate-spin text-text-muted" />}
            <span className="rounded border border-border-default bg-dark-elevated/70 px-1.5 py-0.5 text-3xs text-text-secondary">
              {tables.length}
            </span>
          </div>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search tables"
            className="w-full rounded border border-border-default bg-dark-elevated/80 py-1.5 pl-7 pr-2 text-xxs text-text-primary placeholder:text-text-muted focus:border-border-active focus:outline-none"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {filteredTables.length === 0 ? (
          <div className="rounded-lg border border-border-default bg-dark-card/70 px-4 py-8 text-center">
            <Table2 className="mx-auto mb-2 h-5 w-5 text-text-muted" />
            <p className="text-xxs text-text-muted">No tables found</p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredTables.map((table) => {
              const isSelected = selectedId === table.id;
              const isOpen = openIds.includes(table.id);
              const menuOpen = openMenuTableId === table.id;

              return (
                <div
                  key={table.id}
                  className={`group flex w-full items-center gap-1.5 rounded border px-2 py-1.5 text-left transition-colors ${
                    isSelected
                      ? 'border-brand-primary/35 bg-brand-primary/10'
                      : 'border-border-default/0 hover:border-border-default hover:bg-dark-elevated/55'
                  }`}
                >
                  <button
                    onClick={() => {
                      setOpenMenuTableId(null);
                      onSelect(table.id);
                    }}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    <div className={`rounded p-1 ${isSelected ? 'bg-brand-primary/20' : 'bg-dark-elevated/70'}`}>
                      <Table2 className={`h-3.5 w-3.5 ${isSelected ? 'text-brand-secondary' : 'text-text-muted'}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-xxs ${isSelected ? 'font-semibold text-text-primary' : 'text-text-secondary'}`}>
                        {table.name}
                      </p>
                      <p className="text-3xs text-text-muted">
                        {table.rowCount} rows{isOpen ? ' • open' : ''}
                      </p>
                    </div>
                  </button>

                  {(onEditTable || onDeleteTable) && (
                    <div className="relative shrink-0" ref={menuOpen ? menuRef : undefined}>
                      <Tooltip content={`Actions for ${table.name}`} showDelayMs={0} hideDelayMs={0}>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setOpenMenuTableId((prev) => (prev === table.id ? null : table.id));
                          }}
                          className={`rounded p-1 text-text-muted transition-colors hover:bg-dark-card hover:text-text-primary ${
                            menuOpen ? 'bg-dark-card text-text-primary' : ''
                          }`}
                          aria-label={`Open actions for ${table.name}`}
                          aria-haspopup="menu"
                          aria-expanded={menuOpen}
                        >
                          <EllipsisVertical className="h-3.5 w-3.5" />
                        </button>
                      </Tooltip>

                      {menuOpen && (
                        <div
                          role="menu"
                          onKeyDown={(event) => {
                            if (event.key === 'Escape') {
                              event.stopPropagation();
                              setOpenMenuTableId(null);
                            }
                          }}
                          className="absolute right-0 top-7 z-20 min-w-[120px] rounded border border-border-default bg-dark-bg/95 p-1 shadow-xl"
                        >
                          {onEditTable && (
                            <button
                              ref={firstMenuItemRef}
                              type="button"
                              role="menuitem"
                              onClick={(event) => {
                                event.stopPropagation();
                                setOpenMenuTableId(null);
                                onEditTable(table.id);
                              }}
                              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xxs text-text-secondary transition-colors hover:bg-dark-elevated/65 hover:text-text-primary focus:bg-dark-elevated/65 focus:text-text-primary focus:outline-none"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Edit Table
                            </button>
                          )}
                          {onDeleteTable && (
                            <button
                              type="button"
                              role="menuitem"
                              onClick={(event) => {
                                event.stopPropagation();
                                setOpenMenuTableId(null);
                                onDeleteTable(table.id);
                              }}
                              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xxs text-text-secondary transition-colors hover:bg-status-danger/15 hover:text-status-danger focus:bg-status-danger/15 focus:text-status-danger focus:outline-none"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete Table
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}

export default TablesSidebar;
