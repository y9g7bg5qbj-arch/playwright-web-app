/**
 * Run Parameters API Routes
 *
 * Manages parameter definitions (schema) and parameter sets (presets)
 * for per-execution variables.
 *
 * Mounted at: /api/applications/:applicationId/run-parameters
 */

import { Router, Response } from 'express';
import { runParameterDefinitionRepository, runParameterSetRepository } from '../db/repositories/mongo';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router({ mergeParams: true });

router.use(authenticateToken);

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

function mapDefinition(doc: any) {
  return {
    id: doc.id,
    applicationId: doc.applicationId,
    name: doc.name,
    type: doc.type,
    label: doc.label,
    description: doc.description,
    defaultValue: doc.defaultValue,
    required: doc.required,
    choices: doc.choices,
    min: doc.min,
    max: doc.max,
    parameterize: doc.parameterize ?? doc.parallel,
    order: doc.order,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function mapSet(doc: any) {
  return {
    id: doc.id,
    applicationId: doc.applicationId,
    name: doc.name,
    description: doc.description,
    values: doc.values,
    isDefault: doc.isDefault,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

// ============================================
// PARAMETER DEFINITIONS
// ============================================

// GET /definitions — List all parameter definitions
router.get('/:applicationId/run-parameters/definitions', async (req: AuthRequest, res: Response) => {
  try {
    const { applicationId } = req.params;
    const definitions = await runParameterDefinitionRepository.findByApplicationId(applicationId);
    res.json({ success: true, data: definitions.map(mapDefinition) });
  } catch (error) {
    logger.error('Failed to list parameter definitions', { error: getErrorMessage(error) });
    res.status(500).json({ success: false, error: 'Failed to list parameter definitions' });
  }
});

// POST /definitions — Create a parameter definition
router.post('/:applicationId/run-parameters/definitions', async (req: AuthRequest, res: Response) => {
  try {
    const { applicationId } = req.params;
    const { name, type, label, description, defaultValue, required, choices, min, max, parameterize, parallel } = req.body;

    if (!name || !type || !label) {
      return res.status(400).json({ success: false, error: 'name, type, and label are required' });
    }

    const maxOrder = await runParameterDefinitionRepository.getMaxOrder(applicationId);

    const definition = await runParameterDefinitionRepository.create({
      applicationId,
      name,
      type,
      label,
      description,
      defaultValue,
      required: required ?? false,
      choices,
      min,
      max,
      parameterize: parameterize ?? parallel ?? false,
      order: maxOrder + 1,
    });

    res.status(201).json({ success: true, data: mapDefinition(definition) });
  } catch (error) {
    logger.error('Failed to create parameter definition', { error: getErrorMessage(error) });
    res.status(500).json({ success: false, error: 'Failed to create parameter definition' });
  }
});

// PUT /definitions/:id — Update a parameter definition
router.put('/:applicationId/run-parameters/definitions/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const updated = await runParameterDefinitionRepository.update(id, updates);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Parameter definition not found' });
    }

    res.json({ success: true, data: mapDefinition(updated) });
  } catch (error) {
    logger.error('Failed to update parameter definition', { error: getErrorMessage(error) });
    res.status(500).json({ success: false, error: 'Failed to update parameter definition' });
  }
});

// DELETE /definitions/:id — Delete a parameter definition
router.delete('/:applicationId/run-parameters/definitions/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await runParameterDefinitionRepository.delete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Parameter definition not found' });
    }

    res.json({ success: true, data: { deleted: true } });
  } catch (error) {
    logger.error('Failed to delete parameter definition', { error: getErrorMessage(error) });
    res.status(500).json({ success: false, error: 'Failed to delete parameter definition' });
  }
});

// PUT /definitions/reorder — Reorder parameter definitions
router.put('/:applicationId/run-parameters/definitions/reorder', async (req: AuthRequest, res: Response) => {
  try {
    const { applicationId } = req.params;
    const { orderedIds } = req.body;

    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ success: false, error: 'orderedIds array is required' });
    }

    await runParameterDefinitionRepository.reorder(applicationId, orderedIds);
    const definitions = await runParameterDefinitionRepository.findByApplicationId(applicationId);
    res.json({ success: true, data: definitions.map(mapDefinition) });
  } catch (error) {
    logger.error('Failed to reorder parameter definitions', { error: getErrorMessage(error) });
    res.status(500).json({ success: false, error: 'Failed to reorder parameter definitions' });
  }
});

// ============================================
// PARAMETER SETS
// ============================================

// GET /sets — List all parameter sets
router.get('/:applicationId/run-parameters/sets', async (req: AuthRequest, res: Response) => {
  try {
    const { applicationId } = req.params;
    const sets = await runParameterSetRepository.findByApplicationId(applicationId);
    res.json({ success: true, data: sets.map(mapSet) });
  } catch (error) {
    logger.error('Failed to list parameter sets', { error: getErrorMessage(error) });
    res.status(500).json({ success: false, error: 'Failed to list parameter sets' });
  }
});

// POST /sets — Create a parameter set
router.post('/:applicationId/run-parameters/sets', async (req: AuthRequest, res: Response) => {
  try {
    const { applicationId } = req.params;
    const { name, description, values, isDefault } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'name is required' });
    }

    if (isDefault) {
      await runParameterSetRepository.clearDefault(applicationId);
    }

    const paramSet = await runParameterSetRepository.create({
      applicationId,
      name,
      description,
      values: values || {},
      isDefault: isDefault ?? false,
    });

    res.status(201).json({ success: true, data: mapSet(paramSet) });
  } catch (error) {
    logger.error('Failed to create parameter set', { error: getErrorMessage(error) });
    res.status(500).json({ success: false, error: 'Failed to create parameter set' });
  }
});

// PUT /sets/:id — Update a parameter set
router.put('/:applicationId/run-parameters/sets/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { applicationId } = req.params;
    const { id } = req.params;
    const updates = req.body;

    if (updates.isDefault) {
      await runParameterSetRepository.clearDefault(applicationId);
    }

    const updated = await runParameterSetRepository.update(id, updates);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Parameter set not found' });
    }

    res.json({ success: true, data: mapSet(updated) });
  } catch (error) {
    logger.error('Failed to update parameter set', { error: getErrorMessage(error) });
    res.status(500).json({ success: false, error: 'Failed to update parameter set' });
  }
});

// DELETE /sets/:id — Delete a parameter set
router.delete('/:applicationId/run-parameters/sets/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await runParameterSetRepository.delete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Parameter set not found' });
    }

    res.json({ success: true, data: { deleted: true } });
  } catch (error) {
    logger.error('Failed to delete parameter set', { error: getErrorMessage(error) });
    res.status(500).json({ success: false, error: 'Failed to delete parameter set' });
  }
});

// POST /sets/:id/clone — Clone a parameter set
router.post('/:applicationId/run-parameters/sets/:id/clone', async (req: AuthRequest, res: Response) => {
  try {
    const { applicationId } = req.params;
    const { id } = req.params;

    const original = await runParameterSetRepository.findById(id);
    if (!original) {
      return res.status(404).json({ success: false, error: 'Parameter set not found' });
    }

    const cloned = await runParameterSetRepository.create({
      applicationId,
      name: `${original.name} (Copy)`,
      description: original.description,
      values: { ...original.values },
      isDefault: false,
    });

    res.status(201).json({ success: true, data: mapSet(cloned) });
  } catch (error) {
    logger.error('Failed to clone parameter set', { error: getErrorMessage(error) });
    res.status(500).json({ success: false, error: 'Failed to clone parameter set' });
  }
});

export default router;
