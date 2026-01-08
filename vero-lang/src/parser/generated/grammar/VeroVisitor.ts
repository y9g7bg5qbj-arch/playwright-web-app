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
import { FeatureAnnotationContext } from "./VeroParser.js";
import { FeatureBodyContext } from "./VeroParser.js";
import { FeatureMemberContext } from "./VeroParser.js";
import { UseStatementContext } from "./VeroParser.js";
import { HookDeclarationContext } from "./VeroParser.js";
import { ScenarioDeclarationContext } from "./VeroParser.js";
import { ScenarioAnnotationContext } from "./VeroParser.js";
import { TagContext } from "./VeroParser.js";
import { FixtureDeclarationContext } from "./VeroParser.js";
import { FixtureParamsContext } from "./VeroParser.js";
import { FixtureBodyContext } from "./VeroParser.js";
import { FixtureMemberContext } from "./VeroParser.js";
import { FixtureScopeStatementContext } from "./VeroParser.js";
import { FixtureDependsStatementContext } from "./VeroParser.js";
import { FixtureAutoStatementContext } from "./VeroParser.js";
import { FixtureOptionStatementContext } from "./VeroParser.js";
import { FixtureSetupBlockContext } from "./VeroParser.js";
import { FixtureTeardownBlockContext } from "./VeroParser.js";
import { WithFixtureStatementContext } from "./VeroParser.js";
import { FixtureOptionsBlockContext } from "./VeroParser.js";
import { FixtureOptionContext } from "./VeroParser.js";
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
import { UploadActionContext } from "./VeroParser.js";
import { FileListContext } from "./VeroParser.js";
import { AssertionStatementContext } from "./VeroParser.js";
import { SelectorOrTextContext } from "./VeroParser.js";
import { ConditionContext } from "./VeroParser.js";
import { ContainsConditionContext } from "./VeroParser.js";
import { UrlConditionContext } from "./VeroParser.js";
import { TitleConditionContext } from "./VeroParser.js";
import { HasConditionContext } from "./VeroParser.js";
import { ControlFlowStatementContext } from "./VeroParser.js";
import { IfStatementContext } from "./VeroParser.js";
import { RepeatStatementContext } from "./VeroParser.js";
import { BooleanExpressionContext } from "./VeroParser.js";
import { ComparisonOperatorContext } from "./VeroParser.js";
import { VariableDeclarationContext } from "./VeroParser.js";
import { VariableTypeContext } from "./VeroParser.js";
import { ReturnStatementContext } from "./VeroParser.js";
import { DataQueryStatementContext } from "./VeroParser.js";
import { DataResultTypeContext } from "./VeroParser.js";
import { DataQueryContext } from "./VeroParser.js";
import { AggregationQueryContext } from "./VeroParser.js";
import { TableQueryContext } from "./VeroParser.js";
import { TableReferenceContext } from "./VeroParser.js";
import { ColumnSelectorContext } from "./VeroParser.js";
import { IdentifierListContext } from "./VeroParser.js";
import { ColumnReferenceContext } from "./VeroParser.js";
import { QueryModifierContext } from "./VeroParser.js";
import { DataWhereClauseContext } from "./VeroParser.js";
import { DataConditionContext } from "./VeroParser.js";
import { DataComparisonContext } from "./VeroParser.js";
import { TextOperatorContext } from "./VeroParser.js";
import { DateComparisonContext } from "./VeroParser.js";
import { ExpressionListContext } from "./VeroParser.js";
import { OrderByClauseContext } from "./VeroParser.js";
import { OrderColumnContext } from "./VeroParser.js";
import { LimitClauseContext } from "./VeroParser.js";
import { OffsetClauseContext } from "./VeroParser.js";
import { DefaultClauseContext } from "./VeroParser.js";
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
     * Visit a parse tree produced by `VeroParser.featureAnnotation`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitFeatureAnnotation?: (ctx: FeatureAnnotationContext) => Result;
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
     * Visit a parse tree produced by `VeroParser.scenarioAnnotation`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitScenarioAnnotation?: (ctx: ScenarioAnnotationContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.tag`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitTag?: (ctx: TagContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.fixtureDeclaration`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitFixtureDeclaration?: (ctx: FixtureDeclarationContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.fixtureParams`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitFixtureParams?: (ctx: FixtureParamsContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.fixtureBody`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitFixtureBody?: (ctx: FixtureBodyContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.fixtureMember`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitFixtureMember?: (ctx: FixtureMemberContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.fixtureScopeStatement`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitFixtureScopeStatement?: (ctx: FixtureScopeStatementContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.fixtureDependsStatement`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitFixtureDependsStatement?: (ctx: FixtureDependsStatementContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.fixtureAutoStatement`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitFixtureAutoStatement?: (ctx: FixtureAutoStatementContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.fixtureOptionStatement`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitFixtureOptionStatement?: (ctx: FixtureOptionStatementContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.fixtureSetupBlock`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitFixtureSetupBlock?: (ctx: FixtureSetupBlockContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.fixtureTeardownBlock`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitFixtureTeardownBlock?: (ctx: FixtureTeardownBlockContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.withFixtureStatement`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitWithFixtureStatement?: (ctx: WithFixtureStatementContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.fixtureOptionsBlock`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitFixtureOptionsBlock?: (ctx: FixtureOptionsBlockContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.fixtureOption`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitFixtureOption?: (ctx: FixtureOptionContext) => Result;
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
     * Visit a parse tree produced by `VeroParser.uploadAction`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitUploadAction?: (ctx: UploadActionContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.fileList`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitFileList?: (ctx: FileListContext) => Result;
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
     * Visit a parse tree produced by `VeroParser.urlCondition`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitUrlCondition?: (ctx: UrlConditionContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.titleCondition`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitTitleCondition?: (ctx: TitleConditionContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.hasCondition`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitHasCondition?: (ctx: HasConditionContext) => Result;
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
     * Visit a parse tree produced by `VeroParser.dataQueryStatement`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitDataQueryStatement?: (ctx: DataQueryStatementContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.dataResultType`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitDataResultType?: (ctx: DataResultTypeContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.dataQuery`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitDataQuery?: (ctx: DataQueryContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.aggregationQuery`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitAggregationQuery?: (ctx: AggregationQueryContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.tableQuery`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitTableQuery?: (ctx: TableQueryContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.tableReference`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitTableReference?: (ctx: TableReferenceContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.columnSelector`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitColumnSelector?: (ctx: ColumnSelectorContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.identifierList`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitIdentifierList?: (ctx: IdentifierListContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.columnReference`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitColumnReference?: (ctx: ColumnReferenceContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.queryModifier`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitQueryModifier?: (ctx: QueryModifierContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.dataWhereClause`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitDataWhereClause?: (ctx: DataWhereClauseContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.dataCondition`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitDataCondition?: (ctx: DataConditionContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.dataComparison`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitDataComparison?: (ctx: DataComparisonContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.textOperator`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitTextOperator?: (ctx: TextOperatorContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.dateComparison`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitDateComparison?: (ctx: DateComparisonContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.expressionList`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitExpressionList?: (ctx: ExpressionListContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.orderByClause`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitOrderByClause?: (ctx: OrderByClauseContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.orderColumn`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitOrderColumn?: (ctx: OrderColumnContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.limitClause`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitLimitClause?: (ctx: LimitClauseContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.offsetClause`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitOffsetClause?: (ctx: OffsetClauseContext) => Result;
    /**
     * Visit a parse tree produced by `VeroParser.defaultClause`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitDefaultClause?: (ctx: DefaultClauseContext) => Result;
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

