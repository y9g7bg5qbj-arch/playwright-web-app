/**
 * Code Generation Service
 * Service layer for generating Playwright code from test flows
 */

import { TestFlowService } from './testFlow.service';
import { CodeGenerator, formatGeneratedCode } from '../codegen';
import type {
    Flow,
    FlowNode,
    FlowEdge,
    GenerateOptions,
    GeneratedCode,
    ExportMode
} from '@playwright-web-app/shared';

export interface ExportOptions {
    mode?: ExportMode;
    includeComments?: boolean;
    testName?: string;
    baseUrl?: string;
    timeout?: number;
    retries?: number;
    browsers?: ('chromium' | 'firefox' | 'webkit')[];
    generateConfig?: boolean;
    format?: boolean;
}

export interface ExportResult {
    files: {
        name: string;
        path: string;
        content: string;
        type: 'test' | 'fixture' | 'config' | 'page-object' | 'data';
    }[];
    metadata: {
        flowId: string;
        flowName: string;
        mode: ExportMode;
        generatedAt: string;
        nodeCount: number;
        edgeCount: number;
    };
}

class CodegenServiceClass {
    private testFlowService: TestFlowService;
    private codeGenerator: CodeGenerator;

    constructor() {
        this.testFlowService = new TestFlowService();
        this.codeGenerator = new CodeGenerator();
    }

    /**
     * Export a test flow to Playwright TypeScript code
     */
    async exportFlow(
        userId: string,
        flowId: string,
        options: ExportOptions = {}
    ): Promise<ExportResult> {
        // Fetch the test flow
        const testFlow = await this.testFlowService.findOne(userId, flowId);

        // Parse nodes and edges from JSON
        const nodes: FlowNode[] = testFlow.nodes ? JSON.parse(testFlow.nodes) : [];
        const edges: FlowEdge[] = testFlow.edges ? JSON.parse(testFlow.edges) : [];

        // Build the flow object
        const flow: Flow = {
            nodes,
            edges,
            name: testFlow.name,
        };

        // Build generation options
        const generateOptions: GenerateOptions = {
            mode: options.mode || 'basic',
            includeComments: options.includeComments ?? true,
            testName: options.testName || testFlow.name,
            baseUrl: options.baseUrl,
            timeout: options.timeout,
            retries: options.retries,
            browsers: options.browsers,
            generateConfig: options.generateConfig ?? false,
        };

        // Generate code
        let generatedCode = this.codeGenerator.generate(flow, generateOptions);

        // Format code if requested
        if (options.format !== false) {
            generatedCode = await formatGeneratedCode(generatedCode);
        }

        // Build result with file metadata
        const files = this.buildFileList(generatedCode, testFlow.name, generateOptions.mode);

        return {
            files,
            metadata: {
                flowId: testFlow.id,
                flowName: testFlow.name,
                mode: generateOptions.mode,
                generatedAt: new Date().toISOString(),
                nodeCount: nodes.length,
                edgeCount: edges.length,
            },
        };
    }

    /**
     * Build the list of generated files
     */
    private buildFileList(
        code: GeneratedCode,
        flowName: string,
        mode: ExportMode
    ): ExportResult['files'] {
        const files: ExportResult['files'] = [];
        const safeName = this.toSafeFileName(flowName);

        // Main test file
        files.push({
            name: `${safeName}.spec.ts`,
            path: `tests/${safeName}.spec.ts`,
            content: code.testFile,
            type: 'test',
        });

        // Fixtures file
        if (code.fixturesFile) {
            files.push({
                name: 'fixtures.ts',
                path: 'tests/fixtures.ts',
                content: code.fixturesFile,
                type: 'fixture',
            });
        }

        // Config file
        if (code.configFile) {
            files.push({
                name: 'playwright.config.ts',
                path: 'playwright.config.ts',
                content: code.configFile,
                type: 'config',
            });
        }

        // Page object files
        if (code.pageObjects) {
            for (const [className, content] of Object.entries(code.pageObjects)) {
                files.push({
                    name: `${className}.ts`,
                    path: `tests/pages/${className}.ts`,
                    content,
                    type: 'page-object',
                });
            }
        }

        // Data files
        if (code.dataFiles) {
            for (const [fileName, content] of Object.entries(code.dataFiles)) {
                files.push({
                    name: fileName,
                    path: `tests/data/${fileName}`,
                    content,
                    type: 'data',
                });
            }
        }

        return files;
    }

    /**
     * Convert flow name to a safe file name
     */
    private toSafeFileName(name: string): string {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 60);
    }

    /**
     * Preview generated code without saving
     */
    async previewFlow(
        userId: string,
        flowId: string,
        options: ExportOptions = {}
    ): Promise<{ testFile: string; mode: ExportMode }> {
        const result = await this.exportFlow(userId, flowId, {
            ...options,
            generateConfig: false,
        });

        const testFile = result.files.find(f => f.type === 'test');

        return {
            testFile: testFile?.content || '',
            mode: result.metadata.mode,
        };
    }

    /**
     * Get available export modes with descriptions
     */
    getExportModes(): { mode: ExportMode; name: string; description: string }[] {
        return [
            {
                mode: 'basic',
                name: 'Basic',
                description: 'Simple inline test code without page objects or fixtures',
            },
            {
                mode: 'pom',
                name: 'Page Object Model',
                description: 'Page Object classes for better organization and reusability',
            },
            {
                mode: 'fixtures',
                name: 'Fixtures Only',
                description: 'Custom Playwright fixtures for setup/teardown',
            },
            {
                mode: 'pom-fixtures',
                name: 'POM + Fixtures (Recommended)',
                description: 'Page Objects injected via fixtures - Playwright best practice',
            },
        ];
    }
}

export const CodegenService = new CodegenServiceClass();
