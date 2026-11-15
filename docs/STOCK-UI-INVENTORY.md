# Stock UI inventory

Baseline: upstream commit `8ac55f22`, built with the checked-in TypeScript/Vite project. The live DOM was inspected at 390×844 and 844×390 on 2026-11-15. Current UI is owned by TypeScript; legacy Java/GWT files are not the active build.

## Main controls

| Control | Live selector / representation | Creation and behavior |
| --- | --- | --- |
| Menu bar | `.gwt-MenuBar-horizontal > table td.gwt-MenuItem` | Built by `Menus.init()` and assembled in `Menus.ts` around lines 286-340 and 465-470. Top-level menus: File (16 live entries), Edit (16), Draw (163), Scopes (4), Options (16), Tools (2), and Circuits (424 data-driven entries). Each menu item dispatches to `CommandManager.menuPerformed`. Click/tap toggles a dropdown; outside click/touch closes it. At widths ≤600 px, `#toptrigger` / `.toptriggerlabel` opens the menu as a vertical list. |
| Quick toolbar | `.mainToolbar` with icon `<span>` elements titled by their actions | Built by `Toolbar` in `ts/Toolbar.ts`. Contains undo/redo, cut/copy/paste/duplicate, command search, zoom, and common component actions. The component icons support drag-to-create, including touch-to-mouse emulation. The bar is `overflow:hidden`, so actions past the viewport edge are clipped on narrow screens. |
| Sidebar | `#painel.verticalPanel` | Created in `UIManager.init()` (`ts/UIManager.ts`, around lines 589-606). On narrow screens the checkbox `#trigger` and label `.triggerLabel` toggle it. It is collapsed by default in the 390 px view; after opening and allowing its CSS transition, it occupies 128 px. |
| Reset and Run/Stop | `.verticalPanel .topButton` / `.topButton-red` | Created by `UIManager.init()` around lines 737-745. Reset calls the reset action; Run/Stop toggles simulator state. Live sizes are about 50×30 px and 82×30 px, below the requested 48 px target height. |
| Load circuit file | `#LoadFileElement` (off-screen file input; visible “Choose File” control) | `LoadFile` is created by `UIManager` when supported. Trigger it through the sidebar file chooser; it is not intended to be directly visible. |
| Simulation speed | `#painel` text “Simulation Speed” followed by a canvas | `UIManager` creates a `Scrollbar` around lines 768-773. Touch and mouse handlers live in the `Scrollbar` class near the top of `UIManager.ts`. |
| Current speed | `#painel` text “Current Speed” followed by a canvas | `UIManager` creates a `Scrollbar` around lines 777-780. |
| Power brightness | `#painel` text “Power Brightness” followed by a canvas | `UIManager` creates a `Scrollbar` around lines 784-787. It may be disabled depending on circuit state. |
| Current circuit and component values | `#painel` labels, title, and optional adjustment controls | `UIManager` adds “Current Circuit:” and the current title around lines 809-812. Element adjustment controls depend on the selected circuit/component. |
| Branding frame | `#painel iframe[src="iframe.html"]` | Appended by `UIManager` around lines 809-815; `war/iframe.html` is an empty placeholder in this upstream checkout. It is not currently hidden by the narrow-screen CSS. |
| Circuit canvas | `.canvasWrapper canvas.cursorPointer` | Created by `UIManager`; all circuit drawing, scopes, and the info box are canvas-rendered. It receives mouse and touch input through `MouseManager`. |
| Scope plots and splitter | Drawn on the circuit canvas; menu root `Scopes` | `ScopeManager` lays out scope plots; `Scope` draws them. Splitter and plot selection are handled by `MouseManager`. The Scopes menu exposes Stack All, Unstack All, Combine All, and Separate All. |
| Info box | No separate DOM selector; drawn at the bottom of the circuit canvas | `UIManager.drawBottomArea()` around lines 1284-1330 draws hover information and status. `?hideInfoBox=true` suppresses it. |

## Popups and dialogs

| UI | Selector / implementation | Trigger and dismissal |
| --- | --- | --- |
| Menu dropdowns and submenus | `.menuDropdown li.menuItem` | Open from a top-level menu or submenu; outside click/touch closes the stack. On narrow screens dropdowns become full-width and scrollable. |
| Component context menu | `UIManager.contextPanel` containing `Menus`' element menu | Right-click, canvas long-press, or supported double-click paths in `MouseManager`; menu items call the same command dispatcher. It is removed by selecting a command or closing the context panel. |
| Scope popup | `.menuItem` entries built by `ScopePopupMenu` | Context/double-click on a scope; includes Remove, Dock/Undock, Max Scale, Stack/Unstack, Combine, Remove Plot, Reset, Export CSV/Image, and Properties. Visibility and enabled state depend on whether the scope is floating/stacked. |
| Toolbar variant palettes | `.palette-container` elements built by `Toolbar` | Open from a component-family toolbar icon; choosing a variant starts that element action. Touch handlers close palettes when appropriate. |
| Modal dialogs | Native `dialog.circuitDialog` from `Dialog` | Opened by menu/command actions; Escape closes it, and Enter applies where supported. |
| Scrollbar value popup | `ScrollValuePopup` | Opened by the applicable canvas slider; interaction is handled by the slider and popup code. |

## Verified command and touch hooks

- URL `mouseMode=<item>` is read during startup and sent to `CommandManager.menuPerformed("main", item)` from `CirSim.ts` around lines 238-316. Main-menu commands set the mouse mode and update the toolbar in `CommandManager.ts`.
- `window.CircuitJS1` is installed by `JSInterface.setupJSInterface()` around lines 62-82. It currently exposes `setSimRunning`, `isRunning`, time, circuit import/export, and related methods. It does not yet expose the requested general `doCommand` or stable mouse-mode bridge.
- `MouseManager` touch handlers (around lines 141-225) prevent browser gestures on the canvas, dispatch mouse events for one-finger input, begin two-finger drag/pinch behavior, and start a 500 ms long-press timer. `Toolbar` has separate touch-drag support for component icons.
- No coarse-pointer-specific picking radius was found. Handle selection uses `getHandleGrabbedClose` and the existing `POSTGRABSQ` / `MINPOSTGRABSIZE` constants in `MouseManager`; inspect the underlying element hit-testing before changing it.

## Baseline measurements and issues

- 390×844: document scroll size was 390×844; the menu and sidebar are collapsed behind their hamburger tabs. The stock toolbar is clipped horizontally. The circuit canvas fills the remaining width.
- 844×390: document scroll size was 844×390; the canvas measured 716×320 and the sidebar occupied the remaining 128 px.
- Existing narrow-screen styles use `@media (max-width: 600px)` in `ts/style.css`. The sidebar and top menu have toggle labels, but their hit areas and stock menu items, toolbar actions, and sidebar buttons are not uniformly 48 px tall.
- A production build served from `site/` reports a missing `service-worker.js` (404). The HTML also retains an absolute `/circuit/manifest.json` URL and a Dropbox script from an external host; the final sub-path deployment must address both.
- Screenshots for 390×844 portrait and 844×390 landscape were captured in the Phase 0 session.
