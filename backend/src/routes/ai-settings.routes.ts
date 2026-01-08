/**
 * AI Settings Routes
 *
 * Manage user AI provider configuration for Copilot
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/ai-settings
 * Get user's AI settings
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.userId!;

    let settings = await prisma.aISettings.findUnique({
      where: { userId },
    });

    // Create default settings if none exist
    if (!settings) {
      settings = await prisma.aISettings.create({
        data: {
          userId,
          provider: 'gemini',
          geminiModel: 'gemini-2.5-pro-preview-03-25',
          openaiModel: 'gpt-4o',
          anthropicModel: 'claude-sonnet-4-20250514',
          stagehandHeadless: true,
          stagehandDebug: false,
          useBrowserbase: false,
        },
      });
    }

    // Mask API keys for security (only show last 4 chars)
    const maskedSettings = {
      ...settings,
      geminiApiKey: settings.geminiApiKey ? `...${settings.geminiApiKey.slice(-4)}` : null,
      openaiApiKey: settings.openaiApiKey ? `...${settings.openaiApiKey.slice(-4)}` : null,
      anthropicApiKey: settings.anthropicApiKey ? `...${settings.anthropicApiKey.slice(-4)}` : null,
      browserbaseApiKey: settings.browserbaseApiKey ? `...${settings.browserbaseApiKey.slice(-4)}` : null,
      // Include a flag to indicate if keys are set
      hasGeminiKey: !!settings.geminiApiKey,
      hasOpenaiKey: !!settings.openaiApiKey,
      hasAnthropicKey: !!settings.anthropicApiKey,
      hasBrowserbaseKey: !!settings.browserbaseApiKey,
    };

    res.json(maskedSettings);
  } catch (error: any) {
    console.error('Error fetching AI settings:', error);
    res.status(500).json({ error: 'Failed to fetch AI settings' });
  }
});

/**
 * PUT /api/ai-settings
 * Update user's AI settings
 */
router.put('/', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.userId!;

    const {
      provider,
      geminiApiKey,
      geminiModel,
      openaiApiKey,
      openaiModel,
      anthropicApiKey,
      anthropicModel,
      browserbaseApiKey,
      useBrowserbase,
      stagehandHeadless,
      stagehandDebug,
    } = req.body;

    // Build update data, only including non-undefined values
    const updateData: any = {};

    if (provider !== undefined) updateData.provider = provider;
    if (geminiModel !== undefined) updateData.geminiModel = geminiModel;
    if (openaiModel !== undefined) updateData.openaiModel = openaiModel;
    if (anthropicModel !== undefined) updateData.anthropicModel = anthropicModel;
    if (useBrowserbase !== undefined) updateData.useBrowserbase = useBrowserbase;
    if (stagehandHeadless !== undefined) updateData.stagehandHeadless = stagehandHeadless;
    if (stagehandDebug !== undefined) updateData.stagehandDebug = stagehandDebug;

    // Only update API keys if explicitly provided (not masked values)
    if (geminiApiKey && !geminiApiKey.startsWith('...')) {
      updateData.geminiApiKey = geminiApiKey;
    }
    if (openaiApiKey && !openaiApiKey.startsWith('...')) {
      updateData.openaiApiKey = openaiApiKey;
    }
    if (anthropicApiKey && !anthropicApiKey.startsWith('...')) {
      updateData.anthropicApiKey = anthropicApiKey;
    }
    if (browserbaseApiKey && !browserbaseApiKey.startsWith('...')) {
      updateData.browserbaseApiKey = browserbaseApiKey;
    }

    const settings = await prisma.aISettings.upsert({
      where: { userId },
      update: updateData,
      create: {
        userId,
        ...updateData,
      },
    });

    // Mask API keys in response
    const maskedSettings = {
      ...settings,
      geminiApiKey: settings.geminiApiKey ? `...${settings.geminiApiKey.slice(-4)}` : null,
      openaiApiKey: settings.openaiApiKey ? `...${settings.openaiApiKey.slice(-4)}` : null,
      anthropicApiKey: settings.anthropicApiKey ? `...${settings.anthropicApiKey.slice(-4)}` : null,
      browserbaseApiKey: settings.browserbaseApiKey ? `...${settings.browserbaseApiKey.slice(-4)}` : null,
      hasGeminiKey: !!settings.geminiApiKey,
      hasOpenaiKey: !!settings.openaiApiKey,
      hasAnthropicKey: !!settings.anthropicApiKey,
      hasBrowserbaseKey: !!settings.browserbaseApiKey,
    };

    res.json(maskedSettings);
  } catch (error: any) {
    console.error('Error updating AI settings:', error);
    res.status(500).json({ error: 'Failed to update AI settings' });
  }
});

