(function () {
    "use strict";

    const actions = Object.freeze({
        undo: { label: "Undo" },
        redo: { label: "Redo" },
        select: { label: "Select" },
        wire: { label: "Wire" },
        resistor: { label: "Resistor" },
        ground: { label: "Ground" },
        capacitor: { label: "Capacitor" },
        inductor: { label: "Inductor" },
        diode: { label: "Diode" },
        voltageSource: { label: "Voltage source" },
        switch: { label: "Switch" },
        zoomIn: { label: "Zoom +" },
        zoomOut: { label: "Zoom -" },
        zoom100: { label: "Zoom 100%" },
        commandPalette: { label: "Find command" },
        copy: { label: "Copy" },
        paste: { label: "Paste" }
    });
    const defaultLayout = Object.freeze({
        version: 1,
        actions: Object.freeze([
            "undo", "redo", "select", "wire", "resistor",
            "ground", "capacitor", "zoomIn", "zoomOut"
        ])
    });
    const storageKey = "circuitjs.mobileLayout.v1";
    const scriptUrl = document.currentScript && document.currentScript.src;
    const iconUrl = name => new URL(`./icons/${name}.svg`, scriptUrl).href;
    let currentLayout = defaultLayout;
    let quickBar = null;
    let status = null;
    let circuitApi = null;
    let layoutError = "";
    let resolveReady;

    const ready = new Promise(resolve => {
        resolveReady = resolve;
    });

    function createLoadingScreen() {
        const screen = document.createElement("div");
        screen.id = "mobileLoadingScreen";
        screen.className = "mobileLoadingScreen";
        screen.setAttribute("role", "status");
        screen.setAttribute("aria-live", "polite");

        const spinner = document.createElement("div");
        spinner.className = "mobileLoadingScreen__spinner";
        const icon = document.createElement("img");
        icon.className = "mobileLoadingScreen__icon";
        const loadingIconName = Math.random() < 0.5 ? "loading" : "loading2";
        icon.src = iconUrl(loadingIconName);
        icon.alt = "";
        icon.draggable = false;
        spinner.appendChild(icon);

        const label = document.createElement("span");
        label.className = "mobileLoadingScreen__label";
        label.textContent = "Loading simulator...";
        screen.append(spinner, label);
        document.body.appendChild(screen);
        return screen;
    }

    const loadingScreen = createLoadingScreen();

    function validateLayout(value) {
        if (!value || value.version !== 1 || !Array.isArray(value.actions))
            throw new Error("Layout must have version 1 and an actions array.");
        if (value.actions.length < 1 || value.actions.length > 12)
            throw new Error("Layout must contain between 1 and 12 actions.");
        const seen = new Set();
        for (const id of value.actions) {
            if (typeof id !== "string" || !Object.prototype.hasOwnProperty.call(actions, id))
                throw new Error(`Unsupported layout action: ${String(id)}`);
            if (seen.has(id))
                throw new Error(`Duplicate layout action: ${id}`);
            seen.add(id);
        }
        return { version: 1, actions: value.actions.slice() };
    }

    function reportLayoutError(message, error) {
        layoutError = message;
        console.error(message, error);
    }

    async function loadLayout() {
        const saved = window.localStorage.getItem(storageKey);
        if (saved !== null) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed && Array.isArray(parsed.actions) && parsed.actions.includes("runStop")) {
                    parsed.actions = parsed.actions.filter(id => id !== "runStop");
                    window.localStorage.setItem(storageKey, JSON.stringify(parsed));
                }
                return validateLayout(parsed);
            } catch (error) {
                reportLayoutError("Saved mobile layout is invalid; loading the default layout.", error);
                window.localStorage.removeItem(storageKey);
            }
        }

        try {
            if (!scriptUrl)
                throw new Error("Mobile script URL is unavailable.");
            const layoutUrl = new URL("./layout.json", scriptUrl);
            const response = await fetch(layoutUrl);
            if (!response.ok)
                throw new Error(`Layout request failed with HTTP ${response.status}.`);
            return validateLayout(await response.json());
        } catch (error) {
            reportLayoutError("Could not load mobile/layout.json; using the built-in layout.", error);
            return validateLayout(defaultLayout);
        }
    }

    function render() {
        const editorControl = quickBar.querySelector("[data-editor-control]");
        quickBar.replaceChildren();
        for (const id of currentLayout.actions) {
            const button = document.createElement("button");
            button.type = "button";
            button.textContent = actions[id].label;
            button.setAttribute("aria-label", actions[id].label);
            button.dataset.action = id;
            button.addEventListener("click", () => {
                if (!circuitApi || typeof circuitApi.runMobileCommand !== "function") {
                    console.error("CircuitJS mobile command bridge is unavailable.");
                    return;
                }
                if (!circuitApi.runMobileCommand(id))
                    console.error(`CircuitJS rejected mobile action: ${id}`);
            });
            quickBar.appendChild(button);
        }
        if (editorControl)
            quickBar.appendChild(editorControl);
        if (layoutError) {
            status = document.createElement("span");
            status.className = "mobileQuickBar__status";
            status.setAttribute("role", "status");
            status.textContent = layoutError;
            quickBar.appendChild(status);
        } else {
            status = null;
        }
    }

    function saveLayout(value) {
        const validated = validateLayout(value);
        window.localStorage.setItem(storageKey, JSON.stringify(validated));
        currentLayout = validated;
        layoutError = "";
        render();
        return JSON.parse(JSON.stringify(currentLayout));
    }

    function updateRunButton() {
        const button = document.querySelector("#mobileRunStop");
        if (!button || !circuitApi)
            return;
        const running = circuitApi.isRunning();
        button.classList.toggle("is-running", running);
        button.classList.toggle("is-paused", !running);
        button.setAttribute("aria-label", running ? "Pause simulation" : "Run simulation");
        button.setAttribute("aria-pressed", String(running));
        button.title = running ? "Pause simulation" : "Run simulation";
        button.querySelector("img").src = iconUrl(running ? "pause" : "play");
    }

    function appendIcon(button, name, className) {
        const icon = document.createElement("img");
        icon.className = className;
        icon.src = iconUrl(name);
        icon.alt = "";
        icon.draggable = false;
        button.appendChild(icon);
        return icon;
    }

    function updateDragButton(button) {
        const dragging = circuitApi.getMobileMouseMode() === "DragAll";
        button.classList.toggle("is_dragging", dragging);
        button.classList.toggle("is_selecting", !dragging);
        button.setAttribute("aria-label", dragging ? "Select mode" : "Drag mode");
        button.setAttribute("aria-pressed", String(dragging));
        button.title = dragging ? "Switch to Select mode" : "Switch to Drag mode";
        button.querySelector("img").src = iconUrl(dragging ? "select" : "drag");
    }

    function createFloatingControls() {
        const controls = document.createElement("div");
        controls.className = "mobileFloatingControls";
        const resetButton = document.createElement("button");
        resetButton.type = "button";
        resetButton.className = "mobileControlButton mobileControlButton--reset";
        resetButton.id = "mobileReset";
        resetButton.setAttribute("aria-label", "Reset simulation");
        resetButton.title = "Reset";
        appendIcon(resetButton, "reset", "mobileControlButton__icon");

        const runButton = document.createElement("button");
        runButton.type = "button";
        runButton.className = "mobileControlButton mobileControlButton--run";
        runButton.id = "mobileRunStop";
        runButton.title = "Run simulation";
        appendIcon(runButton, "play", "mobileControlButton__icon");

        const dragButton = document.createElement("button");
        dragButton.type = "button";
        dragButton.className = "mobileControlButton mobileControlButton--drag";
        dragButton.id = "mobileDrag";
        dragButton.setAttribute("aria-label", "Drag circuit");
        dragButton.title = "Drag circuit";
        appendIcon(dragButton, "drag", "mobileControlButton__icon");

        const runControls = document.createElement("div");
        runControls.className = "mobileRunControls";
        runControls.append(dragButton, runButton);

        const actionControls = document.createElement("div");
        actionControls.className = "mobileActionControls";
        actionControls.append(resetButton, runControls);

        const speedPanel = document.createElement("div");
        speedPanel.className = "mobileSpeedPanel";
        const speedSlider = document.createElement("input");
        speedSlider.id = "mobileSpeedSlider";
        speedSlider.type = "range";
        speedSlider.min = "0";
        speedSlider.max = "100";
        speedSlider.step = "1";
        speedSlider.setAttribute("aria-label", "Simulation and current speed");
        speedSlider.setAttribute("title", "Simulation and current speed");
        const speedValue = document.createElement("span");
        speedValue.className = "mobileSpeedPanel__value";
        speedValue.setAttribute("aria-hidden", "true");
        const speedIcon = document.createElement("img");
        speedIcon.className = "mobileSpeedPanel__icon";
        speedIcon.src = iconUrl("speedometer-light");
        speedIcon.alt = "";
        speedIcon.draggable = false;
        speedPanel.append(speedSlider, speedValue, speedIcon);
        controls.append(actionControls, speedPanel);
        document.body.appendChild(controls);

        runButton.addEventListener("click", () => {
            circuitApi.setSimRunning(!circuitApi.isRunning());
            updateRunButton();
        });
        resetButton.addEventListener("click", () => circuitApi.resetCircuit());
        dragButton.addEventListener("click", () => {
            const action = circuitApi.getMobileMouseMode() === "DragAll" ? "select" : "drag";
            if (!circuitApi.runMobileCommand(action)) {
                console.error(`CircuitJS rejected mobile action: ${action}`);
                return;
            }
            updateDragButton(dragButton);
        });
        speedSlider.value = String(circuitApi.getMobileSpeed());
        const updateSpeedIndicator = () => {
            const fillHeight = speedPanel.clientHeight * Number(speedSlider.value) / 100;
            speedSlider.style.setProperty("--speed-fill-height", `${fillHeight}px`);
            speedValue.textContent = `${speedSlider.value}%`;
        };
        const updateSpeed = () => {
            updateSpeedIndicator();
            circuitApi.setMobileSpeed(Number(speedSlider.value));
        };
        updateSpeedIndicator();
        speedSlider.addEventListener("input", updateSpeed);

        const previousUpdateHook = circuitApi.onupdate;
        circuitApi.onupdate = function (api) {
            try {
                if (typeof previousUpdateHook === "function")
                    previousUpdateHook(api);
            } finally {
                updateRunButton();
                updateDragButton(dragButton);
            }
        };
        updateRunButton();
        updateDragButton(dragButton);
    }

    async function initialize(api) {
        circuitApi = api;
        quickBar = document.createElement("nav");
        quickBar.id = "mobileQuickBar";
        quickBar.className = "mobileQuickBar";
        quickBar.setAttribute("aria-label", "Quick Bar");
        quickBar.dataset.editorMode = String(new URLSearchParams(window.location.search).has("mobileEditor"));
        document.body.appendChild(quickBar);
        createFloatingControls();
        currentLayout = await loadLayout();
        render();
        loadingScreen.classList.add("is-ready");
        window.setTimeout(() => loadingScreen.remove(), 220);
        resolveReady(window.CircuitMobile);
    }

    const previousLoadHook = window.oncircuitjsloaded;
    window.oncircuitjsloaded = function (api) {
        if (typeof previousLoadHook === "function")
            previousLoadHook(api);
        void initialize(api);
    };

    window.CircuitMobile = Object.freeze({
        ready: ready,
        getActions: function () {
            return Object.keys(actions).map(id => ({ id: id, label: actions[id].label }));
        },
        getLayout: function () {
            return JSON.parse(JSON.stringify(currentLayout));
        },
        saveLayout: saveLayout,
        getQuickBar: function () {
            return quickBar;
        }
    });
}());
