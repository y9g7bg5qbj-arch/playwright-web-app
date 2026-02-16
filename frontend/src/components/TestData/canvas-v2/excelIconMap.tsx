import { useEffect, useState } from 'react';
import {
  ArrowUpDown,
  ClipboardCheck,
  Code,
  Columns3,
  CopyPlus,
  Eye,
  FileDown,
  FileUp,
  Layers,
  Palette,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Redo2,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Undo2,
  type LucideIcon,
} from 'lucide-react';

export type ExcelIconName =
  | 'add'
  | 'addColumn'
  | 'undo'
  | 'redo'
  | 'freeze'
  | 'unfreeze'
  | 'findReplace'
  | 'quote'
  | 'delete'
  | 'duplicate'
  | 'bulkUpdate'
  | 'fillSeries'
  | 'generator'
  | 'importCsv'
  | 'exportCsv'
  | 'refresh'
  | 'columnVisibility'
  | 'multiSort'
  | 'conditionalFormatting'
  | 'query'
  | 'quality'
  | 'advanced'
  | 'help'
  | 'preset';

type IconComponent = (props: { className?: string }) => JSX.Element;

const fallbackIcons: Record<ExcelIconName, LucideIcon> = {
  add: Plus,
  addColumn: Columns3,
  undo: Undo2,
  redo: Redo2,
  freeze: Pin,
  unfreeze: PinOff,
  findReplace: Search,
  quote: Pencil,
  delete: Trash2,
  duplicate: CopyPlus,
  bulkUpdate: Pencil,
  fillSeries: Sparkles,
  generator: Sparkles,
  importCsv: FileUp,
  exportCsv: FileDown,
  refresh: RefreshCw,
  columnVisibility: Eye,
  multiSort: ArrowUpDown,
  conditionalFormatting: Palette,
  query: Code,
  quality: ClipboardCheck,
  advanced: SlidersHorizontal,
  help: Search,
  preset: Layers,
};

const fluentCandidates: Record<ExcelIconName, string[]> = {
  add: ['Add16Regular'],
  addColumn: ['ColumnTriple16Regular', 'TableSimple16Regular', 'Add16Regular'],
  undo: ['ArrowUndo16Regular'],
  redo: ['ArrowRedo16Regular'],
  freeze: ['Pin16Regular'],
  unfreeze: ['PinOff16Regular', 'Pin16Regular'],
  findReplace: ['Search16Regular'],
  quote: ['DocumentTextQuote16Regular', 'CodeText16Regular'],
  delete: ['Delete16Regular'],
  duplicate: ['Copy16Regular'],
  bulkUpdate: ['Edit16Regular', 'Pen16Regular'],
  fillSeries: ['TextBulletListSquareSparkle16Regular', 'Sparkle16Regular'],
  generator: ['Sparkle16Regular'],
  importCsv: ['ArrowUpload16Regular'],
  exportCsv: ['ArrowDownload16Regular'],
  refresh: ['ArrowClockwise16Regular'],
  columnVisibility: ['Eye16Regular', 'EyeShow16Regular'],
  multiSort: ['ArrowSort16Regular', 'ArrowSortDownLines16Regular'],
  conditionalFormatting: ['PaintBrush16Regular', 'Color16Regular'],
  query: ['CodeText16Regular', 'Code16Regular'],
  quality: ['ClipboardCheckmark16Regular', 'CheckboxChecked16Regular'],
  advanced: ['Options16Regular', 'Settings16Regular'],
  help: ['QuestionCircle16Regular', 'Lightbulb16Regular'],
  preset: ['AppsList16Regular', 'GridDots16Regular'],
};

const FLUENT_MODULE = '@fluentui/react-icons';
let cachedFluentModule: Record<string, IconComponent> | null = null;
let loadingFluentModule: Promise<Record<string, IconComponent> | null> | null = null;

async function loadFluentModule(): Promise<Record<string, IconComponent> | null> {
  if (cachedFluentModule) {
    return cachedFluentModule;
  }
  if (!loadingFluentModule) {
    loadingFluentModule = import(
      /* @vite-ignore */ FLUENT_MODULE
    )
      .then((mod) => {
        cachedFluentModule = mod as Record<string, IconComponent>;
        return cachedFluentModule;
      })
      .catch(() => null);
  }
  return loadingFluentModule;
}

function resolveFluentIcon(name: ExcelIconName, fluentModule: Record<string, IconComponent> | null): IconComponent | null {
  if (!fluentModule) {
    return null;
  }
  const keys = fluentCandidates[name];
  for (const key of keys) {
    const icon = fluentModule[key];
    if (icon) {
      return icon;
    }
  }
  return null;
}

interface ExcelIconProps {
  name: ExcelIconName;
  className?: string;
}

export function ExcelIcon({ name, className }: ExcelIconProps) {
  const [fluentIcon, setFluentIcon] = useState<IconComponent | null>(() =>
    resolveFluentIcon(name, cachedFluentModule)
  );

  useEffect(() => {
    let cancelled = false;
    if (fluentIcon) {
      return () => {
        cancelled = true;
      };
    }
    void loadFluentModule().then((fluentModule) => {
      if (cancelled) {
        return;
      }
      const resolved = resolveFluentIcon(name, fluentModule);
      if (resolved) {
        setFluentIcon(() => resolved);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [name, fluentIcon]);

  if (fluentIcon) {
    return fluentIcon({ className });
  }
  const FallbackIcon = fallbackIcons[name];
  return <FallbackIcon className={className} />;
}
