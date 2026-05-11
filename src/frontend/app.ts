type JsonObject = Record<string, unknown>;
type SettingsFile = {
	json: JsonObject | null;
	parseError?: string;
};

type ProviderModel = {
	id: string;
	name: string;
};

type ModelsByProvider = Record<string, ProviderModel[]>;
type ModelCatalog = {
	models: ModelsByProvider;
	aliases?: Record<string, string>;
};

type CookieDebugInfo = {
	hasCookieHeader: boolean;
	cookieCount: number;
	cookieNames: string[];
};

class ApiError extends Error {
	status: number;
	code?: string;
	loginUrl?: string;

	constructor(
		message: string,
		status: number,
		code?: string,
		loginUrl?: string,
	) {
		super(message);
		this.status = status;
		this.code = code;
		this.loginUrl = loginUrl;
	}
}

type Connection = {
	id: string;
	provider: string;
	authType: string;
	name?: string;
	email?: string;
	priority: number;
	isActive: boolean;
	expiresAt?: string;
	tokenExpiresAt?: string;
	scope?: string;
	projectId?: string;
	testStatus?: string;
	errorCode?: string;
	lastError?: string;
	lastErrorType?: string;
	backoffLevel: number;
	lastHealthCheckAt?: string;
	lastTested?: string;
	expiresIn?: number;
	consecutiveUseCount: number;
	rateLimitProtection: boolean;
	createdAt: string;
	updatedAt: string;
	maxConcurrent: number | null;
	providerSpecificData?: JsonObject;
};

const envDefaults = {
	ANTHROPIC_BASE_URL: "",
	ANTHROPIC_API_KEY: "",
	ANTHROPIC_MODEL: "",
	ANTHROPIC_DEFAULT_SONNET_MODEL: "",
	ANTHROPIC_DEFAULT_OPUS_MODEL: "",
	ANTHROPIC_DEFAULT_HAIKU_MODEL: "",
};

const modelEnvKeys = new Set<keyof typeof envDefaults>([
	"ANTHROPIC_MODEL",
	"ANTHROPIC_DEFAULT_SONNET_MODEL",
	"ANTHROPIC_DEFAULT_OPUS_MODEL",
	"ANTHROPIC_DEFAULT_HAIKU_MODEL",
]);
let modelOptions: ProviderModel[] = [];
let currentEnv = envDefaults;
let savedEnv = envDefaults;

const disabledSaveClassName = "is-disabled";
const fieldClassName = "control-field";
const omniRouteAuthCode = "OMNIROUTE_AUTH_REQUIRED";
const omniRouteLoginAttemptedKey = "omnirouteLoginAttempted";
const omniRouteLoginReturnToKey = "omnirouteLoginReturnTo";

const envKeys = Object.keys(envDefaults) as (keyof typeof envDefaults)[];
const envFields = must<HTMLElement>("#env-fields");
const providersList = must<HTMLElement>("#providers-list");
const messages = must<HTMLElement>("#messages");
const saveButton = must<HTMLButtonElement>("#save-env");

saveButton.disabled = true;
saveButton.classList.add(...disabledSaveClassName.split(" "));
saveButton.addEventListener("click", () => void saveEnv());
must<HTMLButtonElement>("#refresh-providers").addEventListener(
	"click",
	() => void loadProviders(),
);
void loadUserSettings();
void loadProviders();

