import type {
    AggregationQuery,
    DataCondition,
    DataQueryStatement,
    FeatureNode,
    OrderByClause,
    StatementNode,
    TableQuery,
} from 'vero-lang';

export interface DataTableRef {
    tableName: string;
    line: number;
    columns: string[];
    projectName?: string;
}

export function collectDataRefsFromFeatures(features: FeatureNode[] = []): DataTableRef[] {
    const refs: DataTableRef[] = [];

    for (const feature of features) {
        for (const hook of feature.hooks || []) {
            refs.push(...collectFromStatements(hook.statements));
        }

        for (const scenario of feature.scenarios || []) {
            refs.push(...collectFromStatements(scenario.statements));
        }
    }

    return refs;
}

export function collectFromStatements(statements: StatementNode[] = []): DataTableRef[] {
    const refs: DataTableRef[] = [];

    for (const statement of statements) {
        switch (statement.type) {
            case 'Row':
            case 'Rows': {
                refs.push({
                    tableName: statement.tableRef.tableName,
                    projectName: statement.tableRef.projectName,
                    line: statement.line,
                    columns: dedupeColumns([
                        ...extractColumnsFromDataCondition(statement.where),
                        ...extractColumnsFromOrderBy(statement.orderBy),
                    ]),
                });
                break;
            }
            case 'Count': {
                refs.push({
                    tableName: statement.tableRef.tableName,
                    projectName: statement.tableRef.projectName,
                    line: statement.line,
                    columns: dedupeColumns(extractColumnsFromDataCondition(statement.where)),
                });
                break;
            }
            case 'DataQuery': {
                refs.push(extractRefFromDataQuery(statement));
                break;
            }
            case 'ForEach': {
                refs.push(...collectFromStatements(statement.statements));
                break;
            }
            default:
                break;
        }
    }

    return refs;
}

export function extractColumnsFromDataCondition(condition?: DataCondition): string[] {
    if (!condition) {
        return [];
    }

    switch (condition.type) {
        case 'Comparison':
            return condition.column ? [condition.column] : [];
        case 'And':
        case 'Or':
            return [
                ...extractColumnsFromDataCondition(condition.left),
                ...extractColumnsFromDataCondition(condition.right),
            ];
        case 'Not':
            return extractColumnsFromDataCondition(condition.condition);
        default:
            return [];
    }
}

function extractColumnsFromOrderBy(orderBy?: OrderByClause[]): string[] {
    if (!orderBy || orderBy.length === 0) {
        return [];
    }
    return orderBy.map(clause => clause.column).filter(Boolean);
}

function extractRefFromDataQuery(statement: DataQueryStatement): DataTableRef {
    if (statement.query.type === 'TableQuery') {
        return extractRefFromTableQuery(statement.query, statement.line);
    }
    return extractRefFromAggregationQuery(statement.query, statement.line);
}

function extractRefFromTableQuery(query: TableQuery, line: number): DataTableRef {
    return {
        tableName: query.tableRef.tableName,
        line,
        columns: dedupeColumns([
            ...extractColumnsFromDataCondition(query.where),
            ...extractColumnsFromOrderBy(query.orderBy),
            ...(query.columns || []),
            ...(query.tableRef.column ? [query.tableRef.column] : []),
        ]),
    };
}

function extractRefFromAggregationQuery(query: AggregationQuery, line: number): DataTableRef {
    return {
        tableName: query.tableRef.tableName,
        line,
        columns: dedupeColumns([
            ...extractColumnsFromDataCondition(query.where),
            ...(query.column ? [query.column] : []),
            ...(query.tableRef.column ? [query.tableRef.column] : []),
        ]),
    };
}

function dedupeColumns(columns: string[]): string[] {
    const uniqueColumns = new Set<string>();

    for (const column of columns) {
        const trimmed = column.trim();
        if (trimmed) {
            uniqueColumns.add(trimmed);
        }
    }

    return [...uniqueColumns];
}
