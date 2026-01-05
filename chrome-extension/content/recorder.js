/**
 * Vero Test Recorder - Recording Engine
 * Captures user interactions and generates Vero DSL code
 */

class VeroRecorder {
  constructor() {
    this.recording = false;
    this.paused = false;
    this.actions = [];
    this.pageObjects = new Map();
    this.currentUrl = window.location.href;
    this.startTime = null;

    // Initialize dependencies
    this.selectorGenerator = new (window.VeroSelectorGenerator || SelectorGenerator)();
    this.highlighter = new (window.VeroElementHighlighter || ElementHighlighter)();
    this.veroGenerator = window.VeroCodeGenerator ? new window.VeroCodeGenerator() : null;

    // Event handler bindings
    this.boundHandleClick = this.handleClick.bind(this);
    this.boundHandleInput = this.handleInput.bind(this);
    this.boundHandleChange = this.handleChange.bind(this);
    this.boundHandleSubmit = this.handleSubmit.bind(this);
    this.boundHandleKeyboard = this.handleKeyboard.bind(this);
    this.boundHandleScroll = this.handleScroll.bind(this);
    this.boundHandleHover = this.handleHover.bind(this);
    this.boundHandleBeforeUnload = this.handleBeforeUnload.bind(this);

    // Debounce timers
    this.inputDebounceTimer = null;
    this.scrollDebounceTimer = null;
    this.lastInputElement = null;
    this.lastInputValue = '';

    // Initialize message listener for popup communication
    this.initMessageListener();
  }

