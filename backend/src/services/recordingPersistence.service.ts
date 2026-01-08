/**
 * Recording Persistence Service
 *
 * Persists recording sessions to database to survive server restarts.
 * Provides recovery, session management, and step tracking.
 */
import { prisma } from '../db/prisma';
import { RecordingSession, RecordingStep } from '@prisma/client';

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

export interface SessionWithSteps extends RecordingSession {
    steps: RecordingStep[];
}

class RecordingPersistenceService {
    /**
     * Create a new recording session
     */
    async createSession(data: CreateSessionDTO): Promise<RecordingSession> {
        return prisma.recordingSession.create({
            data: {
                testFlowId: data.testFlowId,
                userId: data.userId,
                startUrl: data.startUrl,
                scenarioName: data.scenarioName,
                pageName: data.pageName,
                browserPid: data.browserPid,
                status: 'active',
            },
        });
    }

    /**
     * Add a step to an existing session
     */
    async addStep(data: CreateStepDTO): Promise<RecordingStep> {
        return prisma.recordingStep.create({
            data: {
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
                boundingBox: data.boundingBox ? JSON.stringify(data.boundingBox) : null,
            },
        });
    }

    /**
     * Get a session by ID
     */
    async getSession(sessionId: string): Promise<RecordingSession | null> {
        return prisma.recordingSession.findUnique({
            where: { id: sessionId },
        });
    }

    /**
     * Get a session with all its steps
     */
    async getSessionWithSteps(sessionId: string): Promise<SessionWithSteps | null> {
        return prisma.recordingSession.findUnique({
            where: { id: sessionId },
            include: {
                steps: {
                    orderBy: { stepNumber: 'asc' },
                },
            },
        });
    }

    /**
     * Get all active sessions for a user
     */
    async getActiveSessions(userId: string): Promise<RecordingSession[]> {
        return prisma.recordingSession.findMany({
            where: {
                userId,
                status: 'active',
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Recover a session (get all steps for replay)
     */
    async recoverSession(sessionId: string): Promise<RecordingStep[]> {
        return prisma.recordingStep.findMany({
            where: { sessionId },
            orderBy: { stepNumber: 'asc' },
        });
    }

    /**
     * Update session status
     */
    async updateStatus(
        sessionId: string,
        status: 'active' | 'paused' | 'completed' | 'failed',
        errorMessage?: string
    ): Promise<RecordingSession> {
        return prisma.recordingSession.update({
            where: { id: sessionId },
            data: {
                status,
                errorMessage,
                completedAt: status === 'completed' || status === 'failed' ? new Date() : null,
            },
        });
    }

    /**
     * Complete a session and save the final Vero code
     */
    async completeSession(sessionId: string, veroCode: string): Promise<RecordingSession> {
        return prisma.recordingSession.update({
            where: { id: sessionId },
            data: {
                status: 'completed',
                veroCode,
                completedAt: new Date(),
            },
        });
    }

    /**
     * Mark a session as failed
     */
    async failSession(sessionId: string, errorMessage: string): Promise<RecordingSession> {
        return prisma.recordingSession.update({
            where: { id: sessionId },
            data: {
                status: 'failed',
                errorMessage,
                completedAt: new Date(),
            },
        });
    }

    /**
     * Pause a session
     */
    async pauseSession(sessionId: string): Promise<RecordingSession> {
        return prisma.recordingSession.update({
            where: { id: sessionId },
            data: { status: 'paused' },
        });
    }

    /**
     * Resume a paused session
     */
    async resumeSession(sessionId: string): Promise<RecordingSession> {
        return prisma.recordingSession.update({
            where: { id: sessionId },
            data: { status: 'active' },
        });
    }

    /**
     * Update the page name for a session
     */
    async updatePageName(sessionId: string, pageName: string): Promise<RecordingSession> {
        return prisma.recordingSession.update({
            where: { id: sessionId },
            data: { pageName },
        });
    }

    /**
     * Get the next step number for a session
     */
    async getNextStepNumber(sessionId: string): Promise<number> {
        const lastStep = await prisma.recordingStep.findFirst({
            where: { sessionId },
            orderBy: { stepNumber: 'desc' },
        });
        return (lastStep?.stepNumber ?? -1) + 1;
    }

    /**
     * Delete a session and all its steps
     */
    async deleteSession(sessionId: string): Promise<void> {
        await prisma.recordingSession.delete({
            where: { id: sessionId },
        });
    }

    /**
     * Get recent sessions for a user
     */
    async getRecentSessions(userId: string, limit = 10): Promise<SessionWithSteps[]> {
        return prisma.recordingSession.findMany({
            where: { userId },
            include: {
                steps: {
                    orderBy: { stepNumber: 'asc' },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
    }

    /**
     * Generate Vero code from all steps in a session
     */
    async generateVeroFromSteps(sessionId: string): Promise<string> {
        const session = await this.getSessionWithSteps(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }

        const lines: string[] = [];

        // Group steps by page
        const stepsByPage = new Map<string, RecordingStep[]>();
        for (const step of session.steps) {
            const pageName = step.pageName || 'DefaultPage';
            if (!stepsByPage.has(pageName)) {
                stepsByPage.set(pageName, []);
            }
            stepsByPage.get(pageName)!.push(step);
        }

        // Add scenario header
        const scenarioName = session.scenarioName || 'Recorded Scenario';
        lines.push(`scenario "${scenarioName}" {`);

        // Add steps
        for (const step of session.steps) {
            lines.push(`    ${step.veroCode}`);
        }

        lines.push('}');

        return lines.join('\n');
    }

    /**
     * Find sessions that may need recovery (active but old)
     */
    async findStaleActiveSessions(maxAgeMinutes = 30): Promise<RecordingSession[]> {
        const cutoffTime = new Date(Date.now() - maxAgeMinutes * 60 * 1000);
        return prisma.recordingSession.findMany({
            where: {
                status: 'active',
                updatedAt: { lt: cutoffTime },
            },
        });
    }

    /**
     * Clean up old completed/failed sessions
     */
    async cleanupOldSessions(maxAgeDays = 30): Promise<number> {
        const cutoffTime = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000);
        const result = await prisma.recordingSession.deleteMany({
            where: {
                status: { in: ['completed', 'failed'] },
                completedAt: { lt: cutoffTime },
            },
        });
        return result.count;
    }

    /**
     * Update step with screenshot path
     */
    async updateStepScreenshot(stepId: string, screenshotPath: string): Promise<RecordingStep> {
        return prisma.recordingStep.update({
            where: { id: stepId },
            data: { screenshotPath },
        });
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
}

export const recordingPersistenceService = new RecordingPersistenceService();
