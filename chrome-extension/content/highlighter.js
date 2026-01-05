/**
 * Vero Test Recorder - Element Highlighter
 * Provides visual feedback during recording
 */

class ElementHighlighter {
  constructor() {
    this.highlightOverlay = null;
    this.tooltipElement = null;
    this.currentElement = null;
    this.isPicking = false;
    this.pickCallback = null;
    this.flashTimeouts = new Map();

    this.init();
  }

  /**
   * Initialize highlighter elements
   */
  init() {
    // Create highlight overlay
    this.highlightOverlay = document.createElement('div');
    this.highlightOverlay.id = 'vero-highlight-overlay';
    this.highlightOverlay.style.cssText = `
      position: fixed;
      pointer-events: none;
      z-index: 2147483646;
      border: 2px solid #4f46e5;
      background: rgba(79, 70, 229, 0.1);
      border-radius: 4px;
      transition: all 0.1s ease-out;
      display: none;
    `;

    // Create tooltip
    this.tooltipElement = document.createElement('div');
    this.tooltipElement.id = 'vero-selector-tooltip';
    this.tooltipElement.style.cssText = `
      position: fixed;
      z-index: 2147483647;
      background: #1f2937;
      color: #f9fafb;
      padding: 8px 12px;
      border-radius: 6px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 12px;
      line-height: 1.4;
      max-width: 400px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      display: none;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    `;

    // Append to document
    document.body.appendChild(this.highlightOverlay);
    document.body.appendChild(this.tooltipElement);
  }

  /**
   * Highlight an element
   * @param {Element} element - Element to highlight
   */
  highlight(element) {
    if (!element || !(element instanceof Element)) {
      this.unhighlight();
      return;
    }

    this.currentElement = element;
    const rect = element.getBoundingClientRect();

    // Position and show overlay
    this.highlightOverlay.style.left = `${rect.left - 2}px`;
    this.highlightOverlay.style.top = `${rect.top - 2}px`;
    this.highlightOverlay.style.width = `${rect.width + 4}px`;
    this.highlightOverlay.style.height = `${rect.height + 4}px`;
    this.highlightOverlay.style.display = 'block';
  }

  /**
   * Remove highlight
   */
  unhighlight() {
    this.currentElement = null;
    this.highlightOverlay.style.display = 'none';
  }

  /**
   * Show tooltip with selector information
   * @param {Element} element - Element to show tooltip for
   * @param {string} selector - Selector to display
   * @param {Object} options - Additional options
   */
  showTooltip(element, selector, options = {}) {
    if (!element) {
      this.hideTooltip();
      return;
    }

    const rect = element.getBoundingClientRect();
    const tagName = element.tagName.toLowerCase();
    const type = element.type ? ` type="${element.type}"` : '';
    const id = element.id ? ` #${element.id}` : '';

    // Build tooltip content
    let content = `<strong>${tagName}${type}${id}</strong>`;
    if (selector) {
      content += `<br><code style="color: #a5b4fc;">${this.escapeHtml(selector)}</code>`;
    }
    if (options.confidence !== undefined) {
      const confidenceColor = options.confidence >= 80 ? '#86efac' :
                              options.confidence >= 50 ? '#fde047' : '#fca5a5';
      content += `<br><span style="color: ${confidenceColor};">Confidence: ${options.confidence}%</span>`;
    }
    if (options.fieldName) {
      content += `<br><span style="color: #93c5fd;">Suggested name: ${options.fieldName}</span>`;
    }

    this.tooltipElement.innerHTML = content;
    this.tooltipElement.style.display = 'block';

    // Position tooltip
    let left = rect.left;
    let top = rect.bottom + 8;

    // Adjust if would go off screen
    const tooltipRect = this.tooltipElement.getBoundingClientRect();
    if (left + tooltipRect.width > window.innerWidth) {
      left = window.innerWidth - tooltipRect.width - 10;
    }
    if (top + tooltipRect.height > window.innerHeight) {
      top = rect.top - tooltipRect.height - 8;
    }
    if (left < 0) left = 10;
    if (top < 0) top = 10;

    this.tooltipElement.style.left = `${left}px`;
    this.tooltipElement.style.top = `${top}px`;
  }

