/**
 * Recording Persistence Service
 *
 * Persists recording sessions to database to survive server restarts.
 * Provides recovery, session management, and step tracking.
 */
import { recordingSessionRepository, recordingStepRepository } from '../db/repositories/mongo';
import { MongoRecordingSession, MongoRecordingStep } from '../db/mongodb';
import { generateVeroScenario, generateVeroFeature, generateVeroPage, toPascalCase } from './veroSyntaxReference';
import { logger } from '../utils/logger';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

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
     * Get a session by ID
     */
    async getSession(sessionId: string): Promise<MongoRecordingSession | null> {
        return recordingSessionRepository.findById(sessionId);
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
     * Get all active sessions for a user
     */
    async getActiveSessions(userId: string): Promise<MongoRecordingSession[]> {
        return recordingSessionRepository.findByUserId(userId, 'active');
    }

    /**
     * Recover a session (get all steps for replay)
     */
    async recoverSession(sessionId: string): Promise<MongoRecordingStep[]> {
        return recordingStepRepository.findBySessionId(sessionId);
    }

    /**
     * Update session status
     */
    async updateStatus(
        sessionId: string,
        status: 'active' | 'paused' | 'completed' | 'failed',
        errorMessage?: string
    ): Promise<MongoRecordingSession | null> {
        return recordingSessionRepository.update(sessionId, {
            status,
            errorMessage,
            completedAt: status === 'completed' || status === 'failed' ? new Date() : undefined,
        });
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
     * Pause a session
     */
    async pauseSession(sessionId: string): Promise<MongoRecordingSession | null> {
        return recordingSessionRepository.update(sessionId, { status: 'paused' });
    }

    /**
     * Resume a paused session
     */
    async resumeSession(sessionId: string): Promise<MongoRecordingSession | null> {
        return recordingSessionRepository.update(sessionId, { status: 'active' });
    }

    /**
     * Update the page name for a session
     */
    async updatePageName(sessionId: string, pageName: string): Promise<MongoRecordingSession | null> {
        return recordingSessionRepository.update(sessionId, { pageName });
    }

    /**
     * Get the next step number for a session
     */
    async getNextStepNumber(sessionId: string): Promise<number> {
        const lastStep = await recordingStepRepository.findLastBySessionId(sessionId);
        return (lastStep?.stepNumber ?? -1) + 1;
    }

    /**
     * Delete a session and all its steps
     */
    async deleteSession(sessionId: string): Promise<void> {
        await recordingStepRepository.deleteBySessionId(sessionId);
        await recordingSessionRepository.delete(sessionId);
    }

    /**
     * Get recent sessions for a user
     */
    async getRecentSessions(userId: string, limit = 10): Promise<SessionWithSteps[]> {
        const sessions = await recordingSessionRepository.findByUserIdWithLimit(userId, limit);

        const sessionsWithSteps: SessionWithSteps[] = [];
        for (const session of sessions) {
            const steps = await recordingStepRepository.findBySessionId(session.id);
            sessionsWithSteps.push({ ...session, steps });
        }

        return sessionsWithSteps;
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

    /**
     * Find sessions that may need recovery (active but old)
     */
    async findStaleActiveSessions(maxAgeMinutes = 30): Promise<MongoRecordingSession[]> {
        const cutoffTime = new Date(Date.now() - maxAgeMinutes * 60 * 1000);
        return recordingSessionRepository.findStaleActive(cutoffTime);
    }

    /**
     * Clean up old completed/failed sessions
     */
    async cleanupOldSessions(maxAgeDays = 30): Promise<number> {
        const cutoffTime = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000);
        return recordingSessionRepository.deleteOldCompleted(cutoffTime);
    }

    /**
     * Update step with screenshot path
     */
    async updateStepScreenshot(stepId: string, screenshotPath: string): Promise<MongoRecordingStep | null> {
        return recordingStepRepository.update(stepId, { screenshotPath });
    }

    /**
     * Get session statistics
     */
    async getSessionStats(sessionId: string): Promise<{
        totalSteps: number;
        actionTypes: Record<string, number>;
        pages: string[];
        averageConfidence: number;
    }> {
        const steps = await this.recoverSession(sessionId);

        const actionTypes: Record<string, number> = {};
        const pages = new Set<string>();
        let totalConfidence = 0;

        for (const step of steps) {
            actionTypes[step.actionType] = (actionTypes[step.actionType] || 0) + 1;
            if (step.pageName) {
                pages.add(step.pageName);
            }
            totalConfidence += step.confidence;
        }

        return {
            totalSteps: steps.length,
            actionTypes,
            pages: Array.from(pages),
            averageConfidence: steps.length > 0 ? totalConfidence / steps.length : 0,
        };
    }

    /**
     * Save Page and Feature files to the sandbox filesystem
     * Called when a recording session is finalized
     */
    async saveVeroFilesToSandbox(
        sessionId: string,
        sandboxPath: string
    ): Promise<{
        pagesCreated: string[];
        featureCreated: string | null;
    }> {
        const session = await this.getSessionWithSteps(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }

        const pagesCreated: string[] = [];
        let featureCreated: string | null = null;

        // Extract page fields from steps
        const pageFields = this.extractPageFieldsFromSteps(session.steps);

        // Ensure Pages folder exists
        const pagesDir = join(sandboxPath, 'Pages');
        const featuresDir = join(sandboxPath, 'Features');
        const visualBaselinesDir = join(sandboxPath, 'Resources', 'Visual', 'Baselines');
        const docsDir = join(sandboxPath, 'Resources', 'Docs');

        if (!existsSync(pagesDir)) {
            await mkdir(pagesDir, { recursive: true });
        }
        if (!existsSync(featuresDir)) {
            await mkdir(featuresDir, { recursive: true });
        }
        if (!existsSync(visualBaselinesDir)) {
            await mkdir(visualBaselinesDir, { recursive: true });
        }
        if (!existsSync(docsDir)) {
            await mkdir(docsDir, { recursive: true });
        }

        // Generate and write Page files
        for (const [pageName, fields] of Object.entries(pageFields)) {
            const pageFilePath = join(pagesDir, `${pageName}.vero`);

            // Check if file exists and merge fields if needed
            let existingFields: Array<{ name: string, selectorType: string, selector: string }> = [];
            if (existsSync(pageFilePath)) {
                try {
                    const existingContent = await readFile(pageFilePath, 'utf-8');
                    // Extract existing field names to avoid duplicates
                    const fieldMatches = existingContent.matchAll(/FIELD\s+(\w+)\s*=/g);
                    for (const match of fieldMatches) {
                        existingFields.push({ name: match[1], selectorType: 'text', selector: '' });
                    }
                } catch {
                    // File doesn't exist or can't be read, create new
                }
            }

            // Filter out fields that already exist
            const existingFieldNames = new Set(existingFields.map(f => f.name));
            const newFields = fields.filter(f => !existingFieldNames.has(f.name));

            // If there are new fields to add, regenerate the page
            if (newFields.length > 0 || !existsSync(pageFilePath)) {
                const allFields = [...existingFields.filter(f => f.selector), ...fields];
                const pageContent = generateVeroPage(pageName, allFields);
                await writeFile(pageFilePath, pageContent, 'utf-8');
                pagesCreated.push(pageFilePath);
                logger.info(`[RecordingPersistence] Created/updated Page file: ${pageFilePath}`);
            }
        }

        // Generate and write Feature file
        const pageNames = Object.keys(pageFields);
        if (session.steps.length > 0) {
            const stepLines = session.steps
                .filter(step => step.veroCode)
                .map(step => step.veroCode);

            const scenarioName = toPascalCase(session.scenarioName || 'RecordedScenario');
            const scenarioCode = generateVeroScenario(scenarioName, stepLines);
            const featureName = toPascalCase(session.scenarioName || 'RecordedFeature');
            const featureCode = generateVeroFeature(featureName, [scenarioCode], pageNames);

            const featureFileName = `${featureName}.vero`;
            const featureFilePath = join(featuresDir, featureFileName);
            await writeFile(featureFilePath, featureCode, 'utf-8');
            featureCreated = featureFilePath;
            logger.info(`[RecordingPersistence] Created Feature file: ${featureFilePath}`);
        }

        return { pagesCreated, featureCreated };
    }
}

export const recordingPersistenceService = new RecordingPersistenceService();
