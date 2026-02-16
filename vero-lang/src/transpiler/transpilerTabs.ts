/**
 * Tab operation transpilation functions extracted from the Transpiler class.
 */

import type {
    ExpressionNode,
    SwitchToNewTabStatement,
    SwitchToTabStatement,
    OpenInNewTabStatement,
    CloseTabStatement
} from '../parser/ast.js';
import { camelCase } from './transpilerUtils.js';

export const TAB_WAIT_TIMEOUT_MS = 5000;
export const TAB_WAIT_POLL_MS = 150;

/**
 * Callback interface for helpers that the tab transpiler needs from the main Transpiler.
 */
export interface TabTranspilerHelpers {
    transpileExpression: (expr: ExpressionNode) => string;
    formatMultiline: (lines: string[]) => string;
}

/**
 * Generate re-initialization lines for all page objects after a tab switch.
 * This ensures page objects hold locators bound to the new active page.
 */
export function generatePageObjectReInit(uses: string[]): string[] {
    if (uses.length === 0) return [];
    const lines: string[] = [];
    for (const pageClass of uses) {
        const varName = camelCase(pageClass);
        lines.push(`${varName} = new ${pageClass}(page);`);
    }
    return lines;
}

export function transpileTabOperation(
    statement: SwitchToNewTabStatement | SwitchToTabStatement | OpenInNewTabStatement | CloseTabStatement,
    uses: string[],
    helpers: TabTranspilerHelpers
): string {
    const reInitLines = generatePageObjectReInit(uses);

    if (statement.type === 'SwitchToNewTab') {
        if (statement.url) {
            const urlExpr = helpers.transpileExpression(statement.url);
            const lines = [
                `await test.step('Switch to new tab', async () => {`,
                `  const newPage = await context.newPage();`,
                `  await newPage.goto(${urlExpr});`,
                `  page = newPage;`,
                `  await page.bringToFront();`,
                `  await page.waitForLoadState('domcontentloaded');`,
                `});`,
                ...reInitLines
            ];
            return helpers.formatMultiline(lines);
        }

        const lines = [
            `await test.step('Switch to new tab', async () => {`,
            `  const tabTimeoutMs = ${TAB_WAIT_TIMEOUT_MS};`,
            `  let newPage: typeof page | null = null;`,
            `  const popupCandidates = context.pages().filter((candidate) => candidate !== page);`,
            `  for (const candidate of popupCandidates) {`,
            `    if ((await candidate.opener()) === page) {`,
            `      newPage = candidate;`,
            `      break;`,
            `    }`,
            `  }`,
            `  if (!newPage) {`,
            `    try {`,
            `      const eventPage = await context.waitForEvent('page', {`,
            `        timeout: tabTimeoutMs,`,
            `        predicate: (candidate) => candidate !== page`,
            `      });`,
            `      if (eventPage !== page) {`,
            `        newPage = eventPage;`,
            `      }`,
            `    } catch {`,
            `      // Ignore timeout and throw a clearer error below.`,
            `    }`,
            `  }`,
            `  if (!newPage) {`,
            `    throw new Error('SWITCH TO NEW TAB failed: no new tab found within ' + tabTimeoutMs + 'ms. Ensure the previous step opens a tab.');`,
            `  }`,
            `  page = newPage;`,
            `  await page.bringToFront();`,
            `  await page.waitForLoadState('domcontentloaded');`,
            `});`,
            ...reInitLines
        ];
        return helpers.formatMultiline(lines);
    }

    if (statement.type === 'SwitchToTab') {
        const indexExpr = helpers.transpileExpression(statement.tabIndex);
        const lines = [
            `await test.step('Switch to tab', async () => {`,
            `  const tabTimeoutMs = ${TAB_WAIT_TIMEOUT_MS};`,
            `  const tabPollMs = ${TAB_WAIT_POLL_MS};`,
            `  const requestedIndex = Number(${indexExpr});`,
            `  if (!Number.isInteger(requestedIndex) || requestedIndex < 1) {`,
            `    throw new Error('SWITCH TO TAB expects a positive integer index. Received: ' + requestedIndex);`,
            `  }`,
            `  const deadline = Date.now() + tabTimeoutMs;`,
            `  let pages = context.pages();`,
            `  while (pages.length < requestedIndex && Date.now() < deadline) {`,
            `    await page.waitForTimeout(tabPollMs);`,
            `    pages = context.pages();`,
            `  }`,
            `  if (pages.length < requestedIndex) {`,
            `    throw new Error('SWITCH TO TAB ' + requestedIndex + ' failed: only ' + pages.length + ' tab(s) available.');`,
            `  }`,
            `  page = pages[requestedIndex - 1];`,
            `  await page.bringToFront();`,
            `  await page.waitForLoadState('domcontentloaded');`,
            `});`,
            ...reInitLines
        ];
        return helpers.formatMultiline(lines);
    }

    if (statement.type === 'OpenInNewTab') {
        const urlExpr = helpers.transpileExpression(statement.url);
        const lines = [
            `await test.step('Open in new tab', async () => {`,
            `  const newPage = await context.newPage();`,
            `  await newPage.goto(${urlExpr});`,
            `  page = newPage;`,
            `  await page.bringToFront();`,
            `  await page.waitForLoadState('domcontentloaded');`,
            `});`,
            ...reInitLines
        ];
        return helpers.formatMultiline(lines);
    }

    // CloseTab
    const lines = [
        `await test.step('Close tab', async () => {`,
        `  const pagesBeforeClose = context.pages();`,
        `  const closingIndex = pagesBeforeClose.indexOf(page);`,
        `  await page.close();`,
        `  const pagesAfterClose = context.pages();`,
        `  if (pagesAfterClose.length === 0) {`,
        `    throw new Error('CLOSE TAB failed: no tabs remain open in the current browser context.');`,
        `  }`,
        `  const fallbackIndex = closingIndex >= pagesAfterClose.length`,
        `    ? pagesAfterClose.length - 1`,
        `    : Math.max(closingIndex, 0);`,
        `  page = pagesAfterClose[fallbackIndex];`,
        `  await page.bringToFront();`,
        `  await page.waitForLoadState('domcontentloaded');`,
        `});`,
        ...reInitLines
    ];
    return helpers.formatMultiline(lines);
}
