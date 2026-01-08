/**
 * CopilotAgentService - Main orchestration for the Vero Copilot Agent
 *
 * Manages the conversation state machine and coordinates between:
 * - Stagehand (browser exploration)
 * - GraphRAG (codebase intelligence)
 * - Staged Changes (approval workflow)
 */

import { PrismaClient, CopilotSession } from '@prisma/client';
import { EventEmitter } from 'events';
import { StagehandService, type ExplorationResult } from './StagehandService';
import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

// Shared Stagehand instance for the agent
let sharedStagehand: StagehandService | null = null;

// ============================================
// Types
// ============================================

export type AgentState =
  | 'idle'
  | 'analyzing'
  | 'clarifying'
  | 'exploring'
  | 'generating'
  | 'validating'
  | 'reflecting'
  | 'staging'
  | 'awaiting_approval'
  | 'merging'
  | 'complete'
  | 'error';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    state?: AgentState;
    clarification?: ClarificationRequest;
    exploration?: ExplorationUpdate;
    stagedChanges?: string[]; // Change IDs
  };
}

export interface ClarificationRequest {
  id: string;
  question: string;
  options?: ClarificationOption[];
  type: 'selector' | 'action' | 'info' | 'confirmation';
  context?: string;
}

export interface ClarificationOption {
  id: string;
  label: string;
  description?: string;
  screenshot?: string; // Base64 or URL
}

export interface ExplorationUpdate {
  status: 'starting' | 'observing' | 'acting' | 'extracting' | 'completed' | 'failed';
  url?: string;
  screenshot?: string;
  discoveredElements?: DiscoveredElement[];
  message?: string;
}

export interface DiscoveredElement {
  description: string;
  selector: string;
  selectorType: 'testid' | 'role' | 'label' | 'text' | 'css';
  confidence: number;
  screenshot?: string;
  boundingBox?: { x: number; y: number; width: number; height: number };
}

export interface StagedChange {
  id: string;
  filePath: string;
  changeType: 'create' | 'modify' | 'delete';
  diff: string;
  reasoning: string;
  status: 'pending' | 'approved' | 'rejected' | 'modified';
}

export interface AgentTask {
  description: string;
  targetUrl?: string;
  existingContext?: string; // Existing Vero code context
  userPreferences?: Record<string, string>;
}

export interface AnalyzedIntent {
  needsClarification: boolean;
  clarification?: ClarificationRequest;
  needsExploration: boolean;
  targetUrl?: string;
  action?: string;
  elements?: string[];
}

// ============================================
// State Machine Transitions
// ============================================

const STATE_TRANSITIONS: Record<AgentState, AgentState[]> = {
  idle: ['analyzing'],
  analyzing: ['clarifying', 'exploring', 'generating', 'error'],
  clarifying: ['analyzing', 'exploring', 'generating', 'idle', 'error'],
  exploring: ['clarifying', 'generating', 'staging', 'reflecting', 'complete', 'error'],
  generating: ['validating', 'staging', 'complete', 'clarifying', 'error'],
  validating: ['staging', 'reflecting', 'error'],
  reflecting: ['exploring', 'generating', 'clarifying', 'error'],
  staging: ['awaiting_approval', 'error'],
  awaiting_approval: ['merging', 'idle', 'generating', 'error'],
  merging: ['complete', 'error'],
  complete: ['idle'],
  error: ['idle', 'analyzing'],
};

// ============================================
// CopilotAgentService
// ============================================

export class CopilotAgentService extends EventEmitter {
  private sessionId: string;
  private session: CopilotSession | null = null;
  private conversationHistory: Message[] = [];
  private currentTask: AgentTask | null = null;

  constructor(sessionId: string) {
    super();
    this.sessionId = sessionId;
  }

  // ----------------------------------------
  // Session Management
  // ----------------------------------------

  static async createSession(userId: string, projectId: string): Promise<CopilotSession> {
    const session = await prisma.copilotSession.create({
      data: {
        userId,
        projectId,
        state: 'idle',
        conversationJson: '[]',
      },
    });
    return session;
  }

