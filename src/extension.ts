import * as vscode from 'vscode';
import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { getWebviewContent } from './webview'; // <-- Ensure this is in place


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

        // Get the webview content
        panel.webview.html = getWebviewContent(context, panel.webview);

        let FuseModule: any;
        let searchTimeout: NodeJS.Timeout | null = null;
        const DEBOUNCE_MS = 250;

        panel.webview.onDidReceiveMessage(async (msg) => {
    if (msg.type === "search") {
        if (searchTimeout) clearTimeout(searchTimeout);

        searchTimeout = setTimeout(async () => {
            const query = msg.query || "";
            console.log("Search query received:", query); // <-- Log the query

            // 1. Get raw ripgrep results for the query (even partial)
            const rawResults = await ripgrepSearch(query);
            console.log("Ripgrep results:", rawResults); // <-- Log the results from ripgrep

            // 2. Lazy load Fuse.js (only once)
            if (!FuseModule) {
                FuseModule = (await import('fuse.js')).default;
            }

            // 3. Create Fuse instance for fuzzy matching
            const fuse = new FuseModule(rawResults, {
                includeScore: true,
                threshold: 0.5, // fuzzy threshold
            });

            // 4. Perform fuzzy search if query is not empty
            const fuzzyResults = query ? fuse.search(query).map((r: { item: string }) => r.item) : rawResults;
            console.log("Fuzzy search results:", fuzzyResults); // <-- Log the results after Fuse.js filtering

            // 5. Send results to webview
            panel.webview.postMessage({ type: "results", results: fuzzyResults });

            // 6. Auto-preview the first result if available
            if (fuzzyResults.length > 0) {
                const firstFile = fuzzyResults[0].split(":")[0];
                const preview = await readFilePreview(firstFile);
                panel.webview.postMessage({ type: "preview", preview });
            } else {
                panel.webview.postMessage({ type: "preview", preview: "(preview empty)" });
            }
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
        const cmd = `rg --vimgrep "${query}"`; // Make sure the query is passed correctly to ripgrep

        exec(cmd, { cwd: workspacePath, maxBuffer: 1024 * 5000 }, (err, stdout) => {
            if (err) {
                console.error("Ripgrep error: ", err);
                return resolve([]);  // Return empty if error
            }

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

            console.log("Ripgrep search results:", lines);  // Add this log for debugging
            resolve(lines.slice(0, 50));  // Limit results for now to 50
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

