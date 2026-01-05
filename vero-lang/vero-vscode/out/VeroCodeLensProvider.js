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
exports.VeroCodeLensProvider = void 0;
const vscode = __importStar(require("vscode"));
class VeroCodeLensProvider {
    constructor() {
        this.regex = {
            scenario: /^\s*SCENARIO\s+"([^"]+)"/gm,
            feature: /^\s*FEATURE\s+(\w+)\s*\{/gm
        };
    }
    provideCodeLenses(document, _token) {
        const codeLenses = [];
        const text = document.getText();
        // Find all FEATURE declarations
        let match;
        // Reset regex state
        this.regex.feature.lastIndex = 0;
        while ((match = this.regex.feature.exec(text)) !== null) {
            const featureName = match[1];
            const line = document.positionAt(match.index).line;
            const range = new vscode.Range(line, 0, line, 0);
            // Run Feature button
            codeLenses.push(new vscode.CodeLens(range, {
                title: '▶ Run Feature',
                command: 'vero.runFeature',
                arguments: [featureName],
                tooltip: `Run all scenarios in ${featureName}`
            }));
            // Run All button (less prominent)
            codeLenses.push(new vscode.CodeLens(range, {
                title: '▶▶ Run All',
                command: 'vero.runFile',
                arguments: [],
                tooltip: 'Run all tests in the project'
            }));
        }
        // Find all SCENARIO declarations
        this.regex.scenario.lastIndex = 0;
        while ((match = this.regex.scenario.exec(text)) !== null) {
            const scenarioName = match[1];
            const line = document.positionAt(match.index).line;
            const range = new vscode.Range(line, 0, line, 0);
            codeLenses.push(new vscode.CodeLens(range, {
                title: '▶ Run',
                command: 'vero.runScenario',
                arguments: [scenarioName],
                tooltip: `Run: ${scenarioName}`
            }));
            // Debug button
            codeLenses.push(new vscode.CodeLens(range, {
                title: '🐛 Debug',
                command: 'vero.runScenario',
                arguments: [scenarioName],
                tooltip: `Debug: ${scenarioName} (headed mode)`
            }));
        }
        return codeLenses;
    }
}
exports.VeroCodeLensProvider = VeroCodeLensProvider;
//# sourceMappingURL=VeroCodeLensProvider.js.map