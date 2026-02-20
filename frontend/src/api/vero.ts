/**
 * Vero File System API Client
 * Handles file operations for Vero scripts
 */

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || '/api';

function getToken(): string | null {
  return localStorage.getItem('auth_token');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

// Types
export interface VeroFileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: VeroFileNode[];
}

export interface VeroFilesResponse {
  success: boolean;
  files: VeroFileNode[];
}

export interface VeroFileContentResponse {
  success: boolean;
  content: string;
}

export interface VeroSaveResponse {
  success: boolean;
  message: string;
}

export interface VeroRenameResponse {
  success: boolean;
  message: string;
  newPath: string;
}

export interface VeroRunConfig {
  browserMode?: 'headless' | 'headed';
  workers?: number;
  retries?: number;
  timeout?: number;
  grep?: string;
  grepInvert?: string;
  lastFailed?: boolean;
  tagExpression?: string;
  selectionScope?: 'active-file' | 'current-sandbox';
  namePatterns?: string[];
  tags?: string[];
  tagMode?: 'any' | 'all';
  excludeTags?: string[];
  visualPreset?: 'strict' | 'balanced' | 'relaxed' | 'custom';
  visualThreshold?: number;
  visualMaxDiffPixels?: number;
  visualMaxDiffPixelRatio?: number;
  visualUpdateSnapshots?: boolean;
  updateSnapshotsMode?: 'all' | 'changed' | 'missing';
}

export interface VeroRunScenario {
  name: string;
  status: string;
  duration: number;
  error?: string;
  failure?: {
    category: string;
    userMessage: string;
    dslFile: string;
    dslLine: number;
    dslText: string;
    errorCode: string;
    retryable: boolean;
  };
  steps: Array<{
    stepNumber: number;
    action: string;
    description: string;
    status: string;
    duration: number;
    error?: string;
  }>;
}

export interface VeroRunResponse {
  success: boolean;
  status: string;
  output: string;
  error?: string;
  errors?: Array<{
    line?: number;
    message?: string;
    suggestion?: string;
    code?: string;
  }>;
  errorCode?: string;
  diagnostics?: {
    phase: 'startup' | 'test' | 'selection';
    tempSpecPath?: string;
    configPath?: string;
    stderrSnippet?: string;
    preservedSpecPath?: string;
    selection?: {
      scenarioNames?: string[];
      namePatterns?: string[];
      tagExpression?: string;
    };
    selectionSummary?: {
      selectionScope?: 'active-file' | 'current-sandbox';
      scannedFileCount?: number;
      selectedFileCount?: number;
      totalScenarios?: number;
      selectedScenarios?: number;
    };
    detail?: string;
  };
  selection?: {
    totalScenarios: number;
    selectedScenarios: number;
    selectedFeatures: number;
    hasFilters: boolean;
    filters: {
      scenarioNames: string[];
      namePatterns: string[];
      tagExpression?: string;
    };
  };
  selectionSummary?: {
    selectionScope: 'active-file' | 'current-sandbox';
    selectedFileCount: number;
    selectedScenarioCount: number;
    parameterCombinationCount: number;
    plannedTestInvocations: number;
    selectedFiles: Array<{
      filePath: string;
      selectedScenarioCount: number;
    }>;
  };
  executionSummary?: {
    workers: number;
    shard?: { current: number; total: number };
    selectedFileCount: number;
    selectedScenarioCount: number;
    parameterCombinationCount: number;
    plannedTestInvocations: number;
  };
  generatedCode?: string;
  executionId?: string;
  scenarios?: VeroRunScenario[];
  summary?: { passed: number; failed: number; skipped: number };
  isMatrix?: boolean;
  matrixChildren?: Array<{
    executionId: string;
    label: string;
    status: string;
    passedCount: number;
    failedCount: number;
    skippedCount: number;
  }>;
}

export interface VeroValidationError {
  code: string;
  category: string;
  severity: 'error' | 'warning' | 'info' | 'hint';
  location?: {
    line: number;
    column?: number;
  };
  title: string;
  whatWentWrong: string;
  howToFix: string;
  suggestions: Array<{ text: string }>;
}

export interface VeroValidationResponse {
  success: boolean;
  errors: VeroValidationError[];
  warnings: VeroValidationError[];
}

