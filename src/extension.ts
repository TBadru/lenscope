import * as vscode from 'vscode';
import { getWebviewContent } from './webview';
import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
    console.log('Lenscope extension activated.');

    const disposable = vscode.commands.registerCommand('lenscope.open', () => {

        const panel = vscode.window.createWebviewPanel(
            'lenscope',
            'Lenscope',
            vscode.ViewColumn.Active,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
            }
        );

        panel.webview.html = getWebviewContent(context, panel.webview);


        // Fuse.js module (dynamic import once per panel)

        let FuseModule: any;


        // Debounce setup

        let searchTimeout: NodeJS.Timeout | null = null;
        const DEBOUNCE_MS = 250;

        panel.webview.onDidReceiveMessage(async (msg) => {
            if (msg.type === "search") {
                // Debounce typing
                if (searchTimeout) clearTimeout(searchTimeout);

                searchTimeout = setTimeout(async () => {
                    const rawResults = await ripgrepSearch(msg.query);

                    // Dynamically import Fuse.js if not already imported
                    if (!FuseModule) {
                        FuseModule = (await import('fuse.js')).default;
                    }

                    const fuse = new FuseModule(rawResults, {
                        includeScore: true,
                        threshold: 0.4, // lower = stricter match
                    });

                    const fuzzyResults = msg.query
                        ? fuse.search(msg.query).map((r: { item: string; score: number }) => r.item)
                        : rawResults;

                    panel.webview.postMessage({ type: "results", results: fuzzyResults });
                }, DEBOUNCE_MS);
            }

            if (msg.type === "preview") {
                const filePath = msg.file.split(":")[0];
                const preview = await readFilePreview(filePath);
                panel.webview.postMessage({ type: "preview", preview });
            }

            if (msg.type === "openFile") {
                const doc = await vscode.workspace.openTextDocument(msg.file);
                vscode.window.showTextDocument(doc);
            }

            if (msg.type === "close") {
                panel.dispose();
            }
        });
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}


// Ripgrep search function

async function ripgrepSearch(query: string): Promise<string[]> {
    if (!query.trim()) return [];

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) return [];

    const workspacePath = workspaceFolders[0].uri.fsPath;

    return new Promise((resolve) => {
        const cmd = `rg --vimgrep "${query}"`;

        exec(cmd, { cwd: workspacePath, maxBuffer: 1024 * 5000 }, (err, stdout) => {
            if (err) return resolve([]);

            const lines = stdout
                .split("\n")
                .filter(l => l.trim() !== "")
                .map(l => {
                    const parts = l.split(":");
                    const file = parts[0];
                    const lineNum = parts[1];
                    const content = parts.slice(3).join(":");
                    return `${file}:${lineNum}: ${content}`;
                });

            resolve(lines.slice(0, 50));
        });
    });
}


// Read file preview

async function readFilePreview(file: string): Promise<string> {
    try {
        const text = fs.readFileSync(file, 'utf8');
        return text.split('\n').slice(0, 200).join('\n');
    } catch (err) {
        return 'Unable to load preview.';
    }
}
