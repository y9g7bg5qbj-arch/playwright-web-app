/**
 * AST-to-Vero source emitter.
 * Converts AST nodes back to valid, parseable Vero DSL syntax.
 * Mirrors the structure of summarizeStatement.ts but produces source code
 * instead of human-readable summaries.
 */
import type {
  StatementNode,
  TargetNode,
  SelectorNode,
  SelectorModifier,
  ExpressionNode,
  UtilityExpressionNode,
  DataCondition,
  VerifyCondition,
  HasCondition,
  VariableCondition,
  ResponseCondition,
  OrderByClause,
  SimpleTableReference,
  BooleanExpression,
} from 'vero-lang';

// ==================== EXPRESSIONS ====================

/** Emit an ExpressionNode to Vero source */
export function emitExpression(expr: ExpressionNode): string {
  switch (expr.type) {
    case 'StringLiteral':
      return `"${expr.value}"`;
    case 'NumberLiteral':
      return String(expr.value);
    case 'BooleanLiteral':
      return expr.value ? 'TRUE' : 'FALSE';
    case 'VariableReference':
      return expr.page ? `${expr.page}.${expr.name}` : `{${expr.name}}`;
    case 'EnvVarReference':
      return `{{${expr.name}}}`;
    default:
      return '""';
  }
}

// ==================== SELECTORS ====================

/** Emit a SelectorModifier to Vero source */
function emitModifier(mod: SelectorModifier): string {
  switch (mod.type) {
    case 'first': return 'FIRST';
    case 'last': return 'LAST';
    case 'nth': return `NTH ${mod.index}`;
    case 'withText': return `WITH TEXT "${mod.text}"`;
    case 'withoutText': return `WITHOUT TEXT "${mod.text}"`;
    case 'has': return `HAS ${emitSelector(mod.selector)}`;
    case 'hasNot': return `HAS NOT ${emitSelector(mod.selector)}`;
    default: return '';
  }
}

/** Emit a SelectorNode to Vero source */
export function emitSelector(sel: SelectorNode): string {
  // Legacy auto-detect selector: just the raw value string
  if (sel.selectorType === 'auto') {
    return `"${sel.value}"`;
  }

  let result = `${sel.selectorType.toUpperCase()} "${sel.value}"`;

  if (sel.nameParam) {
    result += ` NAME "${sel.nameParam}"`;
  }

  if (sel.modifiers?.length) {
    for (const mod of sel.modifiers) {
      const modStr = emitModifier(mod);
      if (modStr) result += ` ${modStr}`;
    }
  }

  return result;
}

// ==================== TARGETS ====================

/** Emit a TargetNode to Vero source */
export function emitTarget(t: TargetNode): string {
  if (t.page && t.field) return `${t.page}.${t.field}`;
  if (t.field) return t.field;
  if (t.selector) return emitSelector(t.selector);
  if (t.text) return `"${t.text}"`;
  return '"(unknown)"';
}

// ==================== UTILITY EXPRESSIONS ====================

