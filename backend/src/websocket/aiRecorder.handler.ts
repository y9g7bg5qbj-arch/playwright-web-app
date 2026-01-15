/**
 * AI Recorder WebSocket Handler
 *
 * Handles real-time communication for AI test recorder:
 * - Session progress updates
 * - Step execution status
 * - Retry notifications
 * - Human review playback
 */

import { Server, Socket } from 'socket.io';
import { aiRecorderService } from '../services/aiRecorder.service';
import { prisma } from '../db/prisma';
import { logger } from '../utils/logger';

interface AuthSocket extends Socket {
  userId?: string;
}

/**
 * Get AI settings for a user
 */
async function getAISettings(userId: string) {
  const settings = await prisma.aISettings.findUnique({
    where: { userId },
  });

  if (!settings) {
    throw new Error('AI settings not configured. Please configure in Settings > AI.');
  }

  // Determine which API key to use based on provider
  let apiKey: string;
  let modelName: string;

  switch (settings.provider) {
    case 'gemini':
      if (!settings.geminiApiKey) throw new Error('Gemini API key not configured');
      apiKey = settings.geminiApiKey;
      modelName = settings.geminiModel || 'gemini-2.5-pro-preview-03-25';
      break;
    case 'openai':
      if (!settings.openaiApiKey) throw new Error('OpenAI API key not configured');
      apiKey = settings.openaiApiKey;
      modelName = settings.openaiModel || 'gpt-4o';
      break;
    case 'anthropic':
      if (!settings.anthropicApiKey) throw new Error('Anthropic API key not configured');
      apiKey = settings.anthropicApiKey;
      modelName = settings.anthropicModel || 'claude-sonnet-4-20250514';
      break;
    default:
      throw new Error(`Unknown AI provider: ${settings.provider}`);
  }

  return {
    provider: settings.provider,
    apiKey,
    modelName,
    useBrowserbase: settings.useBrowserbase,
    browserbaseApiKey: settings.browserbaseApiKey || undefined,
  };
}

/**
 * Set up AI Recorder event forwarding from service to WebSocket
 */
export function setupAIRecorderEventForwarding(io: Server) {
  // Forward session events
  aiRecorderService.on('session:created', (data) => {
    io.to(`aiRecorder:${data.sessionId}`).emit('aiRecorder:session:created', data);
  });

  aiRecorderService.on('session:started', (data) => {
    io.to(`aiRecorder:${data.sessionId}`).emit('aiRecorder:session:started', data);
  });

  aiRecorderService.on('session:completed', (data) => {
    io.to(`aiRecorder:${data.sessionId}`).emit('aiRecorder:session:completed', data);
  });

  aiRecorderService.on('session:failed', (data) => {
    io.to(`aiRecorder:${data.sessionId}`).emit('aiRecorder:session:failed', data);
  });

  aiRecorderService.on('session:cancelled', (data) => {
    io.to(`aiRecorder:${data.sessionId}`).emit('aiRecorder:session:cancelled', data);
  });

  // Forward test case events
  aiRecorderService.on('testCase:started', (data) => {
    io.to(`aiRecorder:${data.sessionId}`).emit('aiRecorder:testCase:started', data);
  });

  aiRecorderService.on('testCase:completed', (data) => {
    io.to(`aiRecorder:${data.sessionId}`).emit('aiRecorder:testCase:completed', data);
  });

  aiRecorderService.on('testCase:failed', (data) => {
    io.to(`aiRecorder:${data.sessionId}`).emit('aiRecorder:testCase:failed', data);
  });

  // Forward step events
  aiRecorderService.on('step:started', (data) => {
    io.to(`aiRecorder:${data.sessionId}`).emit('aiRecorder:step:started', data);
  });

  aiRecorderService.on('step:retry', (data) => {
    io.to(`aiRecorder:${data.sessionId}`).emit('aiRecorder:step:retry', data);
  });

  aiRecorderService.on('step:completed', (data) => {
    io.to(`aiRecorder:${data.sessionId}`).emit('aiRecorder:step:completed', data);
  });

  aiRecorderService.on('step:replayed', (data) => {
    io.to(`aiRecorder:${data.sessionId}`).emit('aiRecorder:step:replayed', data);
  });

  logger.info('AI Recorder WebSocket event forwarding configured');
}