async function loadUserSettings() {
	const file = await api<SettingsFile>("/api/config/user");
	currentEnv = envFrom(file.json);
	savedEnv = currentEnv;
	renderEnvFields(currentEnv);
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
		renderEnvFields(currentEnv);
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

function authRequiredMessage(
	loginUrl: string,
	cookieInfo: CookieDebugInfo | null,
) {
	const wrapper = document.createElement("div");
	wrapper.className = "empty-state";

	const message = document.createElement("p");
	message.textContent = "OmniRoute still needs authentication.";

	const details = document.createElement("p");
	const cookieNames = cookieInfo?.cookieNames.join(", ") || "none";
	details.textContent = cookieInfo
		? `Local app cookies: ${cookieInfo.cookieCount} (${cookieNames})`
		: "Local app cookies: unavailable";

	const button = document.createElement("button");
	button.type = "button";
	button.className = "primary-button";
	button.textContent = "Open OmniRoute login";
	button.addEventListener("click", () => {
		sessionStorage.setItem(omniRouteLoginReturnToKey, location.href);
		location.assign(loginUrl);
	});

	wrapper.append(message, details, button);
	return wrapper;
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

function connectionCard(connection: Connection, models: ProviderModel[]) {
	const card = document.createElement("article");
	card.className = "provider-card";

	const header = document.createElement("div");
	header.className = "provider-card-header";

	const title = document.createElement("div");
	const provider = document.createElement("h3");
	provider.className = "provider-name";
	provider.textContent = connection.provider;
	const account = document.createElement("p");
	account.className = "provider-account";
	account.textContent = connection.email ?? connection.name ?? connection.id;
	title.append(provider, account);

	const badge = document.createElement("span");
	badge.className = `status-badge ${connection.testStatus === "active" || (connection.isActive && !connection.testStatus) ? "active" : "warning"}`;
	badge.textContent =
		connection.testStatus ?? (connection.isActive ? "active" : "inactive");
	header.append(title, badge);

	card.append(header, modelsSection(models));
	if (connection.lastError) {
		const error = document.createElement("p");
		error.className = "error-box";
		error.textContent = connection.lastError;
		card.append(error);
	}
	return card;
}

function modelsSection(models: ProviderModel[]) {
	const section = document.createElement("section");
	section.className = "models-box";
	const title = document.createElement("h4");
	title.className = "models-title";
	title.textContent = `models (${models.length})`;
	const list = document.createElement("div");
	list.className = "model-list";
	for (const model of models) {
		const item = document.createElement("span");
		item.className = "model-pill";
		item.textContent =
			model.name === model.id ? model.id : `${model.name} (${model.id})`;
		list.append(item);
	}
	if (models.length === 0) {
		const item = document.createElement("p");
		item.className = "empty-state";
		item.textContent = "No models returned for provider.";
		list.append(item);
	}
	section.append(title, list);
	return section;
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

function renderEnvFields(env: Record<keyof typeof envDefaults, string>) {
	envFields.replaceChildren(
		...envKeys.map((key) => {
			const label = document.createElement("label");
			label.className = "env-row";
			const name = document.createElement("span");
			name.className = "env-name";
			name.textContent = key;
			const field = modelEnvKeys.has(key)
				? modelSelect(key, env[key])
				: envInput(key, env[key]);
			label.append(name, field);
			return label;
		}),
	);
}

function envInput(key: keyof typeof envDefaults, value: string) {
	const input = document.createElement("input");
	input.className = fieldClassName;
	input.dataset.envKey = key;
	input.value = value;
	input.addEventListener("input", updateSaveButton);
	if (key !== "ANTHROPIC_API_KEY") return input;

	input.type = "password";
	input.autocomplete = "off";
	input.spellcheck = false;
	input.classList.add("secret-input");
	return secretField(input);
}

function secretField(input: HTMLInputElement) {
	const wrapper = document.createElement("span");
	wrapper.className = "secret-field";

	const toggle = document.createElement("button");
	toggle.type = "button";
	toggle.className = "secret-toggle";
	toggle.ariaLabel = "Show API key";
	toggle.ariaPressed = "false";
	toggle.title = "Show API key";
	toggle.append(eyeIcon(false));
	toggle.addEventListener("click", () => {
		const isVisible = input.type === "text";
		input.type = isVisible ? "password" : "text";
		toggle.ariaLabel = isVisible ? "Show API key" : "Hide API key";
		toggle.ariaPressed = String(!isVisible);
		toggle.title = isVisible ? "Show API key" : "Hide API key";
		toggle.replaceChildren(eyeIcon(!isVisible));
	});

	wrapper.append(input, toggle);
	return wrapper;
}

function eyeIcon(hidden: boolean) {
	const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	svg.setAttribute("viewBox", "0 0 24 24");
	svg.setAttribute("aria-hidden", "true");
	const eye = document.createElementNS("http://www.w3.org/2000/svg", "path");
	eye.setAttribute(
		"d",
		"M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z",
	);
	const pupil = document.createElementNS(
		"http://www.w3.org/2000/svg",
		"circle",
	);
	pupil.setAttribute("cx", "12");
	pupil.setAttribute("cy", "12");
	pupil.setAttribute("r", "2.7");
	svg.append(eye, pupil);
	if (hidden) {
		const slash = document.createElementNS(
			"http://www.w3.org/2000/svg",
			"path",
		);
		slash.setAttribute("d", "M4 4 20 20");
		svg.append(slash);
	}
	return svg;
}

function modelSelect(key: keyof typeof envDefaults, value: string) {
	const select = document.createElement("select");
	select.className = fieldClassName;
	select.dataset.envKey = key;
	select.addEventListener("change", updateSaveButton);
	for (const optionModel of modelOptionsFor(value)) {
		const option = document.createElement("option");
		option.value = optionModel.id;
		option.textContent = `${optionModel.name} (${optionModel.id})`;
		select.append(option);
	}
	select.value = value;
	return select;
}

function modelOptionsFor(value: string) {
	return modelOptions.some((model) => model.id === value)
		? modelOptions
		: [{ id: value, name: value }, ...modelOptions];
}

async function saveEnv() {
	await api<{ ok: true }>("/api/config/user", {
		method: "POST",
		body: JSON.stringify({ env: readEnvInputs() }),
	});
	await loadUserSettings();
	setMessage("Saved.");
}

function readEnvInputs() {
	return Object.fromEntries(
		envKeys.map((key) => [
			key,
			envFields.querySelector<HTMLInputElement | HTMLSelectElement>(
				`[data-env-key="${key}"]`,
			)?.value ?? "",
		]),
	) as Record<keyof typeof envDefaults, string>;
}

function updateSaveButton() {
	const changed = envKeys.some((key) => readEnvInputs()[key] !== savedEnv[key]);
	saveButton.disabled = !changed;
	saveButton.classList.toggle("is-disabled", !changed);
}

function envFrom(json: JsonObject | null) {
	const env = isObject(json?.env) ? json.env : {};
	return Object.fromEntries(
		envKeys.map((key) => [
			key,
			typeof env[key] === "string" ? env[key] : envDefaults[key],
		]),
	) as Record<keyof typeof envDefaults, string>;
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
	const response = await fetch(path, {
		...init,
		headers: { "content-type": "application/json", ...init?.headers },
	});
	const text = await response.text();
	const data = parseJson(text);
	if (!response.ok) {
		throw new ApiError(
			apiErrorMessage(data),
			response.status,
			isObject(data) ? stringValue(data.code) : "",
			isObject(data) ? stringValue(data.loginUrl) : "",
		);
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

function apiErrorMessage(data: unknown) {
	if (!isObject(data))
		return typeof data === "string" ? data : "Request failed.";
	return (
		stringValue(data.error) || stringValue(data.message) || "Request failed."
	);
}

function isOmniRouteAuthError(error: unknown): error is ApiError {
	return error instanceof ApiError && error.code === omniRouteAuthCode;
}

function empty(text: string) {
	const item = document.createElement("p");
	item.className = "empty-state";
	item.textContent = text;
	return item;
}

function setMessage(text: string, error = false) {
	messages.textContent = text;
	messages.hidden = false;
	messages.className = `message${error ? " error" : ""}`;
}

function hideMessage() {
	messages.textContent = "";
	messages.hidden = true;
	messages.className = "message";
}

function isStringRecord(value: unknown): value is Record<string, string> {
	return (
		isObject(value) &&
		Object.values(value).every((item) => typeof item === "string")
	);
}

function isObject(value: unknown): value is JsonObject {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function must<T extends HTMLElement>(selector: string): T {
	const element = document.querySelector<T>(selector);
	if (!element) throw new Error(`Missing element: ${selector}`);
	return element;
}
