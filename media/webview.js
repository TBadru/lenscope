const vscode = acquireVsCodeApi();

const searchBox = document.getElementById("search-input");
const resultsPane = document.getElementById("results");
const previewText = document.getElementById("preview-code");

let results = [];
let selectedIndex = -1;

let debounceTimeout = null;
const DEBOUNCE_MS = 200; // wait 200ms after typing stops

// -------------------- Search Input with Debounce --------------------
searchBox.addEventListener("input", () => {
    const query = searchBox.value.trim();

    if (debounceTimeout) clearTimeout(debounceTimeout);

    debounceTimeout = setTimeout(() => {
        if (!query) {
            // Clear results & show placeholder
            results = [];
            selectedIndex = -1;
            resultsPane.innerHTML = "<div class='placeholder'>No results yet</div>";
            previewText.textContent = "(preview empty)";
            return;
        }

        vscode.postMessage({ type: "search", query });
    }, DEBOUNCE_MS);
});

// Keep search box focused
searchBox.focus();

// -------------------- Keyboard Navigation --------------------
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

// -------------------- Mouse Click Selection --------------------
resultsPane.addEventListener("click", (e) => {
    const target = e.target.closest(".result-item");
    if (!target) return;

    const index = Array.from(resultsPane.children).indexOf(target);
    if (index < 0) return;

    selectedIndex = index;
    updateSelectionUI();
    requestPreview();
});

// -------------------- Receive Messages from Extension --------------------
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

// -------------------- Render Results --------------------
function renderResults(items, query) {
    resultsPane.innerHTML = "";
    const regex = query ? new RegExp(query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), "gi") : null;

    items.forEach((text, index) => {
        const el = document.createElement("div");
        el.className = "result-item";

        if (regex) {
            el.innerHTML = text.replace(regex, match => `<span class="match">${match}</span>`);
        } else {
            el.textContent = text;
        }

        if (index === selectedIndex) el.classList.add("selected");
        resultsPane.appendChild(el);
    });

    scrollToSelected();
}

// -------------------- Navigation --------------------
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

// -------------------- Preview --------------------
function requestPreview() {
    if (selectedIndex < 0 || selectedIndex >= results.length) {
        previewText.textContent = "(preview empty)";
        return;
    }
    vscode.postMessage({ type: "preview", file: results[selectedIndex] });
}

// -------------------- Open File --------------------
function openSelectedFile() {
    if (!results.length || selectedIndex < 0) return;
    const file = results[selectedIndex].split(":")[0];
    vscode.postMessage({ type: "openFile", file });
}
