/** Shared workspace types used by useFileManagement, layout components, and consumer hooks. */

export interface OpenTab {
  id: string;
  path: string;
  name: string;
  content: string;
  hasChanges: boolean;
  type?: 'file' | 'compare' | 'image' | 'binary';
  contentType?: string;
  isBinary?: boolean;
  // Compare-specific fields
  compareSource?: string;
  compareTarget?: string;
  projectId?: string;
  // Visual builder mode toggle
  editorMode?: 'code' | 'builder';
}

export interface FileContextMenuState {
  x: number;
  y: number;
  filePath: string;
  fileName: string;
  projectId?: string;
  relativePath?: string;
  veroPath?: string;
}
