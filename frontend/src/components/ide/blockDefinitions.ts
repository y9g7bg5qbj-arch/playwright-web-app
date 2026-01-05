// Complete Block Definitions for No-Code Playwright IDE
// Covers ALL Playwright capabilities

export type BlockCategory =
  | 'browser'
  | 'navigation'
  | 'locator'
  | 'action'
  | 'input'
  | 'assertion'
  | 'wait'
  | 'control'
  | 'data'
  | 'network'
  | 'advanced';

export interface ConfigField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'boolean' | 'select' | 'locator' | 'variable' | 'condition' | 'key' | 'json' | 'code' | 'file' | 'headers' | 'expression';
  required?: boolean;
  defaultValue?: any;
  placeholder?: string;
  options?: { value: string; label: string }[];
  description?: string;
  showWhen?: { field: string; values: any[] };
  min?: number;
  max?: number;
}

export interface BlockDefinition {
  type: string;
  category: BlockCategory;
  title: string;
  description: string;
  icon: string;
  color: string;
  defaultConfig: Record<string, any>;
  acceptsChildren?: boolean;
  hasElseBranch?: boolean;
  hasCatchBranch?: boolean;
  hasFinallyBranch?: boolean;
  configFields: ConfigField[];
}

// Category styling
export const categoryStyles: Record<BlockCategory, { label: string; color: string; bg: string; border: string; icon: string }> = {
  browser: { label: 'Browser', color: 'text-slate-700', bg: 'bg-slate-50', border: 'border-l-slate-500', icon: '🌐' },
  navigation: { label: 'Navigation', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-l-blue-500', icon: '🧭' },
  locator: { label: 'Element Selection', color: 'text-cyan-700', bg: 'bg-cyan-50', border: 'border-l-cyan-500', icon: '🎯' },
  action: { label: 'Mouse Actions', color: 'text-green-700', bg: 'bg-green-50', border: 'border-l-green-500', icon: '🖱️' },
  input: { label: 'Keyboard & Input', color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-l-indigo-500', icon: '⌨️' },
  assertion: { label: 'Assertions', color: 'text-teal-700', bg: 'bg-teal-50', border: 'border-l-teal-500', icon: '✓' },
  wait: { label: 'Waits & Timing', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-l-orange-500', icon: '⏳' },
  control: { label: 'Control Flow', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-l-amber-500', icon: '◆' },
  data: { label: 'Data & Variables', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-l-purple-500', icon: '📊' },
  network: { label: 'Network & API', color: 'text-pink-700', bg: 'bg-pink-50', border: 'border-l-pink-500', icon: '🔌' },
  advanced: { label: 'Advanced', color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-l-rose-500', icon: '⚡' },
};

// Locator strategy options
const locatorStrategyOptions = [
  { value: 'css', label: 'CSS Selector' },
  { value: 'xpath', label: 'XPath' },
  { value: 'text', label: 'Text (contains)' },
  { value: 'text-exact', label: 'Text (exact)' },
  { value: 'role', label: 'ARIA Role' },
  { value: 'label', label: 'Label' },
  { value: 'placeholder', label: 'Placeholder' },
  { value: 'alt-text', label: 'Alt Text' },
  { value: 'title', label: 'Title' },
  { value: 'test-id', label: 'Test ID (data-testid)' },
];

// Common locator fields
const locatorFields: ConfigField[] = [
  { name: 'locatorStrategy', label: 'Locator Type', type: 'select', options: locatorStrategyOptions, defaultValue: 'css', required: true },
  { name: 'selector', label: 'Selector', type: 'text', placeholder: 'Enter selector...', required: true, description: 'Element selector based on chosen strategy' },
  { name: 'hasText', label: 'Filter by Text', type: 'text', placeholder: 'Optional text filter', description: 'Additional text filter for the element' },
  { name: 'nth', label: 'Nth Match', type: 'number', placeholder: '0', min: 0, description: 'Select nth matching element (0-based)' },
];

// All block definitions
export const blockDefinitions: Record<string, BlockDefinition> = {
  // ============================================
  // BROWSER BLOCKS
  // ============================================
  'launch-browser': {
    type: 'launch-browser',
    category: 'browser',
    title: 'Launch Browser',
    description: 'Launch a new browser instance',
    icon: '🚀',
    color: 'slate',
    defaultConfig: { browser: 'chromium', headless: false },
    configFields: [
      {
        name: 'browser', label: 'Browser', type: 'select', options: [
          { value: 'chromium', label: 'Chromium' },
          { value: 'firefox', label: 'Firefox' },
          { value: 'webkit', label: 'WebKit (Safari)' },
        ], defaultValue: 'chromium'
      },
      { name: 'headless', label: 'Headless Mode', type: 'boolean', defaultValue: false },
      { name: 'slowMo', label: 'Slow Motion (ms)', type: 'number', placeholder: '0', description: 'Slow down operations by specified ms' },
      { name: 'devtools', label: 'Open DevTools', type: 'boolean', defaultValue: false },
    ],
  },
  'new-context': {
    type: 'new-context',
    category: 'browser',
    title: 'New Browser Context',
    description: 'Create isolated browser context (like incognito)',
    icon: '📑',
    color: 'slate',
    defaultConfig: {},
    configFields: [
      { name: 'viewport.width', label: 'Viewport Width', type: 'number', defaultValue: 1280 },
      { name: 'viewport.height', label: 'Viewport Height', type: 'number', defaultValue: 720 },
      { name: 'locale', label: 'Locale', type: 'text', placeholder: 'en-US' },
      { name: 'timezone', label: 'Timezone', type: 'text', placeholder: 'America/New_York' },
      { name: 'geolocation.latitude', label: 'Geolocation Latitude', type: 'number' },
      { name: 'geolocation.longitude', label: 'Geolocation Longitude', type: 'number' },
      { name: 'permissions', label: 'Permissions', type: 'text', placeholder: 'geolocation, notifications', description: 'Comma-separated permissions' },
      {
        name: 'colorScheme', label: 'Color Scheme', type: 'select', options: [
          { value: 'light', label: 'Light' },
          { value: 'dark', label: 'Dark' },
          { value: 'no-preference', label: 'No Preference' },
        ]
      },
      { name: 'ignoreHTTPSErrors', label: 'Ignore HTTPS Errors', type: 'boolean', defaultValue: false },
    ],
  },
  'new-page': {
    type: 'new-page',
    category: 'browser',
    title: 'New Page/Tab',
    description: 'Open a new page or tab',
    icon: '📄',
    color: 'slate',
    defaultConfig: {},
    configFields: [
      { name: 'url', label: 'Initial URL (optional)', type: 'text', placeholder: 'https://...' },
    ],
  },
  'close-page': {
    type: 'close-page',
    category: 'browser',
    title: 'Close Page',
    description: 'Close the current page',
    icon: '❌',
    color: 'slate',
    defaultConfig: {},
    configFields: [],
  },
  'close-browser': {
    type: 'close-browser',
    category: 'browser',
    title: 'Close Browser',
    description: 'Close the browser instance',
    icon: '🔴',
    color: 'slate',
    defaultConfig: {},
    configFields: [],
  },
  'switch-tab': {
    type: 'switch-tab',
    category: 'browser',
    title: 'Switch Tab',
    description: 'Switch to a different tab/page by index',
    icon: '🔀',
    color: 'slate',
    defaultConfig: { tabIndex: 0 },
    configFields: [
      { name: 'tabIndex', label: 'Tab Index', type: 'number', defaultValue: 0, description: '0 = first tab, 1 = second tab, etc.' },
    ],
  },
  'wait-for-new-tab': {
    type: 'wait-for-new-tab',
    category: 'browser',
    title: 'Wait for New Tab',
    description: 'Wait for a new tab to open and switch to it (use after clicking a link that opens in new tab)',
    icon: '📑',
    color: 'slate',
    defaultConfig: { switchToNewTab: true, waitForLoad: true },
    configFields: [
      { name: 'switchToNewTab', label: 'Switch to new tab', type: 'boolean', defaultValue: true, description: 'Automatically switch to the new tab' },
      { name: 'waitForLoad', label: 'Wait for page load', type: 'boolean', defaultValue: true, description: 'Wait for the new tab to finish loading' },
    ],
  },
  'switch-frame': {
    type: 'switch-frame',
    category: 'browser',
    title: 'Switch to Frame',
    description: 'Switch to an iframe',
    icon: '🖼️',
    color: 'slate',
    defaultConfig: {},
    configFields: [
      ...locatorFields,
      { name: 'frameName', label: 'Or Frame Name', type: 'text', placeholder: 'Frame name attribute' },
    ],
  },
  'switch-main-frame': {
    type: 'switch-main-frame',
    category: 'browser',
    title: 'Switch to Main Frame',
    description: 'Switch back to main frame from iframe',
    icon: '🏠',
    color: 'slate',
    defaultConfig: {},
    configFields: [],
  },

  // ============================================
  // NAVIGATION BLOCKS
  // ============================================
  'navigate': {
    type: 'navigate',
    category: 'navigation',
    title: 'Navigate to URL',
    description: 'Navigate to a specific URL',
    icon: '🔗',
    color: 'blue',
    defaultConfig: { url: '', waitUntil: 'load' },
    configFields: [
      { name: 'url', label: 'URL', type: 'text', placeholder: 'https://example.com', required: true },
      {
        name: 'waitUntil', label: 'Wait Until', type: 'select', options: [
          { value: 'load', label: 'Load (full page load)' },
          { value: 'domcontentloaded', label: 'DOM Content Loaded' },
          { value: 'networkidle', label: 'Network Idle' },
          { value: 'commit', label: 'Commit (navigation started)' },
        ], defaultValue: 'load'
      },
      { name: 'timeout', label: 'Timeout (ms)', type: 'number', defaultValue: 30000 },
      { name: 'referer', label: 'Referer', type: 'text', placeholder: 'Optional referer URL' },
    ],
  },
  'subflow': {
    type: 'subflow',
    category: 'control', // or advanced?
    title: 'Sub-Flow',
    description: 'Call another Flow',
    icon: '🧩',
    color: 'purple',
    defaultConfig: {},
    configFields: [
      { name: 'flowId', label: 'Flow ID', type: 'select', options: [], required: true }, // Ideally this dropdown is populated dynamically
    ],
  },
  'data': {
    type: 'data',
    category: 'data',
    title: 'Data Source',
    description: 'Load external data (CSV/JSON)',
    icon: '📊',
    color: 'emerald',
    defaultConfig: { sourceType: 'csv' },
    configFields: [
      {
        name: 'sourceType', label: 'Source Type', type: 'select', options: [
          { value: 'csv', label: 'CSV File' },
          { value: 'json', label: 'JSON File' },
          { value: 'variable', label: 'Variable' },
        ], required: true
      },
      { name: 'sourcePath', label: 'Path / Variable', type: 'text', required: true, placeholder: 'data.csv or myVar' },
    ],
  },
  'go-back': {
    type: 'go-back',
    category: 'navigation',
    title: 'Go Back',
    description: 'Navigate to previous page in history',
    icon: '⬅️',
    color: 'blue',
    defaultConfig: {},
    configFields: [
      {
        name: 'waitUntil', label: 'Wait Until', type: 'select', options: [
          { value: 'load', label: 'Load' },
          { value: 'domcontentloaded', label: 'DOM Content Loaded' },
          { value: 'networkidle', label: 'Network Idle' },
        ], defaultValue: 'load'
      },
    ],
  },
  'go-forward': {
    type: 'go-forward',
    category: 'navigation',
    title: 'Go Forward',
    description: 'Navigate to next page in history',
    icon: '➡️',
    color: 'blue',
    defaultConfig: {},
    configFields: [
      {
        name: 'waitUntil', label: 'Wait Until', type: 'select', options: [
          { value: 'load', label: 'Load' },
          { value: 'domcontentloaded', label: 'DOM Content Loaded' },
          { value: 'networkidle', label: 'Network Idle' },
        ], defaultValue: 'load'
      },
    ],
  },
  'reload': {
    type: 'reload',
    category: 'navigation',
    title: 'Reload Page',
    description: 'Reload the current page',
    icon: '🔄',
    color: 'blue',
    defaultConfig: {},
    configFields: [
      {
        name: 'waitUntil', label: 'Wait Until', type: 'select', options: [
          { value: 'load', label: 'Load' },
          { value: 'domcontentloaded', label: 'DOM Content Loaded' },
          { value: 'networkidle', label: 'Network Idle' },
        ], defaultValue: 'load'
      },
    ],
  },

  // ============================================
  // MOUSE ACTION BLOCKS
  // ============================================
  'click': {
    type: 'click',
    category: 'action',
    title: 'Click',
    description: 'Click on an element',
    icon: '👆',
    color: 'green',
    defaultConfig: { button: 'left', clickCount: 1 },
    configFields: [
      ...locatorFields,
      {
        name: 'button', label: 'Mouse Button', type: 'select', options: [
          { value: 'left', label: 'Left' },
          { value: 'right', label: 'Right' },
          { value: 'middle', label: 'Middle' },
        ], defaultValue: 'left'
      },
      { name: 'clickCount', label: 'Click Count', type: 'number', defaultValue: 1, min: 1, max: 3 },
      { name: 'delay', label: 'Delay Between Clicks (ms)', type: 'number' },
      { name: 'force', label: 'Force Click', type: 'boolean', description: 'Skip actionability checks' },
      {
        name: 'modifiers', label: 'Modifier Keys', type: 'select', options: [
          { value: '', label: 'None' },
          { value: 'Alt', label: 'Alt' },
          { value: 'Control', label: 'Control' },
          { value: 'Meta', label: 'Meta/Command' },
          { value: 'Shift', label: 'Shift' },
        ]
      },
      { name: 'position.x', label: 'Position X (relative)', type: 'number' },
      { name: 'position.y', label: 'Position Y (relative)', type: 'number' },
      { name: 'timeout', label: 'Timeout (ms)', type: 'number', defaultValue: 30000 },
    ],
  },
  'double-click': {
    type: 'double-click',
    category: 'action',
    title: 'Double Click',
    description: 'Double click on an element',
    icon: '👆👆',
    color: 'green',
    defaultConfig: {},
    configFields: [
      ...locatorFields,
      { name: 'force', label: 'Force Click', type: 'boolean' },
      { name: 'timeout', label: 'Timeout (ms)', type: 'number', defaultValue: 30000 },
    ],
  },
  'right-click': {
    type: 'right-click',
    category: 'action',
    title: 'Right Click',
    description: 'Right click (context menu) on an element',
    icon: '🖱️',
    color: 'green',
    defaultConfig: {},
    configFields: [
      ...locatorFields,
      { name: 'force', label: 'Force Click', type: 'boolean' },
      { name: 'timeout', label: 'Timeout (ms)', type: 'number', defaultValue: 30000 },
    ],
  },
  'hover': {
    type: 'hover',
    category: 'action',
    title: 'Hover',
    description: 'Hover over an element',
    icon: '👋',
    color: 'green',
    defaultConfig: {},
    configFields: [
      ...locatorFields,
      { name: 'force', label: 'Force Hover', type: 'boolean' },
      { name: 'position.x', label: 'Position X (relative)', type: 'number' },
      { name: 'position.y', label: 'Position Y (relative)', type: 'number' },
      { name: 'timeout', label: 'Timeout (ms)', type: 'number', defaultValue: 30000 },
    ],
  },
  'drag-and-drop': {
    type: 'drag-and-drop',
    category: 'action',
    title: 'Drag and Drop',
    description: 'Drag element and drop on target',
    icon: '✊',
    color: 'green',
    defaultConfig: {},
    configFields: [
      { name: 'sourceLocatorStrategy', label: 'Source Locator Type', type: 'select', options: locatorStrategyOptions, required: true },
      { name: 'sourceSelector', label: 'Source Selector', type: 'text', required: true },
      { name: 'targetLocatorStrategy', label: 'Target Locator Type', type: 'select', options: locatorStrategyOptions, required: true },
      { name: 'targetSelector', label: 'Target Selector', type: 'text', required: true },
      { name: 'force', label: 'Force', type: 'boolean' },
      { name: 'timeout', label: 'Timeout (ms)', type: 'number', defaultValue: 30000 },
    ],
  },
  'scroll': {
    type: 'scroll',
    category: 'action',
    title: 'Scroll',
    description: 'Scroll the page or to an element',
    icon: '📜',
    color: 'green',
    defaultConfig: { scrollType: 'element' },
    configFields: [
      {
        name: 'scrollType', label: 'Scroll Type', type: 'select', options: [
          { value: 'element', label: 'Scroll to Element' },
          { value: 'position', label: 'Scroll to Position' },
          { value: 'delta', label: 'Scroll by Amount' },
        ], required: true
      },
      ...locatorFields.map(f => ({ ...f, showWhen: { field: 'scrollType', values: ['element'] } })),
      { name: 'x', label: 'X Position', type: 'number', showWhen: { field: 'scrollType', values: ['position'] } },
      { name: 'y', label: 'Y Position', type: 'number', showWhen: { field: 'scrollType', values: ['position'] } },
      { name: 'deltaX', label: 'Horizontal Scroll (px)', type: 'number', showWhen: { field: 'scrollType', values: ['delta'] } },
      { name: 'deltaY', label: 'Vertical Scroll (px)', type: 'number', showWhen: { field: 'scrollType', values: ['delta'] } },
    ],
  },
  'mouse-move': {
    type: 'mouse-move',
    category: 'action',
    title: 'Mouse Move',
    description: 'Move mouse to specific position',
    icon: '🎯',
    color: 'green',
    defaultConfig: {},
    configFields: [
      { name: 'x', label: 'X Position', type: 'number', required: true },
      { name: 'y', label: 'Y Position', type: 'number', required: true },
      { name: 'steps', label: 'Steps', type: 'number', defaultValue: 1, description: 'Number of steps for smooth movement' },
    ],
  },
  'mouse-down': {
    type: 'mouse-down',
    category: 'action',
    title: 'Mouse Down',
    description: 'Press and hold mouse button',
    icon: '⬇️',
    color: 'green',
    defaultConfig: { button: 'left' },
    configFields: [
      {
        name: 'button', label: 'Button', type: 'select', options: [
          { value: 'left', label: 'Left' },
          { value: 'right', label: 'Right' },
          { value: 'middle', label: 'Middle' },
        ]
      },
    ],
  },
  'mouse-up': {
    type: 'mouse-up',
    category: 'action',
    title: 'Mouse Up',
    description: 'Release mouse button',
    icon: '⬆️',
    color: 'green',
    defaultConfig: { button: 'left' },
    configFields: [
      {
        name: 'button', label: 'Button', type: 'select', options: [
          { value: 'left', label: 'Left' },
          { value: 'right', label: 'Right' },
          { value: 'middle', label: 'Middle' },
        ]
      },
    ],
  },

  // ============================================
  // INPUT BLOCKS
  // ============================================
  'fill': {
    type: 'fill',
    category: 'input',
    title: 'Fill Text',
    description: 'Fill text into an input field (clears first)',
    icon: '✏️',
    color: 'indigo',
    defaultConfig: {},
    configFields: [
      ...locatorFields,
      { name: 'value', label: 'Text Value', type: 'text', required: true, placeholder: 'Text to fill or ${variable}' },
      { name: 'force', label: 'Force', type: 'boolean' },
      { name: 'timeout', label: 'Timeout (ms)', type: 'number', defaultValue: 30000 },
    ],
  },
  'type': {
    type: 'type',
    category: 'input',
    title: 'Type Text',
    description: 'Type text character by character',
    icon: '⌨️',
    color: 'indigo',
    defaultConfig: {},
    configFields: [
      ...locatorFields,
      { name: 'text', label: 'Text', type: 'text', required: true },
      { name: 'delay', label: 'Delay Between Keys (ms)', type: 'number', defaultValue: 0 },
      { name: 'timeout', label: 'Timeout (ms)', type: 'number', defaultValue: 30000 },
    ],
  },
  'clear': {
    type: 'clear',
    category: 'input',
    title: 'Clear Field',
    description: 'Clear text from an input field',
    icon: '🧹',
    color: 'indigo',
    defaultConfig: {},
    configFields: [
      ...locatorFields,
      { name: 'timeout', label: 'Timeout (ms)', type: 'number', defaultValue: 30000 },
    ],
  },
  'press-key': {
    type: 'press-key',
    category: 'input',
    title: 'Press Key',
    description: 'Press a keyboard key',
    icon: '🔤',
    color: 'indigo',
    defaultConfig: { key: 'Enter' },
    configFields: [
      { name: 'useElement', label: 'On Specific Element', type: 'boolean', defaultValue: false },
      ...locatorFields.map(f => ({ ...f, showWhen: { field: 'useElement', values: [true] }, required: false })),
      {
        name: 'key', label: 'Key', type: 'select', options: [
          { value: 'Enter', label: 'Enter' },
          { value: 'Tab', label: 'Tab' },
          { value: 'Escape', label: 'Escape' },
          { value: 'Backspace', label: 'Backspace' },
          { value: 'Delete', label: 'Delete' },
          { value: 'ArrowUp', label: 'Arrow Up' },
          { value: 'ArrowDown', label: 'Arrow Down' },
          { value: 'ArrowLeft', label: 'Arrow Left' },
          { value: 'ArrowRight', label: 'Arrow Right' },
          { value: 'Home', label: 'Home' },
          { value: 'End', label: 'End' },
          { value: 'PageUp', label: 'Page Up' },
          { value: 'PageDown', label: 'Page Down' },
          { value: 'Space', label: 'Space' },
          { value: 'F1', label: 'F1' },
          { value: 'F2', label: 'F2' },
          { value: 'F5', label: 'F5' },
          { value: 'F11', label: 'F11' },
          { value: 'F12', label: 'F12' },
          { value: 'Control+a', label: 'Ctrl+A (Select All)' },
          { value: 'Control+c', label: 'Ctrl+C (Copy)' },
          { value: 'Control+v', label: 'Ctrl+V (Paste)' },
          { value: 'Control+z', label: 'Ctrl+Z (Undo)' },
          { value: 'Control+s', label: 'Ctrl+S (Save)' },
          { value: 'custom', label: 'Custom Key...' },
        ], required: true
      },
      { name: 'customKey', label: 'Custom Key', type: 'text', showWhen: { field: 'key', values: ['custom'] }, placeholder: 'e.g., Control+Shift+p' },
      { name: 'delay', label: 'Delay (ms)', type: 'number' },
    ],
  },
  'select-option': {
    type: 'select-option',
    category: 'input',
    title: 'Select Option',
    description: 'Select option from dropdown',
    icon: '📋',
    color: 'indigo',
    defaultConfig: { selectBy: 'value' },
    configFields: [
      ...locatorFields,
      {
        name: 'selectBy', label: 'Select By', type: 'select', options: [
          { value: 'value', label: 'Value' },
          { value: 'label', label: 'Label/Text' },
          { value: 'index', label: 'Index' },
        ]
      },
      { name: 'optionValue', label: 'Option', type: 'text', required: true },
      { name: 'timeout', label: 'Timeout (ms)', type: 'number', defaultValue: 30000 },
    ],
  },
  'check': {
    type: 'check',
    category: 'input',
    title: 'Check Checkbox',
    description: 'Check a checkbox or radio button',
    icon: '☑️',
    color: 'indigo',
    defaultConfig: {},
    configFields: [
      ...locatorFields,
      { name: 'force', label: 'Force', type: 'boolean' },
      { name: 'timeout', label: 'Timeout (ms)', type: 'number', defaultValue: 30000 },
    ],
  },
  'uncheck': {
    type: 'uncheck',
    category: 'input',
    title: 'Uncheck Checkbox',
    description: 'Uncheck a checkbox',
    icon: '☐',
    color: 'indigo',
    defaultConfig: {},
    configFields: [
      ...locatorFields,
      { name: 'force', label: 'Force', type: 'boolean' },
      { name: 'timeout', label: 'Timeout (ms)', type: 'number', defaultValue: 30000 },
    ],
  },
  'set-checked': {
    type: 'set-checked',
    category: 'input',
    title: 'Set Checked State',
    description: 'Set checkbox to specific state',
    icon: '✅',
    color: 'indigo',
    defaultConfig: { checked: true },
    configFields: [
      ...locatorFields,
      { name: 'checked', label: 'Checked', type: 'boolean', required: true },
      { name: 'timeout', label: 'Timeout (ms)', type: 'number', defaultValue: 30000 },
    ],
  },
  'upload-file': {
    type: 'upload-file',
    category: 'input',
    title: 'Upload File',
    description: 'Upload file to file input',
    icon: '📤',
    color: 'indigo',
    defaultConfig: {},
    configFields: [
      ...locatorFields,
      { name: 'filePath', label: 'File Path', type: 'text', required: true, description: 'Path to file or use ${variable}' },
      { name: 'timeout', label: 'Timeout (ms)', type: 'number', defaultValue: 30000 },
    ],
  },
  'focus': {
    type: 'focus',
    category: 'input',
    title: 'Focus Element',
    description: 'Set focus to an element',
    icon: '🎯',
    color: 'indigo',
    defaultConfig: {},
    configFields: [
      ...locatorFields,
      { name: 'timeout', label: 'Timeout (ms)', type: 'number', defaultValue: 30000 },
    ],
  },
  'blur': {
    type: 'blur',
    category: 'input',
    title: 'Blur Element',
    description: 'Remove focus from element',
    icon: '💨',
    color: 'indigo',
    defaultConfig: {},
    configFields: [
      ...locatorFields,
    ],
  },

  // ============================================
  // ASSERTION BLOCKS
  // ============================================
  'assert-visible': {
    type: 'assert-visible',
    category: 'assertion',
    title: 'Assert Visible',
    description: 'Assert element is visible',
    icon: '👁️',
    color: 'teal',
    defaultConfig: {},
    configFields: [
      ...locatorFields,
      { name: 'not', label: 'Expect NOT visible', type: 'boolean', defaultValue: false },
      { name: 'timeout', label: 'Timeout (ms)', type: 'number', defaultValue: 5000 },
    ],
  },
  'assert-hidden': {
    type: 'assert-hidden',
    category: 'assertion',
    title: 'Assert Hidden',
    description: 'Assert element is hidden',
    icon: '🙈',
    color: 'teal',
    defaultConfig: {},
    configFields: [
      ...locatorFields,
      { name: 'timeout', label: 'Timeout (ms)', type: 'number', defaultValue: 5000 },
    ],
  },
  'assert-text': {
    type: 'assert-text',
    category: 'assertion',
    title: 'Assert Text',
    description: 'Assert element has specific text',
    icon: '📝',
    color: 'teal',
    defaultConfig: { matchType: 'contains' },
    configFields: [
      ...locatorFields,
      {
        name: 'matchType', label: 'Match Type', type: 'select', options: [
          { value: 'exact', label: 'Exact Match' },
          { value: 'contains', label: 'Contains' },
          { value: 'regex', label: 'Regular Expression' },
        ]
      },
      { name: 'expectedText', label: 'Expected Text', type: 'text', required: true },
      { name: 'ignoreCase', label: 'Ignore Case', type: 'boolean' },
      { name: 'not', label: 'Expect NOT', type: 'boolean', defaultValue: false },
      { name: 'timeout', label: 'Timeout (ms)', type: 'number', defaultValue: 5000 },
    ],
  },
  'assert-value': {
    type: 'assert-value',
    category: 'assertion',
    title: 'Assert Value',
    description: 'Assert input has specific value',
    icon: '🔢',
    color: 'teal',
    defaultConfig: {},
    configFields: [
      ...locatorFields,
      { name: 'expectedValue', label: 'Expected Value', type: 'text', required: true },
      { name: 'not', label: 'Expect NOT', type: 'boolean', defaultValue: false },
      { name: 'timeout', label: 'Timeout (ms)', type: 'number', defaultValue: 5000 },
    ],
  },
  'assert-attribute': {
    type: 'assert-attribute',
    category: 'assertion',
    title: 'Assert Attribute',
    description: 'Assert element has specific attribute value',
    icon: '🏷️',
    color: 'teal',
    defaultConfig: {},
    configFields: [
      ...locatorFields,
      { name: 'attribute', label: 'Attribute Name', type: 'text', required: true, placeholder: 'class, href, data-*' },
      { name: 'expectedValue', label: 'Expected Value', type: 'text', required: true },
      { name: 'not', label: 'Expect NOT', type: 'boolean', defaultValue: false },
      { name: 'timeout', label: 'Timeout (ms)', type: 'number', defaultValue: 5000 },
    ],
  },
  'assert-enabled': {
    type: 'assert-enabled',
    category: 'assertion',
    title: 'Assert Enabled',
    description: 'Assert element is enabled',
    icon: '✅',
    color: 'teal',
    defaultConfig: {},
    configFields: [
      ...locatorFields,
      { name: 'not', label: 'Expect Disabled', type: 'boolean', defaultValue: false },
      { name: 'timeout', label: 'Timeout (ms)', type: 'number', defaultValue: 5000 },
    ],
  },
  'assert-checked': {
    type: 'assert-checked',
    category: 'assertion',
    title: 'Assert Checked',
    description: 'Assert checkbox/radio is checked',
    icon: '☑️',
    color: 'teal',
    defaultConfig: {},
    configFields: [
      ...locatorFields,
      { name: 'not', label: 'Expect Unchecked', type: 'boolean', defaultValue: false },
      { name: 'timeout', label: 'Timeout (ms)', type: 'number', defaultValue: 5000 },
    ],
  },
  'assert-count': {
    type: 'assert-count',
    category: 'assertion',
    title: 'Assert Element Count',
    description: 'Assert number of matching elements',
    icon: '🔢',
    color: 'teal',
    defaultConfig: {},
    configFields: [
      ...locatorFields,
      { name: 'expectedCount', label: 'Expected Count', type: 'number', required: true },
      { name: 'timeout', label: 'Timeout (ms)', type: 'number', defaultValue: 5000 },
    ],
  },
  'assert-url': {
    type: 'assert-url',
    category: 'assertion',
    title: 'Assert URL',
    description: 'Assert page URL',
    icon: '🔗',
    color: 'teal',
    defaultConfig: { matchType: 'exact' },
    configFields: [
      {
        name: 'matchType', label: 'Match Type', type: 'select', options: [
          { value: 'exact', label: 'Exact Match' },
          { value: 'contains', label: 'Contains' },
          { value: 'regex', label: 'Regular Expression' },
        ]
      },
      { name: 'expectedUrl', label: 'Expected URL', type: 'text', required: true },
      { name: 'timeout', label: 'Timeout (ms)', type: 'number', defaultValue: 5000 },
    ],
  },
  'assert-title': {
    type: 'assert-title',
    category: 'assertion',
    title: 'Assert Page Title',
    description: 'Assert page title',
    icon: '📰',
    color: 'teal',
    defaultConfig: { matchType: 'exact' },
    configFields: [
      {
        name: 'matchType', label: 'Match Type', type: 'select', options: [
          { value: 'exact', label: 'Exact Match' },
          { value: 'contains', label: 'Contains' },
          { value: 'regex', label: 'Regular Expression' },
        ]
      },
      { name: 'expectedTitle', label: 'Expected Title', type: 'text', required: true },
      { name: 'timeout', label: 'Timeout (ms)', type: 'number', defaultValue: 5000 },
    ],
  },

  // ============================================
  // WAIT BLOCKS
  // ============================================
  'wait-time': {
    type: 'wait-time',
    category: 'wait',
    title: 'Wait (Fixed Time)',
    description: 'Wait for a fixed duration',
    icon: '⏱️',
    color: 'orange',
    defaultConfig: { duration: 1000 },
    configFields: [
      { name: 'duration', label: 'Duration (ms)', type: 'number', required: true, defaultValue: 1000 },
    ],
  },
  'wait-for-element': {
    type: 'wait-for-element',
    category: 'wait',
    title: 'Wait for Element',
    description: 'Wait for element to reach a state',
    icon: '⏳',
    color: 'orange',
    defaultConfig: { state: 'visible' },
    configFields: [
      ...locatorFields,
      {
        name: 'state', label: 'Wait Until', type: 'select', options: [
          { value: 'attached', label: 'Attached (in DOM)' },
          { value: 'detached', label: 'Detached (removed from DOM)' },
          { value: 'visible', label: 'Visible' },
          { value: 'hidden', label: 'Hidden' },
        ], required: true
      },
      { name: 'timeout', label: 'Timeout (ms)', type: 'number', defaultValue: 30000 },
    ],
  },
  'wait-for-url': {
    type: 'wait-for-url',
    category: 'wait',
    title: 'Wait for URL',
    description: 'Wait for URL to change',
    icon: '🔗',
    color: 'orange',
    defaultConfig: { matchType: 'contains' },
    configFields: [
      {
        name: 'matchType', label: 'Match Type', type: 'select', options: [
          { value: 'exact', label: 'Exact Match' },
          { value: 'contains', label: 'Contains' },
          { value: 'regex', label: 'Regular Expression' },
        ]
      },
      { name: 'url', label: 'URL Pattern', type: 'text', required: true },
      { name: 'timeout', label: 'Timeout (ms)', type: 'number', defaultValue: 30000 },
    ],
  },
  'wait-for-load-state': {
    type: 'wait-for-load-state',
    category: 'wait',
    title: 'Wait for Load State',
    description: 'Wait for page load state',
    icon: '📄',
    color: 'orange',
    defaultConfig: { state: 'load' },
    configFields: [
      {
        name: 'state', label: 'Load State', type: 'select', options: [
          { value: 'load', label: 'Load (full page load)' },
          { value: 'domcontentloaded', label: 'DOM Content Loaded' },
          { value: 'networkidle', label: 'Network Idle' },
        ], required: true
      },
      { name: 'timeout', label: 'Timeout (ms)', type: 'number', defaultValue: 30000 },
    ],
  },
  'wait-for-response': {
    type: 'wait-for-response',
    category: 'wait',
    title: 'Wait for Network Response',
    description: 'Wait for a network request to complete',
    icon: '🌐',
    color: 'orange',
    defaultConfig: {},
    configFields: [
      { name: 'urlPattern', label: 'URL Pattern', type: 'text', required: true, placeholder: '**/api/users' },
      { name: 'timeout', label: 'Timeout (ms)', type: 'number', defaultValue: 30000 },
    ],
  },
  'wait-for-function': {
    type: 'wait-for-function',
    category: 'wait',
    title: 'Wait for Condition',
    description: 'Wait for JavaScript condition to be true',
    icon: '⚡',
    color: 'orange',
    defaultConfig: {},
    configFields: [
      { name: 'expression', label: 'JavaScript Expression', type: 'code', required: true, placeholder: '() => document.querySelector(".loaded") !== null' },
      {
        name: 'polling', label: 'Polling Interval', type: 'select', options: [
          { value: 'raf', label: 'Request Animation Frame' },
          { value: '100', label: '100ms' },
          { value: '500', label: '500ms' },
          { value: '1000', label: '1000ms' },
        ], defaultValue: 'raf'
      },
      { name: 'timeout', label: 'Timeout (ms)', type: 'number', defaultValue: 30000 },
    ],
  },

  // ============================================
  // CONTROL FLOW BLOCKS
  // ============================================
  'start': {
    type: 'start',
    category: 'control',
    title: 'Start',
    description: 'Start of the test flow',
    icon: '▶️',
    color: 'green',
    defaultConfig: {},
    configFields: [],
  },
  'end': {
    type: 'end',
    category: 'control',
    title: 'End',
    description: 'End of the test flow',
    icon: '🏁',
    color: 'slate',
    defaultConfig: {},
    configFields: [],
  },
  'if': {
    type: 'if',
    category: 'control',
    title: 'If Condition',
    description: 'Conditional branching',
    icon: '◆',
    color: 'amber',
    defaultConfig: { conditionType: 'element' },
    acceptsChildren: true,
    hasElseBranch: true,
    configFields: [
      {
        name: 'conditionType', label: 'Condition Type', type: 'select', options: [
          { value: 'element', label: 'Element Condition' },
          { value: 'variable', label: 'Variable Condition' },
          { value: 'expression', label: 'JavaScript Expression' },
        ]
      },
      // Element conditions
      ...locatorFields.map(f => ({ ...f, showWhen: { field: 'conditionType', values: ['element'] }, required: false })),
      {
        name: 'elementCondition', label: 'Element Is', type: 'select', showWhen: { field: 'conditionType', values: ['element'] }, options: [
          { value: 'visible', label: 'Visible' },
          { value: 'hidden', label: 'Hidden' },
          { value: 'enabled', label: 'Enabled' },
          { value: 'disabled', label: 'Disabled' },
          { value: 'checked', label: 'Checked' },
          { value: 'exists', label: 'Exists in DOM' },
        ]
      },
      // Variable conditions
      { name: 'variableName', label: 'Variable', type: 'variable', showWhen: { field: 'conditionType', values: ['variable'] } },
      {
        name: 'operator', label: 'Operator', type: 'select', showWhen: { field: 'conditionType', values: ['variable'] }, options: [
          { value: 'equals', label: 'Equals (==)' },
          { value: 'notEquals', label: 'Not Equals (!=)' },
          { value: 'contains', label: 'Contains' },
          { value: 'startsWith', label: 'Starts With' },
          { value: 'endsWith', label: 'Ends With' },
          { value: 'greaterThan', label: 'Greater Than (>)' },
          { value: 'lessThan', label: 'Less Than (<)' },
          { value: 'greaterOrEqual', label: 'Greater or Equal (>=)' },
          { value: 'lessOrEqual', label: 'Less or Equal (<=)' },
          { value: 'isEmpty', label: 'Is Empty' },
          { value: 'isNotEmpty', label: 'Is Not Empty' },
          { value: 'isTrue', label: 'Is True' },
          { value: 'isFalse', label: 'Is False' },
        ]
      },
      { name: 'compareValue', label: 'Compare Value', type: 'text', showWhen: { field: 'conditionType', values: ['variable'] } },
      // Expression
      { name: 'expression', label: 'JavaScript Expression', type: 'code', showWhen: { field: 'conditionType', values: ['expression'] }, placeholder: 'Return true or false' },
    ],
  },
  'else': {
    type: 'else',
    category: 'control',
    title: 'Else',
    description: 'Else branch for If condition',
    icon: '◇',
    color: 'amber',
    defaultConfig: {},
    acceptsChildren: true,
    configFields: [],
  },
  'for-loop': {
    type: 'for-loop',
    category: 'control',
    title: 'For Loop (Count)',
    description: 'Loop a fixed number of times',
    icon: '🔁',
    color: 'amber',
    defaultConfig: { count: 5 },
    acceptsChildren: true,
    configFields: [
      { name: 'count', label: 'Number of Iterations', type: 'number', required: true, defaultValue: 5, min: 1 },
      { name: 'indexVariable', label: 'Index Variable Name', type: 'text', defaultValue: 'i', description: 'Variable to store current index' },
    ],
  },
  'for-each': {
    type: 'for-each',
    category: 'control',
    title: 'For Each Loop',
    description: 'Loop through a collection',
    icon: '🔄',
    color: 'amber',
    defaultConfig: {},
    acceptsChildren: true,
    configFields: [
      {
        name: 'collectionType', label: 'Collection Type', type: 'select', options: [
          { value: 'variable', label: 'Variable (Array)' },
          { value: 'elements', label: 'DOM Elements' },
        ]
      },
      { name: 'collectionVariable', label: 'Collection Variable', type: 'variable', showWhen: { field: 'collectionType', values: ['variable'] } },
      ...locatorFields.map(f => ({ ...f, showWhen: { field: 'collectionType', values: ['elements'] }, required: false })),
      { name: 'itemVariable', label: 'Item Variable Name', type: 'text', defaultValue: 'item', required: true },
      { name: 'indexVariable', label: 'Index Variable Name', type: 'text', defaultValue: 'index' },
    ],
  },
  'while-loop': {
    type: 'while-loop',
    category: 'control',
    title: 'While Loop',
    description: 'Loop while condition is true',
    icon: '🔃',
    color: 'amber',
    defaultConfig: { maxIterations: 100 },
    acceptsChildren: true,
    configFields: [
      {
        name: 'conditionType', label: 'Condition Type', type: 'select', options: [
          { value: 'element', label: 'Element Condition' },
          { value: 'variable', label: 'Variable Condition' },
          { value: 'expression', label: 'JavaScript Expression' },
        ]
      },
      ...locatorFields.map(f => ({ ...f, showWhen: { field: 'conditionType', values: ['element'] }, required: false })),
      {
        name: 'elementCondition', label: 'While Element Is', type: 'select', showWhen: { field: 'conditionType', values: ['element'] }, options: [
          { value: 'visible', label: 'Visible' },
          { value: 'hidden', label: 'Hidden' },
          { value: 'exists', label: 'Exists in DOM' },
        ]
      },
      { name: 'variableName', label: 'Variable', type: 'variable', showWhen: { field: 'conditionType', values: ['variable'] } },
      {
        name: 'operator', label: 'Operator', type: 'select', showWhen: { field: 'conditionType', values: ['variable'] }, options: [
          { value: 'equals', label: 'Equals (==)' },
          { value: 'notEquals', label: 'Not Equals (!=)' },
          { value: 'lessThan', label: 'Less Than (<)' },
          { value: 'greaterThan', label: 'Greater Than (>)' },
          { value: 'isTrue', label: 'Is True' },
        ]
      },
      { name: 'compareValue', label: 'Compare Value', type: 'text', showWhen: { field: 'conditionType', values: ['variable'] } },
      { name: 'expression', label: 'JavaScript Expression', type: 'code', showWhen: { field: 'conditionType', values: ['expression'] } },
      { name: 'maxIterations', label: 'Max Iterations (safety)', type: 'number', defaultValue: 100 },
    ],
  },
  'break': {
    type: 'break',
    category: 'control',
    title: 'Break Loop',
    description: 'Exit from current loop',
    icon: '⏹️',
    color: 'amber',
    defaultConfig: {},
    configFields: [],
  },
  'continue': {
    type: 'continue',
    category: 'control',
    title: 'Continue Loop',
    description: 'Skip to next iteration',
    icon: '⏭️',
    color: 'amber',
    defaultConfig: {},
    configFields: [],
  },
  'pass': {
    type: 'pass',
    category: 'control',
    title: 'Pass',
    description: 'Mark test as passed and stop execution',
    icon: '✅',
    color: 'green',
    defaultConfig: {},
    configFields: [
      { name: 'message', label: 'Success Message', type: 'text', placeholder: 'Test passed successfully' },
    ],
  },
  'fail': {
    type: 'fail',
    category: 'control',
    title: 'Fail',
    description: 'Mark test as failed and stop execution',
    icon: '❌',
    color: 'red',
    defaultConfig: {},
    configFields: [
      { name: 'message', label: 'Failure Message', type: 'text', required: true, placeholder: 'Test failed because...' },
    ],
  },
  'try-catch': {
    type: 'try-catch',
    category: 'control',
    title: 'Try-Catch',
    description: 'Handle errors gracefully',
    icon: '🛡️',
    color: 'amber',
    defaultConfig: {},
    acceptsChildren: true,
    hasCatchBranch: true,
    hasFinallyBranch: true,
    configFields: [
      { name: 'errorVariable', label: 'Error Variable Name', type: 'text', defaultValue: 'error', description: 'Variable to store caught error' },
    ],
  },
  'group': {
    type: 'group',
    category: 'control',
    title: 'Group',
    description: 'Group steps together',
    icon: '📦',
    color: 'amber',
    defaultConfig: {},
    acceptsChildren: true,
    configFields: [
      { name: 'name', label: 'Group Name', type: 'text', placeholder: 'Login Steps' },
      { name: 'description', label: 'Description', type: 'textarea' },
    ],
  },

  // ============================================
  // DATA & VARIABLES BLOCKS
  // ============================================
  'set-variable': {
    type: 'set-variable',
    category: 'data',
    title: 'Set Variable',
    description: 'Create or update a variable',
    icon: '📝',
    color: 'purple',
    defaultConfig: { valueType: 'string' },
    configFields: [
      { name: 'name', label: 'Variable Name', type: 'text', required: true, placeholder: 'myVariable' },
      {
        name: 'valueType', label: 'Value Type', type: 'select', options: [
          { value: 'string', label: 'String' },
          { value: 'number', label: 'Number' },
          { value: 'boolean', label: 'Boolean' },
          { value: 'json', label: 'JSON Object/Array' },
          { value: 'expression', label: 'JavaScript Expression' },
        ]
      },
      { name: 'value', label: 'Value', type: 'text', showWhen: { field: 'valueType', values: ['string', 'number'] } },
      { name: 'boolValue', label: 'Value', type: 'boolean', showWhen: { field: 'valueType', values: ['boolean'] } },
      { name: 'jsonValue', label: 'JSON Value', type: 'json', showWhen: { field: 'valueType', values: ['json'] } },
      { name: 'expression', label: 'Expression', type: 'code', showWhen: { field: 'valueType', values: ['expression'] } },
    ],
  },
  'get-text': {
    type: 'get-text',
    category: 'data',
    title: 'Get Text',
    description: 'Extract text from element',
    icon: '📄',
    color: 'purple',
    defaultConfig: {},
    configFields: [
      ...locatorFields,
      { name: 'variable', label: 'Store in Variable', type: 'text', required: true, placeholder: 'extractedText' },
      { name: 'trim', label: 'Trim Whitespace', type: 'boolean', defaultValue: true },
    ],
  },
  'get-attribute': {
    type: 'get-attribute',
    category: 'data',
    title: 'Get Attribute',
    description: 'Extract attribute value',
    icon: '🏷️',
    color: 'purple',
    defaultConfig: {},
    configFields: [
      ...locatorFields,
      { name: 'attribute', label: 'Attribute Name', type: 'text', required: true, placeholder: 'href, src, data-*' },
      { name: 'variable', label: 'Store in Variable', type: 'text', required: true },
    ],
  },
  'get-value': {
    type: 'get-value',
    category: 'data',
    title: 'Get Input Value',
    description: 'Get value from input field',
    icon: '📥',
    color: 'purple',
    defaultConfig: {},
    configFields: [
      ...locatorFields,
      { name: 'variable', label: 'Store in Variable', type: 'text', required: true },
    ],
  },
  'get-url': {
    type: 'get-url',
    category: 'data',
    title: 'Get Current URL',
    description: 'Get the current page URL',
    icon: '🔗',
    color: 'purple',
    defaultConfig: {},
    configFields: [
      { name: 'variable', label: 'Store in Variable', type: 'text', required: true, defaultValue: 'currentUrl' },
    ],
  },
  'get-title': {
    type: 'get-title',
    category: 'data',
    title: 'Get Page Title',
    description: 'Get the current page title',
    icon: '📰',
    color: 'purple',
    defaultConfig: {},
    configFields: [
      { name: 'variable', label: 'Store in Variable', type: 'text', required: true, defaultValue: 'pageTitle' },
    ],
  },
  'get-element-count': {
    type: 'get-element-count',
    category: 'data',
    title: 'Get Element Count',
    description: 'Count matching elements',
    icon: '🔢',
    color: 'purple',
    defaultConfig: {},
    configFields: [
      ...locatorFields,
      { name: 'variable', label: 'Store in Variable', type: 'text', required: true },
    ],
  },
  'log': {
    type: 'log',
    category: 'data',
    title: 'Log Message',
    description: 'Log a message to console',
    icon: '📋',
    color: 'purple',
    defaultConfig: { level: 'info' },
    configFields: [
      { name: 'message', label: 'Message', type: 'text', required: true, description: 'Use ${variable} for dynamic values' },
      {
        name: 'level', label: 'Log Level', type: 'select', options: [
          { value: 'info', label: 'Info' },
          { value: 'warn', label: 'Warning' },
          { value: 'error', label: 'Error' },
          { value: 'debug', label: 'Debug' },
        ]
      },
    ],
  },
  'screenshot': {
    type: 'screenshot',
    category: 'data',
    title: 'Take Screenshot',
    description: 'Capture screenshot',
    icon: '📸',
    color: 'purple',
    defaultConfig: { type: 'page' },
    configFields: [
      {
        name: 'type', label: 'Screenshot Type', type: 'select', options: [
          { value: 'page', label: 'Full Page' },
          { value: 'viewport', label: 'Viewport Only' },
          { value: 'element', label: 'Specific Element' },
        ]
      },
      ...locatorFields.map(f => ({ ...f, showWhen: { field: 'type', values: ['element'] }, required: false })),
      { name: 'name', label: 'Screenshot Name', type: 'text', placeholder: 'screenshot-1' },
      { name: 'fullPage', label: 'Full Page Scroll', type: 'boolean', showWhen: { field: 'type', values: ['page'] } },
    ],
  },
  'extract': {
    type: 'extract',
    category: 'data',
    title: 'Extract Value',
    description: 'Extract a value from the page and store as runtime variable',
    icon: '📤',
    color: 'purple',
    defaultConfig: { attribute: 'textContent', transform: 'none' },
    configFields: [
      ...locatorFields,
      {
        name: 'attribute', label: 'Extract', type: 'select', options: [
          { value: 'textContent', label: 'Text Content' },
          { value: 'innerText', label: 'Inner Text (visible only)' },
          { value: 'value', label: 'Input Value' },
          { value: 'href', label: 'Link URL (href)' },
          { value: 'src', label: 'Image Source (src)' },
          { value: 'id', label: 'Element ID' },
          { value: 'className', label: 'CSS Classes' },
          { value: 'custom', label: 'Custom Attribute...' },
        ], required: true
      },
      {
        name: 'customAttribute', label: 'Attribute Name', type: 'text',
        showWhen: { field: 'attribute', values: ['custom'] }, placeholder: 'data-testid'
      },
      {
        name: 'storeAs', label: 'Store As Variable', type: 'text',
        required: true, placeholder: 'extractedValue', description: 'Access via {{extracted.variableName}}'
      },
      {
        name: 'transform', label: 'Transform', type: 'select', options: [
          { value: 'none', label: 'None' },
          { value: 'trim', label: 'Trim Whitespace' },
          { value: 'number', label: 'Parse as Number' },
          { value: 'boolean', label: 'Parse as Boolean' },
          { value: 'json', label: 'Parse as JSON' },
          { value: 'uppercase', label: 'Uppercase' },
          { value: 'lowercase', label: 'Lowercase' },
          { value: 'regex', label: 'Regex Extract' },
        ]
      },
      {
        name: 'regex', label: 'Regex Pattern', type: 'text',
        showWhen: { field: 'transform', values: ['regex'] }, placeholder: '(\\d+)'
      },
      {
        name: 'regexGroup', label: 'Capture Group', type: 'number',
        showWhen: { field: 'transform', values: ['regex'] }, defaultValue: 0
      },
      {
        name: 'defaultValue', label: 'Default Value', type: 'text',
        placeholder: 'Value if extraction fails'
      },
    ],
  },

  // ============================================
  // NETWORK BLOCKS
  // ============================================
  'http-request': {
    type: 'http-request',
    category: 'network',
    title: 'HTTP Request',
    description: 'Make an HTTP/API request',
    icon: '🌐',
    color: 'pink',
    defaultConfig: { method: 'GET' },
    configFields: [
      {
        name: 'method', label: 'Method', type: 'select', options: [
          { value: 'GET', label: 'GET' },
          { value: 'POST', label: 'POST' },
          { value: 'PUT', label: 'PUT' },
          { value: 'PATCH', label: 'PATCH' },
          { value: 'DELETE', label: 'DELETE' },
        ], required: true
      },
      { name: 'url', label: 'URL', type: 'text', required: true },
      { name: 'headers', label: 'Headers', type: 'headers' },
      {
        name: 'bodyType', label: 'Body Type', type: 'select', showWhen: { field: 'method', values: ['POST', 'PUT', 'PATCH'] }, options: [
          { value: 'json', label: 'JSON' },
          { value: 'form', label: 'Form Data' },
          { value: 'text', label: 'Plain Text' },
        ]
      },
      { name: 'body', label: 'Request Body', type: 'json', showWhen: { field: 'method', values: ['POST', 'PUT', 'PATCH'] } },
      { name: 'responseVariable', label: 'Store Response In', type: 'text', placeholder: 'response' },
      { name: 'statusVariable', label: 'Store Status In', type: 'text', placeholder: 'statusCode' },
      { name: 'timeout', label: 'Timeout (ms)', type: 'number', defaultValue: 30000 },
    ],
  },
  'intercept-request': {
    type: 'intercept-request',
    category: 'network',
    title: 'Intercept Network',
    description: 'Intercept and modify network requests',
    icon: '🔌',
    color: 'pink',
    defaultConfig: { action: 'continue' },
    configFields: [
      { name: 'urlPattern', label: 'URL Pattern', type: 'text', required: true, placeholder: '**/api/*' },
      {
        name: 'action', label: 'Action', type: 'select', options: [
          { value: 'continue', label: 'Continue (passthrough)' },
          { value: 'abort', label: 'Abort Request' },
          { value: 'fulfill', label: 'Mock Response' },
          { value: 'modify', label: 'Modify Request' },
        ]
      },
      { name: 'mockStatus', label: 'Mock Status Code', type: 'number', showWhen: { field: 'action', values: ['fulfill'] }, defaultValue: 200 },
      { name: 'mockBody', label: 'Mock Response Body', type: 'json', showWhen: { field: 'action', values: ['fulfill'] } },
      { name: 'mockHeaders', label: 'Mock Headers', type: 'headers', showWhen: { field: 'action', values: ['fulfill'] } },
    ],
  },

  // ============================================
  // ADVANCED BLOCKS
  // ============================================
  'run-javascript': {
    type: 'run-javascript',
    category: 'advanced',
    title: 'Run JavaScript',
    description: 'Execute JavaScript in page context',
    icon: '⚡',
    color: 'rose',
    defaultConfig: {},
    configFields: [
      { name: 'code', label: 'JavaScript Code', type: 'code', required: true },
      { name: 'returnVariable', label: 'Store Result In', type: 'text', placeholder: 'result' },
    ],
  },
  'handle-dialog': {
    type: 'handle-dialog',
    category: 'advanced',
    title: 'Handle Dialog',
    description: 'Handle alert, confirm, prompt dialogs',
    icon: '💬',
    color: 'rose',
    defaultConfig: { action: 'accept' },
    configFields: [
      {
        name: 'action', label: 'Action', type: 'select', options: [
          { value: 'accept', label: 'Accept/OK' },
          { value: 'dismiss', label: 'Dismiss/Cancel' },
        ], required: true
      },
      { name: 'promptText', label: 'Prompt Input Text', type: 'text', description: 'Text to enter for prompt dialogs' },
      { name: 'messageVariable', label: 'Store Dialog Message In', type: 'text' },
    ],
  },
  'handle-download': {
    type: 'handle-download',
    category: 'advanced',
    title: 'Handle Download',
    description: 'Wait for and handle file download',
    icon: '📥',
    color: 'rose',
    defaultConfig: {},
    configFields: [
      { name: 'savePath', label: 'Save Path', type: 'text', placeholder: './downloads/file.pdf' },
      { name: 'pathVariable', label: 'Store Path In', type: 'text' },
    ],
  },
  'emulate-device': {
    type: 'emulate-device',
    category: 'advanced',
    title: 'Emulate Device',
    description: 'Emulate mobile device',
    icon: '📱',
    color: 'rose',
    defaultConfig: {},
    configFields: [
      {
        name: 'device', label: 'Device', type: 'select', options: [
          { value: 'iPhone 12', label: 'iPhone 12' },
          { value: 'iPhone 13', label: 'iPhone 13' },
          { value: 'iPhone 14', label: 'iPhone 14' },
          { value: 'Pixel 5', label: 'Pixel 5' },
          { value: 'Galaxy S21', label: 'Samsung Galaxy S21' },
          { value: 'iPad', label: 'iPad' },
          { value: 'iPad Pro', label: 'iPad Pro' },
          { value: 'custom', label: 'Custom...' },
        ]
      },
      { name: 'customWidth', label: 'Width', type: 'number', showWhen: { field: 'device', values: ['custom'] } },
      { name: 'customHeight', label: 'Height', type: 'number', showWhen: { field: 'device', values: ['custom'] } },
      { name: 'customUserAgent', label: 'User Agent', type: 'text', showWhen: { field: 'device', values: ['custom'] } },
    ],
  },
  'set-viewport': {
    type: 'set-viewport',
    category: 'advanced',
    title: 'Set Viewport Size',
    description: 'Change viewport dimensions',
    icon: '🖥️',
    color: 'rose',
    defaultConfig: { width: 1920, height: 1080 },
    configFields: [
      { name: 'width', label: 'Width', type: 'number', required: true, defaultValue: 1920 },
      { name: 'height', label: 'Height', type: 'number', required: true, defaultValue: 1080 },
    ],
  },
  'evaluate-expression': {
    type: 'evaluate-expression',
    category: 'advanced',
    title: 'Evaluate Expression',
    description: 'Evaluate JavaScript expression and store result',
    icon: '🧮',
    color: 'rose',
    defaultConfig: {},
    configFields: [
      { name: 'expression', label: 'Expression', type: 'expression', required: true, placeholder: '${count} + 1' },
      { name: 'variable', label: 'Store Result In', type: 'text', required: true },
    ],
  },
  'comment': {
    type: 'comment',
    category: 'advanced',
    title: 'Comment',
    description: 'Add a comment/note (not executed)',
    icon: '💭',
    color: 'rose',
    defaultConfig: {},
    configFields: [
      { name: 'text', label: 'Comment', type: 'textarea', placeholder: 'Add notes or documentation here...' },
    ],
  },
  'sub-flow': {
    type: 'sub-flow',
    category: 'advanced',
    title: 'Run Sub-Flow',
    description: 'Execute another test flow',
    icon: '📦',
    color: 'rose',
    defaultConfig: {},
    configFields: [
      { name: 'flowId', label: 'Flow', type: 'select', options: [] }, // Populated dynamically
      { name: 'parameters', label: 'Parameters', type: 'json' },
    ],
  },
};

// Get blocks by category
export function getBlocksByCategory(category: BlockCategory): BlockDefinition[] {
  return Object.values(blockDefinitions).filter(b => b.category === category);
}

// Get all categories
export function getCategories(): { id: BlockCategory; label: string; icon: string; blocks: BlockDefinition[] }[] {
  return Object.entries(categoryStyles).map(([id, style]) => ({
    id: id as BlockCategory,
    label: style.label,
    icon: style.icon,
    blocks: getBlocksByCategory(id as BlockCategory),
  }));
}
