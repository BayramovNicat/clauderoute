export interface Model {
	id: string;
	name: string;
}

export interface Provider {
	id: string;
	provider: string;
	name?: string;
	email?: string;
	account?: string;
	status?: string;
	enabled?: boolean;
	models?: Model[];
}

function normalizeModel(m: unknown): Model {
	if (typeof m === "string") return { id: m, name: m };
	if (m && typeof m === "object") {
		const obj = m as Record<string, unknown>;
		const id = String(obj.id || obj.model || "");
		const name = String(obj.name || obj.modelName || id);
		return { id, name };
	}
	return { id: String(m), name: String(m) };
}

export interface ProvidersData {
	providers: Provider[];
	models: Record<string, Model[]>;
}

export class ProvidersService {
	private data: ProvidersData | null = null;
	private error: string | null = null;
	private loading = true;
	private listeners: (() => void)[] = [];

	constructor() {
		this.fetchData();
	}

	subscribe(listener: () => void) {
		this.listeners.push(listener);
		return () => {
			this.listeners = this.listeners.filter((l) => l !== listener);
		};
	}

	private notify() {
		for (const l of this.listeners) l();
	}

	async fetchData() {
		this.loading = true;
		this.error = null;
		this.notify();

		try {
			const res = await fetch("/api/providers");

			if (!res.ok) {
				if (res.status === 401 || res.status === 403) {
					const errorData = await res.json().catch(() => ({}));
					if (errorData.loginUrl) {
						window.location.href = errorData.loginUrl;
						return;
					}
					throw new Error("Authentication required");
				}
				throw new Error("Failed to fetch providers");
			}

			const rawProviders = await res.json();
			let providersList: Provider[] = [];

			if (Array.isArray(rawProviders)) {
				providersList = rawProviders.flat(Infinity) as Provider[];
			} else if (rawProviders && typeof rawProviders === "object") {
				const vals =
					rawProviders.providers ||
					rawProviders.data ||
					Object.values(rawProviders);
				providersList = Array.isArray(vals)
					? (vals.flat(Infinity) as Provider[])
					: [];
			}
			// Normalize all inline provider models
			providersList = providersList.map((p) => {
				if (Array.isArray(p.models)) {
					p.models = p.models.map(normalizeModel);
				}
				return p;
			});

			console.log("[ClaudeRoute Debug] Unwrapped Providers:", providersList);

			const modelsRes = await fetch("/api/provider-models/built-in").catch(
				() => null,
			);
			const models: Record<string, Model[]> = {};

			if (modelsRes?.ok) {
				const modelsData = await modelsRes.json();
				const rawModels = modelsData.models || modelsData || {};
				for (const [key, list] of Object.entries(rawModels)) {
					if (Array.isArray(list)) {
						models[key] = list.map(normalizeModel);
					}
				}
			}
			console.log("[ClaudeRoute Debug] Fetched Models Map:", models);

			this.data = {
				providers: providersList,
				models,
			};
		} catch (e) {
			this.error = e instanceof Error ? e.message : "Unknown error occurred";
		} finally {
			this.loading = false;
			this.notify();
		}
	}

	getState() {
		return {
			loading: this.loading,
			error: this.error,
			data: this.data,
		};
	}
}