export interface ScenarioMeta {
  id?: string;
  name: string;
  tags: string[];
  line: number;
  featureName: string;
  filePath: string;
  projectId?: string;
  projectName?: string;
}

export interface FeatureWithScenarios {
  name: string;
  filePath: string;
  projectId?: string;
  projectName?: string;
  scenarios: ScenarioMeta[];
}

export interface ScenarioProjectFacet {
  id: string;
  name: string;
  scenarioCount: number;
}

export interface ScenarioFolderFacet {
  path: string;
  name: string;
  scenarioCount: number;
}

export interface ScenarioFacets {
  tags: { name: string; count: number }[];
  projects: ScenarioProjectFacet[];
  folders: ScenarioFolderFacet[];
}

export interface ScenarioIndex {
  totalScenarios: number;
  totalFeatures: number;
  tags: { name: string; count: number }[];
  features: FeatureWithScenarios[];
  facets?: ScenarioFacets;
}

export interface ScenarioQueryOptions {
  applicationId?: string;
  projectId?: string;
  folder?: string;
  search?: string;
  tags?: string[];
  excludeTags?: string[];
  tagMode?: 'any' | 'all';
  veroPath?: string;
}

export const veroApi = {
  // ============================================
  // FILE OPERATIONS
  // ============================================

  /**
   * List all .vero files in the project
   */
  async listFiles(projectId?: string, veroPath?: string): Promise<VeroFileNode[]> {
    let url = '/vero/files';
    const params: string[] = [];
    if (projectId) params.push(`projectId=${encodeURIComponent(projectId)}`);
    if (veroPath) params.push(`veroPath=${encodeURIComponent(veroPath)}`);
    if (params.length > 0) url += '?' + params.join('&');

    const response = await request<VeroFilesResponse>(url);
    return response.files || [];
  },

  /**
   * Get file content
   */
  async getFileContent(filePath: string, projectId?: string): Promise<string> {
    let url = `/vero/files/${encodeURIComponent(filePath)}`;
    if (projectId) url += `?projectId=${encodeURIComponent(projectId)}`;

    const response = await request<VeroFileContentResponse>(url);
    return response.content;
  },

  /**
   * Save file content
   */
  async saveFile(filePath: string, content: string, projectId?: string): Promise<void> {
    let url = `/vero/files/${encodeURIComponent(filePath)}`;
    if (projectId) url += `?projectId=${encodeURIComponent(projectId)}`;

    await request<VeroSaveResponse>(url, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    });
  },

  /**
   * Delete file
   */
  async deleteFile(filePath: string, projectId?: string, veroPath?: string): Promise<void> {
    const encodedPath = filePath.split('/').filter(Boolean).map(encodeURIComponent).join('/');
    let url = `/vero/files/${encodedPath}`;
    const params: string[] = [];
    if (projectId) params.push(`projectId=${encodeURIComponent(projectId)}`);
    if (veroPath) params.push(`veroPath=${encodeURIComponent(veroPath)}`);
    if (params.length > 0) url += '?' + params.join('&');

    await request<VeroSaveResponse>(url, { method: 'DELETE' });
  },

  /**
   * Rename file
   */
  async renameFile(oldPath: string, newPath: string): Promise<string> {
    const response = await request<VeroRenameResponse>('/vero/files/rename', {
      method: 'POST',
      body: JSON.stringify({ oldPath, newPath }),
    });
    return response.newPath;
  },

  // ============================================
  // EXECUTION
  // ============================================

  /**
   * Run Vero file
   */
  async runTest(
    options: {
      filePath?: string;
      content?: string;
      config?: VeroRunConfig;
      scenarioName?: string;
      projectId?: string;
    }
  ): Promise<VeroRunResponse> {
    return request<VeroRunResponse>('/vero/run', {
      method: 'POST',
      body: JSON.stringify(options),
    });
  },

  // ============================================
  // VALIDATION
  // ============================================

  /**
   * Validate Vero code
   */
  async validate(code: string): Promise<VeroValidationResponse> {
    return request<VeroValidationResponse>('/vero/validate', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  },

  // ============================================
  // SCENARIOS
  // ============================================

  /**
   * Get all scenarios with tags for dashboard
   */
  async getScenarios(optionsOrProjectId?: ScenarioQueryOptions | string, legacyVeroPath?: string): Promise<ScenarioIndex> {
    const options: ScenarioQueryOptions =
      typeof optionsOrProjectId === 'string' || optionsOrProjectId === undefined
        ? { projectId: optionsOrProjectId, veroPath: legacyVeroPath }
        : optionsOrProjectId;

    let url = '/vero/scenarios';
    const params = new URLSearchParams();

    if (options.applicationId) params.set('applicationId', options.applicationId);
    if (options.projectId) params.set('projectId', options.projectId);
    if (options.folder) params.set('folder', options.folder);
    if (options.search) params.set('search', options.search);
    if (options.tagMode) params.set('tagMode', options.tagMode);
    if (options.veroPath) params.set('veroPath', options.veroPath);
    if (options.tags && options.tags.length > 0) {
      params.set('tags', options.tags.join(','));
    }
    if (options.excludeTags && options.excludeTags.length > 0) {
      params.set('excludeTags', options.excludeTags.join(','));
    }

    const query = params.toString();
    if (query) {
      url += `?${query}`;
    }

    const response = await request<{ success: boolean; data: ScenarioIndex }>(url);
    return response.data;
  },

  // ============================================
  // RECORDING
  // ============================================

  /**
   * Start a recording session
   * @deprecated Use the canonical `/api/codegen/start` endpoint instead.
   */
  async startRecording(url: string = 'https://example.com'): Promise<{ sessionId: string }> {
    return request('/vero/recording/start', {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
  },

  /**
   * Get recording code
   * @deprecated Use codegen websocket events (`codegen:action`, `codegen:stopped`) plus `/api/codegen/session/:sessionId`.
   */
  async getRecordingCode(sessionId: string): Promise<{
    code: string;
    isRecording: boolean;
    isComplete: boolean;
    error?: string;
  }> {
    return request(`/vero/recording/code/${sessionId}`);
  },

  /**
   * Pause/resume recording
   * @deprecated Legacy recorder control endpoint. Prefer canonical `/api/codegen/*` flow.
   */
  async pauseRecording(sessionId: string): Promise<{ isPaused: boolean }> {
    return request('/vero/recording/pause', {
      method: 'POST',
      body: JSON.stringify({ sessionId }),
    });
  },

  /**
   * Stop recording and get the generated code
   * @deprecated Use the canonical `/api/codegen/stop/:sessionId` endpoint instead.
   */
  async stopRecording(sessionId: string): Promise<{
    code: string;
    rawPlaywrightCode: string;
    message: string;
  }> {
    return request('/vero/recording/stop', {
      method: 'POST',
      body: JSON.stringify({ sessionId }),
    });
  },

  // ============================================
  // DOCKER EXECUTION
  // ============================================

  /**
   * Run test in Docker with VNC
   */
  async runDocker(
    options: {
      filePath?: string;
      content?: string;
      config?: { dockerShards?: number };
      executionId: string;
    }
  ): Promise<{
    executionId: string;
    shardCount: number;
    vncPorts: number[];
    generatedCode: string;
  }> {
    return request('/vero/run-docker', {
      method: 'POST',
      body: JSON.stringify(options),
    });
  },

  /**
   * Stop Docker execution
   */
  async stopDocker(executionId: string): Promise<void> {
    await request('/vero/stop-docker', {
      method: 'POST',
      body: JSON.stringify({ executionId }),
    });
  },

  // ============================================
  // AI AGENT
  // ============================================

  /**
   * Check agent health
   */
  async getAgentHealth(): Promise<{
    agentStatus: string;
    llmProvider?: string;
    existingPages?: number;
  }> {
    return request('/vero/agent/health');
  },

  /**
   * Generate Vero code from English steps
   */
  async generateFromEnglish(
    steps: string,
    options?: {
      url?: string;
      featureName?: string;
      scenarioName?: string;
      useAi?: boolean;
    }
  ): Promise<{
    veroCode: string;
    newPages: Record<string, string>;
  }> {
    return request('/vero/agent/generate', {
      method: 'POST',
      body: JSON.stringify({ steps, ...options }),
    });
  },
};
