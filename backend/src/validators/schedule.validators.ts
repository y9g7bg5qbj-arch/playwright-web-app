/**
 * Schedule Validation
 * Input validation for schedule-related endpoints
 */

import { body, param, query, CustomValidator } from 'express-validator';
import { validateCronExpression } from '../services/scheduler/cronParser';

// =============================================
// Custom Validators
// =============================================

/**
 * Validate cron expression using the full-featured parser
 */
const isValidCronExpression: CustomValidator = (value: string) => {
  const result = validateCronExpression(value);
  if (!result.valid) {
    throw new Error(result.error || 'Invalid cron expression');
  }
  return true;
};

/**
 * Validate timezone using Intl API
 */
const isValidTimezone: CustomValidator = (value: string) => {
  try {
    // Check if timezone is valid by attempting to use it
    Intl.DateTimeFormat(undefined, { timeZone: value });
    return true;
  } catch {
    throw new Error(`Invalid timezone: ${value}`);
  }
};

/**
 * Validate tag format (alphanumeric with optional @ prefix, hyphens, underscores)
 */
const isValidTag: CustomValidator = (value: string) => {
  const tagPattern = /^@?[\w-]+$/;
  if (!tagPattern.test(value)) {
    throw new Error(`Invalid tag format: ${value}. Tags must be alphanumeric with optional @ prefix`);
  }
  return true;
};

/**
 * Validate folder/glob pattern
 */
const isValidGlobPattern: CustomValidator = (value: string) => {
  // Basic validation - should not be empty and should not contain dangerous patterns
  if (!value || value.trim() === '') {
    throw new Error('Pattern cannot be empty');
  }
  // Prevent path traversal
  if (value.includes('..')) {
    throw new Error('Pattern cannot contain path traversal (..)');
  }
  return true;
};

/**
 * Validate webhook URL (must be HTTPS in production)
 */
const isValidWebhookUrl: CustomValidator = (value: string) => {
  try {
    const url = new URL(value);
    // In production, require HTTPS
    if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
      throw new Error('Webhook URL must use HTTPS in production');
    }
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('Webhook URL must use HTTP or HTTPS protocol');
    }
    return true;
  } catch (e: any) {
    if (e.message.includes('Webhook URL')) {
      throw e;
    }
    throw new Error(`Invalid webhook URL: ${value}`);
  }
};

// =============================================
// Validation Chains
// =============================================

/**
 * Validation for creating a schedule
 */
