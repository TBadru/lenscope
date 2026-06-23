const vscode = acquireVsCodeApi();

const searchBox = document.getElementById("search-input");
const resultsList = document.getElementById("results-list");
const previewText = document.getElementById("preview-code");
const resultCount = document.getElementById("result-count");

const FILE_ICONS = {
  /* Ruby */
  rb: "ruby-original.svg",
  erb: "ruby-original.svg",
  rake: "ruby-original.svg",

  /* JavaScript / TypeScript */
  js: "javascript-original.svg",
  mjs: "javascript-original.svg",
  cjs: "javascript-original.svg",
  ts: "typescript-original.svg",
  jsx: "react-original.svg",
  tsx: "react-original.svg",

  /* Web */
  html: "html5-original.svg",
  htm: "html5-original.svg",
  css: "css3-original.svg",
  scss: "sass-original.svg",
  sass: "sass-original.svg",
  less: "less-plain-wordmark.svg",

  /* Data / Config */
  json: "json.svg",
  jsonc: "json.svg",
  yml: "yaml-original.svg",
  yaml: "yaml-original.svg",
  toml: "toml-original.svg",
  ini: "settings.svg",
  env: "settings.svg",

  /* Python */
  py: "python-original.svg",
  pyw: "python-original.svg",

  /* Go */
  go: "go-original.svg",
  mod: "go-original.svg",

  /* Rust */
  rs: "rust-original.svg",

  /* JVM */
  java: "java-original.svg",
  kt: "kotlin-original.svg",
  kts: "kotlin-original.svg",
  scala: "scala-original.svg",
  groovy: "groovy-original.svg",

  /* PHP */
  php: "php-original.svg",

  /* Databases */
  sql: "sql.svg",
  prisma: "prisma-original.svg",

  /* Shell */
  sh: "bash-original.svg",
  bash: "bash-original.svg",
  zsh: "zsh-original.svg",
  fish: "bash-original.svg",

  /* Containers / DevOps */
  Dockerfile: "docker-original.svg",
  dockerignore: "docker-original.svg",
  tf: "terraform-original.svg",
  tfvars: "terraform-original.svg",
  helm: "helm-original.svg",

  /* C family */
  c: "c-original.svg",
  h: "c-original.svg",
  cpp: "cplusplus-original.svg",
  hpp: "cplusplus-original.svg",
  cc: "cplusplus-original.svg",
  cs: "csharp-original.svg",

  /* Systems */
  zig: "zig-original.svg",
  nix: "nixos-original.svg",

  /* Lua */
  lua: "lua-original.svg",

  /* PowerShell */
  ps1: "powershell-original.svg",

  /* .NET / Razor */
  razor: "blazor-original.svg",
  csproj: "dotnetcore-original.svg",

  /* Build systems */
  Makefile: "cmake-original.svg",
  makefile: "cmake-original.svg",
  cmake: "cmake-original.svg",

  /* Version control */
  gitignore: "git-original.svg",
  gitattributes: "git-original.svg",
  gitmodules: "git-original.svg",

  /* Docs */
  md: "markdown-original.svg",
  mdx: "markdown-original.svg",
  rst: "markdown-original.svg",
  txt: "text.svg",

  /* Default fallback */
  default: "default.svg"
};


function getFileIconPath(file) {
    const ext = file.split(".").pop().toLowerCase();
    return `${ICON_BASE}/${FILE_ICONS[ext] || FILE_ICONS.default}`;
}



let results = [];
let selectedIndex = -1;
let currentPreviewFile = "";
let activeSearchId = 0;
let activePreviewId = 0;

let debounceTimeout = null;
const DEBOUNCE_MS = 200;

const EXTENSION_LANGUAGE = {
    js: "javascript",
    mjs: "javascript",
    cjs: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    json: "json",
    jsonc: "json",
    html: "html",
    htm: "html",
    css: "css",
    scss: "css",
    sass: "css",
    py: "python",
    rb: "ruby",
    erb: "ruby",
    go: "go",
    rs: "rust",
    lua: "lua",
    java: "java",
    kt: "kotlin",
    kts: "kotlin",
    php: "php",
    sh: "shell",
    bash: "shell",
    zsh: "shell",
    yml: "yaml",
    yaml: "yaml",
    toml: "toml",
    sql: "sql",
    c: "c",
    h: "c",
    cpp: "cpp",
    hpp: "cpp",
    cc: "cpp",
    cs: "csharp",
    zig: "zig",
    nix: "nix",
    dockerfile: "dockerfile"
};

