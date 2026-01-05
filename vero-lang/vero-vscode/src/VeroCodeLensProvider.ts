import * as vscode from 'vscode';

export class VeroCodeLensProvider implements vscode.CodeLensProvider {
    private regex = {
        scenario: /^\s*SCENARIO\s+"([^"]+)"/gm,
        feature: /^\s*FEATURE\s+(\w+)\s*\{/gm
    };

    public provideCodeLenses(
        document: vscode.TextDocument,
        _token: vscode.CancellationToken
    ): vscode.CodeLens[] {
        const codeLenses: vscode.CodeLens[] = [];
        const text = document.getText();

        // Find all FEATURE declarations
        let match: RegExpExecArray | null;

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
