import { useState, type ReactNode } from 'react';
import { HardDrive, Menu, MoreHorizontal, Plus, RefreshCw, Settings, Upload } from 'lucide-react';
import type { CanvasTableItem } from './types';
import { TablesSidebar } from './TablesSidebar';
import { Tooltip } from '@/components/ui';

interface TestDataCanvasLayoutProps {
  tables: CanvasTableItem[];
  loadingTables: boolean;
  selectedTableId: string | null;
  openTableIds: string[];
  onSelectTable: (tableId: string) => void;
  onCreateTable: () => void;
  onRefreshTables: () => void;
  onImportExcel: () => void;
  onOpenEnvironments: () => void;
  onOpenDataStorage: () => void;
  onEditTable?: (tableId: string) => void;
  onDeleteTable?: (tableId: string) => void;
  activeTableName?: string;
  utilityRailNode?: ReactNode;
  commandStripNode: ReactNode;
  gridNode: ReactNode;
  drawerNode?: ReactNode;
}

export function TestDataCanvasLayout({
  tables,
  loadingTables,
  selectedTableId,
  openTableIds,
  onSelectTable,
  onCreateTable,
  onRefreshTables,
  onImportExcel,
  onOpenEnvironments,
  onOpenDataStorage,
  onEditTable,
  onDeleteTable,
  activeTableName,
  utilityRailNode,
  commandStripNode,
  gridNode,
  drawerNode,
}: TestDataCanvasLayoutProps) {
  const [showSidebarMobile, setShowSidebarMobile] = useState(false);
  const [showMobileUtilityMenu, setShowMobileUtilityMenu] = useState(false);

  return (
    <div className="relative flex h-full w-full overflow-hidden bg-dark-canvas">
      <div className="hidden h-full md:flex">
        <TablesSidebar
          tables={tables}
          loading={loadingTables}
          selectedId={selectedTableId}
          openIds={openTableIds}
          onSelect={onSelectTable}
          onEditTable={onEditTable}
          onDeleteTable={onDeleteTable}
        />
      </div>

      <div className="min-w-0 flex flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-border-default bg-dark-bg/80 px-2 py-1.5 md:hidden">
          <Tooltip content="Open tables sidebar" showDelayMs={0} hideDelayMs={0}>
            <button
              onClick={() => setShowSidebarMobile(true)}
              className="rounded border border-border-default bg-dark-elevated/60 p-1 text-text-secondary"
              aria-label="Open tables sidebar"
            >
              <Menu className="h-3.5 w-3.5" />
            </button>
          </Tooltip>
          <p className="px-2 text-xxs font-semibold text-text-primary">{activeTableName || 'Data Tables'}</p>
          <div className="relative">
            <Tooltip content="Utility actions" showDelayMs={0} hideDelayMs={0}>
              <button
                type="button"
                onClick={() => setShowMobileUtilityMenu((prev) => !prev)}
                className="rounded border border-border-default bg-dark-elevated/60 p-1 text-text-secondary"
                aria-label="Open utility actions"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
            {showMobileUtilityMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMobileUtilityMenu(false)} />
                <div className="absolute right-0 top-8 z-50 w-44 rounded border border-border-default bg-dark-bg/95 p-1.5 shadow-2xl">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMobileUtilityMenu(false);
                      onCreateTable();
                    }}
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xxs text-text-secondary transition-colors hover:bg-dark-elevated/70 hover:text-text-primary"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    New Table
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMobileUtilityMenu(false);
                      onImportExcel();
                    }}
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xxs text-text-secondary transition-colors hover:bg-dark-elevated/70 hover:text-text-primary"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Import
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMobileUtilityMenu(false);
                      onRefreshTables();
                    }}
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xxs text-text-secondary transition-colors hover:bg-dark-elevated/70 hover:text-text-primary"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Refresh
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMobileUtilityMenu(false);
                      onOpenEnvironments();
                    }}
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xxs text-text-secondary transition-colors hover:bg-dark-elevated/70 hover:text-text-primary"
                  >
                    <Settings className="h-3.5 w-3.5" />
                    Environment
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMobileUtilityMenu(false);
                      onOpenDataStorage();
                    }}
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xxs text-text-secondary transition-colors hover:bg-dark-elevated/70 hover:text-text-primary"
                  >
                    <HardDrive className="h-3.5 w-3.5" />
                    Storage
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {utilityRailNode && (
          <div className="hidden items-center justify-end border-b border-border-default bg-dark-bg/75 px-2 py-0.5 md:flex">
            {utilityRailNode}
          </div>
        )}

        {commandStripNode}

        <div className="min-h-0 flex-1">{gridNode}</div>
      </div>

      {showSidebarMobile && (
        <>
          <div className="fixed inset-0 z-40 bg-black/45" onClick={() => setShowSidebarMobile(false)} />
          <div className="fixed left-0 top-0 z-50 h-full w-full max-w-xs">
            <TablesSidebar
              tables={tables}
              loading={loadingTables}
              selectedId={selectedTableId}
              openIds={openTableIds}
              onSelect={(tableId) => {
                onSelectTable(tableId);
                setShowSidebarMobile(false);
              }}
              onEditTable={onEditTable}
              onDeleteTable={onDeleteTable}
            />
          </div>
        </>
      )}

      {drawerNode}
    </div>
  );
}

export default TestDataCanvasLayout;
