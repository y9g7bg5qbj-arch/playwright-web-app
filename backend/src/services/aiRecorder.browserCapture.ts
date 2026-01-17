/**
 * AI Recorder Browser Capture Service
 *
 * Captures user browser interactions and converts them to Vero code.
 * Used when user takes over from AI during stuck state.
 *
 * Features:
 * - Single-step capture (replace one step)
 * - Manual recording mode (capture multiple steps)
 * - Browser event to Vero code conversion
 */

import { Page, BrowserContext } from 'playwright';
import { EventEmitter } from 'events';
import { logger } from '../utils/logger';

export interface CapturedAction {
  type: 'click' | 'fill' | 'select' | 'check' | 'uncheck' | 'navigate' | 'hover' | 'press';
  target: string;
  selector: string;
  value?: string;
  veroCode: string;
  timestamp: number;
  screenshot?: string;
}

export interface CaptureSession {
  sessionId: string;
  testCaseId: string;
  stepId?: string; // If set, replace this specific step
  mode: 'single' | 'manual'; // single = one action, manual = multiple until done
  isActive: boolean;
  capturedActions: CapturedAction[];
  page?: Page;
  context?: BrowserContext;
}

class BrowserCaptureService extends EventEmitter {
  private activeSessions: Map<string, CaptureSession> = new Map();

  /**
   * Start capturing browser actions
   */
  async startCapture(
    sessionId: string,
    testCaseId: string,
    stepId: string | undefined,
    mode: 'single' | 'manual',
    page: Page,
    context: BrowserContext
  ): Promise<void> {
    const captureKey = `${sessionId}:${testCaseId}`;

    // Stop any existing capture for this test case
    if (this.activeSessions.has(captureKey)) {
      await this.stopCapture(sessionId, testCaseId);
    }

    const captureSession: CaptureSession = {
      sessionId,
      testCaseId,
      stepId,
      mode,
      isActive: true,
      capturedActions: [],
      page,
      context,
    };

    this.activeSessions.set(captureKey, captureSession);

    // Set up event listeners on the page
    this.setupPageListeners(captureSession);

    logger.info('Browser capture started', { sessionId, testCaseId, stepId, mode });

    this.emit('capture:started', {
      sessionId,
      testCaseId,
      stepId,
      mode,
    });
  }

  /**
   * Stop capturing and return captured actions
   */
  async stopCapture(sessionId: string, testCaseId: string): Promise<CapturedAction[]> {
    const captureKey = `${sessionId}:${testCaseId}`;
    const session = this.activeSessions.get(captureKey);

    if (!session) {
      return [];
    }

    session.isActive = false;

    // Remove event listeners
    this.removePageListeners(session);

    const actions = [...session.capturedActions];
    this.activeSessions.delete(captureKey);

    logger.info('Browser capture stopped', {
      sessionId,
      testCaseId,
      actionsCount: actions.length,
    });

    this.emit('capture:stopped', {
      sessionId,
      testCaseId,
      actions,
    });

    return actions;
  }

