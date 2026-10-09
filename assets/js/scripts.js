// ─── Utility ──────────────────────────────────────────────────────────────────
function debounce(fn, delay) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

// ─── Storage ──────────────────────────────────────────────────────────────────
const Storage = {
    save: (key, data) => localStorage.setItem(key, JSON.stringify(data)),
    load: (key, fallback = null) => {
        try {
            return JSON.parse(localStorage.getItem(key)) ?? fallback;
        } catch {
            return fallback;
        }
    },
};

// ─── DateTime ─────────────────────────────────────────────────────────────────
class DateTime {
    months = [
        "January", "February", "March", "April",
        "May", "June", "July", "August",
        "September", "October", "November", "December",
    ];
    days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    constructor() {
        this.use24h = localStorage.getItem("use24h") === "true";
    }

    updateDateTime() {
        const now = new Date();
        let hours = now.getHours();
        const minutes = now.getMinutes().toString().padStart(2, "0");

        let timeString;
        if (this.use24h) {
            timeString = `${hours.toString().padStart(2, "0")}:${minutes}`;
        } else {
            const ampm = hours >= 12 ? "PM" : "AM";
            hours = hours % 12 || 12;
            timeString = `${hours}:${minutes} ${ampm}`;
        }

        const dateEl = document.getElementById("date-display");
        const dayEl  = document.getElementById("day-display");
        const timeEl = document.getElementById("time-display");

        if (dateEl) dateEl.textContent = `${now.getDate()} ${this.months[now.getMonth()]} ${now.getFullYear()}`;
        if (dayEl)  dayEl.textContent  = this.days[now.getDay()];
        if (timeEl) timeEl.textContent = timeString;
    }

    init() {
        this.updateDateTime();
        setInterval(() => this.updateDateTime(), 1000);
        window.addEventListener("storage", (e) => {
            if (e.key === "use24h") {
                this.use24h = e.newValue === "true";
                this.updateDateTime();
            }
        });
    }
}

// ─── TodoList ─────────────────────────────────────────────────────────────────
class TodoList {
    constructor() {
        this.todos    = Storage.load("todolist", []);
        this.list     = document.getElementById("todo-list");
        this.input    = document.getElementById("todo-input");
        this.clearBtn = document.getElementById("clear-completed");
        this.editing  = null;
    }

    save() {
        Storage.save("todolist", this.todos);
    }

    addTodo(text) {
        if (!text.trim()) return;
        this.todos.push({ id: Date.now(), text: text.trim(), completed: false });
        this.save();
        this.render();
    }

    toggleTodo(id) {
        const todo = this.todos.find((t) => t.id === id);
        if (!todo) return;
        todo.completed = !todo.completed;
        this.save();
        this.render();
    }

    deleteTodo(id) {
        this.todos = this.todos.filter((t) => t.id !== id);
        this.save();
        this.render();
    }

    editTodo(id, newText) {
        const todo = this.todos.find((t) => t.id === id);
        if (todo && newText.trim()) {
            todo.text = newText.trim();
            this.save();
        }
        this.editing = null;
        this.render();
    }

    startEdit(li, todo) {
        if (this.editing) return;
        this.editing = todo.id;

        const textEl = li.querySelector(".todo-text");
        const input  = document.createElement("input");
        input.type   = "text";
        input.value  = todo.text;

        li.replaceChild(input, textEl);
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);

        let committed = false;