  /**
   * Initialize message listener for popup/background communication
   */
  initMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.type) {
        case 'START_RECORDING':
          this.start();
          sendResponse({ success: true, status: 'started' });
          break;

        case 'STOP_RECORDING':
          const result = this.stop();
          sendResponse({ success: true, ...result });
          break;

        case 'PAUSE_RECORDING':
          this.pause();
          sendResponse({ success: true, status: 'paused' });
          break;

        case 'RESUME_RECORDING':
          this.resume();
          sendResponse({ success: true, status: 'recording' });
          break;

        case 'GET_STATUS':
          sendResponse({
            success: true,
            recording: this.recording,
            paused: this.paused,
            actionCount: this.actions.length
          });
          break;

        case 'GET_ACTIONS':
          sendResponse({
            success: true,
            actions: this.actions,
            pageObjects: Array.from(this.pageObjects.entries())
          });
          break;

        case 'GENERATE_CODE':
          const code = this.toVeroCode();
          sendResponse({ success: true, code });
          break;

        case 'START_ELEMENT_PICKER':
          this.startElementPicker((result) => {
            chrome.runtime.sendMessage({
              type: 'ELEMENT_PICKED',
              ...result
            });
          });
          sendResponse({ success: true });
          break;

        case 'ADD_ASSERTION':
          this.addAssertion(message.assertion);
          sendResponse({ success: true });
          break;

        case 'CLEAR_ACTIONS':
          this.actions = [];
          this.pageObjects.clear();
          sendResponse({ success: true });
          break;

        default:
          sendResponse({ success: false, error: 'Unknown message type' });
      }

      return true; // Keep the message channel open for async response
    });
  }

  /**
   * Start recording user interactions
   */
  start() {
    if (this.recording) return;

    this.recording = true;
    this.paused = false;
    this.startTime = Date.now();
    this.actions = [];
    this.currentUrl = window.location.href;

    // Record initial navigation
    this.recordAction('navigation', null, this.currentUrl);

    // Attach event listeners
    document.addEventListener('click', this.boundHandleClick, true);
    document.addEventListener('input', this.boundHandleInput, true);
    document.addEventListener('change', this.boundHandleChange, true);
    document.addEventListener('submit', this.boundHandleSubmit, true);
    document.addEventListener('keydown', this.boundHandleKeyboard, true);
    document.addEventListener('scroll', this.boundHandleScroll, { passive: true, capture: true });
    window.addEventListener('beforeunload', this.boundHandleBeforeUnload);

    // Monitor URL changes for SPAs
    this.urlObserver = setInterval(() => {
      if (window.location.href !== this.currentUrl) {
        this.handleNavigation(window.location.href);
        this.currentUrl = window.location.href;
      }
    }, 500);

    // Notify background script
    chrome.runtime.sendMessage({
      type: 'RECORDING_STARTED',
      url: this.currentUrl,
      timestamp: this.startTime
    });

    console.log('[Vero Recorder] Recording started');
  }

  /**
   * Stop recording and return results
   */
  stop() {
    if (!this.recording) {
      return { actions: [], code: '' };
    }

    this.recording = false;
    this.paused = false;

    // Flush any pending input
    this.flushPendingInput();

    // Remove event listeners
    document.removeEventListener('click', this.boundHandleClick, true);
    document.removeEventListener('input', this.boundHandleInput, true);
    document.removeEventListener('change', this.boundHandleChange, true);
    document.removeEventListener('submit', this.boundHandleSubmit, true);
    document.removeEventListener('keydown', this.boundHandleKeyboard, true);
    document.removeEventListener('scroll', this.boundHandleScroll, true);
    window.removeEventListener('beforeunload', this.boundHandleBeforeUnload);

    if (this.urlObserver) {
      clearInterval(this.urlObserver);
      this.urlObserver = null;
    }

    // Generate code
    const code = this.toVeroCode();
    const pageObjectCode = this.toPageObject();

    // Notify background script
    chrome.runtime.sendMessage({
      type: 'RECORDING_STOPPED',
      actionCount: this.actions.length,
      duration: Date.now() - this.startTime
    });

    console.log('[Vero Recorder] Recording stopped');

    return {
      actions: this.actions,
      code,
      pageObjectCode,
      pageObjects: Array.from(this.pageObjects.entries())
    };
  }

  /**
   * Pause recording
   */
  pause() {
    if (!this.recording || this.paused) return;
    this.paused = true;
    this.flushPendingInput();
    console.log('[Vero Recorder] Recording paused');
  }

  /**
   * Resume recording
   */
  resume() {
    if (!this.recording || !this.paused) return;
    this.paused = false;
    console.log('[Vero Recorder] Recording resumed');
  }

  /**
   * Handle click events
   */
  handleClick(event) {
    if (!this.recording || this.paused) return;

    const element = event.target;

    // Skip if clicking on Vero UI elements
    if (this.isVeroElement(element)) return;

    // Flush pending input before recording click
    this.flushPendingInput();

    // Get element info
    const selectorInfo = this.selectorGenerator.generate(element);
    const fieldName = this.selectorGenerator.suggestFieldName(element);

    // Determine action type based on element
    let actionType = 'click';
    let value = null;

    if (element.tagName === 'INPUT') {
      const inputType = element.type?.toLowerCase();
      if (inputType === 'checkbox') {
        actionType = element.checked ? 'check' : 'uncheck';
      } else if (inputType === 'radio') {
        actionType = 'check';
        value = element.value;
      }
    }

    // Record the action
    this.recordAction(actionType, element, value, {
      selector: selectorInfo?.primary,
      alternatives: selectorInfo?.alternatives,
      fieldName,
      confidence: selectorInfo?.confidence,
      tagName: element.tagName,
      elementType: element.type
    });

    // Visual feedback
    this.highlighter.flashElement(element, '#22c55e', actionType);
  }

  /**
   * Handle input events (for real-time typing)
   */
  handleInput(event) {
    if (!this.recording || this.paused) return;

    const element = event.target;

    // Only handle text inputs
    if (!this.isTextInput(element)) return;
    if (this.isVeroElement(element)) return;

    // Debounce input to capture complete text
    this.lastInputElement = element;
    this.lastInputValue = element.value;

    if (this.inputDebounceTimer) {
      clearTimeout(this.inputDebounceTimer);
    }

    this.inputDebounceTimer = setTimeout(() => {
      this.flushPendingInput();
    }, 500);
  }

  /**
   * Handle change events (for selects and other inputs)
   */
  handleChange(event) {
    if (!this.recording || this.paused) return;

    const element = event.target;
    if (this.isVeroElement(element)) return;

    // For select elements
    if (element.tagName === 'SELECT') {
      const selectorInfo = this.selectorGenerator.generate(element);
      const fieldName = this.selectorGenerator.suggestFieldName(element);
      const selectedOption = element.options[element.selectedIndex];

      this.recordAction('select', element, selectedOption?.text || element.value, {
        selector: selectorInfo?.primary,
        fieldName,
        optionValue: element.value,
        optionText: selectedOption?.text
      });

      this.highlighter.flashElement(element, '#22c55e', 'select');
    }
  }

  /**
   * Handle form submit events
   */
  handleSubmit(event) {
    if (!this.recording || this.paused) return;

    const form = event.target;
    if (this.isVeroElement(form)) return;

    // Flush any pending input
    this.flushPendingInput();

    // Find the submit button if any
    const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
    if (submitBtn) {
      const selectorInfo = this.selectorGenerator.generate(submitBtn);
      const fieldName = this.selectorGenerator.suggestFieldName(submitBtn);

      this.recordAction('click', submitBtn, null, {
        selector: selectorInfo?.primary,
        fieldName,
        isSubmit: true
      });
    }
  }

  /**
   * Handle keyboard events (for special keys)
   */
  handleKeyboard(event) {
    if (!this.recording || this.paused) return;

    const element = event.target;
    if (this.isVeroElement(element)) return;

    // Record Enter key presses on forms
    if (event.key === 'Enter' && !event.shiftKey) {
      const form = element.closest('form');
      if (form || element.tagName === 'INPUT') {
        this.flushPendingInput();

        const selectorInfo = this.selectorGenerator.generate(element);
        this.recordAction('press', element, 'Enter', {
          selector: selectorInfo?.primary,
          key: 'Enter'
        });
      }
    }

    // Record Escape key
    if (event.key === 'Escape') {
      this.recordAction('press', document.body, 'Escape', {
        key: 'Escape'
      });
    }

    // Record Tab for focus changes
    if (event.key === 'Tab') {
      this.flushPendingInput();
    }
  }

  /**
   * Handle scroll events
   */
  handleScroll(event) {
    if (!this.recording || this.paused) return;

    // Debounce scroll events
    if (this.scrollDebounceTimer) {
      clearTimeout(this.scrollDebounceTimer);
    }

    this.scrollDebounceTimer = setTimeout(() => {
      const target = event.target;

      // Only record significant scrolls
      if (target === document || target === document.documentElement || target === document.body) {
        const scrollY = window.scrollY;
        if (scrollY > 100) {
          this.recordAction('scroll', null, null, {
            scrollY,
            scrollX: window.scrollX
          });
        }
      }
    }, 300);
  }

  /**
   * Handle hover events (optional, triggered manually)
   */
  handleHover(event) {
    if (!this.recording || this.paused) return;

    const element = event.target;
    if (this.isVeroElement(element)) return;

    const selectorInfo = this.selectorGenerator.generate(element);
    const fieldName = this.selectorGenerator.suggestFieldName(element);

    this.recordAction('hover', element, null, {
      selector: selectorInfo?.primary,
      fieldName
    });
  }

  /**
   * Handle navigation changes
   */
  handleNavigation(url) {
    if (!this.recording || this.paused) return;

    this.flushPendingInput();
    this.recordAction('navigation', null, url);
  }

  /**
   * Handle page unload
   */
  handleBeforeUnload(event) {
    if (this.recording) {
      this.flushPendingInput();
      // Send final actions to background script
      chrome.runtime.sendMessage({
        type: 'PAGE_UNLOAD',
        actions: this.actions,
        url: window.location.href
      });
    }
  }

  /**
   * Flush any pending input action
   */
  flushPendingInput() {
    if (this.inputDebounceTimer) {
      clearTimeout(this.inputDebounceTimer);
      this.inputDebounceTimer = null;
    }

    if (this.lastInputElement && this.lastInputValue !== undefined) {
      const element = this.lastInputElement;
      const value = this.lastInputValue;

      const selectorInfo = this.selectorGenerator.generate(element);
      const fieldName = this.selectorGenerator.suggestFieldName(element);

      this.recordAction('fill', element, value, {
        selector: selectorInfo?.primary,
        alternatives: selectorInfo?.alternatives,
        fieldName,
        confidence: selectorInfo?.confidence
      });

      this.highlighter.flashElement(element, '#3b82f6', 'input');

      this.lastInputElement = null;
      this.lastInputValue = '';
    }
  }

  /**
   * Record an action
   */
  recordAction(type, element, value, metadata = {}) {
    const action = {
      id: this.generateActionId(),
      type,
      timestamp: Date.now(),
      value,
      url: window.location.href,
      ...metadata
    };

    // Add element info if available
    if (element) {
      action.tagName = element.tagName;
      action.elementType = element.type;
      action.elementId = element.id;
      action.elementClasses = Array.from(element.classList || []);
    }

    // Store in page objects map if it has a field name
    if (metadata.fieldName && metadata.selector) {
      const pageName = this.getPageName();
      if (!this.pageObjects.has(pageName)) {
        this.pageObjects.set(pageName, new Map());
      }
      this.pageObjects.get(pageName).set(metadata.fieldName, {
        selector: metadata.selector,
        alternatives: metadata.alternatives,
        confidence: metadata.confidence
      });
    }

    this.actions.push(action);

    // Notify popup about new action
    chrome.runtime.sendMessage({
      type: 'ACTION_RECORDED',
      action
    });

    console.log('[Vero Recorder] Action recorded:', action);
  }

  /**
   * Add a manual assertion
   */
  addAssertion(assertion) {
    this.recordAction('assertion', null, assertion.value, {
      assertionType: assertion.type,
      selector: assertion.selector,
      fieldName: assertion.fieldName
    });
  }

  /**
   * Start element picker for manual selection
   */
  startElementPicker(callback) {
    this.highlighter.startPicking(callback);
  }

  /**
   * Generate Vero DSL code from recorded actions
   */
  toVeroCode() {
    if (this.veroGenerator) {
      return this.veroGenerator.generateFeature(this.actions, this.getPageName());
    }

    // Fallback implementation
    let code = `feature "${this.getFeatureName()}" {\n`;

    // Add page object references
    for (const [pageName] of this.pageObjects) {
      code += `    use ${pageName}\n`;
    }
    code += '\n';

    // Generate scenario
    code += `    scenario "Recorded Test" {\n`;

    for (const action of this.actions) {
      code += this.actionToVeroStatement(action);
    }

    code += `    }\n`;
    code += `}\n`;

    return code;
  }

  /**
   * Generate page object code
   */
  toPageObject() {
    let code = '';

    for (const [pageName, fields] of this.pageObjects) {
      const url = this.getUrlPattern();
      code += `page ${pageName} for "${url}" {\n`;

      for (const [fieldName, info] of fields) {
        code += `    field ${fieldName} = "${info.selector}"\n`;
      }

      code += `}\n\n`;
    }

    return code;
  }

  /**
   * Convert action to Vero statement
   */
  actionToVeroStatement(action) {
    const indent = '        ';
    const fieldRef = action.fieldName ?
      `${this.getPageName()}.${action.fieldName}` :
      `"${action.selector || ''}"`;

    switch (action.type) {
      case 'navigation':
        return `${indent}open "${action.value}"\n`;

      case 'click':
        return `${indent}click ${fieldRef}\n`;

      case 'fill':
        return `${indent}fill ${fieldRef} with "${this.escapeString(action.value)}"\n`;

      case 'select':
        return `${indent}select ${fieldRef} option "${this.escapeString(action.value)}"\n`;

      case 'check':
        return `${indent}check ${fieldRef}\n`;

      case 'uncheck':
        return `${indent}uncheck ${fieldRef}\n`;

      case 'hover':
        return `${indent}hover ${fieldRef}\n`;

      case 'scroll':
        if (action.selector) {
          return `${indent}scroll to ${fieldRef}\n`;
        }
        return `${indent}// Scrolled to y=${action.scrollY}\n`;

      case 'press':
        return `${indent}press "${action.key}"\n`;

      case 'assertion':
        return this.assertionToVeroStatement(action);

      case 'wait':
        return `${indent}wait for ${fieldRef}\n`;

      case 'screenshot':
        return `${indent}screenshot "${action.value}"\n`;

      default:
        return `${indent}// Unknown action: ${action.type}\n`;
    }
  }

  /**
   * Convert assertion to Vero statement
   */
  assertionToVeroStatement(action) {
    const indent = '        ';
    const fieldRef = action.fieldName ?
      `${this.getPageName()}.${action.fieldName}` :
      `"${action.selector || ''}"`;

    switch (action.assertionType) {
      case 'visible':
        return `${indent}verify ${fieldRef} is visible\n`;

      case 'hidden':
        return `${indent}verify ${fieldRef} is hidden\n`;

      case 'text':
        return `${indent}verify "${this.escapeString(action.value)}" is visible\n`;

      case 'contains':
        return `${indent}verify ${fieldRef} contains "${this.escapeString(action.value)}"\n`;

      case 'value':
        return `${indent}verify ${fieldRef} has value "${this.escapeString(action.value)}"\n`;

      case 'enabled':
        return `${indent}verify ${fieldRef} is enabled\n`;

      case 'disabled':
        return `${indent}verify ${fieldRef} is disabled\n`;

      default:
        return `${indent}// Unknown assertion: ${action.assertionType}\n`;
    }
  }

  /**
   * Helper methods
   */
  generateActionId() {
    return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  isVeroElement(element) {
    if (!element) return false;
    return element.id?.startsWith('vero-') ||
           element.classList?.contains('vero-overlay') ||
           element.closest('[id^="vero-"]') !== null;
  }

  isTextInput(element) {
    if (element.tagName === 'TEXTAREA') return true;
    if (element.tagName === 'INPUT') {
      const type = element.type?.toLowerCase() || 'text';
      return ['text', 'email', 'password', 'search', 'tel', 'url', 'number'].includes(type);
    }
    return element.isContentEditable;
  }

  getPageName() {
    const url = new URL(window.location.href);
    const path = url.pathname.replace(/\//g, '_').replace(/^_/, '') || 'Home';
    return path.charAt(0).toUpperCase() + path.slice(1) + 'Page';
  }

  getFeatureName() {
    const url = new URL(window.location.href);
    return `Test on ${url.hostname}`;
  }

  getUrlPattern() {
    const url = new URL(window.location.href);
    return `${url.origin}${url.pathname}`;
  }

  escapeString(str) {
    if (!str) return '';
    return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }
}

// Initialize recorder when content script loads
if (typeof window !== 'undefined') {
  window.veroRecorder = new VeroRecorder();
  console.log('[Vero Recorder] Content script loaded');
}
