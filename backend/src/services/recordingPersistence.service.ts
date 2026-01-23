/**
 * Recording Persistence Service
 * NOW USES MONGODB INSTEAD OF PRISMA
 *
 * Persists recording sessions to database to survive server restarts.
 * Provides recovery, session management, and step tracking.
 */
import {
  recordingSessionRepository,
  recordingStepRepository
} from '../db/repositories/mongo';
import { MongoRecordingSession, MongoRecordingStep } from '../db/mongodb';

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
     */
    async generateVeroFromSteps(sessionId: string): Promise<string> {
        const session = await this.getSessionWithSteps(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }

        const lines: string[] = [];

        // Group steps by page
        const stepsByPage = new Map<string, MongoRecordingStep[]>();
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
}

export const recordingPersistenceService = new RecordingPersistenceService();
