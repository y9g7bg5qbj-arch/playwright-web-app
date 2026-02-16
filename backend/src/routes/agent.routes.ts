import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../middleware/asyncHandler';
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
  asyncHandler(async (req: AuthRequest, res) => {
    const { agentId, token } = await agentService.createAgent(req.userId!, req.body.name);
    res.status(201).json({ agentId, token });
  })
);

// List user's agents
router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res) => {
    const agents = await agentService.listAgents(req.userId!);
    res.json({ agents });
  })
);

// Get agent details
router.get(
  '/:id',
  asyncHandler(async (req: AuthRequest, res) => {
    const agent = await agentService.getAgent(req.params.id);
    res.json({ agent });
  })
);

// Delete agent
router.delete(
  '/:id',
  asyncHandler(async (req: AuthRequest, res) => {
    await agentService.deleteAgent(req.params.id, req.userId!);
    res.status(204).send();
  })
);

export default router;