const KEYWORDS = new Set([
    "abstract", "alias", "and", "as", "async", "await", "begin", "break",
    "case", "catch", "class", "const", "continue", "def", "default",
    "defer", "do", "elif", "else", "elsif", "end", "enum", "export",
    "extends", "false", "final", "finally", "fn", "for", "from", "func",
    "function", "go", "if", "impl", "import", "in", "include", "interface",
    "is", "let", "local", "match", "module", "mut", "new", "nil", "not",
    "null", "or", "package", "private", "protected", "public", "return",
    "self", "static", "struct", "super", "switch", "then", "this", "throw",
    "trait", "true", "try", "type", "use", "using", "var", "void", "when",
    "while", "yield"
]);

// escape HTML 
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function getPreviewLanguage(file) {
    if (!file) return "";

    const name = file.split(/[\\/]/).pop().toLowerCase();
    if (name === "dockerfile") return "dockerfile";

    const ext = name.includes(".") ? name.split(".").pop() : name;
    return EXTENSION_LANGUAGE[ext] || "";
}

function syntaxSpan(className, value) {
    return `<span class="${className}">${escapeHtml(value)}</span>`;
}

function scanString(line, start) {
    const quote = line[start];
    let i = start + 1;

    while (i < line.length) {
        if (line[i] === "\\") {
            i += 2;
            continue;
        }

        if (line[i] === quote) {
            return i + 1;
        }

        i++;
    }

    return line.length;
}

function lineCommentPrefix(language, rest) {
    if (rest.startsWith("//") && !["python", "ruby", "shell", "yaml", "toml"].includes(language)) return "//";
    if (rest.startsWith("#") && ["python", "ruby", "shell", "yaml", "toml", "dockerfile", "nix"].includes(language)) return "#";
    if (rest.startsWith("--") && ["lua", "sql"].includes(language)) return "--";
    if (rest.startsWith("<!--") && language === "html") return "<!--";
    return "";
}

