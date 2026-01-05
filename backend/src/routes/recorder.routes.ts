import { Router } from 'express';
import { spawn } from 'child_process';
import { readFile, unlink, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { watch, existsSync } from 'fs';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// Store imported recordings from Chrome extension
const importedRecordings = new Map<string, any>();

// Store active recording processes
const activeRecordings = new Map<string, any>();

// Helper to generate unique temp file path
function getTempFilePath(testFlowId: string): string {
  return join(tmpdir(), `playwright-recording-${testFlowId}.ts`);
}

// Start recording with Playwright Codegen
router.post('/start', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { url, testFlowId } = req.body;
    console.log('POST /recorder/start called:', { url, testFlowId });

    if (!url || !testFlowId) {
      console.log('Missing required fields:', { url, testFlowId });
      return res.status(400).json({
        success: false,
        data: null,
        error: 'URL and testFlowId are required'
      });
    }

    // Kill any existing recording for this test flow
    if (activeRecordings.has(testFlowId)) {
      const existingProcess = activeRecordings.get(testFlowId);
      existingProcess.process.kill();
      activeRecordings.delete(testFlowId);
    }

    const outputFile = getTempFilePath(testFlowId);
    console.log('Output file path:', outputFile);

    // Don't create empty file - let playwright create it
    // This prevents issues with the file being overwritten

    // Spawn playwright codegen with output to file
    // Use a single command string with shell: true for proper argument handling
    // Use playwright-test target for proper test format that the parser understands
    const command = `npx playwright codegen "${url}" --target=playwright-test -o "${outputFile}"`;
    console.log('Running command:', command);

    const codegenProcess = spawn(command, [], {
      stdio: 'inherit',
      shell: true,
    });

    let currentCode = '';
    let fileWatcher: any = null;

    // Watch the output file for changes (file might not exist yet)
    const setupFileWatcher = () => {
      try {
        fileWatcher = watch(outputFile, async (eventType) => {
          if (eventType === 'change' || eventType === 'rename') {
            try {
              const code = await readFile(outputFile, 'utf-8');
              currentCode = code;
              const recording = activeRecordings.get(testFlowId);
              if (recording) {
                recording.currentCode = code;
              }
              console.log('Code updated, length:', code.length);
            } catch (error) {
              // File might not exist yet or is being written
            }
          }
        });
      } catch (error) {
        // File doesn't exist yet, retry later
        setTimeout(setupFileWatcher, 1000);
      }
    };

    // Try to set up watcher after a short delay (file may be created later)
    setTimeout(setupFileWatcher, 2000);

    codegenProcess.on('close', async (exitCode) => {
      console.log('Codegen process closed with code:', exitCode);

      // Stop watching the file
      if (fileWatcher) {
        fileWatcher.close();
      }

      // Wait a bit for the file to be fully written
      await new Promise(resolve => setTimeout(resolve, 500));

      // Read final code
      try {
        const finalCode = await readFile(outputFile, 'utf-8');
        console.log('Final generated code length:', finalCode.length);
        console.log('=== FULL GENERATED CODE ===');
        console.log(finalCode);
        console.log('=== END GENERATED CODE ===');

        const recording = activeRecordings.get(testFlowId);
        if (recording) {
          recording.finalCode = finalCode;
          recording.isComplete = true;  // Mark as complete
          recording.exitCode = exitCode;
        }
      } catch (error) {
        console.error('Error reading final code:', error);
        const recording = activeRecordings.get(testFlowId);
        if (recording) {
          recording.isComplete = true;
          recording.exitCode = exitCode;
          recording.error = error instanceof Error ? error.message : 'Unknown error';
        }
      }

      // Don't delete from activeRecordings yet - let polling handle it
    });

    codegenProcess.on('error', (error) => {
      console.error('Codegen process error:', error);
      if (fileWatcher) {
        fileWatcher.close();
      }
      activeRecordings.delete(testFlowId);
    });

    // Store the process and code getter
    activeRecordings.set(testFlowId, {
      process: codegenProcess,
      outputFile,
      fileWatcher,
      currentCode: '',
      finalCode: '',
      getCode: function() {
        return this.currentCode || this.finalCode || '';
      },
      startTime: Date.now(),
    });

    res.json({
      success: true,
      data: {
        message: 'Playwright Codegen started. Close the browser window when done recording.',
        testFlowId,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get recorded code
router.get('/code/:testFlowId', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { testFlowId } = req.params;
    console.log('GET /code called for testFlowId:', testFlowId);

    const recording = activeRecordings.get(testFlowId);
    if (!recording) {
      console.log('No active recording found for testFlowId:', testFlowId);
      return res.json({
        success: true,
        data: {
          code: '',
          isRecording: false,
          isComplete: false
        }
      });
    }

    const code = recording.getCode();
    const isRecording = !recording.process.killed && recording.process.exitCode === null;
    const isComplete = recording.isComplete === true;

    console.log('Recording status:', {
      testFlowId,
      isRecording,
      isComplete,
      codeLength: code.length,
      processKilled: recording.process.killed,
      processExitCode: recording.process.exitCode
    });

    // If complete, also log the code that will be returned
    if (isComplete) {
      console.log('=== RETURNING CODE (isComplete=true) ===');
      console.log(code);
      console.log('=== END CODE ===');
    }

    res.json({
      success: true,
      data: {
        code,
        isRecording,
        isComplete
      }
    });
  } catch (error) {
    next(error);
  }
});

// Stop recording
router.post('/stop/:testFlowId', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { testFlowId } = req.params;

    const recording = activeRecordings.get(testFlowId);
    if (recording) {
      recording.process.kill('SIGTERM');

      // Stop file watcher
      if (recording.fileWatcher) {
        recording.fileWatcher.close();
      }

      // Wait a moment for the file to be written
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Read the final code from file
      let code = '';
      try {
        code = await readFile(recording.outputFile, 'utf-8');
        console.log('Read code from file, length:', code.length);
      } catch (error) {
        console.error('Error reading code file:', error);
        code = recording.getCode();
      }

      activeRecordings.delete(testFlowId);

      // Clean up temp file
      try {
        await unlink(recording.outputFile);
      } catch (error) {
        // Ignore if file doesn't exist
      }

      return res.json({
        success: true,
        data: { code }
      });
    }

    res.json({
      success: false,
      data: null,
      error: 'No active recording found'
    });
  } catch (error) {
    next(error);
  }
});

// ===== Chrome Extension Integration Endpoints =====

/**
 * Import recording from Chrome extension
 * POST /recorder/import
 */
router.post('/import', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { actions, pageObjects, metadata, veroCode, testFlowId } = req.body;

    if (!actions || !Array.isArray(actions)) {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'Actions array is required'
      });
    }

    const recordingId = testFlowId || `import-${Date.now()}`;
    const userId = req.user?.userId || 'unknown';

    // Store the imported recording
    const recording = {
      id: recordingId,
      userId,
      actions,
      pageObjects: pageObjects || [],
      metadata: {
        ...metadata,
        importedAt: new Date().toISOString(),
        source: 'chrome-extension',
        actionCount: actions.length
      },
      veroCode: veroCode || generateVeroCodeFromActions(actions),
      createdAt: new Date().toISOString()
    };

    importedRecordings.set(recordingId, recording);

    console.log(`[Recorder] Imported recording ${recordingId} with ${actions.length} actions`);

    res.json({
      success: true,
      data: {
        recordingId,
        actionCount: actions.length,
        veroCode: recording.veroCode
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get imported recording
 * GET /recorder/import/:recordingId
 */
router.get('/import/:recordingId', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { recordingId } = req.params;

    const recording = importedRecordings.get(recordingId);
    if (!recording) {
      return res.status(404).json({
        success: false,
        data: null,
        error: 'Recording not found'
      });
    }

    res.json({
      success: true,
      data: recording
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Import page object from Chrome extension
 * POST /recorder/page-object
 */
router.post('/page-object', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { name, url, elements, actions: pageActions } = req.body;

    if (!name || !elements) {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'Name and elements are required'
      });
    }

    // Generate page object code
    const pageObjectCode = generatePageObjectCode(name, url, elements, pageActions);

    console.log(`[Recorder] Generated page object: ${name} with ${Object.keys(elements).length} elements`);

    res.json({
      success: true,
      data: {
        name,
        code: pageObjectCode,
        elementCount: Object.keys(elements).length
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Convert actions to Vero DSL code
 * POST /recorder/convert
 */
router.post('/convert', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { actions, options } = req.body;

    if (!actions || !Array.isArray(actions)) {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'Actions array is required'
      });
    }

    const veroCode = generateVeroCodeFromActions(actions, options);

    res.json({
      success: true,
      data: {
        code: veroCode,
        actionCount: actions.length
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * List all imported recordings
 * GET /recorder/imports
 */
router.get('/imports', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user?.userId;
    const recordings = Array.from(importedRecordings.values())
      .filter(r => r.userId === userId || !userId)
      .map(r => ({
        id: r.id,
        actionCount: r.actions.length,
        createdAt: r.createdAt,
        metadata: r.metadata
      }));

    res.json({
      success: true,
      data: recordings
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Delete imported recording
 * DELETE /recorder/import/:recordingId
 */
router.delete('/import/:recordingId', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { recordingId } = req.params;

    if (!importedRecordings.has(recordingId)) {
      return res.status(404).json({
        success: false,
        data: null,
        error: 'Recording not found'
      });
    }

    importedRecordings.delete(recordingId);

    res.json({
      success: true,
      data: { deleted: recordingId }
    });
  } catch (error) {
    next(error);
  }
});

// ===== Helper Functions =====

/**
 * Generate Vero DSL code from recorded actions
 */
function generateVeroCodeFromActions(actions: any[], options: any = {}): string {
  const lines: string[] = [];
  const featureName = options.featureName || 'Recorded Test';
  const scenarioName = options.scenarioName || 'Recorded Scenario';

  lines.push(`feature "${featureName}"`);
  lines.push('');
  lines.push(`  scenario "${scenarioName}"`);

  for (const action of actions) {
    const statement = actionToVeroStatement(action);
    if (statement) {
      lines.push(`    ${statement}`);
    }
  }

  lines.push('  end');
  lines.push('');
  lines.push('end');

  return lines.join('\n');
}

/**
 * Convert single action to Vero statement
 */
function actionToVeroStatement(action: any): string | null {
  switch (action.type) {
    case 'navigation':
      return `open "${action.url}"`;

    case 'click':
      return `click "${action.selector}"`;

    case 'dblclick':
      return `doubleClick "${action.selector}"`;

    case 'input':
      const value = action.value?.replace(/"/g, '\\"') || '';
      return `fill "${action.selector}" with "${value}"`;

    case 'select':
      return `select "${action.value}" from "${action.selector}"`;

    case 'check':
      return `check "${action.selector}"`;

    case 'uncheck':
      return `uncheck "${action.selector}"`;

    case 'hover':
      return `hover "${action.selector}"`;

    case 'scroll':
      if (action.selector) {
        return `scroll to "${action.selector}"`;
      }
      return `scroll by ${action.deltaY || 0}`;

    case 'keydown':
      if (['Enter', 'Tab', 'Escape', 'Backspace', 'Delete'].includes(action.key)) {
        return `press ${action.key}`;
      }
      return null;

    case 'assertion':
      return assertionToVeroStatement(action);

    case 'screenshot':
      return `screenshot "${action.name || 'screenshot'}"`;

    case 'wait':
      if (action.selector) {
        return `wait for "${action.selector}"`;
      }
      return `wait ${action.duration || 1000}ms`;

    default:
      return null;
  }
}

/**
 * Convert assertion to Vero statement
 */
function assertionToVeroStatement(action: any): string {
  const selector = action.selector || '';
  const value = action.value?.replace(/"/g, '\\"') || '';

  switch (action.assertionType) {
    case 'visible':
      return `verify "${selector}" is visible`;
    case 'hidden':
      return `verify "${selector}" is hidden`;
    case 'containsText':
      return `verify "${selector}" contains "${value}"`;
    case 'hasValue':
      return `verify "${selector}" has value "${value}"`;
    case 'enabled':
      return `verify "${selector}" is enabled`;
    case 'disabled':
      return `verify "${selector}" is disabled`;
    case 'checked':
      return `verify "${selector}" is checked`;
    case 'unchecked':
      return `verify "${selector}" is unchecked`;
    default:
      return `verify "${selector}" is visible`;
  }
}

/**
 * Generate page object code
 */
function generatePageObjectCode(
  name: string,
  url: string,
  elements: Record<string, string>,
  pageActions?: any[]
): string {
  const lines: string[] = [];

  // Page declaration
  lines.push(`page ${name}`);

  // URL pattern
  if (url) {
    const urlPattern = url.replace(/^https?:\/\/[^\/]+/, '');
    lines.push(`  url "${urlPattern || '/'}"`);
  }

  lines.push('');

  // Elements
  for (const [fieldName, selector] of Object.entries(elements)) {
    lines.push(`  element ${fieldName}: "${selector}"`);
  }

  // Actions (if provided)
  if (pageActions && pageActions.length > 0) {
    lines.push('');
    for (const action of pageActions) {
      if (action.name && action.steps) {
        lines.push(`  action ${action.name}(${action.params?.join(', ') || ''})`);
        for (const step of action.steps) {
          lines.push(`    ${step}`);
        }
        lines.push('  end');
        lines.push('');
      }
    }
  }

  lines.push('end');

  return lines.join('\n');
}

export default router;
