# YOYOPDF Mobile

YOYOPDF is a privacy-first mobile PDF utility for Android, designed to keep document processing on the device wherever possible. iOS portability is an architectural goal.

This repository is the dedicated mobile app. The existing YOYOPDF web application remains a separate project.

## Current status

Phase 2 includes one real Android workflow: select two or more PDFs, reorder them, merge entirely on-device, choose a save location, open/share the result, and retain metadata-only recents. All other PDF tools remain planned.

Merge PDF uses a custom Capacitor Android bridge with Apache-licensed PdfBox-Android. Android document providers are accessed through secure `content://` references; PDF bytes never enter JavaScript state or localStorage and are never uploaded.

## Start locally

Requirements: Node.js 20.19+ and npm.

```bash
npm install
npm run dev
```

## Validate and build

```bash
npm run check
npm run cap:sync
```

To open the native project, install Android Studio and its SDK, then run `npm run android:open`.

See [AGENTS.md](./AGENTS.md) for architecture, privacy rules, development conventions, and phase guidance.

## Merge PDF verification

The JavaScript suite covers selection, ordering, validation, output names, errors, loader states, and recent metadata. The Android instrumentation test creates and merges PDFs on-device and verifies page order.

```bash
cd android
./gradlew :app:assembleDebug :app:assembleDebugAndroidTest
./gradlew :app:connectedDebugAndroidTest # emulator/device required
```

This is not yet a production release. Password entry, iOS native support, a broad real-world PDF corpus, and a full Android provider/device matrix remain future hardening work.
