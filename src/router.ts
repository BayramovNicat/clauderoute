import { mkdir, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

type JsonObject = Record<string, unknown>;

type SettingsFile = {
	json: JsonObject | null;
	parseError?: string;
};

const omniRouteOrigin = "http://localhost:20128";
const omniRouteAuthCode = "OMNIROUTE_AUTH_REQUIRED";
const omniRouteProtectedPath = "/dashboard/providers/codex";

class OmniRouteAuthRequired extends Error {
	loginUrl: string;

	constructor(loginUrl = `${omniRouteOrigin}${omniRouteProtectedPath}`) {
		super("OmniRoute authentication required.");
		this.loginUrl = loginUrl;
	}
}

export async function route(request: Request) {
	const { pathname, search } = new URL(request.url);

	try {
		if (
			pathname === "/api/provider-models/built-in" &&
			request.method === "GET"
		) {
			return Response.json(await builtInProviderModels(request));
		}

		if (pathname === "/api/debug/cookies" && request.method === "GET") {
			return Response.json(cookieDebugInfo(request));
		}

		if (
			(pathname === "/api/providers" || pathname === "/api/provider-models") &&
			request.method === "GET"
		) {
			const response = await omniRouteFetch(`${pathname}${search}`, request);
			const text = await response.text();
			assertOmniRouteJsonResponse(response, text);
			return new Response(text, {
				status: response.status,
				headers: {
					"content-type":
						response.headers.get("content-type") ?? "application/json",
				},
			});
		}

		if (pathname === "/api/config/user" && request.method === "GET") {
			return Response.json(await readSettingsFile());
		}

		if (pathname === "/api/config/user" && request.method === "POST") {
			const body = (await request.json()) as { env?: unknown };
			const validation = validateEnvUpdate(body.env);
			if (!validation.valid) return Response.json(validation, { status: 400 });

			const file = await readSettingsFile();
			if (!file.json) {
				return Response.json(
					{ error: `Invalid JSON: ${file.parseError ?? "Unknown error"}` },
					{ status: 400 },
				);
			}
			const settings = {
				...file.json,
				env: {
					...(isObject(file.json.env) ? file.json.env : {}),
					...validation.env,
				},
			};

			const path = settingsPath();
			await mkdir(dirname(path), { recursive: true });
			await writeFile(path, `${JSON.stringify(settings, null, "\t")}\n`, {
				mode: 0o600,
			});

			return Response.json({ ok: true });
		}
	} catch (error) {
		if (error instanceof OmniRouteAuthRequired) {
			return Response.json(
				{
					error: error.message,
					code: omniRouteAuthCode,
					loginUrl: error.loginUrl,
				},
				{ status: 401 },
			);
		}

		return Response.json(
			{ error: error instanceof Error ? error.message : "Unknown error" },
			{ status: 500 },
		);
	}

	return;
}

async function builtInProviderModels(request: Request) {
	const cookie = request.headers.get("cookie") ?? "";
	const page = await omniRouteText("/dashboard/providers/codex", cookie);
	const scripts = [...page.matchAll(/<script[^>]+src="([^"]+)"/g)].map(
		(match) => match[1] ?? "",
	);
	const chunks = await Promise.all(
		scripts.map((script) => omniRouteText(script, cookie).catch(() => "")),
	);
	const catalogChunk = chunks.find((chunk) =>
		/[A-Za-z0-9_-]+:\{id:"[^"]+"[\s\S]*?models:\[/.test(chunk),
	);
	if (!catalogChunk) return { models: {}, aliases: {} };
	return parseProviderCatalog(catalogChunk);
}

async function omniRouteText(path: string, cookie: string) {
	const response = await fetch(`${omniRouteOrigin}${path}`, {
		headers: { cookie },
		redirect: "manual",
	});
	const text = await response.text();
	assertOmniRouteHtmlResponse(response, text);
	if (!response.ok)
		throw new Error(`OmniRoute request failed: ${response.status}`);
	return text;
}

function omniRouteFetch(path: string, request: Request) {
	return fetch(`${omniRouteOrigin}${path}`, {
		headers: { cookie: request.headers.get("cookie") ?? "" },
		redirect: "manual",
	});
}

function cookieDebugInfo(request: Request) {
	const cookie = request.headers.get("cookie") ?? "";
	const names = cookie
		.split(";")
		.map((item) => item.split("=")[0]?.trim() ?? "")
		.filter(Boolean);
	return {
		hasCookieHeader: cookie.length > 0,
		cookieCount: names.length,
		cookieNames: names,
	};
}

function assertOmniRouteJsonResponse(response: Response, text: string) {
	assertOmniRouteResponse(response, text, true);
}

function assertOmniRouteHtmlResponse(response: Response, text: string) {
	assertOmniRouteResponse(response, text, false);
}

function assertOmniRouteResponse(
	response: Response,
	text: string,
	expectsJson: boolean,
) {
	if (response.status === 401 || response.status === 403) {
		throw new OmniRouteAuthRequired(authLoginUrl(response));
	}
	if (response.status >= 300 && response.status < 400) {
		throw new OmniRouteAuthRequired(authLoginUrl(response));
	}
	if (looksLikeLoginPage(text)) throw new OmniRouteAuthRequired();
	if (expectsJson && looksLikeHtml(text)) {
		throw new Error("OmniRoute returned HTML instead of JSON.");
	}
}

