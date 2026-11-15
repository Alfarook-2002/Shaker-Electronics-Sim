# Decisions

## 2026-11-15 — Follow the active TypeScript/Vite application

The supplied implementation brief describes a Java/GWT build, but this checkout's README, tests, production build, and Pages workflows use TypeScript/Vite. There is no `build.gradle`. The mobile work will therefore integrate with `ts/circuitjs.html` and Vite while retaining the brief's isolated `war/mobile/` assets where practical. The legacy `war/circuitjs.html` will not be treated as the production entry point.

## 2026-11-15 — Reuse existing command and touch behavior

`CommandManager.menuPerformed` is already the central command dispatcher, `CircuitJS1` exposes simulator state, and `MouseManager` already maps touch input to mouse events with pinch/pan and long-press support. Extend those mechanisms only where the Quick Bar needs a stable bridge; do not replace canvas input or dispatch layout-provided code.

## 2026-11-15 — Use upstream as the local base

The requested directory was empty, so the official `pfalstad/circuitjs1` repository was cloned as the base and retained as the `upstream` remote on branch `mobile-ui`. The user's fork was connected as `origin` after its URL was provided.

## 2026-11-15 — Link the user's public fork as origin

The user supplied `https://github.com/Alfarook-2002/Elect-mobile`, confirmed publicly as a fork of CircuitJS1 with `master` at the same upstream baseline. It is now configured as `origin`; `upstream` remains the official source.

## 2026-11-15 — Treat existing deployment warnings as baseline, not fixes

The untouched Vite build passes but emits legacy asset and bundle-size warnings; the served page reports a missing service-worker 404. These will be handled only when directly required by the mobile/Pages work, without broad dependency or cleanup changes.
