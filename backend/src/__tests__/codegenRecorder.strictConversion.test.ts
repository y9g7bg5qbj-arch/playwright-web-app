import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../services/recordingPersistence.service', () => ({
    recordingPersistenceService: {
        createSession: vi.fn(),
        addStep: vi.fn(),
        completeSession: vi.fn(),
        failSession: vi.fn(),
        getSessionWithSteps: vi.fn(),
        generateVeroFromSteps: vi.fn(),
    },
    CreateStepDTO: {},
}));

import { recordingPersistenceService } from '../services/recordingPersistence.service';
import { CodegenRecorderService } from '../services/codegenRecorder.service';

type MockRegistry = {
    getOrCreatePage: ReturnType<typeof vi.fn>;
    findBySelector: ReturnType<typeof vi.fn>;
    addField: ReturnType<typeof vi.fn>;
    persist: ReturnType<typeof vi.fn>;
    getPageContent: ReturnType<typeof vi.fn>;
    checkForDuplicate: ReturnType<typeof vi.fn>;
};

function createRegistry(): MockRegistry {
    return {
        getOrCreatePage: vi.fn(() => ({ name: 'StrictPage' })),
        findBySelector: vi.fn(() => null),
        addField: vi.fn((_pageName: string, _fieldName: string, selector: string) => ({
            pageName: 'StrictPage',
            fieldName: 'generatedField',
            selector,
        })),
        persist: vi.fn(async () => '/tmp/StrictPage.vero'),
        getPageContent: vi.fn(() => 'PAGE StrictPage { FIELD generatedField = role "button" }'),
        checkForDuplicate: vi.fn(() => ({ isDuplicate: false })),
    };
}

function createSession(registry: MockRegistry, overrides: Record<string, unknown> = {}): any {
    return {
        sessionId: 'session-1',
        dbSessionId: undefined,
        codegenProcess: {} as any,
        outputFile: '/tmp/out.js',
        lastCode: '',
        lastLineCount: 0,
        url: 'https://example.com',
        registry,
        scenarioName: 'StrictScenario',
        stepCount: 0,
        ...overrides,
    };
}

describe('CodegenRecorderService strict conversion', () => {
    let service: any;

    beforeEach(() => {
        service = new CodegenRecorderService('/tmp/test-project');
        vi.clearAllMocks();
    });

    it('keeps modifier-bearing selector exactly when creating fields', async () => {
        const registry = createRegistry();
        const session = createSession(registry);
        const action = {
            type: 'click',
            selector: 'role "button" FIRST',
            originalLine: 'await page.getByRole("button").first().click();',
        };

        const result = await service.convertToVero(action, session);

        expect(registry.addField).toHaveBeenCalledWith(
            'StrictPage',
            expect.any(String),
            'role "button" FIRST'
        );
        expect(result?.veroCode).toContain('CLICK StrictPage.');
    });

    it('does not call fuzzy duplicate check for /api/codegen conversion', async () => {
        const registry = createRegistry();
        const session = createSession(registry);
        const action = {
            type: 'click',
            selector: 'css "#upload-input"',
            originalLine: 'await page.locator("#upload-input").click();',
        };

        await service.convertToVero(action, session);

        expect(registry.checkForDuplicate).not.toHaveBeenCalled();
    });

    it('reuses exact selector match and does not create a new field', async () => {
        const registry = createRegistry();
        registry.findBySelector.mockReturnValue({
            pageName: 'StrictPage',
            fieldName: 'existingField',
            selector: 'role "button" name "Submit"',
        });
        const session = createSession(registry);
        const action = {
            type: 'click',
            selector: 'role "button" name "Submit"',
            originalLine: 'await page.getByRole("button", { name: "Submit" }).click();',
        };

        const result = await service.convertToVero(action, session);

        expect(registry.addField).not.toHaveBeenCalled();
        expect(registry.persist).not.toHaveBeenCalled();
        expect(result?.veroCode).toBe('CLICK StrictPage.existingField');
    });

    it('persists raw parsed selector and direct selectorType for role locators', async () => {
        const registry = createRegistry();
        const session = createSession(registry, { dbSessionId: 'db-1' });
        const onAction = vi.fn();

        vi.spyOn(service, 'convertToVero').mockResolvedValue({
            veroCode: 'CLICK StrictPage.generatedField',
            fieldCreated: { pageName: 'StrictPage', fieldName: 'generatedField' },
        });

        const code = 'await page.getByRole("button", { name: "Submit" }).click();';
        await service.processCodeChanges(session, code, onAction);

        expect(recordingPersistenceService.addStep).toHaveBeenCalledWith(
            expect.objectContaining({
                sessionId: 'db-1',
                primarySelector: 'role "button" name "Submit"',
                selectorType: 'role',
                fallbackSelectors: [],
            })
        );
    });

    it('persists raw parsed selector and css selectorType for locator()', async () => {
        const registry = createRegistry();
        const session = createSession(registry, { dbSessionId: 'db-2' });
        const onAction = vi.fn();

        vi.spyOn(service, 'convertToVero').mockResolvedValue({
            veroCode: 'CLICK StrictPage.generatedField',
            fieldCreated: { pageName: 'StrictPage', fieldName: 'generatedField' },
        });

        const code = 'await page.locator("#upload-input").click();';
        await service.processCodeChanges(session, code, onAction);

        expect(recordingPersistenceService.addStep).toHaveBeenCalledWith(
            expect.objectContaining({
                sessionId: 'db-2',
                primarySelector: 'css "#upload-input"',
                selectorType: 'css',
                fallbackSelectors: [],
            })
        );
    });
});
