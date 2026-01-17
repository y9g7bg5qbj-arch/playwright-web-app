# Vero IDE - IntelliJ Design System

Design tokens and specifications for applying IntelliJ IDEA Darcula theme to the existing Vero IDE layout.

---

## Color System

### Background Hierarchy
```css
:root {
  /* Main backgrounds (Darcula) */
  --bg-main:          #2B2B2B;   /* Primary background */
  --bg-panel:         #3C3F41;   /* Tool windows, sidebars */
  --bg-input:         #45494A;   /* Input fields, dropdowns */
  --bg-selected:      #2D5B8C;   /* Selected items */
  --bg-hover:         #323232;   /* Hover states */
  --bg-current-line:  #323232;   /* Editor current line */
  
  /* Borders */
  --border-subtle:    #323232;   /* Subtle dividers */
  --border-default:   #515151;   /* Visible borders */
  --border-focus:     #3592C4;   /* Focus rings */
}
```

### Text Colors
```css
:root {
  --text-primary:     #A9B7C6;   /* Main text */
  --text-secondary:   #808080;   /* Muted text, comments */
  --text-disabled:    #606060;   /* Disabled states */
  --text-link:        #6897BB;   /* Links, clickable text */
  --text-heading:     #BBBBBB;   /* Headers */
}
```

### Accent Colors
```css
:root {
  /* Status indicators */
  --status-success:   #499C54;   /* Pass, success */
  --status-error:     #DB5860;   /* Fail, error */
  --status-warning:   #D9A343;   /* Warning, caution */
  --status-running:   #3592C4;   /* In progress */
  --status-pending:   #6E6E6E;   /* Queued, waiting */
  
  /* Accent */
  --accent-blue:      #3592C4;   /* Primary action */
  --accent-purple:    #9876AA;   /* AI features */
  --accent-orange:    #CC7832;   /* Keywords, emphasis */
}
```

### Syntax Highlighting (Darcula)
```css
:root {
  --syntax-keyword:   #CC7832;   /* FEATURE, SCENARIO, END */
  --syntax-string:    #6A8759;   /* "quoted strings" */
  --syntax-number:    #6897BB;   /* Numbers */
  --syntax-function:  #FFC66D;   /* Function names */
  --syntax-variable:  #9876AA;   /* $variables */
  --syntax-comment:   #808080;   /* // comments */
  --syntax-operator:  #A9B7C6;   /* Operators */
}
```

---

## Typography

### Font Stack
```css
:root {
  /* UI Font - JetBrains Sans or fallback */
  --font-ui: 'JetBrains Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  
  /* Code Font */
  --font-mono: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
  
  /* Base sizes (compact, like IntelliJ) */
  --font-size-xs:     11px;  /* Badges, tooltips */
  --font-size-sm:     12px;  /* Secondary text, tree items */
  --font-size-base:   13px;  /* Default UI text */
  --font-size-md:     14px;  /* Emphasis, tab labels */
  --font-size-lg:     15px;  /* Section headers */
  
  /* Line heights */
  --line-height-tight:  1.2;   /* Compact lists */
  --line-height-normal: 1.4;   /* Body text */
  --line-height-code:   1.5;   /* Code editor */
  
  /* Font weights */
  --weight-normal:    400;
  --weight-medium:    500;
  --weight-semibold:  600;
}
```

### Typography Usage
| Element | Font | Size | Weight | Color |
|---------|------|------|--------|-------|
| Panel Header | `--font-ui` | 13px | 600 | `--text-heading` |
| Tree Item | `--font-ui` | 12px | 400 | `--text-primary` |
| Tab Label | `--font-ui` | 13px | 400 | `--text-primary` |
| Code | `--font-mono` | 13px | 400 | `--text-primary` |
| Button | `--font-ui` | 12px | 500 | `--text-primary` |
| Status Bar | `--font-ui` | 11px | 400 | `--text-secondary` |

---

## Iconography

### Icon Specifications
```css
:root {
  --icon-size-sm:     12px;  /* Inline icons */
  --icon-size-md:     16px;  /* Default icons */
  --icon-size-lg:     20px;  /* Activity bar */
  --icon-color:       #AFB1B3;  /* Default icon color */
  --icon-color-active: #FFFFFF; /* Active state */
}
```

### Icon Mapping (IntelliJ-style)
| Feature | Icon | Notes |
|---------|------|-------|
| Project/Explorer | 📁 Folder outline | `AllIcons.Nodes.Folder` |
| File (.vero) | 📄 Document | Custom Vero file icon |
| Executions | ▶️ Play in circle | `AllIcons.Actions.Execute` |
| Passed | ✓ Checkmark (green) | `AllIcons.RunConfigurations.TestPassed` |
| Failed | ✗ X mark (red) | `AllIcons.RunConfigurations.TestFailed` |
| Running | ◐ Spinner (blue) | `AllIcons.RunConfigurations.TestInProgress` |
| Schedule | 📅 Calendar | `AllIcons.Nodes.Schedule` |
| Data/Database | 🗄️ Grid | `AllIcons.Nodes.DataTables` |
| AI/Generate | ✨ Sparkle (purple) | Custom AI icon |
| Settings | ⚙️ Gear | `AllIcons.General.GearPlain` |
| Run | ▶ Play (green) | `AllIcons.Actions.Run` |
| Debug | 🐛 Bug (green) | `AllIcons.Actions.Debug` |
| Record | ⏺ Circle (red) | `AllIcons.Debugger.Record` |
| Stop | ⬛ Square (red) | `AllIcons.Actions.Stop` |
| Add | + Plus | `AllIcons.General.Add` |
| Delete | − Minus | `AllIcons.General.Remove` |
| Expand | ▸ Chevron right | `AllIcons.Nodes.Collapsed` |
| Collapse | ▾ Chevron down | `AllIcons.Nodes.Expanded` |
| Trace | 📊 Activity | `AllIcons.Debugger.Trace` |

