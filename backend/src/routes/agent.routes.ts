import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { AgentService } from '../services/agent.service';

const router = Router();
const agentService = new AgentService();

// All routes require authentication
router.use(authenticateToken);

// Create agent
router.post(
  '/',
  validate([
    body('name').isString().trim().notEmpty(),
  ]),
  async (req: AuthRequest, res, next) => {
    try {
      const { agentId, token } = await agentService.createAgent(req.userId!, req.body.name);
      res.status(201).json({ agentId, token });
    } catch (error) {
      next(error);
    }
  }
);

// List user's agents
router.get(
  '/',
  async (req: AuthRequest, res, next) => {
    try {
      const agents = await agentService.listAgents(req.userId!);
      res.json({ agents });
    } catch (error) {
      next(error);
    }
  }
);

// Get agent details
router.get(
  '/:id',
  async (req: AuthRequest, res, next) => {
    try {
      const agent = await agentService.getAgent(req.params.id);
      res.json({ agent });
    } catch (error) {
      next(error);
    }
  }
);

// Delete agent
router.delete(
  '/:id',
  async (req: AuthRequest, res, next) => {
    try {
      await agentService.deleteAgent(req.params.id, req.userId!);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;
