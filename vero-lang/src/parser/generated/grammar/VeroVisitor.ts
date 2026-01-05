// Generated from grammar/Vero.g4 by ANTLR 4.13.1

import { AbstractParseTreeVisitor } from "antlr4ng";


import { ProgramContext } from "./VeroParser.js";
import { DeclarationContext } from "./VeroParser.js";
import { PageDeclarationContext } from "./VeroParser.js";
import { PageBodyContext } from "./VeroParser.js";
import { PageMemberContext } from "./VeroParser.js";
import { FieldDeclarationContext } from "./VeroParser.js";
import { ActionDeclarationContext } from "./VeroParser.js";
import { ParameterListContext } from "./VeroParser.js";
import { FeatureDeclarationContext } from "./VeroParser.js";
import { FeatureBodyContext } from "./VeroParser.js";
import { FeatureMemberContext } from "./VeroParser.js";
import { UseStatementContext } from "./VeroParser.js";
import { HookDeclarationContext } from "./VeroParser.js";
import { ScenarioDeclarationContext } from "./VeroParser.js";
import { TagContext } from "./VeroParser.js";
import { StatementContext } from "./VeroParser.js";
import { ActionStatementContext } from "./VeroParser.js";
import { ClickActionContext } from "./VeroParser.js";
import { FillActionContext } from "./VeroParser.js";
import { OpenActionContext } from "./VeroParser.js";
import { CheckActionContext } from "./VeroParser.js";
import { UncheckActionContext } from "./VeroParser.js";
import { SelectActionContext } from "./VeroParser.js";
import { HoverActionContext } from "./VeroParser.js";
import { PressActionContext } from "./VeroParser.js";
import { ScrollActionContext } from "./VeroParser.js";
import { DirectionContext } from "./VeroParser.js";
import { WaitActionContext } from "./VeroParser.js";
import { DoActionContext } from "./VeroParser.js";
import { RefreshActionContext } from "./VeroParser.js";
import { ClearActionContext } from "./VeroParser.js";
import { ScreenshotActionContext } from "./VeroParser.js";
import { LogActionContext } from "./VeroParser.js";
import { AssertionStatementContext } from "./VeroParser.js";
import { SelectorOrTextContext } from "./VeroParser.js";
import { ConditionContext } from "./VeroParser.js";
import { ContainsConditionContext } from "./VeroParser.js";
import { ControlFlowStatementContext } from "./VeroParser.js";
import { IfStatementContext } from "./VeroParser.js";
import { RepeatStatementContext } from "./VeroParser.js";
import { BooleanExpressionContext } from "./VeroParser.js";
import { ComparisonOperatorContext } from "./VeroParser.js";
import { VariableDeclarationContext } from "./VeroParser.js";
import { VariableTypeContext } from "./VeroParser.js";
import { ReturnStatementContext } from "./VeroParser.js";
import { ExpressionContext } from "./VeroParser.js";
import { SelectorExpressionContext } from "./VeroParser.js";
import { PageMethodReferenceContext } from "./VeroParser.js";
import { PageFieldReferenceContext } from "./VeroParser.js";
import { ArgumentListContext } from "./VeroParser.js";


/**
 * This interface defines a complete generic visitor for a parse tree produced
 * by `VeroParser`.
 *
 * @param <Result> The return type of the visit operation. Use `void` for
 * operations with no return type.
 */
export class VeroVisitor<Result> extends AbstractParseTreeVisitor<Result> {
    /**
     * Visit a parse tree produced by `VeroParser.program`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitProgram?: (ctx: ProgramContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.declaration`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitDeclaration?: (ctx: DeclarationContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.pageDeclaration`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitPageDeclaration?: (ctx: PageDeclarationContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.pageBody`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitPageBody?: (ctx: PageBodyContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.pageMember`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitPageMember?: (ctx: PageMemberContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.fieldDeclaration`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitFieldDeclaration?: (ctx: FieldDeclarationContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.actionDeclaration`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitActionDeclaration?: (ctx: ActionDeclarationContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.parameterList`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitParameterList?: (ctx: ParameterListContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.featureDeclaration`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitFeatureDeclaration?: (ctx: FeatureDeclarationContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.featureBody`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitFeatureBody?: (ctx: FeatureBodyContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.featureMember`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitFeatureMember?: (ctx: FeatureMemberContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.useStatement`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitUseStatement?: (ctx: UseStatementContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.hookDeclaration`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitHookDeclaration?: (ctx: HookDeclarationContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.scenarioDeclaration`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitScenarioDeclaration?: (ctx: ScenarioDeclarationContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.tag`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitTag?: (ctx: TagContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.statement`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitStatement?: (ctx: StatementContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.actionStatement`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitActionStatement?: (ctx: ActionStatementContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.clickAction`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitClickAction?: (ctx: ClickActionContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.fillAction`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitFillAction?: (ctx: FillActionContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.openAction`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitOpenAction?: (ctx: OpenActionContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.checkAction`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitCheckAction?: (ctx: CheckActionContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.uncheckAction`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitUncheckAction?: (ctx: UncheckActionContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.selectAction`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitSelectAction?: (ctx: SelectActionContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.hoverAction`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitHoverAction?: (ctx: HoverActionContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.pressAction`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitPressAction?: (ctx: PressActionContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.scrollAction`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitScrollAction?: (ctx: ScrollActionContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.direction`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitDirection?: (ctx: DirectionContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.waitAction`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitWaitAction?: (ctx: WaitActionContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.doAction`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitDoAction?: (ctx: DoActionContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.refreshAction`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitRefreshAction?: (ctx: RefreshActionContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.clearAction`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitClearAction?: (ctx: ClearActionContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.screenshotAction`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitScreenshotAction?: (ctx: ScreenshotActionContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.logAction`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitLogAction?: (ctx: LogActionContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.assertionStatement`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitAssertionStatement?: (ctx: AssertionStatementContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.selectorOrText`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitSelectorOrText?: (ctx: SelectorOrTextContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.condition`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitCondition?: (ctx: ConditionContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.containsCondition`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitContainsCondition?: (ctx: ContainsConditionContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.controlFlowStatement`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitControlFlowStatement?: (ctx: ControlFlowStatementContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.ifStatement`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitIfStatement?: (ctx: IfStatementContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.repeatStatement`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitRepeatStatement?: (ctx: RepeatStatementContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.booleanExpression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitBooleanExpression?: (ctx: BooleanExpressionContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.comparisonOperator`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitComparisonOperator?: (ctx: ComparisonOperatorContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.variableDeclaration`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitVariableDeclaration?: (ctx: VariableDeclarationContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.variableType`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitVariableType?: (ctx: VariableTypeContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.returnStatement`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitReturnStatement?: (ctx: ReturnStatementContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitExpression?: (ctx: ExpressionContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.selectorExpression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitSelectorExpression?: (ctx: SelectorExpressionContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.pageMethodReference`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitPageMethodReference?: (ctx: PageMethodReferenceContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.pageFieldReference`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitPageFieldReference?: (ctx: PageFieldReferenceContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.argumentList`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitArgumentList?: (ctx: ArgumentListContext) => Result;
}

