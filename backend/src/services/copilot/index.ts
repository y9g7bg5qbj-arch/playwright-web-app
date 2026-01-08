/**
 * Vero Copilot Services
 *
 * AI-powered test automation assistant for the Vero IDE
 */

export {
  CopilotAgentService,
  type AgentState,
  type Message,
  type ClarificationRequest,
  type ClarificationOption,
  type ExplorationUpdate,
  type DiscoveredElement,
  type StagedChange,
  type AgentTask,
} from './CopilotAgentService.js';

export {
  StagehandService,
  stagehandService,
  type DiscoveredElement as StagehandDiscoveredElement,
  type ExplorationResult,
  type ActResult,
  type ExtractResult,
  type StagehandConfig,
} from './StagehandService.js';

// Future exports:
// export { GraphRAGService } from './GraphRAGService.js';
// export { StagedChangesService } from './StagedChangesService.js';
