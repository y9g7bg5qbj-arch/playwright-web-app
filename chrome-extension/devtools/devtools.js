/**
 * Vero Test Recorder - DevTools Entry Point
 * Creates a custom DevTools panel for advanced recording features
 */

// Create the DevTools panel
chrome.devtools.panels.create(
  'Vero Recorder',        // Panel title
  'icons/icon16.png',     // Panel icon
  'devtools/panel.html',  // Panel HTML
  (panel) => {
    console.log('[Vero DevTools] Panel created');

    // Handle panel shown/hidden events
    panel.onShown.addListener((panelWindow) => {
      console.log('[Vero DevTools] Panel shown');
      if (panelWindow.veroPanel) {
        panelWindow.veroPanel.onPanelShown();
      }
    });

    panel.onHidden.addListener(() => {
      console.log('[Vero DevTools] Panel hidden');
    });
  }
);

// Create a sidebar in the Elements panel
chrome.devtools.panels.elements.createSidebarPane(
  'Vero Selector',
  (sidebar) => {
    console.log('[Vero DevTools] Sidebar created');

    // Update sidebar when element is selected
    chrome.devtools.panels.elements.onSelectionChanged.addListener(() => {
      updateSidebar(sidebar);
    });

    // Initial update
    updateSidebar(sidebar);
  }
);

/**
 * Update the Elements panel sidebar with selector info for selected element
 */
function updateSidebar(sidebar) {
  // Evaluate in the context of the inspected page
  chrome.devtools.inspectedWindow.eval(
    `(function() {
      const el = $0; // Currently selected element in Elements panel
      if (!el) return null;

      // Generate selector info
      const info = {
        tagName: el.tagName,
        id: el.id,
        classes: Array.from(el.classList),
        attributes: {}
      };

      // Get relevant attributes
      ['data-testid', 'data-test-id', 'data-test', 'data-cy', 'name', 'type', 'aria-label', 'placeholder', 'role'].forEach(attr => {
        if (el.hasAttribute(attr)) {
          info.attributes[attr] = el.getAttribute(attr);
        }
      });

      // Generate selectors
      info.selectors = {};

      // Test ID selector
      if (info.attributes['data-testid']) {
        info.selectors.testId = '[data-testid="' + info.attributes['data-testid'] + '"]';
      }

      // ID selector
      if (info.id) {
        info.selectors.id = '#' + info.id;
      }

      // Class selector
      if (info.classes.length > 0) {
        info.selectors.class = '.' + info.classes.join('.');
      }

      // CSS path
      function getCssPath(element) {
        const path = [];
        while (element && element.nodeType === Node.ELEMENT_NODE) {
          let selector = element.tagName.toLowerCase();
          if (element.id) {
            selector = '#' + element.id;
            path.unshift(selector);
            break;
          }
          const parent = element.parentElement;
          if (parent) {
            const siblings = Array.from(parent.children).filter(s => s.tagName === element.tagName);
            if (siblings.length > 1) {
              const index = siblings.indexOf(element) + 1;
              selector += ':nth-of-type(' + index + ')';
            }
          }
          path.unshift(selector);
          element = parent;
        }
        return path.join(' > ');
      }

      info.selectors.cssPath = getCssPath(el);

      // Suggested field name
      const fieldNameSources = [
        info.attributes['aria-label'],
        info.attributes.name,
        info.attributes.placeholder,
        info.id
      ].filter(Boolean);

      if (fieldNameSources.length > 0) {
        info.suggestedFieldName = fieldNameSources[0]
          .toLowerCase()
          .replace(/[^a-zA-Z0-9]+(.)/g, (m, chr) => chr.toUpperCase())
          .replace(/^[A-Z]/, chr => chr.toLowerCase())
          .replace(/[^a-zA-Z0-9]/g, '');
      }

      return info;
    })()`,
    (result, error) => {
      if (error) {
        sidebar.setObject({ error: 'Failed to analyze element' });
        return;
      }

      if (result) {
        sidebar.setObject(result);
      } else {
        sidebar.setObject({ message: 'No element selected' });
      }
    }
  );
}
