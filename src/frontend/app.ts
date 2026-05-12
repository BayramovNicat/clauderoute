import {
	omniRouteAuthCode,
	omniRouteLoginAttemptedKey,
	omniRouteLoginReturnToKey,
} from "./auth";
import { classes } from "./classes";
import type {
	Connection,
	CookieDebugInfo,
	JsonObject,
	ModelCatalog,
	ModelsByProvider,
	ProviderModel,
	SettingsFile,
} from "./data";
import { type EnvValues, envDefaults, envKeys } from "./env";
import { authRequiredMessage, connectionCard, empty } from "./providers";
import { renderEnvFields, syncDesktopNotificationsToggle } from "./settings";
import { renderShell } from "./shell";

type ApiError = Error & {
	status: number;
	code?: string;
	loginUrl?: string;
};

let modelOptions: ProviderModel[] = [];
let currentEnv = envDefaults;
let savedEnv = envDefaults;
let currentDesktopNotificationsEnabled = false;
let savedDesktopNotificationsEnabled = false;

const shell = renderShell();
const saveButton = shell.saveButton;
const desktopNotificationsToggle = shell.desktopNotificationsToggle;
const providersList = shell.providersList;
const envFields = shell.envFields;
const messages = shell.messages;
const messageBaseClass = messages.className;

saveButton.disabled = true;
saveButton.className = `${saveButton.className} ${classes.disabled}`;
saveButton.addEventListener("click", () => void saveEnv());
shell.refreshButton.addEventListener("click", () => void loadProviders());
desktopNotificationsToggle.addEventListener("change", () => {
	currentDesktopNotificationsEnabled = desktopNotificationsToggle.checked;
	renderDesktopNotificationsToggle(currentDesktopNotificationsEnabled);
	updateSaveButton();
});

void loadUserSettings();
void loadProviders();

async function loadUserSettings() {
	const file = await api<SettingsFile>("/api/config/user");
	currentEnv = envFrom(file.json);
	savedEnv = currentEnv;
	currentDesktopNotificationsEnabled = Boolean(
		file.desktopNotificationsEnabled,
	);
	savedDesktopNotificationsEnabled = currentDesktopNotificationsEnabled;
	renderEnvFieldsIntoShell();
	renderDesktopNotificationsToggle(currentDesktopNotificationsEnabled);
	updateSaveButton();
	if (file.parseError) setMessage(`Invalid JSON: ${file.parseError}`, true);
	else hideMessage();
}

async function loadProviders() {
	providersList.replaceChildren(empty("Loading providers..."));
	try {
		const [providers, customModels, builtInCatalog] = await Promise.all([
			api<unknown>("/api/providers"),
			api<unknown>("/api/provider-models"),
			api<unknown>("/api/provider-models/built-in"),
		]);
		const builtInModelCatalog = modelCatalog(builtInCatalog);
		const connections = connectionItems(providers);
		const modelsByProvider = activeProviderModels(
			connections,
			mergeModels(modelItems(customModels), builtInModelCatalog.models),
		);
		modelOptions = selectModelOptions(
			modelsByProvider,
			builtInModelCatalog.aliases,
		);
		renderEnvFieldsIntoShell();
		renderProviders(connections, modelsByProvider);
		clearOmniRouteLoginState();
	} catch (error) {
		if (isOmniRouteAuthError(error)) {
			handleOmniRouteAuthError(error);
			return;
		}
		providersList.replaceChildren(
			empty(
				error instanceof Error ? error.message : "Provider request failed.",
			),
		);
	}
}

function renderProviders(
	connections: Connection[],
	modelsByProvider: ModelsByProvider,
) {
	providersList.replaceChildren(
		...(connections.length
			? connections.map((connection) =>
					connectionCard(
						connection,
						providerModels(connection.provider, modelsByProvider),
					),
				)
			: [empty("No active providers returned.")]),
	);
}

