// Export types but exclude ExecutionTarget (defined in runConfiguration)
export {
    User,
    UserCreate,
    UserLogin,
    AuthResponse,
    Application,
    ApplicationCreate,
    ApplicationUpdate,
    ApplicationMemberRole,
    ApplicationMember,
    ApplicationMemberCreate,
    Project,
    ProjectCreate,
    ProjectUpdate,
    ProjectMemberRole,
    ProjectMember,
    ProjectMemberCreate,
    Workflow,
    WorkflowCreate,
    WorkflowUpdate,
    TestFlow,
    TestFlowCreate,
    TestFlowUpdate,
    ExecutionStatus,
    // ExecutionTarget is exported from runConfiguration
    Execution,
    MatrixCombination,
    ExecutionCreate,
    ExecutionLog,
    ExecutionStepStatus,
    ExecutionStep,
    ExecutionStepCreate,
    AgentStatus,
    Agent,
    AgentCreate,
    AgentUpdate,
    RecordingConfig,
    RecordingStart,
    ClientToServerEvents,
    ServerToClientEvents,
    AgentListenEvents,
    AgentEmitEvents,
    ApiResponse,
    PaginatedResponse,
    ApiError,
} from './types';
export * from './execution';
export * from './controlFlowTypes';
// Export everything from flowTypes EXCEPT LocatorConfig and LocatorStrategy (to avoid duplicates)
export {
    Flow,
    LegacyLocatorStrategy,
    LegacyLocatorConfig,
    LocatorStrategy,
    LocatorConfig,
    ExportMode,
    GenerateOptions,
    GeneratedCode,
    LocatorInfo,
    PageAction,
    GeneratorContext,
    NodeGenerator,
    VariableOperator,
    ElementCondition,
} from './flowTypes';
export type { FlowNode, FlowEdge, FlowNodeData, DataSourceConfig } from './flowTypes';
export * from './variables';
// Export all locator types (primary source)
export {
    RoleLocator,
    TextLocator,
    TestIdLocator,
    LabelLocator,
    PlaceholderLocator,
    AltTextLocator,
    TitleLocator,
    CssLocator,
    XPathLocator,
    IdLocator,
    ChainLocator,
    FilterLocator,
    NthLocator,
    FirstLocator,
    LastLocator,
    RefLocator,
    PageElement,
    PageObject,
    ObjectRepository,
    ObjectRepositoryCreate,
    ObjectRepositoryUpdate,
    PageObjectCreate,
    PageObjectUpdate,
    PageElementCreate,
    PageElementUpdate,
    LocatorVariables,
    LocatorResolutionResult,
    RankedLocator,
    CodeGenerationOptions,
    GeneratedPageObjectClass,
    GeneratedFixtures,
} from './locators';

// Schedule types
export type {
    ScheduleTriggerType,
    ScheduleRunStatus,
    ScheduleFolderScope,
    TestSelector,
    ScheduleNotificationConfig,
    Schedule,
    ScheduleCreate,
    ScheduleUpdate,
    ScheduleRun,
    ScheduleTestResult,
    SchedulePreset,
    // Parameter system types
    ScheduleParameterType,
    ScheduleParameterDefinition,
    ScheduleParameterValues,
    ScheduleExecutionConfig,
    ScheduleExecutionTarget,
    ScheduleGitHubActionsConfig,
    ScheduleTriggerRequest,
} from './types';
export { SCHEDULE_PRESETS } from './types';

// Run Configuration types
export * from './runConfiguration';

// Run Parameters types
export * from './runParameters';

// Auth Profile types (Phase A)
export type {
    AuthProfile,
    AuthProfileStatus,
    AuthProfileCreate,
} from './types';

// Failure Translation types (Phase B)
export type {
    LineMapEntry,
    VeroFailureInfo,
} from './types';

// Custom Actions types (Phase C)
export type {
    CustomActionParam,
    CustomActionReturnType,
    CustomActionDefinition,
    CustomActionsManifest,
} from './types';

// Config Sync types (Phase D)
export type {
    ConfigSyncStatus,
    ConfigSyncState,
} from './types';
