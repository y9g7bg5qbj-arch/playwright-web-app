/**
 * Control Flow Executor
 * Handles branching (IF/ELSE) and looping (FOR, FOR-EACH, WHILE) in flow execution
 */

import { Page } from 'playwright';
import { ConditionEvaluator, evaluateCondition } from './conditionEvaluator';
import {
    FlowNode,
    FlowEdge,
    FlowExecutionContext,
    LoopIterator,
    isControlFlowNode,
    isLoopNode,
} from '@playwright-web-app/shared';

/**
 * Action executor callback type
 */
export type ActionExecutorFn = (node: FlowNode) => Promise<void>;

/**
 * Log callback type
 */
export type LogFn = (message: string, level: 'info' | 'warn' | 'error') => void;

/**
 * Control Flow Executor
 * Traverses the flow graph and handles control flow nodes
 */
export class ControlFlowExecutor {
    private conditionEvaluator: ConditionEvaluator;

    constructor(
        private page: Page,
        private nodes: FlowNode[],
        private edges: FlowEdge[],
        private context: FlowExecutionContext,
        private executeAction: ActionExecutorFn,
        private log: LogFn = () => { }
    ) {
        this.conditionEvaluator = new ConditionEvaluator(page, context);
    }

    /**
     * Execute a node and continue traversal
     */
    async executeNode(nodeId: string, visited: Set<string> = new Set()): Promise<void> {
        const node = this.nodes.find(n => n.id === nodeId);
        if (!node) {
            this.log(`Node not found: ${nodeId}`, 'warn');
            return;
        }

        // Prevent infinite loops from graph cycles (except for intentional loops)
        if (visited.has(node.id) && !isLoopNode(node.data.actionType || '')) {
            this.log(`Skipping already visited node: ${nodeId}`, 'info');
            return;
        }

        // Check for break/continue flags
        if (this.context.breakFlag || this.context.continueFlag) {
            return;
        }

        visited.add(node.id);
        const actionType = node.data.actionType || node.type || '';

        this.log(`Executing node: ${node.id} (${actionType})`, 'info');

        // Handle control flow nodes specially
        switch (actionType) {
            case 'start':
                await this.executeNextNode(node, visited);
                break;

            case 'end':
                // End of flow
                this.log('Flow execution complete', 'info');
                break;

            case 'if':
                await this.executeIfElse(node, visited);
                break;

            case 'for-loop':
                await this.executeForLoop(node, visited);
                break;

            case 'for-each':
                await this.executeForEach(node, visited);
                break;

            case 'while-loop':
                await this.executeWhileLoop(node, visited);
                break;

            case 'try-catch':
                await this.executeTryCatch(node, visited);
                break;

            case 'break':
                this.context.breakFlag = true;
                break;

            case 'continue':
                this.context.continueFlag = true;
                break;

            case 'group':
                await this.executeGroup(node, visited);
                break;

            default:
                // Regular action node - execute and continue
                await this.executeAction(node);
                await this.executeNextNode(node, visited);
                break;
        }
    }

    /**
     * Execute IF/ELSE branching
     */
    private async executeIfElse(node: FlowNode, visited: Set<string>): Promise<void> {
        const result = await this.conditionEvaluator.evaluate(node.data);
        this.log(`IF condition evaluated to: ${result.value}`, 'info');

        if (result.value) {
            // Execute true branch
            const trueEdge = this.edges.find(e => e.source === node.id && e.sourceHandle === 'true');
            if (trueEdge) {
                const trueNode = this.nodes.find(n => n.id === trueEdge.target);
                if (trueNode) {
                    await this.executeNode(trueNode.id, new Set(visited));
                }
            }
        } else {
            // Execute false branch
            const falseEdge = this.edges.find(e => e.source === node.id && e.sourceHandle === 'false');
            if (falseEdge) {
                const falseNode = this.nodes.find(n => n.id === falseEdge.target);
                if (falseNode) {
                    await this.executeNode(falseNode.id, new Set(visited));
                }
            }
        }

        // Continue to next node after if/else (edge without handle or with 'next' handle)
        const nextEdge = this.edges.find(e =>
            e.source === node.id && (!e.sourceHandle || e.sourceHandle === 'next')
        );
        if (nextEdge) {
            await this.executeNode(nextEdge.target, visited);
        }
    }

