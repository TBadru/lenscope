import * as vscode from "vscode";
import { exec } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { getWebviewContent } from "./webview";
import * as util from "util";

const execPromise = util.promisify(exec);

// ---------------- Cached RG Path ----------------
let cachedRgPath: string | null = null;

// async function getRgPath(): Promise<string> {
//     if (cachedRgPath !== null) return cachedRgPath;

//     try {
//         const { stdout } = await execPromise('where rg');
//         const lines = stdout.split('\n').map(l => l.trim()).filter(Boolean);

//         // pick first real .exe (avoid scoop shims if needed)
//         const rgExe = lines.find(l => l.endsWith('rg.exe') && !l.includes('scoop\\shims'));
//         if (!rgExe) throw new Error('No valid rg.exe found');

//         cachedRgPath = rgExe;
//         console.log('Found rg at:', cachedRgPath);
//         return cachedRgPath;
//     } catch {
//         vscode.window.showErrorMessage('ripgrep (rg) not found in PATH. Please install it.');
//         cachedRgPath = ''; // mark as not found
//         return '';
//     }
// }
async function getRgPath(): Promise<string> {
  if (cachedRgPath !== null) return cachedRgPath;

  try {
    const { stdout } = await execPromise("where rg");
    const lines = stdout
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    // Pick first available rg.exe
    const rgExe = lines.find((l) => l.endsWith("rg.exe")) ?? "";
    if (!rgExe) throw new Error("No rg.exe found");

    cachedRgPath = rgExe;
    console.log("Found rg at:", cachedRgPath);
    return cachedRgPath;
  } catch {
    vscode.window.showErrorMessage(
      "ripgrep (rg) not found in PATH. Please install it."
    );
    cachedRgPath = "";
    return "";
  }
}

// ---------------- Activate Extension ----------------
export function activate(context: vscode.ExtensionContext) {
  console.log("Lenscope extension activated.");

  const disposable = vscode.commands.registerCommand("lenscope.open", () => {
    const panel = vscode.window.createWebviewPanel(
      "lenscope",
      "Lenscope",
      vscode.ViewColumn.Active,
      { enableScripts: true, retainContextWhenHidden: true }
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

          // 1. Get raw ripgrep results
          const rawResults = await ripgrepSearch(query);
          console.log("Ripgrep results:", rawResults);

          // 2. Lazy-load Fuse.js
          if (!FuseModule) FuseModule = (await import("fuse.js")).default;

          // 3. Fuzzy search
          const fuse = new FuseModule(rawResults, {
            includeScore: true,
            threshold: 0.5,
          });

          const fuzzyResults = query
            ? fuse.search(query).map((r: { item: string }) => r.item)
            : rawResults;
          console.log("Fuzzy search results:", fuzzyResults);

          // 4. Send results to webview
          panel.webview.postMessage({ type: "results", results: fuzzyResults });

          // 5. Auto-preview first result
          if (fuzzyResults.length > 0) {
            const firstFile = fuzzyResults[0].split(":")[0];
            const preview = await readFilePreview(firstFile);
            panel.webview.postMessage({ type: "preview", preview });
          } else {
            panel.webview.postMessage({
              type: "preview",
              preview: "(preview empty)",
            });
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

// ---------------- Windows-safe Ripgrep Search ----------------
// ---------------- Windows-safe Ripgrep Search (fully safe for special characters) ----------------
// ---------------- Windows-safe Ripgrep Search ----------------
async function ripgrepSearch(query: string): Promise<string[]> {
  if (!query.trim()) return [];

  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) return [];
  const workspacePath = workspaceFolders[0].uri.fsPath;

  const rgPath = await getRgPath();
  if (!rgPath) return [];

  const safeQuery = query.replace(/"/g, '\\"');
  const cmd = `"${rgPath}" --vimgrep --fixed-strings "${safeQuery}" .`;

  console.log("Executing:", cmd, "in", workspacePath);

  try {
    const { stdout, stderr } = await execPromise(cmd, {
      cwd: workspacePath,
      maxBuffer: 1024 * 5000,
    });
    if (stderr) console.error("RG stderr:", stderr);

    const lines = stdout
      .split("\n")
      .filter((l) => l.trim() !== "")
      .map((l) => {
        const parts = l.split(":");
        const file = parts[0];
        const lineNum = parts[1];
        const content = parts.slice(3).join(":");
        return `${file}:${lineNum}: ${content}`;
      });

    return lines.slice(0, 50);
  } catch (err) {
    console.error("Ripgrep error:", err);
    return [];
  }
}

// ---------------- File Preview ----------------
async function readFilePreview(file: string): Promise<string> {
  try {
    const text = fs.readFileSync(file, "utf8");
    return text.split("\n").slice(0, 200).join("\n");
  } catch {
    return "Unable to load preview.";
  }
}