---

## Component Specifications

### Header Bar (same layout, IntelliJ styling)
```
Height: 32px (compact)
Background: var(--bg-main)
Border-bottom: 1px solid var(--border-subtle)

Logo: 24px, flat design
Project selector: font-size 13px, dropdown arrow
Search: "Shift+Shift" placeholder, subtle input
Run controls: 16px icons, 4px gap
```

### Activity Bar (left edge)
```
Width: 28px
Background: var(--bg-main)
Border-right: 1px solid var(--border-subtle)

Icons: 16px, rotated labels
Active: left border 2px var(--accent-blue), icon color white
Hover: background var(--bg-hover)
Badge: 12px circle, var(--accent-blue) background
```

### Tool Window (Sidebar Panels)
```
Header:
  Height: 24px
  Background: var(--bg-panel)
  Font: 12px semibold, uppercase tracking
  Icons: gear, minimize in header

Content:
  Background: var(--bg-panel)
  Padding: 0 (edge-to-edge tree)
  
Tree items:
  Height: 22px
  Padding-left: 16px per level
  Font: 12px
  Hover: var(--bg-hover)
  Selected: var(--bg-selected)
```

### Editor Tabs
```
Height: 28px
Background: var(--bg-main)

Tab:
  Padding: 0 12px
  Font: 13px
  Inactive: var(--text-secondary)
  Active: var(--text-primary), underline 2px var(--accent-blue)
  Modified: blue dot before close button

Close button: 12px, appears on hover
```

### Code Editor
```
Background: var(--bg-main)
Gutter:
  Width: 48px
  Background: var(--bg-panel)
  Line numbers: var(--text-secondary), right-aligned
  Breakpoint: red dot, 8px

Current line: var(--bg-current-line)
Selection: #214283

Font: JetBrains Mono, 13px
Line-height: 1.5
Tab size: 2 spaces visual
```

### Bottom Panel (Run/Output)
```
Header:
  Height: 24px
  Background: var(--bg-main)
  Tabs: Output | Problems | Terminal

Content:
  Background: var(--bg-main)
  Font: JetBrains Mono, 12px
  Timestamps: var(--text-secondary)
  Success: var(--status-success)
  Error: var(--status-error)
```

### Status Bar
```
Height: 20px
Background: var(--bg-panel)
Border-top: 1px solid var(--border-subtle)

Font: 11px
Items separated by: " | "
Right side: Line:Col, Git branch, Encoding, Memory
```

---

## Buttons

### Primary Button
```css
.btn-primary {
  background: #365880;
  color: #FFFFFF;
  border: 1px solid #4C5A6E;
  border-radius: 3px;
  padding: 4px 14px;
  font: 12px var(--font-ui);
}
.btn-primary:hover {
  background: #4E6E8C;
}
```

### Secondary Button
```css
.btn-secondary {
  background: #4C5052;
  color: #A9B7C6;
  border: 1px solid #5E6060;
  border-radius: 3px;
  padding: 4px 14px;
}
.btn-secondary:hover {
  background: #5C6164;
}
```

### Icon Button
```css
.btn-icon {
  background: transparent;
  color: #AFB1B3;
  padding: 4px;
  border-radius: 3px;
}
.btn-icon:hover {
  background: var(--bg-hover);
  color: #FFFFFF;
}
```

---

## Form Controls

### Input Field
```css
.input {
  background: var(--bg-input);
  border: 1px solid var(--border-default);
  border-radius: 3px;
  color: var(--text-primary);
  padding: 4px 8px;
  font: 13px var(--font-ui);
}
.input:focus {
  border-color: var(--border-focus);
  outline: none;
}
```

### Dropdown
```css
.dropdown {
  background: var(--bg-input);
  border: 1px solid var(--border-default);
  border-radius: 3px;
  color: var(--text-primary);
  padding: 4px 24px 4px 8px;
  /* Chevron icon right */
}
```

### Checkbox
```css
.checkbox {
  width: 14px;
  height: 14px;
  background: var(--bg-input);
  border: 1px solid var(--border-default);
  border-radius: 2px;
}
.checkbox:checked {
  background: var(--accent-blue);
  /* White checkmark */
}
```

---

## Spacing System
```css
:root {
  --space-1: 2px;
  --space-2: 4px;
  --space-3: 8px;
  --space-4: 12px;
  --space-5: 16px;
  --space-6: 24px;
  --space-7: 32px;
}
```

---

## Shadows (minimal, IntelliJ uses flat design)
```css
:root {
  --shadow-popup: 0 2px 8px rgba(0, 0, 0, 0.5);
  --shadow-dropdown: 0 1px 4px rgba(0, 0, 0, 0.3);
}
```

---

## Animation
```css
:root {
  --transition-fast: 100ms ease;
  --transition-normal: 150ms ease;
}
```

---

## Implementation Notes

1. **Compact density**: IntelliJ uses tighter spacing than typical web UIs
2. **Flat design**: Minimal shadows, rely on subtle borders
3. **Muted colors**: Avoid pure white, use `#A9B7C6` for text
4. **Icon consistency**: All icons same weight, similar visual density
5. **Tool windows**: Edge-to-edge content, no rounded corners internally
