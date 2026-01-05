/**
 * Vero IDE Integration API
 * Handles communication with the Vero IDE backend
 */

const API_BASE = 'http://localhost:3000/api';

class VeroAPI {
  constructor(baseUrl = API_BASE) {
    this.baseUrl = baseUrl;
    this.authToken = null;
  }

  /**
   * Set authentication token
   * @param {string} token - JWT token
   */
  setAuthToken(token) {
    this.authToken = token;
    // Persist token
    chrome.storage.local.set({ veroAuthToken: token });
  }

  /**
   * Get stored auth token
   * @returns {Promise<string|null>}
   */
  async getStoredToken() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['veroAuthToken'], (result) => {
        this.authToken = result.veroAuthToken || null;
        resolve(this.authToken);
      });
    });
  }

  /**
   * Clear authentication
   */
  clearAuth() {
    this.authToken = null;
    chrome.storage.local.remove(['veroAuthToken']);
  }

  /**
   * Make an API request
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Fetch options
   * @returns {Promise<Object>}
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Request failed: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('[Vero API] Request error:', error);
      throw error;
    }
  }

  /**
   * Check if IDE is available
   * @returns {Promise<boolean>}
   */
  async checkConnection() {
    try {
      const response = await fetch(`${this.baseUrl.replace('/api', '')}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      return data.success === true;
    } catch (error) {
      console.warn('[Vero API] IDE not reachable:', error);
      return false;
    }
  }

  /**
   * Login to the IDE
   * @param {string} email
   * @param {string} password
   * @returns {Promise<Object>}
   */
  async login(email, password) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    if (response.data?.token) {
      this.setAuthToken(response.data.token);
    }

    return response;
  }

  /**
   * Get current user info
   * @returns {Promise<Object>}
   */
  async getCurrentUser() {
    return this.request('/auth/me');
  }

  /**
   * Get list of projects
   * @returns {Promise<Array>}
   */
  async getProjects() {
    return this.request('/workflows');
  }

  /**
   * Get test flows for a project
   * @param {string} projectId
   * @returns {Promise<Array>}
   */
  async getTestFlows(projectId) {
    return this.request(`/test-flows?workflowId=${projectId}`);
  }

  /**
   * Import recorded test to IDE
   * @param {Object} data - Recording data
   * @returns {Promise<Object>}
   */
  async importRecording(data) {
    return this.request('/recorder/import', {
      method: 'POST',
      body: JSON.stringify({
        code: data.code,
        pageObjectCode: data.pageObjectCode,
        pageName: data.pageName,
        featureName: data.featureName,
        actions: data.actions,
        url: data.url,
        timestamp: data.timestamp
      })
    });
  }

  /**
   * Import page object to IDE
   * @param {Object} pageObject - Page object data
   * @returns {Promise<Object>}
   */
  async importPageObject(pageObject) {
    return this.request('/recorder/page-object', {
      method: 'POST',
      body: JSON.stringify({
        name: pageObject.name,
        url: pageObject.url,
        fields: pageObject.fields,
        code: pageObject.code
      })
    });
  }

  /**
   * Sync page objects from IDE
   * @returns {Promise<Array>}
   */
  async syncPageObjects() {
    return this.request('/recorder/sync');
  }

  /**
   * Create a new test flow with recorded code
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async createTestFlow(data) {
    return this.request('/test-flows', {
      method: 'POST',
      body: JSON.stringify({
        name: data.name,
        workflowId: data.projectId,
        veroCode: data.code,
        description: data.description || 'Created from Vero Recorder'
      })
    });
  }

  /**
   * Update an existing test flow
   * @param {string} testFlowId
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async updateTestFlow(testFlowId, data) {
    return this.request(`/test-flows/${testFlowId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  /**
   * Get page objects from repository
   * @returns {Promise<Array>}
   */
  async getPageObjects() {
    return this.request('/repositories/objects?type=page');
  }

  /**
   * Save page object to repository
   * @param {Object} pageObject
   * @returns {Promise<Object>}
   */
  async savePageObject(pageObject) {
    return this.request('/repositories/objects', {
      method: 'POST',
      body: JSON.stringify({
        type: 'page',
        name: pageObject.name,
        data: {
          url: pageObject.url,
          fields: pageObject.fields
        }
      })
    });
  }

  /**
   * Parse Vero code on the server
   * @param {string} code
   * @returns {Promise<Object>}
   */
  async parseVeroCode(code) {
    return this.request('/vero/parse', {
      method: 'POST',
      body: JSON.stringify({ code })
    });
  }

  /**
   * Validate Vero code on the server
   * @param {string} code
   * @returns {Promise<Object>}
   */
  async validateVeroCode(code) {
    return this.request('/vero/validate', {
      method: 'POST',
      body: JSON.stringify({ code })
    });
  }

  /**
   * Get IDE settings
   * @returns {Promise<Object>}
   */
  async getSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['veroSettings'], (result) => {
        resolve(result.veroSettings || {
          apiUrl: API_BASE,
          autoSync: false,
          generatePageObjects: true,
          selectorStrategy: 'auto'
        });
      });
    });
  }

  /**
   * Save IDE settings
   * @param {Object} settings
   * @returns {Promise<void>}
   */
  async saveSettings(settings) {
    return new Promise((resolve) => {
      chrome.storage.sync.set({ veroSettings: settings }, resolve);
    });
  }
}

// Create singleton instance
const veroAPI = new VeroAPI();

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.VeroAPI = VeroAPI;
  window.veroAPI = veroAPI;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { VeroAPI, veroAPI };
}
