/**
 * Selector Services
 *
 * Provides robust selector extraction and Vero code generation
 * for test recording.
 */

export {
  SELECTOR_EXTRACTOR_SCRIPT,
  injectSelectorExtractor,
  extractSelectorsFromElement,
  extractSelectorsFromPoint,
  type ExtractedSelectors,
} from './selectorExtractor';

export {
  buildVeroGenerationPrompt,
  generateVeroCodeSimple,
  type GeneratedVeroCode,
} from './VeroGenerator';