/** Emit a UtilityExpressionNode to Vero source */
export function emitUtilityExpression(expr: UtilityExpressionNode): string {
  switch (expr.type) {
    // String utilities
    case 'Trim':
      return `TRIM ${emitExpression(expr.value)}`;
    case 'Convert':
      return `CONVERT ${emitExpression(expr.value)} TO ${expr.targetType}`;
    case 'Extract':
      return `EXTRACT ${emitExpression(expr.value)} FROM ${emitExpression(expr.start)} TO ${emitExpression(expr.end)}`;
    case 'Replace':
      return `REPLACE ${emitExpression(expr.value)} "${expr.search}" WITH "${expr.replacement}"`;
    case 'Split':
      return `SPLIT ${emitExpression(expr.value)} BY "${expr.delimiter}"`;
    case 'Join':
      return `JOIN ${emitExpression(expr.value)} WITH "${expr.delimiter}"`;
    case 'Length':
      return `LENGTH OF ${emitExpression(expr.value)}`;
    case 'Pad':
      return `PAD ${emitExpression(expr.value)} TO ${emitExpression(expr.length)} WITH "${expr.padChar}"`;

    // Date utilities
    case 'Today':
      return 'TODAY';
    case 'Now':
      return 'NOW';
    case 'AddDate': {
      const dateStr = expr.date.type === 'Today' ? 'TODAY'
        : expr.date.type === 'Now' ? 'NOW'
        : emitExpression(expr.date as ExpressionNode);
      return `ADD ${emitExpression(expr.amount)} ${expr.unit} TO ${dateStr}`;
    }
    case 'SubtractDate': {
      const dateStr = expr.date.type === 'Today' ? 'TODAY'
        : expr.date.type === 'Now' ? 'NOW'
        : emitExpression(expr.date as ExpressionNode);
      return `SUBTRACT ${emitExpression(expr.amount)} ${expr.unit} FROM ${dateStr}`;
    }
    case 'Format': {
      if (expr.formatType === 'currency') {
        return `FORMAT ${emitExpression(expr.value)} AS CURRENCY${expr.currency ? ` "${expr.currency}"` : ''}`;
      }
      if (expr.formatType === 'percent') {
        return `FORMAT ${emitExpression(expr.value)} AS PERCENT`;
      }
      return `FORMAT ${emitExpression(expr.value)} AS "${expr.pattern ?? ''}"`;
    }
    case 'DatePart':
      return `${expr.part} OF ${emitExpression(expr.date)}`;

    // Number utilities
    case 'Round': {
      let result = `ROUND ${emitExpression(expr.value)}`;
      if (expr.direction) result += ` ${expr.direction}`;
      if (expr.decimals) result += ` TO ${emitExpression(expr.decimals)} DECIMALS`;
      return result;
    }
    case 'Absolute':
      return `ABSOLUTE ${emitExpression(expr.value)}`;

    // Generate utilities
    case 'Generate':
      return expr.pattern === 'UUID' ? 'GENERATE UUID' : `GENERATE "${expr.pattern}"`;
    case 'RandomNumber':
      return `RANDOM NUMBER FROM ${emitExpression(expr.min)} TO ${emitExpression(expr.max)}`;

    // Chained
    case 'Chained':
      return `${emitUtilityExpression(expr.first)} THEN ${emitUtilityExpression(expr.second)}`;

    // ExpressionNode passthrough (UtilityExpressionNode includes ExpressionNode)
    case 'StringLiteral':
    case 'NumberLiteral':
    case 'BooleanLiteral':
    case 'VariableReference':
    case 'EnvVarReference':
      return emitExpression(expr);

    default:
      return '""';
  }
}

// ==================== DATA CONDITIONS ====================

/** Emit a DataCondition (WHERE clause) to Vero source */
export function emitDataCondition(cond: DataCondition): string {
  switch (cond.type) {
    case 'And':
      return `${emitDataCondition(cond.left)} AND ${emitDataCondition(cond.right)}`;
    case 'Or':
      return `${emitDataCondition(cond.left)} OR ${emitDataCondition(cond.right)}`;
    case 'Not':
      return `NOT ${emitDataCondition(cond.condition)}`;
    case 'Comparison': {
      const col = cond.column;
      const op = cond.operator;

      // Unary operators
      if (op === 'IS_EMPTY') return `${col} IS EMPTY`;
      if (op === 'IS_NOT_EMPTY') return `${col} IS NOT EMPTY`;
      if (op === 'IS_NULL') return `${col} IS NULL`;

      // IN operators
      if (op === 'IN' && cond.values) {
        return `${col} IN [${cond.values.map(emitExpression).join(', ')}]`;
      }
      if (op === 'NOT_IN' && cond.values) {
        return `${col} NOT IN [${cond.values.map(emitExpression).join(', ')}]`;
      }

      // Text operators
      const opMap: Record<string, string> = {
        '==': '==', '!=': '!=', '>': '>', '<': '<', '>=': '>=', '<=': '<=',
        'CONTAINS': 'CONTAINS',
        'STARTS_WITH': 'STARTS WITH',
        'ENDS_WITH': 'ENDS WITH',
        'MATCHES': 'MATCHES',
      };
      const opStr = opMap[op] ?? op;
      return `${col} ${opStr} ${cond.value ? emitExpression(cond.value) : ''}`.trimEnd();
    }
    default:
      return '';
  }
}

