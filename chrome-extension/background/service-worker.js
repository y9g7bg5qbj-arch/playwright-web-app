/**
 * Vero Test Recorder - Background Service Worker
 * Manages extension lifecycle, tab tracking, and cross-context communication
 */

// Recording state management
const recordingState = {
  isRecording: false,
  isPaused: false,
  activeTabId: null,
  startTime: null,
  actions: [],
  pageObjects: new Map()
};

// Tab tracking
const tabStates = new Map();

/**
 * Initialize extension on install/update
 */
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[Vero Background] Extension installed/updated:', details.reason);

  // Set default settings
  chrome.storage.sync.get(['veroSettings'], (result) => {
    if (!result.veroSettings) {
      chrome.storage.sync.set({
        veroSettings: {
          apiUrl: 'http://localhost:3000/api',
          autoSync: false,
          generatePageObjects: true,
          selectorStrategy: 'auto'
        }
      });
    }
  });

  // Set badge to indicate extension is ready
  chrome.action.setBadgeText({ text: '' });
  chrome.action.setBadgeBackgroundColor({ color: '#4f46e5' });
});

/**
 * Handle messages from popup and content scripts
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Vero Background] Message received:', message.type, sender.tab?.id);

  switch (message.type) {
    case 'RECORDING_STARTED':
      handleRecordingStarted(message, sender);
      sendResponse({ success: true });
      break;

    case 'RECORDING_STOPPED':
      handleRecordingStopped(message, sender);
      sendResponse({ success: true });
      break;

    case 'ACTION_RECORDED':
      handleActionRecorded(message, sender);
      sendResponse({ success: true });
      break;

    case 'PAGE_UNLOAD':
      handlePageUnload(message, sender);
      sendResponse({ success: true });
      break;

    case 'GET_RECORDING_STATE':
      sendResponse({
        success: true,
        ...recordingState
      });
      break;

    case 'SYNC_ACTIONS':
      syncActionsAcrossTabs(message, sender);
      sendResponse({ success: true });
      break;

    case 'ELEMENT_PICKED':
      // Forward to popup if open
      chrome.runtime.sendMessage(message).catch(() => {
        // Popup might be closed
      });
      sendResponse({ success: true });
      break;

    case 'CHECK_CONNECTION':
      checkIDEConnection().then(connected => {
        sendResponse({ success: true, connected });
      });
      return true; // Keep channel open for async response

    case 'SEND_TO_IDE':
      sendToIDE(message.data).then(result => {
        sendResponse(result);
      });
      return true;

    default:
      sendResponse({ success: false, error: 'Unknown message type' });
  }

  return true; // Keep message channel open
});

/**
 * Handle recording started
 */
function handleRecordingStarted(message, sender) {
  recordingState.isRecording = true;
  recordingState.isPaused = false;
  recordingState.activeTabId = sender.tab?.id;
  recordingState.startTime = message.timestamp || Date.now();
  recordingState.actions = [];

  // Update badge
  chrome.action.setBadgeText({ text: 'REC' });
  chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });

  // Store in tab states
  if (sender.tab?.id) {
    tabStates.set(sender.tab.id, {
      isRecording: true,
      url: message.url,
      startTime: recordingState.startTime
    });
  }

  console.log('[Vero Background] Recording started on tab:', sender.tab?.id);
}

/**
 * Handle recording stopped
 */
function handleRecordingStopped(message, sender) {
  recordingState.isRecording = false;
  recordingState.isPaused = false;

  // Update badge
  chrome.action.setBadgeText({ text: '' });

  // Clear tab state
  if (sender.tab?.id) {
    tabStates.delete(sender.tab.id);
  }

  console.log('[Vero Background] Recording stopped. Actions:', message.actionCount);
}

/**
 * Handle action recorded
 */
function handleActionRecorded(message, sender) {
  if (!recordingState.isRecording) return;

  recordingState.actions.push(message.action);

  // Update badge with action count
  const count = recordingState.actions.length;
  if (count > 0 && count <= 99) {
    chrome.action.setBadgeText({ text: count.toString() });
  } else if (count > 99) {
    chrome.action.setBadgeText({ text: '99+' });
  }
}

/**
 * Handle page unload during recording
 */
function handlePageUnload(message, sender) {
  if (!recordingState.isRecording) return;

  // Merge actions from the unloading page
  if (message.actions && message.actions.length > 0) {
    // Avoid duplicates
    const existingIds = new Set(recordingState.actions.map(a => a.id));
    const newActions = message.actions.filter(a => !existingIds.has(a.id));
    recordingState.actions.push(...newActions);
  }

  console.log('[Vero Background] Page unload handled. Total actions:', recordingState.actions.length);
}

/**
 * Sync actions across tabs (for SPA navigation)
 */
function syncActionsAcrossTabs(message, sender) {
  if (!recordingState.isRecording) return;

  const tabId = sender.tab?.id;
  if (tabId && tabId === recordingState.activeTabId) {
    // Same tab, update URL if changed
    const state = tabStates.get(tabId);
    if (state && state.url !== message.url) {
      state.url = message.url;
      console.log('[Vero Background] Tab URL updated:', message.url);
    }
  }
}

