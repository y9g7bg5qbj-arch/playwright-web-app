/**
 * Proxy Routes
 *
 * Serves web pages through the backend to enable embedding in iframe.
 * Injects action capture script into all pages.
 */

import { Router, Request, Response } from 'express';
import axios from 'axios';
import { JSDOM } from 'jsdom';
import { authenticateToken } from '../middleware/auth';
import { logger } from '../utils/logger';
import { escapeHtml } from '../utils/html';

const router = Router();
router.use(authenticateToken);

// Store active proxy sessions
const proxySessions = new Map<string, {
    baseUrl: string;
    currentUrl: string;
}>();

// Action capture script to inject
const ACTION_CAPTURE_SCRIPT = `
<script>
(function() {
    // Prevent duplicate injection
    if (window.__VERO_INJECTED__) return;
    window.__VERO_INJECTED__ = true;

    // Role map for implicit roles
    var roleMap = {
        'button': 'button',
        'a': 'link',
        'select': 'combobox',
        'textarea': 'textbox',
        'img': 'img',
        'nav': 'navigation',
        'main': 'main',
        'header': 'banner',
        'footer': 'contentinfo'
    };

    function getImplicitRole(el) {
        var tag = el.tagName.toLowerCase();
        var type = el.type;
        if (tag === 'input') {
            if (type === 'checkbox') return 'checkbox';
            if (type === 'radio') return 'radio';
            if (type === 'submit' || type === 'button') return 'button';
            return 'textbox';
        }
        return roleMap[tag];
    }

    function getElementInfo(el) {
        if (!el) return null;
        var computedRole = el.getAttribute('role') || getImplicitRole(el);
        return {
            tagName: el.tagName.toLowerCase(),
            id: el.id || undefined,
            className: typeof el.className === 'string' ? el.className : undefined,
            name: el.getAttribute('name') || undefined,
            text: el.textContent ? el.textContent.trim().slice(0, 50) : undefined,
            role: computedRole || undefined,
            ariaLabel: el.getAttribute('aria-label') || undefined,
            testId: el.getAttribute('data-testid') || el.getAttribute('data-test-id') || undefined,
            placeholder: el.getAttribute('placeholder') || undefined,
            inputType: el.type || undefined,
            href: el.href || undefined,
            title: el.getAttribute('title') || undefined,
            value: el.value || undefined
        };
    }

    // Send action to parent window
    function sendAction(action) {
        window.parent.postMessage({
            type: 'VERO_ACTION',
            action: action
        }, '*');
    }

    // Debounce for fill actions
    var fillTimeout = null;
    var lastFillElement = null;
    var lastFillValue = '';

    // Track clicks
    document.addEventListener('click', function(e) {
        var target = e.target;
        if (!target) return;

        // Check if it's a link - intercept and notify parent
        if (target.tagName === 'A' && target.href) {
            e.preventDefault();
            sendAction({
                type: 'click',
                element: getElementInfo(target),
                navigateTo: target.href,
                timestamp: Date.now()
            });
            return;
        }

        sendAction({
            type: 'click',
            element: getElementInfo(target),
            timestamp: Date.now()
        });
    }, true);

    // Track input/fill with debouncing
    document.addEventListener('input', function(e) {
        var target = e.target;
        if (!target) return;

        if (fillTimeout) clearTimeout(fillTimeout);
        lastFillElement = target;
        lastFillValue = target.value;

        fillTimeout = setTimeout(function() {
            if (!lastFillElement) return;
            sendAction({
                type: 'fill',
                element: getElementInfo(lastFillElement),
                value: lastFillValue,
                timestamp: Date.now()
            });
            lastFillElement = null;
            lastFillValue = '';
        }, 500);
    }, true);

    // Track checkbox/radio changes
    document.addEventListener('change', function(e) {
        var target = e.target;
        if (!target) return;

        if (target.type === 'checkbox' || target.type === 'radio') {
            sendAction({
                type: 'check',
                element: getElementInfo(target),
                value: target.checked ? 'true' : 'false',
                timestamp: Date.now()
            });
        } else if (target.tagName.toLowerCase() === 'select') {
            sendAction({
                type: 'select',
                element: getElementInfo(target),
                value: target.options[target.selectedIndex] ? target.options[target.selectedIndex].text : target.value,
                timestamp: Date.now()
            });
        }
    }, true);

    // Track special key presses
    document.addEventListener('keydown', function(e) {
        if (['Enter', 'Escape', 'Tab'].indexOf(e.key) >= 0) {
            sendAction({
                type: 'keypress',
                element: e.target ? getElementInfo(e.target) : null,
                key: e.key,
                timestamp: Date.now()
            });
        }
    }, true);

    // Intercept form submissions
    document.addEventListener('submit', function(e) {
        e.preventDefault();
        var form = e.target;
        sendAction({
            type: 'submit',
            element: getElementInfo(form),
            timestamp: Date.now()
        });
    }, true);

    console.log('[Vero] Action capture script injected');
})();
</script>
`;

