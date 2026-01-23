/**
 * AI Recorder API Client
 *
 * REST API calls for AI Test Recorder functionality.
 * Real-time updates are handled via WebSocket in useAIRecorder hook.
 */

import { apiClient } from './client';

// ============================================
// Types
// ============================================

export interface TestCaseInput {
  name: string;
  description?: string;
  steps: string[];
  targetUrl?: string;
}

export interface CreateSessionParams {
  testCases: TestCaseInput[];
  environment?: string;
  baseUrl?: string;
  headless?: boolean;
  applicationId?: string;
}

export interface AIRecorderStep {
  id: string;
  stepNumber: number;
  description: string;
  stepType: string;
  veroCode: string | null;
  selector: string | null;
  selectorType: string | null;
  status: string;
  retryCount: number;
  confidence: number;
  errorMessage: string | null;
  screenshotPath: string | null;
}

export interface AIRecorderTestCase {
  id: string;
  name: string;
  description: string | null;
  status: string;
  order: number;
  veroCode: string | null;
  targetUrl: string | null;
  errorMessage: string | null;
  steps: AIRecorderStep[];
}

export interface AIRecorderSession {
  id: string;
  userId: string;
  applicationId: string | null;
  status: string;
  environment: string;
  baseUrl: string | null;
  headless: boolean;
  totalTests: number;
  completedTests: number;
  failedTests: number;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  testCases?: AIRecorderTestCase[];
  _count?: {
    testCases: number;
  };
}

export interface SessionProgress {
  sessionId: string;
  status: string;
  totalTests: number;
  completedTests: number;
  failedTests: number;
  testCases: {
    id: string;
    name: string;
    status: string;
    steps: {
      id: string;
      stepNumber: number;
      description: string;
      status: string;
      veroCode: string | null;
      retryCount: number;
    }[];
  }[];
}

// ============================================
// Types for Health Check
// ============================================

export interface AIRecorderHealth {
  available: boolean;
  stagehandAvailable: boolean;
  stagehandError: string | null;
  nodeVersion: string;
  alternativePath: string | null;
  message: string;
}

// ============================================
// API Functions
// ============================================

/**
 * Check AI Recorder availability (Stagehand compatibility)
 */
export async function checkHealth(): Promise<AIRecorderHealth> {
  const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || '/api';
  const response = await fetch(`${API_BASE_URL}/ai-recorder/health`);
  return response.json();
}

/**
 * Import test cases from Excel file
 */
export async function importExcel(file: File): Promise<{ testCases: TestCaseInput[]; count: number }> {
  const formData = new FormData();
  formData.append('file', file);

  const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || '/api';
  const token = localStorage.getItem('auth_token');

  const response = await fetch(`${API_BASE_URL}/ai-recorder/import-excel`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Failed to import Excel file');
  }

  return { testCases: data.testCases, count: data.count };
}

/**
 * Create a new AI Recorder session
 */
export async function createSession(params: CreateSessionParams): Promise<string> {
  const result = await apiClient.post<{ sessionId: string }>('/ai-recorder/sessions', params);
  return result.sessionId;
}

/**
 * Start processing a session
 */
export async function startSession(sessionId: string): Promise<void> {
  await apiClient.post(`/ai-recorder/sessions/${sessionId}/start`);
}

/**
 * Get session progress
 */
export async function getSessionProgress(sessionId: string): Promise<SessionProgress> {
  return apiClient.get(`/ai-recorder/sessions/${sessionId}`);
}

/**
 * List user's sessions
 */
export async function listSessions(): Promise<AIRecorderSession[]> {
  return apiClient.get('/ai-recorder/sessions');
}

/**
 * Cancel a running session
 */
export async function cancelSession(sessionId: string): Promise<void> {
  await apiClient.post(`/ai-recorder/sessions/${sessionId}/cancel`);
}

/**
 * Delete a session
 */
export async function deleteSession(sessionId: string): Promise<void> {
  await apiClient.delete(`/ai-recorder/sessions/${sessionId}`);
}

/**
 * Get test case details
 */
export async function getTestCase(testCaseId: string): Promise<AIRecorderTestCase> {
  return apiClient.get(`/ai-recorder/test-cases/${testCaseId}`);
}

/**
 * Get generated Vero code for a test case
 */
export async function getTestCaseVeroCode(testCaseId: string): Promise<string> {
  const result = await apiClient.get<{ veroCode: string }>(`/ai-recorder/test-cases/${testCaseId}/vero`);
  return result.veroCode;
}

/**
 * Preview Vero code before saving (shows diff if file exists)
 */
export async function previewTestCase(
  testCaseId: string,
  targetPath: string
): Promise<{
  veroCode: string;
  filePath: string;
  fileExists: boolean;
  existingContent: string | null;
  willMerge: boolean;
}> {
  return apiClient.post(`/ai-recorder/test-cases/${testCaseId}/preview`, {
    targetPath,
  });
}

/**
 * Approve a test case and save as .vero file
 */
export async function approveTestCase(
  testCaseId: string,
  targetPath: string,
  options?: { merge?: boolean; overwrite?: boolean }
): Promise<string> {
  const result = await apiClient.post<{ filePath: string }>(`/ai-recorder/test-cases/${testCaseId}/approve`, {
    targetPath,
    ...options,
  });
  return result.filePath;
}

/**
 * Update a step's Vero code
 */
export async function updateStep(stepId: string, veroCode: string): Promise<void> {
  await apiClient.put(`/ai-recorder/steps/${stepId}`, { veroCode });
}

/**
 * Add a new step to a test case
 */
export async function addStep(
  testCaseId: string,
  afterStepNumber: number,
  description: string
): Promise<string> {
  const result = await apiClient.post<{ stepId: string }>(`/ai-recorder/test-cases/${testCaseId}/steps`, {
    afterStepNumber,
    description,
  });
  return result.stepId;
}

/**
 * Delete a step
 */
export async function deleteStep(stepId: string): Promise<void> {
  await apiClient.delete(`/ai-recorder/steps/${stepId}`);
}

/**
 * Get step screenshot URL
 */
export function getStepScreenshotUrl(stepId: string): string {
  const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || '/api';
  return `${API_BASE_URL}/ai-recorder/steps/${stepId}/screenshot`;
}
