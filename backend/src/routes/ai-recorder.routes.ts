import { Router, Request, Response } from 'express';
import multer from 'multer';
import { AIRecorderService } from '../services/aiRecorder.service';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });
const aiRecorderService = new AIRecorderService();

// Import Excel test cases
router.post('/import-excel', upload.single('file'), async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const testCases = await aiRecorderService.parseExcelTestCases(req.file.buffer);
        res.json({ success: true, testCases });
    } catch (error) {
        console.error('Error importing Excel:', error);
        res.status(500).json({ error: 'Failed to import Excel file' });
    }
});

// Start AI execution for test cases
router.post('/generate', async (req: Request, res: Response) => {
    try {
        const { testCases, environment, headless = true } = req.body;

        if (!testCases || !Array.isArray(testCases)) {
            return res.status(400).json({ error: 'Invalid test cases' });
        }

        const sessionId = await aiRecorderService.startAIExecution({
            testCases,
            environment,
            headless,
        });

        res.json({ success: true, sessionId });
    } catch (error) {
        console.error('Error starting AI execution:', error);
        res.status(500).json({ error: 'Failed to start AI execution' });
    }
});

// Get execution status
router.get('/status/:sessionId', async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;
        const status = await aiRecorderService.getExecutionStatus(sessionId);
        res.json(status);
    } catch (error) {
        console.error('Error getting status:', error);
        res.status(500).json({ error: 'Failed to get execution status' });
    }
});

// Run generated Playwright script (not AI - the actual script)
router.post('/run-script', async (req: Request, res: Response) => {
    try {
        const { testId, steps, environment } = req.body;

        if (!testId || !steps) {
            return res.status(400).json({ error: 'Missing testId or steps' });
        }

        const result = await aiRecorderService.runGeneratedScript({
            testId,
            steps,
            environment,
        });

        res.json({ success: true, result });
    } catch (error) {
        console.error('Error running script:', error);
        res.status(500).json({ error: 'Failed to run script' });
    }
});

// Approve and save test as .vero file
router.post('/approve', async (req: Request, res: Response) => {
    try {
        const { testId, name, steps, targetPath } = req.body;

        if (!testId || !steps || !targetPath) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const veroFilePath = await aiRecorderService.saveAsVero({
            testId,
            name,
            steps,
            targetPath,
        });

        res.json({ success: true, filePath: veroFilePath });
    } catch (error) {
        console.error('Error saving as vero:', error);
        res.status(500).json({ error: 'Failed to save as .vero file' });
    }
});

// Cancel execution session
router.post('/cancel/:sessionId', async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;
        await aiRecorderService.cancelExecution(sessionId);
        res.json({ success: true });
    } catch (error) {
        console.error('Error canceling execution:', error);
        res.status(500).json({ error: 'Failed to cancel execution' });
    }
});

export default router;
