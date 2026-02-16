/**
 * VDQL (Vero Data Query Language) transpilation functions extracted from the Transpiler class.
 */

import type {
    ExpressionNode,
    DataQueryStatement, DataQuery, TableQuery, AggregationQuery,
    DataCondition, DataComparison
} from '../parser/ast.js';

/**
 * Callback interface for helpers that the VDQL transpiler needs from the main Transpiler.
 */
export interface TranspilerHelpers {
    indent: number;
    line: (content: string) => string;
    transpileExpression: (expr: ExpressionNode) => string;
}

export function transpileDataQueryStatement(
    statement: DataQueryStatement,
    helpers: TranspilerHelpers
): string {
    const { resultType, variableName, query } = statement;
    const tsType = getVDQLResultType(resultType);
    const queryCode = transpileDataQuery(query, helpers);
    return `const ${variableName}: ${tsType} = ${queryCode};`;
}

export function getVDQLResultType(resultType: DataQueryStatement['resultType']): string {
    const typeMap: Record<string, string> = {
        'DATA': 'Record<string, unknown>',
        'LIST': 'unknown[]',
        'TEXT': 'string',
        'NUMBER': 'number',
        'FLAG': 'boolean'
    };
    return typeMap[resultType] || 'unknown';
}

export function transpileDataQuery(query: DataQuery, helpers: TranspilerHelpers): string {
    if (query.type === 'TableQuery') {
        return transpileTableQuery(query, helpers);
    } else {
        return transpileAggregationQuery(query, helpers);
    }
}

export function transpileTableQuery(query: TableQuery, helpers: TranspilerHelpers): string {
    const parts: string[] = [];

    // Build the query chain
    parts.push(`await dataManager.query('${query.tableRef.tableName}')`);

    // Add column selection if specified (single column)
    if (query.tableRef.column) {
        parts.push(`.select('${query.tableRef.column}')`);
    }

    // Add multi-column selection: .(email, name)
    if (query.columns && query.columns.length > 0) {
        const columnList = query.columns.map(c => `'${c}'`).join(', ');
        parts.push(`.select([${columnList}])`);
    }

    // Add row index access if specified
    if (query.tableRef.rowIndex !== undefined) {
        parts.push(`.row(${helpers.transpileExpression(query.tableRef.rowIndex)})`);
    }

    // Add row range access: [5..10]
    if (query.tableRef.rangeStart !== undefined && query.tableRef.rangeEnd !== undefined) {
        parts.push(`.range(${helpers.transpileExpression(query.tableRef.rangeStart)}, ${helpers.transpileExpression(query.tableRef.rangeEnd)})`);
    }

    // Add cell access if specified
    if (query.tableRef.cellRow !== undefined && query.tableRef.cellCol !== undefined) {
        parts.push(`.cell(${helpers.transpileExpression(query.tableRef.cellRow)}, ${helpers.transpileExpression(query.tableRef.cellCol)})`);
    }

    // Add WHERE clause
    if (query.where) {
        const whereCode = transpileDataCondition(query.where, helpers);
        parts.push(`.where(${whereCode})`);
    }

    // Add ORDER BY
    if (query.orderBy && query.orderBy.length > 0) {
        const orderFields = query.orderBy.map(o =>
            `{ column: '${o.column}', direction: '${o.direction}' }`
        ).join(', ');
        parts.push(`.orderBy([${orderFields}])`);
    }

    // Add LIMIT
    if (query.limit !== undefined) {
        parts.push(`.limit(${query.limit})`);
    }

    // Add OFFSET
    if (query.offset !== undefined) {
        parts.push(`.offset(${query.offset})`);
    }

    // Add position modifier (first/last/random)
    if (query.position === 'first') {
        parts.push('.first()');
    } else if (query.position === 'last') {
        parts.push('.last()');
    } else if (query.position === 'random') {
        parts.push('.random()');
    }

    // Add default value
    if (query.defaultValue) {
        parts.push(`.default(${helpers.transpileExpression(query.defaultValue)})`);
    }

    return parts.join('');
}

export function transpileAggregationQuery(
    query: AggregationQuery,
    helpers: TranspilerHelpers
): string {
    const funcMap: Record<string, string> = {
        'COUNT': 'count',
        'SUM': 'sum',
        'AVERAGE': 'average',
        'MIN': 'min',
        'MAX': 'max',
        'DISTINCT': 'distinct',
        'ROWS': 'rowCount',
        'COLUMNS': 'columnCount',
        'HEADERS': 'headers'
    };

    const funcName = funcMap[query.function] || 'count';
    const parts: string[] = [];

    parts.push(`await dataManager.query('${query.tableRef.tableName}')`);

    // Add WHERE clause before aggregation
    if (query.where) {
        const whereCode = transpileDataCondition(query.where, helpers);
        parts.push(`.where(${whereCode})`);
    }

    // Add aggregation function
    if (query.column) {
        parts.push(`.${funcName}('${query.column}')`);
    } else {
        parts.push(`.${funcName}()`);
    }

    // Handle distinct modifier
    if (query.distinct && query.function === 'COUNT') {
        // Rewrite for count distinct
        return `await dataManager.query('${query.tableRef.tableName}')${query.where ? `.where(${transpileDataCondition(query.where, helpers)})` : ''}.countDistinct('${query.column || '*'}')`;
    }

    return parts.join('');
}

export function transpileDataCondition(
    condition: DataCondition,
    helpers: TranspilerHelpers
): string {
    switch (condition.type) {
        case 'And':
            return `and(${transpileDataCondition(condition.left, helpers)}, ${transpileDataCondition(condition.right, helpers)})`;
        case 'Or':
            return `or(${transpileDataCondition(condition.left, helpers)}, ${transpileDataCondition(condition.right, helpers)})`;
        case 'Not':
            return `not(${transpileDataCondition(condition.condition, helpers)})`;
        case 'Comparison':
            return transpileDataComparison(condition, helpers);
        default:
            return 'true';
    }
}

export function transpileDataComparison(
    comparison: DataComparison,
    helpers: TranspilerHelpers
): string {
    const { column, operator, value, values } = comparison;

    // Handle null/empty checks
    if (operator === 'IS_NULL') {
        return `isNull('${column}')`;
    }
    if (operator === 'IS_EMPTY') {
        return `isEmpty('${column}')`;
    }
    if (operator === 'IS_NOT_EMPTY') {
        return `isNotEmpty('${column}')`;
    }

    // Handle IN/NOT IN
    if (operator === 'IN' && values) {
        const valuesCode = values.map(v => helpers.transpileExpression(v)).join(', ');
        return `isIn('${column}', [${valuesCode}])`;
    }
    if (operator === 'NOT_IN' && values) {
        const valuesCode = values.map(v => helpers.transpileExpression(v)).join(', ');
        return `notIn('${column}', [${valuesCode}])`;
    }

    // Handle standard comparisons
    const valueCode = value ? helpers.transpileExpression(value) : 'null';

    const opMap: Record<string, string> = {
        '==': 'eq',
        '!=': 'neq',
        '>': 'gt',
        '<': 'lt',
        '>=': 'gte',
        '<=': 'lte',
        'CONTAINS': 'contains',
        'STARTS_WITH': 'startsWith',
        'ENDS_WITH': 'endsWith',
        'MATCHES': 'matches'
    };

    const funcName = opMap[operator] || 'eq';
    return `${funcName}('${column}', ${valueCode})`;
}
