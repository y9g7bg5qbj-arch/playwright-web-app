# Gemini Design Enhancement Prompt

Use this prompt with Gemini to get enhanced, more modern UI designs for Vero IDE.

---

## Prompt for Gemini

```
I'm redesigning a Test Automation IDE called "Vero IDE" - a competitor to LeapWork and testRigor. I have existing UX designs that give a good IDE vibe, but I want to make them more modern and polished.

**Current Design System:**
- Dark theme with #1e1e1e background (VS Code inspired)
- Alternative: #0d1117 background (GitHub inspired)
- Accent color: #007acc (blue)
- Success: #3fb950 (green)
- Error: #f85149 (red)
- Warning: #d29922 (yellow)
- Fonts: Inter (UI), Fira Code (code)
- Icons: Font Awesome 6.4.0
- Framework: Tailwind CSS

**Screens to Enhance (12 total):**

1. **Dashboard** - GitHub-style with:
   - Stats cards (Total Projects, Test Cases, Pass Rate, Active Schedules)
   - Projects grid with status indicators
   - Recent Executions table
   - Quick Actions panel

2. **Main IDE Editor** - Split view with:
   - Left sidebar: File explorer (Pages, Scenarios, Data folders)
   - Center: Monaco code editor for Vero Script
   - Bottom: Execution panel with logs
   - NO Visual Flow panel (removed)

3. **Data Tables** - AG Grid style with:
   - Left sidebar: Tables list (Users, Products, Addresses)
   - Center: Data grid with inline editing
   - Right panel: Column properties + VDQL query preview

4. **Execution Dashboard** - Results view with:
   - Execution header (status, duration, environment)
   - Test results list with pass/fail indicators
   - Timeline view of execution steps
   - Artifact buttons (Report, Trace, Screenshots)

5. **Recording Mode** - Browser recording with:
   - Browser viewport (80% width)
   - Side panel (20%): Live action stream
   - Floating controls: Start/Stop/Pause
   - Real-time Vero script generation

6. **Schedule Config** - Jenkins-like with:
   - Cron expression builder
   - Environment selector
   - Parameter definitions (string, number, choice, boolean)
   - Notification settings

7. **Trace Viewer** - Playwright integration with:
   - Action timeline (left)
   - Screenshot/video (center)
   - Network/Console tabs (bottom)
   - Failure details panel

8. **AI Copilot** - Chat-based with:
   - Split view: Editor (left) + Chat (right)
   - Message bubbles with code blocks
   - Staged changes panel (embedded, not floating)
   - Approve/Reject buttons per change
   - Exploration mode with live screenshots

**Enhancement Goals:**
1. More modern, 2024+ aesthetic
2. Better visual hierarchy
3. Subtle gradients and glassmorphism where appropriate
4. Improved micro-interactions hints
5. Better use of whitespace
6. More refined shadows and borders
7. Keep the dark theme, but add depth
8. Professional, enterprise-ready look

**Constraints:**
- Must remain functional and accessible
- Keep familiar IDE conventions
- Don't add unnecessary visual noise
- Maintain fast scan-ability for QA testers
- Must work with Tailwind CSS

Please provide:
1. Color palette refinements
2. Component styling improvements
3. Layout adjustments for each screen
4. Modern UI patterns to incorporate
5. Tailwind CSS class suggestions
```

---

## How to Use

1. Go to [Gemini](https://gemini.google.com) or Google AI Studio
2. Upload the HTML files or screenshots from:
   - `/Users/mikeroy/Downloads/uxpilot-export-1767932330373/`
   - `/Users/mikeroy/Downloads/uxpilot-export-1767932484353/`
3. Paste the prompt above
4. Ask Gemini to suggest specific improvements

---

## Key Design Decisions Already Made

### Remove from Main IDE:
- Visual Flow panel (right side)
- React Flow visualization
- Step connector lines

### Keep Current Functionality:
- File explorer with Pages/Scenarios/Data
- Monaco editor for Vero Script
- Execution panel with logs
- All action buttons (Run, Record, Save)

### Add AI Copilot UI:
Based on current design patterns, AI Copilot should have:
- Same dark theme (#1e1e1e or #0d1117)
- Split view matching IDE layout
- Chat panel with same border/shadow style
- Staged changes using same card components
- Consistent button styling

---

## Design System Quick Reference

```css
/* Colors */
--bg-primary: #0d1117;
--bg-secondary: #161b22;
--bg-tertiary: #1e1e1e;
--border: #30363d;
--text-primary: #e6edf3;
--text-secondary: #8b949e;
--accent-blue: #58a6ff;
--accent-green: #3fb950;
--accent-red: #f85149;
--accent-yellow: #d29922;

/* Spacing (Tailwind) */
gap-2 (8px), gap-4 (16px), gap-6 (24px)
p-4 (16px), p-6 (24px), p-8 (32px)

/* Border Radius */
rounded-md (6px), rounded-lg (8px), rounded-xl (12px)

/* Shadows */
shadow-sm, shadow-md, shadow-lg

/* Typography */
text-sm (14px), text-base (16px), text-lg (18px)
font-medium (500), font-semibold (600)
```
