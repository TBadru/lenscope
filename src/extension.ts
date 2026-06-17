import * as vscode from 'vscode';
import { exec } from 'child_process';
import * as fs from 'fs';
import * as util from 'util';
import { getWebviewContent } from './webview';
import * as os from "os";
import * as path from "path";


const execPromise = util.promisify(exec);

interface GrepResult {
    file: string;
    line: number;
    text: string;
}

// cached RG path
let cachedRgPath: string | null = null;




async function getRgPath(): Promise<string> {
    if (cachedRgPath !== null) return cachedRgPath;

    const isWindows = os.platform() === "win32";

    try {
        // 1. Windows
        if (isWindows) {
            const { stdout } = await execPromise("where rg");
            const rgPath = stdout.split(/\r?\n/)[0].trim();
            if (rgPath && fs.existsSync(rgPath)) {
                cachedRgPath = rgPath;
                return cachedRgPath;
            }
        }

        // 2. macOS / Linux
        const commonPaths = [
            "/opt/homebrew/bin/rg",   // Apple Silicon Homebrew
            "/usr/local/bin/rg",      // Intel Homebrew
            "/usr/bin/rg"             // System install
        ];

        for (const p of commonPaths) {
            if (fs.existsSync(p)) {
                cachedRgPath = p;
                console.log("Found rg at:", p);
                return p;
            }
        }

        // 3. Fallback to `which`
        const { stdout } = await execPromise("which rg", {
            shell: "/bin/zsh"
        });

        const rgPath = stdout.split(/\r?\n/)[0].trim();
        if (!rgPath || !fs.existsSync(rgPath)) throw new Error("rg not found");

        cachedRgPath = rgPath;
        console.log("Found rg via which:", rgPath);
        return rgPath;

    } catch (err) {
        vscode.window.showErrorMessage(
            "ripgrep (rg) not found. Install ripgrep"
        );
        cachedRgPath = "";
        return "";
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

            // search

            if (msg.type === "search") {

                if (searchTimeout) clearTimeout(searchTimeout);

                searchTimeout = setTimeout(async () => {
                    const query: string = msg.query || "";
                    const rawResults = await ripgrepSearch(query);

                    // if (!FuseModule) FuseModule = (await import("fuse.js")).default;
                    if (!FuseModule) {
                        FuseModule = (await import("fuse.js")).default;
                    }

                    const fuse = new FuseModule(rawResults, {
                        keys: ["file", "text"],
                        includeScore: true,
                        threshold: 0.5,
                        isCaseSensitive: false
                    });

                    const results: GrepResult[] = 
                    query? fuse .search(query).map((r: any) => r.item): rawResults;

                    panel?.webview.postMessage({
                      type: "results",
                      results,
                    });

                    if (results.length > 0) {
                      const preview = await readFilePreview(
                        results[0].file,
                        results[0].line
                      );
                      panel?.webview.postMessage({ type: "preview", preview });
                    } else {
                      panel?.webview.postMessage({
                        type: "preview",
                        preview: "(preview empty)",
                      });
                    }

                }, DEBOUNCE_MS);
            }

            // preview
            if (msg.type === "preview") {

                const preview = await readFilePreview(msg.file, msg.line);
                panel?.webview.postMessage({ type: "preview", preview });
            }

            //open file
            if (msg.type === "openFile") {
                try {
                    const doc = await vscode.workspace.openTextDocument(msg.file);
                    await vscode.window.showTextDocument(doc, {
                        selection: new vscode.Range(
                            msg.line - 1,
                            0,
                            msg.line - 1,
                            0
                        )
                    });
                } catch {
                    vscode.window.showErrorMessage(`Failed to open file: ${msg.file}`);
                }
            }
            
        });
    });

    context.subscriptions.push(disposable);
}

export function deactivate() { }


// ripgrep search
async function ripgrepSearch(query: string): Promise<GrepResult[]> {
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
            maxBuffer: 1024 * 1024 * 10
        });

        return stdout
            .split("\n")
            .filter(Boolean)
            .map(line => {
                const match = line.match(/^(.+?):(\d+):(\d+):(.*)$/);
                if (!match) return null;

                let [, file, lineNum, , text] = match;

                if (!path.isAbsolute(file)) {
                    file = path.join(workspacePath, file.replace(/^\.\//, ""));
                }

                return {
                    file,
                    relative: path.relative(workspacePath, file),
                    line: Number(lineNum),
                    text
                } as GrepResult;
            })
            .filter((v): v is GrepResult => Boolean(v))
            .slice(0, 50);

    } catch {
        return [];
    }
}


// file preview
async function readFilePreview(file: string, lineNum: number): Promise<string> {
    try {
        const text = fs.readFileSync(file, "utf8");
        const lines = text.split("\n");

        const start = Math.max(0, lineNum - 10);
        const end = Math.min(lines.length, lineNum + 10);

        return lines
            .slice(start, end)
            .map((line, i) => {
                const current = start + i + 1;
                return current === lineNum
                    ? `> ${current}: ${line}`
                    : `  ${current}: ${line}`;
            })
            .join("\n");

    } catch {
        return "Unable to load preview.";
    }
}