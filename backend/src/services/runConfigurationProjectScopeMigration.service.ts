import {
  projectRepository,
  runConfigurationRepository,
  scheduleRepository,
  workflowRepository,
} from '../db/repositories/mongo';
import type { MongoRunConfiguration } from '../db/mongodb';
import { logger } from '../utils/logger';

function toCreatePayload(source: MongoRunConfiguration, projectId: string) {
  const {
    _id: _mongoId,
    id: _sourceId,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    projectId: _projectId,
    projectScopeMigratedAt: _projectScopeMigratedAt,
    projectScopeSourceConfigId: _projectScopeSourceConfigId,
    ...rest
  } = source;

  return {
    ...rest,
    projectId,
    projectScopeSourceConfigId: source.id,
  };
}

async function cloneSourceToProject(
  source: MongoRunConfiguration,
  projectId: string
): Promise<{ clone: MongoRunConfiguration; created: boolean }> {
  const existingClone = await runConfigurationRepository.findByProjectScopeSource(
    source.workflowId,
    projectId,
    source.id
  );
  if (existingClone) {
    return { clone: existingClone, created: false };
  }

  const createdClone = await runConfigurationRepository.create(toCreatePayload(source, projectId));
  return { clone: createdClone, created: true };
}

export async function migrateRunConfigurationsToProjectScope(): Promise<void> {
  const pendingSources = await runConfigurationRepository.findPendingProjectScopeMigration();
  if (pendingSources.length === 0) {
    return;
  }

  let clonedCount = 0;
  let remappedSchedules = 0;
  let skippedCount = 0;

  for (const source of pendingSources) {
    try {
      const workflow = await workflowRepository.findById(source.workflowId);
      if (!workflow?.applicationId) {
        skippedCount += 1;
        await runConfigurationRepository.update(source.id, { projectScopeMigratedAt: new Date() });
        continue;
      }

      const projects = await projectRepository.findByApplicationId(workflow.applicationId);
      if (projects.length === 0) {
        skippedCount += 1;
        await runConfigurationRepository.update(source.id, { projectScopeMigratedAt: new Date() });
        continue;
      }

      const clonedByProjectId = new Map<string, string>();
      for (const project of projects) {
        const { clone, created } = await cloneSourceToProject(source, project.id);
        clonedByProjectId.set(project.id, clone.id);
        if (created) {
          clonedCount += 1;
        }
      }

      const schedules = await scheduleRepository.findByRunConfigurationId(source.id);
      for (const schedule of schedules) {
        if (!schedule.projectId) {
          continue;
        }
        const cloneId = clonedByProjectId.get(schedule.projectId);
        if (!cloneId || cloneId === schedule.runConfigurationId) {
          continue;
        }
        await scheduleRepository.update(schedule.id, { runConfigurationId: cloneId });
        remappedSchedules += 1;
      }

      await runConfigurationRepository.update(source.id, { projectScopeMigratedAt: new Date() });
    } catch (error: any) {
      logger.warn('[RunConfigProjectScopeMigration] Failed to migrate run configuration source', {
        runConfigurationId: source.id,
        workflowId: source.workflowId,
        error: error?.message || String(error),
      });
    }
  }

  logger.info('[RunConfigProjectScopeMigration] Completed', {
    sourceCount: pendingSources.length,
    clonedCount,
    remappedSchedules,
    skippedCount,
  });
}
