import { useState, useEffect, useRef, useMemo } from 'react';
import { FileText, Search } from 'lucide-react';

interface QuickOpenFile {
  name: string;
  path: string;
  relativePath: string;
}

interface QuickOpenDialogProps {
  isOpen: boolean;
  onClose: () => void;
  files: QuickOpenFile[];
  onSelect: (filePath: string) => void;
}

export function QuickOpenDialog({ isOpen, onClose, files, onSelect }: QuickOpenDialogProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!query) return files;
    const q = query.toLowerCase();
    return files.filter(f =>
      f.name.toLowerCase().includes(q) ||
      f.relativePath.toLowerCase().includes(q)
    );
  }, [query, files]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, filtered.length - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
      }
      if (e.key === 'Enter' && filtered[selectedIndex]) {
        onSelect(filtered[selectedIndex].path);
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, filtered, selectedIndex, onClose, onSelect]);

  useEffect(() => {
    const el = listRef.current?.children[selectedIndex] as HTMLElement;
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (!isOpen) return null;

  const getFileIcon = (name: string) => {
    if (name.endsWith('.vero')) return <FileText size={14} className="text-purple-400" />;
    if (name.endsWith('.page')) return <FileText size={14} className="text-blue-400" />;
    return <FileText size={14} className="text-text-tertiary" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" onClick={onClose}>
      <div
        className="w-[520px] bg-bg-primary border border-border-primary rounded-lg shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border-primary">
          <Search size={16} className="text-text-tertiary shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search files by name..."
            className="flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-tertiary"
          />
        </div>
        <div ref={listRef} className="max-h-[320px] overflow-y-auto py-1">
          {filtered.length === 0 && (
            <div className="px-3 py-6 text-center text-sm text-text-tertiary">No matching files</div>
          )}
          {filtered.map((file, i) => (
            <div
              key={file.path}
              className={`flex items-center gap-3 px-3 py-1.5 cursor-pointer text-sm ${
                i === selectedIndex ? 'bg-bg-tertiary text-text-primary' : 'text-text-secondary hover:bg-bg-secondary'
              }`}
              onMouseEnter={() => setSelectedIndex(i)}
              onClick={() => { onSelect(file.path); onClose(); }}
            >
              <span className="w-5 h-5 flex items-center justify-center shrink-0">
                {getFileIcon(file.name)}
              </span>
              <span className="flex-1 truncate">{file.name}</span>
              <span className="text-xs text-text-tertiary truncate max-w-[200px]">{file.relativePath}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
