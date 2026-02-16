/**
 * Shared types for the Browser Streaming Service modules.
 */

import { Browser, Page, CDPSession, BrowserContext } from 'playwright';
import { ChildProcess } from 'child_process';
import { FSWatcher } from 'fs';
import { PageObjectRegistry } from './pageObjectRegistry';

export interface RecordingSession {
    sessionId: string;
    browser: Browser;
    context: BrowserContext;
    page: Page;
    cdp: CDPSession;
    codegenProcess: ChildProcess;
    outputFile: string;
    fileWatcher?: FSWatcher;
    lastCodeLength: number;
    url: string;
    registry: PageObjectRegistry;
    scenarioName?: string;
    stepCount: number;
    captureScreenshots: boolean;
}

export interface PageObjectEntry {
    pageName: string;
    selectorName: string;
    rawSelector: string;
    playwrightLocator: string;
}

export interface ParsedAction {
    type: 'click' | 'fill' | 'check' | 'select' | 'goto' | 'press' | 'expect' | 'unknown';
    playwrightLocator: string;
    rawSelector: string;
    value?: string;
    originalLine: string;
}

export interface ElementInfo {
    tagName: string;
    id?: string;
    className?: string;
    name?: string;
    text?: string;
    role?: string;
    ariaLabel?: string;
    testId?: string;
    placeholder?: string;
    inputType?: string;
    href?: string;
    title?: string;
    value?: string;
}

export interface CapturedAction {
    type: 'click' | 'fill' | 'check' | 'select' | 'keypress';
    element: ElementInfo;
    value?: string;
    key?: string;
    timestamp: number;
}

export interface RGBAColor {
    r: number;
    g: number;
    b: number;
    a: number;
}
