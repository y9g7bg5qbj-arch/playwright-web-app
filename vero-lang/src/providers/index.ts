export { provideDocumentSymbols, getFlatSymbols, findSymbolAtPosition, SymbolKind } from './documentSymbolProvider.js';
export type { DocumentSymbol } from './documentSymbolProvider.js';

export { provideHover, KEYWORD_DOCS } from './hoverProvider.js';
export type { HoverResult, HoverContext } from './hoverProvider.js';

export { provideFoldingRanges, getBlockTypeAtLine, FoldingRangeKind } from './foldingRangeProvider.js';
export type { FoldingRange } from './foldingRangeProvider.js';

export { provideDefinition, provideDefinitionAsync } from './definitionProvider.js';
export type { Location, LocationLink, DefinitionContext, DefinitionResult } from './definitionProvider.js';

export { provideReferences, provideReferencesAsync, countReferences } from './referencesProvider.js';
export type { ReferencesContext, ReferenceLocation } from './referencesProvider.js';

export { symbolRegistry, parseVeroPages, indexFile } from './symbolRegistry.js';
export type {
    VeroPageDefinition,
    VeroFieldDefinition,
    VeroActionDefinition,
    VeroVariableDefinition,
    VeroFeatureDefinition,
    SymbolLocation,
    SymbolReference,
} from './symbolRegistry.js';