export const createScheduleValidation = [
  // Name validation
  body('name')
    .notEmpty().withMessage('Schedule name is required')
    .isString().withMessage('Schedule name must be a string')
    .isLength({ min: 1, max: 100 }).withMessage('Schedule name must be 1-100 characters')
    .trim(),

  // Description validation
  body('description')
    .optional()
    .isString().withMessage('Description must be a string')
    .isLength({ max: 500 }).withMessage('Description must not exceed 500 characters')
    .trim(),

  // Cron expression validation
  body('cronExpression')
    .notEmpty().withMessage('Cron expression is required')
    .isString().withMessage('Cron expression must be a string')
    .trim()
    .custom(isValidCronExpression),

  // Timezone validation
  body('timezone')
    .optional()
    .isString().withMessage('Timezone must be a string')
    .custom(isValidTimezone),

  // Workflow ID validation
  body('workflowId')
    .notEmpty().withMessage('workflowId is required')
    .isString().withMessage('Workflow ID must be a string'),

  // Project scope validation
  body('projectId')
    .notEmpty().withMessage('projectId is required')
    .isString().withMessage('projectId must be a string'),

  body('scopeFolder')
    .notEmpty().withMessage('scopeFolder is required')
    .isIn(['dev', 'master', 'sandboxes']).withMessage('scopeFolder must be one of: dev, master, sandboxes'),

  body('scopeSandboxId')
    .if(body('scopeFolder').equals('sandboxes'))
    .notEmpty().withMessage('scopeSandboxId is required when scopeFolder is sandboxes')
    .isString().withMessage('scopeSandboxId must be a string'),

  // Linked run configuration (optional when scheduleRunConfiguration is provided)
  body('runConfigurationId')
    .optional()
    .isString().withMessage('runConfigurationId must be a string'),

  // Inline run configuration for scheduler-owned configs
  body('scheduleRunConfiguration')
    .optional()
    .isObject().withMessage('scheduleRunConfiguration must be an object'),

  body('scheduleRunConfiguration.name')
    .optional()
    .isString().withMessage('Run configuration name must be a string'),

  // Cross-field: require at least one of runConfigurationId or scheduleRunConfiguration
  body()
    .custom((_, { req }) => {
      const hasId = req.body?.runConfigurationId && typeof req.body.runConfigurationId === 'string' && req.body.runConfigurationId.trim() !== '';
      const hasInline = req.body?.scheduleRunConfiguration && typeof req.body.scheduleRunConfiguration === 'object';
      if (!hasId && !hasInline) {
        throw new Error('Either runConfigurationId or scheduleRunConfiguration is required');
      }
      return true;
    }),

  // isActive validation
  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive must be a boolean'),

  // Concurrency policy validation
  body('concurrencyPolicy')
    .optional()
    .isIn(['allow', 'forbid']).withMessage('concurrencyPolicy must be one of: allow, forbid'),

  // Chained schedules (P1.2)
  body('onSuccessTriggerScheduleIds')
    .optional()
    .isArray({ max: 10 }).withMessage('onSuccessTriggerScheduleIds must be an array with at most 10 entries'),

  body('onSuccessTriggerScheduleIds.*')
    .isString().withMessage('Each chained schedule ID must be a string')
    .isLength({ min: 1 }).withMessage('Chained schedule ID cannot be empty'),

  // TestSelector validation
  body('testSelector')
    .optional()
    .isObject().withMessage('testSelector must be an object'),

  body('testSelector.tags')
    .optional()
    .isArray().withMessage('testSelector.tags must be an array'),

  body('testSelector.tags.*')
    .optional()
    .isString().withMessage('Each tag must be a string')
    .custom(isValidTag),

  body('testSelector.folders')
    .optional()
    .isArray().withMessage('testSelector.folders must be an array'),

  body('testSelector.folders.*')
    .optional()
    .isString().withMessage('Each folder must be a string')
    .custom(isValidGlobPattern),

  body('testSelector.patterns')
    .optional()
    .isArray().withMessage('testSelector.patterns must be an array'),

  body('testSelector.patterns.*')
    .optional()
    .isString().withMessage('Each pattern must be a string')
    .custom(isValidGlobPattern),

  body('testSelector.testFlowIds')
    .optional()
    .isArray().withMessage('testSelector.testFlowIds must be an array'),

  body('testSelector.testFlowIds.*')
    .optional()
    .isString().withMessage('Each testFlowId must be a string'),

  // Notification config validation
  body('notificationConfig')
    .optional()
    .isObject().withMessage('notificationConfig must be an object'),

  body('notificationConfig.email')
    .optional()
    .isArray().withMessage('notificationConfig.email must be an array'),

  body('notificationConfig.email.*')
    .optional()
    .isEmail().withMessage('Each email must be a valid email address'),

  body('notificationConfig.slack')
    .optional()
    .isObject().withMessage('notificationConfig.slack must be an object'),

  body('notificationConfig.slack.webhook')
    .optional()
    .isString().withMessage('Slack webhook must be a string')
    .custom(isValidWebhookUrl),

  body('notificationConfig.slack.channel')
    .optional()
    .isString().withMessage('Slack channel must be a string')
    .isLength({ max: 100 }).withMessage('Slack channel must not exceed 100 characters'),

  body('notificationConfig.onFailureOnly')
    .optional()
    .isBoolean().withMessage('onFailureOnly must be a boolean'),

  body('notificationConfig.includeArtifacts')
    .optional()
    .isBoolean().withMessage('includeArtifacts must be a boolean'),
];

/**
 * Validation for updating a schedule
 */
