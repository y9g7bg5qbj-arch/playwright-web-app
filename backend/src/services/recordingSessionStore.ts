/**
 * Recording Session Store
 *
 * Shared in-memory store for active recording sessions.
 * Tracks ownership (userId) so that routes and WebSocket handlers
 * can enforce per-session authorization.
 */

export interface SessionInfo {
    sessionId: string;
    userId: string;
    scenarioName: string;
    veroLines: string[];
}

class RecordingSessionStore {
    private sessions = new Map<string, SessionInfo>();

    create(sessionId: string, userId: string, scenarioName: string): void {
        this.sessions.set(sessionId, {
            sessionId,
            userId,
            scenarioName,
            veroLines: [],
        });
    }

    get(sessionId: string): SessionInfo | undefined {
        return this.sessions.get(sessionId);
    }

    has(sessionId: string): boolean {
        return this.sessions.has(sessionId);
    }

    isOwner(sessionId: string, userId: string): boolean {
        const session = this.sessions.get(sessionId);
        return session !== undefined && session.userId === userId;
    }

    addLine(sessionId: string, line: string): void {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.veroLines.push(line);
        }
    }

    delete(sessionId: string): SessionInfo | undefined {
        const session = this.sessions.get(sessionId);
        this.sessions.delete(sessionId);
        return session;
    }
}

export const recordingSessionStore = new RecordingSessionStore();
