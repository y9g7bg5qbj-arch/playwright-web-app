import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
// @ts-expect-error - supertest types not installed
import request from 'supertest';
import express, { Express } from 'express';
import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises';
import os from 'os';
import path from 'path';

const mocks = vi.hoisted(() => ({
    projectRepository: {
        findById: vi.fn(),
    },
}));

vi.mock('../middleware/auth', () => ({
    authenticateToken: (_req: any, _res: any, next: any) => next(),
    AuthRequest: {} as any,
}));

// Mock MongoDB connection (prevents MONGODB_URI requirement at import time)
vi.mock('../db/mongodb', () => ({
    getMongoUri: () => 'mongodb://localhost:27017/test',
    getDb: vi.fn(),
    COLLECTIONS: {},
}));

vi.mock('../db/repositories/mongo', () => ({
    projectRepository: mocks.projectRepository,
}));

vi.mock('../services/mongodb-test-data.service', () => ({
    mongoTestDataService: {
        getSheetsByApplicationId: vi.fn().mockResolvedValue([]),
    },
}));

describe('Vero definition route PAGEACTIONS lookup', () => {
    let app: Express;
    let tempRoot = '';
    let projectRoot = '';
    let cwdSpy: ReturnType<typeof vi.spyOn>;

    beforeAll(async () => {
        tempRoot = await mkdtemp(path.join(os.tmpdir(), 'vero-definition-route-'));
        cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(tempRoot);

        app = express();
        app.use(express.json());

        const { veroValidationRouter } = await import('../routes/veroValidation.routes');
        app.use('/', veroValidationRouter);
    });

    beforeEach(async () => {
        vi.clearAllMocks();

        mocks.projectRepository.findById.mockResolvedValue({
            id: 'project-1',
            applicationId: 'app-1',
        });

        projectRoot = path.join(tempRoot, 'vero-projects', 'app-1', 'project-1');
        await rm(projectRoot, { recursive: true, force: true });
        await mkdir(path.join(projectRoot, 'sandboxes', 'mikesandbox', 'PageActions'), { recursive: true });

        await writeFile(
            path.join(projectRoot, 'sandboxes', 'mikesandbox', 'PageActions', 'ApexPageActions.vero'),
            `PAGEACTIONS ApexPageActions FOR ApexPage {
    createAccount WITH firstName, lastName {
        CLICK savebutton
    }

    createContact {
        CLICK savebutton
    }
}
`,
            'utf-8'
        );
    });

    afterAll(async () => {
        cwdSpy?.mockRestore();
        if (tempRoot) {
            await rm(tempRoot, { recursive: true, force: true });
        }
    });

    it('resolves PERFORM action definitions inside PAGEACTIONS blocks', async () => {
        const response = await request(app)
            .post('/definition?projectId=project-1')
            .send({ word: 'ApexPageActions.createAccount' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.location).toBeTruthy();
        expect(response.body.location.filePath).toBe(
            path.join(projectRoot, 'sandboxes', 'mikesandbox', 'PageActions', 'ApexPageActions.vero')
        );
        expect(response.body.location.line).toBe(2);
        expect(response.body.location.column).toBe(5);
    });

    it('resolves PAGEACTIONS declarations by name', async () => {
        const response = await request(app)
            .post('/definition?projectId=project-1')
            .send({ word: 'ApexPageActions' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.location).toBeTruthy();
        expect(response.body.location.filePath).toBe(
            path.join(projectRoot, 'sandboxes', 'mikesandbox', 'PageActions', 'ApexPageActions.vero')
        );
        expect(response.body.location.line).toBe(1);
    });
});
