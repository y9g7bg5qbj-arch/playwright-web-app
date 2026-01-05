/**
 * Test harness for ANTLR Vero Parser
 * Parses Vero scripts and validates the grammar
 */

import { CharStream, CommonTokenStream, ParseTreeWalker, ParserRuleContext } from 'antlr4ng';
import { VeroLexer } from './parser/generated/grammar/VeroLexer.js';
import { VeroParser } from './parser/generated/grammar/VeroParser.js';
import * as fs from 'fs';
import * as path from 'path';

function parseVeroFile(filePath: string): boolean {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Parsing: ${filePath}`);
    console.log('='.repeat(60));

    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        console.log(`\n📄 Source (${content.length} chars):\n`);
        console.log(content);

        // Create lexer and parser
        const input = CharStream.fromString(content);
        const lexer = new VeroLexer(input);
        const tokens = new CommonTokenStream(lexer);
        const parser = new VeroParser(tokens);

        // Parse the program
        console.log('\n🔍 Parsing with ANTLR4...\n');
        const tree = parser.program();

        // Check for syntax errors
        const syntaxErrors = parser.numberOfSyntaxErrors;
        if (syntaxErrors > 0) {
            console.error(`❌ Found ${syntaxErrors} syntax error(s)`);
            return false;
        }

        console.log('✅ Parse successful! No syntax errors.');
        console.log(`\n📊 Parse tree has ${countNodes(tree)} nodes`);

        // Print simplified tree structure
        console.log('\n🌳 Parse Tree Structure:');
        printTree(tree, parser.ruleNames, 0);

        console.log(`\n✅ Validation complete for ${path.basename(filePath)}`);
        return true;

    } catch (error) {
        console.error(`❌ Error parsing file: ${error}`);
        return false;
    }
}

function countNodes(tree: ParserRuleContext): number {
    let count = 1;
    for (let i = 0; i < tree.getChildCount(); i++) {
        const child = tree.getChild(i);
        if (child instanceof ParserRuleContext) {
            count += countNodes(child);
        } else {
            count++;
        }
    }
    return count;
}

function printTree(tree: ParserRuleContext, ruleNames: string[], indent: number) {
    const prefix = '  '.repeat(indent);
    const ruleName = ruleNames[tree.ruleIndex] || 'unknown';

    // Only print important nodes
    const importantRules = [
        'program', 'pageDeclaration', 'featureDeclaration',
        'fieldDeclaration', 'actionDeclaration', 'scenarioDeclaration',
        'useStatement', 'hookDeclaration', 'clickAction', 'fillAction',
        'openAction', 'waitAction', 'doAction', 'logAction', 'assertionStatement'
    ];

    if (importantRules.includes(ruleName)) {
        let text = '';
        // Get relevant text for this node
        if (ruleName === 'pageDeclaration' || ruleName === 'featureDeclaration') {
            const identifier = tree.getChild(1);
            text = identifier ? ` "${identifier.getText()}"` : '';
        } else if (ruleName === 'fieldDeclaration') {
            const name = tree.getChild(1);
            const selector = tree.getChild(3);
            text = name && selector ? ` ${name.getText()} = ${selector.getText()}` : '';
        } else if (ruleName === 'scenarioDeclaration') {
            const name = tree.getChild(1);
            text = name ? ` ${name.getText()}` : '';
        } else if (ruleName === 'useStatement') {
            const name = tree.getChild(1);
            text = name ? ` ${name.getText()}` : '';
        }

        console.log(`${prefix}📌 ${ruleName}${text}`);
    }

    // Recurse into children
    for (let i = 0; i < tree.getChildCount(); i++) {
        const child = tree.getChild(i);
        if (child instanceof ParserRuleContext) {
            printTree(child, ruleNames, indent + 1);
        }
    }
}

// Main execution
const args = process.argv.slice(2);
const filePath = args[0] || './test-project/features/AmazonSearch.vero';

if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
}

const success = parseVeroFile(filePath);
process.exit(success ? 0 : 1);
