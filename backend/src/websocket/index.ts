import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { logger } from '../utils/logger';
import { ExecutionService } from '../services/execution.service';
import { PlaywrightService, DebugEvent } from '../services/playwright.service';
import { CopilotAgentService } from '../services/copilot/CopilotAgentService';
import type { ClientToServerEvents, ServerToClientEvents } from '@playwright-web-app/shared';

interface AuthSocket extends Socket {
  userId?: string;
}

export class WebSocketServer {
  private io: Server<ClientToServerEvents, ServerToClientEvents>;
  private executionService: ExecutionService;
  private playwrightService: PlaywrightService;

  constructor(httpServer: HttpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: config.cors.origin,
        credentials: true,
      },
    });

    this.executionService = new ExecutionService();
    this.playwrightService = new PlaywrightService();

    this.setupMiddleware();
    this.setupHandlers();

    logger.info('WebSocket server initialized with built-in Playwright support (no agent required)');
  }

  private setupMiddleware() {
    this.io.use((socket: AuthSocket, next) => {
      try {
        const token = socket.handshake.auth.token;

        // Development mode: allow unauthenticated connections
        if (!token && config.nodeEnv === 'development') {
          socket.userId = 'dev-user';
          logger.info('WebSocket: Dev mode - allowing unauthenticated connection');
          return next();
        }

        if (!token) {
          return next(new Error('Authentication error'));
        }

        const decoded = jwt.verify(token, config.jwt.secret) as {
          userId?: string;
        };

        if (decoded.userId) {
          socket.userId = decoded.userId;
          next();
        } else {
          return next(new Error('Invalid token'));
        }
      } catch (error) {
        logger.error('WebSocket auth error:', error);
        next(new Error('Authentication error'));
      }
    });
  }

  private setupHandlers() {
    this.io.on('connection', (socket: AuthSocket) => {
      logger.info(`WebSocket connected: ${socket.id}`, { userId: socket.userId });

      this.handleClientConnection(socket);

      socket.on('disconnect', () => {
        logger.info(`WebSocket disconnected: ${socket.id}`);
      });
    });
  }

  private handleClientConnection(socket: AuthSocket) {
    // Handle recording start - runs Playwright codegen directly
    socket.on('recording:start', async (data) => {
      logger.info('Recording start requested:', data);

      // Create or update execution status (pass testFlowId to create if doesn't exist)
      await this.executionService.updateStatus(data.executionId, 'running', undefined, data.testFlowId);

      // Notify client that recording is ready
      socket.emit('recording:ready', {
        testFlowId: data.testFlowId,
        executionId: data.executionId,
      });

      // Start Playwright codegen directly
      this.playwrightService.startRecording(
        data.url,
        data.language,
        data.executionId,
        async (success, code, error) => {
          // Update execution status
          await this.executionService.updateStatus(
            data.executionId,
            success ? 'passed' : 'failed'
          );

          // Notify all clients
          this.io.emit('recording:complete', {
            testFlowId: data.testFlowId,
            executionId: data.executionId,
            success,
            code,
            message: error,
          });
        }
      );
    });

    // Handle recording cancel
    socket.on('recording:cancel', async (data) => {
      logger.info('Recording cancel requested:', data);

      // Gracefully handle missing execution record
      await this.executionService.updateStatus(data.executionId, 'cancelled');
      this.playwrightService.cancelRecording(data.executionId);
    });

    // ======== CODEGEN RECORDING (Vero IDE - Recommended) ========
    // Uses Playwright's codegen for perfect recording, converts to Vero DSL
    socket.on('recording:codegen:start', async (data: { url: string; sessionId: string; scenarioName: string }) => {
      console.log('[WebSocket] *** recording:codegen:start received ***', data);
      logger.info('Codegen recording start requested:', data);

      try {
        const { codegenRecorderService } = await import('../services/codegenRecorder.service');

        await codegenRecorderService.startRecording(
          data.url,
          data.sessionId,
          // Action callback - real-time Vero code
          (veroCode, pagePath, pageCode, fieldCreated) => {
            logger.info(`[WebSocket] Codegen action: ${veroCode}`);
            socket.emit('recording:action', {
              sessionId: data.sessionId,
              veroCode,
              newPagePath: pagePath,
              newPageCode: pageCode
            });

            if (fieldCreated && pagePath) {
              socket.emit('recording:page-updated', {
                sessionId: data.sessionId,
                pageName: fieldCreated.pageName,
                fieldName: fieldCreated.fieldName,
                filePath: pagePath,
                pageContent: pageCode
              });
            }

            if (fieldCreated) {
              socket.emit('recording:field-created', {
                sessionId: data.sessionId,
                pageName: fieldCreated.pageName,
                fieldName: fieldCreated.fieldName
              });
            }
          },
          // Error callback
          (error) => {
            socket.emit('recording:error', {
              sessionId: data.sessionId,
              error
            });
          },
          data.scenarioName
        );

        socket.emit('recording:codegen:ready', { sessionId: data.sessionId });
      } catch (error: any) {
        logger.error('Failed to start codegen recording:', error);
        socket.emit('recording:error', {
          sessionId: data.sessionId,
          error: error.message
        });
      }
    });

    // Handle codegen recording stop
    socket.on('recording:codegen:stop', async (data: { sessionId: string }) => {
      logger.info('Codegen recording stop requested:', data);

      try {
        const { codegenRecorderService } = await import('../services/codegenRecorder.service');
        await codegenRecorderService.stopRecording(data.sessionId);
        socket.emit('recording:codegen:complete', { sessionId: data.sessionId });
      } catch (error: any) {
        socket.emit('recording:error', {
          sessionId: data.sessionId,
          error: error.message
        });
      }
    });

    // ======== EMBEDDED RECORDING (Vero IDE - Legacy) ========
    // Handle embedded recording start with CDP screencast or iframe proxy
    socket.on('recording:embedded:start', async (data: { url: string; sessionId: string; scenarioName: string; useProxy?: boolean }) => {
      console.log('[WebSocket] *** recording:embedded:start received ***', data);
      logger.info('Embedded recording start requested:', data);

      try {
        // Dynamically import to avoid circular deps
        const { browserStreamService } = await import('../services/browserStream.service');

        // If using iframe proxy, skip browser launch
        if (data.useProxy) {
          logger.info(`[WebSocket] Using iframe proxy mode for session ${data.sessionId}`);
          browserStreamService.createIframeSession(data.sessionId, data.url, data.scenarioName);
          socket.emit('recording:embedded:ready', { sessionId: data.sessionId, mode: 'iframe-proxy' });
          return;
        }

        // Traditional mode: launch browser with CDP
        await browserStreamService.startRecording(
          data.url,
          data.sessionId,
          // Frame callback - stream to client
          (base64Frame) => {
            socket.emit('recording:frame', {
              sessionId: data.sessionId,
              frame: base64Frame
            });
          },
          // Action callback - real-time code update with page object support
          (veroCode, newPagePath, newPageCode, fieldCreated) => {
            logger.info(`[WebSocket] Emitting recording:action with veroCode: ${veroCode}`);
            socket.emit('recording:action', {
              sessionId: data.sessionId,
              veroCode,
              newPagePath,
              newPageCode
            });

            // Emit page update event if a new field was created
            if (fieldCreated && newPagePath) {
              socket.emit('recording:page-updated', {
                sessionId: data.sessionId,
                pageName: fieldCreated.pageName,
                fieldName: fieldCreated.fieldName,
                filePath: newPagePath,
                pageContent: newPageCode
              });
            }

            // Emit field created notification
            if (fieldCreated) {
              socket.emit('recording:field-created', {
                sessionId: data.sessionId,
                pageName: fieldCreated.pageName,
                fieldName: fieldCreated.fieldName
              });
            }
          },
          // Error callback
          (error) => {
            socket.emit('recording:error', {
              sessionId: data.sessionId,
              error
            });
          },
          // Scenario name for context
          data.scenarioName
        );

        socket.emit('recording:embedded:ready', { sessionId: data.sessionId, mode: 'browser' });
      } catch (error: any) {
        logger.error('Failed to start embedded recording:', error);
        socket.emit('recording:error', {
          sessionId: data.sessionId,
          error: error.message
        });
      }
    });

    // Handle mouse input from frontend
    socket.on('recording:input:click', async (data: { sessionId: string; x: number; y: number }) => {
      logger.info(`Recording click at (${data.x}, ${data.y}) for session ${data.sessionId}`);
      try {
        const { browserStreamService } = await import('../services/browserStream.service');
        const result = await browserStreamService.dispatchClickWithInfo(data.sessionId, data.x, data.y);

        if (!result.success) {
          // Session not found - likely due to server restart
          socket.emit('recording:error', {
            sessionId: data.sessionId,
            error: result.error || 'Recording session expired. Please start a new recording.'
          });
        } else {
          // Send debug info back to frontend
          socket.emit('recording:debug', {
            sessionId: data.sessionId,
            message: `Clicked ${result.elementInfo?.tag || 'unknown'} at (${data.x}, ${data.y})`,
            elementInfo: result.elementInfo,
            urlAfter: result.urlAfter
          });
        }
      } catch (error) {
        logger.error('Failed to dispatch click:', error);
      }
    });

    // Handle mouse move from frontend
    socket.on('recording:input:move', async (data: { sessionId: string; x: number; y: number }) => {
      try {
        const { browserStreamService } = await import('../services/browserStream.service');
        await browserStreamService.dispatchMouseMove(data.sessionId, data.x, data.y);
      } catch (error) {
        // Ignore move errors - they're too frequent to log
      }
    });

    // Handle keyboard input from frontend
    socket.on('recording:input:type', async (data: { sessionId: string; text: string; key?: string }) => {
      try {
        const { browserStreamService } = await import('../services/browserStream.service');
        await browserStreamService.dispatchKeyboard(data.sessionId, data.text, data.key);
      } catch (error) {
        logger.error('Failed to dispatch keyboard:', error);
      }
    });

    // Handle scroll input from frontend
    socket.on('recording:input:scroll', async (data: { sessionId: string; x: number; y: number; deltaX: number; deltaY: number }) => {
      try {
        const { browserStreamService } = await import('../services/browserStream.service');
        await browserStreamService.dispatchScroll(data.sessionId, data.x, data.y, data.deltaX, data.deltaY);
      } catch (error) {
        // Ignore scroll errors - they're frequent
      }
    });

    // Handle embedded recording stop
    socket.on('recording:embedded:stop', async (data: { sessionId: string }) => {
      logger.info('Embedded recording stop requested:', data);

      try {
        const { browserStreamService } = await import('../services/browserStream.service');
        const finalCode = await browserStreamService.stopRecording(data.sessionId);

        socket.emit('recording:embedded:complete', {
          sessionId: data.sessionId,
          code: finalCode
        });
      } catch (error: any) {
        socket.emit('recording:error', {
          sessionId: data.sessionId,
          error: error.message
        });
      }
    });

    // ======== IFRAME PROXY RECORDING ========
    // Handle actions from iframe proxy (embedded browser via proxy)
    socket.on('recording:iframe:action', async (data: {
      sessionId: string;
      action: {
        type: 'click' | 'fill' | 'check' | 'select' | 'keypress' | 'submit';
        element?: {
          tagName: string;
          id?: string;
          className?: string;
          name?: string;
          text?: string;
          role?: string;
          ariaLabel?: string;
          testId?: string;
          placeholder?: string;
          inputType?: string;
          href?: string;
          title?: string;
          value?: string;
        };
        value?: string;
        key?: string;
        navigateTo?: string;
        timestamp: number;
      };
      url?: string;
      scenarioName?: string;
    }) => {
      logger.info('Iframe action received:', { sessionId: data.sessionId, type: data.action.type });

      try {
        const { browserStreamService } = await import('../services/browserStream.service');

        // Process the action from iframe
        const result = await browserStreamService.processIframeAction(
          {
            type: data.action.type as any,
            element: data.action.element as any,
            value: data.action.value,
            key: data.action.key,
            timestamp: data.action.timestamp
          },
          data.url || 'https://example.com',
          data.scenarioName
        );

        if (result) {
          logger.info(`[WebSocket] Iframe action processed, emitting veroCode: ${result.veroCode}`);

          // Emit the generated Vero code
          socket.emit('recording:action', {
            sessionId: data.sessionId,
            veroCode: result.veroCode,
            newPagePath: result.pagePath,
            newPageCode: result.pageCode
          });

          // Emit page update event if a new field was created
          if (result.fieldCreated && result.pagePath) {
            socket.emit('recording:page-updated', {
              sessionId: data.sessionId,
              pageName: result.fieldCreated.pageName,
              fieldName: result.fieldCreated.fieldName,
              filePath: result.pagePath,
              pageContent: result.pageCode
            });
          }

          // Emit field created notification
          if (result.fieldCreated) {
            socket.emit('recording:field-created', {
              sessionId: data.sessionId,
              pageName: result.fieldCreated.pageName,
              fieldName: result.fieldCreated.fieldName
            });
          }
        }
      } catch (error: any) {
        logger.error('Failed to process iframe action:', error);
        socket.emit('recording:error', {
          sessionId: data.sessionId,
          error: error.message
        });
      }
    });

    // Handle execution start - runs Playwright test directly
    socket.on('execution:start', async (data) => {
      logger.info('Execution start requested:', data);
      logger.info('Code received (first 500 chars):', data.code?.substring(0, 500));

      // Create or update execution record (pass testFlowId to create if doesn't exist)
      await this.executionService.updateStatus(data.executionId, 'running', undefined, data.testFlowId);

      // Track last screenshot sent to avoid duplicates
      let lastScreenshotIndex = 0;

      // Check for new screenshots periodically
      const screenshotInterval = setInterval(async () => {
        try {
          const screenshots = await this.playwrightService.getScreenshots(data.executionId);
          for (const ss of screenshots) {
            if (ss.stepNumber > lastScreenshotIndex) {
              // Read screenshot and send as base64
              const screenshotPath = this.playwrightService.getScreenshotPath(data.executionId, ss.filename);
              const fs = await import('fs/promises');
              try {
                const imageBuffer = await fs.readFile(screenshotPath);
                const base64Image = imageBuffer.toString('base64');

                // Emit screenshot to client
                this.io.emit('execution:screenshot', {
                  executionId: data.executionId,
                  stepNumber: ss.stepNumber,
                  imageData: `data:image/png;base64,${base64Image}`,
                });

                lastScreenshotIndex = ss.stepNumber;
                logger.info(`Sent screenshot step-${ss.stepNumber} to clients`);
              } catch (err) {
                // Screenshot might not be fully written yet
              }
            }
          }
        } catch (err) {
          // Ignore errors during polling
        }
      }, 500); // Check every 500ms

      // Execute test directly using PlaywrightService
      // Pass traceMode from frontend (defaults to 'on-failure')
      this.playwrightService.executeTest(
        data.code,
        data.executionId,
        async (message, level) => {
          // Store log in database (ignore errors if execution doesn't exist)
          try {
            await this.executionService.addLog(data.executionId, message, level);
          } catch (error) {
            logger.warn('Failed to add log:', error);
          }
          // Broadcast to all clients
          this.io.emit('execution:log', {
            executionId: data.executionId,
            message,
            level,
          });
        },
        async (exitCode, duration) => {
          // Stop screenshot polling
          clearInterval(screenshotInterval);

          // Send any remaining screenshots
          const finalScreenshots = await this.playwrightService.getScreenshots(data.executionId);
          const fs = await import('fs/promises');
          for (const ss of finalScreenshots) {
            if (ss.stepNumber > lastScreenshotIndex) {
              try {
                const screenshotPath = this.playwrightService.getScreenshotPath(data.executionId, ss.filename);
                const imageBuffer = await fs.readFile(screenshotPath);
                const base64Image = imageBuffer.toString('base64');

                this.io.emit('execution:screenshot', {
                  executionId: data.executionId,
                  stepNumber: ss.stepNumber,
                  imageData: `data:image/png;base64,${base64Image}`,
                });
              } catch (err) {
                // Ignore
              }
            }
          }

          // Update execution status
          const status = exitCode === 0 ? 'passed' : 'failed';
          await this.executionService.updateStatus(data.executionId, status, exitCode);

          // Get trace URL (we'll serve it from the backend)
          const traceUrl = `/api/executions/${data.executionId}/trace`;

          // Broadcast completion to all clients with trace URL
          this.io.emit('execution:complete', {
            executionId: data.executionId,
            exitCode,
            duration,
            traceUrl,
          });
        },
        data.traceMode || 'on-failure'  // Pass traceMode from frontend
      );
    });

    // Handle execution cancel
    socket.on('execution:cancel', async (data) => {
      logger.info('Execution cancel requested:', data);

      // Gracefully handle missing execution record
      await this.executionService.updateStatus(data.executionId, 'cancelled');
      this.playwrightService.cancelExecution(data.executionId);
    });

    // ======== DEBUG EXECUTION ========
    // Handle debug execution start
    socket.on('debug:start', async (data: {
      executionId: string;
      testFlowId: string;
      code: string;
      breakpoints: number[];
    }) => {
      logger.info('Debug execution start requested:', { executionId: data.executionId, breakpoints: data.breakpoints });

      // Create or update execution record
      await this.executionService.updateStatus(data.executionId, 'running', undefined, data.testFlowId);

      // Execute with debug mode
      this.playwrightService.executeTestWithDebug(
        data.code,
        data.executionId,
        data.breakpoints,
        // Debug event callback
        (event: DebugEvent) => {
          switch (event.type) {
            case 'step:before':
              this.io.emit('debug:step:before', {
                executionId: data.executionId,
                line: event.line,
                action: event.action,
                target: event.target,
              });
              break;

            case 'step:after':
              this.io.emit('debug:step:after', {
                executionId: data.executionId,
                line: event.line,
                action: event.action,
                success: event.success ?? true,
                duration: event.duration,
              });
              break;

            case 'execution:paused':
              this.io.emit('debug:paused', {
                executionId: data.executionId,
                line: event.line,
              });
              break;

            case 'variable:set':
              this.io.emit('debug:variable', {
                executionId: data.executionId,
                name: event.name,
                value: event.value,
                type: typeof event.value,
              });
              break;

            case 'log':
              this.io.emit('debug:log', {
                executionId: data.executionId,
                line: event.line ?? 0,
                message: event.message,
                level: event.level,
              });
              break;
          }
        },
        // Log callback
        async (message, level) => {
          try {
            await this.executionService.addLog(data.executionId, message, level);
          } catch (error) {
            logger.warn('Failed to add debug log:', error);
          }
          this.io.emit('execution:log', {
            executionId: data.executionId,
            message,
            level,
          });
        },
        // Complete callback
        async (exitCode, duration) => {
          const status = exitCode === 0 ? 'passed' : 'failed';
          await this.executionService.updateStatus(data.executionId, status, exitCode);

          this.io.emit('debug:complete', {
            executionId: data.executionId,
            exitCode,
            duration,
          });
        }
      );
    });

    // Handle breakpoint updates
    socket.on('debug:set-breakpoints', (data: {
      executionId: string;
      breakpoints: number[];
    }) => {
      logger.info('Setting breakpoints:', data);
      this.playwrightService.setBreakpoints(data.executionId, data.breakpoints);
    });

    // Handle debug resume
    socket.on('debug:resume', (data: { executionId: string }) => {
      logger.info('Debug resume requested:', data);
      this.playwrightService.resumeDebug(data.executionId);
      this.io.emit('debug:resumed', { executionId: data.executionId });
    });

    // Handle debug step over
    socket.on('debug:step-over', (data: { executionId: string }) => {
      logger.info('Debug step over requested:', data);
      this.playwrightService.stepOverDebug(data.executionId);
    });

    // Handle debug step into
    socket.on('debug:step-into', (data: { executionId: string }) => {
      logger.info('Debug step into requested:', data);
      this.playwrightService.stepIntoDebug(data.executionId);
    });

    // Handle debug stop
    socket.on('debug:stop', (data: { executionId: string }) => {
      logger.info('Debug stop requested:', data);
      this.playwrightService.stopDebug(data.executionId);
      this.io.emit('debug:stopped', { executionId: data.executionId });
    });

    // ======== COPILOT AGENT ========
    // Note: Copilot events use 'any' cast since they're not in shared types yet
    const copilotIo = this.io as any;
    const copilotSocket = socket as any;

    // Handle copilot session join (for real-time updates)
    copilotSocket.on('copilot:join', async (data: { sessionId: string }) => {
      logger.info('Copilot session join requested:', data);
      socket.join(`copilot:${data.sessionId}`);
      copilotSocket.emit('copilot:joined', { sessionId: data.sessionId });
    });

    // Handle copilot session leave
    copilotSocket.on('copilot:leave', async (data: { sessionId: string }) => {
      logger.info('Copilot session leave requested:', data);
      socket.leave(`copilot:${data.sessionId}`);
    });

    // Handle copilot message (user sends a message)
    copilotSocket.on('copilot:message', async (data: { sessionId: string; content: string }) => {
      logger.info('Copilot message received:', { sessionId: data.sessionId, content: data.content.substring(0, 100) });

      try {
        const agent = new CopilotAgentService(data.sessionId);

        // Set up event listeners for real-time updates
        agent.on('stateChange', (event) => {
          copilotIo.to(`copilot:${data.sessionId}`).emit('copilot:state', {
            sessionId: data.sessionId,
            state: event.state,
            errorMessage: event.errorMessage,
          });
        });

        agent.on('thinking', (event) => {
          copilotIo.to(`copilot:${data.sessionId}`).emit('copilot:thinking', {
            sessionId: data.sessionId,
            message: event.message,
          });
        });

        agent.on('message', (message) => {
          copilotIo.to(`copilot:${data.sessionId}`).emit('copilot:message', {
            sessionId: data.sessionId,
            message,
          });
        });

        agent.on('exploration', (exploration) => {
          copilotIo.to(`copilot:${data.sessionId}`).emit('copilot:exploration', {
            sessionId: data.sessionId,
            ...exploration,
          });
        });

        agent.on('filesCreated', (event) => {
          copilotIo.to(`copilot:${data.sessionId}`).emit('copilot:filesCreated', {
            sessionId: data.sessionId,
            veroPath: event.veroPath,
            createdFiles: event.createdFiles,
            skippedFiles: event.skippedFiles,
          });
        });

        agent.on('stagedChanges', (event) => {
          copilotIo.to(`copilot:${data.sessionId}`).emit('copilot:staged', {
            sessionId: data.sessionId,
            changeIds: event.changeIds,
          });
        });

        agent.on('mergeComplete', (event) => {
          copilotIo.to(`copilot:${data.sessionId}`).emit('copilot:merged', {
            sessionId: data.sessionId,
            changes: event.changes,
          });
        });

        // Process the message
        await agent.processUserMessage(data.content);
      } catch (error: any) {
        logger.error('Copilot message processing failed:', error);
        copilotSocket.emit('copilot:error', {
          sessionId: data.sessionId,
          error: error.message,
        });
      }
    });

    // Handle copilot clarification response
    copilotSocket.on('copilot:clarify', async (data: { sessionId: string; clarificationId: string; response: string }) => {
      logger.info('Copilot clarification response:', data);

      try {
        const agent = new CopilotAgentService(data.sessionId);

        // Set up event listeners
        agent.on('stateChange', (event) => {
          copilotIo.to(`copilot:${data.sessionId}`).emit('copilot:state', {
            sessionId: data.sessionId,
            state: event.state,
          });
        });

        agent.on('message', (message) => {
          copilotIo.to(`copilot:${data.sessionId}`).emit('copilot:message', {
            sessionId: data.sessionId,
            message,
          });
        });

        await agent.handleClarificationResponse(data.clarificationId, data.response);
      } catch (error: any) {
        logger.error('Copilot clarification failed:', error);
        copilotSocket.emit('copilot:error', {
          sessionId: data.sessionId,
          error: error.message,
        });
      }
    });

    // Handle copilot change approval
    copilotSocket.on('copilot:approve', async (data: { sessionId: string; changeId: string }) => {
      logger.info('Copilot change approval:', data);

      try {
        const agent = new CopilotAgentService(data.sessionId);
        await agent.load();
        await agent.approveChange(data.changeId);

        copilotIo.to(`copilot:${data.sessionId}`).emit('copilot:change:approved', {
          sessionId: data.sessionId,
          changeId: data.changeId,
        });
      } catch (error: any) {
        logger.error('Copilot approval failed:', error);
        copilotSocket.emit('copilot:error', {
          sessionId: data.sessionId,
          error: error.message,
        });
      }
    });

    // Handle copilot change rejection
    copilotSocket.on('copilot:reject', async (data: { sessionId: string; changeId: string; feedback?: string }) => {
      logger.info('Copilot change rejection:', data);

      try {
        const agent = new CopilotAgentService(data.sessionId);
        await agent.load();
        await agent.rejectChange(data.changeId, data.feedback);

        copilotIo.to(`copilot:${data.sessionId}`).emit('copilot:change:rejected', {
          sessionId: data.sessionId,
          changeId: data.changeId,
        });
      } catch (error: any) {
        logger.error('Copilot rejection failed:', error);
        copilotSocket.emit('copilot:error', {
          sessionId: data.sessionId,
          error: error.message,
        });
      }
    });

    // Handle approve all changes
    copilotSocket.on('copilot:approve-all', async (data: { sessionId: string }) => {
      logger.info('Copilot approve all:', data);

      try {
        const agent = new CopilotAgentService(data.sessionId);

        agent.on('mergeComplete', (event) => {
          copilotIo.to(`copilot:${data.sessionId}`).emit('copilot:merged', {
            sessionId: data.sessionId,
            changes: event.changes,
          });
        });

        await agent.load();
        await agent.approveAllChanges();
      } catch (error: any) {
        logger.error('Copilot approve all failed:', error);
        copilotSocket.emit('copilot:error', {
          sessionId: data.sessionId,
          error: error.message,
        });
      }
    });

    // Handle copilot session reset
    copilotSocket.on('copilot:reset', async (data: { sessionId: string }) => {
      logger.info('Copilot reset:', data);

      try {
        const agent = new CopilotAgentService(data.sessionId);
        await agent.load();
        await agent.reset();

        copilotIo.to(`copilot:${data.sessionId}`).emit('copilot:reset', {
          sessionId: data.sessionId,
        });
      } catch (error: any) {
        logger.error('Copilot reset failed:', error);
        copilotSocket.emit('copilot:error', {
          sessionId: data.sessionId,
          error: error.message,
        });
      }
    });
  }

  getIO() {
    return this.io;
  }

  getPlaywrightService() {
    return this.playwrightService;
  }
}
