/**
 * VNCTile - Individual tile component for displaying a live browser stream
 * 
 * Features:
 * - Embedded noVNC iframe for real-time browser viewing
 * - Hover effect with test details expansion
 * - Click to expand to full view
 * - Status overlay (running/passed/failed)
 */
import React, { useState, useRef } from 'react';
import type { ShardInfo } from './LiveExecutionViewer';
import './VNCTile.css';

export interface VNCTileProps {
    shard: ShardInfo;
    isExpanded?: boolean;
    isFullView?: boolean;
    onClick?: () => void;
}

export const VNCTile: React.FC<VNCTileProps> = ({
    shard,
    isExpanded = false,
    isFullView = false,
    onClick,
}) => {
    const [isHovered, setIsHovered] = useState(false);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    // Build noVNC URL - connects to the websockify endpoint
    const noVNCUrl = shard.vncUrl ? `${shard.vncUrl}?autoconnect=true&resize=scale` : '';

    const getStatusIcon = () => {
        switch (shard.status) {
            case 'running':
                return '🔄';
            case 'passed':
                return '✅';
            case 'failed':
                return '❌';
            case 'pending':
                return '⏳';
            case 'connecting':
                return '🔌';
            default:
                return '⏳';
        }
    };

    const getStatusColor = () => {
        switch (shard.status) {
            case 'running':
                return 'var(--status-running)';
            case 'passed':
                return 'var(--status-passed)';
            case 'failed':
                return 'var(--status-failed)';
            default:
                return 'var(--status-pending)';
        }
    };

    return (
        <div
            className={`vnc-tile ${isExpanded ? 'expanded' : ''} ${isFullView ? 'full-view' : ''} ${isHovered ? 'hovered' : ''}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={onClick}
        >
            {/* VNC iframe */}
            <div className="vnc-frame">
                {noVNCUrl ? (
                    <iframe
                        ref={iframeRef}
                        src={noVNCUrl}
                        title={`Shard ${shard.shardIndex}`}
                        className="novnc-iframe"
                        sandbox="allow-scripts allow-same-origin"
                    />
                ) : (
                    <div className="vnc-placeholder">
                        <span className="placeholder-icon">🖥️</span>
                        <span>Waiting for connection...</span>
                    </div>
                )}
            </div>

            {/* Status indicator */}
            <div className="status-indicator" style={{ backgroundColor: getStatusColor() }}>
                {getStatusIcon()}
            </div>

            {/* Overlay info - always visible */}
            <div className="tile-overlay">
                <div className="shard-label">
                    🖥️ Shard {shard.shardIndex}/{shard.totalShards}
                </div>

                {/* Progress bar */}
                {shard.progress && (
                    <div className="progress-bar">
                        <div
                            className="progress-fill passed"
                            style={{ width: `${(shard.progress.passed / shard.progress.total) * 100}%` }}
                        />
                        <div
                            className="progress-fill failed"
                            style={{
                                width: `${(shard.progress.failed / shard.progress.total) * 100}%`,
                                left: `${(shard.progress.passed / shard.progress.total) * 100}%`
                            }}
                        />
                    </div>
                )}
            </div>

            {/* Expanded info - visible on hover */}
            <div className={`expanded-info ${isHovered || isExpanded ? 'visible' : ''}`}>
                {shard.currentTest && (
                    <div className="current-test">
                        <span className="label">Current Test:</span>
                        <span className="test-name">{shard.currentTest}</span>
                    </div>
                )}

                {shard.progress && (
                    <div className="progress-stats">
                        <span className="stat passed">✓ {shard.progress.passed}</span>
                        <span className="stat failed">✗ {shard.progress.failed}</span>
                        <span className="stat total">/ {shard.progress.total}</span>
                    </div>
                )}

                <div className="click-hint">
                    Click to {isFullView ? 'minimize' : 'expand'}
                </div>
            </div>
        </div>
    );
};

export default VNCTile;
