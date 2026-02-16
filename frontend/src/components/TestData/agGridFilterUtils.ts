/**
 * AG Grid Filter Utilities
 *
 * Pure functions for converting AG Grid filter models to VDQL queries
 * and theming utilities for the AG Grid dark theme.
 */

import { themeQuartz } from 'ag-grid-community';
import type { DataColumn } from './AGGridDataTable';

/**
 * Read resolved CSS custom property values from :root (single source of truth in index.css)
 */
export function getCSSToken(name: string, fallback: string): string {
    if (typeof document === 'undefined') return fallback;
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || fallback;
}

// Token-bound dark theme for AG Grid (synced with :root custom properties in index.css)
export const darkTheme = themeQuartz.withParams({
    backgroundColor: getCSSToken('--bg-primary', '#14151a'),
    headerBackgroundColor: getCSSToken('--bg-secondary', '#1c1d24'),
    oddRowBackgroundColor: getCSSToken('--bg-canvas', '#0d0e12'),
    rowHoverColor: getCSSToken('--bg-hover', 'rgba(255,255,255,0.06)'),
    borderColor: getCSSToken('--border-default', 'rgba(255,255,255,0.08)'),
    headerTextColor: getCSSToken('--text-secondary', '#8b949e'),
    foregroundColor: getCSSToken('--text-primary', '#e6edf3'),
    selectedRowBackgroundColor: getCSSToken('--bg-selected', 'rgba(53,116,240,0.14)'),
    accentColor: getCSSToken('--brand-primary', '#3574f0'),
});

/**
 * Quote a column name if it contains spaces or special characters.
 * VDQL identifiers with non-alphanumeric chars need backtick quoting.
 */
export function quoteColumnName(name: string): string {
    if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
        return name;
    }
    return `\`${name}\``;
}

/**
 * Convert AG Grid filter model to VDQL query string
 */
export function filterModelToVDQL(
    filterModel: Record<string, any>,
    tableName: string,
    columns: DataColumn[]
): string {
    const conditions: string[] = [];

    for (const [columnName, filter] of Object.entries(filterModel)) {
        const column = columns.find(c => c.name === columnName);
        const isText = !column || column.type === 'text' || column.type === 'date';
        const quotedName = quoteColumnName(columnName);

        if (filter.filterType === 'text') {
            const condition = convertTextFilter(quotedName, filter, isText);
            if (condition) conditions.push(condition);
        } else if (filter.filterType === 'number') {
            const condition = convertNumberFilter(quotedName, filter);
            if (condition) conditions.push(condition);
        } else if (filter.operator) {
            // Combined filter (AND/OR)
            const subConditions: string[] = [];
            if (filter.condition1) {
                const cond = filter.filterType === 'text'
                    ? convertTextFilter(quotedName, filter.condition1, isText)
                    : convertNumberFilter(quotedName, filter.condition1);
                if (cond) subConditions.push(cond);
            }
            if (filter.condition2) {
                const cond = filter.filterType === 'text'
                    ? convertTextFilter(quotedName, filter.condition2, isText)
                    : convertNumberFilter(quotedName, filter.condition2);
                if (cond) subConditions.push(cond);
            }
            if (subConditions.length === 2) {
                const op = String(filter.operator || 'AND').toUpperCase() === 'OR' ? 'OR' : 'AND';
                conditions.push(`(${subConditions.join(` ${op} `)})`);
            } else if (subConditions.length === 1) {
                conditions.push(subConditions[0]);
            }
        }
    }

    // Convert table name to PascalCase
    const pascalTableName = tableName
        .replace(/[^a-zA-Z0-9]/g, ' ')
        .split(' ')
        .filter(Boolean)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join('');

    if (conditions.length === 0) {
        return `ROWS many FROM ${pascalTableName}`;
    }

    return `ROWS many FROM ${pascalTableName} WHERE ${conditions.join(' AND ')}`;
}

export function convertTextFilter(columnName: string, filter: any, isText: boolean): string | null {
    const value = filter.filter;
    if (value === undefined || value === null || value === '') return null;

    const quotedValue = isText ? `"${value}"` : value;

    switch (filter.type) {
        case 'equals':
            return `${columnName} = ${quotedValue}`;
        case 'notEqual':
            return `${columnName} != ${quotedValue}`;
        case 'contains':
            return `${columnName} CONTAINS ${quotedValue}`;
        case 'notContains':
            return `NOT (${columnName} CONTAINS ${quotedValue})`;
        case 'startsWith':
            return `${columnName} STARTS WITH ${quotedValue}`;
        case 'endsWith':
            return `${columnName} ENDS WITH ${quotedValue}`;
        case 'blank':
            return `${columnName} IS EMPTY`;
        case 'notBlank':
            return `${columnName} IS NOT EMPTY`;
        default:
            return `${columnName} = ${quotedValue}`;
    }
}

export function convertNumberFilter(columnName: string, filter: any): string | null {
    const value = filter.filter;
    if (value === undefined || value === null) {
        if (filter.type === 'blank') return `${columnName} IS EMPTY`;
        if (filter.type === 'notBlank') return `${columnName} IS NOT EMPTY`;
        return null;
    }

    switch (filter.type) {
        case 'equals':
            return `${columnName} = ${value}`;
        case 'notEqual':
            return `${columnName} != ${value}`;
        case 'greaterThan':
            return `${columnName} > ${value}`;
        case 'greaterThanOrEqual':
            return `${columnName} >= ${value}`;
        case 'lessThan':
            return `${columnName} < ${value}`;
        case 'lessThanOrEqual':
            return `${columnName} <= ${value}`;
        case 'inRange':
            if (filter.filterTo !== undefined) {
                return `${columnName} >= ${value} AND ${columnName} <= ${filter.filterTo}`;
            }
            return `${columnName} >= ${value}`;
        case 'blank':
            return `${columnName} IS EMPTY`;
        case 'notBlank':
            return `${columnName} IS NOT EMPTY`;
        default:
            return `${columnName} = ${value}`;
    }
}
