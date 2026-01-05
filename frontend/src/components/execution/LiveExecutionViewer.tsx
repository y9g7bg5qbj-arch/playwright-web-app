/**
 * LiveExecutionViewer - Netflix-style grid for viewing live test execution
 * 
 * Shows a grid of VNC tiles, one per Docker shard, allowing real-time browser viewing
 * like Sauce Labs or Selenium Grid.
 */
import React, { useState } from 'react';
import { VNCTile } from './VNCTile';
import { FullscreenViewer } from './FullscreenViewer';
import './LiveExecutionViewer.css';

export interface ShardInfo {
    id: string;
    shardIndex: number;
    totalShards: number;
    vncUrl: string;
    status: 'pending' | 'running' | 'passed' | 'failed' | 'connecting';
    currentTest?: string;
    progress?: {
        passed: number;
        failed: number;
        total: number;
    };
}

export interface LiveExecutionViewerProps {
    executionId: string;
    shards: ShardInfo[];
    onClose?: () => void;
}

export const LiveExecutionViewer: React.FC<LiveExecutionViewerProps> = ({
    executionId,
    shards,
    onClose,
}) => {
    const [expandedShard, setExpandedShard] = useState<string | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Calculate overall status
    const runningCount = shards.filter(s => s.status === 'running').length;

    const handleTileClick = (shardId: string) => {
        setExpandedShard(shardId);
    };

    const handleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    const selectedShard = shards.find(s => s.id === expandedShard);

    return (
        <div className={`live-execution-viewer ${isFullscreen ? 'fullscreen' : ''}`}>
            {/* Header */}
            <div className="viewer-header">
                <div className="viewer-title">
                    <span className="icon">🎬</span>
                    <span>Live Execution View</span>
                </div>
                <div className="viewer-status">
                    <span className="execution-id">Execution: {executionId.slice(0, 16)}</span>
                    <span className="status-badge running">
                        ⚡ Running ({runningCount}/{shards.length})
                    </span>
                </div>
                <div className="viewer-actions">
                    <button onClick={handleFullscreen} className="action-btn">
                        ⛶ Fullscreen
                    </button>
                    {onClose && (
                        <button onClick={onClose} className="action-btn close">
                            ✕
                        </button>
                    )}
                </div>
            </div>

            {/* Grid of VNC tiles */}
            <div className="shard-grid">
                {shards.map((shard) => (
                    <VNCTile
                        key={shard.id}
                        shard={shard}
                        isExpanded={false}
                        onClick={() => handleTileClick(shard.id)}
                    />
                ))}
            </div>

            {/* Fullscreen modal - Sauce Labs style */}
            {selectedShard && (
                <FullscreenViewer
                    shard={selectedShard}
                    onClose={() => setExpandedShard(null)}
                />
            )}
        </div>
    );
};

export default LiveExecutionViewer;