/**
 * Start a proxy session
 */
router.post('/start', async (req: Request, res: Response) => {
    const { sessionId, url } = req.body;

    if (!sessionId || !url) {
        return res.status(400).json({ error: 'sessionId and url are required' });
    }

    try {
        const parsedUrl = new URL(url);
        proxySessions.set(sessionId, {
            baseUrl: `${parsedUrl.protocol}//${parsedUrl.host}`,
            currentUrl: url
        });

        res.json({ success: true, proxyUrl: `/api/proxy/${sessionId}/page` });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * Stop a proxy session
 */
router.post('/stop', async (req: Request, res: Response) => {
    const { sessionId } = req.body;
    proxySessions.delete(sessionId);
    res.json({ success: true });
});

/**
 * Navigate to a new URL within the session
 */
router.post('/:sessionId/navigate', async (req: Request, res: Response) => {
    const { sessionId } = req.params;
    const { url } = req.body;

    const session = proxySessions.get(sessionId);
    if (!session) {
        return res.status(404).json({ error: 'Session not found' });
    }

    try {
        // Handle relative URLs
        let fullUrl = url;
        if (url.startsWith('/')) {
            fullUrl = session.baseUrl + url;
        } else if (!url.startsWith('http')) {
            fullUrl = new URL(url, session.currentUrl).href;
        }

        session.currentUrl = fullUrl;
        res.json({ success: true, url: fullUrl });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * Serve the proxied page
 */
router.get('/:sessionId/page', async (req: Request, res: Response) => {
    const { sessionId } = req.params;

    const session = proxySessions.get(sessionId);
    if (!session) {
        return res.status(404).send('Session not found');
    }

    try {
        const response = await axios.get(session.currentUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
            responseType: 'text',
            maxRedirects: 5
        });

        let html = response.data;

        // Parse and modify HTML
        const dom = new JSDOM(html);
        const document = dom.window.document;

        // Add base tag to handle relative URLs
        const baseTag = document.createElement('base');
        baseTag.href = session.baseUrl;
        const head = document.querySelector('head');
        if (head) {
            head.insertBefore(baseTag, head.firstChild);
        }

        // Rewrite all links to go through proxy
        document.querySelectorAll('a[href]').forEach((link: any) => {
            const href = link.getAttribute('href');
            if (href && !href.startsWith('javascript:') && !href.startsWith('#')) {
                // Keep original href but add data attribute
                link.setAttribute('data-original-href', href);
            }
        });

        // Inject our action capture script before </body>
        const body = document.querySelector('body');
        if (body) {
            body.insertAdjacentHTML('beforeend', ACTION_CAPTURE_SCRIPT);
        }

        // Serialize back to HTML
        const modifiedHtml = dom.serialize();

        res.setHeader('Content-Type', 'text/html');
        res.send(modifiedHtml);

    } catch (error: any) {
        logger.error('[Proxy] Error fetching page:', error.message);
        res.status(500).send(`
            <html>
                <body style="font-family: system-ui; padding: 40px; background: #1a1a2e; color: white;">
                    <h1>Error Loading Page</h1>
                    <p>${escapeHtml(String(error.message))}</p>
                    <p>URL: ${escapeHtml(session.currentUrl)}</p>
                </body>
            </html>
        `);
    }
});

/**
 * Proxy static assets (CSS, JS, images)
 */
router.get('/:sessionId/asset', async (req: Request, res: Response) => {
    const { sessionId } = req.params;
    const { url } = req.query;

    const session = proxySessions.get(sessionId);
    if (!session) {
        return res.status(404).send('Session not found');
    }

    try {
        let assetUrl = url as string;
        if (assetUrl.startsWith('/')) {
            assetUrl = session.baseUrl + assetUrl;
        } else if (!assetUrl.startsWith('http')) {
            assetUrl = new URL(assetUrl, session.currentUrl).href;
        }

        const response = await axios.get(assetUrl, {
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            }
        });

        // Forward content type
        const contentType = response.headers['content-type'];
        if (contentType) {
            res.setHeader('Content-Type', contentType);
        }

        res.send(response.data);
    } catch (error: any) {
        res.status(500).send('Asset not found');
    }
});

export default router;