function highlightCode(code, file) {
    const language = getPreviewLanguage(file);
    let html = "";
    let i = 0;

    while (i < code.length) {
        const rest = code.slice(i);
        const commentPrefix = lineCommentPrefix(language, rest);

        if (commentPrefix) {
            html += syntaxSpan("syntax-comment", rest);
            break;
        }

        if (rest.startsWith("/*")) {
            const end = code.indexOf("*/", i + 2);
            const next = end === -1 ? code.length : end + 2;
            html += syntaxSpan("syntax-comment", code.slice(i, next));
            i = next;
            continue;
        }

        if (code[i] === "\"" || code[i] === "'" || code[i] === "`") {
            const next = scanString(code, i);
            html += syntaxSpan("syntax-string", code.slice(i, next));
            i = next;
            continue;
        }

        const numberMatch = rest.match(/^(?:0x[\da-f]+|\d+(?:\.\d+)?)/i);
        if (numberMatch) {
            html += syntaxSpan("syntax-number", numberMatch[0]);
            i += numberMatch[0].length;
            continue;
        }

        const cssColorMatch = language === "css" ? rest.match(/^#[\da-f]{3,8}\b/i) : null;
        if (cssColorMatch) {
            html += syntaxSpan("syntax-string", cssColorMatch[0]);
            i += cssColorMatch[0].length;
            continue;
        }

        const wordMatch = rest.match(/^[A-Za-z_$][\w$-]*/);
        if (wordMatch) {
            const word = wordMatch[0];
            const after = code.slice(i + word.length);
            const before = code.slice(Math.max(0, i - 2), i);

            if (word === "true" || word === "false" || word === "null" || word === "nil") {
                html += syntaxSpan("syntax-constant", word);
            } else if (KEYWORDS.has(word)) {
                html += syntaxSpan("syntax-keyword", word);
            } else if (/^\s*\(/.test(after)) {
                html += syntaxSpan("syntax-function", word);
            } else if (language === "css" && /^\s*:/.test(after)) {
                html += syntaxSpan("syntax-property", word);
            } else if (language === "html" && /<\/?$/.test(before)) {
                html += syntaxSpan("syntax-type", word);
            } else if (/^[A-Z]/.test(word)) {
                html += syntaxSpan("syntax-type", word);
            } else {
                html += escapeHtml(word);
            }

            i += word.length;
            continue;
        }

        html += escapeHtml(code[i]);
        i++;
    }

    return html;
}

function renderPreview(preview, file = currentPreviewFile) {
    const text = preview || "(preview empty)";
    const lines = text.split("\n");

    previewText.innerHTML = lines.map((line) => {
        const match = line.match(/^([> ])\s*(\d+):(.*)$/);

        if (!match) {
            return `<span class="preview-line"><span class="preview-line-content">${highlightCode(line, file)}</span></span>`;
        }

        const [, marker, lineNumber, content] = match;
        const activeClass = marker === ">" ? " active" : "";

        return `<span class="preview-line${activeClass}"><span class="preview-line-number">${escapeHtml(lineNumber)}</span><span class="preview-line-content">${highlightCode(content, file)}</span></span>`;
    }).join("");
}

renderPreview("(preview empty)");

function updateResultCount() {
    const current = results.length && selectedIndex >= 0 ? selectedIndex + 1 : 0;
    resultCount.textContent = `${current}/${results.length}`;
}

updateResultCount();

// search input with debounce
searchBox.addEventListener("input", () => {
    const query = searchBox.value.trim();

    if (debounceTimeout) clearTimeout(debounceTimeout);

    activeSearchId++;
    activePreviewId++;
    results = [];
    selectedIndex = -1;
    currentPreviewFile = "";
    renderPreview("(preview empty)");
    updateResultCount();
    vscode.postMessage({ type: "cancelSearch" });

    if (!query) {
        resultsList.innerHTML = "<div class='placeholder'>No results yet</div>";
        return;
    }

    resultsList.innerHTML = "<div class='placeholder'>Searching...</div>";
    debounceTimeout = setTimeout(() => {
        vscode.postMessage({ type: "search", query });
    }, DEBOUNCE_MS);
});

// keep search box focused
searchBox.focus();

//  Keyboard Navigation 
document.addEventListener("keydown", (e) => {
    if (!results.length) return;

    if (e.key === "ArrowDown" || e.key === "j") { e.preventDefault(); moveSelection(1); }
    if (e.key === "ArrowUp" || e.key === "k") { e.preventDefault(); moveSelection(-1); }
    if (e.key === "Enter") { e.preventDefault(); openSelectedFile(); }
    if (e.key === "Escape") {
        e.preventDefault();
        vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    }
});

// mouse click selection
resultsList.addEventListener("click", (e) => {
    const target = e.target.closest(".result-item");
    if (!target) return;

    const index = Number(target.dataset.index);
    if (!Number.isInteger(index) || index < 0) return;

    selectedIndex = index;
    updateSelectionUI();
    requestPreview();
    updateResultCount();
});

// receive messages from extension
window.addEventListener("message", (event) => {
    const msg = event.data;

    if (msg.type === "searchStart") {
        activeSearchId = msg.searchId;
        activePreviewId++;
        results = [];
        selectedIndex = -1;
        currentPreviewFile = "";
        resultsList.innerHTML = "<div class='placeholder'>Searching...</div>";
        renderPreview("(preview empty)");
        updateResultCount();
    }

    if (msg.type === "appendResults") {
        if (msg.searchId !== activeSearchId) return;

        const incoming = Array.isArray(msg.results) ? msg.results : [];
        if (!incoming.length) return;

        const wasEmpty = results.length === 0;
        const startIndex = results.length;
        results.push(...incoming);

        if (wasEmpty) {
            resultsList.innerHTML = "";
            selectedIndex = 0;
            currentPreviewFile = results[0].relative || results[0].file || "";
        }

        appendResults(incoming, startIndex, searchBox.value);
        updateSelectionUI();

        if (wasEmpty) {
            requestPreview();
        }

        updateResultCount();
    }

    if (msg.type === "searchDone") {
        if (msg.searchId !== activeSearchId) return;

        if (!results.length) {
            selectedIndex = -1;
            currentPreviewFile = "";
            resultsList.innerHTML = "<div class='no-results'>No results found</div>";
            renderPreview("(preview empty)");
            updateResultCount();
        }
    }

    if (msg.type === "results") {
        results = Array.isArray(msg.results) ? msg.results : [];

        if (!results.length) {
            selectedIndex = -1;
            currentPreviewFile = "";
            resultsList.innerHTML = "<div class='no-results'>No results found</div>";
            renderPreview("(preview empty)");
            updateResultCount();
        } else {
            selectedIndex = 0;
            currentPreviewFile = results[0].relative || results[0].file || "";
            renderResults(results, searchBox.value);
            requestPreview();
            updateResultCount();
        }
    }

    if (msg.type === "preview") {
        if (msg.previewId !== undefined && msg.previewId !== activePreviewId) return;

        renderPreview(msg.preview || "(preview empty)");
    }
});

function renderResults(items, query) {
    resultsList.innerHTML = "";
    appendResults(items, 0, query);
    scrollToSelected();
}

function appendResults(items, startIndex, query) {
    const regex = query
        ? new RegExp(query.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&"), "gi")
        : null;
    const fragment = document.createDocumentFragment();

    items.forEach((item, index) => {
        fragment.appendChild(renderResultItem(item, startIndex + index, regex));
    });

    resultsList.appendChild(fragment);
}

function renderResultItem(item, index, regex) {
    const el = document.createElement("div");
    el.className = "result-item";
    el.dataset.index = String(index);

    const iconPath = getFileIconPath(item.relative);
    const fileLabel = `${item.relative}:${item.line}`;
    let matchText = escapeHtml(item.text);

    if (regex) {
        matchText = matchText.replace(
            regex,
            m => `<span class="match">${m}</span>`
        );
    }

    el.innerHTML = `
      <img class="file-icon" src="${iconPath}" />
      <div class="result-content">
        <div class="result-file">${escapeHtml(fileLabel)}</div>
        <div class="result-text">${matchText}</div>
      </div>
    `;

    if (index === selectedIndex) el.classList.add("selected");
    return el;
}


// get file extension
function getFileExtension(path) {
    const name = path.split("/").pop().toLowerCase();
    if (name === "dockerfile") return "dockerfile";
    const parts = name.split(".");
    return parts.length > 1 ? parts.pop() : "";
}

// get icon for file
function getFileIcon(path) {
    const ext = getFileExtension(path);
    return FILE_ICONS[ext] || FILE_ICONS.default;
}

//  navigation
function moveSelection(delta) {
    if (!results.length) return;

    selectedIndex = (selectedIndex + delta + results.length) % results.length;
    updateSelectionUI();
    requestPreview();
    updateResultCount();
}

function updateSelectionUI() {
    const currentSelected = resultsList.querySelector(".result-item.selected");
    if (currentSelected) currentSelected.classList.remove("selected");

    const selectedEl = resultsList.querySelector(`.result-item[data-index="${selectedIndex}"]`);
    if (selectedEl) selectedEl.classList.add("selected");
    if (selectedEl) selectedEl.scrollIntoView({ block: "nearest" });
}

function scrollToSelected() {
    const selectedEl = resultsList.querySelector(".result-item.selected");
    if (selectedEl) selectedEl.scrollIntoView({ block: "nearest" });
}

// preview
function requestPreview() {
    if (selectedIndex < 0 || selectedIndex >= results.length) {
        currentPreviewFile = "";
        activePreviewId++;
        renderPreview("(preview empty)");
        return;
    }

    const item = results[selectedIndex];
    currentPreviewFile = item.relative || item.file || "";
    const previewId = ++activePreviewId;

    vscode.postMessage({
        type: "preview",
        previewId,
        file: item.file,
        line: item.line
    });
}


// open file
function openSelectedFile() {
    if (!results.length || selectedIndex < 0) return;

    const item = results[selectedIndex];

    vscode.postMessage({
        type: "openFile",
        file: item.file,
        line: item.line
    });
}
