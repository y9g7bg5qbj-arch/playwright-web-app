// Generated from grammar/Vero.g4 by ANTLR 4.13.1

import { ErrorNode, ParseTreeListener, ParserRuleContext, TerminalNode } from "antlr4ng";


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
 * This interface defines a complete listener for a parse tree produced by
 * `VeroParser`.
 */
export class VeroListener implements ParseTreeListener {
    /**
     * Enter a parse tree produced by `VeroParser.program`.
     * @param ctx the parse tree
     */
    enterProgram?: (ctx: ProgramContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.program`.
     * @param ctx the parse tree
     */
    exitProgram?: (ctx: ProgramContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.declaration`.
     * @param ctx the parse tree
     */
    enterDeclaration?: (ctx: DeclarationContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.declaration`.
     * @param ctx the parse tree
     */
    exitDeclaration?: (ctx: DeclarationContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.pageDeclaration`.
     * @param ctx the parse tree
     */
    enterPageDeclaration?: (ctx: PageDeclarationContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.pageDeclaration`.
     * @param ctx the parse tree
     */
    exitPageDeclaration?: (ctx: PageDeclarationContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.pageBody`.
     * @param ctx the parse tree
     */
    enterPageBody?: (ctx: PageBodyContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.pageBody`.
     * @param ctx the parse tree
     */
    exitPageBody?: (ctx: PageBodyContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.pageMember`.
     * @param ctx the parse tree
     */
    enterPageMember?: (ctx: PageMemberContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.pageMember`.
     * @param ctx the parse tree
     */
    exitPageMember?: (ctx: PageMemberContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.fieldDeclaration`.
     * @param ctx the parse tree
     */
    enterFieldDeclaration?: (ctx: FieldDeclarationContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.fieldDeclaration`.
     * @param ctx the parse tree
     */
    exitFieldDeclaration?: (ctx: FieldDeclarationContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.actionDeclaration`.
     * @param ctx the parse tree
     */
    enterActionDeclaration?: (ctx: ActionDeclarationContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.actionDeclaration`.
     * @param ctx the parse tree
     */
    exitActionDeclaration?: (ctx: ActionDeclarationContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.parameterList`.
     * @param ctx the parse tree
     */
    enterParameterList?: (ctx: ParameterListContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.parameterList`.
     * @param ctx the parse tree
     */
    exitParameterList?: (ctx: ParameterListContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.featureDeclaration`.
     * @param ctx the parse tree
     */
    enterFeatureDeclaration?: (ctx: FeatureDeclarationContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.featureDeclaration`.
     * @param ctx the parse tree
     */
    exitFeatureDeclaration?: (ctx: FeatureDeclarationContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.featureAnnotation`.
     * @param ctx the parse tree
     */
    enterFeatureAnnotation?: (ctx: FeatureAnnotationContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.featureAnnotation`.
     * @param ctx the parse tree
     */
    exitFeatureAnnotation?: (ctx: FeatureAnnotationContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.featureBody`.
     * @param ctx the parse tree
     */
    enterFeatureBody?: (ctx: FeatureBodyContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.featureBody`.
     * @param ctx the parse tree
     */
    exitFeatureBody?: (ctx: FeatureBodyContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.featureMember`.
     * @param ctx the parse tree
     */
    enterFeatureMember?: (ctx: FeatureMemberContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.featureMember`.
     * @param ctx the parse tree
     */
    exitFeatureMember?: (ctx: FeatureMemberContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.useStatement`.
     * @param ctx the parse tree
     */
    enterUseStatement?: (ctx: UseStatementContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.useStatement`.
     * @param ctx the parse tree
     */
    exitUseStatement?: (ctx: UseStatementContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.hookDeclaration`.
     * @param ctx the parse tree
     */
    enterHookDeclaration?: (ctx: HookDeclarationContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.hookDeclaration`.
     * @param ctx the parse tree
     */
    exitHookDeclaration?: (ctx: HookDeclarationContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.scenarioDeclaration`.
     * @param ctx the parse tree
     */
    enterScenarioDeclaration?: (ctx: ScenarioDeclarationContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.scenarioDeclaration`.
     * @param ctx the parse tree
     */
    exitScenarioDeclaration?: (ctx: ScenarioDeclarationContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.scenarioAnnotation`.
     * @param ctx the parse tree
     */
    enterScenarioAnnotation?: (ctx: ScenarioAnnotationContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.scenarioAnnotation`.
     * @param ctx the parse tree
     */
    exitScenarioAnnotation?: (ctx: ScenarioAnnotationContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.tag`.
     * @param ctx the parse tree
     */
    enterTag?: (ctx: TagContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.tag`.
     * @param ctx the parse tree
     */
    exitTag?: (ctx: TagContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.fixtureDeclaration`.
     * @param ctx the parse tree
     */
    enterFixtureDeclaration?: (ctx: FixtureDeclarationContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.fixtureDeclaration`.
     * @param ctx the parse tree
     */
    exitFixtureDeclaration?: (ctx: FixtureDeclarationContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.fixtureParams`.
     * @param ctx the parse tree
     */
    enterFixtureParams?: (ctx: FixtureParamsContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.fixtureParams`.
     * @param ctx the parse tree
     */
    exitFixtureParams?: (ctx: FixtureParamsContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.fixtureBody`.
     * @param ctx the parse tree
     */
    enterFixtureBody?: (ctx: FixtureBodyContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.fixtureBody`.
     * @param ctx the parse tree
     */
    exitFixtureBody?: (ctx: FixtureBodyContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.fixtureMember`.
     * @param ctx the parse tree
     */
    enterFixtureMember?: (ctx: FixtureMemberContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.fixtureMember`.
     * @param ctx the parse tree
     */
    exitFixtureMember?: (ctx: FixtureMemberContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.fixtureScopeStatement`.
     * @param ctx the parse tree
     */
    enterFixtureScopeStatement?: (ctx: FixtureScopeStatementContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.fixtureScopeStatement`.
     * @param ctx the parse tree
     */
    exitFixtureScopeStatement?: (ctx: FixtureScopeStatementContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.fixtureDependsStatement`.
     * @param ctx the parse tree
     */
    enterFixtureDependsStatement?: (ctx: FixtureDependsStatementContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.fixtureDependsStatement`.
     * @param ctx the parse tree
     */
    exitFixtureDependsStatement?: (ctx: FixtureDependsStatementContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.fixtureAutoStatement`.
     * @param ctx the parse tree
     */
    enterFixtureAutoStatement?: (ctx: FixtureAutoStatementContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.fixtureAutoStatement`.
     * @param ctx the parse tree
     */
    exitFixtureAutoStatement?: (ctx: FixtureAutoStatementContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.fixtureOptionStatement`.
     * @param ctx the parse tree
     */
    enterFixtureOptionStatement?: (ctx: FixtureOptionStatementContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.fixtureOptionStatement`.
     * @param ctx the parse tree
     */
    exitFixtureOptionStatement?: (ctx: FixtureOptionStatementContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.fixtureSetupBlock`.
     * @param ctx the parse tree
     */
    enterFixtureSetupBlock?: (ctx: FixtureSetupBlockContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.fixtureSetupBlock`.
     * @param ctx the parse tree
     */
    exitFixtureSetupBlock?: (ctx: FixtureSetupBlockContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.fixtureTeardownBlock`.
     * @param ctx the parse tree
     */
    enterFixtureTeardownBlock?: (ctx: FixtureTeardownBlockContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.fixtureTeardownBlock`.
     * @param ctx the parse tree
     */
    exitFixtureTeardownBlock?: (ctx: FixtureTeardownBlockContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.withFixtureStatement`.
     * @param ctx the parse tree
     */
    enterWithFixtureStatement?: (ctx: WithFixtureStatementContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.withFixtureStatement`.
     * @param ctx the parse tree
     */
    exitWithFixtureStatement?: (ctx: WithFixtureStatementContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.fixtureOptionsBlock`.
     * @param ctx the parse tree
     */
    enterFixtureOptionsBlock?: (ctx: FixtureOptionsBlockContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.fixtureOptionsBlock`.
     * @param ctx the parse tree
     */
    exitFixtureOptionsBlock?: (ctx: FixtureOptionsBlockContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.fixtureOption`.
     * @param ctx the parse tree
     */
    enterFixtureOption?: (ctx: FixtureOptionContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.fixtureOption`.
     * @param ctx the parse tree
     */
    exitFixtureOption?: (ctx: FixtureOptionContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.statement`.
     * @param ctx the parse tree
     */
    enterStatement?: (ctx: StatementContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.statement`.
     * @param ctx the parse tree
     */
    exitStatement?: (ctx: StatementContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.actionStatement`.
     * @param ctx the parse tree
     */
    enterActionStatement?: (ctx: ActionStatementContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.actionStatement`.
     * @param ctx the parse tree
     */
    exitActionStatement?: (ctx: ActionStatementContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.clickAction`.
     * @param ctx the parse tree
     */
    enterClickAction?: (ctx: ClickActionContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.clickAction`.
     * @param ctx the parse tree
     */
    exitClickAction?: (ctx: ClickActionContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.fillAction`.
     * @param ctx the parse tree
     */
    enterFillAction?: (ctx: FillActionContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.fillAction`.
     * @param ctx the parse tree
     */
    exitFillAction?: (ctx: FillActionContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.openAction`.
     * @param ctx the parse tree
     */
    enterOpenAction?: (ctx: OpenActionContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.openAction`.
     * @param ctx the parse tree
     */
    exitOpenAction?: (ctx: OpenActionContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.checkAction`.
     * @param ctx the parse tree
     */
    enterCheckAction?: (ctx: CheckActionContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.checkAction`.
     * @param ctx the parse tree
     */
    exitCheckAction?: (ctx: CheckActionContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.uncheckAction`.
     * @param ctx the parse tree
     */
    enterUncheckAction?: (ctx: UncheckActionContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.uncheckAction`.
     * @param ctx the parse tree
     */
    exitUncheckAction?: (ctx: UncheckActionContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.selectAction`.
     * @param ctx the parse tree
     */
    enterSelectAction?: (ctx: SelectActionContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.selectAction`.
     * @param ctx the parse tree
     */
    exitSelectAction?: (ctx: SelectActionContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.hoverAction`.
     * @param ctx the parse tree
     */
    enterHoverAction?: (ctx: HoverActionContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.hoverAction`.
     * @param ctx the parse tree
     */
    exitHoverAction?: (ctx: HoverActionContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.pressAction`.
     * @param ctx the parse tree
     */
    enterPressAction?: (ctx: PressActionContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.pressAction`.
     * @param ctx the parse tree
     */
    exitPressAction?: (ctx: PressActionContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.scrollAction`.
     * @param ctx the parse tree
     */
    enterScrollAction?: (ctx: ScrollActionContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.scrollAction`.
     * @param ctx the parse tree
     */
    exitScrollAction?: (ctx: ScrollActionContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.direction`.
     * @param ctx the parse tree
     */
    enterDirection?: (ctx: DirectionContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.direction`.
     * @param ctx the parse tree
     */
    exitDirection?: (ctx: DirectionContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.waitAction`.
     * @param ctx the parse tree
     */
    enterWaitAction?: (ctx: WaitActionContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.waitAction`.
     * @param ctx the parse tree
     */
    exitWaitAction?: (ctx: WaitActionContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.doAction`.
     * @param ctx the parse tree
     */
    enterDoAction?: (ctx: DoActionContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.doAction`.
     * @param ctx the parse tree
     */
    exitDoAction?: (ctx: DoActionContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.refreshAction`.
     * @param ctx the parse tree
     */
    enterRefreshAction?: (ctx: RefreshActionContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.refreshAction`.
     * @param ctx the parse tree
     */
    exitRefreshAction?: (ctx: RefreshActionContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.clearAction`.
     * @param ctx the parse tree
     */
    enterClearAction?: (ctx: ClearActionContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.clearAction`.
     * @param ctx the parse tree
     */
    exitClearAction?: (ctx: ClearActionContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.screenshotAction`.
     * @param ctx the parse tree
     */
    enterScreenshotAction?: (ctx: ScreenshotActionContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.screenshotAction`.
     * @param ctx the parse tree
     */
    exitScreenshotAction?: (ctx: ScreenshotActionContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.logAction`.
     * @param ctx the parse tree
     */
    enterLogAction?: (ctx: LogActionContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.logAction`.
     * @param ctx the parse tree
     */
    exitLogAction?: (ctx: LogActionContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.uploadAction`.
     * @param ctx the parse tree
     */
    enterUploadAction?: (ctx: UploadActionContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.uploadAction`.
     * @param ctx the parse tree
     */
    exitUploadAction?: (ctx: UploadActionContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.fileList`.
     * @param ctx the parse tree
     */
    enterFileList?: (ctx: FileListContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.fileList`.
     * @param ctx the parse tree
     */
    exitFileList?: (ctx: FileListContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.assertionStatement`.
     * @param ctx the parse tree
     */
    enterAssertionStatement?: (ctx: AssertionStatementContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.assertionStatement`.
     * @param ctx the parse tree
     */
    exitAssertionStatement?: (ctx: AssertionStatementContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.selectorOrText`.
     * @param ctx the parse tree
     */
    enterSelectorOrText?: (ctx: SelectorOrTextContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.selectorOrText`.
     * @param ctx the parse tree
     */
    exitSelectorOrText?: (ctx: SelectorOrTextContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.condition`.
     * @param ctx the parse tree
     */
    enterCondition?: (ctx: ConditionContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.condition`.
     * @param ctx the parse tree
     */
    exitCondition?: (ctx: ConditionContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.containsCondition`.
     * @param ctx the parse tree
     */
    enterContainsCondition?: (ctx: ContainsConditionContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.containsCondition`.
     * @param ctx the parse tree
     */
    exitContainsCondition?: (ctx: ContainsConditionContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.urlCondition`.
     * @param ctx the parse tree
     */
    enterUrlCondition?: (ctx: UrlConditionContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.urlCondition`.
     * @param ctx the parse tree
     */
    exitUrlCondition?: (ctx: UrlConditionContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.titleCondition`.
     * @param ctx the parse tree
     */
    enterTitleCondition?: (ctx: TitleConditionContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.titleCondition`.
     * @param ctx the parse tree
     */
    exitTitleCondition?: (ctx: TitleConditionContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.hasCondition`.
     * @param ctx the parse tree
     */
    enterHasCondition?: (ctx: HasConditionContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.hasCondition`.
     * @param ctx the parse tree
     */
    exitHasCondition?: (ctx: HasConditionContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.controlFlowStatement`.
     * @param ctx the parse tree
     */
    enterControlFlowStatement?: (ctx: ControlFlowStatementContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.controlFlowStatement`.
     * @param ctx the parse tree
     */
    exitControlFlowStatement?: (ctx: ControlFlowStatementContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.ifStatement`.
     * @param ctx the parse tree
     */
    enterIfStatement?: (ctx: IfStatementContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.ifStatement`.
     * @param ctx the parse tree
     */
    exitIfStatement?: (ctx: IfStatementContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.repeatStatement`.
     * @param ctx the parse tree
     */
    enterRepeatStatement?: (ctx: RepeatStatementContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.repeatStatement`.
     * @param ctx the parse tree
     */
    exitRepeatStatement?: (ctx: RepeatStatementContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.booleanExpression`.
     * @param ctx the parse tree
     */
    enterBooleanExpression?: (ctx: BooleanExpressionContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.booleanExpression`.
     * @param ctx the parse tree
     */
    exitBooleanExpression?: (ctx: BooleanExpressionContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.comparisonOperator`.
     * @param ctx the parse tree
     */
    enterComparisonOperator?: (ctx: ComparisonOperatorContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.comparisonOperator`.
     * @param ctx the parse tree
     */
    exitComparisonOperator?: (ctx: ComparisonOperatorContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.variableDeclaration`.
     * @param ctx the parse tree
     */
    enterVariableDeclaration?: (ctx: VariableDeclarationContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.variableDeclaration`.
     * @param ctx the parse tree
     */
    exitVariableDeclaration?: (ctx: VariableDeclarationContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.variableType`.
     * @param ctx the parse tree
     */
    enterVariableType?: (ctx: VariableTypeContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.variableType`.
     * @param ctx the parse tree
     */
    exitVariableType?: (ctx: VariableTypeContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.returnStatement`.
     * @param ctx the parse tree
     */
    enterReturnStatement?: (ctx: ReturnStatementContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.returnStatement`.
     * @param ctx the parse tree
     */
    exitReturnStatement?: (ctx: ReturnStatementContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.dataQueryStatement`.
     * @param ctx the parse tree
     */
    enterDataQueryStatement?: (ctx: DataQueryStatementContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.dataQueryStatement`.
     * @param ctx the parse tree
     */
    exitDataQueryStatement?: (ctx: DataQueryStatementContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.dataResultType`.
     * @param ctx the parse tree
     */
    enterDataResultType?: (ctx: DataResultTypeContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.dataResultType`.
     * @param ctx the parse tree
     */
    exitDataResultType?: (ctx: DataResultTypeContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.dataQuery`.
     * @param ctx the parse tree
     */
    enterDataQuery?: (ctx: DataQueryContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.dataQuery`.
     * @param ctx the parse tree
     */
    exitDataQuery?: (ctx: DataQueryContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.aggregationQuery`.
     * @param ctx the parse tree
     */
    enterAggregationQuery?: (ctx: AggregationQueryContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.aggregationQuery`.
     * @param ctx the parse tree
     */
    exitAggregationQuery?: (ctx: AggregationQueryContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.tableQuery`.
     * @param ctx the parse tree
     */
    enterTableQuery?: (ctx: TableQueryContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.tableQuery`.
     * @param ctx the parse tree
     */
    exitTableQuery?: (ctx: TableQueryContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.tableReference`.
     * @param ctx the parse tree
     */
    enterTableReference?: (ctx: TableReferenceContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.tableReference`.
     * @param ctx the parse tree
     */
    exitTableReference?: (ctx: TableReferenceContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.columnSelector`.
     * @param ctx the parse tree
     */
    enterColumnSelector?: (ctx: ColumnSelectorContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.columnSelector`.
     * @param ctx the parse tree
     */
    exitColumnSelector?: (ctx: ColumnSelectorContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.identifierList`.
     * @param ctx the parse tree
     */
    enterIdentifierList?: (ctx: IdentifierListContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.identifierList`.
     * @param ctx the parse tree
     */
    exitIdentifierList?: (ctx: IdentifierListContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.columnReference`.
     * @param ctx the parse tree
     */
    enterColumnReference?: (ctx: ColumnReferenceContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.columnReference`.
     * @param ctx the parse tree
     */
    exitColumnReference?: (ctx: ColumnReferenceContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.queryModifier`.
     * @param ctx the parse tree
     */
    enterQueryModifier?: (ctx: QueryModifierContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.queryModifier`.
     * @param ctx the parse tree
     */
    exitQueryModifier?: (ctx: QueryModifierContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.dataWhereClause`.
     * @param ctx the parse tree
     */
    enterDataWhereClause?: (ctx: DataWhereClauseContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.dataWhereClause`.
     * @param ctx the parse tree
     */
    exitDataWhereClause?: (ctx: DataWhereClauseContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.dataCondition`.
     * @param ctx the parse tree
     */
    enterDataCondition?: (ctx: DataConditionContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.dataCondition`.
     * @param ctx the parse tree
     */
    exitDataCondition?: (ctx: DataConditionContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.dataComparison`.
     * @param ctx the parse tree
     */
    enterDataComparison?: (ctx: DataComparisonContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.dataComparison`.
     * @param ctx the parse tree
     */
    exitDataComparison?: (ctx: DataComparisonContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.textOperator`.
     * @param ctx the parse tree
     */
    enterTextOperator?: (ctx: TextOperatorContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.textOperator`.
     * @param ctx the parse tree
     */
    exitTextOperator?: (ctx: TextOperatorContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.dateComparison`.
     * @param ctx the parse tree
     */
    enterDateComparison?: (ctx: DateComparisonContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.dateComparison`.
     * @param ctx the parse tree
     */
    exitDateComparison?: (ctx: DateComparisonContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.expressionList`.
     * @param ctx the parse tree
     */
    enterExpressionList?: (ctx: ExpressionListContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.expressionList`.
     * @param ctx the parse tree
     */
    exitExpressionList?: (ctx: ExpressionListContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.orderByClause`.
     * @param ctx the parse tree
     */
    enterOrderByClause?: (ctx: OrderByClauseContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.orderByClause`.
     * @param ctx the parse tree
     */
    exitOrderByClause?: (ctx: OrderByClauseContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.orderColumn`.
     * @param ctx the parse tree
     */
    enterOrderColumn?: (ctx: OrderColumnContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.orderColumn`.
     * @param ctx the parse tree
     */
    exitOrderColumn?: (ctx: OrderColumnContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.limitClause`.
     * @param ctx the parse tree
     */
    enterLimitClause?: (ctx: LimitClauseContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.limitClause`.
     * @param ctx the parse tree
     */
    exitLimitClause?: (ctx: LimitClauseContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.offsetClause`.
     * @param ctx the parse tree
     */
    enterOffsetClause?: (ctx: OffsetClauseContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.offsetClause`.
     * @param ctx the parse tree
     */
    exitOffsetClause?: (ctx: OffsetClauseContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.defaultClause`.
     * @param ctx the parse tree
     */
    enterDefaultClause?: (ctx: DefaultClauseContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.defaultClause`.
     * @param ctx the parse tree
     */
    exitDefaultClause?: (ctx: DefaultClauseContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.expression`.
     * @param ctx the parse tree
     */
    enterExpression?: (ctx: ExpressionContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.expression`.
     * @param ctx the parse tree
     */
    exitExpression?: (ctx: ExpressionContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.selectorExpression`.
     * @param ctx the parse tree
     */
    enterSelectorExpression?: (ctx: SelectorExpressionContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.selectorExpression`.
     * @param ctx the parse tree
     */
    exitSelectorExpression?: (ctx: SelectorExpressionContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.pageMethodReference`.
     * @param ctx the parse tree
     */
    enterPageMethodReference?: (ctx: PageMethodReferenceContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.pageMethodReference`.
     * @param ctx the parse tree
     */
    exitPageMethodReference?: (ctx: PageMethodReferenceContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.pageFieldReference`.
     * @param ctx the parse tree
     */
    enterPageFieldReference?: (ctx: PageFieldReferenceContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.pageFieldReference`.
     * @param ctx the parse tree
     */
    exitPageFieldReference?: (ctx: PageFieldReferenceContext) => void;
    /**
     * Enter a parse tree produced by `VeroParser.argumentList`.
     * @param ctx the parse tree
     */
    enterArgumentList?: (ctx: ArgumentListContext) => void;
    /**
     * Exit a parse tree produced by `VeroParser.argumentList`.
     * @param ctx the parse tree
     */
    exitArgumentList?: (ctx: ArgumentListContext) => void;

    visitTerminal(node: TerminalNode): void {}
    visitErrorNode(node: ErrorNode): void {}
    enterEveryRule(node: ParserRuleContext): void {}
    exitEveryRule(node: ParserRuleContext): void {}
}

