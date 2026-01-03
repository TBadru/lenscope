import * as vscode from 'vscode';
import { exec } from 'child_process';
import * as fs from 'fs';
import * as util from 'util';
import { getWebviewContent } from './webview';

const execPromise = util.promisify(exec);

// Cached RG Path
let cachedRgPath: string | null = null;

async function getRgPath(): Promise<string> {
    if (cachedRgPath !== null) return cachedRgPath;

    try {
        const { stdout } = await execPromise('where rg');
        const lines = stdout.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length === 0) throw new Error("rg.exe not found");

        cachedRgPath = lines[0];
        return cachedRgPath;
    } catch {
        vscode.window.showErrorMessage("ripgrep (rg) not found in PATH.");
        cachedRgPath = '';
        return '';
    }
}

export function activate(context: vscode.ExtensionContext) {

    let panel: vscode.WebviewPanel | null = null;

    const disposable = vscode.commands.registerCommand('lenscope.live_grep', () => {

        if (panel) {
            panel.reveal(vscode.ViewColumn.Active);
            return;
        }

        panel = vscode.window.createWebviewPanel(
            'lenscope',
            'Lenscope',
            vscode.ViewColumn.Active,
            { enableScripts: true, retainContextWhenHidden: true }
        );

        panel.webview.html = getWebviewContent(context, panel.webview);

        panel.onDidDispose(() => { panel = null; });

        let FuseModule: any;
        let searchTimeout: NodeJS.Timeout | null = null;
        const DEBOUNCE_MS = 250;

        panel.webview.onDidReceiveMessage(async (msg: any) => {

            //  SEARCH 
            if (msg.type === "search") {

                if (searchTimeout) clearTimeout(searchTimeout);

                searchTimeout = setTimeout(async () => {
                    const query: string = msg.query || "";
                    const rawResults = await ripgrepSearch(query);

                    if (!FuseModule) FuseModule = (await import("fuse.js")).default;
                    const fuse = new FuseModule(rawResults, {
                        includeScore: true,
                        threshold: 0.5,
                        isCaseSensitive: false
                    });

                    const fuzzyResults =
                        query ? fuse.search(query).map((r: any) => r.item) : rawResults;

                    panel?.webview.postMessage({ type: "results", results: fuzzyResults });

                    if (fuzzyResults.length > 0) {
                        const [filePath, lineNumStr] = fuzzyResults[0].split(":");
                        const lineNum = parseInt(lineNumStr, 10) || 1;
                        const preview = await readFilePreview(filePath, lineNum);
                        panel?.webview.postMessage({ type: "preview", preview });
                    } else {
                        panel?.webview.postMessage({ type: "preview", preview: "(preview empty)" });
                    }

                }, DEBOUNCE_MS);
            }

            // ---- PREVIEW ----
            if (msg.type === "preview") {
                const parts = msg.file.split(":");
                const filePath: string = parts[0];
                const lineNum: number = parseInt(parts[1], 10) || 1;

                const preview = await readFilePreview(filePath, lineNum);
                panel?.webview.postMessage({ type: "preview", preview });
            }

            // ---- OPEN FILE ----
            if (msg.type === "openFile") {
                try {
                    const doc = await vscode.workspace.openTextDocument(msg.file);
                    vscode.window.showTextDocument(doc);
                } catch {
                    vscode.window.showErrorMessage(`Failed to open file: ${msg.file}`);
                }
            }

        });
    });

    context.subscriptions.push(disposable);
}

export function deactivate() { }



//  RIPGREP SEARCH

async function ripgrepSearch(query: string): Promise<string[]> {
    if (!query.trim()) return [];

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) return [];
    const workspacePath = workspaceFolders[0].uri.fsPath;

    const rgPath = await getRgPath();
    if (!rgPath) return [];

    const safeQuery = query.replace(/"/g, '\\"');

    const cmd = `"${rgPath}" -i --vimgrep --fixed-strings "${safeQuery}" .`;

    try {
        const { stdout } = await execPromise(cmd, {
            cwd: workspacePath,
            maxBuffer: 1024 * 5000
        });

        return stdout
            .split("\n")
            .filter(Boolean)
            .map(line => {
                const parts = line.split(":");
                const file = parts[0];
                const lineNum = parts[1];
                const content = parts.slice(3).join(":");
                return `${file}:${lineNum}:${content}`;
            })
            .slice(0, 50);

    } catch {
        return [];
    }
}



//  FILE PREVIEW

async function readFilePreview(file: string, lineNum: number): Promise<string> {
    try {
        const text = fs.readFileSync(file, "utf8");
        const lines = text.split("\n");

        const start = Math.max(0, lineNum - 10);
        const end = Math.min(lines.length, lineNum + 10);

        const snippet = lines
            .slice(start, end)
            .map((line, i) => {
                const currentLine = start + i + 1;
                return currentLine === lineNum
                    ? `> ${currentLine}: ${line}`
                    : `  ${currentLine}: ${line}`;
            })
            .join("\n");

        return snippet;

    } catch (err) {
        return "Unable to load preview.";
    }
}
