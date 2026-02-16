import { Router, Response, NextFunction } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

// Vero Agent Python service URL
const VERO_AGENT_URL = process.env.VERO_AGENT_URL || 'http://localhost:5001';

// Type definitions for agent API responses
interface AgentGenerateResponse {
    vero_code: string;
    new_pages?: Record<string, string>;
    message?: string;
    detail?: string;
}

interface AgentRunResponse {
    success: boolean;
    final_code: string;
    attempts: number;
    message?: string;
    detail?: string;
}

interface AgentHealthResponse {
    status: string;
    llm_provider: string;
    existing_pages: number;
}

interface AgentPagesResponse {
    pages: Record<string, any>;
}

// In-memory history storage (could be moved to database)
const generationHistory = new Map<string, {
    id: string;
    userId: string;
    steps: string;
    generatedCode: string;
    featureName: string;
    scenarioName: string;
    createdAt: Date;
}[]>();

const agentRouter = Router();

// Generate Vero code from plain English steps
agentRouter.post('/agent/generate', authenticateToken, async (req: AuthRequest, res: Response, _next: NextFunction) => {
    try {
        const { steps, url, featureName, scenarioName, useAi = true } = req.body;

        if (!steps) {
            return res.status(400).json({ success: false, error: 'Steps are required' });
        }

        // Call the vero-agent Python service
        const response = await fetch(`${VERO_AGENT_URL}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                steps,
                url,
                feature_name: featureName || 'GeneratedFeature',
                scenario_name: scenarioName || 'Generated Scenario',
                use_ai: useAi
            })
        });

        const data = await response.json() as AgentGenerateResponse;

        if (!response.ok) {
            return res.status(response.status).json({
                success: false,
                error: data.detail || 'Agent generation failed'
            });
        }

        res.json({
            success: true,
            veroCode: data.vero_code,
            newPages: data.new_pages || {},
            message: data.message
        });
    } catch (error) {
        logger.error('Failed to generate with agent:', error);
        res.status(500).json({
            success: false,
            error: `Vero Agent not available. Is it running on ${VERO_AGENT_URL}?`
        });
    }
});

// Run Vero code with self-healing (retries up to 20 times)
agentRouter.post('/agent/run', authenticateToken, async (req: AuthRequest, res: Response, _next: NextFunction) => {
    try {
        const { veroCode, maxRetries } = req.body;

        if (!veroCode) {
            return res.status(400).json({ success: false, error: 'Vero code is required' });
        }

        const response = await fetch(`${VERO_AGENT_URL}/api/run`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                vero_code: veroCode,
                max_retries: maxRetries || 20
            })
        });

        const data = await response.json() as AgentRunResponse;

        if (!response.ok) {
            return res.status(response.status).json({
                success: false,
                error: data.detail || 'Agent run failed'
            });
        }

        res.json({
            success: data.success,
            finalCode: data.final_code,
            attempts: data.attempts,
            message: data.message
        });
    } catch (error) {
        logger.error('Failed to run with agent:', error);
        res.status(500).json({
            success: false,
            error: `Vero Agent not available. Is it running on ${VERO_AGENT_URL}?`
        });
    }
});

// Generate and run in one call
agentRouter.post('/agent/generate-and-run', authenticateToken, async (req: AuthRequest, res: Response, _next: NextFunction) => {
    try {
        const { steps, url, featureName, scenarioName, maxRetries } = req.body;

        if (!steps) {
            return res.status(400).json({ success: false, error: 'Steps are required' });
        }

        const response = await fetch(`${VERO_AGENT_URL}/api/generate-and-run`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                steps,
                url,
                feature_name: featureName || 'GeneratedFeature',
                scenario_name: scenarioName || 'Generated Scenario',
                max_retries: maxRetries || 20
            })
        });

        const data = await response.json() as AgentRunResponse;

        if (!response.ok) {
            return res.status(response.status).json({
                success: false,
                error: data.detail || 'Agent generate-and-run failed'
            });
        }

        res.json({
            success: data.success,
            finalCode: data.final_code,
            attempts: data.attempts,
            message: data.message
        });
    } catch (error) {
        logger.error('Failed to generate-and-run with agent:', error);
        res.status(500).json({
            success: false,
            error: `Vero Agent not available. Is it running on ${VERO_AGENT_URL}?`
        });
    }
});

// Check agent health
agentRouter.get('/agent/health', authenticateToken, async (_req: AuthRequest, res: Response, _next: NextFunction) => {
    try {
        const response = await fetch(`${VERO_AGENT_URL}/health`);
        const data = await response.json() as AgentHealthResponse;

        res.json({
            success: true,
            agentStatus: data.status,
            llmProvider: data.llm_provider,
            existingPages: data.existing_pages
        });
    } catch (error) {
        res.json({
            success: false,
            agentStatus: 'offline',
            message: `Vero Agent not running on ${VERO_AGENT_URL}`
        });
    }
});

// Get existing page objects from agent
agentRouter.get('/agent/pages', authenticateToken, async (_req: AuthRequest, res: Response, _next: NextFunction) => {
    try {
        const response = await fetch(`${VERO_AGENT_URL}/api/pages`);
        const data = await response.json() as AgentPagesResponse;
        res.json({ success: true, pages: data.pages });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch pages from agent'
        });
    }
});

// Streaming generation endpoint using Server-Sent Events
agentRouter.post('/agent/generate-stream', authenticateToken, async (req: AuthRequest, res: Response, _next: NextFunction) => {
    const { steps, url, featureName, scenarioName, useAi = true } = req.body;

    if (!steps) {
        return res.status(400).json({ success: false, error: 'Steps are required' });
    }

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const sendEvent = (event: string, data: any) => {
        res.write(`event: ${event}\n`);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
        sendEvent('start', { message: 'Starting generation...', timestamp: Date.now() });

        // Step 1: Parse English steps
        sendEvent('progress', { step: 'parsing', message: 'Parsing English steps...' });

        // Step 2: Build context from existing pages
        sendEvent('progress', { step: 'context', message: 'Loading existing page objects...' });

        // Step 3: Call the Python agent
        sendEvent('progress', { step: 'generating', message: 'Generating Vero code with AI...' });

        const response = await fetch(`${VERO_AGENT_URL}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                steps,
                url,
                feature_name: featureName || 'GeneratedFeature',
                scenario_name: scenarioName || 'Generated Scenario',
                use_ai: useAi
            })
        });

        const data = await response.json() as AgentGenerateResponse;

        if (!response.ok) {
            sendEvent('error', { error: data.detail || 'Generation failed' });
            res.end();
            return;
        }

        // Step 4: Send the result
        sendEvent('progress', { step: 'complete', message: 'Generation complete!' });
        sendEvent('result', {
            success: true,
            veroCode: data.vero_code,
            newPages: data.new_pages || {},
            message: data.message
        });

        sendEvent('end', { timestamp: Date.now() });
        res.end();
    } catch (error) {
        logger.error('Streaming generation error:', error);
        sendEvent('error', {
            error: `Vero Agent not available. Is it running on ${VERO_AGENT_URL}?`
        });
        res.end();
    }
});

