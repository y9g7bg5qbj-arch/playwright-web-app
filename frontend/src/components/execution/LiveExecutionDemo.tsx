/**
 * Demo page for testing LiveExecutionViewer
 * 
 * This provides a standalone demo with mock shards to preview the UI
 * before Docker integration.
 */
import React from 'react';
import { LiveExecutionViewer, ShardInfo } from './LiveExecutionViewer';

// Mock shards for demo
const mockShards: ShardInfo[] = [
    {
        id: 'shard-1',
        shardIndex: 1,
        totalShards: 4,
        vncUrl: 'http://localhost:6081/vnc.html',
        status: 'running',
        currentTest: 'Login Test - should authenticate user',
        progress: { passed: 3, failed: 0, total: 6 },
    },
    {
        id: 'shard-2',
        shardIndex: 2,
        totalShards: 4,
        vncUrl: 'http://localhost:6082/vnc.html',
        status: 'running',
        currentTest: 'Cart Test - should add item to cart',
        progress: { passed: 2, failed: 1, total: 6 },
    },
    {
        id: 'shard-3',
        shardIndex: 3,
        totalShards: 4,
        vncUrl: 'http://localhost:6083/vnc.html',
        status: 'passed',
        currentTest: 'Search Test - completed',
        progress: { passed: 6, failed: 0, total: 6 },
    },
    {
        id: 'shard-4',
        shardIndex: 4,
        totalShards: 4,
        vncUrl: 'http://localhost:6084/vnc.html',
        status: 'pending',
        progress: { passed: 0, failed: 0, total: 6 },
    },
];

export const LiveExecutionDemo: React.FC = () => {
    return (
        <LiveExecutionViewer
            executionId="demo-execution-2025-01-01"
            shards={mockShards}
            onClose={() => alert('Close clicked')}
        />
    );
};

export default LiveExecutionDemo;
