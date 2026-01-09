import * as XLSX from 'xlsx';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { spawn, ChildProcess } from 'child_process';

interface TestStep {
    id: string;
    type: 'navigate' | 'fill' | 'click' | 'assert' | 'loop' | 'wait';
    description: string;
    code: string;
    status: 'pending' | 'running' | 'success' | 'failed';
}

interface TestCase {
    id: string;
    name: string;
    steps: TestStep[];
    status: 'pending' | 'running' | 'complete' | 'failed';
}

interface ExecutionSession {
    id: string;
    testCases: TestCase[];
    environment: string;
    headless: boolean;
    status: 'running' | 'complete' | 'failed' | 'cancelled';
    process?: ChildProcess;
    currentTestIndex: number;
    currentStepIndex: number;
    startedAt: Date;
    completedAt?: Date;
}

interface StartExecutionParams {
    testCases: Array<{ name: string; steps: string[] }>;
    environment: string;
    headless: boolean;
}

interface RunScriptParams {
    testId: string;
    steps: TestStep[];
    environment: string;
}

interface SaveAsVeroParams {
    testId: string;
    name: string;
    steps: TestStep[];
    targetPath: string;
}

export class AIRecorderService {
    private sessions: Map<string, ExecutionSession> = new Map();

    // Parse Excel file to extract test cases
    async parseExcelTestCases(buffer: Buffer): Promise<TestCase[]> {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convert to JSON - returns array of arrays
        const rows = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1, defval: '' });

        if (rows.length < 2) {
            throw new Error('Excel file must have at least a header row and one data row');
        }

        // Assume format: Test Case Name | Step 1 | Step 2 | ...
        const testCases: TestCase[] = [];

        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || !row[0]) continue;

            const name = row[0];
            const steps: TestStep[] = [];

            for (let j = 1; j < row.length; j++) {
                if (row[j] && row[j].trim()) {
                    steps.push({
                        id: uuidv4(),
                        type: this.parseStepType(row[j]),
                        description: row[j].trim(),
                        code: `// ${row[j].trim()}`,
                        status: 'pending',
                    });
                }
            }

            if (steps.length > 0) {
                testCases.push({
                    id: `TC-${String(testCases.length + 1).padStart(3, '0')}`,
                    name,
                    steps,
                    status: 'pending',
                });
            }
        }

        return testCases;
    }

    // Parse step type from description
    private parseStepType(text: string): TestStep['type'] {
        const lower = text.toLowerCase();
        if (lower.includes('navigate') || lower.includes('go to') || lower.includes('open')) return 'navigate';
        if (lower.includes('fill') || lower.includes('enter') || lower.includes('type')) return 'fill';
        if (lower.includes('click') || lower.includes('press') || lower.includes('tap')) return 'click';
        if (lower.includes('assert') || lower.includes('verify') || lower.includes('check')) return 'assert';
        if (lower.includes('loop') || lower.includes('each') || lower.includes('iterate')) return 'loop';
        if (lower.includes('wait')) return 'wait';
        return 'click';
    }

    // Start AI execution session
    async startAIExecution(params: StartExecutionParams): Promise<string> {
        const sessionId = uuidv4();

        const testCases: TestCase[] = params.testCases.map((tc, i) => ({
            id: `TC-${String(i + 1).padStart(3, '0')}`,
            name: tc.name,
            status: 'pending' as const,
            steps: tc.steps.map((step, j) => ({
                id: uuidv4(),
                type: this.parseStepType(step),
                description: step,
                code: `// ${step}`,
                status: 'pending' as const,
            })),
        }));

        const session: ExecutionSession = {
            id: sessionId,
            testCases,
            environment: params.environment,
            headless: params.headless,
            status: 'running',
            currentTestIndex: 0,
            currentStepIndex: 0,
            startedAt: new Date(),
        };

        this.sessions.set(sessionId, session);

        // Start async execution
        this.executeTestsAsync(sessionId);

        return sessionId;
    }

    // Execute tests asynchronously (simulated for now)
    private async executeTestsAsync(sessionId: string): Promise<void> {
        const session = this.sessions.get(sessionId);
        if (!session) return;

        try {
            for (let t = 0; t < session.testCases.length; t++) {
                if (session.status === 'cancelled') break;

                session.currentTestIndex = t;
                session.testCases[t].status = 'running';

                for (let s = 0; s < session.testCases[t].steps.length; s++) {
                    if (session.status === 'cancelled') break;

                    session.currentStepIndex = s;
                    session.testCases[t].steps[s].status = 'running';

                    // Simulate AI execution (would call LiveExecutionAgent here)
                    await new Promise(resolve => setTimeout(resolve, 1000));

                    // Generate Playwright code
                    session.testCases[t].steps[s].code = this.generatePlaywrightCode(
                        session.testCases[t].steps[s]
                    );

                    session.testCases[t].steps[s].status = 'success';
                }

                session.testCases[t].status = 'complete';
            }

            session.status = 'complete';
            session.completedAt = new Date();
        } catch (error) {
            session.status = 'failed';
            console.error('Execution failed:', error);
        }
    }

    // Generate Playwright code for a step
    private generatePlaywrightCode(step: TestStep): string {
        const desc = step.description.toLowerCase();

        if (step.type === 'navigate') {
            const urlMatch = desc.match(/(?:to|url)\s+['"]?([^'"]+)['"]?/i) ||
                desc.match(/(?:open|go to)\s+(.+)/i);
            const url = urlMatch ? urlMatch[1].trim() : '${baseUrl}';
            return `Navigate to "${url}"`;
        }

        if (step.type === 'fill') {
            const fieldMatch = desc.match(/(?:fill|enter|type)\s+(?:the\s+)?(\w+)\s+(?:field\s+)?(?:with\s+)?['"]?([^'"]+)['"]?/i);
            if (fieldMatch) {
                return `Fill "${fieldMatch[1]}" with "${fieldMatch[2]}"`;
            }
            return `Fill "field" with "value"`;
        }

        if (step.type === 'click') {
            const buttonMatch = desc.match(/click\s+(?:on\s+)?(?:the\s+)?(.+?)(?:\s+button)?$/i);
            const target = buttonMatch ? buttonMatch[1].trim() : 'element';
            return `Click on "${target}"`;
        }

        if (step.type === 'assert') {
            const assertMatch = desc.match(/(?:verify|assert|check)\s+(?:that\s+)?(?:the\s+)?(.+)/i);
            const condition = assertMatch ? assertMatch[1].trim() : 'element is visible';
            return `Assert "${condition}"`;
        }

        if (step.type === 'wait') {
            return `Wait for navigation`;
        }

        if (step.type === 'loop') {
            return `For each item in data {\n    // loop body\n}`;
        }

        return `// ${step.description}`;
    }

    // Get execution status
    async getExecutionStatus(sessionId: string): Promise<{
        status: string;
        testCases: TestCase[];
        currentTestIndex: number;
        currentStepIndex: number;
    }> {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        return {
            status: session.status,
            testCases: session.testCases,
            currentTestIndex: session.currentTestIndex,
            currentStepIndex: session.currentStepIndex,
        };
    }

    // Run generated Playwright script
    async runGeneratedScript(params: RunScriptParams): Promise<{ success: boolean; output: string }> {
        // Generate temporary Playwright test file
        const code = this.generatePlaywrightTestFile(params);

        // For now, just return simulated success
        // In production, would execute via Playwright CLI
        return {
            success: true,
            output: 'Test executed successfully',
        };
    }

    // Generate Playwright test file content
    private generatePlaywrightTestFile(params: RunScriptParams): string {
        const steps = params.steps.map(s => `    ${s.code}`).join('\n');

        return `import { test, expect } from '@playwright/test';

test('${params.testId}', async ({ page }) => {
${steps}
});
`;
    }

    // Save test as .vero file
    async saveAsVero(params: SaveAsVeroParams): Promise<string> {
        const steps = params.steps.map(s => `    ${s.code}`).join('\n');

        const veroContent = `Feature: ${params.name}

Scenario: ${params.name}
${steps}
`;

        const fileName = params.name.toLowerCase().replace(/\s+/g, '_') + '.vero';
        const filePath = path.join(params.targetPath, fileName);

        await fs.writeFile(filePath, veroContent, 'utf-8');

        return filePath;
    }

    // Cancel execution
    async cancelExecution(sessionId: string): Promise<void> {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        session.status = 'cancelled';

        if (session.process) {
            session.process.kill();
        }
    }
}
