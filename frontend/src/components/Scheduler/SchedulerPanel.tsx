/**
 * SchedulerPanel - User-friendly interface for scheduling test runs
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Plus,
  AlertCircle,
  RefreshCw,
  X,
} from 'lucide-react';
import { IconButton, EmptyState } from '@/components/ui';
import { schedulesApi } from '@/api/schedules';
import { runConfigurationApi } from '@/api/runConfiguration';
import { fromBackendConfig } from '@/store/runConfigMapper';
import type {
  Schedule,
  ScheduleTriggerRequest,
} from '@playwright-web-app/shared';
import { RunParametersModal } from './RunParametersModal';
import { ScheduleCard } from './SchedulerScheduleCard';
import { ScheduleForm } from './SchedulerForm';
import { RunHistory } from './SchedulerRunHistory';
import { useRunParameterStore } from '@/store/runParameterStore';
import type { RunConfiguration } from '@/store/runConfigStore';

// =============================================
// Types
// =============================================

interface SchedulerPanelProps {
  workflowId?: string;
  applicationId?: string;
  defaultProjectId?: string;
  onRunTriggered?: (runId: string) => void;
  onNavigateToExecution?: (executionId: string) => void;
}

type ViewMode = 'list' | 'create' | 'edit' | 'history';

// =============================================
// Main SchedulerPanel Component
// =============================================

export const SchedulerPanel: React.FC<SchedulerPanelProps> = ({
  workflowId,
  applicationId,
  defaultProjectId,
  onRunTriggered,
  onNavigateToExecution,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Run parameters modal state
  const [runModalSchedule, setRunModalSchedule] = useState<Schedule | null>(null);
  const [runModalConfig, setRunModalConfig] = useState<RunConfiguration | null>(null);
  const [isTriggering, setIsTriggering] = useState(false);
  const parameterDefinitions = useRunParameterStore((s) => s.definitions);
  const parameterSets = useRunParameterStore((s) => s.sets);
  const isRunParamsLoading = useRunParameterStore((s) => s.isLoading);
  const fetchRunParameters = useRunParameterStore((s) => s.fetchAll);

  // Fetch owned config when trigger modal opens
  useEffect(() => {
    if (!runModalSchedule?.runConfigurationId) {
      setRunModalConfig(null);
      return;
    }
    let cancelled = false;
    runConfigurationApi.getOne(runModalSchedule.runConfigurationId)
      .then((backend) => {
        if (!cancelled) setRunModalConfig(fromBackendConfig(backend));
      })
      .catch(() => {
        if (!cancelled) setRunModalConfig(null);
      });
    return () => { cancelled = true; };
  }, [runModalSchedule?.runConfigurationId]);

  // Fetch schedules
  const fetchSchedules = useCallback(async () => {
    try {
      setIsLoading(true);
      if (!workflowId) {
        setSchedules([]);
        setError(null);
        return;
      }
      const data = await schedulesApi.list(workflowId);
      setSchedules(data);
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Failed to load schedules');
    } finally {
      setIsLoading(false);
    }
  }, [workflowId]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  // Handlers
  const handleCreate = async (data: any) => {
    try {
      setIsSaving(true);
      await schedulesApi.create(data);
      await fetchSchedules();
      setViewMode('list');
    } catch (e: any) {
      setError(e.message || 'Failed to create schedule');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async (data: any) => {
    if (!selectedSchedule) return;
    try {
      setIsSaving(true);
      await schedulesApi.update(selectedSchedule.id, data);
      await fetchSchedules();
      setViewMode('list');
      setSelectedSchedule(null);
    } catch (e: any) {
      setError(e.message || 'Failed to update schedule');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await schedulesApi.toggle(id);
      await fetchSchedules();
    } catch (e: any) {
      setError(e.message || 'Failed to toggle schedule');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this schedule?')) return;
    try {
      await schedulesApi.delete(id);
      await fetchSchedules();
    } catch (e: any) {
      setError(e.message || 'Failed to delete schedule');
    }
  };

  // Open modal to configure run parameters
  const handleTrigger = (schedule: Schedule) => {
    if (applicationId) {
      void fetchRunParameters(applicationId);
    }
    setRunModalSchedule(schedule);
  };

  // Execute the run with parameters from modal
  const handleTriggerWithParams = async (request: ScheduleTriggerRequest) => {
    if (!runModalSchedule) return;

    try {
      setIsTriggering(true);
      const run = await schedulesApi.triggerRun(runModalSchedule.id, request);
      onRunTriggered?.(run.id);
      setRunModalSchedule(null);
      await fetchSchedules();
    } catch (e: any) {
      setError(e.message || 'Failed to trigger run');
    } finally {
      setIsTriggering(false);
    }
  };

  const handleEdit = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    setViewMode('edit');
  };

  const handleViewHistory = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    setViewMode('history');
  };

  return (
    <div className="flex flex-col h-full bg-dark-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-default">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-status-info" />
          <h2 className="font-semibold text-text-primary">Test Scheduler</h2>
        </div>
        {viewMode === 'list' && (
          <button
            onClick={() => setViewMode('create')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-primary text-white text-sm rounded-lg hover:bg-brand-primary transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Schedule
          </button>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mx-4 mt-3 p-3 bg-status-danger/30 border border-status-danger rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2 text-status-danger">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
          <IconButton
            icon={<X className="w-4 h-4" />}
            variant="ghost"
            tone="danger"
            tooltip="Dismiss"
            onClick={() => setError(null)}
          />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pt-4">
        {viewMode === 'list' && (
          <>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-6 h-6 text-text-muted animate-spin" />
              </div>
            ) : schedules.length === 0 ? (
              <EmptyState
                icon={<Calendar className="w-5 h-5" />}
                title="No schedules yet"
                message="Create a schedule to run tests automatically"
                action={
                  <button
                    onClick={() => setViewMode('create')}
                    className="px-4 py-2 bg-brand-primary text-white text-sm rounded-lg hover:bg-brand-primary transition-colors"
                  >
                    Create Your First Schedule
                  </button>
                }
              />
            ) : (
              <div className="space-y-3">
                {schedules.map((schedule) => (
                  <ScheduleCard
                    key={schedule.id}
                    schedule={schedule}
                    onEdit={handleEdit}
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                    onTrigger={handleTrigger}
                    onViewHistory={handleViewHistory}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {viewMode === 'create' && (
          <ScheduleForm
            key="create-schedule-form"
            workflowId={workflowId}
            applicationId={applicationId}
            defaultProjectId={defaultProjectId}
            onSave={handleCreate}
            onCancel={() => setViewMode('list')}
            isLoading={isSaving}
          />
        )}

        {viewMode === 'edit' && selectedSchedule && (
          <ScheduleForm
            key={`edit-schedule-${selectedSchedule.id}`}
            schedule={selectedSchedule}
            workflowId={workflowId}
            applicationId={applicationId}
            defaultProjectId={defaultProjectId}
            onSave={handleUpdate}
            onCancel={() => {
              setViewMode('list');
              setSelectedSchedule(null);
            }}
            isLoading={isSaving}
          />
        )}

        {viewMode === 'history' && selectedSchedule && (
          <RunHistory
            schedule={selectedSchedule}
            onBack={() => {
              setViewMode('list');
              setSelectedSchedule(null);
            }}
            onOpenExecution={(executionId) => onNavigateToExecution?.(executionId)}
            onTrigger={handleTrigger}
          />
        )}
      </div>

      {/* Run Parameters Modal */}
      {runModalSchedule && (
        <RunParametersModal
          isOpen={true}
          onClose={() => setRunModalSchedule(null)}
          onRun={handleTriggerWithParams}
          schedule={runModalSchedule}
          runConfiguration={runModalConfig}
          parameterDefinitions={parameterDefinitions}
          parameterSets={parameterSets}
          isLoading={isTriggering || isRunParamsLoading}
        />
      )}
    </div>
  );
};

export default SchedulerPanel;
