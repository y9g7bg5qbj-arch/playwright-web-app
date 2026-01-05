/**
 * Code Generation Module Exports
 * Comprehensive exports for the Playwright code generation engine
 */

// Main generators
export { CodeGenerator } from './codeGenerator';
export { POMGenerator } from './pomGenerator';
export { FixturesGenerator } from './fixturesGenerator';
export { ConfigGenerator } from './configGenerator';

// Formatting utilities
export { formatCode, formatCodeFiles, formatGeneratedCode } from './codeFormatter';

// Builder utilities
export { buildLocatorCode, generateLocatorName, escapeString } from './locatorBuilder';
export { interpolateVariables, hasVariables, formatValue, indent } from './variableInterpolation';

// New Locator Generator (from Object Repository)
export {
    generateLocatorCode,
    generateLocatorConfigCode,
    generatePageObjectClass,
    generateFixtures,
    generateAllFromRepository,
} from './locatorGenerator';

// Node generators
export * from './nodeGenerators';

// Legacy exports (for backward compatibility)
export {
    ControlFlowGenerator,
    generateCodeFromFlow,
    generateCode,
} from './controlFlowGenerator';

export * from './dataGenerator';

// Test Data Class Generator (for POJO classes)
export * from './testDataClassGenerator';

