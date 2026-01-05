/**
 * Node Generator Registry
 * Central registry mapping node types to their generators
 */

import type { FlowNode, GeneratorContext, NodeGenerator } from '@playwright-web-app/shared';

// Navigation generators
import {
    NavigateGenerator,
    GoBackGenerator,
    GoForwardGenerator,
    ReloadGenerator,
    NewPageGenerator,
    ClosePageGenerator,
    SwitchTabGenerator,
    WaitForNewTabGenerator,
    SwitchFrameGenerator,
    SwitchMainFrameGenerator,
} from './navigationGenerators';

// Action generators
import {
    ClickGenerator,
    DoubleClickGenerator,
    RightClickGenerator,
    HoverGenerator,
    DragAndDropGenerator,
    ScrollGenerator,
    MouseMoveGenerator,
    MouseDownGenerator,
    MouseUpGenerator,
} from './actionGenerators';

// Input generators
import {
    FillGenerator,
    TypeGenerator,
    ClearGenerator,
    PressKeyGenerator,
    SelectOptionGenerator,
    CheckGenerator,
    UncheckGenerator,
    SetCheckedGenerator,
    UploadFileGenerator,
    FocusGenerator,
    BlurGenerator,
} from './inputGenerators';

// Assertion generators
import {
    AssertVisibleGenerator,
    AssertHiddenGenerator,
    AssertTextGenerator,
    AssertValueGenerator,
    AssertAttributeGenerator,
    AssertEnabledGenerator,
    AssertCheckedGenerator,
    AssertCountGenerator,
    AssertUrlGenerator,
    AssertTitleGenerator,
} from './assertionGenerators';

// Wait generators
import {
    WaitTimeGenerator,
    WaitForElementGenerator,
    WaitForUrlGenerator,
    WaitForLoadStateGenerator,
    WaitForResponseGenerator,
    WaitForFunctionGenerator,
} from './waitGenerators';

// Control flow generators
import {
    IfGenerator,
    ElseGenerator,
    ForLoopGenerator,
    ForEachGenerator,
    WhileLoopGenerator,
    TryCatchGenerator,
    CatchGenerator,
    FinallyGenerator,
    BreakGenerator,
    ContinueGenerator,
    PassGenerator,
    FailGenerator,
    GroupGenerator,
    StartGenerator,
    EndGenerator,
    CommentGenerator,
} from './controlFlowGenerators';

// Data generators
import {
    SetVariableGenerator,
    GetTextGenerator,
    GetAttributeGenerator,
    GetValueGenerator,
    GetUrlGenerator,
    GetTitleGenerator,
    GetElementCountGenerator,
    LogGenerator,
    ScreenshotGenerator,
    EvaluateExpressionGenerator,
    DataSourceGenerator,
} from './dataGenerators';

// Network generators
import {
    HttpRequestGenerator,
    InterceptRequestGenerator,
} from './networkGenerators';

// Advanced generators
import {
    RunJavaScriptGenerator,
    HandleDialogGenerator,
    HandleDownloadGenerator,
    EmulateDeviceGenerator,
    SetViewportGenerator,
    SubFlowGenerator,
    LaunchBrowserGenerator,
    NewContextGenerator,
    CloseBrowserGenerator,
} from './advancedGenerators';

/**
 * Registry of all node generators
 */
