// Auto-generated from Vero DSL
import { test, expect, Page } from '@playwright/test';

// Debug helper for step-by-step execution
const __debug__ = {
    breakpoints: new Set<number>(),
    currentLine: 0,
    paused: false,

    async beforeStep(line: number, action: string, target?: string): Promise<void> {
        this.currentLine = line;
        if (process.send) {
            process.send({ type: 'step:before', line, action, target });
        }

        if (this.breakpoints.has(line) || this.paused) {
            if (process.send) {
                process.send({ type: 'execution:paused', line });
            }
            await this.waitForResume();
        }
    },

    async afterStep(line: number, action: string, success: boolean = true, duration?: number): Promise<void> {
        if (process.send) {
            process.send({ type: 'step:after', line, action, success, duration });
        }
    },

    async waitForResume(): Promise<void> {
        return new Promise<void>((resolve) => {
            const handler = (msg: any) => {
                if (msg.type === 'resume') {
                    this.paused = false;
                    process.off('message', handler);
                    resolve();
                } else if (msg.type === 'step') {
                    this.paused = true;
                    process.off('message', handler);
                    resolve();
                } else if (msg.type === 'set-breakpoints') {
                    this.breakpoints = new Set(msg.breakpoints);
                } else if (msg.type === 'stop') {
                    process.exit(0);
                }
            };
            process.on('message', handler);
        });
    },

    setBreakpoints(lines: number[]): void {
        this.breakpoints = new Set(lines);
    }
};

// Listen for debug commands from parent process
if (process.send) {
    process.on('message', (msg: any) => {
        if (msg.type === 'set-breakpoints') {
            __debug__.setBreakpoints(msg.breakpoints);
        }
    });
}

// Page Object: LoginPage
const loginpage = {
    emailInput: (page: Page) => page.locator('TEXTBOX "Email"'),
    passwordInput: (page: Page) => page.locator('TEXTBOX "Password"'),
    submitBtn: (page: Page) => page.locator('BUTTON "Sign In"'),

    login: async (page: Page, email: string, password: string) => {
        await page.locator('TEXTBOX "Email"').fill(email);
        await page.locator('TEXTBOX "Password"').fill(password);
        await page.locator('BUTTON "Sign In"').click();
    },
};

test.describe('Login', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
    });

    test('User can login', async ({ page }) => { // @smoke
        await __debug__.beforeStep(1, 'action', undefined);
        const _startTime1 = Date.now();
        try {
            await loginpage.login(page, "test@example.com", "secret");
            await __debug__.afterStep(1, 'action', true, Date.now() - _startTime1);
        } catch (e) {
            await __debug__.afterStep(1, 'action', false, Date.now() - _startTime1);
            throw e;
        }
        await __debug__.beforeStep(2, 'verify', 'Dashboard');
        const _startTime2 = Date.now();
        try {
            await expect(page.getByText('Dashboard')).toBeVisible();
            await __debug__.afterStep(2, 'verify', true, Date.now() - _startTime2);
        } catch (e) {
            await __debug__.afterStep(2, 'verify', false, Date.now() - _startTime2);
            throw e;
        }
    });

});
