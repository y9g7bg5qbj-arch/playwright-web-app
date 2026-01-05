"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const VeroCodeLensProvider_1 = require("./VeroCodeLensProvider");
function activate(context) {
    console.log('Vero Language extension is now active');
    // Register the CodeLens provider for .vero files
    const codeLensProvider = new VeroCodeLensProvider_1.VeroCodeLensProvider();
    context.subscriptions.push(vscode.languages.registerCodeLensProvider({ language: 'vero', scheme: 'file' }, codeLensProvider));
    // Register the run scenario command
    context.subscriptions.push(vscode.commands.registerCommand('vero.runScenario', async (scenarioName) => {
        const terminal = getOrCreateTerminal();
        const workspaceFolder = getWorkspaceFolder();
        if (workspaceFolder) {
            terminal.sendText(`cd "${workspaceFolder}" && npx vero run --scenario "${scenarioName}"`);
        }
        else {
            terminal.sendText(`npx vero run --scenario "${scenarioName}"`);
        }
        terminal.show();
    }));
    // Register the run feature command
    context.subscriptions.push(vscode.commands.registerCommand('vero.runFeature', async (featureName) => {
        const terminal = getOrCreateTerminal();
        const workspaceFolder = getWorkspaceFolder();
        if (workspaceFolder) {
            terminal.sendText(`cd "${workspaceFolder}" && npx vero run --feature "${featureName}"`);
        }
        else {
            terminal.sendText(`npx vero run --feature "${featureName}"`);
        }
        terminal.show();
    }));
    // Register the run file command
    context.subscriptions.push(vscode.commands.registerCommand('vero.runFile', async () => {
        const terminal = getOrCreateTerminal();
        const workspaceFolder = getWorkspaceFolder();
        if (workspaceFolder) {
            terminal.sendText(`cd "${workspaceFolder}" && npx vero run`);
        }
        else {
            terminal.sendText(`npx vero run`);
        }
        terminal.show();
    }));
}
function getOrCreateTerminal() {
    const existingTerminal = vscode.window.terminals.find(t => t.name === 'Vero Tests');
    if (existingTerminal) {
        return existingTerminal;
    }
    return vscode.window.createTerminal('Vero Tests');
}
function getWorkspaceFolder() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
        return workspaceFolders[0].uri.fsPath;
    }
    return undefined;
}
function deactivate() { }
//# sourceMappingURL=extension.js.map