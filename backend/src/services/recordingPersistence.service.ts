/**
 * Recording Persistence Service
 *
 * Persists recording sessions to database to survive server restarts.
 * Provides recovery, session management, and step tracking.
 */
import { recordingSessionRepository, recordingStepRepository } from '../db/repositories/mongo';
import { MongoRecordingSession, MongoRecordingStep } from '../db/mongodb';
import { generateVeroScenario, generateVeroFeature, generateVeroPage, toPascalCase } from './veroSyntaxReference';

// Types for creating sessions and steps
export interface CreateSessionDTO {
    testFlowId?: string;
    userId: string;
    startUrl: string;
    scenarioName?: string;
    pageName?: string;
    browserPid?: number;
}

export interface CreateStepDTO {
    sessionId: string;
    stepNumber: number;
    actionType: string;
    veroCode: string;
    primarySelector: string;
    selectorType: string;
    fallbackSelectors?: string[];
    confidence?: number;
    isStable?: boolean;
    value?: string;
    url: string;
    pageName?: string;
    fieldName?: string;
    screenshotPath?: string;
    elementTag?: string;
    elementText?: string;
    boundingBox?: { x: number; y: number; width: number; height: number };
}

export interface SessionWithSteps extends MongoRecordingSession {
    steps: MongoRecordingStep[];
}

class RecordingPersistenceService {
    /**
     * Create a new recording session
     */
    async createSession(data: CreateSessionDTO): Promise<MongoRecordingSession> {
        return recordingSessionRepository.create({
            testFlowId: data.testFlowId,
            userId: data.userId,
            startUrl: data.startUrl,
            scenarioName: data.scenarioName,
            pageName: data.pageName,
            browserPid: data.browserPid,
            status: 'active',
        });
    }

    /**
     * Add a step to an existing session
     */
    async addStep(data: CreateStepDTO): Promise<MongoRecordingStep> {
        return recordingStepRepository.create({
            sessionId: data.sessionId,
            stepNumber: data.stepNumber,
            actionType: data.actionType,
            veroCode: data.veroCode,
            primarySelector: data.primarySelector,
            selectorType: data.selectorType,
            fallbackSelectors: JSON.stringify(data.fallbackSelectors || []),
            confidence: data.confidence || 0,
            isStable: data.isStable ?? true,
            value: data.value,
            url: data.url,
            pageName: data.pageName,
            fieldName: data.fieldName,
            screenshotPath: data.screenshotPath,
            elementTag: data.elementTag,
            elementText: data.elementText,
            boundingBox: data.boundingBox ? JSON.stringify(data.boundingBox) : undefined,
        });
    }

    /**
     * Get a session with all its steps
     */
    async getSessionWithSteps(sessionId: string): Promise<SessionWithSteps | null> {
        const session = await recordingSessionRepository.findById(sessionId);
        if (!session) return null;

        const steps = await recordingStepRepository.findBySessionId(sessionId);
        return { ...session, steps };
    }

    /**
     * Complete a session and save the final Vero code
     */
    async completeSession(sessionId: string, veroCode: string): Promise<MongoRecordingSession | null> {
        return recordingSessionRepository.update(sessionId, {
            status: 'completed',
            veroCode,
            completedAt: new Date(),
        });
    }

    /**
     * Mark a session as failed
     */
    async failSession(sessionId: string, errorMessage: string): Promise<MongoRecordingSession | null> {
        return recordingSessionRepository.update(sessionId, {
            status: 'failed',
            errorMessage,
            completedAt: new Date(),
        });
    }

    /**
     * Generate Vero code from all steps in a session
     * Uses veroSyntaxReference.ts as single source of truth
     */
    async generateVeroFromSteps(sessionId: string): Promise<string> {
        const session = await this.getSessionWithSteps(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }

        // Extract page fields from steps
        const pageFields = this.extractPageFieldsFromSteps(session.steps);

        // Generate PAGE objects
        const pageObjects: string[] = [];
        const pageNames: string[] = [];

        for (const [pageName, fields] of Object.entries(pageFields)) {
            pageNames.push(pageName);
            pageObjects.push(generateVeroPage(pageName, fields));
        }

        // Generate step lines
        const stepLines = session.steps
            .filter(step => step.veroCode)
            .map(step => step.veroCode);

        // Generate SCENARIO
        const scenarioName = toPascalCase(session.scenarioName || 'RecordedScenario');
        const scenarioCode = generateVeroScenario(scenarioName, stepLines);

        // Generate FEATURE
        const featureName = toPascalCase(session.scenarioName || 'RecordedFeature');
        const featureCode = generateVeroFeature(featureName, [scenarioCode], pageNames);

        // Combine all parts
        const parts: string[] = [];
        if (pageObjects.length > 0) {
            parts.push(pageObjects.join('\n\n'));
        }
        parts.push(featureCode);

        return parts.join('\n\n');
    }

    /**
     * Extract page field references from steps' veroCode
     */
    private extractPageFieldsFromSteps(steps: MongoRecordingStep[]): Record<string, Array<{ name: string, selectorType: string, selector: string }>> {
        const pageFields: Record<string, Array<{ name: string, selectorType: string, selector: string }>> = {};

        for (const step of steps) {
            if (!step.veroCode) continue;

            // Match PageName.fieldName patterns
            const matches = step.veroCode.matchAll(/(\w+Page)\.(\w+)/g);

            for (const match of matches) {
                const pageName = match[1];
                const fieldName = match[2];

                if (!pageFields[pageName]) {
                    pageFields[pageName] = [];
                }

                // Check if field already exists
                const exists = pageFields[pageName].some(f => f.name === fieldName);
                if (!exists) {
                    pageFields[pageName].push({
                        name: fieldName,
                        selectorType: step.selectorType || this.inferSelectorType(fieldName),
                        selector: step.primarySelector || fieldName
                    });
                }
            }
        }

        return pageFields;
    }

    /**
     * Infer selector type from field name
     */
    private inferSelectorType(fieldName: string): string {
        const name = fieldName.toLowerCase();
        if (name.includes('button') || name.includes('btn')) return 'button';
        if (name.includes('textbox') || name.includes('input') || name.includes('field')) return 'textbox';
        if (name.includes('link')) return 'link';
        if (name.includes('checkbox') || name.includes('check')) return 'checkbox';
        if (name.includes('text') || name.includes('label')) return 'text';
        return 'text';
    }
}

export const recordingPersistenceService = new RecordingPersistenceService();
