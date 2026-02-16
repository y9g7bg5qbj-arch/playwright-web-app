/**
 * Advanced Node Generators
 * Generate Playwright code for advanced operations (JS execution, dialogs, downloads, device emulation)
 */

import type { FlowNode, GeneratorContext, NodeGenerator } from '@playwright-web-app/shared';
import { interpolateVariables } from '../variableInterpolation';

/**
 * Run JavaScript
 * { type: "run-javascript", data: { code: "return document.title", returnVariable: "title" } }
 * → const title = await page.evaluate(() => { return document.title });
 */
export class RunJavaScriptGenerator implements NodeGenerator {
    generate(node: FlowNode, ctx: GeneratorContext): string[] {
        const { code, returnVariable } = node.data;

        if (returnVariable) {
            ctx.variables.set(returnVariable, 'any');
            return [`const ${returnVariable} = await page.evaluate(() => { ${code} });`];
        }

        return [`await page.evaluate(() => { ${code} });`];
    }
}

/**
 * Handle Dialog
 * { type: "handle-dialog", data: { action: "accept", promptText: "Hello", messageVariable: "dialogMsg" } }
 * → page.on('dialog', async dialog => {
 * →   await dialog.accept('Hello');
 * → });
 */
export class HandleDialogGenerator implements NodeGenerator {
    generate(node: FlowNode, ctx: GeneratorContext): string[] {
        const { action, promptText, messageVariable } = node.data;

        const lines: string[] = [];

        if (messageVariable) {
            ctx.variables.set(messageVariable, 'string');
            lines.push(`let ${messageVariable}: string;`);
        }

        lines.push(`page.on('dialog', async dialog => {`);

        if (messageVariable) {
            lines.push(`  ${messageVariable} = dialog.message();`);
        }

        if (action === 'dismiss') {
            lines.push(`  await dialog.dismiss();`);
        } else {
            if (promptText) {
                lines.push(`  await dialog.accept('${promptText}');`);
            } else {
                lines.push(`  await dialog.accept();`);
            }
        }

        lines.push(`});`);

        return lines;
    }
}

/**
 * Handle Download
 * { type: "handle-download", data: { savePath: "./downloads/file.pdf", pathVariable: "downloadPath" } }
 * → const [download] = await Promise.all([
 * →   page.waitForEvent('download'),
 * →   // Click download button should be the next action
 * → ]);
 * → await download.saveAs('./downloads/file.pdf');
 */
export class HandleDownloadGenerator implements NodeGenerator {
    generate(node: FlowNode, ctx: GeneratorContext): string[] {
        const { savePath, pathVariable } = node.data;

        const lines: string[] = [];

        lines.push(`const download = await page.waitForEvent('download');`);

        if (savePath) {
            const path = interpolateVariables(savePath, ctx);
            lines.push(`await download.saveAs(${path});`);
        }

        if (pathVariable) {
            ctx.variables.set(pathVariable, 'string');
            lines.push(`const ${pathVariable} = await download.path();`);
        }

        return lines;
    }
}

/**
 * Emulate Device
 * { type: "emulate-device", data: { device: "iPhone 12" } }
 * → // Device emulation should be set in browser context
 * → // Using devices['iPhone 12']
 */
export class EmulateDeviceGenerator implements NodeGenerator {
    generate(node: FlowNode, _ctx: GeneratorContext): string[] {
        const { device, customWidth, customHeight, customUserAgent } = node.data;

        if (device === 'custom') {
            const lines = [
                `await page.setViewportSize({ width: ${customWidth || 1280}, height: ${customHeight || 720} });`
            ];
            if (customUserAgent) {
                lines.push(`// User agent should be set at context level`);
            }
            return lines;
        }

        return [
            `// Device '${device}' should be set at browser context level`,
            `// Use: const context = await browser.newContext(devices['${device}']);`
        ];
    }
}

/**
 * Set Viewport Size
 * { type: "set-viewport", data: { width: 1920, height: 1080 } }
 * → await page.setViewportSize({ width: 1920, height: 1080 });
 */
export class SetViewportGenerator implements NodeGenerator {
    generate(node: FlowNode, _ctx: GeneratorContext): string[] {
        const { width, height } = node.data;
        return [`await page.setViewportSize({ width: ${width || 1280}, height: ${height || 720} });`];
    }
}

/**
 * Sub-Flow (Call another flow)
 * { type: "sub-flow", data: { flowId: "abc123", parameters: {...} } }
 * → // Execute sub-flow: abc123
 * → await subFlows.abc123(page, {...});
 */
export class SubFlowGenerator implements NodeGenerator {
    generate(node: FlowNode, _ctx: GeneratorContext): string[] {
        const { flowId, parameters } = node.data;

        const paramsCode = parameters ? `, ${JSON.stringify(parameters)}` : '';

        return [
            `// Execute sub-flow: ${flowId}`,
            `await subFlows['${flowId}'](page${paramsCode});`
        ];
    }
}

/**
 * Launch Browser (for non-test scripts)
 * { type: "launch-browser", data: { browser: "chromium", headless: false } }
 * → const browser = await chromium.launch({ headless: false });
 */
export class LaunchBrowserGenerator implements NodeGenerator {
    generate(node: FlowNode, _ctx: GeneratorContext): string[] {
        const { browser, headless, slowMo, devtools } = node.data;

        const opts: string[] = [];
        if (headless !== undefined) opts.push(`headless: ${headless}`);
        if (slowMo) opts.push(`slowMo: ${slowMo}`);
        if (devtools) opts.push(`devtools: true`);

        const optsCode = opts.length ? `{ ${opts.join(', ')} }` : '';

        return [`const browser = await ${browser || 'chromium'}.launch(${optsCode});`];
    }
}

/**
 * New Context
 * { type: "new-context", data: { viewport: { width: 1280, height: 720 } } }
 * → const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
 */
export class NewContextGenerator implements NodeGenerator {
    generate(node: FlowNode, _ctx: GeneratorContext): string[] {
        const {
            viewport,
            locale,
            timezone,
            geolocation,
            permissions,
            colorScheme,
            ignoreHTTPSErrors
        } = node.data;

        const opts: string[] = [];

        if (viewport?.width && viewport?.height) {
            opts.push(`viewport: { width: ${viewport.width}, height: ${viewport.height} }`);
        }
        if (locale) opts.push(`locale: '${locale}'`);
        if (timezone) opts.push(`timezoneId: '${timezone}'`);
        if (geolocation?.latitude !== undefined) {
            opts.push(`geolocation: { latitude: ${geolocation.latitude}, longitude: ${geolocation.longitude} }`);
        }
        if (permissions) {
            const permsArray = permissions.split(',').map((p: string) => `'${p.trim()}'`).join(', ');
            opts.push(`permissions: [${permsArray}]`);
        }
        if (colorScheme) opts.push(`colorScheme: '${colorScheme}'`);
        if (ignoreHTTPSErrors) opts.push(`ignoreHTTPSErrors: true`);

        const optsCode = opts.length ? `{ ${opts.join(', ')} }` : '';

        return [`const context = await browser.newContext(${optsCode});`];
    }
}

/**
 * Close Browser
 * { type: "close-browser", data: {} }
 * → await browser.close();
 */
export class CloseBrowserGenerator implements NodeGenerator {
    generate(_node: FlowNode, _ctx: GeneratorContext): string[] {
        return ['await browser.close();'];
    }
}