export const updateScheduleValidation = [
  // ID param validation
  param('id')
    .notEmpty().withMessage('Schedule ID is required')
    .isString().withMessage('Schedule ID must be a string'),

  // Name validation (optional for update)
  body('name')
    .optional()
    .isString().withMessage('Schedule name must be a string')
    .isLength({ min: 1, max: 100 }).withMessage('Schedule name must be 1-100 characters')
    .trim(),

  // Description validation
  body('description')
    .optional()
    .isString().withMessage('Description must be a string')
    .isLength({ max: 500 }).withMessage('Description must not exceed 500 characters')
    .trim(),

  // Cron expression validation (optional for update)
  body('cronExpression')
    .optional()
    .isString().withMessage('Cron expression must be a string')
    .trim()
    .custom(isValidCronExpression),

  // Timezone validation
  body('timezone')
    .optional()
    .isString().withMessage('Timezone must be a string')
    .custom(isValidTimezone),

  // isActive validation
  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive must be a boolean'),

  // Concurrency policy validation
  body('concurrencyPolicy')
    .optional()
    .isIn(['allow', 'forbid']).withMessage('concurrencyPolicy must be one of: allow, forbid'),

  // Chained schedules (P1.2)
  body('onSuccessTriggerScheduleIds')
    .optional()
    .isArray({ max: 10 }).withMessage('onSuccessTriggerScheduleIds must be an array with at most 10 entries'),

  body('onSuccessTriggerScheduleIds.*')
    .isString().withMessage('Each chained schedule ID must be a string')
    .isLength({ min: 1 }).withMessage('Chained schedule ID cannot be empty'),

  // Scope fields (optional on update; validated when supplied)
  body('projectId')
    .optional()
    .isString().withMessage('projectId must be a string'),

  body('scopeFolder')
    .optional()
    .isIn(['dev', 'master', 'sandboxes']).withMessage('scopeFolder must be one of: dev, master, sandboxes'),

  body('scopeSandboxId')
    .optional()
    .isString().withMessage('scopeSandboxId must be a string'),

  body()
    .custom((_, { req }) => {
      const folder = req.body?.scopeFolder;
      const sandboxId = req.body?.scopeSandboxId;

      if (folder === 'sandboxes' && !sandboxId) {
        throw new Error('scopeSandboxId is required when scopeFolder is sandboxes');
      }
      if (folder !== undefined && folder !== 'sandboxes' && sandboxId !== undefined) {
        throw new Error('scopeSandboxId is only allowed when scopeFolder is sandboxes');
      }
      return true;
    }),

  // Linked run configuration (optional when scheduleRunConfiguration is provided)
  body('runConfigurationId')
    .optional()
    .isString().withMessage('runConfigurationId must be a string'),

  // Inline run configuration for scheduler-owned configs
  body('scheduleRunConfiguration')
    .optional()
    .isObject().withMessage('scheduleRunConfiguration must be an object'),

  body('scheduleRunConfiguration.name')
    .optional()
    .isString().withMessage('Run configuration name must be a string'),

  // Cross-field: require at least one of runConfigurationId or scheduleRunConfiguration
  body()
    .custom((_, { req }) => {
      const hasId = req.body?.runConfigurationId && typeof req.body.runConfigurationId === 'string' && req.body.runConfigurationId.trim() !== '';
      const hasInline = req.body?.scheduleRunConfiguration && typeof req.body.scheduleRunConfiguration === 'object';
      if (!hasId && !hasInline) {
        throw new Error('Either runConfigurationId or scheduleRunConfiguration is required');
      }
      return true;
    }),

  // TestSelector validation (same as create)
  body('testSelector')
    .optional()
    .isObject().withMessage('testSelector must be an object'),

  body('testSelector.tags')
    .optional()
    .isArray().withMessage('testSelector.tags must be an array'),

  body('testSelector.tags.*')
    .optional()
    .isString().withMessage('Each tag must be a string')
    .custom(isValidTag),

  body('testSelector.folders')
    .optional()
    .isArray().withMessage('testSelector.folders must be an array'),

  body('testSelector.folders.*')
    .optional()
    .isString().withMessage('Each folder must be a string')
    .custom(isValidGlobPattern),

  body('testSelector.patterns')
    .optional()
    .isArray().withMessage('testSelector.patterns must be an array'),

  body('testSelector.patterns.*')
    .optional()
    .isString().withMessage('Each pattern must be a string')
    .custom(isValidGlobPattern),

  body('testSelector.testFlowIds')
    .optional()
    .isArray().withMessage('testSelector.testFlowIds must be an array'),

  body('testSelector.testFlowIds.*')
    .optional()
    .isString().withMessage('Each testFlowId must be a string'),

  // Notification config validation
  body('notificationConfig')
    .optional()
    .isObject().withMessage('notificationConfig must be an object'),

  body('notificationConfig.email')
    .optional()
    .isArray().withMessage('notificationConfig.email must be an array'),

  body('notificationConfig.email.*')
    .optional()
    .isEmail().withMessage('Each email must be a valid email address'),

  body('notificationConfig.slack')
    .optional()
    .isObject().withMessage('notificationConfig.slack must be an object'),

  body('notificationConfig.slack.webhook')
    .optional()
    .isString().withMessage('Slack webhook must be a string')
    .custom(isValidWebhookUrl),

  body('notificationConfig.slack.channel')
    .optional()
    .isString().withMessage('Slack channel must be a string')
    .isLength({ max: 100 }).withMessage('Slack channel must not exceed 100 characters'),

  body('notificationConfig.onFailureOnly')
    .optional()
    .isBoolean().withMessage('onFailureOnly must be a boolean'),

  body('notificationConfig.includeArtifacts')
    .optional()
    .isBoolean().withMessage('includeArtifacts must be a boolean'),
];

