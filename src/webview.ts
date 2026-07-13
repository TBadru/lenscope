import * as vscode from 'vscode';
import * as path from 'path';

export function getWebviewContent(
    context: vscode.ExtensionContext,
    webview: vscode.Webview
): string {

    const scriptUri = webview.asWebviewUri(
        vscode.Uri.file(path.join(context.extensionPath, 'media', 'webview.js'))
    );

    
    const styleUri = webview.asWebviewUri(
        vscode.Uri.file(path.join(context.extensionPath, 'media', 'webview.css'))
    );

    const iconBase = webview.asWebviewUri(
      vscode.Uri.joinPath(context.extensionUri, "media", "icons")
    );


    return `
        <!DOCTYPE html>
        <html lang="en">
        <script>
          const ICON_BASE = "${iconBase}";
        </script>

        <head>
            <meta charset="UTF-8" />
            <meta http-equiv="Content-Security-Policy"
                content="default-src 'none'; img-src ${webview.cspSource} https:; 
                script-src ${webview.cspSource}; style-src ${webview.cspSource} 'unsafe-inline';">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link href="${styleUri}" rel="stylesheet" />
            <title>Lenscope</title>
        </head>
        <body>
             ${getHtmlTemplateForLiveGrep(scriptUri)}
             ${getHtmlTemplateForFindFiles(scriptUri)}
             ${getHtmlTemplateForCurrentBufferFuzzyFind(scriptUri)}

            <!-- Inline JS for keyboard selection in results -->
            <script>
                const resultsContainer = document.getElementById("results");
                let selectedIndex = 0;

                function updateSelection() {
                    const items = resultsContainer.querySelectorAll(".result-item");
                    items.forEach((item, i) => {
                        item.classList.toggle("selected", i === selectedIndex);
                    });
                }

                document.addEventListener("keydown", (e) => {
                    const items = resultsContainer.querySelectorAll(".result-item");
                    if (!items.length) return;

                    if (e.key === "ArrowDown") {
                        selectedIndex = (selectedIndex + 1) % items.length;
                        updateSelection();
                        e.preventDefault();
                    } else if (e.key === "ArrowUp") {
                        selectedIndex = (selectedIndex - 1 + items.length) % items.length;
                        updateSelection();
                        e.preventDefault();
                    }
                });

                updateSelection();
            </script>
        </body>
        </html>
    `;
}

// HTML template for the live grep interface
function getHtmlTemplateForLiveGrep(scriptUri: vscode.Uri) {
    return `
  <div id="lenscope-container">

        <!-- LIVE GREP -->
        <div id="search-bar">
            <div class="pane-header">
                <span>live grep</span>
            </div>
            <div class="search-input-row">
                <span class="search-prompt">&gt;</span>
                <input id="search-input" type="text" autofocus />
                <span id="result-count">0/0</span>
            </div>
        </div>

        <!-- MAIN 2-PANE LAYOUT -->
        <div id="main">

            <!-- RESULTS -->
            <div id="results">
                <div class="pane-header">
                    <span>results</span>
                </div>
                <div id="results-list">
                    <div class="placeholder">No results yet</div>
                </div>
            </div>

            <!-- GREP PREVIEW -->
            <div id="preview">
                <div class="pane-header">
                    <span>grep preview</span>
                </div>
                <!--  <pre><code id="preview-code"></code></pre> -->
                <pre id="preview-code" class="preview"></pre>
            </div>

        </div>

    </div>

    <script src="${scriptUri}"></script>

    `;

}

// HTML template for the find files interface
function getHtmlTemplateForFindFiles(scriptUri: vscode.Uri) {
    return `
        `;
}

// HTML template for the find files interface
function getHtmlTemplateForCurrentBufferFuzzyFind(scriptUri: vscode.Uri) {
    return `
        `;
}