// Save generation to history
agentRouter.post('/agent/history', authenticateToken, async (req: AuthRequest, res: Response, _next: NextFunction) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ success: false, error: 'User not authenticated' });
        }

        const { steps, generatedCode, featureName, scenarioName } = req.body;

        const entry = {
            id: uuidv4(),
            userId,
            steps,
            generatedCode,
            featureName: featureName || 'GeneratedFeature',
            scenarioName: scenarioName || 'Generated Scenario',
            createdAt: new Date()
        };

        const userHistory = generationHistory.get(userId) || [];
        userHistory.unshift(entry); // Add to front (newest first)

        // Keep only last 50 entries per user
        if (userHistory.length > 50) {
            userHistory.pop();
        }

        generationHistory.set(userId, userHistory);

        res.json({ success: true, entry });
    } catch (error) {
        logger.error('Failed to save history:', error);
        res.status(500).json({ success: false, error: 'Failed to save history' });
    }
});

// Get generation history
agentRouter.get('/agent/history', authenticateToken, async (req: AuthRequest, res: Response, _next: NextFunction) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ success: false, error: 'User not authenticated' });
        }

        const userHistory = generationHistory.get(userId) || [];
        res.json({ success: true, history: userHistory });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch history' });
    }
});

// Delete history entry
agentRouter.delete('/agent/history/:entryId', authenticateToken, async (req: AuthRequest, res: Response, _next: NextFunction) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ success: false, error: 'User not authenticated' });
        }

        const { entryId } = req.params;
        const userHistory = generationHistory.get(userId) || [];
        const filtered = userHistory.filter(e => e.id !== entryId);
        generationHistory.set(userId, filtered);

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to delete history entry' });
    }
});

export { agentRouter as veroAgentRouter };
