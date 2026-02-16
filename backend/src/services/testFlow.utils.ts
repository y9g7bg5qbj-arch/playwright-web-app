/**
 * Shared utility for getting or creating test flows for Vero files.
 * Used by both manual execution (vero.routes.ts) and scheduled execution (scheduleRunWorker.ts).
 */

import { workflowRepository, testFlowRepository } from '../db/repositories/mongo';

/**
 * Get or create a test flow for a Vero file, organized under a user-scoped workflow.
 *
 * @param userId - The user who owns the workflow/test flow
 * @param filePath - The file path (used as identifier, not read from disk)
 * @param flowName - Display name for the test flow
 * @param content - Vero code content (stored on the test flow for reference)
 * @param workflowName - Name of the parent workflow (defaults to 'Vero Tests')
 * @returns The test flow record
 */
export async function getOrCreateVeroTestFlow(
  userId: string,
  _filePath: string,
  flowName: string,
  content: string,
  workflowName: string = 'Vero Tests',
  applicationId?: string
) {
  const normalizedApplicationId =
    typeof applicationId === 'string' && applicationId.trim().length > 0
      ? applicationId.trim()
      : undefined;

  let workflow = null;
  if (normalizedApplicationId) {
    const applicationWorkflows = await workflowRepository.findByApplicationId(normalizedApplicationId);
    workflow =
      applicationWorkflows.find(
        (candidate) => candidate.userId === userId && candidate.name === workflowName
      ) || null;

    if (!workflow) {
      const legacyWorkflow = await workflowRepository.findByUserIdAndName(userId, workflowName);
      if (legacyWorkflow?.applicationId === normalizedApplicationId) {
        workflow = legacyWorkflow;
      } else if (legacyWorkflow && !legacyWorkflow.applicationId) {
        workflow = await workflowRepository.update(legacyWorkflow.id, {
          applicationId: normalizedApplicationId,
        });
      }
    }
  } else {
    workflow = await workflowRepository.findByUserIdAndName(userId, workflowName);
  }

  if (!workflow) {
    workflow = await workflowRepository.create({
      name: workflowName,
      userId,
      ...(normalizedApplicationId ? { applicationId: normalizedApplicationId } : {}),
    });
  }

  let testFlow = await testFlowRepository.findByWorkflowIdAndName(workflow.id, flowName);

  if (!testFlow) {
    testFlow = await testFlowRepository.create({
      workflowId: workflow.id,
      name: flowName,
      code: content,
      language: 'vero',
      tags: [],
    });
  } else if (content) {
    // Update the code content if it changed
    await testFlowRepository.update(testFlow.id, { code: content });
  }

  return testFlow;
}