        const commit = (action) => {
            if (committed) return;
            committed = true;
            if (action === "save") {
                this.editTodo(todo.id, input.value);
            } else {
                this.editing = null;
                this.render();
            }
        };

        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                commit("save");
            } else if (e.key === "Escape") {
                e.preventDefault();
                commit("cancel");
            } else if (e.key === "Delete") {
                e.preventDefault();
                committed = true;
                this.editing = null;
                this.deleteTodo(todo.id);
            }
        });

        input.addEventListener("blur", () => commit("save"));
    }

    moveTodo(id, direction) {
        const i = this.todos.findIndex((t) => t.id === id);
        if (i === -1) return;

        if (direction === "up" && i > 0) {
            [this.todos[i - 1], this.todos[i]] = [this.todos[i], this.todos[i - 1]];
        } else if (direction === "down" && i < this.todos.length - 1) {
            [this.todos[i], this.todos[i + 1]] = [this.todos[i + 1], this.todos[i]];
        } else {
            return;
        }

        this.save();
        this.render();
    }

    render() {
        this.list.innerHTML = "";

        const hasCompleted = this.todos.some((t) => t.completed);
        this.clearBtn.style.display = hasCompleted ? "" : "none";

        this.todos.forEach((todo, idx) => {
            const li = document.createElement("li");
            if (todo.completed) li.classList.add("completed");

            // Bullet — real element so click is reliable (::before is not hittable)
            const bullet = document.createElement("button");
            bullet.className = "todo-bullet";
            bullet.setAttribute("aria-label", todo.completed ? "Mark incomplete" : "Mark complete");
            bullet.addEventListener("click", (e) => {
                e.stopPropagation();
                this.toggleTodo(todo.id);
            });
            li.appendChild(bullet);

            // Text span
            const span = document.createElement("span");
            span.className   = "todo-text";
            span.textContent = todo.text;
            li.appendChild(span);

            // Arrow buttons
            const arrows = document.createElement("div");
            arrows.className = "todo-arrows";

            const upBtn = document.createElement("button");
            upBtn.textContent = "▲";
            upBtn.disabled    = idx === 0;
            upBtn.setAttribute("aria-label", "Move up");
            upBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                this.moveTodo(todo.id, "up");
            });

            const downBtn = document.createElement("button");
            downBtn.textContent = "▼";
            downBtn.disabled    = idx === this.todos.length - 1;
            downBtn.setAttribute("aria-label", "Move down");
            downBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                this.moveTodo(todo.id, "down");
            });

            arrows.appendChild(upBtn);
            arrows.appendChild(downBtn);
            li.appendChild(arrows);

            // Alt+Click: edit · Ctrl/Cmd+Click: delete
            li.addEventListener("click", (e) => {
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    this.deleteTodo(todo.id);
                } else if (e.altKey) {
                    e.preventDefault();
                    this.startEdit(li, todo);
                }
            });

            this.list.appendChild(li);
        });
    }

    init() {
        this.render();

        this.input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                this.addTodo(this.input.value);
                this.input.value = "";
            }
        });

        this.clearBtn.addEventListener("click", () => {
            this.todos = this.todos.filter((t) => !t.completed);
            this.save();
            this.render();
        });

        window.addEventListener("storage", (e) => {
            if (e.key === "todolist") {
                this.todos = Storage.load("todolist", []);
                this.render();
            }
        });
    }
}

// ─── Clipboard ────────────────────────────────────────────────────────────────
class Clipboard {
    constructor() {
        this.slots = Storage.load("clipboard", ["", "", "", "", ""]);
    }

    save() {
        Storage.save("clipboard", this.slots);
    }

    copyToClipboard(text) {
        if (!text) return;
        navigator.clipboard.writeText(text).catch(() => {
            const ta = document.createElement("textarea");
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand("copy");
            document.body.removeChild(ta);
        });
    }

    init() {
        for (let i = 0; i < 5; i++) {
            const slot = document.getElementById(`clip-slot-${i + 1}`);
            if (!slot) continue;

            slot.value = this.slots[i] ?? "";
            slot.classList.toggle("has-content", (this.slots[i] ?? "").trim() !== "");

            const debouncedSave = debounce(() => this.save(), 300);

            slot.addEventListener("mousedown", (e) => {
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    this.slots[i] = "";
                    slot.value = "";
                    slot.classList.remove("has-content");
                    this.save();
                } else if (e.altKey) {
                    e.preventDefault();
                    this.copyToClipboard(this.slots[i]);
                }
            });

            slot.addEventListener("input", () => {
                this.slots[i] = slot.value;
                slot.classList.toggle("has-content", slot.value.trim() !== "");
                debouncedSave();
            });
        }

