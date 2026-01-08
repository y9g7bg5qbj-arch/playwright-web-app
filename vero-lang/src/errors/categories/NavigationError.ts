/**
 * NavigationError - Page navigation errors
 *
 * These errors occur during page navigation, URL loading,
 * or HTTP response handling.
 */

import { VeroError, VeroErrorData, ErrorLocation } from '../VeroError.js';

export class NavigationError extends VeroError {
    constructor(data: Omit<VeroErrorData, 'category'>) {
        super({ ...data, category: 'navigation' });
        this.name = 'NavigationError';
    }

    /**
     * Invalid URL format
     */
    static invalidUrl(
        url: string,
        veroStatement: string,
        location?: ErrorLocation
    ): NavigationError {
        return new NavigationError({
            code: 'VERO-601',
            severity: 'error',
            location,
            title: 'Invalid URL',
            whatWentWrong: `"${url}" is not a valid URL format.`,
            howToFix: `URLs should start with http:// or https:// and contain a valid domain. Example: https://example.com/page`,
            flakiness: 'permanent',
            retryable: false,
            veroStatement,
            suggestions: [
                { text: 'Add https:// at the beginning', action: 'fix' },
                { text: 'Check for typos in the URL', action: 'investigate' },
            ],
        });
    }

    /**
     * DNS resolution failed
     */
    static dnsNotResolved(
        url: string,
        veroStatement: string,
        location?: ErrorLocation
    ): NavigationError {
        // Extract domain from URL
        const domainMatch = url.match(/https?:\/\/([^\/]+)/);
        const domain = domainMatch ? domainMatch[1] : url;

        return new NavigationError({
            code: 'VERO-602',
            severity: 'error',
            location,
            title: 'DNS Failed',
            whatWentWrong: `Could not find the server "${domain}". The domain name could not be resolved.`,
            howToFix: `The website address might be wrong or the site is down. Check:
- The domain name is spelled correctly
- The website is online and accessible
- Your internet connection is working`,
            flakiness: 'flaky',
            retryable: true,
            suggestedRetries: 2,
            veroStatement,
            suggestions: [
                { text: 'Check the URL spelling', action: 'investigate' },
                { text: 'Verify the website is accessible from a browser', action: 'investigate' },
                { text: 'Check your network connection', action: 'investigate' },
            ],
        });
    }

    /**
     * Connection refused
     */
    static connectionRefused(
        url: string,
        veroStatement: string,
        location?: ErrorLocation
    ): NavigationError {
        return new NavigationError({
            code: 'VERO-603',
            severity: 'error',
            location,
            title: 'Connection Refused',
            whatWentWrong: `The server at "${url}" refused the connection.`,
            howToFix: `The server is not accepting connections. This usually means:
- The server is not running
- The port number is wrong
- A firewall is blocking the connection`,
            flakiness: 'flaky',
            retryable: true,
            suggestedRetries: 2,
            veroStatement,
            suggestions: [
                { text: 'Check if the server is running', action: 'investigate' },
                { text: 'Verify the port number in the URL', action: 'investigate' },
                { text: 'Try again in a few moments', action: 'retry' },
            ],
        });
    }

    /**
     * SSL/TLS certificate error
     */
    static sslError(
        url: string,
        veroStatement: string,
        location?: ErrorLocation,
        details?: string
    ): NavigationError {
        return new NavigationError({
            code: 'VERO-604',
            severity: 'error',
            location,
            title: 'SSL Certificate Error',
            whatWentWrong: `The website's security certificate is invalid or untrusted.${details ? ` ${details}` : ''}`,
            howToFix: `The website has a security certificate problem. This might happen with:
- Self-signed certificates (in development environments)
- Expired certificates
- Certificates for a different domain`,
            flakiness: 'permanent',
            retryable: false,
            veroStatement,
            suggestions: [
                { text: 'Enable "ignore HTTPS errors" in test settings', action: 'fix' },
                { text: 'Contact the website administrator about the certificate', action: 'investigate' },
            ],
        });
    }

    /**
     * HTTP error response
     */
    static httpError(
        url: string,
        statusCode: number,
        statusText: string,
        veroStatement: string,
        location?: ErrorLocation
    ): NavigationError {
        const isServerError = statusCode >= 500;

        return new NavigationError({
            code: isServerError ? 'VERO-607' : 'VERO-605',
            severity: 'error',
            location,
            title: isServerError ? `Server Error (${statusCode})` : `HTTP Error (${statusCode})`,
            whatWentWrong: `The server returned an error: ${statusCode} ${statusText}`,
            howToFix: isServerError
                ? `The server encountered an error. This is usually a temporary issue. Try again or contact the site administrator.`
                : `The request was rejected by the server. Check if:
- The URL is correct
- You have permission to access this page
- Any required authentication is in place`,
            flakiness: isServerError ? 'flaky' : 'permanent',
            retryable: isServerError,
            suggestedRetries: isServerError ? 3 : 0,
            veroStatement,
            suggestions: isServerError
                ? [
                    { text: 'Try running the test again', action: 'retry' },
                    { text: 'Check if the server is having issues', action: 'investigate' },
                ]
                : [
                    { text: 'Verify the URL is correct', action: 'investigate' },
                    { text: 'Check authentication requirements', action: 'investigate' },
                ],
        });
    }

    /**
     * Page not found (404)
     */
    static notFound(
        url: string,
        veroStatement: string,
        location?: ErrorLocation
    ): NavigationError {
        return new NavigationError({
            code: 'VERO-606',
            severity: 'error',
            location,
            title: 'Page Not Found (404)',
            whatWentWrong: `The page at "${url}" does not exist.`,
            howToFix: `The URL might be wrong or the page has been moved/deleted. Check:
- The URL is spelled correctly
- The page still exists on the website
- You're using the correct environment (dev/staging/prod)`,
            flakiness: 'permanent',
            retryable: false,
            veroStatement,
            suggestions: [
                { text: 'Check the URL for typos', action: 'investigate' },
                { text: 'Verify the page exists in your environment', action: 'investigate' },
            ],
        });
    }

    /**
     * Network offline
     */
    static offline(
        veroStatement: string,
        location?: ErrorLocation
    ): NavigationError {
        return new NavigationError({
            code: 'VERO-608',
            severity: 'error',
            location,
            title: 'Network Offline',
            whatWentWrong: 'No internet connection is available.',
            howToFix: `Check your network connection and try again. If running in a container, ensure network access is enabled.`,
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
}
