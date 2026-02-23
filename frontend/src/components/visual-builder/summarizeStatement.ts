import type {
  StatementNode,
  TargetNode,
  ExpressionNode,
} from 'vero-lang';

/** Stringify a TargetNode to a readable form like "LoginPage.submitBtn" or "BUTTON \"Submit\"" */
function targetStr(t: TargetNode): string {
  if (t.page && t.field) return `${t.page}.${t.field}`;
  if (t.field) return t.field;
  if (t.selector) {
    const sel = t.selector;
    const base = `${sel.selectorType.toUpperCase()} "${sel.value}"`;
    if (sel.modifiers?.length) {
      const modStr = sel.modifiers.map(m => {
        switch (m.type) {
          case 'first': return 'FIRST';
          case 'last': return 'LAST';
          case 'nth': return `NTH ${m.index}`;
          case 'withText': return `WITH TEXT "${m.text}"`;
          case 'withoutText': return `WITHOUT TEXT "${m.text}"`;
          default: return '';
        }
      }).filter(Boolean).join(' ');
      return `${base} ${modStr}`;
    }
    return base;
  }
  if (t.text) return `"${t.text}"`;
  return '(unknown target)';
}

/** Stringify an ExpressionNode to a readable form */
function exprStr(e: ExpressionNode): string {
  switch (e.type) {
    case 'StringLiteral': return `"${e.value}"`;
    case 'NumberLiteral': return String(e.value);
    case 'BooleanLiteral': return e.value ? 'TRUE' : 'FALSE';
    case 'VariableReference': return e.page ? `${e.page}.${e.name}` : `{${e.name}}`;
    case 'EnvVarReference': return `{{${e.name}}}`;
    default: return '(expr)';
  }
}