        window.addEventListener("beforeunload", () => {
            if (localStorage.getItem("importing") === "true") return;
            this.save();
        });

        window.addEventListener("storage", (e) => {
            if (e.key === "clipboard") {
                this.slots = Storage.load("clipboard", ["", "", "", "", ""]);
                for (let i = 0; i < 5; i++) {
                    const slot = document.getElementById(`clip-slot-${i + 1}`);
                    if (!slot) continue;
                    slot.value = this.slots[i] ?? "";
                    slot.classList.toggle("has-content", (this.slots[i] ?? "").trim() !== "");
                }
            }
        });
    }
}

// ─── Bookmarks ────────────────────────────────────────────────────────────────
class Bookmarks {
    constructor() {
        this.bookmarks    = Storage.load("bookmarks", []);
        this.grid         = document.getElementById("bookmarks-grid");
        this.editingButton = null;
        this.iconsMap     = {};
        this.iconsLoaded  = false;
        this.loadIcons();
    }

    loadIcons() {
        fetch("./assets/icons/icons.json")
            .then((r) => r.json())
            .then((data) => {
                data.forEach((icon) => {
                    this.iconsMap[icon.title.toLowerCase()] = icon;
                    this.iconsMap[icon.slug.toLowerCase()]  = icon;
                });
                this.iconsLoaded = true;
                this.render();
            });
    }

    getBookmarkIcon(nameOrSlug) {
        if (!this.iconsLoaded || !nameOrSlug) return null;
        return this.iconsMap[nameOrSlug.toLowerCase().trim()] || null;
    }

    contrastSafe(hex) {
        // Perceived luminance (0–255). If too dark, return white instead.
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
        return luminance < 40 ? "cccccc" : hex;
    }

    resolveIcon(bookmark) {
        return this.getBookmarkIcon(bookmark.name)
            || (bookmark.icon ? this.getBookmarkIcon(bookmark.icon) : null);
    }

    createEmptyButton() {
        const button = document.createElement("div");
        button.className = "bookmark-empty";

        const icon = document.createElement("img");
        icon.src       = "./assets/icons/plus.svg";
        icon.alt       = "Add bookmark";
        icon.className = "bookmark-empty-icon";
        button.appendChild(icon);

        button.addEventListener("click", (e) => {
            e.preventDefault();
            this.startEdit(button);
        });
        return button;
    }

    createFilledButton(bookmark) {
        const button = document.createElement("a");
        button.href  = bookmark.url;

        const iconData  = this.resolveIcon(bookmark);
        const iconSrc   = iconData ? `./assets/icons/simpleicons/${iconData.source}` : "./assets/icons/default.svg";
        const iconColor = iconData ? `#${this.contrastSafe(iconData.hex)}` : "#999999";

        const inner = document.createElement("div");
        inner.className = "bookmark-inner";

        fetch(iconSrc)
            .then((r) => r.text())
            .then((svgText) => {
                const tmp = document.createElement("div");
                tmp.innerHTML = svgText;
                const svg = tmp.querySelector("svg");
                if (svg) {
                    svg.setAttribute("fill", iconColor);
                    inner.appendChild(svg);
                } else {
                    const img = document.createElement("img");
                    img.src = "./assets/icons/default.svg";
                    img.alt = "icon";
                    inner.appendChild(img);
                }
                const span = document.createElement("span");
                if (bookmark.name.startsWith("• ")) {
                    span.textContent = bookmark.name.slice(2);
                    span.style.textDecoration = "underline";
                } else {
                    span.textContent = bookmark.name;
                }
                inner.appendChild(span);
            });

        button.appendChild(inner);

        button.addEventListener("click", (e) => {
            if (e.altKey) {
                e.preventDefault();
                this.startEdit(button, bookmark);
            } else if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                window.open(bookmark.url, "_blank");
            }
        });

        button.addEventListener("auxclick", (e) => {
            if (e.button === 1) {
                e.preventDefault();
                window.open(bookmark.url, "_blank");
            }
        });