/** Emit a SimpleTableReference */
function emitSimpleTableRef(ref: SimpleTableReference): string {
  return ref.projectName ? `${ref.projectName}.${ref.tableName}` : ref.tableName;
}

/** Emit ORDER BY clauses */
function emitOrderBy(clauses: OrderByClause[]): string {
  if (!clauses.length) return '';
  return ' ORDER BY ' + clauses.map(c => `${c.column} ${c.direction}`).join(', ');
}

// ==================== VERIFY CONDITIONS ====================

/** Emit the condition portion of a VERIFY statement */
function emitVerifyCondition(cond: VerifyCondition): string {
  const op = cond.operator === 'IS_NOT' ? 'IS NOT'
    : cond.operator === 'NOT_CONTAINS' ? 'DOES NOT CONTAIN'
    : cond.operator;

  if (!cond.value) return op;
  if (typeof cond.value === 'string') return `${op} ${cond.value}`;
  return `${op} ${emitExpression(cond.value)}`;
}

/** Emit the condition portion of a VERIFY HAS statement */
function emitHasCondition(cond: HasCondition): string {
  switch (cond.type) {
    case 'HasCount': return `HAS COUNT ${emitExpression(cond.count)}`;
    case 'HasValue': return `HAS VALUE ${emitExpression(cond.value)}`;
    case 'HasAttribute': return `HAS ATTRIBUTE ${emitExpression(cond.attribute)} ${emitExpression(cond.value)}`;
    case 'HasText': return `HAS TEXT ${emitExpression(cond.text)}`;
    case 'ContainsText': return `CONTAINS TEXT ${emitExpression(cond.text)}`;
    case 'HasClass': return `HAS CLASS ${emitExpression(cond.className)}`;
    default: return '';
  }
}

/** Emit a VariableCondition for VERIFY variable */
function emitVariableCondition(cond: VariableCondition): string {
  switch (cond.type) {
    case 'IsTrue': return 'IS TRUE';
    case 'IsFalse': return 'IS FALSE';
    case 'IsNotTrue': return 'IS NOT TRUE';
    case 'IsNotFalse': return 'IS NOT FALSE';
    case 'Contains': return `CONTAINS ${emitExpression(cond.value)}`;
    case 'NotContains': return `NOT CONTAINS ${emitExpression(cond.value)}`;
    case 'Equals': return `EQUALS ${emitExpression(cond.value)}`;
    case 'NotEquals': return `NOT EQUALS ${emitExpression(cond.value)}`;
    default: return '';
  }
}

/** Emit a ResponseCondition for VERIFY RESPONSE */
function emitResponseCondition(cond: ResponseCondition): string {
  const opMap: Record<string, string> = {
    equals: 'EQUALS', contains: 'CONTAINS',
    '>': '>', '<': '<', '>=': '>=', '<=': '<=', '==': '==', '!=': '!=',
  };
  const opStr = opMap[cond.operator] ?? cond.operator;
  return `${cond.type.toUpperCase()} ${opStr} ${emitExpression(cond.value)}`;
}

// ==================== BOOLEAN EXPRESSIONS (IF/ELSE) ====================

/** Emit a BooleanExpression for IF conditions */
function emitBooleanExpression(expr: BooleanExpression): string {
  switch (expr.type) {
    case 'ElementState': {
      const neg = expr.negated ? 'NOT ' : '';
      return `${emitTarget(expr.target)} IS ${neg}${expr.state}`;
    }
    case 'VariableTruthy':
      return expr.variableName;
    default:
      return 'TRUE';
  }
}

// ==================== STATEMENTS ====================

/**
 * Emit a single statement as a Vero source line.
 * @param stmt - The AST statement node
 * @param indent - The whitespace prefix (e.g. "        " for 8-space scenario body)
 * @returns One or more lines of Vero source (joined with \n)
 */
