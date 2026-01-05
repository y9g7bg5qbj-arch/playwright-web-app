/**
 * Vero Test Recorder - Popup Script
 * Handles popup UI interactions and communication with content scripts
 */

class VeroPopup {
  constructor() {
    this.isRecording = false;
    this.isPaused = false;
    this.actions = [];
    this.currentTabId = null;

    this.initElements();
    this.initEventListeners();
    this.loadState();
    this.checkConnection();
  }

  /**
   * Initialize DOM element references
   */
  initElements() {
    // Buttons
    this.recordBtn = document.getElementById('recordBtn');
    this.pauseBtn = document.getElementById('pauseBtn');
    this.stopBtn = document.getElementById('stopBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.pickElementBtn = document.getElementById('pickElementBtn');
    this.addAssertionBtn = document.getElementById('addAssertionBtn');
    this.copyCodeBtn = document.getElementById('copyCodeBtn');
    this.downloadCodeBtn = document.getElementById('downloadCodeBtn');
    this.sendToIDEBtn = document.getElementById('sendToIDEBtn');
    this.settingsLink = document.getElementById('settingsLink');

    // Sections
    this.recordingControls = document.getElementById('recordingControls');
    this.recordingStatus = document.getElementById('recordingStatus');
    this.codeSection = document.getElementById('codeSection');

    // Status elements
    this.connectionStatus = document.getElementById('connectionStatus');
    this.statusText = document.getElementById('statusText');
    this.actionCount = document.getElementById('actionCount');
    this.actionsList = document.getElementById('actionsList');
    this.codePreview = document.getElementById('codePreview');

    // Modals
    this.assertionModal = document.getElementById('assertionModal');
    this.settingsModal = document.getElementById('settingsModal');
  }

  /**
   * Initialize event listeners
   */
  initEventListeners() {
    // Recording controls
    this.recordBtn.addEventListener('click', () => this.toggleRecording());
    this.pauseBtn.addEventListener('click', () => this.togglePause());
    this.stopBtn.addEventListener('click', () => this.stopRecording());
    this.clearBtn.addEventListener('click', () => this.clearActions());

    // Tools
    this.pickElementBtn.addEventListener('click', () => this.startElementPicker());
    this.addAssertionBtn.addEventListener('click', () => this.showAssertionModal());

    // Code actions
    this.copyCodeBtn.addEventListener('click', () => this.copyCode());
    this.downloadCodeBtn.addEventListener('click', () => this.downloadCode());
    this.sendToIDEBtn.addEventListener('click', () => this.sendToIDE());

    // Settings
    this.settingsLink.addEventListener('click', (e) => {
      e.preventDefault();
      this.showSettingsModal();
    });

    // Assertion modal
    document.getElementById('closeModalBtn').addEventListener('click', () => this.hideAssertionModal());
    document.getElementById('cancelAssertionBtn').addEventListener('click', () => this.hideAssertionModal());
    document.getElementById('confirmAssertionBtn').addEventListener('click', () => this.confirmAssertion());
    document.getElementById('pickForAssertionBtn').addEventListener('click', () => this.pickForAssertion());
    document.getElementById('assertionType').addEventListener('change', () => this.onAssertionTypeChange());

    // Settings modal
    document.getElementById('closeSettingsBtn').addEventListener('click', () => this.hideSettingsModal());
    document.getElementById('saveSettingsBtn').addEventListener('click', () => this.saveSettings());

    // Listen for messages from background/content scripts
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender);
    });
  }

  /**
   * Load current state from background script
   */
  async loadState() {
    try {
      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      this.currentTabId = tab?.id;

      if (!this.currentTabId) {
        this.showError('No active tab found');
        return;
      }

      // Get recording state from content script
      chrome.tabs.sendMessage(this.currentTabId, { type: 'GET_STATUS' }, (response) => {
        if (chrome.runtime.lastError) {
          console.log('Content script not loaded:', chrome.runtime.lastError.message);
          return;
        }

        if (response?.success) {
          this.isRecording = response.recording;
          this.isPaused = response.paused;
          this.updateUI();

          if (response.recording) {
            this.loadActions();
          }
        }
      });
    } catch (error) {
      console.error('Error loading state:', error);
    }
  }

  /**
   * Check IDE connection
   */
  async checkConnection() {
    try {
      const settings = await this.getSettings();
      const apiUrl = settings.apiUrl || 'http://localhost:3000/api';
      const healthUrl = apiUrl.replace('/api', '') + '/health';

      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();

      if (data.success) {
        this.setConnectionStatus(true);
        this.sendToIDEBtn.disabled = false;
      } else {
        this.setConnectionStatus(false);
      }
    } catch (error) {
      this.setConnectionStatus(false);
    }
  }

  /**
   * Set connection status UI
   */
  setConnectionStatus(connected) {
    const statusDot = this.connectionStatus.querySelector('.status-dot');
    const statusText = this.connectionStatus.querySelector('.status-text');

    if (connected) {
      statusDot.classList.add('connected');
      statusText.textContent = 'Connected';
    } else {
      statusDot.classList.remove('connected');
      statusText.textContent = 'Disconnected';
      this.sendToIDEBtn.disabled = true;
    }
  }

  /**
   * Toggle recording state
   */
  toggleRecording() {
    if (this.isRecording) {
      this.stopRecording();
    } else {
      this.startRecording();
    }
  }

  /**
   * Start recording
   */
  startRecording() {
    this.sendToContentScript('START_RECORDING', {}, (response) => {
      if (response?.success) {
        this.isRecording = true;
        this.isPaused = false;
        this.actions = [];
        this.updateUI();
      }
    });
  }

  /**
   * Stop recording
   */
  stopRecording() {
    this.sendToContentScript('STOP_RECORDING', {}, (response) => {
      if (response?.success) {
        this.isRecording = false;
        this.isPaused = false;
        this.actions = response.actions || [];
        this.updateUI();
        this.showCodePreview(response.code);
      }
    });
  }

  /**
   * Toggle pause state
   */
  togglePause() {
    if (this.isPaused) {
      this.resumeRecording();
    } else {
      this.pauseRecording();
    }
  }

  /**
   * Pause recording
   */
  pauseRecording() {
    this.sendToContentScript('PAUSE_RECORDING', {}, (response) => {
      if (response?.success) {
        this.isPaused = true;
        this.updateUI();
      }
    });
  }

  /**
   * Resume recording
   */
  resumeRecording() {
    this.sendToContentScript('RESUME_RECORDING', {}, (response) => {
      if (response?.success) {
        this.isPaused = false;
        this.updateUI();
      }
    });
  }

  /**
   * Load current actions
   */
  loadActions() {
    this.sendToContentScript('GET_ACTIONS', {}, (response) => {
      if (response?.success) {
        this.actions = response.actions || [];
        this.renderActions();
      }
    });
  }

  /**
   * Clear all recorded actions
   */
  clearActions() {
    if (confirm('Are you sure you want to clear all recorded actions?')) {
      this.sendToContentScript('CLEAR_ACTIONS', {}, (response) => {
        if (response?.success) {
          this.actions = [];
          this.renderActions();
          this.hideCodePreview();
        }
      });
    }
  }

  /**
   * Start element picker
   */
  startElementPicker() {
    // Close popup and start picker
    this.sendToContentScript('START_ELEMENT_PICKER', {});
    window.close();
  }

  /**
   * Update UI based on current state
   */
  updateUI() {
    // Update record button
    if (this.isRecording) {
      this.recordBtn.innerHTML = `
        <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="8"></circle>
        </svg>
        <span>Recording...</span>
      `;
      this.recordBtn.classList.remove('btn-primary');
      this.recordBtn.classList.add('btn-danger');
      this.recordingControls.style.display = 'flex';
      this.recordingStatus.style.display = 'flex';
    } else {
      this.recordBtn.innerHTML = `
        <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="8"></circle>
        </svg>
        <span>Start Recording</span>
      `;
      this.recordBtn.classList.add('btn-primary');
      this.recordBtn.classList.remove('btn-danger');
      this.recordingControls.style.display = 'none';
      this.recordingStatus.style.display = 'none';
    }

    // Update pause button
    if (this.isPaused) {
      this.pauseBtn.innerHTML = `
        <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
        <span>Resume</span>
      `;
      this.statusText.textContent = 'Paused';
      this.recordingStatus.classList.add('paused');
    } else {
      this.pauseBtn.innerHTML = `
        <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="4" width="4" height="16"></rect>
          <rect x="14" y="4" width="4" height="16"></rect>
        </svg>
        <span>Pause</span>
      `;
      this.statusText.textContent = 'Recording...';
      this.recordingStatus.classList.remove('paused');
    }

    // Update action count
    this.actionCount.textContent = this.actions.length;

    // Render actions list
    this.renderActions();
  }

  /**
   * Render actions list
   */
  renderActions() {
    if (this.actions.length === 0) {
      this.actionsList.innerHTML = `
        <div class="empty-state">
          <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"></path>
          </svg>
          <p>No actions recorded yet</p>
          <p class="hint">Click "Start Recording" to begin</p>
        </div>
      `;
      return;
    }

    this.actionsList.innerHTML = this.actions.map(action => this.renderActionItem(action)).join('');
  }

  /**
   * Render a single action item
   */
  renderActionItem(action) {
    const iconClass = this.getActionIconClass(action.type);
    const icon = this.getActionIcon(action.type);
    const description = this.getActionDescription(action);

    return `
      <div class="action-item" data-id="${action.id}">
        <div class="action-icon ${iconClass}">${icon}</div>
        <div class="action-details">
          <div class="action-type">${this.formatActionType(action.type)}</div>
          <div class="action-target">${description}</div>
        </div>
      </div>
    `;
  }

  /**
   * Get action icon class
   */
  getActionIconClass(type) {
    const classes = {
      'click': 'click',
      'fill': 'fill',
      'select': 'select',
      'navigation': 'navigation',
      'assertion': 'assertion',
      'check': 'click',
      'uncheck': 'click',
      'hover': 'click',
      'scroll': 'default',
      'press': 'fill',
      'wait': 'default',
      'screenshot': 'default'
    };
    return classes[type] || 'default';
  }

  /**
   * Get action icon
   */
  getActionIcon(type) {
    const icons = {
      'click': '\\u{1F5B1}',
      'fill': '\\u{2328}',
      'select': '\\u{25BC}',
      'navigation': '\\u{1F310}',
      'assertion': '\\u{2714}',
      'check': '\\u{2611}',
      'uncheck': '\\u{2610}',
      'hover': '\\u{1F447}',
      'scroll': '\\u{2195}',
      'press': '\\u{2328}',
      'wait': '\\u{23F3}',
      'screenshot': '\\u{1F4F7}'
    };
    return icons[type] || '\\u{2022}';
  }

  /**
   * Format action type for display
   */
  formatActionType(type) {
    const labels = {
      'click': 'Click',
      'fill': 'Fill',
      'select': 'Select',
      'navigation': 'Navigate',
      'assertion': 'Assert',
      'check': 'Check',
      'uncheck': 'Uncheck',
      'hover': 'Hover',
      'scroll': 'Scroll',
      'press': 'Press Key',
      'wait': 'Wait',
      'screenshot': 'Screenshot'
    };
    return labels[type] || type;
  }

  /**
   * Get action description
   */
  getActionDescription(action) {
    switch (action.type) {
      case 'navigation':
        return action.value || 'Unknown URL';
      case 'fill':
        return `${action.fieldName || action.selector || 'element'} = "${action.value || ''}"`;
      case 'select':
        return `${action.fieldName || action.selector || 'element'} = "${action.value || ''}"`;
      case 'click':
      case 'check':
      case 'uncheck':
      case 'hover':
        return action.fieldName || action.selector || 'element';
      case 'press':
        return action.value || action.key || 'key';
      case 'assertion':
        return `${action.assertionType}: ${action.value || action.selector || ''}`;
      default:
        return action.selector || action.value || '';
    }
  }

  /**
   * Show code preview
   */
  showCodePreview(code) {
    if (!code) return;

    this.codeSection.style.display = 'block';
    const codeElement = this.codePreview.querySelector('code');
    codeElement.textContent = code;
  }

  /**
   * Hide code preview
   */
  hideCodePreview() {
    this.codeSection.style.display = 'none';
  }

  /**
   * Copy code to clipboard
   */
  async copyCode() {
    const code = this.codePreview.querySelector('code').textContent;
    if (!code) return;

    try {
      await navigator.clipboard.writeText(code);
      this.showToast('Code copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy:', error);
      this.showToast('Failed to copy code', 'error');
    }
  }

  /**
   * Download code as file
   */
  downloadCode() {
    const code = this.codePreview.querySelector('code').textContent;
    if (!code) return;

    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'recorded-test.vero';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Send code to IDE
   */
  async sendToIDE() {
    const code = this.codePreview.querySelector('code').textContent;
    if (!code) {
      this.showToast('No code to send', 'error');
      return;
    }

    try {
      const settings = await this.getSettings();
      const apiUrl = settings.apiUrl || 'http://localhost:3000/api';

      const response = await fetch(`${apiUrl}/recorder/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          actions: this.actions,
          timestamp: Date.now()
        })
      });

      const data = await response.json();

      if (data.success) {
        this.showToast('Code sent to IDE successfully!');
      } else {
        throw new Error(data.error || 'Failed to send code');
      }
    } catch (error) {
      console.error('Failed to send to IDE:', error);
      this.showToast('Failed to send to IDE', 'error');
    }
  }

  /**
   * Show assertion modal
   */
  showAssertionModal() {
    this.assertionModal.style.display = 'flex';
  }

  /**
   * Hide assertion modal
   */
  hideAssertionModal() {
    this.assertionModal.style.display = 'none';
    document.getElementById('assertionSelector').value = '';
    document.getElementById('assertionValue').value = '';
  }

  /**
   * Handle assertion type change
   */
  onAssertionTypeChange() {
    const type = document.getElementById('assertionType').value;
    const valueGroup = document.getElementById('assertionValueGroup');

    const typesWithValue = ['text', 'contains', 'value'];
    valueGroup.style.display = typesWithValue.includes(type) ? 'block' : 'none';
  }

  /**
   * Pick element for assertion
   */
  pickForAssertion() {
    this.hideAssertionModal();
    this.sendToContentScript('START_ELEMENT_PICKER', {});
    window.close();
  }

  /**
   * Confirm assertion
   */
  confirmAssertion() {
    const type = document.getElementById('assertionType').value;
    const selector = document.getElementById('assertionSelector').value;
    const value = document.getElementById('assertionValue').value;

    if (!selector && !['text'].includes(type)) {
      this.showToast('Please select an element', 'error');
      return;
    }

    this.sendToContentScript('ADD_ASSERTION', {
      assertion: { type, selector, value }
    }, (response) => {
      if (response?.success) {
        this.hideAssertionModal();
        this.loadActions();
        this.showToast('Assertion added!');
      }
    });
  }

  /**
   * Show settings modal
   */
  async showSettingsModal() {
    const settings = await this.getSettings();

    document.getElementById('apiUrl').value = settings.apiUrl || 'http://localhost:3000/api';
    document.getElementById('autoSync').checked = settings.autoSync || false;
    document.getElementById('generatePageObjects').checked = settings.generatePageObjects !== false;
    document.getElementById('selectorStrategy').value = settings.selectorStrategy || 'auto';

    this.settingsModal.style.display = 'flex';
  }

  /**
   * Hide settings modal
   */
  hideSettingsModal() {
    this.settingsModal.style.display = 'none';
  }

  /**
   * Save settings
   */
  async saveSettings() {
    const settings = {
      apiUrl: document.getElementById('apiUrl').value,
      autoSync: document.getElementById('autoSync').checked,
      generatePageObjects: document.getElementById('generatePageObjects').checked,
      selectorStrategy: document.getElementById('selectorStrategy').value
    };

    await new Promise((resolve) => {
      chrome.storage.sync.set({ veroSettings: settings }, resolve);
    });

    this.hideSettingsModal();
    this.showToast('Settings saved!');
    this.checkConnection();
  }

  /**
   * Get settings
   */
  async getSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['veroSettings'], (result) => {
        resolve(result.veroSettings || {});
      });
    });
  }

  /**
   * Send message to content script
   */
  sendToContentScript(type, data = {}, callback) {
    if (!this.currentTabId) {
      console.error('No current tab ID');
      return;
    }

    chrome.tabs.sendMessage(
      this.currentTabId,
      { type, ...data },
      callback || (() => {})
    );
  }

  /**
   * Handle incoming messages
   */
  handleMessage(message, sender) {
    switch (message.type) {
      case 'ACTION_RECORDED':
        this.actions.push(message.action);
        this.actionCount.textContent = this.actions.length;
        this.renderActions();
        break;

      case 'ELEMENT_PICKED':
        if (this.assertionModal.style.display !== 'none') {
          document.getElementById('assertionSelector').value = message.selector || '';
        }
        break;

      case 'RECORDING_STARTED':
        this.isRecording = true;
        this.isPaused = false;
        this.updateUI();
        break;

      case 'RECORDING_STOPPED':
        this.isRecording = false;
        this.isPaused = false;
        this.updateUI();
        break;
    }
  }

  /**
   * Show toast notification
   */
  showToast(message, type = 'success') {
    // Simple toast implementation
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      padding: 10px 20px;
      background: ${type === 'error' ? '#ef4444' : '#22c55e'};
      color: white;
      border-radius: 6px;
      font-size: 13px;
      z-index: 10000;
      animation: fadeIn 0.3s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'fadeOut 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }

  /**
   * Show error message
   */
  showError(message) {
    console.error('[Vero Popup]', message);
    this.showToast(message, 'error');
  }
}

// Add toast animations
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateX(-50%) translateY(10px); }
    to { opacity: 1; transform: translateX(-50%) translateY(0); }
  }
  @keyframes fadeOut {
    from { opacity: 1; transform: translateX(-50%) translateY(0); }
    to { opacity: 0; transform: translateX(-50%) translateY(10px); }
  }
`;
document.head.appendChild(style);

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
  new VeroPopup();
});
