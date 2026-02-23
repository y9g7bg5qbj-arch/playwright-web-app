export interface VeroValidationError {
    code: string;
    category: string;
    severity: 'error' | 'warning' | 'info' | 'hint';
    location?: {
        line: number;
        column?: number;
        endLine?: number;
        endColumn?: number;
    };
    title: string;
    whatWentWrong: string;
    howToFix: string;
    suggestions: Array<{ text: string; action?: string }>;
    veroStatement?: string;
    selector?: string;
}

export function getParserErrorCode(message: string): string {
    if (message.includes('Expected') && message.includes('{')) return 'VERO-202';
    if (message.includes('Expected') && message.includes('}')) return 'VERO-202';
    if (message.includes('Expected') && message.includes('string')) return 'VERO-204';
    if (message.includes('Expected') && message.includes('name')) return 'VERO-205';
    if (message.includes('Unexpected token')) return 'VERO-206';
    if (message.includes('Missing')) return 'VERO-201';
    return 'VERO-203';
}

export function getParserErrorTitle(message: string): string {
    if (message.includes('Expected') && message.includes('{')) return 'Missing Opening Brace';
    if (message.includes('Expected') && message.includes('}')) return 'Missing Closing Brace';
    if (message.includes('Expected') && message.includes('string')) return 'Missing String';
    if (message.includes('Expected') && message.includes('name')) return 'Missing Name';
    if (message.includes('Unexpected token')) return 'Unexpected Token';
    if (message.includes('Missing')) return 'Missing Keyword';
    return 'Invalid Statement';
}

export function getParserErrorFix(message: string): string {
    if (message.includes('{')) return 'Add an opening brace "{" after the declaration.';
    if (message.includes('}')) return 'Add a closing brace "}" to end the block.';
    if (message.includes('string')) return 'Add a quoted string (e.g., "example").';
    if (message.includes('name')) return 'Provide a name for this element.';
    return 'Check the syntax at this location.';
}

export function getValidationErrorCode(message: string): string {
    if (message.includes('Duplicate page')) return 'VERO-303';
    if (message.includes('Duplicate field')) return 'VERO-303';
    if (message.includes('not defined')) return 'VERO-301';
    return 'VERO-302';
}

export function getValidationErrorTitle(message: string): string {
    if (message.includes('Duplicate page')) return 'Duplicate Page Definition';
    if (message.includes('Duplicate field')) return 'Duplicate Field Definition';
    if (message.includes('not defined')) return 'Undefined Reference';
    return 'Validation Error';
}

export function getValidationErrorFix(message: string): string {
    if (message.includes('Duplicate')) return 'Remove or rename the duplicate definition.';
    if (message.includes('not defined')) return 'Define this element before using it, or check the spelling.';
    return 'Fix the validation issue.';
}
