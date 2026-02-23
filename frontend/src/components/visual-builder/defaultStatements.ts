/**
 * Factory for creating default AST nodes for new steps.
 * Each statement type gets sensible default values.
 */
import type { StatementNode } from 'vero-lang';

/**
 * Create a new default statement node of the given type.
 * The `line` will be set to 0 (updated after insertion).
 */
export function createDefaultStatement(type: StatementNode['type']): StatementNode {
  switch (type) {
    // Actions
    case 'Click':
      return { type: 'Click', target: { type: 'Target', text: 'element' }, line: 0 };
    case 'RightClick':
      return { type: 'RightClick', target: { type: 'Target', text: 'element' }, line: 0 };
    case 'DoubleClick':
      return { type: 'DoubleClick', target: { type: 'Target', text: 'element' }, line: 0 };
    case 'ForceClick':
      return { type: 'ForceClick', target: { type: 'Target', text: 'element' }, line: 0 };
    case 'Fill':
      return {
        type: 'Fill',
        target: { type: 'Target', text: 'field' },
        value: { type: 'StringLiteral', value: 'value' },
        line: 0,
      };
    case 'Check':
      return { type: 'Check', target: { type: 'Target', text: 'checkbox' }, line: 0 };
    case 'Uncheck':
      return { type: 'Uncheck', target: { type: 'Target', text: 'checkbox' }, line: 0 };
    case 'Hover':
      return { type: 'Hover', target: { type: 'Target', text: 'element' }, line: 0 };
    case 'Press':
      return { type: 'Press', key: 'Enter', line: 0 };
    case 'Scroll':
      return { type: 'Scroll', direction: 'down', line: 0 };
    case 'ClearField':
      return { type: 'ClearField', target: { type: 'Target', text: 'field' }, line: 0 };
    case 'Select':
      return {
        type: 'Select',
        option: { type: 'StringLiteral', value: 'option' },
        target: { type: 'Target', text: 'dropdown' },
        line: 0,
      };

    // Navigation
    case 'Open':
      return { type: 'Open', url: { type: 'StringLiteral', value: 'https://example.com' }, line: 0 };
    case 'Refresh':
      return { type: 'Refresh', line: 0 };
    case 'SwitchToNewTab':
      return { type: 'SwitchToNewTab', line: 0 };
    case 'SwitchToTab':
      return { type: 'SwitchToTab', tabIndex: { type: 'NumberLiteral', value: 1 }, line: 0 };
    case 'OpenInNewTab':
      return { type: 'OpenInNewTab', url: { type: 'StringLiteral', value: 'https://example.com' }, line: 0 };
    case 'CloseTab':
      return { type: 'CloseTab', line: 0 };

    // Assertions
    case 'Verify':
      return {
        type: 'Verify',
        target: { type: 'Target', text: 'element' },
        condition: { type: 'Condition', operator: 'IS', value: 'VISIBLE' },
        line: 0,
      };
    case 'VerifyUrl':
      return {
        type: 'VerifyUrl',
        condition: 'contains',
        value: { type: 'StringLiteral', value: '/path' },
        line: 0,
      };
    case 'VerifyTitle':
      return {
        type: 'VerifyTitle',
        condition: 'contains',
        value: { type: 'StringLiteral', value: 'Page Title' },
        line: 0,
      };

    // Data
    case 'UtilityAssignment':
      return {
        type: 'UtilityAssignment',
        varType: 'TEXT',
        variableName: 'myVar',
        expression: { type: 'StringLiteral', value: 'value' },
        line: 0,
      };
    case 'Load':
      return { type: 'Load', variable: 'data', tableName: 'TableName', line: 0 };

    // Control
    case 'ForEach':
      return {
        type: 'ForEach',
        itemVariable: 'item',
        collectionVariable: 'items',
        statements: [],
        line: 0,
      };
    case 'TryCatch':
      return {
        type: 'TryCatch',
        tryStatements: [],
        catchStatements: [],
        line: 0,
      };
    case 'IfElse':
      return {
        type: 'IfElse',
        condition: { type: 'VariableTruthy', variableName: 'condition' },
        ifStatements: [],
        elseStatements: [],
        line: 0,
      };
    case 'Repeat':
      return {
        type: 'Repeat',
        count: { type: 'NumberLiteral', value: 3 },
        statements: [],
        line: 0,
      };

    // Other
    case 'Log':
      return { type: 'Log', message: { type: 'StringLiteral', value: 'message' }, line: 0 };
    case 'Wait':
      return { type: 'Wait', duration: 1, unit: 'seconds', line: 0 };
    case 'WaitFor':
      return { type: 'WaitFor', target: { type: 'Target', text: 'element' }, line: 0 };
    case 'TakeScreenshot':
      return { type: 'TakeScreenshot', line: 0 };
    case 'AcceptDialog':
      return { type: 'AcceptDialog', line: 0 };
    case 'DismissDialog':
      return { type: 'DismissDialog', line: 0 };

    // Perform
    case 'Perform':
      return {
        type: 'Perform',
        action: { type: 'ActionCall', action: 'actionName', arguments: [] },
        line: 0,
      };

    default:
      // For any unhandled type, return a simple Log statement
      return { type: 'Log', message: { type: 'StringLiteral', value: 'new step' }, line: 0 };
  }
}

/** Step type categories for the AddStepMenu */
export const STEP_TYPE_CATEGORIES = [
  {
    label: 'Actions',
    icon: 'ads_click',
    types: [
      { type: 'Click' as const, label: 'Click' },
      { type: 'Fill' as const, label: 'Fill' },
      { type: 'Check' as const, label: 'Check' },
      { type: 'Hover' as const, label: 'Hover' },
      { type: 'Press' as const, label: 'Press Key' },
      { type: 'Select' as const, label: 'Select Option' },
      { type: 'Scroll' as const, label: 'Scroll' },
      { type: 'ClearField' as const, label: 'Clear Field' },
    ],
  },
  {
    label: 'Navigation',
    icon: 'open_in_new',
    types: [
      { type: 'Open' as const, label: 'Open URL' },
      { type: 'Refresh' as const, label: 'Refresh Page' },
      { type: 'SwitchToNewTab' as const, label: 'Switch to New Tab' },
    ],
  },
  {
    label: 'Assertions',
    icon: 'check_circle',
    types: [
      { type: 'Verify' as const, label: 'Verify Element' },
      { type: 'VerifyUrl' as const, label: 'Verify URL' },
      { type: 'VerifyTitle' as const, label: 'Verify Title' },
    ],
  },
  {
    label: 'Data',
    icon: 'functions',
    types: [
      { type: 'UtilityAssignment' as const, label: 'Set Variable' },
      { type: 'Load' as const, label: 'Load Data' },
    ],
  },
  {
    label: 'Control Flow',
    icon: 'repeat',
    types: [
      { type: 'ForEach' as const, label: 'For Each Loop' },
      { type: 'IfElse' as const, label: 'If / Else' },
      { type: 'Repeat' as const, label: 'Repeat' },
      { type: 'TryCatch' as const, label: 'Try / Catch' },
    ],
  },
  {
    label: 'Other',
    icon: 'more_horiz',
    types: [
      { type: 'Log' as const, label: 'Log Message' },
      { type: 'Wait' as const, label: 'Wait' },
      { type: 'WaitFor' as const, label: 'Wait For Element' },
      { type: 'TakeScreenshot' as const, label: 'Take Screenshot' },
      { type: 'Perform' as const, label: 'Perform Action' },
    ],
  },
];
