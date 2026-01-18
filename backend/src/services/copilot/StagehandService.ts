/**
 * StagehandService - Browser exploration using Stagehand + Gemini
 *
 * Provides intelligent browser automation for the Vero Copilot Agent:
 * - observe() - Capture page state and identify interactive elements
 * - act() - Execute actions with self-healing selectors
 * - extract() - Pull structured data from pages
 *
 * NOTE: Stagehand is loaded dynamically to avoid Node.js v25 compatibility issues
 */

// Dynamic import type for Stagehand
type StagehandModule = typeof import('@browserbasehq/stagehand');
type Stagehand = InstanceType<StagehandModule['Stagehand']>;
type Page = Awaited<ReturnType<Stagehand['context']['activePage']>>;

import { z } from 'zod';
import { EventEmitter } from 'events';
import { logger } from '../../utils/logger';

// Lazy-loaded stagehand module
let stagehandModule: StagehandModule | null = null;

async function loadStagehand(): Promise<StagehandModule> {
  if (!stagehandModule) {
    try {
      stagehandModule = await import('@browserbasehq/stagehand');
    } catch (error: any) {
      logger.error('Failed to load Stagehand module:', error.message);
      throw new Error(`Stagehand module failed to load: ${error.message}. This may be a Node.js version compatibility issue.`);
    }
  }
  return stagehandModule;
}

// ============================================
// Types
// ============================================

export interface DiscoveredElement {
  description: string;
  selector: string;
  selectorType: 'testid' | 'role' | 'label' | 'text' | 'css' | 'xpath';
  confidence: number;
  tagName: string;
  attributes: Record<string, string>;
  boundingBox?: { x: number; y: number; width: number; height: number };
  isInteractive: boolean;
  inputType?: string; // For input elements
}

export interface ExplorationResult {
  url: string;
  title: string;
  elements: DiscoveredElement[];
  screenshots: {
    full: string; // Base64
    annotated?: string; // With element highlights
  };
  pageStructure: {
    forms: FormInfo[];
    navigation: NavigationInfo[];
    buttons: ButtonInfo[];
    inputs: InputInfo[];
  };
}

export interface FormInfo {
  name?: string;
  fields: string[];
  submitButton?: string;
}

export interface NavigationInfo {
  label: string;
  href: string;
}

export interface ButtonInfo {
  label: string;
  selector: string;
  type: 'submit' | 'button' | 'link';
}

export interface InputInfo {
  label?: string;
  name?: string;
  type: string;
  selector: string;
  required: boolean;
}

export interface ActResult {
  success: boolean;
  action: string;
  selector?: string;
  error?: string;
  screenshot?: string;
  urlAfter?: string;
}

export interface ExtractResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface StagehandConfig {
  modelName?: string;
  apiKey?: string;
  headless?: boolean;
  debugDom?: boolean;
  enableCaching?: boolean;
  useBrowserbase?: boolean;
  browserbaseApiKey?: string;
}

// ============================================
// StagehandService
// ============================================

export class StagehandService extends EventEmitter {
  private stagehand: Stagehand | null = null;
  private isInitialized = false;
  private config: StagehandConfig;

  constructor(config: StagehandConfig = {}) {
    super();
    this.config = {
      modelName: config.modelName || 'google/gemini-3-flash-preview',
      apiKey: config.apiKey,
      headless: config.headless ?? true,
      debugDom: config.debugDom ?? false,
      enableCaching: config.enableCaching ?? true,
      useBrowserbase: config.useBrowserbase ?? false,
      browserbaseApiKey: config.browserbaseApiKey,
    };
  }

  // ----------------------------------------
  // Lifecycle
  // ----------------------------------------

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Dynamically load Stagehand to avoid startup crashes on Node.js v25
      const { Stagehand } = await loadStagehand();

      const modelName = this.config.modelName || 'google/gemini-3-flash-preview';
      const isGemini = modelName.startsWith('gemini') || modelName.includes('gemini');
      const isOpenAI = modelName.startsWith('gpt') || modelName.startsWith('o1');
      const isAnthropic = modelName.startsWith('claude');

      logger.info(`Initializing Stagehand with model: ${modelName}`);

      // Build Stagehand configuration
      const stagehandConfig: any = {
        env: this.config.useBrowserbase ? 'BROWSERBASE' : 'LOCAL',
        model: modelName,
        verbose: this.config.debugDom ? 2 : 0,
      };

      // Add local browser options if not using Browserbase
      if (!this.config.useBrowserbase) {
        stagehandConfig.localBrowserLaunchOptions = {
          headless: this.config.headless,
        };
      }

      // Add model client options with API key based on provider
      if (this.config.apiKey) {
        if (isGemini) {
          stagehandConfig.modelClientOptions = {
            apiKey: this.config.apiKey,
          };
        } else if (isOpenAI) {
          stagehandConfig.modelClientOptions = {
            apiKey: this.config.apiKey,
          };
        } else if (isAnthropic) {
          stagehandConfig.modelClientOptions = {
            apiKey: this.config.apiKey,
          };
        }
      }

