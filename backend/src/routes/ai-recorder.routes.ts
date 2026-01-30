/**
 * AI Recorder Routes
 *
 * REST API endpoints for AI Test Recorder functionality.
 * Note: Most real-time operations are handled via WebSocket.
 *
 * TODO: Integrate ClaudeAgentService for browser automation
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import { aiRecorderService } from '../services/aiRecorder.service';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import {
  aiRecorderSessionRepository,
  aiRecorderTestCaseRepository,
  aiRecorderStepRepository,
  aiSettingsRepository
} from '../db/repositories/mongo';
import { logger } from '../utils/logger';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * GET /api/ai-recorder/health
 * Check if AI Recorder is available
 */
router.get('/health', async (_req: Request, res: Response) => {
  // TODO: Add ClaudeAgentService availability check when integrated
  const isAvailable = true;

  res.json({
    available: isAvailable,
    nodeVersion: process.version,
    message: isAvailable
      ? 'AI Recorder is available (browser automation being upgraded)'
      : 'AI Recorder is unavailable',
  });
});

// All routes below require authentication
router.use(authenticateToken);

/**
 * POST /api/ai-recorder/import-excel
 * Import test cases from Excel file
 */
router.post('/import-excel', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const testCases = await aiRecorderService.parseExcelTestCases(req.file.buffer);

    res.json({
      success: true,
      testCases,
      count: testCases.length,
    });
  } catch (error: any) {
    logger.error('Error importing Excel:', error);
    res.status(500).json({ error: error.message || 'Failed to import Excel file' });
  }
});

/**
 * POST /api/ai-recorder/sessions
 * Create a new AI Recorder session
 */
router.post('/sessions', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.userId!;

    const { testCases, environment, baseUrl, headless, applicationId } = req.body;

    if (!testCases || !Array.isArray(testCases) || testCases.length === 0) {
      return res.status(400).json({ error: 'At least one test case is required' });
    }

    const sessionId = await aiRecorderService.createSession({
      userId,
      applicationId,
      testCases,
      environment,
      baseUrl,
      headless,
    });

    res.json({
      success: true,
      data: { sessionId },
    });
  } catch (error: any) {
    logger.error('Error creating session:', error);
    res.status(500).json({ error: error.message || 'Failed to create session' });
  }
});

/**
 * POST /api/ai-recorder/sessions/:sessionId/start
 * Start processing a session
 */
router.post('/sessions/:sessionId/start', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.userId!;
    const { sessionId } = req.params;

    // Verify session belongs to user
    const session = await aiRecorderSessionRepository.findById(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.userId !== userId) {
      return res.status(404).json({ error: 'Session not found' }); // Return 404 for security
    }

    if (session.status !== 'pending') {
      return res.status(400).json({ error: `Session is already ${session.status}` });
    }

    // Get AI settings
    const settings = await aiSettingsRepository.findByUserId(userId);

    if (!settings) {
      return res.status(400).json({ error: 'AI settings not configured. Please configure in Settings > AI.' });
    }

    // Provider configuration: API key field, model field, default model, and prefix
    const providerConfig: Record<string, { keyField: string; modelField: string; defaultModel: string; prefix: string }> = {
      gemini: { keyField: 'geminiApiKey', modelField: 'geminiModel', defaultModel: 'gemini-2.0-flash', prefix: 'google/' },
      openai: { keyField: 'openaiApiKey', modelField: 'openaiModel', defaultModel: 'gpt-4o', prefix: 'openai/' },
      anthropic: { keyField: 'anthropicApiKey', modelField: 'anthropicModel', defaultModel: 'claude-sonnet-4-20250514', prefix: 'anthropic/' },
    };

    const config = providerConfig[settings.provider];
    if (!config) {
      return res.status(400).json({ error: `Unknown AI provider: ${settings.provider}` });
    }

    const apiKey = (settings as any)[config.keyField] as string | undefined;
    if (!apiKey) {
      return res.status(400).json({ error: `${settings.provider} API key not configured` });
    }

    const rawModel = ((settings as any)[config.modelField] as string) || config.defaultModel;
    const modelName = rawModel.startsWith(config.prefix) ? rawModel : `${config.prefix}${rawModel}`;

    // TODO: ClaudeAgentService will be integrated here for browser automation
    // Start processing
    await aiRecorderService.startSession(sessionId, {
      provider: settings.provider,
      apiKey,
      modelName,
      useBrowserbase: settings.useBrowserbase,
      browserbaseApiKey: settings.browserbaseApiKey || undefined,
    });

    res.json({ success: true, data: { sessionId } });
  } catch (error: any) {
    logger.error('Error starting session:', error);
    res.status(500).json({ error: error.message || 'Failed to start session' });
  }
});

