import { ProvidersService } from "./ProvidersService";

export const envDefaults = {
  ANTHROPIC_BASE_URL: "",
  ANTHROPIC_API_KEY: "",
  ANTHROPIC_MODEL: "",
  ANTHROPIC_DEFAULT_SONNET_MODEL: "",
  ANTHROPIC_DEFAULT_OPUS_MODEL: "",
  ANTHROPIC_DEFAULT_HAIKU_MODEL: "",
} as const;

export const envKeys = Object.keys(envDefaults) as (keyof typeof envDefaults)[];

export type EnvKey = keyof typeof envDefaults;
export type EnvValues = Record<EnvKey, string>;

export type SettingsState = {
  env: EnvValues;
  desktopNotificationsEnabled: boolean;
};

export type ModelOption = {
  value: string;
  label: string;
};

export class SettingsService {
  private originalState: SettingsState = {
    env: { ...envDefaults },
    desktopNotificationsEnabled: false,
  };

  private currentState: SettingsState = {
    env: { ...envDefaults },
    desktopNotificationsEnabled: false,
  };

  private modelOptions: ModelOption[] = [];
  private listeners: (() => void)[] = [];

  private loading = true;
  private saving = false;
  private errorMessage = "";
  private successMessage = "";

  constructor() {
    this.init();
  }

  async init() {
    this.loading = true;
    this.errorMessage = "";
    this.successMessage = "";
    this.notify();

    try {
      await Promise.all([this.loadSettings(), this.loadModels()]);
    } catch (error) {
      this.errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to initialize settings.";
    } finally {
      this.loading = false;
      this.notify();
    }
  }

  subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    for (const listener of this.listeners) {
      listener();
    }
  }

  // State Getters
  isLoading() {
    return this.loading;
  }

  isSaving() {
    return this.saving;
  }

  getErrors() {
    return this.errorMessage;
  }

  getSuccessMessage() {
    return this.successMessage;
  }

  clearMessages() {
    this.errorMessage = "";
    this.successMessage = "";
    this.notify();
  }

  getEnvValue(key: EnvKey): string {
    return this.currentState.env[key] ?? "";
  }

  getOriginalEnvValue(key: EnvKey): string {
    return this.originalState.env[key] ?? "";
  }

  getDesktopNotificationsEnabled(): boolean {
    return this.currentState.desktopNotificationsEnabled;
  }

  getModelOptions(): ModelOption[] {
    // Include current selected values if they are not in the list
    const options = [...this.modelOptions];
    const currentValues = new Set([
      this.currentState.env.ANTHROPIC_MODEL,
      this.currentState.env.ANTHROPIC_DEFAULT_SONNET_MODEL,
      this.currentState.env.ANTHROPIC_DEFAULT_OPUS_MODEL,
      this.currentState.env.ANTHROPIC_DEFAULT_HAIKU_MODEL,
    ]);

    for (const val of currentValues) {
      if (val && !options.some((opt) => opt.value === val)) {
        options.push({ value: val, label: `${val} (configured)` });
      }
    }

    return options;
  }

  isDirty(): boolean {
    for (const key of envKeys) {
      if (this.currentState.env[key] !== this.originalState.env[key]) {
        return true;
      }
    }
    return (
      this.currentState.desktopNotificationsEnabled !==
      this.originalState.desktopNotificationsEnabled
    );
  }

  // State Setters
  setEnvValue(key: EnvKey, value: string) {
    this.currentState.env[key] = value;
    this.successMessage = ""; // Clear success on change
    this.notify();
  }

  setDesktopNotificationsEnabled(enabled: boolean) {
    this.currentState.desktopNotificationsEnabled = enabled;
    this.successMessage = ""; // Clear success on change
    this.notify();
  }

  // API Operations
  private async loadSettings() {
    const response = await fetch("/api/config/user");
    if (!response.ok) {
      throw new Error(`Failed to load user config: ${response.statusText}`);
    }
    const data = await response.json();

    const envValues: EnvValues = { ...envDefaults };
    if (data.json?.env) {
      for (const key of envKeys) {
        if (typeof data.json.env[key] === "string") {
          envValues[key] = data.json.env[key];
        }
      }
    }

    const notifications = !!data.desktopNotificationsEnabled;

    this.originalState = {
      env: { ...envValues },
      desktopNotificationsEnabled: notifications,
    };

    this.currentState = {
      env: { ...envValues },
      desktopNotificationsEnabled: notifications,
    };
  }

  private async loadModels() {
    try {
      const providersService = ProvidersService.getInstance();
      await providersService.ready;

      const data = providersService.getState().data;
      if (!data) return;

      const modelsMap = new Map<string, ModelOption>();

      // Extract only active user-available models attached directly to configured provider instances
      for (const p of data.providers) {
        if (Array.isArray(p.models)) {
          for (const m of p.models) {
            const providerKey = data.aliases?.[p.provider] || p.provider;
            const modelValue = `${providerKey}/${m.id}`;
            modelsMap.set(modelValue, {
              value: modelValue,
              label: m.name || m.id,
            });
          }
        }
      }

      if (modelsMap.size > 0) {
        this.modelOptions = Array.from(modelsMap.values());
      }
    } catch {
      // Fail-safe default: do nothing and leave modelOptions as an empty array or fallback logic
    }
  }

  async save() {
    if (!this.isDirty() || this.saving) return;

    this.saving = true;
    this.errorMessage = "";
    this.successMessage = "";
    this.notify();

    try {
      // Filter and construct env update block
      const envPayload: Record<string, string> = {};
      for (const key of envKeys) {
        envPayload[key] = this.currentState.env[key];
      }

      const response = await fetch("/api/config/user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          env: envPayload,
          desktopNotificationsEnabled:
            this.currentState.desktopNotificationsEnabled,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? `Save failed: ${response.statusText}`);
      }

      // Save successful, promote current state to original state
      this.originalState = {
        env: { ...this.currentState.env },
        desktopNotificationsEnabled:
          this.currentState.desktopNotificationsEnabled,
      };

      this.successMessage = "Settings saved successfully!";
    } catch (error) {
      this.errorMessage =
        error instanceof Error
          ? error.message
          : "An unexpected error occurred during save.";
    } finally {
      this.saving = false;
      this.notify();
    }
  }

  reset() {
    this.currentState = {
      env: { ...this.originalState.env },
      desktopNotificationsEnabled:
        this.originalState.desktopNotificationsEnabled,
    };
    this.errorMessage = "";
    this.successMessage = "";
    this.notify();
  }
}
