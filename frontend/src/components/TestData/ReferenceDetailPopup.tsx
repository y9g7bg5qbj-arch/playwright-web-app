/**
 * Reference Detail Popup
 * 
 * Shows full row details when clicking on a reference chip.
 * Displays all columns from the referenced table in a key-value format.
 */

import { useState, useEffect, useCallback } from 'react';
import { X, ExternalLink, Loader2 } from 'lucide-react';
import type { ReferenceConfig } from './AGGridDataTable';
import { testDataApi } from '@/api/testData';

interface ReferenceDetailPopupProps {
    referenceId: string;
    referenceConfig: ReferenceConfig;
    displayValue: string;
    position: { x: number; y: number };
    onClose: () => void;
    onNavigate?: (sheetId: string) => void;
}

interface RowData {
    [key: string]: any;
}

export function ReferenceDetailPopup({
    referenceId,
    referenceConfig,
    displayValue,
    position,
    onClose,
    onNavigate,
}: ReferenceDetailPopupProps) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [rowData, setRowData] = useState<RowData | null>(null);

    // Fetch the full row data from the target sheet
    useEffect(() => {
        const fetchRowData = async () => {
            setLoading(true);
            setError(null);

            try {
                const sheet = await testDataApi.getSheet(referenceConfig.targetSheet);
                const rows = sheet.rows || [];

                // Find the row matching our reference ID
                const matchingRow = rows.find((row) => {
                    const idValue = row.data[referenceConfig.targetColumn];
                    return String(idValue) === String(referenceId);
                });

                if (matchingRow) {
                    setRowData(matchingRow.data);
                } else {
                    setError('Referenced row not found');
                }
            } catch (err) {
                console.error('Failed to fetch reference details:', err);
                setError('Failed to load details');
            } finally {
                setLoading(false);
            }
        };

        fetchRowData();
    }, [referenceId, referenceConfig.targetSheet, referenceConfig.targetColumn]);

    // Handle click outside
    const handleBackdropClick = useCallback((e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    }, [onClose]);

    // Handle escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    // Calculate popup position (ensure it stays within viewport)
    const popupStyle: React.CSSProperties = {
        position: 'fixed',
        left: Math.min(position.x, window.innerWidth - 360),
        top: Math.min(position.y + 10, window.innerHeight - 400),
        zIndex: 60,
    };

    return (
        <>
            {/* Invisible backdrop for click-outside */}
            <div
                className="fixed inset-0 z-50"
                onClick={handleBackdropClick}
            />

            {/* Popup */}
            <div
                style={popupStyle}
                className="w-[340px] bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl overflow-hidden"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#30363d] bg-[#0d1117]">
                    <div className="flex items-center gap-2">
                        <span className="text-lg">🔗</span>
                        <div>
                            <h3 className="text-sm font-semibold text-white">{displayValue}</h3>
                            <p className="text-xs text-[#8b949e]">
                                From: {referenceConfig.targetSheet}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-[#30363d] rounded transition-colors"
                    >
                        <X className="w-4 h-4 text-[#8b949e]" />
                    </button>
                </div>

                {/* Content */}
                <div className="max-h-[280px] overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 text-sky-400 animate-spin" />
                        </div>
                    ) : error ? (
                        <div className="text-center py-8 text-red-400">
                            <p className="text-sm">{error}</p>
                        </div>
                    ) : rowData ? (
                        <div className="divide-y divide-[#30363d]/50">
                            {Object.entries(rowData).map(([key, value]) => (
                                <div
                                    key={key}
                                    className="flex items-start gap-3 px-4 py-2.5 hover:bg-[#21262d]/50"
                                >
                                    <span className="text-xs text-[#8b949e] min-w-[80px] font-medium truncate">
                                        {key}
                                    </span>
                                    <span className="text-sm text-white flex-1 break-words">
                                        {value === null || value === undefined
                                            ? <span className="text-[#6e7681] italic">null</span>
                                            : typeof value === 'boolean'
                                                ? value ? '✓ Yes' : '✗ No'
                                                : String(value)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : null}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-[#30363d] bg-[#0d1117]/50">
                    <span className="text-xs text-[#6e7681]">
                        ID: {referenceId}
                    </span>
                    <div className="flex gap-2">
                        {onNavigate && (
                            <button
                                onClick={() => onNavigate(referenceConfig.targetSheet)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#21262d] hover:bg-[#30363d] rounded-lg text-[#c9d1d9] transition-colors"
                            >
                                <ExternalLink className="w-3 h-3" />
                                Open Table
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="px-3 py-1.5 text-xs bg-sky-600 hover:bg-sky-500 rounded-lg text-white transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}

export default ReferenceDetailPopup;
