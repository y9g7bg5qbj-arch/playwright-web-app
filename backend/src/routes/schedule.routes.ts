import { Router } from 'express';
import { scheduleService } from '../services/schedule.service';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import { validate } from '../middleware/validate';
import { SCHEDULE_PRESETS } from '@playwright-web-app/shared';
import { createScheduleValidation, updateScheduleValidation, scheduleIdValidation, runIdValidation, validateCronValidation, runsQueryValidation, webhookTokenValidation, triggerScheduleRunValidation } from '../validators/schedule.validators';

const router = Router();

// =============================================
// Webhook endpoint - no authentication required (must be before auth middleware)
// =============================================

/**
 * POST /api/schedules/webhook/:token
 * Trigger a run via webhook (used by CI/CD pipelines)
 */
router.post('/webhook/:token', validate(webhookTokenValidation), asyncHandler(async (req, res) => {
    const { token } = req.params;

    const run = await scheduleService.triggerWebhook(token);
    res.status(202).json({
        success: true,
        data: {
            runId: run.id,
            status: run.status,
        },
        message: 'Run triggered via webhook',
    });
}));

// =============================================
// Authenticated routes
// =============================================

router.use(authenticateToken);

/**
 * GET /api/schedules
 * List all schedules for the authenticated user
 */
router.get('/', asyncHandler(async (req: AuthRequest, res) => {
    const userId = req.userId!;
    const workflowId = typeof req.query.workflowId === 'string' && req.query.workflowId.trim() !== ''
        ? req.query.workflowId
        : undefined;
    const schedules = await scheduleService.findAll(userId, workflowId);
    res.json({ success: true, data: schedules });
}));

/**
 * GET /api/schedules/presets
 * Get available schedule presets for the UI
 */
router.get('/presets', async (_req: AuthRequest, res) => {
    res.json({ success: true, data: SCHEDULE_PRESETS });
});

/**
 * POST /api/schedules
 * Create a new schedule
 */
router.post('/', validate(createScheduleValidation), asyncHandler(async (req: AuthRequest, res) => {
    const userId = req.userId!;
    const data = req.body;

    const schedule = await scheduleService.create(userId, data);
    res.status(201).json({ success: true, data: schedule });
}));

/**
 * POST /api/schedules/validate-cron
 * Validate a cron expression and get human-readable description
 */
router.post('/validate-cron', validate(validateCronValidation), async (req: AuthRequest, res) => {
    const { expression, count = 5, timezone = 'UTC' } = req.body;

    const validation = scheduleService.validateCron(expression);

    if (validation.valid) {
        const nextRuns = scheduleService.previewNextRuns(expression, timezone, count);
        res.json({
            success: true,
            data: {
                valid: true,
                description: validation.description,
                nextRuns,
            },
        });
    } else {
        res.json({
            success: true,
            data: {
                valid: false,
                error: validation.error,
            },
        });
    }
});

/**
 * GET /api/schedules/runs/:runId
 * Get details of a specific run
 */
router.get('/runs/:runId', validate(runIdValidation), asyncHandler(async (req: AuthRequest, res) => {
    const userId = req.userId!;
    const { runId } = req.params;

    const run = await scheduleService.getRun(userId, runId);
    res.json({ success: true, data: run });
}));

/**
 * GET /api/schedules/:id
 * Get a specific schedule with run history
 */
router.get('/:id', validate(scheduleIdValidation), asyncHandler(async (req: AuthRequest, res) => {
    const userId = req.userId!;
    const { id } = req.params;

    const schedule = await scheduleService.findOne(userId, id);
    res.json({ success: true, data: schedule });
}));

/**
 * PUT /api/schedules/:id
 * Update a schedule
 */
router.put('/:id', validate(updateScheduleValidation), asyncHandler(async (req: AuthRequest, res) => {
    const userId = req.userId!;
    const { id } = req.params;
    const data = req.body;

    const schedule = await scheduleService.update(userId, id, data);
    res.json({ success: true, data: schedule });
}));

/**
 * DELETE /api/schedules/:id
 * Delete a schedule
 */
router.delete('/:id', validate(scheduleIdValidation), asyncHandler(async (req: AuthRequest, res) => {
    const userId = req.userId!;
    const { id } = req.params;

    await scheduleService.delete(userId, id);
    res.json({ success: true, message: 'Schedule deleted' });
}));

/**
 * POST /api/schedules/:id/toggle
 * Toggle schedule active/inactive status
 */
router.post('/:id/toggle', validate(scheduleIdValidation), asyncHandler(async (req: AuthRequest, res) => {
    const userId = req.userId!;
    const { id } = req.params;

    const schedule = await scheduleService.toggleActive(userId, id);
    res.json({ success: true, data: schedule });
}));

/**
 * POST /api/schedules/:id/trigger
 * Manually trigger a scheduled run with optional parameter overrides
 */
router.post('/:id/trigger', validate(triggerScheduleRunValidation), asyncHandler(async (req: AuthRequest, res) => {
    const userId = req.userId!;
    const { id } = req.params;
    const triggerRequest = req.body; // Optional: { parameterValues }

    const run = await scheduleService.triggerRun(userId, id, triggerRequest);
    res.status(202).json({
        success: true,
        data: run,
        message: 'Run triggered successfully'
    });
}));

/**
 * GET /api/schedules/:id/runs
 * Get run history for a schedule
 */
router.get('/:id/runs', validate(runsQueryValidation), asyncHandler(async (req: AuthRequest, res) => {
    const userId = req.userId!;
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await scheduleService.getRuns(userId, id, limit, offset);
    res.json({ success: true, data: result });
}));

/**
 * GET /api/schedules/:id/webhook
 * Get the webhook URL for a schedule
 */
router.get('/:id/webhook', validate(scheduleIdValidation), asyncHandler(async (req: AuthRequest, res) => {
    const userId = req.userId!;
    const { id } = req.params;

    const webhookInfo = await scheduleService.getWebhookInfo(userId, id);
    res.json({ success: true, data: webhookInfo });
}));

/**
 * POST /api/schedules/:id/webhook/regenerate
 * Regenerate the webhook token for a schedule
 */
router.post('/:id/webhook/regenerate', validate(scheduleIdValidation), asyncHandler(async (req: AuthRequest, res) => {
    const userId = req.userId!;
    const { id } = req.params;

    const newToken = await scheduleService.regenerateWebhookToken(userId, id);
    const baseUrl = process.env.API_BASE_URL || `${req.protocol}://${req.get('host')}`;

    res.json({
        success: true,
        data: {
            token: newToken,
            webhookUrl: `${baseUrl}/api/schedules/webhook/${newToken}`,
        },
        message: 'Webhook token regenerated successfully',
    });
}));

export default router;