export function emitStatement(stmt: StatementNode, indent: string = '        '): string {
  const childIndent = indent + '    ';

  switch (stmt.type) {
    // ---- Actions ----
    case 'Click':
      return `${indent}CLICK ${emitTarget(stmt.target)}`;
    case 'RightClick':
      return `${indent}RIGHT CLICK ${emitTarget(stmt.target)}`;
    case 'DoubleClick':
      return `${indent}DOUBLE CLICK ${emitTarget(stmt.target)}`;
    case 'ForceClick':
      return `${indent}FORCE CLICK ${emitTarget(stmt.target)}`;
    case 'Fill':
      return `${indent}FILL ${emitTarget(stmt.target)} WITH ${emitExpression(stmt.value)}`;
    case 'Check':
      return `${indent}CHECK ${emitTarget(stmt.target)}`;
    case 'Uncheck':
      return `${indent}UNCHECK ${emitTarget(stmt.target)}`;
    case 'Hover':
      return `${indent}HOVER ${emitTarget(stmt.target)}`;
    case 'Press':
      return `${indent}PRESS "${stmt.key}"`;
    case 'ClearField':
      return `${indent}CLEAR ${emitTarget(stmt.target)}`;
    case 'Select':
      return `${indent}SELECT ${emitExpression(stmt.option)} FROM ${emitTarget(stmt.target)}`;

    case 'Scroll': {
      const parts = [indent, 'SCROLL'];
      if (stmt.direction) parts.push(stmt.direction.toUpperCase());
      if (stmt.target) parts.push(`TO ${emitTarget(stmt.target)}`);
      return parts.join(' ');
    }

    case 'Upload':
      return `${indent}UPLOAD ${stmt.files.map(emitExpression).join(', ')} TO ${emitTarget(stmt.target)}`;

    case 'Download': {
      const saveAs = stmt.saveAs ? ` AS ${emitExpression(stmt.saveAs)}` : '';
      return `${indent}DOWNLOAD FROM ${emitTarget(stmt.target)}${saveAs}`;
    }

    case 'Drag': {
      const dest = stmt.destination.type === 'Coordinate'
        ? `x=${stmt.destination.x} y=${stmt.destination.y}`
        : emitTarget(stmt.destination);
      return `${indent}DRAG ${emitTarget(stmt.source)} TO ${dest}`;
    }

    // ---- Navigation ----
    case 'Open':
      return `${indent}OPEN ${emitExpression(stmt.url)}`;
    case 'Refresh':
      return `${indent}REFRESH`;
    case 'SwitchToNewTab':
      return stmt.url
        ? `${indent}SWITCH TO NEW TAB ${emitExpression(stmt.url)}`
        : `${indent}SWITCH TO NEW TAB`;
    case 'SwitchToTab':
      return `${indent}SWITCH TO TAB ${emitExpression(stmt.tabIndex)}`;
    case 'OpenInNewTab':
      return `${indent}OPEN ${emitExpression(stmt.url)} IN NEW TAB`;
    case 'CloseTab':
      return `${indent}CLOSE TAB`;
    case 'SwitchToFrame':
      return `${indent}SWITCH TO FRAME ${emitSelector(stmt.selector)}`;
    case 'SwitchToMainFrame':
      return `${indent}SWITCH TO MAIN FRAME`;

    // ---- Wait ----
    case 'Wait': {
      if (stmt.duration != null) {
        const unit = stmt.unit === 'milliseconds' ? 'MILLISECONDS' : 'SECONDS';
        return `${indent}WAIT ${stmt.duration} ${unit}`;
      }
      return `${indent}WAIT`;
    }
    case 'WaitFor':
      return `${indent}WAIT FOR ${emitTarget(stmt.target)}`;
    case 'WaitForNavigation':
      return `${indent}WAIT FOR NAVIGATION`;
    case 'WaitForNetworkIdle':
      return `${indent}WAIT FOR NETWORK IDLE`;
    case 'WaitForUrl': {
      const cond = stmt.condition === 'contains' ? 'CONTAINS' : 'EQUALS';
      return `${indent}WAIT FOR URL ${cond} ${emitExpression(stmt.value)}`;
    }

    // ---- Dialogs ----
    case 'AcceptDialog':
      return stmt.responseText
        ? `${indent}ACCEPT DIALOG WITH ${emitExpression(stmt.responseText)}`
        : `${indent}ACCEPT DIALOG`;
    case 'DismissDialog':
      return `${indent}DISMISS DIALOG`;

    // ---- Storage/Cookies ----
    case 'SetCookie':
      return `${indent}SET COOKIE ${emitExpression(stmt.name)} TO ${emitExpression(stmt.value)}`;
    case 'ClearCookies':
      return `${indent}CLEAR COOKIES`;
    case 'SetStorage':
      return `${indent}SET STORAGE ${emitExpression(stmt.key)} TO ${emitExpression(stmt.value)}`;
    case 'GetStorage':
      return `${indent}GET STORAGE ${emitExpression(stmt.key)} INTO ${stmt.variable}`;
    case 'ClearStorage':
      return `${indent}CLEAR STORAGE`;

    // ---- Logging & Screenshots ----
    case 'Log':
      return `${indent}LOG ${emitExpression(stmt.message)}`;
    case 'TakeScreenshot': {
      const parts = [indent, 'TAKE SCREENSHOT'];
      if (stmt.target) parts.push(`OF ${emitTarget(stmt.target)}`);
      if (stmt.filename) parts.push(`AS "${stmt.filename}"`);
      return parts.join(' ');
    }

    // ---- Assertions ----
    case 'Verify': {
      const tgt = stmt.target.type === 'Target'
        ? emitTarget(stmt.target)
        : emitExpression(stmt.target as ExpressionNode);
      return `${indent}VERIFY ${tgt} ${emitVerifyCondition(stmt.condition)}`;
    }
    case 'VerifyUrl': {
      const cond = stmt.condition === 'contains' ? 'CONTAINS'
        : stmt.condition === 'equals' ? 'EQUALS'
        : 'MATCHES';
      return `${indent}VERIFY URL ${cond} ${emitExpression(stmt.value)}`;
    }
    case 'VerifyTitle': {
      const cond = stmt.condition === 'contains' ? 'CONTAINS' : 'EQUALS';
      return `${indent}VERIFY TITLE ${cond} ${emitExpression(stmt.value)}`;
    }
    case 'VerifyHas':
      return `${indent}VERIFY ${emitTarget(stmt.target)} ${emitHasCondition(stmt.hasCondition)}`;
    case 'VerifyScreenshot': {
      const parts = [indent, 'VERIFY'];
      if (stmt.target) parts.push(`${emitTarget(stmt.target)}`);
      parts.push('MATCHES SCREENSHOT');
      if (stmt.name) parts.push(`AS "${stmt.name}"`);
      if (stmt.options) {
        const opts: string[] = [];
        if (stmt.options.preset) opts.push(stmt.options.preset);
        if (stmt.options.threshold != null) opts.push(`THRESHOLD ${stmt.options.threshold}`);
        if (stmt.options.maxDiffPixels != null) opts.push(`MAX_DIFF_PIXELS ${stmt.options.maxDiffPixels}`);
        if (stmt.options.maxDiffPixelRatio != null) opts.push(`MAX_DIFF_RATIO ${stmt.options.maxDiffPixelRatio}`);
        if (opts.length) parts.push(`WITH ${opts.join(' ')}`);
      }
      return parts.join(' ');
    }
    case 'VerifyVariable': {
      const varName = stmt.variable.page
        ? `${stmt.variable.page}.${stmt.variable.name}`
        : stmt.variable.name;
      return `${indent}VERIFY ${varName} ${emitVariableCondition(stmt.condition)}`;
    }
    case 'VerifyResponse':
      return `${indent}VERIFY RESPONSE ${emitResponseCondition(stmt.condition)}`;

    // ---- Perform ----
    case 'Perform': {
      const page = stmt.action.page ? `${stmt.action.page}.` : '';
      const args = stmt.action.arguments.length
        ? ` WITH ${stmt.action.arguments.map(emitExpression).join(', ')}`
        : '';
      return `${indent}PERFORM ${page}${stmt.action.action}${args}`;
    }
    case 'PerformAssignment': {
      const page = stmt.action.page ? `${stmt.action.page}.` : '';
      const args = stmt.action.arguments.length
        ? ` WITH ${stmt.action.arguments.map(emitExpression).join(', ')}`
        : '';
      return `${indent}${stmt.varType} ${stmt.variableName} = PERFORM ${page}${stmt.action.action}${args}`;
    }

    // ---- Data ----
    case 'UtilityAssignment':
      return `${indent}${stmt.varType} ${stmt.variableName} = ${emitUtilityExpression(stmt.expression)}`;

    case 'Load': {
      const table = stmt.projectName ? `"${stmt.projectName}.${stmt.tableName}"` : `"${stmt.tableName}"`;
      const where = stmt.whereClause
        ? ` WHERE ${stmt.whereClause.field} ${stmt.whereClause.operator} ${emitExpression(stmt.whereClause.value)}`
        : '';
      return `${indent}LOAD ${stmt.variable} FROM ${table}${where}`;
    }

    case 'Row': {
      const mod = stmt.modifier ? `${stmt.modifier} ` : '';
      const ref = emitSimpleTableRef(stmt.tableRef);
      const where = stmt.where ? ` WHERE ${emitDataCondition(stmt.where)}` : '';
      const order = stmt.orderBy ? emitOrderBy(stmt.orderBy) : '';
      return `${indent}ROW ${stmt.variableName} = ${mod}${ref}${where}${order}`;
    }

    case 'Rows': {
      const ref = emitSimpleTableRef(stmt.tableRef);
      const where = stmt.where ? ` WHERE ${emitDataCondition(stmt.where)}` : '';
      const order = stmt.orderBy ? emitOrderBy(stmt.orderBy) : '';
      const limit = stmt.limit != null ? ` LIMIT ${stmt.limit}` : '';
      const offset = stmt.offset != null ? ` OFFSET ${stmt.offset}` : '';
      return `${indent}ROWS ${stmt.variableName} = ${ref}${where}${order}${limit}${offset}`;
    }

    case 'ColumnAccess': {
      const ref = emitSimpleTableRef(stmt.tableRef);
      const distinct = stmt.distinct ? 'DISTINCT ' : '';
      const where = stmt.where ? ` WHERE ${emitDataCondition(stmt.where)}` : '';
      return `${indent}COLUMN ${stmt.variableName} = ${distinct}${ref}.${stmt.column}${where}`;
    }

    case 'Count': {
      const ref = emitSimpleTableRef(stmt.tableRef);
      const where = stmt.where ? ` WHERE ${emitDataCondition(stmt.where)}` : '';
      return `${indent}NUMBER ${stmt.variableName} = COUNT ${ref}${where}`;
    }

    case 'DataQuery': {
      // Legacy VDQL — emit a simplified form
      return `${indent}${stmt.resultType} ${stmt.variableName} = DATA QUERY`;
    }

    // ---- Return ----
    case 'Return': {
      if (stmt.returnType === 'EXPRESSION' && stmt.expression) {
        return `${indent}RETURN ${emitExpression(stmt.expression)}`;
      }
      if (stmt.target) {
        return `${indent}RETURN ${stmt.returnType} OF ${emitTarget(stmt.target)}`;
      }
      return `${indent}RETURN ${stmt.returnType}`;
    }

    // ---- Control Flow ----
    case 'ForEach': {
      const header = `${indent}FOR EACH ${stmt.itemVariable} IN ${stmt.collectionVariable} {`;
      const body = emitStatements(stmt.statements, childIndent);
      const close = `${indent}}`;
      return [header, body, close].filter(Boolean).join('\n');
    }

    case 'TryCatch': {
      const tryHeader = `${indent}TRY {`;
      const tryBody = emitStatements(stmt.tryStatements, childIndent);
      const catchHeader = `${indent}} CATCH {`;
      const catchBody = emitStatements(stmt.catchStatements, childIndent);
      const close = `${indent}}`;
      return [tryHeader, tryBody, catchHeader, catchBody, close].filter(Boolean).join('\n');
    }

    case 'IfElse': {
      const header = `${indent}IF ${emitBooleanExpression(stmt.condition)} {`;
      const body = emitStatements(stmt.ifStatements, childIndent);
      if (stmt.elseStatements.length > 0) {
        const elseHeader = `${indent}} ELSE {`;
        const elseBody = emitStatements(stmt.elseStatements, childIndent);
        const close = `${indent}}`;
        return [header, body, elseHeader, elseBody, close].filter(Boolean).join('\n');
      }
      const close = `${indent}}`;
      return [header, body, close].filter(Boolean).join('\n');
    }

    case 'Repeat': {
      const header = `${indent}REPEAT ${emitExpression(stmt.count)} TIMES {`;
      const body = emitStatements(stmt.statements, childIndent);
      const close = `${indent}}`;
      return [header, body, close].filter(Boolean).join('\n');
    }

    // ---- API ----
    case 'ApiRequest': {
      const parts = [`${indent}API ${stmt.method} ${emitExpression(stmt.url)}`];
      if (stmt.body) parts.push(`WITH BODY ${emitExpression(stmt.body)}`);
      if (stmt.headers) parts.push(`WITH HEADERS ${emitExpression(stmt.headers)}`);
      return parts.join(' ');
    }
    case 'MockApi': {
      const parts = [`${indent}MOCK API ${emitExpression(stmt.url)} WITH STATUS ${emitExpression(stmt.status)}`];
      if (stmt.body) parts.push(`AND BODY ${emitExpression(stmt.body)}`);
      return parts.join(' ');
    }

    default:
      return `${indent}# Unknown statement type`;
  }
}

