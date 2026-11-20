(function () {
    "use strict";

    if (!new URLSearchParams(window.location.search).has("mobileEditor"))
        return;

    window.CircuitMobile.ready.then(function (mobile) {
        const quickBar = mobile.getQuickBar();
        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.textContent = "Edit layout";
        editButton.setAttribute("aria-label", "Edit Quick Bar layout");
        editButton.dataset.editorControl = "true";
        quickBar.appendChild(editButton);

        const dialog = document.createElement("dialog");
        dialog.className = "mobileEditorDialog";
        dialog.setAttribute("aria-labelledby", "mobileEditorTitle");
        dialog.innerHTML = [
            "<h2 id=\"mobileEditorTitle\">Edit Quick Bar</h2>",
            "<p>Choose and reorder supported actions. Only action IDs are saved; layout data cannot run code.</p>",
            "<ol class=\"mobileEditorDialog__list\"></ol>",
            "<div class=\"mobileEditorDialog__actions\">",
            "  <select aria-label=\"Available actions\"></select>",
            "  <button type=\"button\" data-action=\"add\">Add action</button>",
            "  <button type=\"button\" data-action=\"import\">Import JSON</button>",
            "  <input type=\"file\" accept=\"application/json,.json\" hidden>",
            "</div>",
            "<p class=\"mobileEditorDialog__status\" role=\"status\" aria-live=\"polite\"></p>",
            "<div class=\"mobileEditorDialog__actions\">",
            "  <button type=\"button\" data-action=\"save\">Save</button>",
            "  <button type=\"button\" data-action=\"export\">Download JSON</button>",
            "  <button type=\"button\" data-action=\"reset\">Reset defaults</button>",
            "  <button type=\"button\" data-action=\"close\">Close</button>",
            "</div>"
        ].join("");
        document.body.appendChild(dialog);

        const list = dialog.querySelector(".mobileEditorDialog__list");
        const select = dialog.querySelector("select");
        const fileInput = dialog.querySelector('input[type="file"]');
        const status = dialog.querySelector(".mobileEditorDialog__status");
        const definitions = mobile.getActions();
        const labels = new Map(definitions.map(action => [action.id, action.label]));
        let draft = mobile.getLayout().actions;

        function setStatus(message) {
            status.textContent = message;
        }

        function renderList() {
            list.replaceChildren();
            for (const [index, id] of draft.entries()) {
                const row = document.createElement("li");
                row.className = "mobileEditorDialog__item";
                const label = document.createElement("span");
                label.textContent = labels.get(id);
                row.appendChild(label);

                for (const [action, text] of [["up", "Move up"], ["down", "Move down"], ["remove", "Remove"]]) {
                    const button = document.createElement("button");
                    button.type = "button";
                    button.textContent = text;
                    button.setAttribute("aria-label", `${text} ${labels.get(id)}`);
                    button.disabled = (action === "up" && index === 0) ||
                        (action === "down" && index === draft.length - 1);
                    button.addEventListener("click", function () {
                        if (action === "remove") {
                            if (draft.length === 1) {
                                setStatus("The Quick Bar needs at least one action.");
                                return;
                            }
                            draft.splice(index, 1);
                        } else {
                            const target = action === "up" ? index - 1 : index + 1;
                            [draft[index], draft[target]] = [draft[target], draft[index]];
                        }
                        renderList();
                    });
                    row.appendChild(button);
                }
                list.appendChild(row);
            }

            select.replaceChildren();
            for (const action of definitions) {
                if (draft.includes(action.id))
                    continue;
                const option = document.createElement("option");
                option.value = action.id;
                option.textContent = action.label;
                select.appendChild(option);
            }
            dialog.querySelector('[data-action="add"]').disabled = select.options.length === 0 || draft.length >= 12;
        }

        editButton.addEventListener("click", function () {
            draft = mobile.getLayout().actions;
            setStatus("");
            renderList();
            dialog.showModal();
        });

        dialog.addEventListener("click", function (event) {
            const button = event.target.closest("button[data-action]");
            if (!button)
                return;
            switch (button.dataset.action) {
                case "add":
                    if (select.value && draft.length < 12)
                        draft.push(select.value);
                    renderList();
                    break;
                case "import":
                    fileInput.click();
                    break;
                case "save":
                    try {
                        mobile.saveLayout({ version: 1, actions: draft });
                        setStatus("Layout saved on this device.");
                    } catch (error) {
                        setStatus(error instanceof Error ? error.message : "Could not save this layout.");
                    }
                    break;
                case "export": {
                    const blob = new Blob([JSON.stringify({ version: 1, actions: draft }, null, 2)], {
                        type: "application/json"
                    });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = "layout.json";
                    link.click();
                    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
                    setStatus("Layout JSON downloaded.");
                    break;
                }
                case "reset":
                    draft = ["undo", "redo", "select", "wire", "resistor", "ground", "capacitor", "zoomIn", "zoomOut"];
                    renderList();
                    setStatus("Default layout loaded. Save to apply it.");
                    break;
                case "close":
                    dialog.close();
                    break;
            }
        });

        fileInput.addEventListener("change", async function () {
            const file = fileInput.files && fileInput.files[0];
            if (!file)
                return;
            try {
                const imported = JSON.parse(await file.text());
                const saved = mobile.saveLayout(imported);
                draft = saved.actions;
                renderList();
                setStatus("Layout imported and saved on this device.");
            } catch (error) {
                setStatus(error instanceof Error ? error.message : "Could not import this layout.");
            } finally {
                fileInput.value = "";
            }
        });

        renderList();
    }).catch(function (error) {
        console.error("Could not initialize the mobile layout editor.", error);
    });
}());
