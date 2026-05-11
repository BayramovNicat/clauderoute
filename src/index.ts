import type { ServerWebSocket } from "bun";
import appJsImport from "../dist/frontend/app.js" with { type: "text" };
import htmlImport from "../dist/frontend/index.html" with { type: "text" };
import stylesCssImport from "../dist/frontend/styles.css" with { type: "text" };
import packageJson from "../package.json" with { type: "json" };
import { route } from "./router";

const APP_NAME = packageJson.displayName ?? packageJson.name;
const DEFAULT_PORT = 4173;
const devReloadClients = new Set<ServerWebSocket<unknown>>();
const isDev = process.env.STARTER_DEV === "1";
const devFrontendDir = process.env.STARTER_DEV_FRONTEND_DIR ?? "dist/frontend";
const contentTypes = {
	app: { "content-type": "text/javascript; charset=utf-8" },
	html: { "content-type": "text/html; charset=utf-8" },
	styles: { "content-type": "text/css; charset=utf-8" },
};
const server = startServer(Number(process.env.PORT ?? DEFAULT_PORT));
const url = `http://localhost:${server.port}`;

console.log(`${APP_NAME} running at ${url}`);
if (!isDev) openBrowser(url);

function serve(port: number) {
	return Bun.serve({
		port,
		async fetch(request, server) {
			const { pathname } = new URL(request.url);

			if (isDev) {
				const devResponse = handleDevRequest(pathname, request, server);
				if (devResponse) return devResponse;
			}

			switch (pathname) {
				case "/":
					return assetResponse(await html(), contentTypes.html);
				case "/styles.css":
					return assetResponse(
						await frontendAsset(stylesCssImport, "styles.css"),
						contentTypes.styles,
					);
				case "/app.js":
					return assetResponse(
						await frontendAsset(appJsImport as unknown as string, "app.js"),
						contentTypes.app,
					);
				default:
					return (
						(await route(request)) ?? new Response("Not found", { status: 404 })
					);
			}
		},
		websocket: {
			open(socket) {
				devReloadClients.add(socket);
			},
			message() {},
			close(socket) {
				devReloadClients.delete(socket);
			},
		},
	});
}

function handleDevRequest(
	pathname: string,
	request: Request,
	server: Bun.Server<unknown>,
) {
	if (pathname === "/__dev/ws") {
		if (server.upgrade(request, { data: undefined })) return;
		return new Response("WebSocket upgrade failed", { status: 400 });
	}

	if (pathname === "/__dev/reload") {
		for (const client of devReloadClients) client.send("reload");
		return new Response("ok");
	}
}

async function html() {
	const page = await frontendAsset(
		htmlImport as unknown as string,
		"index.html",
	);
	return isDev ? page.replace("</body>", `${devReloadScript}</body>`) : page;
}

async function frontendAsset(staticAsset: string, filename: string) {
	return isDev
		? await Bun.file(`${devFrontendDir}/${filename}`).text()
		: staticAsset;
}

function assetResponse(body: string, headers: HeadersInit) {
	return new Response(body, { headers });
}

const devReloadScript = /*html*/ `<script>
(() => {
	const protocol = location.protocol === "https:" ? "wss" : "ws";
	const socket = new WebSocket(protocol + "://" + location.host + "/__dev/ws");
	socket.addEventListener("message", (event) => {
		if (event.data === "reload") location.reload();
	});
})();
</script>`;

function startServer(preferredPort: number) {
	for (let port = preferredPort; port < preferredPort + 100; port++) {
		try {
			return serve(port);
		} catch {}
	}

	throw new Error(
		`No available port found from ${preferredPort} to ${preferredPort + 99}`,
	);
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