/**
 * Emit multiple statements, each on its own line.
 */
export function emitStatements(stmts: StatementNode[], indent: string = '        '): string {
  return stmts.map(s => emitStatement(s, indent)).join('\n');
}

/**
 * Emit a full scenario body (all statements at the scenario indent level).
 * Default indent is 8 spaces (4 for feature + 4 for scenario body).
 */
export function emitScenarioBody(stmts: StatementNode[], indent: string = '        '): string[] {
  return stmts.map(s => emitStatement(s, indent)).flatMap(line => line.split('\n'));
}

// ==================== FIELD VALUE PARSING ====================

/**
 * Parse a user-typed string back into an ExpressionNode.
 * Detects variable references, env vars, numbers, booleans, and defaults to StringLiteral.
 *
 * @param rawInput - The raw user input string
 * @returns An ExpressionNode representing the parsed value
 */
export function parseFieldValue(rawInput: string): ExpressionNode {
  const trimmed = rawInput.trim();

  // Environment variable: {{NAME}}
  if (/^\{\{([A-Za-z_][A-Za-z0-9_]*)\}\}$/.test(trimmed)) {
    const name = trimmed.slice(2, -2);
    return { type: 'EnvVarReference', name };
  }

  // Variable reference: {name}
  if (/^\{([A-Za-z_][A-Za-z0-9_.]*)\}$/.test(trimmed)) {
    const inner = trimmed.slice(1, -1);
    const dotIdx = inner.indexOf('.');
    if (dotIdx > 0) {
      return {
        type: 'VariableReference',
        page: inner.slice(0, dotIdx),
        name: inner.slice(dotIdx + 1),
      };
    }
    return { type: 'VariableReference', name: inner };
  }

  // Page.field style reference (without braces)
  if (/^[A-Z][A-Za-z0-9]*\.[A-Za-z_][A-Za-z0-9_]*$/.test(trimmed)) {
    const dotIdx = trimmed.indexOf('.');
    return {
      type: 'VariableReference',
      page: trimmed.slice(0, dotIdx),
      name: trimmed.slice(dotIdx + 1),
    };
  }

  // Boolean
  if (trimmed.toUpperCase() === 'TRUE') return { type: 'BooleanLiteral', value: true };
  if (trimmed.toUpperCase() === 'FALSE') return { type: 'BooleanLiteral', value: false };

  // Number (integer or float)
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return { type: 'NumberLiteral', value: Number(trimmed) };
  }

  // Strip surrounding quotes if present
  const unquoted = (trimmed.startsWith('"') && trimmed.endsWith('"'))
    ? trimmed.slice(1, -1)
    : trimmed;

  return { type: 'StringLiteral', value: unquoted };
}
