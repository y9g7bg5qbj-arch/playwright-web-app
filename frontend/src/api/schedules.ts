/**
 * Schedules API Client
 * Handles all schedule-related API calls
 */

import { apiClient } from './client';
import type {
  Schedule,
  ScheduleCreate,
  ScheduleUpdate,
  ScheduleRun,
  ScheduleTriggerRequest,
} from '@playwright-web-app/shared';

export interface CronValidationResult {
  valid: boolean;
  description?: string;
  error?: string;
  nextRuns?: string[];
}

export interface WebhookInfo {
  token: string | null;
  webhookUrl: string | null;
  hasToken: boolean;
}

export interface SchedulePreset {
  label: string;
  cronExpression: string;
  description: string;
}

export const schedulesApi = {
  /**
   * Get all schedules for the current user
   */
  async list(workflowId?: string): Promise<Schedule[]> {
    const query = workflowId ? `?workflowId=${encodeURIComponent(workflowId)}` : '';
    return apiClient.get<Schedule[]>(`/schedules${query}`);
  },

  /**
   * Get a single schedule by ID
   */
  async get(id: string): Promise<Schedule> {
    return apiClient.get<Schedule>(`/schedules/${id}`);
  },

  /**
   * Create a new schedule
   */
  async create(data: ScheduleCreate): Promise<Schedule> {
    return apiClient.post<Schedule>('/schedules', data);
  },

  /**
   * Update an existing schedule
   */
  async update(id: string, data: ScheduleUpdate): Promise<Schedule> {
    return apiClient.put<Schedule>(`/schedules/${id}`, data);
  },

  /**
   * Delete a schedule
   */
  async delete(id: string): Promise<void> {
    return apiClient.delete(`/schedules/${id}`);
  },

  /**
   * Toggle schedule active/inactive status
   */
  async toggle(id: string): Promise<Schedule> {
    return apiClient.post<Schedule>(`/schedules/${id}/toggle`);
  },

  /**
   * Trigger a manual run of a schedule with optional parameters
   */
  async triggerRun(id: string, request?: ScheduleTriggerRequest): Promise<ScheduleRun> {
    return apiClient.post<ScheduleRun>(`/schedules/${id}/trigger`, request || {});
  },

  /**
   * Get run history for a schedule
   */
  async getRuns(id: string, limit: number = 20, offset: number = 0): Promise<{ runs: ScheduleRun[]; total: number }> {
    return apiClient.get<{ runs: ScheduleRun[]; total: number }>(`/schedules/${id}/runs?limit=${limit}&offset=${offset}`);
  },

  /**
   * Get a specific run details
   */
  async getRun(runId: string): Promise<ScheduleRun> {
    return apiClient.get<ScheduleRun>(`/schedules/runs/${runId}`);
  },

  /**
   * Validate a cron expression
   */
  async validateCron(
    expression: string,
    count: number = 5,
    timezone: string = 'UTC'
  ): Promise<CronValidationResult> {
    return apiClient.post<CronValidationResult>('/schedules/validate-cron', {
      expression,
      count,
      timezone,
    });
  },

  /**
   * Get schedule presets
   */
  async getPresets(): Promise<SchedulePreset[]> {
    return apiClient.get<SchedulePreset[]>('/schedules/presets');
  },

  /**
   * Get webhook info for a schedule
   */
  async getWebhookInfo(id: string): Promise<WebhookInfo> {
    return apiClient.get<WebhookInfo>(`/schedules/${id}/webhook`);
  },

  /**
   * Regenerate webhook token
   */
  async regenerateWebhookToken(id: string): Promise<{ token: string; webhookUrl: string }> {
    return apiClient.post(`/schedules/${id}/webhook/regenerate`);
  },
};
