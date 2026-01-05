/**
 * Progress Reporter
 * Handles real-time WebSocket updates during flow execution
 */

import { Server as SocketIOServer } from 'socket.io';
import {
    StepStatus,
    StepResult,
    ExecutionResult,
    ExecutionResultStatus,
    ExecutionError,
    StepStartEvent,
    StepCompleteEvent,
    ExecutionProgressEvent,
    ExecutionCompleteEvent,
} from '@playwright-web-app/shared';
import { logger } from '../utils/logger';

export class ProgressReporter {
    private io: SocketIOServer | null;
    private executionId: string;
    private flowId: string;
    private completedSteps: number = 0;
    private totalSteps: number = 0;

    constructor(
        executionId: string,
        flowId: string,
        io: SocketIOServer | null = null
    ) {
        this.executionId = executionId;
        this.flowId = flowId;
        this.io = io;
    }

    /**
     * Set total expected steps
     */
    setTotalSteps(total: number): void {
        this.totalSteps = total;
    }

    /**
     * Report step started
     */
    reportStepStart(
        nodeId: string,
        nodeName: string,
        nodeType: string,
        stepIndex: number
    ): void {
        const event: StepStartEvent = {
            executionId: this.executionId,
            nodeId,
            nodeName,
            nodeType,
            stepIndex,
            totalSteps: this.totalSteps,
        };

        this.emit('step:start', event);
        logger.info(`[${this.executionId}] Step started: ${nodeName} (${nodeType})`);
    }

    /**
     * Report step completed
     */
    reportStepComplete(
        nodeId: string,
        nodeName: string,
        nodeType: string,
        status: StepStatus,
        duration: number,
        error?: ExecutionError,
        screenshot?: string
    ): void {
        this.completedSteps++;

        const event: StepCompleteEvent = {
            executionId: this.executionId,
            nodeId,
            nodeName,
            nodeType,
            status,
            duration,
            error,
            screenshot,
        };

        this.emit('step:complete', event);

        const statusIcon = status === 'passed' ? '✓' : status === 'failed' ? '✗' : '○';
        logger.info(`[${this.executionId}] Step ${statusIcon} ${nodeName}: ${duration}ms`);
    }

    /**
     * Report overall progress
     */
    reportProgress(
        status: ExecutionResultStatus,
        currentNode?: string,
        currentIteration?: number,
        totalIterations?: number
    ): void {
        const event: ExecutionProgressEvent = {
            executionId: this.executionId,
            flowId: this.flowId,
            status,
            completedSteps: this.completedSteps,
            totalSteps: this.totalSteps,
            currentNode,
            currentIteration,
            totalIterations,
        };

        this.emit('execution:progress', event);
    }

    /**
     * Report execution complete
     */
    reportComplete(result: ExecutionResult): void {
        const event: ExecutionCompleteEvent = {
            executionId: this.executionId,
            result,
        };

        this.emit('execution:complete', event);

        const statusIcon = result.status === 'passed' ? '✓' : result.status === 'failed' ? '✗' : '○';
        logger.info(`[${this.executionId}] Execution ${statusIcon} complete: ${result.duration}ms`);
    }

    /**
     * Report log message
     */
    reportLog(
        message: string,
        level: 'info' | 'warn' | 'error' = 'info'
    ): void {
        this.emit('execution:log', {
            executionId: this.executionId,
            message,
            level,
        });

        switch (level) {
            case 'error':
                logger.error(`[${this.executionId}] ${message}`);
                break;
            case 'warn':
                logger.warn(`[${this.executionId}] ${message}`);
                break;
            default:
                logger.info(`[${this.executionId}] ${message}`);
        }
    }

    /**
     * Report error
     */
    reportError(error: ExecutionError): void {
        this.emit('execution:error', {
            executionId: this.executionId,
            error,
        });

        logger.error(`[${this.executionId}] Error: ${error.message}`);
    }

    /**
     * Report screenshot captured
     */
    reportScreenshot(
        stepNumber: number,
        imageData: string
    ): void {
        this.emit('execution:screenshot', {
            executionId: this.executionId,
            stepNumber,
            imageData,
        });
    }

    /**
     * Report debug pause (for breakpoints)
     */
    reportDebugPause(
        nodeId: string,
        nodeName: string,
        variables: Record<string, any>
    ): void {
        this.emit('execution:paused', {
            executionId: this.executionId,
            nodeId,
            nodeName,
            variables,
        });

        logger.info(`[${this.executionId}] Paused at breakpoint: ${nodeName}`);
    }

    /**
     * Report retry attempt
     */
    reportRetry(
        attempt: number,
        totalAttempts: number,
        reason: string
    ): void {
        this.emit('execution:retry', {
            executionId: this.executionId,
            attempt,
            totalAttempts,
            reason,
        });

        logger.info(`[${this.executionId}] Retry attempt ${attempt}/${totalAttempts}: ${reason}`);
    }

    /**
     * Create a step result from current state
     */
    createStepResult(
        nodeId: string,
        nodeName: string,
        nodeType: string,
        status: StepStatus,
        startTime: number,
        logs: string[] = [],
        error?: ExecutionError
    ): StepResult {
        return {
            nodeId,
            nodeName,
            nodeType,
            status,
            startTime,
            duration: Date.now() - startTime,
            endTime: Date.now(),
            logs,
            error,
        };
    }

    /**
     * Emit event to WebSocket
     */
    private emit(event: string, data: any): void {
        if (this.io) {
            this.io.emit(event, data);
        }
    }

    /**
     * Get completed step count
     */
    getCompletedSteps(): number {
        return this.completedSteps;
    }

    /**
     * Reset progress counters
     */
    reset(): void {
        this.completedSteps = 0;
        this.totalSteps = 0;
    }
}
