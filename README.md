# YOYOPDF Mobile

YOYOPDF is a privacy-first mobile PDF utility for Android, designed to keep document processing on the device wherever possible. iOS portability is an architectural goal.

This repository is the dedicated mobile app. The existing YOYOPDF web application remains a separate project.

## Current status

Phase 1 foundation: lightweight Vite/JavaScript UI, Capacitor Android host, four-tab mobile shell, searchable tool catalog, empty file states, and persisted System/Light/Dark themes. PDF operations are visibly marked as planned and are not implemented yet.

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
