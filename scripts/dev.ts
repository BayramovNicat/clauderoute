import { watch } from "node:fs";
import { extname, join } from "node:path";

const DEV_FRONTEND_DIR = join(".dev", "frontend");
const WATCH_DIRS = [join("src", "frontend")];
const SERVER_URL_PATTERN = /Starter running at (http:\/\/localhost:\d+)/;
const watchedExtensions = new Set([".ts", ".css", ".html"]);

let serverUrl: string | undefined;
let browserOpened = false;
let rebuildTimer: Timer | undefined;
let rebuilding = false;
let pendingRebuild = false;

buildFrontend();
const server = Bun.spawn(["bun", "--watch", "src/index.ts"], {
  env: {
    ...process.env,
    STARTER_DEV: "1",
    STARTER_DEV_FRONTEND_DIR: DEV_FRONTEND_DIR,
  },
  stderr: "inherit",
  stdout: "pipe",
});

void pipeServerOutput(server.stdout);
const watchers = WATCH_DIRS.map((dir) =>
  watch(dir, { recursive: true }, (_event, filename) => {
    if (!filename || !watchedExtensions.has(extname(String(filename)))) return;
    scheduleRebuild();
  }),
);

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
await server.exited;
shutdown();

function scheduleRebuild() {
  if (rebuildTimer) clearTimeout(rebuildTimer);
  rebuildTimer = setTimeout(() => void rebuildFrontend(), 120);
}

async function rebuildFrontend() {
  if (rebuilding) {
    pendingRebuild = true;
    return;
  }

  rebuilding = true;
  try {
    buildFrontend();
    await notifyReload();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
  } finally {
    rebuilding = false;
    if (pendingRebuild) {
      pendingRebuild = false;
      scheduleRebuild();
    }
  }
}

function buildFrontend() {
  const result = Bun.spawnSync(["bun", "scripts/build.ts", "frontend"], {
    env: { ...process.env, STARTER_FRONTEND_OUT_DIR: DEV_FRONTEND_DIR },
    stdout: "inherit",
    stderr: "inherit",
  });
  if (!result.success)
    throw new Error(`Frontend build failed with exit code ${result.exitCode}`);
}

async function notifyReload() {
  if (!serverUrl) return;
  try {
    await fetch(`${serverUrl}/__dev/reload`, { method: "POST" });
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
  }
}

async function pipeServerOutput(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffered = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = decoder.decode(value, { stream: true });
    process.stdout.write(text);
    buffered += text;

    let newlineIndex = buffered.indexOf("\n");
    while (newlineIndex !== -1) {
      captureServerUrl(buffered.slice(0, newlineIndex));
      buffered = buffered.slice(newlineIndex + 1);
      newlineIndex = buffered.indexOf("\n");
    }
  }

  if (buffered) captureServerUrl(buffered);
}

function captureServerUrl(line: string) {
  const match = line.match(SERVER_URL_PATTERN);
  if (!match?.[1]) return;

  serverUrl = match[1];
  if (!browserOpened) {
    browserOpened = true;
    openBrowser(serverUrl);
  }
}

function openBrowser(url: string) {
  if (process.env.STARTER_NO_OPEN === "1") return;

  switch (process.platform) {
    case "darwin":
      Bun.spawn(["open", url], { stdout: "ignore", stderr: "ignore" });
      break;
    case "win32":
      Bun.spawn(["cmd", "/c", "start", "", url], {
        stdout: "ignore",
        stderr: "ignore",
      });
      break;
    default:
      Bun.spawn(["xdg-open", url], { stdout: "ignore", stderr: "ignore" });
  }
}

function shutdown() {
  for (const watcher of watchers) watcher.close();
  server.kill();
  process.exit();
}