        return button;
    }

    startEdit(button, bookmark = null) {
        if (this.editingButton) return;
        this.editingButton = button;

        // Replace the button in the DOM with a plain div (no href navigation)
        const cell = document.createElement("div");
        button.parentNode.replaceChild(cell, button);
        this.editingButton = cell;

        cell.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); });

        const editDiv = document.createElement("div");
        editDiv.className = "bookmark-edit";

        const nameInput = document.createElement("input");
        nameInput.type        = "text";
        nameInput.placeholder = "Name";
        nameInput.value       = bookmark ? bookmark.name : "";
        nameInput.autocomplete = "off";
        nameInput.spellcheck  = false;

        const iconInput = document.createElement("input");
        iconInput.type        = "text";
        iconInput.placeholder = "Icon (optional)";
        iconInput.value       = bookmark ? (bookmark.icon || "") : "";
        iconInput.autocomplete = "off";
        iconInput.spellcheck  = false;

        const urlInput = document.createElement("input");
        urlInput.type        = "text";
        urlInput.placeholder = "URL";
        urlInput.value       = bookmark ? bookmark.url : "";
        urlInput.autocomplete = "off";
        urlInput.spellcheck  = false;

        editDiv.appendChild(nameInput);
        editDiv.appendChild(iconInput);
        editDiv.appendChild(urlInput);
        cell.appendChild(editDiv);
        nameInput.focus();

        let committed = false;

        const saveEdit = () => {
            if (committed) return;
            committed = true;
            const name = nameInput.value.trim();
            const icon = iconInput.value.trim();
            const url  = urlInput.value.trim();
            if (name && url) {
                if (bookmark) {
                    bookmark.name = name;
                    bookmark.icon = icon || undefined;
                    bookmark.url  = url;
                } else {
                    const entry = { name, url };
                    if (icon) entry.icon = icon;
                    this.bookmarks.push(entry);
                }
                this.save();
            }
            this.editingButton = null;
            this.render();
        };

        const cancelEdit = () => {
            if (committed) return;
            committed = true;
            this.editingButton = null;
            this.render();
        };

        const deleteBookmark = () => {
            if (committed) return;
            committed = true;
            if (bookmark) {
                this.bookmarks = this.bookmarks.filter((b) => b !== bookmark);
                this.save();
            }
            this.editingButton = null;
            this.render();
        };

        const handleKeydown = (e) => {
            if (e.key === "Enter")  { e.preventDefault(); saveEdit(); }
            else if (e.key === "Escape") { e.preventDefault(); cancelEdit(); }
            else if (e.key === "Delete") { e.preventDefault(); deleteBookmark(); }
        };

        nameInput.addEventListener("keydown", handleKeydown);
        iconInput.addEventListener("keydown", handleKeydown);
        urlInput.addEventListener("keydown",  handleKeydown);
        nameInput.addEventListener("click",     (e) => e.stopPropagation());
        iconInput.addEventListener("click",     (e) => e.stopPropagation());
        urlInput.addEventListener("click",      (e) => e.stopPropagation());
        nameInput.addEventListener("mousedown", (e) => e.stopPropagation());
        iconInput.addEventListener("mousedown", (e) => e.stopPropagation());
        urlInput.addEventListener("mousedown",  (e) => e.stopPropagation());

        let blurTimeout;
        const handleBlur = () => {
            clearTimeout(blurTimeout);
            blurTimeout = setTimeout(() => {
                if (!editDiv.contains(document.activeElement)) saveEdit();
            }, 100);
        };
        nameInput.addEventListener("blur", handleBlur);
        iconInput.addEventListener("blur", handleBlur);
        urlInput.addEventListener("blur",  handleBlur);
    }

    save() {
        Storage.save("bookmarks", this.bookmarks);
    }

    render() {
        this.grid.innerHTML  = "";
        this.editingButton   = null;

        [...this.bookmarks]
            .sort((a, b) => a.name.localeCompare(b.name))
            .forEach((bookmark) => this.grid.appendChild(this.createFilledButton(bookmark)));

        this.grid.appendChild(this.createEmptyButton());
    }

    init() {
        if (!this.grid) return;
        if (this.iconsLoaded) this.render();

        window.addEventListener("storage", (e) => {
            if (e.key === "bookmarks") {
                this.bookmarks = Storage.load("bookmarks", []);
                this.render();
            }
        });
    }
}

