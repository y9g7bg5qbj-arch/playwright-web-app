/**
 * NetworkError - Network-related errors
 *
 * These errors occur during network operations, including
 * request failures, timeouts, and connection issues.
 */

import { VeroError, VeroErrorData, ErrorLocation } from '../VeroError.js';

export class NetworkError extends VeroError {
    constructor(data: Omit<VeroErrorData, 'category'>) {
        super({ ...data, category: 'network' });
        this.name = 'NetworkError';
    }

    /**
     * Network offline
     */
    static offline(
        veroStatement: string,
        location?: ErrorLocation
    ): NetworkError {
        return new NetworkError({
            code: 'VERO-901',
            severity: 'error',
            location,
            title: 'Offline',
            whatWentWrong: 'No internet connection is available.',
            howToFix: `The test machine has no network connectivity. Check:
- Your internet connection
- Network settings if running in a container
- Firewall rules`,
            flakiness: 'flaky',
            retryable: true,
            suggestedRetries: 3,
            veroStatement,
            suggestions: [
                { text: 'Check your internet connection', action: 'investigate' },
                { text: 'Try running the test again', action: 'retry' },
            ],
        });
    }

    /**
     * Request failed
     */
    static requestFailed(
        url: string,
        veroStatement: string,
        location?: ErrorLocation,
        reason?: string
    ): NetworkError {
        return new NetworkError({
            code: 'VERO-902',
            severity: 'error',
            location,
            title: 'Request Failed',
            whatWentWrong: `A network request to "${url}" failed.${reason ? ` Reason: ${reason}` : ''}`,
            howToFix: `The network request couldn't complete. This might be due to:
- Server unavailability
- Network connectivity issues
- Request being blocked`,
            flakiness: 'flaky',
            retryable: true,
            suggestedRetries: 3,
            veroStatement,
            suggestions: [
                { text: 'Check if the server is accessible', action: 'investigate' },
                { text: 'Verify network connectivity', action: 'investigate' },
                { text: 'Try running the test again', action: 'retry' },
            ],
        });
    }

    /**
     * CORS error
     */
    static corsBlocked(
        url: string,
        veroStatement: string,
        location?: ErrorLocation
    ): NetworkError {
        return new NetworkError({
            code: 'VERO-903',
            severity: 'error',
            location,
            title: 'CORS Error',
            whatWentWrong: `Request to "${url}" was blocked by browser security (CORS policy).`,
            howToFix: `The browser blocked this request due to cross-origin restrictions. This is a security feature. Solutions:
- Test from the same origin as the API
- Configure CORS headers on the server
- Use a proxy for cross-origin requests`,
            flakiness: 'permanent',
            retryable: false,
            veroStatement,
            suggestions: [
                { text: 'Configure CORS on the server', action: 'investigate' },
                { text: 'Test from the correct origin', action: 'investigate' },
            ],
        });
    }

    /**
     * Request timeout
     */
    static requestTimeout(
        url: string,
        timeoutMs: number,
        veroStatement: string,
        location?: ErrorLocation
    ): NetworkError {
        const seconds = Math.round(timeoutMs / 1000);

        return new NetworkError({
            code: 'VERO-904',
            severity: 'error',
            location,
            title: 'Request Timeout',
            whatWentWrong: `Request to "${url}" timed out after ${seconds} seconds.`,
            howToFix: `The server took too long to respond. This might be due to:
- Server under heavy load
- Slow network connection
- Complex operation taking too long`,
            flakiness: 'flaky',
            retryable: true,
            suggestedRetries: 3,
            veroStatement,
            suggestions: [
                { text: 'Try running the test again', action: 'retry' },
                { text: 'Increase the request timeout', action: 'fix' },
                { text: 'Check server performance', action: 'investigate' },
            ],
        });
    }

    /**
     * WebSocket error
     */
    static webSocketError(
        url: string,
        veroStatement: string,
        location?: ErrorLocation,
        reason?: string
    ): NetworkError {
        return new NetworkError({
            code: 'VERO-905',
            severity: 'error',
            location,
            title: 'WebSocket Error',
            whatWentWrong: `WebSocket connection to "${url}" failed.${reason ? ` Reason: ${reason}` : ''}`,
            howToFix: `The WebSocket connection couldn't be established. Check:
- The WebSocket server is running
- The URL is correct (ws:// or wss://)
- Firewalls allow WebSocket connections`,
            flakiness: 'flaky',
            retryable: true,
            suggestedRetries: 2,
            veroStatement,
            suggestions: [
                { text: 'Verify WebSocket server is running', action: 'investigate' },
                { text: 'Check WebSocket URL format', action: 'investigate' },
            ],
        });
    }
}
