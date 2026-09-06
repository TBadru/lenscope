import * as vscode from 'vscode';
import { exec, spawn, type ChildProcessWithoutNullStreams } from 'child_process';
import * as fs from 'fs';
import * as readline from 'readline';
import * as util from 'util';
import { getWebviewContent, getWebviewContentForFindFiles, getWebviewContentForCurrentBufferFuzzyFind } from './webview';
import * as os from "os";
import * as path from "path";


const execPromise = util.promisify(exec);
const RESULT_BATCH_SIZE = 100;
const RESULT_FLUSH_MS = 40;

interface GrepResult {
    file: string;
    relative: string;
    line: number;
    text: string;
}

interface FileResult {
    file: string;
    relative: string;
}

// cached RG path
let cachedRgPath: string | null = null;




async function getRgPath(): Promise<string> {
    if (cachedRgPath !== null) {return cachedRgPath;}

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
        if (!rgPath || !fs.existsSync(rgPath)) {throw new Error("rg not found");}

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
    let findFilesPanel: vscode.WebviewPanel | null = null;
    let bufferPanel: vscode.WebviewPanel | null = null;

    const findFilesDisposable = vscode.commands.registerCommand('lenscope.find_files', async () => {

        if (findFilesPanel) {
            findFilesPanel.reveal(vscode.ViewColumn.Active);
            return;
        }

        findFilesPanel = vscode.window.createWebviewPanel(
            'lenscope-find-files',
            'Lenscope: Find Files',
            vscode.ViewColumn.Active,
            { enableScripts: true, retainContextWhenHidden: true }
        );

        findFilesPanel.webview.html = getWebviewContentForFindFiles(context, findFilesPanel.webview);
        findFilesPanel.onDidDispose(() => { findFilesPanel = null; });

        let activeFileListProcess: ChildProcessWithoutNullStreams | null = null;

        findFilesPanel.onDidDispose(() => {
            if (activeFileListProcess && !activeFileListProcess.killed) {
                activeFileListProcess.kill();
            }
            activeFileListProcess = null;
        });

        findFilesPanel.webview.onDidReceiveMessage(async (msg: any) => {

            if (msg.type === "listFiles") {
                const workspacePath = getWorkspacePath();
                const rgPath = await getRgPath();
                if (!workspacePath || !rgPath) { return; }

                activeFileListProcess = startRipgrepFileList(
                    workspacePath,
                    rgPath,
                    (files) => {
                        findFilesPanel?.webview.postMessage({ type: "files", files });
                    },
                    () => {
                        activeFileListProcess = null;
                        findFilesPanel?.webview.postMessage({ type: "filesDone" });
                    }
                );
            }

            if (msg.type === "preview") {
                const preview = await readFilePreview(msg.file, msg.line ?? 1);
                findFilesPanel?.webview.postMessage({
                    type: "preview",
                    preview,
                    previewId: msg.previewId,
                });
            }

            if (msg.type === "openFile") {
                try {
                    const line = (msg.line ?? 1) - 1;
                    const doc = await vscode.workspace.openTextDocument(msg.file);
                    await vscode.window.showTextDocument(doc, {
                        selection: new vscode.Range(line, 0, line, 0)
                    });
                } catch {
                    vscode.window.showErrorMessage(`Failed to open file: ${msg.file}`);
                }
            }
        });
    });

    context.subscriptions.push(findFilesDisposable);

    const bufferDisposable = vscode.commands.registerCommand('lenscope.current_buffer_fuzzy_find', async () => {

        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            vscode.window.showErrorMessage('No active editor to search');
            return;
        }

        if (bufferPanel) {
            bufferPanel.dispose();
        }

        const document = activeEditor.document;
        const filePath = document.uri.fsPath;
        const workspacePath = getWorkspacePath();
        const relative = workspacePath ? path.relative(workspacePath, filePath) : path.basename(filePath);

        bufferPanel = vscode.window.createWebviewPanel(
            'lenscope-buffer',
            `Lenscope: ${path.basename(filePath)}`,
            vscode.ViewColumn.Beside,
            { enableScripts: true, retainContextWhenHidden: true }
        );

        bufferPanel.webview.html = getWebviewContentForCurrentBufferFuzzyFind(context, bufferPanel.webview);
        bufferPanel.onDidDispose(() => { bufferPanel = null; });

        const lines: GrepResult[] = [];
        for (let i = 0; i < document.lineCount; i++) {
            const text = document.lineAt(i).text;
            if (!text.trim()) { continue; }
            lines.push({ file: filePath, relative, line: i + 1, text });
        }

        bufferPanel.webview.onDidReceiveMessage(async (msg: any) => {

            if (msg.type === "listLines") {
                bufferPanel?.webview.postMessage({ type: "bufferLines", lines });
            }

            if (msg.type === "preview") {
                const preview = await readFilePreview(msg.file, msg.line);
                bufferPanel?.webview.postMessage({
                    type: "preview",
                    preview,
                    previewId: msg.previewId,
                });
            }

            if (msg.type === "openFile") {
                try {
                    const doc = await vscode.workspace.openTextDocument(msg.file);
                    await vscode.window.showTextDocument(doc, {
                        selection: new vscode.Range(msg.line - 1, 0, msg.line - 1, 0)
                    });
                } catch {
                    vscode.window.showErrorMessage(`Failed to open file: ${msg.file}`);
                }
            }
        });
    });

    context.subscriptions.push(bufferDisposable);

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

        let searchTimeout: NodeJS.Timeout | null = null;
        const DEBOUNCE_MS = 50;
        let searchVersion = 0;
        let activeSearchProcess: ChildProcessWithoutNullStreams | null = null;

        const cancelActiveSearch = () => {
            if (activeSearchProcess && !activeSearchProcess.killed) {
                activeSearchProcess.kill();
            }
            activeSearchProcess = null;
        };

        panel.onDidDispose(() => {
            if (searchTimeout) {clearTimeout(searchTimeout);}
            cancelActiveSearch();
        });

        panel.webview.onDidReceiveMessage(async (msg: any) => {

            if (msg.type === "cancelSearch") {
                if (searchTimeout) {clearTimeout(searchTimeout);}
                searchVersion++;
                cancelActiveSearch();
            }

            // search

            if (msg.type === "search") {

                if (searchTimeout) {clearTimeout(searchTimeout);}
                cancelActiveSearch();
                const currentSearch = ++searchVersion;

                searchTimeout = setTimeout(async () => {
                    const query: string = msg.query || "";
                    if (!query.trim()) {return;}

                    const workspacePath = getWorkspacePath();
                    const rgPath = await getRgPath();

                    if (currentSearch !== searchVersion || !workspacePath || !rgPath) {
                        return;
                    }

                    panel?.webview.postMessage({ type: "searchStart", searchId: currentSearch });

                    activeSearchProcess = startRipgrepSearch(
                        query,
                        workspacePath,
                        rgPath,
                        (results) => {
                            if (currentSearch !== searchVersion) {return;}
                            panel?.webview.postMessage({
                                type: "appendResults",
                                searchId: currentSearch,
                                results,
                            });
                        },
                        () => {
                            if (currentSearch !== searchVersion) {return;}
                            activeSearchProcess = null;
                            panel?.webview.postMessage({
                                type: "searchDone",
                                searchId: currentSearch,
                            });
                        }
                    );

                }, DEBOUNCE_MS);
            }

            // preview
            if (msg.type === "preview") {

                const preview = await readFilePreview(msg.file, msg.line);
                panel?.webview.postMessage({
                    type: "preview",
                    preview,
                    previewId: msg.previewId,
                });
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


function getWorkspacePath(): string | null {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {return null;}
    return workspaceFolders[0].uri.fsPath;
}

function startRipgrepSearch(
    query: string,
    workspacePath: string,
    rgPath: string,
    onResults: (results: GrepResult[]) => void,
    onDone: () => void
): ChildProcessWithoutNullStreams {
    const child = spawn(rgPath, [
        "-i",
        "--line-number",
        "--with-filename",
        "--no-heading",
        "--fixed-strings",
        "--color",
        "never",
        "--no-messages",
        "--",
        query,
        "."
    ], { cwd: workspacePath });

    let buffered = "";
    let pending: GrepResult[] = [];
    let flushTimer: NodeJS.Timeout | null = null;
    let done = false;
    const seen = new Set<string>();

    const flush = () => {
        if (flushTimer) {
            clearTimeout(flushTimer);
            flushTimer = null;
        }

        if (!pending.length) {return;}

        const results = pending;
        pending = [];
        onResults(results);
    };

    const scheduleFlush = () => {
        if (pending.length >= RESULT_BATCH_SIZE) {
            flush();
            return;
        }

        if (!flushTimer) {
            flushTimer = setTimeout(flush, RESULT_FLUSH_MS);
        }
    };

    const parseLines = (lines: string[]) => {
        for (const line of lines) {
            const result = parseGrepLine(line, workspacePath);
            if (!result) {continue;}

            const resultKey = `${result.relative}\0${result.line}\0${result.text}`;
            if (seen.has(resultKey)) {continue;}

            seen.add(resultKey);
            pending.push(result);
            scheduleFlush();
        }
    };

    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
        buffered += chunk;
        const lines = buffered.split("\n");
        buffered = lines.pop() || "";
        parseLines(lines);
    });
    child.stderr.on("data", () => undefined);

    const finish = () => {
        if (done) {return;}
        done = true;
        if (buffered) {
            parseLines([buffered]);
            buffered = "";
        }
        flush();
        onDone();
    };

    child.on("close", finish);
    child.on("error", finish);

    return child;
}

function parseGrepLine(line: string, workspacePath: string): GrepResult | null {
    const match = line.match(/^(.+?):(\d+)(?::\d+)?:(.*)$/);
    if (!match) {return null;}

    let [, file, lineNum, text] = match;

    if (!path.isAbsolute(file)) {
        file = path.join(workspacePath, file.replace(/^\.\//, ""));
    }

    return {
        file,
        relative: path.relative(workspacePath, file),
        line: Number(lineNum),
        text
    };
}


function startRipgrepFileList(
    workspacePath: string,
    rgPath: string,
    onFiles: (files: FileResult[]) => void,
    onDone: () => void
): ChildProcessWithoutNullStreams {
    const child = spawn(rgPath, [
        "--files",
        "--color", "never",
        "--no-messages",
        "."
    ], { cwd: workspacePath });

    let buffered = "";
    let pending: FileResult[] = [];
    let flushTimer: NodeJS.Timeout | null = null;
    let done = false;
    const seen = new Set<string>();

    const flush = () => {
        if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
        if (!pending.length) { return; }
        const files = pending;
        pending = [];
        onFiles(files);
    };

    const scheduleFlush = () => {
        if (pending.length >= RESULT_BATCH_SIZE) { flush(); return; }
        if (!flushTimer) { flushTimer = setTimeout(flush, RESULT_FLUSH_MS); }
    };

    const parseLines = (lines: string[]) => {
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) { continue; }
            if (seen.has(trimmed)) { continue; }
            seen.add(trimmed);
            const absolute = path.isAbsolute(trimmed)
                ? trimmed
                : path.join(workspacePath, trimmed.replace(/^\.\//, ""));
            pending.push({
                file: absolute,
                relative: path.relative(workspacePath, absolute),
            });
            scheduleFlush();
        }
    };

    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
        buffered += chunk;
        const lines = buffered.split("\n");
        buffered = lines.pop() || "";
        parseLines(lines);
    });
    child.stderr.on("data", () => undefined);

    const finish = () => {
        if (done) { return; }
        done = true;
        if (buffered) { parseLines([buffered]); buffered = ""; }
        flush();
        onDone();
    };

    child.on("close", finish);
    child.on("error", finish);

    return child;
}

// file preview
async function readFilePreview(file: string, lineNum: number): Promise<string> {
    try {
        const start = Math.max(1, lineNum - 10);
        const end = lineNum + 10;
        const stream = fs.createReadStream(file, { encoding: "utf8" });
        const reader = readline.createInterface({
            input: stream,
            crlfDelay: Infinity
        });

        let current = 0;
        const preview: string[] = [];

        for await (const line of reader) {
            current++;
            if (current < start) {continue;}
            if (current > end) {break;}

            preview.push(
                current === lineNum
                    ? `> ${current}: ${line}`
                    : `  ${current}: ${line}`
            );
        }

        reader.close();
        stream.destroy();

        return preview.join("\n");

    } catch {
        return "Unable to load preview.";
    }
}