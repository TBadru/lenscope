// helper that loads HTML + resource URIs


import * as vscode from 'vscode';
import * as path from 'path';

export function getWebviewContent(
    context: vscode.ExtensionContext,
    webview: vscode.Webview
): string {

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

// HTML inline loader
function getHtmlTemplate(scriptUri: vscode.Uri) {
    return `
    <div id="container">
        <div id="search-pane">
            <input id="search-box" type="text" placeholder="Search..." autofocus />
        </div>

        <div id="results-pane"></div>

        <div id="preview-pane">
            <pre id="preview-text">(select a file to preview)</pre>
        </div>
    </div>

    <script src="${scriptUri}"></script>
    `;
}