      // Add Browserbase API key if using cloud browser
      if (this.config.useBrowserbase && this.config.browserbaseApiKey) {
        stagehandConfig.browserbaseApiKey = this.config.browserbaseApiKey;
      }

      this.stagehand = new Stagehand(stagehandConfig) as Stagehand;

      await this.stagehand.init();
      this.isInitialized = true;

      logger.info('Stagehand initialized successfully');
      this.emit('initialized');
    } catch (error) {
      logger.error('Failed to initialize Stagehand:', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.stagehand) {
      await this.stagehand.close();
      this.stagehand = null;
      this.isInitialized = false;
      this.emit('closed');
    }
  }

  private ensureInitialized(): void {
    if (!this.isInitialized || !this.stagehand) {
      throw new Error('StagehandService not initialized. Call initialize() first.');
    }
  }

  // ----------------------------------------
  // Navigation
  // ----------------------------------------

  private getPage(): Page {
    const page = this.stagehand!.context.activePage();
    if (!page) {
      throw new Error('No page available');
    }
    return page;
  }

  /**
   * Get the active page for external use (e.g., browser capture)
   */
  getActivePage(): Page | null {
    if (!this.stagehand) return null;
    return this.stagehand.context.activePage() || null;
  }

  /**
   * Get the browser context for external use (e.g., browser capture)
   */
  getBrowserContext(): any {
    if (!this.stagehand) return null;
    return this.stagehand.context;
  }

  async navigateTo(url: string): Promise<{ success: boolean; screenshot?: string }> {
    this.ensureInitialized();

    try {
      logger.info(`Navigating to: ${url}`);
      this.emit('navigation:start', { url });

      const page = this.getPage();
      await page.goto(url);

      // Take screenshot after navigation
      const screenshot = await this.takeScreenshot();

      this.emit('navigation:complete', { url, screenshot });

      return { success: true, screenshot };
    } catch (error: any) {
      logger.error('Navigation failed:', error);
      this.emit('navigation:error', { url, error: error.message });
      return { success: false };
    }
  }

  // ----------------------------------------
  // Observe - Discover page elements
  // ----------------------------------------

  async observe(instruction?: string): Promise<DiscoveredElement[]> {
    this.ensureInitialized();

    try {
      logger.info('Observing page elements...');
      this.emit('observe:start', { instruction });

      const observeInstruction = instruction || 'Identify all interactive elements on this page including buttons, links, input fields, and forms.';

      // Use Stagehand's observe to identify elements (v3 API)
      const observations = await this.stagehand!.observe(observeInstruction);

      // Map Stagehand observations to our format
      const elements: DiscoveredElement[] = observations.map((obs: any) => ({
        description: obs.description || obs.selector,
        selector: obs.selector,
        selectorType: this.determineSelectorType(obs.selector),
        confidence: 0.8,
        tagName: 'unknown',
        attributes: {},
        isInteractive: true,
      }));

      logger.info(`Discovered ${elements.length} elements`);
      this.emit('observe:complete', { elements });

      return elements;
    } catch (error: any) {
      logger.error('Observe failed:', error);
      this.emit('observe:error', { error: error.message });
      return [];
    }
  }

  // ----------------------------------------
  // Act - Execute actions
  // ----------------------------------------

  async act(instruction: string): Promise<ActResult> {
    this.ensureInitialized();

    try {
      logger.info(`Executing action: ${instruction}`);
      this.emit('act:start', { instruction });

      const page = this.getPage();
      const urlBefore = await page.url();

      // Use Stagehand's act to perform the action (v3 API)
      const actResult = await this.stagehand!.act(instruction);

      const urlAfter = await page.url();
      const screenshot = await this.takeScreenshot();

      const result: ActResult = {
        success: actResult.success,
        action: instruction,
        screenshot,
        urlAfter: urlAfter !== urlBefore ? urlAfter : undefined,
      };

      this.emit('act:complete', result);
      return result;
    } catch (error: any) {
      logger.error('Action failed:', error);

      const result: ActResult = {
        success: false,
        action: instruction,
        error: error.message,
      };

      this.emit('act:error', result);
      return result;
    }
  }

  // ----------------------------------------
  // Extract - Pull structured data
  // ----------------------------------------

  async extract<T>(instruction: string, schema: z.ZodSchema<T>): Promise<ExtractResult<T>> {
    this.ensureInitialized();

    try {
      logger.info(`Extracting data: ${instruction}`);
      this.emit('extract:start', { instruction });

      // Use Stagehand's extract with v3 API
      const data = await this.stagehand!.extract(instruction, schema as any);

      const result: ExtractResult<T> = {
        success: true,
        data: data as T,
      };

      this.emit('extract:complete', result);
      return result;
    } catch (error: any) {
      logger.error('Extraction failed:', error);

      const result: ExtractResult<T> = {
        success: false,
        error: error.message,
      };

      this.emit('extract:error', result);
      return result;
    }
  }

  // ----------------------------------------
  // Full Page Exploration
  // ----------------------------------------

  async explorePage(url: string): Promise<ExplorationResult> {
    this.ensureInitialized();

    try {
      logger.info(`Starting full page exploration: ${url}`);
      this.emit('exploration:start', { url });

      // Navigate to the page
      await this.navigateTo(url);

      // Take full page screenshot
      const fullScreenshot = await this.takeScreenshot();

      // Get page title
      const page = this.getPage();
      const title = await page.title();

      // Observe all interactive elements
      const elements = await this.observe();

      // Extract page structure using schema
      const pageStructure = await this.extractPageStructure();

      const result: ExplorationResult = {
        url,
        title,
        elements,
        screenshots: {
          full: fullScreenshot,
        },
        pageStructure,
      };

      this.emit('exploration:complete', result);
      return result;
    } catch (error: any) {
      logger.error('Page exploration failed:', error);
      this.emit('exploration:error', { url, error: error.message });
      throw error;
    }
  }

  // ----------------------------------------
  // Helpers
  // ----------------------------------------

  async takeScreenshot(): Promise<string> {
    this.ensureInitialized();

    const page = this.getPage();
    const buffer = await page.screenshot({
      type: 'png',
      fullPage: false,
    });

    return buffer.toString('base64');
  }

  private determineSelectorType(selector: string): DiscoveredElement['selectorType'] {
    if (selector.startsWith('[data-testid=')) return 'testid';
    if (selector.startsWith('[role=')) return 'role';
    if (selector.startsWith('[aria-label=')) return 'label';
    if (selector.startsWith('text=') || selector.startsWith('"')) return 'text';
    if (selector.startsWith('//') || selector.startsWith('xpath=')) return 'xpath';
    return 'css';
  }

  private async extractPageStructure(): Promise<ExplorationResult['pageStructure']> {
    // Define schemas for extraction
    const FormsSchema = z.object({
      forms: z.array(
        z.object({
          name: z.string().optional(),
          fields: z.array(z.string()),
          submitButton: z.string().optional(),
        })
      ),
    });

    const NavigationSchema = z.object({
      links: z.array(
        z.object({
          label: z.string(),
          href: z.string(),
        })
      ),
    });

    const ButtonsSchema = z.object({
      buttons: z.array(
        z.object({
          label: z.string(),
          selector: z.string(),
          type: z.enum(['submit', 'button', 'link']),
        })
      ),
    });

    const InputsSchema = z.object({
      inputs: z.array(
        z.object({
          label: z.string().optional(),
          name: z.string().optional(),
          type: z.string(),
          selector: z.string(),
          required: z.boolean(),
        })
      ),
    });

    // Extract each structure type
    const [formsResult, navResult, buttonsResult, inputsResult] = await Promise.all([
      this.extract('Find all forms on the page with their fields', FormsSchema).catch(() => ({
        success: false,
        data: { forms: [] },
      })),
      this.extract('Find all navigation links', NavigationSchema).catch(() => ({
        success: false,
        data: { links: [] },
      })),
      this.extract('Find all buttons and clickable elements', ButtonsSchema).catch(() => ({
        success: false,
        data: { buttons: [] },
      })),
      this.extract('Find all input fields', InputsSchema).catch(() => ({
        success: false,
        data: { inputs: [] },
      })),
    ]);

    return {
      forms: formsResult.data?.forms || [],
      navigation: navResult.data?.links || [],
      buttons: buttonsResult.data?.buttons || [],
      inputs: inputsResult.data?.inputs || [],
    };
  }

  // ----------------------------------------
  // Generate Vero Selectors
  // ----------------------------------------

  generateVeroSelector(element: DiscoveredElement): string {
    // Prioritize selectors in order of reliability:
    // 1. data-testid
    // 2. role + name
    // 3. label
    // 4. text content
    // 5. CSS selector

    const attrs = element.attributes;

    if (attrs['data-testid']) {
      return `[data-testid='${attrs['data-testid']}']`;
    }

    if (attrs['role'] && attrs['aria-label']) {
      return `role=${attrs['role']}[name="${attrs['aria-label']}"]`;
    }

    if (attrs['id']) {
      return `#${attrs['id']}`;
    }

    if (element.selectorType === 'text' && element.description) {
      return `text="${element.description}"`;
    }

    return element.selector;
  }

  // ----------------------------------------
  // Best Selector for Element Description
  // ----------------------------------------

  async findBestSelector(description: string): Promise<string | null> {
    this.ensureInitialized();

    try {
      // Use observe to find the element matching the description (v3 API)
      const observations = await this.stagehand!.observe(
        `Find the element that best matches: "${description}"`
      );

      if (observations.length > 0) {
        const best = observations[0];
        return best.selector;
      }

      return null;
    } catch (error) {
      logger.error('Failed to find selector:', error);
      return null;
    }
  }
}

// Export singleton for convenience
export const stagehandService = new StagehandService();

export default StagehandService;
