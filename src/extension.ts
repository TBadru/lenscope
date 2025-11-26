import * as vscode from 'vscode';
import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { getWebviewContent } from './webview';

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

        let FuseModule: any;
        let searchTimeout: NodeJS.Timeout | null = null;
        const DEBOUNCE_MS = 250;

        panel.webview.onDidReceiveMessage(async (msg) => {
            if (msg.type === "search") {
                if (searchTimeout) clearTimeout(searchTimeout);

                searchTimeout = setTimeout(async () => {
                    const query = msg.query || "";
                    console.log("Search query received:", query);

                    const rawResults = await ripgrepSearch(query);
                    console.log("Ripgrep results:", rawResults);

                    if (!FuseModule) {
                        FuseModule = (await import('fuse.js')).default;
                    }

                    const fuse = new FuseModule(rawResults, {
                        includeScore: true,
                        threshold: 0.5,
                    });

                    const fuzzyResults = query ? fuse.search(query).map((r: { item: string }) => r.item) : rawResults;
                    console.log("Fuzzy search results:", fuzzyResults);

                    panel.webview.postMessage({ type: "results", results: fuzzyResults });

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

// --------------------- Windows-safe ripgrep ---------------------
function getRipgrepPath(): string {
    // Default: use PATH
    const rgPath = "rg";

    // Common Windows locations
    const possiblePaths = [
        "C:\\Program Files\\Ripgrep\\rg.exe",
        "C:\\Program Files (x86)\\Ripgrep\\rg.exe",
        path.join(os.homedir(), "scoop", "shims", "rg.exe"),
        path.join("C:\\ProgramData\\chocolatey\\bin\\rg.exe"),
    ];

    for (const p of possiblePaths) {
        if (fs.existsSync(p)) return `"${p}"`; // wrap in quotes for spaces
    }

    return rgPath;
}

async function ripgrepSearch(query: string): Promise<string[]> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) return [];
    if (!query.trim()) return [];

    const workspacePath = workspaceFolders[0].uri.fsPath;
    const rgPath = getRipgrepPath();

    const safeQuery = query.replace(/'/g, "'\\''");
    const cmd = `${rgPath} --vimgrep '${safeQuery}'`;

    console.log("Executing:", cmd, "in", workspacePath);

    return new Promise((resolve) => {
        exec(cmd, { cwd: workspacePath, maxBuffer: 1024 * 5000 }, (err, stdout) => {
            if (err) {
                console.error("Ripgrep error: ", err);
                return resolve([]);
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

            resolve(lines.slice(0, 50));
        });
    });
}

// --------------------- Preview Reader ---------------------
async function readFilePreview(file: string): Promise<string> {
    try {
        const text = fs.readFileSync(file, 'utf8');
        return text.split('\n').slice(0, 200).join('\n');
    } catch (err) {
        return 'Unable to load preview.';
    }
}
