/**
 * Sharding and Execution Streaming Routes
 * 
 * Provides endpoints for:
 * - Docker worker management
 * - VNC stream URLs for live viewing
 * - Execution status and shard info
 */
import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';

const router = Router();
router.use(authenticateToken);

// In-memory storage for demo (replace with database in production)
interface Worker {
    id: string;
    name: string;
    type: 'local' | 'docker' | 'remote';
    host: string;
    vncPort: number;
    status: 'online' | 'offline' | 'busy';
}

interface Execution {
    id: string;
    status: 'pending' | 'running' | 'completed';
    shards: Array<{
        id: string;
        workerId: string;
        shardIndex: number;
        totalShards: number;
        status: 'pending' | 'running' | 'passed' | 'failed';
        currentTest?: string;
        progress: { passed: number; failed: number; total: number };
    }>;
}

// Mock data for development
const workers: Worker[] = [
    { id: 'worker-1', name: 'Docker Shard 1', type: 'docker', host: 'localhost', vncPort: 6081, status: 'online' },
    { id: 'worker-2', name: 'Docker Shard 2', type: 'docker', host: 'localhost', vncPort: 6082, status: 'online' },
];

const executions: Map<string, Execution> = new Map();

/**
 * GET /api/sharding/workers
 * List all registered workers
 */
router.get('/workers', (_req: Request, res: Response) => {
    res.json({
        success: true,
        workers: workers.map(w => ({
            ...w,
            vncUrl: `http://${w.host}:${w.vncPort}/vnc.html`,
        })),
    });
});

/**
 * POST /api/sharding/workers/:id/test
 * Test worker connection
 */
router.post('/workers/:id/test', async (req: Request, res: Response) => {
    const { id } = req.params;
    const worker = workers.find(w => w.id === id);

    if (!worker) {
        return res.status(404).json({ success: false, error: 'Worker not found' });
    }

    // In production: actually test the VNC connection
    res.json({
        success: true,
        message: `Worker ${worker.name} is reachable`,
        latency: Math.floor(Math.random() * 50) + 10, // Mock latency
    });
});

/**
 * GET /api/sharding/executions/:id/streams
 * Get VNC stream URLs for all shards in an execution
 */
router.get('/executions/:id/streams', (req: Request, res: Response) => {
    const { id } = req.params;
    const execution = executions.get(id);

    // For demo, return mock streams even if execution doesn't exist
    const streams = workers.map((worker, index) => ({
        shardId: `shard-${index + 1}`,
        shardIndex: index + 1,
        totalShards: workers.length,
        workerId: worker.id,
        workerName: worker.name,
        vncUrl: `http://${worker.host}:${worker.vncPort}/vnc.html`,
        status: execution?.shards[index]?.status || 'pending',
        currentTest: execution?.shards[index]?.currentTest,
        progress: execution?.shards[index]?.progress || { passed: 0, failed: 0, total: 6 },
    }));

    res.json({
        success: true,
        executionId: id,
        streams,
    });
});

/**
 * POST /api/sharding/execute
 * Start a sharded test execution
 */
router.post('/execute', async (req: Request, res: Response) => {
    const { totalShards = 2 } = req.body;

    // Generate execution ID
    const executionId = `exec-${Date.now()}`;

    // Create execution record
    const execution: Execution = {
        id: executionId,
        status: 'running',
        shards: workers.slice(0, totalShards).map((worker, index) => ({
            id: `shard-${index + 1}`,
            workerId: worker.id,
            shardIndex: index + 1,
            totalShards,
            status: 'pending',
            progress: { passed: 0, failed: 0, total: 6 },
        })),
    };

    executions.set(executionId, execution);

    res.json({
        success: true,
        executionId,
        message: `Started execution with ${totalShards} shards`,
        streams: execution.shards.map((shard, index) => ({
            ...shard,
            vncUrl: `http://${workers[index].host}:${workers[index].vncPort}/vnc.html`,
        })),
    });
});

export default router;