  /**
   * Hide tooltip
   */
  hideTooltip() {
    this.tooltipElement.style.display = 'none';
  }

  /**
   * Flash an element to provide feedback for recorded action
   * @param {Element} element - Element to flash
   * @param {string} color - Color for the flash (default: green for success)
   * @param {string} type - Type of action ('click', 'input', 'select', etc.)
   */
  flashElement(element, color = '#22c55e', type = 'action') {
    if (!element || !(element instanceof Element)) return;

    // Clear any existing flash on this element
    const existingTimeout = this.flashTimeouts.get(element);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      this.flashTimeouts.delete(element);
    }

    // Create flash overlay
    const flash = document.createElement('div');
    flash.className = 'vero-flash-overlay';

    const rect = element.getBoundingClientRect();
    flash.style.cssText = `
      position: fixed;
      left: ${rect.left - 4}px;
      top: ${rect.top - 4}px;
      width: ${rect.width + 8}px;
      height: ${rect.height + 8}px;
      border: 3px solid ${color};
      background: ${color}33;
      border-radius: 6px;
      pointer-events: none;
      z-index: 2147483645;
      animation: vero-flash 0.5s ease-out forwards;
    `;

    // Add icon based on action type
    const icon = this.getActionIcon(type);
    if (icon) {
      const iconEl = document.createElement('div');
      iconEl.style.cssText = `
        position: absolute;
        top: -12px;
        right: -12px;
        width: 24px;
        height: 24px;
        background: ${color};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        color: white;
      `;
      iconEl.textContent = icon;
      flash.appendChild(iconEl);
    }

    document.body.appendChild(flash);

    // Remove after animation
    const timeout = setTimeout(() => {
      if (flash.parentNode) {
        flash.parentNode.removeChild(flash);
      }
      this.flashTimeouts.delete(element);
    }, 600);