/**
 * GET /api/ai-recorder/sessions/:sessionId
 * Get session progress
 */
router.get('/sessions/:sessionId', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.userId!;
    const { sessionId } = req.params;

    // Verify session belongs to user
    const session = await aiRecorderSessionRepository.findById(sessionId);

    if (!session || session.userId !== userId) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    const progress = await aiRecorderService.getSessionProgress(sessionId);
    res.json({ success: true, data: progress });
  } catch (error: any) {
    logger.error('Error getting session:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to get session' });
  }
});

/**
 * GET /api/ai-recorder/sessions
 * List user's sessions
 */
router.get('/sessions', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.userId!;

    const sessions = await aiRecorderSessionRepository.findByUserId(userId);

    // Aggregate data to match expected response format
    const enrichedSessions = await Promise.all(sessions.map(async (session) => {
      const testCases = await aiRecorderTestCaseRepository.findBySessionId(session.id);

      return {
        ...session,
        _count: {
          testCases: testCases.length
        },
        testCases: testCases.length > 0 ? [{ name: testCases[0].name }] : []
      };
    }));

    res.json({ success: true, data: enrichedSessions });
  } catch (error: any) {
    logger.error('Error listing sessions:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to list sessions' });
  }
});

/**
 * POST /api/ai-recorder/sessions/:sessionId/cancel
 * Cancel a running session
 */
router.post('/sessions/:sessionId/cancel', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.userId!;
    const { sessionId } = req.params;

    // Verify session belongs to user
    const session = await aiRecorderSessionRepository.findById(sessionId);

    if (!session || session.userId !== userId) {
      return res.status(404).json({ error: 'Session not found' });
    }

    await aiRecorderService.cancelSession(sessionId);

    res.json({ success: true });
  } catch (error: any) {
    logger.error('Error cancelling session:', error);
    res.status(500).json({ error: error.message || 'Failed to cancel session' });
  }
});

/**
 * DELETE /api/ai-recorder/sessions/:sessionId
 * Delete a session
 */
router.delete('/sessions/:sessionId', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.userId!;
    const { sessionId } = req.params;

    // Verify session belongs to user
    const session = await aiRecorderSessionRepository.findById(sessionId);

    if (!session || session.userId !== userId) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Cascade delete: remove steps, test cases, then session
    const testCases = await aiRecorderTestCaseRepository.findBySessionId(sessionId);
    for (const tc of testCases) {
      await aiRecorderStepRepository.deleteByTestCaseId(tc.id);
    }
    await aiRecorderTestCaseRepository.deleteBySessionId(sessionId);
    await aiRecorderSessionRepository.delete(sessionId);

    res.json({ success: true });
  } catch (error: any) {
    logger.error('Error deleting session:', error);
    res.status(500).json({ error: error.message || 'Failed to delete session' });
  }
});

/**
 * GET /api/ai-recorder/test-cases/:testCaseId
 * Get test case details with steps
 */
router.get('/test-cases/:testCaseId', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.userId!;
    const { testCaseId } = req.params;

    const testCase = await aiRecorderTestCaseRepository.findById(testCaseId);

    if (!testCase) {
      return res.status(404).json({ error: 'Test case not found' });
    }

    // Verify ownership via session
    const session = await aiRecorderSessionRepository.findById(testCase.sessionId);
    if (!session || session.userId !== userId) {
      return res.status(404).json({ error: 'Test case not found' });
    }

    const steps = await aiRecorderStepRepository.findByTestCaseId(testCaseId);

    // Combine for response
    const response = {
      ...testCase,
      session,
      steps
    };

    res.json(response);
  } catch (error: any) {
    logger.error('Error getting test case:', error);
    res.status(500).json({ error: error.message || 'Failed to get test case' });
  }
});

/**
 * GET /api/ai-recorder/test-cases/:testCaseId/vero
 * Get generated Vero code for a test case
 */
router.get('/test-cases/:testCaseId/vero', async (req: Request, res: Response) => {
  try {
    const { testCaseId } = req.params;

    const veroCode = await aiRecorderService.getTestCaseVeroCode(testCaseId);

    if (!veroCode) {
      return res.status(404).json({ error: 'Test case not found or no code generated' });
    }

    res.json({ veroCode });
  } catch (error: any) {
    logger.error('Error getting Vero code:', error);
    res.status(500).json({ error: error.message || 'Failed to get Vero code' });
  }
});

