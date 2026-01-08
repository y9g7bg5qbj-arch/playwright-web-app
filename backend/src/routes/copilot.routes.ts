/**
 * Copilot API Routes
 *
 * REST endpoints for the Vero Copilot Agent
 * Real-time updates are handled via WebSocket (see websocket/index.ts)
 */

import { Router, Response } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../middleware/validate';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { CopilotAgentService } from '../services/copilot/CopilotAgentService';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// All routes require authentication
router.use(authenticateToken);

// ============================================
// Session Management
// ============================================

// Create a new copilot session
router.post(
  '/sessions',
  validate([
    body('projectId').isString().trim().notEmpty(),
  ]),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const session = await CopilotAgentService.createSession(
        req.userId!,
        req.body.projectId
      );
      res.status(201).json({ session });
    } catch (error) {
      next(error);
    }
  }
);

// List user's copilot sessions
router.get(
  '/sessions',
  async (req: AuthRequest, res: Response, next) => {
    try {
      const projectId = req.query.projectId as string | undefined;
      const sessions = await CopilotAgentService.listSessions(req.userId!, projectId);
      res.json({ sessions });
    } catch (error) {
      next(error);
    }
  }
);

// Get a specific session
router.get(
  '/sessions/:id',
  async (req: AuthRequest, res: Response, next) => {
    try {
      const session = await CopilotAgentService.getSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }
      res.json({ session });
    } catch (error) {
      next(error);
    }
  }
);

// Delete a session
router.delete(
  '/sessions/:id',
  async (req: AuthRequest, res: Response, next) => {
    try {
      await CopilotAgentService.deleteSession(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// Conversation (SSE Streaming)
// ============================================

// Send a message with SSE streaming response
router.post(
  '/sessions/:id/message',
  validate([
    body('content').isString().trim().notEmpty(),
  ]),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { id } = req.params;
      const { content } = req.body;

      // Set up SSE
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      const agent = new CopilotAgentService(id);

      // Stream events
      agent.on('stateChange', (event) => {
        res.write(`event: state\ndata: ${JSON.stringify(event)}\n\n`);
      });

      agent.on('thinking', (event) => {
        res.write(`event: thinking\ndata: ${JSON.stringify(event)}\n\n`);
      });

      agent.on('message', (message) => {
        res.write(`event: message\ndata: ${JSON.stringify(message)}\n\n`);
      });

      agent.on('exploration', (exploration) => {
        res.write(`event: exploration\ndata: ${JSON.stringify(exploration)}\n\n`);
      });

      agent.on('stagedChanges', (event) => {
        res.write(`event: staged\ndata: ${JSON.stringify(event)}\n\n`);
      });

      // Process message
      await agent.processUserMessage(content);

      // Send done event
      res.write('event: done\ndata: {}\n\n');
      res.end();
    } catch (error: any) {
      res.write(`event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  }
);

// ============================================
// Staged Changes
// ============================================

// Get all staged changes for a session
router.get(
  '/sessions/:id/changes',
  async (req: AuthRequest, res: Response, next) => {
    try {
      const changes = await prisma.copilotStagedChange.findMany({
        where: { sessionId: req.params.id },
        orderBy: { order: 'asc' },
      });
      res.json({ changes });
    } catch (error) {
      next(error);
    }
  }
);

// Get a specific change
router.get(
  '/sessions/:id/changes/:changeId',
  async (req: AuthRequest, res: Response, next) => {
    try {
      const change = await prisma.copilotStagedChange.findUnique({
        where: { id: req.params.changeId },
      });
      if (!change) {
        return res.status(404).json({ error: 'Change not found' });
      }
      res.json({ change });
    } catch (error) {
      next(error);
    }
  }
);

// Approve a change
router.post(
  '/sessions/:id/changes/:changeId/approve',
  async (req: AuthRequest, res: Response, next) => {
    try {
      const agent = new CopilotAgentService(req.params.id);
      await agent.load();
      await agent.approveChange(req.params.changeId);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

// Reject a change
router.post(
  '/sessions/:id/changes/:changeId/reject',
  validate([
    body('feedback').optional().isString(),
  ]),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const agent = new CopilotAgentService(req.params.id);
      await agent.load();
      await agent.rejectChange(req.params.changeId, req.body.feedback);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

// Modify a change (update the content)
router.put(
  '/sessions/:id/changes/:changeId',
  validate([
    body('newContent').isString(),
  ]),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const updated = await prisma.copilotStagedChange.update({
        where: { id: req.params.changeId },
        data: {
          newContent: req.body.newContent,
          status: 'modified',
        },
      });
      res.json({ change: updated });
    } catch (error) {
      next(error);
    }
  }
);

// Approve all pending changes and merge
router.post(
  '/sessions/:id/merge',
  async (req: AuthRequest, res: Response, next) => {
    try {
      const agent = new CopilotAgentService(req.params.id);
      await agent.load();
      await agent.approveAllChanges();
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// Exploration
// ============================================

// Get explorations for a session
router.get(
  '/sessions/:id/explorations',
  async (req: AuthRequest, res: Response, next) => {
    try {
      const explorations = await prisma.copilotExploration.findMany({
        where: { sessionId: req.params.id },
        orderBy: { createdAt: 'desc' },
      });
      res.json({ explorations });
    } catch (error) {
      next(error);
    }
  }
);

// Get a specific exploration
router.get(
  '/sessions/:id/explorations/:explorationId',
  async (req: AuthRequest, res: Response, next) => {
    try {
      const exploration = await prisma.copilotExploration.findUnique({
        where: { id: req.params.explorationId },
      });
      if (!exploration) {
        return res.status(404).json({ error: 'Exploration not found' });
      }
      res.json({ exploration });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// Learned Selectors
// ============================================

// Get learned selectors for a project
router.get(
  '/selectors',
  async (req: AuthRequest, res: Response, next) => {
    try {
      const projectId = req.query.projectId as string;
      if (!projectId) {
        return res.status(400).json({ error: 'projectId is required' });
      }

      const selectors = await prisma.copilotLearnedSelector.findMany({
        where: { projectId },
        orderBy: { usageCount: 'desc' },
        take: 100,
      });
      res.json({ selectors });
    } catch (error) {
      next(error);
    }
  }
);

// Search selectors by description
router.get(
  '/selectors/search',
  async (req: AuthRequest, res: Response, next) => {
    try {
      const projectId = req.query.projectId as string;
      const query = req.query.q as string;

      if (!projectId || !query) {
        return res.status(400).json({ error: 'projectId and q are required' });
      }

      const selectors = await prisma.copilotLearnedSelector.findMany({
        where: {
          projectId,
          elementDescription: {
            contains: query,
          },
        },
        orderBy: { usageCount: 'desc' },
        take: 20,
      });
      res.json({ selectors });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// Session Actions
// ============================================

// Reset a session (clear conversation and staged changes)
router.post(
  '/sessions/:id/reset',
  async (req: AuthRequest, res: Response, next) => {
    try {
      const agent = new CopilotAgentService(req.params.id);
      await agent.load();
      await agent.reset();
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

// Get conversation history
router.get(
  '/sessions/:id/conversation',
  async (req: AuthRequest, res: Response, next) => {
    try {
      const agent = new CopilotAgentService(req.params.id);
      await agent.load();
      const history = agent.getConversationHistory();
      res.json({ messages: history });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
