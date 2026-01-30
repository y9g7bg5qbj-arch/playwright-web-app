import { Router } from 'express';
import { spawn } from 'child_process';
import { readFile, unlink, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { watch, existsSync } from 'fs';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import {
  generateVeroAction,
  generateVeroAssertion,
  generateVeroScenario,
  generateVeroFeature,
  generateVeroPage
} from '../services/veroSyntaxReference';

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

    if (!url || !testFlowId) {
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

    // Spawn playwright codegen with test target for proper format
    const command = `npx playwright codegen "${url}" --target=playwright-test -o "${outputFile}"`;

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

      // Stop watching the file
      if (fileWatcher) {
        fileWatcher.close();
      }

      // Wait a bit for the file to be fully written
      await new Promise(resolve => setTimeout(resolve, 500));

      // Read final code
      try {
        const finalCode = await readFile(outputFile, 'utf-8');

        const recording = activeRecordings.get(testFlowId);
        if (recording) {
          recording.finalCode = finalCode;
          recording.isComplete = true;  // Mark as complete
          recording.exitCode = exitCode;
        }
      } catch (error) {
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

    const recording = activeRecordings.get(testFlowId);
    if (!recording) {
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
      } catch {
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
    const userId = req.userId || 'unknown';

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

    // [Recorder] Imported recording ${recordingId} with ${actions.length} actions`);

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

    // [Recorder] Generated page object: ${name} with ${Object.keys(elements).length} elements`);

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
    const userId = req.userId;
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
 * Uses veroSyntaxReference.ts as single source of truth
 */
function generateVeroCodeFromActions(actions: any[], options: any = {}): string {
  const featureName = options.featureName || 'RecordedTest';
  const scenarioName = options.scenarioName || 'RecordedScenario';

  // Generate step lines using centralized function
  const stepLines: string[] = [];
  for (const action of actions) {
    const statement = actionToVeroStatement(action);
    if (statement) {
      stepLines.push(statement);
    }
  }

  // Use centralized functions to generate proper Vero structure
  const scenarioCode = generateVeroScenario(scenarioName, stepLines);
  const featureCode = generateVeroFeature(featureName, [scenarioCode]);

  return featureCode;
}

/**
 * Convert single action to Vero statement
 * Uses veroSyntaxReference.ts as single source of truth
 */
function actionToVeroStatement(action: any): string | null {
  const selector = action.selector ? `"${action.selector}"` : undefined;

  switch (action.type) {
    case 'navigation':
      return generateVeroAction('open', undefined, action.url);

    case 'click':
      return generateVeroAction('click', selector);

    case 'dblclick':
      return generateVeroAction('click', selector); // Vero uses CLICK for both

    case 'input':
      return generateVeroAction('fill', selector, action.value);

    case 'select':
      return generateVeroAction('select', selector, action.value);

    case 'check':
      return generateVeroAction('check', selector);

    case 'uncheck':
      return generateVeroAction('uncheck', selector);

    case 'hover':
      return generateVeroAction('hover', selector);

    case 'scroll':
      return generateVeroAction('scroll', selector);

    case 'keydown':
      if (['Enter', 'Tab', 'Escape', 'Backspace', 'Delete'].includes(action.key)) {
        return generateVeroAction('press', undefined, action.key);
      }
      return null;

    case 'assertion':
      return assertionToVeroStatement(action);

    case 'screenshot':
      return `SCREENSHOT "${action.name || 'screenshot'}"`;

    case 'wait':
      if (action.selector) {
        return generateVeroAction('wait', selector);
      }
      return generateVeroAction('wait', undefined, String(action.duration || 1));

    default:
      return null;
  }
}

/**
 * Convert assertion to Vero statement
 * Uses veroSyntaxReference.ts as single source of truth
 */
function assertionToVeroStatement(action: any): string {
  const selector = action.selector ? `"${action.selector}"` : '""';
  const value = action.value || '';

  switch (action.assertionType) {
    case 'visible':
      return generateVeroAssertion(selector, 'visible');
    case 'hidden':
      return generateVeroAssertion(selector, 'hidden');
    case 'containsText':
      return generateVeroAssertion(selector, 'contains', value);
    case 'hasValue':
      return generateVeroAssertion(selector, 'hasValue', value);
    case 'enabled':
      return generateVeroAssertion(selector, 'enabled');
    case 'disabled':
      return generateVeroAssertion(selector, 'disabled');
    case 'checked':
      return generateVeroAssertion(selector, 'visible'); // Map to visible for now
    case 'unchecked':
      return generateVeroAssertion(selector, 'visible'); // Map to visible for now
    default:
      return generateVeroAssertion(selector, 'visible');
  }
}

/**
 * Generate page object code
 * Uses veroSyntaxReference.ts as single source of truth
 */
function generatePageObjectCode(
  name: string,
  url: string,
  elements: Record<string, string>,
  _pageActions?: any[]
): string {
  // Convert elements to field format expected by generateVeroPage
  const fields = Object.entries(elements).map(([fieldName, selector]) => ({
    name: fieldName,
    selectorType: 'css', // Default to CSS selectors
    selector: selector
  }));

  // Use centralized function to generate PAGE object
  // Note: generateVeroPage handles the URL pattern internally
  return generateVeroPage(name, fields, url);
}

export default router;