// ─── Notepad ──────────────────────────────────────────────────────────────────
class Notepad {
    constructor() {
        this.content  = Storage.load("notepad", "");
        this.textarea = document.getElementById("notepad");
    }

    save() {
        if (!this.textarea) return;
        this.content = this.textarea.value;
        Storage.save("notepad", this.content);
    }

    init() {
        if (!this.textarea) return;
        this.textarea.value = this.content ?? "";

        const debouncedSave = debounce(() => this.save(), 300);
        this.textarea.addEventListener("input", debouncedSave);

        window.addEventListener("beforeunload", () => {
            if (localStorage.getItem("importing") === "true") return;
            this.save();
        });

        window.addEventListener("storage", (e) => {
            if (e.key === "notepad") {
                this.content = Storage.load("notepad", "");
                if (this.textarea.value !== this.content) {
                    this.textarea.value = this.content;
                }
            }
        });
    }
}

// ─── Storage initialisation ───────────────────────────────────────────────────
async function initializeStorage() {
    localStorage.removeItem("importing");

    // Retrocompatibility: if the user already has data, mark as initialized
    // without loading the default config.
    if (localStorage.getItem("initialized") === null &&
        (localStorage.getItem("bookmarks") !== null ||
         localStorage.getItem("todolist")  !== null)) {
        localStorage.setItem("initialized", "true");
    }

    const isFirstRun = localStorage.getItem("initialized") === null;

    if (isFirstRun) {
        try {
            const res = await fetch("./assets/js/default.config.json");
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const config = await res.json();
            for (const [key, value] of Object.entries(config)) {
                localStorage.setItem(key, value);
            }
            console.log("[ToolsTab] Default config loaded.");
        } catch (err) {
            console.warn("[ToolsTab] Default config not loaded:", err);
        }
        localStorage.setItem("initialized", "true");
    }

    if (localStorage.getItem("dynamicBackground") === null)
        localStorage.setItem("dynamicBackground", "true");
    if (localStorage.getItem("customBackgroundColor") === null)
        localStorage.setItem("customBackgroundColor", "");
    if (localStorage.getItem("todolist")  === null) Storage.save("todolist", []);
    if (localStorage.getItem("bookmarks") === null) Storage.save("bookmarks", []);
    if (localStorage.getItem("clipboard") === null) Storage.save("clipboard", ["", "", "", "", ""]);
    if (localStorage.getItem("notepad")   === null) Storage.save("notepad", "");
}

// ─── Import / Export ──────────────────────────────────────────────────────────
class ImportExport {
    static exportConfig() {
        const config = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            config[key] = localStorage.getItem(key);
        }
        const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement("a");
        a.href     = url;
        a.download = "toolstab.config.json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    static importConfig() {
        const input  = document.createElement("input");
        input.type   = "file";
        input.accept = ".json";
        input.style.display = "none";

