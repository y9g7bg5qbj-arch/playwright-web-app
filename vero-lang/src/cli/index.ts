#!/usr/bin/env node

import { Command } from 'commander';
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { tokenize } from '../lexer/index.js';
import { parse } from '../parser/index.js';
import { transpile } from '../transpiler/index.js';
import { validate } from '../validator/index.js';
import { ProgramNode } from '../parser/ast.js';

const program = new Command();

program
    .name('vero')
    .description('Vero - Plain-English test automation DSL')
    .version('0.1.0');

// === INIT ===
program
    .command('init')
    .description('Initialize a new Vero project')
    .action(async () => {
        console.log('🚀 Initializing Vero project...\n');

        const dirs = ['pages', 'features', 'generated/pages', 'generated/tests'];
        for (const dir of dirs) {
            if (!existsSync(dir)) {
                mkdirSync(dir, { recursive: true });
                console.log(`  ✓ Created ${dir}/`);
            }
        }

        // Create config
        const config = {
            baseUrl: 'http://localhost:3000',
            outputDir: 'generated',
            playwright: {
                browser: 'chromium',
                headless: true,
                workers: '50%'
            }
        };
        writeFileSync('vero.config.json', JSON.stringify(config, null, 2));
        console.log('  ✓ Created vero.config.json');

        // Create example files
        const examplePage = `PAGE LoginPage {
    FIELD emailInput = TEXTBOX "Email"
    FIELD passwordInput = TEXTBOX "Password"
    FIELD submitBtn = BUTTON "Sign In"
    
    login WITH email, password {
        FILL emailInput WITH email
        FILL passwordInput WITH password
        CLICK submitBtn
    }
}`;

        const exampleFeature = `FEATURE Login {
    USE LoginPage
    
    BEFORE EACH {
        OPEN "/login"
    }
    
    SCENARIO "User can login" @smoke {
        DO LoginPage.login WITH "test@example.com", "secret"
        VERIFY "Dashboard" IS VISIBLE
    }
}`;

        writeFileSync('pages/LoginPage.vero', examplePage);
        writeFileSync('features/Login.vero', exampleFeature);
        console.log('  ✓ Created pages/LoginPage.vero');
        console.log('  ✓ Created features/Login.vero');

        console.log('\n✅ Vero project initialized!');
        console.log('\nNext steps:');
        console.log('  1. Edit your .vero files in pages/ and features/');
        console.log('  2. Run "vero compile" to generate Playwright tests');
        console.log('  3. Run "vero run" to execute tests');
    });

// === COMPILE ===
program
    .command('compile')
    .description('Compile Vero files to Playwright')
    .action(async () => {
        console.log('📝 Compiling Vero files...\n');

        const pageFiles = findVeroFiles('pages');
        const featureFiles = findVeroFiles('features');

        if (pageFiles.length === 0 && featureFiles.length === 0) {
            console.error('❌ No .vero files found in pages/ or features/');
            console.log('   Run "vero init" to create example files.');
            process.exit(1);
        }

        const combinedAst: ProgramNode = { type: 'Program', pages: [], features: [] };
        let hasErrors = false;

        for (const file of [...pageFiles, ...featureFiles]) {
            console.log(`  Processing ${file}...`);
            const source = readFileSync(file, 'utf-8');
            const { tokens, errors: lexerErrors } = tokenize(source);

            if (lexerErrors.length > 0) {
                console.error(`  ❌ ${file}: Lexer errors`);
                for (const err of lexerErrors) {
                    console.error(`     Line ${err.line}: ${err.message}`);
                }
                hasErrors = true;
                continue;
            }

            const { ast, errors: parseErrors } = parse(tokens);

            if (parseErrors.length > 0) {
                console.error(`  ❌ ${file}: Parse errors`);
                for (const err of parseErrors) {
                    console.error(`     Line ${err.line}: ${err.message}`);
                }
                hasErrors = true;
                continue;
            }

            combinedAst.pages.push(...ast.pages);
            combinedAst.features.push(...ast.features);
        }

        if (hasErrors) {
            console.error('\n❌ Compilation failed due to errors');
            process.exit(1);
        }

        // Validate
        const validation = validate(combinedAst);

        if (validation.warnings.length > 0) {
            console.log('\n  ⚠️  Warnings:');
            for (const warning of validation.warnings) {
                console.log(`     ${warning.message}`);
                if (warning.suggestion) {
                    console.log(`        💡 ${warning.suggestion}`);
                }
            }
        }

        if (!validation.valid) {
            console.error('\n  ❌ Validation errors:');
            for (const error of validation.errors) {
                console.error(`     ${error.message}`);
                if (error.suggestion) {
                    console.error(`        💡 ${error.suggestion}`);
                }
            }
            process.exit(1);
        }

        // Transpile
        const result = transpile(combinedAst);

        mkdirSync('generated/pages', { recursive: true });
        mkdirSync('generated/tests', { recursive: true });

        console.log('\n  Generated files:');

        for (const [name, code] of result.pages) {
            writeFileSync(`generated/pages/${name}.ts`, code);
            console.log(`  ✓ generated/pages/${name}.ts`);
        }

        for (const [name, code] of result.tests) {
            writeFileSync(`generated/tests/${name}.spec.ts`, code);
            console.log(`  ✓ generated/tests/${name}.spec.ts`);
        }

        console.log('\n✅ Compilation complete!');
    });