    this.flashTimeouts.set(element, timeout);
  }

  /**
   * Get icon for action type
   */
  getActionIcon(type) {
    const icons = {
      'click': '\\u2713',   // Check mark
      'input': '\\u270E',   // Pencil
      'select': '\\u25BC',  // Down arrow
      'check': '\\u2714',   // Heavy check
      'hover': '\\u2192',   // Arrow
      'scroll': '\\u2195',  // Up-down arrow
      'navigation': '\\u2794', // Right arrow
      'screenshot': '\\u2608', // Camera-like
      'assertion': '\\u2022'  // Bullet
    };
    return icons[type] || null;
  }

  /**
   * Start element picker mode
   * @param {Function} callback - Called when element is picked
   */
  startPicking(callback) {
    this.isPicking = true;
    this.pickCallback = callback;

    // Change cursor
    document.body.style.cursor = 'crosshair';

    // Add event listeners
    this.pickMouseMoveHandler = this.handlePickMouseMove.bind(this);
    this.pickClickHandler = this.handlePickClick.bind(this);
    this.pickKeyHandler = this.handlePickKeyDown.bind(this);

    document.addEventListener('mousemove', this.pickMouseMoveHandler, true);
    document.addEventListener('click', this.pickClickHandler, true);
    document.addEventListener('keydown', this.pickKeyHandler, true);

    // Show picking indicator
    this.showPickingIndicator();
  }

  /**
   * Stop element picker mode
   */
  stopPicking() {
    this.isPicking = false;
    this.pickCallback = null;

    // Restore cursor
    document.body.style.cursor = '';

    // Remove event listeners
    document.removeEventListener('mousemove', this.pickMouseMoveHandler, true);
    document.removeEventListener('click', this.pickClickHandler, true);
    document.removeEventListener('keydown', this.pickKeyHandler, true);

    // Hide UI elements
    this.unhighlight();
    this.hideTooltip();
    this.hidePickingIndicator();
  }

  /**
   * Handle mouse move during picking
   */
  handlePickMouseMove(event) {
    if (!this.isPicking) return;

    const element = document.elementFromPoint(event.clientX, event.clientY);

    // Ignore our own overlay elements
    if (element && !element.id?.startsWith('vero-')) {
      this.highlight(element);

      // Get selector info
      if (window.VeroSelectorGenerator) {
        const generator = new window.VeroSelectorGenerator();
        const selectorInfo = generator.generate(element);
        const fieldName = generator.suggestFieldName(element);

        if (selectorInfo) {
          this.showTooltip(element, selectorInfo.primary, {
            confidence: selectorInfo.confidence,
            fieldName: fieldName
          });
        }
      } else {
        this.showTooltip(element, null);
      }
    }
  }

  /**
   * Handle click during picking
   */
  handlePickClick(event) {
    if (!this.isPicking) return;

    event.preventDefault();
    event.stopPropagation();

    const element = document.elementFromPoint(event.clientX, event.clientY);

    if (element && !element.id?.startsWith('vero-')) {
      if (this.pickCallback) {
        // Generate selector info
        let selectorInfo = null;
        let fieldName = null;

        if (window.VeroSelectorGenerator) {
          const generator = new window.VeroSelectorGenerator();
          selectorInfo = generator.generate(element);
          fieldName = generator.suggestFieldName(element);
        }

        this.pickCallback({
          element,
          selector: selectorInfo?.primary,
          selectorInfo,
          fieldName
        });
      }

      this.stopPicking();
    }
  }

  /**
   * Handle key down during picking (Escape to cancel)
   */
  handlePickKeyDown(event) {
    if (event.key === 'Escape') {
      this.stopPicking();
    }
  }

  /**
   * Show picking mode indicator
   */
  showPickingIndicator() {
    if (document.getElementById('vero-picking-indicator')) return;

    const indicator = document.createElement('div');
    indicator.id = 'vero-picking-indicator';
    indicator.style.cssText = `
      position: fixed;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 2147483647;
      background: #4f46e5;
      color: white;
      padding: 10px 20px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    `;
    indicator.innerHTML = '\\u{1F3AF} Click on an element to select it (ESC to cancel)';
    document.body.appendChild(indicator);
  }

  /**
   * Hide picking mode indicator
   */
  hidePickingIndicator() {
    const indicator = document.getElementById('vero-picking-indicator');
    if (indicator) {
      indicator.parentNode.removeChild(indicator);
    }
  }

  /**
   * Escape HTML for safe display
   */
  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * Clean up all highlighter elements
   */
  destroy() {
    this.stopPicking();

    // Clear flash timeouts
    for (const timeout of this.flashTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.flashTimeouts.clear();

    // Remove elements
    if (this.highlightOverlay?.parentNode) {
      this.highlightOverlay.parentNode.removeChild(this.highlightOverlay);
    }
    if (this.tooltipElement?.parentNode) {
      this.tooltipElement.parentNode.removeChild(this.tooltipElement);
    }

    // Remove any flash overlays
    document.querySelectorAll('.vero-flash-overlay').forEach(el => el.remove());
  }
}

// Inject flash animation CSS
(function() {
  if (document.getElementById('vero-highlighter-styles')) return;

  const style = document.createElement('style');
  style.id = 'vero-highlighter-styles';
  style.textContent = `
    @keyframes vero-flash {
      0% {
        opacity: 1;
        transform: scale(1);
      }
      100% {
        opacity: 0;
        transform: scale(1.1);
      }
    }
  `;
  document.head.appendChild(style);
})();

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.VeroElementHighlighter = ElementHighlighter;
}
