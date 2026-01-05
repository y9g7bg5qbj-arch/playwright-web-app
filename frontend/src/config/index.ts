/**
 * Application Configuration
 * 
 * Centralized configuration for the Vero IDE frontend.
 * Edit these values to connect to different backends/databases.
 */

interface AppConfig {
    // Backend API base URL
    apiBaseUrl: string;

    // WebSocket URL (for real-time execution updates)
    wsBaseUrl: string;

    // Feature flags
    features: {
        dataTables: boolean;
        googleSheetsIntegration: boolean;
        databaseConnector: boolean;
    };
}

// Default configuration - can be overridden by environment or localStorage
const defaultConfig: AppConfig = {
    apiBaseUrl: 'http://localhost:3000',
    wsBaseUrl: 'ws://localhost:3000',
    features: {
        dataTables: true,
        googleSheetsIntegration: false,
        databaseConnector: false,
    },
};

// Try to load from localStorage for runtime configuration
function loadConfig(): AppConfig {
    try {
        const saved = localStorage.getItem('vero_config');
        if (saved) {
            return { ...defaultConfig, ...JSON.parse(saved) };
        }
    } catch (e) {
        console.warn('Failed to load config from localStorage:', e);
    }
    return defaultConfig;
}

// Export the active configuration
export const config = loadConfig();

// Helper to update config at runtime (persists to localStorage)
export function updateConfig(updates: Partial<AppConfig>): void {
    Object.assign(config, updates);
    localStorage.setItem('vero_config', JSON.stringify(config));
}

// Helper to get API URL with path
export function apiUrl(path: string): string {
    return `${config.apiBaseUrl}${path.startsWith('/') ? path : '/' + path}`;
}