/**
 * Set up AI Recorder WebSocket handlers for a connected socket
 */
export function setupAIRecorderHandlers(socket: AuthSocket, io: Server) {
  const userId = socket.userId;

  // ======== SESSION MANAGEMENT ========

  // Subscribe to a session's updates
  socket.on('aiRecorder:subscribe', async (data: { sessionId: string }) => {
    logger.info(`AI Recorder: Client ${socket.id} subscribing to session ${data.sessionId}`);
    socket.join(`aiRecorder:${data.sessionId}`);
    socket.emit('aiRecorder:subscribed', { sessionId: data.sessionId });

    // Send current status
    const progress = await aiRecorderService.getSessionProgress(data.sessionId);
    if (progress) {
      socket.emit('aiRecorder:session:progress', progress);
    }
  });

  // Unsubscribe from a session
  socket.on('aiRecorder:unsubscribe', (data: { sessionId: string }) => {
    logger.info(`AI Recorder: Client ${socket.id} unsubscribing from session ${data.sessionId}`);
    socket.leave(`aiRecorder:${data.sessionId}`);
  });

  // Create and start a new session
  socket.on('aiRecorder:create', async (data: {
    testCases: Array<{ name: string; steps: string[]; targetUrl?: string }>;
    environment?: string;
    baseUrl?: string;
    headless?: boolean;
    applicationId?: string;
  }) => {
    if (!userId) {
      socket.emit('aiRecorder:error', { error: 'Not authenticated' });
      return;
    }

    try {
      logger.info('AI Recorder: Creating new session', { userId, testCaseCount: data.testCases.length });

      // Create session
      const sessionId = await aiRecorderService.createSession({
        userId,
        applicationId: data.applicationId,
        testCases: data.testCases,
        environment: data.environment,
        baseUrl: data.baseUrl,
        headless: data.headless,
      });

      // Auto-subscribe to the session
      socket.join(`aiRecorder:${sessionId}`);

      socket.emit('aiRecorder:created', { sessionId });
    } catch (error: any) {
      logger.error('AI Recorder: Failed to create session:', error);
      socket.emit('aiRecorder:error', { error: error.message });
    }
  });

  // Start processing a session
  socket.on('aiRecorder:start', async (data: { sessionId: string }) => {
    if (!userId) {
      socket.emit('aiRecorder:error', { error: 'Not authenticated' });
      return;
    }

    try {
      logger.info('AI Recorder: Starting session', { sessionId: data.sessionId });

      // Get AI settings for this user
      const aiSettings = await getAISettings(userId);

      // Start processing
      await aiRecorderService.startSession(data.sessionId, aiSettings);

      socket.emit('aiRecorder:started', { sessionId: data.sessionId });
    } catch (error: any) {
      logger.error('AI Recorder: Failed to start session:', error);
      socket.emit('aiRecorder:error', { error: error.message, sessionId: data.sessionId });
    }
  });

  // Cancel a running session
  socket.on('aiRecorder:cancel', async (data: { sessionId: string }) => {
    try {
      logger.info('AI Recorder: Cancelling session', { sessionId: data.sessionId });
      await aiRecorderService.cancelSession(data.sessionId);
      socket.emit('aiRecorder:cancelled', { sessionId: data.sessionId });
    } catch (error: any) {
      logger.error('AI Recorder: Failed to cancel session:', error);
      socket.emit('aiRecorder:error', { error: error.message, sessionId: data.sessionId });
    }
  });

  // Get session progress
  socket.on('aiRecorder:getProgress', async (data: { sessionId: string }) => {
    try {
      const progress = await aiRecorderService.getSessionProgress(data.sessionId);
      socket.emit('aiRecorder:session:progress', progress);
    } catch (error: any) {
      socket.emit('aiRecorder:error', { error: error.message, sessionId: data.sessionId });
    }
  });

  // ======== HUMAN REVIEW ========

  // Replay a single step
  socket.on('aiRecorder:replayStep', async (data: {
    sessionId: string;
    testCaseId: string;
    stepId: string;
  }) => {
    if (!userId) {
      socket.emit('aiRecorder:error', { error: 'Not authenticated' });
      return;
    }

    try {
      logger.info('AI Recorder: Replaying step', data);

      // Get AI settings
      const aiSettings = await getAISettings(userId);

      // Replay the step
      const result = await aiRecorderService.replayStep(
        data.sessionId,
        data.testCaseId,
        data.stepId,
        aiSettings
      );

      socket.emit('aiRecorder:step:replayed', {
        sessionId: data.sessionId,
        testCaseId: data.testCaseId,
        stepId: data.stepId,
        success: result.success,
        screenshot: result.screenshot,
        error: result.error,
      });
    } catch (error: any) {
      logger.error('AI Recorder: Failed to replay step:', error);
      socket.emit('aiRecorder:error', { error: error.message, ...data });
    }
  });

  // Update step code
  socket.on('aiRecorder:updateStep', async (data: {
    stepId: string;
    veroCode: string;
  }) => {
    try {
      logger.info('AI Recorder: Updating step code', { stepId: data.stepId });
      await aiRecorderService.updateStepCode(data.stepId, data.veroCode);
      socket.emit('aiRecorder:step:updated', { stepId: data.stepId });
    } catch (error: any) {
      socket.emit('aiRecorder:error', { error: error.message });
    }
  });

  // Add a new step
  socket.on('aiRecorder:addStep', async (data: {
    testCaseId: string;
    afterStepNumber: number;
    description: string;
  }) => {
    try {
      logger.info('AI Recorder: Adding step', data);
      const stepId = await aiRecorderService.addStep(
        data.testCaseId,
        data.afterStepNumber,
        data.description
      );
      socket.emit('aiRecorder:step:added', { testCaseId: data.testCaseId, stepId });
    } catch (error: any) {
      socket.emit('aiRecorder:error', { error: error.message });
    }
  });

  // Delete a step
  socket.on('aiRecorder:deleteStep', async (data: { stepId: string }) => {
    try {
      logger.info('AI Recorder: Deleting step', { stepId: data.stepId });
      await aiRecorderService.deleteStep(data.stepId);
      socket.emit('aiRecorder:step:deleted', { stepId: data.stepId });
    } catch (error: any) {
      socket.emit('aiRecorder:error', { error: error.message });
    }
  });

  // ======== APPROVAL ========

  // Approve a test case and save as .vero file
  socket.on('aiRecorder:approve', async (data: {
    testCaseId: string;
    targetPath: string;
  }) => {
    try {
      logger.info('AI Recorder: Approving test case', data);
      const filePath = await aiRecorderService.approveTestCase(data.testCaseId, data.targetPath);
      socket.emit('aiRecorder:approved', { testCaseId: data.testCaseId, filePath });
    } catch (error: any) {
      socket.emit('aiRecorder:error', { error: error.message });
    }
  });

  // Get Vero code for a test case
  socket.on('aiRecorder:getVeroCode', async (data: { testCaseId: string }) => {
    try {
      const veroCode = await aiRecorderService.getTestCaseVeroCode(data.testCaseId);
      socket.emit('aiRecorder:veroCode', { testCaseId: data.testCaseId, veroCode });
    } catch (error: any) {
      socket.emit('aiRecorder:error', { error: error.message });
    }
  });
}