function handleOmniRouteAuthError(error: ApiError) {
	const loginUrl = error.loginUrl;
	if (!loginUrl) {
		providersList.replaceChildren(empty(error.message));
		return;
	}

	if (sessionStorage.getItem(omniRouteLoginAttemptedKey) === "1") {
		void renderAuthRequiredMessage(loginUrl);
		return;
	}

	sessionStorage.setItem(omniRouteLoginAttemptedKey, "1");
	sessionStorage.setItem(omniRouteLoginReturnToKey, location.href);
	providersList.replaceChildren(empty("Opening OmniRoute login..."));
	location.assign(loginUrl);
}

async function renderAuthRequiredMessage(loginUrl: string) {
	providersList.replaceChildren(
		authRequiredMessage(loginUrl, await loadCookieDebugInfo()),
	);
}

async function loadCookieDebugInfo() {
	try {
		return await api<CookieDebugInfo>("/api/debug/cookies");
	} catch {
		return null;
	}
}

function clearOmniRouteLoginState() {
	sessionStorage.removeItem(omniRouteLoginAttemptedKey);
	sessionStorage.removeItem(omniRouteLoginReturnToKey);
}

function activeProviderModels(
	connections: Connection[],
	modelsByProvider: ModelsByProvider,
) {
	return Object.fromEntries(
		connections.map((connection) => [
			connection.provider,
			providerModels(connection.provider, modelsByProvider),
		]),
	);
}

function providerModels(provider: string, modelsByProvider: ModelsByProvider) {
	return modelsByProvider[provider] ?? [];
}

function mergeModels(
	customModels: ModelsByProvider,
	builtInModels: ModelsByProvider,
) {
	const merged: ModelsByProvider = { ...builtInModels };
	for (const [provider, models] of Object.entries(customModels)) {
		const seen = new Set(models.map((model) => model.id));
		merged[provider] = [
			...models,
			...(merged[provider] ?? []).filter((model) => !seen.has(model.id)),
		];
	}
	return merged;
}

function connectionItems(value: unknown): Connection[] {
	const list = Array.isArray(value)
		? value
		: isObject(value) && Array.isArray(value.connections)
			? value.connections
			: isObject(value) && Array.isArray(value.providers)
				? value.providers
				: isObject(value) && Array.isArray(value.data)
					? value.data
					: [];
	return list.filter(isConnection);
}

function modelCatalog(value: unknown): ModelCatalog {
	if (!isObject(value)) return { models: {} };
	return {
		models: modelItems(value),
		aliases: isStringRecord(value.aliases) ? value.aliases : {},
	};
}

function modelItems(value: unknown): ModelsByProvider {
	if (Array.isArray(value)) return groupModels(value);
	if (!isObject(value)) return {};
	const source = isObject(value.models) ? value.models : value;
	return Object.fromEntries(
		Object.entries(source).map(([provider, models]) => [
			provider,
			modelList(models),
		]),
	);
}

function selectModelOptions(
	modelsByProvider: ModelsByProvider,
	aliases: Record<string, string> = {},
) {
	return Object.entries(modelsByProvider).flatMap(([provider, models]) => {
		const prefix = aliases[provider] ?? provider;
		return models.map((model) => ({
			id: `${prefix}/${model.id}`,
			name: `${provider}: ${model.name}`,
		}));
	});
}

function groupModels(models: unknown[]) {
	const grouped: ModelsByProvider = {};
	for (const model of models) {
		if (!isObject(model)) continue;
		const provider = stringValue(
			model.provider ?? model.providerId ?? model.source,
		);
		const id = stringValue(model.id ?? model.value ?? model.model);
		if (!provider || !id) continue;
		const name = stringValue(model.name ?? model.label) || id;
		grouped[provider] = [...(grouped[provider] ?? []), { id, name }];
	}
	return grouped;
}