  static async getSession(sessionId: string): Promise<CopilotSession | null> {
    return prisma.copilotSession.findUnique({
      where: { id: sessionId },
      include: {
        stagedChanges: true,
        explorations: true,
      },
    });
  }

  static async deleteSession(sessionId: string): Promise<void> {
    await prisma.copilotSession.delete({
      where: { id: sessionId },
    });
  }

  static async listSessions(userId: string, projectId?: string): Promise<CopilotSession[]> {
    return prisma.copilotSession.findMany({
      where: {
        userId,
        ...(projectId && { projectId }),
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });
  }

  async load(): Promise<void> {
    this.session = await CopilotAgentService.getSession(this.sessionId);
    if (!this.session) {
      throw new Error(`Session ${this.sessionId} not found`);
    }
    this.conversationHistory = JSON.parse(this.session.conversationJson || '[]');
    this.currentTask = this.session.currentTaskJson
      ? JSON.parse(this.session.currentTaskJson)
      : null;
  }

  // ----------------------------------------
  // State Machine
  // ----------------------------------------

  get state(): AgentState {
    return (this.session?.state as AgentState) || 'idle';
  }

  private canTransitionTo(newState: AgentState): boolean {
    const allowedTransitions = STATE_TRANSITIONS[this.state];
    return allowedTransitions?.includes(newState) || false;
  }

  async transitionTo(newState: AgentState, errorMessage?: string): Promise<void> {
    if (!this.canTransitionTo(newState)) {
      throw new Error(`Invalid state transition: ${this.state} -> ${newState}`);
    }

    await prisma.copilotSession.update({
      where: { id: this.sessionId },
      data: {
        state: newState,
        errorMessage: newState === 'error' ? errorMessage : null,
        completedAt: newState === 'complete' ? new Date() : undefined,
      },
    });

    if (this.session) {
      this.session.state = newState;
    }

    this.emit('stateChange', { state: newState, errorMessage });
  }

  // ----------------------------------------
  // Conversation Management
  // ----------------------------------------

  async addMessage(message: Omit<Message, 'id' | 'timestamp'>): Promise<Message> {
    const fullMessage: Message = {
      ...message,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };

    this.conversationHistory.push(fullMessage);

    await prisma.copilotSession.update({
      where: { id: this.sessionId },
      data: {
        conversationJson: JSON.stringify(this.conversationHistory),
      },
    });

    console.log('[Copilot] Emitting message event:', fullMessage.role, fullMessage.id);
    this.emit('message', fullMessage);
    return fullMessage;
  }

  getConversationHistory(): Message[] {
    return [...this.conversationHistory];
  }

  // ----------------------------------------
  // Main Processing
  // ----------------------------------------

  async processUserMessage(content: string): Promise<void> {
    console.log('[Copilot] processUserMessage started:', content.substring(0, 50));
    await this.load();
    console.log('[Copilot] Session loaded, state:', this.state);

    // Add user message
    await this.addMessage({ role: 'user', content });
    console.log('[Copilot] User message added');

    // Transition to analyzing
    await this.transitionTo('analyzing');
    console.log('[Copilot] Transitioned to analyzing');

    try {
      // Emit thinking state
      this.emit('thinking', { message: 'Analyzing your request...' });
      console.log('[Copilot] Emitted thinking event');

      // Parse user intent and determine next action
      const intent = await this.analyzeIntent(content);
      console.log('[Copilot] Intent analyzed:', JSON.stringify(intent));

      if (intent.needsClarification) {
        console.log('[Copilot] Requesting clarification');
        await this.requestClarification(intent.clarification!);
      } else if (intent.needsExploration) {
        console.log('[Copilot] Starting exploration:', intent.targetUrl);
        await this.startExploration(intent.targetUrl!);
      } else {
        console.log('[Copilot] Generating code');
        await this.generateCode(intent);
      }
      console.log('[Copilot] processUserMessage completed');
    } catch (error) {
      console.error('[Copilot] Error in processUserMessage:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      await this.transitionTo('error', errorMsg);
      await this.addMessage({
        role: 'assistant',
        content: `I encountered an error: ${errorMsg}. Please try again or rephrase your request.`,
      });
    }
  }

  async handleClarificationResponse(clarificationId: string, response: string): Promise<void> {
    await this.load();

    // Add user's clarification response
    await this.addMessage({
      role: 'user',
      content: response,
      metadata: { state: 'clarifying' },
    });

    // Re-analyze with the clarification
    // Note: processUserMessage handles the transition to 'analyzing'
    await this.processUserMessage(response);
  }

  // ----------------------------------------
  // Intent Analysis (placeholder - will use LLM)
  // ----------------------------------------

  private async analyzeIntent(content: string): Promise<AnalyzedIntent> {
    // TODO: Replace with actual LLM call using Gemini
    // For now, simple heuristics

    const lowerContent = content.toLowerCase();

    // Check if URL is mentioned (with or without protocol) - case insensitive for Https, HTTP, etc.
    const fullUrlMatch = content.match(/https?:\/\/[^\s]+/i);
    // Also match domains like amazon.com, google.com, example.org, localhost:3000
    const domainMatch = content.match(/(?:^|\s)((?:localhost:\d+)|(?:[\w-]+\.(?:com|org|net|io|dev|co|app|xyz|site|page|ai|edu|gov|uk|ca|de|fr|es|it|nl|be|au|jp|cn|in|br|mx|ru|pl|se|no|dk|fi|at|ch|nz|ie|sg|hk|kr|tw|ph|th|vn|id|my|vn|za|ng|ke|eg|ae|sa|il|tr|gr|pt|cz|hu|ro|bg|sk|si|hr|rs|ua|by|kz|uz|pk|bd|lk|mm|np|vn)[^\s]*))/i);

    let urlMatch = fullUrlMatch?.[0];
    if (!urlMatch && domainMatch) {
      // Add https:// prefix if not present
      urlMatch = domainMatch[1].startsWith('localhost')
        ? `http://${domainMatch[1]}`
        : `https://${domainMatch[1]}`;
    }
    const hasUrl = !!urlMatch;

    // Check for test-related keywords
    const isTestRequest =
      lowerContent.includes('test') ||
      lowerContent.includes('click') ||
      lowerContent.includes('fill') ||
      lowerContent.includes('login') ||
      lowerContent.includes('navigate');

    // If no URL provided but test is requested, ask for URL
    if (isTestRequest && !hasUrl && !this.currentTask?.targetUrl) {
      return {
        needsClarification: true,
        clarification: {
          id: crypto.randomUUID(),
          question: "What's the URL of the page you want to test?",
          type: 'info',
          context: 'I need to know the target URL to explore the page and create your test.',
        },
        needsExploration: false,
      };
    }

    // If URL is provided or already known, proceed to exploration
    if (hasUrl || this.currentTask?.targetUrl) {
      return {
        needsClarification: false,
        needsExploration: true,
        targetUrl: urlMatch || this.currentTask?.targetUrl,
      };
    }

    // Default: ask for more details
    return {
      needsClarification: true,
      clarification: {
        id: crypto.randomUUID(),
        question: 'Could you tell me more about what test you want to create? For example: "Create a login test for https://example.com"',
        type: 'info',
      },
      needsExploration: false,
    };
  }

  // ----------------------------------------
  // Clarification Flow
  // ----------------------------------------

  private async requestClarification(clarification: ClarificationRequest): Promise<void> {
    console.log('[Copilot] requestClarification starting');
    await this.transitionTo('clarifying');
    console.log('[Copilot] Transitioned to clarifying');

    let content = clarification.question;
    if (clarification.options && clarification.options.length > 0) {
      content += '\n\nOptions:\n';
      clarification.options.forEach((opt, i) => {
        content += `${i + 1}. ${opt.label}${opt.description ? ` - ${opt.description}` : ''}\n`;
      });
    }

    console.log('[Copilot] Adding clarification message');
    const msg = await this.addMessage({
      role: 'assistant',
      content,
      metadata: {
        state: 'clarifying',
        clarification,
      },
    });
    console.log('[Copilot] Clarification message added:', msg.id);
  }

  // ----------------------------------------
  // Browser Exploration (placeholder - will use Stagehand)
  // ----------------------------------------

  private async startExploration(url: string): Promise<void> {
    await this.transitionTo('exploring');

    // Save current task
    this.currentTask = {
      description: this.currentTask?.description || 'Browser exploration',
      targetUrl: url,
      existingContext: this.currentTask?.existingContext,
      userPreferences: this.currentTask?.userPreferences,
    };
    await prisma.copilotSession.update({
      where: { id: this.sessionId },
      data: { currentTaskJson: JSON.stringify(this.currentTask) },
    });

    // Create exploration record
    const exploration = await prisma.copilotExploration.create({
      data: {
        sessionId: this.sessionId,
        targetUrl: url,
        status: 'running',
        startedAt: new Date(),
      },
    });

    // Emit exploration start
    this.emit('exploration', {
      status: 'starting',
      url,
      message: `Opening ${url}...`,
    } as ExplorationUpdate);

    await this.addMessage({
      role: 'assistant',
      content: `🔍 Exploring ${url}...\n\nI'm opening the page and analyzing its elements. This may take a moment.`,
      metadata: {
        state: 'exploring',
        exploration: { status: 'starting', url },
      },
    });

    // Run actual Stagehand exploration
    await this.runStagehandExploration(exploration.id, url);
  }

  private async runStagehandExploration(explorationId: string, url: string): Promise<void> {
    try {
      // Fetch user's AI settings from database
      const aiSettings = await prisma.aISettings.findUnique({
        where: { userId: this.session!.userId },
      });

      // Determine model and API key based on provider settings
      let modelName: string;
      let apiKey: string | undefined;

      switch (aiSettings?.provider) {
        case 'gemini':
          modelName = aiSettings?.geminiModel || 'gemini-2.5-pro-preview-03-25';
          apiKey = aiSettings?.geminiApiKey || undefined;
          break;
        case 'openai':
          modelName = aiSettings?.openaiModel || 'gpt-4o';
          apiKey = aiSettings?.openaiApiKey || undefined;
          break;
        case 'anthropic':
          modelName = aiSettings?.anthropicModel || 'claude-sonnet-4-20250514';
          apiKey = aiSettings?.anthropicApiKey || undefined;
          break;
        default:
          modelName = 'gemini-2.5-pro-preview-03-25';
          apiKey = aiSettings?.geminiApiKey || process.env.GOOGLE_GEMINI_API_KEY;
      }

      // Fall back to environment variables if no API key in DB
      if (!apiKey) {
        if (modelName.startsWith('gemini')) {
          apiKey = process.env.GOOGLE_GEMINI_API_KEY;
        } else if (modelName.startsWith('gpt') || modelName.startsWith('o1')) {
          apiKey = process.env.OPENAI_API_KEY;
        } else if (modelName.startsWith('claude')) {
          apiKey = process.env.ANTHROPIC_API_KEY;
        }
      }

      // Close existing Stagehand if settings changed
      if (sharedStagehand) {
        await sharedStagehand.close();
        sharedStagehand = null;
      }

      // Initialize Stagehand with user's settings
      sharedStagehand = new StagehandService({
        modelName,
        apiKey,
        headless: aiSettings?.stagehandHeadless ?? true,
        debugDom: aiSettings?.stagehandDebug ?? false,
        useBrowserbase: aiSettings?.useBrowserbase ?? false,
        browserbaseApiKey: aiSettings?.browserbaseApiKey || undefined,
      });

      // Set up event listeners for real-time updates
      sharedStagehand.on('navigation:complete', ({ screenshot }) => {
        this.emit('exploration', {
          status: 'observing',
          url,
          screenshot,
          message: 'Page loaded, analyzing elements...',
        } as ExplorationUpdate);
      });

      sharedStagehand.on('observe:complete', ({ elements }) => {
        this.emit('exploration', {
          status: 'extracting',
          url,
          message: `Found ${elements.length} interactive elements`,
        } as ExplorationUpdate);
      });

      // Initialize and explore
      await sharedStagehand.initialize();
      const explorationResult = await sharedStagehand.explorePage(url);

      // Convert Stagehand elements to our format
      const discoveredElements: DiscoveredElement[] = explorationResult.elements.map((el) => ({
        description: el.description,
        selector: el.selector,
        selectorType: el.selectorType as DiscoveredElement['selectorType'],
        confidence: el.confidence,
        screenshot: explorationResult.screenshots.full,
        boundingBox: el.boundingBox,
      }));

      // Update exploration record
      await prisma.copilotExploration.update({
        where: { id: explorationId },
        data: {
          status: 'completed',
          resultsJson: JSON.stringify(discoveredElements),
          screenshotsJson: JSON.stringify({
            full: explorationResult.screenshots.full,
          }),
          completedAt: new Date(),
        },
      });

      this.emit('exploration', {
        status: 'completed',
        url,
        screenshot: explorationResult.screenshots.full,
        discoveredElements,
        message: `Found ${discoveredElements.length} interactive elements`,
      } as ExplorationUpdate);

      // Proceed to code generation with real discovered elements
      await this.generateCodeFromExploration(url, explorationResult);

    } catch (error: any) {
      // Update exploration as failed
      await prisma.copilotExploration.update({
        where: { id: explorationId },
        data: {
          status: 'failed',
          errorMessage: error.message,
          completedAt: new Date(),
        },
      });

      this.emit('exploration', {
        status: 'failed',
        url,
        message: `Exploration failed: ${error.message}`,
      } as ExplorationUpdate);

      // Fall back to asking for more info
      await this.transitionTo('clarifying');
      await this.addMessage({
        role: 'assistant',
        content: `I had trouble exploring the page: ${error.message}\n\nCould you provide more details about what elements you want to interact with?`,
      });
    } finally {
      // Clean up Stagehand
      if (sharedStagehand) {
        await sharedStagehand.close();
        sharedStagehand = null;
      }
    }
  }

  private async generateCodeFromExploration(url: string, exploration: ExplorationResult): Promise<void> {
    await this.transitionTo('generating');
    this.emit('thinking', { message: 'Checking existing files and generating Vero code...' });

    // Get project's veroPath
    const veroPath = await this.getProjectVeroPath();
    if (!veroPath) {
      throw new Error('Project veroPath not configured');
    }

    // Build page object from discovered elements
    const pageStructure = exploration.pageStructure;
    const pageName = this.inferPageName(url);

    // Check if page already exists
    const existingPage = await this.findExistingPage(veroPath, url, pageName);

    // Generate fields from inputs and buttons
    const fields: string[] = [];

    pageStructure.inputs.forEach((input, i) => {
      const fieldName = this.camelCase(input.label || input.name || `input${i + 1}`);
      fields.push(`  FIELD ${fieldName} = "${input.selector}"`);
    });

    pageStructure.buttons.forEach((btn, i) => {
      const fieldName = this.camelCase(btn.label || `button${i + 1}`);
      fields.push(`  FIELD ${fieldName} = "${btn.selector}"`);
    });

    // If no structured elements found, use raw discovered elements
    if (fields.length === 0) {
      exploration.elements.slice(0, 10).forEach((el, i) => {
        const fieldName = this.camelCase(el.description || `element${i + 1}`);
        fields.push(`  FIELD ${fieldName} = "${el.selector}"`);
      });
    }

    const pageCode = `PAGE ${pageName} {
${fields.join('\n')}
}`;

    // Generate a basic scenario
    const scenarioSteps: string[] = [`    OPEN "${url}"`];

    // Add fill actions for inputs
    pageStructure.inputs.slice(0, 5).forEach((input) => {
      const fieldName = this.camelCase(input.label || input.name || 'input');
      const placeholder = input.type === 'email' ? 'test@example.com' :
                         input.type === 'password' ? 'password123' : 'test value';
      scenarioSteps.push(`    FILL ${pageName}.${fieldName} WITH "${placeholder}"`);
    });

    // Add click for submit button
    const submitBtn = pageStructure.buttons.find(b => b.type === 'submit');
    if (submitBtn) {
      const btnName = this.camelCase(submitBtn.label || 'submitButton');
      scenarioSteps.push(`    CLICK ${pageName}.${btnName}`);
    }

    scenarioSteps.push('    WAIT FOR 2 SECONDS');

    const featureCode = `FEATURE ${pageName}Test {
  USE ${pageName}

  SCENARIO "User can interact with ${pageName}" {
${scenarioSteps.join('\n')}
  }
}`;

    // Check if feature already exists
    const existingFeature = await this.findExistingFeature(veroPath, pageName);

    // Write files directly to project
    const createdFiles: string[] = [];
    const skippedFiles: string[] = [];

    // Handle page file
    const pageFilePath = join(veroPath, 'pages', `${pageName}.vero`);
    if (existingPage) {
      skippedFiles.push(`pages/${pageName}.vero (already exists)`);
      console.log(`[Copilot] Page already exists: ${existingPage}`);
    } else {
      await mkdir(join(veroPath, 'pages'), { recursive: true });
      await writeFile(pageFilePath, pageCode, 'utf-8');
      createdFiles.push(`pages/${pageName}.vero`);
      console.log(`[Copilot] Created page: ${pageFilePath}`);
    }

    // Handle feature file
    const featureFilePath = join(veroPath, 'features', `${pageName}.feature.vero`);
    if (existingFeature) {
      skippedFiles.push(`features/${pageName}.feature.vero (already exists)`);
      console.log(`[Copilot] Feature already exists: ${existingFeature}`);
    } else {
      await mkdir(join(veroPath, 'features'), { recursive: true });
      await writeFile(featureFilePath, featureCode, 'utf-8');
      createdFiles.push(`features/${pageName}.feature.vero`);
      console.log(`[Copilot] Created feature: ${featureFilePath}`);
    }

    // Emit file creation events for frontend to update editor
    this.emit('filesCreated', {
      veroPath,
      createdFiles,
      skippedFiles,
    });

    // Transition to complete and send summary message
    await this.transitionTo('complete');

    let message = '';
    if (createdFiles.length > 0) {
      message += `✅ Created ${createdFiles.length} file(s):\n`;
      createdFiles.forEach(f => message += `  • ${f}\n`);
    }
    if (skippedFiles.length > 0) {
      message += `\n⏭️ Skipped ${skippedFiles.length} file(s) (already exist):\n`;
      skippedFiles.forEach(f => message += `  • ${f}\n`);
    }
    message += `\n📂 Files are in your project at:\n\`${veroPath}\``;
    message += `\n\nThe files should now appear in your editor. You can modify them as needed.`;

    await this.addMessage({
      role: 'assistant',
      content: message,
      metadata: { state: 'complete' },
    });
  }

  /**
   * Get the veroPath for the current session's project/application
   */
  private async getProjectVeroPath(): Promise<string | null> {
    if (!this.session) return null;

    // First try to find as a project
    const project = await prisma.project.findUnique({
      where: { id: this.session.projectId },
      select: { veroPath: true },
    });

    if (project?.veroPath) {
      return project.veroPath;
    }

    // If not a project, check if it's an application and use default veroPath
    const application = await prisma.application.findUnique({
      where: { id: this.session.projectId },
    });

    if (application) {
      // Use default vero project path for applications
      const defaultPath = process.env.VERO_PROJECT_PATH ||
        join(process.cwd(), '..', 'vero-lang', 'test-project');
      console.log(`[Copilot] Using default veroPath for application: ${defaultPath}`);
      return defaultPath;
    }

    // Final fallback to environment variable
    return process.env.VERO_PROJECT_PATH || null;
  }

  /**
   * Find if a page file already exists for this URL or page name
   */
  private async findExistingPage(veroPath: string, url: string, pageName: string): Promise<string | null> {
    const pagesDir = join(veroPath, 'pages');

    if (!existsSync(pagesDir)) return null;

    try {
      const files = await readdir(pagesDir);

      // Check for exact page name match
      const exactMatch = files.find(f =>
        f.toLowerCase() === `${pageName.toLowerCase()}.vero` ||
        f.toLowerCase() === `${pageName.toLowerCase()}.page.vero`
      );
      if (exactMatch) return join(pagesDir, exactMatch);

      // Check file contents for matching URL
      for (const file of files) {
        if (!file.endsWith('.vero')) continue;

        const content = await readFile(join(pagesDir, file), 'utf-8');

        // Check if the URL is referenced in the page
        const urlObj = new URL(url);
        if (content.includes(urlObj.hostname) || content.includes(url)) {
          return join(pagesDir, file);
        }
      }

      return null;
    } catch (error) {
      console.error('[Copilot] Error checking existing pages:', error);
      return null;
    }
  }

  /**
   * Find if a feature file already exists for this page
   */
  private async findExistingFeature(veroPath: string, pageName: string): Promise<string | null> {
    const featuresDir = join(veroPath, 'features');

    if (!existsSync(featuresDir)) return null;

    try {
      const files = await readdir(featuresDir);

      // Check for matching feature file
      const match = files.find(f =>
        f.toLowerCase().includes(pageName.toLowerCase()) &&
        f.endsWith('.vero')
      );

      return match ? join(featuresDir, match) : null;
    } catch (error) {
      console.error('[Copilot] Error checking existing features:', error);
      return null;
    }
  }

  private inferPageName(url: string): string {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname.replace(/^\/|\/$/g, '');
      if (path) {
        // Convert path to PascalCase
        return path
          .split(/[\/\-_]/)
          .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
          .join('') + 'Page';
      }
      // Use hostname for homepage
      return urlObj.hostname.split('.')[0].charAt(0).toUpperCase() +
             urlObj.hostname.split('.')[0].slice(1) + 'HomePage';
    } catch {
      return 'TestPage';
    }
  }

  private camelCase(str: string): string {
    return str
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .split(/\s+/)
      .map((word, i) =>
        i === 0
          ? word.toLowerCase()
          : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      )
      .join('');
  }

  // ----------------------------------------
  // Code Generation (placeholder - will use LLM)
  // ----------------------------------------

  private async generateCode(intent: {
    targetUrl?: string;
    elements?: string[];
    action?: string;
  }): Promise<void> {
    await this.transitionTo('generating');

    this.emit('thinking', { message: 'Generating Vero code...' });

    // TODO: Replace with actual LLM-generated code
    const generatedCode = `PAGE LoginPage {
  FIELD emailInput = "[data-testid='email-input']"
  FIELD passwordInput = "[data-testid='password-input']"
  FIELD loginButton = "button[type='submit']"
}

FEATURE Login {
  USE LoginPage

  SCENARIO "User can login successfully" {
    OPEN "${intent.targetUrl || 'https://example.com'}"
    FILL LoginPage.emailInput WITH "test@example.com"
    FILL LoginPage.passwordInput WITH "password123"
    CLICK LoginPage.loginButton
    WAIT FOR 2 SECONDS
    VERIFY URL CONTAINS "/dashboard"
  }
}`;

    // Create staged change
    await this.stageChanges([
      {
        filePath: 'features/Login.feature.vero',
        changeType: 'create',
        newContent: generatedCode,
        reasoning: 'Generated login test based on discovered page elements',
      },
    ]);
  }

  // ----------------------------------------
  // Staged Changes
  // ----------------------------------------

  private async stageChanges(
    changes: Array<{
      filePath: string;
      changeType: 'create' | 'modify' | 'delete';
      newContent: string;
      reasoning: string;
    }>
  ): Promise<void> {
    await this.transitionTo('staging');

    const stagedChangeIds: string[] = [];

    for (const change of changes) {
      const stagedChange = await prisma.copilotStagedChange.create({
        data: {
          sessionId: this.sessionId,
          filePath: change.filePath,
          changeType: change.changeType,
          newContent: change.newContent,
          reasoningJson: JSON.stringify({ explanation: change.reasoning }),
          status: 'pending',
        },
      });
      stagedChangeIds.push(stagedChange.id);
    }

    await this.transitionTo('awaiting_approval');

    // Format diff for display
    const diffDisplay = changes
      .map(c => {
        return `📁 ${c.changeType === 'create' ? 'NEW' : c.changeType.toUpperCase()}: ${c.filePath}\n\n\`\`\`vero\n${c.newContent}\n\`\`\``;
      })
      .join('\n\n---\n\n');

    await this.addMessage({
      role: 'assistant',
      content: `✨ I've generated the following changes:\n\n${diffDisplay}\n\n**Please review and approve or reject these changes.**`,
      metadata: {
        state: 'awaiting_approval',
        stagedChanges: stagedChangeIds,
      },
    });

    this.emit('stagedChanges', { changeIds: stagedChangeIds });
  }

  // ----------------------------------------
  // Approval Workflow
  // ----------------------------------------

  async approveChange(changeId: string): Promise<void> {
    await prisma.copilotStagedChange.update({
      where: { id: changeId },
      data: { status: 'approved' },
    });

    this.emit('changeApproved', { changeId });

    // Check if all changes are approved
    await this.checkAllChangesResolved();
  }

  async rejectChange(changeId: string, feedback?: string): Promise<void> {
    await prisma.copilotStagedChange.update({
      where: { id: changeId },
      data: {
        status: 'rejected',
        userFeedback: feedback,
      },
    });

    this.emit('changeRejected', { changeId, feedback });

    if (feedback) {
      // Re-process with feedback
      await this.addMessage({
        role: 'user',
        content: `I rejected this change. ${feedback}`,
      });
      await this.transitionTo('reflecting');
      // Increment reflection count
      await prisma.copilotSession.update({
        where: { id: this.sessionId },
        data: { reflectionCount: { increment: 1 } },
      });
    }

    await this.checkAllChangesResolved();
  }

  async approveAllChanges(): Promise<void> {
    await prisma.copilotStagedChange.updateMany({
      where: { sessionId: this.sessionId, status: 'pending' },
      data: { status: 'approved' },
    });

    await this.mergeApprovedChanges();
  }

  private async checkAllChangesResolved(): Promise<void> {
    const pendingChanges = await prisma.copilotStagedChange.count({
      where: { sessionId: this.sessionId, status: 'pending' },
    });

    if (pendingChanges === 0) {
      const approvedChanges = await prisma.copilotStagedChange.count({
        where: { sessionId: this.sessionId, status: 'approved' },
      });

      if (approvedChanges > 0) {
        await this.mergeApprovedChanges();
      } else {
        // All rejected, go back to idle
        await this.transitionTo('idle');
        await this.addMessage({
          role: 'assistant',
          content: 'All changes were rejected. Let me know if you want to try again with different requirements.',
        });
      }
    }
  }

  private async mergeApprovedChanges(): Promise<void> {
    await this.transitionTo('merging');

    const approvedChanges = await prisma.copilotStagedChange.findMany({
      where: { sessionId: this.sessionId, status: 'approved' },
    });

    // TODO: Actually write files to disk
    // For now, just emit the changes
    this.emit('merging', { changes: approvedChanges });

    await this.transitionTo('complete');

    const fileList = approvedChanges.map(c => `- ${c.filePath}`).join('\n');
    await this.addMessage({
      role: 'assistant',
      content: `✅ Changes merged successfully!\n\n${fileList}\n\nYour test is ready. Would you like to run it?`,
    });

    this.emit('mergeComplete', { changes: approvedChanges });
  }

  // ----------------------------------------
  // Utilities
  // ----------------------------------------

  async reset(): Promise<void> {
    await prisma.copilotSession.update({
      where: { id: this.sessionId },
      data: {
        state: 'idle',
        conversationJson: '[]',
        currentTaskJson: null,
        reflectionCount: 0,
        errorMessage: null,
      },
    });

    // Delete all staged changes and explorations
    await prisma.copilotStagedChange.deleteMany({
      where: { sessionId: this.sessionId },
    });
    await prisma.copilotExploration.deleteMany({
      where: { sessionId: this.sessionId },
    });

    this.conversationHistory = [];
    this.currentTask = null;

    this.emit('reset');
  }
}

export default CopilotAgentService;
