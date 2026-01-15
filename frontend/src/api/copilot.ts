/**
 * Copilot API Client
 * Handles AI Copilot chat sessions and staged changes
 */

import { apiClient } from './client';

// Types
export interface CopilotSession {
  id: string;
  userId: string;
  projectId: string;
  status: 'idle' | 'thinking' | 'exploring' | 'generating';
  createdAt: string;
  updatedAt: string;
}

export interface CopilotMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  codeBlocks?: { language: string; code: string }[];
  timestamp: string;
}

export interface StagedChange {
  id: string;
  sessionId: string;
  type: 'create' | 'modify' | 'delete';
  filePath: string;
  fileName: string;
  originalContent: string | null;
  newContent: string;
  diff: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'modified' | 'applied';
  order: number;
  createdAt: string;
}

export interface Exploration {
  id: string;
  sessionId: string;
  url: string;
  screenshotBase64: string | null;
  htmlSnapshot: string | null;
  createdAt: string;
}

// SSE Event types
export type CopilotEventType = 'state' | 'thinking' | 'message' | 'exploration' | 'staged' | 'error' | 'done';

export interface CopilotEvent {
  type: CopilotEventType;
  data: unknown;
}

// API Response types
interface SessionResponse {
  session: CopilotSession;
}

interface SessionsResponse {
  sessions: CopilotSession[];
}

interface ChangesResponse {
  changes: StagedChange[];
}

interface MessagesResponse {
  messages: CopilotMessage[];
}

export const copilotApi = {
  // ============================================
  // SESSION MANAGEMENT
  // ============================================

  /**
   * Create a new copilot session
   */
  async createSession(projectId: string): Promise<CopilotSession> {
    const response = await apiClient.post<SessionResponse>('/copilot/sessions', { projectId });
    return response.session;
  },

  /**
   * List sessions for a project
   */
  async listSessions(projectId?: string): Promise<CopilotSession[]> {
    const params = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
    const response = await apiClient.get<SessionsResponse>(`/copilot/sessions${params}`);
    return response.sessions || [];
  },

  /**
   * Get a specific session
   */
  async getSession(id: string): Promise<CopilotSession> {
    const response = await apiClient.get<SessionResponse>(`/copilot/sessions/${id}`);
    return response.session;
  },

  /**
   * Delete a session
   */
  async deleteSession(id: string): Promise<void> {
    await apiClient.delete(`/copilot/sessions/${id}`);
  },

  /**
   * Reset a session (clear conversation and staged changes)
   */
  async resetSession(id: string): Promise<void> {
    await apiClient.post(`/copilot/sessions/${id}/reset`);
  },

  // ============================================
  // CONVERSATION
  // ============================================

  /**
   * Get conversation history
   */
  async getConversation(sessionId: string): Promise<CopilotMessage[]> {
    const response = await apiClient.get<MessagesResponse>(`/copilot/sessions/${sessionId}/conversation`);
    return response.messages || [];
  },

  /**
   * Send a message with SSE streaming
   * Returns an EventSource that emits events
   */
  sendMessage(sessionId: string, content: string, onEvent: (event: CopilotEvent) => void): () => void {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

    // Use fetch with POST for SSE (since we need to send body)
    const controller = new AbortController();

    fetch(`${baseUrl}/copilot/sessions/${sessionId}/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content }),
      credentials: 'include',
      signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) {
        onEvent({ type: 'error', data: { error: 'Failed to send message' } });
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let eventType = 'message';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7);
          } else if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              onEvent({ type: eventType as CopilotEventType, data });
            } catch {
              // Ignore parse errors
            }
          }
        }
      }

      onEvent({ type: 'done', data: {} });
    }).catch((err) => {
      if (err.name !== 'AbortError') {
        onEvent({ type: 'error', data: { error: err.message } });
      }
    });

    // Return abort function
    return () => controller.abort();
  },

  // ============================================
  // STAGED CHANGES
  // ============================================

  /**
   * Get all staged changes for a session
   */
  async getStagedChanges(sessionId: string): Promise<StagedChange[]> {
    const response = await apiClient.get<ChangesResponse>(`/copilot/sessions/${sessionId}/changes`);
    return response.changes || [];
  },

  /**
   * Approve a staged change
   */
  async approveChange(sessionId: string, changeId: string): Promise<void> {
    await apiClient.post(`/copilot/sessions/${sessionId}/changes/${changeId}/approve`);
  },

  /**
   * Reject a staged change
   */
  async rejectChange(sessionId: string, changeId: string, feedback?: string): Promise<void> {
    await apiClient.post(`/copilot/sessions/${sessionId}/changes/${changeId}/reject`, { feedback });
  },

  /**
   * Modify a staged change
   */
  async modifyChange(sessionId: string, changeId: string, newContent: string): Promise<StagedChange> {
    const response = await apiClient.put<{ change: StagedChange }>(
      `/copilot/sessions/${sessionId}/changes/${changeId}`,
      { newContent }
    );
    return response.change;
  },

  /**
   * Approve all pending changes and merge
   */
  async mergeAllChanges(sessionId: string): Promise<void> {
    await apiClient.post(`/copilot/sessions/${sessionId}/merge`);
  },

  // ============================================
  // EXPLORATIONS
  // ============================================

  /**
   * Get explorations for a session
   */
  async getExplorations(sessionId: string): Promise<Exploration[]> {
    const response = await apiClient.get<{ explorations: Exploration[] }>(
      `/copilot/sessions/${sessionId}/explorations`
    );
    return response.explorations || [];
  },
};
