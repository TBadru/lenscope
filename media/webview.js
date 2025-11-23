const vscode = acquireVsCodeApi();

const searchBox = document.getElementById("search-box");
const resultsPane = document.getElementById("results-pane");
const previewText = document.getElementById("preview-text");

let results = [];
let selectedIndex = -1;

// Send search query to extension
searchBox.addEventListener("input", () => {
    vscode.postMessage({
        type: "search",
        query: searchBox.value
    });
});

// Handle keyboard navigation
searchBox.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "j") {
        moveSelection(1);
        e.preventDefault();
    }
    if (e.key === "ArrowUp" || e.key === "k") {
        moveSelection(-1);
        e.preventDefault();
    }
    if (e.key === "Enter") {
        openSelectedFile();
        e.preventDefault();
    }
    if (e.key === "Escape") {
        vscode.postMessage({ type: "close" });
        e.preventDefault();
    }
});

// Receive messages FROM extension
window.addEventListener("message", (event) => {
    const msg = event.data;

    if (msg.type === "results") {
        results = msg.results;
        selectedIndex = -1;
        renderResults(results);
    }

    if (msg.type === "preview") {
        previewText.textContent = msg.preview;
    }
});

// Render search results
function renderResults(items) {
    resultsPane.innerHTML = "";

    if (items.length === 0) {
        resultsPane.innerHTML = "<div>No results</div>";
        return;
    }

    items.forEach((file, index) => {
        const el = document.createElement("div");
        el.textContent = file;
        el.className = "result-item";

        if (index === selectedIndex) {
            el.classList.add("selected");
        }

        el.addEventListener("click", () => {
            selectedIndex = index;
            highlightSelection();
            vscode.postMessage({
                type: "preview",
                file
            });
        });

        resultsPane.appendChild(el);
    });
}

// Move selection up/down
function moveSelection(delta) {
    if (results.length === 0) return;

    selectedIndex += delta;
    if (selectedIndex < 0) selectedIndex = results.length - 1;
    if (selectedIndex >= results.length) selectedIndex = 0;

    const file = results[selectedIndex];
    vscode.postMessage({ type: "preview", file });
    highlightSelection();
}

// Highlight selected item
function highlightSelection() {
    const items = document.querySelectorAll(".result-item");
    items.forEach((el, i) => {
        if (i === selectedIndex) {
            el.classList.add("selected");
            el.scrollIntoView({ block: "nearest" });
        } else {
            el.classList.remove("selected");
        }
    });
}

// Open the selected file in VS Code
function openSelectedFile() {
    if (selectedIndex < 0 || selectedIndex >= results.length) return;

    const file = results[selectedIndex].split(":")[0];
    vscode.postMessage({
        type: "openFile",
        file
    });
}