/**
 * Check IDE connection
 */
async function checkIDEConnection() {
  try {
    const settings = await getSettings();
    const apiUrl = settings.apiUrl || 'http://localhost:3000/api';
    const healthUrl = apiUrl.replace('/api', '') + '/health';

    const response = await fetch(healthUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await response.json();
    return data.success === true;
  } catch (error) {
    console.warn('[Vero Background] IDE connection check failed:', error);
    return false;
  }
}

/**
 * Send recording to IDE
 */
async function sendToIDE(data) {
  try {
    const settings = await getSettings();
    const apiUrl = settings.apiUrl || 'http://localhost:3000/api';

    const response = await fetch(`${apiUrl}/recorder/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('[Vero Background] Failed to send to IDE:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get settings from storage
 */
async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['veroSettings'], (result) => {
      resolve(result.veroSettings || {});
    });
  });
}

/**
 * Handle tab updates (for tracking navigation)
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!recordingState.isRecording) return;
  if (tabId !== recordingState.activeTabId) return;

  if (changeInfo.status === 'complete' && tab.url) {
    // Notify content script about navigation
    chrome.tabs.sendMessage(tabId, {
      type: 'TAB_NAVIGATION',
      url: tab.url
    }).catch(() => {
      // Content script might not be ready yet
    });
  }
});

/**
 * Handle tab removal
 */
chrome.tabs.onRemoved.addListener((tabId) => {
  tabStates.delete(tabId);

  if (recordingState.activeTabId === tabId && recordingState.isRecording) {
    // Active recording tab was closed
    recordingState.isRecording = false;
    recordingState.isPaused = false;
    chrome.action.setBadgeText({ text: '' });
    console.log('[Vero Background] Recording tab closed');
  }
});

/**
 * Handle action button click (extension icon)
 */
chrome.action.onClicked.addListener((tab) => {
  // This handler is only called if there's no popup
  // We have a popup, so this won't be called normally
  // But we can use it as a fallback
  console.log('[Vero Background] Extension icon clicked on tab:', tab.id);
});

/**
 * Handle keyboard shortcuts
 */
chrome.commands.onCommand.addListener((command) => {
  console.log('[Vero Background] Command received:', command);

  switch (command) {
    case 'toggle-recording':
      toggleRecording();
      break;
    case 'add-assertion':
      startAssertionMode();
      break;
    case 'take-screenshot':
      takeScreenshot();
      break;
  }
});

/**
 * Toggle recording via keyboard shortcut
 */
async function toggleRecording() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  if (recordingState.isRecording) {
    chrome.tabs.sendMessage(tab.id, { type: 'STOP_RECORDING' });
  } else {
    chrome.tabs.sendMessage(tab.id, { type: 'START_RECORDING' });
  }
}

/**
 * Start assertion mode via keyboard shortcut
 */
async function startAssertionMode() {
  if (!recordingState.isRecording) return;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  chrome.tabs.sendMessage(tab.id, { type: 'START_ELEMENT_PICKER' });
}

/**
 * Take screenshot via keyboard shortcut
 */
async function takeScreenshot() {
  if (!recordingState.isRecording) return;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  try {
    const dataUrl = await chrome.tabs.captureVisibleTab();
    const timestamp = Date.now();
    const name = `screenshot_${timestamp}`;

    // Record screenshot action
    chrome.tabs.sendMessage(tab.id, {
      type: 'ADD_SCREENSHOT',
      name,
      dataUrl
    });

    console.log('[Vero Background] Screenshot captured:', name);
  } catch (error) {
    console.error('[Vero Background] Screenshot failed:', error);
  }
}

/**
 * Context menu setup
 */
chrome.runtime.onInstalled.addListener(() => {
  // Create context menu items
  chrome.contextMenus.create({
    id: 'vero-record-element',
    title: 'Record element interaction',
    contexts: ['all']
  });

  chrome.contextMenus.create({
    id: 'vero-add-assertion',
    title: 'Add assertion for element',
    contexts: ['all']
  });

  chrome.contextMenus.create({
    id: 'vero-copy-selector',
    title: 'Copy element selector',
    contexts: ['all']
  });
});

/**
 * Handle context menu clicks
 */
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id) return;

  switch (info.menuItemId) {
    case 'vero-record-element':
      chrome.tabs.sendMessage(tab.id, {
        type: 'RECORD_CONTEXT_ELEMENT'
      });
      break;

    case 'vero-add-assertion':
      chrome.tabs.sendMessage(tab.id, {
        type: 'ADD_ASSERTION_FOR_CONTEXT_ELEMENT'
      });
      break;

    case 'vero-copy-selector':
      chrome.tabs.sendMessage(tab.id, {
        type: 'COPY_CONTEXT_ELEMENT_SELECTOR'
      });
      break;
  }
});

console.log('[Vero Background] Service worker started');