  /**
   * Set up Playwright page event listeners for capturing
   */
  private setupPageListeners(session: CaptureSession): void {
    const { page } = session;
    if (!page) return;

    // Use page.on to listen for console messages that our injected script sends
    // This approach works because we inject a script that reports user interactions

    // Inject capture script into the page
    page.evaluate(() => {
      // Avoid double injection
      if ((window as any).__veroCaptureActive) return;
      (window as any).__veroCaptureActive = true;

      const captureEvent = (type: string, target: Element, value?: string) => {
        const getSelector = (el: Element): string => {
          // Try to get a meaningful selector
          if (el.id) return `#${el.id}`;
          if (el.getAttribute('data-testid')) return `[data-testid="${el.getAttribute('data-testid')}"]`;
          if (el.getAttribute('name')) return `[name="${el.getAttribute('name')}"]`;
          if (el.getAttribute('aria-label')) return `[aria-label="${el.getAttribute('aria-label')}"]`;

          // For buttons and links, use text content
          const tagName = el.tagName.toLowerCase();
          if ((tagName === 'button' || tagName === 'a') && el.textContent?.trim()) {
            const text = el.textContent.trim().substring(0, 30);
            return `${tagName}:has-text("${text}")`;
          }

          // For inputs, use placeholder or label
          if (tagName === 'input') {
            const placeholder = el.getAttribute('placeholder');
            if (placeholder) return `input[placeholder="${placeholder}"]`;

            // Look for associated label
            const id = el.id;
            if (id) {
              const label = document.querySelector(`label[for="${id}"]`);
              if (label?.textContent) {
                return `input:near(label:has-text("${label.textContent.trim()}"))`;
              }
            }
          }

          // Fallback to tag name with index
          const siblings = el.parentElement?.querySelectorAll(tagName) || [];
          const index = Array.from(siblings).indexOf(el);
          return `${tagName}:nth-of-type(${index + 1})`;
        };

        const getTargetDescription = (el: Element): string => {
          const tagName = el.tagName.toLowerCase();

          // Try to get descriptive text
          const text = el.textContent?.trim().substring(0, 50);
          const ariaLabel = el.getAttribute('aria-label');
          const placeholder = el.getAttribute('placeholder');
          const name = el.getAttribute('name');

          if (ariaLabel) return ariaLabel;
          if (tagName === 'button' && text) return `"${text}" button`;
          if (tagName === 'a' && text) return `"${text}" link`;
          if (tagName === 'input') {
            if (placeholder) return `"${placeholder}" field`;
            if (name) return `"${name}" field`;
            const inputType = el.getAttribute('type') || 'text';
            return `${inputType} input`;
          }
          if (text) return `"${text}"`;

          return tagName;
        };

        const detail = {
          type,
          selector: getSelector(target),
          target: getTargetDescription(target),
          value,
          timestamp: Date.now(),
        };

        // Send to Playwright via console
        console.log('__VERO_CAPTURE__', JSON.stringify(detail));
      };

      // Click handler
      document.addEventListener('click', (e) => {
        const target = e.target as Element;
        if (target) captureEvent('click', target);
      }, true);

      // Input handler (for fills)
      document.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        if (target && target.value !== undefined) {
          // Debounce input events
          clearTimeout((target as any).__veroInputTimeout);
          (target as any).__veroInputTimeout = setTimeout(() => {
            captureEvent('fill', target, target.value);
          }, 500);
        }
      }, true);

      // Change handler (for selects and checkboxes)
      document.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement | HTMLSelectElement;
        if (target) {
          if (target.tagName === 'SELECT') {
            captureEvent('select', target, (target as HTMLSelectElement).value);
          } else if (target.type === 'checkbox') {
            captureEvent(target.checked ? 'check' : 'uncheck', target);
          }
        }
      }, true);

      // Keyboard handler (for special keys)
      document.addEventListener('keydown', (e) => {
        const specialKeys = ['Enter', 'Escape', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
        if (specialKeys.includes(e.key)) {
          captureEvent('press', e.target as Element, e.key);
        }
      }, true);
    }).catch((err) => {
      logger.warn('Failed to inject capture script:', err);
    });

    // Listen for our capture events via console
    page.on('console', async (msg) => {
      const text = msg.text();
      if (text.startsWith('__VERO_CAPTURE__')) {
        try {
          const jsonStr = text.replace('__VERO_CAPTURE__', '').trim();
          const data = JSON.parse(jsonStr);
          await this.handleCapturedEvent(session, data);
        } catch (err) {
          logger.warn('Failed to parse capture event:', err);
        }
      }
    });

    // Also listen for navigation
    page.on('framenavigated', async (frame) => {
      if (frame === page.mainFrame() && session.isActive) {
        const url = frame.url();
        // Don't capture about:blank or initial loads
        if (url && !url.startsWith('about:')) {
          await this.handleCapturedEvent(session, {
            type: 'navigate',
            selector: '',
            target: url,
            value: url,
            timestamp: Date.now(),
          });
        }
      }
    });
  }

  /**
   * Remove event listeners from page
   */
  private removePageListeners(session: CaptureSession): void {
    const { page } = session;
    if (!page) return;

    // Clean up the injected script
    page.evaluate(() => {
      (window as any).__veroCaptureActive = false;
    }).catch(() => {
      // Page might be closed, ignore
    });
  }

  /**
   * Handle a captured browser event
   */
  private async handleCapturedEvent(
    session: CaptureSession,
    data: {
      type: string;
      selector: string;
      target: string;
      value?: string;
      timestamp: number;
    }
  ): Promise<void> {
    if (!session.isActive) return;

    // Convert to Vero code
    const veroCode = this.toVeroCode(data.type, data.target, data.value);

    // Take screenshot
    let screenshot: string | undefined;
    try {
      if (session.page) {
        const buffer = await session.page.screenshot({ type: 'png' });
        screenshot = `data:image/png;base64,${buffer.toString('base64')}`;
      }
    } catch (err) {
      logger.warn('Failed to take screenshot:', err);
    }

    const action: CapturedAction = {
      type: data.type as CapturedAction['type'],
      target: data.target,
      selector: data.selector,
      value: data.value,
      veroCode,
      timestamp: data.timestamp,
      screenshot,
    };

    session.capturedActions.push(action);

    logger.info('Action captured', {
      sessionId: session.sessionId,
      testCaseId: session.testCaseId,
      type: action.type,
      target: action.target,
    });

    // Emit the captured action
    this.emit('capture:action', {
      sessionId: session.sessionId,
      testCaseId: session.testCaseId,
      stepId: session.stepId,
      action,
    });

    // In single mode, stop after one action
    if (session.mode === 'single') {
      await this.stopCapture(session.sessionId, session.testCaseId);
    }
  }

  /**
   * Convert browser action to Vero code
   */
  private toVeroCode(type: string, target: string, value?: string): string {
    switch (type) {
      case 'click':
        return `click ${target}`;

      case 'fill':
        if (value !== undefined) {
          // Escape quotes in value
          const escapedValue = value.replace(/"/g, '\\"');
          return `fill ${target} with "${escapedValue}"`;
        }
        return `fill ${target} with ""`;

      case 'select':
        if (value !== undefined) {
          return `select ${target} option "${value}"`;
        }
        return `select ${target} option ""`;

      case 'check':
        return `check ${target}`;

      case 'uncheck':
        return `uncheck ${target}`;

      case 'navigate':
        if (value) {
          return `navigate to "${value}"`;
        }
        return `navigate to ${target}`;

      case 'hover':
        return `hover over ${target}`;

      case 'press':
        if (value) {
          return `press "${value}"`;
        }
        return `press "Enter"`;

      default:
        return `// Unknown action: ${type} on ${target}`;
    }
  }

  /**
   * Check if capture is active for a session
   */
  isCapturing(sessionId: string, testCaseId: string): boolean {
    const captureKey = `${sessionId}:${testCaseId}`;
    const session = this.activeSessions.get(captureKey);
    return session?.isActive || false;
  }

  /**
   * Get current capture session
   */
  getCaptureSession(sessionId: string, testCaseId: string): CaptureSession | undefined {
    const captureKey = `${sessionId}:${testCaseId}`;
    return this.activeSessions.get(captureKey);
  }
}

export const browserCaptureService = new BrowserCaptureService();
