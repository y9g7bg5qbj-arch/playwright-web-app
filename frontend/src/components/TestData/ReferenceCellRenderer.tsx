/**
 * Reference Cell Renderer
 *
 * AG Grid custom cell renderer for reference columns.
 * Displays resolved display column values instead of raw IDs.
 *
 * Features:
 * - Resolves IDs to display names from referenced table
 * - Shows multiple values as chips when allowMultiple is true
 * - Caches resolved values for performance
 * - Shows loading state while resolving
 * - Hover on chip to see info icon - click to view full row details
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link2, Loader2, AlertCircle, Info } from 'lucide-react';
import type { ReferenceConfig } from './AGGridDataTable';
import { testDataApi } from '@/api/testData';
import { ReferenceDetailPopup } from './ReferenceDetailPopup';

interface ReferenceCellRendererProps {
    value: string;
    referenceConfig: ReferenceConfig;
}

interface ResolvedItem {
    id: string;
    displayValue: string;
}

// Simple in-memory cache for resolved references
const resolvedCache = new Map<string, Map<string, string>>();

export function ReferenceCellRenderer({ value, referenceConfig }: ReferenceCellRendererProps) {
    const [resolvedItems, setResolvedItems] = useState<ResolvedItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);

    // Popup state
    const [popupData, setPopupData] = useState<{
        id: string;
        displayValue: string;
        position: { x: number; y: number };
    } | null>(null);

    // Parse IDs from value
    const ids = useMemo(() => {
        if (!value) return [];
        const separator = referenceConfig.separator || ',';
        return value.split(separator).map(id => id.trim()).filter(Boolean);
    }, [value, referenceConfig.separator]);

    // Resolve IDs to display values
    useEffect(() => {
        if (ids.length === 0) {
            setResolvedItems([]);
            return;
        }

        const resolveIds = async () => {
            const sheetKey = referenceConfig.targetSheet;

            // Check cache first
            let sheetCache = resolvedCache.get(sheetKey);
            const cachedItems: ResolvedItem[] = [];
            const unresolvedIds: string[] = [];

            for (const id of ids) {
                if (sheetCache?.has(id)) {
                    cachedItems.push({ id, displayValue: sheetCache.get(id)! });
                } else {
                    unresolvedIds.push(id);
                }
            }

            // If all values are cached, use them
            if (unresolvedIds.length === 0) {
                // Preserve order based on original IDs
                const orderedItems = ids.map(id => ({
                    id,
                    displayValue: sheetCache?.get(id) || id,
                }));
                setResolvedItems(orderedItems);
                return;
            }

            // Need to fetch unresolved values
            setLoading(true);
            setError(false);

            try {
                // Fetch the target sheet with its rows
                const sheet = await testDataApi.getSheet(referenceConfig.targetSheet);
                const rows = sheet.rows || [];

                // Build cache
                if (!sheetCache) {
                    sheetCache = new Map();
                    resolvedCache.set(sheetKey, sheetCache);
                }

                for (const row of rows) {
                    const id = String(row.data[referenceConfig.targetColumn] || row.id);
                    const display = String(row.data[referenceConfig.displayColumn] || id);
                    sheetCache.set(id, display);
                }

                // Resolve all IDs
                const allResolved = ids.map(id => ({
                    id,
                    displayValue: sheetCache?.get(id) || id,
                }));
                setResolvedItems(allResolved);
            } catch (err) {
                console.error('Failed to resolve references:', err);
                setError(true);
                // Fall back to showing raw IDs
                setResolvedItems(ids.map(id => ({ id, displayValue: id })));
            } finally {
                setLoading(false);
            }
        };

        resolveIds();
    }, [ids, referenceConfig.targetSheet, referenceConfig.targetColumn, referenceConfig.displayColumn]);

    // Handle info button click - open popup
    const handleInfoClick = useCallback((
        e: React.MouseEvent,
        item: ResolvedItem
    ) => {
        e.stopPropagation(); // Prevent cell editing from triggering
        e.preventDefault();

        setPopupData({
            id: item.id,
            displayValue: item.displayValue,
            position: { x: e.clientX, y: e.clientY },
        });
    }, []);

    // Close popup
    const handleClosePopup = useCallback(() => {
        setPopupData(null);
    }, []);

    // No value
    if (!value || ids.length === 0) {
        return (
            <span className="text-[#6e7681] italic text-sm">
                No reference
            </span>
        );
    }

    // Loading state
    if (loading) {
        return (
            <span className="flex items-center gap-1.5 text-[#8b949e] text-sm">
                <Loader2 className="w-3 h-3 animate-spin" />
                Loading...
            </span>
        );
    }

    // Error state
    if (error) {
        return (
            <span className="flex items-center gap-1.5 text-amber-400 text-sm">
                <AlertCircle className="w-3 h-3" />
                {ids.join(', ')}
            </span>
        );
    }

    // Chip component with hover-to-show info button
    const ReferenceChip = ({ item }: { item: ResolvedItem }) => (
        <span
            className="group inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-sky-500/20 text-sky-300 rounded text-xs truncate max-w-28"
            title={item.displayValue}
        >
            <span className="truncate">{item.displayValue}</span>
            <button
                onClick={(e) => handleInfoClick(e, item)}
                onMouseDown={(e) => e.stopPropagation()} // Prevent AG Grid cell selection
                className="ml-0.5 opacity-0 group-hover:opacity-100 p-0.5 hover:bg-sky-400/30 rounded transition-opacity"
                title={`View ${item.displayValue} details`}
            >
                <Info className="w-2.5 h-2.5" />
            </button>
        </span>
    );

    // Single value
    if (resolvedItems.length === 1) {
        const item = resolvedItems[0];
        return (
            <>
                <span className="flex items-center gap-1.5 text-[#c9d1d9] text-sm group">
                    <Link2 className="w-3 h-3 text-sky-400 flex-shrink-0" />
                    <span className="truncate">{item.displayValue}</span>
                    <button
                        onClick={(e) => handleInfoClick(e, item)}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-sky-400/30 rounded transition-opacity"
                        title={`View ${item.displayValue} details`}
                    >
                        <Info className="w-3 h-3 text-sky-400" />
                    </button>
                </span>

                {popupData && (
                    <ReferenceDetailPopup
                        referenceId={popupData.id}
                        referenceConfig={referenceConfig}
                        displayValue={popupData.displayValue}
                        position={popupData.position}
                        onClose={handleClosePopup}
                    />
                )}
            </>
        );
    }

    // Multiple values - show as chips with info buttons
    return (
        <>
            <div className="flex items-center gap-1 overflow-hidden">
                <Link2 className="w-3 h-3 text-sky-400 flex-shrink-0" />
                <div className="flex items-center gap-1 overflow-hidden">
                    {resolvedItems.slice(0, 3).map((item, idx) => (
                        <ReferenceChip key={idx} item={item} />
                    ))}
                    {resolvedItems.length > 3 && (
                        <span className="text-xs text-[#6e7681]">
                            +{resolvedItems.length - 3} more
                        </span>
                    )}
                </div>
            </div>

            {popupData && (
                <ReferenceDetailPopup
                    referenceId={popupData.id}
                    referenceConfig={referenceConfig}
                    displayValue={popupData.displayValue}
                    position={popupData.position}
                    onClose={handleClosePopup}
                />
            )}
        </>
    );
}

// Clear cache for a specific sheet (call when sheet data changes)
export function clearReferenceCache(sheetId?: string) {
    if (sheetId) {
        resolvedCache.delete(sheetId);
    } else {
        resolvedCache.clear();
    }
}

export default ReferenceCellRenderer;
