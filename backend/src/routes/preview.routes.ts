/**
 * Preview Routes
 *
 * Serves a live preview of Vero feature files during recording.
 * Opens in a small browser window alongside Playwright codegen.
 */

import { Router, Request, Response } from 'express';

const router = Router();

// Store active preview sessions with their content
const previewSessions: Map<string, {
    scenarioName: string;
    featureContent: string;
    actions: string[];
    lastUpdate: number;
}> = new Map();

/**
 * Start a preview session
 */
router.post('/start', (req: Request, res: Response) => {
    const { sessionId, scenarioName, featureContent } = req.body;

    if (!sessionId || !scenarioName) {
        return res.status(400).json({ error: 'sessionId and scenarioName required' });
    }

    previewSessions.set(sessionId, {
        scenarioName,
        featureContent: featureContent || '',
        actions: [],
        lastUpdate: Date.now()
    });

    console.log(`[Preview] Started session ${sessionId} for scenario "${scenarioName}"`);
    res.json({ success: true });
});

/**
 * Update preview with new action
 */
router.post('/action', (req: Request, res: Response) => {
    const { sessionId, action } = req.body;

    const session = previewSessions.get(sessionId);
    if (!session) {
        return res.status(404).json({ error: 'Session not found' });
    }

    session.actions.push(action);
    session.lastUpdate = Date.now();

    console.log(`[Preview] Added action to ${sessionId}: ${action}`);
    res.json({ success: true, actionCount: session.actions.length });
});

/**
 * Update full feature content
 */
router.post('/content', (req: Request, res: Response) => {
    const { sessionId, content } = req.body;

    const session = previewSessions.get(sessionId);
    if (!session) {
        return res.status(404).json({ error: 'Session not found' });
    }

    session.featureContent = content;
    session.lastUpdate = Date.now();

    res.json({ success: true });
});

/**
 * Stop preview session
 */
router.post('/stop', (req: Request, res: Response) => {
    const { sessionId } = req.body;
    previewSessions.delete(sessionId);
    console.log(`[Preview] Stopped session ${sessionId}`);
    res.json({ success: true });
});

/**
 * Get preview data (for polling)
 */
router.get('/:sessionId/data', (req: Request, res: Response) => {
    const { sessionId } = req.params;
    const session = previewSessions.get(sessionId);

    if (!session) {
        return res.status(404).json({ error: 'Session not found' });
    }

    res.json({
        scenarioName: session.scenarioName,
        featureContent: session.featureContent,
        actions: session.actions,
        lastUpdate: session.lastUpdate
    });
});

/**
 * Serve the live preview HTML page
 */
