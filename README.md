# YOYOPDF Mobile

YOYOPDF is a privacy-first mobile PDF utility for Android, designed to keep document processing on the device wherever possible. iOS portability is an architectural goal.

This repository is the dedicated mobile app. The existing YOYOPDF web application remains a separate project.

## Current status

The Android app includes four on-device workflows: Merge PDF, Split PDF, Reorder Pages, and Delete Pages. Delete Pages provides accessible thumbnail selection, remaining-page validation, and never permits an empty PDF. Reorder provides touch drag-and-drop plus accessible move controls while preserving every source page. Split supports custom non-overlapping ranges, fixed pages-per-file groups, and selected pages as one PDF or separate PDFs. Multiple outputs are saved as one ZIP; generated PDF and ZIP references use the existing metadata-only recents system.

All implemented PDF tools use the same custom Capacitor Android bridge with Apache-licensed PdfBox-Android. Android document providers are accessed through secure `content://` references; PDF bytes never enter JavaScript state or localStorage and are never uploaded. Page thumbnails are rendered lazily for visible pages and only small preview images cross the bridge.

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

## PDF workflow verification

The JavaScript suite covers merge ordering, split planning, reorder controls, deletion selection and safeguards, output types, errors, loader states, and recent metadata. Android instrumentation tests create PDFs on-device and verify merge, split, reorder, and page-deletion output sequences.

Size-targeted splitting is intentionally not included. Serialized PDF size depends on shared resources and compression, so page sizes cannot be reliably added to guarantee a maximum output size.

```bash
cd android
./gradlew :app:assembleDebug :app:assembleDebugAndroidTest
./gradlew :app:connectedDebugAndroidTest # emulator/device required
```

This is not yet a production release. Password entry, iOS native support, a broad real-world PDF corpus, and a full Android provider/device matrix remain future hardening work.
