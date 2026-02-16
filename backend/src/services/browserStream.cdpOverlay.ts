/**
 * CDP Overlay helpers for the Browser Streaming Service.
 *
 * Provides element highlighting via Chrome DevTools Protocol,
 * including selector validation feedback and hover inspection.
 */

import { validateSelector, SelectorValidationResult } from './selectorHealing';
import { findElementByVeroSelector } from './browserStream.selectorConverter';
import { RGBAColor, RecordingSession } from './browserStream.types';
import { logger } from '../utils/logger';

/**
 * Highlight an element on the page using CDP Overlay.
 */
export async function highlightElement(
    session: RecordingSession,
    selector: string,
    options: {
        color?: RGBAColor;
        borderColor?: RGBAColor;
        showInfo?: boolean;
        durationMs?: number;
    } = {}
): Promise<boolean> {
    const {
        color = { r: 66, g: 133, b: 244, a: 0.3 },
        borderColor = { r: 66, g: 133, b: 244, a: 1 },
        durationMs = 2000
    } = options;

    try {
        await session.cdp.send('Overlay.enable');

        const element = await findElementByVeroSelector(session.page, selector);
        if (!element) {
            logger.debug(`[BrowserStream] Element not found for highlight: ${selector}`);
            return false;
        }

        const box = await element.boundingBox();
        if (!box) {
            logger.debug(`[BrowserStream] Element has no bounding box: ${selector}`);
            return false;
        }

        await session.cdp.send('Overlay.highlightRect', {
            x: Math.round(box.x),
            y: Math.round(box.y),
            width: Math.round(box.width),
            height: Math.round(box.height),
            color,
            outlineColor: borderColor
        });

        if (durationMs > 0) {
            setTimeout(async () => {
                try {
                    await session.cdp.send('Overlay.hideHighlight');
                } catch {
                    // Session may have ended
                }
            }, durationMs);
        }

        return true;
    } catch (e) {
        logger.warn(`[BrowserStream] Failed to highlight element:`, e);
        return false;
    }
}

/**
 * Highlight an element by its coordinates (for immediate feedback during recording).
 */
export async function highlightAtPoint(
    session: RecordingSession,
    x: number,
    y: number,
    options: {
        color?: RGBAColor;
        borderColor?: RGBAColor;
        durationMs?: number;
    } = {}
): Promise<boolean> {
    const {
        color = { r: 76, g: 175, b: 80, a: 0.3 },
        borderColor = { r: 76, g: 175, b: 80, a: 1 },
        durationMs = 1000
    } = options;

    try {
        await session.cdp.send('Overlay.enable');

        const { nodeId } = await session.cdp.send('DOM.getNodeForLocation', {
            x: Math.round(x),
            y: Math.round(y)
        });

        if (nodeId) {
            await session.cdp.send('Overlay.highlightNode', {
                nodeId,
                highlightConfig: {
                    contentColor: color,
                    borderColor,
                    showInfo: true,
                    showExtensionLines: false
                }
            });

            if (durationMs > 0) {
                setTimeout(async () => {
                    try {
                        await session.cdp.send('Overlay.hideHighlight');
                    } catch {
                        // Session may have ended
                    }
                }, durationMs);
            }

            return true;
        }

        return false;
    } catch (e) {
        logger.warn(`[BrowserStream] Failed to highlight at point:`, e);
        return false;
    }
}

/**
 * Hide all highlights.
 */
export async function hideHighlight(session: RecordingSession): Promise<boolean> {
    try {
        await session.cdp.send('Overlay.hideHighlight');
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Enable or disable hover highlight (shows element info on hover).
 */
export async function enableHoverHighlight(
    session: RecordingSession,
    enabled: boolean = true
): Promise<boolean> {
    try {
        if (enabled) {
            await session.cdp.send('Overlay.enable');
            await session.cdp.send('Overlay.setInspectMode', {
                mode: 'searchForNode',
                highlightConfig: {
                    contentColor: { r: 111, g: 168, b: 220, a: 0.66 },
                    paddingColor: { r: 147, g: 196, b: 125, a: 0.55 },
                    borderColor: { r: 255, g: 229, b: 153, a: 0.66 },
                    marginColor: { r: 246, g: 178, b: 107, a: 0.66 },
                    showInfo: true,
                    showExtensionLines: true
                }
            });
        } else {
            await session.cdp.send('Overlay.setInspectMode', {
                mode: 'none',
                highlightConfig: {}
            });
        }
        return true;
    } catch (e) {
        logger.warn(`[BrowserStream] Failed to toggle hover highlight:`, e);
        return false;
    }
}

/**
 * Highlight with selector validation feedback.
 * Shows green for valid, red for invalid, yellow for non-unique.
 */
export async function highlightWithValidation(
    session: RecordingSession,
    selector: string,
    durationMs: number = 2000
): Promise<{
    highlighted: boolean;
    validation: SelectorValidationResult | null;
}> {
    const validation = await validateSelector(session.page, selector);

    let color: RGBAColor;
    let borderColor: RGBAColor;

    if (!validation.isValid) {
        color = { r: 244, g: 67, b: 54, a: 0.3 };
        borderColor = { r: 244, g: 67, b: 54, a: 1 };
    } else if (!validation.isUnique) {
        color = { r: 255, g: 193, b: 7, a: 0.3 };
        borderColor = { r: 255, g: 193, b: 7, a: 1 };
    } else {
        color = { r: 76, g: 175, b: 80, a: 0.3 };
        borderColor = { r: 76, g: 175, b: 80, a: 1 };
    }

    const highlighted = await highlightElement(session, selector, {
        color,
        borderColor,
        durationMs
    });

    return { highlighted, validation };
}