// === CHECK ===
program
    .command('check')
    .description('Check Vero files for errors without compiling')
    .action(async () => {
        console.log('🔍 Checking Vero files...\n');

        const pageFiles = findVeroFiles('pages');
        const featureFiles = findVeroFiles('features');

        const combinedAst: ProgramNode = { type: 'Program', pages: [], features: [] };
        let hasErrors = false;

        for (const file of [...pageFiles, ...featureFiles]) {
            const source = readFileSync(file, 'utf-8');
            const { tokens, errors: lexerErrors } = tokenize(source);

            if (lexerErrors.length > 0) {
                console.error(`❌ ${file}:`);
                for (const err of lexerErrors) {
                    console.error(`   Line ${err.line}: ${err.message}`);
                }
                hasErrors = true;
                continue;
            }

            const { ast, errors: parseErrors } = parse(tokens);

            if (parseErrors.length > 0) {
                console.error(`❌ ${file}:`);
                for (const err of parseErrors) {
                    console.error(`   Line ${err.line}: ${err.message}`);
                }
                hasErrors = true;
                continue;
            }

            console.log(`✓ ${file}`);
            combinedAst.pages.push(...ast.pages);
            combinedAst.features.push(...ast.features);
        }

        // Validate
        const validation = validate(combinedAst);

        if (validation.warnings.length > 0) {
            console.log('\n⚠️  Warnings:');
            for (const warning of validation.warnings) {
                console.log(`   ${warning.message}`);
            }
        }

        if (!validation.valid) {
            console.error('\n❌ Validation errors:');
            for (const error of validation.errors) {
                console.error(`   ${error.message}`);
            }
            hasErrors = true;
        }

        if (hasErrors) {
            process.exit(1);
        }

        console.log('\n✅ All files are valid!');
    });

// === RUN ===
program
    .command('run')
    .description('Compile and run tests')
    .option('-b, --browser <browser>', 'Browser: chromium, firefox, webkit')
    .option('-w, --workers <count>', 'Parallel workers')
    .option('--shard <shard>', 'Shard: current/total (e.g., 1/3)')
    .option('--headed', 'Run with visible browser')
    .option('-t, --tag <tag>', 'Run tests with specific tag')
    .option('-s, --scenario <name>', 'Run a specific scenario by name')
    .option('-f, --feature <name>', 'Run all scenarios in a specific feature')
    .action(async (options) => {
        console.log('🧪 Running tests...\n');

        // First compile
        const pageFiles = findVeroFiles('pages');
        const featureFiles = findVeroFiles('features');

        if (pageFiles.length === 0 && featureFiles.length === 0) {
            console.error('❌ No .vero files found');
            process.exit(1);
        }

        const combinedAst: ProgramNode = { type: 'Program', pages: [], features: [] };

        for (const file of [...pageFiles, ...featureFiles]) {
            const source = readFileSync(file, 'utf-8');
            const { tokens, errors: lexerErrors } = tokenize(source);
            if (lexerErrors.length > 0) {
                console.error(`❌ ${file}: Lexer errors`);
                process.exit(1);
            }

            const { ast, errors: parseErrors } = parse(tokens);
            if (parseErrors.length > 0) {
                console.error(`❌ ${file}: Parse errors`);
                process.exit(1);
            }

            combinedAst.pages.push(...ast.pages);
            combinedAst.features.push(...ast.features);
        }

        const validation = validate(combinedAst);
        if (!validation.valid) {
            console.error('❌ Validation failed');
            process.exit(1);
        }

        const result = transpile(combinedAst);

        mkdirSync('generated/pages', { recursive: true });
        mkdirSync('generated/tests', { recursive: true });

        for (const [name, code] of result.pages) {
            writeFileSync(`generated/pages/${name}.ts`, code);
        }
        for (const [name, code] of result.tests) {
            writeFileSync(`generated/tests/${name}.spec.ts`, code);
        }

        console.log('  ✓ Compiled .vero files\n');

        // Run Playwright
        const args = ['npx', 'playwright', 'test'];

        if (options.browser) args.push('--project', options.browser);
        if (options.workers) args.push('--workers', options.workers);
        if (options.shard) args.push('--shard', options.shard);
        if (options.headed) args.push('--headed');
        if (options.tag) args.push('--grep', `@${options.tag}`);
        if (options.scenario) args.push('--grep', options.scenario);
        if (options.feature) args.push('--grep', options.feature);

        console.log(`  Running: ${args.join(' ')}\n`);

        const { spawn } = await import('child_process');
        const child = spawn(args[0], args.slice(1), { stdio: 'inherit', shell: true });

        child.on('close', (code) => {
            process.exit(code || 0);
        });
    });

// Helper: find .vero files
function findVeroFiles(dir: string): string[] {
    const files: string[] = [];
    if (!existsSync(dir)) return files;

    for (const entry of readdirSync(dir)) {
        const fullPath = join(dir, entry);
        if (statSync(fullPath).isFile() && entry.endsWith('.vero')) {
            files.push(fullPath);
        }
    }
    return files;
}

program.parse();