/**
 * POST /api/ai-settings/test
 * Test AI provider connection
 */
router.post('/test', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.userId!;
    const { provider } = req.body;

    const settings = await prisma.aISettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      return res.status(400).json({ error: 'AI settings not configured' });
    }

    let success = false;
    let message = '';

    switch (provider || settings.provider) {
      case 'gemini':
        if (!settings.geminiApiKey) {
          return res.status(400).json({ error: 'Gemini API key not configured' });
        }
        // Test Gemini connection
        try {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${settings.geminiApiKey}`
          );
          if (response.ok) {
            success = true;
            message = 'Gemini API connection successful';
          } else {
            const error = await response.json();
            message = `Gemini API error: ${error.error?.message || 'Unknown error'}`;
          }
        } catch (e: any) {
          message = `Gemini connection failed: ${e.message}`;
        }
        break;

      case 'openai':
        if (!settings.openaiApiKey) {
          return res.status(400).json({ error: 'OpenAI API key not configured' });
        }
        // Test OpenAI connection
        try {
          const response = await fetch('https://api.openai.com/v1/models', {
            headers: { Authorization: `Bearer ${settings.openaiApiKey}` },
          });
          if (response.ok) {
            success = true;
            message = 'OpenAI API connection successful';
          } else {
            const error = await response.json();
            message = `OpenAI API error: ${error.error?.message || 'Unknown error'}`;
          }
        } catch (e: any) {
          message = `OpenAI connection failed: ${e.message}`;
        }
        break;

      case 'anthropic':
        if (!settings.anthropicApiKey) {
          return res.status(400).json({ error: 'Anthropic API key not configured' });
        }
        // Anthropic doesn't have a simple test endpoint, so we just validate key format
        if (settings.anthropicApiKey.startsWith('sk-ant-')) {
          success = true;
          message = 'Anthropic API key format valid';
        } else {
          message = 'Invalid Anthropic API key format';
        }
        break;

      default:
        return res.status(400).json({ error: `Unknown provider: ${provider}` });
    }

    res.json({ success, message, provider: provider || settings.provider });
  } catch (error: any) {
    console.error('Error testing AI connection:', error);
    res.status(500).json({ error: 'Failed to test AI connection' });
  }
});

/**
 * DELETE /api/ai-settings/key/:provider
 * Delete a specific API key
 */
router.delete('/key/:provider', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.userId!;
    const { provider } = req.params;

    const updateData: any = {};

    switch (provider) {
      case 'gemini':
        updateData.geminiApiKey = null;
        break;
      case 'openai':
        updateData.openaiApiKey = null;
        break;
      case 'anthropic':
        updateData.anthropicApiKey = null;
        break;
      case 'browserbase':
        updateData.browserbaseApiKey = null;
        updateData.useBrowserbase = false;
        break;
      default:
        return res.status(400).json({ error: `Unknown provider: ${provider}` });
    }

    await prisma.aISettings.update({
      where: { userId },
      data: updateData,
    });

    res.json({ success: true, message: `${provider} API key deleted` });
  } catch (error: any) {
    console.error('Error deleting API key:', error);
    res.status(500).json({ error: 'Failed to delete API key' });
  }
});

export default router;
