# CircuitJS mobile fork plan

## Phase 0 findings

- Baseline source: official `pfalstad/circuitjs1`, commit `8ac55f22` (`upstream/master`).
- Working branch: `mobile-ui`. This checkout is based on upstream, not on a personal fork; no GitHub account or fork URL was provided.
- The active application is TypeScript + Vite under `ts/`. `README.md` documents `npm ci`, `npm test`, and `npm run build`. The checked-in `gradle/wrapper/gradle-wrapper.properties` pins Gradle 8.7, but there is no `build.gradle`; the Gradle wrapper is not the active web-app build.
- The primary build input is `ts/circuitjs.html`; `war/circuitjs.html` is the older GWT entry point. `.github/workflows/build.yml` and `deploy-pages.yml` currently target `dev-ts`.
- Existing UI entry points and command handling are in `ts/UIManager.ts`, `ts/Menus.ts`, `ts/Toolbar.ts`, `ts/CommandManager.ts`, and `ts/JSInterface.ts`.
- Existing canvas touch support already maps touch to mouse events, supports two-finger pan/zoom, and opens a context menu after a 500 ms long-press. The current mobile CSS uses a 600 px breakpoint and hamburger toggles.
- Browser baseline: the app loaded the LRC example and `CircuitJS1.isRunning()` reported `true`. At 390×844, document scroll size was 390×844; at 844×390 it was 844×390 and the canvas measured 716×320. Screenshots for both viewports were captured in the session.

## Baseline commands and results

Run these from `ts/` unless otherwise noted:

| Command | Result |
| --- | --- |
| `npm ci` | Succeeded using `ts/package-lock.json`. |
| `npm test` | Passed: 7 test files, 68 tests. |
| `npm run build` | Passed: TypeScript check and Vite 8.0.14 build. |
| `./dist-offline.sh` | Passed from the repository root using Git Bash; generated `site/`. |
| `python -m http.server 8000 --directory site --bind 127.0.0.1` | Served `site/circuitjs.html`; HTTP 200. |

Baseline build warnings: Vite could not resolve the legacy `circuitjs/font/fontello.css` and `images/hborder.png` references and reported the approximately 1.18 MB minified JS bundle. The served build also reports a missing `service-worker.js` (404). `ts/circuitjs.html` still references an absolute `/circuit/manifest.json` URL and a Dropbox script from an external host; both conflict with the eventual sub-path/no-cross-origin requirements.

## Chosen implementation approach

1. Follow the active TypeScript/Vite application, not the stale Java/GWT build instructions. Keep changes small and isolated from simulator logic.
2. Keep the requested mobile layer as plain CSS/ES2019 JavaScript in `war/mobile/`. Integrate it through the active `ts/circuitjs.html` entry and the existing Vite static-asset copy path; make the generated `site/mobile/` work with relative URLs. Resolve the exact dev/build loading mechanism in Phase 2 before implementation.
3. Reuse the current `CommandManager.menuPerformed` command path and `CircuitJS1` JS interface. Add only the narrow bridge methods needed by the Quick Bar; retain an explicit allowlist for layout actions.
4. Preserve current mouse behavior and existing touch-to-mouse, pinch/pan, and long-press handling. First trace the existing element-selection tolerance; only change touch hit-testing if measurements prove the existing behavior insufficient.
5. Add a data-only `war/mobile/layout.json`, a validated loader, and the Quick Bar separately from the simulator UI. The dev editor must be excluded from release output.
6. Adapt CI and release work to the repository's Node/Vite build and existing workflows. Verify official action versions and current Pages terms during Phase 1 rather than assuming the stale Gradle/GWT workflow applies.
7. Leave all desktop-only styling and behavior unchanged unless a narrowly scoped shared hook is unavoidable; verify desktop at 1440×900 before accepting mobile styling changes.

## Risks and gates

- **Repository ownership:** Pages deployment, release creation, and pushing cannot be completed until the user creates a public GitHub fork/repository and supplies its URL or connects authentication in GitHub's normal UI. Never push to `upstream`.
- **Platform:** WSL is installed as a Windows feature but cannot currently start. Git for Windows is installed for local work; Git Bash can run the existing shell build script. Do not claim WSL-based validation.
- **Legacy versus active entry point:** `war/circuitjs.html` and the Gradle wrapper remain in the tree, but the verified production app is Vite-built from `ts/circuitjs.html`. Recheck static asset paths under the GitHub Pages repository sub-path.
- **Responsive baseline:** mobile support exists, but the existing breakpoint is 600 px, the stock toolbar is clipped on narrow screens, and the stock UI has small non-semantic toolbar controls. Sidebar and branding behavior need explicit touch testing.
- **Network baseline:** the production HTML includes a Dropbox-hosted script. Remove/disable that path for the requested no-cross-origin deployment; do not copy any compiled files from falstad.com.
- **Touch picking:** current code has handle-grab thresholds, but no coarse-pointer-specific threshold was found in the initial search. Inspect the element hit-test path before deciding whether Java/TypeScript changes are necessary.
- **Commit identity:** no local Git `user.name` or `user.email` is configured. Do not invent the user's identity; configure a Copilot-only commit identity for local phase commits or ask the user before committing if that is not acceptable.

Phase 0 is complete when this plan, `docs/STOCK-UI-INVENTORY.md`, and `docs/DECISIONS.md` are present alongside the passing baseline evidence above.