/**
 * POST /api/ai-recorder/test-cases/:testCaseId/preview
 * Preview Vero code before saving (shows diff if file exists)
 */
router.post('/test-cases/:testCaseId/preview', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.userId!;
    const { testCaseId } = req.params;
    const { targetPath } = req.body;

    if (!targetPath) {
      return res.status(400).json({ error: 'Target path is required' });
    }

    // Verify ownership
    const testCase = await aiRecorderTestCaseRepository.findById(testCaseId);
    if (!testCase) {
      return res.status(404).json({ error: 'Test case not found' });
    }

    const session = await aiRecorderSessionRepository.findById(testCase.sessionId);
    if (!session || session.userId !== userId) {
      return res.status(404).json({ error: 'Test case not found' });
    }

    const preview = await aiRecorderService.previewTestCaseVero(testCaseId, targetPath);

    res.json(preview);
  } catch (error: any) {
    logger.error('Error previewing test case:', error);
    res.status(500).json({ error: error.message || 'Failed to preview test case' });
  }
});

/**
 * POST /api/ai-recorder/test-cases/:testCaseId/approve
 * Approve a test case and save as .vero file
 */
router.post('/test-cases/:testCaseId/approve', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.userId!;
    const { testCaseId } = req.params;
    const { targetPath, merge, overwrite } = req.body;

    if (!targetPath) {
      return res.status(400).json({ error: 'Target path is required' });
    }

    // Verify ownership
    const testCase = await aiRecorderTestCaseRepository.findById(testCaseId);
    if (!testCase) {
      return res.status(404).json({ error: 'Test case not found' });
    }

    const session = await aiRecorderSessionRepository.findById(testCase.sessionId);
    if (!session || session.userId !== userId) {
      return res.status(404).json({ error: 'Test case not found' });
    }

    const filePath = await aiRecorderService.approveTestCase(testCaseId, targetPath, {
      merge,
      overwrite,
    });

    res.json({ success: true, data: { filePath } });
  } catch (error: any) {
    logger.error('Error approving test case:', error);
    res.status(500).json({ error: error.message || 'Failed to approve test case' });
  }
});

/**
 * PUT /api/ai-recorder/steps/:stepId
 * Update a step's Vero code
 */
router.put('/steps/:stepId', async (req: Request, res: Response) => {
  try {
    const { stepId } = req.params;
    const { veroCode } = req.body;

    if (!veroCode) {
      return res.status(400).json({ error: 'Vero code is required' });
    }

    await aiRecorderService.updateStepCode(stepId, veroCode);

    res.json({ success: true });
  } catch (error: any) {
    logger.error('Error updating step:', error);
    res.status(500).json({ error: error.message || 'Failed to update step' });
  }
});

/**
 * POST /api/ai-recorder/test-cases/:testCaseId/steps
 * Add a new step to a test case
 */
router.post('/test-cases/:testCaseId/steps', async (req: Request, res: Response) => {
  try {
    const { testCaseId } = req.params;
    const { afterStepNumber, description } = req.body;

    if (!description) {
      return res.status(400).json({ error: 'Description is required' });
    }

    const stepId = await aiRecorderService.addStep(
      testCaseId,
      afterStepNumber ?? 0,
      description
    );

    res.json({ success: true, data: { stepId } });
  } catch (error: any) {
    logger.error('Error adding step:', error);
    res.status(500).json({ error: error.message || 'Failed to add step' });
  }
});

/**
 * DELETE /api/ai-recorder/steps/:stepId
 * Delete a step
 */
router.delete('/steps/:stepId', async (req: Request, res: Response) => {
  try {
    const { stepId } = req.params;

    await aiRecorderService.deleteStep(stepId);

    res.json({ success: true });
  } catch (error: any) {
    logger.error('Error deleting step:', error);
    res.status(500).json({ error: error.message || 'Failed to delete step' });
  }
});

/**
 * GET /api/ai-recorder/steps/:stepId/screenshot
 * Get step screenshot
 */
router.get('/steps/:stepId/screenshot', async (req: Request, res: Response) => {
  try {
    const { stepId } = req.params;

    const step = await aiRecorderStepRepository.findById(stepId);

    if (!step || !step.screenshotPath) {
      return res.status(404).json({ error: 'Screenshot not found' });
    }

    res.sendFile(step.screenshotPath);
  } catch (error: any) {
    logger.error('Error getting screenshot:', error);
    res.status(500).json({ error: error.message || 'Failed to get screenshot' });
  }
});

export default router;
