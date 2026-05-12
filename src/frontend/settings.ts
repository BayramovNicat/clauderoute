import { classes } from "./classes";
import { Input, SecretInput } from "./components/Input";
import type { ProviderModel } from "./data";
import { Select } from "./components/Select";
import { html } from "./dom";
import { type EnvValues, envKeys, modelEnvKeys } from "./env";

export function renderEnvFields(
  env: EnvValues,
  modelOptions: ProviderModel[],
  onChange: () => void,
) {
  const fragment = document.createDocumentFragment();
  for (const key of envKeys) {
    const field = modelEnvKeys.has(key)
      ? Select({
          name: key,
          value: env[key],
          options: (modelOptions.some((model) => model.id === env[key])
            ? modelOptions
            : [{ id: env[key], name: env[key] }, ...modelOptions]
          ).map((model) => ({
            value: model.id,
            label: `${model.name} (${model.id})`,
          })),
          onchange: onChange,
        })
      : //, ModelSelect(key, env[key], modelOptions, onChange)
        key !== "ANTHROPIC_API_KEY"
        ? Input({ name: key, value: env[key], onchange: onChange })
        : SecretInput({ name: key, value: env[key], onchange: onChange });
    fragment.append(html`
      <label class="${classes.envRow}">
        <span class="${classes.envName}">${key}</span>
        ${field}
      </label>
    `);
  }
  return fragment;
}

export function syncDesktopNotificationsToggle(
  toggle: HTMLInputElement,
  enabled: boolean,
) {
  toggle.checked = enabled;
  toggle.ariaLabel = "Toggle desktop alerts";
  toggle.title = enabled ? "Desktop alerts enabled" : "Desktop alerts disabled";
}