        input.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (evt) => {
                try {
                    const config = JSON.parse(evt.target.result);
                    localStorage.clear();
                    for (const [key, value] of Object.entries(config)) {
                        localStorage.setItem(key, value);
                    }
                    localStorage.setItem("initialized", "true");
                    localStorage.setItem("importing", "true");
                    location.reload();
                } catch (err) {
                    alert("Error importing configuration: Invalid JSON file");
                    console.error("Import error:", err);
                }
            };
            reader.readAsText(file);
        });

        document.body.appendChild(input);
        input.click();
        document.body.removeChild(input);
    }

    static init(dateTime) {
        const firstSection = document.querySelector("section:nth-child(1)");
        if (!firstSection) return;
        firstSection.addEventListener("click", (e) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                ImportExport.exportConfig();
            } else if (e.altKey) {
                e.preventDefault();
                ImportExport.importConfig();
            }
        });

        // ── Config menu toggle (click to open, click outside to close) ─────
        const configMenu    = document.getElementById("config-menu");
        const configTrigger = document.getElementById("config-trigger");

        configTrigger?.addEventListener("click", (e) => {
            e.stopPropagation();
            configMenu.classList.toggle("open");
        });

        document.addEventListener("click", (e) => {
            if (configMenu && !configMenu.contains(e.target)) {
                configMenu.classList.remove("open");
            }
        });

        document.getElementById("config-save")?.addEventListener("click", (e) => {
            e.stopPropagation();
            ImportExport.exportConfig();
        });
        document.getElementById("config-load")?.addEventListener("click", (e) => {
            e.stopPropagation();
            ImportExport.importConfig();
        });

        // ── Settings controls ──────────────────────────────────────────────
        const isValidHex = (v) => /^#[A-Fa-f0-9]{6}$/.test(v);

        const dynamicCb  = document.getElementById("setting-dynamic");
        const timeCb     = document.getElementById("setting-24h");
        const colorInput = document.getElementById("setting-color");
        const colorDot   = document.getElementById("setting-color-preview");

        // Load current state
        if (dynamicCb)  dynamicCb.checked  = localStorage.getItem("dynamicBackground") !== "false";
        if (timeCb)     timeCb.checked     = localStorage.getItem("use24h") === "true";
        if (colorInput) {
            const saved = localStorage.getItem("customBackgroundColor") ?? "";
            colorInput.value = saved;
            if (colorDot) colorDot.style.backgroundColor = isValidHex(saved) ? saved : "transparent";
        }

        dynamicCb?.addEventListener("change", (e) => {
            e.stopPropagation();
            localStorage.setItem("dynamicBackground", dynamicCb.checked ? "true" : "false");
            window.dispatchEvent(new Event("storage"));
        });

        timeCb?.addEventListener("change", (e) => {
            e.stopPropagation();
            localStorage.setItem("use24h", timeCb.checked ? "true" : "false");
            // Update DateTime instance directly for instant feedback
            if (dateTime) {
                dateTime.use24h = timeCb.checked;
                dateTime.updateDateTime();
            }
            window.dispatchEvent(new StorageEvent("storage", { key: "use24h", newValue: timeCb.checked ? "true" : "false" }));
        });

        colorInput?.addEventListener("click",     (e) => e.stopPropagation());
        colorInput?.addEventListener("mousedown",  (e) => e.stopPropagation());
        colorInput?.addEventListener("input", (e) => {
            e.stopPropagation();
            const val = colorInput.value.trim();
            if (val === "" || isValidHex(val)) {
                colorInput.style.borderBottomColor = "";
                localStorage.setItem("customBackgroundColor", val);
                if (colorDot) colorDot.style.backgroundColor = isValidHex(val) ? val : "transparent";
                window.dispatchEvent(new Event("storage"));
            } else {
                colorInput.style.borderBottomColor = "#e74c3c";
            }
        });
    }
}

// ─── Info modal ───────────────────────────────────────────────────────────────
function initInfoModal() {
    const overlay = document.getElementById("info-overlay");
    const trigger = document.getElementById("config-info");
    const closeBtn = document.getElementById("info-close");
    const modal   = document.getElementById("info-modal");

    function open()  { overlay.classList.add("open"); }
    function close() { overlay.classList.remove("open"); }

    trigger.addEventListener("click", open);
    closeBtn.addEventListener("click", close);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && overlay.classList.contains("open")) close(); });
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────
async function main() {
    await initializeStorage();
    new DynamicBackground().init();
    const dateTime = new DateTime();
    dateTime.init();
    new TodoList().init();
    new Bookmarks().init();
    new Clipboard().init();
    new Notepad().init();
    ImportExport.init(dateTime);
    initInfoModal();

    document.addEventListener("keydown", (e) => {
        if (
            e.key === "Escape" &&
            (document.activeElement instanceof HTMLInputElement ||
             document.activeElement instanceof HTMLTextAreaElement)
        ) {
            document.activeElement.blur();
        }
    });
}

document.addEventListener("DOMContentLoaded", main);
