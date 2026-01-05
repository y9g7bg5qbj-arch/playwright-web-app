import * as vscode from 'vscode';
import { VeroCodeLensProvider } from './VeroCodeLensProvider';

export function activate(context: vscode.ExtensionContext) {
    console.log('Vero Language extension is now active');

    // Register the CodeLens provider for .vero files
    const codeLensProvider = new VeroCodeLensProvider();
    context.subscriptions.push(
        vscode.languages.registerCodeLensProvider(
            { language: 'vero', scheme: 'file' },
            codeLensProvider
        )
    );

    // Register the run scenario command
    context.subscriptions.push(
        vscode.commands.registerCommand('vero.runScenario', async (scenarioName: string) => {
            const terminal = getOrCreateTerminal();
            const workspaceFolder = getWorkspaceFolder();

            if (workspaceFolder) {
                terminal.sendText(`cd "${workspaceFolder}" && npx vero run --scenario "${scenarioName}"`);
            } else {
                terminal.sendText(`npx vero run --scenario "${scenarioName}"`);
            }
            terminal.show();
        })
    );

    // Register the run feature command
    context.subscriptions.push(
        vscode.commands.registerCommand('vero.runFeature', async (featureName: string) => {
            const terminal = getOrCreateTerminal();
            const workspaceFolder = getWorkspaceFolder();

            if (workspaceFolder) {
                terminal.sendText(`cd "${workspaceFolder}" && npx vero run --feature "${featureName}"`);
            } else {
                terminal.sendText(`npx vero run --feature "${featureName}"`);
            }
            terminal.show();
        })
    );

    // Register the run file command
    context.subscriptions.push(
        vscode.commands.registerCommand('vero.runFile', async () => {
            const terminal = getOrCreateTerminal();
            const workspaceFolder = getWorkspaceFolder();

            if (workspaceFolder) {
                terminal.sendText(`cd "${workspaceFolder}" && npx vero run`);
            } else {
                terminal.sendText(`npx vero run`);
            }
            terminal.show();
        })
    );
}

function getOrCreateTerminal(): vscode.Terminal {
    const existingTerminal = vscode.window.terminals.find(t => t.name === 'Vero Tests');
    if (existingTerminal) {
        return existingTerminal;
    }
    return vscode.window.createTerminal('Vero Tests');
}

function getWorkspaceFolder(): string | undefined {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
        return workspaceFolders[0].uri.fsPath;
    }
    return undefined;
}

export function deactivate() { }
