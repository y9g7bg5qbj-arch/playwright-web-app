/**
 * MongoDB Repository Layer
 *
 * Provides database operations using MongoDB.
 * All application data is stored in MongoDB.
 */

export * from './core';
export * from './testData';
export * from './testExecution';
export * from './scheduling';
export * from './pullRequests';
export * from './sandboxFiles';
export * from './github';
export * from './recording';
export * from './copilot';
export * from './environments';
export * from './infrastructure';
export * from './pageObjects';
export * from './dataTables';
export * from './runParameters';
export * from './authProfiles';
export * from './configSync';

// Aggregate repository object for convenience
import { userRepository, applicationRepository, projectRepository, workflowRepository, passwordTokenRepository } from './core';
import { testFlowRepository, testDataSheetRepository, testDataRowRepository, testDataSavedViewRepository, testDataRelationshipRepository } from './testData';
import { executionRepository, executionLogRepository, executionStepRepository, executionEnvironmentRepository, runConfigurationRepository } from './testExecution';
import { scheduleRepository, scheduleRunRepository, scheduleTestResultRepository, scheduledTestRepository, scheduledTestRunRepository, scheduleNotificationRepository, notificationHistoryRepository } from './scheduling';
import { sandboxRepository, pullRequestRepository, pullRequestReviewRepository, pullRequestCommentRepository, pullRequestFileRepository, projectSettingsRepository } from './pullRequests';
import { sandboxFileRepository } from './sandboxFiles';
import { githubIntegrationRepository, githubRepositoryConfigRepository, githubWorkflowRunRepository, githubWorkflowJobRepository } from './github';
import { recordingSessionRepository, recordingStepRepository, agentRepository } from './recording';
import { copilotSessionRepository, copilotExplorationRepository, copilotStagedChangeRepository, copilotLearnedSelectorRepository } from './copilot';
import { userEnvironmentRepository, environmentVariableRepository, globalVariableRepository, aiSettingsRepository } from './environments';
import { auditLogRepository, remoteRunnerRepository, storedCredentialRepository, dataStorageConfigRepository } from './infrastructure';
import { objectRepositoryRepository, pageObjectRepository } from './pageObjects';
import { dataTableRepository, dataRowRepository } from './dataTables';
import { runParameterDefinitionRepository, runParameterSetRepository } from './runParameters';

export const mongoRepositories = {
  user: userRepository,
  application: applicationRepository,
  project: projectRepository,
  workflow: workflowRepository,
  testFlow: testFlowRepository,
  execution: executionRepository,
  executionLog: executionLogRepository,
  executionStep: executionStepRepository,
  agent: agentRepository,
  aiSettings: aiSettingsRepository,
  runConfiguration: runConfigurationRepository,
  schedule: scheduleRepository,
  scheduleRun: scheduleRunRepository,
  scheduleTestResult: scheduleTestResultRepository,
  auditLog: auditLogRepository,
  executionEnvironment: executionEnvironmentRepository,
  remoteRunner: remoteRunnerRepository,
  storedCredential: storedCredentialRepository,
  sandbox: sandboxRepository,
  pullRequest: pullRequestRepository,
  pullRequestReview: pullRequestReviewRepository,
  pullRequestComment: pullRequestCommentRepository,
  pullRequestFile: pullRequestFileRepository,
  projectSettings: projectSettingsRepository,
  sandboxFile: sandboxFileRepository,
  githubIntegration: githubIntegrationRepository,
  githubRepositoryConfig: githubRepositoryConfigRepository,
  githubWorkflowRun: githubWorkflowRunRepository,
  githubWorkflowJob: githubWorkflowJobRepository,
  userEnvironment: userEnvironmentRepository,
  environmentVariable: environmentVariableRepository,
  globalVariable: globalVariableRepository,
  notificationHistory: notificationHistoryRepository,
  recordingSession: recordingSessionRepository,
  recordingStep: recordingStepRepository,
  scheduledTest: scheduledTestRepository,
  scheduledTestRun: scheduledTestRunRepository,
  scheduleNotification: scheduleNotificationRepository,
  copilotSession: copilotSessionRepository,
  copilotExploration: copilotExplorationRepository,
  copilotStagedChange: copilotStagedChangeRepository,
  copilotLearnedSelector: copilotLearnedSelectorRepository,
  testDataSheet: testDataSheetRepository,
  testDataRow: testDataRowRepository,
  testDataSavedView: testDataSavedViewRepository,
  testDataRelationship: testDataRelationshipRepository,
  dataStorageConfig: dataStorageConfigRepository,
  dataTable: dataTableRepository,
  dataRow: dataRowRepository,
  objectRepository: objectRepositoryRepository,
  pageObject: pageObjectRepository,
  runParameterDefinition: runParameterDefinitionRepository,
  runParameterSet: runParameterSetRepository,
  passwordToken: passwordTokenRepository,
};

export default mongoRepositories;
