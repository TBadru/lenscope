const vscode = acquireVsCodeApi();

const searchBox = document.getElementById("search-input");
const resultsPane = document.getElementById("results");
const previewText = document.getElementById("preview-code");

let results = [];
let selectedIndex = -1;
let fuse = null;

// Send search query to extension
searchBox.addEventListener("input", () => {
    const query = searchBox.value.trim();
    vscode.postMessage({ type: "search", query });
});

// Keep search box focused
searchBox.focus();

// Keyboard navigation
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

// Mouse click selection
resultsPane.addEventListener("click", (e) => {
    const target = e.target.closest(".result-item");
    if (!target) return;

    const index = Array.from(resultsPane.children).indexOf(target);
    if (index < 0) return;

    selectedIndex = index;
    updateSelectionUI();
    requestPreview();
});

// Receive messages from extension
window.addEventListener("message", (event) => {
    const msg = event.data;

    if (msg.type === "results") {
        results = Array.isArray(msg.results) ? msg.results : [];
        selectedIndex = results.length > 0 ? 0 : -1;
        renderResults(results, searchBox.value);
        if (selectedIndex >= 0) requestPreview();
        else previewText.textContent = "(preview empty)";
    }

    if (msg.type === "preview") {
        previewText.textContent = msg.preview || "(preview empty)";
    }
});

// Render results list with fuzzy match highlighting
function renderResults(items, query) {
    resultsPane.innerHTML = "";

    if (!items.length) {
        resultsPane.innerHTML = "<div class='no-results'>No results found</div>";
        return;
    }

    const regex = new RegExp(query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), "gi");

    items.forEach((text, index) => {
        const el = document.createElement("div");
        el.className = "result-item";

        // Highlight fuzzy match
        if (query) {
            el.innerHTML = text.replace(regex, match => `<span class="match">${match}</span>`);
        } else {
            el.textContent = text;
        }

        if (index === selectedIndex) el.classList.add("selected");
        resultsPane.appendChild(el);
    });
}

// Move selection up/down
function moveSelection(delta) {
    if (!results.length) return;

    selectedIndex += delta;
    if (selectedIndex < 0) selectedIndex = results.length - 1;
    if (selectedIndex >= results.length) selectedIndex = 0;

    updateSelectionUI();
    requestPreview();
}

// Update UI + scroll selected
function updateSelectionUI() {
    const items = resultsPane.querySelectorAll(".result-item");
    items.forEach((el, i) => el.classList.toggle("selected", i === selectedIndex));

    const selectedEl = items[selectedIndex];
    if (selectedEl) selectedEl.scrollIntoView({ block: "nearest" });
}

// Request preview for current selection
function requestPreview() {
    if (selectedIndex < 0 || selectedIndex >= results.length) {
        previewText.textContent = "(preview empty)";
        return;
    }
    vscode.postMessage({ type: "preview", file: results[selectedIndex] });
}

// Open selected file in VS Code
function openSelectedFile() {
    if (!results.length || selectedIndex < 0) return;
    const file = results[selectedIndex].split(":")[0];
    vscode.postMessage({ type: "openFile", file });
}
