# YOYOPDF Mobile App Guide

## Project purpose

This repository contains the dedicated YOYOPDF mobile application. Android is the first target; the architecture must remain portable to iOS. The existing YOYOPDF web application lives separately in `iamcaravi/Eazypdfv2` and must not be copied here wholesale or replaced by this project.

## Current implementation phase

Phase 2 implements one complete operation: Merge PDF on Android. It includes Storage Access Framework selection and saving, native on-device merging, ordered selection state, a reusable processing overlay, result/open/share actions, and metadata-only recent files. Merge PDF is `available`; every other PDF tool remains `planned`.

The next phase should harden Merge PDF with a wider compatibility/performance corpus and device coverage before selecting another single tool vertical slice.

## Architecture decisions

- Vite builds framework-free HTML, CSS, and JavaScript from `mobile/`.
- Capacitor wraps the built web assets for Android and later iOS.
- UI is rendered from small modules; no React, Vue, Angular, or other large UI framework is required.
- `mobile/src/tools/catalog.js` is the single source of truth for planned tools. Do not duplicate tool metadata or PDF engines.
- Browser/platform boundaries belong in `services/`, `storage/`, and `native/`; screens should not call native APIs directly.
- Document processing should run locally on the device wherever technically possible.
- Android PDF operations are exposed through the local `PdfDocuments` Capacitor plugin. JavaScript passes secure document references and metadata only; it never receives PDF bytes.

## Phase 2 PDF engine decision

- Android Merge PDF uses `com.tom-roush:pdfbox-android:2.0.27.0`, the Apache-2.0 Android port of Apache PDFBox.
- The existing Eazypdfv2 web implementation was inspected. It uses `pdf-lib` 1.17.1 and reads each browser `File` into an `ArrayBuffer`, copies pages into a second in-memory document, then saves another byte array. That remains appropriate for the web app but is not reused in the Android WebView because it duplicates large document data in JavaScript memory and does not natively handle Android `content://` references.
- PdfBox-Android was selected because it can consume Android content streams, use disk-backed PDFBox scratch storage, preserve vector PDF pages, classify password/corruption failures, and run off the UI thread under a permissive license.
- iText was not selected because its AGPL/commercial licensing is not appropriate without a separate product/legal decision. Android `PdfRenderer` cannot write or merge PDFs. A WebView `pdf-lib`/WASM path would increase memory copying and complicate native storage integration.

## Android integration and file handling

- `android/app/src/main/java/com/yoyopdf/app/pdf/PdfDocumentsPlugin.java` owns picker, save, availability, open, and share intents.
- Selection uses `ACTION_OPEN_DOCUMENT`, `application/pdf`, multiple selection, persisted read grants where providers support them, and ordered `content://` references. Do not resolve or depend on raw filesystem paths.
- Merging runs on a single background executor. `PdfMergeEngine` opens one source at a time, uses PDFBox temp-file memory settings, appends in the UI-specified order, and writes a private cache result.
- Only after the merge succeeds does `ACTION_CREATE_DOCUMENT` ask the user where to save `merged-pdf.pdf`. The provider handles collision/overwrite confirmation. The private temporary file is removed after success, cancellation, or failure; stale crash remnants older than 24 hours are cleaned on plugin load.
- Open and Share use the saved content URI with temporary read permission. Never expose raw paths to other apps.
- Picker and output providers may omit file size. UI must display “Size unavailable” rather than treating it as zero.

## Processing and recent-file architecture

- `mobile/src/components/processing-overlay.js` is the reusable cross-tool processing UI. It supports indeterminate work, real completed/total progress, success, failure, and cooperative cancellation.
- Never manufacture percentages. Merge progress is measured by completed source files; final PDF saving remains indeterminate.
- Cancellation is checked between input documents and before save. PDFBox cannot interrupt a single document parse or final serialization safely.
- `mobile/src/storage/recent-files.js` persists metadata only: secure URI, filename, size, timestamp, operation, and availability. PDF bytes never enter localStorage.
- Recent references are rechecked through the native plugin. Missing or revoked documents become unavailable without crashing, and removing a recent item removes metadata only—not the saved PDF.

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
- Merge PDF currently requires Android. Keep the JavaScript/native adapter boundary portable so a future iOS implementation can provide the same contract.

## Testing approach and known limitations

- Node tests cover ordered selection, duplicates, validation, all reorder directions, removal, output names, error mapping, recent metadata, catalog status, and real-versus-indeterminate loader behavior.
- `PdfMergeEngineInstrumentedTest` creates small PDFs on-device, merges them, and verifies page count and source/page order without committing binary fixtures.
- Build the app test APK with `gradlew :app:assembleDebugAndroidTest`; run it with `gradlew :app:connectedDebugAndroidTest` when an emulator or device is attached.
- Password-protected PDFs are rejected with a user-facing message; password entry is not implemented.
- Cancellation is cooperative between files, not during a single large PDF parse or final save.
- Provider access can later be revoked; recents will show the output as unavailable.
- PdfBox-Android 2.0.27.0 is mature but based on PDFBox 2.x. Advanced forms, signatures, unusual structures, malformed files, and very large real-world PDFs need broader corpus testing.
- Android save/share/picker behavior varies by installed document providers. Complete a provider/device matrix before release.
- This remains a development build, not a production-ready release.

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
- Build Android app and instrumentation APK: `cd android && ./gradlew :app:assembleDebug :app:assembleDebugAndroidTest`
- Run Android instrumentation tests with a connected device: `cd android && ./gradlew :app:connectedDebugAndroidTest`
