import type { StatementNode } from 'vero-lang';
import type { StepCategory } from './types';

export interface StepTypeMeta {
  icon: string;        // material-symbols-outlined icon name
  label: string;       // Display keyword
  category: StepCategory;
  borderColor: string; // Tailwind border-l color class
  bgTint: string;      // Tailwind background tint class
}

const action = (icon: string, label: string): StepTypeMeta => ({
  icon, label, category: 'action',
  borderColor: 'border-l-blue-400',
  bgTint: 'bg-blue-400/[0.04]',
});

const loop = (icon: string, label: string): StepTypeMeta => ({
  icon, label, category: 'loop',
  borderColor: 'border-l-cyan-400',
  bgTint: 'bg-cyan-400/[0.06]',
});

const conditional = (icon: string, label: string): StepTypeMeta => ({
  icon, label, category: 'conditional',
  borderColor: 'border-l-purple-400',
  bgTint: 'bg-purple-400/[0.06]',
});

const variable = (icon: string, label: string): StepTypeMeta => ({
  icon, label, category: 'variable',
  borderColor: 'border-l-amber-400',
  bgTint: 'bg-amber-400/[0.06]',
});

const error = (icon: string, label: string): StepTypeMeta => ({
  icon, label, category: 'error',
  borderColor: 'border-l-red-400',
  bgTint: 'bg-red-400/[0.05]',
});

const perform = (icon: string, label: string): StepTypeMeta => ({
  icon, label, category: 'perform',
  borderColor: 'border-l-pink-400',
  bgTint: 'bg-pink-400/[0.05]',
});

export const STEP_TYPE_MAP: Record<StatementNode['type'], StepTypeMeta> = {
  // Action statements (blue) — clicks, fills, interactions
  Click:        action('ads_click', 'CLICK'),
  RightClick:   action('ads_click', 'RIGHT CLICK'),
  DoubleClick:  action('ads_click', 'DOUBLE CLICK'),
  ForceClick:   action('ads_click', 'FORCE CLICK'),
  Fill:         action('edit', 'FILL'),
  Check:        action('check_box', 'CHECK'),
  Uncheck:      action('check_box_outline_blank', 'UNCHECK'),
  Hover:        action('mouse', 'HOVER'),
  Press:        action('keyboard', 'PRESS'),
  Scroll:       action('swap_vert', 'SCROLL'),
  ClearField:   action('backspace', 'CLEAR'),
  Upload:       action('upload', 'UPLOAD'),
  Download:     action('download', 'DOWNLOAD'),
  Drag:         action('drag_indicator', 'DRAG'),
  Select:       action('list', 'SELECT'),

  // Navigation (blue — folded into action)
  Open:                  action('open_in_new', 'OPEN'),
  Refresh:               action('refresh', 'REFRESH'),
  WaitForNavigation:     action('hourglass_top', 'WAIT FOR NAVIGATION'),
  WaitForUrl:            action('link', 'WAIT FOR URL'),
  WaitForNetworkIdle:    action('wifi', 'WAIT FOR NETWORK IDLE'),
  SwitchToNewTab:        action('tab', 'SWITCH TO NEW TAB'),
  SwitchToTab:           action('tab', 'SWITCH TO TAB'),
  OpenInNewTab:          action('open_in_new', 'OPEN IN NEW TAB'),
  CloseTab:              action('tab_close', 'CLOSE TAB'),
  SwitchToFrame:         action('web_asset', 'SWITCH TO FRAME'),
  SwitchToMainFrame:     action('web', 'SWITCH TO MAIN FRAME'),

  // Assertions (blue — folded into action)
  Verify:             action('check_circle', 'VERIFY'),
  VerifyUrl:          action('link', 'VERIFY URL'),
  VerifyTitle:        action('title', 'VERIFY TITLE'),
  VerifyHas:          action('rule', 'VERIFY HAS'),
  VerifyScreenshot:   action('compare', 'VERIFY SCREENSHOT'),
  VerifyVariable:     action('data_object', 'VERIFY VARIABLE'),
  VerifyResponse:     action('cloud_done', 'VERIFY RESPONSE'),

  // Data queries (blue — folded into action)
  Load:               action('database', 'LOAD'),
  DataQuery:          action('query_stats', 'QUERY'),
  Row:                action('table_rows', 'ROW'),
  Rows:               action('table_rows', 'ROWS'),
  ColumnAccess:       action('view_column', 'COLUMN'),
  Count:              action('tag', 'COUNT'),

  // Loop (cyan)
  ForEach:    loop('repeat', 'FOR EACH'),
  Repeat:     loop('replay', 'REPEAT'),

  // Conditional (purple)
  IfElse:     conditional('call_split', 'IF'),

  // Error handling (red)
  TryCatch:   error('shield', 'TRY / CATCH'),

  // Variable assignment (amber/yellow)
  UtilityAssignment:  variable('functions', 'SET'),

  // Perform (pink)
  Perform:            perform('play_arrow', 'PERFORM'),
  PerformAssignment:  perform('play_arrow', 'PERFORM'),

  // Other utilities (blue — folded into action)
  Log:               action('info', 'LOG'),
  TakeScreenshot:    action('photo_camera', 'SCREENSHOT'),
  Wait:              action('hourglass_empty', 'WAIT'),
  WaitFor:           action('hourglass_top', 'WAIT FOR'),
  AcceptDialog:      action('check', 'ACCEPT DIALOG'),
  DismissDialog:     action('close', 'DISMISS DIALOG'),
  SetCookie:         action('cookie', 'SET COOKIE'),
  ClearCookies:      action('delete_sweep', 'CLEAR COOKIES'),
  SetStorage:        action('save', 'SET STORAGE'),
  GetStorage:        action('inventory', 'GET STORAGE'),
  ClearStorage:      action('delete_sweep', 'CLEAR STORAGE'),
  Return:            action('keyboard_return', 'RETURN'),
  ApiRequest:        action('cloud', 'API REQUEST'),
  MockApi:           action('cloud_off', 'MOCK API'),
};

/** Get metadata for a statement type, with fallback for unknown types */
export function getStepMeta(type: StatementNode['type']): StepTypeMeta {
  return STEP_TYPE_MAP[type] ?? action('help', type.toUpperCase());
}