const nodeGenerators: Record<string, NodeGenerator> = {
    // Navigation
    'navigate': new NavigateGenerator(),
    'go-back': new GoBackGenerator(),
    'go-forward': new GoForwardGenerator(),
    'reload': new ReloadGenerator(),
    'new-page': new NewPageGenerator(),
    'close-page': new ClosePageGenerator(),
    'switch-tab': new SwitchTabGenerator(),
    'wait-for-new-tab': new WaitForNewTabGenerator(),
    'switch-frame': new SwitchFrameGenerator(),
    'switch-main-frame': new SwitchMainFrameGenerator(),

    // Actions
    'click': new ClickGenerator(),
    'double-click': new DoubleClickGenerator(),
    'right-click': new RightClickGenerator(),
    'hover': new HoverGenerator(),
    'drag-and-drop': new DragAndDropGenerator(),
    'scroll': new ScrollGenerator(),
    'mouse-move': new MouseMoveGenerator(),
    'mouse-down': new MouseDownGenerator(),
    'mouse-up': new MouseUpGenerator(),

    // Input
    'fill': new FillGenerator(),
    'type': new TypeGenerator(),
    'clear': new ClearGenerator(),
    'press-key': new PressKeyGenerator(),
    'select-option': new SelectOptionGenerator(),
    'check': new CheckGenerator(),
    'uncheck': new UncheckGenerator(),
    'set-checked': new SetCheckedGenerator(),
    'upload-file': new UploadFileGenerator(),
    'focus': new FocusGenerator(),
    'blur': new BlurGenerator(),

    // Assertions
    'assert-visible': new AssertVisibleGenerator(),
    'assert-hidden': new AssertHiddenGenerator(),
    'assert-text': new AssertTextGenerator(),
    'assert-value': new AssertValueGenerator(),
    'assert-attribute': new AssertAttributeGenerator(),
    'assert-enabled': new AssertEnabledGenerator(),
    'assert-checked': new AssertCheckedGenerator(),
    'assert-count': new AssertCountGenerator(),
    'assert-url': new AssertUrlGenerator(),
    'assert-title': new AssertTitleGenerator(),

    // Waits
    'wait-time': new WaitTimeGenerator(),
    'wait-for-element': new WaitForElementGenerator(),
    'wait-for-url': new WaitForUrlGenerator(),
    'wait-for-load-state': new WaitForLoadStateGenerator(),
    'wait-for-response': new WaitForResponseGenerator(),
    'wait-for-function': new WaitForFunctionGenerator(),

    // Control Flow
    'if': new IfGenerator(),
    'else': new ElseGenerator(),
    'for-loop': new ForLoopGenerator(),
    'for-each': new ForEachGenerator(),
    'while-loop': new WhileLoopGenerator(),
    'try-catch': new TryCatchGenerator(),
    'break': new BreakGenerator(),
    'continue': new ContinueGenerator(),
    'pass': new PassGenerator(),
    'fail': new FailGenerator(),
    'group': new GroupGenerator(),
    'start': new StartGenerator(),
    'end': new EndGenerator(),
    'comment': new CommentGenerator(),

    // Data
    'set-variable': new SetVariableGenerator(),
    'get-text': new GetTextGenerator(),
    'get-attribute': new GetAttributeGenerator(),
    'get-value': new GetValueGenerator(),
    'get-url': new GetUrlGenerator(),
    'get-title': new GetTitleGenerator(),
    'get-element-count': new GetElementCountGenerator(),
    'log': new LogGenerator(),
    'screenshot': new ScreenshotGenerator(),
    'evaluate-expression': new EvaluateExpressionGenerator(),
    'data': new DataSourceGenerator(),

    // Network
    'http-request': new HttpRequestGenerator(),
    'intercept-request': new InterceptRequestGenerator(),

    // Advanced
    'run-javascript': new RunJavaScriptGenerator(),
    'handle-dialog': new HandleDialogGenerator(),
    'handle-download': new HandleDownloadGenerator(),
    'emulate-device': new EmulateDeviceGenerator(),
    'set-viewport': new SetViewportGenerator(),
    'sub-flow': new SubFlowGenerator(),
    'subflow': new SubFlowGenerator(),
    'launch-browser': new LaunchBrowserGenerator(),
    'new-context': new NewContextGenerator(),
    'close-browser': new CloseBrowserGenerator(),
};

/**
 * Get the generator for a given node type
 */
export function getNodeGenerator(type: string): NodeGenerator | undefined {
    return nodeGenerators[type];
}

/**
 * Check if a generator exists for a given node type
 */
export function hasNodeGenerator(type: string): boolean {
    return type in nodeGenerators;
}

/**
 * Generate code for a single node
 */
export function generateNodeCode(node: FlowNode, context: GeneratorContext): string[] {
    const generator = getNodeGenerator(node.type);

    if (!generator) {
        // Return a comment for unknown node types
        return [`// Unknown node type: ${node.type}`];
    }

    return generator.generate(node, context);
}

/**
 * Check if a node type is a block start (requires closing brace)
 */
export function isBlockStartNode(type: string): boolean {
    const blockTypes = ['if', 'for-loop', 'for-each', 'while-loop', 'try-catch', 'group'];
    return blockTypes.includes(type);
}

/**
 * Check if a node type is a loop
 */
export function isLoopNode(type: string): boolean {
    return ['for-loop', 'for-each', 'while-loop'].includes(type);
}

/**
 * Check if a node type has branching (if, try-catch)
 */
export function isBranchingNode(type: string): boolean {
    return ['if', 'try-catch'].includes(type);
}

// Export generators for POM generation (need to access locator info)
export {
    CatchGenerator,
    FinallyGenerator,
};
