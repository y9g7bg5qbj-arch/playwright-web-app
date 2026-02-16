/**
 * Custom hook for computing inspector and quality report data.
 *
 * Extracted from TestDataPage to isolate the memoized data-quality
 * computations (empty checks, duplicate checks, validation checks).
 */

import { useMemo } from 'react';
import type { DataSheet, DataRow, InspectorData, QualityReportData } from './testDataTypes';
import { mapColumnType } from './testDataUtils';

interface UseInspectorDataParams {
    selectedSheet: DataSheet | null;
    rows: DataRow[];
    filteredRowCount: number;
    currentFilterState: Record<string, unknown>;
}

export function useInspectorData({
    selectedSheet,
    rows,
    filteredRowCount,
    currentFilterState,
}: UseInspectorDataParams): { inspectorData: InspectorData; qualityReportData: QualityReportData } {
    const inspectorData = useMemo<InspectorData>(() => {
        if (!selectedSheet) {
            return {
                rowCount: 0,
                columnCount: 0,
                filteredRowCount: 0,
                activeFilters: 0,
                emptyChecks: [],
                duplicateChecks: [],
                validationIssueCount: 0,
                validationChecks: [],
            };
        }

        const emptyChecks = selectedSheet.columns
            .map((column) => ({
                column: column.name,
                count: rows.filter((row) => {
                    const value = row.data[column.name];
                    return value === '' || value === null || value === undefined;
                }).length,
            }))
            .filter((entry) => entry.count > 0)
            .sort((a, b) => b.count - a.count)
            .slice(0, 4);

        const duplicateChecks = selectedSheet.columns
            .map((column) => {
                const values = rows.map((row) => String(row.data[column.name] ?? '')).filter(Boolean);
                const counts = values.reduce<Record<string, number>>((acc, value) => {
                    acc[value] = (acc[value] || 0) + 1;
                    return acc;
                }, {});
                const duplicateCount = Object.values(counts)
                    .filter((count) => count > 1)
                    .reduce((sum, count) => sum + count, 0);
                return { column: column.name, count: duplicateCount };
            })
            .filter((entry) => entry.count > 0)
            .sort((a, b) => b.count - a.count)
            .slice(0, 4);

        const validationChecks = selectedSheet.columns
            .map((column) => {
                const mappedType = mapColumnType(column.type);
                const invalidCount = rows.filter((row) => {
                    const value = row.data[column.name];
                    if (value === '' || value === null || value === undefined) {
                        return Boolean(column.required);
                    }

                    if (mappedType === 'number') {
                        return !Number.isFinite(typeof value === 'number' ? value : Number(String(value)));
                    }
                    if (mappedType === 'boolean') {
                        const lower = typeof value === 'string' ? value.toLowerCase() : '';
                        const validBoolean = typeof value === 'boolean' || lower === 'true' || lower === 'false' || lower === '1' || lower === '0' || value === 0 || value === 1;
                        return !validBoolean;
                    }
                    if (mappedType === 'date') {
                        const parsed = value instanceof Date ? value.getTime() : Date.parse(String(value));
                        return Number.isNaN(parsed);
                    }
                    return false;
                }).length;
                return { column: column.name, count: invalidCount };
            })
            .filter((entry) => entry.count > 0)
            .sort((a, b) => b.count - a.count)
            .slice(0, 4);

        return {
            rowCount: rows.length,
            columnCount: selectedSheet.columns.length,
            filteredRowCount,
            activeFilters: Object.keys(currentFilterState || {}).length,
            emptyChecks,
            duplicateChecks,
            validationIssueCount: validationChecks.reduce((sum, entry) => sum + entry.count, 0),
            validationChecks,
        };
    }, [currentFilterState, filteredRowCount, rows, selectedSheet]);

    const qualityReportData = useMemo<QualityReportData>(() => {
        if (!selectedSheet) {
            return {
                typeIssueCount: 0,
                duplicateIssueCount: 0,
                requiredGapCount: 0,
                requiredFields: [],
                duplicateChecks: [],
            };
        }

        const requiredFields = selectedSheet.columns
            .filter((column) => column.required)
            .map((column) => {
                const missing = rows.filter((row) => {
                    const value = row.data[column.name];
                    return value === null || value === undefined || value === '';
                }).length;
                const completionRate = rows.length === 0 ? 100 : Math.max(0, Math.round(((rows.length - missing) / rows.length) * 100));
                return {
                    column: column.name,
                    missing,
                    completionRate,
                };
            })
            .sort((a, b) => b.missing - a.missing);

        const duplicateChecks = selectedSheet.columns
            .filter((column) => column.required || /(id|key|email|code)/i.test(column.name))
            .map((column) => {
                const values = rows
                    .map((row) => row.data[column.name])
                    .filter((value) => value !== null && value !== undefined && value !== '')
                    .map((value) => String(value));
                const counts = values.reduce<Record<string, number>>((acc, value) => {
                    acc[value] = (acc[value] || 0) + 1;
                    return acc;
                }, {});
                const duplicateRows = Object.values(counts)
                    .filter((count) => count > 1)
                    .reduce((sum, count) => sum + count, 0);
                return {
                    column: column.name,
                    duplicateRows,
                    distinctValues: Object.keys(counts).length,
                    totalValues: values.length,
                };
            })
            .filter((check) => check.totalValues > 0)
            .sort((a, b) => b.duplicateRows - a.duplicateRows);

        return {
            typeIssueCount: inspectorData.validationIssueCount,
            duplicateIssueCount: duplicateChecks.reduce((sum, check) => sum + check.duplicateRows, 0),
            requiredGapCount: requiredFields.reduce((sum, field) => sum + field.missing, 0),
            requiredFields,
            duplicateChecks,
        };
    }, [inspectorData.validationIssueCount, rows, selectedSheet]);

    return { inspectorData, qualityReportData };
}
