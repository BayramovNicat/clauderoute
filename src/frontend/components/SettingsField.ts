import type { EnvKey, SettingsService } from "../services/SettingsService";
import { html } from "../utils/dom";
import { Button } from "./ui/Button";
import { Input, SecretInput } from "./ui/Input";
import { Label } from "./ui/Label";
import { Select } from "./ui/Select";

export interface FieldDef {
	key: EnvKey;
	label: string;
	desc: string;
	type: "text" | "secret" | "select";
	placeholder?: string;
}

export interface SettingsFieldProps {
	def: FieldDef;
	service: SettingsService;
	selectOptions: { value: string; label: string }[];
}

export function SettingsField({
	def,
	service,
	selectOptions,
}: SettingsFieldProps): HTMLElement {
	const id = def.key.toLowerCase().replace(/_/g, "-");
	let fieldEl: HTMLElement;
	let actualInput: HTMLInputElement | HTMLSelectElement;

	// Revert/Undo Action Button for localized resets
	const revertBtn = Button({
		content: html`
      <span
        class="flex items-center gap-1 text-[#f97316] hover:text-[#d15c13] transition-colors"
      >
        <svg
          class="h-3.5 w-3.5 stroke-current fill-none"
          stroke-width="2.5"
          viewBox="0 0 24 24"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
          <polyline points="3 3 3 8 8 8"></polyline>
        </svg>
        <span class="text-xs font-bold uppercase tracking-wider">Undo</span>
      </span>
    `,
		className:
			"p-1 rounded-md border-0 bg-transparent cursor-pointer transition-all hover:bg-[#faf9f6]",
		title: `Revert ${def.label} to original value`,
		onclick: () => {
			const origVal = service.getOriginalEnvValue(def.key);
			service.setEnvValue(def.key, origVal);
			if (actualInput) {
				actualInput.value = origVal;
				updateRevertVisibility(origVal);
			}
		},
	});
	revertBtn.style.display = "none";

	const updateRevertVisibility = (val: string) => {
		const origVal = service.getOriginalEnvValue(def.key);
		revertBtn.style.display = val !== origVal ? "inline-block" : "none";
	};

	// Select input variant
	// Render input/select variant
	const onInput = (e: Event) => {
		const val = (e.target as HTMLInputElement | HTMLSelectElement).value;
		service.setEnvValue(def.key, val);
		updateRevertVisibility(val);
	};

	if (def.type === "select") {
		fieldEl = Select({
			id,
			value: service.getEnvValue(def.key),
			options: selectOptions,
			onchange: onInput,
		});
		actualInput = fieldEl as HTMLSelectElement;
	} else {
		const props = {
			id,
			value: service.getEnvValue(def.key),
			placeholder: def.placeholder,
			oninput: onInput,
		};
		fieldEl = def.type === "secret" ? SecretInput(props) : Input(props);
		actualInput = (
			def.type === "secret" ? fieldEl.querySelector("input") : fieldEl
		) as HTMLInputElement;
	}

	// Subscribe to service updates to sync programmatically updated values (like global resets/saves)
	service.subscribe(() => {
		const currentVal = service.getEnvValue(def.key);
		if (actualInput) {
			if (
				document.activeElement !== actualInput &&
				actualInput.value !== currentVal
			) {
				actualInput.value = currentVal;
			}
			updateRevertVisibility(currentVal);
		}
	});

	// Initial styling setup
	const initialValue = service.getEnvValue(def.key);
	setTimeout(() => {
		updateRevertVisibility(initialValue);
	}, 0);

	return html`
    <div
      class="flex flex-col gap-y-2 group p-4 rounded-xl border border-[#e7e1d8]/30 bg-white/40 backdrop-blur-xs hover:border-[#e7e1d8]/80 focus-within:border-[#f97316]/40 focus-within:bg-[#faf9f6]/40 transition-all duration-300"
    >
      <div class="flex items-center justify-between min-h-6">
        <div class="flex items-center gap-x-2">
          ${Label({
						content: def.label,
						htmlFor: id,
						className:
							"text-[0.82rem] font-extrabold uppercase tracking-wider text-[#77736b] group-focus-within:text-[#f97316] transition-colors cursor-pointer",
					})}
        </div>
        ${revertBtn}
      </div>
      <div class="relative min-w-0">${fieldEl}</div>
      <p class="text-[#a19c91] text-xs font-medium pl-0.5 leading-relaxed">
        ${def.desc}
      </p>
    </div>
  `;
}
