export const envDefaults = {
	ANTHROPIC_BASE_URL: "",
	ANTHROPIC_API_KEY: "",
	ANTHROPIC_MODEL: "",
	ANTHROPIC_DEFAULT_SONNET_MODEL: "",
	ANTHROPIC_DEFAULT_OPUS_MODEL: "",
	ANTHROPIC_DEFAULT_HAIKU_MODEL: "",
} as const;

export const envKeys = Object.keys(envDefaults) as (keyof typeof envDefaults)[];

export const modelEnvKeys = new Set<keyof typeof envDefaults>([
	"ANTHROPIC_MODEL",
	"ANTHROPIC_DEFAULT_SONNET_MODEL",
	"ANTHROPIC_DEFAULT_OPUS_MODEL",
	"ANTHROPIC_DEFAULT_HAIKU_MODEL",
]);

export type EnvKey = keyof typeof envDefaults;
export type EnvValues = Record<EnvKey, string>;
