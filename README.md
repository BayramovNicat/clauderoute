# Bun Swift Starter

Starter kit for building a small Bun-powered app with a web frontend, Tailwind CSS, and an optional native macOS Swift shell.

## Features

- Bun HTTP server with API routes
- TypeScript frontend bundled by Bun
- Tailwind CSS build pipeline
- Live reload during development
- Bun single-file binary build
- macOS `.app` wrapper built with Swift and WebKit

## Requirements

- [Bun](https://bun.sh)
- macOS with Xcode Command Line Tools for `bun run app:mac`

## Install

```sh
bun install
```

## Development

```sh
bun run dev
```

This builds the frontend into `.dev/frontend`, starts the Bun server in watch mode, opens the app in your browser, and reloads the page when files in `src/frontend` change.

Default URL:

```text
http://localhost:4173
```

If port `4173` is busy, the server tries the next available port.

## Scripts

```sh
bun run dev       # Start dev server with live reload
bun run compile   # Build frontend and compile Bun binary to dist/bun-swift-starter
bun run app:mac   # Build frontend, binary, and macOS .app bundle
bun run check     # Run Biome checks
bun run format    # Format src and scripts with Biome
```

## Project layout

```text
src/index.ts              Bun server and static asset serving
src/router.ts             API routes
src/frontend/index.html   Frontend HTML
src/frontend/app.ts       Frontend TypeScript
src/frontend/styles.css   Tailwind CSS entry
scripts/dev.ts            Development watcher and reload flow
scripts/build.ts          Frontend, binary, and macOS app builds
scripts/mac-launcher.swift macOS WebKit launcher template
assets/icon.icns          Optional macOS app icon
```

## API example

`src/router.ts` defines a sample endpoint:

```text
GET /api/hello
```

Response:

```json
{ "message": "Hello from Bun" }
```

The frontend button calls this endpoint and displays the returned message.

## Build binary

```sh
bun run compile
```

Output:

```text
dist/bun-swift-starter
```

Run it directly:

```sh
./dist/bun-swift-starter
```

## Build macOS app

```sh
bun run app:mac
```

Output:

```text
dist/Bun Swift Starter.app
```

If `assets/icon.icns` exists, it is copied into the app bundle. If it does not exist, the app still builds without a custom icon.

## Environment variables

```sh
PORT=5000 bun run dev              # Choose preferred server port
STARTER_NO_OPEN=1 bun run dev      # Do not open browser automatically
```

During development, internal variables `STARTER_DEV`, `STARTER_DEV_FRONTEND_DIR`, and `STARTER_FRONTEND_OUT_DIR` are set by the scripts.
