export type JsonObject = Record<string, unknown>;

export type SettingsFile = {
	json: JsonObject | null;
	parseError?: string;
	desktopNotificationsEnabled?: boolean;
};

export type ProviderModel = {
	id: string;
	name: string;
};

export type ModelsByProvider = Record<string, ProviderModel[]>;

export type ModelCatalog = {
	models: ModelsByProvider;
	aliases?: Record<string, string>;
};

export type CookieDebugInfo = {
	hasCookieHeader: boolean;
	cookieCount: number;
	cookieNames: string[];
};

export type Connection = {
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
