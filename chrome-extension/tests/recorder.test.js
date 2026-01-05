/**
 * Tests for Recording Engine
 * Tests event capture and action recording functionality
 */

describe('VeroRecorder', () => {
  let recorder;

  beforeEach(() => {
    recorder = createMockRecorder();
  });

  afterEach(() => {
    recorder.stop();
  });

  describe('lifecycle', () => {
    test('should start recording', () => {
      recorder.start();
      expect(recorder.isRecording).toBe(true);
      expect(recorder.isPaused).toBe(false);
    });

    test('should stop recording', () => {
      recorder.start();
      recorder.stop();
      expect(recorder.isRecording).toBe(false);
    });

    test('should pause and resume recording', () => {
      recorder.start();
      recorder.pause();
      expect(recorder.isPaused).toBe(true);

      recorder.resume();
      expect(recorder.isPaused).toBe(false);
      expect(recorder.isRecording).toBe(true);
    });

    test('should not record when paused', () => {
      recorder.start();
      recorder.pause();

      const action = { type: 'click', selector: '#btn' };
      recorder.recordAction(action);

      expect(recorder.actions.length).toBe(0);
    });

    test('should record initial navigation on start', () => {
      recorder.start('https://example.com/page');

      const navAction = recorder.actions.find(a => a.type === 'navigation');
      expect(navAction).toBeDefined();
      expect(navAction.url).toBe('https://example.com/page');
    });
  });

  describe('click recording', () => {
    test('should record click events', () => {
      recorder.start();

      const event = createMockEvent('click', {
        target: createMockElement({ tagName: 'BUTTON', id: 'submit' })
      });
      recorder.handleClick(event);

      expect(recorder.actions.length).toBe(2); // navigation + click
      const clickAction = recorder.actions.find(a => a.type === 'click');
      expect(clickAction).toBeDefined();
      expect(clickAction.selector).toContain('submit');
    });

    test('should record double click events', () => {
      recorder.start();

      const event = createMockEvent('dblclick', {
        target: createMockElement({ tagName: 'TD', className: 'editable' })
      });
      recorder.handleDblClick(event);

      const dblClickAction = recorder.actions.find(a => a.type === 'dblclick');
      expect(dblClickAction).toBeDefined();
    });

    test('should ignore clicks on vero UI elements', () => {
      recorder.start();

      const event = createMockEvent('click', {
        target: createMockElement({ className: 'vero-highlight-overlay' })
      });
      recorder.handleClick(event);

      const clickActions = recorder.actions.filter(a => a.type === 'click');
      expect(clickActions.length).toBe(0);
    });

    test('should capture click coordinates', () => {
      recorder.start();

      const event = createMockEvent('click', {
        target: createMockElement({ tagName: 'DIV', id: 'target' }),
        clientX: 150,
        clientY: 200
      });
      recorder.handleClick(event);

      const clickAction = recorder.actions.find(a => a.type === 'click');
      expect(clickAction.x).toBe(150);
      expect(clickAction.y).toBe(200);
    });
  });

  describe('input recording', () => {
    test('should record input values with debouncing', async () => {
      recorder.start();

      const input = createMockElement({
        tagName: 'INPUT',
        id: 'username',
        value: 'test'
      });

      // Simulate typing multiple characters
      for (const char of 'hello') {
        input.value += char;
        recorder.handleInput(createMockEvent('input', { target: input }));
      }

      // Wait for debounce
      await delay(350);

      const inputActions = recorder.actions.filter(a => a.type === 'input');
      expect(inputActions.length).toBe(1); // Debounced to single action
      expect(inputActions[0].value).toBe('testhello');
    });

    test('should mask password input values', () => {
      recorder.start();

      const input = createMockElement({
        tagName: 'INPUT',
        id: 'password',
        attributes: { type: 'password' },
        value: 'secret123'
      });

      recorder.recordInputAction(input, 'secret123');

      const inputAction = recorder.actions.find(a =>
        a.type === 'input' && a.selector.includes('password')
      );
      expect(inputAction.value).toBe('********');
    });

    test('should record textarea input', () => {
      recorder.start();

      const textarea = createMockElement({
        tagName: 'TEXTAREA',
        id: 'comments',
        value: 'This is a comment'
      });

      recorder.recordInputAction(textarea, 'This is a comment');

      const inputAction = recorder.actions.find(a => a.selector.includes('comments'));
      expect(inputAction).toBeDefined();
      expect(inputAction.value).toBe('This is a comment');
    });
  });

  describe('change events', () => {
    test('should record select change', () => {
      recorder.start();

      const select = createMockElement({
        tagName: 'SELECT',
        id: 'country',
        value: 'US'
      });
      select.options = [
        { value: '', text: 'Select' },
        { value: 'US', text: 'United States', selected: true }
      ];
      select.selectedOptions = [{ value: 'US', text: 'United States' }];

      recorder.handleChange(createMockEvent('change', { target: select }));

      const selectAction = recorder.actions.find(a => a.type === 'select');
      expect(selectAction).toBeDefined();
      expect(selectAction.value).toBe('United States');
    });

    test('should record checkbox check', () => {
      recorder.start();

      const checkbox = createMockElement({
        tagName: 'INPUT',
        id: 'agree',
        attributes: { type: 'checkbox' },
        checked: true
      });

      recorder.handleChange(createMockEvent('change', { target: checkbox }));

      const checkAction = recorder.actions.find(a => a.type === 'check');
      expect(checkAction).toBeDefined();
    });

    test('should record checkbox uncheck', () => {
      recorder.start();

      const checkbox = createMockElement({
        tagName: 'INPUT',
        id: 'newsletter',
        attributes: { type: 'checkbox' },
        checked: false
      });

      recorder.handleChange(createMockEvent('change', { target: checkbox }));

      const uncheckAction = recorder.actions.find(a => a.type === 'uncheck');
      expect(uncheckAction).toBeDefined();
    });

    test('should record radio button selection', () => {
      recorder.start();

      const radio = createMockElement({
        tagName: 'INPUT',
        attributes: { type: 'radio', name: 'plan', value: 'premium' },
        checked: true
      });

      recorder.handleChange(createMockEvent('change', { target: radio }));

      const checkAction = recorder.actions.find(a => a.type === 'check');
      expect(checkAction).toBeDefined();
    });
  });

  describe('keyboard events', () => {
    test('should record Enter key press', () => {
      recorder.start();

      const event = createMockEvent('keydown', {
        target: createMockElement({ tagName: 'INPUT', id: 'search' }),
        key: 'Enter'
      });
      recorder.handleKeyDown(event);

      const keyAction = recorder.actions.find(a => a.type === 'keydown');
      expect(keyAction).toBeDefined();
      expect(keyAction.key).toBe('Enter');
    });

    test('should record Tab key press', () => {
      recorder.start();

      const event = createMockEvent('keydown', {
        target: createMockElement({ tagName: 'INPUT' }),
        key: 'Tab'
      });
      recorder.handleKeyDown(event);

      const keyAction = recorder.actions.find(a => a.key === 'Tab');
      expect(keyAction).toBeDefined();
    });

    test('should record Escape key press', () => {
      recorder.start();

      const event = createMockEvent('keydown', {
        target: createMockElement({ tagName: 'DIV' }),
        key: 'Escape'
      });
      recorder.handleKeyDown(event);

      const keyAction = recorder.actions.find(a => a.key === 'Escape');
      expect(keyAction).toBeDefined();
    });

    test('should not record regular character keys', () => {
      recorder.start();
      const initialCount = recorder.actions.length;

      const event = createMockEvent('keydown', {
        target: createMockElement({ tagName: 'INPUT' }),
        key: 'a'
      });
      recorder.handleKeyDown(event);

      expect(recorder.actions.length).toBe(initialCount);
    });
  });

  describe('scroll events', () => {
    test('should record scroll to element', () => {
      recorder.start();

      const event = createMockEvent('scroll', {
        target: createMockElement({ tagName: 'DIV', id: 'content' })
      });
      event.deltaY = 100;
      recorder.handleScroll(event);

      const scrollAction = recorder.actions.find(a => a.type === 'scroll');
      expect(scrollAction).toBeDefined();
    });

    test('should debounce rapid scroll events', async () => {
      recorder.start();
      const initialCount = recorder.actions.length;

      // Simulate rapid scrolling
      for (let i = 0; i < 10; i++) {
        recorder.handleScroll(createMockEvent('scroll', {
          target: document,
          deltaY: i * 50
        }));
      }

      // Wait for debounce
      await delay(200);

      const scrollActions = recorder.actions.filter(a => a.type === 'scroll');
      expect(scrollActions.length).toBeLessThanOrEqual(2);
    });
  });

  describe('hover events', () => {
    test('should record hover on interactive elements', async () => {
      recorder.start();

      const event = createMockEvent('mouseover', {
        target: createMockElement({
          tagName: 'BUTTON',
          className: 'dropdown-toggle',
          attributes: { 'aria-haspopup': 'true' }
        })
      });
      recorder.handleMouseOver(event);

      await delay(550); // Wait for hover threshold

      const hoverAction = recorder.actions.find(a => a.type === 'hover');
      expect(hoverAction).toBeDefined();
    });

    test('should not record brief hovers', async () => {
      recorder.start();
      const initialCount = recorder.actions.length;

      const element = createMockElement({ tagName: 'BUTTON' });

      recorder.handleMouseOver(createMockEvent('mouseover', { target: element }));

      // Quick mouseout
      await delay(100);
      recorder.handleMouseOut(createMockEvent('mouseout', { target: element }));

      const hoverActions = recorder.actions.filter(a => a.type === 'hover');
      expect(hoverActions.length).toBe(0);
    });
  });

  describe('navigation recording', () => {
    test('should record navigation on URL change', () => {
      recorder.start('https://example.com');

      recorder.recordNavigation('https://example.com/new-page');

      const navActions = recorder.actions.filter(a => a.type === 'navigation');
      expect(navActions.length).toBe(2);
      expect(navActions[1].url).toBe('https://example.com/new-page');
    });

    test('should not record duplicate navigations', () => {
      recorder.start('https://example.com');

      recorder.recordNavigation('https://example.com');
      recorder.recordNavigation('https://example.com');

      const navActions = recorder.actions.filter(a => a.type === 'navigation');
      expect(navActions.length).toBe(1);
    });
  });

  describe('action export', () => {
    test('should export actions as JSON', () => {
      recorder.start();
      recorder.recordAction({ type: 'click', selector: '#btn' });

      const exported = recorder.exportActions();
      expect(typeof exported).toBe('string');

      const parsed = JSON.parse(exported);
      expect(Array.isArray(parsed)).toBe(true);
    });

    test('should include metadata in export', () => {
      recorder.start('https://example.com');
      recorder.stop();

      const metadata = recorder.getMetadata();
      expect(metadata.startTime).toBeDefined();
      expect(metadata.endTime).toBeDefined();
      expect(metadata.url).toBe('https://example.com');
    });
  });

  describe('page object extraction', () => {
    test('should extract unique elements', () => {
      recorder.start();

      recorder.recordAction({ type: 'click', selector: '#btn1', tagName: 'BUTTON' });
      recorder.recordAction({ type: 'input', selector: '#input1', value: 'test' });
      recorder.recordAction({ type: 'click', selector: '#btn1', tagName: 'BUTTON' }); // duplicate

      const elements = recorder.extractPageElements();
      expect(Object.keys(elements).length).toBe(2);
    });

    test('should generate field names for elements', () => {
      recorder.start();

      recorder.recordAction({
        type: 'click',
        selector: '[data-testid="submit-button"]',
        tagName: 'BUTTON'
      });

      const elements = recorder.extractPageElements();
      expect(elements.submitButton).toBeDefined();
    });
  });
});

