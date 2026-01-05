/**
 * FullscreenViewer - Modal component for viewing live execution in fullscreen
 * 
 * Like Sauce Labs / BrowserStack - shows large browser view with test steps sidebar
 */
import React from 'react';
import type { ShardInfo } from './LiveExecutionViewer';
import './FullscreenViewer.css';

export interface FullscreenViewerProps {
    shard: ShardInfo;
    onClose: () => void;
}

export const FullscreenViewer: React.FC<FullscreenViewerProps> = ({
    shard,
    onClose,
}) => {
    // Build noVNC URL for fullscreen
    const noVNCUrl = shard.vncUrl ? `${shard.vncUrl}?autoconnect=true&resize=scale` : '';

    // Handle escape key
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return (
        <div className="fullscreen-viewer-modal" onClick={onClose}>
            <div className="modal-container" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="modal-header">
                    <div className="modal-title">
                        <span className="shard-icon">🖥️</span>
                        <span>Shard {shard.shardIndex}/{shard.totalShards}</span>
                        {shard.status === 'running' && (
                            <div className="live-indicator">
                                <div className="live-dot"></div>
                                LIVE
                            </div>
                        )}
                    </div>
                    <button className="close-btn" onClick={onClose}>✕</button>
                </div>

                {/* Content */}
                <div className="modal-content">
                    {/* Main VNC Viewer */}
                    <div className="main-viewer">
                        <div className="vnc-container">
                            {noVNCUrl ? (
                                <iframe
                                    src={noVNCUrl}
                                    title={`Shard ${shard.shardIndex} Live View`}
                                    className="vnc-iframe-fullscreen"
                                />
                            ) : (
                                <div className="vnc-placeholder-fullscreen">
                                    <span className="placeholder-icon">🖥️</span>
                                    <span className="placeholder-title">Browser View</span>
                                    <span className="placeholder-desc">
                                        With Docker running, this would show the live browser via VNC
                                    </span>
                                    <code className="vnc-url">localhost:608{shard.shardIndex}/vnc.html</code>
                                </div>
                            )}
                        </div>

                        {/* Video Controls */}
                        <div className="video-controls">
                            <button className="control-btn">⏮</button>
                            <button className="control-btn">⏸</button>
                            <button className="control-btn">⏭</button>
                            <div className="progress-track">
                                <div
                                    className="progress-thumb"
                                    style={{
                                        width: shard.progress
                                            ? `${(shard.progress.passed + shard.progress.failed) / shard.progress.total * 100}%`
                                            : '0%'
                                    }}
                                />
                            </div>
                            <span className="time-display">
                                {shard.progress?.passed || 0}/{shard.progress?.total || 0} tests
                            </span>
                            <button className="control-btn" onClick={() => document.documentElement.requestFullscreen()}>⛶</button>
                        </div>
                    </div>

                    {/* Test Steps Sidebar */}
                    <div className="sidebar">
                        <div className="sidebar-header">📋 Test Steps</div>
                        <div className="sidebar-content">
                            <div className="test-list">
                                {shard.currentTest && (
                                    <div className="test-item active running">
                                        <span className="test-status">🔄</span>
                                        <span className="test-name">{shard.currentTest}</span>
                                        <span className="test-duration">...</span>
                                    </div>
                                )}
                                {/* Mock test steps for demo */}
                                <div className="test-item passed">
                                    <span className="test-status">✅</span>
                                    <span className="test-name">Navigate to page</span>
                                    <span className="test-duration">0.8s</span>
                                </div>
                                <div className="test-item passed">
                                    <span className="test-status">✅</span>
                                    <span className="test-name">Wait for element</span>
                                    <span className="test-duration">0.3s</span>
                                </div>
                                {shard.progress && shard.progress.failed > 0 && (
                                    <div className="test-item failed">
                                        <span className="test-status">❌</span>
                                        <span className="test-name">Assert element visible</span>
                                        <span className="test-duration">5.0s</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FullscreenViewer;
