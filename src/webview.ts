import * as vscode from 'vscode';
import * as path from 'path';

export function getWebviewContent(
    context: vscode.ExtensionContext,
    webview: vscode.Webview
): string {

    // Adjust media path to point outside the 'src' folder
    const mediaPath = vscode.Uri.file(path.join(context.extensionPath, 'media'));

    const indexHtml = webview.asWebviewUri(
        vscode.Uri.file(path.join(context.extensionPath, 'media', 'index.html'))
    );

    const scriptUri = webview.asWebviewUri(
        vscode.Uri.file(path.join(context.extensionPath, 'media', 'webview.js'))
    );

    const styleUri = webview.asWebviewUri(
        vscode.Uri.file(path.join(context.extensionPath, 'media', 'webview.css'))
    );

    return `
        <!DOCTYPE html>
        <html lang="en">
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
            ${getHtmlTemplate(scriptUri)}
        </body>
        </html>
    `;
}

// HTML inline loader for Telescope-style UI
function getHtmlTemplate(scriptUri: vscode.Uri) {
    return `
  <div id="lenscope-container">

        <!-- SEARCH BAR -->
        <div id="search-bar">
            <input id="search-input" type="text" placeholder=">live grep" autofocus />
        </div>

        <!-- MAIN 2-PANE LAYOUT -->
        <div id="main">

            <!-- RESULTS LIST -->
            <div id="results">
                <div class="placeholder">results</div>
            </div>

            <!-- PREVIEW -->
            <div id="preview">
                <div class="placeholder">grep preview</div>
                <pre><code id="preview-code"></code></pre>
            </div>

        </div>

    </div>

    <script src="${scriptUri}"></script>
    `;
}
