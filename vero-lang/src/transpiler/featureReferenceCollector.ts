/**
 * Feature Reference Collector
 *
 * Walks a FeatureNode's scenarios and hooks to infer which PAGE / PAGEACTIONS
 * symbols are referenced, replacing the old explicit USE statements.
 *
 * References are extracted from:
 * - TargetNode.page          (CLICK Page.field, FILL Page.field, etc.)
 * - ActionCallNode.page      (PERFORM PageActions.action)
 * - VariableReference.page   (Page.variable in expressions)
 * - ElementStateCondition     (IF Page.field IS VISIBLE)
 */

import type {
    FeatureNode,
    StatementNode,
    ExpressionNode,
    TargetNode,
    IfElseStatement,
    RepeatStatement,
    ForEachStatement,
    TryCatchStatement,
    PerformStatement,
    PerformAssignmentStatement,
    VerifyStatement,
    VerifyVariableStatement,
    FillStatement,
    DragStatement,
    UploadStatement,
    ElementStateCondition,
    HookNode,
} from '../parser/ast.js';

/**
 * Collect all page/pageActions symbol names referenced inside a feature.
 * Returns a deduplicated array preserving first-encounter order.
 */
export function collectFeatureReferences(feature: FeatureNode): string[] {
    const refs = new Set<string>();

    for (const hook of feature.hooks) {
        collectFromStatements(hook.statements, refs);
    }

    for (const scenario of feature.scenarios) {
        collectFromStatements(scenario.statements, refs);
    }

    return [...refs];
}

function collectFromStatements(stmts: StatementNode[], refs: Set<string>): void {
    for (const stmt of stmts) {
        collectFromStatement(stmt, refs);
    }
}

function collectFromStatement(stmt: StatementNode, refs: Set<string>): void {
    // Statements with a single target
    switch (stmt.type) {
        case 'Click':
        case 'RightClick':
        case 'DoubleClick':
        case 'ForceClick':
        case 'Hover':
        case 'Check':
        case 'Uncheck':
        case 'WaitFor':
        case 'ClearField':
        case 'Select':
        case 'Download':
        case 'Scroll':
            if ('target' in stmt && stmt.target) {
                collectFromTarget(stmt.target as TargetNode, refs);
            }
            break;

        case 'Fill': {
            const fill = stmt as FillStatement;
            collectFromTarget(fill.target, refs);
            collectFromExpression(fill.value, refs);
            break;
        }

        case 'Drag': {
            const drag = stmt as DragStatement;
            collectFromTarget(drag.source, refs);
            if (drag.destination.type === 'Target') {
                collectFromTarget(drag.destination, refs);
            }
            break;
        }

        case 'Upload': {
            const upload = stmt as UploadStatement;
            collectFromTarget(upload.target, refs);
            for (const file of upload.files) {
                collectFromExpression(file, refs);
            }
            break;
        }

        case 'TakeScreenshot':
        case 'VerifyScreenshot':
            if ('target' in stmt && stmt.target) {
                collectFromTarget(stmt.target as TargetNode, refs);
            }
            break;

        case 'Perform': {
            const perform = stmt as PerformStatement;
            if (perform.action.page) {
                refs.add(perform.action.page);
            }
            for (const arg of perform.action.arguments) {
                collectFromExpression(arg, refs);
            }
            break;
        }

        case 'PerformAssignment': {
            const pa = stmt as PerformAssignmentStatement;
            if (pa.action.page) {
                refs.add(pa.action.page);
            }
            for (const arg of pa.action.arguments) {
                collectFromExpression(arg, refs);
            }
            break;
        }

        case 'Verify': {
            const verify = stmt as VerifyStatement;
            if (verify.target && 'page' in verify.target) {
                collectFromTarget(verify.target as TargetNode, refs);
            }
            if (verify.condition?.value && typeof verify.condition.value === 'object' && 'type' in verify.condition.value) {
                collectFromExpression(verify.condition.value as ExpressionNode, refs);
            }
            break;
        }

        case 'VerifyHas':
            if ('target' in stmt && stmt.target) {
                collectFromTarget(stmt.target as TargetNode, refs);
            }
            break;

        case 'VerifyVariable': {
            const vv = stmt as VerifyVariableStatement;
            if (vv.variable?.page) {
                refs.add(vv.variable.page);
            }
            break;
        }

        case 'IfElse': {
            const ifElse = stmt as IfElseStatement;
            if (ifElse.condition.type === 'ElementState') {
                const cond = ifElse.condition as ElementStateCondition;
                collectFromTarget(cond.target, refs);
            }
            collectFromStatements(ifElse.ifStatements, refs);
            collectFromStatements(ifElse.elseStatements, refs);
            break;
        }

        case 'Repeat': {
            const repeat = stmt as RepeatStatement;
            collectFromExpression(repeat.count, refs);
            collectFromStatements(repeat.statements, refs);
            break;
        }

        case 'ForEach': {
            const forEach = stmt as ForEachStatement;
            collectFromStatements(forEach.statements, refs);
            break;
        }

        case 'TryCatch': {
            const tryCatch = stmt as TryCatchStatement;
            collectFromStatements(tryCatch.tryStatements, refs);
            collectFromStatements(tryCatch.catchStatements, refs);
            break;
        }

        case 'Open':
        case 'SwitchToNewTab':
        case 'OpenInNewTab':
            if ('url' in stmt && stmt.url) {
                collectFromExpression(stmt.url as ExpressionNode, refs);
            }
            break;

        case 'Log':
            if ('message' in stmt && stmt.message) {
                collectFromExpression(stmt.message as ExpressionNode, refs);
            }
            break;

        // Statements with no page references: Wait, Refresh, Press, SwitchToTab,
        // CloseTab, AcceptDialog, DismissDialog, SwitchToFrame, SwitchToMainFrame,
        // SetCookie, ClearCookies, SetStorage, GetStorage, ClearStorage,
        // WaitForNavigation, WaitForNetworkIdle, WaitForUrl, Load, DataQuery,
        // Row, Rows, ColumnAccess, Count, UtilityAssignment, Return,
        // ApiRequest, VerifyResponse, MockApi
        default:
            break;
    }
}

function collectFromTarget(target: TargetNode, refs: Set<string>): void {
    if (target.type === 'Target' && target.page) {
        refs.add(target.page);
    }
}

function collectFromExpression(expr: ExpressionNode, refs: Set<string>): void {
    if (expr.type === 'VariableReference' && expr.page) {
        refs.add(expr.page);
    }
}