/**
 * Validation for schedule ID parameter
 */
export const scheduleIdValidation = [
  param('id')
    .notEmpty().withMessage('Schedule ID is required')
    .isString().withMessage('Schedule ID must be a string'),
];

/**
 * Validation for run ID parameter
 */
export const runIdValidation = [
  param('runId')
    .notEmpty().withMessage('Run ID is required')
    .isString().withMessage('Run ID must be a string'),
];

/**
 * Validation for cron expression validation endpoint
 */
export const validateCronValidation = [
  body('expression')
    .notEmpty().withMessage('Expression is required')
    .isString().withMessage('Expression must be a string')
    .trim(),

  body('count')
    .optional()
    .isInt({ min: 1, max: 20 }).withMessage('Count must be between 1 and 20'),

  body('timezone')
    .optional()
    .isString().withMessage('Timezone must be a string')
    .trim()
    .custom(isValidTimezone),
];

/**
 * Validation for runs query
 */
export const runsQueryValidation = [
  param('id')
    .notEmpty().withMessage('Schedule ID is required')
    .isString().withMessage('Schedule ID must be a string'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
];

/**
 * Validation for webhook token
 */
export const webhookTokenValidation = [
  param('token')
    .notEmpty().withMessage('Webhook token is required')
    .isString().withMessage('Webhook token must be a string')
    .isLength({ min: 32, max: 64 }).withMessage('Invalid webhook token format'),
];

/**
 * Validation for manual trigger payload (parameter overrides + execution config overrides)
 */
export const triggerScheduleRunValidation = [
  param('id')
    .notEmpty().withMessage('Schedule ID is required')
    .isString().withMessage('Schedule ID must be a string'),

  body('parameterValues')
    .optional()
    .isObject().withMessage('parameterValues must be an object'),

  // Reject the old deprecated field name
  body('executionConfig')
    .not()
    .exists()
    .withMessage('executionConfig is deprecated; use executionConfigOverrides instead'),

  // Per-run execution config overrides (Jenkins-style)
  body('executionConfigOverrides')
    .optional()
    .isObject().withMessage('executionConfigOverrides must be an object'),

  body('executionConfigOverrides.browser')
    .optional()
    .isIn(['chromium', 'firefox', 'webkit'])
    .withMessage('browser must be one of: chromium, firefox, webkit'),

  body('executionConfigOverrides.headless')
    .optional()
    .isBoolean().withMessage('headless must be a boolean'),

  body('executionConfigOverrides.workers')
    .optional()
    .isInt({ min: 1, max: 50 }).withMessage('workers must be between 1 and 50'),

  body('executionConfigOverrides.retries')
    .optional()
    .isInt({ min: 0, max: 10 }).withMessage('retries must be between 0 and 10'),

  body('executionConfigOverrides.timeout')
    .optional()
    .isInt({ min: 0, max: 600000 }).withMessage('timeout must be between 0 and 600000ms'),

  body('executionConfigOverrides.tagExpression')
    .optional()
    .isString().withMessage('tagExpression must be a string'),
];