    /**
     * Execute FOR loop (count-based)
     */
    private async executeForLoop(node: FlowNode, visited: Set<string>): Promise<void> {
        const count = node.data.count || 5;
        const indexVar = node.data.indexVariable || 'i';

        this.log(`Starting FOR loop: ${count} iterations`, 'info');

        const iterator: LoopIterator = {
            index: 0,
            items: Array.from({ length: count }, (_, i) => i),
            loopNodeId: node.id,
        };
        this.context.iterators.set(node.id, iterator);

        for (let i = 0; i < count; i++) {
            iterator.index = i;
            this.context.variables[indexVar] = i;
            this.context.continueFlag = false;

            this.log(`FOR loop iteration ${i + 1}/${count}`, 'info');

            // Execute loop body
            await this.executeLoopBody(node, new Set(visited));

            // Check for break
            if (this.context.breakFlag) {
                this.log('FOR loop break', 'info');
                this.context.breakFlag = false;
                break;
            }
        }

        this.context.iterators.delete(node.id);

        // Continue to next node after loop
        await this.executeNextAfterLoop(node, visited);
    }

    /**
     * Execute FOR-EACH loop
     */
    private async executeForEach(node: FlowNode, visited: Set<string>): Promise<void> {
        const itemVar = node.data.itemVariable || 'item';
        const indexVar = node.data.indexVariable || 'index';
        let items: any[] = [];

        // Get items to iterate over
        if (node.data.collectionType === 'elements') {
            // Iterate over DOM elements
            const selector = node.data.selector || '';
            const strategy = node.data.locatorStrategy || 'css';

            if (selector) {
                const locator = this.page.locator(selector);
                items = await locator.all();
                this.log(`FOR-EACH: Found ${items.length} elements for "${selector}"`, 'info');
            }
        } else {
            // Iterate over variable array
            const collectionVar = node.data.collectionVariable || '';
            items = this.context.variables[collectionVar] || [];
            this.log(`FOR-EACH: Iterating over ${items.length} items from "${collectionVar}"`, 'info');
        }

        const iterator: LoopIterator = {
            index: 0,
            items,
            loopNodeId: node.id,
        };
        this.context.iterators.set(node.id, iterator);

        for (let i = 0; i < items.length; i++) {
            iterator.index = i;
            this.context.variables[indexVar] = i;
            this.context.variables[itemVar] = items[i];
            this.context.continueFlag = false;

            this.log(`FOR-EACH iteration ${i + 1}/${items.length}`, 'info');

            // Execute loop body
            await this.executeLoopBody(node, new Set(visited));

            // Check for break
            if (this.context.breakFlag) {
                this.log('FOR-EACH loop break', 'info');
                this.context.breakFlag = false;
                break;
            }
        }

        this.context.iterators.delete(node.id);

        // Continue to next node after loop
        await this.executeNextAfterLoop(node, visited);
    }

    /**
     * Execute WHILE loop
     */
    private async executeWhileLoop(node: FlowNode, visited: Set<string>): Promise<void> {
        const maxIterations = node.data.maxIterations || 100;
        let iterations = 0;

        this.log(`Starting WHILE loop (max ${maxIterations} iterations)`, 'info');

        const iterator: LoopIterator = {
            index: 0,
            items: [],
            loopNodeId: node.id,
        };
        this.context.iterators.set(node.id, iterator);

        while (iterations < maxIterations) {
            // Evaluate condition
            const result = await this.conditionEvaluator.evaluate(node.data);
            if (!result.value) {
                this.log('WHILE condition false, exiting loop', 'info');
                break;
            }

            iterator.index = iterations;
            this.context.continueFlag = false;

            this.log(`WHILE loop iteration ${iterations + 1}`, 'info');

            // Execute loop body
            await this.executeLoopBody(node, new Set(visited));

            // Check for break
            if (this.context.breakFlag) {
                this.log('WHILE loop break', 'info');
                this.context.breakFlag = false;
                break;
            }

            iterations++;
        }

        if (iterations >= maxIterations) {
            this.log(`WHILE loop reached max iterations (${maxIterations})`, 'warn');
        }

        this.context.iterators.delete(node.id);

        // Continue to next node after loop
        await this.executeNextAfterLoop(node, visited);
    }

