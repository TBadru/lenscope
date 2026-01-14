const vscode = acquireVsCodeApi();

const searchBox = document.getElementById("search-input");
const resultsPane = document.getElementById("results");
const previewText = document.getElementById("preview-code");

// const FILE_ICONS = {
//   js: "",
//   ts: "",
//   jsx: "",
//   tsx: "",
//   rb: "",
//   py: "",
//   go: "",
//   rs: "",
//   java: "",
//   php: "",
//   html: "",
//   css: "",
//   scss: "",
//   json: "",
//   yml: "",
//   yaml: "",
//   md: "",
//   sh: "",
//   dockerfile: "",
//   sql: "",
//   default: ""
//  cpp: "",
//  c: "",
//  cs: "",
//  lua: "",
//  ps1: "",
//  razor: "",
//  zig: "",
//  nix: "",
//  gitattributes: "",
//  Rakefile: "",
//  Gemfile: "",
//  Makefile: "",
//  txt: ""
// };

// const FILE_ICONS = {
//   rb: "ruby-original.svg",
//   erb: "ruby-original.svg",
//   js: "javascript-original.svg",
//   ts: "typescript-original.svg",
//   jsx: "jsx.svg",
//   tsx: "tsx.svg",
//   html: "html5-original.svg",
//   css: "css.svg",
//   scss: "sass-original.svg",
//   json: "json.svg",
//   yml: "yaml-original.svg",
//   yaml: "yaml-original.svg",
//   py: "python-original.svg",
//   go: "go-original-wordmark.svg",
//   rs: "rust-original.svg",
//   java: "java-original.svg",
//   php: "php-original.svg",
//   scss: "sass-original.svg",
//   md: "markdown.svg",
//   sh: "sh.svg",
//   dockerfile: "docker-plain.svg",
//   sql: "sql.svg",
//   lua: "lua-original.svg",
//   ps1: "powershell-original.svg",
//   razor: "blazor-original.svg",
//   zig: "zig-original.svg",
//   nix: "nixos-original.svg",
//   cpp: "cplusplus-original.svg",
//   c: "c.svg",
//   cs: "csharp.svg",
//   gitattributes: "git-original.svg",
//   Rakefile: "rails-plain.svg",
//   Gemfile: "rails-plain.svg",
//   Makefile: "cmake-original.svg",
//   txt: "text.svg",
//   default: "default.svg"
// };


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

let debounceTimeout = null;
const DEBOUNCE_MS = 200;

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

// search input with debounce
searchBox.addEventListener("input", () => {
    const query = searchBox.value.trim();

    if (debounceTimeout) clearTimeout(debounceTimeout);

    debounceTimeout = setTimeout(() => {
        if (!query) {
            results = [];
            selectedIndex = -1;
            resultsPane.innerHTML = "<div class='placeholder'>No results yet</div>";
            previewText.textContent = "(preview empty)";
            return;
        }

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
resultsPane.addEventListener("click", (e) => {
    const target = e.target.closest(".result-item");
    if (!target) return;

    const index = Array.from(resultsPane.children).indexOf(target);
    if (index < 0) return;

    selectedIndex = index;
    updateSelectionUI();
    requestPreview();
});

// receive messages from extension
window.addEventListener("message", (event) => {
    const msg = event.data;

    if (msg.type === "results") {
        results = Array.isArray(msg.results) ? msg.results : [];

        if (!results.length) {
            selectedIndex = -1;
            resultsPane.innerHTML = "<div class='no-results'>No results found</div>";
            previewText.textContent = "(preview empty)";
        } else {
            selectedIndex = 0;
            renderResults(results, searchBox.value);
            requestPreview();
        }
    }

    if (msg.type === "preview") {
        previewText.textContent = msg.preview || "(preview empty)";
    }
});

function renderResults(items, query) {
    resultsPane.innerHTML = "";

    const regex = query
        ? new RegExp(query.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&"), "gi")
        : null;

    items.forEach((item, index) => {
        const el = document.createElement("div");
        el.className = "result-item";

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
        resultsPane.appendChild(el);
    });

    scrollToSelected();
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
}

function updateSelectionUI() {
    const items = resultsPane.querySelectorAll(".result-item");
    items.forEach((el, i) => el.classList.toggle("selected", i === selectedIndex));

    const selectedEl = items[selectedIndex];
    if (selectedEl) selectedEl.scrollIntoView({ block: "nearest" });
}

// preview
function requestPreview() {
    if (selectedIndex < 0 || selectedIndex >= results.length) {
        previewText.textContent = "(preview empty)";
        return;
    }

    const item = results[selectedIndex];

    vscode.postMessage({
        type: "preview",
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