router.get('/:sessionId', (req: Request, res: Response) => {
    const { sessionId } = req.params;
    const session = previewSessions.get(sessionId);

    if (!session) {
        return res.status(404).send('Preview session not found');
    }

    // Generate HTML page with live updating Vero preview
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vero Recording - ${session.scenarioName}</title>
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Inter', sans-serif;
            background: #1a1a2e;
            color: #e0e0e0;
            height: 100vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 12px 16px;
            display: flex;
            align-items: center;
            gap: 12px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        }

        .header h1 {
            font-size: 14px;
            font-weight: 600;
            color: white;
        }

        .recording-badge {
            display: flex;
            align-items: center;
            gap: 6px;
            background: rgba(255,255,255,0.2);
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 500;
        }

        .recording-dot {
            width: 8px;
            height: 8px;
            background: #ff4757;
            border-radius: 50%;
            animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.5; transform: scale(1.2); }
        }

        .scenario-name {
            margin-left: auto;
            font-size: 12px;
            color: rgba(255,255,255,0.8);
        }

        .content {
            flex: 1;
            overflow: auto;
            padding: 16px;
        }

        .code-container {
            background: #0d0d1a;
            border-radius: 8px;
            border: 1px solid #2a2a4a;
            overflow: hidden;
        }

        .code-header {
            background: #1e1e3a;
            padding: 8px 12px;
            border-bottom: 1px solid #2a2a4a;
            font-size: 11px;
            color: #888;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .file-icon {
            width: 14px;
            height: 14px;
            fill: #a78bfa;
        }

        pre {
            font-family: 'JetBrains Mono', monospace;
            font-size: 13px;
            line-height: 1.6;
            padding: 16px;
            overflow-x: auto;
            white-space: pre-wrap;
            word-break: break-word;
        }

        /* Vero syntax highlighting */
        .keyword { color: #c792ea; font-weight: 500; }
        .string { color: #c3e88d; }
        .action { color: #82aaff; }
        .selector { color: #f78c6c; }
        .comment { color: #546e7a; font-style: italic; }
        .page-ref { color: #ffcb6b; }

        .footer {
            background: #0d0d1a;
            padding: 10px 16px;
            border-top: 1px solid #2a2a4a;
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 11px;
            color: #666;
        }

        .action-count {
            display: flex;
            align-items: center;
            gap: 6px;
            color: #82aaff;
        }

        .last-action {
            color: #888;
            max-width: 300px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .new-action {
            animation: highlight 1s ease-out;
        }

        @keyframes highlight {
            0% { background: rgba(130, 170, 255, 0.3); }
            100% { background: transparent; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎬 Vero Recording</h1>
        <div class="recording-badge">
            <div class="recording-dot"></div>
            RECORDING
        </div>
        <div class="scenario-name">Scenario: <strong>${session.scenarioName}</strong></div>
    </div>

    <div class="content">
        <div class="code-container">
            <div class="code-header">
                <svg class="file-icon" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/><polyline points="14 2 14 8 20 8"/></svg>
                <span>feature.vero</span>
            </div>
            <pre id="code-content"></pre>
        </div>
    </div>

    <div class="footer">
        <div class="action-count">
            <span id="action-count">0</span> actions recorded
        </div>
        <div class="last-action" id="last-action">Waiting for actions...</div>
    </div>

    <script>
        const sessionId = '${sessionId}';
        let lastUpdate = 0;
        let lastActionCount = 0;

        // Syntax highlighting for Vero code
        function highlightVero(code) {
            return code
                // Comments
                .replace(/(#.*$)/gm, '<span class="comment">$1</span>')
                // Keywords
                .replace(/\\b(feature|scenario|page|using|import|as|with|from|is|has|to|on|in)\\b/g, '<span class="keyword">$1</span>')
                // Actions
                .replace(/\\b(open|click|fill|check|uncheck|select|hover|press|wait|verify|assert|scroll|drag|drop|navigate|submit|clear)\\b/g, '<span class="action">$1</span>')
                // Strings
                .replace(/"([^"]+)"/g, '"<span class="string">$1</span>"')
                // Page object references (PageName.fieldName)
                .replace(/([A-Z][a-zA-Z0-9]*)\\.([a-zA-Z][a-zA-Z0-9]*)/g, '<span class="page-ref">$1</span>.<span class="selector">$2</span>');
        }

        // Poll for updates
        async function pollUpdates() {
            try {
                const response = await fetch('/api/preview/${sessionId}/data');
                if (!response.ok) {
                    // Session ended
                    document.getElementById('code-content').innerHTML = '<span class="comment"># Recording ended</span>';
                    return;
                }

                const data = await response.json();

                if (data.lastUpdate > lastUpdate) {
                    lastUpdate = data.lastUpdate;

                    // Update code display
                    const codeEl = document.getElementById('code-content');
                    codeEl.innerHTML = highlightVero(data.featureContent || '# Recording in progress...');

                    // Scroll to bottom to show latest action
                    codeEl.scrollTop = codeEl.scrollHeight;

                    // Update action count
                    document.getElementById('action-count').textContent = data.actions.length;

                    // Show last action with highlight effect
                    if (data.actions.length > lastActionCount && data.actions.length > 0) {
                        const lastAction = data.actions[data.actions.length - 1];
                        document.getElementById('last-action').textContent = lastAction;
                        document.getElementById('last-action').classList.add('new-action');
                        setTimeout(() => {
                            document.getElementById('last-action').classList.remove('new-action');
                        }, 1000);
                    }
                    lastActionCount = data.actions.length;
                }
            } catch (e) {
                console.error('Poll error:', e);
            }

            // Continue polling
            setTimeout(pollUpdates, 500);
        }

        // Start polling
        pollUpdates();
    </script>
</body>
</html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
});

export default router;