    /**
     * Execute TRY-CATCH block
     */
    private async executeTryCatch(node: FlowNode, visited: Set<string>): Promise<void> {
        const errorVar = node.data.errorVariable || 'error';

        try {
            // Execute try block
            const tryEdge = this.edges.find(e => e.source === node.id && e.sourceHandle === 'try');
            if (tryEdge) {
                const tryNode = this.nodes.find(n => n.id === tryEdge.target);
                if (tryNode) {
                    await this.executeNode(tryNode.id, new Set(visited));
                }
            }
        } catch (error: any) {
            this.log(`TRY-CATCH caught error: ${error.message}`, 'warn');
            this.context.variables[errorVar] = error;

            // Execute catch block
            const catchEdge = this.edges.find(e => e.source === node.id && e.sourceHandle === 'catch');
            if (catchEdge) {
                const catchNode = this.nodes.find(n => n.id === catchEdge.target);
                if (catchNode) {
                    await this.executeNode(catchNode.id, new Set(visited));
                }
            }
        }

        // Continue to next node
        await this.executeNextNode(node, visited);
    }

    /**
     * Execute GROUP block (just traverses children)
     */
    private async executeGroup(node: FlowNode, visited: Set<string>): Promise<void> {
        this.log(`Executing group: ${node.data.label || 'Unnamed'}`, 'info');

        // Find and execute the first child
        const childEdge = this.edges.find(e => e.source === node.id);
        if (childEdge) {
            await this.executeNode(childEdge.target, visited);
        }
    }

    /**
     * Execute loop body
     */
    private async executeLoopBody(loopNode: FlowNode, visited: Set<string>): Promise<void> {
        const bodyEdge = this.edges.find(e =>
            e.source === loopNode.id && e.sourceHandle === 'loop-body'
        );

        if (bodyEdge) {
            await this.executeNode(bodyEdge.target, visited);
        }
    }

    /**
     * Execute next node after loop
     */
    private async executeNextAfterLoop(loopNode: FlowNode, visited: Set<string>): Promise<void> {
        // Look for 'next' handle or edge without handle (excluding loop-body)
        const nextEdge = this.edges.find(e =>
            e.source === loopNode.id &&
            (e.sourceHandle === 'next' || (!e.sourceHandle && !this.isLoopBodyEdge(e, loopNode)))
        );

        if (nextEdge) {
            await this.executeNode(nextEdge.target, visited);
        }
    }

    /**
     * Check if an edge is a loop body edge
     */
    private isLoopBodyEdge(edge: FlowEdge, loopNode: FlowNode): boolean {
        return edge.sourceHandle === 'loop-body';
    }

    /**
     * Execute the next node in sequence
     */
    private async executeNextNode(node: FlowNode, visited: Set<string>): Promise<void> {
        const outEdge = this.edges.find(e =>
            e.source === node.id &&
            (!e.sourceHandle || e.sourceHandle === 'default' || e.sourceHandle === 'next')
        );

        if (outEdge) {
            await this.executeNode(outEdge.target, visited);
        }
    }

    /**
     * Find the start node in the flow
     */
    findStartNode(): FlowNode | undefined {
        return this.nodes.find(n => n.type === 'start' || n.data.actionType === 'start');
    }

    /**
     * Start execution from the start node
     */
    async executeFromStart(): Promise<void> {
        const startNode = this.findStartNode();
        if (!startNode) {
            throw new Error('No start node found in flow');
        }

        await this.executeNode(startNode.id);
    }
}

/**
 * Create a new execution context
 */
export function createExecutionContext(): FlowExecutionContext {
    return {
        variables: {},
        iterators: new Map(),
        breakFlag: false,
        continueFlag: false,
    };
}
