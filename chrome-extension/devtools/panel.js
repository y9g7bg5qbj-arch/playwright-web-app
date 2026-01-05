/**
 * Vero Test Recorder - DevTools Panel
 * Advanced recording features and element inspection
 */

class VeroPanel {
  constructor() {
    this.isRecording = false;
    this.isPaused = false;
    this.actions = [];
    this.selectedAction = null;
    this.selectedElement = null;
    this.activeTab = 'vero';
    this.connection = null;

    this.init();
  }

  /**
   * Initialize the panel
   */
  init() {
    this.bindElements();
    this.bindEvents();
    this.setupConnection();
    this.checkIDEConnection();
    this.loadState();
  }

  /**
   * Bind DOM elements
   */
  bindElements() {
    // Toolbar buttons
    this.recordBtn = document.getElementById('recordBtn');
    this.pauseBtn = document.getElementById('pauseBtn');
    this.stopBtn = document.getElementById('stopBtn');
    this.pickBtn = document.getElementById('pickBtn');
    this.assertBtn = document.getElementById('assertBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.refreshBtn = document.getElementById('refreshBtn');

    // Indicators
    this.recordingIndicator = document.getElementById('recordingIndicator');

    // Panels
    this.elementInfo = document.getElementById('elementInfo');
    this.actionsList = document.getElementById('actionsList');
    this.actionCount = document.getElementById('actionCount');
    this.codePreview = document.getElementById('codePreview');

    // Status
    this.statusMessage = document.getElementById('statusMessage');
    this.connectionStatus = document.getElementById('connectionStatus');

    // Code tabs
    this.codeTabs = document.querySelectorAll('.code-tab');
  }

  /**
   * Bind event listeners
   */
  bindEvents() {
    // Recording controls
    this.recordBtn.addEventListener('click', () => this.toggleRecording());
    this.pauseBtn.addEventListener('click', () => this.togglePause());
    this.stopBtn.addEventListener('click', () => this.stopRecording());
    this.clearBtn.addEventListener('click', () => this.clearActions());

    // Element tools
    this.pickBtn.addEventListener('click', () => this.startElementPicker());
    this.assertBtn.addEventListener('click', () => this.addAssertion());
    this.refreshBtn.addEventListener('click', () => this.refreshElementInfo());

    // Code tabs
    this.codeTabs.forEach(tab => {
      tab.addEventListener('click', () => this.switchCodeTab(tab.dataset.tab));
    });
  }

  /**
   * Setup connection with content script
   */
  setupConnection() {
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender);
      sendResponse({ success: true });
      return true;
    });
  }

  /**
   * Handle incoming messages
   */
  handleMessage(message, sender) {
    console.log('[Vero Panel] Message received:', message.type);

    switch (message.type) {
      case 'RECORDING_STATE':
        this.updateRecordingState(message);
        break;

      case 'ACTION_RECORDED':
        this.addAction(message.action);
        break;

      case 'ELEMENT_PICKED':
        this.updateElementInfo(message.elementInfo);
        break;

      case 'ACTIONS_SYNC':
        this.syncActions(message.actions);
        break;
    }
  }

  /**
   * Check IDE connection status
   */
  async checkIDEConnection() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'CHECK_CONNECTION' });
      this.updateConnectionStatus(response.connected);
    } catch (error) {
      this.updateConnectionStatus(false);
    }
  }

  /**
   * Update connection status display
   */
  updateConnectionStatus(connected) {
    if (connected) {
      this.connectionStatus.textContent = 'IDE: Connected';
      this.connectionStatus.style.color = '#22c55e';
    } else {
      this.connectionStatus.textContent = 'IDE: Disconnected';
      this.connectionStatus.style.color = '#ef4444';
    }
  }

  /**
   * Load state from background
   */
  async loadState() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_RECORDING_STATE' });
      if (response.success) {
        this.isRecording = response.isRecording;
        this.isPaused = response.isPaused;
        this.actions = response.actions || [];
        this.updateUI();
        this.renderActions();
        this.updateCodePreview();
      }
    } catch (error) {
      console.error('[Vero Panel] Failed to load state:', error);
    }
  }

  /**
   * Toggle recording
   */
  async toggleRecording() {
    if (this.isRecording) {
      await this.stopRecording();
    } else {
      await this.startRecording();
    }
  }

  /**
   * Start recording
   */
  async startRecording() {
    try {
      await this.sendToActiveTab({ type: 'START_RECORDING' });
      this.isRecording = true;
      this.isPaused = false;
      this.updateUI();
      this.setStatus('Recording started');
    } catch (error) {
      console.error('[Vero Panel] Failed to start recording:', error);
      this.setStatus('Failed to start recording', true);
    }
  }

  /**
   * Stop recording
   */
  async stopRecording() {
    try {
      const response = await this.sendToActiveTab({ type: 'STOP_RECORDING' });
      if (response && response.actions) {
        this.actions = response.actions;
        this.renderActions();
        this.updateCodePreview();
      }
      this.isRecording = false;
      this.isPaused = false;
      this.updateUI();
      this.setStatus('Recording stopped');
    } catch (error) {
      console.error('[Vero Panel] Failed to stop recording:', error);
    }
  }

  /**
   * Toggle pause
   */
  async togglePause() {
    if (this.isPaused) {
      await this.sendToActiveTab({ type: 'RESUME_RECORDING' });
      this.isPaused = false;
      this.setStatus('Recording resumed');
    } else {
      await this.sendToActiveTab({ type: 'PAUSE_RECORDING' });
      this.isPaused = true;
      this.setStatus('Recording paused');
    }
    this.updateUI();
  }

  /**
   * Clear all actions
   */
  clearActions() {
    this.actions = [];
    this.selectedAction = null;
    this.renderActions();
    this.updateCodePreview();
    this.setStatus('Actions cleared');
  }

  /**
   * Start element picker mode
   */
  async startElementPicker() {
    try {
      await this.sendToActiveTab({ type: 'START_ELEMENT_PICKER' });
      this.pickBtn.classList.add('btn-primary');
      this.setStatus('Click an element to inspect');
    } catch (error) {
      console.error('[Vero Panel] Failed to start element picker:', error);
    }
  }

  /**
   * Add assertion for current element
   */
  async addAssertion() {
    if (!this.selectedElement) {
      this.setStatus('Select an element first', true);
      return;
    }

    // Show assertion options modal (simplified for panel)
    const assertionType = await this.showAssertionPrompt();
    if (!assertionType) return;

    const action = {
      id: Date.now().toString(),
      type: 'assertion',
      assertionType,
      selector: this.selectedElement.selectors?.primary || '',
      value: this.selectedElement.textContent || '',
      timestamp: Date.now()
    };

    this.addAction(action);
    this.setStatus('Assertion added');
  }

  /**
   * Show assertion type prompt
   */
  showAssertionPrompt() {
    return new Promise((resolve) => {
      const types = ['visible', 'hidden', 'containsText', 'hasValue', 'enabled', 'disabled'];
      const type = prompt(`Select assertion type:\n${types.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n\nEnter number:`);

      if (type && types[parseInt(type) - 1]) {
        resolve(types[parseInt(type) - 1]);
      } else {
        resolve(null);
      }
    });
  }

  /**
   * Refresh element info from Elements panel selection
   */
  refreshElementInfo() {
    chrome.devtools.inspectedWindow.eval(
      `(function() {
        const el = $0;
        if (!el) return null;

        return {
          tagName: el.tagName,
          id: el.id,
          classes: Array.from(el.classList),
          textContent: el.textContent?.substring(0, 100),
          attributes: {
            'data-testid': el.getAttribute('data-testid'),
            'aria-label': el.getAttribute('aria-label'),
            'name': el.getAttribute('name'),
            'placeholder': el.getAttribute('placeholder'),
            'type': el.getAttribute('type'),
            'role': el.getAttribute('role')
          },
          rect: el.getBoundingClientRect()
        };
      })()`,
      (result, error) => {
        if (error) {
          this.setStatus('Failed to get element info', true);
          return;
        }
        if (result) {
          this.updateElementInfo(result);
        }
      }
    );
  }

  /**
   * Update element info panel
   */
  updateElementInfo(info) {
    if (!info) {
      this.elementInfo.innerHTML = this.getEmptyElementState();
      return;
    }

    this.selectedElement = info;
    this.pickBtn.classList.remove('btn-primary');

    // Generate selectors
    const selectors = this.generateSelectors(info);

    this.elementInfo.innerHTML = `
      <div class="info-row">
        <div class="info-label">Element</div>
        <div class="info-value">&lt;${info.tagName.toLowerCase()}${info.id ? ` id="${info.id}"` : ''}${info.classes.length ? ` class="${info.classes.join(' ')}"` : ''}&gt;</div>
      </div>

      ${info.textContent ? `
        <div class="info-row">
          <div class="info-label">Text Content</div>
          <div class="info-value">${this.escapeHtml(info.textContent.trim())}</div>
        </div>
      ` : ''}

      <div class="info-row">
        <div class="info-label">Selectors</div>
        <div class="selector-list">
          ${selectors.map(s => `
            <div class="selector-item" data-selector="${this.escapeHtml(s.value)}">
              <span class="selector-type">${s.type}</span>
              <span class="selector-value" title="${this.escapeHtml(s.value)}">${this.escapeHtml(s.value)}</span>
              <span class="selector-confidence ${s.confidence < 70 ? 'low' : s.confidence < 90 ? 'medium' : ''}">${s.confidence}%</span>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="info-row">
        <div class="info-label">Actions</div>
        <div class="toolbar-group" style="padding-top: 4px;">
          <button class="btn" onclick="veroPanel.copySelector('${this.escapeHtml(selectors[0]?.value || '')}')">Copy Selector</button>
          <button class="btn" onclick="veroPanel.recordClick()">Record Click</button>
        </div>
      </div>
    `;

    // Bind selector click handlers
    this.elementInfo.querySelectorAll('.selector-item').forEach(item => {
      item.addEventListener('click', () => {
        this.copySelector(item.dataset.selector);
      });
    });
  }

  /**
   * Generate selectors from element info
   */
  generateSelectors(info) {
    const selectors = [];

    // Test ID - highest confidence
    if (info.attributes['data-testid']) {
      selectors.push({
        type: 'testId',
        value: `[data-testid="${info.attributes['data-testid']}"]`,
        confidence: 100
      });
    }

    // ID selector
    if (info.id) {
      selectors.push({
        type: 'id',
        value: `#${info.id}`,
        confidence: 95
      });
    }

    // Aria label
    if (info.attributes['aria-label']) {
      selectors.push({
        type: 'label',
        value: `[aria-label="${info.attributes['aria-label']}"]`,
        confidence: 90
      });
    }

    // Role + name
    if (info.attributes.role && info.attributes.name) {
      selectors.push({
        type: 'role',
        value: `[role="${info.attributes.role}"][name="${info.attributes.name}"]`,
        confidence: 85
      });
    }

    // Placeholder for inputs
    if (info.attributes.placeholder) {
      selectors.push({
        type: 'placeholder',
        value: `[placeholder="${info.attributes.placeholder}"]`,
        confidence: 80
      });
    }

    // Class-based selector
    if (info.classes.length > 0) {
      const uniqueClasses = info.classes.filter(c => !c.match(/^(css|sc|styled)-/));
      if (uniqueClasses.length > 0) {
        selectors.push({
          type: 'class',
          value: `.${uniqueClasses.slice(0, 2).join('.')}`,
          confidence: 60
        });
      }
    }

    // Tag + type for inputs
    if (info.tagName === 'INPUT' && info.attributes.type) {
      selectors.push({
        type: 'css',
        value: `input[type="${info.attributes.type}"]`,
        confidence: 40
      });
    }

    return selectors.length > 0 ? selectors : [{ type: 'tag', value: info.tagName.toLowerCase(), confidence: 20 }];
  }

  /**
   * Copy selector to clipboard
   */
  copySelector(selector) {
    navigator.clipboard.writeText(selector).then(() => {
      this.setStatus('Selector copied to clipboard');
    }).catch(() => {
      this.setStatus('Failed to copy selector', true);
    });
  }

  /**
   * Record click for selected element
   */
  recordClick() {
    if (!this.selectedElement) return;

    const selectors = this.generateSelectors(this.selectedElement);
    const action = {
      id: Date.now().toString(),
      type: 'click',
      selector: selectors[0]?.value || '',
      tagName: this.selectedElement.tagName,
      timestamp: Date.now()
    };

    this.addAction(action);
    this.setStatus('Click action recorded');
  }

  /**
   * Add action to list
   */
  addAction(action) {
    this.actions.push(action);
    this.renderActions();
    this.updateCodePreview();
    this.updateActionCount();
  }

  /**
   * Sync actions from content script
   */
  syncActions(actions) {
    this.actions = actions;
    this.renderActions();
    this.updateCodePreview();
  }

  /**
   * Render actions list
   */
  renderActions() {
    if (this.actions.length === 0) {
      this.actionsList.innerHTML = this.getEmptyActionsState();
      return;
    }

    this.actionsList.innerHTML = this.actions.map((action, index) => `
      <div class="action-item ${this.selectedAction === index ? 'selected' : ''}" data-index="${index}">
        <span class="action-number">${index + 1}</span>
        <div class="action-content">
          <div class="action-type">${this.formatActionType(action)}</div>
          <div class="action-target">${this.formatActionTarget(action)}</div>
        </div>
      </div>
    `).join('');

    // Bind click handlers
    this.actionsList.querySelectorAll('.action-item').forEach(item => {
      item.addEventListener('click', () => {
        this.selectAction(parseInt(item.dataset.index));
      });
    });

    this.updateActionCount();
  }

  /**
   * Format action type for display
   */
  formatActionType(action) {
    const typeMap = {
      'click': 'Click',
      'dblclick': 'Double Click',
      'input': 'Type',
      'change': 'Change',
      'select': 'Select',
      'check': 'Check',
      'uncheck': 'Uncheck',
      'scroll': 'Scroll',
      'hover': 'Hover',
      'navigation': 'Navigate',
      'keydown': 'Key Press',
      'assertion': 'Assert',
      'screenshot': 'Screenshot'
    };
    return typeMap[action.type] || action.type;
  }

  /**
   * Format action target for display
   */
  formatActionTarget(action) {
    if (action.type === 'navigation') {
      return action.url || '';
    }
    if (action.type === 'input' && action.value) {
      return `"${action.value.substring(0, 30)}${action.value.length > 30 ? '...' : ''}"`;
    }
    if (action.type === 'assertion') {
      return `${action.assertionType}: ${action.selector}`;
    }
    return action.selector || action.tagName || '';
  }

  /**
   * Select an action
   */
  selectAction(index) {
    this.selectedAction = index;
    this.renderActions();

    // Highlight element in page
    const action = this.actions[index];
    if (action && action.selector) {
      this.highlightElement(action.selector);
    }
  }

  /**
   * Highlight element in inspected page
   */
  highlightElement(selector) {
    chrome.devtools.inspectedWindow.eval(
      `(function() {
        const el = document.querySelector('${selector.replace(/'/g, "\\'")}');
        if (el) {
          el.style.outline = '2px solid #4f46e5';
          el.style.outlineOffset = '2px';
          setTimeout(() => {
            el.style.outline = '';
            el.style.outlineOffset = '';
          }, 2000);
        }
      })()`
    );
  }

  /**
   * Update action count display
   */
  updateActionCount() {
    const count = this.actions.length;
    this.actionCount.textContent = `${count} action${count !== 1 ? 's' : ''}`;
  }

  /**
   * Switch code tab
   */
  switchCodeTab(tab) {
    this.activeTab = tab;

    this.codeTabs.forEach(t => {
      t.classList.toggle('active', t.dataset.tab === tab);
    });

    this.updateCodePreview();
  }

  /**
   * Update code preview
   */
  updateCodePreview() {
    if (this.actions.length === 0) {
      this.codePreview.textContent = '// Start recording to generate Vero code';
      return;
    }

    let code;
    if (this.activeTab === 'vero') {
      code = this.generateVeroCode();
    } else {
      code = this.generatePageObjectCode();
    }

    this.codePreview.innerHTML = this.syntaxHighlight(code);
  }

  /**
   * Generate Vero DSL code
   */
  generateVeroCode() {
    const lines = ['feature "Recorded Test"', '', '  scenario "Recorded Scenario"'];

    this.actions.forEach(action => {
      const statement = this.actionToVeroStatement(action);
      if (statement) {
        lines.push(`    ${statement}`);
      }
    });

    lines.push('  end', '', 'end');
    return lines.join('\n');
  }

  /**
   * Convert action to Vero statement
   */
  actionToVeroStatement(action) {
    switch (action.type) {
      case 'navigation':
        return `open "${action.url}"`;
      case 'click':
        return `click "${action.selector}"`;
      case 'dblclick':
        return `doubleClick "${action.selector}"`;
      case 'input':
        return `fill "${action.selector}" with "${action.value}"`;
      case 'select':
        return `select "${action.value}" from "${action.selector}"`;
      case 'check':
        return `check "${action.selector}"`;
      case 'uncheck':
        return `uncheck "${action.selector}"`;
      case 'hover':
        return `hover "${action.selector}"`;
      case 'scroll':
        return `scroll to "${action.selector}"`;
      case 'keydown':
        if (action.key === 'Enter') return `press Enter`;
        if (action.key === 'Tab') return `press Tab`;
        if (action.key === 'Escape') return `press Escape`;
        return null;
      case 'assertion':
        return this.assertionToStatement(action);
      case 'screenshot':
        return `screenshot "${action.name || 'screenshot'}"`;
      default:
        return null;
    }
  }

  /**
   * Convert assertion to Vero statement
   */
  assertionToStatement(action) {
    switch (action.assertionType) {
      case 'visible':
        return `verify "${action.selector}" is visible`;
      case 'hidden':
        return `verify "${action.selector}" is hidden`;
      case 'containsText':
        return `verify "${action.selector}" contains "${action.value}"`;
      case 'hasValue':
        return `verify "${action.selector}" has value "${action.value}"`;
      case 'enabled':
        return `verify "${action.selector}" is enabled`;
      case 'disabled':
        return `verify "${action.selector}" is disabled`;
      default:
        return `verify "${action.selector}" is visible`;
    }
  }

  /**
   * Generate Page Object code
   */
  generatePageObjectCode() {
    const elements = new Map();

    // Extract unique elements
    this.actions.forEach(action => {
      if (action.selector && !elements.has(action.selector)) {
        elements.set(action.selector, this.selectorToFieldName(action));
      }
    });

    const lines = [
      'page LoginPage',
      '  url "/login"',
      ''
    ];

    // Add elements
    elements.forEach((name, selector) => {
      lines.push(`  element ${name}: "${selector}"`);
    });

    lines.push('', '  action login(username, password)');
    lines.push('    // Add your action steps here');
    lines.push('  end');
    lines.push('', 'end');

    return lines.join('\n');
  }

  /**
   * Convert selector to field name
   */
  selectorToFieldName(action) {
    // Try to extract a meaningful name
    const selector = action.selector || '';

    // From data-testid
    const testIdMatch = selector.match(/data-testid="([^"]+)"/);
    if (testIdMatch) {
      return this.toCamelCase(testIdMatch[1]);
    }

    // From id
    const idMatch = selector.match(/#([a-zA-Z][a-zA-Z0-9_-]*)/);
    if (idMatch) {
      return this.toCamelCase(idMatch[1]);
    }

    // From aria-label
    const ariaMatch = selector.match(/aria-label="([^"]+)"/);
    if (ariaMatch) {
      return this.toCamelCase(ariaMatch[1]);
    }

    // Fallback to action type + tag
    return this.toCamelCase(`${action.tagName || 'element'}_${action.type}`);
  }

  /**
   * Convert string to camelCase
   */
  toCamelCase(str) {
    return str
      .toLowerCase()
      .replace(/[^a-zA-Z0-9]+(.)/g, (m, chr) => chr.toUpperCase())
      .replace(/^[A-Z]/, chr => chr.toLowerCase())
      .replace(/[^a-zA-Z0-9]/g, '');
  }

  /**
   * Apply syntax highlighting
   */
  syntaxHighlight(code) {
    return code
      .replace(/\b(feature|scenario|page|element|action|end|open|click|fill|select|check|uncheck|hover|scroll|press|verify|screenshot|with|from|is|has|contains|to)\b/g, '<span class="keyword">$1</span>')
      .replace(/"([^"]+)"/g, '<span class="string">"$1"</span>')
      .replace(/(\/\/.*$)/gm, '<span class="comment">$1</span>')
      .replace(/\b([a-zA-Z]+):/g, '<span class="field">$1:</span>');
  }

  /**
   * Update UI based on recording state
   */
  updateUI() {
    // Update button states
    this.recordBtn.disabled = false;
    this.pauseBtn.disabled = !this.isRecording;
    this.stopBtn.disabled = !this.isRecording;

    // Update button text
    if (this.isRecording) {
      this.recordBtn.innerHTML = `
        <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="8"></circle>
        </svg>
        Recording
      `;
      this.recordBtn.classList.add('btn-danger');
      this.recordBtn.classList.remove('btn-primary');
    } else {
      this.recordBtn.innerHTML = `
        <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="8"></circle>
        </svg>
        Record
      `;
      this.recordBtn.classList.remove('btn-danger');
      this.recordBtn.classList.add('btn-primary');
    }

    // Update pause button
    this.pauseBtn.textContent = this.isPaused ? 'Resume' : 'Pause';

    // Update recording indicator
    this.recordingIndicator.style.display = this.isRecording ? 'flex' : 'none';
  }

  /**
   * Set status message
   */
  setStatus(message, isError = false) {
    this.statusMessage.textContent = message;
    this.statusMessage.style.color = isError ? '#ef4444' : '';
  }

  /**
   * Send message to active tab
   */
  async sendToActiveTab(message) {
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(chrome.devtools.inspectedWindow.tabId, message, response => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    });
  }

  /**
   * Called when panel is shown
   */
  onPanelShown() {
    this.loadState();
    this.checkIDEConnection();
  }

  /**
   * Get empty element state HTML
   */
  getEmptyElementState() {
    return `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"></path>
        </svg>
        <p>No element selected</p>
        <p class="hint">Click "Pick Element" or select in Elements panel</p>
      </div>
    `;
  }

  /**
   * Get empty actions state HTML
   */
  getEmptyActionsState() {
    return `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"></path>
        </svg>
        <p>No actions recorded</p>
        <p class="hint">Click "Record" to start capturing</p>
      </div>
    `;
  }

  /**
   * Escape HTML for safe display
   */
  escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

// Initialize panel
const veroPanel = new VeroPanel();

// Expose to window for panel.html event handlers
window.veroPanel = veroPanel;