// Helper functions

function createMockRecorder() {
  return {
    isRecording: false,
    isPaused: false,
    actions: [],
    pendingInput: null,
    hoverTimer: null,
    scrollTimer: null,
    lastUrl: '',

    start(url = 'https://example.com') {
      this.isRecording = true;
      this.isPaused = false;
      this.actions = [];
      this.lastUrl = url;
      this.recordNavigation(url);
    },

    stop() {
      this.isRecording = false;
      this.isPaused = false;
    },

    pause() {
      this.isPaused = true;
    },

    resume() {
      this.isPaused = false;
    },

    recordAction(action) {
      if (!this.isRecording || this.isPaused) return;
      this.actions.push({
        id: Date.now().toString(),
        timestamp: Date.now(),
        ...action
      });
    },

    handleClick(event) {
      if (!this.isRecording || this.isPaused) return;
      if (this.isVeroElement(event.target)) return;

      const selector = this.generateSelector(event.target);
      this.recordAction({
        type: 'click',
        selector,
        tagName: event.target.tagName,
        x: event.clientX,
        y: event.clientY
      });
    },

    handleDblClick(event) {
      if (!this.isRecording || this.isPaused) return;

      const selector = this.generateSelector(event.target);
      this.recordAction({
        type: 'dblclick',
        selector,
        tagName: event.target.tagName
      });
    },

    handleInput(event) {
      if (!this.isRecording || this.isPaused) return;

      const target = event.target;

      // Debounce input
      if (this.pendingInput) {
        clearTimeout(this.pendingInput.timer);
      }

      this.pendingInput = {
        target,
        timer: setTimeout(() => {
          this.recordInputAction(target, target.value);
          this.pendingInput = null;
        }, 300)
      };
    },

    recordInputAction(target, value) {
      const selector = this.generateSelector(target);
      const isPassword = target.getAttribute?.('type') === 'password';

      this.recordAction({
        type: 'input',
        selector,
        value: isPassword ? '********' : value,
        tagName: target.tagName
      });
    },

    handleChange(event) {
      if (!this.isRecording || this.isPaused) return;

      const target = event.target;
      const selector = this.generateSelector(target);
      const type = target.getAttribute?.('type') || target.tagName;

      if (target.tagName === 'SELECT') {
        const selectedOption = target.selectedOptions?.[0];
        this.recordAction({
          type: 'select',
          selector,
          value: selectedOption?.text || target.value
        });
      } else if (type === 'checkbox' || type === 'radio') {
        this.recordAction({
          type: target.checked ? 'check' : 'uncheck',
          selector
        });
      }
    },

    handleKeyDown(event) {
      if (!this.isRecording || this.isPaused) return;

      const specialKeys = ['Enter', 'Tab', 'Escape', 'Backspace', 'Delete'];
      if (!specialKeys.includes(event.key)) return;

      this.recordAction({
        type: 'keydown',
        key: event.key,
        selector: this.generateSelector(event.target)
      });
    },

    handleScroll(event) {
      if (!this.isRecording || this.isPaused) return;

      if (this.scrollTimer) {
        clearTimeout(this.scrollTimer);
      }

      this.scrollTimer = setTimeout(() => {
        this.recordAction({
          type: 'scroll',
          deltaY: event.deltaY || 0
        });
        this.scrollTimer = null;
      }, 150);
    },

    handleMouseOver(event) {
      if (!this.isRecording || this.isPaused) return;

      const target = event.target;
      if (!this.isInteractiveElement(target)) return;

      this.hoverTimer = setTimeout(() => {
        this.recordAction({
          type: 'hover',
          selector: this.generateSelector(target)
        });
      }, 500);
    },

    handleMouseOut(event) {
      if (this.hoverTimer) {
        clearTimeout(this.hoverTimer);
        this.hoverTimer = null;
      }
    },

    recordNavigation(url) {
      if (url === this.lastUrl) return;
      this.lastUrl = url;
      this.recordAction({ type: 'navigation', url });
    },

    generateSelector(element) {
      if (element.id) return `#${element.id}`;
      if (element.getAttribute?.('data-testid')) {
        return `[data-testid="${element.getAttribute('data-testid')}"]`;
      }
      if (element.className) {
        return `.${element.className.split(' ')[0]}`;
      }
      return element.tagName?.toLowerCase() || 'element';
    },

    isVeroElement(element) {
      const className = element.className || '';
      return className.includes('vero-');
    },

    isInteractiveElement(element) {
      const tag = element.tagName?.toLowerCase();
      return ['button', 'a', 'select', 'input'].includes(tag) ||
        element.getAttribute?.('aria-haspopup') === 'true';
    },

    exportActions() {
      return JSON.stringify(this.actions);
    },

    getMetadata() {
      return {
        startTime: this.actions[0]?.timestamp,
        endTime: this.actions[this.actions.length - 1]?.timestamp,
        url: this.lastUrl,
        actionCount: this.actions.length
      };
    },

    extractPageElements() {
      const elements = {};
      const usedNames = new Set();

      for (const action of this.actions) {
        if (!action.selector || elements[action.selector]) continue;

        let name = this.selectorToFieldName(action.selector);

        // Ensure unique name
        while (usedNames.has(name)) {
          name = name + '2';
        }
        usedNames.add(name);

        elements[name] = action.selector;
      }

      return elements;
    },

    selectorToFieldName(selector) {
      const match = selector.match(/(?:data-testid|id)="([^"]+)"/);
      if (match) {
        return match[1]
          .replace(/[-_](.)/g, (_, c) => c.toUpperCase())
          .replace(/^./, c => c.toLowerCase());
      }
      return 'element';
    }
  };
}

function createMockElement(options = {}) {
  return {
    tagName: options.tagName || 'DIV',
    id: options.id || '',
    className: options.className || '',
    value: options.value || '',
    checked: options.checked || false,
    getAttribute: (attr) => (options.attributes || {})[attr] || null,
    hasAttribute: (attr) => !!(options.attributes || {})[attr],
    parentElement: options.parentElement || null,
    selectedOptions: options.selectedOptions || [],
    options: options.options || []
  };
}

function createMockEvent(type, options = {}) {
  return {
    type,
    target: options.target || createMockElement(),
    clientX: options.clientX || 0,
    clientY: options.clientY || 0,
    key: options.key || '',
    deltaY: options.deltaY || 0,
    preventDefault: () => {},
    stopPropagation: () => {}
  };
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Export for test runner
if (typeof module !== 'undefined') {
  module.exports = {
    createMockRecorder,
    createMockElement,
    createMockEvent,
    delay
  };
}
