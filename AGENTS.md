# YOYOPDF Mobile App Guide

## Project purpose

This repository contains the dedicated YOYOPDF mobile application. Android is the first target; the architecture must remain portable to iOS. The existing YOYOPDF web application lives separately in `iamcaravi/Eazypdfv2` and must not be copied here wholesale or replaced by this project.

## Current implementation phase

Phase 1 is the application foundation: Capacitor host, mobile app shell, Home, Tools, Files, Settings, and persisted System/Light/Dark themes. PDF operations and file actions are intentionally marked `planned`; they are not implemented workflows. Do not present a planned tool as working.

The next phase should implement a single vertical slice for local PDF import and one selected PDF operation, including tests and Android device verification.

## Architecture decisions

- Vite builds framework-free HTML, CSS, and JavaScript from `mobile/`.
- Capacitor wraps the built web assets for Android and later iOS.
- UI is rendered from small modules; no React, Vue, Angular, or other large UI framework is required.
- `mobile/src/tools/catalog.js` is the single source of truth for planned tools. Do not duplicate tool metadata or PDF engines.
- Browser/platform boundaries belong in `services/`, `storage/`, and `native/`; screens should not call native APIs directly.
- Document processing should run locally on the device wherever technically possible.

## Source structure

```text
mobile/
  src/
    app/         routing and application orchestration
    components/  reusable UI renderers
    screens/     top-level and detail screens
    services/    application services
    storage/     persisted preferences and metadata
    native/      Capacitor/platform adapters
    theme/       theme state and application
    tools/       PDF tool catalog and future tool modules
    styles/      global mobile styles
  tests/         unit tests for framework-independent logic
android/         generated Capacitor Android project
```

## Coding conventions

- Use modern JavaScript modules, two-space indentation, semicolons, single quotes, and trailing commas in multiline literals.
- Keep modules focused and prefer named exports.
- Treat text inserted into HTML as untrusted and escape it before rendering.
- Use semantic HTML, visible focus states, accessible names, and buttons for actions.
- Put shared design values in CSS custom properties.
- Add tests for pure logic and regressions. Keep native integrations behind adapters so they can be mocked.
- Avoid dependencies unless they remove meaningful risk or maintenance burden.

## Mobile-first requirements

- Support 320px minimum width; optimize for 360–430px phones.
- Never depend on hover. Interactive targets should be about 44px or larger.
- Respect top, bottom, left, and right safe-area insets.
- Avoid horizontal overflow and fixed desktop widths.
- Ensure forms remain usable with the software keyboard and content scrolls correctly.
- Provide accessible labels, readable contrast, predictable Android back behavior, and clear in-app back navigation for detail screens.
- Validate important flows on an Android emulator or physical device before release.

## Privacy requirements

- Prefer on-device/client-side PDF processing.
- Do not upload PDFs or document content to a server.
- Do not log document content, extracted text, file paths, or sensitive metadata.
- Do not add analytics, telemetry, advertising SDKs, or crash attachments that may expose documents without an explicit reviewed decision.
- Store only the minimum metadata required for recents; actual document bytes require a deliberate Phase 2 design.
- Explain any operation that cannot remain local before implementing it.

## Important constraints

- The GitHub repository is the source of truth. Keep commits reviewable and the working tree portable.
- Do not clone or vendor the entire Eazypdfv2 application.
- Do not implement every PDF tool at once. Build and validate one vertical slice at a time.
- Do not claim production readiness until release signing, device coverage, accessibility, privacy review, and store requirements are complete.
- Preserve generated Android files required by Capacitor; do not hand-edit generated web assets in `mobile/dist/`.

## Continuing development

1. Pull the repository and install the Node version declared in `package.json`.
2. Run `npm install`.
3. Run `npm run check` before changing code.
4. Add features in the relevant source layer, keeping native and storage access behind adapters.
5. Build one PDF workflow end to end, update its catalog status only when it genuinely works, and add tests.
6. Run `npm run cap:sync`, then validate on Android.
7. Update this file and the README when architecture, commands, or implementation phase changes.

## Commands

- Development server: `npm run dev`
- Unit tests: `npm test`
- Web build: `npm run build`
- Full local check: `npm run check`
- Build and sync native projects: `npm run cap:sync`
- Open Android Studio: `npm run android:open`
- Run on Android: `npm run android:run`
