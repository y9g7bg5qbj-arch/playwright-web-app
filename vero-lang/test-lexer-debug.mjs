// Debug lexer output
import { tokenize } from './dist/lexer/lexer.js';

const input = 'feature Test { scenario "Test Right Click" { right click "Menu" } }';
console.log('Input:', input);
console.log('\nTokens:');

const { tokens, errors } = tokenize(input);
for (const token of tokens) {
    console.log(`  ${token.type.padEnd(20)} "${token.value}" (line ${token.line}, col ${token.column})`);
}

if (errors.length > 0) {
    console.log('\nLexer errors:', errors);
}