/** Generate a one-line summary for any statement type */
export function summarizeStatement(stmt: StatementNode): string {
  switch (stmt.type) {
    // Actions
    case 'Click': return targetStr(stmt.target);
    case 'RightClick': return targetStr(stmt.target);
    case 'DoubleClick': return targetStr(stmt.target);
    case 'ForceClick': return targetStr(stmt.target);
    case 'Fill': return `${targetStr(stmt.target)} WITH ${exprStr(stmt.value)}`;
    case 'Check': return targetStr(stmt.target);
    case 'Uncheck': return targetStr(stmt.target);
    case 'Hover': return targetStr(stmt.target);
    case 'Press': return `"${stmt.key}"`;
    case 'Scroll': {
      const dir = stmt.direction ? ` ${stmt.direction.toUpperCase()}` : '';
      const tgt = stmt.target ? ` ${targetStr(stmt.target)}` : '';
      return `${dir}${tgt}`.trim() || 'page';
    }
    case 'ClearField': return targetStr(stmt.target);
    case 'Upload': return `${stmt.files.map(exprStr).join(', ')} TO ${targetStr(stmt.target)}`;
    case 'Download': {
      const saveAs = stmt.saveAs ? ` AS ${exprStr(stmt.saveAs)}` : '';
      return `${targetStr(stmt.target)}${saveAs}`;
    }
    case 'Drag': return `${targetStr(stmt.source)} TO ${stmt.destination.type === 'Coordinate' ? `(${stmt.destination.x}, ${stmt.destination.y})` : targetStr(stmt.destination)}`;

    // Navigation
    case 'Open': return exprStr(stmt.url);
    case 'Refresh': return 'page';
    case 'WaitForNavigation': return '';
    case 'WaitForUrl': return `${stmt.condition} ${exprStr(stmt.value)}`;
    case 'WaitForNetworkIdle': return '';
    case 'SwitchToNewTab': return stmt.url ? exprStr(stmt.url) : '';
    case 'SwitchToTab': return `tab ${exprStr(stmt.tabIndex)}`;
    case 'OpenInNewTab': return exprStr(stmt.url);
    case 'CloseTab': return '';
    case 'SwitchToFrame': return `${stmt.selector.selectorType.toUpperCase()} "${stmt.selector.value}"`;
    case 'SwitchToMainFrame': return '';

    // Assertions
    case 'Verify': {
      const tgt = stmt.target.type === 'Target' ? targetStr(stmt.target) : exprStr(stmt.target);
      const op = stmt.condition.operator;
      const val = stmt.condition.value;
      if (typeof val === 'string') return `${tgt} ${op} ${val}`;
      if (val) return `${tgt} ${op} ${exprStr(val)}`;
      return `${tgt} ${op}`;
    }
    case 'VerifyUrl': return `${stmt.condition} ${exprStr(stmt.value)}`;
    case 'VerifyTitle': return `${stmt.condition} ${exprStr(stmt.value)}`;
    case 'VerifyHas': {
      const cond = stmt.hasCondition;
      switch (cond.type) {
        case 'HasCount': return `${targetStr(stmt.target)} HAS COUNT ${exprStr(cond.count)}`;
        case 'HasValue': return `${targetStr(stmt.target)} HAS VALUE ${exprStr(cond.value)}`;
        case 'HasAttribute': return `${targetStr(stmt.target)} HAS ATTRIBUTE ${exprStr(cond.attribute)}`;
        case 'HasText': return `${targetStr(stmt.target)} HAS TEXT ${exprStr(cond.text)}`;
        case 'ContainsText': return `${targetStr(stmt.target)} CONTAINS TEXT ${exprStr(cond.text)}`;
        case 'HasClass': return `${targetStr(stmt.target)} HAS CLASS ${exprStr(cond.className)}`;
        default: return targetStr(stmt.target);
      }
    }
    case 'VerifyScreenshot': {
      const name = stmt.name ? `"${stmt.name}"` : '';
      const tgt = stmt.target ? ` OF ${targetStr(stmt.target)}` : '';
      return `${name}${tgt}`.trim();
    }
    case 'VerifyVariable': {
      const varName = stmt.variable.page ? `${stmt.variable.page}.${stmt.variable.name}` : stmt.variable.name;
      return varName;
    }
    case 'VerifyResponse': {
      const cond = stmt.condition;
      return `${cond.type} ${cond.operator} ${exprStr(cond.value)}`;
    }

    // Data
    case 'UtilityAssignment': return `${stmt.varType} ${stmt.variableName}`;
    case 'Load': return `${stmt.variable} FROM ${stmt.tableName}`;
    case 'DataQuery': return `${stmt.resultType} ${stmt.variableName}`;
    case 'Row': {
      const mod = stmt.modifier ? `${stmt.modifier} ` : '';
      return `${mod}${stmt.variableName} FROM ${stmt.tableRef.tableName}`;
    }
    case 'Rows': return `${stmt.variableName} FROM ${stmt.tableRef.tableName}`;
    case 'ColumnAccess': return `${stmt.variableName} FROM ${stmt.tableRef.tableName}.${stmt.column}`;
    case 'Count': return `${stmt.variableName} FROM ${stmt.tableRef.tableName}`;

    // Action (continued)
    case 'Select': return `${exprStr(stmt.option)} FROM ${targetStr(stmt.target)}`;

    // Control flow
    case 'ForEach': return `${stmt.itemVariable} IN ${stmt.collectionVariable}`;
    case 'TryCatch': return `${stmt.tryStatements.length} steps / catch ${stmt.catchStatements.length} steps`;
    case 'IfElse': {
      const cond = stmt.condition;
      if (cond.type === 'ElementState') {
        const neg = cond.negated ? 'NOT ' : '';
        return `${targetStr(cond.target)} IS ${neg}${cond.state}`;
      }
      if (cond.type === 'VariableTruthy') return cond.variableName;
      return '';
    }
    case 'Repeat': return `${exprStr(stmt.count)} TIMES`;

    // Perform
    case 'Perform': {
      const page = stmt.action.page ? `${stmt.action.page}.` : '';
      return `${page}${stmt.action.action}`;
    }
    case 'PerformAssignment': {
      const page = stmt.action.page ? `${stmt.action.page}.` : '';
      return `${stmt.varType} ${stmt.variableName} = ${page}${stmt.action.action}`;
    }

    // Other
    case 'Log': return exprStr(stmt.message);
    case 'TakeScreenshot': {
      const tgt = stmt.target ? ` OF ${targetStr(stmt.target)}` : '';
      const name = stmt.filename ? `"${stmt.filename}"` : '';
      return `${name}${tgt}`.trim();
    }
    case 'Wait': {
      if (stmt.duration != null) return `${stmt.duration} ${stmt.unit || 'seconds'}`;
      return '';
    }
    case 'WaitFor': return targetStr(stmt.target);
    case 'AcceptDialog': return stmt.responseText ? `WITH ${exprStr(stmt.responseText)}` : '';
    case 'DismissDialog': return '';
    case 'SetCookie': return `${exprStr(stmt.name)} = ${exprStr(stmt.value)}`;
    case 'ClearCookies': return '';
    case 'SetStorage': return `${exprStr(stmt.key)} = ${exprStr(stmt.value)}`;
    case 'GetStorage': return `${stmt.variable} = ${exprStr(stmt.key)}`;
    case 'ClearStorage': return '';
    case 'Return': {
      if (stmt.target) return `${stmt.returnType} OF ${targetStr(stmt.target)}`;
      if (stmt.expression) return exprStr(stmt.expression);
      return stmt.returnType;
    }
    case 'ApiRequest': return `${stmt.method} ${exprStr(stmt.url)}`;
    case 'MockApi': return `${exprStr(stmt.url)} → ${exprStr(stmt.status)}`;

    default: return '';
  }
}
