/**
 * Test Data Excel Import/Export Routes
 *
 * Provides endpoints for importing from and exporting to Excel files,
 * previewing imports, and downloading templates.
 *
 * Mounted under /api/test-data
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import { excelParserService } from '../../services/excel-parser';
import { testDataRowValidationService } from '../../services/test-data-row-validation.service';
import { logger } from '../../utils/logger';

const router = Router();

// Configure multer for file uploads (store in memory)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (_req, file, cb) => {
        const validMimes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'application/octet-stream'
        ];
        const validExtensions = ['.xlsx', '.xls'];
        const hasValidExt = validExtensions.some(ext =>
            file.originalname.toLowerCase().endsWith(ext)
        );

        if (validMimes.includes(file.mimetype) || hasValidExt) {
            cb(null, true);
        } else {
            cb(new Error('Only Excel files (.xlsx, .xls) are allowed'));
        }
    }
});

/**
 * POST /api/test-data/import
 * Import Excel file
 */
router.post('/import', upload.single('file'), async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded'
            });
        }

        const projectId = req.body.projectId || req.body.userId;
        if (!projectId) {
            return res.status(400).json({
                success: false,
                error: 'projectId is required'
            });
        }

        const result = await excelParserService.importExcelBuffer(
            req.file.buffer,
            projectId
        );

        if (result.validationErrors.length > 0) {
            return res.status(422).json(
                testDataRowValidationService.toValidationErrorPayload(
                    result.validationErrors,
                    'Excel import blocked by strict column type validation.'
                )
            );
        }

        res.json({
            success: result.errors.length === 0,
            ...result
        });
    } catch (error) {
        logger.error('Error importing Excel:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /api/test-data/export
 * Export to Excel
 */
router.get('/export', async (req: Request, res: Response) => {
    try {
        const { projectId, userId, sheetIds } = req.query;

        const pid = (projectId || userId) as string;
        if (!pid) {
            return res.status(400).json({
                success: false,
                error: 'projectId is required'
            });
        }

        const sheetIdList = sheetIds
            ? (sheetIds as string).split(',')
            : undefined;

        const buffer = await excelParserService.exportExcel(pid, sheetIdList);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="test-data.xlsx"');
        res.send(buffer);
    } catch (error) {
        logger.error('Error exporting Excel:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * POST /api/test-data/preview
 * Preview Excel file without importing
 */
router.post('/preview', upload.single('file'), async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded'
            });
        }

        const sheets = excelParserService.parseExcelBuffer(req.file.buffer);

        res.json({
            success: true,
            sheets: sheets.map(s => ({
                name: s.name,
                columns: s.columns,
                rowCount: s.rows.length,
                sampleRows: s.rows.slice(0, 5)
            }))
        });
    } catch (error) {
        logger.error('Error previewing Excel:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /api/test-data/template
 * Download Excel template
 */
router.get('/template', async (req: Request, res: Response) => {
    try {
        const { pageName = 'LoginPage', columns = 'email,password,username' } = req.query;

        const columnList = (columns as string).split(',').map(c => c.trim());
        const buffer = excelParserService.createTemplate(pageName as string, columnList);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${pageName}-template.xlsx"`);
        res.send(buffer);
    } catch (error) {
        logger.error('Error creating template:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router;
