/**
 * Network Node Generators
 * Generate Playwright code for HTTP requests and network interception
 */

import type { FlowNode, GeneratorContext, NodeGenerator } from '@playwright-web-app/shared';
import { interpolateVariables } from '../variableInterpolation';

/**
 * HTTP Request
 * { type: "http-request", data: { method: "POST", url: "/api/users", body: {...}, responseVariable: "response" } }
 * → const response = await page.request.post('/api/users', { data: {...} });
 */
export class HttpRequestGenerator implements NodeGenerator {
    generate(node: FlowNode, ctx: GeneratorContext): string[] {
        const {
            method,
            url,
            headers,
            body,
            bodyType,
            responseVariable,
            statusVariable,
            timeout
        } = node.data;

        const urlCode = interpolateVariables(url || '', ctx);
        const methodLower = (method || 'GET').toLowerCase();

        const opts: string[] = [];

        // Add headers if present
        if (headers && Object.keys(headers).length > 0) {
            opts.push(`headers: ${JSON.stringify(headers)}`);
        }

        // Add body for POST/PUT/PATCH
        if (body && ['post', 'put', 'patch'].includes(methodLower)) {
            if (bodyType === 'json' || typeof body === 'object') {
                opts.push(`data: ${JSON.stringify(body)}`);
            } else if (bodyType === 'form') {
                opts.push(`form: ${JSON.stringify(body)}`);
            } else {
                opts.push(`data: ${interpolateVariables(String(body), ctx)}`);
            }
        }

        if (timeout) {
            opts.push(`timeout: ${timeout}`);
        }

        const optsCode = opts.length ? `, { ${opts.join(', ')} }` : '';

        const lines: string[] = [];
        const respVar = responseVariable || 'response';

        ctx.variables.set(respVar, 'APIResponse');
        lines.push(`const ${respVar} = await page.request.${methodLower}(${urlCode}${optsCode});`);

        if (statusVariable) {
            ctx.variables.set(statusVariable, 'number');
            lines.push(`const ${statusVariable} = ${respVar}.status();`);
        }

        return lines;
    }
}

// Intercept Request
// { type: "intercept-request", data: { urlPattern: "**\/api\/*", action: "fulfill", mockStatus: 200, mockBody: {...} } }
// → await page.route('**\/api\/*', route => route.fulfill({ status: 200, body: JSON.stringify({...}) }));
export class InterceptRequestGenerator implements NodeGenerator {
    generate(node: FlowNode, ctx: GeneratorContext): string[] {
        const {
            urlPattern,
            action,
            mockStatus,
            mockBody,
            mockHeaders
        } = node.data;

        switch (action) {
            case 'abort':
                return [`await page.route('${urlPattern}', route => route.abort());`];

            case 'fulfill':
                const fulfillOpts: string[] = [];
                if (mockStatus) fulfillOpts.push(`status: ${mockStatus}`);
                if (mockBody) {
                    if (typeof mockBody === 'object') {
                        fulfillOpts.push(`body: JSON.stringify(${JSON.stringify(mockBody)})`);
                        fulfillOpts.push(`contentType: 'application/json'`);
                    } else {
                        fulfillOpts.push(`body: ${interpolateVariables(String(mockBody), ctx)}`);
                    }
                }
                if (mockHeaders) {
                    fulfillOpts.push(`headers: ${JSON.stringify(mockHeaders)}`);
                }
                return [`await page.route('${urlPattern}', route => route.fulfill({ ${fulfillOpts.join(', ')} }));`];

            case 'modify':
                return [
                    `await page.route('${urlPattern}', async route => {`,
                    `  const request = route.request();`,
                    `  // Modify request as needed`,
                    `  await route.continue();`,
                    `});`
                ];

            case 'continue':
            default:
                return [`await page.route('${urlPattern}', route => route.continue());`];
        }
    }
}