function modelList(value: unknown): ProviderModel[] {
	if (!Array.isArray(value)) return [];
	return value.flatMap((model) => {
		if (typeof model === "string") return [{ id: model, name: model }];
		if (!isObject(model)) return [];
		const id = stringValue(model.id ?? model.value ?? model.model);
		if (!id) return [];
		return [{ id, name: stringValue(model.name ?? model.label) || id }];
	});
}

function renderEnvFieldsIntoShell() {
	envFields.replaceChildren(
		renderEnvFields(currentEnv, modelOptions, updateSaveButton),
	);
}

function renderDesktopNotificationsToggle(enabled: boolean) {
	syncDesktopNotificationsToggle(desktopNotificationsToggle, enabled);
}

async function saveEnv() {
	await api<{ ok: true }>("/api/config/user", {
		method: "POST",
		body: JSON.stringify({
			env: readEnvInputs(),
			desktopNotificationsEnabled: readDesktopNotificationsToggle(),
		}),
	});
	await loadUserSettings();
	setMessage("Saved.");
}

function readEnvInputs() {
	return Object.fromEntries(
		envKeys.map((key) => [
			key,
			envFields.querySelector<HTMLInputElement | HTMLSelectElement>(
				`[name="${key}"]`,
			)?.value ?? "",
		]),
	) as EnvValues;
}

function readDesktopNotificationsToggle() {
	return desktopNotificationsToggle.checked;
}

function updateSaveButton() {
	const envChanged = envKeys.some(
		(key) => readEnvInputs()[key] !== savedEnv[key],
	);
	const notificationsChanged =
		readDesktopNotificationsToggle() !== savedDesktopNotificationsEnabled;
	const changed = envChanged || notificationsChanged;
	saveButton.disabled = !changed;
	for (const className of classes.disabled.split(" ")) {
		saveButton.classList.toggle(className, !changed);
	}
}

function envFrom(json: JsonObject | null) {
	const env = isObject(json?.env) ? json.env : {};
	return Object.fromEntries(
		envKeys.map((key) => [
			key,
			typeof env[key] === "string" ? env[key] : envDefaults[key],
		]),
	) as EnvValues;
}

function apiErrorMessage(data: unknown) {
	if (!isObject(data))
		return typeof data === "string" ? data : "Request failed.";
	return (
		stringValue(data.error) || stringValue(data.message) || "Request failed."
	);
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
	const response = await fetch(path, {
		...init,
		headers: { "content-type": "application/json", ...init?.headers },
	});
	const text = await response.text();
	const data = parseJson(text);
	if (!response.ok) {
		throw Object.assign(new Error(apiErrorMessage(data)), {
			status: response.status,
			code: isObject(data) ? stringValue(data.code) : "",
			loginUrl: isObject(data) ? stringValue(data.loginUrl) : "",
		}) as ApiError;
	}
	return data as T;
}

function parseJson(text: string) {
	if (!text) return null;
	try {
		return JSON.parse(text) as unknown;
	} catch {
		return text;
	}
}

function isOmniRouteAuthError(error: unknown): error is ApiError {
	return (
		error instanceof Error && (error as ApiError).code === omniRouteAuthCode
	);
}

function setMessage(text: string, error = false) {
	messages.textContent = text;
	messages.hidden = false;
	messages.className = `${messageBaseClass}${error ? " text-[#b3261e]" : ""}`;
}

function hideMessage() {
	messages.textContent = "";
	messages.hidden = true;
	messages.className = messageBaseClass;
}

function isStringRecord(value: unknown): value is Record<string, string> {
	return (
		isObject(value) &&
		Object.values(value).every((item) => typeof item === "string")
	);
}

function isConnection(value: unknown): value is Connection {
	return (
		isObject(value) &&
		typeof value.id === "string" &&
		typeof value.provider === "string" &&
		typeof value.authType === "string" &&
		typeof value.priority === "number" &&
		typeof value.isActive === "boolean"
	);
}

function stringValue(value: unknown) {
	return typeof value === "string" ? value : "";
}

function isObject(value: unknown): value is JsonObject {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
