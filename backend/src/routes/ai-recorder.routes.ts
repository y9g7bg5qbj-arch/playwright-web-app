/**
 * AI Recorder Routes
 *
 * REST API endpoints for AI Test Recorder functionality.
 * Note: Most real-time operations are handled via WebSocket.
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import { aiRecorderService } from '../services/aiRecorder.service';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { prisma } from '../db/prisma';
import { logger } from '../utils/logger';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// All routes require authentication
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
      sessionId,
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
    const session = await prisma.aIRecorderSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.status !== 'pending') {
      return res.status(400).json({ error: `Session is already ${session.status}` });
    }

    // Get AI settings
    const settings = await prisma.aISettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      return res.status(400).json({ error: 'AI settings not configured. Please configure in Settings > AI.' });
    }

    // Determine which API key to use
    let apiKey: string;
    let modelName: string;

    switch (settings.provider) {
      case 'gemini':
        if (!settings.geminiApiKey) {
          return res.status(400).json({ error: 'Gemini API key not configured' });
        }
        apiKey = settings.geminiApiKey;
        modelName = settings.geminiModel || 'gemini-2.5-pro-preview-03-25';
        break;
      case 'openai':
        if (!settings.openaiApiKey) {
          return res.status(400).json({ error: 'OpenAI API key not configured' });
        }
        apiKey = settings.openaiApiKey;
        modelName = settings.openaiModel || 'gpt-4o';
        break;
      case 'anthropic':
        if (!settings.anthropicApiKey) {
          return res.status(400).json({ error: 'Anthropic API key not configured' });
        }
        apiKey = settings.anthropicApiKey;
        modelName = settings.anthropicModel || 'claude-sonnet-4-20250514';
        break;
      default:
        return res.status(400).json({ error: `Unknown AI provider: ${settings.provider}` });
    }

    // Start processing
    await aiRecorderService.startSession(sessionId, {
      provider: settings.provider,
      apiKey,
      modelName,
      useBrowserbase: settings.useBrowserbase,
      browserbaseApiKey: settings.browserbaseApiKey || undefined,
    });

    res.json({ success: true, sessionId });
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
    const session = await prisma.aIRecorderSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const progress = await aiRecorderService.getSessionProgress(sessionId);
    res.json(progress);
  } catch (error: any) {
    logger.error('Error getting session:', error);
    res.status(500).json({ error: error.message || 'Failed to get session' });
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

    const sessions = await prisma.aIRecorderSession.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { testCases: true },
        },
      },
    });

    res.json(sessions);
  } catch (error: any) {
    logger.error('Error listing sessions:', error);
    res.status(500).json({ error: error.message || 'Failed to list sessions' });
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
    const session = await prisma.aIRecorderSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
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
    const session = await prisma.aIRecorderSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Delete session (cascade deletes test cases and steps)
    await prisma.aIRecorderSession.delete({
      where: { id: sessionId },
    });

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

    const testCase = await prisma.aIRecorderTestCase.findUnique({
      where: { id: testCaseId },
      include: {
        session: true,
        steps: {
          orderBy: { stepNumber: 'asc' },
        },
      },
    });

    if (!testCase || testCase.session.userId !== userId) {
      return res.status(404).json({ error: 'Test case not found' });
    }

    res.json(testCase);
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
 * POST /api/ai-recorder/test-cases/:testCaseId/approve
 * Approve a test case and save as .vero file
 */
router.post('/test-cases/:testCaseId/approve', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.userId!;
    const { testCaseId } = req.params;
    const { targetPath } = req.body;

    if (!targetPath) {
      return res.status(400).json({ error: 'Target path is required' });
    }

    // Verify ownership
    const testCase = await prisma.aIRecorderTestCase.findUnique({
      where: { id: testCaseId },
      include: { session: true },
    });

    if (!testCase || testCase.session.userId !== userId) {
      return res.status(404).json({ error: 'Test case not found' });
    }

    const filePath = await aiRecorderService.approveTestCase(testCaseId, targetPath);

    res.json({ success: true, filePath });
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

    res.json({ success: true, stepId });
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

    const step = await prisma.aIRecorderStep.findUnique({
      where: { id: stepId },
    });

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
