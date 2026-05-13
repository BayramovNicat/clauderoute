import { Observable } from "../utils/observable";

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
	aliases: Record<string, string>;
}

export class ProvidersService extends Observable {
	public ready!: Promise<void>;
	private data: ProvidersData | null = null;
	private error: string | null = null;
	private loading = true;

	private static instance: ProvidersService | null = null;

	private constructor() {
		super();
		this.ready = this.fetchData();
	}

	public static getInstance(): ProvidersService {
		if (!ProvidersService.instance) {
			ProvidersService.instance = new ProvidersService();
		}
		return ProvidersService.instance;
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

			const modelsRes = await fetch("/api/provider-models/built-in").catch(
				() => null,
			);
			const models: Record<string, Model[]> = {};
			let aliases: Record<string, string> = {};

			if (modelsRes?.ok) {
				const modelsData = await modelsRes.json();
				const rawModels = modelsData.models || modelsData || {};
				for (const [key, list] of Object.entries(rawModels)) {
					if (Array.isArray(list)) {
						models[key] = list.map(normalizeModel);
					}
				}
				if (modelsData.aliases) {
					aliases = modelsData.aliases;
				}
			}

			// Map built-in models as a fallback to providers missing inline models
			providersList = providersList.map((p) => {
				if (!p.models || p.models.length === 0) {
					const providerKey = p.provider || p.id;
					p.models = models[providerKey] || [];
				}
				return p;
			});

			this.data = {
				providers: providersList,
				models,
				aliases,
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
