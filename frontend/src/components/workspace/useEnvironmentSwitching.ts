import { useEffect, useRef, useCallback } from 'react';
import { useSandboxStore } from '@/store/sandboxStore';
import type { Sandbox } from '@/api/sandbox';

/** Minimal shape — avoids importing the full project store type. */
interface MinimalProject {
  id: string;
  veroPath?: string;
}

/** Minimal directory node — avoids importing FileNode from ExplorerPanel. */
interface MinimalDirectory {
  path: string;
}

export interface UseEnvironmentSwitchingParams {
  currentProjects: MinimalProject[] | undefined;
  activeNestedProjectId: string | null;
  resetTabsForEnvironmentSwitch: () => Promise<void>;
  loadProjectFiles: (projectId: string, veroPath?: string) => Promise<void>;
  setSelectedProjectId: (id: string | null) => void;
}

export function useEnvironmentSwitching({
  currentProjects,
  activeNestedProjectId,
  resetTabsForEnvironmentSwitch,
  loadProjectFiles,
  setSelectedProjectId,
}: UseEnvironmentSwitchingParams) {
  const activeEnvironment = useSandboxStore(s => s.activeEnvironment);
  const setActiveEnvironment = useSandboxStore(s => s.setActiveEnvironment);
  const sandboxes = useSandboxStore(s => s.sandboxes);
  const fetchSandboxes = useSandboxStore(s => s.fetchSandboxes);

  const prevEnvironmentRef = useRef(activeEnvironment);
  const fetchSequenceRef = useRef(0);

  // Keep refs in sync so the env-switch effect always reads fresh values
  // without needing them in the dependency array (which would over-fire).
  const currentProjectsRef = useRef(currentProjects);
  useEffect(() => { currentProjectsRef.current = currentProjects; }, [currentProjects]);

  const loadProjectFilesRef = useRef(loadProjectFiles);
  useEffect(() => { loadProjectFilesRef.current = loadProjectFiles; }, [loadProjectFiles]);

  const resetTabsRef = useRef(resetTabsForEnvironmentSwitch);
  useEffect(() => { resetTabsRef.current = resetTabsForEnvironmentSwitch; }, [resetTabsForEnvironmentSwitch]);

  // Prefetch sandboxes when active project changes
  useEffect(() => {
    if (!activeNestedProjectId) return;
    void fetchSandboxes(activeNestedProjectId);
  }, [activeNestedProjectId, fetchSandboxes]);

  // Reload file trees and close tabs when environment switches
  useEffect(() => {
    if (prevEnvironmentRef.current === activeEnvironment) return;
    prevEnvironmentRef.current = activeEnvironment;

    // Flush pending saves before clearing tabs, then reload file trees.
    void resetTabsRef.current()
      .then(() => {
        const projects = currentProjectsRef.current;
        if (!projects) return;
        return Promise.all(
          projects
            .filter(p => p.veroPath)
            .map(p => loadProjectFilesRef.current(p.id, p.veroPath)),
        );
      })
      .catch(err => {
        console.error('[useEnvironmentSwitching] env-switch reload failed:', err);
      });
  }, [activeEnvironment]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Utilities ─────────────────────────────────────────────

  const normalizeScopePath = useCallback(
    (value: string) => value.replace(/\\/g, '/').replace(/^\/+/, '').toLowerCase(),
    [],
  );

  const findActiveSandboxByFolderPath = useCallback(
    (folderPath: string, candidates: Sandbox[] = sandboxes) => {
      const normalized = normalizeScopePath(folderPath);
      return candidates.find(
        (s) => s.status === 'active' && normalizeScopePath(s.folderPath) === normalized,
      );
    },
    [normalizeScopePath, sandboxes],
  );

  // ─── Explorer directory click ──────────────────────────────

  const handleExplorerDirectorySelect = useCallback(
    (directory: MinimalDirectory, projectId?: string) => {
      // Bump on every call so any pending async fetch is invalidated
      // when the user clicks a different directory (dev, master, etc.)
      ++fetchSequenceRef.current;

      if (projectId) setSelectedProjectId(projectId);

      const normalizedPath = normalizeScopePath(directory.path);

      if (normalizedPath === 'dev') { setActiveEnvironment('dev'); return; }
      if (normalizedPath === 'master') { setActiveEnvironment('master'); return; }

      if (!normalizedPath.startsWith('sandboxes/')) return;

      const pathParts = normalizedPath.split('/').filter(Boolean);
      if (pathParts.length !== 2) return;

      const targetFolderPath = `sandboxes/${pathParts[1]}`;
      const sandbox = findActiveSandboxByFolderPath(targetFolderPath);

      if (sandbox) { setActiveEnvironment({ sandboxId: sandbox.id }); return; }
      if (!projectId) return;

      // Capture current sequence *after* the bump at function entry
      const currentFetchSeq = fetchSequenceRef.current;

      void fetchSandboxes(projectId)
        .then(() => {
          if (fetchSequenceRef.current !== currentFetchSeq) return; // stale
          const latestSandboxes = useSandboxStore.getState().sandboxes;
          const matched = findActiveSandboxByFolderPath(targetFolderPath, latestSandboxes);
          if (matched) setActiveEnvironment({ sandboxId: matched.id });
        })
        .catch(() => {}); // swallow — sandbox list refresh is best-effort
    },
    [findActiveSandboxByFolderPath, fetchSandboxes, normalizeScopePath, setActiveEnvironment, setSelectedProjectId],
  );

  // ─── Compare source resolution ─────────────────────────────

  const resolveCompareSourceEnvironment = useCallback(
    (relativePath?: string, absolutePath?: string): string => {
      const activeEnvironmentId =
        typeof activeEnvironment === 'object' && 'sandboxId' in activeEnvironment
          ? `sandbox:${activeEnvironment.sandboxId}`
          : activeEnvironment;

      if (!relativePath && !absolutePath) return activeEnvironmentId;

      const candidatePath = relativePath || absolutePath!;

      // Segment-boundary regex for robust detection in both relative and absolute paths
      if (/(?:^|\/)dev(?:\/|$)/.test(candidatePath)) return 'dev';
      if (/(?:^|\/)master(?:\/|$)/.test(candidatePath)) return 'master';

      const detectSandboxName = (pathValue: string): string | null => {
        const match = pathValue.match(/(?:^|\/)sandboxes\/([^/]+)(?:\/|$)/i);
        return match ? match[1] : null;
      };

      const sandboxNameFromPath =
        detectSandboxName(candidatePath) ||
        (absolutePath ? detectSandboxName(absolutePath) : null);

      if (sandboxNameFromPath) {
        const sandboxName = sandboxNameFromPath.toLowerCase();
        const matchedSandbox = sandboxes.find((sandbox) => {
          const normalizedFolderPath = sandbox.folderPath.replace(/\\/g, '/').toLowerCase();
          return (
            normalizedFolderPath === `sandboxes/${sandboxName}` ||
            normalizedFolderPath.endsWith(`/${sandboxName}`) ||
            sandbox.name.toLowerCase() === sandboxName
          );
        });
        if (matchedSandbox) return `sandbox:${matchedSandbox.id}`;
        return `sandbox-name:${sandboxName}`;
      }

      return activeEnvironmentId;
    },
    [activeEnvironment, sandboxes],
  );

  return { handleExplorerDirectorySelect, resolveCompareSourceEnvironment };
}
