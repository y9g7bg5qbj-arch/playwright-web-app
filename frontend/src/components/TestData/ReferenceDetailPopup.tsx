/**
 * Reference Detail Popup
 *
 * Shows full row details when clicking on a reference chip.
 * Displays all columns from the referenced table in a key-value format.
 */

import { useState, useEffect } from 'react';
import { ExternalLink, Loader2 } from 'lucide-react';
import { Modal, Button } from '@/components/ui';
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

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title={displayValue}
            description={`From: ${referenceConfig.targetSheet}`}
            size="sm"
            footer={
                <div className="flex items-center justify-between w-full">
                    <span className="text-xs text-text-muted">ID: {referenceId}</span>
                    <div className="flex gap-2">
                        {onNavigate && (
                            <Button
                                variant="ghost"
                                onClick={() => onNavigate(referenceConfig.targetSheet)}
                                leftIcon={<ExternalLink className="w-3 h-3" />}
                            >
                                Open Table
                            </Button>
                        )}
                        <Button variant="secondary" onClick={onClose}>
                            Close
                        </Button>
                    </div>
                </div>
            }
        >
            {loading ? (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-status-info animate-spin" />
                </div>
            ) : error ? (
                <div className="text-center py-8 text-status-danger">
                    <p className="text-sm">{error}</p>
                </div>
            ) : rowData ? (
                <div className="divide-y divide-border-default/50">
                    {Object.entries(rowData).map(([key, value]) => (
                        <div
                            key={key}
                            className="flex items-start gap-3 px-4 py-2.5 hover:bg-dark-elevated/50"
                        >
                            <span className="text-xs text-text-secondary min-w-[80px] font-medium truncate">
                                {key}
                            </span>
                            <span className="text-sm text-white flex-1 break-words">
                                {value === null || value === undefined
                                    ? <span className="text-text-muted italic">null</span>
                                    : typeof value === 'boolean'
                                        ? value ? '✓ Yes' : '✗ No'
                                        : String(value)}
                            </span>
                        </div>
                    ))}
                </div>
            ) : null}
        </Modal>
    );
}

export default ReferenceDetailPopup;