function authLoginUrl(response: Response) {
	const location = response.headers.get("location");
	if (!location) return `${omniRouteOrigin}${omniRouteProtectedPath}`;
	return new URL(location, omniRouteOrigin).toString();
}

function looksLikeHtml(text: string) {
	return /^\s*<!doctype html/i.test(text) || /^\s*<html[\s>]/i.test(text);
}

function looksLikeLoginPage(text: string) {
	if (!looksLikeHtml(text)) return false;
	const title = text.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "";
	const bodyStart = text.slice(0, 4000);
	return (
		/(login|sign[ -]?in|authenticate)/i.test(title) ||
		/<form[^>]+(action|id|class)=["'][^"']*(login|signin|auth)/i.test(
			bodyStart,
		) ||
		/(log in|sign in) to (omniroute|continue)/i.test(bodyStart)
	);
}

function parseProviderCatalog(source: string) {
	const models: Record<string, { id: string; name: string }[]> = {};
	const aliases: Record<string, string> = {};
	const providerPattern =
		/"?([A-Za-z0-9_-]+)"?:\{id:"([^"]+)"[\s\S]*?models:\[/g;
	let match = providerPattern.exec(source);
	while (match) {
		const provider = match[2];
		const start = providerPattern.lastIndex;
		const end = findArrayEnd(source, start - 1);
		if (provider && end !== -1) {
			const providerStart = match.index;
			const list = source.slice(start, end);
			const providerModels = parseModelList(list);
			const alias = source
				.slice(providerStart, start)
				.match(/alias:"([^"]+)"/)?.[1];
			for (const ref of list.matchAll(/\.\.\.([A-Za-z_$][\w$]*)/g)) {
				providerModels.push(
					...parseModelList(referenceArray(source, ref[1] ?? "")),
				);
			}
			if (providerModels.length) models[provider] = providerModels;
			if (alias) aliases[provider] = alias;
			providerPattern.lastIndex = end;
		}
		match = providerPattern.exec(source);
	}
	return { models, aliases };
}

function parseModelList(source: string) {
	return [...source.matchAll(/id:"([^"]+)"[^}]*name:"([^"]+)"/g)].map(
		(model) => ({
			id: model[1] ?? "",
			name: model[2] ?? model[1] ?? "",
		}),
	);
}

function referenceArray(source: string, name: string) {
	const pattern = new RegExp(`${name}=Object\\.freeze\\(\\[`);
	const objectFreezeIndex = source.search(pattern);
	const index =
		objectFreezeIndex === -1
			? source.search(new RegExp(`(?:let|const|var|,)${name}=`))
			: objectFreezeIndex;
	if (index === -1) return "";
	const assignment = source.indexOf("=", index);
	if (assignment === -1) return "";
	const start = source.indexOf("[", assignment);
	if (start === -1) return "";
	const end = findArrayEnd(source, start);
	return end === -1 ? "" : source.slice(start + 1, end);
}

function findArrayEnd(source: string, openBracket: number) {
	let depth = 0;
	let inString = false;
	let escaped = false;
	for (let index = openBracket; index < source.length; index++) {
		const char = source[index];
		if (inString) {
			if (escaped) escaped = false;
			else if (char === "\\") escaped = true;
			else if (char === '"') inString = false;
			continue;
		}
		if (char === '"') inString = true;
		else if (char === "[") depth++;
		else if (char === "]") {
			depth--;
			if (depth === 0) return index;
		}
	}
	return -1;
}

function settingsPath() {
	const home = process.env.HOME;
	if (!home) throw new Error("HOME is not set.");
	return join(home, ".claude", "settings.json");
}

async function readSettingsFile(): Promise<SettingsFile> {
	const path = settingsPath();
	let text = "{}\n";
	let json: JsonObject | null = {};
	let parseError: string | undefined;

	try {
		const info = await stat(path);
		if (info.isFile()) text = await Bun.file(path).text();
	} catch {}

	const validation = validateSettingsText(text);
	if (validation.valid) {
		json = validation.json;
	} else {
		json = null;
		parseError = validation.error;
	}

	return { json, parseError };
}

function validateSettingsText(
	text: string,
): { valid: true; json: JsonObject } | { valid: false; error: string } {
	let parsed: unknown;

	try {
		parsed = JSON.parse(text || "{}");
	} catch (error) {
		return {
			valid: false,
			error: error instanceof Error ? error.message : "Invalid JSON.",
		};
	}

	if (!isObject(parsed)) {
		return {
			valid: false,
			error: "Top-level settings value must be an object.",
		};
	}

	if (parsed.env !== undefined) {
		const envValidation = validateEnvUpdate(parsed.env);
		if (!envValidation.valid) return envValidation;
	}

	return { valid: true, json: parsed };
}

function validateEnvUpdate(
	env: unknown,
):
	| { valid: true; env: Record<string, string> }
	| { valid: false; error: string } {
	if (!isObject(env)) return { valid: false, error: "env must be an object." };
	for (const [key, value] of Object.entries(env)) {
		if (!/^[A-Z_][A-Z0-9_]*$/i.test(key)) {
			return { valid: false, error: `env.${key} has invalid variable name.` };
		}
		if (typeof value !== "string") {
			return { valid: false, error: `env.${key} must be a string.` };
		}
	}
	return { valid: true, env: env as Record<string, string> };
}

function isObject(value: unknown): value is JsonObject {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
