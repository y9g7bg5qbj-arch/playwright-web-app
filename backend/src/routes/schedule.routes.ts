import { Router } from 'express';
import { scheduleService } from '../services/schedule.service';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { SCHEDULE_PRESETS } from '@playwright-web-app/shared';
import {
    createScheduleValidation,
    updateScheduleValidation,
    scheduleIdValidation,
    runIdValidation,
    validateCronValidation,
    runsQueryValidation,
    webhookTokenValidation,
} from '../validators/schedule.validators';

const router = Router();

// =============================================
// Webhook endpoint - no authentication required (must be before auth middleware)
// =============================================

/**
 * POST /api/schedules/webhook/:token
 * Trigger a run via webhook (used by CI/CD pipelines)
 */
router.post('/webhook/:token', validate(webhookTokenValidation), async (req, res, next) => {
    try {
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
    } catch (error) {
        next(error);
    }
});

// =============================================
// Authenticated routes
// =============================================

router.use(authenticateToken);

/**
 * GET /api/schedules
 * List all schedules for the authenticated user
 */
router.get('/', async (req: AuthRequest, res, next) => {
    try {
        const userId = req.userId!;
        const schedules = await scheduleService.findAll(userId);
        res.json({ success: true, data: schedules });
    } catch (error) {
        next(error);
    }
});

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
router.post('/', validate(createScheduleValidation), async (req: AuthRequest, res, next) => {
    try {
        const userId = req.userId!;
        const data = req.body;

        const schedule = await scheduleService.create(userId, data);
        res.status(201).json({ success: true, data: schedule });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/schedules/validate-cron
 * Validate a cron expression and get human-readable description
 */
router.post('/validate-cron', validate(validateCronValidation), async (req: AuthRequest, res) => {
    const { expression, count = 5 } = req.body;

    const validation = scheduleService.validateCron(expression);

    if (validation.valid) {
        const nextRuns = scheduleService.previewNextRuns(expression, 'UTC', count);
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
router.get('/runs/:runId', validate(runIdValidation), async (req: AuthRequest, res, next) => {
    try {
        const userId = req.userId!;
        const { runId } = req.params;

        const run = await scheduleService.getRun(userId, runId);
        res.json({ success: true, data: run });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/schedules/:id
 * Get a specific schedule with run history
 */
router.get('/:id', validate(scheduleIdValidation), async (req: AuthRequest, res, next) => {
    try {
        const userId = req.userId!;
        const { id } = req.params;

        const schedule = await scheduleService.findOne(userId, id);
        res.json({ success: true, data: schedule });
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/schedules/:id
 * Update a schedule
 */
router.put('/:id', validate(updateScheduleValidation), async (req: AuthRequest, res, next) => {
    try {
        const userId = req.userId!;
        const { id } = req.params;
        const data = req.body;

        const schedule = await scheduleService.update(userId, id, data);
        res.json({ success: true, data: schedule });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/schedules/:id
 * Delete a schedule
 */
router.delete('/:id', validate(scheduleIdValidation), async (req: AuthRequest, res, next) => {
    try {
        const userId = req.userId!;
        const { id } = req.params;

        await scheduleService.delete(userId, id);
        res.json({ success: true, message: 'Schedule deleted' });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/schedules/:id/toggle
 * Toggle schedule active/inactive status
 */
router.post('/:id/toggle', validate(scheduleIdValidation), async (req: AuthRequest, res, next) => {
    try {
        const userId = req.userId!;
        const { id } = req.params;

        const schedule = await scheduleService.toggleActive(userId, id);
        res.json({ success: true, data: schedule });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/schedules/:id/trigger
 * Manually trigger a scheduled run with optional parameter overrides
 */
router.post('/:id/trigger', validate(scheduleIdValidation), async (req: AuthRequest, res, next) => {
    try {
        const userId = req.userId!;
        const { id } = req.params;
        const triggerRequest = req.body; // Optional: { parameterValues, executionConfig }

        const run = await scheduleService.triggerRun(userId, id, triggerRequest);
        res.status(202).json({
            success: true,
            data: run,
            message: 'Run triggered successfully'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/schedules/:id/runs
 * Get run history for a schedule
 */
router.get('/:id/runs', validate(runsQueryValidation), async (req: AuthRequest, res, next) => {
    try {
        const userId = req.userId!;
        const { id } = req.params;
        const limit = parseInt(req.query.limit as string) || 20;

        const runs = await scheduleService.getRuns(userId, id, limit);
        res.json({ success: true, data: runs });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/schedules/:id/webhook
 * Get the webhook URL for a schedule
 */
router.get('/:id/webhook', validate(scheduleIdValidation), async (req: AuthRequest, res, next) => {
    try {
        const userId = req.userId!;
        const { id } = req.params;

        const webhookInfo = await scheduleService.getWebhookInfo(userId, id);
        res.json({ success: true, data: webhookInfo });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/schedules/:id/webhook/regenerate
 * Regenerate the webhook token for a schedule
 */
router.post('/:id/webhook/regenerate', validate(scheduleIdValidation), async (req: AuthRequest, res, next) => {
    try {
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
    } catch (error) {
        next(error);
    }
});

export default router;
